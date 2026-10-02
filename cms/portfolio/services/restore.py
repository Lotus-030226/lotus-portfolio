import hashlib, json, re, subprocess, zipfile, tempfile, shutil
from pathlib import Path
import psycopg
from psycopg import sql
from django.conf import settings

def restore(archive_path, database):
    if not re.fullmatch('lotus_restore_[a-z0-9_]{1,40}', database):
        raise ValueError('還原資料庫名稱須以 lotus_restore_ 開頭，只使用小寫英文、數字及底線。')
    archive_path = Path(archive_path).resolve()
    root = settings.PRIVATE_ROOT / 'restores'
    root.mkdir(parents=True, exist_ok=True)
    target = root / database
    if target.exists():
        raise ValueError('還原圖片目錄已存在；請使用新的資料庫名稱。')
    db = settings.DATABASES['default']
    kwargs = {'host': db['HOST'], 'port': db['PORT'], 'user': db['USER'], 'password': db['PASSWORD']}
    with tempfile.TemporaryDirectory(dir=root) as temporary:
        folder = Path(temporary)
        with zipfile.ZipFile(archive_path) as archive:
            for info in archive.infolist():
                path = (folder / info.filename).resolve()
                if not path.is_relative_to(folder.resolve()) or info.external_attr >> 16 & 61440 == 40960:
                    raise ValueError('備份包含不安全的路徑。')
            archive.extractall(folder)
        manifest = json.loads((folder / 'manifest.json').read_text())
        if manifest.get('format') != 1 or not isinstance(manifest.get('files'), dict):
            raise ValueError('備份格式不支援。')
        for name, digest in manifest['files'].items():
            path = (folder / name).resolve()
            if not path.is_relative_to(folder.resolve()) or not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
                raise ValueError('備份檔案遺失或雜湊不符。')
        if 'database.dump' not in manifest['files']:
            raise ValueError('備份缺少資料庫。')
        with psycopg.connect(dbname='postgres', autocommit=True, **kwargs) as connection:
            if connection.execute('SELECT 1 FROM pg_database WHERE datname=%s', [database]).fetchone():
                raise ValueError('資料庫已存在，為避免覆寫請使用新名稱。')
            connection.execute(sql.SQL('CREATE DATABASE {}').format(sql.Identifier(database)))
        with (folder / 'database.dump').open('rb') as source:
            subprocess.run(['docker', 'compose', 'exec', '-T', 'db', 'pg_restore', '--exit-on-error', '--no-owner', '-U', db['USER'], '-d', database], cwd=settings.ROOT, stdin=source, check=True, timeout=120)
        with psycopg.connect(dbname=database, **kwargs) as connection:
            records = connection.execute('SELECT count(*) FROM portfolio_contentrecord').fetchone()[0]
            assets = connection.execute('SELECT file FROM portfolio_asset').fetchall()
            if records != manifest['records'] or len(assets) != manifest['assets']:
                raise ValueError('還原筆數不符。新資料庫保留供檢查。')
            for filename, in assets:
                path = (folder / 'uploads' / filename).resolve()
                if not path.is_relative_to((folder / 'uploads').resolve()) or not path.is_file():
                    raise ValueError('還原資料庫的圖片缺檔。')
            connection.execute("UPDATE portfolio_publishjob SET active=false,status='failed',message='此工作來自備份，已停止。',finished_at=now() WHERE active=true")
        target.mkdir(mode=448)
        if (folder / 'uploads').exists():
            shutil.copytree(folder / 'uploads', target / 'uploads')
        else:
            (target / 'uploads').mkdir()
        (target / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    return {'database': database, 'records': records, 'assets': len(assets), 'uploads': str(target / 'uploads')}

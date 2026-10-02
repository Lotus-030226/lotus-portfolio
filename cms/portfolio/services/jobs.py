import os, sys, json, shutil, subprocess, zipfile, hashlib, tempfile
from pathlib import Path
from datetime import timedelta
from django.conf import settings
from django.utils import timezone
from portfolio.models import PublishJob, Asset, ContentRecord
from portfolio.services.export import export_snapshot
from portfolio.services.locking import content_lock

def node_binary():
    node = shutil.which('node')
    if node:
        return node
    candidate = Path.home() / '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
    if candidate.exists():
        return str(candidate)
    raise ValueError('找不到 Node.js；請安裝 Node.js 22 以上，再重新啟動工作室。')

def prepare(report):
    with content_lock():
        return _prepare(report)

def _prepare(report):
    report('驗證中英文及公開圖片…')
    export_snapshot()
    report('建置靜態網站…')
    env = os.environ.copy()
    node = node_binary()
    env['PATH'] = str(Path(node).parent) + os.pathsep + env.get('PATH', '')
    env.update(NEXT_TELEMETRY_DISABLED='1', NEXT_PUBLIC_BASE_PATH='', SITE_URL='', NEXT_DIST_DIR='.next-preview')
    subprocess.run([node, str(settings.ROOT / 'scripts/check-config.mjs')], cwd=settings.ROOT, env=env, check=True, timeout=10)
    subprocess.run([node, str(settings.ROOT / 'scripts/render-meta.mjs')], cwd=settings.ROOT, env=env, check=True, timeout=30)
    subprocess.run([node, str(settings.ROOT / 'node_modules/next/dist/bin/next'), 'build'], cwd=settings.ROOT, env=env, check=True, timeout=300)
    out = settings.ROOT / '.next-preview'
    if not (out / 'index.html').is_file():
        raise ValueError('靜態建置沒有產生首頁。')
    root = settings.PRIVATE_ROOT
    root.mkdir(parents=True, exist_ok=True)
    staging = Path(tempfile.mkdtemp(prefix='preview-', dir=root))
    shutil.copytree(out, staging / 'site')
    old = root / 'preview-old'
    preview = root / 'preview'
    try:
        if old.exists():
            shutil.rmtree(old)
        if preview.exists():
            preview.rename(old)
        try:
            (staging / 'site').rename(preview)
        except Exception:
            if old.exists():
                old.rename(preview)
            raise
        if old.exists():
            shutil.rmtree(old)
    finally:
        shutil.rmtree(staging, ignore_errors=True)
    report('靜態預覽已準備完成；尚未發布到 GitHub。')
    return 'preview/index.html'

def backup(report):
    root = settings.PRIVATE_ROOT / 'backups'
    root.mkdir(parents=True, exist_ok=True)
    stamp = timezone.localtime().strftime('%Y%m%d-%H%M%S')
    name = f'lotus-{stamp}-{os.urandom(3).hex()}.zip'
    with content_lock(), tempfile.TemporaryDirectory(dir=root) as temporary:
        folder = Path(temporary)
        report('備份 PostgreSQL 與私人圖片…')
        db = settings.DATABASES['default']
        with (folder / 'database.dump').open('wb') as output:
            subprocess.run(['docker', 'compose', 'exec', '-T', 'db', 'pg_dump', '-Fc', '-U', db['USER'], db['NAME']], cwd=settings.ROOT, stdout=output, check=True, timeout=120)
        uploads = settings.MEDIA_ROOT
        if uploads.exists():
            shutil.copytree(uploads, folder / 'uploads')
        files = {str(p.relative_to(folder)): hashlib.sha256(p.read_bytes()).hexdigest() for p in folder.rglob('*') if p.is_file()}
        manifest = {'format': 1, 'created_at': timezone.now().isoformat(), 'records': ContentRecord.objects.count(), 'assets': Asset.objects.count(), 'files': files}
        (folder / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
        temp = root / (name + '.partial')
        try:
            with zipfile.ZipFile(temp, 'w', zipfile.ZIP_DEFLATED) as archive:
                for p in folder.rglob('*'):
                    if p.is_file():
                        archive.write(p, p.relative_to(folder))
            os.chmod(temp, 384)
            temp.rename(root / name)
        finally:
            temp.unlink(missing_ok=True)
    report('資料庫及圖片備份完成。')
    return 'backups/' + name

def recover_jobs():
    for job in PublishJob.objects.filter(active=True):
        if not job.pid:
            if job.created_at > timezone.now() - timedelta(seconds=30):
                continue
        else:
            try:
                os.kill(job.pid, 0)
                continue
            except ProcessLookupError:
                pass
            except PermissionError:
                continue
        PublishJob.objects.filter(pk=job.pk, active=True).update(active=False, status='failed', message='工作程序已中止，可重新執行。', finished_at=timezone.now())

def run_job(pk):
    job = PublishJob.objects.get(pk=pk)
    if not job.active:
        return
    PublishJob.objects.filter(pk=pk).update(status='running', started_at=timezone.now(), pid=os.getpid())

    def report(message):
        PublishJob.objects.filter(pk=pk).update(message=message)
    try:
        action = {'prepare': prepare, 'backup': backup, 'export': lambda r: (r('匯出公開內容…'), export_snapshot(), 'src/content/generated/portfolio.json')[-1]}[job.kind]
        artifact = action(report)
        PublishJob.objects.filter(pk=pk).update(status='done', active=False, artifact=artifact, finished_at=timezone.now())
    except Exception as error:
        message = str(error)[:1500] if isinstance(error, ValueError) else '工作失敗，請查看本機工作紀錄後重試。'
        PublishJob.objects.filter(pk=pk).update(status='failed', active=False, message=message, finished_at=timezone.now())
        import traceback
        traceback.print_exc()

def launch_worker(pk):
    folder = settings.PRIVATE_ROOT / 'jobs'
    folder.mkdir(parents=True, exist_ok=True)
    log = folder / f'{pk}.log'
    with log.open('wb') as stream:
        os.chmod(log, 384)
        worker = subprocess.Popen([sys.executable, str(settings.ROOT / 'cms/manage.py'), 'run_job', str(pk)], cwd=settings.ROOT, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
    return worker.pid

import json, shutil, tempfile, os
from pathlib import Path
from django.conf import settings
from django.db import transaction, connection
from portfolio.models import ContentRecord, Asset
from portfolio.services.validation import validate_data, local_text
from portfolio.services.locking import content_lock
from portfolio.services.glb import inspect_glb

def export_snapshot(root=None):
    root = Path(root or settings.EXPORT_ROOT)
    with content_lock():
        with transaction.atomic():
            if not connection.in_atomic_block or len(connection.savepoint_ids) == 0:
                with connection.cursor() as cursor:
                    cursor.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY')
            rows = list(ContentRecord.objects.filter(is_visible=True))
            assets = {str(x.id): x for x in Asset.objects.all()}
        used = {}

        def picture(pk):
            if not pk:
                return None
            if str(pk) not in assets:
                raise ValueError('公開內容的圖片不存在。')
            asset = assets[str(pk)]
            if not Path(asset.file.path).is_file():
                raise ValueError('公開圖片檔案不存在。')
            if not asset.file.name.endswith('.webp'):
                raise ValueError('作品圖片必須是圖片，不能使用模型。')
            alt = local_text(asset.alt)
            used[str(pk)] = asset
            return {'src': f'/assets/content/{asset.id}.webp', 'alt': alt, 'source': asset.source}
        snapshot = {'site': None, 'tech': [], 'experiences': [], 'projects': [], 'contact': []}
        for row in rows:
            d = validate_data(row.kind, row.data, publish=True)
            id = str(row.id)
            if row.kind == 'project' and isinstance(d.get('role'),dict) and not any(x.strip() for x in d['role'].values()):
                d = {**d, 'role': None}
            if row.kind == 'site':
                if snapshot['site'] is not None:
                    raise ValueError('只能有一份公開網站設定。')
                snapshot['site'] = {key: d.get(key) for key in ['displayName', 'roles', 'intro', 'services', 'description', 'sceneUrl']}
                model_id = d.get('modelAssetId')
                snapshot['site'].update(modelUrl=None, modelBindings=d.get('modelBindings', []), modelInteraction=d.get('modelInteraction') or 'hover')
                if model_id:
                    asset = assets.get(model_id)
                    if not asset or not asset.file.name.endswith('.glb') or not Path(asset.file.path).is_file():
                        raise ValueError('首頁模型不存在或不是 GLB。')
                    metadata = inspect_glb(Path(asset.file.path).read_bytes())
                    for binding in d.get('modelBindings', []):
                        if binding['node'] not in metadata['nodes'] or any(binding[x] not in metadata['animations'] for x in ['press', 'release']):
                            raise ValueError('按鍵對照的物件或動畫不存在於模型。')
                    used[model_id] = asset
                    snapshot['site']['modelUrl'] = f'/assets/content/{asset.id}.glb'
                    snapshot['site']['sceneUrl'] = None
                snapshot['site']['roles'] = d.get('roles', [])
                snapshot['site']['services'] = d.get('services', [])
            elif row.kind == 'tech':
                snapshot['tech'].append({'id': id, 'name': d['name'], 'category': d['category'], 'description': d['description'], 'sceneObjectName': d.get('sceneObjectName')})
            elif row.kind == 'experience':
                snapshot['experiences'].append({'id': id, **{key: d.get(key) for key in ['title', 'company', 'summary', 'period']}, 'highlights': d.get('highlights', []), 'technologies': d.get('technologies', [])})
            elif row.kind == 'project':
                snapshot['projects'].append({'id': id, 'slug': row.slug, 'featured': row.featured, **{key: d.get(key) for key in ['title', 'summary', 'description', 'role', 'period', 'githubUrl', 'demoUrl']}, 'tags': d.get('tags', []), 'technologies': d.get('technologies', []), 'highlights': d.get('highlights', []), 'cover': picture(d.get('coverAssetId')), 'gallery': [picture(pk) for pk in d.get('galleryAssetIds', [])]})
            elif row.kind == 'contact':
                snapshot['contact'].append({'id': id, **{key: d.get(key) for key in ['kind', 'label', 'value', 'url']}})
        if snapshot['site'] is None:
            raise ValueError('請設定並公開網站基本資訊。')
        # Validate every public record and image before replacing the previous snapshot.
        dest = root / 'src/content/generated/portfolio.json'
        media = root / 'public/assets/content'
        dest.parent.mkdir(parents=True, exist_ok=True)
        media.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=root) as directory:
            stage = Path(directory)
            newmedia = stage / 'newmedia'
            newmedia.mkdir()
            for pk, asset in used.items():
                shutil.copy2(asset.file.path, newmedia / f'{pk}{Path(asset.file.name).suffix}')
            newjson = stage / 'new.json'
            newjson.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
            oldjson = dest.read_bytes() if dest.exists() else None
            backup = stage / 'oldmedia'
            hadmedia = media.exists()
            try:
                if hadmedia:
                    os.replace(media, backup)
                os.replace(newmedia, media)
                os.replace(newjson, dest)
            except BaseException:
                if media.exists():
                    shutil.rmtree(media)
                if hadmedia and backup.exists():
                    os.replace(backup, media)
                if oldjson is not None:
                    dest.write_bytes(oldjson)
                elif dest.exists():
                    dest.unlink()
                raise
        return snapshot

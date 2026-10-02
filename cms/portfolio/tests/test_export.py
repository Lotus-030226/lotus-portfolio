from django.test import TestCase, override_settings, Client
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from portfolio.models import ContentRecord, Asset
from portfolio.services.export import export_snapshot
from portfolio.tests.test_api import project_data
from pathlib import Path
from PIL import Image
import tempfile, json, io

class ExportTests(TestCase):

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.override = override_settings(MEDIA_ROOT=self.root / 'private/uploads', EXPORT_ROOT=self.root)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.client.force_login(get_user_model().objects.create_user('tester', password='Test-password-123!', is_staff=True))
        ContentRecord.objects.create(kind='site', slug='site', is_visible=True, data={'displayName': 'Lotus', 'roles': ['AI Engineer'], 'intro': {'zh-TW': '介紹', 'en': 'Intro'}, 'services': [], 'description': 'Lotus portfolio'})

    def image(self):
        b = io.BytesIO()
        Image.new('RGB', (16, 16), 'red').save(b, format='PNG')
        return b.getvalue()

    def upload(self):
        return self.client.post('/api/assets/', {'file': SimpleUploadedFile('secret-name.png', self.image(), content_type='image/png'), 'alt': json.dumps({'zh-TW': '圖片', 'en': 'Image'}), 'source': 'Own work'})

    def test_upload_decodes_and_private_media_requires_login(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201)
        asset = Asset.objects.get(id=response.json()['id'])
        self.assertTrue(asset.file.name.endswith('.webp'))
        self.assertEqual(Client().get(f'/api/assets/{asset.id}/file/').status_code, 403)

    def test_upload_rejects_disguised_non_image(self):
        response = self.client.post('/api/assets/', {'file': SimpleUploadedFile('fake.png', b'<script>bad</script>', content_type='image/png'), 'alt': '{}'})
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Asset.objects.count(), 0)

    def test_hidden_content_notes_and_images_never_export(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201)
        asset_id = response.json()['id']
        hidden = project_data('PRIVATE')
        hidden['coverAssetId'] = asset_id
        ContentRecord.objects.create(kind='project', slug='private', data=hidden, is_visible=False, internal_notes='SECRET')
        ContentRecord.objects.create(kind='project', slug='visible', data=project_data('PUBLIC'), is_visible=True, internal_notes='SECRET')
        snapshot = export_snapshot(self.root)
        self.assertEqual([p['slug'] for p in snapshot['projects']], ['visible'])
        text = (self.root / 'src/content/generated/portfolio.json').read_text()
        self.assertNotIn('SECRET', text)
        self.assertNotIn('PRIVATE', text)
        self.assertEqual(list((self.root / 'public/assets/content').glob('*')), [])

    def test_missing_translation_preserves_previous_snapshot(self):
        ContentRecord.objects.create(kind='project', slug='ok', data=project_data(), is_visible=True)
        export_snapshot(self.root)
        path = self.root / 'src/content/generated/portfolio.json'
        old = path.read_bytes()
        ContentRecord.objects.create(kind='project', slug='bad', data={'title': {'zh-TW': '缺英語', 'en': ''}}, is_visible=True)
        with self.assertRaises(ValueError):
            export_snapshot(self.root)
        self.assertEqual(path.read_bytes(), old)

    def test_unpublishing_removes_previous_public_image(self):
        response = self.upload()
        self.assertEqual(response.status_code, 201)
        data = project_data()
        data['coverAssetId'] = response.json()['id']
        record = ContentRecord.objects.create(kind='project', slug='art', data=data, is_visible=True)
        export_snapshot(self.root)
        self.assertEqual(len(list((self.root / 'public/assets/content').glob('*.webp'))), 1)
        record.is_visible = False
        record.save()
        export_snapshot(self.root)
        self.assertEqual(len(list((self.root / 'public/assets/content').glob('*.webp'))), 0)

    def test_stale_asset_metadata_cannot_overwrite_new_description(self):
        asset_id=self.upload().json()['id'];url=f'/api/assets/{asset_id}/'
        first=self.client.patch(url,data=json.dumps({'version':1,'alt':{'zh-TW':'更新中文','en':'Image'},'source':'Own work'}),content_type='application/json')
        self.assertEqual(first.status_code,200)
        stale=self.client.patch(url,data=json.dumps({'version':1,'alt':{'zh-TW':'圖片','en':'New English'},'source':'Old source'}),content_type='application/json')
        self.assertEqual(stale.status_code,409)
        asset=Asset.objects.get(id=asset_id);self.assertEqual(asset.alt['zh-TW'],'更新中文');self.assertEqual(asset.source,'Own work')
        self.assertEqual(first.json()['version'],2)

    def test_empty_optional_role_exports_as_null(self):
        data=project_data();data['role']={'zh-TW':'','en':''}
        ContentRecord.objects.create(kind='project',slug='empty-role',data=data,is_visible=True)
        self.assertIsNone(export_snapshot(self.root)['projects'][0]['role'])

    def test_partial_optional_role_cannot_publish(self):
        data=project_data();data['role']={'zh-TW':'組長','en':''}
        ContentRecord.objects.create(kind='project',slug='partial-role',data=data,is_visible=True)
        with self.assertRaises(ValueError):export_snapshot(self.root)

    def test_public_images_without_descriptions_export_in_saved_order(self):
        ids=[]
        for _ in range(3):
            response=self.client.post('/api/assets/', {'file': SimpleUploadedFile('image.png', self.image(), content_type='image/png')})
            self.assertEqual(response.status_code,201)
            ids.append(response.json()['id'])
        data=project_data(); data['coverAssetId']=ids[2]; data['galleryAssetIds']=[ids[0],ids[1]]
        ContentRecord.objects.create(kind='project',slug='ordered',data=data,is_visible=True)
        project=export_snapshot(self.root)['projects'][0]
        self.assertEqual(project['cover']['src'],f'/assets/content/{ids[2]}.webp')
        self.assertEqual([a['src'] for a in project['gallery']],[f'/assets/content/{ids[0]}.webp',f'/assets/content/{ids[1]}.webp'])
        self.assertEqual(project['cover']['alt'],{'zh-TW':'','en':''})

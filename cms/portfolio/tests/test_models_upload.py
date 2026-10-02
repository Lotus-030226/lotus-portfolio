import json, struct
from pathlib import Path
from django.test import TestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from portfolio.tests.test_export import ExportTests
from portfolio.models import Asset, ContentRecord
from portfolio.services.export import export_snapshot

def glb(extra=None):
    data = {
        'asset': {'version': '2.0'}, 'scene': 0, 'scenes': [{'nodes': [0]}],
        'nodes': [{'name': 'Key', 'mesh': 0}],
        'meshes': [{'primitives': [{'attributes': {'POSITION': 0}}]}],
        'buffers': [{'byteLength': 68}],
        'bufferViews': [{'buffer': 0, 'byteOffset': 0, 'byteLength': 36}, {'buffer': 0, 'byteOffset': 36, 'byteLength': 8}, {'buffer': 0, 'byteOffset': 44, 'byteLength': 24}],
        'accessors': [{'bufferView': 0, 'componentType': 5126, 'count': 3, 'type': 'VEC3', 'min': [0,0,0], 'max': [1,1,0]}, {'bufferView': 1, 'componentType': 5126, 'count': 2, 'type': 'SCALAR', 'min': [0], 'max': [.16]}, {'bufferView': 2, 'componentType': 5126, 'count': 2, 'type': 'VEC3'}],
        'animations': [{'name': name, 'samplers': [{'input': 1, 'output': 2}], 'channels': [{'sampler': 0, 'target': {'node': 0, 'path': 'translation'}}]} for name in ['press_key', 'release_key']],
        **(extra or {})
    }
    raw = json.dumps(data).encode(); raw += b' ' * (-len(raw) % 4)
    binary = struct.pack('<17f', 0,0,0,1,0,0,0,1,0, 0,.16, 0,0,0,0,0,-1)
    return struct.pack('<4sII', b'glTF', 2, 28 + len(raw) + len(binary)) + struct.pack('<I4s', len(raw), b'JSON') + raw + struct.pack('<I4s', len(binary), b'BIN\x00') + binary

class ModelUploadTests(TestCase):
    setUp = ExportTests.setUp
    upload = ExportTests.upload
    image = ExportTests.image
    def model(self, data=None):
        return self.client.post('/api/assets/', {'file': SimpleUploadedFile('keyboard.glb', data or glb(), content_type='model/gltf-binary')})

    def test_upload_model_and_export_self_contained_asset(self):
        response = self.model(); self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()['kind'], 'model')
        self.assertEqual(response.json()['model']['animations'], ['press_key', 'release_key'])
        site = ContentRecord.objects.get(kind='site'); site.data['modelAssetId'] = response.json()['id']; site.save()
        snapshot = export_snapshot(self.root)
        path = self.root / 'public' / snapshot['site']['modelUrl'].lstrip('/')
        self.assertEqual(path.read_bytes(), glb())
        self.assertIsNone(snapshot['site']['sceneUrl'])
        self.assertEqual(self.client.get(response.json()['url'])['Content-Type'], 'model/gltf-binary')

    def test_rejects_external_resources_and_fake_glb(self):
        for data in [b'not a glb', glb({'images': [{'uri': 'https://example.com/track.png'}]}), glb({'buffers': [{'uri': '../secret.bin'}]}), glb({'scenes': [{'nodes': [999]}]}), glb({'nodes': [{'name': 'Key', 'children': [0]}]}), glb({'meshes': [{'primitives': [{'attributes': {'POSITION': 999}}]}]})]:
            self.assertEqual(self.model(data).status_code, 400)
        self.assertEqual(Asset.objects.count(), 0)

    def test_model_cannot_be_used_as_project_image(self):
        from portfolio.tests.test_api import project_data
        data = project_data(); data['coverAssetId'] = self.model().json()['id']
        ContentRecord.objects.create(kind='project', slug='wrong', data=data, is_visible=True)
        with self.assertRaises(ValueError): export_snapshot(self.root)

    def test_invalid_animation_binding_preserves_snapshot(self):
        model = self.model().json(); site = ContentRecord.objects.get(kind='site')
        site.data.update(modelAssetId=model['id'], modelBindings=[{'technology': 'Python', 'node': 'Key', 'press': 'missing', 'release': 'release_key'}]); site.save()
        with self.assertRaises(ValueError): export_snapshot(self.root)

    def test_removing_one_project_image_preserves_other_projects(self):
        from portfolio.tests.test_api import project_data
        image = self.upload().json()['id']; data = project_data(); data['coverAssetId'] = image
        one = ContentRecord.objects.create(kind='project', slug='one', data=data, is_visible=True)
        two = ContentRecord.objects.create(kind='project', slug='two', data=data, is_visible=True)
        removed = {**data, 'coverAssetId': None}
        response = self.client.patch(f'/api/records/{one.id}/', json.dumps({'version': 1, 'data': removed}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        snapshot = export_snapshot(self.root)
        self.assertIsNone(next(p for p in snapshot['projects'] if p['slug']=='one')['cover'])
        self.assertIsNotNone(next(p for p in snapshot['projects'] if p['slug']=='two')['cover'])
        self.assertTrue(Asset.objects.get(id=image).file.storage.exists(Asset.objects.get(id=image).file.name))

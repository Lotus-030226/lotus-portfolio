import json, tempfile
from pathlib import Path
from unittest.mock import patch
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from portfolio.models import PublishJob, ContentRecord
from portfolio.tests.test_api import project_data

class JobTests(TestCase):

    def setUp(self):
        self.client.force_login(get_user_model().objects.create_user('jobs', password='Test-password-123!', is_staff=True))

    def test_start_job_and_reject_second_active_job(self):
        with patch('portfolio.api.jobs.launch_worker', return_value=123):
            first = self.client.post('/api/jobs/', data=json.dumps({'kind': 'prepare'}), content_type='application/json')
            self.assertEqual(first.status_code, 202)
            self.assertEqual(self.client.post('/api/jobs/', data=json.dumps({'kind': 'backup'}), content_type='application/json').status_code, 409)
        self.assertEqual(PublishJob.objects.filter(active=True).count(), 1)

    def test_unknown_command_rejected(self):
        self.assertEqual(self.client.post('/api/jobs/', data=json.dumps({'kind': 'shell'}), content_type='application/json').status_code, 400)

    def test_worker_failure_unlocks_next_job(self):
        from portfolio.services.jobs import run_job
        job = PublishJob.objects.create(kind='prepare')
        with patch('portfolio.services.jobs.prepare', side_effect=ValueError('缺少英文翻譯')):
            run_job(job.id)
        job.refresh_from_db()
        self.assertFalse(job.active)
        self.assertEqual(job.status, 'failed')
        self.assertIn('英文', job.message)

    def test_orphaned_job_recovered(self):
        from portfolio.services.jobs import recover_jobs
        job = PublishJob.objects.create(kind='prepare', pid=99999999, status='running')
        recover_jobs()
        job.refresh_from_db()
        self.assertFalse(job.active)
        self.assertEqual(job.status, 'failed')

    def test_preview_replacement_preserves_previous_on_failed_build(self):
        from portfolio.services.jobs import prepare
        with tempfile.TemporaryDirectory() as d, override_settings(PRIVATE_ROOT=Path(d)):
            preview = Path(d) / 'preview'
            preview.mkdir()
            (preview / 'index.html').write_text('old')
            with patch('portfolio.services.jobs.export_snapshot'), patch('portfolio.services.jobs.subprocess.run', side_effect=RuntimeError('build failed')):
                with self.assertRaises(RuntimeError):
                    prepare(lambda _: None)
            self.assertEqual((preview / 'index.html').read_text(), 'old')

class InputRegressionTests(TestCase):

    def setUp(self):
        self.client.force_login(get_user_model().objects.create_user('inputs', password='Test-password-123!', is_staff=True))
        self.row = ContentRecord.objects.create(kind='project', slug='one', data=project_data())

    def test_null_gallery_is_validation_error(self):
        data = project_data()
        data['galleryAssetIds'] = None
        response = self.client.patch(f'/api/records/{self.row.id}/', data=json.dumps({'version': 1, 'data': data}), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_non_string_reorder_id_is_validation_error(self):
        response = self.client.post('/api/reorder/', data=json.dumps({'kind': 'project', 'items': [{'id': {}, 'version': 1}]}), content_type='application/json')
        self.assertEqual(response.status_code, 400)

class MalformedPayloadTests(TestCase):

    def setUp(self):
        self.client.force_login(get_user_model().objects.create_user('malformed', password='Test-password-123!', is_staff=True))

    def test_mutation_payloads_require_objects(self):
        for endpoint in ['/api/reorder/', '/api/jobs/']:
            with self.subTest(endpoint=endpoint):
                self.assertEqual(self.client.post(endpoint, data='[]', content_type='application/json').status_code, 400)

    def test_command_and_reorder_kind_require_strings(self):
        for endpoint in ['/api/reorder/', '/api/jobs/']:
            with self.subTest(endpoint=endpoint):
                self.assertEqual(self.client.post(endpoint, data=json.dumps({'kind': [], 'items': []}), content_type='application/json').status_code, 400)

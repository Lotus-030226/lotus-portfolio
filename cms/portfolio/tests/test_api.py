from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from portfolio.models import ContentRecord
import json

def project_data(title='A'):
    return {'title': {'zh-TW': title, 'en': title}, 'summary': {'zh-TW': '摘要', 'en': 'Summary'}, 'description': {'zh-TW': '內容', 'en': 'Description'}, 'tags': [], 'technologies': [], 'highlights': [], 'galleryAssetIds': []}

class EditingTests(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user('tester', password='Test-password-123!', is_staff=True)
        self.client.force_login(self.user)
        self.record = ContentRecord.objects.create(kind='project', slug='one', data=project_data())

    def test_anonymous_cannot_read_management_content(self):
        response = Client().get('/api/records/?kind=project')
        self.assertEqual(response.status_code, 403)

    def test_can_save_incomplete_bilingual_draft(self):
        response = self.client.post('/api/records/', data=json.dumps({'kind': 'project', 'slug': 'draft', 'data': {'title': {'zh-TW': '草稿', 'en': ''}}, 'is_visible': False}), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        self.assertEqual(ContentRecord.objects.get(slug='draft').data['title']['en'], '')

    def test_rejects_unsafe_project_link(self):
        data = project_data()
        data['demoUrl'] = 'javascript:alert(1)'
        response = self.client.patch(f'/api/records/{self.record.id}/', data=json.dumps({'version': 1, 'data': data}), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.record.refresh_from_db()
        self.assertEqual(self.record.version, 1)

    def test_stale_save_does_not_overwrite_content(self):
        url = f'/api/records/{self.record.id}/'
        first = self.client.patch(url, data=json.dumps({'version': 1, 'data': project_data('New')}), content_type='application/json')
        self.assertEqual(first.status_code, 200)
        stale = self.client.patch(url, data=json.dumps({'version': 1, 'data': project_data('Old')}), content_type='application/json')
        self.assertEqual(stale.status_code, 409)
        self.record.refresh_from_db()
        self.assertEqual(self.record.data['title']['en'], 'New')

    def test_reorder_rejects_missing_or_duplicate_records(self):
        ContentRecord.objects.create(kind='project', slug='two', data=project_data())
        response = self.client.post('/api/reorder/', data=json.dumps({'kind': 'project', 'items': [{'id': str(self.record.id), 'version': 1}]}), content_type='application/json')
        self.assertEqual(response.status_code, 400)

    def test_reorder_returns_new_versions_and_order(self):
        second = ContentRecord.objects.create(kind='project', slug='two', data=project_data())
        items = [{'id': str(second.id), 'version': 1}, {'id': str(self.record.id), 'version': 1}]
        response = self.client.post('/api/reorder/', data=json.dumps({'kind': 'project', 'items': items}), content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(list(ContentRecord.objects.filter(kind='project').values_list('slug', flat=True)), ['two', 'one'])
        self.record.refresh_from_db()
        self.assertEqual(self.record.version, 2)

class LoginTests(TestCase):

    def setUp(self):
        self.user = get_user_model().objects.create_user('tester', password='Test-password-123!', is_staff=True)
        self.client = Client(enforce_csrf_checks=True)

    def test_login_requires_csrf_even_for_anonymous(self):
        response = self.client.post('/api/auth/login/', data=json.dumps({'username': 'tester', 'password': 'Test-password-123!'}), content_type='application/json')
        self.assertEqual(response.status_code, 403)

    def test_csrf_login_and_authenticated_session_work(self):
        self.assertEqual(self.client.get('/api/auth/session/').status_code, 200)
        token = self.client.cookies['csrftoken'].value
        response = self.client.post('/api/auth/login/', data=json.dumps({'username': 'tester', 'password': 'Test-password-123!'}), content_type='application/json', HTTP_X_CSRFTOKEN=token)
        self.assertEqual(response.status_code, 200)
        self.assertTrue(self.client.get('/api/auth/session/').json()['authenticated'])
        response = self.client.post('/api/records/', data=json.dumps({'kind': 'project', 'slug': 'x', 'data': project_data()}), content_type='application/json')
        self.assertEqual(response.status_code, 403)

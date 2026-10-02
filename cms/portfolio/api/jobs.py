from django.db import transaction, IntegrityError
from django.utils import timezone
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.conf import settings
from portfolio.api.base import ManagementView
from rest_framework.response import Response
from portfolio.models import PublishJob
from portfolio.services.jobs import launch_worker, recover_jobs

def serialize(job):
    return {'id': str(job.id), 'kind': job.kind, 'status': job.status, 'active': job.active, 'message': job.message, 'artifact': job.artifact, 'created_at': job.created_at, 'finished_at': job.finished_at}

class Jobs(ManagementView):

    def get(self, request):
        recover_jobs()
        return Response([serialize(x) for x in PublishJob.objects.order_by('-created_at')[:20]])

    def post(self, request):
        kind = request.data.get('kind')
        if not isinstance(kind, str) or kind not in {'prepare', 'backup', 'export'}:
            return Response({'error': '不支援的工作。'}, status=400)
        try:
            with transaction.atomic():
                job = PublishJob.objects.create(kind=kind)
        except IntegrityError:
            return Response({'error': '已有工作進行中，請等候完成。'}, status=409)
        try:
            pid = launch_worker(job.id)
            PublishJob.objects.filter(pk=job.id, active=True).update(pid=pid)
        except Exception:
            PublishJob.objects.filter(pk=job.id).update(status='failed', active=False, message='無法啟動工作，請檢查本機執行環境。', finished_at=timezone.now())
            return Response({'error': '無法啟動工作。'}, status=500)
        job.refresh_from_db()
        return Response(serialize(job), status=202)

class BackupDownload(ManagementView):

    def get(self, request, pk):
        job = get_object_or_404(PublishJob, pk=pk, kind='backup', status='done')
        path = (settings.PRIVATE_ROOT / job.artifact).resolve()
        if not path.is_relative_to((settings.PRIVATE_ROOT / 'backups').resolve()) or not path.is_file():
            return Response({'error': '備份不存在。'}, status=404)
        return FileResponse(path.open('rb'), as_attachment=True, filename=path.name, content_type='application/zip')

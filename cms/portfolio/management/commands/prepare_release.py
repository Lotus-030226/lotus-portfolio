from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError
from portfolio.models import PublishJob
from portfolio.services.jobs import recover_jobs, run_job

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('--kind', choices=['prepare', 'backup', 'export'], default='prepare')

    def handle(self, *args, **options):
        recover_jobs()
        try:
            job = PublishJob.objects.create(kind=options['kind'])
        except IntegrityError:
            raise CommandError('已有工作執行中。')
        run_job(job.id)
        job.refresh_from_db()
        if job.status != 'done':
            raise CommandError(job.message)
        self.stdout.write(self.style.SUCCESS(job.message + ' ' + job.artifact))

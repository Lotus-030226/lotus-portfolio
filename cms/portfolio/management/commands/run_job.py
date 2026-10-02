from django.core.management.base import BaseCommand
from portfolio.services.jobs import run_job

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('id')

    def handle(self, *args, **options):
        run_job(options['id'])

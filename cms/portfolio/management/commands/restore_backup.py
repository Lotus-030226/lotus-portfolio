from django.core.management.base import BaseCommand, CommandError
from portfolio.services.restore import restore

class Command(BaseCommand):
    help = '驗證並還原到新的 lotus_restore_ 資料庫；不覆寫現用資料。'

    def add_arguments(self, parser):
        parser.add_argument('archive')
        parser.add_argument('--database', required=True)

    def handle(self, *args, **options):
        try:
            result = restore(options['archive'], options['database'])
        except Exception as error:
            raise CommandError(str(error))
        self.stdout.write(str(result))

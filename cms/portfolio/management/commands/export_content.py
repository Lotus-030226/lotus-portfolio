from django.core.management.base import BaseCommand, CommandError
from portfolio.services.export import export_snapshot

class Command(BaseCommand):

    def handle(self, *args, **options):
        try:
            snapshot = export_snapshot()
        except ValueError as e:
            raise CommandError(str(e))
        self.stdout.write(f"Exported {len(snapshot['projects'])} public projects.")

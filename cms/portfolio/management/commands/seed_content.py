import json
from pathlib import Path
from django.core.management.base import BaseCommand
from django.db import transaction
from portfolio.models import ContentRecord
from portfolio.services.locking import content_lock

class Command(BaseCommand):
    help = 'Import initial content without overwriting existing edits.'

    def handle(self, *args, **options):
        rows = json.loads((Path(__file__).resolve().parents[2] / 'initial_content.json').read_text())
        count = 0
        with content_lock(), transaction.atomic():
            for row in rows:
                kind = row.pop('kind')
                slug = row.pop('slug')
                _, created = ContentRecord.objects.get_or_create(kind=kind, slug=slug, defaults=row)
                count += created
        self.stdout.write(f'Added {count} records; existing records preserved.')

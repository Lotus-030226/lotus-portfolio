from contextlib import contextmanager
from django.db import connection
LOCK_KEY = 739421013

@contextmanager
def content_lock():
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_lock(%s)', [LOCK_KEY])
    try:
        yield
    finally:
        with connection.cursor() as cursor:
            cursor.execute('SELECT pg_advisory_unlock(%s)', [LOCK_KEY])

from django.db import models
from django.db.models import Q
import uuid

class ContentRecord(models.Model):
    KINDS = [(x, x) for x in ['site', 'tech', 'experience', 'project', 'contact']]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=20, choices=KINDS)
    slug = models.SlugField(max_length=100)
    data = models.JSONField(default=dict)
    is_visible = models.BooleanField(default=False)
    featured = models.BooleanField(default=False)
    sort_order = models.PositiveIntegerField(default=0)
    version = models.PositiveIntegerField(default=1)
    internal_notes = models.TextField(blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['sort_order', 'slug']
        constraints = [models.UniqueConstraint(fields=['kind', 'slug'], name='unique_content_slug'), models.UniqueConstraint(fields=['kind'], condition=Q(kind='site'), name='one_site_config')]

class Asset(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.FileField(upload_to='media/')
    alt = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=1)
    source = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class PublishJob(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=12)
    status = models.CharField(max_length=12, default='queued')
    active = models.BooleanField(default=True)
    message = models.TextField(blank=True)
    pid = models.PositiveIntegerField(null=True)
    started_at = models.DateTimeField(null=True)
    artifact = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['active'], condition=Q(active=True), name='one_active_job')]

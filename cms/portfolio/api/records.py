from portfolio.api.base import ManagementView
from rest_framework.response import Response
from rest_framework import serializers
from django.db import transaction, IntegrityError
from django.shortcuts import get_object_or_404
from portfolio.models import ContentRecord
from portfolio.services.validation import validate_data
from portfolio.services.locking import content_lock

class RecordSerializer(serializers.ModelSerializer):

    class Meta:
        model = ContentRecord
        fields = ['id', 'kind', 'slug', 'data', 'is_visible', 'featured', 'sort_order', 'version', 'updated_at']
        read_only_fields = ['id', 'version', 'updated_at']

def check_payload(kind, data):
    try:
        validate_data(kind, data)
    except ValueError as e:
        raise serializers.ValidationError({'data': str(e)})

class Records(ManagementView):

    def get(self, request):
        query = ContentRecord.objects.all()
        if request.query_params.get('kind'):
            query = query.filter(kind=request.query_params['kind'])
        return Response(RecordSerializer(query, many=True).data)

    def post(self, request):
        serializer = RecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        kind = serializer.validated_data['kind']
        if kind == 'site' and ContentRecord.objects.filter(kind='site').exists():
            return Response({'error': '網站設定已存在。'}, status=400)
        check_payload(kind, serializer.validated_data.get('data', {}))
        with content_lock(), transaction.atomic():
            if kind == 'site' and ContentRecord.objects.filter(kind='site').exists():
                return Response({'error': '網站設定已存在。'}, status=400)
            try:
                with transaction.atomic():
                    record = serializer.save()
            except IntegrityError:
                return Response({'error': '識別名稱已存在。'}, status=400)
        return Response(RecordSerializer(record).data, status=201)

class RecordDetail(ManagementView):

    def patch(self, request, pk):
        with content_lock(), transaction.atomic():
            record = get_object_or_404(ContentRecord.objects.select_for_update(), pk=pk)
            if type(request.data.get('version')) is not int or request.data['version'] != record.version:
                return Response({'error': '內容已由其他頁面更新，請重新載入後再編輯。'}, status=409)
            if 'kind' in request.data and request.data['kind'] != record.kind:
                return Response({'error': '無法變更內容類型。'}, status=400)
            serializer = RecordSerializer(record, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            check_payload(record.kind, serializer.validated_data.get('data', record.data))
            record = serializer.save(version=record.version + 1)
            return Response(RecordSerializer(record).data)

    def delete(self, request, pk):
        with content_lock(), transaction.atomic():
            record = get_object_or_404(ContentRecord.objects.select_for_update(), pk=pk)
            if record.kind == 'site':
                return Response({'error': '網站設定不能刪除。'}, status=400)
            if type(request.data.get('version')) is not int or request.data.get('version') != record.version:
                return Response({'error': '內容已更新，請重新載入。'}, status=409)
            record.delete()
        return Response(status=204)

class Reorder(ManagementView):

    def post(self, request):
        kind = request.data.get('kind')
        items = request.data.get('items')
        if not isinstance(kind, str) or kind not in dict(ContentRecord.KINDS) or (not isinstance(items, list)):
            return Response({'error': '排序資料不正確。'}, status=400)
        with content_lock(), transaction.atomic():
            rows = list(ContentRecord.objects.select_for_update().filter(kind=kind))
            by_id = {str(x.id): x for x in rows}
            if any((not isinstance(x, dict) for x in items)):
                return Response({'error': '排序項目格式不正確。'}, status=400)
            ids = [x.get('id') for x in items]
            if any((not isinstance(x, str) for x in ids)):
                return Response({'error': '識別碼格式不正確。'}, status=400)
            if len(ids) != len(by_id) or len(set(ids)) != len(ids) or set(ids) != set(by_id):
                return Response({'error': '排序必須包含此分類所有項目。'}, status=400)
            if any((type(x.get('version')) is not int or x.get('version') != by_id[x['id']].version for x in items)):
                return Response({'error': '內容已更新，請重新載入排序。'}, status=409)
            for i, item in enumerate(items):
                row = by_id[item['id']]
                row.sort_order = i
                row.version += 1
                row.save(update_fields=['sort_order', 'version', 'updated_at'])
        return Response(RecordSerializer(ContentRecord.objects.filter(kind=kind), many=True).data)

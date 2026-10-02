import io, json, uuid
from pathlib import Path
from PIL import Image, ImageOps, UnidentifiedImageError
from portfolio.api.base import ManagementView
from rest_framework.response import Response
from django.core.files.base import ContentFile
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.db import transaction
from portfolio.models import Asset
from portfolio.services.validation import local_text
from portfolio.services.locking import content_lock
from portfolio.services.glb import inspect_glb, MAX_MODEL_BYTES

def serialize(asset):
    model = asset.file.name.endswith('.glb')
    return {'kind': 'model' if model else 'image', 'model': inspect_glb(Path(asset.file.path).read_bytes()) if model else None, 'id': str(asset.id), 'version': asset.version, 'alt': asset.alt, 'source': asset.source, 'url': f'/api/assets/{asset.id}/file/'}

class Assets(ManagementView):

    def get(self, request):
        return Response([serialize(x) for x in Asset.objects.order_by('-created_at')])

    def post(self, request):
        upload = request.FILES.get('file')
        if upload and upload.name.lower().endswith('.glb'):
            if upload.size > MAX_MODEL_BYTES:
                return Response({'error': '模型需為 20 MB 以內的 GLB。'}, status=400)
            raw = upload.read()
            try:
                inspect_glb(raw)
            except ValueError as error:
                return Response({'error': str(error)}, status=400)
            with content_lock():
                asset = Asset(alt={}, source='')
                asset.file.save(f'{uuid.uuid4()}.glb', ContentFile(raw), save=True)
            return Response(serialize(asset), status=201)
        if not upload or upload.size > 10 * 1024 * 1024:
            return Response({'error': '請選擇 10 MB 以內的 PNG、JPEG 或 WebP 圖片。'}, status=400)
        try:
            alt = local_text(json.loads(request.data.get('alt', '{}')))
            source = request.data.get('source', '')
            if not isinstance(source, str) or len(source) > 300:
                raise ValueError('圖片來源文字太長。')
            with Image.open(upload) as image:
                if image.format not in {'PNG', 'JPEG', 'WEBP'} or image.width * image.height > 20000000:
                    raise ValueError('不支援的圖片格式或尺寸過大。')
                image = ImageOps.exif_transpose(image)
                image.thumbnail((1920, 1920))
                image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
                output = io.BytesIO()
                image.save(output, format='WEBP', quality=88)
        except (ValueError, TypeError, UnidentifiedImageError, OSError, Image.DecompressionBombError):
            return Response({'error': '圖片無法解碼，或格式、尺寸、文字不正確。'}, status=400)
        with content_lock():
            asset = Asset(alt=alt, source=source)
            asset.file.save(f'{uuid.uuid4()}.webp', ContentFile(output.getvalue()), save=True)
        return Response(serialize(asset), status=201)

class AssetFile(ManagementView):

    def get(self, request, pk):
        asset = get_object_or_404(Asset, pk=pk)
        return FileResponse(asset.file.open('rb'), content_type='model/gltf-binary' if asset.file.name.endswith('.glb') else 'image/webp')

class AssetDetail(ManagementView):

    def patch(self, request, pk):
        try:
            alt = local_text(request.data.get('alt', {}))
            source = request.data.get('source', '')
            if not isinstance(source, str) or len(source) > 300:
                raise ValueError('圖片來源文字太長。')
        except ValueError as error:
            return Response({'error': str(error)}, status=400)
        with content_lock(), transaction.atomic():
            asset = get_object_or_404(Asset.objects.select_for_update(), pk=pk)
            if type(request.data.get('version')) is not int or request.data['version'] != asset.version:
                return Response({'error': '圖片描述已由其他頁面更新，請重新載入圖片庫後再編輯。'}, status=409)
            asset.alt = alt
            asset.source = source
            asset.version += 1
            asset.save(update_fields=['alt', 'source', 'version'])
        return Response(serialize(asset))

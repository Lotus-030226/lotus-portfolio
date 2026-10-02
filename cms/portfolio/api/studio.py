from django.conf import settings
from django.http import FileResponse, HttpResponse
from django.views.decorators.http import require_GET
from pathlib import Path
import mimetypes

@require_GET
def studio(request, asset=''):
    root = (settings.ROOT / 'admin-ui/dist').resolve()
    path = (root / (asset or 'index.html')).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        return HttpResponse('請先執行 pnpm admin:build。', status=404)
    return FileResponse(path.open('rb'), content_type=mimetypes.guess_type(path.name)[0] or 'application/octet-stream')

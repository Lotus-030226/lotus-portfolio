import json
from django.http import JsonResponse
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_protect
from django.views.decorators.http import require_GET, require_POST

@require_GET
@ensure_csrf_cookie
def session(request):
    return JsonResponse({'authenticated': request.user.is_authenticated and request.user.is_staff, 'username': request.user.username if request.user.is_authenticated and request.user.is_staff else ''})

@require_POST
@csrf_protect
def sign_in(request):
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError()
        username = data.get('username')
        password = data.get('password')
        if not isinstance(username, str) or not isinstance(password, str) or len(username) > 150 or (len(password) > 1000):
            raise ValueError()
    except (ValueError, TypeError):
        return JsonResponse({'error': '登入資料格式不正確。'}, status=400)
    user = authenticate(request, username=username, password=password)
    if not user or not user.is_staff:
        return JsonResponse({'error': '帳號或密碼不正確。'}, status=401)
    login(request, user)
    return JsonResponse({'authenticated': True, 'username': user.username})

@require_POST
@csrf_protect
def sign_out(request):
    logout(request)
    return JsonResponse({'authenticated': False})

from django.core.validators import URLValidator, EmailValidator
from django.core.exceptions import ValidationError
from uuid import UUID
TEXT_FIELDS = {'site': {'displayName', 'description', 'sceneUrl', 'modelAssetId', 'modelInteraction'}, 'tech': {'name', 'category', 'sceneObjectName'}, 'experience': {'period'}, 'project': {'period', 'githubUrl', 'demoUrl', 'coverAssetId'}, 'contact': {'kind', 'value', 'url'}}
LOCAL_FIELDS = {'site': {'intro'}, 'tech': {'description'}, 'experience': {'title', 'company', 'summary'}, 'project': {'title', 'summary', 'description', 'role'}, 'contact': {'label'}}
ARRAY_FIELDS = {'site': {'roles', 'services', 'modelBindings'}, 'tech': set(), 'experience': {'highlights', 'technologies'}, 'project': {'highlights', 'tags', 'technologies', 'galleryAssetIds'}, 'contact': set()}
REQUIRED = {'site': ['displayName', 'intro', 'description'], 'tech': ['name', 'category', 'description'], 'experience': ['title', 'company', 'summary'], 'project': ['title', 'summary', 'description'], 'contact': ['kind', 'label', 'value']}

def local_text(value, required=False):
    if not isinstance(value, dict) or set(value) - {'zh-TW', 'en'}:
        raise ValueError('請填寫中英文文字。')
    for lang in ['zh-TW', 'en']:
        text = value.get(lang, '')
        if not isinstance(text, str) or len(text) > 30000:
            raise ValueError('文字格式或長度不正確。')
        if required and (not text.strip()):
            raise ValueError('公開內容需填齊中英文。')
    return {'zh-TW': value.get('zh-TW', ''), 'en': value.get('en', '')}

def safe_url(value, mailto=False):
    if not value:
        return
    if not isinstance(value, str) or len(value) > 2000 or any((ord(c) < 32 for c in value)):
        raise ValueError('網址格式不正確。')
    try:
        if mailto and value.startswith('mailto:'):
            EmailValidator()(value[7:])
        else:
            URLValidator(schemes=['https', 'http'])(value)
    except ValidationError:
        raise ValueError('請使用有效的 http／https 網址。')

def validate_data(kind, data, publish=False):
    if kind not in TEXT_FIELDS or not isinstance(data, dict):
        raise ValueError('內容類型不正確。')
    allowed = TEXT_FIELDS[kind] | LOCAL_FIELDS[kind] | ARRAY_FIELDS[kind]
    if set(data) - allowed:
        raise ValueError('內容包含不支援的欄位。')
    for key, value in data.items():
        if value is None:
            if key in ARRAY_FIELDS[kind]:
                raise ValueError('清單不能是空值，請使用空清單。')
            if key in LOCAL_FIELDS[kind] and key != 'role':
                raise ValueError('請填寫中英文文字。')
            continue
        if key in LOCAL_FIELDS[kind]:
            filled_optional = key == 'role' and isinstance(value,dict) and any(isinstance(x,str) and x.strip() for x in value.values())
            local_text(value, publish and (key in REQUIRED[kind] or filled_optional))
        elif key in ARRAY_FIELDS[kind]:
            if not isinstance(value, list) or len(value) > 100:
                raise ValueError('清單格式不正確或項目過多。')
            for item in value:
                if key == 'modelBindings':
                    if not isinstance(item, dict) or set(item) != {'technology', 'node', 'press', 'release'} or any(not isinstance(x, str) or not x or len(x)>200 for x in item.values()):
                        raise ValueError('按鍵動畫對照格式不正確。')
                elif key in {'services', 'highlights'}:
                    local_text(item, publish)
                elif not isinstance(item, str) or len(item) > 200:
                    raise ValueError('清單內容格式不正確。')
        elif not isinstance(value, str) or len(value) > 2000:
            raise ValueError('欄位格式不正確。')
    for key in ['githubUrl', 'demoUrl', 'url']:
        if key in data:
            safe_url(data[key], kind == 'contact')
    scene = data.get('sceneUrl')
    if scene:
        if scene.startswith('/assets/') and '..' not in scene:
            pass
        else:
            safe_url(scene)
    if data.get('modelInteraction') not in {None, '', 'hover', 'click'}:
        raise ValueError('動畫觸發方式不正確。')
    for value in ([data.get('modelAssetId')] if data.get('modelAssetId') else []) + ([data.get('coverAssetId')] if data.get('coverAssetId') else []) + data.get('galleryAssetIds', []):
        try:
            UUID(value)
        except (ValueError, TypeError, AttributeError):
            raise ValueError('圖片識別碼不正確。')
    if kind == 'contact' and data.get('kind') not in {None, 'email', 'github', 'line', 'link'}:
        raise ValueError('聯絡方式不正確。')
    if kind == 'contact' and data.get('kind') == 'email' and data.get('value'):
        try:
            EmailValidator()(data['value'])
        except ValidationError:
            raise ValueError('Email 格式不正確。')
    if publish:
        for key in REQUIRED[kind]:
            value = data.get(key)
            if key in LOCAL_FIELDS[kind]:
                local_text(value, True)
            elif not isinstance(value, str) or not value.strip():
                raise ValueError('公開內容缺少必要欄位：' + key)
    return data

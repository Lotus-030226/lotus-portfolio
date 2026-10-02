import json, struct

MAX_MODEL_BYTES = 20 * 1024 * 1024

def inspect_glb(raw):
    try:
        if len(raw) < 20 or len(raw) > MAX_MODEL_BYTES:
            raise ValueError('模型需為 20 MB 以內的 GLB。')
        magic, version, length = struct.unpack_from('<4sII', raw)
        if magic != b'glTF' or version != 2 or length != len(raw):
            raise ValueError('GLB 檔頭或長度不正確。')
        offset = 12; document = None; binary_size = 0
        while offset < len(raw):
            size, kind = struct.unpack_from('<I4s', raw, offset)
            offset += 8
            if size % 4 or offset + size > len(raw): raise ValueError('GLB 區塊不正確。')
            if document is None:
                if kind != b'JSON': raise ValueError('GLB 缺少 JSON。')
                document = json.loads(raw[offset:offset+size])
            elif kind == b'BIN\x00':
                binary_size = size
            offset += size
        if not isinstance(document, dict) or document.get('asset', {}).get('version') != '2.0':
            raise ValueError('只支援 GLB 2.0。')
        for item in document.get('buffers', []) + document.get('images', []):
            if item.get('uri'):
                raise ValueError('請匯出內含貼圖的 GLB，不能引用外部檔案。')
        if document.get('extensionsRequired'):
            raise ValueError('請匯出未壓縮的標準 GLB。')
        def items(key):
            value = document.get(key, [])
            if not isinstance(value, list) or len(value) > 10000 or any(not isinstance(x, dict) for x in value):
                raise ValueError('模型清單格式不正確。')
            return value
        def reference(index, values):
            if type(index) is not int or not 0 <= index < len(values):
                raise ValueError('模型物件索引不存在。')
        scenes, nodes, meshes = items('scenes'), items('nodes'), items('meshes')
        buffers, views, accessors = items('buffers'), items('bufferViews'), items('accessors')
        materials, textures, images = items('materials'), items('textures'), items('images')
        if not scenes or not nodes or not meshes:
            raise ValueError('模型缺少可顯示的場景或幾何。')
        reference(document.get('scene', 0), scenes)
        for scene in scenes:
            for index in scene.get('nodes', []): reference(index, nodes)
        # Validate graph links and cycles before the browser recursively builds it.
        for node in nodes:
            if 'mesh' in node: reference(node['mesh'], meshes)
            if 'camera' in node: reference(node['camera'], items('cameras'))
            if 'skin' in node: reference(node['skin'], items('skins'))
            if not isinstance(node.get('children', []), list): raise ValueError('模型子節點格式不正確。')
            for child in node.get('children', []): reference(child, nodes)
        colors = {}
        for start in range(len(nodes)):
            stack = [(start, False)]
            while stack:
                index, leaving = stack.pop()
                if leaving: colors[index] = 2; continue
                if colors.get(index) == 1: raise ValueError('模型節點不能循環引用。')
                if colors.get(index) == 2: continue
                colors[index] = 1; stack.append((index, True))
                stack.extend((child, False) for child in nodes[index].get('children', []))
        for buffer in buffers:
            size = buffer.get('byteLength')
            if type(size) is not int or size < 0 or size > binary_size: raise ValueError('模型二進位資料不完整。')
        for view in views:
            reference(view.get('buffer'), buffers)
            offset, size = view.get('byteOffset', 0), view.get('byteLength')
            if type(offset) is not int or type(size) is not int or offset < 0 or size < 0 or offset+size > buffers[view['buffer']]['byteLength']:
                raise ValueError('模型資料範圍不正確。')
        for accessor in accessors:
            if 'bufferView' in accessor: reference(accessor['bufferView'], views)
            if type(accessor.get('count')) is not int or not 0 <= accessor['count'] <= 2000000:
                raise ValueError('模型頂點資料不正確或過多。')
        for mesh in meshes:
            if not mesh.get('primitives'): raise ValueError('模型缺少幾何。')
            for primitive in mesh['primitives']:
                if 'POSITION' not in primitive.get('attributes', {}): raise ValueError('模型缺少位置資料。')
                for index in primitive['attributes'].values(): reference(index, accessors)
                if 'indices' in primitive: reference(primitive['indices'], accessors)
                if 'material' in primitive: reference(primitive['material'], materials)
        for image in images:
            if 'bufferView' in image: reference(image['bufferView'], views)
        for texture in textures:
            if 'source' in texture: reference(texture['source'], images)
        for animation in items('animations'):
            samplers = animation.get('samplers', [])
            if not animation.get('channels') or not samplers: raise ValueError('模型動畫不完整。')
            for sampler in samplers:
                reference(sampler.get('input'), accessors); reference(sampler.get('output'), accessors)
            for channel in animation['channels']:
                reference(channel.get('sampler'), samplers); reference(channel.get('target', {}).get('node'), nodes)
        def names(key):
            return [x['name'] for x in items(key) if isinstance(x.get('name'), str) and len(x['name']) <= 200]
        return {'nodes': names('nodes'), 'animations': names('animations')}
    except (struct.error, UnicodeError, json.JSONDecodeError, KeyError, TypeError, AttributeError, RecursionError):
        raise ValueError('GLB 無法讀取。')

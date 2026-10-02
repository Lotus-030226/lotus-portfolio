import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpRight,
  Check,
  ChevronRight,
  Database,
  ExternalLink,
  Layers,
  LogOut,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import './studio.css';
type Locale = 'zh-TW' | 'en';
type Kind = 'site' | 'project' | 'tech' | 'experience' | 'contact';
type Local = { 'zh-TW': string; en: string };
type Binding = {
  technology: string;
  node: string;
  press: string;
  release: string;
};
type Value = string | null | string[] | Local | Local[] | Binding[];
type Row = {
  id: string;
  kind: Kind;
  slug: string;
  data: Record<string, Value>;
  is_visible: boolean;
  featured: boolean;
  version: number;
  sort_order: number;
};
type Asset = {
  kind: 'image' | 'model';
  model?: { nodes: string[]; animations: string[] };
  version: number;
  id: string;
  url: string;
  alt: Local;
  source: string;
};
type Job = {
  id: string;
  kind: string;
  status: string;
  active: boolean;
  message: string;
  artifact: string;
  created_at: string;
};
type Field = {
  key: string;
  label: string;
  type: 'text' | 'local' | 'paragraph' | 'list' | 'localList' | 'select';
  options?: string[];
  hint?: string;
};
const sections: { kind: Kind; title: string; add: string; subtitle: string }[] =
  [
    {
      kind: 'site',
      title: '首頁設定',
      add: '新增設定',
      subtitle: '姓名、介紹與服務方向',
    },
    {
      kind: 'project',
      title: '作品專案',
      add: '新增作品',
      subtitle: '呈現你的作品與完成成果',
    },
    {
      kind: 'tech',
      title: '技術技能',
      add: '新增技能',
      subtitle: '互動鍵盤與工具分類',
    },
    {
      kind: 'experience',
      title: '工作經歷',
      add: '新增經歷',
      subtitle: '記錄每一段實作與成長',
    },
    {
      kind: 'contact',
      title: '聯絡方式',
      add: '新增聯絡方式',
      subtitle: '讓合適的機會找到你',
    },
  ];
const fields: Record<Kind, Field[]> = {
  site: [
    { key: 'displayName', label: '公開姓名', type: 'text' },
    { key: 'intro', label: '個人介紹', type: 'paragraph' },
    { key: 'roles', label: '職稱', type: 'list' },
    { key: 'services', label: '服務方向', type: 'localList' },
    { key: 'description', label: '搜尋引擎摘要', type: 'text' },
  ],
  project: [
    { key: 'title', label: '專案名稱', type: 'local' },
    { key: 'summary', label: '短介紹', type: 'paragraph' },
    { key: 'description', label: '完整說明', type: 'paragraph' },
    { key: 'role', label: '擔任角色', type: 'local' },
    { key: 'period', label: '期間', type: 'text' },
    { key: 'highlights', label: '成果重點', type: 'localList' },
    { key: 'tags', label: '分類標籤', type: 'list' },
    { key: 'technologies', label: '使用技術', type: 'list' },
  ],
  tech: [
    { key: 'name', label: '技能名稱', type: 'text' },
    { key: 'category', label: '技能分類', type: 'text' },
    { key: 'description', label: '技能說明', type: 'paragraph' },
    {
      key: 'sceneObjectName',
      label: '3D 模型物件名稱',
      type: 'text',
      hint: '選填；填模型按鍵物件名稱，以便點擊連動技能說明。',
    },
  ],
  experience: [
    { key: 'title', label: '職位名稱', type: 'local' },
    { key: 'company', label: '公司或組織', type: 'local' },
    { key: 'summary', label: '經歷介紹', type: 'paragraph' },
    { key: 'period', label: '期間', type: 'text' },
    { key: 'highlights', label: '工作重點', type: 'localList' },
    { key: 'technologies', label: '使用技術', type: 'list' },
  ],
  contact: [
    {
      key: 'kind',
      label: '聯絡類型',
      type: 'select',
      options: ['email', 'github', 'line', 'link'],
    },
    { key: 'label', label: '顯示文字', type: 'local' },
    { key: 'value', label: '聯絡資訊', type: 'text' },
    {
      key: 'url',
      label: '連結網址',
      type: 'text',
      hint: '完整 https 網址；Email 可使用 mailto:',
    },
  ],
};
const blankLocal = (): Local => ({ 'zh-TW': '', en: '' });
function display(row: Row) {
  const name =
    row.data.title ?? row.data.name ?? row.data.displayName ?? row.data.label;
  return typeof name === 'string'
    ? name
    : (name as Local)?.['zh-TW'] || (name as Local)?.en || '未命名內容';
}
function csrf() {
  return (
    document.cookie
      .split('; ')
      .find((x) => x.startsWith('csrftoken='))
      ?.split('=')[1] || ''
  );
}
async function api<T>(
  path: string,
  method = 'GET',
  body?: unknown,
): Promise<T> {
  const form = body instanceof FormData;
  const response = await fetch('/api/' + path, {
    method,
    credentials: 'same-origin',
    headers: {
      'X-CSRFToken': csrf(),
      ...(!form && body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? (form ? body : JSON.stringify(body)) : undefined,
  });
  const data =
    response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      String(
        data?.error ||
          data?.detail ||
          Object.values(data || {})
            .flat()
            .join('、') ||
          '操作失敗，請重新載入。',
      ),
    );
  return data;
}
function fresh(kind: Kind): Row {
  const data: Record<string, Value> = {};
  for (const f of fields[kind])
    data[f.key] = ['local', 'paragraph'].includes(f.type)
      ? blankLocal()
      : ['list', 'localList'].includes(f.type)
        ? []
        : f.type === 'select'
          ? f.options![0]
          : '';
  if (kind === 'project')
    Object.assign(data, {
      coverAssetId: null,
      galleryAssetIds: [],
      githubUrl: '',
      demoUrl: '',
    });
  return {
    id: '',
    kind,
    slug: '',
    data,
    is_visible: false,
    featured: false,
    version: 1,
    sort_order: 0,
  };
}
function FieldInput({
  field: f,
  value,
  locale,
  change,
}: {
  field: Field;
  value: Value | undefined;
  locale: Locale;
  change: (v: Value) => void;
}) {
  const local = ['local', 'paragraph'].includes(f.type);
  const text = local
    ? (value as Local)?.[locale] || ''
    : typeof value === 'string'
      ? value
      : '';
  if (f.type === 'localList') {
    const items = (Array.isArray(value) ? value : []) as Local[];
    return (
      <div className="field">
        <span>{f.label}</span>
        <div className="repeat-list">
          {items.map((item, i) => (
            <div key={i}>
              <textarea
                aria-label={`${f.label} ${i + 1}`}
                value={item[locale] || ''}
                onChange={(e) =>
                  change(
                    items.map((x, n) =>
                      n === i ? { ...x, [locale]: e.target.value } : x,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="icon-button"
                aria-label={`移除${f.label} ${i + 1}`}
                onClick={() => change(items.filter((_, n) => n !== i))}
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="subtle-button"
          onClick={() => change([...items, blankLocal()])}
        >
          <Plus size={14} />
          新增一項
        </button>
      </div>
    );
  }
  return (
    <label className="field" htmlFor={f.key}>
      <span>
        {f.label}
        {local && <small>{locale === 'zh-TW' ? '中文' : '英文'}</small>}
      </span>
      {f.type === 'select' ? (
        <select
          id={f.key}
          value={text}
          onChange={(e) => change(e.target.value)}
        >
          {f.options?.map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      ) : f.type === 'list' ? (
        <textarea
          id={f.key}
          value={(Array.isArray(value) ? value : []).join('\n')}
          onChange={(e) => change(e.target.value.split('\n'))}
          placeholder="每一行一個項目"
        />
      ) : f.type === 'paragraph' ? (
        <textarea
          id={f.key}
          rows={4}
          value={text}
          onChange={(e) =>
            change({
              ...((value as Local) || blankLocal()),
              [locale]: e.target.value,
            })
          }
        />
      ) : (
        <input
          id={f.key}
          value={text}
          onChange={(e) =>
            change(
              local
                ? {
                    ...((value as Local) || blankLocal()),
                    [locale]: e.target.value,
                  }
                : e.target.value,
            )
          }
        />
      )}{' '}
      {f.hint && <small className="hint">{f.hint}</small>}
    </label>
  );
}
function MediaEditor({
  row,
  assets,
  change,
  refresh,
  notify,
  working,
  locked,
}: {
  locked: boolean;
  row: Row;
  assets: Asset[];
  change: (key: string, v: Value) => void;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  working: (busy: boolean) => void;
}) {
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const blocked = busy || locked;
  const [dragged, setDragged] = useState<string | null>(null);
  const selectedIds = [
    ...new Set(
      [
        row.data.coverAssetId,
        ...((row.data.galleryAssetIds || []) as string[]),
      ].filter(Boolean),
    ),
  ] as string[];
  const projectAssets = selectedIds
    .map((id) => assets.find((a) => a.id === id && a.kind !== 'model'))
    .filter((a): a is Asset => !!a);
  function setOrder(ids: string[]) {
    change('coverAssetId', ids[0] || null);
    change('galleryAssetIds', ids.slice(1));
  }
  function move(from: number, to: number) {
    if (
      blocked ||
      from === to ||
      from < 0 ||
      to < 0 ||
      to >= projectAssets.length
    )
      return;
    const ids = projectAssets.map((a) => a.id);
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setOrder(ids);
  }
  async function upload(file: File) {
    setBusy(true);
    working(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('source', source);
      const asset = await api<Asset>('assets/', 'POST', form);
      await refresh();
      setOrder([...projectAssets.map((a) => a.id), asset.id]);
      notify('圖片已上傳；記得儲存作品。');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
      working(false);
    }
  }
  return (
    <>
      <div className="form-block">
        <h3>上傳專案圖片</h3>
        <p>圖片會轉為 WebP；只匯出公開作品實際使用的圖片。</p>
        <label className="field">
          圖片來源／授權註記
          <input value={source} onChange={(e) => setSource(e.target.value)} />
        </label>
        <label className="upload">
          {busy ? '正在上傳…' : '選擇 PNG、JPEG、WebP，10 MB 以內'}
          <input
            aria-label="上傳圖片"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={blocked}
            onChange={(e) => {
              if (e.target.files?.[0]) void upload(e.target.files[0]);
              e.target.value = '';
            }}
          />
        </label>
      </div>
      <div className="form-block">
        <h3>這個作品的圖片</h3>
        <p>
          拖曳縮圖或按箭頭調整順序，第一張是封面。移到圖片上可按右上角 ×
          移除；儲存作品後生效。
        </p>
        <div className="asset-grid">
          {projectAssets.map((a, i) => (
            <div
              className="asset-card"
              key={a.id}
              draggable={!blocked}
              data-asset-id={a.id}
              onDragStart={(e) => {
                if (blocked) {
                  e.preventDefault();
                  return;
                }
                setDragged(a.id);
                e.dataTransfer.setData('text/plain', a.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => setDragged(null)}
              onDragOver={(e) => {
                if (dragged && !blocked) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!blocked && dragged)
                  move(
                    projectAssets.findIndex((x) => x.id === dragged),
                    i,
                  );
                setDragged(null);
              }}
            >
              <button
                type="button"
                className="asset-remove"
                aria-label={`刪除圖片 ${i + 1}`}
                onClick={() =>
                  setOrder(
                    projectAssets.filter((x) => x.id !== a.id).map((x) => x.id),
                  )
                }
              >
                <X size={18} />
              </button>
              <img src={a.url} alt={`作品圖片 ${i + 1}`} draggable={false} />
              <div className="asset-actions">
                <span className={i === 0 ? 'chosen' : ''}>
                  {i === 0 ? '✓ 封面' : `圖片 ${i + 1}`}
                </span>
                <button
                  type="button"
                  disabled={i === 0 || blocked}
                  aria-label={`圖片前移 ${i + 1}`}
                  onClick={() => move(i, i - 1)}
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  type="button"
                  disabled={i === projectAssets.length - 1 || blocked}
                  aria-label={`圖片後移 ${i + 1}`}
                  onClick={() => move(i, i + 1)}
                >
                  <ArrowDown size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
        {projectAssets.length === 0 && (
          <div className="empty-small">
            還沒有圖片。上傳後即可整理封面與圖集。
          </div>
        )}
      </div>
      {['githubUrl', 'demoUrl'].map((key) => (
        <FieldInput
          key={key}
          field={{
            key,
            label: key === 'githubUrl' ? 'GitHub 專案網址' : 'Demo 網址',
            type: 'text',
          }}
          value={row.data[key]}
          locale="zh-TW"
          change={(v) => change(key, v)}
        />
      ))}
    </>
  );
}
function ModelEditor({
  row,
  assets,
  change,
  refresh,
  notify,
  working,
}: {
  row: Row;
  assets: Asset[];
  change: (key: string, value: Value) => void;
  refresh: () => Promise<void>;
  notify: (s: string) => void;
  working: (busy: boolean) => void;
}) {
  const model = assets.find(
    (a) => a.id === row.data.modelAssetId && a.kind === 'model',
  );
  const bindings = (row.data.modelBindings || []) as Binding[];
  const [busy, setBusy] = useState(false);
  async function upload(file: File) {
    setBusy(true);
    working(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const asset = await api<Asset>('assets/', 'POST', form);
      await refresh();
      change('modelAssetId', asset.id);
      change('sceneUrl', null);
      change('modelBindings', []);
      notify('模型已上傳。可匯入動畫對照表，再儲存首頁設定。');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
      working(false);
    }
  }
  async function mapping(file: File) {
    try {
      if (file.size > 1024 * 1024) throw new Error('動畫對照表請小於 1 MB。');
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed.bindings) || parsed.bindings.length > 100)
        throw new Error('對照表格式不正確。');
      const result: Binding[] = parsed.bindings.map((b: Binding) => {
        if (
          !['technology', 'node', 'press', 'release'].every(
            (k) => typeof b[k as keyof Binding] === 'string',
          )
        )
          throw new Error('對照表欄位不完整。');
        if (
          !model?.model?.nodes.includes(b.node) ||
          ![b.press, b.release].every((x) =>
            model.model!.animations.includes(x),
          )
        )
          throw new Error('對照表中的物件或動畫不在此模型內。');
        return {
          technology: b.technology,
          node: b.node,
          press: b.press,
          release: b.release,
        };
      });
      change('modelBindings', result);
      notify(`已載入 ${result.length} 個按鍵的動畫設定；記得儲存。`);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function edit(index: number, key: keyof Binding, value: string) {
    change(
      'modelBindings',
      bindings.map((b, i) => (i === index ? { ...b, [key]: value } : b)),
    );
  }
  return (
    <div className="form-block">
      <h3>首頁 3D 模型</h3>
      <p>
        GLB 模型會隨網站一起發布，使用透明背景。手機與減少動畫模式保留簡易鍵盤。
      </p>
      <label className="upload">
        {busy ? '正在上傳…' : '上傳 GLB 模型（20 MB 以內，貼圖須內含）'}
        <input
          type="file"
          accept=".glb"
          aria-label="上傳 GLB 模型"
          disabled={busy}
          onChange={(e) => {
            if (e.target.files?.[0]) void upload(e.target.files[0]);
            e.target.value = '';
          }}
        />
      </label>
      {model ? (
        <p className="model-summary">
          ✓ 已上傳模型 · {model.model?.animations.length || 0} 段動畫{' '}
          <button
            type="button"
            onClick={() => {
              change('modelAssetId', null);
              change('modelBindings', []);
              change('sceneUrl', null);
            }}
          >
            移除模型
          </button>
        </p>
      ) : (
        <p>尚未設定模型；儲存後使用原創技能鍵盤。</p>
      )}
      {model && (
        <>
          <h3>按鍵動畫設定</h3>
          <label className="field">
            觸發方式
            <select
              value={(row.data.modelInteraction as string) || 'hover'}
              onChange={(e) => change('modelInteraction', e.target.value)}
            >
              <option value="hover">滑鼠移入按下、移出放開</option>
              <option value="click">點擊按下後自動放開</option>
            </select>
          </label>
          <label className="upload">
            匯入動畫對照表（JSON）
            <input
              type="file"
              accept=".json,application/json"
              aria-label="匯入動畫對照表"
              onChange={(e) => {
                if (e.target.files?.[0]) void mapping(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </label>
          <p>
            點擊按鍵時，以技能名稱或物件名稱連動技術區。模型內不存在的技能不會自動新增。
          </p>
          <div className="binding-list">
            {bindings.map((b, i) => (
              <div className="binding-row" key={i}>
                <label className="field">
                  技能名稱
                  <input
                    aria-label={`按鍵 ${i + 1} 技能`}
                    value={b.technology}
                    onChange={(e) => edit(i, 'technology', e.target.value)}
                  />
                </label>
                {(['node', 'press', 'release'] as const).map((key) => (
                  <label className="field" key={key}>
                    {key === 'node'
                      ? '模型按鍵'
                      : key === 'press'
                        ? '按下動畫'
                        : '放開動畫'}
                    <select
                      aria-label={`按鍵 ${i + 1} ${key}`}
                      value={b[key]}
                      onChange={(e) => edit(i, key, e.target.value)}
                    >
                      {(key === 'node'
                        ? model.model?.nodes
                        : model.model?.animations
                      )?.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <button
                  type="button"
                  aria-label={`刪除按鍵對照 ${i + 1}`}
                  onClick={() =>
                    change(
                      'modelBindings',
                      bindings.filter((_, n) => n !== i),
                    )
                  }
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              change('modelBindings', [
                ...bindings,
                {
                  technology: '',
                  node: model.model?.nodes[0] || '',
                  press: model.model?.animations[0] || '',
                  release: model.model?.animations[1] || '',
                },
              ])
            }
          >
            <Plus size={16} />
            新增按鍵對照
          </button>
        </>
      )}
      <small>儲存後，到「公開更新」重新準備預覽。</small>
    </div>
  );
}

function App() {
  const [session, setSession] = useState<{
    authenticated: boolean;
    username?: string;
  } | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [kind, setKind] = useState<Kind>('project');
  const [draft, setDraft] = useState<Row | null>(null);
  const [dirty, setDirty] = useState(false);
  const [locale, setLocale] = useState<Locale>('zh-TW');
  const [tab, setTab] = useState('content');
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<'content' | 'publish'>('content');
  const notify = (s: string) => setNotice(s);
  const refreshAssets = async () => setAssets(await api<Asset[]>('assets/'));
  async function refresh() {
    const [r, a, j] = await Promise.all([
      api<Row[]>('records/'),
      api<Asset[]>('assets/'),
      api<Job[]>('jobs/'),
    ]);
    setRows(r);
    setAssets(a);
    setJobs(j);
    return r;
  }
  useEffect(() => {
    api<{ authenticated: boolean; username?: string }>('auth/session/')
      .then(setSession)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (session?.authenticated) refresh().catch((e) => setError(e.message));
  }, [session?.authenticated]);
  useEffect(() => {
    if (!session?.authenticated) return;
    const timer = setInterval(
      () =>
        api<Job[]>('jobs/')
          .then(setJobs)
          .catch(() => {}),
      2000,
    );
    return () => clearInterval(timer);
  }, [session?.authenticated]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  const canLeave = () => {
    if (busy) {
      notify('正在完成操作，請等候回應後再編輯或切換。');
      return false;
    }
    return !dirty || window.confirm('有尚未儲存的內容，要放棄這次修改嗎？');
  };
  const select = (row: Row) => {
    if (canLeave()) {
      setDraft(structuredClone(row));
      setDirty(false);
      setTab('content');
      setNotice('');
    }
  };
  const change = (key: string, v: Value) => {
    setDraft((d) => (d ? { ...d, data: { ...d.data, [key]: v } } : d));
    setDirty(true);
  };
  function navigate(next: Kind) {
    if (canLeave()) {
      setKind(next);
      setDraft(null);
      setDirty(false);
      setView('content');
      setQuery('');
      setNotice('');
    }
  }
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('auth/login/', 'POST', { username, password });
      setPassword('');
      setSession(await api('auth/session/'));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!draft || busy) return;
    setBusy(true);
    try {
      const data = { ...draft, data: { ...draft.data } };
      for (const f of fields[draft.kind])
        if (f.type === 'list')
          data.data[f.key] = (data.data[f.key] as string[])
            .map((x) => x.trim())
            .filter(Boolean);
      const saved = await api<Row>(
        draft.id ? `records/${draft.id}/` : 'records/',
        draft.id ? 'PATCH' : 'POST',
        data,
      );
      setRows((r) =>
        [...r.filter((x) => x.id !== saved.id), saved].sort(
          (a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug),
        ),
      );
      setDraft(structuredClone(saved));
      setDirty(false);
      notify('已儲存。尚未更新公開快照。');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reorder(row: Row, delta: number) {
    if (!canLeave()) return;
    const current = rows.filter((x) => x.kind === kind);
    const i = current.findIndex((x) => x.id === row.id);
    if (i + delta < 0 || i + delta >= current.length) return;
    const moved = current.splice(i, 1)[0];
    current.splice(i + delta, 0, moved);
    setBusy(true);
    try {
      const saved = await api<Row[]>('reorder/', 'POST', {
        kind,
        items: current.map((x) => ({ id: x.id, version: x.version })),
      });
      setRows((r) =>
        [...r.filter((x) => x.kind !== kind), ...saved].sort(
          (a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug),
        ),
      );
      if (draft?.id) setDraft(saved.find((x) => x.id === draft.id) || null);
      setDirty(false);
      notify('排序已更新。');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      busy ||
      !draft?.id ||
      !window.confirm(
        '刪除此內容？可從本機備份還原；公開頁須重新準備更新才會改變。',
      )
    )
      return;
    setBusy(true);
    try {
      await api(`records/${draft.id}/`, 'DELETE', { version: draft.version });
      setRows((r) => r.filter((x) => x.id !== draft.id));
      setDraft(null);
      setDirty(false);
      notify('內容已刪除。');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function job(next: string) {
    if (busy) return;
    if (dirty) {
      notify('請先儲存內容，再準備更新或備份。');
      return;
    }
    setBusy(true);
    try {
      const j = await api<Job>('jobs/', 'POST', { kind: next });
      setJobs([j, ...jobs]);
      setView('publish');
      notify('工作已開始，完成前可以繼續瀏覽。');
    } catch (e) {
      notify((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const active = jobs.some((j) => j.active);
  const section = sections.find((s) => s.kind === kind)!;
  const current = rows.filter((r) => r.kind === kind);
  const visible = current.filter((r) =>
    `${display(r)} ${r.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  if (!session?.authenticated)
    return (
      <div className="login-page">
        <div className="login-art">
          <div className="studio-wordmark">
            <Layers />
            Lotus<span>STUDIO</span>
          </div>
          <h1>
            讓每一次更新，
            <br />
            都更容易。
          </h1>
          <p>
            你的個人作品集工作室。
            <br />
            編輯內容、整理作品，準備下一次公開更新。
          </p>
          <div className="art-orbit" />
          <small>
            <span className="live-dot" />
            本機工作室 · PostgreSQL
          </small>
        </div>
        <form className="login-form" onSubmit={login}>
          <small>WELCOME BACK</small>
          <h2>登入工作室</h2>
          <p>內容與圖片保存在這台電腦。</p>
          <label className="field">
            帳號
            <input
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="field">
            密碼
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy || !session}>
            {busy ? '登入中…' : '登入工作室'}
            <ArrowUpRight size={18} />
          </button>
          <small className="login-note">
            僅供本機使用。公開網站不包含管理後台。
          </small>
        </form>
      </div>
    );
  return (
    <div className="studio">
      <aside className="sidebar">
        <div className="studio-wordmark">
          <Layers />
          Lotus<span>STUDIO</span>
        </div>
        <div className="workspace">
          <span className="workspace-icon">L</span>
          <div>
            個人作品集
            <small>
              <span className="live-dot" />
              本機工作空間
            </small>
          </div>
        </div>
        <span className="nav-label">內容管理</span>
        <nav>
          {sections.map((s) => (
            <button
              key={s.kind}
              aria-label={s.title}
              onClick={() => navigate(s.kind)}
              className={view === 'content' && kind === s.kind ? 'active' : ''}
            >
              <Layers size={17} />
              {s.title}
              <span>{rows.filter((r) => r.kind === s.kind).length}</span>
            </button>
          ))}
        </nav>
        <span className="nav-label">更新與維護</span>
        <button
          className={`publish-nav ${view === 'publish' ? 'active' : ''}`}
          onClick={() => {
            if (canLeave()) {
              setView('publish');
              setDraft(null);
              setDirty(false);
            }
          }}
        >
          <Sparkles size={17} />
          準備與備份
          <ChevronRight size={16} />
        </button>
        <div className="sidebar-bottom">
          <div className="local-note">
            <Database size={16} />
            <span>
              資料儲存在本機<small>公開頁使用靜態快照</small>
            </span>
          </div>
          <button
            onClick={async () => {
              if (!canLeave()) return;
              try {
                await api('auth/logout/', 'POST', {});
                setSession({ authenticated: false });
                setDraft(null);
                setDirty(false);
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <LogOut size={16} />
            登出<span>{session.username}</span>
          </button>
        </div>
      </aside>
      <main className="studio-main">
        <header className="topbar">
          <span>
            工作室 <ChevronRight size={13} />{' '}
            {view === 'publish' ? '準備與備份' : section.title}
          </span>
          <a href="http://127.0.0.1:3102" target="_blank" rel="noreferrer">
            開啟靜態預覽
            <ExternalLink size={14} />
          </a>
        </header>
        <div className="studio-content">
          <div className="page-heading">
            <div>
              <small>YOUR PORTFOLIO, ALWAYS EVOLVING.</small>
              <h1>{view === 'publish' ? '準備下一次更新' : section.title}</h1>
              <p>
                {view === 'publish'
                  ? '先看過靜態預覽，再手動發布到 GitHub Pages。'
                  : section.subtitle}
              </p>
            </div>
            {view === 'content' && kind !== 'site' && (
              <button
                className="primary"
                onClick={() => {
                  if (canLeave()) {
                    setDraft({
                      ...fresh(kind),
                      sort_order:
                        Math.max(-1, ...current.map((r) => r.sort_order)) + 1,
                    });
                    setDirty(false);
                    setTab('content');
                  }
                }}
              >
                <Plus size={17} />
                {section.add}
              </button>
            )}
          </div>
          <div
            role="status"
            aria-live="polite"
            className={notice ? 'notice' : ''}
          >
            {notice}
          </div>
          {error && <p className="error">{error}</p>}
          {view === 'publish' ? (
            <>
              <div className="publish-grid">
                <div className="publish-card">
                  <div className="step-number">01</div>
                  <h2>準備公開更新</h2>
                  <p>
                    驗證雙語資料、匯出公開內容與圖片，建置可離線檢視的靜態網站。
                  </p>
                  <button
                    className="primary"
                    disabled={active || busy}
                    onClick={() => void job('prepare')}
                  >
                    <Sparkles size={16} />
                    {active ? '工作進行中…' : '準備更新'}
                  </button>
                  <a
                    href="http://127.0.0.1:3102"
                    target="_blank"
                    rel="noreferrer"
                  >
                    查看完成的預覽
                    <ArrowUpRight size={15} />
                  </a>
                  <small>此按鈕不會 push 或發布 GitHub。</small>
                </div>
                <div className="publish-card">
                  <div className="step-number">02</div>
                  <h2>保留本機備份</h2>
                  <p>將 PostgreSQL 內容、登入帳號及私人圖片打包成配對備份。</p>
                  <button
                    className="secondary"
                    disabled={active || busy}
                    onClick={() => void job('backup')}
                  >
                    <Database size={16} />
                    建立備份
                  </button>
                  <small>還原命令寫入新資料庫，避免覆寫現用資料。</small>
                </div>
              </div>
              <div className="job-list">
                <h2>最近工作</h2>
                {jobs.length === 0 && <p>還沒有執行過工作。</p>}
                {jobs.map((j) => (
                  <article key={j.id} data-job-id={j.id}>
                    <span className={`job-dot ${j.status}`} />
                    <div>
                      <strong>
                        {j.kind === 'prepare'
                          ? '準備更新'
                          : j.kind === 'backup'
                            ? '本機備份'
                            : '匯出快照'}
                      </strong>
                      <p>{j.message || '等候啟動…'}</p>
                      <small>
                        {new Date(j.created_at).toLocaleString('zh-TW')} ·{' '}
                        {
                          (
                            {
                              queued: '排隊中',
                              running: '進行中',
                              done: '完成',
                              failed: '失敗',
                            } as Record<string, string>
                          )[j.status]
                        }
                      </small>
                    </div>
                    {j.status === 'done' && j.kind === 'backup' && (
                      <a
                        className="secondary"
                        href={`/api/jobs/${j.id}/download/`}
                      >
                        下載備份
                      </a>
                    )}
                    {j.status === 'done' && j.kind === 'prepare' && (
                      <a
                        className="secondary"
                        href="http://127.0.0.1:3102"
                        target="_blank"
                        rel="noreferrer"
                      >
                        查看預覽
                      </a>
                    )}
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className={`editor-layout ${draft ? 'has-editor' : ''}`}>
              <section className="record-panel">
                <div className="list-toolbar">
                  <div className="search">
                    <Search size={16} />
                    <input
                      aria-label="搜尋內容"
                      placeholder="搜尋內容…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </div>
                  <span>
                    {current.filter((r) => r.is_visible).length} 公開 /{' '}
                    {current.length} 全部
                  </span>
                </div>
                <div className="record-list">
                  {visible.map((row) => (
                    <article
                      key={row.id}
                      className={draft?.id === row.id ? 'selected' : ''}
                      draggable={!dirty}
                      onDragStart={(e) =>
                        e.dataTransfer.setData('text/plain', row.id)
                      }
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = current.findIndex(
                          (r) => r.id === e.dataTransfer.getData('text/plain'),
                        );
                        const target = current.findIndex(
                          (r) => r.id === row.id,
                        );
                        if (from >= 0 && from !== target)
                          void reorder(current[from], target - from);
                      }}
                    >
                      <button
                        className="record-select"
                        onClick={() => select(row)}
                      >
                        <span className="record-art">
                          {kind === 'project' ? (
                            String(current.indexOf(row) + 1).padStart(2, '0')
                          ) : (
                            <Layers size={21} />
                          )}
                        </span>
                        <span>
                          <strong>{display(row)}</strong>
                          <small>{row.slug}</small>
                          <span
                            className={`badge ${row.is_visible ? 'public' : ''}`}
                          >
                            {row.is_visible ? '公開' : '草稿'}
                          </span>
                          {row.featured && (
                            <span className="badge featured">精選</span>
                          )}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                      {kind !== 'site' && (
                        <div className="row-order">
                          <button
                            aria-label={`上移 ${display(row)}`}
                            disabled={current.indexOf(row) === 0}
                            onClick={() => void reorder(row, -1)}
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            aria-label={`下移 ${display(row)}`}
                            disabled={
                              current.indexOf(row) === current.length - 1
                            }
                            onClick={() => void reorder(row, 1)}
                          >
                            <ArrowDown size={14} />
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                  {visible.length === 0 && (
                    <div className="empty-small">
                      目前沒有內容。按右上方新增開始編輯。
                    </div>
                  )}
                </div>
                <small className="list-note">
                  拖曳卡片或使用箭頭調整公開順序。
                </small>
              </section>
              {draft ? (
                <section className="editor">
                  <header>
                    <div>
                      <small>{draft.id ? '編輯內容' : '新增草稿'}</small>
                      <h2>{display(draft)}</h2>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="關閉編輯"
                      onClick={() => {
                        if (canLeave()) {
                          setDraft(null);
                          setDirty(false);
                        }
                      }}
                    >
                      <X size={20} />
                    </button>
                  </header>
                  <div className="editor-tabs">
                    <button
                      className={tab === 'content' ? 'active' : ''}
                      onClick={() => setTab('content')}
                    >
                      內容編輯
                    </button>
                    {(kind === 'project' || kind === 'site') && (
                      <button
                        className={tab === 'media' ? 'active' : ''}
                        onClick={() => setTab('media')}
                      >
                        {kind === 'site' ? '3D 模型與動畫' : '圖片與連結'}
                      </button>
                    )}
                    <span>{dirty ? '有未儲存修改' : '已同步本機'}</span>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      void save();
                    }}
                  >
                    <fieldset
                      className="editor-body"
                      disabled={busy}
                      aria-busy={busy}
                    >
                      {tab === 'content' ? (
                        <>
                          <div className="locale-tabs">
                            <button
                              type="button"
                              className={locale === 'zh-TW' ? 'active' : ''}
                              onClick={() => setLocale('zh-TW')}
                            >
                              繁體中文
                            </button>
                            <button
                              type="button"
                              className={locale === 'en' ? 'active' : ''}
                              onClick={() => setLocale('en')}
                            >
                              English
                            </button>
                          </div>
                          <p className="translation-note">
                            兩個語系都填齊，才可匯出公開內容。空白可先儲存草稿。
                          </p>
                          <label className="field">
                            識別名稱
                            <input
                              required
                              pattern="[a-zA-Z0-9_-]+"
                              maxLength={100}
                              value={draft.slug}
                              onChange={(e) => {
                                setDraft({ ...draft, slug: e.target.value });
                                setDirty(true);
                              }}
                            />
                            <small className="hint">英文、數字、- 或 _。</small>
                          </label>
                          {fields[kind].map((f) => (
                            <FieldInput
                              key={f.key}
                              field={f}
                              value={draft.data[f.key]}
                              locale={locale}
                              change={(v) => change(f.key, v)}
                            />
                          ))}
                        </>
                      ) : draft.kind === 'site' ? (
                        <ModelEditor
                          row={draft}
                          assets={assets}
                          change={change}
                          refresh={refreshAssets}
                          notify={notify}
                          working={setBusy}
                        />
                      ) : (
                        <MediaEditor
                          locked={busy}
                          row={draft}
                          assets={assets}
                          change={change}
                          refresh={refreshAssets}
                          notify={notify}
                          working={setBusy}
                        />
                      )}
                      <div className="visibility">
                        <label>
                          <input
                            type="checkbox"
                            checked={draft.is_visible}
                            onChange={(e) => {
                              setDraft({
                                ...draft,
                                is_visible: e.target.checked,
                              });
                              setDirty(true);
                            }}
                          />
                          <span>
                            公開此內容
                            <small>重新準備更新後，才會出現在公開快照。</small>
                          </span>
                        </label>
                        {kind === 'project' && (
                          <label>
                            <input
                              type="checkbox"
                              checked={draft.featured}
                              onChange={(e) => {
                                setDraft({
                                  ...draft,
                                  featured: e.target.checked,
                                });
                                setDirty(true);
                              }}
                            />
                            標記為精選
                          </label>
                        )}
                      </div>
                    </fieldset>
                    <footer>
                      {draft.id && kind !== 'site' && (
                        <button
                          className="delete-button"
                          type="button"
                          onClick={() => void remove()}
                        >
                          <Trash2 size={15} />
                          刪除
                        </button>
                      )}
                      <button
                        type="button"
                        className="secondary"
                        onClick={async () => {
                          if (!canLeave()) return;
                          setBusy(true);
                          try {
                            const loaded = await refresh();
                            if (draft.id)
                              setDraft(
                                loaded.find((r) => r.id === draft.id) || null,
                              );
                            setDirty(false);
                            notify('已重新載入。');
                          } catch (e) {
                            notify((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      >
                        重新載入
                      </button>
                      <button className="primary" disabled={busy}>
                        <Save size={16} />
                        {busy
                          ? '儲存中…'
                          : draft.is_visible
                            ? '儲存內容'
                            : '儲存草稿'}
                      </button>
                    </footer>
                  </form>
                </section>
              ) : (
                <section className="editor-placeholder">
                  <div>
                    <Check size={24} />
                  </div>
                  <h2>讓作品保持最新</h2>
                  <p>
                    選擇左側內容開始編輯。
                    <br />
                    修改先存於本機，再由你決定何時公開。
                  </p>
                  <button
                    className="subtle-button"
                    onClick={() => setView('publish')}
                  >
                    查看更新流程
                    <ArrowUpRight size={15} />
                  </button>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

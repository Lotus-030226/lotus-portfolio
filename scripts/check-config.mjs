const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
if (base && !/^\/[A-Za-z0-9_-]+$/.test(base))
  throw new Error('NEXT_PUBLIC_BASE_PATH 必須為空或 /repository-name');
if (process.env.SITE_URL) {
  const url = new URL(process.env.SITE_URL);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname.replace(/\/$/, '') !== base
  )
    throw new Error(
      'SITE_URL 必須是 https 並與 basePath 一致，不能包含帳密或查詢參數。',
    );
}

export function assetPath(
  path: string,
  basePath = process.env.NEXT_PUBLIC_BASE_PATH || '',
) {
  if (/^(https?:|data:)/.test(path)) return path;
  return `${basePath.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
export function siteUrl() {
  const value = process.env.SITE_URL;
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export type Locale = 'zh-TW' | 'en';
export function resolveLocale(
  saved: string | null,
  languages: readonly string[],
): Locale {
  if (saved === 'en' || saved === 'zh-TW') return saved;
  for (const language of languages) {
    if (/^zh(?:-|$)/i.test(language)) return 'zh-TW';
    if (/^en(?:-|$)/i.test(language)) return 'en';
  }
  return 'en';
}
export function readLocale(): Locale {
  let saved: string | null = null;
  try {
    saved = window.localStorage.getItem('lotus.locale');
  } catch {}
  return resolveLocale(
    saved,
    navigator.languages?.length ? navigator.languages : [navigator.language],
  );
}
export function saveLocale(locale: Locale) {
  try {
    window.localStorage.setItem('lotus.locale', locale);
  } catch {}
}

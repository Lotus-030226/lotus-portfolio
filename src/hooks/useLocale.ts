import { useSyncExternalStore, useEffect } from 'react';
import { readLocale, saveLocale, type Locale } from '../lib/i18n/locale';
let manual: Locale | null = null;
function subscribe(callback: () => void) {
  window.addEventListener('lotus:locale', callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener('lotus:locale', callback);
    window.removeEventListener('storage', callback);
  };
}
export function useLocale() {
  const locale = useSyncExternalStore(
    subscribe,
    () => manual || readLocale(),
    () => 'en' as Locale,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  function change(value: Locale) {
    manual = value;
    saveLocale(value);
    window.dispatchEvent(new Event('lotus:locale'));
  }
  return [locale, change] as const;
}

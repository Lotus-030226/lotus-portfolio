import { describe, it, expect } from 'vitest';
import { resolveLocale } from '../../src/lib/i18n/locale';
describe('locale choices', () => {
  it('uses an explicit English choice over Chinese browser preferences', () =>
    expect(resolveLocale('en', ['zh-TW'])).toBe('en'));
  it('uses an explicit Chinese choice over English browser preferences', () =>
    expect(resolveLocale('zh-TW', ['en'])).toBe('zh-TW'));
  it('maps Chinese browser language variants to Traditional Chinese', () =>
    expect(resolveLocale(null, ['zh-HK', 'en'])).toBe('zh-TW'));
  it('ignores corrupt stored values and uses browser preferences', () =>
    expect(resolveLocale('bad', ['zh-TW'])).toBe('zh-TW'));
  it('respects the first supported browser preference', () =>
    expect(resolveLocale(null, ['fr', 'en-US', 'zh-TW'])).toBe('en'));
  it('falls back to English', () => expect(resolveLocale(null, [])).toBe('en'));
});

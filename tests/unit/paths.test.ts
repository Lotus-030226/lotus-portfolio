import { it, expect } from 'vitest';
import { assetPath } from '../../src/lib/utils/paths';
it('assets use the deployment subpath without breaking external URLs', () => {
  expect(assetPath('/assets/a.webp', '/portfolio/')).toBe(
    '/portfolio/assets/a.webp',
  );
  expect(assetPath('https://example.com/a.webp', '/portfolio')).toBe(
    'https://example.com/a.webp',
  );
});

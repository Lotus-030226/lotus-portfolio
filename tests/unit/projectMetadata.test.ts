import { afterEach, expect, test, vi } from 'vitest';
import { generateMetadata } from '../../src/app/projects/page';
afterEach(() => vi.unstubAllEnvs());
test('collection canonical preserves a GitHub Pages project path', async () => {
  vi.stubEnv('SITE_URL', 'https://example.github.io/portfolio');
  expect((await generateMetadata()).alternates?.canonical).toBe(
    'https://example.github.io/portfolio/projects/',
  );
});

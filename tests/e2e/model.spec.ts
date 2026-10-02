import { test, expect } from '@playwright/test';
import content from '../../src/content/generated/portfolio.json';
import type { SiteConfig } from '../../src/types/content';
const site = content.site as SiteConfig;
test.skip(!site.modelUrl, 'Requires configured GLB model');
test('local GLB shows a transparent canvas without a Spline viewer', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('.keyboard-canvas')).toHaveClass(/ready/);
  await expect(page.locator('.keyboard-canvas iframe')).toHaveCount(0);
  expect(
    await page
      .locator('.keyboard-canvas canvas')
      .evaluate(
        (canvas: HTMLCanvasElement) =>
          canvas.getContext('webgl2')?.getContextAttributes()?.alpha,
      ),
  ).toBe(true);
  await page.screenshot({ path: 'test-results/screenshots/glb-home.png' });
  await page
    .locator('.keyboard-canvas canvas')
    .dispatchEvent('webglcontextlost');
  await expect(page.locator('.keyboard-fallback')).not.toHaveAttribute('inert');
  await page.locator('.keyboard-fallback button').first().click();
  await expect(page.locator('.skill-detail h3')).toHaveText('Python');
});
test('model loading aborted on mobile resize keeps fallback interactive', async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let requested!: () => void;
  const request = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route('**/*.glb', async (route) => {
    requested();
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await request;
  await page.setViewportSize({ width: 375, height: 812 });
  release();
  await expect(page.locator('.keyboard-canvas canvas')).toHaveCount(0);
  await expect(page.locator('.keyboard-fallback')).not.toHaveAttribute('inert');
});
test('reduced motion requests no GLB', async ({ page }) => {
  let requests = 0;
  await page.route('**/*.glb', (route) => {
    requests++;
    return route.abort();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await page.locator('.keyboard-fallback button').first().click();
  await expect(page.locator('.skill-detail h3')).toHaveText('Python');
  expect(requests).toBe(0);
});

test('provided keyboard binds the PyTorch key to its skill detail', async ({
  page,
}) => {
  test.skip(
    !(site.modelBindings || []).some((b) => b.node === '02 · pytorch'),
    'Requires the provided 24-key model',
  );
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('./');
  await expect(page.locator('.keyboard-canvas')).toHaveClass(/ready/);
  const canvas = page.locator('.keyboard-canvas canvas');
  await canvas.click({ position: { x: 190, y: 182 } });
  await expect(canvas).toHaveAttribute('title', 'pytorch');
  await expect(page.locator('.skill-detail h3')).toHaveText('PyTorch');
});

import { test, expect } from '@playwright/test';
import snapshot from '../../src/content/generated/portfolio.json';
test('five sections, projects and keyboard-accessible details', async ({
  page,
}) => {
  await page.goto('./');
  await expect(page.locator('main > section')).toHaveCount(5);
  await expect(page.getByRole('button', { name: /View project:/ })).toHaveCount(
    snapshot.projects.filter((p) => p.featured).length,
  );
  const first = page.getByRole('button', { name: /View project:/ }).first();
  await first.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(first).toBeFocused();
});
test('browser language and manual choice survive reload', async ({
  browser,
}) => {
  const context = await browser.newContext({ locale: 'zh-TW' });
  const page = await context.newPage();
  await page.goto(process.env.PORTFOLIO_TEST_URL || 'http://127.0.0.1:3100/');
  await expect(
    page.getByRole('link', { name: '查看專案', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('link', { name: 'View projects', exact: true }),
  ).toBeVisible();
  await context.close();
});
test('mobile reduced motion stays usable without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('main > section')).toHaveCount(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page
    .getByRole('link', { name: 'Projects', exact: true })
    .first()
    .click();
  await expect(page.locator('#projects')).toBeInViewport();
});

test('skill selection and WebGL failure remain usable', async ({ page }) => {
  await page.goto('./');
  await page
    .locator('.skill-grid')
    .getByRole('button', { name: 'PyTorch', exact: true })
    .click();
  await expect(page.locator('.skill-detail h3')).toHaveText('PyTorch');
  const canvas = page.locator('.keyboard-canvas canvas');
  if (await canvas.count()) await canvas.dispatchEvent('webglcontextlost');
  await expect(page.locator('.keyboard-fallback')).not.toHaveClass(
    /hidden-visual/,
  );
  await page
    .locator('.keyboard-fallback')
    .getByRole('button', { name: /Python/, exact: false })
    .first()
    .click();
  await expect(page.locator('.skill-detail h3')).toHaveText('Python');
});

test('load aborted by a mobile resize keeps fallback keyboard available', async ({
  page,
}) => {
  test.skip(
    !!snapshot.site.modelUrl,
    'GLB loading cancellation is covered by model.spec.ts; this scenario requires the procedural keyboard.',
  );
  const fs = await import('node:fs');
  const folder = 'private/preview/_next/static/chunks';
  const files = fs
    .readdirSync(folder)
    .filter(
      (f) =>
        f.endsWith('.js') &&
        fs
          .readFileSync(folder + '/' + f, 'utf8')
          .includes('THREE.WebGLRenderer'),
    )
    .sort(
      (a, b) =>
        fs.statSync(folder + '/' + a).size - fs.statSync(folder + '/' + b).size,
    );
  expect(files.length).toBeGreaterThan(0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/' + files[0], async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto('./', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.keyboard-canvas canvas')).toHaveCount(1);
  await page.setViewportSize({ width: 375, height: 812 });
  release();
  await expect(page.locator('.keyboard-canvas canvas')).toHaveCount(0);
  await expect(page.locator('.keyboard-fallback')).not.toHaveClass(
    /hidden-visual/,
  );
  await expect(page.locator('.keyboard-fallback')).not.toHaveAttribute('inert');
});

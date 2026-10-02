import { test, expect } from '@playwright/test';
import content from '../../src/content/generated/portfolio.json';
import { isSplinePublicUrl } from '../../src/components/hero/splineEmbed';
test.skip(
  !content.site.sceneUrl || !isSplinePublicUrl(content.site.sceneUrl),
  'Only applies when the portfolio is configured with a Spline public URL',
);
test('public URL loads as a viewer, then mobile resize restores the keyboard', async ({
  page,
}) => {
  await page.route('https://my.spline.design/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><body><canvas aria-label="Test scene"></canvas></body></html>',
    }),
  );
  await page.goto('./');
  const frame = page.locator('.keyboard-canvas iframe');
  await expect(frame).toHaveAttribute('src', content.site.sceneUrl!);
  await expect(page.locator('.keyboard-canvas')).toHaveClass(/ready/);
  await expect(
    page.frameLocator('.keyboard-canvas iframe').locator('canvas'),
  ).toBeVisible();
  await expect(page.locator('.keyboard-fallback')).toHaveAttribute('inert');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(frame).toHaveCount(0);
  await expect(page.locator('.keyboard-fallback')).not.toHaveAttribute('inert');
});
test('reduced motion uses accessible fallback without requesting the public scene', async ({
  page,
}) => {
  let requests = 0;
  await page.route('https://my.spline.design/**', (route) => {
    requests++;
    return route.abort();
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await expect(page.locator('.keyboard-fallback')).not.toHaveAttribute('inert');
  await page.locator('.keyboard-fallback button').first().click();
  await expect(page.locator('.skill-detail h3')).toHaveText('Python');
  expect(requests).toBe(0);
});

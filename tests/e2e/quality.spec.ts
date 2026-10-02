import { test, expect } from '@playwright/test';
import fs from 'node:fs';
test('production screenshots, resource health and local performance', async ({
  page,
}) => {
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  await page.addInitScript(() => {
    (window as Window & { lotusLcp?: number }).lotusLcp = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries())
        (window as Window & { lotusLcp?: number }).lotusLcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto('http://127.0.0.1:3102/');
  await expect(page.locator('main > section')).toHaveCount(5);
  await expect(page.locator('.keyboard-fallback')).toHaveCSS('opacity', '0');
  await page.screenshot({ path: 'test-results/screenshots/home-desktop.png' });
  const metrics = await page.evaluate(() => ({
    lcpMs: (window as Window & { lotusLcp?: number }).lotusLcp,
    domContentLoadedMs: (
      performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming
    ).domContentLoadedEventEnd,
    resourceBytes: performance
      .getEntriesByType('resource')
      .reduce(
        (total, e) => total + (e as PerformanceResourceTiming).transferSize,
        0,
      ),
    requests: performance.getEntriesByType('resource').length,
  }));
  fs.writeFileSync(
    'test-results/performance.json',
    JSON.stringify(metrics, null, 2),
  );
  await page.setViewportSize({ width: 768, height: 1024 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({ path: 'test-results/screenshots/home-tablet.png' });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  await page.screenshot({ path: 'test-results/screenshots/home-mobile.png' });
  expect(failures).toEqual([]);
});
test('studio screenshot', async ({ page }) => {
  const credentials = JSON.parse(
    fs.readFileSync('private/test-login.json', 'utf8'),
  );
  await page.goto('http://127.0.0.1:8100/studio/');
  await page.getByLabel('帳號').fill(credentials.username);
  await page.getByLabel('密碼').fill(credentials.password);
  await page.getByRole('button', { name: '登入工作室' }).click();
  await page.locator('.record-select').filter({ hasText: '心臟 MRI' }).click();
  await page.screenshot({ path: 'test-results/screenshots/studio-desktop.png' });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  const nav = await page
    .getByRole('button', { name: '聯絡方式', exact: true })
    .boundingBox();
  const logout = await page.locator('.sidebar-bottom > button').boundingBox();
  expect(logout!.y).toBeGreaterThanOrEqual(nav!.y + nav!.height);
  await page.screenshot({ path: 'test-results/screenshots/studio-mobile.png' });
});

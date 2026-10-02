import { test, expect } from '@playwright/test';
for (const width of [1280, 375]) {
  test(`project dialog scrolls independently and releases background (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 480 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('./');
    await expect(page.locator('html')).toHaveClass(/lenis/);
    const first = page.locator('.project-card').first();
    await first.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/lenis-stopped/);
    const startY = await page.evaluate(() => window.scrollY);
    expect(await dialog.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(
      true,
    );
    const b = (await dialog.boundingBox())!;
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => dialog.evaluate((e) => e.scrollTop))
      .toBeGreaterThan(0);
    await page.mouse.move(b.x + b.width / 2 + 10, b.y + b.height / 2);
    await expect
      .poll(() =>
        dialog.evaluate((e) =>
          Math.abs(e.scrollHeight - e.clientHeight - e.scrollTop),
        ),
      )
      .toBeLessThan(2);
    expect(await page.evaluate(() => window.scrollY)).toBe(startY);
    await page.screenshot({
      path: `test-results/screenshots/project-dialog-scroll-${width}.png`,
    });
    await page.mouse.move(b.x + b.width / 2 + 20, b.y + b.height / 2);
    await page.mouse.wheel(0, -600);
    await expect.poll(() => dialog.evaluate((e) => e.scrollTop)).toBe(0);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(first).toBeFocused();
    await expect(page.locator('html')).not.toHaveClass(/lenis-stopped/);
    await expect(page.locator('body')).not.toHaveCSS('overflow', 'hidden');
  });
}

import { test, expect } from '@playwright/test';
for (const config of [
  { width: 1440, height: 1000, motion: 'no-preference' as const },
  { width: 375, height: 812, motion: 'no-preference' as const },
  { width: 375, height: 812, motion: 'reduce' as const },
]) {
  test(`navigation aligns each section (${config.width}px ${config.motion})`, async ({
    page,
  }) => {
    await page.setViewportSize(config);
    await page.emulateMedia({ reducedMotion: config.motion });
    await page.goto('./');
    if (config.motion !== 'reduce')
      await expect(page.locator('html')).toHaveClass(/lenis/);
    for (const id of ['tech', 'experience', 'projects', 'contact']) {
      const navbar = page.locator('.navbar');
      if (await navbar.evaluate((e) => e.classList.contains('is-collapsed')))
        await page.locator('.navbar-trigger').click();
      else if (config.width < 768) await page.locator('.menu-toggle').click();
      await navbar.locator(`a[href="#${id}"]`).click();
      await expect
        .poll(() =>
          page
            .locator('#' + id)
            .evaluate((e) => Math.abs(e.getBoundingClientRect().top - 20)),
        )
        .toBeLessThan(3);
      await expect(navbar).toHaveClass(/is-collapsed/);
      if (id === 'contact' && config.motion === 'no-preference')
        await page.screenshot({
          path: `test-results/screenshots/anchor-contact-${config.width}.png`,
        });
    }
    await page.locator('.footer a[href="#hero"]').click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
}

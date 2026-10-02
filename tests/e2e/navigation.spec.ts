import { test, expect } from '@playwright/test';

for (const width of [1280, 375]) {
  test(`lotus navigation collapses, reopens and returns at the top (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({
      reducedMotion: width === 375 ? 'reduce' : 'no-preference',
    });
    await page.goto(process.env.PORTFOLIO_TEST_URL || './');
    const navbar = page.locator('.navbar');
    const trigger = page.locator('.navbar-trigger');
    await expect(navbar).not.toHaveClass(/is-collapsed/);
    await expect(navbar.locator('.brand')).toBeVisible();
    const fullWidth = (await navbar.boundingBox())!.width;

    await page.locator('.hero-scroll').click();
    await expect(navbar).toHaveClass(/is-collapsed/);
    await expect(navbar.locator('.brand')).toBeHidden();
    await expect(navbar.locator('.nav-actions')).toBeHidden();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(navbar).toHaveCSS('width', '56px');
    const small = await navbar.boundingBox();
    expect(small!.x).toBeLessThanOrEqual(40);
    expect(small!.width).toBe(56);
    expect(small!.height).toBe(56);
    await page.screenshot({
      path: `test-results/screenshots/navigation-collapsed-${width === 375 ? 'mobile' : 'desktop'}.png`,
    });

    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(navbar).not.toHaveClass(/is-collapsed/);
    await expect(
      navbar.getByRole('link', { name: 'Tech stack', exact: true }),
    ).toBeFocused();
    await expect(navbar).toHaveCSS('width', `${fullWidth}px`);
    await expect(navbar.locator('.nav-links')).toHaveCSS('opacity', '1');
    await page.screenshot({
      path: `test-results/screenshots/navigation-expanded-${width === 375 ? 'mobile' : 'desktop'}.png`,
    });
    await navbar.getByRole('button', { name: '繁體中文', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(
      navbar.getByRole('link', { name: '專案', exact: true }),
    ).toBeVisible();
    await page.mouse.wheel(0, 180);
    await expect(navbar).toHaveClass(/is-collapsed/);
    await trigger.click();
    await page.keyboard.press('Escape');
    await expect(navbar).toHaveClass(/is-collapsed/);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await navbar.getByRole('link', { name: '專案', exact: true }).click();
    await expect(page.locator('#projects')).toBeInViewport();
    await expect(navbar).toHaveClass(/is-collapsed/);
    await page
      .locator('.footer')
      .getByRole('link', { name: '回到頂端' })
      .click();
    await expect(navbar).not.toHaveClass(/is-collapsed/);
    await expect(navbar.locator('.brand')).toBeVisible();
    await expect(page.locator('.keyboard-skillbar')).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
}

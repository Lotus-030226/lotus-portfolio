import { test, expect } from '@playwright/test';

for (const width of [1280, 375]) {
  test(`expanding navigation keeps labels inside the shell without relayout (${width}px)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('./');
    const navbar = page.locator('.navbar');
    const fullWidth = (await navbar.boundingBox())!.width;
    await page.locator('.hero-scroll').click();
    await expect(navbar).toHaveCSS('width', '56px');
    await page.locator('.navbar-trigger').click();
    const frames = await page.evaluate(async () => {
      const header = document.querySelector<HTMLElement>('.navbar')!;
      const nav = header.querySelector<HTMLElement>('.nav-links')!;
      const link = nav.querySelector<HTMLAnchorElement>('a')!;
      const samples = [];
      for (let i = 0; i < 30; i++) {
        await new Promise(requestAnimationFrame);
        const shell = header.getBoundingClientRect();
        const content = nav.getBoundingClientRect();
        let opacity = 1;
        for (
          let element: HTMLElement | null = nav;
          element && element !== header;
          element = element.parentElement
        )
          opacity *= Number(getComputedStyle(element).opacity);
        samples.push({
          width: shell.width,
          left: shell.left,
          right: shell.right,
          navLeft: content.left,
          navRight: content.right,
          linkWidth: link.getBoundingClientRect().width,
          opacity,
        });
      }
      return samples;
    });
    const intermediate = frames.filter((frame) => frame.width < fullWidth - 1);
    expect(intermediate.length).toBeGreaterThan(0);
    expect(
      intermediate.filter(
        (frame) =>
          frame.opacity > 0.05 &&
          (frame.navLeft < frame.left - 1 || frame.navRight > frame.right + 1),
      ),
    ).toEqual([]);
    const finalLinkWidth = frames.at(-1)!.linkWidth;
    expect(
      frames.filter(
        (frame) =>
          frame.opacity > 0.05 &&
          Math.abs(frame.linkWidth - finalLinkWidth) > 1,
      ),
    ).toEqual([]);
    await expect(navbar).toHaveCSS('width', `${fullWidth}px`);
    await expect(
      navbar.getByRole('link', { name: 'Projects', exact: true }),
    ).toBeVisible();
  });
}

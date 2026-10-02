import { test, expect } from '@playwright/test';
import snapshot from '../../src/content/generated/portfolio.json';
test.use({ locale: 'zh-TW' });
test('homepage shows featured work and links to all public projects', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('#projects .project-card')).toHaveCount(
    snapshot.projects.filter((p) => p.featured).length,
  );
  await page.getByRole('link', { name: '查看完整作品集' }).click();
  await expect(page.locator('.project-card')).toHaveCount(
    snapshot.projects.length,
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: '完整作品集', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('#projects .section-heading > p')).toHaveCount(0);
  await page.getByRole('link', { name: '返回專案' }).click();
  await expect(page).toHaveURL(/\/#projects$/);
  await expect
    .poll(() =>
      page
        .locator('#projects')
        .evaluate((e) => Math.round(e.getBoundingClientRect().top)),
    )
    .toBe(20);
});
test('project header is compact and carousel changes image without scrolling the dialog', async ({
  page,
}) => {
  await page.goto('/projects/');
  const project = snapshot.projects.find(
    (p) => p.gallery.length > 0 && p.cover,
  )!;
  await page
    .getByRole('button', { name: `查看專案： ${project.title['zh-TW']}` })
    .click();
  const dialog = page.locator('dialog');
  await expect(dialog.locator('.project-title-row')).toContainText(
    project.period || '',
  );
  await expect(dialog.locator('.project-facts')).toHaveCount(0);
  await expect(dialog.locator('.gallery-image')).toHaveCount(1);
  const first = await dialog.locator('.gallery-image').getAttribute('src');
  await dialog.getByRole('button', { name: '下一張圖片' }).click();
  await expect(dialog.locator('.gallery-image')).not.toHaveAttribute(
    'src',
    first!,
  );
  await dialog.getByRole('button', { name: '上一張圖片' }).click();
  await expect(dialog.locator('.gallery-image')).toHaveAttribute('src', first!);
  const stage = dialog.locator('.carousel-stage');
  await stage.scrollIntoViewIfNeeded();
  const box = (await stage.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  await expect(dialog.locator('.gallery-image')).not.toHaveAttribute(
    'src',
    first!,
  );
  await dialog.evaluate((e) => (e.scrollTop = 0));
  await page.screenshot({
    path: 'test-results/screenshots/project-carousel-desktop.png',
  });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 375, height: 812 });
  await page
    .getByRole('button', { name: `查看專案： ${project.title['zh-TW']}` })
    .click();
  await expect(dialog.locator('.gallery-image')).toHaveAttribute('src', first!);
  await stage.scrollIntoViewIfNeeded();
  const mobileBox = (await stage.boundingBox())!;
  const touch = await page.context().newCDPSession(page);
  const y = mobileBox.y + mobileBox.height / 2;
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: mobileBox.x + mobileBox.width - 30, y }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: mobileBox.x + 60, y }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(dialog.locator('.gallery-image')).not.toHaveAttribute(
    'src',
    first!,
  );
  await page.screenshot({
    path: 'test-results/screenshots/project-carousel-mobile.png',
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const reverse = (await stage.boundingBox())!;
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: reverse.x + 60, y: reverse.y + reverse.height / 2 }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: reverse.x + reverse.width - 30, y: reverse.y + reverse.height / 2 },
    ],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect(dialog.locator('.gallery-image')).toHaveAttribute('src', first!);
  const total = new Set([
    project.cover!.src,
    ...project.gallery.map((p) => p.src),
  ]).size;
  for (const direction of ['right', 'left']) {
    const bounds = (await stage.boundingBox())!;
    const left = bounds.x + 35,
      right = bounds.x + bounds.width - 35;
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [
        {
          x: direction === 'left' ? right : left,
          y: bounds.y + bounds.height / 2,
        },
      ],
    });
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: direction === 'left' ? left : right,
          y: bounds.y + bounds.height / 2,
        },
      ],
    });
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    });
    await expect(dialog.getByRole('status')).toHaveText(
      `${direction === 'right' ? total : 1} / ${total}`,
    );
  }
  await page.setViewportSize({ width: 375, height: 480 });
  await stage.scrollIntoViewIfNeeded();
  const vertical = (await stage.boundingBox())!;
  const startScroll = await dialog.evaluate((e) => e.scrollTop);
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: vertical.x + 100, y: vertical.y + vertical.height / 2 }],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [
      { x: vertical.x + 100, y: vertical.y + vertical.height / 2 + 80 },
    ],
  });
  await touch.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  });
  await expect
    .poll(() => dialog.evaluate((e) => e.scrollTop))
    .toBeLessThan(startScroll);
  await expect(dialog.locator('.gallery-image')).toHaveAttribute('src', first!);
});

test('period sits beside the title and role beneath it without the facts block', async ({
  page,
}) => {
  await page.goto('/projects/');
  const candidate = snapshot.projects.find(
    (p) => p.period && p.role?.['zh-TW'],
  );
  test.skip(!candidate, '目前公開內容沒有同時填寫期間及角色的作品。');
  const project = candidate!;
  await page
    .getByRole('button', { name: `查看專案： ${project.title['zh-TW']}` })
    .click();
  const dialog = page.locator('dialog');
  await expect(dialog.locator('.project-title-row')).toContainText(
    project.period!,
  );
  await expect(dialog.locator('.project-role')).toHaveText(
    project.role!['zh-TW'],
  );
  await expect(dialog.locator('.project-facts')).toHaveCount(0);
  const title = (await dialog.locator('h2').boundingBox())!;
  const period = (await dialog.locator('.project-period').boundingBox())!;
  const role = (await dialog.locator('.project-role').boundingBox())!;
  expect(period.x).toBeGreaterThan(title.x + title.width);
  expect(role.y).toBeGreaterThan(title.y + title.height);
  await page.screenshot({
    path: 'test-results/screenshots/project-header-compact.png',
  });
});

for (const width of [1440, 967, 646, 375]) {
  test(`carousel wraps and controls stay still at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: width === 967 ? 569 : 812 });
    await page.goto('/projects/');
    const project = [...snapshot.projects]
      .filter((p) => p.cover)
      .sort((a, b) => b.gallery.length - a.gallery.length)[0];
    const count = new Set([
      project.cover!.src,
      ...project.gallery.map((p) => p.src),
    ]).size;
    await page
      .getByRole('button', { name: `查看專案： ${project.title['zh-TW']}` })
      .click();
    const dialog = page.locator('dialog');
    const top = (await dialog.locator('.dialog-top').boundingBox())!;
    const title = (await dialog.locator('h2').boundingBox())!;
    expect(title.y - top.y - top.height).toBeLessThanOrEqual(12);
    const image = (await dialog.locator('.gallery-image').boundingBox())!;
    const frame = (await dialog.boundingBox())!;
    expect(
      Math.abs(image.x + image.width / 2 - frame.x - frame.width / 2),
    ).toBeLessThan(1);
    const controls = dialog.locator('.carousel-controls');
    await controls.scrollIntoViewIfNeeded();
    const position = await controls.evaluate(
      (e) => e.getBoundingClientRect().top,
    );
    const next = dialog.getByRole('button', { name: '下一張圖片' });
    const prev = dialog.getByRole('button', { name: '上一張圖片' });
    await prev.click();
    await expect(dialog.getByRole('status')).toHaveText(`${count} / ${count}`);
    await next.click();
    await expect(dialog.getByRole('status')).toHaveText(`1 / ${count}`);
    for (let i = 1; i <= count; i++) {
      await next.click();
      await expect(dialog.getByRole('status')).toHaveText(
        `${(i % count) + 1} / ${count}`,
      );
      await expect
        .poll(() => controls.evaluate((e) => e.getBoundingClientRect().top))
        .toBe(position);
    }
    await page.screenshot({
      path: `test-results/screenshots/carousel-stable-${width}.png`,
    });
  });
}

test('homepage portfolio link sits beside its title without a subtitle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 646, height: 812 });
  await page.goto('/');
  const heading = page.locator('#projects .section-heading');
  const title = (await heading.getByRole('heading').boundingBox())!;
  const link = (await heading
    .getByRole('link', { name: '查看完整作品集' })
    .boundingBox())!;
  expect(link.x).toBeGreaterThanOrEqual(title.x + title.width);
  expect(
    Math.abs(link.y + link.height / 2 - title.y - title.height / 2),
  ).toBeLessThan(3);
  await expect(heading.locator('p')).toHaveCount(0);
  await heading.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'test-results/screenshots/projects-heading-646.png',
  });
});

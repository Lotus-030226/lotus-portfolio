import { test, expect } from '@playwright/test';
import fs from 'node:fs';
let createdSlug = '';
test.afterEach(async ({ page }) => {
  const cookies = await page.context().cookies();
  const token = cookies.find((c) => c.name === 'csrftoken')?.value || '';
  const response = await page.request.get('http://127.0.0.1:8100/api/records/');
  if (response.ok()) {
    const rows = await response.json();
    const row = rows.find((r: { slug: string }) => r.slug === createdSlug);
    if (row)
      await page.request.delete(
        `http://127.0.0.1:8100/api/records/${row.id}/`,
        { headers: { 'X-CSRFToken': token }, data: { version: row.version } },
      );
  }
});
test('studio edits bilingual draft, uploads image, saves and reorders', async ({
  page,
}) => {
  const credentials = JSON.parse(
    fs.readFileSync('private/test-login.json', 'utf8'),
  );
  await page.goto('http://127.0.0.1:8100/studio/');
  await page.getByLabel('帳號').fill(credentials.username);
  await page.getByLabel('密碼').fill(credentials.password);
  await page.getByRole('button', { name: '登入工作室' }).click();
  await page.getByRole('button', { name: '作品專案', exact: true }).click();
  await page.getByRole('button', { name: '新增作品' }).click();
  await page
    .getByLabel('識別名稱')
    .fill((createdSlug = 'e2e-draft-' + Date.now()));
  await page.getByLabel('專案名稱').fill('瀏覽器草稿');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await page.getByLabel('專案名稱').fill('Browser draft');
  await page.route('**/api/records/', async (route) => {
    if (route.request().method() === 'POST')
      await new Promise((resolve) => setTimeout(resolve, 700));
    await route.continue();
  });
  await page.getByRole('button', { name: '儲存草稿', exact: true }).click();
  await expect(page.getByLabel('專案名稱')).toBeDisabled();
  await page.getByRole('button', { name: '技術技能', exact: true }).click();
  await expect(page.getByLabel('專案名稱')).toHaveValue('Browser draft');
  await expect(page.getByRole('status')).toContainText('已儲存');
  await page.getByRole('button', { name: '圖片與連結' }).click();
  await expect(page.getByLabel('中文圖片描述')).toHaveCount(0);
  await expect(page.locator('.gallery-order')).toHaveCount(0);
  for (let i = 0; i < 3; i++) {
    await page
      .getByLabel('上傳圖片')
      .setInputFiles('tests/fixtures/upload.png');
    await expect(page.locator('.asset-card')).toHaveCount(i + 1);
  }
  const original = await page
    .locator('.asset-card img')
    .evaluateAll((images) => images.map((img) => img.getAttribute('src')));
  await page.getByRole('button', { name: '圖片前移 3', exact: true }).click();
  await page
    .locator('.asset-card')
    .nth(1)
    .dragTo(page.locator('.asset-card').nth(0));
  await page.route('**/api/records/*/', async (route) => {
    if (route.request().method() === 'PATCH')
      await new Promise((resolve) => setTimeout(resolve, 1000));
    await route.continue();
  });

  await page.getByRole('button', { name: '儲存草稿', exact: true }).click();
  await expect(page.locator('.asset-card').first()).toHaveAttribute(
    'draggable',
    'false',
  );
  await expect(page.getByRole('status')).toContainText('已儲存');
  await page.reload();
  await page
    .locator('.record-select')
    .filter({ hasText: '瀏覽器草稿' })
    .click();
  await page.getByRole('button', { name: '圖片與連結' }).click();
  await expect(page.locator('.asset-card')).toHaveCount(3);
  expect(
    await page
      .locator('.asset-card img')
      .evaluateAll((images) => images.map((img) => img.getAttribute('src'))),
  ).toEqual([original[2], original[0], original[1]]);
  await expect(page.locator('.asset-card').first()).toContainText('封面');
  const removeImage = page.getByRole('button', {
    name: '刪除圖片 1',
    exact: true,
  });
  await expect(removeImage).toHaveCSS('opacity', '0');
  await page.locator('.asset-card').first().hover();
  await removeImage.click();
  await expect(page.locator('.asset-card')).toHaveCount(2);
  await page.getByRole('button', { name: '儲存草稿', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已儲存');
  await page.reload();
  await page
    .locator('.record-select')
    .filter({ hasText: '瀏覽器草稿' })
    .click();
  await page.getByRole('button', { name: '圖片與連結' }).click();
  await expect(page.locator('.asset-card')).toHaveCount(2);
  await page.getByRole('button', { name: '上移 瀏覽器草稿' }).click();
  await expect(page.getByRole('status')).toContainText('排序');
  await page.setViewportSize({ width: 375, height: 812 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
});

test('prepare and backup jobs expose real preview and download', async ({
  page,
}) => {
  test.setTimeout(120000);
  const credentials = JSON.parse(
    fs.readFileSync('private/test-login.json', 'utf8'),
  );
  await page.goto('http://127.0.0.1:8100/studio/');
  await page.getByLabel('帳號').fill(credentials.username);
  await page.getByLabel('密碼').fill(credentials.password);
  await page.getByRole('button', { name: '登入工作室' }).click();
  await page.getByRole('button', { name: '準備與備份', exact: true }).click();
  const prepareResponsePromise = page.waitForResponse(
    (r) => r.url().endsWith('/api/jobs/') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '準備更新', exact: true }).click();
  const prepareResponse = await prepareResponsePromise;
  expect(prepareResponse.status()).toBe(202);
  const prepareId = (await prepareResponse.json()).id;
  const prepared = page.locator(`[data-job-id="${prepareId}"]`);
  await expect(prepared).toContainText('· 完成', { timeout: 90000 });
  await expect(prepared.getByRole('link', { name: '查看預覽' })).toBeVisible();
  const response = await page.request.get('http://127.0.0.1:3102/');
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('Lotus');
  const backupResponsePromise = page.waitForResponse(
    (r) => r.url().endsWith('/api/jobs/') && r.request().method() === 'POST',
  );
  await page.getByRole('button', { name: '建立備份' }).click();
  const backupResponse = await backupResponsePromise;
  expect(backupResponse.status()).toBe(202);
  const backupId = (await backupResponse.json()).id;
  const backup = page.locator(`[data-job-id="${backupId}"]`);
  await expect(backup.getByRole('link', { name: '下載備份' })).toBeVisible({
    timeout: 30000,
  });
  const href = await backup.getByRole('link').getAttribute('href');
  const download = await page.request.get('http://127.0.0.1:8100' + href);
  expect(download.headers()['content-type']).toBe('application/zip');
  expect((await download.body()).subarray(0, 2).toString()).toBe('PK');
});

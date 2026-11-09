import { expect, test } from '@playwright/test';

for (const width of [1440, 320]) {
  test(`help search, expandable answers and real navigation work at ${width}px without changing progress`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./#/guide');
    const guide = page.locator('[data-tour="help-guide"]');
    const raw = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
    await expect(guide.locator('.help-topic')).toHaveCount(21);
    const search = guide.getByRole('searchbox', { name: 'Find an answer', exact: true });
    await search.fill('streak');
    const streak = guide.locator('.help-topic').filter({ has: page.getByRole('heading', { name: 'Recorded-work streak and today’s dot border', exact: true }) });
    await streak.locator('summary').click();
    await expect(streak).toHaveAttribute('open', '');
    await expect(streak).toContainText('even without completion');
    await expect(streak.getByRole('link', { name: 'View mission streaks', exact: true })).toHaveAttribute('href', '#/missions');
    await streak.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(streak).not.toHaveAttribute('open', '');
    await search.fill('no-matching-help-topic');
    await expect(guide).toContainText('No matching topic');
    await guide.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(guide.locator('.help-topic')).toHaveCount(21);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await guide.getByRole('link', { name: 'Review roadmap updates', exact: true }).click();
    await expect(page).toHaveURL(/#\/sources$/);
    await expect(page.getByRole('heading', { name: 'Operation documents', exact: true, level: 1 })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(raw);
  });

  test(`Help finds and opens background Fieldcraft at ${width}px without changing progress`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./#/guide');
    await expect(page.getByRole('heading', { name: 'Help & glossary', exact: true })).toBeVisible();
    const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
    await page.getByRole('searchbox', { name: 'Find an answer', exact: true }).fill('customer discovery');
    const topic = page.locator('.help-topic');
    await expect(topic).toHaveCount(1);
    await topic.locator('summary').click();
    await expect(topic).toContainText('No paid account or real customer access is required');
    await topic.getByRole('link', { name: 'Open Fieldcraft', exact: true }).click();
    await expect(page).toHaveURL(/#\/mission\/fde$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Forward Deployed Engineering');
    await expect(page.getByRole('button', { name: 'Bring into focus', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
  });
}

test('Help launches isolated practice and returns without changing real data', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/guide');
  const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
  await page.locator('[data-tour="help-guide"]').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  await expect(page.locator('.tutorial-panel')).toBeVisible();
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  await expect(page).toHaveURL(/#\/guide$/);
  expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
});

test('Help makes the new discovery collection searchable and opens it without recording work', async ({ page }) => {
  await page.goto('./#/guide');
  const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
  await page.getByRole('searchbox', { name: 'Find an answer', exact: true }).fill('hidden achievements');
  const topic = page.locator('.help-topic');
  await expect(topic).toHaveCount(1);
  await topic.locator('summary').click();
  await expect(topic).toContainText('not a career score');
  await topic.getByRole('link', { name: 'Explore Discovery Atlas' }).click();
  await expect(page).toHaveURL(/#\/discoveries$/);
  await expect(page.locator('.discovery-collection-count')).toHaveText('0 / 24 discovered');
  expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
});

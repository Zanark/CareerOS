import { expect, test, type Page } from '@playwright/test';
import { getLatestMission, getMissionVersion } from '../src/domain/catalog';
import { createInitialState, generatePlan, localDate } from '../src/domain/engine';
import { getPackOutline, packCheckpointId } from '../src/domain/roadmapPacks/registry';
import { packMissionIds } from '../src/domain/roadmapPacks/types';

const key = 'careerhq.workspace.v1';

async function seedPrevious(page: Page) {
  const state = createInitialState(false, '2.0.0');
  state.plans[localDate()] = generatePlan(state);
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  return raw;
}

async function rawState(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), key);
}

for (const id of packMissionIds.filter(id => id !== 'fde')) {
  test(`${id}: all source units are browsable and deep links preserve the old tracker`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const before = await seedPrevious(page);
    const pack = getPackOutline(id)!;
    const last = pack.units.at(-1)!;
    await page.goto(`./#/practice/${id}`);
    await expect(page.getByRole('heading', { name: `${getLatestMission(id).name} practice`, level: 1, exact: true })).toBeVisible();
    await expect(page.locator('.pack-source-name')).toHaveText(pack.document);
    const select = page.getByRole('combobox', { name: 'Practice module or reference' });
    await expect(select.locator('option')).toHaveCount(pack.units.length);
    await select.selectOption(last.id);
    await expect(page.getByRole('heading', { name: last.title, level: 2, exact: true })).toBeVisible();
    await expect(page.locator('.pack-exercises > ol > li')).toHaveCount(last.exerciseCount);
    await page.reload();
    await expect(select).toHaveValue(last.id);
    await expect(page.getByRole('heading', { name: last.title, level: 2, exact: true })).toBeVisible();
    expect(await rawState(page)).toBe(before);
    expect(errors).toEqual([]);
  });

  test(`${id}: complete map exposes new checkpoints and independent references before adoption`, async ({ page }) => {
    const before = await seedPrevious(page);
    const pack = getPackOutline(id)!;
    const latest = getLatestMission(id);
    const last = latest.checkpoints.at(-1)!;
    const lastUnit = pack.units.find(unit => packCheckpointId(id, unit.id) === last.id)!;
    await page.goto(`./#/mission/${id}`);
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    const modal = page.locator('.full-roadmap-modal');
    await expect(modal.locator('.full-roadmap-node')).toHaveCount(latest.checkpoints.length);
    await expect(modal.locator('[data-pack-reference]')).toHaveCount(pack.units.filter(unit => unit.role !== 'checkpoint').length);
    await expect(modal.locator('[data-full-current="true"]')).toHaveCount(0);
    await modal.getByLabel('Find a roadmap topic').selectOption(last.id);
    await expect(modal.getByRole('link', { name: "Open this checkpoint's study material and exercises" })).toBeVisible();
    await modal.getByRole('link', { name: "Open this checkpoint's study material and exercises" }).click();
    await expect(page).toHaveURL(new RegExp(`#\\/practice\\/${id}\\/${lastUnit.id}$`));
    await expect(page.getByRole('heading', { name: last.title, level: 2, exact: true })).toBeVisible();
    expect(await rawState(page)).toBe(before);
  });
}

test('adoption archives previous work only after confirmation and changes the saved view explicitly', async ({ page }) => {
  const before = await seedPrevious(page);
  await page.goto('./#/sources/income');
  page.once('dialog', dialog => dialog.dismiss());
  await page.getByRole('button', { name: 'Adopt documented roadmap', exact: true }).click();
  expect(await rawState(page)).toBe(before);
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Adopt documented roadmap', exact: true }).click();
  const next = JSON.parse((await rawState(page))!);
  expect(next.missions.income.roadmapVersion).toBe('3.0.0');
  expect(next.missions.income.completedCheckpointIds).toEqual([]);
  expect(next.archives.find((archive: { missionId: string }) => archive.missionId === 'income').progress)
    .toEqual(JSON.parse(before).missions.income);
  expect(next.plans).toEqual(JSON.parse(before).plans);
  await page.getByRole('link', { name: 'Open current tracker', exact: true }).click();
  await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
  await expect(page.locator('[data-full-current="true"]')).toHaveCount(1);
});

for (const width of [1440, 390, 320]) {
  test(`study content, filters and source names fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const before = await seedPrevious(page);
    await page.goto('./#/practice/income');
    await expect(page.locator('[data-tour="pack-study-unit"]')).toBeVisible();
    await page.getByLabel('Search this roadmap', { exact: true }).fill('delivery');
    const select = page.getByRole('combobox', { name: 'Practice module or reference' });
    expect(await select.locator('option').count()).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await page.getByRole('combobox', { name: 'Material', exact: true }).selectOption('practice');
    await expect(select.locator('option').filter({ hasText: '(practice)' })).toHaveCount(15);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    await page.locator('.pack-unit-guidance .pack-study-section > summary').first().click();
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
    expect(await rawState(page)).toBe(before);
  });
}

test('missing study chunks fail explicitly and can be reloaded without replacing saved progress', async ({ page }) => {
  const before = await seedPrevious(page);
  await page.route('**/assets/fabric-*.js', route => route.abort());
  await page.goto('./#/practice/fabric');
  await expect(page.getByRole('alert')).toContainText('Practice content could not be loaded');
  await expect(page.locator('[data-tour="pack-study-unit"]')).toHaveCount(0);
  expect(await rawState(page)).toBe(before);
  await page.unroute('**/assets/fabric-*.js');
  await page.getByRole('button', { name: 'Reload library', exact: true }).click();
  await expect(page.locator('[data-tour="pack-study-unit"]')).toBeVisible();
  expect(await rawState(page)).toBe(before);
});

test('saved tracker selection remains available and unsupported unit links never masquerade as another lesson', async ({ page }) => {
  const before = await seedPrevious(page);
  await page.goto('./#/mission/algorithm');
  await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
  await page.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await expect(page.locator('.full-roadmap-node')).toHaveCount(getMissionVersion('algorithm', '2.0.0').checkpoints.length);
  await expect(page.locator('[data-pack-reference]')).toHaveCount(0);
  await page.goto('./#/practice/fabric/not-a-source-unit');
  await expect(page.getByRole('alert')).toContainText('That source unit was not found');
  await expect(page.locator('[data-tour="pack-study-unit"]')).toHaveCount(0);
  expect(await rawState(page)).toBe(before);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 640, height: 360 }]) {
  test(`the expanded architecture map retains usable canvas at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const before = await seedPrevious(page);
    await page.goto('./#/mission/blueprint');
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    const canvas = page.locator('.full-roadmap-viewport');
    await expect.poll(() => canvas.evaluate(element => element.clientHeight)).toBeGreaterThan(80);
    await page.getByLabel('Find a roadmap topic').selectOption(getLatestMission('blueprint').checkpoints.at(-1)!.id);
    await page.getByRole('button', { name: 'Hide details', exact: true }).click();
    await expect.poll(() => canvas.evaluate(element => element.clientHeight)).toBeGreaterThan(80);
    await expect(page.getByLabel('Roadmap zoom level')).toHaveText('100%');
    expect(await rawState(page)).toBe(before);
  });
}

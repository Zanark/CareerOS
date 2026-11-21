import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate } from '../src/domain/engine';
import { systemConceptGroups, systemConcepts } from '../src/system/concepts';

const key = 'careerhq.workspace.v1';

async function seed(page: Page, version: '1.0.0' | '2.0.0') {
  const state = createInitialState(false, version);
  state.plans[localDate()] = generatePlan(state);
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  return raw;
}

for (const version of ['1.0.0', '2.0.0'] as const) {
  test(`System Design offers all concepts while preserving its v${version} tracker`, async ({ page }) => {
    const raw = await seed(page, version);
    await page.goto('./#/mission/system');
    await page.getByRole('button', { name: 'About System Design sources', exact: true }).click();
    const sources = page.getByRole('dialog', { name: 'System Design sources', exact: true });
    await expect(sources).toContainText('system-design.pdf');
    await sources.getByRole('button', { name: 'Close System Design sources help', exact: true }).click();
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'System Design full roadmap', exact: true });
    await dialog.getByLabel('Roadmap view').selectOption('concepts');
    await expect(dialog.locator('[data-concept-map-group]')).toHaveCount(20);
    await expect(dialog.locator('[data-concept-node]')).toHaveCount(160);
    await expect(dialog.locator('[aria-current="step"], .full-roadmap-node')).toHaveCount(0);
    await expect(dialog).toContainText('not mastery of every pattern');
    await expect(dialog.locator('.diagram-error')).toHaveCount(0);
    expect(await dialog.locator('[data-concept-node]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-concept-node'))))
      .toEqual(systemConcepts.map(concept => concept.id));
    await expect.poll(() => dialog.evaluate(root => {
      const area = root.querySelector('.full-roadmap-viewport')!.getBoundingClientRect();
      return [...root.querySelectorAll('[data-concept-node]')].every(node => {
        const box = node.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && box.left >= area.left - 1 && box.right <= area.right + 1 &&
          box.top >= area.top - 1 && box.bottom <= area.bottom + 1;
      });
    })).toBe(true);
    await dialog.getByLabel('Roadmap view').selectOption('saved');
    await expect(dialog.locator('.full-roadmap-node')).toHaveCount(version === '1.0.0' ? 5 : 28);
    await expect(dialog.locator('[aria-current="step"]')).toHaveCount(1);
    await dialog.getByLabel('Roadmap view').selectOption('concepts');
    await expect(dialog.locator('[data-concept-node]')).toHaveCount(160);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Full roadmap', exact: true })).toBeFocused();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });
}

for (const { width, height } of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`a concept can be found and read at ${width}x${height} without invented progress`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height });
    const raw = await seed(page, '1.0.0');
    await page.goto('./#/mission/system');
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'System Design full roadmap', exact: true });
    await dialog.getByLabel('Roadmap view').selectOption('concepts');
    const breaker = systemConcepts.find(concept => concept.title === 'Circuit Breaker' && concept.path.includes('Resiliency'))!;
    await dialog.getByLabel('Find a System Design concept').selectOption(breaker.id);
    const node = dialog.locator(`[data-concept-node="${breaker.id}"]`);
    await expect(node).toBeFocused();
    await expect(node).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByLabel('Concept map zoom level')).toHaveText('100%');
    await expect(dialog.locator('.system-concept-inspector')).toContainText('Reliability Patterns / Resiliency / Circuit Breaker');
    await expect.poll(() => node.evaluate(element => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
    expect((await dialog.locator('.full-roadmap-viewport').boundingBox())!.height).toBeGreaterThan(80);
    await testInfo.attach('concept-map-selection', { body: await page.screenshot(), contentType: 'image/png' });
    await dialog.getByRole('link', { name: 'Read the concepts and source notes' }).click();
    await expect(page).toHaveURL(/#\/system-concepts$/);
    await expect(page.getByRole('heading', { name: 'System Design concepts', exact: true, level: 1 })).toBeVisible();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });
}

for (const theme of ['dark', 'light']) {
  test(`${theme} concept browser includes every source branch and meaningful search at 320px`, async ({ page, baseURL }) => {
    const external: string[] = [];
    page.on('request', request => {
      if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url());
    });
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    const raw = await seed(page, '2.0.0');
    await page.goto('./#/system-concepts');
    await expect(page.locator('[data-concept-group]')).toHaveCount(20);
    await expect(page.locator('[data-concept-label]')).toHaveCount(140);
    for (const group of systemConceptGroups) {
      await expect(page.getByRole('heading', { name: group.title, exact: true })).toHaveCount(1);
    }
    await page.getByRole('button', { name: 'About System Design concepts', exact: true }).click();
    const context = page.getByRole('dialog', { name: 'System Design concepts', exact: true });
    await expect(context).toContainText('not mastery of every pattern');
    await expect(context.locator('a')).toHaveAttribute('href', 'https://roadmap.sh/system-design');
    await context.getByRole('button', { name: 'Close System Design concepts help', exact: true }).click();
    await page.getByLabel('Search System Design concepts').fill('Circuit Breaker');
    await expect(page.locator('[data-concept-group]')).toHaveCount(1);
    await expect(page.locator('[data-concept-label]').filter({ hasText: /^Circuit Breaker$/ })).toHaveCount(2);
    await page.getByLabel('Search System Design concepts').fill('not-a-concept');
    await expect(page.locator('.system-concept-empty')).toContainText('No concepts match');
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(page.locator('[data-concept-group]')).toHaveCount(20);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
    expect(external).toEqual([]);
  });
}

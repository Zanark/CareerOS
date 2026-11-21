import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, recordEvidence } from '../src/domain/engine';
import { systemPracticeCases, systemPracticeModules } from '../src/domain/operations/systemPracticeContent';
import { systemPracticeUnits } from '../src/domain/operations/systemPracticeStudy';
import type { AppState } from '../src/domain/types';

const key = 'careerhq.workspace.v1';

async function seed(page: Page, state: AppState) {
  state.plans[localDate()] = generatePlan(state);
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  return raw;
}

test('the full System roadmap separates problem modules, independent cases, concepts and the saved tracker', async ({ page }) => {
  const raw = await seed(page, createInitialState(false, '2.0.0'));
  await page.goto('./#/mission/system');
  await page.getByRole('button', { name: 'About System Design sources', exact: true }).click();
  const sources = page.getByRole('dialog', { name: 'System Design sources', exact: true });
  await expect(sources).toContainText('SystemDesign_RoadMap.pdf');
  await sources.getByRole('button', { name: 'Close System Design sources help', exact: true }).click();
  await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'System Design full roadmap', exact: true });
  await expect(dialog.getByLabel('Roadmap view')).toHaveValue('complete');
  await expect(dialog.locator('.full-roadmap-stage')).toHaveCount(9);
  await expect(dialog.locator('[data-full-checkpoint]')).toHaveCount(72);
  await expect(dialog.locator('[data-system-case]')).toHaveCount(15);
  await expect.poll(() => dialog.evaluate(root => {
    const area = root.querySelector('.full-roadmap-viewport')!.getBoundingClientRect();
    return [...root.querySelectorAll('[data-full-checkpoint], [data-system-case]')].every(node => {
      const box = node.getBoundingClientRect();
      return box.width > 0 && box.height > 0 && box.left >= area.left - 1 && box.right <= area.right + 1 &&
        box.top >= area.top - 1 && box.bottom <= area.bottom + 1;
    });
  })).toBe(true);
  await expect(dialog.locator('[aria-current="step"]')).toHaveCount(0);
  await expect(dialog.locator('.full-roadmap-case-bank')).toContainText('not required serial checkpoints');
  await dialog.getByLabel('Find a roadmap topic').selectOption('practice-case-a');
  await expect(dialog.locator('[data-system-case="case-a"]')).toBeFocused();
  await expect(dialog.locator('.full-roadmap-details')).toContainText('Independently selectable practice');
  await dialog.getByLabel('Roadmap view').selectOption('concepts');
  await expect(dialog.locator('[data-concept-node]')).toHaveCount(160);
  await dialog.getByLabel('Roadmap view').selectOption('saved');
  await expect(dialog.locator('[data-full-checkpoint]')).toHaveCount(28);
  await expect(dialog.locator('[aria-current="step"]')).toHaveCount(1);
  await expect(dialog.locator('[data-system-case]')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('adopting System v3 is explicit and archives rather than relabels original work', async ({ page }) => {
  let state = createInitialState(false, '2.0.0');
  state = recordEvidence(state, {
    missionId: 'system', checkpointId: state.missions.system.checkpointId,
    title: 'Original synthetic design work', summary: 'An original-version diagram and exercise with confirmed completion criteria.',
    kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
  });
  state.missions.system.blocker = 'Synthetic original blocker';
  const raw = await seed(page, state);
  await page.goto('./#/mission/system');
  await expect(page.locator('.source-heading')).toContainText('Active tracker v2.0.0');
  const cancel = page.waitForEvent('dialog');
  const firstClick = page.getByRole('button', { name: 'Adopt documented roadmap', exact: true }).click();
  await (await cancel).dismiss(); await firstClick;
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  const confirm = page.waitForEvent('dialog');
  const secondClick = page.getByRole('button', { name: 'Adopt documented roadmap', exact: true }).click();
  const prompt = await confirm;
  expect(prompt.message()).toContain('New checkpoints start unconfirmed');
  await prompt.accept(); await secondClick;
  await expect(page.locator('.source-heading')).toContainText('Active tracker v3.0.0');
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(after.missions.system.checkpointId).toBe('system-v3-module-01');
  expect(after.missions.system.completedCheckpointIds).toEqual([]);
  expect(after.archives[0].progress).toEqual(state.missions.system);
  expect(after.evidence).toEqual(state.evidence);
  expect(after.recalls).toEqual(state.recalls);
  expect(after.plans).toEqual(state.plans);
  await page.getByRole('link', { name: 'Open design exercises', exact: true }).click();
  await expect(page).toHaveURL(/#\/system-practice\/module-01$/);
});

test('all 72 modules and 15 cases expose their complete source prompts, gates and page references', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('./#/system-practice');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  const select = page.getByLabel('System Design module or case', { exact: true });
  await expect(select.locator('option')).toHaveCount(87);
  let prompts = 0;
  for (const unit of systemPracticeUnits) {
    await select.selectOption(unit.id);
    await expect(page.locator('#system-practice-title')).toHaveText(unit.title);
    await expect(page.locator('.system-practice-unit > .eyebrow')).toContainText(`PDF PAGES ${unit.page}-${unit.page + 1}`);
    await expect(page.locator('.system-practice-gate')).toContainText(unit.gate);
    const expected = unit.kind === 'module' ? unit.practice : [...unit.scope, ...unit.deepDive];
    await expect(page.locator('.system-practice-prompts > li')).toHaveText(expected);
    prompts += expected.length;
    if (unit.kind === 'case') await expect(page.locator('.system-case-flow > li')).toHaveText(unit.flow);
  }
  expect(prompts).toBe(341);
  await page.locator('[data-tour="system-diagnostics"] > summary').click();
  await expect(page.locator('.system-diagnostic-grid > article')).toHaveCount(8);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test('concept-to-problem links preserve context and never alter the tracked checkpoint', async ({ page }) => {
  await page.goto('./#/system-concepts/caching');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await expect(page.locator('[data-concept-group]')).toHaveCount(1);
  await page.getByRole('link', { name: 'Practice related design problems', exact: true }).click();
  await expect(page).toHaveURL(/#\/system-practice\/concept\/caching$/);
  await expect(page.locator('.system-practice-context')).toContainText('Related to: Caching');
  const expected = systemPracticeUnits.filter(unit => unit.conceptGroupIds.includes('caching')).map(unit => unit.id);
  expect(await page.getByLabel('System Design module or case').locator('option').evaluateAll(options => options.map(option => option.getAttribute('value')))).toEqual(expected);
  await page.getByLabel('System Design module or case').selectOption('module-21');
  await expect(page).toHaveURL(/#\/system-practice\/concept\/caching\/module-21$/);
  await expect(page.locator('.system-practice-context')).toContainText('Related to: Caching');
  expect(await page.getByLabel('System Design module or case').locator('option').evaluateAll(options => options.map(option => option.getAttribute('value')))).toEqual(expected);
  await page.reload();
  await expect(page.locator('#system-practice-title')).toHaveText('Caching Fundamentals');
  await expect(page.locator('.system-practice-context')).toContainText('Related to: Caching');
  await page.locator('.system-related-concepts').getByRole('link', { name: 'Caching', exact: true }).click();
  await expect(page).toHaveURL(/#\/system-concepts\/caching$/);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 640, height: 360 }]) {
  test(`the active System tracker keeps a usable canvas in ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./#/mission/system');
    const before = await page.evaluate(key => localStorage.getItem(key), key);
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'System Design full roadmap', exact: true });
    await dialog.getByLabel('Find a roadmap topic').selectOption('system-v3-module-52');
    const node = dialog.locator('[data-full-checkpoint="system-v3-module-52"]');
    await expect(node).toBeFocused();
    await expect.poll(async () => (await dialog.locator('.full-roadmap-viewport').boundingBox())!.height).toBeGreaterThan(80);
    await expect.poll(() => node.evaluate(element => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    })).toBe(true);
    await dialog.getByRole('button', { name: 'Current checkpoint', exact: true }).click();
    await expect(dialog.locator('[aria-current="step"]')).toBeFocused();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  });
}

for (const theme of ['dark', 'light']) {
  for (const width of [1440, 390, 320]) {
    test(`${theme} exercises and case outlines stay readable at ${width}px`, async ({ page, baseURL }, testInfo) => {
      const external: string[] = [];
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url()); });
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
      await page.goto('./#/system-practice/module-52');
      const before = await page.evaluate(key => localStorage.getItem(key), key);
      await expect(page.locator('.system-practice-prompts li')).toHaveText(systemPracticeModules[51].practice);
      await page.locator('[data-tour="system-transfer-drills"] > summary').click();
      await expect(page.locator('[data-tour="system-transfer-drills"] li')).toHaveCount(5);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByLabel('System Design module or case').selectOption('case-o');
      await expect(page.locator('#system-practice-title')).toHaveText(systemPracticeCases[14].title);
      await expect(page.locator('.system-practice-unit')).toContainText('not a guaranteed runtime execution order');
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach('system-design-case', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
      expect(external).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
}

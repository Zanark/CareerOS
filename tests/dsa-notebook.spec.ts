import { expect, test, type Page } from '@playwright/test';
import { getLatestMission, getMissionVersion } from '../src/domain/catalog';
import { createInitialState, generatePlan, localDate, recordFocusSessionEvent, startFocusSession } from '../src/domain/engine';
import { notebookHandoffPrompt } from '../src/dsa/notebookCompanion';
import type { RoadmapVersion } from '../src/domain/types';

const key = 'careerhq.workspace.v1';
const companion = (page: Page) => page.locator('[data-tour="dsa-notebook-companion"]');

async function seed(page: Page, version: RoadmapVersion) {
  let state = createInitialState(false, version);
  state.plans[localDate()] = generatePlan(state);
  state = startFocusSession(state, 600);
  state = recordFocusSessionEvent(state, { sessionId: state.focusSessions![0].id, kind: 'distraction', elapsedMs: 1000 });
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  return { raw, state };
}

for (const version of ['1.0.0', '2.0.0', '3.0.0'] as const) {
  test(`NotebookLM guidance is optional and leaves the ${version} DSA tracker intact`, async ({ page }) => {
    const { raw, state } = await seed(page, version);
    await page.goto('./#/mission/pattern');
    await expect(companion(page)).not.toHaveAttribute('open', '');
    await companion(page).locator('> summary').click();
    await expect(companion(page)).toContainText('no second 90-day checklist');
    await expect(companion(page)).toContainText('existing recall rules and saved records remain unchanged');
    await expect(companion(page).locator('input')).toHaveCount(0);
    const current = getMissionVersion('pattern', version).checkpoints.find(checkpoint => checkpoint.id === state.missions.pattern.checkpointId)!;
    await expect(page.locator('[data-tour="save-state"] h2')).toHaveText(current.title);
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    if (version !== '3.0.0') await page.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
    await expect(page.locator('.full-roadmap-node')).toHaveCount(getMissionVersion('pattern', version).checkpoints.length);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
    expect(getLatestMission('pattern').checkpoints).toHaveLength(48);
  });
}

test('only matching topics show sourcebook correctness reminders, without changing practice counts', async ({ page }) => {
  const { raw } = await seed(page, '3.0.0');
  for (const [section, text] of [
    [5, 'Most frequent is not necessarily a majority'],
    [10, 'A discarded start may become useful again'],
    [11, 'The requested output decides the prefix state'],
    [23, 'Island count and island area are different outputs'],
  ] as const) {
    await page.goto(`./#/dsa/${section}`);
    await companion(page).locator('> summary').click();
    await expect(companion(page)).toContainText(text);
    await expect(page.locator('.dsa-library-intro')).toContainText('50 sections / 939 appearances');
  }
  await page.goto('./#/dsa/13');
  await companion(page).locator('> summary').click();
  await expect(companion(page).locator('.dsa-notebook-reminders')).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('the handoff copies only after a click and does not contact NotebookLM or edit data', async ({ page, baseURL }) => {
  const requests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) requests.push(request.url()); });
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async (text: string) => { document.documentElement.dataset.notebookCopied = text; } },
  }));
  const { raw } = await seed(page, '2.0.0');
  await page.goto('./#/dsa/5');
  await companion(page).locator('> summary').click();
  await companion(page).locator('.dsa-notebook-handoff > summary').click();
  expect(await page.locator('html').getAttribute('data-notebook-copied')).toBeNull();
  await companion(page).getByRole('button', { name: 'Copy handoff prompt', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-notebook-copied', notebookHandoffPrompt);
  await expect(companion(page).getByRole('status')).toContainText('nothing was sent automatically');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  expect(requests).toEqual([]);
});

test('blocked clipboard access leaves a selectable prompt and the compact layout usable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async () => { throw new DOMException('Synthetic denial', 'NotAllowedError'); } },
  }));
  const { raw } = await seed(page, '3.0.0');
  await page.goto('./#/dsa/10');
  await companion(page).locator('> summary').click();
  await companion(page).locator('.dsa-notebook-handoff > summary').click();
  await companion(page).getByRole('button', { name: 'Copy handoff prompt', exact: true }).click();
  await expect(companion(page).getByRole('status')).toContainText('copy it manually');
  await expect(companion(page).getByRole('textbox', { name: 'NotebookLM session handoff prompt' })).toHaveValue(notebookHandoffPrompt);
  await expect(companion(page).getByRole('textbox', { name: 'NotebookLM session handoff prompt' })).toHaveAttribute('readonly', '');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

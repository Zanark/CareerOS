import { expect, test, type Page } from '@playwright/test';
import { createInitialState, parseState, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { openGraphPanel, setGraphScope, setGraphCheckbox } from './graph-ui';

test.use({ timezoneId: 'Asia/Kolkata',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';

async function prepare(page: Page, completed = false) {
  let state = createInitialState(false);
  if (completed) {
    state.missions.fabric.mode = 'active';
    state = recordEvidence(state, { missionId: 'fabric', checkpointId: state.missions.fabric.checkpointId,
      title: 'Synthetic completed background checkpoint', summary: 'Fictional work with all criteria explicitly confirmed.',
      kind: 'exercise', url: '', advance: true, criteriaConfirmed: true });
    state.missions.fabric.mode = 'background';
    state.evidence[0].createdAt = '2026-10-07T12:00:00.000Z';
  }
  state.updatedAt = '2026-10-07T18:28:00.000Z';
  state.events = state.events.map(event => ({ ...event, createdAt: state.updatedAt }));
  state.plans['2026-10-07'] = [];
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: new Date('2026-10-07T18:28:00Z') });
  await page.clock.pauseAt(new Date('2026-10-07T18:29:00Z'));
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify(parseState(state)) });
  return state;
}

async function ready(page: Page) {
  await expect.poll(async () => {
    await page.clock.runFor(100);
    return page.evaluate(() => document.querySelector('.career-graph-scene')?.getAttribute('data-scene-state') ?? 'loading');
  }, { timeout: 20_000 }).toBe('ready');
  return page.locator('.career-graph-scene');
}

test('an inactive mission stays an isolated node even when its optional ring and all item choices are enabled', async ({ page }) => {
  await prepare(page);
  await page.goto('./#/home');
  const scene = await ready(page);
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  await setGraphScope(page, 'fabric');
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-node-count', '2');
  await expect(scene).toHaveAttribute('data-edge-count', '0');
  await expect(scene).toHaveAttribute('data-orbit-count', '0');
  await openGraphPanel(page, 'visibility');
  await page.getByRole('button', { name: 'Select all items', exact: true }).click();
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-node-count', '2');
  await expect(scene).toHaveAttribute('data-edge-count', '0');
  await expect(scene).toHaveAttribute('data-orbit-count', '1');
  await expect(scene).toHaveAttribute('data-orbit-tether-count', '0');
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fabric"]').click();
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await expect(inspector).toContainText('Outside focus');
  await inspector.getByRole('button', { name: /Current checkpoint:/ }).click();
  await expect(page.getByRole('complementary', { name: 'Selected career node', exact: true })).toContainText('Details only');
  await expect(page.getByRole('button', { name: 'Focus node', exact: true })).toBeDisabled();
  await expect(scene).toHaveAttribute('data-edge-count', '0');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('real background completion reveals the full mission for today and collapses after midnight without changing focus', async ({ page }) => {
  const initial = await prepare(page);
  await page.goto('./#/home');
  const scene = await ready(page);
  await setGraphScope(page, 'fabric');
  await page.clock.runFor(100);
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fabric"]').click();
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await inspector.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('Artifact title').fill('Synthetic background checkpoint completion');
  await form.getByLabel('What did you practice?').fill('Completed and checked the checkpoint criteria without changing mission focus.');
  await form.getByRole('checkbox', { name: /This checkpoint is complete/ }).check();
  for (const checkbox of await form.locator('fieldset input[type="checkbox"]').all()) await checkbox.check();
  await form.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-node-count', '35');
  await expect.poll(async () => Number(await scene.getAttribute('data-edge-count'))).toBeGreaterThan(32);
  await expect(scene).toHaveAttribute('data-orbit-count', '1');
  await expect(inspector).toContainText('Revealed for today after checkpoint completion');
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
  expect(saved.missions.fabric.mode).toBe('background');
  expect(saved.focusMissionId).toBe(initial.focusMissionId);
  expect(saved.missions.fabric.completedCheckpointIds).toHaveLength(1);
  await page.clock.fastForward(90_000);
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-activity-date', '2026-10-08');
  await expect(scene).toHaveAttribute('data-node-count', '2');
  await expect(scene).toHaveAttribute('data-edge-count', '0');
  await expect(scene).toHaveAttribute('data-orbit-count', '0');
  const tomorrow = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
  expect(tomorrow.missions).toEqual(saved.missions);
  expect(tomorrow.evidence).toEqual(saved.evidence);
  expect(tomorrow.focusMissionId).toBe(saved.focusMissionId);
});

test('a today completion does not override a deliberately hidden checkpoint layer', async ({ page }) => {
  await prepare(page, true);
  await page.goto('./#/home');
  const scene = await ready(page);
  await setGraphScope(page, 'fabric');
  await setGraphCheckbox(page, 'Checkpoints', false);
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-node-count', '3');
  await expect(scene).toHaveAttribute('data-orbit-count', '1');
  await setGraphCheckbox(page, 'Checkpoints', true);
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-node-count', '35');
});

test('focus snapshot expires the temporary detail graph at midnight while keeping the same captured work and canvas', async ({ page }) => {
  await prepare(page, true);
  await page.goto('./#/plan');
  await page.locator('[data-tour="focus-room-open"]').click();
  const scene = await ready(page);
  const beforeCount = Number(await scene.getAttribute('data-node-count'));
  await expect(scene).toHaveAttribute('data-orbit-count', '4');
  const canvas = scene.locator('canvas');
  await canvas.evaluate(element => element.setAttribute('data-focus-expiry-canvas', 'original'));
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
  await page.clock.fastForward(90_000);
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-node-count', String(beforeCount - 33));
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await expect(canvas).toHaveAttribute('data-focus-expiry-canvas', 'original');
  const tomorrow = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
  expect(tomorrow.missions).toEqual(saved.missions);
  expect(tomorrow.evidence).toEqual(saved.evidence);
});

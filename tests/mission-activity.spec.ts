import { expect, test, type Page } from '@playwright/test';
import { createInitialState, parseState, recordEvidence, upgradeRoadmap } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { MISSION_COLORS, CHECKPOINT_COMPLETE_COLOR } from '../src/missionVisuals';
import { openGraphPanel, closeGraphPanels, setGraphCheckbox, searchGraphNodes } from './graph-ui';
import { focusedGraphForState } from './mission-ring-policy';

test.use({
  timezoneId: 'Asia/Kolkata',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});
const key = 'careerhq.workspace.v1';
const now = new Date('2026-10-06T18:28:00Z');

function recordedState(days: number[]): AppState {
  const state = createInitialState(false);
  state.updatedAt = '2026-10-06T16:30:00.000Z';
  state.missions.pattern.status = days.length ? 'in-progress' : 'not-started';
  state.evidence = days.map(day => ({
    id: `synthetic-day-${day}`, missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    roadmapVersion: state.missions.pattern.roadmapVersion, title: 'Synthetic recorded practice',
    summary: 'A recorded exercise attempt without checkpoint completion.', kind: 'exercise', url: '',
    visibility: 'local', createdAt: `2026-10-${String(day).padStart(2, '0')}T12:00:00.000Z`, completedCheckpoint: false,
  }));
  return parseState(state);
}

async function seed(page: Page, state: AppState) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install({ time: now });
  await page.clock.pauseAt(new Date('2026-10-06T18:29:00Z'));
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw: JSON.stringify(state) });
}

async function ready(page: Page) {
  await expect.poll(async () => {
    await page.clock.runFor(100);
    return page.evaluate(() => document.querySelector('.career-graph-scene')?.getAttribute('data-scene-state') ?? 'loading');
  }, { timeout: 20_000 }).toBe('ready');
  return page.locator('.career-graph-scene');
}

test('all ten selectable mission ring hues are unique and match Missions exactly', async ({ page }) => {
  await seed(page, recordedState([]));
  await page.goto('./#/missions');
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  for (const [id, color] of Object.entries(MISSION_COLORS)) {
    const card = page.locator(`.mission-card[data-mission-id="${id}"]`);
    await expect(card).toHaveAttribute('data-mission-color', color);
    const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
    await expect(card).toHaveCSS('border-top-color', `rgb(${rgb.join(', ')})`);
  }
  await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: 'Career graph', exact: true }).click();
  const scene = await ready(page);
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await openGraphPanel(page, 'visibility');
  await page.getByRole('button', { name: 'Select all items', exact: true }).click();
  await page.clock.runFor(100);
  const identities = await scene.locator('.career-graph-scene__orbit-diagnostic').evaluateAll(elements =>
    elements.map(element => ({ id: element.getAttribute('data-orbit-id')!, color: element.getAttribute('data-orbit-color')! })));
  expect(identities).toHaveLength(10);
  expect(new Set(identities.map(item => item.color)).size).toBe(10);
  expect(identities.every(item => item.id.startsWith('orbit:mission:'))).toBe(true);
  expect(identities.map(item => item.color)).not.toContain(CHECKPOINT_COMPLETE_COLOR);
  for (const [id, color] of Object.entries(MISSION_COLORS)) {
    expect(identities.find(item => item.id === `orbit:mission:${id}`)?.color).toBe(color);
  }
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('saving unfinished work lights today’s border and extends the mission streak without completing a checkpoint', async ({ page }) => {
  await seed(page, recordedState([4, 5]));
  await page.goto('./#/home');
  const scene = await ready(page);
  const marker = scene.locator('.career-graph-scene__orbit-diagnostic[data-orbit-id="orbit:mission:pattern"]');
  await expect(marker).toHaveAttribute('data-worked-today', 'false');
  await expect(marker).toHaveAttribute('data-work-streak', '2');
  await expect(marker).toHaveAttribute('data-activity-border-strength', '0.18');
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:pattern"]').click();
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await inspector.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('Artifact title').fill('Synthetic work today');
  await form.getByLabel('What did you practice?').fill('Practiced and recorded an explanation, without claiming checkpoint completion.');
  await form.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await page.clock.runFor(100);
  await expect(marker).toHaveAttribute('data-worked-today', 'true');
  await expect(marker).toHaveAttribute('data-work-streak', '3');
  await expect(marker).toHaveAttribute('data-activity-border-strength', '1.00');
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
  expect(saved.evidence).toHaveLength(3);
  expect(saved.missions.pattern.completedCheckpointIds).toEqual([]);
  await inspector.getByRole('link', { name: 'Open mission', exact: true }).click();
  const streak = page.locator('.mission-work-streak[data-mission-id="pattern"]');
  await expect(streak).toHaveAttribute('data-work-streak', '3');
  await expect(streak).toContainText('Work recorded today');
  await expect(streak).toContainText('3 days');
});

for (const profile of ['main', 'focus'] as const) {
  test(`${profile} daily border dims after local midnight even with animation paused`, async ({ page }) => {
    await seed(page, recordedState([4, 5, 6]));
    await page.goto(`./#/${profile === 'main' ? 'home' : 'plan'}`);
    if (profile === 'focus') await page.locator('[data-tour="focus-room-open"]').click();
    const scene = await ready(page);
    const marker = scene.locator('.career-graph-scene__orbit-diagnostic[data-orbit-id="orbit:mission:pattern"]');
    await expect(marker).toHaveAttribute('data-worked-today', 'true');
    await expect(marker).toHaveAttribute('data-activity-border-strength', '1.00');
    const before = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
    await page.clock.fastForward(90_000);
    await page.clock.runFor(100);
    await expect(scene).toHaveAttribute('data-activity-date', '2026-10-07');
    await expect(marker).toHaveAttribute('data-worked-today', 'false');
    await expect(marker).toHaveAttribute('data-activity-border-strength', '0.18');
    const after = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
    expect(after.missions).toEqual(before.missions);
    expect(after.evidence).toEqual(before.evidence);
    expect(after.recalls).toEqual(before.recalls);
    expect(after.events).toEqual(before.events);
    expect(after.focusSessions).toEqual(before.focusSessions);
    if (profile === 'main') {
      await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: /^Missions/ }).click();
      await page.getByRole('button', { name: 'Open DSA', exact: true }).click();
      await expect(page.locator('.mission-work-streak')).toHaveAttribute('data-work-streak', '3');
      await expect(page.locator('.mission-work-streak')).toContainText('No work recorded today');
    }
  });
}

test('Checkpoints hides saved, archived and untracked checkpoint clouds without hiding hubs, rings or records', async ({ page }) => {
  let state = createInitialState(false, '2.0.0');
  state = recordEvidence(state, {
    missionId: 'system', checkpointId: state.missions.system.checkpointId,
    title: 'Synthetic archived checkpoint', summary: 'Completed the saved edition criteria before adopting a different curriculum.',
    kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
  });
  state = upgradeRoadmap(state, 'system');
  // Keep this layer test independent of the host date versus the frozen browser date.
  state.plans['2026-10-06'] = [];
  await seed(page, state);
  await page.goto('./#/home');
  const scene = await ready(page);
  const raw = (await page.evaluate(key => localStorage.getItem(key), key))!;
  const graph = focusedGraphForState(parseState(JSON.parse(raw)), '2026-10-06');
  expect(graph.nodes.some(node => node.kind === 'checkpoint' && node.archived)).toBe(true);
  const nonCheckpoints = graph.nodes.filter(node => node.kind !== 'checkpoint' && node.kind !== 'curriculum');
  const remaining = new Set(nonCheckpoints.map(node => node.id));
  const radius = await scene.getAttribute('data-orbit-data-radius');
  await setGraphCheckbox(page, 'Checkpoints', false);
  await page.clock.runFor(100);
  await expect(scene).toHaveAttribute('data-node-count', String(nonCheckpoints.length));
  await expect(scene).toHaveAttribute('data-edge-count', String(graph.edges.filter(edge => remaining.has(edge.source) && remaining.has(edge.target)).length));
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await expect(scene).toHaveAttribute('data-orbit-data-radius', radius!);
  await searchGraphNodes(page, 'HashMap Fundamentals');
  await expect(page.locator('.career-graph-node-list > button')).toHaveCount(0);
  await closeGraphPanels(page);
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:pattern"]').click();
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await expect(inspector).toContainText('0 of 5 members visible');
  await inspector.getByRole('button', { name: /Current checkpoint:/ }).click();
  await page.clock.runFor(100);
  await expect(page.locator('.career-graph-page').getByRole('checkbox', { name: 'Checkpoints', exact: true, includeHidden: true })).toBeChecked();
  await expect(page.getByRole('complementary', { name: 'Selected career node', exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

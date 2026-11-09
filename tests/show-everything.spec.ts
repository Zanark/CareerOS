import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, parseState, recordEvidence } from '../src/domain/engine';
import { buildCareerGraph } from '../src/graph/careerGraphModel';
import { openGraphPanel, closeGraphPanels, graphCheckbox, setGraphCheckbox, setGraphScope } from './graph-ui';
import { focusedGraphForState } from './mission-ring-policy';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';

async function open(page: Page, graphics = true) {
  let state = createInitialState(false, '2.0.0');
  state = recordEvidence(state, { missionId: 'fabric', checkpointId: state.missions.fabric.checkpointId,
    title: 'Background supporting note', summary: 'Fictional unfinished background practice.',
    kind: 'note', url: '', advance: false, criteriaConfirmed: false });
  state.opportunities = (['Found', 'Rejected', 'Accepted'] as const).map((stage, index) => ({
    id: `full-app-${index}`, company: 'Example', role: `Example role ${index}`, stage,
    notes: 'Fictional application.', url: '', createdAt: state.updatedAt,
  }));
  state.freelanceOpportunities = [{ id: 'full-lead', title: 'Ignored example lead', platform: 'Test', verdict: 'Ignore',
    skills: '', budget: '', notes: '', url: '', createdAt: state.updatedAt }];
  state.personalProof = [{ id: 'full-proof', title: 'Example past project', detail: 'Fictional test work.', source: 'Test', url: '' }];
  for (const offset of [-2, 0, 2]) {
    const day = new Date(); day.setDate(day.getDate() + offset);
    state.plans[localDate(day)] = generatePlan(state, localDate(day));
  }
  const raw = JSON.stringify(parseState(state));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, raw, graphics }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    if (!graphics) {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          return type === 'webgl2' ? null : Reflect.apply(original, this, [type, ...args]);
        },
      });
    }
  }, { key, raw, graphics });
  await page.goto('./#/home');
  const scene = page.locator('.career-graph-scene');
  await expect(scene).toHaveAttribute('data-scene-state', graphics ? 'ready' : 'unavailable', { timeout: 20_000 });
  return { state, raw, scene, full: buildCareerGraph(state, { includeAllRecords: true }) };
}

async function everything(page: Page, checked: boolean) {
  await openGraphPanel(page, 'view');
  await page.getByRole('checkbox', { name: 'Show everything', exact: true }).setChecked(checked);
  await expect(page.locator('.career-graph-page')).toHaveAttribute('data-show-everything', String(checked));
}

test('Show everything includes all graph data and restores the complete previous view without modifying saved work', async ({ page }, testInfo) => {
  const { scene, raw, full } = await open(page);
  await page.getByRole('checkbox', { name: 'Node labels', exact: true }).uncheck();
  await setGraphScope(page, 'fabric');
  for (const name of ['Work records', 'References', 'Checkpoints', 'Shared skill links', 'Rings', 'Sparks']) await setGraphCheckbox(page, name, false);
  await openGraphPanel(page, 'visibility');
  await page.getByRole('button', { name: 'Clear all items', exact: true }).click();
  await expect(scene).toHaveAttribute('data-node-count', '0');
  const canvas = scene.locator('canvas');
  await canvas.evaluate(element => element.setAttribute('data-everything-original', 'true'));
  await everything(page, true);
  await expect(scene).toHaveAttribute('data-node-count', String(full.nodes.length));
  await expect(scene).toHaveAttribute('data-edge-count', String(full.edges.length));
  await expect(scene).toHaveAttribute('data-orbit-count', '10');
  await expect(scene).toHaveAttribute('data-animation-state', 'paused');
  await expect(scene).toHaveAttribute('data-spark-density', '10');
  await expect(scene).toHaveAttribute('data-rings-visible', 'true');
  await expect(scene).toHaveAttribute('data-sparks-visible', 'true');
  for (const name of ['Work records', 'References', 'Checkpoints', 'Shared skill links', 'Rings', 'Sparks']) {
    await expect(graphCheckbox(page, name)).toBeChecked();
    await expect(graphCheckbox(page, name)).toBeDisabled();
  }
  await expect(page.getByRole('checkbox', { name: 'Node labels', exact: true })).toBeChecked();
  await expect(page.getByLabel('Filter career graph by mission')).toHaveValue('all');
  await openGraphPanel(page, 'visibility');
  await expect(page.getByRole('button', { name: 'Clear all items', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'Show DSA group', exact: true })).toBeChecked();
  await closeGraphPanels(page);
  await page.screenshot({ path: testInfo.outputPath('show-everything.png') });
  await everything(page, false);
  await expect(scene).toHaveAttribute('data-node-count', '0');
  await expect(scene).toHaveAttribute('data-edge-count', '0');
  await expect(scene).toHaveAttribute('data-orbit-count', '0');
  for (const name of ['Work records', 'References', 'Checkpoints', 'Shared skill links', 'Rings', 'Sparks']) await expect(graphCheckbox(page, name)).not.toBeChecked();
  await expect(page.getByLabel('Filter career graph by mission')).toHaveValue('fabric');
  await expect(page.getByRole('checkbox', { name: 'Node labels', exact: true })).not.toBeChecked();
  await expect(canvas).toHaveAttribute('data-everything-original', 'true');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('inactive mission checkpoints and closed applications are inspectable without activating or completing anything', async ({ page }) => {
  const { scene, raw } = await open(page);
  await everything(page, true);
  await openGraphPanel(page, 'rings');
  await expect(page.locator('.career-orbit-list > button')).toHaveCount(10);
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fabric"]').click();
  const orbit = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await expect(orbit).not.toContainText('Outside focus:');
  await orbit.getByRole('button', { name: /Current checkpoint:/ }).click();
  await expect(page.getByRole('button', { name: 'Focus node', exact: true })).toBeEnabled();
  await expect(scene.locator('canvas')).not.toHaveAttribute('data-selected-node-id', '');
  await openGraphPanel(page, 'work');
  await page.getByLabel('Search career graph nodes').fill('Rejected');
  await page.locator('.career-graph-node-list > button').click();
  await expect(page.getByRole('complementary', { name: 'Selected career node' })).toContainText('Closed pipeline reference');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('full visibility works without WebGL and the focus room retains its independent focused default', async ({ page }) => {
  const { scene, state, raw, full } = await open(page, false);
  await everything(page, true);
  await openGraphPanel(page, 'work');
  await page.getByLabel('Search career graph nodes').fill('Example past project');
  await expect(page.locator('.career-graph-node-list > button')).toHaveCount(1);
  await expect(page.locator('.career-graph-summary')).toContainText(String(full.nodes.length - 1));
  await page.reload();
  await expect(page.locator('.career-graph-page')).toHaveAttribute('data-show-everything', 'false');
  await expect(scene).toHaveAttribute('data-scene-state', 'unavailable');
  await expect(page.locator('.career-graph-summary')).toContainText(String(focusedGraphForState(state).nodes.length - 1));
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('Show everything does not leak into a focus-room snapshot', async ({ page }) => {
  const { state, raw } = await open(page);
  await everything(page, true);
  await page.goto('./#/plan');
  await page.locator('[data-tour="focus-room-open"]').click();
  const focus = page.locator('.focus-room .career-graph-scene');
  await expect(focus).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(focus).toHaveAttribute('data-node-count', String(focusedGraphForState(state).nodes.length));
  await expect(focus).toHaveAttribute('data-orbit-count', '3');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('new saved background work appears while full view remains on without activating the mission', async ({ page }) => {
  const { scene, state, full } = await open(page);
  await everything(page, true);
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fabric"]').click();
  await page.getByRole('complementary', { name: 'Selected career orbit', exact: true })
    .getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('Artifact title').fill('New full-view background note');
  await form.getByLabel('What did you practice?').fill('A fictional unfinished note; no criteria or focus change claimed.');
  await form.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect(page.locator('.career-graph-page')).toHaveAttribute('data-show-everything', 'true');
  await expect(scene).toHaveAttribute('data-node-count', String(full.nodes.length + 1));
  await expect(scene).toHaveAttribute('data-orbit-count', '10');
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!);
  expect(saved.missions.fabric.mode).toBe('background');
  expect(saved.missions.fabric.completedCheckpointIds).toEqual([]);
  expect(saved.focusMissionId).toBe(state.focusMissionId);
  await everything(page, false);
  await expect(scene).toHaveAttribute('data-node-count', String(focusedGraphForState(saved).nodes.length));
});

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`full visibility stays operable in compact fullscreen at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const { scene, full, raw } = await open(page);
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await everything(page, true);
    await expect(scene).toHaveAttribute('data-node-count', String(full.nodes.length));
    await expect(page.getByRole('checkbox', { name: 'Show everything', exact: true })).toBeInViewport({ ratio: 1 });
    await everything(page, false);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });
}

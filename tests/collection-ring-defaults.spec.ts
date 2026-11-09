import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, parseState, recordEvidence } from '../src/domain/engine';
import { buildCareerGraph } from '../src/graph/careerGraphModel';
import { closeGraphPanels, openGraphPanel, setGraphCheckbox, setGraphScope } from './graph-ui';
import { focusedGraphForState } from './mission-ring-policy';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';
const collections = ['action', 'evidence', 'opportunity', 'freelance', 'history', 'curriculum'];
const ring = (kind: string) => `orbit:${kind}`;

async function open(page: Page) {
  let state = createInitialState(false, '2.0.0');
  state.focusMissionId = 'fabric';
  state = recordEvidence(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'Synthetic collection evidence', summary: 'An unfinished fictional exercise retained without a collection ring.',
    kind: 'exercise', url: '', advance: false, criteriaConfirmed: false,
  });
  state.plans[localDate()] = generatePlan(state);
  state.opportunities = [{ id: 'collection-application', company: 'Example', role: 'Example role', stage: 'Found',
    url: '', notes: 'Fictional application.', createdAt: state.updatedAt }];
  state.freelanceOpportunities = [{ id: 'collection-lead', title: 'Example lead', platform: 'Example', url: '',
    skills: '', budget: '', verdict: 'Unreviewed', notes: 'Fictional lead.', createdAt: state.updatedAt }];
  state.personalProof = [{ id: 'collection-history', title: 'Example accomplishment', detail: 'A fictional past work record.',
    source: 'Test fixture', url: '' }];
  const raw = JSON.stringify(parseState(state));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, raw }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key, raw });
  await page.goto('./#/home');
  const scene = page.locator('.career-graph-page .career-graph-scene');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  return { scene, raw, graph: buildCareerGraph(state), view: focusedGraphForState(state) };
}

test('only active mission details start shown; all six record types remain saved and in node-only groups', async ({ page }, testInfo) => {
  const { scene, graph, view, raw } = await open(page);
  expect(graph.orbits.filter(orbit => orbit.kind !== 'mission').every(orbit => orbit.memberIds.length > 0)).toBe(true);
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await expect(scene).toHaveAttribute('data-node-count', String(view.nodes.length));
  await expect(scene).toHaveAttribute('data-edge-count', String(view.edges.length));
  const radius = await scene.getAttribute('data-orbit-data-radius');
  const revision = await scene.getAttribute('data-view-revision');
  const canvas = scene.locator('canvas');
  await canvas.evaluate(element => element.setAttribute('data-collection-original', 'true'));
  await testInfo.attach('mission-only-rings', { body: await page.screenshot(), contentType: 'image/png' });
  await setGraphCheckbox(page, 'Sparks', false);
  await openGraphPanel(page, 'rings');
  const cards = page.locator('.career-orbit-list > button');
  await expect(cards).toHaveCount(10);
  await expect(cards.filter({ hasText: 'Hidden in this view' })).toHaveCount(7);
  for (const kind of collections) await expect(page.locator(`.career-orbit-list > button[data-orbit-id="${ring(kind)}"]`)).toHaveCount(0);
  await openGraphPanel(page, 'visibility');
  const panel = page.locator('[data-graph-panel="visibility"]');
  await expect(panel.locator('.career-visibility-counts')).toContainText(`${view.nodes.length - 1} work nodes · 3 rings`);
  await expect(panel.locator('.career-visibility-counts')).toContainText(`${graph.nodes.length + 3}/${graph.nodes.length + 10} chosen`);
  await panel.locator('.career-visibility-items > summary').click();
  await panel.getByLabel('Filter visibility item types', { exact: true }).selectOption('orbit');
  await expect(panel.locator('.career-visibility-items li')).toHaveCount(10);
  for (const orbit of graph.orbits.filter(orbit => orbit.kind === 'mission')) {
    const choice = panel.locator(`[data-visibility-item="${orbit.id}"]`).getByRole('checkbox');
    if (orbit.missionMode === 'active') await expect(choice).toBeChecked();
    else await expect(choice).not.toBeChecked();
  }
  for (const kind of collections) {
    await expect(panel.locator(`[data-visibility-item="${ring(kind)}"]`)).toHaveCount(0);
    await expect(scene.locator(`.career-graph-scene__orbit-diagnostic[data-orbit-id="${ring(kind)}"]`)).toHaveCount(0);
    const records = graph.nodes.filter(node => node.kind === kind);
    expect(records.length).toBeGreaterThan(0);
    const group = panel.locator(`[data-visibility-group="collection:${kind}"]`);
    await expect(group).toContainText(`${records.length} of ${records.length} chosen`);
    await group.getByRole('checkbox').uncheck();
    await expect(scene).toHaveAttribute('data-node-count', String(view.nodes.filter(node => node.kind !== kind).length));
    await expect(scene).toHaveAttribute('data-orbit-count', '3');
    await group.getByRole('checkbox').check();
    await expect(scene).toHaveAttribute('data-node-count', String(view.nodes.length));
    await expect(scene).toHaveAttribute('data-edge-count', String(view.edges.length));
  }
  await expect(scene).toHaveAttribute('data-sparks-visible', 'false');
  await expect(scene).toHaveAttribute('data-orbit-data-radius', radius!);
  await expect(scene).toHaveAttribute('data-view-revision', revision!);
  await expect(canvas).toHaveAttribute('data-collection-original', 'true');
  await closeGraphPanels(page);
  await testInfo.attach('record-groups-without-collection-rings', { body: await page.screenshot(), contentType: 'image/png' });
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('inspecting an inactive mission does not enable it; explicit reveal changes the view, not saved mission mode', async ({ page }) => {
  const { scene, raw } = await open(page);
  await setGraphCheckbox(page, 'Sparks', false);
  await openGraphPanel(page, 'rings');
  const card = page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fabric"]');
  await expect(card).toContainText('Hidden in this view');
  await card.click();
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await expect(inspector).toContainText('Rings are hidden');
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await expect(page.getByRole('button', { name: 'Focus ring', exact: true })).toBeDisabled();
  await inspector.getByRole('button', { name: 'Reveal orbit and members', exact: true }).click();
  await expect(scene).toHaveAttribute('data-orbit-count', '1');
  await expect(scene).toHaveAttribute('data-highlighted-orbit-id', 'orbit:mission:fabric');
  await expect(page.getByRole('button', { name: 'Focus ring', exact: true })).toBeEnabled();
  await expect(inspector.getByRole('button', { name: 'Record evidence', exact: true })).toBeEnabled();
  await expect(scene).toHaveAttribute('data-edge-count', '0');
  await expect(scene).toHaveAttribute('data-orbit-tether-count', '0');
  await setGraphScope(page, 'all');
  await expect(scene).toHaveAttribute('data-orbit-count', '4');
  for (const kind of collections) {
    await expect(scene.locator(`.career-graph-scene__orbit-diagnostic[data-orbit-id="${ring(kind)}"]`)).toHaveCount(0);
  }
  await expect(scene).toHaveAttribute('data-sparks-visible', 'false');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('Select all enables all ten missions while focus and reopening independently restore three saved active defaults', async ({ page }) => {
  const { scene, view, raw } = await open(page);
  await openGraphPanel(page, 'visibility');
  await page.getByRole('button', { name: 'Select all items', exact: true }).click();
  await expect(scene).toHaveAttribute('data-orbit-count', '10');
  for (const kind of collections) {
    await expect(scene.locator(`.career-graph-scene__orbit-diagnostic[data-orbit-id="${ring(kind)}"]`)).toHaveCount(0);
  }
  await page.goto('./#/plan');
  await page.locator('[data-tour="focus-room-open"]').click();
  const focus = page.locator('.focus-room .career-graph-scene');
  await expect(focus).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(focus).toHaveAttribute('data-orbit-count', '3');
  await expect(focus).toHaveAttribute('data-node-count', String(view.nodes.length));
  await expect(focus).toHaveAttribute('data-edge-count', String(view.edges.length));
  for (const kind of collections) {
    await expect(focus.locator(`.career-graph-scene__orbit-diagnostic[data-orbit-id="${ring(kind)}"]`)).toHaveCount(0);
  }
  await page.goto('./#/home');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('reopening the main graph and focus snapshot follows saved mode changes, not the primary focus ID', async ({ page }) => {
  const { scene, raw } = await open(page);
  const before = JSON.parse(raw);
  expect(before.focusMissionId).toBe('fabric');
  for (const [button, mode, count] of [['Bring into focus', 'active', '4'], ['Move to background', 'background', '3']] as const) {
    await openGraphPanel(page, 'rings');
    await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fabric"]').click();
    await page.getByRole('link', { name: 'Open mission', exact: true }).click();
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.locator('a[href="#/home"]').first().click();
    await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
    await expect(scene).toHaveAttribute('data-orbit-count', count);
    await page.goto('./#/plan');
    await page.locator('[data-tour="focus-room-open"]').click();
    const focus = page.locator('.focus-room .career-graph-scene');
    await expect(focus).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
    await expect(focus).toHaveAttribute('data-orbit-count', count);
    const after = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!);
    expect(after.missions.fabric).toEqual({ ...before.missions.fabric, mode });
    for (const field of ['focusMissionId', 'evidence', 'archives', 'opportunities', 'freelanceOpportunities', 'personalProof']) {
      expect(after[field]).toEqual(before[field]);
    }
    await page.goto('./#/home');
    await expect(scene).toHaveAttribute('data-orbit-count', count);
  }
});

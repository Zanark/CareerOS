import { expect, test, type Locator, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, parseState } from '../src/domain/engine';
import { focusedGraphForState } from './mission-ring-policy';
import type { RoadmapVersion } from '../src/domain/types';
import { closeGraphPanels, graphCheckbox, openGraphPanel, searchGraphNodes, setGraphCheckbox } from './graph-ui';
import { chooseMissionRings } from './mission-ring-policy';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';

async function open(page: Page, graphics = false, version: RoadmapVersion = '3.0.0') {
  const state = createInitialState(false, version);
  state.plans[localDate()] = generatePlan(state);
  await page.addInitScript(({ key, raw, graphics }) => {
    localStorage.setItem(key, raw);
    if (!graphics) {
      const original = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          return type === 'webgl2' ? null : Reflect.apply(original, this, [type, ...args]);
        },
      });
    }
  }, { key, raw: JSON.stringify(parseState(state)), graphics });
  await page.emulateMedia({ reducedMotion: graphics ? 'no-preference' : 'reduce' });
  await page.goto('./#/home');
  const scene = page.locator('.career-graph-scene');
  await expect(scene).toHaveAttribute('data-scene-state', graphics ? 'ready' : 'unavailable', { timeout: 20_000 });
  const raw = (await page.evaluate(key => localStorage.getItem(key), key))!;
  return { scene, raw, graph: focusedGraphForState(parseState(JSON.parse(raw))) };
}

async function choices(page: Page) {
  await openGraphPanel(page, 'visibility');
  const panel = page.locator('[data-graph-panel="visibility"]');
  await expect(panel).toHaveAttribute('data-open', 'true');
  return panel;
}

async function individual(panel: Locator, id: string, query: string, type: 'node' | 'orbit') {
  const details = panel.locator('.career-visibility-items');
  if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await panel.getByLabel('Filter visibility item types', { exact: true }).selectOption(type);
  await panel.getByLabel('Search visibility items', { exact: true }).fill(query);
  return panel.locator(`[data-visibility-item="${id}"]`).getByRole('checkbox');
}

test('groups and individual nodes are independent, searchable and reversible without WebGL or data writes', async ({ page }) => {
  const { raw, graph } = await open(page);
  const panel = await choices(page);
  const group = panel.getByRole('checkbox', { name: 'Show DSA group', exact: true });
  await expect(group).toBeChecked();
  await group.uncheck();
  const current = graph.nodes.find(node => node.kind === 'checkpoint' && node.missionId === 'pattern' && node.current)!;
  const checkbox = await individual(panel, current.id, current.label, 'node');
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(group).toHaveJSProperty('indeterminate', true);
  await expect(checkbox).toBeChecked();
  await searchGraphNodes(page, current.label);
  await expect(page.locator('.career-graph-node-list > button')).toHaveCount(1);
  await choices(page);
  await checkbox.uncheck();
  await expect(group).toHaveJSProperty('indeterminate', false);
  await expect(group).not.toBeChecked();
  await expect(page.locator('.career-graph-node-list > button')).toHaveCount(0);
  await panel.getByRole('button', { name: 'Select all items', exact: true }).click();
  await expect(group).toBeChecked();
  await expect(checkbox).toBeChecked();
  await expect(page.locator('.career-graph-node-list > button')).toHaveCount(1);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('individual choices distinguish another filter from a hidden choice and ring reveal restores only requested items', async ({ page }) => {
  const { raw, graph } = await open(page, false, '2.0.0');
  await setGraphCheckbox(page, 'References', false);
  await setGraphCheckbox(page, 'Sparks', false);
  const panel = await choices(page);
  const reference = graph.nodes.find(node => node.kind === 'curriculum')!;
  const referenceChoice = await individual(panel, reference.id, reference.label, 'node');
  await expect(referenceChoice).toBeChecked();
  await expect(panel.locator(`[data-visibility-item="${reference.id}"]`)).toContainText('Hidden by another filter');
  await referenceChoice.uncheck();
  await referenceChoice.check();
  await expect(graphCheckbox(page, 'References')).not.toBeChecked();
  const ring = await individual(panel, 'orbit:mission:pattern', 'DSA', 'orbit');
  await ring.uncheck();
  await openGraphPanel(page, 'rings');
  await expect(panel).toHaveAttribute('data-open', 'false');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:pattern"]').click();
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await expect(inspector).toContainText('Rings are hidden');
  await inspector.getByRole('button', { name: 'Reveal orbit and members', exact: true }).click();
  await expect(graphCheckbox(page, 'Sparks')).not.toBeChecked();
  await choices(page);
  await expect(await individual(panel, 'orbit:mission:pattern', 'DSA', 'orbit')).toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('item hiding preserves remaining geometry and zoom, removes incident edges, and can hide or restore the core and every item', async ({ page }) => {
  const { raw, graph, scene } = await open(page, true);
  await chooseMissionRings(page, ['fabric']);
  await setGraphCheckbox(page, 'Auto-rotate', false);
  await page.getByRole('button', { name: 'Zoom career graph in', exact: true }).click();
  await expect.poll(async () => Number(await scene.getAttribute('data-cursor-offset'))).toBeLessThan(56);
  const zoom = await scene.getAttribute('data-cursor-offset');
  const radius = await scene.getAttribute('data-orbit-data-radius');
  const quiet = scene.locator('.career-graph-scene__orbit-diagnostic[data-orbit-id="orbit:mission:fabric"]');
  const position = await quiet.evaluate(element => [element.getAttribute('data-world-x'), element.getAttribute('data-world-y'), element.getAttribute('data-world-z')]);
  const canvas = scene.locator('canvas');
  await canvas.evaluate(element => element.setAttribute('data-item-visibility-canvas', 'original'));
  const panel = await choices(page);
  await panel.getByRole('checkbox', { name: 'Show DSA group', exact: true }).uncheck();
  const hidden = new Set(graph.nodes.filter(node => node.missionId === 'pattern').map(node => node.id));
  await expect(scene).toHaveAttribute('data-node-count', String(graph.nodes.length - hidden.size));
  await expect(scene).toHaveAttribute('data-edge-count', String(graph.edges.filter(edge => !hidden.has(edge.source) && !hidden.has(edge.target)).length));
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await expect(scene).toHaveAttribute('data-orbit-data-radius', radius!);
  await expect(scene).toHaveAttribute('data-cursor-offset', zoom!);
  await expect.poll(() => quiet.evaluate(element => [element.getAttribute('data-world-x'), element.getAttribute('data-world-y'), element.getAttribute('data-world-z')])).toEqual(position);
  await panel.getByRole('button', { name: 'Clear all items', exact: true }).click();
  for (const name of ['data-node-count', 'data-edge-count', 'data-orbit-count']) await expect(scene).toHaveAttribute(name, '0');
  await expect(scene).toHaveAttribute('data-heartbeat-running', 'false');
  await expect(scene).toHaveAttribute('data-core-screen-visible', 'false');
  await expect(canvas).toHaveAttribute('data-item-visibility-canvas', 'original');
  await panel.getByRole('button', { name: 'Select all items', exact: true }).click();
  await expect(scene).toHaveAttribute('data-node-count', String(graph.nodes.length));
  await expect(scene).toHaveAttribute('data-edge-count', String(graph.edges.length));
  await expect(scene).toHaveAttribute('data-orbit-count', '10');
  const core = panel.getByRole('checkbox', { name: 'Show CareerOS core group', exact: true });
  await core.uncheck();
  await expect(scene).toHaveAttribute('data-node-count', String(graph.nodes.length - 1));
  await expect(scene).toHaveAttribute('data-core-screen-visible', 'false');
  await expect(scene).toHaveAttribute('data-heartbeat-running', 'false');
  await core.check();
  await scene.locator('canvas').scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-core-screen-visible', 'true');
  await expect(scene).toHaveAttribute('data-heartbeat-running', 'true');
  await expect(scene).toHaveAttribute('data-cursor-offset', zoom!);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('a hidden ring loses its glow and can be explicitly revealed without showing other hidden nodes or sparks', async ({ page }) => {
  const { raw, graph, scene } = await open(page, true);
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await setGraphCheckbox(page, 'Sparks', false);
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:pattern"]').click();
  await expect(scene).toHaveAttribute('data-orbit-highlight-visible', 'true');
  const panel = await choices(page);
  await (await individual(panel, 'orbit:mission:pattern', 'DSA', 'orbit')).uncheck();
  await expect(scene).toHaveAttribute('data-node-count', String(graph.nodes.length));
  await expect(scene).toHaveAttribute('data-orbit-highlight-visible', 'false');
  await expect(scene).toHaveAttribute('data-orbit-count', '2');
  const unrelated = graph.nodes.find(node => node.kind === 'checkpoint' && node.missionId === 'system')!;
  await (await individual(panel, unrelated.id, unrelated.label, 'node')).uncheck();
  await closeGraphPanels(page);
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await inspector.getByRole('button', { name: 'Reveal orbit and members', exact: true }).click();
  await expect(scene).toHaveAttribute('data-highlighted-orbit-id', 'orbit:mission:pattern');
  await expect(scene).toHaveAttribute('data-orbit-highlight-visible', 'true');
  await expect(graphCheckbox(page, 'Sparks')).not.toBeChecked();
  await choices(page);
  await expect(await individual(panel, unrelated.id, unrelated.label, 'node')).not.toBeChecked();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('a below-the-fold graph initializes once, then keeps animation suspended until scrolled into view', async ({ page }) => {
  await page.setViewportSize({ width: 568, height: 50 });
  const { scene, raw } = await open(page, true);
  await expect(scene).toHaveAttribute('data-animation-state', 'suspended');
  const revision = await scene.getAttribute('data-animation-revision');
  await page.waitForTimeout(150);
  await expect(scene).toHaveAttribute('data-animation-revision', revision!);
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-animation-state', 'running');
  await expect.poll(async () => Number(await scene.getAttribute('data-animation-revision'))).toBeGreaterThan(Number(revision));
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`visibility controls remain scrollable in fullscreen at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const { raw } = await open(page, true);
    await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    const panel = await choices(page);
    const box = (await panel.boundingBox())!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    await expect(panel.getByRole('checkbox', { name: 'Show CareerOS core group', exact: true })).toBeInViewport({ ratio: 1 });
    await panel.getByRole('button', { name: 'Clear all items', exact: true }).click();
    await panel.getByRole('button', { name: 'Select all items', exact: true }).click();
    const ring = await individual(panel, 'orbit:mission:income', 'Freelance', 'orbit');
    await ring.uncheck();
    await ring.check();
    await expect(ring).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('visibility-fullscreen.png') });
    await closeGraphPanels(page);
    await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });
}

test('visibility choices stay view-only and do not leak between personal and tutorial workspaces', async ({ page }) => {
  const { raw } = await open(page);
  const panel = await choices(page);
  await panel.getByRole('checkbox', { name: 'Show DSA group', exact: true }).uncheck();
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'career-graph-intro');
  await expect(page.locator('.career-node-visibility').getByRole('checkbox', {
    name: 'Show DSA group', exact: true, includeHidden: true,
  })).toBeChecked();
  await page.locator('.tutorial-practice-banner').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

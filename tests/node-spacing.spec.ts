import { expect, test, type Page } from '@playwright/test';
import { closeGraphPanels, openGraphPanel, searchGraphNodes, setGraphCheckbox, setGraphScope } from './graph-ui';
import { PNG } from './png';
import { Vector3 } from 'three';
import { buildCareerGraph } from '../src/graph/careerGraphModel';
import { DEFAULT_NODE_SPACING, spaceCareerGraph } from '../src/graph/careerNodeSpacing';
import { captureFittedSpatialProjection, observeSpatialProjection, projectedNeighborhoods, projectedSeparation } from './spatial-projection';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';

async function open(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/home');
  const scene = page.locator('.career-graph-page .career-graph-scene');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  return scene;
}

async function select(page: Page, title: string) {
  await searchGraphNodes(page, title);
  await page.locator('.career-graph-node-list > button').filter({ has: page.getByText(title, { exact: true }) }).click();
  const marker = page.locator('.career-graph-page .career-graph-scene__selected-marker');
  await expect(page.locator('.career-graph-page .career-graph-scene__node-label')).toHaveText(title);
  await expect(marker).toHaveAttribute('data-screen-visible', 'true');
  return {
    x: Number(await marker.getAttribute('data-screen-x')),
    y: Number(await marker.getAttribute('data-screen-y')),
    id: (await marker.getAttribute('data-node-id'))!,
  };
}

async function doubleSpacing(page: Page) {
  await openGraphPanel(page, 'view');
  const slider = page.getByRole('slider', { name: 'Node spacing', exact: true });
  const bounds = await slider.boundingBox();
  if (!bounds) throw new Error('Expected the native spacing slider.');
  await slider.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await expect(slider).toHaveValue('200');
}

test('spacing redistributes actual nodes without zooming, preserves picking and exactly restores the default layout', async ({ page }, testInfo) => {
  const scene = await open(page);
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  await setGraphCheckbox(page, 'Sparks', false);
  await setGraphCheckbox(page, 'Rings', false);
  const canvas = scene.locator('canvas');
  await canvas.evaluate(element => element.setAttribute('data-spacing-original', 'true'));
  const first = await select(page, 'HashMap Fundamentals');
  const second = await select(page, 'Seen Before');
  const revision = await scene.getAttribute('data-view-revision');
  const radius = Number(await scene.getAttribute('data-orbit-data-radius'));
  const counts = await scene.evaluate(element => [element.dataset.nodeCount, element.dataset.edgeCount, element.dataset.orbitCount]);
  const core = await scene.evaluate(element => [element.dataset.coreScreenX, element.dataset.coreScreenY]);
  const before = await canvas.screenshot();
  await openGraphPanel(page, 'view');
  const slider = page.getByRole('slider', { name: 'Node spacing', exact: true });
  await expect(slider).toHaveValue('100');
  await expect(slider).toHaveAccessibleDescription('Spread crowded nodes within the layout, rather than enlarging the graph. Frame all restores the clearest starting view. 1.0x resets the spread.');
  for (let step = 0; step < 5; step++) await slider.press('ArrowRight');
  await expect(slider).toHaveValue('150');
  await expect(page.locator('.career-graph-page')).toHaveAttribute('data-node-spacing', '150');
  const widerFirst = await select(page, 'HashMap Fundamentals');
  const widerSecond = await select(page, 'Seen Before');
  expect(widerFirst, 'The rendered node must move, not just the slider label').not.toEqual(first);
  expect(widerSecond).not.toEqual(second);
  expect(Number(await scene.getAttribute('data-orbit-data-radius'))).toBeLessThan(radius * 1.12);
  await expect(scene).toHaveAttribute('data-view-revision', revision!);
  expect(await scene.evaluate(element => [element.dataset.coreScreenX, element.dataset.coreScreenY])).toEqual(core);
  expect(await scene.evaluate(element => [element.dataset.nodeCount, element.dataset.edgeCount, element.dataset.orbitCount])).toEqual(counts);
  await expect(scene).toHaveAttribute('data-orbit-pulse-count', '0');
  const expanded = await canvas.screenshot();
  const a = PNG.sync.read(before), b = PNG.sync.read(expanded);
  let changed = 0;
  for (let index = 0; index < a.data.length; index += 4) {
    if (Math.abs(a.data[index] - b.data[index]) + Math.abs(a.data[index + 1] - b.data[index + 1])
      + Math.abs(a.data[index + 2] - b.data[index + 2]) > 20) changed++;
  }
  expect(changed).toBeGreaterThan(1000);
  await openGraphPanel(page, 'view');
  await slider.press('Home');
  await expect.poll(async () => Number(await scene.getAttribute('data-orbit-data-radius'))).toBeCloseTo(radius, 5);
  expect(await select(page, 'HashMap Fundamentals')).toEqual(first);
  expect(await select(page, 'Seen Before')).toEqual(second);
  await expect(canvas).toHaveAttribute('data-spacing-original', 'true');
  await doubleSpacing(page);
  await closeGraphPanels(page);
  await page.getByRole('button', { name: 'Frame all', exact: true }).click();
  await page.getByRole('button', { name: 'Focus node', exact: true }).click();
  const bounds = await canvas.boundingBox();
  if (!bounds) throw new Error('Expected the actual expanded node canvas.');
  const marker = scene.locator('.career-graph-scene__selected-marker');
  await expect.poll(async () => Number(await marker.getAttribute('data-screen-x'))).toBeCloseTo(bounds.width / 2, 0);
  await page.getByRole('button', { name: 'Close node details', exact: true }).click();
  await canvas.click({ position: { x: bounds.width / 2, y: bounds.height / 2 } });
  await expect(canvas).toHaveAttribute('data-selected-node-id', second.id);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await testInfo.attach('original-spacing', { body: before, contentType: 'image/png' });
  await testInfo.attach('expanded-spacing', { body: expanded, contentType: 'image/png' });
});

for (const everything of [false, true]) test(`Frame all visibly separates mission neighborhoods at 100/200/300 with ${everything ? 'Show everything' : 'focused defaults'}`, async ({ page }, testInfo) => {
  await observeSpatialProjection(page);
  const scene = await open(page);
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  const raw = await page.evaluate(key => localStorage.getItem(key), key);
  const source = buildCareerGraph(JSON.parse(raw!), { includeAllRecords: everything });
  if (everything) await setGraphCheckbox(page, 'Show everything', true);
  await expect(scene).toHaveAttribute('data-orbit-count', everything ? '10' : '3');
  const readings = [];
  const frames: Buffer[] = [];
  let original: number[][] = [];
  let moved = 0;
  for (const spacing of [100, 200, 300]) {
    await openGraphPanel(page, 'view');
    const slider = page.getByRole('slider', { name: 'Node spacing', exact: true });
    if (spacing === 100) await slider.press('Home');
    else if (spacing === 200) await doubleSpacing(page);
    else await slider.press('End');
    await expect(slider).toHaveValue(String(spacing));
    await expect(slider).toHaveAttribute('aria-valuetext', `${(spacing / 100).toFixed(1)} relative spread`);
    await expect(page.locator('.career-node-spacing output')).toHaveText(`${(spacing / 100).toFixed(1)}x`);
    await closeGraphPanels(page);
    const captured = await captureFittedSpatialProjection(page);
    expect(captured.points).toHaveLength(Number(await scene.getAttribute('data-node-count')));
    const projected = spaceCareerGraph(source, spacing);
    readings.push({
      ...projectedSeparation(captured.points.slice(1)),
      ...projectedNeighborhoods(captured, projected),
      radius: Number(await scene.getAttribute('data-orbit-data-radius')),
    });
    if (spacing === 100) original = captured.points;
    if (spacing === 300) moved = captured.points.filter((point, index) =>
      Math.hypot(point[0] - original[index][0], point[1] - original[index][1]) > 40).length;
    const image = await scene.locator('canvas').screenshot({ path: testInfo.outputPath(`fitted-${spacing}.png`) });
    frames.push(image);
    await testInfo.attach(`fitted-${spacing}`, { body: image, contentType: 'image/png' });
  }
  if (process.env.CAREERHQ_LAYOUT_METRICS) console.info('Fitted spacing measurements:', everything, JSON.stringify(readings));
  await testInfo.attach('fitted-node-separation', { body: JSON.stringify(readings, null, 2), contentType: 'application/json' });
  for (let index = 1; index < readings.length; index++) {
    expect(readings[index].p10).toBeGreaterThan(readings[0].p10 * 1.05);
    expect(readings[index].median).toBeGreaterThan(readings[0].median * 1.15);
    expect(readings[index].sameMissionNeighbors).toBeGreaterThan(everything ? 0.97 : 0.91);
    expect(readings[index].crossMissionNear).toBeLessThan(readings[0].crossMissionNear * 0.1);
    expect(readings[index].prerequisiteP75).toBeLessThan(readings[0].prerequisiteP75 * 0.25);
    expect(readings[index].radius / readings[0].radius).toBeGreaterThan(0.9);
    expect(readings[index].radius / readings[0].radius).toBeLessThan(1.4);
  }
  expect(moved).toBeGreaterThan(original.length * 0.6);
  const before = PNG.sync.read(frames[0]), after = PNG.sync.read(frames[2]);
  let changed = 0;
  for (let index = 0; index < before.data.length; index += 4) {
    if (Math.abs(before.data[index] - after.data[index]) + Math.abs(before.data[index + 1] - after.data[index + 1])
      + Math.abs(before.data[index + 2] - after.data[index + 2]) > 20) changed++;
  }
  expect(changed).toBeGreaterThan(5000);
  await setGraphCheckbox(page, 'Show everything', true);
  await captureFittedSpatialProjection(page);
  await expect(scene).toHaveAttribute('data-orbit-count', '10');
  const bounds = await scene.locator('canvas').boundingBox();
  if (!bounds) throw new Error('Expected the fitted outer-ring canvas.');
  const anchors = scene.locator('.career-graph-scene__orbit-diagnostic');
  await expect(anchors).toHaveCount(10);
  for (const anchor of await anchors.all()) {
    await expect(anchor).toHaveAttribute('data-screen-visible', 'true');
    const x = Number(await anchor.getAttribute('data-screen-x')), y = Number(await anchor.getAttribute('data-screen-y'));
    expect(Math.min(x, y, bounds.width - x, bounds.height - y)).toBeGreaterThan(20);
  }
  await expect(scene).toHaveAttribute('data-orbit-pulse-count', '0');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`spacing stays usable in fullscreen and through filters at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const scene = await open(page);
    const raw = await page.evaluate(key => localStorage.getItem(key), key);
    await page.getByRole('button', { name: 'Full screen', exact: true }).click();
    await openGraphPanel(page, 'view');
    const slider = page.getByRole('slider', { name: 'Node spacing', exact: true });
    await slider.press('End');
    await expect(slider).toHaveValue('300');
    await expect(slider).toBeInViewport();
    await setGraphCheckbox(page, 'Checkpoints', false);
    await setGraphScope(page, 'pattern');
    await openGraphPanel(page, 'view');
    await expect(slider).toHaveValue('300');
    await closeGraphPanels(page);
    await page.getByRole('button', { name: 'Frame all', exact: true }).click();
    await expect(scene).toHaveAttribute('data-scene-state', 'ready');
    await openGraphPanel(page, 'view');
    await slider.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('node-spacing-control.png') });
    await slider.press('Home');
    await expect(slider).toHaveValue('100');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });
}

test('spacing survives real recorded work without compounding the expansion or changing focus-room defaults', async ({ page }) => {
  const scene = await open(page);
  await doubleSpacing(page);
  await closeGraphPanels(page);
  await page.getByRole('button', { name: 'Frame all', exact: true }).click();
  const first = await select(page, 'HashMap Fundamentals');
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:pattern"]').click();
  await page.getByRole('complementary', { name: 'Selected career orbit', exact: true }).getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('Artifact title').fill('Synthetic spaced-graph work');
  await form.getByLabel('What did you practice?').fill('A fictional unfinished exercise while using wider graph spacing.');
  await form.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect(page.locator('.career-graph-page')).toHaveAttribute('data-node-spacing', '200');
  expect(await select(page, 'HashMap Fundamentals')).toEqual(first);
  await expect(scene).toHaveAttribute('data-orbit-pulse-count', '0');
  const saved = await page.evaluate(key => localStorage.getItem(key), key);
  const defaultGraph = spaceCareerGraph(buildCareerGraph(JSON.parse(saved!)), DEFAULT_NODE_SPACING);
  const positions = defaultGraph.nodes.map(node => new Vector3().fromArray(node.position));
  const center = new Vector3().fromArray(defaultGraph.nodes.find(node => node.kind === 'core')!.position);
  const defaultRadius = Math.max(35, ...positions.map(position => position.distanceTo(center)));
  await page.goto('./#/plan');
  await page.locator('[data-tour="focus-room-open"]').click();
  const focus = page.locator('.focus-room .career-graph-scene');
  await expect(focus).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  expect(Number(await focus.getAttribute('data-orbit-data-radius'))).toBeCloseTo(defaultRadius, 5);
  await page.goto('./#/home');
  await expect(page.locator('.career-graph-page')).toHaveAttribute('data-node-spacing', '100');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(saved);
  expect(JSON.parse(saved!).evidence).toHaveLength(1);
  expect(JSON.parse(saved!).missions.pattern.completedCheckpointIds).toEqual([]);
});

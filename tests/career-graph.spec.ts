import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { graphCheckbox, openGraphPanel, searchGraphNodes, setGraphCheckbox, setGraphScope } from './graph-ui';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';

async function ready(page: Page) {
  await expect(page.locator('.career-graph-scene')).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  const pause = page.getByRole('button', { name: 'Pause animation', exact: true });
  if (await pause.count()) await pause.click();
  await expect(page.locator('.career-graph-scene')).toHaveAttribute('data-animation-state', 'paused');
  await setGraphCheckbox(page, 'Auto-rotate', false);
}

async function seed(page: Page, state: AppState) {
  state.plans[localDate()] ??= generatePlan(state);
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  return raw;
}

async function selectNamedNode(page: Page, name: string) {
  await searchGraphNodes(page, name);
  const button = page.locator('.career-graph-node-list > button').filter({ hasText: name }).first();
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  return button;
}

test('home is a genuine WebGL2 career network with default orange work, and Overview remains separate', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Career graph', exact: true, level: 1 })).toBeVisible();
  await ready(page);
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  const gl = await page.locator('.career-graph-stage canvas').evaluate(element => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Expected a real canvas');
    const context = element.getContext('webgl2');
    return { webgl2: context instanceof WebGL2RenderingContext, version: context?.getParameter(context.VERSION), width: element.width };
  });
  expect(gl.webgl2).toBe(true);
  expect(gl.version).toContain('WebGL 2');
  expect(gl.width).toBeGreaterThan(300);
  await expect(page.locator('.career-graph-summary')).toContainText('0 / 545');
  await selectNamedNode(page, 'HashMap Fundamentals');
  await expect(page.locator('.career-graph-inspector .graph-status-tag')).toHaveText('Not marked complete');
  await expect(page.locator('.career-graph-node-list .graph-status-incomplete')).not.toHaveCount(0);
  await openGraphPanel(page, 'view');
  await page.getByRole('link', { name: 'Open Overview', exact: true }).click();
  await expect(page).toHaveURL(/#\/hq$/);
  await expect(page.getByRole('heading', { name: 'Overview', exact: true, level: 1 })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  expect(errors).toEqual([]);
});

test('theme changes preserve the real 3D renderer and recorded work', async ({ page }) => {
  await page.goto('./#/home');
  await ready(page);
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  const scene = page.locator('.career-graph-scene');
  const canvas = page.locator('.career-graph-stage canvas');
  const count = await scene.getAttribute('data-node-count');
  await canvas.evaluate(element => element.setAttribute('data-theme-check', 'original-canvas'));
  for (const theme of ['light', 'dark']) {
    await page.getByRole('switch', { name: 'Dark theme', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(scene).toHaveAttribute('data-scene-state', 'ready');
    await expect(scene).toHaveAttribute('data-node-count', count!);
    await expect(canvas).toHaveAttribute('data-theme-check', 'original-canvas');
  }
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test('orbiting changes the 3D projection, actual point clicks select records, and drags do not complete work', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await selectNamedNode(page, 'DSA');
  const canvas = page.locator('.career-graph-stage canvas');
  const marker = page.locator('.career-graph-scene__selected-marker');
  await expect(marker).toHaveAttribute('data-screen-visible', 'true');
  const missionId = await canvas.getAttribute('data-selected-node-id');
  const point = { x: Number(await marker.getAttribute('data-screen-x')), y: Number(await marker.getAttribute('data-screen-y')) };
  await selectNamedNode(page, 'HashMap Fundamentals');
  await canvas.scrollIntoViewIfNeeded();
  await canvas.click({ position: point });
  await expect(canvas).toHaveAttribute('data-selected-node-id', missionId!);
  const revision = Number(await canvas.getAttribute('data-view-revision'));
  const projected = await marker.getAttribute('data-screen-x');
  await canvas.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await canvas.getAttribute('data-view-revision'))).toBeGreaterThan(revision);
  await expect.poll(() => marker.getAttribute('data-screen-x')).not.toBe(projected);
  const selected = await canvas.getAttribute('data-selected-node-id');
  const bounds = await canvas.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width * .5, bounds!.y + bounds!.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width * .5 + 100, bounds!.y + bounds!.height * .5 - 35, { steps: 8 });
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-selected-node-id', selected!);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test('recorded completion becomes green while proof records do not invent checkpoint credit', async ({ page }) => {
  let state = createInitialState(false);
  state.plans[localDate()] = generatePlan(state);
  state = recordEvidence(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'Synthetic completed HashMap work', summary: 'A synthetic independent implementation with explicitly confirmed criteria.',
    kind: 'code', url: '', advance: true, criteriaConfirmed: true,
  });

  state.personalProof = [{ id: 'personal-synthetic-graph', title: 'Built a fictional parser', detail: 'A synthetic past accomplishment for graph rendering coverage.', source: 'Synthetic fixture', url: '' }];
  const raw = await seed(page, state);
  await page.goto('./');
  await ready(page);
  await expect(page.locator('.career-graph-summary')).toContainText('1 / 545');
  const complete = await selectNamedNode(page, 'HashMap Fundamentals');
  await expect(complete.locator('.graph-status-complete')).toHaveCount(1);
  await expect(page.locator('.career-graph-inspector .graph-status-tag')).toHaveText('Recorded done');
  await selectNamedNode(page, 'Synthetic completed HashMap work');
  await expect(page.locator('.career-graph-inspector .graph-status-tag')).toHaveText('Reference');
  await expect(page.locator('.career-graph-summary')).toContainText('1 / 545');
  await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: 'Keep going', exact: true }).click();
  await expect(page.getByText('Built a fictional parser', { exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('finishing real checkpoint controls changes its graph node from orange to green', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  await selectNamedNode(page, 'HashMap Fundamentals');
  await expect(page.locator('.career-graph-inspector .graph-status-tag')).toHaveText('Not marked complete');
  await page.getByRole('link', { name: 'Open related page', exact: true }).click();
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('Artifact title').fill('Synthetic graph completion exercise');
  await form.getByLabel('What did you practice?').fill('Implemented the operations and explicitly confirmed the checkpoint criteria in this test.');
  await form.getByRole('checkbox', { name: /This checkpoint is complete/ }).check();
  for (const box of await form.locator('fieldset input[type="checkbox"]').all()) await box.check();
  await form.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: 'Career graph', exact: true }).click();
  await ready(page);
  await selectNamedNode(page, 'HashMap Fundamentals');
  await expect(page.locator('.career-graph-inspector .graph-status-tag')).toHaveText('Recorded done');
  await expect(page.locator('.career-graph-summary')).toContainText('1 / 545');
});

test('mission and reference filters preserve actual progress and keep all visible graph edges valid', async ({ page }) => {
  const raw = await seed(page, createInitialState(false, '1.0.0'));
  await page.goto('./');
  await ready(page);
  await expect(page.locator('.career-graph-update')).toContainText('Expanded roadmaps are available');
  const originalNodes = Number(await page.locator('.career-graph-scene').getAttribute('data-node-count'));
  await setGraphScope(page, 'pattern');
  await expect.poll(async () => Number(await page.locator('.career-graph-scene').getAttribute('data-node-count'))).toBeLessThan(originalNodes);
  await selectNamedNode(page, 'DFS');
  await expect(page.locator('.career-graph-inspector .graph-status-tag')).toHaveText('Reference');
  await expect(page.locator('.career-graph-inspector .career-graph-node-context')).toContainText('not tracked');
  await setGraphCheckbox(page, 'References', false);
  await openGraphPanel(page, 'work');
  await expect(page.locator('.career-graph-empty')).toBeVisible();
  await searchGraphNodes(page, '');
  await expect(page.locator('.career-graph-summary')).toContainText('0 / 5');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('no WebGL is an explicit limitation with usable named records, not a fake 3D fallback', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type === 'webgl2' ? null : Reflect.apply(original, this, [type, ...args]);
      },
    });
  });
  await page.goto('./');
  await expect(page.locator('.career-graph-scene')).toHaveAttribute('data-scene-state', 'unavailable');
  await expect(page.locator('.career-graph-scene')).toContainText('3D view unavailable');
  await expect(page.getByRole('button', { name: 'Frame all', exact: true })).toBeDisabled();
  await selectNamedNode(page, 'HashMap Fundamentals');
  await expect(page.locator('.career-graph-inspector h2')).toHaveText('HashMap Fundamentals');
  await expect(page.getByRole('link', { name: 'Open related page', exact: true })).toHaveAttribute('href', '#/mission/pattern');
});

test('reduced motion stops automatic orbit while keyboard rotation remains available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await ready(page);
  await expect(graphCheckbox(page, 'Auto-rotate')).not.toBeChecked();
  const canvas = page.locator('.career-graph-stage canvas');
  const before = await canvas.getAttribute('data-view-revision');
  await page.waitForTimeout(350);
  await expect(canvas).toHaveAttribute('data-view-revision', before!);
  await canvas.focus();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => canvas.getAttribute('data-view-revision')).not.toBe(before);
});

test('leaving the graph releases its WebGL context and reopening preserves workspace data', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await ready(page);
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  for (let index = 0; index < 2; index++) {
    const context = await page.locator('.career-graph-stage canvas').evaluateHandle(element => {
      if (!(element instanceof HTMLCanvasElement)) throw new Error('Expected canvas');
      return element.getContext('webgl2')!;
    });
    expect(await context.evaluate(gl => gl.isContextLost())).toBe(false);
    await openGraphPanel(page, 'view');
    await page.getByRole('link', { name: 'Open Overview', exact: true }).click();
    await expect(page).toHaveURL(/#\/hq$/);
    await expect(page.getByRole('heading', { name: 'Overview', level: 1, exact: true })).toBeVisible();
    await expect(page.locator('.career-graph-stage canvas')).toHaveCount(0);
    await expect.poll(() => context.evaluate(gl => gl.isContextLost())).toBe(true);
    await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: 'Career graph', exact: true }).click();
    await ready(page);
    await context.dispose();
  }
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  expect(errors).toEqual([]);
});

test('full screen expands the actual scene and retains its orbit controls', async ({ page }) => {
  await page.goto('./');
  await ready(page);
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement?.classList.contains('career-graph-stage-wrap'))).toBe(true);
  const canvas = page.locator('.career-graph-stage canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds!.width).toBeGreaterThan(1000);
  await canvas.focus();
  const revision = await canvas.getAttribute('data-view-revision');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => canvas.getAttribute('data-view-revision')).not.toBe(revision);
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

for (const width of [1440, 390, 320]) {
  test(`the graph home is readable and operable at ${width}px without sending workspace data`, async ({ page, baseURL }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const external: string[] = [];
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url()); });
    await page.goto('./');
    await ready(page);
    await selectNamedNode(page, 'HashMap Fundamentals');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const summary = page.locator('.career-graph-summary');
    const summaryBox = await summary.boundingBox();
    for (const item of await summary.locator('strong, div > span').all()) {
      const box = await item.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(summaryBox!.x - 1);
      expect(box!.x + box!.width).toBeLessThanOrEqual(summaryBox!.x + summaryBox!.width + 1);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await testInfo.attach('real-3D-career-home', { body: await page.screenshot(), contentType: 'image/png' });
    expect(external).toEqual([]);
  });
}

test('AI briefs require a click, use only the clipboard, and report clipboard denial', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async (value: string) => { document.documentElement.dataset.graphCopied = value; } },
  }));
  await page.goto('./');
  await expect(page.locator('html')).not.toHaveAttribute('data-graph-copied');
  await openGraphPanel(page, 'view');
  await page.getByRole('button', { name: 'Copy brief for AI', exact: true }).click();
  expect(await page.locator('html').getAttribute('data-graph-copied')).toContain('Current saved checkpoints: 0/545');
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async () => { throw new DOMException('Synthetic denial', 'NotAllowedError'); } },
  }));
  await page.getByRole('button', { name: 'Copied', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Clipboard access was denied');
});

test.describe('touch orbit', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });
  test('a touch drag rotates the 3D camera rather than recording progress', async ({ page, context }) => {
    await page.goto('./');
    await ready(page);
    const before = await page.evaluate(key => localStorage.getItem(key), key);
    const canvas = page.locator('.career-graph-stage canvas');
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    const revision = Number(await canvas.getAttribute('data-view-revision'));
    const cdp = await context.newCDPSession(page);
    const x = bounds!.x + bounds!.width * .5;
    const y = bounds!.y + bounds!.height * .5;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 65, y: y - 30, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => Number(await canvas.getAttribute('data-view-revision'))).toBeGreaterThan(revision);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
    await cdp.detach();
  });
});

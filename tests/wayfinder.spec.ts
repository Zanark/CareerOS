import { test, expect, type Page } from '@playwright/test';
import { createInitialState } from '../src/domain/engine';
import { createCompleteDiscoveryFixture } from './discovery-fixture';
import { wayfinderStages } from '../src/discovery/model';
import type { AppState } from '../src/domain/types';

const key = 'careerhq.workspace.v1';
const viewerSelector = '[data-tour="wayfinder-viewer"]';
const panelSelector = '[data-tour="wayfinder-panel"]';

async function seed(page: Page, state: AppState) {
  await page.addInitScript(({ storage, value }) => {
    if (!localStorage.getItem(storage)) localStorage.setItem(storage, JSON.stringify(value));
  }, { storage: key, value: state });
}

async function stored(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(name => [name, localStorage.getItem(name)])));
}

async function ready(page: Page) {
  await expect(page.locator(viewerSelector)).toHaveAttribute('data-viewer-state', 'ready');
  await page.evaluate(() => document.fonts.ready);
}

test('ordinary non-3D routes do not eagerly load the avatar renderer', async ({ page }) => {
  const rendererRequests: string[] = [];
  page.on('request', request => { if (request.url().includes('WayfinderViewer')) rendererRequests.push(request.url()); });
  await page.goto('./#/settings');
  await expect(page.getByRole('heading', { name: 'Settings & data', level: 1 })).toBeVisible();
  expect(rendererRequests).toEqual([]);
  await page.getByRole('link', { name: 'Discovery Atlas', exact: true }).click();
  await ready(page);
  expect(rendererRequests.length).toBeGreaterThan(0);
});

test('PS1 avatar really orbits, tilts and zooms without idle frames or saved-state writes', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/discoveries');
  await ready(page);
  const viewer = page.locator(viewerSelector);
  const canvas = viewer.locator('canvas');
  const before = await stored(page);
  const original = await viewer.getAttribute('data-camera');
  expect(Number(await viewer.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(2);
  expect(Number(await viewer.getAttribute('data-triangles'))).toBeGreaterThan(0);
  expect(Number(await viewer.getAttribute('data-triangles'))).toBeLessThan(1600);
  await expect(viewer).toHaveAttribute('data-projection', 'orthographic');
  await expect(viewer).toHaveAttribute('data-diorama-level', '1');
  const context = await canvas.evaluate(node => {
    if (!(node instanceof HTMLCanvasElement)) throw new Error('Expected the actual 3D canvas.');
    const gl = node.getContext('webgl2')!;
    return { antialias: gl.getContextAttributes()!.antialias, width: gl.drawingBufferWidth, height: gl.drawingBufferHeight };
  });
  expect(context.antialias).toBe(false);
  expect(context.width).toBeLessThanOrEqual(384);
  expect(context.width * context.height).toBeLessThanOrEqual(82_944);
  const idle = await viewer.getAttribute('data-render-count');
  await page.waitForTimeout(700);
  await expect(viewer).toHaveAttribute('data-render-count', idle!);
  await canvas.focus();
  await canvas.press('ArrowRight');
  await expect.poll(async () => Number(await viewer.getAttribute('data-orbit-offset'))).toBeGreaterThan(.1);
  await canvas.press('ArrowUp');
  const keyboard = await viewer.getAttribute('data-camera');
  expect(keyboard).not.toBe(original);
  const bounds = (await canvas.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height * .5);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .75, bounds.y + bounds.height * .62, { steps: 12 });
  await page.mouse.up();
  await expect.poll(() => viewer.getAttribute('data-camera')).not.toBe(keyboard);
  await page.getByRole('button', { name: 'Move diorama', exact: true }).click();
  await expect(viewer).toHaveAttribute('data-control-mode', 'move');
  await page.mouse.move(bounds.x + bounds.width * .4, bounds.y + bounds.height * .6);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .5, bounds.y + bounds.height * .6, { steps: 6 });
  await page.mouse.up();
  await expect.poll(async () => Number(await viewer.getAttribute('data-pan-offset'))).toBeGreaterThan(.1);
  const zoomBefore = Number((await viewer.getAttribute('data-camera'))!.split(',')[3]);
  await page.getByRole('button', { name: 'Zoom in character', exact: true }).click();
  await expect.poll(async () => Number((await viewer.getAttribute('data-camera'))!.split(',')[3])).toBeGreaterThan(zoomBefore);
  await canvas.focus();
  await canvas.press('Home');
  await expect(viewer).toHaveAttribute('data-camera', original!);
  await expect(viewer).toHaveAttribute('data-view-default', 'true');
  await expect(viewer).toHaveAttribute('data-control-mode', 'rotate');
  const settled = await viewer.getAttribute('data-render-count');
  await page.waitForTimeout(700);
  await expect(viewer).toHaveAttribute('data-render-count', settled!);
  expect(await stored(page)).toEqual(before);
});

test('all seven earned chapters keep one camera/context and have distinct equipment and actual reveal effects', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await seed(page, createCompleteDiscoveryFixture());
  await page.goto('./#/discoveries');
  await ready(page);
  const viewer = page.locator(viewerSelector);
  const panel = page.locator(panelSelector);
  const canvas = await viewer.locator('canvas').elementHandle();
  const before = await stored(page);
  const revealNames: string[] = [];
  let previousEquipment: string[] = [];
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));

  for (let level = 1; level <= 7; level++) {
    await panel.locator(`[data-chapter-level="${level}"]`).click();
    await viewer.scrollIntoViewIfNeeded();
    await page.clock.runFor(80);
    await expect(viewer).toHaveAttribute('data-model-level', String(level));
    await expect(viewer).toHaveAttribute('data-diorama-level', String(level));
    expect(await viewer.locator('canvas').evaluate((node, initial) => node === initial, canvas)).toBe(true);
    const equipment = (await viewer.getAttribute('data-equipment'))!.split(',');
    expect(equipment.slice(0, previousEquipment.length)).toEqual(previousEquipment);
    expect(equipment).toHaveLength(level);
    previousEquipment = equipment;
    expect(Number(await viewer.getAttribute('data-triangles'))).toBeLessThan(1600);
    expect(Number(await viewer.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(8);
    const still = testInfo.outputPath(`wayfinder-chapter-${level}.png`);
    await panel.screenshot({ path: still, animations: 'disabled' });
    await testInfo.attach(`Chapter ${level}: ${wayfinderStages[level - 1].title}`, { path: still, contentType: 'image/png' });
    await panel.locator('[data-tour="wayfinder-replay"]').click();
    await page.clock.runFor(120);
    const sequence = panel.locator('[data-tour="wayfinder-sequence"]');
    await expect(sequence).toHaveAttribute('data-phase', 'fill');
    await page.clock.runFor(600);
    await expect(sequence).toHaveAttribute('data-phase', 'threshold');
    await expect(viewer).toHaveAttribute('data-model-level', String(Math.max(1, level - 1)));
    await page.clock.runFor(450);
    await expect(sequence).toHaveAttribute('data-phase', 'ascend');
    await expect(viewer).toHaveAttribute('data-model-level', String(level));
    const renders = Number(await viewer.getAttribute('data-render-count'));
    await page.clock.runFor(40);
    if (level > 1) {
      await expect.poll(async () => Number(await viewer.getAttribute('data-render-count'))).toBeGreaterThan(renders);
    }
    const effects = await panel.locator('.wayfinder-scene').evaluate(node => node.getAnimations({ subtree: true }).map(animation => {
      const effect = animation.effect as KeyframeEffect;
      const target = effect.target as Element;
      animation.pause();
      animation.currentTime = 0;
      const initial = `${getComputedStyle(target).transform}/${getComputedStyle(target).opacity}`;
      animation.currentTime = Number(effect.getTiming().duration) * .75;
      const changed = `${getComputedStyle(target).transform}/${getComputedStyle(target).opacity}`;
      return { name: animation instanceof CSSAnimation ? animation.animationName : '', iterations: effect.getTiming().iterations, changed: initial !== changed };
    }));
    expect(effects.length).toBeGreaterThan(0);
    expect(effects.every(effect => Number.isFinite(effect.iterations))).toBe(true);
    expect(effects.some(effect => effect.changed)).toBe(true);
    const unique = effects.find(effect => effect.name !== 'wayfinder-pose-reveal')!.name;
    revealNames.push(unique);
    const reveal = testInfo.outputPath(`wayfinder-reveal-${level}.png`);
    await panel.locator('.wayfinder-sequence-screen').screenshot({ path: reveal });
    await testInfo.attach(`Chapter ${level} reveal`, { path: reveal, contentType: 'image/png' });
    await page.clock.runFor(1400);
    await expect(sequence).toHaveAttribute('data-phase', 'complete');
    await expect(sequence.locator('[data-reward-level]')).toHaveCount(1);
    await expect(sequence).toContainText(wayfinderStages[level - 1].relic);
    await expect(panel).toHaveAttribute('data-level', '7');
    await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2400');
    expect(await stored(page)).toEqual(before);
  }
  expect(new Set(revealNames).size).toBe(7);
});

test('confirmed source import retains every crossed level and EXP carryover when the sequence is skipped', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.goto('./#/settings');
  const complete = createCompleteDiscoveryFixture();
  page.once('dialog', dialog => dialog.accept());
  await page.getByLabel('Choose backup file', { exact: true }).setInputFiles({
    name: 'synthetic-wayfinder-source.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(complete)),
  });
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveAttribute('data-level-up', 'true');
  await page.getByRole('button', { name: 'View level-up', exact: true }).click();
  await ready(page);
  const sequence = page.locator('[data-tour="wayfinder-sequence"]');
  await expect(sequence).toHaveAttribute('data-from', '0');
  await expect(sequence).toHaveAttribute('data-to', '24');
  const before = await stored(page);
  await page.locator('[data-tour="wayfinder-skip"]').click();
  await expect(sequence).toHaveAttribute('data-phase', 'complete');
  await expect(sequence.locator('[data-reward-level]')).toHaveCount(6);
  for (let level = 2; level <= 7; level++) await expect(sequence.locator(`[data-reward-level="${level}"]`)).toContainText(wayfinderStages[level - 1].relic);
  await expect(page.locator(viewerSelector)).toHaveAttribute('data-model-level', '7');
  await expect(page.locator(viewerSelector)).toHaveAttribute('data-motion', 'still');
  await expect(page.locator(panelSelector).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2400');
  expect(await stored(page)).toEqual(before);
  const state = JSON.parse(before[key]!);
  expect(Object.keys(state)).toEqual(Object.keys(complete));
  expect(state.evidence).toEqual(complete.evidence);
  await page.reload();
  await ready(page);
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
  await expect(page.locator('[data-tour="wayfinder-sequence"]')).toHaveCount(0);
  expect(await stored(page)).toEqual(before);
});

test('reduced motion during a reveal settles equipment and leaves manual orbit operable', async ({ page }) => {
  await seed(page, createCompleteDiscoveryFixture());
  await page.goto('./#/discoveries');
  await ready(page);
  const before = await stored(page);
  await page.locator('[data-tour="wayfinder-replay"]').click();
  await expect(page.locator('[data-tour="wayfinder-sequence"]')).not.toHaveAttribute('data-phase', 'complete');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-tour="wayfinder-sequence"]')).toHaveAttribute('data-phase', 'complete');
  const viewer = page.locator(viewerSelector);
  await expect(viewer).toHaveAttribute('data-motion', 'still');
  await expect(viewer).toHaveAttribute('data-model-level', '7');
  expect(await page.locator(panelSelector).evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await viewer.locator('canvas').focus();
  await viewer.locator('canvas').press('ArrowLeft');
  await expect.poll(async () => Number(await viewer.getAttribute('data-orbit-offset'))).toBeGreaterThan(.1);
  const count = await viewer.getAttribute('data-render-count');
  await page.waitForTimeout(750);
  await expect(viewer).toHaveAttribute('data-render-count', count!);
  expect(await stored(page)).toEqual(before);
});

test('maximal equipment stops rendering offscreen and releases its context on route changes', async ({ page }) => {
  test.setTimeout(45_000);
  await seed(page, createCompleteDiscoveryFixture());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/discoveries');
  await ready(page);
  const before = await stored(page);
  const viewer = page.locator(viewerSelector);
  const oldCanvas = await viewer.locator('canvas').elementHandle();
  await page.locator('[data-tour="discovery-activity"]').scrollIntoViewIfNeeded();
  await expect(viewer).toHaveAttribute('data-visible', 'false');
  const stopped = await viewer.getAttribute('data-render-count');
  await page.waitForTimeout(700);
  await expect(viewer).toHaveAttribute('data-render-count', stopped!);
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.locator(viewerSelector)).toHaveCount(0);
  await expect.poll(() => oldCanvas!.evaluate(canvas => {
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Expected the disposed 3D canvas.');
    return canvas.getContext('webgl2')!.isContextLost();
  })).toBe(true);
  for (let index = 0; index < 3; index++) {
    await page.getByRole('link', { name: 'Discovery Atlas', exact: true }).click();
    await ready(page);
    await expect(page.locator('canvas')).toHaveCount(1);
    expect(Number(await page.locator(viewerSelector).getAttribute('data-geometries'))).toBeLessThanOrEqual(8);
    if (index < 2) await page.getByRole('link', { name: 'Overview', exact: true }).click();
  }
  expect(await stored(page)).toEqual(before);
});

test('unavailable WebGL is explicitly labelled and does not invent a working 3D view or progress', async ({ page }) => {
  await seed(page, createCompleteDiscoveryFixture());
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...options: unknown[]) {
        return kind === 'webgl2' ? null : Reflect.apply(original, this, [kind, ...options]);
      },
    });
  });
  await page.goto('./#/discoveries');
  const before = await stored(page);
  await expect(page.locator(viewerSelector)).toHaveAttribute('data-viewer-state', 'unavailable');
  await expect(page.locator('.wayfinder-viewer-message')).toContainText('A still illustration is shown');
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.locator('.wayfinder-viewer-fallback .wayfinder-art')).toHaveAttribute('data-character-level', '7');
  await page.locator('[data-tour="wayfinder-first-chapter"]').click();
  await expect(page.locator('.wayfinder-viewer-fallback .wayfinder-art')).toHaveAttribute('data-character-level', '1');
  await expect(page.locator(panelSelector)).toHaveAttribute('data-level', '7');
  expect(await stored(page)).toEqual(before);
});

test.describe('touch camera', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('native touch drag and two-finger pinch rotate and zoom without changing records', async ({ page }) => {
    await seed(page, createCompleteDiscoveryFixture());
    await page.goto('./#/discoveries');
    await ready(page);
    const viewer = page.locator(viewerSelector);
    const before = await stored(page);
    const rect = (await viewer.locator('canvas').boundingBox())!;
    const x = Math.round(rect.x + rect.width * .5);
    const y = Math.round(rect.y + rect.height * .5);
    const session = await page.context().newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 8; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * 6, y: y + step * 2, id: 1 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => Number(await viewer.getAttribute('data-orbit-offset'))).toBeGreaterThan(.2);
    const zoom = Number((await viewer.getAttribute('data-camera'))!.split(',')[3]);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 25, y, id: 1 }, { x: x + 25, y, id: 2 }] });
    for (let step = 1; step <= 5; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 25 - step * 4, y, id: 1 }, { x: x + 25 + step * 4, y, id: 2 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => Number((await viewer.getAttribute('data-camera'))!.split(',')[3])).toBeGreaterThan(zoom);
    await page.getByRole('button', { name: 'Move diorama', exact: true }).click();
    await expect(viewer).toHaveAttribute('data-control-mode', 'move');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    for (let step = 1; step <= 5; step++) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * 6, y, id: 1 }] });
    }
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect.poll(async () => Number(await viewer.getAttribute('data-pan-offset'))).toBeGreaterThan(.1);
    await session.detach();
    expect(await stored(page)).toEqual(before);
  });
});

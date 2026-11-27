import { createHash } from 'node:crypto';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { createInitialState } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { getDiscoverySnapshot } from '../src/discovery/model';
import { createCompleteDiscoveryFixture } from './discovery-fixture';
import { WAYFINDER_HISTORY_KEY, wayfinderSourceId } from '../src/discovery/useWayfinderHistory';

const key = 'careerhq.workspace.v1';
const viewerSelector = '[data-tour="wayfinder-viewer"]';

async function seed(page: Page, state: AppState) {
  const snapshot = getDiscoverySnapshot(state);
  const sourceId = wayfinderSourceId(snapshot);
  await page.addInitScript(({ storage, value, historyKey, history }) => {
    if (!localStorage.getItem(storage)) localStorage.setItem(storage, JSON.stringify(value));
    if (history && !localStorage.getItem(historyKey)) localStorage.setItem(historyKey, JSON.stringify(history));
  }, { storage: key, value: state, historyKey: WAYFINDER_HISTORY_KEY,
    history: sourceId ? { version: 1, sourceId, xp: snapshot.journey.xp } : null });
}

async function storage(page: Page) {
  return page.evaluate(() => JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(name => [name, localStorage.getItem(name)]))));
}

async function ready(page: Page) {
  const viewer = page.locator(viewerSelector);
  await viewer.scrollIntoViewIfNeeded();
  await expect(viewer).toHaveAttribute('data-viewer-state', 'ready');
  await expect(page.locator('.wayfinder-scene')).toHaveAttribute('data-atlas-visible', 'true');
  await page.evaluate(() => document.fonts.ready);
  return viewer;
}

async function motion(locator: Locator) {
  return locator.evaluate(node => node.getAnimations({ subtree: true })
    .filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation && animation.animationName.startsWith('atlas-'))
    .map(animation => ({
      name: animation.animationName, state: animation.playState, time: Number(animation.currentTime),
      loop: animation.effect!.getTiming().iterations === Infinity,
    })));
}

test('default world atmosphere changes actual pixels without idle WebGL frames or saved progress', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#/discoveries');
  const viewer = await ready(page);
  const scene = page.locator('.wayfinder-scene');
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'live');
  const before = await storage(page);
  const frames = await viewer.getAttribute('data-render-count');
  const first = createHash('sha256').update(await scene.screenshot()).digest('hex');
  await page.waitForTimeout(300);
  const second = createHash('sha256').update(await scene.screenshot()).digest('hex');
  expect(second).not.toBe(first);
  expect((await motion(scene)).some(animation => animation.loop && animation.state === 'running')).toBe(true);
  await expect(viewer).toHaveAttribute('data-render-count', frames!);
  await expect(page.locator('[data-tour="wayfinder-panel"]')).toHaveAttribute('data-level', '1');
  await expect(page.getByRole('progressbar', { name: 'Wayfinder journey EXP' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByRole('button', { name: 'Discovered', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(await storage(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('keyboard pause freezes ambience, settles a reward and resumes without replaying or awarding it', async ({ page }) => {
  await seed(page, createCompleteDiscoveryFixture());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./#/discoveries');
  await ready(page);
  const before = await storage(page);
  await page.locator('[data-tour="wayfinder-replay"]').click();
  const sequence = page.locator('[data-tour="wayfinder-sequence"]');
  await expect(sequence).not.toHaveAttribute('data-phase', 'complete');
  const control = page.getByRole('button', { name: 'Pause motion', exact: true });
  await control.focus();
  await control.press('Enter');
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'paused');
  await expect(sequence).toHaveAttribute('data-phase', 'complete');
  await expect(page.getByRole('button', { name: 'Play motion', exact: true })).toBeFocused();
  const scene = page.locator('.wayfinder-scene');
  const frozen = await motion(scene);
  expect(frozen.length).toBeGreaterThan(0);
  expect(frozen.every(animation => animation.state === 'paused')).toBe(true);
  await page.waitForTimeout(180);
  expect(await motion(scene)).toEqual(frozen);
  await page.getByRole('button', { name: 'Play motion', exact: true }).press('Enter');
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'live');
  await scene.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await motion(scene)).filter(animation => animation.state === 'running').length).toBeGreaterThan(0);
  await expect(sequence).toHaveAttribute('data-phase', 'complete');
  expect(await storage(page)).toBe(before);
});

test('system reduced motion removes automatic effects and responds to a live preference change', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/discoveries');
  const viewer = await ready(page);
  const before = await storage(page);
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'reduced');
  await expect(page.getByRole('button', { name: 'Reduced motion', exact: true })).toBeDisabled();
  expect(await page.locator('.discovery-page').evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await viewer.locator('canvas').focus();
  await viewer.locator('canvas').press('ArrowRight');
  await expect.poll(async () => Number(await viewer.getAttribute('data-orbit-offset'))).toBeGreaterThan(.1);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'live');
  await expect.poll(async () => (await motion(page.locator('.wayfinder-scene'))).filter(animation => animation.state === 'running').length).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'reduced');
  expect(await page.locator('.discovery-page').evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  expect(await storage(page)).toBe(before);
});

test('a record dialog freezes background ambience without abandoning its draft or changing progress', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./#/discoveries');
  await ready(page);
  const scene = page.locator('.wayfinder-scene');
  expect((await motion(scene)).some(animation => animation.state === 'running')).toBe(true);
  const before = await storage(page);
  await page.locator('[data-tour="expedition-record"]').click();
  const dialog = page.getByRole('dialog', { name: 'Record progress' });
  await dialog.getByLabel('Artifact title').fill('Synthetic unsaved draft');
  await dialog.getByLabel('What did you practice?').fill('Fictional draft for motion qualification only.');
  await expect.poll(async () => (await motion(scene)).every(animation => animation.state === 'paused')).toBe(true);
  const frozen = await motion(scene);
  await page.waitForTimeout(160);
  expect(await motion(scene)).toEqual(frozen);
  await expect(dialog.getByLabel('Artifact title')).toHaveValue('Synthetic unsaved draft');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await scene.scrollIntoViewIfNeeded();
  await expect.poll(async () => (await motion(scene)).some(animation => animation.state === 'running')).toBe(true);
  expect(await storage(page)).toBe(before);
});

test('offscreen regions and synthetic hidden-document events suspend motion and route exit cancels it', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./#/discoveries');
  await ready(page);
  const before = await storage(page);
  const scene = page.locator('.wayfinder-scene');
  await page.locator('[data-tour="discovery-activity"]').scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-atlas-visible', 'false');
  await expect.poll(async () => (await motion(scene)).every(animation => animation.state === 'paused')).toBe(true);
  const frozen = await motion(scene);
  await page.waitForTimeout(160);
  expect(await motion(scene)).toEqual(frozen);
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute('data-atlas-visible', 'true');
  await expect.poll(async () => (await motion(scene)).some(animation => animation.state === 'running')).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'hidden');
  expect((await motion(scene)).every(animation => animation.state === 'paused')).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'live');
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.locator('.discovery-page')).toHaveCount(0);
  expect(await page.evaluate(() => document.getAnimations().filter(animation =>
    animation instanceof CSSAnimation && animation.animationName.startsWith('atlas-')).length)).toBe(0);
  expect(await storage(page)).toBe(before);
});

test('an unavailable visibility observer is explicit and keeps a safe static fallback without reset', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.addInitScript(() => Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: undefined }));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./#/discoveries');
  await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'unavailable');
  await expect(page.getByRole('button', { name: 'Motion unavailable', exact: true })).toBeDisabled();
  await expect(page.locator(viewerSelector)).toHaveAttribute('data-viewer-state', 'unavailable');
  await expect(page.locator('.wayfinder-viewer-message')).toContainText('cannot observe the viewer safely');
  await expect(page.locator('canvas')).toHaveCount(0);
  const before = await storage(page);
  expect((await motion(page.locator('.wayfinder-scene'))).every(animation => animation.state === 'paused')).toBe(true);
  await page.getByRole('button', { name: 'All signals', exact: true }).click();
  await expect(page.locator('.discovery-card')).toHaveCount(24);
  expect(await storage(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('all seven chapter climates have distinct active effects while keeping one bounded 3D context', async ({ page }, testInfo) => {
  await seed(page, createCompleteDiscoveryFixture());
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('./#/discoveries');
  const viewer = await ready(page);
  const canvas = await viewer.locator('canvas').elementHandle();
  const before = await storage(page);
  const effects = [
    ['harbor', 'atlas-tide-flow'], ['breeze', 'atlas-wind-travel'], ['archive', 'atlas-page-drift'],
    ['depths', 'atlas-bubble-rise'], ['beacon', 'atlas-beacon-watch'], ['sky', 'atlas-cloud-sail'],
    ['astral', 'atlas-star-wander'],
  ];
  const observed: { level: number; climate: string; names: string[] }[] = [];
  for (const [index, [climate, name]] of effects.entries()) {
    await page.locator(`[data-chapter-level="${index + 1}"]`).click();
    await viewer.scrollIntoViewIfNeeded();
    const scene = page.locator('.wayfinder-scene');
    await expect(scene).toHaveAttribute('data-atlas-visible', 'true');
    await expect(scene.locator('.atlas-atmosphere')).toHaveAttribute('data-atmosphere', climate);
    await expect.poll(async () => (await motion(scene)).some(animation => animation.name === name && animation.state === 'running')).toBe(true);
    const animations = await motion(scene);
    expect(await viewer.locator('canvas').evaluate((node, original) => node === original, canvas)).toBe(true);
    expect(animations.length).toBeLessThanOrEqual(18);
    expect(Number(await viewer.getAttribute('data-triangles'))).toBeLessThan(1600);
    expect(Number(await viewer.getAttribute('data-draw-calls'))).toBeLessThanOrEqual(8);
    observed.push({ level: index + 1, climate, names: [...new Set(animations.map(animation => animation.name))] });
  }
  await testInfo.attach('Native climate and active-effect observations', { body: JSON.stringify(observed), contentType: 'application/json' });
  expect(await storage(page)).toBe(before);
});

for (const [width, theme] of [[1440, 'dark'], [1440, 'light'], [1024, 'dark'], [780, 'light'], [390, 'dark'], [320, 'light']] as const) {
  test(`live constellation and motion controls preserve layout and factual progress at ${width}px in ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const state = createCompleteDiscoveryFixture();
    const snapshot = getDiscoverySnapshot(state);
    await seed(page, state);
    await page.addInitScript(value => localStorage.setItem('careerhq.theme.v1', value), theme);
    await page.goto('./#/discoveries');
    await expect(page.getByRole('button', { name: 'Pause motion', exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const before = await storage(page);
    const bounds = await page.locator('.discovery-masthead-tools').evaluate(root => {
      const box = root.getBoundingClientRect();
      return [...root.children].map(node => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left - box.left, right: rect.right - box.right, height: rect.height };
      });
    });
    expect(bounds.filter(item => item.left < -1 || item.right > 1)).toEqual([]);
    expect(bounds.at(-1)!.height).toBeGreaterThanOrEqual(44);
    const map = page.locator('[data-tour="discovery-map"]');
    await map.scrollIntoViewIfNeeded();
    await expect(map).toHaveAttribute('data-atlas-visible', 'true');
    await expect.poll(async () => (await motion(map)).some(animation => animation.name === 'atlas-starlight' && animation.state === 'running')).toBe(true);
    await expect(page.locator('.map-star.earned')).toHaveCount(snapshot.earned);
    await expect(page.locator('.discovery-collection-count')).toHaveText(`${snapshot.earned} / 24 discovered`);
    const centered = await map.locator('.discovery-map-plot').evaluate(node => {
      const core = node.querySelector<SVGGraphicsElement>('.map-core')!.getBoundingClientRect();
      const label = node.querySelector<HTMLElement>('.discovery-map-center')!.getBoundingClientRect();
      return { x: Math.abs(core.x + core.width / 2 - label.x - label.width / 2), y: Math.abs(core.y + core.height / 2 - label.y - label.height / 2) };
    });
    expect(centered.x).toBeLessThan(1);
    expect(centered.y).toBeLessThan(1);
    await expect(page.getByRole('button', { name: 'Discovered', exact: true })).toHaveAttribute('aria-pressed', 'true');
    const card = page.locator('[data-tour="discovery-first-card"]');
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    await card.press('Enter');
    await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'detail');
    expect((await motion(map)).every(animation => animation.state === 'paused')).toBe(true);
    await page.keyboard.press('Escape');
    await expect(card).toBeFocused();
    await expect(page.locator('.discovery-page')).toHaveAttribute('data-atlas-motion', 'live');
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(await storage(page)).toBe(before);
  });
}

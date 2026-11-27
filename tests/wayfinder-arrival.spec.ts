import { expect, test, type Page } from '@playwright/test';
import { createInitialState, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { getDiscoverySnapshot } from '../src/discovery/model';
import { WAYFINDER_HISTORY_KEY, wayfinderSourceId } from '../src/discovery/useWayfinderHistory';
import { createCompleteDiscoveryFixture } from './discovery-fixture';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';
const viewer = '[data-tour="wayfinder-viewer"]';
const sequence = '[data-tour="wayfinder-sequence"]';

function earned(completions = 1) {
  let state = createInitialState(false);
  for (let count = 0; count < completions; count++) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
      title: 'Synthetic unseen chapter', summary: 'A synthetic code artifact and explicitly confirmed checkpoint criteria.',
      kind: 'code', url: '', advance: true, criteriaConfirmed: true,
    });
  }
  return state;
}

async function seed(page: Page, state: AppState, history: string | null = null) {
  await page.addInitScript(({ state, history, key, historyKey }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (history !== null && localStorage.getItem(historyKey) === null) localStorage.setItem(historyKey, history);
  }, { state, history, key, historyKey: WAYFINDER_HISTORY_KEY });
}

async function ready(page: Page) {
  await page.locator(viewer).evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await expect.poll(async () => {
    await page.clock.runFor(50);
    return page.locator(viewer).getAttribute('data-viewer-state');
  }).toBe('ready');
  await page.clock.runFor(100);
}

async function open(page: Page, state: AppState, history: string | null = null) {
  await seed(page, state, history);
  await page.goto('./#/settings');
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.goto('./#/discoveries');
  await ready(page);
}

const stored = (page: Page) => page.evaluate(key => localStorage.getItem(key), key);
const history = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null') as { xp: number } | null, WAYFINDER_HISTORY_KEY);

test('first arrival automatically celebrates both earned levels in order, then remains quiet on return', async ({ page }) => {
  const state = earned();
  expect(getDiscoverySnapshot(state).journey.xp).toBe(440);
  await open(page, state);
  const before = await stored(page);
  const run = page.locator(sequence);
  await expect(run).toHaveAttribute('data-sequence-kind', 'recorded');
  await expect(run).toHaveAttribute('data-from', '0');
  await expect(run).toHaveAttribute('data-to', '440');
  await expect(run).toHaveAttribute('data-sequence-level', '2');
  await page.clock.runFor(1750);
  await expect(run).toHaveAttribute('data-phase', 'reward');
  await expect(page.locator(viewer)).toHaveAttribute('data-model-level', '2');
  expect((await history(page))?.xp).toBe(100);
  await page.clock.runFor(500);
  await expect(run).toHaveAttribute('data-sequence-level', '3');
  await page.clock.runFor(2600);
  await expect(run).toHaveAttribute('data-phase', 'complete');
  await expect(run.locator('[data-reward-level]')).toHaveCount(2);
  expect((await history(page))?.xp).toBe(440);
  expect(await stored(page)).toBe(before);
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('link', { name: 'Discovery Atlas', exact: true }).click();
  await ready(page);
  await expect(page.locator(sequence)).toHaveCount(0);
  expect(await stored(page)).toBe(before);
});

test('seen automatic rewards remain quiet after a real browser reload', async ({ page }) => {
  const state = earned();
  const snapshot = getDiscoverySnapshot(state);
  const sourceId = wayfinderSourceId(snapshot);
  expect(sourceId).not.toBeNull();
  await open(page, state, JSON.stringify({ version: 1, sourceId, xp: snapshot.journey.xp }));
  const before = await stored(page);
  await expect(page.locator(sequence)).toHaveCount(0);
  expect((await history(page))?.xp).toBe(snapshot.journey.xp);
  await page.clock.resume();
  await page.reload();
  await expect(page.locator(viewer)).toHaveAttribute('data-viewer-state', 'ready');
  await expect(page.locator(sequence)).toHaveCount(0);
  expect((await history(page))?.xp).toBe(snapshot.journey.xp);
  expect(await stored(page)).toBe(before);
});

test('leaving during the first reward retains only the later unseen chapter for the next arrival', async ({ page }) => {
  await open(page, earned());
  const before = await stored(page);
  await page.clock.runFor(1750);
  expect((await history(page))?.xp).toBe(100);
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.getByRole('link', { name: 'Discovery Atlas', exact: true }).click();
  await ready(page);
  await expect(page.locator(sequence)).toHaveAttribute('data-from', '100');
  await expect(page.locator(sequence)).toHaveAttribute('data-sequence-level', '3');
  await page.clock.runFor(2400);
  await expect(page.locator(sequence).locator('[data-reward-level]')).toHaveCount(1);
  expect((await history(page))?.xp).toBe(440);
  expect(await stored(page)).toBe(before);
});

test('a large unseen gain presents all six earned level-ups in order on one arrival', async ({ page }) => {
  await open(page, createCompleteDiscoveryFixture());
  const before = await stored(page);
  const run = page.locator(sequence);
  for (let level = 2; level <= 7; level++) {
    await expect(run).toHaveAttribute('data-sequence-level', String(level));
    await page.clock.runFor(1750);
    await expect(run).toHaveAttribute('data-phase', 'reward');
    await expect(page.locator(viewer)).toHaveAttribute('data-model-level', String(level));
    await page.clock.runFor(450);
  }
  await expect(run).toHaveAttribute('data-phase', 'complete');
  await expect(run.locator('[data-reward-level]')).toHaveCount(6);
  expect(await stored(page)).toBe(before);
});

test('a later arrival plays only a newly crossed level, preserving carryover EXP', async ({ page }) => {
  const state = earned(3);
  const sourceId = wayfinderSourceId(getDiscoverySnapshot(state));
  await open(page, state, JSON.stringify({ version: 1, sourceId, xp: 440 }));
  const before = await stored(page);
  await expect(page.locator(sequence)).toHaveAttribute('data-from', '440');
  await expect(page.locator(sequence)).toHaveAttribute('data-sequence-level', '4');
  await page.clock.runFor(2400);
  await expect(page.locator(sequence).locator('[data-reward-level]')).toHaveCount(1);
  expect((await history(page))?.xp).toBe(getDiscoverySnapshot(state).journey.xp);
  expect(await stored(page)).toBe(before);
});

test('skip acknowledges the catch-up while manual replay remains available without new work', async ({ page }) => {
  await open(page, earned());
  const before = await stored(page);
  await page.locator('[data-tour="wayfinder-skip"]').click();
  await expect(page.locator(sequence)).toHaveAttribute('data-phase', 'complete');
  await expect(page.locator(sequence).locator('[data-reward-level]')).toHaveCount(2);
  expect((await history(page))?.xp).toBe(440);
  const seen = await page.evaluate(key => localStorage.getItem(key), WAYFINDER_HISTORY_KEY);
  await page.locator('[data-tour="wayfinder-replay"]').click();
  await expect(page.locator(sequence)).toHaveAttribute('data-sequence-kind', 'replay');
  await page.clock.runFor(2400);
  expect(await page.evaluate(key => localStorage.getItem(key), WAYFINDER_HISTORY_KEY)).toBe(seen);
  expect(await stored(page)).toBe(before);
});

test('reduced motion presents all missed rewards and a replacement source does not inherit another collection cursor', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, earned(), JSON.stringify({ version: 1, sourceId: 'different-synthetic-source', xp: 2400 }));
  await expect(page.locator(sequence)).toHaveAttribute('data-phase', 'complete');
  await expect(page.locator(sequence).locator('[data-reward-level]')).toHaveCount(2);
  expect((await history(page))?.xp).toBe(440);
  await expect(page.locator(viewer)).toHaveAttribute('data-model-level', '3');
  await expect(page.locator(viewer)).toHaveAttribute('data-motion', 'still');
});

test('hidden time does not consume unseen levels or restart the current chapter', async ({ page }) => {
  await open(page, earned());
  const run = page.locator(sequence);
  const phase = await run.getAttribute('data-phase');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(6000);
  await expect(run).toHaveAttribute('data-phase', phase!);
  expect(await history(page)).toBeNull();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(1750);
  await expect(run).toHaveAttribute('data-sequence-level', '2');
  expect((await history(page))?.xp).toBe(100);
});

test('invalid presentation history is reported and preserved without preventing real progress or rewards', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page, earned(), '{invalid preference');
  const before = await stored(page);
  await expect(page.getByText(/Atlas animation history could not be saved/)).toBeVisible();
  await expect(page.locator(sequence).locator('[data-reward-level]')).toHaveCount(2);
  expect(await page.evaluate(key => localStorage.getItem(key), WAYFINDER_HISTORY_KEY)).toBe('{invalid preference');
  expect(await stored(page)).toBe(before);
});

test('scrolling to chapter controls cannot consume ceremonies while only the bottom of the panel is visible', async ({ page }) => {
  await open(page, earned());
  const run = page.locator(sequence);
  const phase = await run.getAttribute('data-phase');
  await page.locator('[data-tour="wayfinder-chapters"]').evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
  const panel = page.locator('[data-tour="wayfinder-panel"]');
  await expect(panel).toHaveAttribute('data-atlas-visible', 'true');
  await expect(panel).toHaveAttribute('data-presentation-active', 'false');
  await page.clock.runFor(6000);
  await expect(run).toHaveAttribute('data-phase', phase!);
  expect(await history(page)).toBeNull();
  await ready(page);
  await expect(panel).toHaveAttribute('data-presentation-active', 'true');
  await page.clock.runFor(1750);
  await expect(run).toHaveAttribute('data-sequence-level', '2');
  expect((await history(page))?.xp).toBe(100);
});

test('a blocked presentation save reports its limit without changing progress or looping in the current visit', async ({ page }) => {
  await page.addInitScript(historyKey => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === historyKey) throw new DOMException('Synthetic preference quota failure', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, WAYFINDER_HISTORY_KEY);
  await open(page, earned());
  const before = await stored(page);
  await page.clock.runFor(4800);
  await expect(page.getByText(/Atlas animation history could not be saved/)).toBeVisible();
  await expect(page.locator(sequence)).toHaveAttribute('data-phase', 'complete');
  await page.clock.fastForward(5000);
  await expect(page.locator(sequence)).toHaveAttribute('data-phase', 'complete');
  expect(await history(page)).toBeNull();
  expect(await stored(page)).toBe(before);
});

test('automatic catch-up remains usable on a narrow light-theme Atlas', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.addInitScript(() => localStorage.setItem('careerhq.theme.v1', 'light'));
  await open(page, earned());
  const before = await stored(page);
  await expect(page.locator(sequence)).toHaveAttribute('data-sequence-level', '2');
  await page.clock.runFor(2400);
  await expect(page.locator(sequence)).toHaveAttribute('data-sequence-level', '3');
  await page.clock.runFor(2400);
  await expect(page.locator(sequence)).toHaveAttribute('data-phase', 'complete');
  await expect(page.locator(sequence).locator('[data-reward-level]')).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await stored(page)).toBe(before);
});

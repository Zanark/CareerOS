import { expect, test, type Page } from '@playwright/test';
import type { AppState } from '../src/domain/types';
import { focusSessionSummary } from '../src/domain/focusSession';
import { focusedGraphForState } from './mission-ring-policy';
import { PNG } from './png';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });

const key = 'careerhq.workspace.v1';
const roomSelector = 'dialog[data-tour="focus-room"]';
const room = (page: Page) => page.locator(roomSelector);
const reports = (state: AppState) => state.focusSessions?.flatMap(session => session.events).filter(event => event.kind === 'distraction') ?? [];
const current = (state: AppState) => state.focusSessions!.at(-1)!;

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}

async function raw(page: Page) { return page.evaluate(key => localStorage.getItem(key), key); }

async function prepare(page: Page, options: { graphics?: boolean; fullscreen?: boolean; clock?: boolean } = {}) {
  await page.emulateMedia({ reducedMotion: options.graphics ? 'no-preference' : 'reduce' });
  await page.addInitScript(({ key, graphics, fullscreen }) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key && document.documentElement?.dataset.blockFocusWrites === 'true') {
        throw new DOMException('Synthetic storage failure', 'QuotaExceededError');
      }
      return setItem.call(this, name, value);
    };
    if (!fullscreen) Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => false });
    if (!graphics) {
      const getContext = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          return type === 'webgl2' || type === 'webgl' ? null : Reflect.apply(getContext, this, [type, ...args]);
        },
      });
    }
  }, { key, graphics: !!options.graphics, fullscreen: !!options.fullscreen });
  if (options.clock !== false) {
    await page.clock.install({ time: new Date('2026-10-05T08:00:00Z') });
    await page.clock.pauseAt(new Date('2026-10-05T08:01:00Z'));
  }
  await page.goto('./#/plan');
  await expect(page.locator('[data-tour="focus-room-open"]')).toBeVisible();
}

async function openRoom(page: Page) {
  await page.locator('[data-tour="focus-room-open"]').click();
  await expect(room(page)).toHaveAttribute('open', '');
  await expect(room(page).locator('[data-tour="focus-room-time"]')).toBeVisible();
}

async function startRoom(page: Page) {
  await openRoom(page);
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await expect(room(page).locator('[data-tour="focus-room-stage"]')).toHaveAttribute('data-phase', 'running');
}

async function downloadBackup(page: Page) {
  await page.goto('./#/settings');
  const downloading = page.waitForEvent('download');
  await page.locator('[data-tour="backup-export"]').click();
  const download = await downloading;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

test('every distraction press saves immediately, including paused reports, and survives close/reload', async ({ page }) => {
  await prepare(page);
  const initial = await stored(page);
  await openRoom(page);
  expect((await stored(page)).focusSessions).toBeUndefined();
  await expect(room(page).locator('[data-tour="focus-room-distraction"]')).toBeDisabled();
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await page.clock.runFor(1234);
  for (let index = 0; index < 3; index++) await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('3');
  let state = await stored(page);
  expect(reports(state)).toHaveLength(3);
  expect(new Set(reports(state).map(event => event.id)).size).toBe(3);
  expect(reports(state).map(event => event.elapsedMs)).toEqual([1234, 1234, 1234]);
  expect(reports(state).every(event => Date.parse(event.at) >= Date.parse(current(state).startedAt))).toBe(true);
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await page.clock.runFor(60_000);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  state = await stored(page);
  expect(focusSessionSummary(current(state)).distractions.at(-1)).toMatchObject({ elapsedMs: 1234, whilePaused: true });
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await page.clock.runFor(1000);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  const saved = current(await stored(page));
  expect(saved.events.at(-1)?.elapsedMs).toBe(2234);
  await room(page).locator('[data-tour="focus-room-close"]').click();
  await expect(room(page)).not.toHaveAttribute('open', '');
  await expect(page.locator('[data-tour="focus-start"]')).toContainText('Pause session');
  await openRoom(page);
  await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('5');
  expect(current(await stored(page))).toEqual(saved);
  await page.reload();
  await expect(page.getByRole('timer')).toHaveText('25:00');
  expect(current(await stored(page))).toEqual(saved);
  await page.locator('[data-tour="focus-history"] > summary').click();
  await expect(page.locator('[data-tour="focus-history"]')).toContainText('5 reports');
  const after = await stored(page);
  for (const field of ['missions', 'evidence', 'events', 'plans', 'readiness'] as const) expect(after[field]).toEqual(initial[field]);
});

test('heartbeat controls do not reset the timer or add, remove or duplicate focus reports', async ({ page }) => {
  await prepare(page);
  await startRoom(page);
  await page.clock.runFor(1000);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  const before = await raw(page);
  const heartbeat = room(page).getByRole('checkbox', { name: 'Core heartbeat', exact: true });
  await heartbeat.uncheck();
  await heartbeat.check();
  await expect(room(page).locator('[data-tour="focus-room-stage"]')).toHaveAttribute('data-phase', 'running');
  expect(await raw(page)).toBe(before);
  await page.clock.runFor(6000);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  const events = current(await stored(page)).events;
  expect(events.map(event => event.kind)).toEqual(['distraction', 'distraction']);
  expect(events.map(event => event.elapsedMs)).toEqual([1000, 7000]);
  await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('2');
});

test('the full distraction log exports and imports into an independent browser workspace', async ({ page, browser, baseURL }) => {
  await prepare(page);
  await startRoom(page);
  await page.clock.runFor(2000);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await page.clock.runFor(3000);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await room(page).getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(room(page).locator('[data-tour="focus-room-count"]')).toContainText('Last session');
  const data = await stored(page);
  const buffer = await downloadBackup(page);
  expect(JSON.parse(buffer.toString()).focusSessions).toEqual(data.focusSessions);
  const otherContext = await browser.newContext();
  const other = await otherContext.newPage();
  await other.goto(`${baseURL}#/settings`);
  other.once('dialog', dialog => dialog.accept());
  await other.locator('[data-tour="backup-input"]').setInputFiles({ name: 'synthetic-focus-backup.json', mimeType: 'application/json', buffer });
  await expect.poll(async () => (await stored(other)).focusSessions).toEqual(data.focusSessions);
  await other.goto(`${baseURL}#/plan`);
  await expect(other.locator('[data-tour="focus-history"]')).toContainText('1 sessions / 2 reports');
  await other.reload();
  expect((await stored(other)).focusSessions).toEqual(data.focusSessions);
  await otherContext.close();
});

test('natural timer completion and starting again retain prior reports without mastery credit', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Gentle', exact: true }).click();
  const before = await stored(page);
  await startRoom(page);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await page.clock.fastForward(600_000);
  await expect(room(page).locator('[data-tour="focus-room-time"]')).toHaveText('00:00');
  await expect(room(page).locator('[data-tour="focus-room-stage"]')).toHaveAttribute('data-phase', 'finished');
  const finished = current(await stored(page));
  expect(finished.events.at(-1)).toMatchObject({ kind: 'complete', elapsedMs: 600_000 });
  expect(focusSessionSummary(finished).distractions).toHaveLength(1);
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('0');
  const after = await stored(page);
  expect(after.focusSessions).toHaveLength(2);
  expect(after.focusSessions![0]).toEqual(finished);
  expect(after.missions).toEqual(before.missions);
  expect(after.evidence).toEqual(before.evidence);
});

test('a failed distraction write is visible and cannot produce a false saved count', async ({ page }) => {
  await prepare(page);
  await startRoom(page);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  const before = await raw(page);
  await page.evaluate(() => document.documentElement.dataset.blockFocusWrites = 'true');
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await expect(room(page).locator('[data-tour="focus-room-error"]')).toContainText('not saved');
  await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('1');
  expect(await raw(page)).toBe(before);
  await page.evaluate(() => delete document.documentElement.dataset.blockFocusWrites);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('2');
  expect(reports(await stored(page))).toHaveLength(2);
});

test('a failed start does not run an unrecorded timer and a failed ending can be retried', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Gentle', exact: true }).click();
  await openRoom(page);
  await page.evaluate(() => document.documentElement.dataset.blockFocusWrites = 'true');
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await expect(room(page).locator('[data-tour="focus-room-stage"]')).toHaveAttribute('data-phase', 'ready');
  expect((await stored(page)).focusSessions).toBeUndefined();
  await expect(room(page).locator('[data-tour="focus-room-error"]')).toBeVisible();
  await page.evaluate(() => delete document.documentElement.dataset.blockFocusWrites);
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await page.evaluate(() => document.documentElement.dataset.blockFocusWrites = 'true');
  await page.clock.fastForward(600_000);
  await expect(room(page).locator('[data-tour="focus-room-time"]')).toHaveText('00:00');
  await expect(room(page).getByRole('button', { name: 'Retry saving', exact: true })).toBeVisible();
  expect(current(await stored(page)).events.at(-1)?.kind).toBe('distraction');
  await page.evaluate(() => delete document.documentElement.dataset.blockFocusWrites);
  await room(page).getByRole('button', { name: 'Retry saving', exact: true }).click();
  expect(current(await stored(page)).events.at(-1)?.kind).toBe('complete');
  expect(reports(await stored(page))).toHaveLength(1);
});

test('changing capacity while paused changes only the next session length', async ({ page }) => {
  await prepare(page);
  await startRoom(page);
  await page.clock.runFor(2000);
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  await room(page).locator('[data-tour="focus-room-close"]').click();
  await page.getByRole('button', { name: 'Deep focus', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('24:58');
  expect(current(await stored(page)).plannedSeconds).toBe(1500);
  await page.getByRole('button', { name: 'Reset focus timer', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('50:00');
  await page.locator('[data-tour="focus-start"]').click();
  expect(current(await stored(page)).plannedSeconds).toBe(3000);
});

test('practice reports never reach real data and a real timer ending is deferred until tutorial exit', async ({ page }) => {
  await prepare(page);
  await page.getByRole('button', { name: 'Gentle', exact: true }).click();
  await startRoom(page);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await room(page).locator('[data-tour="focus-room-close"]').click();
  const before = await raw(page);
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await page.clock.fastForward(600_000);
  expect(await raw(page)).toBe(before);
  await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('focus-room');
  await openRoom(page);
  await page.clock.runFor(32);
  await expect(room(page).locator('.tutorial-panel')).toBeVisible();
  await room(page).locator('[data-tour="focus-room-toggle"]').click();
  for (let index = 0; index < 3; index++) await room(page).locator('[data-tour="focus-room-distraction"]').click();
  await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('3');
  expect(await raw(page)).toBe(before);
  await room(page).locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  await expect.poll(async () => current(await stored(page)).events.at(-1)?.kind).toBe('complete');
  expect(reports(await stored(page))).toHaveLength(1);
  expect((await stored(page)).focusSessions).toHaveLength(1);
});

test('explicit backup replacement stops the old live timer instead of writing orphaned events', async ({ page }) => {
  await prepare(page);
  await startRoom(page);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  const replacement = await stored(page);
  delete replacement.focusSessions;
  await page.goto('./#/settings');
  const confirmation = page.waitForEvent('dialog');
  const importing = page.locator('[data-tour="backup-input"]').setInputFiles({
    name: 'synthetic-replacement.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(replacement)),
  });
  await (await confirmation).accept();
  await importing;
  await expect.poll(() => stored(page)).toEqual(replacement);
  await page.goto('./#/plan');
  await expect(page.getByRole('timer')).toHaveText('25:00');
  await expect(page.locator('.focus-timer-error')).toContainText('replaced');
  await page.clock.fastForward(60_000);
  expect((await stored(page)).focusSessions).toBeUndefined();
});

test('a newer tab blocks stale distraction writes rather than overwriting its workspace', async ({ page }) => {
  await prepare(page);
  await startRoom(page);
  await room(page).locator('[data-tour="focus-room-distraction"]').click();
  const other = await page.context().newPage();
  await other.goto('./#/settings');
  await other.getByLabel('What are you working toward?').fill('Synthetic newer-tab direction.');
  await other.getByRole('button', { name: 'Save direction', exact: true }).click();
  await expect(room(page).locator('[data-tour="focus-room-error"]')).toContainText('another tab');
  await expect(room(page).locator('[data-tour="focus-room-distraction"]')).toBeDisabled();
  expect(reports(await stored(page))).toHaveLength(1);
  expect((await stored(page)).objective).toBe('Synthetic newer-tab direction.');
  await other.close();
});

test('the dark focus room retains readable text when the main app uses daylight', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('careerhq.theme.v1', 'light'));
  await prepare(page);
  await startRoom(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(room(page).getByRole('heading', { name: 'Focus room', exact: true })).toHaveCSS('color', 'rgb(180, 197, 201)');
  await expect(room(page).locator('[data-tour="focus-room-time"]')).toHaveCSS('color', 'rgb(238, 232, 213)');
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`the timer and report button stay readable and reachable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await prepare(page);
    await startRoom(page);
    await expect(room(page).locator('[data-tour="focus-room-time"]')).toBeInViewport({ ratio: 1 });
    await expect(room(page).locator('[data-tour="focus-room-distraction"]')).toBeInViewport({ ratio: 1 });
    expect(await room(page).locator('[data-tour="focus-room-time"]').evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(56);
    expect(await room(page).evaluate(element => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    await room(page).locator('[data-tour="focus-room-distraction"]').click();
    await expect(room(page).locator('[data-tour="focus-room-count"] strong')).toHaveText('1');
  });
}

test.describe('genuine calm 3D focus room', () => {
  test('mission-only motion remains visible through the frost with fallback fonts in short fixed intervals', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await prepare(page, { graphics: true, fullscreen: false });
    await page.addStyleTag({ content: 'body { font-family: Arial, sans-serif; }' });
    await openRoom(page);
    const scene = room(page).locator('.career-graph-scene');
    await expect.poll(async () => {
      await page.clock.runFor(100);
      return page.evaluate(() => document.querySelector('.focus-room .career-graph-scene')?.getAttribute('data-scene-state') ?? 'loading');
    }, { timeout: 20_000 }).toBe('ready');
    await expect(scene).toHaveAttribute('data-orbit-count', '3');
    const before = await raw(page);
    const ambient = room(page).locator('[data-tour="focus-room-ambient"]');
    const captureSession = await page.context().newCDPSession(page);
    const capture = async () => {
      const { data } = await captureSession.send('Page.captureScreenshot', {
        format: 'png', optimizeForSpeed: true, captureBeyondViewport: false,
      });
      return Buffer.from(data, 'base64');
    };
    try {
      for (let interval = 0; interval < 2; interval++) {
        await ambient.uncheck();
        await page.clock.runFor(50);
        const first = await capture();
        await ambient.check();
        await page.clock.runFor(1100);
        await ambient.uncheck();
        await page.clock.runFor(50);
        const second = await capture();
        const a = PNG.sync.read(first), b = PNG.sync.read(second);
        let visibleChanges = 0;
        for (let index = 0; index < a.data.length; index += 4) {
          if (Math.abs(a.data[index] - b.data[index]) + Math.abs(a.data[index + 1] - b.data[index + 1])
            + Math.abs(a.data[index + 2] - b.data[index + 2]) > 12) visibleChanges++;
        }
        await testInfo.attach(`mission-only-frost-${interval}`, { body: second, contentType: 'image/png' });
        expect(visibleChanges, 'Nine mission rings must retain visible short-interval motion behind real frost').toBeGreaterThan(100);
      }
    } finally {
      await captureSession.detach();
    }
    expect(await raw(page)).toBe(before);
  });

  test('the current full-shell graph visibly moves before starting without recording a session', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await prepare(page, { graphics: true, fullscreen: false, clock: false });
    const initial = await stored(page);
    const expected = focusedGraphForState(initial);
    const before = await raw(page);
    await openRoom(page);
    const scene = room(page).locator('.career-graph-scene');
    await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
    await expect(scene).toHaveAttribute('data-decoration-mode', 'full-shell');
    await expect(scene).toHaveAttribute('data-camera-rotation-speed', '0.24');
    await expect(scene).toHaveAttribute('data-edge-style', 'orange-screen-space-ribbons');
    await expect(scene).toHaveAttribute('data-node-count', String(expected.nodes.length));
    await expect(scene).toHaveAttribute('data-edge-count', String(expected.edges.length));
    await expect(scene).toHaveAttribute('data-animation-state', 'running');
    const ambient = room(page).locator('[data-tour="focus-room-ambient"]');
    // Capture two stationary compositions around a real interval of motion,
    // rather than competing with continuous WebGL while encoding/decoding PNGs.
    await ambient.uncheck();
    await expect(scene).toHaveAttribute('data-animation-state', 'paused');
    const captureSession = await page.context().newCDPSession(page);
    const capture = async () => {
      // Retain the full visible composition but avoid expensive PNG compression
      // on the shared software-GPU runner. Pixel comparison happens in Node.
      const { data } = await captureSession.send('Page.captureScreenshot', {
        format: 'png', optimizeForSpeed: true, captureBeyondViewport: false,
      });
      return Buffer.from(data, 'base64');
    };
    const first = await capture();
    const firstTime = Number(await scene.getAttribute('data-animation-time'));
    await ambient.check();
    await expect(scene).toHaveAttribute('data-animation-state', 'running');
    await expect.poll(async () => Number(await scene.getAttribute('data-animation-time'))).toBeGreaterThan(firstTime + 1);
    await ambient.uncheck();
    await expect(scene).toHaveAttribute('data-animation-state', 'paused');
    const second = await capture();
    await captureSession.detach();
    const a = PNG.sync.read(first), b = PNG.sync.read(second);
    expect([b.width, b.height]).toEqual([a.width, a.height]);
    let visibleChanges = 0;
    for (let index = 0; index < a.data.length; index += 4) {
      if (Math.abs(a.data[index] - b.data[index]) + Math.abs(a.data[index + 1] - b.data[index + 1]) + Math.abs(a.data[index + 2] - b.data[index + 2]) > 12) visibleChanges++;
    }
    expect(visibleChanges, 'Motion must be visible through the real frosted-glass composition, not only in a counter').toBeGreaterThan(100);
    await testInfo.attach('focus-full-shell-moving', { body: second, contentType: 'image/png' });
    expect(await raw(page)).toBe(before);
  });

  test('ambient motion stays independent of timer pause and distraction recording', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await prepare(page, { graphics: true, fullscreen: false, clock: false });
    await openRoom(page);
    const scene = room(page).locator('.career-graph-scene');
    await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
    const canvas = scene.locator('canvas');
    await canvas.evaluate(element => element.setAttribute('data-original-focus-canvas', 'true'));
    const edges = await scene.getAttribute('data-edge-count');
    await room(page).locator('[data-tour="focus-room-toggle"]').click();
    await room(page).locator('[data-tour="focus-room-toggle"]').click();
    await expect(room(page).locator('[data-focus-room-stage]')).toHaveAttribute('data-phase', 'paused');
    await expect(scene).toHaveAttribute('data-animation-state', 'running');
    const pausedTime = Number(await scene.getAttribute('data-animation-time'));
    await expect.poll(async () => Number(await scene.getAttribute('data-animation-time'))).toBeGreaterThan(pausedTime);
    await room(page).locator('[data-tour="focus-room-distraction"]').click();
    await expect(canvas).toHaveAttribute('data-original-focus-canvas', 'true');
    await expect(scene).toHaveAttribute('data-edge-count', edges!);
    expect(reports(await stored(page))).toHaveLength(1);
    await room(page).locator('[data-tour="focus-room-ambient"]').uncheck();
    await expect(scene).toHaveAttribute('data-animation-state', 'paused');
    const stopped = await scene.getAttribute('data-animation-time');
    await page.waitForTimeout(200);
    await expect(scene).toHaveAttribute('data-animation-time', stopped!);
  });

  for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
    test(`the moving full-shell backdrop preserves focus controls at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await prepare(page, { graphics: true, fullscreen: false, clock: false });
      await startRoom(page);
      const scene = room(page).locator('.career-graph-scene');
      await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
      await expect(scene).toHaveAttribute('data-animation-state', 'running');
      await expect(scene).toHaveAttribute('data-decoration-mode', 'full-shell');
      await expect(room(page).locator('[data-tour="focus-room-time"]')).toBeInViewport({ ratio: 1 });
      await expect(room(page).locator('[data-tour="focus-room-distraction"]')).toBeInViewport({ ratio: 1 });
      await room(page).locator('[data-tour="focus-room-distraction"]').click();
      expect(reports(await stored(page))).toHaveLength(1);
      await room(page).locator('[data-tour="focus-room-ambient"]').uncheck();
      await expect(scene).toHaveAttribute('data-animation-state', 'paused');
      await testInfo.attach('current-compact-focus-room', { body: await room(page).screenshot(), contentType: 'image/png' });
    });
  }

  test('native fullscreen keeps the graph quiet, the snapshot stable and the timer alive after closing', async ({ page }) => {
    await prepare(page, { graphics: true, fullscreen: true, clock: false });
    await startRoom(page);
    const scene = room(page).locator('.career-graph-scene');
    await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
    await expect.poll(() => page.evaluate(() => !!document.fullscreenElement?.matches('[data-focus-room-stage]'))).toBe(true);
    const revision = await scene.getAttribute('data-view-revision');
    await expect.poll(() => scene.getAttribute('data-view-revision')).not.toBe(revision);
    await room(page).locator('[data-tour="focus-room-ambient"]').uncheck();
    await page.waitForTimeout(300);
    const still = await scene.getAttribute('data-view-revision');
    const count = await scene.getAttribute('data-node-count');
    await room(page).locator('[data-tour="focus-room-distraction"]').click();
    await page.waitForTimeout(300);
    await expect(scene).toHaveAttribute('data-view-revision', still!);
    await expect(scene).toHaveAttribute('data-node-count', count!);
    const canvas = await scene.locator('canvas').elementHandle();
    await room(page).locator('[data-tour="focus-room-close"]').click();
    await expect.poll(() => page.evaluate(() => document.fullscreenElement === null)).toBe(true);
    await expect(page.locator('[data-tour="focus-start"]')).toContainText('Pause session');
    expect(await canvas!.evaluate(element => element instanceof HTMLCanvasElement && element.getContext('webgl2')?.isContextLost())).toBe(true);
    expect(reports(await stored(page))).toHaveLength(1);
  });

  test('reduced motion stops the background while recording remains available', async ({ page }) => {
    await prepare(page, { graphics: true, fullscreen: false, clock: false });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await startRoom(page);
    const scene = room(page).locator('.career-graph-scene');
    await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
    await page.waitForTimeout(300);
    const revision = await scene.getAttribute('data-view-revision');
    await page.waitForTimeout(400);
    await expect(scene).toHaveAttribute('data-view-revision', revision!);
    await room(page).locator('[data-tour="focus-room-distraction"]').click();
    expect(reports(await stored(page))).toHaveLength(1);
    const ambient = room(page).locator('[data-tour="focus-room-ambient"]');
    await expect(ambient).not.toBeChecked();
    await ambient.check();
    await expect(scene).toHaveAttribute('data-animation-state', 'running');
    const time = Number(await scene.getAttribute('data-animation-time'));
    await expect.poll(async () => Number(await scene.getAttribute('data-animation-time'))).toBeGreaterThan(time);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(ambient).not.toBeChecked();
    await expect(scene).toHaveAttribute('data-animation-state', 'paused');
    expect(reports(await stored(page))).toHaveLength(1);
  });
});

import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, parseState } from '../src/domain/engine';
import type { AppState, Evidence } from '../src/domain/types';

const key = 'careerhq.workspace.v1';
const now = new Date('2026-11-27T06:30:00Z');
test.use({ timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce', launchOptions: { args: ['--disable-webgl'] } });

function fixture(positive = true): AppState {
  const state = createInitialState(false);
  state.updatedAt = now.toISOString();
  if (positive) {
    const entries: [string, Evidence['missionId']][] = [
      ['20', 'pattern'], ['21', 'pattern'], ['25', 'pattern'], ['26', 'pattern'],
      ['24', 'system'], ['25', 'system'], ['27', 'system'],
    ];
    state.evidence = entries.map(([day, missionId], index) => ({
      id: `synthetic-streak-${index}`, missionId, checkpointId: state.missions[missionId].checkpointId,
      roadmapVersion: state.missions[missionId].roadmapVersion, title: `Synthetic ${missionId} work ${day}`,
      summary: 'A fictional saved practice record, without claimed checkpoint completion.',
      kind: 'exercise', url: '', visibility: 'local', completedCheckpoint: false,
      createdAt: `2026-11-${day}T06:00:00.000Z`,
    }));
    state.missions.pattern.status = state.missions.system.status = 'in-progress';
    state.missions.system.mode = 'background';
    state.evidence.push({ ...state.evidence.at(-1)!, id: 'synthetic-prior-year', title: 'Synthetic previous-year work', createdAt: '2025-12-31T06:00:00.000Z' });
    state.recalls = [{
      id: 'synthetic-streak-recall', missionId: 'system', checkpointId: state.missions.system.checkpointId,
      roadmapVersion: state.missions.system.roadmapVersion, createdAt: '2026-11-24T08:00:00.000Z',
      outcome: 'needs-review', checks: { explanation: false, diagram: false, exercise: false },
      notes: 'A fictional honest recall, not completion.',
    }];
  }
  state.plans['2026-11-27'] = generatePlan(state, '2026-11-27');
  return parseState(state);
}

async function prepare(page: Page, options: { state?: AppState; theme?: 'dark' | 'light'; route?: string; motion?: boolean; clock?: boolean } = {}) {
  if (options.clock) {
    await page.clock.install({ time: new Date('2026-11-27T18:28:00Z') });
    await page.clock.pauseAt(new Date('2026-11-27T18:29:50Z'));
  } else await page.clock.setFixedTime(now);
  await page.emulateMedia({ reducedMotion: options.motion ? 'no-preference' : 'reduce' });
  await page.addInitScript(({ state, theme, key }) => {
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('careerhq.theme.v1', theme);
  }, { state: options.state ?? fixture(), theme: options.theme ?? 'dark', key });
  await page.goto(`./#/${options.route ?? 'streaks'}`);
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  await expect(page.locator('.streak-fire').first()).toHaveAttribute('data-fire-ready', 'true');
}

const storage = (page: Page) => page.evaluate(key => localStorage.getItem(key), key);
async function pixels(page: Page, selector: string) {
  return page.locator(selector).evaluate(node => {
    if (!(node instanceof HTMLCanvasElement)) throw new Error('Expected the actual fire canvas.');
    const context = node.getContext('2d')!;
    context.getImageData(0, 0, node.width, node.height);
    const data = context.getImageData(0, 0, node.width, node.height).data;
    let hash = 2166136261, opaque = 0, hot = 0;
    for (let index = 0; index < data.length; index += 4) {
      hash = Math.imul(hash ^ data[index] ^ data[index + 1] ^ data[index + 3], 16777619) >>> 0;
      if (data[index + 3] > 30) opaque++;
      if (data[index] > 180 && data[index + 1] > 70 && data[index + 3] > 80) hot++;
    }
    return { hash, opaque, hot, width: node.width, height: node.height, frames: Number(node.dataset.fireFrame) };
  });
}

for (const theme of ['dark', 'light'] as const) {
  test(`ember history and compact calendar stay readable without changing records in ${theme}`, async ({ page }) => {
    await prepare(page, { theme });
    const before = await storage(page);
    for (const viewport of [{ width: 1440, height: 1000 }, { width: 768, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 568 }]) {
      await page.setViewportSize(viewport);
      await expect(page.getByRole('heading', { name: 'Streaks', exact: true, level: 1 })).toBeVisible();
      await expect(page.locator('.header-calendar')).toHaveAttribute('data-burning', 'true');
      await expect(page.locator('.streak-running-card')).toHaveCount(2);
      await expect(page.locator('.streak-running-card[data-mission-id="pattern"]')).toHaveAttribute('data-work-streak', '2');
      await expect(page.locator('.streak-running-card[data-mission-id="system"]')).toHaveAttribute('data-work-streak', '1');
      await expect(page.locator('.streak-month')).toHaveCount(12);
      await expect(page.locator('.streak-day[data-date="2026-11-24"]')).toHaveAttribute('data-intensity', '2');
      const geometry = await page.evaluate(() => ({
        header: document.querySelector('.topbar')!.getBoundingClientRect().height,
        core: document.querySelector('.calendar-core')!.getBoundingClientRect().height,
        overflow: document.documentElement.scrollWidth - innerWidth,
        minimumDay: Math.min(...[...document.querySelectorAll('.streak-day')].map(element => element.getBoundingClientRect().width)),
        bodyFont: getComputedStyle(document.documentElement).fontSize,
      }));
      expect(geometry.header).toBe(viewport.width <= 760 ? 60 : 69);
      expect(geometry.core).toBe(50);
      expect(geometry.overflow).toBe(0);
      expect(geometry.minimumDay).toBeGreaterThanOrEqual(24);
      expect(geometry.bodyFont).toBe('24px');
      const materials = await page.locator('.streak-overview-feature, .streak-stat, .streak-running-card, .streak-ledger').evaluateAll(elements => elements.map(element => {
        const style = getComputedStyle(element);
        return { radius: style.borderRadius, blur: style.backdropFilter };
      }));
      expect(materials.every(material => material.radius === '0px' && material.blur.includes('blur('))).toBe(true);
      expect(await storage(page)).toBe(before);
    }
    await page.clock.setFixedTime(new Date('2026-11-28T06:30:00Z'));
    await page.reload();
    const calendar = page.locator('.header-calendar');
    await expect(calendar).toHaveAttribute('data-burning', 'true');
    await expect(calendar).toHaveAttribute('data-weekend', 'true');
    const strip = await calendar.locator('.calendar-page').evaluate(element => ({
      color: getComputedStyle(element, '::before').backgroundColor,
      layer: getComputedStyle(element, '::before').zIndex,
    }));
    expect(strip).toEqual({ color: theme === 'dark' ? 'rgb(232, 74, 95)' : 'rgb(173, 62, 85)', layer: '4' });
    const after = JSON.parse((await storage(page))!) as AppState, original = JSON.parse(before!) as AppState;
    expect(after.evidence).toEqual(original.evidence);
    expect(after.recalls).toEqual(original.recalls);
    expect(after.missions).toEqual(original.missions);
  });
}

test('calendar selection, keyboard navigation, mission filtering and run ranges are actual read-only history', async ({ page }) => {
  await prepare(page);
  const before = await storage(page);
  const day = page.locator('.streak-day[data-date="2026-11-24"]');
  await day.click();
  await expect(page.locator('.streak-day-detail')).toContainText('Synthetic system work 24');
  await expect(page.locator('.streak-day-detail')).toContainText('Recall practice');
  await day.focus();
  await day.press('ArrowRight');
  await expect(page.locator('.streak-day[data-date="2026-11-25"]')).toBeFocused();
  await page.getByRole('combobox', { name: 'Mission', exact: true }).selectOption('pattern');
  await expect(page.locator('.header-calendar')).toHaveAttribute('data-burning', 'true');
  await page.getByRole('button', { name: 'Run history', exact: true }).click();
  const runs = page.locator('.streak-run-history li');
  await expect(runs).toHaveCount(2);
  await expect(runs.first()).toHaveAttribute('data-running', 'true');
  expect(await runs.first().locator('time').evaluateAll(elements => elements.map(element => element.getAttribute('datetime')))).toEqual(['2026-11-25', '2026-11-26']);
  expect(await runs.last().locator('time').evaluateAll(elements => elements.map(element => element.getAttribute('datetime')))).toEqual(['2026-11-20', '2026-11-21']);
  await page.getByRole('combobox', { name: 'Mission', exact: true }).selectOption('all');
  expect(await page.locator('.streak-run-history li').first().locator('time').evaluateAll(elements => elements.map(element => element.getAttribute('datetime')))).toEqual(['2026-11-24', '2026-11-27']);
  await page.getByRole('button', { name: 'Activity calendar', exact: true }).click();
  await page.getByRole('combobox', { name: 'Activity year', exact: true }).selectOption('2025');
  await page.locator('.streak-day[data-date="2025-12-31"]').click();
  await expect(page.locator('.streak-day-detail')).toContainText('Synthetic previous-year work');
  expect(await storage(page)).toBe(before);
});

test('zero is a cold campfire, while any background-mission streak lights the real navbar date', async ({ page }) => {
  await prepare(page, { state: fixture(false), route: 'mission/pattern' });
  const before = await storage(page);
  await expect(page.locator('.mission-work-streak')).toHaveAttribute('data-streak-state', 'out');
  await expect(page.locator('.header-calendar')).toHaveAttribute('data-burning', 'false');
  const cold = await pixels(page, '.mission-work-streak canvas');
  expect(cold.opaque).toBeGreaterThan(0);
  expect(cold.hot).toBe(0);
  await expect(page.locator('.mission-work-streak canvas')).toHaveAttribute('data-fire-motion', 'out');
  expect(await storage(page)).toBe(before);
  await page.locator('.header-calendar').click();
  await expect(page.getByRole('heading', { name: 'Streaks', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('.streak-running-card')).toHaveCount(0);
  await expect(page.locator('.streak-empty-day')).toContainText('No work recorded');
});

test('real flame pixels move, global pause freezes them, and hidden/offscreen/dialog states suspend the renderer', async ({ page }) => {
  await prepare(page, { route: 'mission/pattern', motion: true });
  const card = page.locator('.mission-work-streak'), fire = card.locator('canvas');
  await card.scrollIntoViewIfNeeded();
  await expect(fire).toHaveAttribute('data-fire-motion', 'live');
  const before = await storage(page);
  const first = await pixels(page, '.mission-work-streak canvas');
  expect(first.hot).toBeGreaterThan(50);
  expect(first.width * first.height).toBeLessThanOrEqual(320 * 152);
  await expect.poll(async () => (await pixels(page, '.mission-work-streak canvas')).hash).not.toBe(first.hash);
  await card.getByRole('button', { name: 'Pause streak fire', exact: true }).click();
  await expect(fire).toHaveAttribute('data-fire-motion', 'paused');
  const paused = await pixels(page, '.mission-work-streak canvas');
  await page.waitForTimeout(160);
  expect(await pixels(page, '.mission-work-streak canvas')).toEqual(paused);
  await card.getByRole('button', { name: 'Resume streak fire', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(fire).toHaveAttribute('data-fire-motion', 'hidden');
  const hidden = await pixels(page, '.mission-work-streak canvas');
  await page.waitForTimeout(160);
  expect(await pixels(page, '.mission-work-streak canvas')).toEqual(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.locator('.page-footer').scrollIntoViewIfNeeded();
  await expect(page.locator('.header-calendar canvas')).toHaveAttribute('data-fire-motion', 'offscreen');
  await page.locator('[data-tour="record-evidence"]').click();
  const dialog = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await dialog.getByLabel('Artifact title').fill('Synthetic fire-motion draft');
  await expect(fire).toHaveAttribute('data-fire-motion', 'dialog');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog.getByLabel('Artifact title')).toHaveValue('Synthetic fire-motion draft');
  await page.keyboard.press('Escape');
  expect(await storage(page)).toBe(before);
});

test('reduced motion keeps positive fire still and preserves readable counts', async ({ page }) => {
  await prepare(page, { route: 'mission/pattern' });
  const fire = page.locator('.mission-work-streak canvas');
  await expect(fire).toHaveAttribute('data-fire-motion', 'reduced');
  const before = await pixels(page, '.mission-work-streak canvas');
  expect(before.hot).toBeGreaterThan(50);
  await page.waitForTimeout(160);
  expect(await pixels(page, '.mission-work-streak canvas')).toEqual(before);
  await expect(page.locator('.mission-work-streak')).toContainText('2 days');
  await expect(page.locator('.mission-work-streak').getByRole('button', { name: 'Pause streak fire', exact: true })).toBeDisabled();
});

test('a missed local day extinguishes both the mission and navbar without deleting any history', async ({ page }) => {
  const state = fixture();
  state.evidence = state.evidence.filter(record => record.missionId === 'pattern');
  state.recalls = [];
  await prepare(page, { state, route: 'mission/pattern', clock: true });
  const before = JSON.parse((await storage(page))!) as AppState;
  await expect(page.locator('.header-calendar')).toHaveAttribute('data-burning', 'true');
  await page.clock.fastForward(30_000);
  await expect(page.locator('.topbar-date')).toHaveAttribute('datetime', '2026-11-28');
  await expect(page.locator('.header-calendar')).toHaveAttribute('data-burning', 'false');
  await expect(page.locator('.mission-work-streak')).toHaveAttribute('data-work-streak', '0');
  await expect(page.locator('.mission-work-streak')).toHaveAttribute('data-streak-state', 'out');
  const after = JSON.parse((await storage(page))!) as AppState;
  expect(after.evidence).toEqual(before.evidence);
  expect(after.recalls).toEqual(before.recalls);
  expect(after.missions).toEqual(before.missions);
  expect(after.events).toEqual(before.events);
});

test('unavailable canvas reports a visible fallback without replacing recorded data', async ({ page }) => {
  await page.addInitScript(`const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(kind, ...args) {
      return kind === '2d' ? null : Reflect.apply(getContext, this, [kind, ...args]);
    };`);
  const state = fixture();
  await page.clock.setFixedTime(now);
  await page.addInitScript(({ state, key }) => localStorage.setItem(key, JSON.stringify(state)), { state, key });
  await page.goto('./#/mission/pattern');
  await expect(page.getByRole('status')).toContainText('Fire animation is unavailable');
  await expect(page.locator('.mission-work-streak')).toContainText('2 days');
  const stored = JSON.parse((await storage(page))!) as AppState;
  expect(stored.evidence).toEqual(state.evidence);
  expect(stored.recalls).toEqual(state.recalls);
});

import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';

const key = 'careerhq.workspace.v1';
const now = new Date('2026-11-27T06:30:00Z');
const today = '2026-11-27';
const walkthrough = (page: Page) => page.getByRole('dialog', { name: 'How missions work', exact: true });
const opener = (page: Page) => page.getByRole('button', { name: 'How missions work', exact: true });

test.use({ timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce', launchOptions: { args: ['--disable-webgl'] } });

async function prepare(page: Page, options: {
  state?: AppState; theme?: 'dark' | 'light'; clock?: boolean; motion?: 'reduce' | 'no-preference'; route?: string;
} = {}) {
  const state = options.state ?? { ...createInitialState(false), updatedAt: now.toISOString() };
  state.plans[today] = generatePlan(state, today);
  await page.emulateMedia({ reducedMotion: options.motion ?? 'reduce' });
  if (options.clock) {
    await page.clock.install({ time: now });
    await page.clock.pauseAt(new Date('2026-11-27T06:31:00Z'));
  } else await page.clock.setFixedTime(now);
  await page.addInitScript(({ key, raw, theme }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    localStorage.setItem('careerhq.theme.v1', theme);
  }, { key, raw: JSON.stringify(state), theme: options.theme ?? 'dark' });
  await page.goto(`./#/${options.route ?? 'mission/pattern'}`);
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  await expect(page.locator('h1')).toBeVisible();
}

async function raw(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), key);
}

async function saved(page: Page): Promise<AppState> {
  return JSON.parse((await raw(page))!);
}

for (const theme of ['dark', 'light'] as const) {
  test(`mission layout and hierarchy remain readable and reachable in ${theme} at four viewport sizes`, async ({ page, context, baseURL }) => {
    const external: string[] = [], origin = new URL(baseURL!).origin;
    context.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) external.push(request.url());
    });
    await prepare(page, { theme });
    const before = await raw(page);
    for (const viewport of [
      { width: 1440, height: 1000 }, { width: 390, height: 844 },
      { width: 320, height: 568 }, { width: 568, height: 320 },
    ]) {
      await page.setViewportSize(viewport);
      const hero = page.locator('[data-tour="save-state"]');
      await expect(hero.locator('h2')).toHaveText('HashMap Fundamentals');
      await expect(hero.getByText('HashMap Fundamentals', { exact: true })).toHaveCount(1);
      await expect(hero).toContainText('Checkpoint 1 of 48');
      await expect(hero).toContainText('Stage 1');
      await expect(hero).toContainText('0 / 48 complete');
      const streak = page.locator('.right-rail .mission-work-streak');
      await expect(hero).toHaveCSS('border-radius', '0px');
      await expect(hero.locator('.checkpoint-emblem')).toHaveCSS('border-radius', '0px');
      await expect(streak).toHaveCount(1);
      await expect(streak).toHaveCSS('border-radius', '0px');
      await expect(streak).toContainText('No work recorded today');
      await expect(streak.locator('details')).toHaveCount(0);
      const layout = await page.locator('.mission-detail').evaluate(element => {
        const source = document.querySelector('[data-tour="operation-source"]')!;
        return { documentsFollow: !!(element.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING),
          overflow: document.documentElement.scrollWidth - innerWidth };
      });
      expect(layout.documentsFollow).toBe(true);
      expect(layout.overflow).toBeLessThanOrEqual(0);
      if (viewport.width === 1440) {
        const size = await streak.boundingBox();
        expect(size!.width).toBeLessThan(400);
        expect(size!.height).toBeLessThan(150);
      }
      await page.locator('.back-link').click();
      await opener(page).click();
      const dialog = walkthrough(page);
      await expect(dialog).toHaveCSS('border-radius', '0px');
      await expect(dialog.locator('.hierarchy-scene')).toHaveCSS('border-radius', '0px');
      await expect(dialog.getByRole('button', { name: 'Close dialog', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(dialog.getByRole('button', { name: 'Play animation', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(dialog.getByRole('button', { name: 'Step 6: Complete the mission', exact: true })).toBeInViewport({ ratio: 1 });
      const bounds = await dialog.evaluate(element => {
        const r = element.getBoundingClientRect(), body = element.querySelector('.hierarchy-body')!;
        return { left: r.left, right: r.right, width: innerWidth, height: r.height, viewportHeight: innerHeight,
          bodyOverflow: body.scrollWidth - body.clientWidth };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(0);
      expect(bounds.right).toBeLessThanOrEqual(bounds.width);
      expect(bounds.height).toBeLessThanOrEqual(bounds.viewportHeight);
      expect(bounds.bodyOverflow).toBeLessThanOrEqual(0);
      for (const title of ['Build a tiny API', 'Make a useful CLI']) {
        const card = dialog.getByRole('article', { name: `${title} example`, exact: true });
        await card.scrollIntoViewIfNeeded();
        await expect(card).toBeVisible();
        await expect(card).toHaveCSS('border-radius', '0px');
        await expect(card.locator('.hierarchy-stage').first()).toHaveCSS('border-radius', '0px');
        await expect(card.locator('.hierarchy-orb').first()).toHaveCSS('border-radius', '50%');
        expect(await card.locator('.hierarchy-waypoints li').count()).toBe(4);
        await expect(card.locator('h3')).toHaveCSS('color', 'rgb(238, 232, 213)');
      }
      expect(await dialog.locator('.hierarchy-waypoints strong').first().evaluate(element =>
        Number.parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(15);
      await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
      await expect(opener(page)).toBeFocused();
      expect(await raw(page)).toBe(before);
      await page.evaluate(() => { location.hash = '/mission/pattern'; });
      await expect(page.locator('.save-state-main h2')).toHaveText('HashMap Fundamentals');
    }
    expect(external).toEqual([]);
  });
}

test('compact recorded-work and planning help support mouse, keyboard and touch without changing records', async ({ page, browser, baseURL }) => {
  await prepare(page);
  const before = await raw(page);
  const help = page.getByRole('button', { name: 'About Recorded-work streak', exact: true });
  await help.hover();
  await expect(page.getByRole('dialog', { name: 'Recorded-work streak', exact: true })).toContainText('Multiple records');
  await page.mouse.move(0, 0);
  await help.focus();
  await expect(help).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(help).toHaveAttribute('aria-expanded', 'false');
  await help.click();
  const panel = page.getByRole('dialog', { name: 'Recorded-work streak', exact: true });
  await expect(panel).toBeVisible();
  await panel.getByRole('button', { name: 'Close Recorded-work streak help', exact: true }).click();
  await expect(help).toBeFocused();
  const roles = page.getByRole('button', { name: 'About Primary and in-focus missions', exact: true });
  await roles.click();
  const explanation = page.getByRole('dialog', { name: 'Primary and in-focus missions', exact: true });
  await expect(explanation).toContainText('does not activate a background mission');
  await expect(explanation).toContainText('rewrite an existing daily plan');
  expect(await raw(page)).toBe(before);
  const touch = await browser.newContext({ baseURL, hasTouch: true, viewport: { width: 390, height: 844 } });
  try {
    const mobile = await touch.newPage();
    await prepare(mobile);
    const initial = await raw(mobile);
    await mobile.getByRole('button', { name: 'About Recorded-work streak', exact: true }).tap();
    const counting = mobile.getByRole('dialog', { name: 'Recorded-work streak', exact: true });
    await expect(counting).toContainText('Multiple records');
    await counting.getByRole('button', { name: 'Close Recorded-work streak help', exact: true }).tap();
    expect(await raw(mobile)).toBe(initial);
  } finally { await touch.close(); }
});

test('the redesigned checkpoint still separates saved evidence from confirmed advancement', async ({ page }) => {
  await prepare(page);
  const first = (await saved(page)).missions.pattern.checkpointId;
  for (const complete of [false, true]) {
    await page.locator('[data-tour="record-evidence"]').click();
    const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
    await form.getByLabel('Artifact title').fill('Synthetic checkpoint explanation');
    await form.getByLabel('What did you practice?').fill('A fictional worked example recorded only in this disposable browser.');
    if (complete) {
      await form.locator('[data-tour="checkpoint-complete"]').check();
      await expect(form.locator('[data-tour="evidence-submit"]')).toBeDisabled();
      for (const criterion of await form.locator('[data-tour="evidence-criteria"] input').all()) await criterion.check();
    }
    await form.locator('[data-tour="evidence-submit"]').click();
    await expect(form).toHaveCount(0);
    const state = await saved(page);
    expect(state.missions.pattern.completedCheckpointIds).toEqual(complete ? [first] : []);
    await expect(page.locator('.save-count')).toHaveText(complete ? '1 / 48 complete' : '0 / 48 complete');
    await expect(page.locator('.save-state-main h2')).toHaveText(complete ? 'Seen Before' : 'HashMap Fundamentals');
  }
  await expect(page.locator('.checkpoint-location')).toContainText('Checkpoint 2 of 48');
  await expect(page.locator('.checkpoint-location')).toContainText('Stage 2: HashMap Pattern Mastery');
  await expect(page.locator('.mission-work-streak')).toHaveAttribute('data-work-streak', '1');
});

test('primary priority does not activate a background mission or replace an existing plan', async ({ page }) => {
  await prepare(page, { route: 'mission/fabric' });
  const before = await saved(page);
  expect(before.missions.fabric.mode).toBe('background');
  await page.locator('[data-tour="mission-primary"]').click();
  const primary = await saved(page);
  expect(primary.focusMissionId).toBe('fabric');
  expect(primary.missions).toEqual(before.missions);
  expect(primary.plans).toEqual(before.plans);
  expect(generatePlan({ ...primary, plans: {} }, today).map(action => action.missionId)).not.toContain('fabric');
  await page.getByRole('button', { name: 'Bring into focus', exact: true }).click();
  const active = await saved(page);
  expect(active.missions.fabric.mode).toBe('active');
  expect(active.plans).toEqual(before.plans);
  expect(generatePlan({ ...active, plans: {} }, today)[0].missionId).toBe('fabric');
});

test('manual hierarchy shows evidence, next unlock, stage and mission completion without writing any example progress', async ({ page }) => {
  await prepare(page, { route: 'missions' });
  const before = await raw(page);
  await opener(page).click();
  const dialog = walkthrough(page), body = dialog.locator('[data-tour="mission-hierarchy"]');
  await expect(body).toHaveAttribute('data-playing', 'false');
  await expect(dialog.locator('.hierarchy-scene')).toContainText('FICTIONAL EXAMPLE');
  const api = dialog.getByRole('article', { name: 'Build a tiny API example', exact: true });
  const cli = dialog.getByRole('article', { name: 'Make a useful CLI example', exact: true });
  for (const [step, title, count] of [
    [3, 'Work on one checkpoint', '0'], [4, 'Confirm, complete, unlock', '1'],
    [5, 'Finish a stage', '2'], [6, 'Complete the mission', '4'],
  ] as const) {
    await dialog.getByRole('button', { name: `Step ${step}: ${title}`, exact: true }).click();
    await expect(api).toHaveAttribute('data-completed', count);
    await expect(cli).toHaveAttribute('data-completed', '0');
    await expect(dialog.locator('.hierarchy-caption h3')).toHaveText(title);
    expect(await raw(page)).toBe(before);
    if (step === 3) await expect(dialog.locator('.hierarchy-evidence')).toContainText('Checkpoint still open');
    if (step === 4) await expect(api.locator('[data-state="current"]')).toHaveAccessibleName('Checkpoint 2: Build handlers, current');
    if (step === 5) await expect(api.locator('.hierarchy-stage[data-complete="true"]')).toHaveCount(1);
  }
  await expect(api).toContainText('Mission complete');
  await expect(api.locator('.hierarchy-stage[data-complete="true"]')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(opener(page)).toBeFocused();
  expect(await raw(page)).toBe(before);
});

test('autoplay pauses, resumes, suspends while hidden and finishes once; replay and route cleanup preserve data', async ({ page }) => {
  await prepare(page, { route: 'missions', clock: true, motion: 'no-preference' });
  const before = await raw(page);
  await opener(page).click();
  const dialog = walkthrough(page), body = dialog.locator('[data-tour="mission-hierarchy"]');
  await expect(body).toHaveAttribute('data-playing', 'true');
  await page.clock.runFor(3600);
  await expect(body).toHaveAttribute('data-step', '1');
  await dialog.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await page.clock.runFor(20_000);
  await expect(body).toHaveAttribute('data-step', '1');
  await dialog.getByRole('button', { name: 'Play animation', exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(body).toHaveAttribute('data-playing', 'false');
  await page.clock.runFor(30_000);
  await expect(body).toHaveAttribute('data-step', '1');
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(18_000);
  await expect(body).toHaveAttribute('data-step', '5');
  await expect(body).toHaveAttribute('data-playing', 'false');
  await page.clock.runFor(30_000);
  await expect(body).toHaveAttribute('data-step', '5');
  await dialog.getByRole('button', { name: 'Replay animation', exact: true }).click();
  await expect(body).toHaveAttribute('data-step', '0');
  await expect(body).toHaveAttribute('data-playing', 'true');
  await page.evaluate(() => { location.hash = '/mission/pattern'; });
  await expect(dialog).toHaveCount(0);
  await page.clock.runFor(25_000);
  expect(await raw(page)).toBe(before);
});

test('real CSS motion is finite, pauses with the player and obeys live reduced-motion changes', async ({ page }) => {
  await prepare(page, { route: 'missions', motion: 'no-preference' });
  await opener(page).click();
  const dialog = walkthrough(page), scene = dialog.locator('.hierarchy-scene');
  await expect.poll(() => scene.evaluate(element => element.getAnimations({ subtree: true }).filter(animation =>
    animation.playState === 'running').length)).toBeGreaterThan(0);
  const timings = await scene.evaluate(element => element.getAnimations({ subtree: true }).map(animation =>
    animation.effect?.getTiming().iterations));
  expect(timings.every(iterations => iterations === 1)).toBe(true);
  await dialog.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await expect.poll(() => scene.evaluate(element => element.getAnimations({ subtree: true })
    .filter(animation => animation.playState === 'running').length)).toBe(0);
  await dialog.getByRole('button', { name: 'Play animation', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(dialog.locator('[data-tour="mission-hierarchy"]')).toHaveAttribute('data-playing', 'false');
  await expect.poll(() => scene.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test('the hierarchy walkthrough remains isolated inside tutorial practice', async ({ page }) => {
  await prepare(page, { route: 'missions' });
  const before = await raw(page);
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('mission');
  for (let index = 0; index < 3; index++) {
    await page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'mission-list');
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  await opener(page).click();
  await walkthrough(page).getByRole('button', { name: 'Step 6: Complete the mission', exact: true }).click();
  await walkthrough(page).getByRole('button', { name: 'Back to tutorial', exact: true }).click();
  await expect(walkthrough(page)).toHaveCount(0);
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  expect(await raw(page)).toBe(before);
});

test('a genuinely completed mission retains its final title and real count rather than showing another locked checkpoint', async ({ page }) => {
  let state = createInitialState(false);
  for (let index = 0; index < 48; index++) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
      title: 'Synthetic completed criterion', summary: 'A fictional full-route fixture, not user progress.',
      kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
    });
  }
  await prepare(page, { state });
  const before = await raw(page), hero = page.locator('[data-tour="save-state"]');
  await expect(hero).toHaveAttribute('data-complete', 'true');
  await expect(hero).toContainText('MISSION COMPLETE');
  await expect(hero).toContainText('48 / 48 complete');
  await expect(hero).toContainText('All checkpoints complete');
  await expect(hero).not.toContainText('Next unlock:');
  await expect(page.locator('[data-tour="record-evidence"]')).toHaveCount(0);
  expect(await raw(page)).toBe(before);
});

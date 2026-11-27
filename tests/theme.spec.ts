import { test as base, expect, type Locator, type Page, type TestInfo } from '@playwright/test';
import { THEME_MOTION_MS } from '../src/useTheme';
import { createInitialState } from '../src/domain/engine';

type Theme = 'dark' | 'light';
const themeKey = 'careerhq.theme.v1';
const workspaceKey = 'careerhq.workspace.v1';
// Theme-only cases use Overview; career-graph.spec.ts covers real WebGL/theme integration.
const palette = {
  dark: { page: 'rgb(0, 15, 19)', card: 'rgb(0, 30, 38)', text: 'rgb(147, 161, 161)', meta: '#000F13' },
  light: { page: 'rgb(243, 242, 233)', card: 'rgb(252, 250, 242)', text: 'rgb(53, 84, 81)', meta: '#F3F2E9' },
};

const test = base.extend<{ browserHealth: void }>({
  browserHealth: [async ({ context, baseURL }, use) => {
    const errors: string[] = [];
    const external: string[] = [];
    const origin = new URL(baseURL!).origin;
    const watch = (page: Page) => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
    };
    context.pages().forEach(watch);
    context.on('page', watch);
    context.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) external.push(request.url());
    });
    context.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await use();
    expect(errors, 'Themes must not cause console errors, exceptions, or failed assets').toEqual([]);
    expect(external, 'Themes must use only application-owned assets').toEqual([]);
  }, { auto: true }],
});

function themeSwitch(page: Page) {
  return page.getByRole('switch', { name: 'Dark theme', exact: true });
}

async function workspace(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), workspaceKey);
}

async function preference(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), themeKey);
}

async function assertTheme(page: Page, theme: Theme) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(themeSwitch(page)).toHaveAttribute('aria-checked', String(theme === 'dark'));
  await expect(page.locator('body')).toHaveCSS('background-color', palette[theme].page);
  await expect(page.locator('body')).toHaveCSS('color', palette[theme].text);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', palette[theme].meta);
}

async function selectTheme(page: Page, theme: Theme) {
  if (await themeSwitch(page).getAttribute('aria-checked') !== String(theme === 'dark')) {
    await themeSwitch(page).click();
  }
  await assertTheme(page, theme);
  await expect.poll(() => themeSwitch(page).getAttribute('data-motion')).toBeNull();
}

async function navigate(page: Page, name: string | RegExp) {
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible() && await menu.getAttribute('aria-expanded') !== 'true') await menu.click();
  const link = page.getByRole('complementary', { name: 'Main navigation', includeHidden: true }).getByRole('link', { name, includeHidden: true });
  await link.click();
  await expect(link).toHaveClass(/\bselected\b/);
  if (await menu.isVisible()) await expect(menu).toHaveAttribute('aria-expanded', 'false');
}

async function confirmNext(page: Page, action: () => Promise<unknown>) {
  const confirmation = page.waitForEvent('dialog');
  const pendingAction = action();
  const dialog = await confirmation;
  expect(dialog.type()).toBe('confirm');
  await dialog.accept();
  await pendingAction;
}

async function capture(page: Page, testInfo: TestInfo, name: string, fullPage = true) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  ), { message: 'The themed document must not overflow horizontally' }).toBeLessThanOrEqual(0);
}

async function frozenMotionPage(page: Page, theme: Theme = 'dark') {
  await page.addInitScript(({ key, theme }) => localStorage.setItem(key, theme), { key: themeKey, theme });
  await page.addInitScript(() => {
    // Playwright's JS clock does not stop native CSS transitions. Hold each real
    // transition in the style-mutation microtask, before a slow caller can miss it.
    const held = new WeakSet<Animation>();
    new MutationObserver(records => {
      const buttons = new Set<Element>();
      for (const record of records) {
        if (record.target instanceof Element) {
          const button = record.target.closest('.theme-toggle[data-motion]');
          if (button) buttons.add(button);
        }
      }
      for (const button of buttons) {
        for (const animation of button.getAnimations({ subtree: true })) {
          if (!(animation instanceof CSSTransition) || held.has(animation)) continue;
          held.add(animation);
          animation.pause();
          animation.currentTime = 0;
        }
      }
    }).observe(document, {
      subtree: true, attributes: true, attributeFilter: ['data-motion', 'style', 'aria-checked'],
    });
  });
  // Freeze before application startup; a busy renderer must not turn pauseAt into a past deadline.
  await page.clock.install({ time: new Date('2026-10-05T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-05T12:01:00Z'));
  await page.goto('./#/hq');
  await assertTheme(page, theme);
}

test('default dark and switched light use canonical colors without altering workspace data', async ({ page }, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('./#/hq');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  const before = await workspace(page);
  await assertTheme(page, 'dark');
  const mission = page.locator('.overview-list').first();
  await expect(mission).toHaveCSS('background-color', palette.dark.card);
  await capture(page, testInfo, 'canonical-hq-dark');
  await selectTheme(page, 'light');
  await expect(mission).toHaveCSS('background-color', palette.light.card);
  expect(await preference(page)).toBe('light');
  expect(await workspace(page)).toBe(before);
  await capture(page, testInfo, 'canonical-hq-light');
  await selectTheme(page, 'dark');
  expect(await preference(page)).toBe('dark');
  expect(await workspace(page)).toBe(before);
});

test('external prepaint script restores saved light before the main module hydrates', async ({ page }, testInfo) => {
  await page.addInitScript(key => localStorage.setItem(key, 'light'), themeKey);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/*.js', async route => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('./#/hq', { waitUntil: 'commit' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F3F2E9');
    await expect(page.locator('script[src$="/theme-init.js"]')).toHaveCount(1);
    await expect(page.locator('#root')).toBeEmpty();
    await expect(themeSwitch(page)).toHaveCount(0);
    await expect(page.locator('body')).toHaveCSS('background-color', palette.light.page);
    expect(await workspace(page)).toBeNull();
    await capture(page, testInfo, 'light-before-hydration', false);
  } finally {
    release();
  }
  await expect(themeSwitch(page)).toBeVisible();
  await assertTheme(page, 'light');
  const beforeReload = await workspace(page);
  await page.reload();
  await assertTheme(page, 'light');
  expect(await workspace(page)).toBe(beforeReload);
});

for (const theme of ['dark', 'light'] as const) {
  test(`${theme} colors and preference survive mission, evidence, settings, and dialog routes`, async ({ page }, testInfo) => {
    await page.addInitScript(({ key, state }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    }, { key: workspaceKey, state: createInitialState(true) });
    await page.goto('./#/hq');
    await selectTheme(page, theme);
    const before = await workspace(page);
    const documentStarted = await page.evaluate(() => performance.timeOrigin);

    await navigate(page, 'Roadmap');
    await page.getByRole('button', { name: 'View DSA flowchart', exact: true }).click();
    await page.getByRole('link', { name: 'Open DSA mission', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'DSA', exact: true })).toBeVisible();
    await assertTheme(page, theme);
    const blockerCard = page.locator('section.panel').filter({ has: page.getByRole('heading', { name: 'Blocker', exact: true }) });
    const blocked = Boolean(JSON.parse(before!).missions.pattern.blocker);
    await expect(blockerCard).toHaveAttribute('data-blocked', String(blocked));
    await expect(blockerCard).toHaveCSS('border-top-color', theme === 'dark'
      ? blocked ? 'rgb(232, 74, 95)' : 'rgb(69, 208, 114)'
      : blocked ? 'rgb(173, 62, 85)' : 'rgb(36, 116, 73)');
    await expect(blockerCard).not.toHaveCSS('background-color', palette[theme].card);
    await capture(page, testInfo, `mission-${theme}`);

    await navigate(page, 'Saved work');
    await assertTheme(page, theme);
    const cards = page.getByRole('article');
    expect(await cards.count()).toBeGreaterThan(0);
    for (const card of await cards.all()) await expect(card).toHaveCSS('background-color', palette[theme].card);
    await capture(page, testInfo, `evidence-${theme}`);
    await page.getByRole('button', { name: 'Add evidence', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Record progress' });
    await expect(dialog).toHaveCSS('background-color', palette[theme].card);
    await capture(page, testInfo, `evidence-dialog-${theme}`, false);
    await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();

    await navigate(page, 'Settings & data');
    await assertTheme(page, theme);
    await expect(page.locator('.backup-panel')).toHaveCSS('background-color', palette[theme].card);
    await capture(page, testInfo, `settings-${theme}`);
    expect(await workspace(page), 'Reading themed routes must not alter workspace JSON or audit history').toBe(before);
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStarted);
  });
}

test('workspace resets and backup imports do not reset the separate theme preference', async ({ page }) => {
  await page.goto('./#/hq');
  await selectTheme(page, 'light');
  const backup = await workspace(page);
  await navigate(page, 'Settings & data');
  await confirmNext(page, () => page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click());
  expect(JSON.parse((await workspace(page))!).sampleData).toBe(false);
  expect(await preference(page)).toBe('light');
  await assertTheme(page, 'light');
  await confirmNext(page, () => page.getByRole('button', { name: 'Reload sample', exact: true }).click());
  expect(await preference(page)).toBe('light');
  await assertTheme(page, 'light');
  await confirmNext(page, () => page.getByLabel('Choose backup file', { exact: true }).setInputFiles({
    name: 'synthetic-theme-isolation-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(backup!),
  }));
  expect(await preference(page)).toBe('light');
  expect(await workspace(page)).toBe(backup);
  await assertTheme(page, 'light');
});

async function animationFrame(toggle: Locator, milliseconds: number) {
  await expect.poll(() => toggle.evaluate(button => {
    const orbit = button.querySelector('.theme-orbit')!;
    getComputedStyle(orbit).transform;
    return orbit.getAnimations().some(animation =>
      animation instanceof CSSTransition && animation.transitionProperty === 'transform');
  })).toBe(true);
  const frame = await toggle.evaluate((button, time) => {
    const orbit = button.querySelector('.theme-orbit')!;
    const sun = button.querySelector('.theme-sun')!;
    const animations = button.getAnimations({ subtree: true });
    for (const animation of animations) {
      if (animation.playState !== 'paused') throw new Error('Theme transition escaped the creation-time hold');
      animation.currentTime = time;
    }
    const orbitTransition = animations.find(animation =>
      animation.effect instanceof KeyframeEffect && animation.effect.target === orbit);
    const scene = button.querySelector('.theme-scene')!.getBoundingClientRect();
    const orbitBounds = orbit.getBoundingClientRect();
    const bounds = sun.getBoundingClientRect();
    return {
      milliseconds: time,
      animationCount: animations.length,
      transitionProperty: orbitTransition instanceof CSSTransition ? orbitTransition.transitionProperty : null,
      duration: orbitTransition?.effect?.getComputedTiming().duration,
      currentTime: orbitTransition?.currentTime,
      playState: orbitTransition?.playState,
      keyframeTransforms: orbitTransition?.effect instanceof KeyframeEffect
        ? orbitTransition.effect.getKeyframes().map(keyframe => keyframe.transform) : [],
      transform: getComputedStyle(orbit).transform,
      centerX: orbitBounds.x + orbitBounds.width / 2 - scene.x,
      centerY: orbitBounds.y + orbitBounds.height / 2 - scene.y,
      x: bounds.x + bounds.width / 2 - scene.x,
      y: bounds.y + bounds.height / 2 - scene.y,
      top: bounds.top - scene.top,
      sceneHeight: scene.height,
      sceneWidth: scene.width,
    };
  }, milliseconds);
  expect(frame.duration).toBe(THEME_MOTION_MS);
  expect(frame.currentTime).toBe(milliseconds);
  expect(frame.playState).toBe('paused');
  return frame;
}

async function assertMotionSettled(page: Page, theme: Theme) {
  const toggle = themeSwitch(page);
  await expect(toggle).not.toHaveAttribute('data-motion');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-transition');
  await expect(page.locator('.palette-veil')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-palette-transition');
  await assertTheme(page, theme);
  await expect.poll(() => toggle.evaluate(button => {
    const orbit = button.querySelector('.theme-orbit')!;
    const matrix = new DOMMatrixReadOnly(getComputedStyle(orbit).transform);
    return {
      animations: button.getAnimations({ subtree: true }).length,
      cosine: matrix.a,
      sine: matrix.b,
      clouds: Number(getComputedStyle(button.querySelector('.theme-clouds')!).opacity),
    };
  })).toEqual({ animations: 0, cosine: theme === 'light' ? 1 : -1, sine: 0, clouds: theme === 'light' ? 1 : 0 });
}

test('the sun repeatedly rises on the east/right and sets on the west/left', async ({ page }, testInfo) => {
  await frozenMotionPage(page);
  const before = await workspace(page);
  const toggle = themeSwitch(page);
  let cycle = 0;
  for (const [motion, theme] of [['sunrise', 'light'], ['sunset', 'dark'], ['sunrise', 'light'], ['sunset', 'dark']] as const) {
    await toggle.click();
    await expect(toggle).toHaveAttribute('data-motion', motion);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // Deliberately outlive the sun's 1.2s transition with the independent 1.4s
    // palette fade: the sampled native orbit must still exist on a slow runner.
    await expect(page.locator('.palette-veil')).toHaveCount(0);
    const frames = [];
    for (const milliseconds of [0, THEME_MOTION_MS / 4, THEME_MOTION_MS * .75, THEME_MOTION_MS]) {
      const frame = await animationFrame(toggle, milliseconds);
      expect(frame.animationCount).toBeGreaterThan(0);
      expect(frame.transitionProperty).toBe('transform');
      frames.push(frame);
      const path = testInfo.outputPath(`${motion}-${cycle}-${milliseconds}ms.png`);
      await toggle.screenshot({ path, animations: 'allow' });
      await testInfo.attach(`${motion}-${cycle}-${milliseconds}ms`, { path, contentType: 'image/png' });
    }
    expect(frames[0].keyframeTransforms).toEqual([
      `rotate(${-180 * (cycle + 1)}deg)`, `rotate(${-180 * (cycle + 2)}deg)`,
    ]);
    expect(frames[0].transform).not.toBe(frames[1].transform);
    expect(frames[1].transform).not.toBe(frames[2].transform);
    let sweptAngle = 0;
    for (let index = 1; index < frames.length; index++) {
      const previous = frames[index - 1];
      const current = frames[index];
      const [ax, ay] = [previous.x - previous.centerX, previous.y - previous.centerY];
      const [bx, by] = [current.x - current.centerX, current.y - current.centerY];
      const delta = Math.atan2(ax * by - ay * bx, ax * bx + ay * by);
      expect(delta, 'Every sampled segment travels counter-clockwise').toBeLessThan(0);
      sweptAngle += delta;
    }
    expect(sweptAngle, 'Each settled toggle travels exactly half an orbit').toBeCloseTo(-Math.PI, 3);
    if (motion === 'sunrise') {
      expect(frames[0].y).toBeGreaterThan(frames[1].y);
      expect(frames[1].y).toBeGreaterThan(frames[2].y);
      expect(frames[2].x).toBeGreaterThan(frames[2].sceneWidth / 2);
      expect(frames[2].y).toBeLessThan(21);
      expect(frames[3].y).toBeLessThan(21);
    } else {
      expect(frames[0].y).toBeLessThan(frames[1].y);
      expect(frames[1].y).toBeLessThan(frames[2].y);
      expect(frames[1].x).toBeLessThan(frames[1].sceneWidth / 2);
      expect(frames[1].y).toBeLessThan(21);
      expect(frames[3].top).toBeGreaterThan(frames[3].sceneHeight);
    }
    await testInfo.attach(`${motion}-${cycle}-computed-frames`, { body: JSON.stringify(frames), contentType: 'application/json' });
    await page.clock.runFor(THEME_MOTION_MS + 150);
    await assertMotionSettled(page, theme);
    cycle++;
  }
  expect(await workspace(page)).toBe(before);
});

test('retargeting mid-flight preserves the current sun position instead of restarting', async ({ page }) => {
  await frozenMotionPage(page);
  const toggle = themeSwitch(page);
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-motion', 'sunrise');
  const before = await animationFrame(toggle, THEME_MOTION_MS / 2);
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-motion', 'sunset');
  const reversed = await animationFrame(toggle, 0);
  expect(Math.hypot(reversed.x - before.x, reversed.y - before.y)).toBeLessThan(.25);
  const ended = await animationFrame(toggle, THEME_MOTION_MS);
  expect(ended.top).toBeGreaterThan(ended.sceneHeight);
  await page.clock.runFor(THEME_MOTION_MS + 150);
  await assertMotionSettled(page, 'dark');
});

test('a late sunrise request continues past the west horizon and returns from the east', async ({ page }) => {
  await frozenMotionPage(page, 'light');
  const toggle = themeSwitch(page);
  await toggle.click();
  const before = await animationFrame(toggle, THEME_MOTION_MS / 2);
  await toggle.click();
  await expect(toggle).toHaveAttribute('data-motion', 'sunrise');
  const retargeted = await animationFrame(toggle, 0);
  expect(Math.hypot(retargeted.x - before.x, retargeted.y - before.y)).toBeLessThan(.25);
  const rising = await animationFrame(toggle, THEME_MOTION_MS * .75);
  expect(rising.x).toBeGreaterThan(rising.sceneWidth / 2);
  expect(rising.y).toBeLessThan(21);
  await animationFrame(toggle, THEME_MOTION_MS);
  await page.clock.runFor(THEME_MOTION_MS + 150);
  await assertMotionSettled(page, 'light');
});

test('theme motion uses only the tiny control and one page fade', async ({ page }) => {
  await frozenMotionPage(page);
  await themeSwitch(page).click();
  const effects = await page.evaluate(() => document.getAnimations().map(animation => {
    const target = animation.effect instanceof KeyframeEffect ? animation.effect.target : null;
    animation.pause();
    return {
      local: target instanceof Element && !!target.closest('.theme-toggle'),
      property: animation instanceof CSSTransition ? animation.transitionProperty : null,
      pageFade: target instanceof Element && target.matches('.palette-veil'),
    };
  }));
  expect(effects.length).toBeGreaterThan(0);
  expect(effects.length).toBeLessThanOrEqual(7);
  expect(effects.every(effect => effect.pageFade || (effect.local && ['transform', 'opacity'].includes(effect.property ?? '')))).toBe(true);
});

test('sunny mode has a bright blue sky instead of the night palette', async ({ page }, testInfo) => {
  await page.goto('./#/hq');
  const sky = page.locator('.theme-sky');
  await expect(sky).toHaveCSS('background-color', palette.dark.card);
  expect(await sky.evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('0');
  await selectTheme(page, 'light');
  await expect.poll(() => sky.evaluate(element => getComputedStyle(element, '::before').opacity)).toBe('1');
  const daytime = await sky.evaluate(element => {
    const style = getComputedStyle(element, '::before');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return { opacity: style.opacity, rgb: [...context.getImageData(0, 0, 1, 1).data].slice(0, 3) };
  });
  expect(daytime.opacity).toBe('1');
  expect(daytime.rgb.every(channel => channel > 180)).toBe(true);
  expect(daytime.rgb[2]).toBeGreaterThan(daytime.rgb[0]);
  await expect(page.locator('.theme-sun path')).toHaveCSS('stroke', 'rgb(203, 75, 22)');
  await expect(page.locator('.theme-clouds')).toHaveCSS('opacity', '1');
  await expect(page.locator('.theme-clouds path')).toHaveCount(2);
  const path = testInfo.outputPath('sunny-sky-control.png');
  await themeSwitch(page).screenshot({ path });
  await testInfo.attach('sunny-sky-control', { path, contentType: 'image/png' });
  await selectTheme(page, 'dark');
  await expect(page.locator('.theme-clouds')).toHaveCSS('opacity', '0');
});

test('reduced motion changes theme immediately without animated transition state', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/hq');
  await assertTheme(page, 'dark');
  await themeSwitch(page).click();
  const immediate = await themeSwitch(page).evaluate(button => ({
    theme: document.documentElement.dataset.theme,
    transition: document.documentElement.hasAttribute('data-theme-transition'),
    motion: button.getAttribute('data-motion'),
    animations: button.getAnimations({ subtree: true }).length,
    sunAnimation: getComputedStyle(button.querySelector('.theme-sun')!).animationName,
    background: getComputedStyle(document.body).backgroundColor,
  }));
  expect(immediate).toEqual({
    theme: 'light', transition: false, motion: null, animations: 0,
    sunAnimation: 'none', background: palette.light.page,
  });
  await assertTheme(page, 'light');
});

test('enabling reduced motion cancels an in-flight sun and page fade without replay', async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this.classList.contains('palette-veil')) animation.pause();
      return animation;
    };
  });
  await frozenMotionPage(page);
  const before = await workspace(page);
  const toggle = themeSwitch(page);
  await toggle.click();
  const moving = await animationFrame(toggle, THEME_MOTION_MS / 2);
  expect(moving.transitionProperty).toBe('transform');
  await expect(page.locator('.palette-veil')).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect.poll(() => toggle.evaluate(button => button.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(page.locator('.palette-veil')).toHaveCount(0);
  await assertTheme(page, 'light');
  await page.clock.runFor(THEME_MOTION_MS + 150);
  await assertMotionSettled(page, 'light');
  await toggle.click();
  await assertMotionSettled(page, 'dark');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await assertMotionSettled(page, 'dark');
  expect(await preference(page)).toBe('dark');
  expect(await workspace(page)).toBe(before);
});

test('keyboard Tab exposes a visible focus indicator and Space toggles the switch', async ({ page }) => {
  await page.goto('./#/hq');
  await assertTheme(page, 'dark');
  await page.keyboard.press('Control+k');
  await expect(page.getByRole('textbox', { name: 'Search missions and evidence', exact: true })).toBeFocused();
  await page.keyboard.press('Tab');
  const toggle = themeSwitch(page);
  await expect(toggle).toBeFocused();
  const focus = await toggle.evaluate(button => ({
    visible: button.matches(':focus-visible'),
    outlineStyle: getComputedStyle(button).outlineStyle,
    outlineWidth: parseFloat(getComputedStyle(button).outlineWidth),
    outlineColor: getComputedStyle(button).outlineColor,
  }));
  expect(focus.visible).toBe(true);
  expect(focus.outlineStyle).not.toBe('none');
  expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
  expect(focus.outlineColor).not.toBe('rgba(0, 0, 0, 0)');
  const before = await workspace(page);
  await page.keyboard.press('Space');
  await assertTheme(page, 'light');
  expect(await preference(page)).toBe('light');
  expect(await workspace(page)).toBe(before);
});

test('rapid theme changes settle on the last choice without workspace changes', async ({ page }) => {
  await frozenMotionPage(page);
  const before = await workspace(page);
  for (let index = 0; index < 5; index++) await themeSwitch(page).click();
  await expect(themeSwitch(page)).toHaveAttribute('aria-checked', 'false');
  await expect(themeSwitch(page)).toHaveAttribute('data-motion', 'sunrise');
  const ended = await animationFrame(themeSwitch(page), THEME_MOTION_MS);
  expect(ended.y).toBeLessThan(21);
  await page.clock.fastForward(THEME_MOTION_MS + 150);
  await assertMotionSettled(page, 'light');
  expect(await preference(page)).toBe('light');
  expect(await workspace(page)).toBe(before);
});

for (const width of [320, 390]) {
  test(`both themes fit ${width}px across routes with global search expanded`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('./#/hq');
    for (const theme of ['dark', 'light'] as const) {
      await selectTheme(page, theme);
      for (const route of ['Overview', /^Missions/, 'Roadmap', 'Daily plan', 'Saved work',
        'History', 'Opportunities', 'Interview readiness', 'Settings & data']) {
        await navigate(page, route);
        const search = page.getByRole('textbox', { name: 'Search missions and evidence', exact: true });
        await search.fill('Pattern');
        await expect(page.locator('.search-results')).toBeVisible();
        await assertTheme(page, theme);
        await noOverflow(page);
        for (const control of [search, themeSwitch(page)]) {
          const bounds = await control.boundingBox();
          expect(bounds).not.toBeNull();
          expect(bounds!.x).toBeGreaterThanOrEqual(0);
          expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        }
        if (route === 'Overview' || route === 'Settings & data') {
          await capture(page, testInfo, `${theme}-${width}-${route === 'Overview' ? 'hq' : 'settings'}-search`, false);
        }
        await search.press('Escape');
        await search.blur();
      }
    }
  });
}

test('blocked theme-only writes show a notice while workspace storage still works', async ({ page }) => {
  await page.addInitScript(key => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (this === localStorage && name === key) throw new DOMException('Synthetic theme write failure', 'QuotaExceededError');
      return setItem.call(this, name, value);
    };
  }, themeKey);
  await page.goto('./#/hq');
  await assertTheme(page, 'dark');
  const before = await workspace(page);
  await selectTheme(page, 'light');
  await expect(page.getByRole('status').filter({ hasText: 'Theme changed for this tab, but the preference could not be saved.' })).toBeVisible();
  expect(await preference(page)).toBeNull();
  expect(await workspace(page)).toBe(before);
  await navigate(page, 'Settings & data');
  const direction = 'Synthetic workspace write remains available despite a theme-only failure.';
  await page.getByLabel('What are you working toward?').fill(direction);
  await page.getByRole('button', { name: 'Save direction', exact: true }).click();
  expect(JSON.parse((await workspace(page))!).objective).toBe(direction);
  await assertTheme(page, 'light');
  await page.reload();
  await assertTheme(page, 'dark');
  expect(JSON.parse((await workspace(page))!).objective).toBe(direction);
});

test('theme preference syncs between tabs without creating workspace conflicts', async ({ page, context }) => {
  await page.goto('./#/hq');
  await assertTheme(page, 'dark');
  const other = await context.newPage();
  await other.goto('./#/hq');
  await assertTheme(other, 'dark');
  const before = await workspace(page);
  await selectTheme(page, 'light');
  await assertTheme(other, 'light');
  await expect(other.getByRole('alert')).toHaveCount(0);
  expect(await workspace(other)).toBe(before);
  await selectTheme(other, 'dark');
  await assertTheme(page, 'dark');
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await workspace(page)).toBe(before);
});

test('recovery screen theme toggle preserves unreadable workspace data and its own preference', async ({ page }, testInfo) => {
  const original = '{"schemaVersion":999,"syntheticRecoveryRecord":"leave untouched"}';
  await page.addInitScript(({ stateKey, preferenceKey, raw }) => {
    if (localStorage.getItem(stateKey) === null) localStorage.setItem(stateKey, raw);
    if (localStorage.getItem(preferenceKey) === null) localStorage.setItem(preferenceKey, 'light');
  }, { stateKey: workspaceKey, preferenceKey: themeKey, raw: original });
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Your existing data comes first.', exact: true })).toBeVisible();
  await assertTheme(page, 'light');
  expect(await workspace(page)).toBe(original);
  await capture(page, testInfo, 'recovery-light', false);
  await selectTheme(page, 'dark');
  expect(await preference(page)).toBe('dark');
  expect(await workspace(page)).toBe(original);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Your existing data comes first.', exact: true })).toBeVisible();
  await assertTheme(page, 'dark');
  expect(await workspace(page)).toBe(original);
  await capture(page, testInfo, 'recovery-dark', false);
});

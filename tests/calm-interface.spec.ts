import { expect, test, type Locator, type Page } from '@playwright/test';
import { createInitialState, generatePlan } from '../src/domain/engine';

const key = 'careerhq.workspace.v1', day = '2026-11-20';

async function prepare(page: Page, theme = 'dark') {
  const state = createInitialState(false);
  state.updatedAt = `${day}T08:00:00Z`;
  state.plans[day] = generatePlan(state, day);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date(`${day}T08:00:00Z`));
  await page.addInitScript(({ state, theme, key }) => {
    localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('careerhq.theme.v1', theme);
  }, { state, theme, key });
}

async function stored(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), key);
}

async function bounded(panel: Locator, page: Page) {
  const rect = await panel.boundingBox();
  expect(rect).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(rect!.x).toBeGreaterThanOrEqual(11);
  expect(rect!.y).toBeGreaterThanOrEqual(11);
  expect(rect!.x + rect!.width).toBeLessThanOrEqual(viewport.width - 11);
  expect(rect!.y + rect!.height).toBeLessThanOrEqual(viewport.height - 11);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

test('contextual help supports hover, keyboard focus, dismissal and normal Tab order without saving work', async ({ page }) => {
  await prepare(page);
  await page.goto('./#/omscs/paths');
  const trigger = page.getByRole('button', { name: 'About Course choices', exact: true });
  const panel = page.getByRole('dialog', { name: 'Course choices', exact: true });
  await expect(trigger).toBeVisible();
  const before = await stored(page);
  await expect(page.locator('.page-heading > div > p')).toHaveCount(0);
  await expect(page.locator('#paths-history')).not.toHaveAttribute('open', '');
  await trigger.hover();
  await expect(panel).toBeVisible();
  await panel.hover();
  await expect(panel).toBeVisible();
  await bounded(panel, page);
  await page.mouse.move(0, 0);
  await expect(panel).toHaveCount(0);

  await trigger.focus();
  await expect(panel).toBeVisible();
  await trigger.press('Enter');
  await expect(panel.getByRole('button', { name: 'Close Course choices help', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'My shortlist', exact: true })).toBeFocused();
  await trigger.focus();
  await trigger.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await expect(trigger).toBeFocused();
  await expect(panel).toHaveCount(0);
  await trigger.press('Enter');
  await panel.getByRole('link', { name: 'Degree rules', exact: true }).focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'My shortlist', exact: true })).toBeFocused();
  await expect(panel).toHaveCount(0);
  const designHelp = page.getByRole('dialog', { name: 'CS 6515 course details', exact: true });
  await page.locator('#paths-choices').getByRole('button', { name: 'About CS 6515 course details', exact: true }).click();
  await expect(designHelp).toBeVisible();
  await page.mouse.move(2, 2);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await bounded(designHelp, page);
  await page.getByRole('heading', { name: 'Course choices', exact: true }).click();
  await expect(designHelp).toHaveCount(0);
  await trigger.click();
  await page.getByRole('button', { name: 'About Choosing the first subject', exact: true }).click();
  await expect(panel).toHaveCount(0);
  await expect(page.locator('.context-help-panel')).toHaveCount(1);
  await page.evaluate(() => { location.hash = '/missions'; });
  await expect(page.getByRole('heading', { name: 'Missions', exact: true })).toBeVisible();
  await expect(page.locator('.context-help-panel')).toHaveCount(0);
  expect(await stored(page)).toBe(before);
});

for (const [width, theme] of [[390, 'dark'], [320, 'light']] as const) {
  test.describe(`${width}px ${theme} touch help`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true });
    test('opens on tap, stays in the viewport, closes outside and retains visible validation', async ({ page }, testInfo) => {
      await prepare(page, theme);
      await page.goto('./#/omscs/paths');
      const before = await stored(page);
      await expect(page.getByRole('combobox', { name: 'First-term subject', exact: true })).toBeInViewport({ ratio: 1 });
      await page.getByRole('button', { name: 'About Course choices', exact: true }).tap();
      const panel = page.getByRole('dialog', { name: 'Course choices', exact: true });
      await expect(panel).toBeVisible();
      await bounded(panel, page);
      await page.screenshot({ path: testInfo.outputPath(`touch-help-${width}-${theme}.png`) });
      await panel.getByRole('button', { name: 'Close Course choices help', exact: true }).tap();
      await expect(panel).toHaveCount(0);
      await page.getByRole('button', { name: 'About Choosing the first subject', exact: true }).tap();
      await expect(page.locator('.context-help-panel')).toHaveCount(1);
      await page.getByRole('heading', { name: 'Course choices', exact: true }).tap();
      await expect(page.locator('.context-help-panel')).toHaveCount(0);
      const duplicate = await page.getByRole('combobox', { name: 'Second AI-core course', exact: true }).inputValue();
      await page.getByRole('combobox', { name: 'First AI-core course', exact: true }).selectOption(duplicate);
      await expect(page.getByRole('alert')).toContainText('five different courses');
      await expect(page.getByRole('alert')).toBeVisible();
      await page.getByRole('button', { name: 'My shortlist', exact: true }).tap();
      await expect(page.locator('[data-tour="paths-shortlist"]')).toBeInViewport();
      await page.screenshot({ path: testInfo.outputPath(`touch-shortlist-${width}-${theme}.png`) });
      expect(await stored(page)).toBe(before);
    });
  });
}

test('the sidebar separates Education and puts Discovery Atlas before Tracking without changing records', async ({ page }) => {
  await prepare(page);
  await page.goto('./#/hq');
  const before = await stored(page);
  const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
  const order = await sidebar.evaluate(element => {
    const text = element.textContent!.toLowerCase();
    return ['discovery atlas', 'tracking', 'education', 'career'].map(label =>
      label === 'career' ? text.lastIndexOf(label) : text.indexOf(label));
  });
  expect(order.every(index => index >= 0)).toBe(true);
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await sidebar.getByRole('link', { name: 'Georgia Tech OMSCS', exact: true }).click();
  await expect(page).toHaveURL(/#\/omscs$/);
  await expect(page.locator('[data-omscs-course]')).toHaveCount(7);
  await expect(page.locator('[data-tour="academic-completed"] [data-academic-course]')).toHaveCount(3);
  await expect(page.locator('[data-tour="omscs-course-guide"]')).not.toHaveAttribute('open', '');
  await page.locator('[data-omscs-course="cs7641"]').getByRole('button', { name: 'Explore course guide', exact: true }).click();
  await expect(page.locator('[data-tour="omscs-course-guide"]')).toHaveAttribute('open', '');
  await expect(page.getByRole('combobox', { name: 'Explore a course', exact: true })).toHaveValue('cs7641');
  await expect(page.getByRole('combobox', { name: 'Explore a course', exact: true }).locator('option')).toHaveCount(10);
  expect(await stored(page)).toBe(before);
});

for (const [width, theme] of [[1440, 'dark'], [390, 'dark'], [320, 'light']] as const) {
  test(`academic action and navigation groups keep clear spacing at ${width}px ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await prepare(page, theme);
    await page.goto('./#/omscs');
    const card = page.locator('.omscs-next');
    await expect(card).toBeVisible();
    const before = await stored(page);
    const geometry = await card.evaluate(element => {
      const heading = element.querySelector('h2')!.getBoundingClientRect();
      const course = element.querySelector('p')!.getBoundingClientRect();
      const action = element.querySelector('a.button')!.getBoundingClientRect();
      const disclosure = element.querySelector('details')!.getBoundingClientRect();
      return {
        textTop: heading.top, textBottom: course.bottom, textLeft: heading.left,
        textRight: Math.max(heading.right, course.right),
        actionTop: action.top, actionBottom: action.bottom, actionLeft: action.left, actionRight: action.right,
        disclosureTop: disclosure.top, disclosureRight: disclosure.right,
      };
    });
    expect(geometry.disclosureTop - Math.max(geometry.actionBottom, geometry.textBottom)).toBeGreaterThanOrEqual(12);
    if (width >= 1100) {
      expect(geometry.actionLeft - geometry.textRight).toBeGreaterThanOrEqual(12);
      expect(Math.abs(geometry.actionRight - geometry.disclosureRight)).toBeLessThan(1);
      expect(Math.abs((geometry.actionTop + geometry.actionBottom - geometry.textTop - geometry.textBottom) / 2)).toBeLessThan(1);
    } else {
      expect(geometry.actionTop - geometry.textBottom).toBeGreaterThanOrEqual(12);
      expect(Math.abs(geometry.actionLeft - geometry.textLeft)).toBeLessThan(1);
    }
    await card.screenshot({ path: testInfo.outputPath(`academic-action-${width}-${theme}.png`) });
    const disclosure = card.locator('details');
    await disclosure.locator('summary').click();
    await expect(disclosure.getByRole('link', { name: 'Open current study material', exact: true })).toBeVisible();
    await disclosure.locator('summary').click();
    await card.getByRole('link', { name: 'Choose next subject', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Course choices', exact: true })).toBeVisible();
    if (width < 1100) await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    const spacing = await page.locator('.sidebar').evaluate(element => {
      const bottom = (selector: string) => element.querySelector(selector)!.getBoundingClientRect().bottom;
      const top = (selector: string) => element.querySelector(selector)!.getBoundingClientRect().top;
      return {
        tracking: top('#tracking-nav-label') - bottom('nav[aria-label="Discovery"]'),
        education: top('#education-nav-label') - bottom('nav[aria-labelledby="tracking-nav-label"]'),
      };
    });
    expect(spacing.tracking).toBeGreaterThanOrEqual(20);
    expect(spacing.tracking).toBeCloseTo(spacing.education, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await stored(page)).toBe(before);
  });
}

for (const fullscreen of [false, true]) {
  test(`contextual help remains interactive in the ${fullscreen ? 'fullscreen' : 'native modal'} focus room`, async ({ page }) => {
    await prepare(page);
    await page.addInitScript(fullscreen => {
      if (!fullscreen) Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => false });
      const getContext = HTMLCanvasElement.prototype.getContext;
      Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
        configurable: true,
        value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
          return type === 'webgl2' || type === 'webgl' ? null : Reflect.apply(getContext, this, [type, ...args]);
        },
      });
    }, fullscreen);
    await page.goto('./#/plan');
    const before = await stored(page);
    await page.locator('[data-tour="focus-room-open"]').click();
    const room = page.locator('dialog[data-tour="focus-room"]');
    await expect(room).toHaveAttribute('open', '');
    if (fullscreen) await expect(page.locator('[data-focus-room-stage]')).toHaveAttribute('data-fullscreen', 'true');
    const trigger = room.getByRole('button', { name: 'About Focus room visuals', exact: true });
    await trigger.click();
    const panel = page.getByRole('dialog', { name: 'Focus room visuals', exact: true });
    await expect(panel).toBeVisible();
    await bounded(panel, page);
    expect(await panel.evaluate(element => !!element.closest('dialog[open]'))).toBe(true);
    if (fullscreen) expect(await panel.evaluate(element => document.fullscreenElement?.contains(element))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(room).toHaveAttribute('open', '');
    await room.getByRole('button', { name: 'Close focus room', exact: true }).click();
    await expect(room).not.toHaveAttribute('open', '');
    expect(await stored(page)).toBe(before);
  });
}

for (const width of [1440, 320]) {
  test(`the course-choice tutorial opens real disclosures and leaves the saved workspace unchanged at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await prepare(page, width === 320 ? 'light' : 'dark');
    await page.goto('./#/hq');
    const before = await stored(page);
    await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
    const coach = page.locator('.tutorial-panel');
    await coach.getByRole('combobox', { name: 'Tutorial chapter', exact: true }).selectOption('course-choices');
    await expect(coach).toHaveAttribute('data-step', 'paths-intro');
    const next = coach.locator('[data-tutorial-next="next"]');
    const advance = async (id: string) => {
      await expect(next).toBeEnabled();
      await next.click();
      await expect(coach).toHaveAttribute('data-step', id);
    };
    await advance('paths-context-help');
    await expect(next).toBeDisabled();
    await page.locator('[data-tour="paths-first-subject-help"]').click();
    await expect(next).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.locator('.context-help-panel')).toHaveCount(0);
    await advance('paths-basis');
    await page.locator('#paths-history > summary').click();
    await advance('paths-design');
    await page.locator('[data-tour="paths-design-select"]').selectOption('cs6300');
    await advance('paths-free-search');
    await page.locator('[data-tour="paths-free-query"]').fill('database');
    await advance('paths-entry-conditions');
    await page.locator('#paths-entry-checks > summary').click();
    await advance('paths-first-choice');
    await page.locator('[data-tour="paths-first-term-select"]').selectOption('cs6200');
    await advance('paths-copy-shortlist');
    await expect(next).toBeDisabled();
    await expect(page.locator('.tutorial-missing')).toHaveCount(0);
    await expect(page.locator('.tutorial-target-ring')).toBeVisible();
    await page.locator('#paths-shortlist .path-course-detail > summary').click();
    await page.locator('[data-tour="paths-shortlist-select"]').click();
    await advance('paths-calendar');
    await page.locator('#paths-semester-calendar > summary').click();
    await expect(next).toBeEnabled();
    expect(await stored(page)).toBe(before);
    await next.click();
    await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
    expect(await stored(page)).toBe(before);
  });
}

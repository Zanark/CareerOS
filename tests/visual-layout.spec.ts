import { expect, test, type Locator, type Page } from '@playwright/test';
import { createInitialState, generatePlan } from '../src/domain/engine';
import { openLibraryBrowser } from './library-ui';

const key = 'careerhq.workspace.v1', day = '2026-11-21';

async function prepare(page: Page, width: number) {
  const state = createInitialState(false);
  state.updatedAt = `${day}T08:00:00Z`;
  state.plans[day] = generatePlan(state, day);
  await page.setViewportSize({ width, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date(`${day}T08:00:00Z`));
  await page.addInitScript(({ state, key, width }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('careerhq.theme.v1', width === 320 ? 'light' : 'dark');
  }, { state, key, width });
}

async function splitHeadingWords(heading: Locator) {
  return heading.evaluate(element => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT), broken: string[] = [];
    let node;
    while ((node = walker.nextNode())) {
      for (const match of (node.textContent ?? '').matchAll(/[A-Za-z]{5,}/g)) {
        const range = document.createRange();
        range.setStart(node, match.index!); range.setEnd(node, match.index! + match[0].length);
        if (new Set([...range.getClientRects()].filter(rect => rect.width > 1).map(rect => Math.round(rect.top))).size > 1) broken.push(match[0]);
      }
    }
    return broken;
  });
}

for (const width of [320, 768, 1440]) {
  test(`visual polish: long titles and grouped actions reflow at ${width}px`, async ({ page }) => {
    await prepare(page, width);
    let before: string | null = null;
    for (const route of ['pipeline', 'sources', 'mission/fde', 'freelance', 'omscs/paths', 'practice/omscs/omscs-route',
      'practice/blueprint/blueprint-s1-1', 'practice/blueprint/blueprint-s4-7', 'dsa/50']) {
      await page.goto(`./#/${route}`);
      const heading = page.locator('#main-content .page-heading').first();
      await expect(heading.getByRole('heading', { level: 1 })).toBeVisible();
      if (route.startsWith('practice/')) {
        await expect(page.locator('#pack-unit-title')).toBeVisible();
        expect(await splitHeadingWords(page.locator('#pack-unit-title'))).toEqual([]);
      }
      before ??= await page.evaluate(key => localStorage.getItem(key), key);
      const geometry = await heading.evaluate(element => {
        const title = element.querySelector('h1')!.getBoundingClientRect();
        const controls = [...element.querySelectorAll<HTMLElement>('.page-heading-actions .button')].map(button => {
          const rect = button.getBoundingClientRect();
          return {
            left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
            overlap: Math.max(0, Math.min(title.right, rect.right) - Math.max(title.left, rect.left))
              * Math.max(0, Math.min(title.bottom, rect.bottom) - Math.max(title.top, rect.top)),
            overflow: button.scrollWidth - button.clientWidth,
          };
        });
        const help = element.querySelector('.context-help-trigger')?.getBoundingClientRect();
        return { controls, helpBottom: help?.bottom, titleTop: title.top };
      });
      for (const control of geometry.controls) {
        expect(control.left).toBeGreaterThanOrEqual(0);
        expect(control.right).toBeLessThanOrEqual(width);
        expect(control.overlap).toBe(0);
        expect(control.overflow).toBeLessThanOrEqual(2);
      }
      if (geometry.helpBottom !== undefined) expect(geometry.helpBottom).toBeLessThanOrEqual(geometry.titleTop + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
      expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
    }
  });
}

test('visual polish: tablet navigation stays out of the focus path until opened and Escape restores its trigger', async ({ page }) => {
  await prepare(page, 768);
  await page.goto('./#/pipeline');
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  const sidebar = page.getByRole('complementary', { name: 'Main navigation' });
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(sidebar).toBeHidden();
  expect(await page.locator('#main-content').evaluate(element => element.getBoundingClientRect().left)).toBe(0);
  await menu.click();
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  const atlas = sidebar.getByRole('link', { name: 'Discovery Atlas', exact: true });
  await atlas.focus();
  await atlas.press('Escape');
  await expect(sidebar).toBeHidden();
  await expect(menu).toBeFocused();
  await menu.click();
  await sidebar.getByRole('link', { name: 'Saved work', exact: true }).click();
  await expect(page).toHaveURL(/#\/evidence$/);
  await expect(sidebar).toBeHidden();
  await expect(page.locator('#main-content')).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

for (const width of [390, 1440]) {
  test(`visual polish: explicit lessons open reader-first while browsing remains available at ${width}px`, async ({ page }) => {
    await prepare(page, width);
    await page.goto('./#/practice/neural');
    await expect(page.locator('#pack-unit-title')).toBeVisible();
    const before = await page.evaluate(key => localStorage.getItem(key), key);
    const browser = page.locator('[data-tour="pack-browser"]');
    await expect(browser).toHaveAttribute('open', '');
    await page.getByRole('combobox', { name: 'Practice module or reference', exact: true }).selectOption('neural-agent-authority');
    await expect(page).toHaveURL(/#\/practice\/neural\/neural-agent-authority$/);
    await expect(browser).not.toHaveAttribute('open', '');
    await expect(page.locator('#pack-unit-title')).toBeInViewport({ ratio: .5 });
    await expect(page.locator('[data-tour="pack-unit-sources"]')).toBeVisible();
    await openLibraryBrowser(page);
    await expect(page.getByRole('searchbox', { name: 'Search this roadmap', exact: true })).toBeVisible();
    await page.getByRole('combobox', { name: 'Practice module or reference', exact: true }).selectOption('neural-agent-case-race');
    await expect(page.locator('.pack-reference-note')).toBeVisible();
    await page.reload();
    await expect(page.locator('#pack-unit-title')).toBeVisible();
    await expect(browser).not.toHaveAttribute('open', '');
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  });
}

test('visual polish: mission actions align to the bottom of their actual card row', async ({ page }) => {
  await prepare(page, 1440);
  await page.goto('./#/missions');
  const rows = await page.locator('.all-missions .mission-card').evaluateAll(cards => {
    const groups = new Map<number, number[]>();
    for (const card of cards) {
      const top = Math.round(card.getBoundingClientRect().top);
      const bottom = card.querySelector('.mission-card-bottom .icon-button')!.getBoundingClientRect().bottom;
      groups.set(top, [...(groups.get(top) ?? []), bottom]);
    }
    return [...groups.values()];
  });
  expect(rows.some(row => row.length > 1)).toBe(true);
  for (const row of rows) expect(Math.max(...row) - Math.min(...row)).toBeLessThan(1);
});

test('visual polish: ordinary dialogs keep full-width unfragmented titles at 320px', async ({ page }) => {
  await prepare(page, 320);
  let before: string | null = null;
  for (const [route, button] of [['evidence', 'Add evidence'], ['pipeline', 'Add opportunity'], ['perspective', 'Add a past accomplishment']] as const) {
    await page.goto(`./#/${route}`);
    before ??= await page.evaluate(key => localStorage.getItem(key), key);
    await page.getByRole('button', { name: button, exact: true }).click();
    const dialog = page.locator('dialog[open]');
    const heading = dialog.locator('.modal-header h2');
    await expect(heading).toBeVisible();
    expect(await splitHeadingWords(heading), route).toEqual([]);
    const geometry = await dialog.locator('.modal-header').evaluate(header => {
      const box = header.getBoundingClientRect(), title = header.querySelector('h2')!.getBoundingClientRect();
      const close = header.querySelector('button')!.getBoundingClientRect();
      return { headerWidth: box.width, titleWidth: title.width, titleTop: title.top, closeBottom: close.bottom };
    });
    expect(Math.abs(geometry.titleWidth - geometry.headerWidth)).toBeLessThan(1);
    expect(geometry.closeBottom).toBeLessThanOrEqual(geometry.titleTop);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  }
});

for (const width of [320, 390]) {
  test(`visual polish: academic help stays paired with its resume term at ${width}px`, async ({ page }) => {
    await prepare(page, width);
    let before: string | null = null;
    for (const route of ['omscs', 'omscs/specializations', 'mission/omscs', 'practice/omscs/omscs-route']) {
      await page.goto(`./#/${route}`);
      const basis = page.locator('[data-tour="academic-basis"]');
      await expect(basis).toBeVisible();
      before ??= await page.evaluate(key => localStorage.getItem(key), key);
      const term = (await basis.locator('.badge').boundingBox())!;
      const help = (await basis.getByRole('button', { name: 'About Academic basis', exact: true }).boundingBox())!;
      expect(Math.abs(term.y + term.height / 2 - help.y - help.height / 2)).toBeLessThan(1);
      expect(help.x).toBeGreaterThanOrEqual(term.x + term.width);
      expect(help.x + help.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
    }
  });
}

test('visual polish: compact focus preferences keep their shared help beside the controls', async ({ page }) => {
  await prepare(page, 320);
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => false }));
  await page.goto('./#/plan');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await page.locator('[data-tour="focus-room-open"]').click();
  const room = page.locator('dialog[data-tour="focus-room"][open]');
  await expect(room).toBeVisible();
  const controls = await room.locator('.focus-room__ambient').evaluateAll(labels => labels.map(label => {
    const rect = label.getBoundingClientRect();
    return { top: rect.top, bottom: rect.bottom, right: rect.right };
  }));
  expect(controls).toHaveLength(2);
  const help = (await room.getByRole('button', { name: 'About Focus room visuals', exact: true }).boundingBox())!;
  expect(help.x).toBeGreaterThanOrEqual(Math.max(...controls.map(control => control.right)));
  expect(help.y + help.height / 2).toBeGreaterThanOrEqual(Math.min(...controls.map(control => control.top)));
  expect(help.y + help.height / 2).toBeLessThanOrEqual(Math.max(...controls.map(control => control.bottom)));
  await room.getByRole('button', { name: 'Close focus room', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

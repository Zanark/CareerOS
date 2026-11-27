import { expect, test, type Page } from '@playwright/test';

const workspaceKey = 'careerhq.workspace.v1';

test.use({ timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' });

async function expectDate(page: Page, date: string, month: string, day: string, weekday: string) {
  const display = page.locator('.topbar-date');
  await expect(display).toBeVisible();
  await expect(display).toHaveAttribute('datetime', date);
  const narrow = (page.viewportSize()?.width ?? 1440) <= 760;
  await expect(display.locator('.topbar-date-month')).toHaveText(narrow ? month.slice(0, 3) : month, { useInnerText: true });
  await expect(display.locator('strong')).toHaveText(day);
  await expect(display.locator('.topbar-date-weekday')).toHaveText(narrow ? weekday.slice(0, 3) : weekday, { useInnerText: true });
  expect(await display.ariaSnapshot()).toContain(`Today, ${weekday}, ${month} ${day}, ${date.slice(0, 4)}`);
}

for (const theme of ['dark', 'light']) {
  test(`header date stays centered and readable beside existing controls in ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-30T06:30:00Z'));
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    await page.goto('./#/mission/fde');
    await expectDate(page, '2026-09-30', 'September', '30', 'Wednesday');
    const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
    for (const width of [2400, 2160, 2000, 1841, 1840, 1800, 1440, 1271, 1270, 1200, 1051, 1050, 768, 761, 760, 568, 481, 480, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const fallback of [false, true]) {
        const style = fallback ? await page.addStyleTag({ content: ':root { font-family: Arial, sans-serif; }' }) : null;
        const geometry = await page.locator('.topbar').evaluate(header => {
          const date = header.querySelector<HTMLElement>('.topbar-date')!;
          const box = (element: Element) => {
            const rect = element.getBoundingClientRect();
            return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, height: rect.height, center: rect.left + rect.width / 2 };
          };
          const overlap = (a: Element, b: Element) => {
            const x = box(a), y = box(b);
            return Math.max(0, Math.min(x.right, y.right) - Math.max(x.left, y.left))
              * Math.max(0, Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top));
          };
          return {
            header: box(header), date: box(date), core: box(date.querySelector('.calendar-core')!), day: box(date.querySelector('strong')!),
            month: box(date.querySelector('.topbar-date-month')!), weekday: box(date.querySelector('.topbar-date-weekday')!),
            overlaps: [overlap(date, header.querySelector('.breadcrumbs')!), overlap(date, header.querySelector('.top-actions')!)],
            text: [...date.querySelectorAll('.topbar-date-month, strong, .topbar-date-weekday')].map(element => ({
              overflow: element.scrollWidth - element.clientWidth,
              fontSize: parseFloat(getComputedStyle(element).fontSize),
              color: getComputedStyle(element).color,
            })),
          };
        });
        expect(geometry.header.height).toBe(width <= 760 ? 60 : 69);
        expect(geometry.core.height).toBe(50);
        expect(Math.abs(geometry.date.center - geometry.header.center)).toBeLessThan(1);
        expect(Math.abs(geometry.day.center - geometry.date.center)).toBeLessThan(1);
        expect(geometry.month.right).toBeLessThan(geometry.day.left);
        expect(geometry.day.right).toBeLessThan(geometry.weekday.left);
        expect(geometry.date.left).toBeGreaterThanOrEqual(geometry.header.left);
        expect(geometry.date.right).toBeLessThanOrEqual(geometry.header.right);
        expect(geometry.date.top).toBeGreaterThanOrEqual(geometry.header.top);
        expect(geometry.date.bottom).toBeLessThanOrEqual(geometry.header.bottom);
        expect(geometry.overlaps).toEqual([0, 0]);
        for (const text of geometry.text) {
          expect(text.overflow).toBeLessThanOrEqual(1);
          expect(text.fontSize).toBeGreaterThanOrEqual(width <= 760 ? 15 : 18);
        }
        expect(geometry.text[1].fontSize).toBe(27);
        const ink = theme === 'dark' ? 'rgb(147, 161, 161)' : 'rgb(53, 84, 81)';
        expect(geometry.text[0].color).toBe(ink);
        expect(geometry.text[2].color).toBe(ink);
        await expect(page.getByRole('switch', { name: 'Dark theme', exact: true })).toBeVisible();
        await expect(page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
        if (style) await style.evaluate(element => {
          if (!(element instanceof HTMLStyleElement)) throw new Error('Expected the injected font style element.');
          element.remove();
        });
      }
    }
    expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
  });
}

test('header date is one persistent display across normal routes without workspace writes', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
  await page.goto('./#/hq');
  await expectDate(page, '2026-11-27', 'November', '27', 'Friday');
  const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
  const original = await page.locator('.topbar-date').elementHandle();
  for (const [route, title] of [
    ['discoveries', 'Discovery Atlas'], ['perspective', 'Keep going'], ['home', 'Career graph'],
    ['missions', 'Missions'], ['mission/pattern', 'DSA'], ['roadmap', 'Roadmap'],
    ['plan', 'Daily plan'], ['evidence', 'Saved work'], ['history', 'History'],
    ['recall', 'Recall practice'], ['pipeline', 'Opportunities'], ['readiness', 'Interview readiness'],
    ['freelance', 'Freelance ledger'], ['sources', 'Operation documents'], ['settings', 'Settings & data'],
    ['repository-sync', 'Repository sync'], ['guide', 'Help & glossary'], ['dsa', 'DSA practice library'],
    ['system-concepts', 'System Design concepts'], ['system-practice', 'System Design problems'],
    ['practice/gamedev', 'Practice libraries'], ['omscs', 'Georgia Tech OMSCS'],
    ['omscs/paths', 'Georgia Tech OMSCS'], ['omscs/specializations', 'Georgia Tech OMSCS'],
    ['missing-page', 'Not found'],
  ]) {
    await page.evaluate(route => { location.hash = `/${route}`; }, route);
    await expect(page.locator('.breadcrumbs strong')).toHaveText(title);
    await expectDate(page, '2026-11-27', 'November', '27', 'Friday');
    expect(await original!.evaluate(element => element.isConnected)).toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
  }
});

for (const [timezoneId, date, day, weekday] of [
  ['Asia/Kolkata', '2026-11-27', '27', 'Friday'],
  ['America/Los_Angeles', '2026-11-26', '26', 'Thursday'],
] as const) {
  test.describe(timezoneId, () => {
    test.use({ timezoneId });
    test('header date uses the browser calendar day rather than the UTC date', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
      await page.goto('./#/hq');
      await expectDate(page, date, 'November', day, weekday);
    });
  });
}

async function beforeNewYear(page: Page) {
  await page.clock.install({ time: new Date('2026-12-31T18:28:00Z') });
  await page.clock.pauseAt(new Date('2026-12-31T18:29:50Z'));
  await page.goto('./#/hq');
  await expectDate(page, '2026-12-31', 'December', '31', 'Thursday');
}

test('header date follows the existing local midnight update across a month and year boundary', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await beforeNewYear(page);
  const previousPage = await page.locator('.calendar-page').elementHandle();
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), workspaceKey);
  await page.clock.runFor(30_000);
  await expectDate(page, '2027-01-01', 'January', '1', 'Friday');
  expect(await previousPage!.evaluate(element => element.isConnected)).toBe(false);
  const turns = await page.locator('.calendar-page').evaluate(element => element.getAnimations()
    .map(animation => ({ iterations: animation.effect!.getTiming().iterations, duration: animation.effect!.getTiming().duration })));
  expect(turns).toEqual([{ iterations: 1, duration: 650 }]);
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), workspaceKey);
  expect(after.plans['2027-01-01']).toBeDefined();
  expect({ ...after, plans: before.plans }).toEqual(before);
});

test('header date stays current in tutorial practice without changing saved workspace data', async ({ page }) => {
  await beforeNewYear(page);
  const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  await expectDate(page, '2026-12-31', 'December', '31', 'Thursday');
  await page.clock.runFor(30_000);
  await expectDate(page, '2027-01-01', 'January', '1', 'Friday');
  expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
});

test('header date leaves the career graph fitted below the actual responsive header', async ({ page }) => {
  await page.goto('./#/home');
  await expect(page.locator('.career-graph-stage')).toBeVisible();
  for (const width of [2000, 1440, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const layout = await page.locator('.career-graph-content').evaluate(main => ({
      top: main.getBoundingClientRect().top,
      bottom: main.getBoundingClientRect().bottom,
      headerBottom: document.querySelector('.topbar')!.getBoundingClientRect().bottom,
      stageHeight: main.querySelector('.career-graph-stage')!.getBoundingClientRect().height,
    }));
    expect(layout.top).toBe(layout.headerBottom);
    expect(layout.bottom).toBeLessThanOrEqual(900);
    expect(layout.stageHeight).toBeGreaterThan(160);
  }
});

for (const theme of ['dark', 'light']) {
  test(`compact header preserves date type and operable controls without consuming the page in ${theme}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-09-30T06:30:00Z'));
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    await page.goto('./#/mission/fde');
    const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
    for (const viewport of [
      { width: 320, height: 568 }, { width: 568, height: 320 },
      { width: 320, height: 844 }, { width: 390, height: 844 },
      { width: 768, height: 768 }, { width: 1050, height: 768 },
    ]) {
      await page.setViewportSize(viewport);
      await expectDate(page, '2026-09-30', 'September', '30', 'Wednesday');
      const geometry = await page.locator('.topbar').evaluate(header => {
        const box = (element: Element) => {
          const r = element.getBoundingClientRect();
          return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, height: r.height };
        };
        const date = header.querySelector('.topbar-date')!;
        const parts = ['.topbar-date-month', 'strong', '.topbar-date-weekday'].map(selector => date.querySelector(selector)!);
        const controls = ['.mobile-menu', '.theme-toggle', '.tutorial-launch', '.search-wrap'].map(selector => header.querySelector(selector)!);
        if (innerWidth > 480) controls.push(header.querySelector('.breadcrumbs strong')!);
        const overlap = (a: Element, b: Element) => {
          const x = box(a), y = box(b);
          return Math.max(0, Math.min(x.right, y.right) - Math.max(x.left, y.left))
            * Math.max(0, Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top));
        };
        return { header: box(header), date: box(date),
          overlaps: parts.flatMap(part => controls.map(control => overlap(part, control))),
          fonts: parts.map(part => Number.parseFloat(getComputedStyle(part).fontSize)),
          overflow: document.documentElement.scrollWidth - innerWidth };
      });
      expect(geometry.header.height).toBe(viewport.width <= 760 ? 60 : 69);
      expect(geometry.date.top).toBeGreaterThanOrEqual(geometry.header.top);
      expect(geometry.date.bottom).toBeLessThanOrEqual(geometry.header.bottom);
      expect(geometry.overlaps.every(area => area === 0)).toBe(true);
      expect(geometry.fonts[0]).toBeGreaterThanOrEqual(viewport.width <= 760 ? 15 : 18);
      expect(geometry.fonts[1]).toBe(27);
      expect(geometry.fonts[2]).toBeGreaterThanOrEqual(viewport.width <= 760 ? 15 : 18);
      expect(geometry.overflow).toBe(0);
      await expect(page.getByRole('switch', { name: 'Dark theme', exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true })).toBeInViewport({ ratio: 1 });
      const search = page.getByRole('textbox', { name: 'Search missions and evidence', exact: true });
      await search.focus();
      await expect(search).toBeFocused();
      const panelTop = await page.locator('.search-wrap').evaluate(element => element.getBoundingClientRect().top);
      expect(panelTop).toBeGreaterThanOrEqual(geometry.header.bottom);
      await page.keyboard.press('Escape');
    }
    await page.setViewportSize({ width: 320, height: 568 });
    await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
    await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
    await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
    expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
  });
}

test('Daily plan immediately follows Overview in desktop and compact navigation', async ({ page }) => {
  await page.goto('./#/hq');
  const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
    if (await menu.isVisible()) await menu.click();
    const tracking = page.locator('nav[aria-labelledby="tracking-nav-label"]');
    expect(await tracking.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')))).toEqual([
      '#/home', '#/perspective', '#/hq', '#/plan', '#/missions', '#/roadmap', '#/evidence', '#/history', '#/recall',
    ]);
    await tracking.getByRole('link', { name: 'Daily plan', exact: true }).click();
    await expect(page).toHaveURL(/#\/plan$/);
    await expect(page.getByRole('heading', { name: 'Daily plan', exact: true, level: 1 })).toBeVisible();
    if (await menu.isVisible()) await expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
  }
});

test('header date has one brief paper turn and then stays still across navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
  await page.goto('./#/hq');
  const calendar = page.locator('.header-calendar');
  const paper = page.locator('.calendar-page');
  await expect(paper).toBeVisible();
  const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
  const animations = () => calendar.evaluate(node => node.getAnimations({ subtree: true })
    .filter((animation): animation is CSSAnimation => animation instanceof CSSAnimation && animation.animationName.startsWith('calendar-'))
    .map(animation => ({ state: animation.playState, time: animation.currentTime, iterations: animation.effect!.getTiming().iterations })));
  expect((await animations()).map(animation => animation.iterations)).toEqual([1]);
  await expect.poll(async () => (await animations()).every(animation => animation.state === 'finished')).toBe(true);
  const original = await paper.elementHandle();
  const settled = await animations();
  const first = await calendar.screenshot({ animations: 'allow' });
  expect(first.equals(await calendar.screenshot({ animations: 'allow' }))).toBe(true);
  await page.evaluate(() => { location.hash = '/plan'; });
  await expect(page.locator('.breadcrumbs strong')).toHaveText('Daily plan');
  expect(await original!.evaluate(element => element.isConnected)).toBe(true);
  expect(await animations()).toEqual(settled);
  await page.getByRole('switch', { name: 'Dark theme', exact: true }).click();
  expect(await original!.evaluate(element => element.isConnected)).toBe(true);
  expect(await animations()).toEqual(settled);
  await expect(calendar.getByRole('button')).toHaveCount(0);
  await expectDate(page, '2026-11-27', 'November', '27', 'Friday');
  expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
});

test('header date paper turn respects reduced motion and keeps open drafts intact', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
  await page.goto('./#/evidence');
  const calendar = page.locator('.header-calendar');
  await expectDate(page, '2026-11-27', 'November', '27', 'Friday');
  expect(await calendar.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('.calendar-page')).toHaveCSS('animation-iteration-count', '1');
  await page.getByRole('button', { name: 'Add evidence', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await dialog.getByLabel('Artifact title').fill('Synthetic calendar motion draft');
  expect(await calendar.evaluate(node => node.getAnimations({ subtree: true }).every(animation => animation.playState === 'paused'))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await calendar.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(dialog.getByLabel('Artifact title')).toHaveValue('Synthetic calendar motion draft');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
});

test('header date paper has a gentle hover lift without moving its labels or changing data', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.clock.setFixedTime(new Date('2026-11-26T20:00:00Z'));
  await page.goto('./#/hq');
  const core = page.locator('.calendar-core');
  const paper = page.locator('.calendar-page');
  await paper.evaluate(element => Promise.all(element.getAnimations().map(animation => animation.finished)));
  const before = await page.evaluate(key => localStorage.getItem(key), workspaceKey);
  const top = (await core.boundingBox())!.y;
  const labels = () => page.locator('.topbar-date-month, .topbar-date-weekday').evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  const labelBounds = await labels();
  const shadow = await paper.evaluate(element => getComputedStyle(element).boxShadow);
  await core.hover();
  await expect.poll(async () => (await core.boundingBox())!.y).toBeLessThan(top - 1);
  await expect.poll(() => paper.evaluate(element => getComputedStyle(element).boxShadow)).not.toBe(shadow);
  expect(await labels()).toEqual(labelBounds);
  await expectDate(page, '2026-11-27', 'November', '27', 'Friday');
  await page.mouse.move(0, 0);
  await expect(core).toHaveCSS('transform', 'none');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await core.hover();
  await expect(core).toHaveCSS('transform', 'none');
  expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(before);
});

for (const theme of ['dark', 'light'] as const) {
  test(`header date uses a red top strip only on local Saturdays and Sundays in ${theme}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('careerhq.theme.v1', value), theme);
    const colors = theme === 'dark'
      ? { weekend: 'rgb(232, 74, 95)', weekday: 'rgb(0, 165, 145)' }
      : { weekend: 'rgb(173, 62, 85)', weekday: 'rgb(0, 111, 99)' };
    await page.goto('./#/hq');
    for (const [date, weekday, weekend] of [
      ['2026-11-27', 'Friday', false], ['2026-11-28', 'Saturday', true],
      ['2026-11-29', 'Sunday', true], ['2026-11-30', 'Monday', false],
    ] as const) {
      await page.clock.setFixedTime(new Date(`${date}T06:30:00Z`));
      await page.reload();
      await expectDate(page, date, 'November', date.slice(-2), weekday);
      await expect(page.locator('.header-calendar')).toHaveAttribute('data-weekend', String(weekend));
      expect(await page.locator('.calendar-page').evaluate(element => getComputedStyle(element, '::before').backgroundColor))
        .toBe(weekend ? colors.weekend : colors.weekday);
    }
  });
}

test('header date top strip changes automatically across local weekend boundaries', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-27T18:28:00Z') });
  await page.clock.pauseAt(new Date('2026-11-27T18:29:50Z'));
  await page.goto('./#/hq');
  const calendar = page.locator('.header-calendar');
  await expect(calendar).toHaveAttribute('data-weekend', 'false');
  await page.clock.fastForward(30_000);
  await expectDate(page, '2026-11-28', 'November', '28', 'Saturday');
  await expect(calendar).toHaveAttribute('data-weekend', 'true');
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await expectDate(page, '2026-11-29', 'November', '29', 'Sunday');
  await expect(calendar).toHaveAttribute('data-weekend', 'true');
  await page.clock.fastForward(24 * 60 * 60 * 1000);
  await expectDate(page, '2026-11-30', 'November', '30', 'Monday');
  await expect(calendar).toHaveAttribute('data-weekend', 'false');
});

import { expect, test, type Locator, type Page } from '@playwright/test';

const key = 'careerhq.workspace.v1';
const playlist = 'https://www.youtube.com/playlist?list=PLYw_q6Wu9DTU';
const linkName = 'Open cozy study cafe playlist on YouTube (new tab)';
const room = (page: Page) => page.locator('dialog[data-tour="focus-room"][open]');

test.use({ launchOptions: { args: ['--disable-webgl'] }, reducedMotion: 'reduce', timezoneId: 'Asia/Kolkata' });

async function prepare(page: Page, clock = false) {
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, get: () => false }));
  if (clock) {
    await page.clock.install({ time: new Date('2026-11-27T06:30:00Z') });
    await page.clock.pauseAt(new Date('2026-11-27T06:31:00Z'));
  } else await page.clock.setFixedTime(new Date('2026-11-27T06:31:00Z'));
  await page.goto('./#/plan');
  await expect(page.locator('[data-tour="focus-room-open"]')).toBeVisible();
}

async function raw(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), key);
}

async function assertPlaylist(link: Locator, origin: string) {
  await link.scrollIntoViewIfNeeded();
  await expect(link).toBeInViewport({ ratio: 1 });
  await expect(link).toHaveAccessibleName(linkName);
  await expect(link).toHaveAttribute('href', playlist);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /(?=.*noopener)(?=.*noreferrer)/);
  const image = await link.locator('img').evaluate(async element => {
    if (!(element instanceof HTMLImageElement)) throw new Error('Expected the supplied local thumbnail.');
    await element.decode();
    return { width: element.naturalWidth, height: element.naturalHeight, origin: new URL(element.currentSrc).origin };
  });
  expect(image.width).toBeGreaterThan(0);
  expect(image.height).toBeGreaterThan(0);
  expect(image.origin).toBe(origin);
  const bounds = await link.evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, right: rect.right, viewport: innerWidth, overflow: element.scrollWidth - element.clientWidth };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport);
  expect(bounds.overflow).toBeLessThanOrEqual(1);
}

async function stubPlaylist(page: Page) {
  await page.context().route('https://www.youtube.com/**', route => route.fulfill({
    status: 200, contentType: 'text/html',
    body: '<!doctype html><html><head><link rel="icon" href="data:,"></head><body>External playlist navigation fixture.</body></html>',
  }));
}

async function choosePlaylist(page: Page, link: Locator, keyboard = false) {
  await link.scrollIntoViewIfNeeded();
  const opening = page.waitForEvent('popup');
  if (keyboard) { await link.focus(); await link.press('Enter'); }
  else await link.locator('img').click();
  const popup = await opening;
  await expect(popup).toHaveURL(playlist);
  expect(await popup.evaluate(() => ({ noOpener: window.opener === null, referrer: document.referrer })))
    .toEqual({ noOpener: true, referrer: '' });
  await popup.close();
  await page.bringToFront();
}

for (const theme of ['dark', 'light'] as const) {
  test(`focus playlist stays local, readable and reachable in compact/full ${theme} layouts`, async ({ page, context, baseURL }) => {
    const origin = new URL(baseURL!).origin, external: string[] = [];
    context.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) external.push(request.url());
    });
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    await prepare(page);
    const before = await raw(page);
    for (const viewport of [
      { width: 1440, height: 1000 }, { width: 390, height: 844 },
      { width: 320, height: 568 }, { width: 568, height: 320 },
    ]) {
      await page.setViewportSize(viewport);
      await assertPlaylist(page.locator('[data-tour="focus-timer"] .focus-playlist'), origin);
      await page.locator('[data-tour="focus-room-open"]').click();
      await expect(room(page).locator('[data-tour="focus-room-time"]')).toBeInViewport({ ratio: 1 });
      await expect(room(page).locator('[data-tour="focus-room-distraction"]')).toBeInViewport({ ratio: 1 });
      const link = room(page).getByRole('link', { name: linkName, exact: true });
      await assertPlaylist(link, origin);
      await expect(link).toHaveCSS('color', 'rgb(238, 232, 213)');
      await expect(room(page).locator('[data-tour="focus-room-close"]')).toBeInViewport({ ratio: 1 });
      await room(page).locator('[data-tour="focus-room-close"]').click();
      expect(await raw(page)).toBe(before);
    }
    await expect(page.locator('iframe, audio, video')).toHaveCount(0);
    expect(external).toEqual([]);
  });
}

test('choosing focus music opens the supplied playlist without starting a session or changing data', async ({ page }) => {
  await prepare(page);
  await stubPlaylist(page);
  const before = await raw(page), url = page.url();
  await choosePlaylist(page, page.locator('[data-tour="focus-timer"] .focus-playlist'), true);
  expect(page.url()).toBe(url);
  expect(await raw(page)).toBe(before);
  await expect(page.locator('[data-tour="focus-start"]')).toHaveText('Start focus session');
  expect(JSON.parse((await raw(page))!).focusSessions).toBeUndefined();
});

test('compact and full-room playlist clicks retain the running timer, room and saved reports', async ({ page }) => {
  await prepare(page, true);
  await stubPlaylist(page);
  await page.locator('[data-tour="focus-start"]').click();
  await expect(page.locator('[data-tour="focus-timer"] [role="timer"]')).toHaveText('25:00');
  const before = await raw(page), url = page.url();
  await choosePlaylist(page, page.locator('[data-tour="focus-timer"] .focus-playlist'));
  await page.clock.runFor(2000);
  await expect(page.locator('[data-tour="focus-timer"] [role="timer"]')).toHaveText('24:58');
  expect(await raw(page)).toBe(before);
  await page.locator('[data-tour="focus-room-open"]').click();
  await choosePlaylist(page, room(page).getByRole('link', { name: linkName, exact: true }));
  await expect(room(page)).toBeVisible();
  await expect(room(page).locator('[data-tour="focus-room-stage"]')).toHaveAttribute('data-phase', 'running');
  await page.clock.runFor(2000);
  await expect(room(page).locator('[data-tour="focus-room-time"]')).toHaveText('24:56');
  expect(page.url()).toBe(url);
  expect(await raw(page)).toBe(before);
});

test('the optional playlist in tutorial focus never publishes practice into saved data', async ({ page }) => {
  await prepare(page);
  await stubPlaylist(page);
  const before = await raw(page);
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('focus-room');
  await page.locator('[data-tour="focus-room-open"]').click();
  await choosePlaylist(page, room(page).getByRole('link', { name: linkName, exact: true }), true);
  await expect(room(page)).toBeVisible();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  expect(await raw(page)).toBe(before);
});

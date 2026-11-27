import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';

type Theme = 'dark' | 'light';
const key = 'careerhq.workspace.v1';
const now = '2026-11-27T06:30:00Z', today = '2026-11-27';
const colors = {
  dark: { blocked: 'rgb(232, 74, 95)', clear: 'rgb(69, 208, 114)', paper: 'rgb(0, 30, 38)' },
  light: { blocked: 'rgb(173, 62, 85)', clear: 'rgb(36, 116, 73)', paper: 'rgb(252, 250, 242)' },
};

test.use({ timezoneId: 'Asia/Kolkata', reducedMotion: 'reduce' });

async function prepare(page: Page, theme: Theme = 'dark', savedBlocker = '') {
  const state = createInitialState(false);
  state.updatedAt = now;
  state.missions.pattern.blocker = savedBlocker;
  state.plans[today] = generatePlan(state, today);
  await page.clock.setFixedTime(new Date(now));
  await page.addInitScript(({ key, state, theme }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    localStorage.setItem('careerhq.theme.v1', theme);
  }, { key, state, theme });
  await page.goto('./#/mission/pattern');
  await expect(page.locator('[data-tour="blocker-input"]')).toHaveValue(savedBlocker);
}

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}

async function expectCard(page: Page, theme: Theme, blocked: boolean) {
  const card = page.locator('.mission-blocker-card');
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('data-blocked', String(blocked));
  await expect(card).toHaveCSS('border-top-color', blocked ? colors[theme].blocked : colors[theme].clear);
  await expect(card).not.toHaveCSS('background-color', colors[theme].paper);
  expect(await card.ariaSnapshot()).toContain(blocked ? 'Saved blocker' : 'No saved blocker');
  return card;
}

for (const theme of ['dark', 'light'] as const) {
  test(`saved blocker card turns red and clearing turns green without following unsaved drafts in ${theme}`, async ({ page }) => {
    await prepare(page, theme);
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const before = await stored(page);
      await expectCard(page, theme, false);
      const input = page.locator('[data-tour="blocker-input"]');
      await input.fill('  Fictional lab access needed for this checkpoint.  ');
      await expectCard(page, theme, false);
      expect((await stored(page)).missions.pattern.blocker).toBe('');
      await page.getByRole('button', { name: 'Save blocker', exact: true }).click();
      await expectCard(page, theme, true);
      expect((await stored(page)).missions.pattern.blocker).toBe('Fictional lab access needed for this checkpoint.');
      await expect(page.getByRole('button', { name: 'Record evidence', exact: true })).toBeDisabled();
      await page.reload();
      await expect(input).toHaveValue('Fictional lab access needed for this checkpoint.');
      await expectCard(page, theme, true);
      await input.fill('');
      await expectCard(page, theme, true);
      expect((await stored(page)).missions.pattern.blocker).not.toBe('');
      await page.getByRole('button', { name: 'Clear blocker', exact: true }).click();
      const card = await expectCard(page, theme, false);
      await expect(page.getByRole('button', { name: 'Record evidence', exact: true })).toBeEnabled();
      expect((await stored(page)).missions.pattern.blocker).toBe('');
      await card.scrollIntoViewIfNeeded();
      const layout = await card.evaluate(element => {
        const box = element.getBoundingClientRect();
        return {
          left: box.left, right: box.right,
          overflowing: [...element.querySelectorAll<HTMLElement>('textarea, button, .section-title')].filter(child => {
            const rect = child.getBoundingClientRect();
            return rect.left < box.left || rect.right > box.right;
          }).length,
        };
      });
      expect(layout.left).toBeGreaterThanOrEqual(0);
      expect(layout.right).toBeLessThanOrEqual(width);
      expect(layout.overflowing).toBe(0);
      const after = await stored(page);
      expect({ ...after, events: before.events, updatedAt: before.updatedAt }).toEqual(before);
      await page.reload();
      await expectCard(page, theme, false);
    }
  });
}

for (const initiallyBlocked of [false, true]) {
  test(`a failed ${initiallyBlocked ? 'clear keeps the saved red blocker' : 'save keeps the unsaved card green'}`, async ({ page }) => {
    const savedBlocker = initiallyBlocked ? 'Fictional saved blocker to preserve.' : '';
    await prepare(page, 'dark', savedBlocker);
    await expectCard(page, 'dark', initiallyBlocked);
    const before = await page.evaluate(key => localStorage.getItem(key), key);
    await page.evaluate(key => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException('Synthetic storage failure for blocker qualification.', 'QuotaExceededError');
        return original.call(this, name, value);
      };
    }, key);
    const draft = initiallyBlocked ? '' : 'Fictional unsaved blocker draft.';
    await page.locator('[data-tour="blocker-input"]').fill(draft);
    await page.getByRole('button', { name: initiallyBlocked ? 'Clear blocker' : 'Save blocker', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Not saved.');
    await expectCard(page, 'dark', initiallyBlocked);
    await expect(page.locator('[data-tour="blocker-input"]')).toHaveValue(draft);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  });
}

test('switching missions uses each saved blocker rather than the previous mission draft', async ({ page }) => {
  await prepare(page, 'dark', 'Fictional saved DSA blocker.');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  await page.locator('[data-tour="blocker-input"]').fill('');
  await expectCard(page, 'dark', true);
  await page.evaluate(() => { location.hash = '/mission/fabric'; });
  await expect(page.locator('[data-tour="blocker-input"]')).toHaveValue('');
  await expectCard(page, 'dark', false);
  await page.evaluate(() => { location.hash = '/mission/pattern'; });
  await expect(page.locator('[data-tour="blocker-input"]')).toHaveValue('Fictional saved DSA blocker.');
  await expectCard(page, 'dark', true);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test('a green clear-blocker card does not enable a planned mission', async ({ page }) => {
  await prepare(page);
  await page.goto('./#/mission/gamedev');
  await expectCard(page, 'dark', false);
  await expect(page.locator('[data-tour="blocker-input"]')).toBeDisabled();
  await expect(page.locator('[data-tour="blocker-submit"]')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Record evidence', exact: true })).toBeDisabled();
});

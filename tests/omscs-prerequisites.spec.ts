import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan } from '../src/domain/engine';

const key = 'careerhq.workspace.v1', day = '2026-11-20';

async function open(page: Page) {
  const state = createInitialState(false);
  state.updatedAt = `${day}T08:00:00Z`;
  state.plans[day] = generatePlan(state, day);
  state.omscsPlan = { startTerm: '2024-spring', includeSummer: false, courses: [
    { id: 'cs6457', term: '2022-spring', status: 'completed', grade: 'unrecorded' },
    { id: 'cs7632', term: '2022-summer', status: 'completed', grade: 'unrecorded' },
    { id: 'cs7637', term: '2022-fall', status: 'completed', grade: 'unrecorded' },
  ] };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date(`${day}T08:00:00Z`));
  await page.addInitScript(({ state, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { state, key });
  await page.goto('./#/omscs/paths');
  await expect(page.getByRole('heading', { name: 'Course choices', exact: true })).toBeVisible();
}

async function choose(page: Page, code: string) {
  await page.getByRole('searchbox', { name: 'Find a free elective', exact: true }).fill(code);
  await page.getByRole('checkbox', { name: `Choose ${code} as free elective`, exact: true }).check();
}

async function calendar(page: Page) {
  await page.getByRole('navigation', { name: 'Path explorer sections' }).getByRole('button', { name: 'Calendar', exact: true }).click();
}

async function raw(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), key);
}

for (const width of [1440, 320]) {
test(`a hard prerequisite precedes SDCC at heavy load and cannot be bypassed by choosing SDCC first at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 1000 });
  await open(page);
  const before = await raw(page);
  await page.getByRole('button', { name: 'Clear additional free choices', exact: true }).click();
  for (const code of ['CS 6200', 'CS 6210', 'CS 6211']) await choose(page, code);
  await calendar(page);
  await page.getByRole('combobox', { name: 'Courses per regular term', exact: true }).selectOption('2');
  const terms = await page.locator('[data-path-term]').evaluateAll(elements => elements.map(element =>
    [...element.querySelectorAll('[data-path-enrollment]')].map(course => course.getAttribute('data-path-enrollment'))));
  expect(terms.findIndex(ids => ids.includes('cs6210'))).toBeLessThan(terms.findIndex(ids => ids.includes('cs6211')));
  await expect(page.locator('.path-warnings')).toContainText('conditional on completing earlier CS 6210');
  await expect(page.locator('.path-warnings')).toContainText('mandatory weekly 90-minute live meetings');
  await page.getByRole('combobox', { name: 'First-term subject', exact: true }).selectOption('cs6211');
  await expect(page.getByRole('alert')).toContainText('cannot be the first term without prior approval');
  await expect(page.locator('[data-path-term]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset first-term suggestion', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('[data-path-term]')).toHaveCount(4);
  expect(await raw(page)).toBe(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});
}

test('an ordinary B is not silently treated as high B and confirmation stays tab-local without rewriting grades', async ({ page }) => {
  await open(page);
  const before = await raw(page);
  await page.getByRole('button', { name: 'Clear additional free choices', exact: true }).click();
  await page.getByRole('button', { name: 'Prior courses', exact: true }).click();
  await page.getByText('Add previously completed courses to this draft', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Previously completed course', exact: true }).selectOption('cs6210');
  await page.getByRole('textbox', { name: 'Completed term (optional)', exact: true }).fill('2023-fall');
  await page.getByRole('combobox', { name: 'Known final grade', exact: true }).selectOption('B');
  await page.getByRole('button', { name: 'Add completed course to draft', exact: true }).click();
  await choose(page, 'CS 6211');
  await expect(page.getByRole('alert')).toContainText('confirmed high B');
  await expect(page.locator('[data-path-term]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Review entry confirmations', exact: true }).click();
  await page.getByRole('checkbox', { name: 'My recorded CS 6210 B has been confirmed as the required high B for CS 6211.', exact: true }).check();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'First-term subject', exact: true }).selectOption('cs6211');
  await calendar(page);
  await expect(page.locator('[data-path-term]').first().locator('[data-path-enrollment]')).toHaveAttribute('data-path-enrollment', 'cs6211');
  await expect(page.locator('.path-history > article').filter({ hasText: 'CS 6210' })).toContainText('entered grade B');
  expect(await raw(page)).toBe(before);
  await page.reload();
  await expect(page.locator('.path-history > article')).toHaveCount(3);
  await expect(page.getByRole('combobox', { name: 'First-term subject', exact: true })).toHaveValue('');
  expect(await raw(page)).toBe(before);
});

test('deep learning calls out formal ML background without inventing a CS 7641-only registration lock', async ({ page }) => {
  await open(page);
  const before = await raw(page), budget = await page.locator('[data-tour="paths-budget"]').innerText();
  await page.getByRole('combobox', { name: 'First-term subject', exact: true }).selectOption('cs7643');
  await expect(page.locator('.path-warnings')).toContainText('self-study does not count');
  await calendar(page);
  await expect(page.locator('[data-path-term]').first().locator('[data-path-enrollment]')).toHaveAttribute('data-path-enrollment', 'cs7643');
  await page.locator('#paths-entry-checks > summary').click();
  await page.getByRole('checkbox', { name: 'I already completed other formal introductory ML coursework equivalent to CS 7641, not self-study.', exact: true }).check();
  await expect(page.locator('.path-warnings')).toHaveCount(0);
  await expect(page.locator('[data-tour="paths-first-term"] [data-course-entry-check="cs7643"]')).toHaveAttribute('data-entry-status', 'reported');
  expect(await page.locator('[data-tour="paths-budget"]').innerText()).toBe(budget);
  expect(await raw(page)).toBe(before);
});

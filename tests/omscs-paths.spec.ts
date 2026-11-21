import { expect, test as base, type Page } from '@playwright/test';
import { createInitialState, generatePlan } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { createAcademicStarter } from '../src/domain/omscs/starter';

const key = 'careerhq.workspace.v1', day = '2026-11-19';
const test = base.extend<{ healthy: void }>({
  healthy: [async ({ context }, use) => {
    const errors: string[] = [];
    const watch = (page: Page) => page.on('pageerror', error => errors.push(error.message));
    context.pages().forEach(watch); context.on('page', watch);
    await use();
    expect(errors).toEqual([]);
  }, { auto: true }],
});

function fixture() {
  const state = createInitialState(false);
  state.updatedAt = `${day}T10:00:00Z`;
  state.plans[day] = generatePlan(state, day);
  state.omscsPlan = {
    startTerm: '2024-spring', includeSummer: false,
    courses: [
      { id: 'cs6457', term: '2022-spring', status: 'completed', grade: 'unrecorded' },
      { id: 'cs7632', term: '2022-summer', status: 'completed', grade: 'unrecorded' },
      { id: 'cs7637', term: '2022-fall', status: 'completed', grade: 'unrecorded' },
    ],
  };
  return state;
}
async function seed(page: Page, state: AppState = fixture(), theme = 'dark') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date(`${day}T10:00:00Z`));
  await page.addInitScript(({ state, theme, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem('careerhq.theme.v1')) localStorage.setItem('careerhq.theme.v1', theme);
  }, { state, theme, key });
}
async function storage(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}
async function open(page: Page) {
  await page.goto('./#/omscs/paths');
  await expect(page.getByRole('heading', { name: 'Course choices', exact: true })).toBeVisible();
}
async function openBasis(page: Page) {
  const details = page.locator('#paths-history');
  if (!await details.evaluate((element: HTMLDetailsElement) => element.open)) await details.locator(':scope > summary').click();
}

for (const [width, theme] of [[1440, 'dark'], [390, 'dark'], [320, 'light']] as const) {
  test(`all course possibilities, source rules and readonly calendars work at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, fixture(), theme);
    await open(page);
    await expect(page.locator('.app')).not.toContainText(/geojack|GJ-/i);
    await expect(page.locator('.page-heading .eyebrow')).toContainText('GOLD CIRCUIT');
    const before = await storage(page);
    await openBasis(page);
    await expect(page.locator('[data-tour="paths-budget"]')).toContainText('7 courses');
    await expect(page.locator('[data-tour="paths-budget"]')).toContainText('21 credits');
    await expect(page.locator('.path-history > article')).toHaveCount(3);
    await expect(page.locator('.path-gap')).toContainText('3 consecutive terms');
    const options = page.locator('[data-tour="paths-all-options"]');
    await options.locator(':scope > summary').click();
    await expect(options).toContainText('830 distinct five-course combinations');
    await expect(options).toContainText('1,650 valid role allocations');
    await expect(options).toContainText('75 combinations');
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`paths-overview-${width}-${theme}.png`) });
    await page.getByRole('combobox', { name: 'AI rule comparison', exact: true }).selectOption('conservative');
    await expect(options).toContainText('216 distinct five-course combinations');
    await expect(options).toContainText('32 combinations');
    await page.getByRole('combobox', { name: 'AI rule comparison', exact: true }).selectOption('current');
    await page.getByRole('combobox', { name: 'Reuse completed courses', exact: true }).selectOption('all');
    await expect(options.locator('.path-option').first()).toBeVisible();
    const first = await page.locator('.path-options h3').first().innerText();
    await page.getByRole('button', { name: 'More paths', exact: true }).click();
    expect(await page.locator('.path-options h3').first().innerText()).not.toBe(first);
    await page.getByRole('searchbox', { name: 'Find specialization paths', exact: true }).fill('Natural Language');
    await expect(options).toContainText('matching combinations');
    expect(await page.locator('.path-options > article').count()).toBeGreaterThan(0);
    await noOverflow(page);
    await page.getByRole('searchbox', { name: 'Find a free elective', exact: true }).fill('Financial Modeling');
    await expect(page.locator('[data-path-course]')).toHaveCount(1);
    await expect(page.locator('[data-path-course]')).toHaveAttribute('data-path-course', 'mgt8813');
    await page.locator('[data-path-course]').getByRole('button', { name: 'About MGT 8813 course details', exact: true }).click();
    const courseHelp = page.getByRole('dialog', { name: 'MGT 8813 course details', exact: true });
    await expect(courseHelp).toContainText('complete course content has not been reviewed');
    await expect(courseHelp.getByRole('link', { name: 'Official course page', exact: true })).toHaveAttribute('href', 'https://omscs.gatech.edu/mgt-8813-financial-modeling');
    await courseHelp.getByRole('button', { name: 'Close MGT 8813 course details help', exact: true }).click();
    await page.getByRole('button', { name: 'Clear additional free choices', exact: true }).click();
    await expect(page.locator('.path-selected > div')).toHaveCount(0);
    await expect(page.getByRole('checkbox', { name: 'Choose MGT 8813 as free elective', exact: true })).toBeEnabled();
    await page.getByText('Try a capability-oriented starting point', { exact: true }).click();
    await page.getByRole('button', { name: 'Preview AI engineering + systems', exact: true }).click();
    await expect(page.locator('.path-selected > div')).toHaveCount(4);
    await noOverflow(page);
    const calendar = page.locator('[data-tour="paths-calendar"]');
    await page.getByRole('navigation', { name: 'Path explorer sections' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('[data-path-term]')).toHaveCount(7);
    await expect(calendar).toContainText('10 of 10 subjects chosen / 30 of 30 credits planned');
    await expect(calendar).toContainText('not earned credit');
    await page.getByRole('checkbox', { name: 'Include later summers', exact: true }).check();
    await expect(page.locator('[data-path-term]').last()).toHaveAttribute('data-path-term', '2026-spring');
    await page.getByRole('combobox', { name: 'Courses per regular term', exact: true }).selectOption('2');
    await expect(page.locator('[data-path-term]')).toHaveCount(4);
    await expect(page.locator('.path-warnings')).toContainText('heavy what-if pace');
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`paths-calendar-${width}-${theme}.png`) });
    expect(await storage(page)).toEqual(before);
    await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
  });
}

test('duplicate subjects and current/catalog differences remain visible without silently discarding free choices', async ({ page }) => {
  await seed(page); await open(page);
  const before = await storage(page);
  await page.getByRole('combobox', { name: 'First AI-core course', exact: true }).selectOption('cs7641');
  await expect(page.getByRole('alert')).toContainText('five different courses');
  await expect(page.locator('.path-selected > div')).toHaveCount(4);
  await page.getByRole('combobox', { name: 'First AI-core course', exact: true }).selectOption('cs7637');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('combobox', { name: 'First AI-core course', exact: true }).selectOption('cs6476');
  await page.getByRole('combobox', { name: 'AI rule comparison', exact: true }).selectOption('conservative');
  await expect(page.getByRole('alert')).toContainText('AI-core courses must be allowed');
  await expect(page.locator('.path-selected > div')).toHaveCount(4);
  expect(await storage(page)).toEqual(before);
});

test('free electives obey the non-CS/CSE cap and a failed calendar edit keeps the prior proposal', async ({ page }) => {
  await seed(page); await open(page);
  const before = await storage(page), query = page.getByRole('searchbox', { name: 'Find a free elective', exact: true });
  for (const code of ['CS 6200', 'CS 7210']) await page.getByRole('button', { name: `Remove ${code} from free electives`, exact: true }).click();
  for (const [name, code] of [['Bayesian Statistics', 'ISYE 6420'], ['Data Analytics & Security', 'INTA 6450']]) {
    await query.fill(name);
    await page.getByRole('checkbox', { name: `Choose ${code} as free elective`, exact: true }).check();
  }
  await page.getByRole('button', { name: 'Remove CS 7295 from free electives', exact: true }).click();
  await query.fill('Digital Marketing');
  await expect(page.getByRole('checkbox', { name: 'Choose MGT 6311 as free elective', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Remove ISYE 6420 from free electives', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Choose MGT 6311 as free elective', exact: true })).toBeEnabled();
  await page.getByRole('checkbox', { name: 'Choose MGT 6311 as free elective', exact: true }).check();
  await openBasis(page);
  await page.getByRole('spinbutton', { name: 'Return year', exact: true }).fill('2020');
  await page.getByRole('button', { name: 'Apply draft return', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('before the proposed return semester');
  await expect(page.locator('[data-path-term]').first()).toHaveAttribute('data-path-term', '2024-spring');
  expect(await storage(page)).toEqual(before);
});

test('production ignores development-only private context and retains the authorized public academic starter', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.route('**/CareerOS/', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('</head>', '<script type="application/json" id="omscs-private-planning-context">{not-json}</script></head>') });
  });
  await open(page);
  await expect(page.locator('.path-history > article')).toHaveCount(3);
  await expect(page.locator('[data-tour="paths-budget"]')).toContainText('7 courses');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).omscsPlan, key)).toEqual(createAcademicStarter());
  await page.getByRole('button', { name: 'About Course choices', exact: true }).click();
  const help = page.getByRole('dialog', { name: 'Course choices', exact: true });
  await expect(help).not.toContainText('Supplied private local preview');
  await help.getByRole('button', { name: 'Close Course choices help', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('a missing optional path chunk fails explicitly and reload recovers without replacing the workspace', async ({ page }) => {
  await seed(page);
  await page.goto('./#/hq');
  const before = await storage(page);
  await page.route('**/assets/OmscsPathsPage-*.js', route => route.abort());
  await page.goto('./#/omscs/paths');
  await expect(page.getByRole('alert')).toContainText('Course paths could not be loaded');
  expect(await storage(page)).toEqual(before);
  await page.unroute('**/assets/OmscsPathsPage-*.js');
  await page.getByRole('button', { name: 'Reload path explorer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Course choices', exact: true })).toBeVisible();
  expect(await storage(page)).toEqual(before);
});

for (const [width, theme] of [[390, 'dark'], [320, 'light']] as const) {
  test(`an explicit empty phone profile can privately set its basis, understand subject fit and note a shortlist at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const empty = createInitialState(false);
    empty.omscsPlan = { ...createAcademicStarter(), courses: [] };
    await seed(page, empty, theme);
    await open(page);
    const before = await storage(page);
    await expect(page.locator('.page-heading > div > p')).toHaveCount(0);
    await expect(page.getByRole('combobox', { name: 'First-term subject', exact: true })).toBeInViewport({ ratio: 1 });
    await expect(page.locator('[data-tour="paths-all-options"]')).not.toHaveAttribute('open', '');
    await page.screenshot({ path: testInfo.outputPath(`phone-start-${width}-${theme}.png`) });
    await page.getByRole('button', { name: 'Prior courses', exact: true }).click();
    await page.getByRole('spinbutton', { name: 'Return year', exact: true }).fill('2024');
    await page.getByRole('button', { name: 'Apply draft return', exact: true }).click();
    for (const [id, term] of [['cs6457', '2022-spring'], ['cs7632', '2022-summer'], ['cs7637', '2022-fall']]) {
      await page.getByRole('combobox', { name: 'Previously completed course', exact: true }).selectOption(id);
      await page.getByRole('textbox', { name: 'Completed term (optional)', exact: true }).fill(term);
      await page.getByRole('button', { name: 'Add completed course to draft', exact: true }).click();
    }
    await expect(page.locator('[data-tour="paths-budget"]')).toContainText('7 courses');
    await expect(page.locator('.path-history > article')).toHaveCount(3);
    await expect(page.locator('.path-selected > div')).toHaveCount(4);
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.getByRole('checkbox', { name: 'I have confirmed my readmission / return approval', exact: true }).check();
    await expect(page.locator('[data-tour="paths-return-confirmed"]')).toContainText('Return confirmed / self-reported');
    await expect(page.locator('.path-gap .alert')).toHaveCount(0);
    await expect(page.getByRole('status').filter({ hasText: 'Readmission check /' })).toHaveCount(0);
    await noOverflow(page);
    await page.getByRole('button', { name: 'AI subjects', exact: true }).click();
    const design = page.getByRole('combobox', { name: 'Algorithms/design course', exact: true });
    const value = await design.inputValue();
    await page.getByRole('combobox', { name: 'Career direction', exact: true }).selectOption('fde');
    await expect(design).toHaveValue(value);
    await design.selectOption('cs6300');
    await expect(page.locator('[data-path-fit="cs6300"]')).toContainText('Direct support');
    await page.locator('[data-path-fit="cs6300"]').getByRole('button', { name: 'About CS 6300 course details', exact: true }).click();
    const fitHelp = page.getByRole('dialog', { name: 'CS 6300 course details', exact: true });
    await expect(fitHelp).toContainText('Tradeoff');
    await expect(fitHelp.locator('.path-roadmap-links a').first()).toHaveAttribute('href', '#/mission/blueprint');
    await expect(fitHelp.locator('.path-roadmap-links a').first()).toHaveAttribute('target', '_blank');
    await page.locator('[data-path-fit="cs6300"]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`phone-career-fit-${width}-${theme}.png`) });
    await fitHelp.getByRole('button', { name: 'Close CS 6300 course details help', exact: true }).click();
    await page.getByRole('searchbox', { name: 'Find a free elective', exact: true }).fill('Financial Modeling');
    await page.getByRole('combobox', { name: 'Filter by career fit', exact: true }).selectOption('Direct support');
    await expect(page.locator('[data-path-course]')).toHaveCount(0);
    await page.getByRole('combobox', { name: 'Filter by career fit', exact: true }).selectOption('');
    await expect(page.locator('[data-path-course]')).toHaveCount(1);
    await page.getByRole('combobox', { name: 'First-term subject', exact: true }).selectOption('cs6200');
    await expect(page.locator('[data-tour="paths-first-term"] h3')).toContainText('CS 6200');
    await page.getByRole('navigation', { name: 'Path explorer sections' }).getByRole('button', { name: 'Calendar', exact: true }).click();
    await expect(page.locator('[data-path-term]').first()).toContainText('CS 6200');
    await page.getByRole('button', { name: 'My shortlist', exact: true }).click();
    const shortlist = page.locator('[data-tour="paths-shortlist"]');
    await expect(shortlist).toContainText('7 new subjects');
    await expect(shortlist.locator('.path-shortlist > li')).toHaveCount(7);
    await expect(shortlist.locator('.path-shortlist')).toContainText('Software Development Process');
    await expect(shortlist.locator('.path-shortlist')).not.toContainText('Video Game Design');
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`phone-shortlist-${width}-${theme}.png`) });
    await shortlist.getByText('Plain-text shortlist to select and copy', { exact: true }).click();
    await shortlist.getByRole('button', { name: 'Select shortlist text', exact: true }).click();
    const notes = shortlist.getByRole('textbox', { name: 'Subject shortlist for review notes', exact: true });
    await expect(notes).toHaveValue(/CS 6300 - Software Development Process/);
    expect(await notes.evaluate((element: HTMLTextAreaElement) => element.selectionStart === 0 && element.selectionEnd === element.value.length)).toBe(true);
    expect(await storage(page)).toEqual(before);
    await page.reload();
    await expect(page.locator('.path-history > article')).toHaveCount(0);
    await expect(page.locator('.path-shortlist > li')).toHaveCount(10);
    expect(await storage(page)).toEqual(before);
  });
}

test('invalid draft history preserves the last basis and failed attempts never reduce the passing-course budget', async ({ page }) => {
  await seed(page); await open(page);
  const before = await storage(page);
  await openBasis(page);
  const editor = page.locator('.path-baseline-editor');
  await editor.locator(':scope > summary').click();
  await page.getByRole('combobox', { name: 'Previously completed course', exact: true }).selectOption('cs6200');
  await page.getByRole('textbox', { name: 'Completed term (optional)', exact: true }).fill('2025-spring');
  await page.getByRole('button', { name: 'Add completed course to draft', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('before the proposed return semester');
  await expect(page.locator('.path-history > article')).toHaveCount(3);
  await page.getByRole('textbox', { name: 'Completed term (optional)', exact: true }).fill('2023-fall');
  await page.getByRole('combobox', { name: 'Known final grade', exact: true }).selectOption('F');
  await page.getByRole('button', { name: 'Add completed course to draft', exact: true }).click();
  await expect(editor.getByRole('status')).toContainText('do not reduce');
  await expect(page.locator('.path-history > article')).toHaveCount(4);
  await expect(page.locator('[data-tour="paths-budget"]')).toContainText('7 courses');
  await expect(page.locator('.path-selected')).toContainText('CS 6200');
  await expect(page.locator('.path-shortlist')).toContainText('CS 6200');
  await page.getByRole('button', { name: 'Remove CS 6200 from draft history', exact: true }).click();
  await expect(page.locator('.path-history > article')).toHaveCount(3);
  expect(await storage(page)).toEqual(before);
});

test('a confirmed return does not demand another application and a now-prior first subject must be deliberately replaced', async ({ page }) => {
  await seed(page); await open(page);
  const before = await storage(page);
  await openBasis(page);
  await page.getByRole('checkbox', { name: 'I have confirmed my readmission / return approval', exact: true }).check();
  await expect(page.locator('[data-tour="paths-return-confirmed"]')).toBeVisible();
  await expect(page.locator('[data-tour="paths-budget"]')).toContainText('7 courses');
  await page.getByRole('combobox', { name: 'First-term subject', exact: true }).selectOption('cs6200');
  await expect(page.locator('[data-path-term]').first()).toContainText('CS 6200');
  const editor = page.locator('.path-baseline-editor');
  await editor.locator(':scope > summary').click();
  await page.getByRole('combobox', { name: 'Previously completed course', exact: true }).selectOption('cs6200');
  await page.getByRole('textbox', { name: 'Completed term (optional)', exact: true }).fill('2023-fall');
  await page.getByRole('combobox', { name: 'Known final grade', exact: true }).selectOption('B');
  await page.getByRole('button', { name: 'Add completed course to draft', exact: true }).click();
  await expect(page.locator('[data-tour="paths-first-term"]').getByRole('alert')).toContainText('no longer a selected new subject');
  await expect(page.locator('[data-path-term]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reset first-term suggestion', exact: true }).click();
  await expect(page.locator('[data-path-term]')).toHaveCount(6);
  await expect(page.locator('.path-shortlist')).not.toContainText('CS 6200');
  expect(await storage(page)).toEqual(before);
});

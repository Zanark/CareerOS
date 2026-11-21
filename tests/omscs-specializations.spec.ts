import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan } from '../src/domain/engine';
import { ACADEMIC_STARTER_KEY, ACADEMIC_STARTER_VERSION, createAcademicStarter } from '../src/domain/omscs/starter';
import { omscsSpecializations, specializationCourseIds } from '../src/domain/omscs/specializations';
import { pathCourse, pathCourses } from '../src/domain/omscs/paths/catalog';
import type { AppState } from '../src/domain/types';

const key = 'careerhq.workspace.v1', day = '2026-11-20';
async function prepare(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date(`${day}T08:00:00Z`));
}
async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}
async function expand(page: Page, id: string) {
  const section = page.locator(`[data-specialization="${id}"]`);
  if (!await section.evaluate((element: HTMLDetailsElement) => element.open)) await section.locator(':scope > summary').click();
  return section;
}
async function seed(page: Page, state: AppState) {
  state.plans[day] = generatePlan(state, day);
  await page.addInitScript(({ state, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { state, key });
}
async function importWorkspace(page: Page, state: AppState) {
  await page.goto('./#/settings');
  const confirmation = page.waitForEvent('dialog').then(dialog => dialog.accept());
  await page.locator('[data-tour="backup-input"]').setInputFiles({
    name: 'synthetic-academic-workspace.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(state)),
  });
  await confirmation;
  await expect.poll(() => stored(page)).toEqual(state);
}

for (const [width, theme] of [[1440, 'dark'], [320, 'light']] as const) {
  test(`all six online sections share completed green rows and grade-aware credit at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await prepare(page);
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    await page.goto('./#/omscs/specializations');
    await expect(page.getByRole('heading', { name: 'Degree paths', exact: true })).toBeVisible();
    const starter = createAcademicStarter(), before = await stored(page);
    expect(before.omscsPlan).toEqual(starter);
    await expect(page.locator('[data-specialization]')).toHaveCount(6);
    for (const specialization of omscsSpecializations) {
      const section = await expand(page, specialization.id);
      const rows = section.locator('.specialization-completed .academic-course-row');
      await expect(rows).toHaveCount(3);
      for (const entry of starter.courses) {
        const actual = section.locator(`.specialization-completed [data-academic-course="${entry.id}"]`);
        await expect(actual).toHaveClass(/academic-course-completed/);
        await expect(actual).toContainText(`Completed / ${entry.grade}`);
        const colors = await actual.evaluate(element => ({
          border: getComputedStyle(element).borderTopColor,
          shadow: getComputedStyle(element).boxShadow,
        }));
        const [red, green, blue] = colors.border.match(/\d+/g)!.map(Number);
        expect(green).toBeGreaterThan(red);
        expect(green).toBeGreaterThan(blue);
        expect(colors.shadow).not.toBe('none');
        expect(await actual.evaluate(element => element.getAnimations().length)).toBe(0);
      }
      await expect(section.locator('.specialization-completed [data-academic-course="cs7637"]')).toContainText('free-elective credit only');
      const ids = await section.locator('[data-requirement-group] [data-academic-course]').evaluateAll(elements => elements.map(element => element.getAttribute('data-academic-course')));
      expect(ids.every(id => pathCourses.some(course => course.id === id))).toBe(true);
      expect([...new Set(ids)].sort()).toEqual(specializationCourseIds(specialization).sort());
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await page.screenshot({ path: testInfo.outputPath(`six-specializations-${width}-${theme}.png`) });
    expect(await stored(page)).toEqual(before);
    await page.reload();
    expect((await stored(page)).omscsPlan).toEqual(starter);
    expect((await stored(page)).missions).toEqual(before.missions);
    expect((await stored(page)).evidence).toEqual([]);
    await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
  });
}

test('one shared academic edit updates every specialization and survives reload/export without learning credit', async ({ page }) => {
  await prepare(page);
  await page.goto('./#/omscs/specializations');
  const before = await stored(page);
  const hci = await expand(page, 'hci');
  await hci.locator('[data-requirement-group="mobile"]').getByRole('button', { name: 'Record CS 7470', exact: true }).click();
  const dialog = page.locator('dialog.omscs-entry-modal');
  await dialog.getByRole('combobox', { name: 'Course status', exact: true }).selectOption('completed');
  await dialog.getByRole('combobox', { name: 'Final grade', exact: true }).selectOption('B');
  await dialog.getByLabel('Course semester (optional)', { exact: true }).fill('2026-fall');
  await dialog.getByRole('checkbox', { name: /I confirm this is a self-reported/ }).check();
  await dialog.getByRole('button', { name: 'Save course entry', exact: true }).click();
  for (const spec of omscsSpecializations) {
    const section = await expand(page, spec.id);
    await expect(section.locator('.specialization-completed [data-academic-course="cs7470"]')).toHaveClass(/academic-course-completed/);
  }
  const saved = await stored(page);
  expect(saved.omscsPlan?.courses.find(row => row.id === 'cs7470')).toMatchObject({ status: 'completed', grade: 'B', term: '2026-fall' });
  for (const field of ['missions', 'evidence', 'recalls', 'readiness', 'plans'] as const) expect(saved[field]).toEqual(before[field]);
  await page.reload();
  expect((await stored(page)).omscsPlan).toEqual(saved.omscsPlan);
  await page.goto('./#/settings');
  const downloading = page.waitForEvent('download');
  await page.locator('[data-tour="backup-export"]').click();
  const stream = await (await downloading).createReadStream(), chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString()).omscsPlan).toEqual(saved.omscsPlan);
  await page.goto('./#/omscs/specializations');
  await page.locator('[data-tour="omscs-record-cs7470"]').first().click();
  await dialog.getByRole('combobox', { name: 'Final grade', exact: true }).selectOption('C');
  await dialog.getByRole('checkbox', { name: /I confirm this is a self-reported/ }).check();
  await dialog.getByRole('button', { name: 'Save course entry', exact: true }).click();
  expect((await stored(page)).omscsPlan).not.toEqual(saved.omscsPlan);
  await importWorkspace(page, saved);
  await page.reload();
  expect(await stored(page)).toEqual(saved);
});

test('saved grades drive a legal AI proposal and seven future course semesters from the shared resume term', async ({ page }) => {
  await prepare(page);
  await page.goto('./#/omscs/paths');
  await expect(page.getByRole('combobox', { name: 'First AI-core course', exact: true })).toHaveValue('cs7641');
  await expect(page.getByRole('combobox', { name: 'Second AI-core course', exact: true })).toHaveValue('cs7643');
  const first = page.getByRole('combobox', { name: 'First-term subject', exact: true });
  const options = await first.locator('option').evaluateAll(nodes => nodes.map(node => node.getAttribute('value') ?? ''));
  for (const row of createAcademicStarter().courses) expect(options).not.toContain(row.id);
  await expect(page.locator('[data-tour="paths-budget"]')).toContainText('7 courses');
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.locator('[data-path-term]')).toHaveCount(7);
  await expect(page.locator('[data-path-term]').first()).toHaveAttribute('data-path-term', createAcademicStarter().startTerm);
  await page.goto('./#/omscs');
  await expect(page.locator('[data-tour="omscs-credit-summary"] strong').nth(1)).toHaveText('9 / 30');
  await expect(page.locator('[data-omscs-term]')).toHaveCount(7);
  await expect(page.locator('[data-omscs-term]').first()).toHaveAttribute('data-omscs-term', createAcademicStarter().startTerm);
  await expect(page.locator('[data-tour="academic-completed"] [data-academic-course]')).toHaveCount(3);
  for (const row of createAcademicStarter().courses) {
    await expect(page.locator('[data-omscs-term]').filter({ hasText: pathCourse(row.id).title })).toHaveCount(0);
  }
  for (const route of ['mission/omscs', 'practice/omscs']) {
    await page.goto(`./#/${route}`);
    await expect(page.locator('[data-tour="academic-basis"]')).toContainText('Spring 2027');
  }
  expect(Object.values((await stored(page)).missions).every(mission => mission.completedCheckpointIds.length === 0)).toBe(true);
});

test('an absent legacy academic profile initializes once, while an explicit empty/custom profile remains authoritative', async ({ page }) => {
  await prepare(page);
  const state = createInitialState(false); delete state.omscsPlan;
  state.plans[day] = generatePlan(state, day);
  await page.addInitScript(({ state, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { state, key });
  await page.goto('./#/omscs/specializations');
  await expect(page.locator('[data-specialization="ai"] .specialization-completed [data-academic-course]')).toHaveCount(3);
  const initialized = await stored(page);
  for (const field of ['missions', 'evidence', 'events', 'recalls', 'plans', 'updatedAt'] as const) expect(initialized[field]).toEqual(state[field]);
  await page.evaluate(key => {
    const current = JSON.parse(localStorage.getItem(key)!);
    current.omscsPlan = { startTerm: '2028-fall', includeSummer: false, courses: [] };
    localStorage.setItem(key, JSON.stringify(current));
  }, key);
  await page.reload();
  await expect(page.locator('[data-tour="academic-basis"]')).toContainText('Fall 2028');
  await expect(page.locator('[data-specialization="ai"] .specialization-completed [data-academic-course]')).toHaveCount(0);
  expect((await stored(page)).omscsPlan?.courses).toEqual([]);
});

test('a confirmed import can remove academic history without the initialization marker recreating it', async ({ page }) => {
  await prepare(page);
  await page.goto('./#/omscs/specializations');
  const imported = await stored(page);
  delete imported.omscsPlan;
  await importWorkspace(page, imported);
  await page.reload();
  expect(await stored(page)).toEqual(imported);
  expect(await page.evaluate(key => localStorage.getItem(key), ACADEMIC_STARTER_KEY)).toBe(ACADEMIC_STARTER_VERSION);
  await page.goto('./#/omscs/specializations');
  await expect(page.locator('.specialization-completed [data-academic-course]')).toHaveCount(0);
});

test('a blocked initialization preference preserves the saved workspace and reports the incomplete preference write', async ({ page }) => {
  await prepare(page);
  await page.addInitScript(marker => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (name === marker) throw new DOMException('Synthetic initialization preference failure', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, ACADEMIC_STARTER_KEY);
  await page.goto('./#/omscs/specializations');
  await expect(page.getByRole('heading', { name: 'Degree paths', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Synthetic initialization preference failure');
  const saved = await stored(page);
  expect(saved.omscsPlan).toEqual(createAcademicStarter());
  expect(saved.evidence).toEqual([]);
  expect(await page.evaluate(key => localStorage.getItem(key), ACADEMIC_STARTER_KEY)).toBeNull();
  await page.reload();
  expect(await stored(page)).toEqual(saved);
  await expect(page.getByRole('alert')).toContainText('Existing records are retained');
});

test('an invalid initialization marker does not overwrite the original workspace', async ({ page }) => {
  await prepare(page);
  const state = createInitialState(false);
  await seed(page, state);
  await page.addInitScript(marker => localStorage.setItem(marker, 'invalid-test-version'), ACADEMIC_STARTER_KEY);
  await page.goto('./#/omscs/specializations');
  await expect(page.getByText(/academic-start initialization setting is invalid/)).toBeVisible();
  expect(await stored(page)).toEqual(state);
});

test('reviewed history cancels exactly, preserves other coursework and rejects a stale competing update', async ({ page, context }) => {
  await prepare(page);
  const state = createInitialState(false);
  state.omscsPlan = { startTerm: '2028-fall', includeSummer: true, courses: [
    { id: 'cs7637', term: '2024-fall', status: 'completed', grade: 'B' },
    { id: 'cs7470', term: '2024-spring', status: 'completed', grade: 'A' },
  ] };
  await seed(page, state);
  await page.goto('./#/omscs');
  const before = await stored(page);
  const open = page.getByRole('button', { name: 'Review provided academic history', exact: true });
  await open.click();
  const review = page.getByRole('dialog', { name: 'Use the provided academic history?', exact: true });
  await expect(review.getByRole('button', { name: 'Apply reviewed academic history', exact: true })).toBeDisabled();
  await review.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await stored(page)).toEqual(before);
  await open.click();
  await review.getByRole('checkbox', { name: /I reviewed the academic changes/ }).check();
  await review.getByRole('button', { name: 'Apply reviewed academic history', exact: true }).click();
  await expect(review).toHaveCount(0);
  const applied = await stored(page);
  expect(applied.omscsPlan?.courses).toEqual([before.omscsPlan!.courses[1], ...createAcademicStarter().courses]);
  expect(applied.omscsPlan?.startTerm).toBe(createAcademicStarter().startTerm);
  expect(applied.omscsPlan?.includeSummer).toBe(true);
  for (const field of ['missions', 'evidence', 'recalls', 'readiness', 'plans'] as const) expect(applied[field]).toEqual(before[field]);
  await open.click();
  await review.getByRole('checkbox', { name: /I reviewed the academic changes/ }).check();
  const other = await context.newPage();
  try {
    await prepare(other);
    await other.goto('./#/omscs');
    await other.locator('[data-tour="omscs-record-cs7470"]').click();
    const entry = other.locator('dialog.omscs-entry-modal');
    await entry.getByRole('combobox', { name: 'Final grade', exact: true }).selectOption('B');
    await entry.getByRole('checkbox', { name: /I confirm this is a self-reported/ }).check();
    await entry.getByRole('button', { name: 'Save course entry', exact: true }).click();
    const newer = await stored(other);
    await review.getByRole('button', { name: 'Apply reviewed academic history', exact: true }).click();
    await expect(review.getByRole('alert')).toContainText('Academic changes were not saved');
    expect(await stored(page)).toEqual(newer);
  } finally { await other.close(); }
});

test('reviewed history cannot silently exceed the ten-course ledger limit', async ({ page }) => {
  await prepare(page);
  const state = createInitialState(false), starter = createAcademicStarter();
  state.omscsPlan = { startTerm: '2028-fall', includeSummer: false,
    courses: pathCourses.filter(course => !starter.courses.some(row => row.id === course.id)).slice(0, 10)
      .map(course => ({ id: course.id, term: '', status: 'planned', grade: 'unrecorded' })) };
  await seed(page, state);
  await page.goto('./#/omscs');
  const before = await stored(page);
  await page.getByRole('button', { name: 'Review provided academic history', exact: true }).click();
  const review = page.getByRole('dialog', { name: 'Use the provided academic history?', exact: true });
  await review.getByRole('checkbox', { name: /I reviewed the academic changes/ }).check();
  await review.getByRole('button', { name: 'Apply reviewed academic history', exact: true }).click();
  await expect(review.getByRole('alert')).toContainText('Academic changes were not saved');
  expect(await stored(page)).toEqual(before);
});

test('the compact specialization jump opens and focuses the requested section without changing records', async ({ page }) => {
  await prepare(page);
  await page.setViewportSize({ width: 320, height: 1000 });
  await page.goto('./#/omscs/specializations');
  const before = await stored(page);
  const jump = page.getByRole('combobox', { name: 'Jump to specialization', exact: true });
  await expect(jump.locator('option:not([disabled])')).toHaveCount(6);
  await jump.selectOption('hci');
  const hci = page.locator('[data-specialization="hci"]');
  await expect(hci).toHaveAttribute('open', '');
  await expect(hci.locator(':scope > summary')).toBeFocused();
  await expect(hci.locator('[data-requirement-group="mobile"]')).toContainText('Required 1 / B or better');
  await expect(hci.locator('.specialization-minima')).toContainText('At least 1 Design & evaluation / At least 1 Interactive technology');
  await hci.locator(':scope > summary').press('Enter');
  await expect(hci).not.toHaveAttribute('open', '');
  expect(await stored(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

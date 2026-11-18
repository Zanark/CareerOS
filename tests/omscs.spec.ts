import { expect, test as base, type Page } from '@playwright/test';
import { createInitialState, generatePlan, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { omscsCourses } from '../src/domain/omscs/courses';
import type { OmscsCourseId, OmscsCourseRecord } from '../src/domain/omscs/types';
import { omscsSources } from '../src/domain/omscs/sources';
import { deriveJournalKey, unlockJournal } from '../src/repositorySync/journal';
import { parseJournal } from '../src/repositorySync/journalFormat';
import { omscsSteps } from '../src/tutorial/omscsSteps';
import { openGraphPanel, setGraphCheckbox } from './graph-ui';

const key = 'careerhq.workspace.v1';
const day = '2026-11-19';
const now = new Date(`${day}T00:00:00Z`);
const test = base.extend<{ healthy: void }>({
  healthy: [async ({ context, baseURL }, use) => {
    const errors: string[] = [], external: string[] = [];
    const watch = (page: Page) => page.on('pageerror', error => errors.push(error.message));
    context.pages().forEach(watch);
    context.on('page', watch);
    context.on('request', request => {
      if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url());
    });
    await use();
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
  }, { auto: true }],
});

test.use({
  timezoneId: 'Asia/Kolkata',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});

function fixture(): AppState {
  const state = createInitialState(false);
  state.updatedAt = now.toISOString();
  state.plans[day] = generatePlan(state, day);
  return state;
}

async function seed(page: Page, state: unknown = fixture(), theme = 'dark') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(now);
  await page.addInitScript(({ state, theme, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem('careerhq.theme.v1')) localStorage.setItem('careerhq.theme.v1', theme);
  }, { state, theme, key });
}

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}

async function storage(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

async function enterCourse(page: Page, id: OmscsCourseId, input: Partial<Omit<OmscsCourseRecord, 'id'>> = {}) {
  await page.locator(`[data-tour="omscs-record-${id}"]`).click();
  const modal = page.locator('dialog.omscs-entry-modal');
  await modal.getByRole('combobox', { name: 'Course status', exact: true }).selectOption(input.status ?? 'completed');
  if ((input.status ?? 'completed') === 'completed') await modal.getByRole('combobox', { name: 'Final grade', exact: true }).selectOption(input.grade ?? 'B');
  if (input.term !== undefined) await modal.getByLabel('Course semester (optional)', { exact: true }).fill(input.term);
  await modal.getByRole('checkbox', { name: /I confirm this is a self-reported course entry/ }).check();
  await modal.getByRole('button', { name: 'Save course entry', exact: true }).click();
  await expect(modal).toHaveCount(0);
}

async function navigate(page: Page, name: string) {
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click();
}

for (const [width, theme] of [[1440, 'dark'], [390, 'dark'], [320, 'light']] as const) {
  test(`semester proposal, all ten guides, cited practice and full roadmap fit at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, fixture(), theme);
    await page.goto('./#/omscs');
    await expect(page.getByRole('heading', { name: 'GeoJack OMSCS', exact: true })).toBeVisible();
    const before = await storage(page);
    await expect(page.locator('[data-omscs-course]')).toHaveCount(10);
    await expect(page.locator('[data-omscs-term]')).toHaveCount(7);
    expect(await page.locator('.omscs-record-status').allTextContents()).toEqual(Array(10).fill('No academic entry'));
    await expect(page.locator('[data-tour="omscs-credit-summary"] strong').first()).toHaveText('0 / 30');
    await expect(page.getByText('This is an unsaved example proposal.', { exact: false })).toBeVisible();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`geojack-planner-${width}-${theme}.png`) });

    const guide = page.locator('[data-tour="omscs-course-guide"]');
    for (const course of omscsCourses) {
      await page.getByRole('combobox', { name: 'Explore a course', exact: true }).selectOption(course.id);
      await expect(guide.getByRole('heading', { level: 2 })).toHaveText(course.title);
      await expect(guide.locator('.omscs-syllabus > li')).toHaveCount(course.modules.length);
      await expect(guide.getByRole('heading', { name: 'Before enrolling', exact: true })).toBeVisible();
      await expect(guide.getByRole('heading', { name: 'Tools and working methods', exact: true })).toBeVisible();
      await expect(guide.getByRole('heading', { name: 'Dated assessment snapshot / not a future contract', exact: true })).toBeVisible();
      const links = await guide.locator('[data-tour="omscs-course-sources"] a').evaluateAll(nodes =>
        nodes.map(node => node.getAttribute('href')).sort());
      expect(links).toEqual(omscsSources.filter(source => course.sourceIds.includes(source.id)).map(source => source.url).sort());
      await noOverflow(page);
    }
    await page.getByRole('combobox', { name: 'Explore a course', exact: true }).selectOption('cs7295');
    await guide.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`geojack-guide-${width}-${theme}.png`) });
    await page.locator('[data-tour="omscs-record-cs7637"]').click();
    const entry = page.locator('dialog.omscs-entry-modal');
    await entry.getByRole('combobox', { name: 'Course status', exact: true }).selectOption('completed');
    await entry.getByRole('combobox', { name: 'Final grade', exact: true }).selectOption('B');
    await entry.getByLabel('Course semester (optional)', { exact: true }).fill('2026-fall');
    const confirmation = entry.getByRole('checkbox', { name: /I confirm this is a self-reported course entry/ });
    await confirmation.check();
    const geometry = await confirmation.evaluate(control => {
      const label = control.closest('label');
      if (!label) throw new Error('The academic confirmation control must retain its visible label.');
      return { width: control.getBoundingClientRect().width, labelWidth: label.getBoundingClientRect().width };
    });
    expect(geometry.width).toBeLessThan(geometry.labelWidth / 4);
    const cancel = entry.getByRole('button', { name: 'Cancel', exact: true });
    await cancel.scrollIntoViewIfNeeded();
    await expect(entry.getByRole('button', { name: 'Close dialog', exact: true })).toBeInViewport({ ratio: 1 });
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`geojack-entry-${width}-${theme}.png`) });
    await cancel.click();
    expect(await storage(page)).toEqual(before);

    await page.getByRole('link', { name: 'Practice library', exact: true }).click();
    const chooser = page.getByLabel('Practice module or reference', { exact: true });
    await expect(chooser.locator('option')).toHaveCount(29);
    await chooser.selectOption('omscs-cs7650-retrieval');
    await expect(page.locator('.pack-unit-meta')).toContainText('UNOFFICIAL STUDY GUIDE');
    await expect(page.locator('.pack-study-unit')).not.toContainText('PDF PAGES');
    await page.locator('[data-tour="pack-unit-sources"] > summary').click();
    await expect(page.locator('[data-tour="pack-unit-sources"] a')).not.toHaveCount(0);
    await expect(page.locator('.pack-exercises > ol > li')).toHaveCount(2);
    await page.locator('[data-tour="pack-related-practice"] > summary').click();
    await expect(page.locator('[data-tour="pack-related-practice"]')).toContainText('not extra prerequisites or equivalent completion');
    await noOverflow(page);
    await page.getByRole('link', { name: 'My saved tracker', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bring into focus', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    const map = page.locator('.full-roadmap-modal');
    await expect(map.locator('.full-roadmap-node')).toHaveCount(24);
    await expect(map.locator('[data-pack-reference]')).toHaveCount(5);
    await expect(map.locator('[data-full-current="true"]')).toHaveCount(1);
    await map.getByLabel('Find a roadmap topic').selectOption('omscs-v3-omscs-defense');
    await noOverflow(page);
    await map.getByRole('link', { name: "Open this checkpoint's study material and exercises", exact: true }).click();
    await expect(page).toHaveURL(/#\/practice\/omscs\/omscs-defense$/);
    await page.reload();
    await expect(page.locator('#pack-unit-title')).toHaveText('Defend a complete AI-systems design');
    expect(await storage(page)).toEqual(before);
  });
}

test('default regular-term planning skips summer while an explicitly selected summer remains an option', async ({ page }) => {
  await seed(page);
  await page.clock.setFixedTime(new Date('2027-02-01T10:00:00Z'));
  await page.goto('./#/omscs');
  const season = page.getByRole('combobox', { name: 'Start semester', exact: true });
  const summers = page.getByRole('checkbox', { name: 'Include later summer terms in the proposal', exact: true });
  await expect(season).toHaveValue('fall');
  await expect(summers).not.toBeChecked();
  await expect(page.locator('[data-omscs-term]').first()).toHaveAttribute('data-omscs-term', '2027-fall');
  await expect(page.locator('[data-omscs-term$="summer"]')).toHaveCount(0);
  expect((await stored(page)).omscsPlan).toBeUndefined();
  await season.selectOption('summer');
  await page.getByRole('button', { name: 'Save semester proposal', exact: true }).click();
  await expect(page.locator('[data-omscs-term]').first()).toHaveAttribute('data-omscs-term', '2027-summer');
  await expect(page.locator('[data-omscs-term$="summer"]')).toHaveCount(1);
  await summers.check();
  await page.getByRole('button', { name: 'Save semester proposal', exact: true }).click();
  await expect(page.locator('[data-omscs-term$="summer"]')).toHaveCount(3);
  expect((await stored(page)).omscsPlan?.courses).toEqual([]);
  await expect(page.locator('[data-tour="omscs-credit-summary"] strong').last()).toHaveText('0 / 24');
});

test('explicit academic entries respect grade rules, cancel exactly and survive route edits, reload and backup replacement without learning credit', async ({ page }) => {
  await seed(page);
  await page.goto('./#/omscs');
  const initial = await stored(page), before = await storage(page);
  await page.locator('[data-tour="omscs-record-cs7637"]').click();
  const modal = page.locator('dialog.omscs-entry-modal');
  await modal.getByRole('combobox', { name: 'Course status', exact: true }).selectOption('completed');
  await modal.getByRole('combobox', { name: 'Final grade', exact: true }).selectOption('A');
  await modal.getByRole('button', { name: 'Save course entry', exact: true }).click();
  await expect(modal).toBeVisible();
  expect(await storage(page)).toEqual(before);
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await storage(page)).toEqual(before);

  await enterCourse(page, 'cs7637', { grade: 'unrecorded', term: '2026-fall' });
  const stats = page.locator('[data-tour="omscs-credit-summary"] strong');
  await expect(stats.nth(0)).toHaveText('3 / 30');
  await expect(stats.nth(1)).toHaveText('0 / 30');
  await expect(page.getByText('1 completed entry has no recorded grade.', { exact: false })).toBeVisible();
  await enterCourse(page, 'cs7637', { grade: 'C' });
  await expect(stats.nth(1)).toHaveText('0 / 30');
  await expect(page.locator('.omscs-warnings')).toContainText('does not meet its selected ai core slot');
  await enterCourse(page, 'cs7637');
  await enterCourse(page, 'cs6457', { grade: 'C' });
  await expect(stats.nth(0)).toHaveText('6 / 30');
  await expect(stats.nth(1)).toHaveText('6 / 30');
  await expect(stats.nth(2)).toHaveText('3 / 15');
  await expect(stats.nth(3)).toHaveText('0 / 24');

  await page.getByRole('combobox', { name: 'Start semester', exact: true }).selectOption('fall');
  await page.getByLabel('Start year', { exact: true }).fill('2028');
  await page.getByRole('checkbox', { name: 'Include later summer terms in the proposal', exact: true }).check();
  await page.getByRole('button', { name: 'Save semester proposal', exact: true }).click();
  const saved = await stored(page);
  expect(saved.omscsPlan).toMatchObject({ startTerm: '2028-fall', includeSummer: true });
  expect(saved.omscsPlan?.courses.find(row => row.id === 'cs7637')).toMatchObject({ term: '2026-fall', grade: 'B' });
  expect(saved.missions).toEqual(initial.missions);
  expect(saved.evidence).toEqual(initial.evidence);
  expect(saved.recalls).toEqual(initial.recalls);
  expect(saved.plans).toEqual(initial.plans);
  expect(saved.focusMissionId).toBe(initial.focusMissionId);
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
  await page.reload();
  expect(await stored(page)).toEqual(saved);

  await page.goto('./#/settings');
  const downloading = page.waitForEvent('download');
  await page.locator('[data-tour="backup-export"]').click();
  const stream = await (await downloading).createReadStream(), chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString())).toEqual(saved);
  await page.goto('./#/omscs');
  await enterCourse(page, 'cs7637', { grade: 'F' });
  expect((await stored(page)).omscsPlan).not.toEqual(saved.omscsPlan);
  await page.goto('./#/settings');
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-tour="backup-import"]').click();
  page.once('dialog', dialog => dialog.accept());
  await (await chooser).setFiles({ name: 'synthetic-geojack-backup.json', mimeType: 'application/json', buffer: backup });
  await expect.poll(() => stored(page)).toEqual(saved);
  await page.reload();
  expect(await stored(page)).toEqual(saved);
});

test('a stale course dialog in another actual tab cannot overwrite a newer academic entry', async ({ page, context }) => {
  await seed(page);
  await page.goto('./#/omscs');
  await page.locator('[data-tour="omscs-record-cs7637"]').click();
  const modal = page.locator('dialog.omscs-entry-modal');
  await modal.getByRole('combobox', { name: 'Course status', exact: true }).selectOption('completed');
  await modal.getByRole('combobox', { name: 'Final grade', exact: true }).selectOption('A');
  await modal.getByRole('checkbox', { name: /I confirm this is a self-reported course entry/ }).check();
  const other = await context.newPage();
  try {
    await other.clock.setFixedTime(now);
    await other.goto('./#/omscs');
    await enterCourse(other, 'cs7637', { grade: 'B' });
    const newer = await storage(other);
    await modal.getByRole('button', { name: 'Save course entry', exact: true }).click();
    await expect(modal.getByRole('alert')).toContainText('Course entry not saved');
    await expect(page.locator('.app')).toContainText('changed in another tab');
    expect(await storage(page)).toEqual(newer);
    await page.reload();
    expect((await stored(page)).omscsPlan?.courses[0].grade).toBe('B');
  } finally { await other.close(); }
});

test('a rejected browser save keeps the previous plan absent and shows failure rather than a saved proposal', async ({ page }) => {
  await seed(page);
  await page.goto('./#/omscs');
  const before = await storage(page);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(name, value) {
      if (name === key) throw new DOMException('Synthetic full storage', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, key);
  await page.getByRole('button', { name: 'Save semester proposal', exact: true }).click();
  await expect(page.getByText('Semester proposal not saved.', { exact: false })).toBeVisible();
  await expect(page.locator('.app')).toContainText('Synthetic full storage');
  expect(await storage(page)).toEqual(before);
  expect((await stored(page)).omscsPlan).toBeUndefined();
});

test('a genuine ten-mission wire fixture gains only an unstarted GeoJack lane while every earlier record and date remains exact', async ({ page }) => {
  let state = createInitialState(false, '2.0.0');
  state.updatedAt = now.toISOString();
  state = recordEvidence(state, {
    missionId: 'system', checkpointId: state.missions.system.checkpointId,
    title: 'Synthetic preserved earlier design', summary: 'Synthetic historical implementation and independently checked explanation.',
    kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
  });
  state.focusMissionId = 'fabric';
  state.missions.fabric.mode = 'active';
  state.missions.pattern.mode = 'background';
  state.missions.escape.blocker = 'Synthetic retained blocker';
  state.plans[day] = generatePlan(state, day);
  const { omscs, ...oldMissions } = state.missions;
  expect(Object.keys(oldMissions)).toHaveLength(10);
  await seed(page, { ...state, missions: oldMissions });
  await page.goto('./#/omscs');
  await expect(page.getByRole('heading', { name: 'GeoJack OMSCS', exact: true })).toBeVisible();
  expect(await stored(page)).toEqual(state);
  expect((await stored(page)).missions.omscs).toEqual(omscs);
  expect((await stored(page)).omscsPlan).toBeUndefined();
  await page.reload();
  expect(await stored(page)).toEqual(state);
});

test('real background GeoJack evidence offers a cross-page level-up and mission graph reveal without academic credits', async ({ page }) => {
  await seed(page);
  await page.goto('./#/mission/omscs');
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await modal.getByLabel('What did you make?').selectOption('code');
  await modal.getByLabel('Artifact title').fill('Synthetic checked degree-slot validator');
  await modal.getByLabel('What did you practice?').fill('An original synthetic slot map, an independent changed-case check and explicitly listed unknowns; no transcript approval claimed.');
  await modal.locator('[data-tour="checkpoint-complete"]').check();
  await expect(modal.getByRole('button', { name: 'Complete & unlock next', exact: true })).toBeDisabled();
  for (const checkbox of await modal.locator('[data-tour="evidence-criteria"] input').all()) await checkbox.check();
  await modal.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveAttribute('data-level-up', 'true');
  await page.getByRole('button', { name: 'View level-up', exact: true }).click();
  await expect(page.locator('[data-tour="wayfinder-viewer"]')).toHaveAttribute('data-viewer-state', 'ready');
  const saved = await stored(page);
  expect(saved.omscsPlan).toBeUndefined();
  expect(saved.missions.omscs).toMatchObject({ mode: 'background', checkpointId: 'omscs-v3-omscs-readiness' });
  expect(saved.missions.pattern.completedCheckpointIds).toEqual([]);
  await page.goto('./#/omscs');
  await expect(page.locator('[data-tour="omscs-credit-summary"] strong').first()).toHaveText('0 / 30');
  await expect(page.locator('[data-tour="omscs-credit-summary"] strong').last()).toHaveText('1 / 24');
  await page.goto('./#/home');
  const scene = page.locator('.career-graph-scene');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(scene).toHaveAttribute('data-orbit-count', '4');
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:omscs"]').click();
  await expect(page.locator('.career-orbit-inspector')).toContainText('Revealed for today after checkpoint completion');
  await expect(page.locator('.career-orbit-inspector')).toHaveAttribute('data-mission-mode', 'background');
  await setGraphCheckbox(page, 'Show everything', true);
  await expect(scene).toHaveAttribute('data-orbit-count', '11');
  expect(await stored(page)).toEqual(saved);
});

for (const width of [1440, 320]) {
  test(`all six real-control GeoJack lessons stay isolated at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page);
    await page.goto('./#/settings');
    const before = await storage(page);
    await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
    await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('omscs');
    for (const step of omscsSteps) {
      const coach = page.locator('.tutorial-panel');
      await expect(coach).toHaveAttribute('data-step', step.id);
      const next = coach.getByRole('button', { name: step.id === 'omscs-finish' ? 'Finish tutorial' : 'Next', exact: true });
      if (step.kind === 'action') await expect(next).toBeDisabled();
      if (step.id === 'omscs-plan') await page.locator('[data-tour="omscs-plan-save"]').click();
      if (step.id === 'omscs-guide') await page.locator('[data-tour="omscs-course-select"]').selectOption('cs7295');
      if (step.id === 'omscs-entry') {
        await page.locator('[data-tour="omscs-record-cs7637"]').click();
        await page.locator('[data-tour="omscs-course-example"]').click();
        await page.locator('[data-tour="omscs-course-save"]').click();
      }
      if (step.id === 'omscs-sources') await page.locator('[data-tour="pack-unit-sources"] > summary').click();
      await expect(next).toBeEnabled();
      await noOverflow(page);
      expect(await storage(page)).toEqual(before);
      await next.click();
    }
    await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
    expect(await storage(page)).toEqual(before);
  });
}

test('mission search, primary-source registry, Help and the connected roadmap expose GeoJack without saving progress', async ({ page }) => {
  await seed(page);
  await page.goto('./#/hq');
  const before = await storage(page);
  await page.getByLabel('Search missions and evidence').fill('GeoJack');
  await page.locator('.search-results a').filter({ hasText: 'Georgia Tech OMSCS' }).first().click();
  await expect(page).toHaveURL(/#\/mission\/omscs$/);
  await page.goto('./#/sources/omscs');
  await expect(page.locator('[data-tour="source-mission"]')).toHaveValue('omscs');
  await expect(page.locator('.source-upgrade')).toHaveCount(0);
  const links = await page.locator('.source-citations a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')).sort());
  expect(links).toEqual(omscsSources.map(source => source.url).sort());
  await page.locator('[data-tour="omscs-planner-open"]').click();
  await expect(page).toHaveURL(/#\/omscs$/);
  await page.goto('./#/guide');
  await page.getByRole('searchbox', { name: 'Find an answer', exact: true }).fill('GeoJack');
  const topic = page.locator('.help-topic');
  await expect(topic).toHaveCount(1);
  await topic.locator('summary').click();
  await topic.locator('a[href="#/omscs"]').click();
  await expect(page).toHaveURL(/#\/omscs$/);
  await page.goto('./#/roadmap');
  await expect(page.locator('.tree-mission')).toHaveCount(11);
  await page.getByRole('button', { name: 'View Georgia Tech OMSCS flowchart', exact: true }).click();
  await expect(page.locator('.roadmap-selected-heading h2')).toHaveText('Georgia Tech OMSCS');
  expect(await storage(page)).toEqual(before);
});

test('the real browser encrypted-journal workflow appends academic changes without replacing ordinary storage or publishing plaintext', async ({ page, context }) => {
  await seed(page);
  const phrase = 'A synthetic GeoJack browser journal phrase';
  const published = { text: '' };
  await context.route('**/careeros-progress.jsonl', route =>
    route.fulfill({ contentType: 'application/x-ndjson', body: published.text }));
  await page.goto('./#/repository-sync');
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByLabel('Confirm passphrase', { exact: true }).fill(phrase);
  await page.getByRole('checkbox', { name: /I will keep this passphrase/ }).check();
  await page.getByRole('button', { name: 'Create encrypted journal', exact: true }).click();
  const exported = page.getByLabel('Encrypted appendable text');
  await expect(exported).toBeVisible();
  const baseline = await exported.inputValue();
  published.text = baseline;
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Prepare encrypted updates', exact: true })).toBeEnabled();
  await navigate(page, 'GeoJack OMSCS');
  await enterCourse(page, 'cs7637');
  const saved = await stored(page);
  await navigate(page, 'Settings & data');
  await page.getByRole('link', { name: 'Open repository sync', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare encrypted updates', exact: true }).click();
  const block = await exported.inputValue();
  expect(block.trim().split('\n')).toHaveLength(1);
  expect(block).not.toContain('cs7637');
  expect(block).not.toContain(phrase);
  const file = parseJournal(baseline + block)!;
  const decrypted = await unlockJournal(file, await deriveJournalKey(phrase, file.header));
  expect(decrypted.state).toEqual(saved);
  expect(decrypted.state.omscsPlan?.courses).toEqual([{ id: 'cs7637', term: '', status: 'completed', grade: 'B' }]);
  expect(Object.values(await storage(page)).some(value => value?.includes(phrase))).toBe(false);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock your journal', exact: true })).toBeVisible();
  expect(await stored(page)).toEqual(saved);
});

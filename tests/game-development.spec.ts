import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, parseState, recordEvidence } from '../src/domain/engine';
import { missionIds, type AppState } from '../src/domain/types';
import { gameOutline } from '../src/domain/gameDevelopment/outline';
import { getDiscoverySnapshot } from '../src/discovery/model';
import { deriveJournalKey, unlockJournal } from '../src/repositorySync/journal';
import { parseJournal } from '../src/repositorySync/journalFormat';
import { openLibraryBrowser } from './library-ui';
import { closeGraphPanels, openGraphPanel, setGraphCheckbox } from './graph-ui';

const key = 'careerhq.workspace.v1';
test.use({
  timezoneId: 'Asia/Kolkata',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});

function fixture() {
  const state = createInitialState(false);
  state.omscsPlan = { startTerm: '2031-spring', includeSummer: false, courses: [] };
  return parseState(state);
}

async function seed(page: Page, state: unknown = fixture(), theme = 'dark') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ key, state, theme }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem('careerhq.theme.v1')) localStorage.setItem('careerhq.theme.v1', theme);
  }, { key, state, theme });
}

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}

async function allStorage(page: Page) {
  return page.evaluate(() => ({
    local: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
    session: Object.fromEntries(Object.keys(sessionStorage).sort().map(key => [key, sessionStorage.getItem(key)])),
  }));
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

async function completeFirstLesson(page: Page) {
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('What did you make?').selectOption('code');
  await form.getByLabel('Artifact title').fill('Synthetic independent game-learning artifact');
  await form.getByLabel('What did you practice?').fill('A fictional file-tree exercise and changed-folder retry with the required criteria explicitly checked.');
  await form.locator('[data-tour="checkpoint-complete"]').check();
  await expect(form.getByRole('button', { name: 'Complete & unlock next', exact: true })).toBeDisabled();
  for (const criterion of await form.locator('[data-tour="evidence-criteria"] input').all()) await criterion.check();
  await form.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  await expect(form).toHaveCount(0);
}

test('a genuinely fresh workspace offers the complete game mission as Planned without starting it', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/missions');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Missions');
  const initial = await stored(page);
  expect(initial.missions.gamedev).toEqual(fixture().missions.gamedev);
  expect(initial.evidence).toEqual([]);
  expect(initial.events).toEqual([]);
  expect(generatePlan(initial).some(action => action.missionId === 'gamedev')).toBe(false);
  const before = await allStorage(page);
  await page.getByRole('button', { name: /^Planned/ }).click();
  await expect(page.locator('.mission-card')).toHaveCount(1);
  const card = page.locator('.mission-card[data-mission-id="gamedev"]');
  await expect(card.getByText('Planned', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Open Game Development', exact: true }).click();
  await expect(page).toHaveURL(/#\/mission\/gamedev$/);
  await expect(page.locator('[data-tour="save-state"]')).toContainText('Planned');
  await expect(page.getByRole('button', { name: 'Bring into focus', exact: true })).toBeEnabled();
  for (const target of ['record-evidence', 'mission-primary', 'blocker-input', 'blocker-submit']) {
    await expect(page.locator(`[data-tour="${target}"]`)).toBeDisabled();
  }
  expect(await allStorage(page)).toEqual(before);
});

test('a true previous eleven-mission workspace gains only the missing Planned lane', async ({ page }) => {
  await page.clock.setFixedTime(new Date());
  let state = fixture();
  state = recordEvidence(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'Synthetic retained earlier work', summary: 'A fictional existing checkpoint with explicitly confirmed source criteria.',
    kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
  });
  state.focusMissionId = 'fabric';
  state.missions.fabric.mode = 'active';
  state.missions.pattern.mode = 'background';
  state.missions.escape.blocker = 'Synthetic retained approval blocker';
  const browserDate = await page.evaluate(localDate, undefined);
  state.plans[browserDate] = generatePlan(state, browserDate);
  const { gamedev: _game, ...oldMissions } = state.missions;
  expect(Object.keys(oldMissions)).toHaveLength(11);
  await seed(page, { ...state, missions: oldMissions });
  await page.goto('./#/mission/gamedev');
  await expect(page.locator('[data-tour="save-state"]')).toContainText('0 / 65 complete');
  expect(await stored(page)).toEqual(state);
  const before = await allStorage(page);
  await page.getByRole('link', { name: 'Capstone benchmark', exact: true }).click();
  await expect(page.locator('#pack-unit-title')).toContainText('complete game and story brief');
  await page.reload();
  await expect(page.locator('#pack-unit-title')).toBeVisible();
  expect(await allStorage(page)).toEqual(before);
});

test('malformed explicit Planned progress retains the original wire data in safe recovery', async ({ page }) => {
  const state = fixture();
  const invalid = { ...state, missions: { ...state.missions, gamedev: {
    ...state.missions.gamedev, completedCheckpointIds: [state.missions.gamedev.checkpointId],
  } } };
  await seed(page, invalid);
  await page.goto('./#/mission/gamedev');
  await expect(page.getByRole('heading', { name: 'Your existing data comes first.', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download original data', exact: true })).toBeEnabled();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(JSON.stringify(invalid));
});

test('deliberate activation, checked evidence, backup restore and reload preserve every other lane', async ({ page }) => {
  const initial = fixture();
  await seed(page, initial);
  await page.goto('./#/mission/gamedev');
  await page.getByRole('button', { name: 'Bring into focus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move to background', exact: true })).toBeVisible();
  expect((await stored(page)).focusMissionId).toBe(initial.focusMissionId);
  await completeFirstLesson(page);
  const saved = await stored(page);
  expect(saved.missions.gamedev).toMatchObject({
    mode: 'active', checkpointId: 'gamedev-v3-gd-02', completedCheckpointIds: ['gamedev-v3-gd-01'],
  });
  for (const id of missionIds.filter(id => id !== 'gamedev')) expect(saved.missions[id]).toEqual(initial.missions[id]);
  expect(saved.omscsPlan).toEqual(initial.omscsPlan);
  await page.goto('./#/settings');
  const downloading = page.waitForEvent('download');
  await page.locator('[data-tour="backup-export"]').click();
  const stream = await (await downloading).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString())).toEqual(saved);
  await page.getByLabel('What are you working toward?').fill('A fictional changed direction after exporting the game fixture.');
  await page.getByRole('button', { name: 'Save direction', exact: true }).click();
  expect((await stored(page)).objective).not.toBe(saved.objective);
  const choosing = page.waitForEvent('filechooser');
  await page.locator('[data-tour="backup-import"]').click();
  page.once('dialog', dialog => dialog.accept());
  await (await choosing).setFiles({ name: 'synthetic-game-backup.json', mimeType: 'application/json', buffer: backup });
  await expect.poll(() => stored(page)).toEqual(saved);
  await page.reload();
  await page.goto('./#/mission/gamedev');
  await expect(page.locator('[data-tour="save-state"]')).toContainText('1 / 65 complete');
  expect(await stored(page)).toEqual(saved);
});

test('sources, search and the complete roadmap expose the benchmark without adopting or crediting it', async ({ page }, testInfo) => {
  const state = fixture();
  await seed(page, state);
  await page.goto('./#/sources/gamedev');
  const before = await allStorage(page);
  await expect(page.locator('[data-tour="source-mission"]')).toHaveValue('gamedev');
  await expect(page.locator('.source-upgrade')).toHaveCount(0);
  await page.locator('[data-tour="source-material"] > summary').click();
  await expect(page.locator('.source-citations a')).toHaveCount(23);
  await expect(page.locator('.source-citations')).not.toContainText('PDF page');
  await page.goto('./#/mission/gamedev');
  await page.screenshot({ path: testInfo.outputPath('game-mission-desktop.png'), animations: 'disabled' });
  await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
  const map = page.locator('.full-roadmap-modal');
  await expect(map.locator('.full-roadmap-node')).toHaveCount(65);
  await expect(map.locator('[data-pack-reference]')).toHaveCount(13);
  await map.getByLabel('Find a roadmap topic').selectOption('gamedev-v3-gd-65');
  await page.screenshot({ path: testInfo.outputPath('game-roadmap-desktop.png'), animations: 'disabled' });
  await map.getByRole('link', { name: "Open this checkpoint's study material and exercises", exact: true }).click();
  await expect(page).toHaveURL(/#\/practice\/gamedev\/gd-65$/);
  await expect(page.locator('#pack-unit-title')).toHaveText('Deliver the game and grade the evidence');
  await page.getByLabel('Search missions and evidence').fill('Borrowed Ground');
  const result = page.locator('.search-results a').filter({ hasText: 'complete game and story brief' });
  await expect(result).toHaveCount(1);
  await result.click();
  await expect(page).toHaveURL(/#\/practice\/gamedev\/gd-capstone-brief$/);
  await page.goto('./#/guide');
  await page.getByRole('searchbox', { name: 'Find an answer', exact: true }).fill('Godot');
  const topic = page.locator('.help-topic');
  await expect(topic).toHaveCount(1);
  await topic.locator('summary').click();
  await topic.getByRole('link', { name: 'Open World Forge', exact: true }).click();
  await expect(page).toHaveURL(/#\/mission\/gamedev$/);
  await expect(page.locator('[data-tour="save-state"]')).toContainText('Planned');
  await expect(page.getByRole('button', { name: 'Record evidence', exact: true })).toBeDisabled();
  expect(await allStorage(page)).toEqual(before);
  expect(getDiscoverySnapshot(await stored(page)).earned).toEqual(getDiscoverySnapshot(state).earned);
});

for (const [width, theme] of [[1440, 'dark'], [768, 'dark'], [390, 'dark'], [320, 'light']] as const) {
  test(`all78game study URLs and expanded content remain readable and read-only at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, fixture(), theme);
    const errors: string[] = [], external: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (!/^(http:\/\/127\.0\.0\.1:|data:|blob:)/.test(request.url())) external.push(request.url());
    });
    await page.goto('./#/missions');
    await expect(page.getByRole('heading', { name: 'Missions', level: 1 })).toBeVisible();
    const before = await allStorage(page);
    await page.getByRole('button', { name: /^Planned/ }).click();
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`game-card-${width}-${theme}.png`), animations: 'disabled' });
    await page.getByRole('button', { name: 'Open Game Development', exact: true }).click();
    await expect(page.locator('[data-tour="save-state"]')).toContainText('Planned');
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`game-mission-${width}-${theme}.png`), animations: 'disabled' });
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    await expect(page.locator('.full-roadmap-modal .full-roadmap-node')).toHaveCount(65);
    await noOverflow(page);
    await page.screenshot({ path: testInfo.outputPath(`game-map-${width}-${theme}.png`), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await page.goto('./#/practice/gamedev/gd-01');
    await expect(page.locator('#pack-unit-title')).toBeVisible();
    await openLibraryBrowser(page);
    const select = page.getByLabel('Practice module or reference', { exact: true });
    await expect(select.locator('option')).toHaveCount(78);
    await page.getByRole('combobox', { name: 'Material', exact: true }).selectOption('reference');
    await expect(select.locator('option').filter({ hasText: '(reference)' })).toHaveCount(5);
    await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
    const checks: { id: string; sections: number; codeRegions: number }[] = [];
    for (const unit of gameOutline.units) {
      await page.evaluate(id => { location.hash = `#/practice/gamedev/${id}`; }, unit.id);
      await expect(page.locator('#pack-unit-title')).toHaveText(unit.title);
      await expect(page.locator('.pack-exercises > ol > li')).toHaveCount(2);
      await expect(page.locator('.pack-unit-meta')).not.toContainText('PDF PAGES');
      await page.locator('.pack-study-unit details').evaluateAll(elements => {
        for (const element of elements) (element as HTMLDetailsElement).open = true;
      });
      await noOverflow(page);
      const code = page.locator('.pack-code');
      for (const region of await code.all()) {
        await expect(region).toHaveAttribute('tabindex', '0');
        expect(await region.evaluate(element => getComputedStyle(element).overflowX)).toBe('auto');
      }
      checks.push({ id: unit.id, sections: await page.locator('.pack-study-unit details[open]').count(), codeRegions: await code.count() });
      if (['gd-17', 'gd-capstone-levels', 'gd-capstone-rubric'].includes(unit.id)) {
        await page.locator('#pack-unit-title').scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath(`${unit.id}-${width}-${theme}.png`), animations: 'disabled' });
      }
    }
    expect(await allStorage(page)).toEqual(before);
    expect((await stored(page)).missions.gamedev.mode).toBe('planned');
    expect(errors).toEqual([]);
    expect(external).toEqual([]);
    await testInfo.attach('Exact game URL and expanded-content checks / synthetic data', {
      body: JSON.stringify({ width, theme, surfaces: ['Planned card', 'Planned mission', 'complete roadmap'], checks, errors, external,
        scope: 'Native entry/roadmap controls; expanded disclosures for unit layout. Native code/tutorial clicks are covered separately. Not Godot execution or physical-device qualification.' }),
      contentType: 'application/json',
    });
  });
}

test('native lesson/code disclosures and tutorial-only activation never modify the saved Planned mission', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 1000 });
  await seed(page);
  await page.goto('./#/practice/gamedev/gd-17');
  const before = await allStorage(page);
  const example = page.locator('.pack-study-section').filter({ has: page.locator('summary', { hasText: 'Worked example / practice scenario' }) });
  await example.locator(':scope > summary').click();
  const code = example.getByRole('region', { name: 'Worked example / practice scenario code example', exact: true });
  await expect(code).toBeVisible();
  await code.focus();
  await expect(code).toBeFocused();
  await page.keyboard.press('End');
  await noOverflow(page);
  expect(await allStorage(page)).toEqual(before);
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  await page.evaluate(() => { location.hash = '#/mission/gamedev'; });
  await expect(page.getByRole('heading', { name: 'Game Development', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Bring into focus', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Move to background', exact: true })).toBeVisible();
  await noOverflow(page);
  expect(await allStorage(page)).toEqual(before);
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  expect(await allStorage(page)).toEqual(before);
  expect((await stored(page)).missions.gamedev.mode).toBe('planned');
});

test('the real graph keeps Planned detail hidden until Show everything, including expanded node spacing', async ({ page }) => {
  await seed(page);
  await page.goto('./#/home');
  const before = await allStorage(page), scene = page.locator('.career-graph-scene');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await setGraphCheckbox(page, 'Show everything', true);
  await expect(scene).toHaveAttribute('data-orbit-count', String(missionIds.length));
  await openGraphPanel(page, 'view');
  const spacing = page.getByRole('slider', { name: 'Node spacing', exact: true });
  await spacing.focus();
  await spacing.press('End');
  await expect(page.locator('.career-graph-page')).toHaveAttribute('data-node-spacing', '300');
  await closeGraphPanels(page);
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:gamedev"]').click();
  await expect(page.locator('.career-orbit-inspector')).toHaveAttribute('data-mission-mode', 'planned');
  await expect(page.locator('.career-orbit-inspector')).toContainText('Game Development');
  expect(await allStorage(page)).toEqual(before);
  expect((await stored(page)).missions.gamedev.mode).toBe('planned');
});

test('the encrypted journal preserves Planned state and appends only deliberately activated game work', async ({ page, context }) => {
  await context.route('**/careeros-progress.jsonl', route => route.fulfill({ contentType: 'application/x-ndjson', body: '' }));
  await seed(page);
  await page.goto('./#/repository-sync');
  const initial = await stored(page);
  const phrase = 'A synthetic game-development browser journal phrase';
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByLabel('Confirm passphrase', { exact: true }).fill(phrase);
  await page.getByRole('checkbox', { name: /I will keep this passphrase/ }).check();
  await page.getByRole('button', { name: 'Create encrypted journal', exact: true }).click();
  const baseline = await page.getByLabel('Encrypted appendable text').inputValue();
  const file = parseJournal(baseline)!;
  const journalKey = await deriveJournalKey(phrase, file.header);
  expect((await unlockJournal(file, journalKey)).state).toEqual(initial);
  expect((await stored(page)).missions.gamedev.mode).toBe('planned');
  await page.goto('./#/mission/gamedev');
  await page.getByRole('button', { name: 'Bring into focus', exact: true }).click();
  await completeFirstLesson(page);
  const saved = await stored(page);
  await page.goto('./#/repository-sync');
  await expect(page.getByRole('button', { name: 'Prepare encrypted updates', exact: true })).toBeVisible();
  await expect(page.getByLabel('Journal passphrase', { exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByRole('button', { name: 'Unlock & check published updates', exact: true }).click();
  await page.getByRole('button', { name: 'Prepare encrypted updates', exact: true }).click();
  const text = await page.getByLabel('Encrypted appendable text').inputValue();
  expect(text).not.toContain('Synthetic independent game-learning artifact');
  const appended = parseJournal(text)!;
  expect((await unlockJournal(appended, journalKey)).state).toEqual(saved);
  expect(initial.missions.gamedev.mode).toBe('planned');
});

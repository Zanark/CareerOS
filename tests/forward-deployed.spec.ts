import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { getPackOutline } from '../src/domain/roadmapPacks/registry';
import { fdeSteps } from '../src/tutorial/fdeSteps';
import { openGraphPanel, setGraphCheckbox } from './graph-ui';

const key = 'careerhq.workspace.v1';
test.use({
  timezoneId: 'Asia/Kolkata',
  launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
});

async function seed(page: Page, state: unknown, theme = 'dark') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ state, theme, key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
    if (!localStorage.getItem('careerhq.theme.v1')) localStorage.setItem('careerhq.theme.v1', theme);
  }, { state, theme, key });
}

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
}

async function allStorage(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

for (const [width, theme] of [[1440, 'dark'], [390, 'dark'], [320, 'light']] as const) {
  test(`Fieldcraft curriculum, real sources, optional terrain and complete map fit at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, createInitialState(false), theme);
    await page.goto('./#/practice/fde/fde-01');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Forward Deployed Engineering practice');
    const select = page.getByLabel('Practice module or reference', { exact: true });
    await expect(select.locator('option')).toHaveCount(56);
    const before = await allStorage(page);
    await page.locator('[data-tour="pack-unit-sources"] > summary').click();
    await expect(page.locator('[data-tour="pack-unit-sources"] a')).toHaveCount(6);
    await expect(page.locator('.pack-unit-meta')).toContainText('RESEARCH-BACKED FIELDWORK');
    await expect(page.locator('.pack-study-unit')).not.toContainText('PDF PAGES');
    await expect(page.locator('.pack-source-notice')).not.toContainText('0 pages');
    await expect(page.locator('.pack-unit-guidance details')).toHaveCount(2);
    await page.locator('.pack-unit-guidance details > summary').first().click();
    await noOverflow(page);
    const image = testInfo.outputPath(`fieldcraft-${width}-${theme}.png`);
    await page.screenshot({ path: image });
    await testInfo.attach('Research-backed Fieldcraft lesson / synthetic empty workspace', { path: image, contentType: 'image/png' });
    await page.getByRole('combobox', { name: 'Material', exact: true }).selectOption('practice');
    await expect(select.locator('option').filter({ hasText: '(practice)' })).toHaveCount(8);
    await select.selectOption('fde-lab-ontology');
    await expect(page.locator('.pack-reference-note')).toContainText('not an additional required checkpoint');
    await page.getByRole('link', { name: 'My saved tracker', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Bring into focus', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    const map = page.locator('.full-roadmap-modal');
    await expect(map.locator('.full-roadmap-node')).toHaveCount(48);
    await expect(map.locator('[data-pack-reference]')).toHaveCount(8);
    await expect(map.locator('[data-full-current="true"]')).toHaveCount(1);
    await expect(map.locator('.full-roadmap-stage')).toHaveCount(13);
    await map.getByLabel('Find a roadmap topic').selectOption('fde-v3-fde-48');
    await map.getByRole('link', { name: "Open this checkpoint's study material and exercises", exact: true }).click();
    await expect(page).toHaveURL(/#\/practice\/fde\/fde-48$/);
    await expect(page.locator('.pack-exercises > ol > li')).toHaveCount(2);
    await noOverflow(page);
    await page.reload();
    await expect(page.locator('#pack-unit-title')).toContainText('Capstone / hand over');
    expect(await allStorage(page)).toEqual(before);
  });
}

test('a real old-wire workspace gains only background FDE, then retains its records through evidence, recall and backup import', async ({ page }) => {
  let state = createInitialState(false, '2.0.0');
  state = recordEvidence(state, {
    missionId: 'system', checkpointId: state.missions.system.checkpointId,
    title: 'Synthetic existing design work', summary: 'Synthetic earlier-edition completion with explicit checked evidence.',
    kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
  });
  state.focusMissionId = 'fabric';
  state.missions.fabric.mode = 'active';
  state.missions.pattern.mode = 'background';
  state.missions.escape.blocker = 'Synthetic existing approval blocker';
  state.plans[localDate()] = generatePlan(state);
  const { fde, ...oldMissions } = state.missions;
  await seed(page, { ...state, missions: oldMissions });
  await page.goto('./#/mission/fde');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Forward Deployed Engineering');
  expect(await stored(page)).toEqual(state);
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('What did you make?').selectOption('code');
  await form.getByLabel('Artifact title').fill('Synthetic Fieldcraft role comparison');
  await form.getByLabel('What did you practice?').fill('Synthetic comparison of delivery responsibilities and a reproducible local baseline; no customer experience claimed.');
  await form.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect(page.locator('[data-tour="discovery-notice"]')).toContainText('DISCOVERY UNLOCKED');
  await page.getByRole('link', { name: 'Visit your atlas', exact: true }).click();
  await expect(page.locator('[data-tour="discovery-code-card"]')).toHaveAttribute('data-earned', 'true');
  await page.locator('[data-tour="discovery-code-card"]').click();
  await expect(page.locator('[data-tour="discovery-proof"]')).toContainText('Synthetic Fieldcraft role comparison');
  await page.keyboard.press('Escape');
  await page.goto('./#/recall');
  await page.getByLabel('Filter by mission', { exact: true }).selectOption('fde');
  await expect(page.locator('.recall-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Record recall', exact: true }).click();
  const recall = page.getByRole('dialog', { name: 'Record recall', exact: true });
  await recall.getByRole('radio', { name: 'Independent', exact: true }).check();
  await recall.getByLabel('Explain from memory', { exact: true }).check();
  await recall.getByLabel('Complete exercise', { exact: true }).check();
  await expect(recall.getByRole('button', { name: 'Save recall', exact: true })).toBeDisabled();
  await recall.getByLabel('Draw from memory', { exact: true }).check();
  await recall.getByRole('button', { name: 'Save recall', exact: true }).click();
  const saved = await stored(page);
  expect(saved.focusMissionId).toBe(state.focusMissionId);
  expect(saved.missions.fde).toEqual({ ...fde, status: 'in-progress' });
  expect(saved.missions.system).toEqual(state.missions.system);
  expect(saved.missions.fabric).toEqual(state.missions.fabric);
  expect(saved.missions.pattern).toEqual(state.missions.pattern);
  expect(saved.evidence[0]).toEqual(state.evidence[0]);
  expect(saved.recalls[0]).toMatchObject({ missionId: 'fde', outcome: 'independent' });
  expect(saved.plans).toEqual(state.plans);
  await page.goto('./#/settings');
  const downloaded = page.waitForEvent('download');
  await page.locator('[data-tour="backup-export"]').click();
  const stream = await (await downloaded).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString())).toEqual(saved);
  const chooser = page.waitForEvent('filechooser');
  await page.locator('[data-tour="backup-import"]').click();
  page.once('dialog', dialog => dialog.accept());
  await (await chooser).setFiles({ name: 'synthetic-fde-backup.json', mimeType: 'application/json', buffer: backup });
  await expect.poll(() => stored(page)).toEqual(saved);
  await page.reload();
  await page.goto('./#/mission/fde');
  await expect(page.locator('[data-tour="save-state"]')).toContainText('0 / 48 complete');
  await expect(page.getByRole('button', { name: 'Bring into focus', exact: true })).toBeVisible();
  expect(await stored(page)).toEqual(saved);
});

test('background FDE completion offers a cross-page level-up and reveals only its actual graph for today', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.goto('./#/home');
  const scene = page.locator('.career-graph-scene');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(scene).toHaveAttribute('data-orbit-count', '3');
  await page.goto('./#/mission/fde');
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('What did you make?').selectOption('code');
  await form.getByLabel('Artifact title').fill('Synthetic checked fieldwork');
  await form.getByLabel('What did you practice?').fill('Synthetic role matrix and tested baseline with every authored checkpoint criterion explicitly checked.');
  await form.locator('[data-tour="checkpoint-complete"]').check();
  for (const check of await form.locator('[data-tour="evidence-criteria"] input').all()) await check.check();
  await form.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveAttribute('data-level-up', 'true');
  await page.getByRole('button', { name: 'View level-up', exact: true }).click();
  await expect(page.locator('[data-tour="wayfinder-viewer"]')).toHaveAttribute('data-viewer-state', 'ready');
  await expect(page.locator('[data-tour="wayfinder-panel"]')).toHaveAttribute('data-level', '3');
  await page.goto('./#/home');
  await expect(scene).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await expect(scene).toHaveAttribute('data-orbit-count', '4');
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fde"]').click();
  await expect(page.locator('.career-orbit-inspector')).toHaveAttribute('data-mission-mode', 'background');
  await expect(page.locator('.career-orbit-inspector')).toContainText('Revealed for today after checkpoint completion');
  await setGraphCheckbox(page, 'Show everything', true);
  await expect(scene).toHaveAttribute('data-orbit-count', '10');
  const saved = await stored(page);
  expect(saved.focusMissionId).toBe('pattern');
  expect(saved.missions.fde).toMatchObject({ mode: 'background', checkpointId: 'fde-v3-fde-02' });
  expect(saved.missions.pattern.completedCheckpointIds).toEqual([]);
});

for (const width of [1440, 320]) {
  test(`the appended Fieldcraft chapter exercises real controls without changing storage at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, createInitialState(false));
    await page.goto('./#/settings');
    const before = await allStorage(page);
    await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
    await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('fde');
    for (const step of fdeSteps) {
      const coach = page.locator('.tutorial-panel');
      await expect(coach).toHaveAttribute('data-step', step.id);
      if (step.id === 'fde-library') await page.locator('[data-tour="pack-unit-select"]').selectOption('fde-lab-ontology');
      if (step.id === 'fde-sources') await page.locator('[data-tour="pack-unit-sources"] > summary').click();
      if (step.id === 'fde-work') {
        await page.locator('[data-tour="record-evidence"]').click();
        await page.locator('[data-tour="evidence-example"]').click();
        await page.locator('[data-tour="evidence-submit"]').click();
      }
      if (step.id === 'fde-recall') await page.getByLabel('Filter by mission', { exact: true }).selectOption('fde');
      const next = coach.getByRole('button', { name: step.id === 'fde-finish' ? 'Finish tutorial' : 'Next', exact: true });
      await expect(next).toBeEnabled();
      await noOverflow(page);
      expect(await allStorage(page)).toEqual(before);
      await next.click();
    }
    await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
    expect(await allStorage(page)).toEqual(before);
  });
}

test('global search and source selector expose Fieldcraft without changing a mission', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.goto('./#/hq');
  const before = await allStorage(page);
  await page.getByLabel('Search missions and evidence').fill('Fieldcraft');
  await expect(page.locator('.search-results')).toContainText('Forward Deployed Engineering');
  await page.locator('.search-results a').filter({ hasText: 'Forward Deployed Engineering' }).first().click();
  await expect(page).toHaveURL(/#\/mission\/fde$/);
  await page.goto('./#/sources/fde');
  await expect(page.locator('[data-tour="source-mission"]')).toHaveValue('fde');
  await expect(page.locator('.source-citations a')).toHaveCount((getPackOutline('fde')?.webSources?.length ?? 0) + 1);
  await expect(page.locator('.source-upgrade')).toHaveCount(0);
  expect(await allStorage(page)).toEqual(before);
});

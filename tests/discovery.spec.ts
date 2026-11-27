import { test, expect, type Page } from '@playwright/test';
import { createInitialState, recordEvidence } from '../src/domain/engine';
import { getMission } from '../src/domain/catalog';
import { createDiscoveryPracticeState } from '../src/discovery/practice';
import { getDiscoverySnapshot } from '../src/discovery/model';
import { discoverySteps } from '../src/tutorial/discoverySteps';
import type { AppState } from '../src/domain/types';
import { createCompleteDiscoveryFixture } from './discovery-fixture';
import { WAYFINDER_HISTORY_KEY, wayfinderSourceId } from '../src/discovery/useWayfinderHistory';

const key = 'careerhq.workspace.v1';

async function seed(page: Page, state: AppState) {
  const snapshot = getDiscoverySnapshot(state);
  const sourceId = wayfinderSourceId(snapshot);
  await page.addInitScript(({ storage, value, historyKey, history }) => {
    if (!localStorage.getItem(storage)) localStorage.setItem(storage, JSON.stringify(value));
    if (history && !localStorage.getItem(historyKey)) localStorage.setItem(historyKey, JSON.stringify(history));
  }, { storage: key, value: state, historyKey: WAYFINDER_HISTORY_KEY,
    history: sourceId ? { version: 1, sourceId, xp: snapshot.journey.xp } : null });
}

async function storage(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(name => [name, localStorage.getItem(name)])));
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
}

async function readyViewer(page: Page) {
  const viewer = page.locator('[data-tour="wayfinder-viewer"]');
  await viewer.scrollIntoViewIfNeeded();
  await expect(viewer).toHaveAttribute('data-viewer-state', 'ready');
  return viewer;
}

test('an empty atlas is read-only, deep-linkable, keyboard accessible and does not create rewards from inspection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await seed(page, createInitialState(false));
  await page.goto('./#/discoveries');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Discovery Atlas');
  await expect(page.locator('.discovery-collection-count')).toHaveText('0 / 24 discovered');
  await expect(page.getByRole('button', { name: 'Discovered', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.discovery-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'No discoveries in this view.' })).toBeVisible();
  await page.getByRole('button', { name: 'All signals', exact: true }).click();
  await expect(page.locator('.discovery-card')).toHaveCount(24);
  await readyViewer(page);
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(page.locator('[data-tour="discovery-example"]')).toHaveCount(0);
  const before = await storage(page);
  const card = page.locator('[data-tour="discovery-code-card"]');
  await card.focus();
  await card.press('Enter');
  const dialog = page.locator('dialog.discovery-modal[open]');
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('An undiscovered signal');
  await expect(dialog.locator('[data-tour="discovery-requirement"]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Reveal the trail' }).click();
  await expect(dialog.getByRole('heading', { level: 2 })).toHaveText('A working thought');
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await page.keyboard.press('Escape');
  await expect(card).toBeFocused();
  await expect(card).toHaveAttribute('data-earned', 'false');
  await page.getByRole('button', { name: 'Discovered', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No discoveries in this view.' })).toBeVisible();
  await page.getByRole('button', { name: 'Show all signals', exact: true }).click();
  const today = page.locator('[data-tour="discovery-today"]');
  await today.focus();
  await today.press('ArrowLeft');
  await expect(page.locator('.discovery-day').nth(26)).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.locator('.discovery-day').first()).toBeFocused();
  const columns = await page.locator('.discovery-day-grid').evaluate(node => getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.discovery-day').nth(columns)).toBeFocused();
  await page.keyboard.press('Home');
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-tour="discovery-day-detail"]')).toContainText('No saved learning record on this date.');
  expect(await storage(page)).toEqual(before);
  await page.reload();
  await expect(page.locator('.discovery-collection-count')).toHaveText('0 / 24 discovered');
  await expect(page.getByRole('button', { name: 'Discovered', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.discovery-card')).toHaveCount(0);
  expect(await storage(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('normal evidence unlocks discoveries without completing a checkpoint, and reload does not announce historical awards', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.goto('./#/discoveries');
  const initial = JSON.parse((await storage(page))[key]!) as AppState;
  await page.locator('[data-tour="discovery-next"]').getByRole('link', { name: 'Open checkpoint & criteria' }).click();
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Record progress' });
  await dialog.getByLabel('What did you make?').selectOption('code');
  await dialog.getByLabel('Artifact title').fill('Synthetic code for a discovery browser test');
  await dialog.getByLabel('What did you practice?').fill('Synthetic fixture: traced a small dictionary example and its edge cases.');
  await expect(dialog.locator('[data-tour="checkpoint-complete"]')).not.toBeChecked();
  await dialog.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect(page.locator('[data-tour="discovery-notice"]')).toContainText('DISCOVERIES UNLOCKED');
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveAttribute('data-level-up', 'true');
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveAttribute('data-exp-gain', '260');
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click({ timeout: 1500 });
  await page.getByRole('dialog', { name: 'Record progress' }).getByRole('button', { name: 'Cancel', exact: true }).click();
  const saved = JSON.parse((await storage(page))[key]!) as AppState;
  expect(saved.missions.pattern.completedCheckpointIds).toEqual([]);
  expect(saved.evidence).toHaveLength(1);
  expect(Object.keys(saved)).toEqual(Object.keys(initial));
  await page.getByRole('link', { name: 'Visit your atlas' }).click();
  await expect(page.locator('.discovery-collection-count')).toHaveText('2 / 24 discovered');
  await expect(page.getByRole('button', { name: 'Discovered', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.discovery-card')).toHaveCount(2);
  await expect(page.locator('[data-tour="wayfinder-panel"]')).toHaveAttribute('data-level', '2');
  await expect(page.getByRole('progressbar', { name: 'Wayfinder journey EXP' })).toHaveAttribute('aria-valuenow', '260');
  await expect(page.locator('[data-tour="discovery-code-card"]')).toHaveAttribute('data-earned', 'true');
  await page.locator('[data-tour="discovery-code-card"]').click();
  await expect(page.locator('[data-tour="discovery-proof"]')).toContainText(saved.evidence[0].title);
  await expect(page.locator('[data-tour="discovery-proof"] a')).toHaveAttribute('href', `#/evidence/${saved.evidence[0].id}`);
  const before = await storage(page);
  await page.reload();
  await expect(page.locator('.discovery-collection-count')).toHaveText('2 / 24 discovered');
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
  expect(await storage(page)).toEqual(before);
});

for (const [width, theme] of [[1440, 'dark'], [1440, 'light'], [1024, 'dark'], [780, 'light'], [390, 'dark'], [320, 'light']] as const) {
  test(`synthetic collection has readable meaningful visuals at ${width}px in ${theme}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const state = createDiscoveryPracticeState();
    const expected = getDiscoverySnapshot(state);
    await seed(page, state);
    await page.addInitScript(value => localStorage.setItem('careerhq.theme.v1', value), theme);
    const requests: string[] = [];
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.goto('./#/discoveries');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('.discovery-hero h2')).toHaveCSS('color', 'rgb(238, 232, 213)');
    await expect(page.locator('.discovery-collection-count')).toHaveText(`${expected.earned} / 24 discovered`);
    await expect(page.locator('.map-star.earned')).toHaveCount(expected.earned);
    const centered = await page.locator('.discovery-map-plot').evaluate(node => {
      const core = node.querySelector<SVGGraphicsElement>('.map-core')!;
      const bounds = core.getBoundingClientRect();
      const label = node.querySelector<HTMLElement>('.discovery-map-center')!.getBoundingClientRect();
      return { x: Math.abs(bounds.x + bounds.width / 2 - label.x - label.width / 2), y: Math.abs(bounds.y + bounds.height / 2 - label.y - label.height / 2) };
    });
    expect(centered.x).toBeLessThan(1);
    expect(centered.y).toBeLessThan(1);
    await expect(page.locator('.discovery-card[data-earned="true"]')).toHaveCount(expected.earned);
    await expect(page.getByRole('button', { name: 'Discovered', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.discovery-card')).toHaveCount(expected.earned);
    await page.getByRole('button', { name: 'Undiscovered', exact: true }).click();
    await expect(page.locator('.discovery-card')).toHaveCount(expected.total - expected.earned);
    await expect(page.locator('.discovery-card[data-earned="true"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'All signals', exact: true }).click();
    await expect(page.locator('.discovery-card')).toHaveCount(expected.total);
    await expect(page.locator('.discovery-day')).toHaveCount(28);
    await readyViewer(page);
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('[data-tour="discovery-next"]').scrollIntoViewIfNeeded();
    const expeditionGeometry = await page.locator('[data-tour="discovery-next"]').evaluate(root => {
      const bounds = root.getBoundingClientRect();
      const content = [...root.querySelectorAll<HTMLElement>('h3, select, button, a, .atlas-expedition-awards > span')];
      return content.filter(node => node.getClientRects().length).map(node => {
        const rect = node.getBoundingClientRect();
        return { label: node.textContent, left: rect.left - bounds.left, right: rect.right - bounds.right, font: parseFloat(getComputedStyle(node).fontSize) };
      });
    });
    expect(expeditionGeometry.filter(item => item.left < -1 || item.right > 1)).toEqual([]);
    expect(expeditionGeometry.find(item => item.label?.includes('Record real work'))!.font).toBeGreaterThanOrEqual(13);
    const before = await storage(page);
    const hero = testInfo.outputPath(`discovery-${width}-${theme}-hero.png`);
    await page.screenshot({ path: hero, animations: 'disabled' });
    await testInfo.attach('Synthetic collection / hero and map', { path: hero, contentType: 'image/png' });
    await page.getByRole('button', { name: 'Explore your collection', exact: true }).click();
    const cards = testInfo.outputPath(`discovery-${width}-${theme}-collection.png`);
    await page.screenshot({ path: cards, animations: 'disabled' });
    await testInfo.attach('Synthetic collection / earned and hidden cards', { path: cards, contentType: 'image/png' });
    expect(await page.locator('.discovery-card > p').first().evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(14);
    await page.locator('[data-tour="discovery-first-card"]').hover();
    expect(await page.locator('[data-tour="discovery-first-card"]').evaluate(node => getComputedStyle(node).transform)).toBe('none');
    await page.locator('[data-tour="discovery-memory-family"]').click();
    await expect(page.locator('.discovery-card')).toHaveCount(6);
    await page.locator('[data-tour="discovery-all-families"]').click();
    await page.locator('.discovery-day[data-recorded="true"]').first().click();
    await expect(page.locator('[data-tour="discovery-day-detail"] .discovery-sources a').first()).toBeVisible();
    await noOverflow(page);
    await page.locator('[data-tour="discovery-first-card"]').click();
    await expect(page.locator('[data-tour="discovery-proof"]')).toContainText('Tutorial explanation example');
    await noOverflow(page);
    await page.keyboard.press('Escape');
    expect(await storage(page)).toEqual(before);
    const origin = new URL(page.url()).origin;
    expect(requests.filter(url => new URL(url).origin !== origin)).toEqual([]);
  });
}

for (const width of [1440, 320]) {
  test(`the appended discovery chapter uses real controls and preserves all real storage at ${width}px`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 844 });
    const real = recordEvidence(createInitialState(false), {
      missionId: 'pattern', checkpointId: createInitialState(false).missions.pattern.checkpointId,
      title: 'Existing synthetic workspace record', summary: 'Synthetic storage-isolation fixture; never a real user record.',
      kind: 'note', url: '', advance: false, criteriaConfirmed: false,
    });
    await seed(page, real);
    await page.goto('./#/settings');
    await expect(page.getByRole('heading', { name: 'Settings & data', level: 1 })).toBeVisible();
    const before = await storage(page);
    await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
    await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('discovery');
    for (const step of discoverySteps) {
      const coach = page.locator('.tutorial-panel');
      await expect(coach).toHaveAttribute('data-step', step.id);
      switch (step.id) {
        case 'discovery-example': await page.locator('[data-tour="discovery-example"]').click(); break;
        case 'discovery-family': await page.locator('[data-tour="discovery-memory-family"]').click(); break;
        case 'discovery-character-play': await page.locator('[data-tour="wayfinder-replay"]').click(); break;
        case 'discovery-character-orbit':
          await page.locator('[data-tour="wayfinder-viewer"] canvas').focus();
          await page.locator('[data-tour="wayfinder-viewer"] canvas').press('ArrowRight');
          break;
        case 'discovery-character-reset':
          await page.locator('[data-tour="wayfinder-reset-view"]').click();
          await expect(page.locator('[data-tour="wayfinder-viewer"]')).toHaveAttribute('data-view-default', 'true');
          await expect(page.locator('[data-tour="wayfinder-viewer"]')).toHaveAttribute('data-control-mode', 'rotate');
          break;
        case 'discovery-diorama-move':
          await page.locator('[data-tour="wayfinder-pan-mode"]').click();
          await page.locator('[data-tour="wayfinder-viewer"] canvas').focus();
          await page.locator('[data-tour="wayfinder-viewer"] canvas').press('Shift+ArrowRight');
          break;
        case 'discovery-character-skip':
          if (await page.locator('[data-tour="wayfinder-skip"]').isVisible()) await page.locator('[data-tour="wayfinder-skip"]').click();
          break;
        case 'discovery-character-memory': await page.locator('[data-tour="wayfinder-first-chapter"]').click(); break;
        case 'discovery-character-current': await page.locator('[data-tour="wayfinder-current"]').click(); break;
        case 'discovery-inspect':
          await page.locator('[data-tour="discovery-all-families"]').click();
          await page.locator('[data-tour="discovery-code-card"]').click();
          break;
        case 'discovery-reveal':
          await expect(coach.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
          await page.locator('[data-tour="discovery-reveal"]').click();
          break;
        case 'discovery-work':
          await page.locator('[data-tour="evidence-example"]').click();
          await expect(page.locator('[data-tour="checkpoint-complete"]')).not.toBeChecked();
          await page.locator('[data-tour="evidence-submit"]').click();
          break;
        case 'discovery-proof': await page.locator('[data-tour="discovery-code-card"]').click(); break;
        case 'discovery-activity': await page.locator('[data-tour="discovery-today"]').click(); break;
        case 'discovery-rules': await page.locator('[data-tour="discovery-rules"] > summary').click(); break;
      }

      expect(await storage(page), step.id).toEqual(before);
      await noOverflow(page);
      const next = coach.getByRole('button', { name: 'Next', exact: true });
      await expect(next).toBeEnabled();
      await expect(next).toBeInViewport();
      await next.click();
    }
    await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'fde-intro');
    await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
    await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
    await expect(page).toHaveURL(/#\/settings$/);
    expect(await storage(page)).toEqual(before);
  });
}

test('prologue and level-up replay cannot earn EXP, and reduced motion settles immediately', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.goto('./#/discoveries');
  const before = await storage(page);
  const panel = page.locator('[data-tour="wayfinder-panel"]');
  await expect(panel).toHaveAttribute('data-level', '1');
  await panel.getByRole('button', { name: 'Play prologue' }).click();
  await expect(panel).toHaveAttribute('data-replay-count', '1');
  await expect(panel.locator('[data-tour="wayfinder-sequence"]')).toHaveAttribute('data-sequence-kind', 'prologue');
  await panel.locator('[data-tour="wayfinder-skip"]').click();
  await expect(panel.locator('[data-tour="wayfinder-sequence"]')).toHaveAttribute('data-phase', 'complete');
  await expect(panel.locator('.wayfinder-sequence-meter .wayfinder-exp-track > i')).toHaveCSS('width', '0px');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await panel.getByRole('button', { name: 'Play prologue' }).click();
  await expect(panel).toHaveAttribute('data-replay-count', '2');
  await expect(panel.locator('[data-tour="wayfinder-sequence"]')).toHaveAttribute('data-phase', 'complete');
  expect(await panel.evaluate(node => node.getAnimations({ subtree: true }).length)).toBe(0);
  await expect(panel).toHaveAttribute('data-level', '1');
  await expect(page.locator('.discovery-collection-count')).toHaveText('0 / 24 discovered');
  expect(await storage(page)).toEqual(before);
});

test('the full collection has an earned final character form, not a career-readiness score', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const complete = createCompleteDiscoveryFixture();
  const xp = getDiscoverySnapshot(complete).journey.xp;
  await seed(page, complete);
  await page.goto('./#/discoveries');
  await expect(page.locator('.discovery-collection-count')).toHaveText('24 / 24 discovered');
  const panel = page.locator('[data-tour="wayfinder-panel"]');
  await expect(panel).toHaveAttribute('data-level', '7');
  await expect(panel).toContainText('Every form is yours');
  await expect(panel).toContainText('not your career');
  await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0');
  await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuemax', String(xp));
  await readyViewer(page);
  await expect(panel.locator('[data-tour="wayfinder-viewer"]')).toHaveAttribute('data-model-level', '7');
  await expect(panel.locator('[data-tour="wayfinder-viewer"]')).toHaveAttribute('data-equipment', /astral-crown-and-star-manta/);
  const screenshot = testInfo.outputPath('wayfinder-complete-synthetic.png');
  await panel.screenshot({ path: screenshot, animations: 'disabled' });
  await testInfo.attach('Final form / fully synthetic qualifying records', { path: screenshot, contentType: 'image/png' });
});

test('a next-reward preview and expedition choice are explicitly unearned, keyboard-operable views', async ({ page }) => {
  await seed(page, createInitialState(false));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/discoveries');
  const viewer = await readyViewer(page);
  const panel = page.locator('[data-tour="wayfinder-panel"]');
  const before = await storage(page);
  await page.locator('[data-tour="wayfinder-preview"]').focus();
  await page.keyboard.press('Enter');
  await viewer.scrollIntoViewIfNeeded();
  await expect(panel).toHaveAttribute('data-preview', 'true');
  await expect(panel).toHaveAttribute('data-level', '1');
  await expect(viewer).toHaveAttribute('data-model-level', '2');
  await expect(panel.locator('.wayfinder-preview-label')).toContainText('NOT EARNED');
  await expect(panel.locator('[data-chapter-level="2"]')).toBeDisabled();
  await expect(panel.locator('[data-chapter-level="2"]')).toHaveAttribute('aria-pressed', 'false');
  await expect(panel.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await expect(panel.locator('[data-tour="wayfinder-replay"]')).toHaveCount(0);
  await panel.locator('[data-tour="wayfinder-current"]').click();
  await expect(viewer).toHaveAttribute('data-model-level', '1');
  await page.getByLabel('Expedition route', { exact: true }).selectOption('system');
  await expect(page.locator('[data-tour="discovery-next"]')).toHaveAttribute('data-expedition', 'system');
  await page.locator('[data-tour="expedition-record"]').click();
  const dialog = page.getByRole('dialog', { name: 'Record progress' });
  await expect(dialog.getByRole('combobox', { name: 'Mission', exact: true })).toHaveValue('system');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await storage(page)).toEqual(before);
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
});

test('finishing an already-practiced checkpoint advances EXP and gives feedback without another collectible', async ({ page }) => {
  const complete = createCompleteDiscoveryFixture();
  const beforeSnapshot = getDiscoverySnapshot(complete);
  const beforeCompleted = complete.missions.pattern.completedCheckpointIds.length;
  await seed(page, complete);
  await page.goto('./#/discoveries');
  await page.locator('[data-tour="expedition-record"]').click();
  const dialog = page.getByRole('dialog', { name: 'Record progress' });
  await dialog.getByLabel('What did you make?').selectOption('exercise');
  await dialog.getByLabel('Artifact title').fill('Synthetic completed expedition checkpoint');
  await dialog.getByLabel('What did you practice?').fill('Fictional browser qualification only: an explicit criteria-confirmed example.');
  await dialog.locator('[data-tour="checkpoint-complete"]').check();
  for (const criterion of await dialog.locator('[data-tour="evidence-criteria"] input').all()) await criterion.check();
  await dialog.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  const notice = page.locator('[data-tour="discovery-notice"]');
  await expect(notice).toContainText('JOURNEY ADVANCED');
  await expect(notice).toHaveAttribute('data-exp-gain', '80');
  await expect(notice).toHaveAttribute('data-level-up', 'false');
  await expect(page.locator('.discovery-collection-count')).toHaveText('24 / 24 discovered');
  await expect(page.getByRole('progressbar', { name: 'Wayfinder journey EXP' })).toHaveAttribute('aria-valuenow', String(beforeSnapshot.journey.xp + 80));
  const saved = JSON.parse((await storage(page))[key]!) as AppState;
  expect(saved.missions.pattern.completedCheckpointIds).toHaveLength(beforeCompleted + 1);
  expect(saved.evidence).toHaveLength(complete.evidence.length + 1);
  expect(Object.keys(saved)).toEqual(Object.keys(complete));
  await page.reload();
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
  await expect(page.getByRole('progressbar', { name: 'Wayfinder journey EXP' })).toHaveAttribute('aria-valuenow', String(beforeSnapshot.journey.xp + 80));
});

test('expeditions respect blockers, completed routes and initially planned curricula without changing focus', async ({ page }) => {
  let state = createInitialState(false);
  for (const checkpoint of getMission('escape', state).checkpoints) {
    state = recordEvidence(state, {
      missionId: 'escape', checkpointId: checkpoint.id, kind: 'note', url: '',
      title: 'Synthetic completed-route fixture', summary: 'Fictional criteria-confirmed route used only in an isolated browser context.',
      advance: true, criteriaConfirmed: true,
    });
  }
  state.missions.pattern.blocker = 'Synthetic route blocker; no real user progress.';
  await seed(page, state);
  await page.goto('./#/discoveries');
  const before = await storage(page);
  const expedition = page.locator('[data-tour="discovery-next"]');
  await expect(expedition).toContainText(state.missions.pattern.blocker);
  await expect(expedition.locator('[data-tour="expedition-record"]')).toHaveCount(0);
  await expect(page.getByLabel('Expedition route', { exact: true }).locator('option[value="gamedev"]')).toHaveCount(0);
  await page.getByLabel('Expedition route', { exact: true }).selectOption('escape');
  await expect(expedition).toContainText('This route is in your wake.');
  await expect(expedition.locator('[data-tour="expedition-record"]')).toHaveCount(0);
  await expect(expedition.getByRole('link', { name: 'Revisit saved work' })).toHaveAttribute('href', '#/evidence');
  await page.getByLabel('Expedition route', { exact: true }).selectOption('system');
  await expect(expedition.locator('[data-tour="expedition-record"]')).toBeVisible();
  expect(await storage(page)).toEqual(before);
});

test('confirmed source replacement still announces a new discovery when total EXP stays unchanged', async ({ page }) => {
  const make = (kind: 'code' | 'exercise') => {
    const state = createInitialState(false);
    return recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId, kind, url: '',
      title: 'Synthetic replacement-source fixture', summary: 'Fictional browser import only; not a user record or demonstrated skill.',
      advance: false, criteriaConfirmed: false,
    });
  };
  const first = make('code');
  const replacement = make('exercise');
  expect(getDiscoverySnapshot(replacement).journey.xp).toBe(getDiscoverySnapshot(first).journey.xp);
  await seed(page, first);
  await page.goto('./#/settings');
  await expect(page.locator('[data-tour="discovery-notice"]')).toHaveCount(0);
  page.once('dialog', dialog => dialog.accept());
  await page.getByLabel('Choose backup file', { exact: true }).setInputFiles({
    name: 'synthetic-equal-exp-replacement.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(replacement)),
  });
  const notice = page.locator('[data-tour="discovery-notice"]');
  await expect(notice).toContainText('Hands on');
  await expect(notice).toContainText('SOURCES UPDATED');
  await expect(notice).toHaveAttribute('data-exp-gain', '0');
  await expect(notice).toHaveAttribute('data-level-up', 'false');
  const saved = JSON.parse((await storage(page))[key]!) as AppState;
  expect(saved.evidence).toEqual(replacement.evidence);
  expect(saved.missions.pattern.completedCheckpointIds).toEqual([]);
});

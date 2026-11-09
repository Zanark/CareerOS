import { test as base, expect, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate } from '../src/domain/engine';
import { steps } from '../src/tutorial/steps';
import { graphSkillCheckpointTitle } from '../src/tutorial/graphControls';

const key = 'careerhq.workspace.v1';
const themeKey = 'careerhq.theme.v1';
const graphCheckboxLessons: Record<string, [string, boolean]> = {
  'career-graph-checkpoints-hide': ['Checkpoints', false],
  'career-graph-checkpoints-show': ['Checkpoints', true],
  'graph-labels-hide': ['Node labels', false], 'graph-labels-show': ['Node labels', true],
  'graph-everything-on': ['Show everything', true], 'graph-everything-off': ['Show everything', false],
  'graph-shared-hide': ['Shared skill links', false], 'graph-shared-show': ['Shared skill links', true],
  'graph-rings-hide': ['Rings', false], 'graph-rings-show': ['Rings', true],
  'graph-sparks-hide': ['Sparks', false], 'graph-sparks-show': ['Sparks', true],
  'graph-autorotate-off': ['Auto-rotate', false],
  'graph-heartbeat-off': ['Core heartbeat', false],
};

async function setGraphRange(page: Page, label: string, value: number) {
  const input = page.getByRole('slider', { name: label, exact: true });
  const range = await input.evaluate(element => {
    const control = element as HTMLInputElement;
    return { current: control.valueAsNumber, min: Number(control.min), max: Number(control.max), step: Number(control.step) };
  });
  await input.focus();
  if (value === range.min || value === range.max) {
    await input.press(value === range.min ? 'Home' : 'End');
  } else {
    for (let remaining = Math.abs(value - range.current); remaining > 0; remaining -= range.step) {
      await input.press(value > range.current ? 'ArrowRight' : 'ArrowLeft');
    }
  }
  await expect(input).toHaveValue(String(value));
}
const test = base.extend<{ healthy: void }>({
  healthy: [async ({ context }, use) => {
    const errors: string[] = [];
    const watch = (page: Page) => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    };
    context.pages().forEach(watch);
    context.on('page', watch);
    await use();
    expect(errors).toEqual([]);
  }, { auto: true }],
});

async function snapshot(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(name => [name, localStorage.getItem(name)])));
}

async function start(page: Page) {
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'welcome-intro');
}

async function confirm(page: Page, action: () => Promise<unknown>) {
  const dialog = page.waitForEvent('dialog');
  const pending = action();
  await (await dialog).accept();
  await pending;
}

test('overview is a compact tracker without accounts, streak copy, or assumed progress', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('./#/hq');
  await expect(page.getByRole('heading', { level: 1, name: 'Overview', exact: true })).toBeVisible();
  const words = (await page.locator('main').innerText()).trim().split(/\s+/).length;
  expect(words).toBeLessThanOrEqual(180);
  await expect(page.locator('.avatar, .workspace-label, .hero, .capacity-note, .readiness-preview')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/streak|long game|next chapter/i);
  await expect(page.getByText('Stored in this browser only', { exact: true })).toBeVisible();
  await expect(page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true })).toBeVisible();
  const state = await page.evaluate(storage => JSON.parse(localStorage.getItem(storage)!), key);
  expect(state.sampleData).toBe(false);
  expect(state.evidence).toEqual([]);
  expect(state.events).toEqual([]);
  const path = testInfo.outputPath('minimal-tracking-overview.png');
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach('minimal-tracking-overview', { path, contentType: 'image/png' });
});

test('an existing workspace survives the UI update without a reset or migration', async ({ page }) => {
  const state = createInitialState(true);
  state.objective = 'Existing synthetic goal to preserve across a UI-only update.';
  state.plans[localDate()] = generatePlan(state);
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  await page.goto('./');
  expect(await page.evaluate(storage => localStorage.getItem(storage), key)).toBe(raw);
  await page.reload();
  expect(await page.evaluate(storage => localStorage.getItem(storage), key)).toBe(raw);
  await expect(page.getByText('Includes example data.', { exact: true })).toBeVisible();
});

test('overview stays bounded when all configured missions are active', async ({ page }) => {
  const state = createInitialState(false);
  for (const mission of Object.values(state.missions)) {
    if (mission.mode !== 'planned') mission.mode = 'active';
  }
  state.focusMissionId = 'neural';
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state });
  await page.goto('./#/hq');
  await expect(page.locator('.overview-checkpoint')).toHaveCount(3);
  await expect(page.locator('.overview-checkpoint').first()).toContainText('AI');
  await expect(page.getByRole('link', { name: '6 more active missions' })).toBeVisible();
});

for (const width of [1440, 390, 320]) {
  test(`complete click-by-click tutorial preserves real data at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => undefined } });
    });
    await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 });
    await page.goto('./#/settings');
    await page.getByLabel('What are you working toward?').fill('Existing real-workspace fixture, not tutorial progress.');
    await page.getByRole('button', { name: 'Save direction', exact: true }).click();
    await page.getByRole('switch', { name: 'Dark theme' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect.poll(() => page.getByRole('switch', { name: 'Dark theme' }).getAttribute('data-motion')).toBeNull();
    await page.evaluate(() => localStorage.setItem('unrelated-app', 'must remain unchanged'));
    const before = await snapshot(page);
    await start(page);
    let exported: Buffer | undefined;
    const visited: string[] = [];
    for (const step of steps) {
      const coach = page.locator('.tutorial-panel');
      await expect(coach).toHaveAttribute('data-step', step.id);
      visited.push(step.id);
      const checkboxLesson = graphCheckboxLessons[step.id];
      if (checkboxLesson) {
        await page.getByRole('checkbox', { name: checkboxLesson[0], exact: true }).setChecked(checkboxLesson[1]);
        if (step.id === 'graph-everything-on') {
          await expect(page.getByRole('checkbox', { name: 'Node labels', exact: true })).toBeDisabled();
          await expect(page.getByRole('checkbox', { name: 'Node labels', exact: true })).toBeChecked();
        }
        if (step.id === 'graph-everything-off') {
          await expect(page.getByRole('checkbox', { name: 'Node labels', exact: true })).not.toBeChecked();
        }
        if (step.id === 'graph-sparks-hide' || step.id === 'graph-sparks-show') {
          for (const name of ['Spark dots', 'Spark lines']) {
            const slider = page.getByRole('slider', { name, exact: true });
            await expect(slider).toHaveValue('10');
            if (step.id === 'graph-sparks-hide') await expect(slider).toBeDisabled();
            else await expect(slider).toBeEnabled();
          }
        }
      }
      switch (step.id) {
        case 'graph-spacing-spread':
          await setGraphRange(page, 'Node spacing', 300);
          break;
        case 'graph-spacing-reset':
          await setGraphRange(page, 'Node spacing', 100);
          break;
        case 'graph-records-references-hide':
        case 'graph-records-references-show':
          for (const name of ['Work records', 'References']) {
            await page.getByRole('checkbox', { name, exact: true }).setChecked(step.id.endsWith('-show'));
          }
          break;
        case 'graph-spark-amount':
          await setGraphRange(page, 'Spark dots', 35);
          await expect(page.getByRole('slider', { name: 'Spark lines', exact: true })).toHaveValue('10');
          break;
        case 'graph-spark-lines':
          await setGraphRange(page, 'Spark lines', 35);
          await expect(page.getByRole('slider', { name: 'Spark dots', exact: true })).toHaveValue('35');
          break;
        case 'graph-spark-reset':
          await setGraphRange(page, 'Spark dots', 10);
          await setGraphRange(page, 'Spark lines', 10);
          break;
        case 'graph-pause':
          await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
          break;
        case 'graph-clear-center':
          await page.getByRole('checkbox', { name: 'Core heartbeat', exact: true }).check();
          await page.getByRole('button', { name: 'Clear center', exact: true }).click();
          break;
        case 'graph-ring-select':
          await page.locator('.career-orbit-list [data-orbit-id="orbit:mission:pattern"]').click();
          break;
        case 'graph-ring-speed':
          await setGraphRange(page, 'Rotation speed', 200);
          break;
        case 'graph-ring-speed-reset':
          await setGraphRange(page, 'Rotation speed', 100);
          break;
        case 'graph-ring-stage':
          await page.getByRole('combobox', { name: 'Orbit stage or record group', exact: true }).selectOption({ index: 1 });
          break;
        case 'graph-ring-basis':
          await page.locator('.career-orbit-basis > summary').click();
          break;
        case 'graph-ring-members':
          await page.locator('.career-orbit-member-details > summary').click();
          await page.getByLabel('Search orbit members', { exact: true }).fill('HashMap');
          break;
        case 'graph-focus-ring':
          await page.getByRole('button', { name: 'Focus ring', exact: true }).click();
          break;
        case 'graph-ring-current':
          await page.locator('.career-orbit-current').click();
          break;
        case 'graph-connections':
          await page.getByLabel('Search career graph nodes', { exact: true }).fill('HashMap');
          await page.locator('[data-tour="career-graph-list"] button').filter({
            has: page.locator('strong', { hasText: graphSkillCheckpointTitle }),
          }).click();
          await page.locator('.career-graph-connections > summary').click();
          break;
        case 'graph-connection-sources':
          await page.locator('.career-graph-connection-reason details > summary').first().click();
          break;
        case 'graph-hidden-inspect':
          await page.locator('.career-graph-connections li:has(.career-graph-connection-hidden) button').first().click();
          await expect(page.locator('[data-tour="career-graph-node"]')).toContainText('Details only:');
          break;
        case 'graph-group-hide':
          await page.locator('[data-visibility-group="mission:pattern"] input').uncheck();
          break;
        case 'graph-individual-search':
          await page.locator('.career-visibility-items > summary').click();
          await page.getByLabel('Search visibility items', { exact: true }).fill('HashMap');
          break;
        case 'graph-individual-mixed':
          await page.locator('[data-visibility-item^="checkpoint:pattern:"] input').first().check();
          await expect(page.locator('[data-visibility-group="mission:pattern"] input')).toHaveAttribute('aria-checked', 'mixed');
          break;
        case 'graph-select-all':
          await page.getByRole('button', { name: 'Select all items', exact: true }).click();
          break;
        case 'career-graph-search':
          await page.getByLabel('Search career graph nodes', { exact: true }).fill('HashMap');
          break;
        case 'career-graph-select':
          await page.locator('[data-tour="career-graph-list"] button').first().click();
          break;
        case 'graph-focus-node':
          await page.getByRole('button', { name: 'Focus node', exact: true }).click();
          break;
        case 'graph-zoom':
          await page.getByRole('button', { name: 'Zoom career graph in', exact: true }).click();
          break;
        case 'graph-rotate':
          await page.locator('.career-graph-keyboard > summary').click();
          await page.getByRole('button', { name: 'Rotate left', exact: true }).click();
          break;
        case 'graph-drag': {
          await page.getByRole('button', { name: 'Close node details', exact: true }).click();
          const canvas = page.locator('.career-graph-page canvas');
          await canvas.scrollIntoViewIfNeeded();
          const point = await canvas.evaluate(element => {
            const box = element.getBoundingClientRect();
            for (let y = Math.max(12, box.top + 24); y < Math.min(innerHeight - 30, box.bottom - 30); y += 24) {
              for (let x = Math.min(innerWidth - 12, box.right - 24); x > Math.max(72, box.left + 72); x -= 24) {
                if ([0, 0.5, 1].every(t => document.elementFromPoint(x - 55 * t, y + 15 * t) === element)) return { x, y };
              }
            }
            return null;
          });
          expect(point, 'The actual canvas must have an unobstructed drag path beside the coach and inspector').not.toBeNull();
          const { x, y } = point!;
          await page.mouse.click(x, y);
          await expect(coach.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
          await page.mouse.move(x, y);
          await page.mouse.down();
          await page.mouse.move(x - 55, y + 15, { steps: 5 });
          await page.mouse.up();
          break;
        }
        case 'graph-frame':
          await page.getByRole('button', { name: 'Frame all', exact: true }).click();
          break;
        case 'graph-fullscreen':
          await page.getByRole('button', { name: 'Full screen', exact: true }).click();
          await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true);
          await expect(page.locator('.career-graph-stage-wrap > .tutorial-panel')).toBeVisible();
          break;
        case 'graph-fullscreen-exit':
          await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
          await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(false);
          break;
        case 'dsa-notebook-companion':
          await page.locator('[data-tour="dsa-notebook-companion"] > summary').click();
          break;
        case 'system-concepts-search':
          await page.getByLabel('Search System Design concepts', { exact: true }).fill('Circuit Breaker');
          break;
        case 'system-practice-select':
          await page.getByLabel('System Design module or case', { exact: true }).selectOption('module-52');
          break;
        case 'system-practice-transfer':
          await page.locator('[data-tour="system-transfer-drills"] > summary').click();
          break;
        case 'dsa-library-section':
          await page.getByLabel('DSA source section', { exact: true }).selectOption('9');
          break;
        case 'dsa-library-filter':
          await page.getByLabel('Filter DSA problems by difficulty', { exact: true }).selectOption('Easy');
          break;
        case 'plan-capacity':
          await page.locator('[data-tour="capacity"]').getByRole('button', { name: 'Gentle', exact: true }).click();
          break;
        case 'plan-refresh':
          await page.locator('[data-tour="plan-refresh"]').click();
          break;
        case 'plan-focus':
        case 'plan-pause':
          await page.locator('[data-tour="focus-start"]').click();
          break;
        case 'plan-open-pattern':
          await page.locator('[data-tour="plan-open-pattern"]').click();
          break;
        case 'focus-room-open':
          await page.locator('[data-tour="focus-room-open"]').click();
          break;
        case 'focus-room-run':
          if (!/pause/i.test(await page.locator('[data-tour="focus-room-toggle"]').innerText())) await page.locator('[data-tour="focus-room-toggle"]').click();
          break;
        case 'focus-room-report':
          await page.locator('[data-tour="focus-room-distraction"]').click();
          break;
        case 'focus-room-close':
          await page.locator('[data-tour="focus-room-close"]').click();
          break;
        case 'focus-room-history':
          await page.locator('[data-tour="focus-history"] > summary').click();
          break;
        case 'mission-list':
          await page.getByRole('button', { name: /^Planned/ }).click();
          await expect(page.locator('.mission-card')).toHaveCount(0);
          await page.getByRole('button', { name: /^All missions/ }).click();
          break;
        case 'evidence-open':
          await page.locator('[data-tour="record-evidence"]').click();
          break;
        case 'evidence-save':
          await expect(page.locator('dialog[open] .tutorial-panel')).toBeVisible();
          await page.locator('[data-tour="evidence-example"]').click();
          await page.locator('[data-tour="evidence-submit"]').click();
          await expect(page.locator('dialog[open]')).toHaveCount(0);
          break;
        case 'evidence-activity':
          await expect(page.locator('.mission-work-streak[data-mission-id="pattern"]')).toHaveAttribute('data-worked-today', 'true');
          await expect(page.locator('.mission-work-streak[data-mission-id="pattern"]')).toHaveAttribute('data-work-streak', '1');
          await page.locator('.mission-work-streak summary').click();
          break;
        case 'evidence-complete':
          await expect(page.locator('dialog[open] .tutorial-panel')).toBeVisible();
          await page.locator('[data-tour="evidence-example"]').click();
          await page.locator('[data-tour="checkpoint-complete"]').check();
          for (const checkbox of await page.locator('[data-tour="evidence-criteria"] input').all()) await checkbox.check();
          await page.locator('[data-tour="evidence-submit"]').click();
          await expect(page.locator('dialog[open]')).toHaveCount(0);
          break;
        case 'control-mode':
        case 'control-background':
          await page.locator('[data-tour="mission-mode"]').click();
          break;
        case 'control-primary':
          await page.locator('[data-tour="mission-primary"]').click();
          break;
        case 'control-blocker':
          await page.locator('[data-tour="blocker-input"]').fill('Need a practice lab');
          await page.locator('[data-tour="blocker-submit"]').click();
          break;
        case 'control-blocker-clear':
          await page.locator('[data-tour="blocker-input"]').fill('');
          await page.locator('[data-tour="blocker-submit"]').click();
          break;
        case 'control-background-evidence':
        case 'control-background-complete':
          await page.locator('[data-tour="record-evidence"]').click();
          await page.locator('[data-tour="evidence-example"]').click();
          if (step.id === 'control-background-complete') {
            await page.locator('[data-tour="checkpoint-complete"]').check();
            for (const checkbox of await page.locator('[data-tour="evidence-criteria"] input').all()) await checkbox.check();
          } else {
            await expect(page.locator('[data-tour="checkpoint-complete"]')).not.toBeChecked();
          }
          await page.locator('[data-tour="evidence-submit"]').click();
          await expect(page.locator('dialog[open]')).toHaveCount(0);
          break;
        case 'control-background-graph':
          await page.locator('.career-orbit-list [data-orbit-id="orbit:mission:fabric"]').click();
          await expect(page.locator('.career-orbit-inspector')).toContainText('Revealed for today after checkpoint completion');
          await expect(page.locator('.career-orbit-inspector')).toHaveAttribute('data-mission-mode', 'background');
          break;
        case 'source-bulk-preview':
          await page.getByRole('button', { name: 'Adopt all documented roadmaps', exact: true }).click();
          await expect(page.locator('dialog.bulk-roadmap-modal[open] .tutorial-panel')).toBeVisible();
          break;
        case 'source-bulk-cancel':
          await page.locator('dialog.bulk-roadmap-modal[open]').getByRole('button', { name: 'Cancel', exact: true }).click();
          await expect(page.locator('dialog.bulk-roadmap-modal[open]')).toHaveCount(0);
          break;
        case 'source-select-fabric':
          await page.locator('[data-tour="source-mission"]').selectOption('fabric');
          break;
        case 'source-preview':
          await page.locator('[data-tour="source-preview"] > summary').click();
          break;
        case 'source-adopt':
          await confirm(page, () => page.locator('[data-tour="source-adopt"]').click());
          break;
        case 'source-archive':
          await page.locator('[data-tour="source-archive"] > summary').click();
          break;
        case 'source-stage': {
          const select = page.locator('[data-tour="roadmap-stage"]');
          await select.selectOption({ index: await select.locator('option').count() - 1 });
          break;
        }

        case 'source-topics':
          await page.locator('[data-tour="roadmap-stage-topics"] > summary').click();
          break;
        case 'source-optional': {
          await page.locator('[data-tour="source-mission"]').selectOption('credential');
          const select = page.locator('[data-tour="roadmap-stage"]');
          const optional = select.locator('option').filter({ hasText: '(optional)' }).first();
          await select.selectOption((await optional.getAttribute('value'))!);
          break;
        }
        case 'source-forecast':
          await page.locator('[data-tour="source-mission"]').selectOption('algorithm');
          break;
        case 'pack-open':
          await page.locator('[data-tour="pack-library-open"]').click();
          break;
        case 'pack-reference': {
          const select = page.locator('[data-tour="pack-unit-select"]');
          const reference = select.locator('option').filter({ hasText: /\((practice|reference)\)$/ }).first();
          await select.selectOption((await reference.getAttribute('value'))!);
          break;
        }
        case 'pack-guide':
          await page.locator('[data-tour="pack-shared-guide"] > summary').click();
          break;
        case 'full-map-open':
          await page.locator('[data-tour="full-roadmap-open"]').click();
          await expect(page.locator('.tutorial-map-guided')).toBeVisible();
          break;
        case 'full-map-zoom':
          await page.locator('[data-tour="full-map-zoom-in"]').click();
          break;
        case 'full-map-inspect':
          await page.locator('[data-tour="full-map-last-node"]').click();
          break;
        case 'full-map-current':
          await page.locator('[data-tour="full-map-current"]').click();
          break;
        case 'full-map-fit':
          await page.locator('[data-tour="full-map-fit"]').click();
          break;
        case 'full-map-close':
          await page.locator('[data-tour="dialog-close"]').click();
          break;
        case 'pipeline-open':
          await page.locator('[data-tour="pipeline-add"]').click();
          break;
        case 'pipeline-details':
          await page.locator('[data-tour="opportunity-example"]').click();
          await page.locator('[data-tour="application-details"] > summary').click();
          break;
        case 'pipeline-add':
          await expect(page.locator('dialog[open] .tutorial-panel')).toBeVisible();
          await page.locator('[data-tour="opportunity-submit"]').click();
          break;
        case 'pipeline-stage':
          await page.locator('[data-tour="opportunity-stage"]').first().selectOption('Recruiter');
          break;
        case 'pipeline-table':
          await page.locator('[data-tour="pipeline-table"]').click();
          await expect(page.getByRole('table')).toBeVisible();
          break;
        case 'pipeline-metrics':
          await page.locator('[data-tour="application-metrics"] > summary').click();
          await expect(page.locator('[data-tour="application-metrics"]')).toContainText('Tutorial variant');
          break;
        case 'review-filter-work':
          await page.locator('[data-tour="saved-work-type"]').selectOption('code');
          break;
        case 'review-recall':
          await page.locator('[data-tour="recall-add"]').first().click();
          await page.getByRole('dialog', { name: 'Record recall', exact: true }).getByRole('radio', { name: 'Partial', exact: true }).check();
          await page.locator('[data-tour="recall-save"]').click();
          break;
        case 'review-independent':
          await page.locator('[data-tour="recall-add"]').first().click();
          await page.locator('[data-tour="recall-independent-choice"]').check();
          for (const checkbox of await page.locator('[data-tour="recall-checks"] input[data-required="true"]').all()) await checkbox.check();
          await page.locator('[data-tour="recall-save"]').click();
          break;
        case 'freelance-add':
          await page.locator('[data-tour="freelance-add"]').click();
          await page.locator('[data-tour="freelance-example"]').click();
          await page.locator('[data-tour="freelance-save"]').click();
          break;
        case 'freelance-classify':
          await page.locator('[data-tour="freelance-verdict"]').first().selectOption('Apply Now');
          break;
        case 'freelance-research-examples':
          await page.locator('[data-tour="freelance-research-examples"]').click();
          break;
        case 'freelance-brief':
          for (const checkbox of (await page.locator('[data-tour="freelance-select"]').all()).slice(0, 5)) await checkbox.check();
          break;
        case 'freelance-copy':
          await page.locator('[data-tour="freelance-copy"]').click();
          break;
        case 'readiness-coding':
          await page.locator('[data-tour="readiness-coding"]').getByRole('button', { name: 'Building', exact: true }).click();
          break;
        case 'readiness-interview-mode':
          await page.locator('[data-tour="interview-mode"]').check();
          break;
        case 'settings-goal':
          await page.getByLabel('What are you working toward?').fill('Temporary tutorial goal only.');
          await page.locator('[data-tour="goal-form"]').getByRole('button', { name: 'Save direction', exact: true }).click();
          break;
        case 'settings-export': {
          const promise = page.waitForEvent('download');
          await page.locator('[data-tour="backup-export"]').click();
          const file = await promise;
          expect(file.suggestedFilename()).toMatch(/^careerhq-tutorial-example-/);
          const stream = await file.createReadStream();
          const chunks: Buffer[] = [];
          for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
          exported = Buffer.concat(chunks);
          const sample = JSON.parse(exported.toString());
          expect(sample.missions.pattern.completedCheckpointIds).toHaveLength(1);
          expect(sample.evidence).toHaveLength(4);
          expect(sample.evidence.filter((item: { missionId: string }) => item.missionId === 'fabric')).toHaveLength(2);
          expect(sample.opportunities[0].stage).toBe('Recruiter');
          expect(sample.opportunities[0]).toMatchObject({ lane: 'ats', resumeVariant: 'Tutorial variant', effortMinutes: 5, frictionScore: 2 });
          expect(sample.freelanceOpportunities).toHaveLength(10);
          expect(sample.recalls).toHaveLength(2);
          expect(sample.focusSessions?.flatMap((session: { events: { kind: string }[] }) => session.events)
            .filter((event: { kind: string }) => event.kind === 'distraction')).toHaveLength(1);
          expect(sample.archives).toHaveLength(1);
          expect(sample.archives[0].missionId).toBe('fabric');
          expect(sample.archives[0].progress.completedCheckpointIds).toHaveLength(1);
          expect(sample.missions.fabric.roadmapVersion).toBe('3.0.0');
          expect(sample.missions.fabric.completedCheckpointIds).toEqual([]);
          expect(sample.objective).toBe('Temporary tutorial goal only.');
          break;
        }
        case 'settings-import': {
          expect(exported).toBeDefined();
          const chooserPromise = page.waitForEvent('filechooser');
          await page.locator('[data-tour="backup-import"]').click();
          const chooser = await chooserPromise;
          await confirm(page, () => chooser.setFiles({
            name: 'careerhq-tutorial-example.json', mimeType: 'application/json', buffer: exported!,
          }));
          break;
        }
        case 'tools-search':
          await expect(page).toHaveTitle('Overview - CareerOS');
          await page.locator('[data-tour="global-search"]').fill('DSA');
          await expect(page.locator('.search-results')).toBeVisible();
          break;
        case 'tools-theme':
          await page.getByRole('switch', { name: 'Dark theme' }).click();
          break;
        case 'discovery-example':
          await page.locator('[data-tour="discovery-example"]').click();
          break;
        case 'discovery-family':
          await page.locator('[data-tour="discovery-memory-family"]').click();
          break;
        case 'discovery-character-play':
          await page.locator('[data-tour="wayfinder-replay"]').click();
          break;
        case 'discovery-character-orbit':
          await page.locator('[data-tour="wayfinder-viewer"] canvas').focus();
          await page.locator('[data-tour="wayfinder-viewer"] canvas').press('ArrowRight');
          break;
        case 'discovery-character-reset':
          await page.locator('[data-tour="wayfinder-reset-view"]').click();
          break;
        case 'discovery-diorama-move':
          await page.locator('[data-tour="wayfinder-pan-mode"]').click();
          await page.locator('[data-tour="wayfinder-viewer"] canvas').focus();
          await page.locator('[data-tour="wayfinder-viewer"] canvas').press('Shift+ArrowRight');
          break;
        case 'discovery-character-skip':
          if (await page.locator('[data-tour="wayfinder-skip"]').isVisible()) await page.locator('[data-tour="wayfinder-skip"]').click();
          break;
        case 'discovery-character-memory':
          await page.locator('[data-tour="wayfinder-first-chapter"]').click();
          break;
        case 'discovery-character-current':
          await page.locator('[data-tour="wayfinder-current"]').click();
          break;
        case 'discovery-inspect':
          await page.locator('[data-tour="discovery-all-families"]').click();
          await page.locator('[data-tour="discovery-code-card"]').click();
          break;
        case 'discovery-reveal':
          await page.locator('[data-tour="discovery-reveal"]').click();
          break;
        case 'discovery-work':
          await page.locator('[data-tour="evidence-example"]').click();
          await expect(page.locator('[data-tour="checkpoint-complete"]')).not.toBeChecked();
          await page.locator('[data-tour="evidence-submit"]').click();
          break;
        case 'discovery-proof':
          await page.locator('[data-tour="discovery-code-card"]').click();
          break;
        case 'discovery-activity':
          await page.locator('[data-tour="discovery-today"]').click();
          break;
        case 'discovery-rules':
          await page.locator('[data-tour="discovery-rules"] > summary').click();
          break;
      }
      const observed = await page.evaluate(() => ({
        storage: Object.fromEntries(Object.keys(localStorage).sort().map(name => [name, localStorage.getItem(name)])),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      }));
      expect(observed.storage, `Real storage must not change during ${step.id}`).toEqual(before);
      expect(observed.overflow).toBeLessThanOrEqual(0);
      const next = coach.getByRole('button', { name: step.id === steps.at(-1)!.id ? 'Finish tutorial' : 'Next', exact: true });
      await expect(next).toBeEnabled();
      if (['evidence-save', 'settings-export', 'tools-help'].includes(step.id)) {
        const path = testInfo.outputPath(`tutorial-${width}-${step.id}.png`);
        await page.screenshot({ path, fullPage: false });
        await testInfo.attach(`${width}-${step.id}`, { path, contentType: 'image/png' });
      }
      await next.click();
    }
    expect(visited).toEqual(steps.map(step => step.id));
    await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
    await expect(page.locator('.tutorial-panel')).toHaveCount(0);
    await expect(page.locator('.tutorial-highlight')).toHaveCount(0);
    await expect(page).toHaveURL(/#\/settings$/);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await snapshot(page)).toEqual(before);
    await page.reload();
    await expect(page.getByLabel('What are you working toward?')).toHaveValue('Existing real-workspace fixture, not tutorial progress.');
    expect(await snapshot(page)).toEqual(before);
  });
}

test('exit inside a modal discards its draft, and restart uses fresh practice state', async ({ page }) => {
  await page.goto('./');
  const before = await snapshot(page);
  await start(page);
  const coach = page.locator('.tutorial-panel');
  await coach.getByRole('combobox', { name: 'Tutorial chapter' }).selectOption('evidence');
  await page.locator('[data-tour="record-evidence"]').click();
  await expect(page.locator('dialog[open] .tutorial-panel')).toBeVisible();
  await coach.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('[data-tour="evidence-example"]').click();
  await page.locator('dialog[open] .tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  await expect(page.locator('dialog[open]')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  await start(page);
  await coach.getByRole('combobox', { name: 'Tutorial chapter' }).selectOption('pipeline');
  await page.locator('[data-tour="pipeline-add"]').click();
  await page.locator('[data-tour="opportunity-example"]').click();
  await page.locator('[data-tour="opportunity-submit"]').click();
  await coach.getByRole('button', { name: 'Restart tutorial', exact: true }).click();
  await expect(coach).toHaveAttribute('data-step', 'welcome-intro');
  await coach.getByRole('combobox', { name: 'Tutorial chapter' }).selectOption('pipeline');
  await expect(page.locator('.opportunity-card')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  await coach.getByRole('button', { name: 'Exit tutorial', exact: true }).click();
});

test('a newer tab update is never overwritten when the tutorial exits', async ({ page, context }) => {
  await page.goto('./#/settings');
  const other = await context.newPage();
  await other.goto('./#/settings');
  await start(page);
  await other.getByLabel('What are you working toward?').fill('A newer goal saved in another tab.');
  await other.getByRole('button', { name: 'Save direction', exact: true }).click();
  const latest = await snapshot(other);
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  expect(await snapshot(page)).toEqual(latest);
  await expect(page.getByRole('alert').filter({ hasText: /changed in another tab/ })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('What are you working toward?')).toHaveValue('A newer goal saved in another tab.');
});

test('the real focus session continues independently of tutorial practice', async ({ page }) => {
  await page.goto('./#/plan');
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.locator('[data-tour="focus-start"]').click();
  await page.clock.fastForward(65_000);
  await expect(page.getByRole('timer')).toHaveText('23:55');
  const before = await snapshot(page);
  await start(page);
  await page.clock.fastForward(30_000);
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page).toHaveURL(/#\/plan$/);
  await expect(page.getByRole('timer')).toHaveText('23:25');
  await expect(page.getByRole('button', { name: 'Pause session', exact: true })).toBeVisible();
  expect(await snapshot(page)).toEqual(before);
});

test('a private backup transfers progress into an independent browser workspace', async ({ page, browser, baseURL }) => {
  await page.goto('./#/settings');
  await page.getByLabel('What are you working toward?').fill('Synthetic source-browser progress to transfer.');
  await page.getByRole('button', { name: 'Save direction', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  const exported = JSON.parse(backup.toString());
  const separate = await browser.newContext();
  try {
    const destination = await separate.newPage();
    await destination.goto(new URL('./#/settings', baseURL!).href);
    await expect(destination.getByLabel('What are you working toward?')).not.toHaveValue(exported.objective);
    await confirm(destination, () => destination.getByLabel('Choose backup file', { exact: true }).setInputFiles({
      name: download.suggestedFilename(), mimeType: 'application/json', buffer: backup,
    }));
    await expect(destination.getByLabel('What are you working toward?')).toHaveValue(exported.objective);
    expect(await destination.evaluate(storage => JSON.parse(localStorage.getItem(storage)!), key)).toEqual(exported);
    await destination.reload();
    expect(await destination.evaluate(storage => JSON.parse(localStorage.getItem(storage)!), key)).toEqual(exported);
    expect(await page.evaluate(storage => JSON.parse(localStorage.getItem(storage)!), key)).toEqual(exported);
  } finally {
    await separate.close();
  }
});

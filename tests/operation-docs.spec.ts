import { test, expect, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, recordEvidence } from '../src/domain/engine';
import { getLatestMission, getMissionVersion } from '../src/domain/catalog';
import { legacyMissionIds } from '../src/domain/legacyState';
import type { AppState } from '../src/domain/types';

const key = 'careerhq.workspace.v1';

function legacyWire() {
  const state = createInitialState(true, '1.0.0');
  state.plans[localDate()] = generatePlan(state);
  state.missions.pattern.blocker = 'Synthetic previous-roadmap blocker.';
  const withoutVersion = <T extends { roadmapVersion?: string }>(entry: T) => {
    const { roadmapVersion, ...rest } = entry;
    return rest;
  };
  return {
    schemaVersion: 1, roadmapVersion: '1.0.0', sampleData: state.sampleData,
    updatedAt: state.updatedAt, objective: state.objective, focusMissionId: state.focusMissionId,
    capacity: state.capacity, interviewMode: state.interviewMode,
    missions: Object.fromEntries(legacyMissionIds.map(id => [id, withoutVersion(state.missions[id])])),
    plans: Object.fromEntries(Object.entries(state.plans).map(([date, actions]) => [date, actions.map(withoutVersion)])),
    evidence: state.evidence.map(withoutVersion), events: state.events,
    readiness: state.readiness, opportunities: state.opportunities,
  };
}

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(storage => JSON.parse(localStorage.getItem(storage)!), key);
}

async function confirmation(page: Page, action: () => Promise<unknown>, accept = true) {
  const prompt = page.waitForEvent('dialog');
  const pending = action();
  const dialog = await prompt;
  if (accept) await dialog.accept(); else await dialog.dismiss();
  await pending;
}

test('v1 migration preserves records and adopting a roadmap requires confirmation', async ({ page }) => {
  const original = legacyWire();
  await page.addInitScript(({ key, original }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(original));
  }, { key, original });
  await page.goto('./#/mission/pattern');
  await expect(page.getByRole('heading', { name: 'DSA', level: 1, exact: true })).toBeVisible();
  const migrated = await stored(page);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.missions.pattern.roadmapVersion).toBe('1.0.0');
  expect(migrated.missions.pattern.checkpointId).toBe(original.missions.pattern.checkpointId);
  expect(migrated.evidence).toEqual(original.evidence);
  expect(migrated.events).toEqual(original.events);
  expect(migrated.plans).toEqual(original.plans);
  expect(migrated.missions.income.completedCheckpointIds).toEqual([]);
  await expect(page.getByRole('button', { name: 'Adopt documented roadmap', exact: true })).toBeVisible();
  await confirmation(page, () => page.getByRole('button', { name: 'Adopt documented roadmap', exact: true }).click(), false);
  expect(await stored(page)).toEqual(migrated);
  await confirmation(page, () => page.getByRole('button', { name: 'Adopt documented roadmap', exact: true }).click());
  const adopted = await stored(page);
  expect(adopted.missions.pattern.roadmapVersion).toBe('3.0.0');
  expect(adopted.missions.pattern.completedCheckpointIds).toEqual([]);
  expect(adopted.missions.pattern.blocker).toBe('');
  expect(adopted.archives[0].progress).toEqual(migrated.missions.pattern);
  expect(adopted.evidence).toEqual(migrated.evidence);
  expect(adopted.events.slice(0, migrated.events.length)).toEqual(migrated.events);
  expect(adopted.plans).toEqual(migrated.plans);
  await page.locator('.roadmap-archive > summary').click();
  await expect(page.locator('.roadmap-archive')).toContainText('Synthetic previous-roadmap blocker.');
  await expect(page.locator('.roadmap-archive .flow-checkpoint')).toHaveCount(5);
  await page.reload();
  expect(await stored(page)).toEqual(adopted);
  await page.goto('./#/evidence');
  for (const evidence of original.evidence) {
    await expect(page.getByRole('heading', { name: evidence.title, exact: true })).toBeVisible();
  }
});

test('documented phases, optional references and the expanded contest curriculum are visible', async ({ page }) => {
  await page.goto('./#/sources');
  await expect(page.getByRole('heading', { name: 'Operation documents', level: 1, exact: true })).toBeVisible();
  const selector = page.locator('.source-selector select');
  await expect(selector.locator('option')).toHaveCount(10);
  await selector.selectOption('fabric');
  await expect(page.locator('.source-counts')).toContainText('32 tracked nodes');
  await expect(page.getByRole('combobox', { name: 'Roadmap stage' })).toHaveCount(1);
  await page.getByRole('combobox', { name: 'Roadmap stage' }).selectOption({ index: 4 });
  await expect(page.locator('.source-flow-canvas .flow-checkpoint')).toHaveCount(7);
  await selector.selectOption('credential');
  await expect(page.locator('.source-counts')).toContainText('53 tracked nodes');
  const stages = page.getByRole('combobox', { name: 'Roadmap stage' });
  const optional = await stages.locator('option').filter({ hasText: '(optional)' }).all();
  expect(optional).toHaveLength(getLatestMission('credential').stages!.filter(stage => stage.optional).length);
  await stages.selectOption(await optional[0].getAttribute('value') ?? '');
  await expect(page.locator('.source-flow-canvas')).toHaveCount(0);
  await selector.selectOption('algorithm');
  await expect(page.locator('.source-counts')).toContainText('34 tracked nodes');
  await expect(page.getByRole('combobox', { name: 'Roadmap stage' }).locator('option')).toHaveCount(6);
  await expect(page.locator('.source-panel')).toContainText('Operation_Algorithm_Forge_Complete_Roadmap.pdf');
  await expect(page.locator('.flow-checkpoint')).not.toHaveCount(0);
});

test('source-defined HashMap branches remain selectable with one current checkpoint', async ({ page }) => {
  let state = createInitialState(false);
  const mission = getMissionVersion('pattern', '2.0.0');
  for (const checkpoint of mission.checkpoints.slice(0, 3)) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: checkpoint.id, title: 'Synthetic source checkpoint',
      summary: 'A source-owned test fixture with explicit criteria confirmation.',
      kind: 'code', url: '', advance: true, criteriaConfirmed: true,
    });
  }
  await page.addInitScript(({ key, state }) => localStorage.setItem(key, JSON.stringify(state)), { key, state });
  await page.goto('./#/mission/pattern');
  const grouping = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.4')!;
  const complement = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.3')!;
  await page.getByRole('button', { name: `Make current: ${grouping.title}`, exact: true }).click();
  const next = await stored(page);
  expect(next.missions.pattern.checkpointId).toBe(grouping.id);
  expect(next.missions.pattern.completedCheckpointIds).not.toContain(complement.id);
  await expect(page.locator('[data-tour="mission-roadmap"] .flow-checkpoint.current')).toHaveCount(1);
  const lastRow = page.locator('[data-tour="mission-roadmap"] .source-level').last();
  await expect(lastRow.locator('.flow-checkpoint')).toHaveCount(2);
  const boxes = await lastRow.locator('.flow-checkpoint').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().y));
  expect(Math.abs(boxes[0] - boxes[1])).toBeLessThan(1);
});

test('freelance ledger stores private research and produces a five-item review brief', async ({ page }) => {
  await page.goto('./#/freelance');
  const before = (await stored(page)).missions.income;
  for (let index = 1; index <= 5; index++) {
    await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
    const form = page.getByRole('dialog', { name: 'Add opportunity', exact: true });
    await form.getByLabel('Role / title').fill(`Synthetic freelance role ${index}`);
    await form.getByLabel('Platform', { exact: true }).fill('Example marketplace');
    await form.getByLabel('Skills').fill('API design, testing');
    await form.getByRole('button', { name: 'Save opportunity', exact: true }).click();
    await expect(form).toHaveCount(0);
  }
  await page.getByRole('combobox', { name: 'Verdict for Synthetic freelance role 1' }).selectOption('Apply Now');
  for (const box of await page.getByRole('checkbox', { name: /Select Synthetic freelance role/ }).all()) await box.check();
  await expect(page.getByRole('button', { name: 'Copy brief', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Review brief text' })).toHaveValue(/Synthetic freelance role 5/);
  expect((await stored(page)).freelanceOpportunities).toHaveLength(5);
  expect((await stored(page)).missions.income).toEqual(before);
  await page.reload();
  await expect(page.locator('.freelance-table tbody tr')).toHaveCount(5);
});

test('recall recording checks independent evidence without changing checkpoint completion', async ({ page }) => {
  let state = createInitialState(false);
  state = recordEvidence(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'Synthetic recall exercise', summary: 'Practice evidence for a later recall check.',
    kind: 'code', url: '', advance: false, criteriaConfirmed: false,
  });
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key, state });
  await page.goto('./#/recall');
  const before = (await stored(page)).missions;
  await page.getByRole('button', { name: 'Record recall', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record recall', exact: true });
  await form.getByRole('radio', { name: 'Independent', exact: true }).check();
  await expect(form.getByRole('button', { name: 'Save recall', exact: true })).toBeDisabled();
  await form.getByRole('checkbox', { name: 'Explain from memory', exact: true }).check();
  await form.getByRole('checkbox', { name: 'Complete exercise', exact: true }).check();
  await form.getByRole('button', { name: 'Save recall', exact: true }).click();
  await expect(form).toHaveCount(0);
  expect((await stored(page)).recalls).toHaveLength(1);
  expect((await stored(page)).missions).toEqual(before);
  await expect(page.locator('.recall-card')).toContainText('Practiced');
  await expect(page.locator('.recall-card')).not.toContainText('Retained');
});

test('application effort and resume details remain private persisted observations', async ({ page }) => {
  await page.goto('./#/pipeline');
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Add opportunity', exact: true });
  await form.getByLabel('Company', { exact: true }).fill('Synthetic Example Company');
  await form.getByLabel('Role', { exact: true }).fill('Platform role');
  await form.getByText('Application details (optional)', { exact: true }).click();
  await form.getByLabel('Application lane').selectOption('ats');
  await form.getByLabel('Resume variant').fill('Platform variant');
  await form.getByLabel('Time spent (minutes)').fill('1440');
  await form.getByLabel('Friction score (1-10)').fill('4');
  await form.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  expect((await stored(page)).opportunities[0]).toMatchObject({
    lane: 'ats', resumeVariant: 'Platform variant', effortMinutes: 1440, frictionScore: 4,
  });
  await page.getByText('Resume variants, application lanes and effort', { exact: true }).click();
  await expect(page.locator('.application-details-table')).toContainText('Platform variant');
  await page.reload();
  expect((await stored(page)).opportunities[0].frictionScore).toBe(4);
});

import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, parseState, recordEvidence } from '../src/domain/engine';
import { getMission } from '../src/domain/catalog';
import type { AppState } from '../src/domain/types';
import { buildCareerGraph } from '../src/graph/careerGraphModel';
import type { CareerOrbit } from '../src/graph/careerOrbitTypes';
import { graphCheckbox, openGraphPanel, searchGraphNodes, setGraphCheckbox, setGraphScope } from './graph-ui';

const key = 'careerhq.workspace.v1';

async function open(page: Page, state = createInitialState(false)) {
  state.plans[localDate()] = generatePlan(state);
  const canonical = parseState(state);
  const raw = JSON.stringify(canonical);
  await page.addInitScript(({ key, raw }) => {
    localStorage.setItem(key, raw);
    const original = HTMLCanvasElement.prototype.getContext;
    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      value: function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
        return type === 'webgl2' ? null : Reflect.apply(original, this, [type, ...args]);
      },
    });
  }, { key, raw });
  await page.goto('./#/home');
  await expect(page.locator('.career-graph-scene')).toHaveAttribute('data-scene-state', 'unavailable');
  await openGraphPanel(page, 'rings');
  await expect(page.locator('.career-orbit-list > button')).toHaveCount(10);
  return { raw, graph: buildCareerGraph(canonical) };
}

async function inspect(page: Page, orbit: CareerOrbit) {
  await openGraphPanel(page, 'rings');
  await page.locator('.career-orbit-list > button').filter({ has: page.getByText(orbit.label, { exact: true }) }).click();
  const inspector = page.getByRole('complementary', { name: 'Selected career orbit', exact: true });
  await expect(inspector).toHaveAttribute('data-orbit-id', orbit.id);
  await expect(inspector.getByRole('heading', { name: orbit.label, exact: true, level: 2 })).toBeVisible();
  return inspector;
}

async function inspectNode(page: Page, label: string) {
  await searchGraphNodes(page, label);
  await page.locator('.career-graph-node-list > button').filter({ has: page.getByText(label, { exact: true }) }).click();
  const inspector = page.getByRole('complementary', { name: 'Selected career node', exact: true });
  await expect(inspector.getByRole('heading', { level: 2 })).toHaveText(label);
  return inspector;
}

function completeOne(state: AppState) {
  return recordEvidence(state, {
    missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
    title: 'Synthetic orbit checkpoint', summary: 'Synthetic confirmed work for saved-version orbit coverage.',
    kind: 'exercise', url: '', advance: true, criteriaConfirmed: true,
  });
}

test('mission orbits inspect the exact saved roadmap and current checkpoint without another tracker', async ({ page }) => {
  const state = completeOne(createInitialState(false, '2.0.0'));
  const mission = getMission('pattern', state);
  const { raw, graph } = await open(page, state);
  const orbit = graph.orbits.find(item => item.missionId === 'pattern')!;
  const inspector = await inspect(page, orbit);
  await expect(inspector).toBeFocused();
  await expect(inspector).toContainText('Saved tracker v2.0.0');
  await expect(inspector.getByRole('progressbar')).toHaveAttribute('value', '1');
  await expect(inspector.getByRole('progressbar')).toHaveAttribute('max', String(mission.checkpoints.length));
  await expect(inspector).toContainText('not an extra task');
  await expect(inspector.getByRole('combobox', { name: 'Orbit stage or record group' }).locator('option')).toHaveCount(orbit.segments.length + 1);
  const stage = orbit.segments[0];
  await inspector.getByRole('combobox', { name: 'Orbit stage or record group' }).selectOption(stage.id);
  await expect(inspector.getByRole('heading', { name: stage.label, level: 3, exact: true })).toBeVisible();
  await inspector.locator('.career-orbit-member-details > summary').click();
  await expect(inspector.locator('.career-orbit-members li')).toHaveCount(stage.members.length);
  await inspector.locator('.career-orbit-current').click();
  await expect(page.getByRole('complementary', { name: 'Selected career node' }).getByRole('heading', { level: 2 }))
    .toHaveText(mission.checkpoints.find(checkpoint => checkpoint.id === state.missions.pattern.checkpointId)!.title);
  await expect(page.getByRole('complementary', { name: 'Selected career orbit' })).toHaveCount(0);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('ring focus labels retain mission identity in every mode without hiding recorded completion', async ({ page }) => {
  const state = completeOne(createInitialState(false, '2.0.0'));
  state.missions.pattern.mode = 'background';
  const { raw, graph } = await open(page, state);
  const cards = page.locator('.career-orbit-list > button');
  await expect(cards.filter({ hasText: 'Active - colored outer ring' })).toHaveCount(2);
  const background = page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:pattern"]');
  await expect(background).toHaveAttribute('data-mission-mode', 'background');
  await expect(background.locator('i')).toHaveCSS('background-color', 'rgb(38, 139, 210)');
  await expect(background).toContainText('Background - small stationary ring');
  const inspector = await inspect(page, graph.orbits.find(item => item.missionId === 'pattern')!);
  await expect(inspector).toContainText('smaller stationary ring in its mission color near the core');
  await expect(inspector.getByRole('progressbar')).toHaveAttribute('value', '1');
  await expect(inspector.getByRole('button', { name: 'Record evidence', exact: true })).toBeEnabled();
  await inspector.locator('.career-orbit-member-details > summary').click();
  await expect(inspector.locator('.graph-status-tag.complete')).toHaveCount(1);
  await expect(inspector.locator('.graph-status-tag.complete')).toHaveText('Recorded done');
  const planned = await inspect(page, graph.orbits.find(item => item.missionId === 'algorithm')!);
  await expect(planned).toHaveAttribute('data-mission-mode', 'planned');
  await expect(planned).toContainText('Planned mission - smaller stationary ring in its mission color');
  const active = await inspect(page, graph.orbits.find(item => item.missionId === 'system')!);
  await expect(active).toHaveAttribute('data-mission-mode', 'active');
  await expect(active).toContainText('colored outer ring');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('Bring into focus and Move to background update ring presentation without changing checkpoint records', async ({ page }) => {
  const { graph } = await open(page);
  const fabric = graph.orbits.find(item => item.missionId === 'fabric')!;
  await inspect(page, fabric);
  const before = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
  for (const [button, expectedMode] of [['Bring into focus', 'active'], ['Move to background', 'background']] as const) {
    await page.getByRole('link', { name: 'Open mission', exact: true }).click();
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.locator('a[href="#/home"]').first().click();
    await openGraphPanel(page, 'rings');
    const inspector = await inspect(page, fabric);
    await expect(inspector).toHaveAttribute('data-mission-mode', expectedMode);
    const card = page.locator('.career-orbit-list > button[data-orbit-id="orbit:mission:fabric"]');
    await expect(card.locator('i')).toHaveCSS('background-color', 'rgb(232, 74, 95)');
    if (expectedMode === 'active') await expect(card).not.toContainText('Hidden in this view');
    else await expect(card).toContainText('Hidden in this view');
    const after = JSON.parse((await page.evaluate(key => localStorage.getItem(key), key))!) as AppState;
    expect(after.missions.fabric).toEqual({ ...before.missions.fabric, mode: expectedMode });
    expect(after.focusMissionId).toBe(before.focusMissionId);
    expect(after.evidence).toEqual(before.evidence);
  }
});

test('pipeline records remain inspectable through their mission connections and existing application page', async ({ page }) => {
  const state = createInitialState(false);
  state.opportunities = (['Found', 'Accepted', 'Rejected'] as const).map(stage => ({
    id: `synthetic-${stage}`, company: 'Synthetic company', role: 'Synthetic role', stage,
    notes: 'Synthetic test record', url: '', createdAt: state.updatedAt,
  }));
  const { raw, graph } = await open(page, state);
  await expect(page.locator('.career-orbit-list > button[data-orbit-id="orbit:opportunity"]')).toHaveCount(0);
  await setGraphScope(page, 'pattern');
  await setGraphCheckbox(page, 'Work records', false);
  await setGraphCheckbox(page, 'References', false);
  await setGraphCheckbox(page, 'Rings', false);
  await setGraphCheckbox(page, 'Sparks', false);
  await inspect(page, graph.orbits.find(orbit => orbit.missionId === 'escape')!);
  const hub = graph.nodes.find(node => node.kind === 'mission' && node.missionId === 'escape')!;
  const inspector = await inspectNode(page, hub.label);
  await inspector.locator('.career-graph-connections > summary').click();
  const rejected = graph.nodes.find(node => node.id.endsWith('synthetic-Rejected'))!;
  await inspector.getByRole('button', { name: `Reveal and inspect ${rejected.label}`, exact: true }).click();
  for (const name of ['Work records', 'References']) await expect(graphCheckbox(page, name)).toBeChecked();
  await expect(graphCheckbox(page, 'Rings')).not.toBeChecked();
  await expect(graphCheckbox(page, 'Sparks')).not.toBeChecked();
  await expect(inspector.locator('.graph-status-tag')).toHaveText('Reference');
  await expect(inspector).toContainText('Closed pipeline reference, not an achievement');
  await expect(inspector.getByRole('link', { name: 'Open related page', exact: true })).toHaveAttribute('href', '#/pipeline');
  await inspector.getByRole('link', { name: 'Open related page', exact: true }).click();
  await expect(page.locator('.opportunity-card')).toHaveCount(3);
  await expect(page.locator('.opportunity-card select')).toHaveCount(3);
  expect(await page.locator('.opportunity-card select').evaluateAll(elements => elements.map(element => (element as HTMLSelectElement).value).sort()))
    .toEqual(['Accepted', 'Found', 'Rejected']);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('empty record groups invent neither rings nor records, and existing Saved work remains usable without WebGL', async ({ page }) => {
  const { raw, graph } = await open(page);
  const empty = graph.orbits.filter(orbit => orbit.kind !== 'mission' && !orbit.memberIds.length);
  expect(empty.length).toBeGreaterThanOrEqual(4);
  await openGraphPanel(page, 'visibility');
  for (const orbit of empty) {
    const group = page.locator(`[data-visibility-group="collection:${orbit.kind}"]`);
    await expect(group).toContainText('0 of 0 chosen');
    await expect(group.getByRole('checkbox')).toBeDisabled();
    await expect(page.locator(`.career-orbit-list > button[data-orbit-id="${orbit.id}"]`)).toHaveCount(0);
  }
  await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: 'Saved work', exact: true }).click();
  await expect(page.getByText('No saved work yet.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add evidence', exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('checkpoint details expose only relevant supporting evidence while Saved work retains every mission record', async ({ page }) => {
  let state = createInitialState(false);
  for (const missionId of ['pattern', 'system'] as const) {
    state = recordEvidence(state, {
      missionId, checkpointId: state.missions[missionId].checkpointId,
      title: `Synthetic ${missionId} evidence`, summary: 'A synthetic practice record without completion credit.',
      kind: 'exercise', url: '', advance: false, criteriaConfirmed: false,
    });
  }
  const { raw, graph } = await open(page, state);
  await setGraphScope(page, 'pattern');
  await setGraphCheckbox(page, 'Work records', false);
  await setGraphCheckbox(page, 'References', false);
  const mission = await inspect(page, graph.orbits.find(orbit => orbit.missionId === 'pattern')!);
  await mission.getByRole('button', { name: /Current checkpoint:/ }).click();
  const inspector = page.getByRole('complementary', { name: 'Selected career node', exact: true });
  await inspector.locator('.career-graph-connections > summary').click();
  await expect(inspector.locator('[data-connection-kind="evidence"]')).toHaveCount(1);
  await expect(inspector).not.toContainText('Synthetic system evidence');
  await inspector.getByRole('button', { name: 'Reveal and inspect Synthetic pattern evidence', exact: true }).click();
  await expect(inspector.getByRole('heading', { level: 2 })).toHaveText('Synthetic pattern evidence');
  await expect(inspector).toContainText('Practice record; not an automatic mastery assessment.');
  await expect(graphCheckbox(page, 'Work records')).toBeChecked();
  await expect(graphCheckbox(page, 'References')).toBeChecked();
  await inspector.getByRole('link', { name: 'Open related page', exact: true }).click();
  await expect(page.locator('.evidence-card')).toHaveCount(2);
  for (const id of ['pattern', 'system']) await expect(page.getByRole('heading', { name: `Synthetic ${id} evidence`, exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('mission ring inspection and checkpoint lists fit a 320px viewport without altering progress', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  const { raw, graph } = await open(page);
  const inspector = await inspect(page, graph.orbits.find(orbit => orbit.missionId === 'system')!);
  await inspector.locator('.career-orbit-member-details > summary').click();
  await inspector.getByLabel('Search orbit members', { exact: true }).fill('HTTP');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(inspector).toBeInViewport();
  await testInfo.attach('compact-orbit-inspection', { body: await page.screenshot(), contentType: 'image/png' });
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

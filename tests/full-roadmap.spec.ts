import { test, expect, type Locator, type Page } from '@playwright/test';
import { activateCheckpoint, createInitialState, generatePlan, localDate, recordEvidence } from '../src/domain/engine';
import { getMission, getMissionVersion, prerequisitesFor } from '../src/domain/catalog';
import type { AppState, Mission, MissionId } from '../src/domain/types';

const workspaceKey = 'careerhq.workspace.v1';
const themeKey = 'careerhq.theme.v1';
const nodeSelector = '.full-roadmap-node[data-full-checkpoint]';
const stageSelector = '.full-roadmap-stage[data-full-stage]';

function completeCurrent(state: AppState, missionId: MissionId) {
  return recordEvidence(state, {
    missionId, checkpointId: state.missions[missionId].checkpointId,
    title: 'Synthetic full-roadmap regression evidence',
    summary: 'Test-owned practice with all completion criteria explicitly confirmed.',
    kind: 'note', url: '', advance: true, criteriaConfirmed: true,
  });
}

async function storage(page: Page) {
  return page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]),
  ));
}

async function loadMission(page: Page, state: AppState, id: MissionId, theme = 'dark') {
  const date = localDate();
  state = { ...state, plans: { ...state.plans, [date]: state.plans[date] ?? generatePlan(state, date) } };
  const raw = JSON.stringify(state);
  await page.addInitScript(({ workspaceKey, themeKey, raw, theme }) => {
    if (!localStorage.getItem(workspaceKey)) localStorage.setItem(workspaceKey, raw);
    if (!localStorage.getItem(themeKey)) localStorage.setItem(themeKey, theme);
  }, { workspaceKey, themeKey, raw, theme });
  await page.goto(`./#/mission/${id}`);
  await expect(page.getByRole('heading', { level: 1, name: getMission(id, state).name, exact: true })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), workspaceKey)).toBe(raw);
}

async function openRoadmap(page: Page, mission: Mission, keyboard = false) {
  const opener = page.getByRole('button', { name: 'Full roadmap', exact: true });
  if (keyboard) {
    await opener.focus();
    await page.keyboard.press('Enter');
  } else {
    await opener.click();
  }
  const dialog = page.getByRole('dialog', { name: `${mission.name} full roadmap`, exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveClass(/full-roadmap-modal/);
  await expect(dialog).toHaveAttribute('open', '');
  await expect(dialog.getByRole('combobox', { name: 'Roadmap stage', exact: true })).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return dialog;
}

async function expectFit(dialog: Locator) {
  await expect(dialog.locator('.full-roadmap-graph')).toBeVisible();
  await expect.poll(() => dialog.evaluate(root => {
    const viewport = root.querySelector<HTMLElement>('.full-roadmap-viewport')!;
    const bounds = viewport.getBoundingClientRect();
    const left = bounds.left + viewport.clientLeft;
    const top = bounds.top + viewport.clientTop;
    const items = root.querySelectorAll('.full-roadmap-graph, .full-roadmap-stage, .full-roadmap-node');
    return viewport.clientWidth > 0 && viewport.clientHeight > 0 && items.length > 1 &&
      [...items].every(item => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.left >= left - 1 && rect.top >= top - 1 &&
          rect.right <= left + viewport.clientWidth + 1 && rect.bottom <= top + viewport.clientHeight + 1;
      });
  }), { message: 'The complete graph, every stage, and every checkpoint fit inside the canvas' }).toBe(true);
}

async function expectMap(dialog: Locator, mission: Mission, stageCount: number, checkpointCount: number) {
  await expect(dialog.locator(stageSelector)).toHaveCount(stageCount);
  await expect(dialog.locator(nodeSelector)).toHaveCount(checkpointCount);
  expect(await dialog.locator(nodeSelector).evaluateAll(nodes =>
    nodes.map(node => node.getAttribute('data-full-checkpoint')).sort(),
  )).toEqual(mission.checkpoints.map(checkpoint => checkpoint.id).sort());
  const stages = mission.stages ?? [...new Set(mission.checkpoints.map(checkpoint => checkpoint.stage))].map(title => ({
    title, checkpointIds: mission.checkpoints.filter(checkpoint => checkpoint.stage === title).map(checkpoint => checkpoint.id),
  }));
  for (const [index, stage] of stages.entries()) {
    const group = dialog.locator(stageSelector).nth(index);
    await expect(group.getByRole('heading', { name: stage.title, exact: true })).toHaveCount(1);
    expect(await group.locator(nodeSelector).evaluateAll(nodes =>
      nodes.map(node => node.getAttribute('data-full-checkpoint')).sort(),
    )).toEqual([...stage.checkpointIds].sort());
  }
  await expectFit(dialog);
}

async function expectConnections(dialog: Locator, mission: Mission) {
  const connections = mission.checkpoints.flatMap(checkpoint =>
    prerequisitesFor(mission, checkpoint).map(parent => `${parent}:${checkpoint.id}`),
  ).sort();
  const edges = dialog.locator('.full-roadmap-graph .diagram-edge');
  await expect(edges).toHaveCount(connections.length);
  expect(await edges.evaluateAll(nodes => nodes.map(node => node.getAttribute('data-connection')).sort())).toEqual(connections);
  await expect.poll(() => edges.evaluateAll(nodes => nodes.every(edge => {
    const path = edge.querySelector<SVGPathElement>('path');
    if (!path || !path.getAttribute('d') || /NaN|Infinity/.test(path.getAttribute('d')!)) return false;
    const matrix = path.getScreenCTM();
    const [from, to] = edge.getAttribute('data-connection')!.split(':');
    const graph = edge.closest('.full-roadmap-graph')!;
    const source = graph.querySelector(`[data-full-checkpoint="${from}"]`)!.getBoundingClientRect();
    const target = graph.querySelector(`[data-full-checkpoint="${to}"]`)!.getBoundingClientRect();
    if (!matrix || path.getTotalLength() <= 0) return false;
    const start = path.getPointAtLength(0).matrixTransform(matrix);
    const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
    const crossStage = edge.getAttribute('data-kind') === 'cross-stage';
    const expectedX = crossStage ? (target.x > source.x ? source.right : source.left) : source.x + source.width / 2;
    const expectedY = crossStage ? source.y + source.height / 2 : source.bottom;
    return Math.hypot(start.x - expectedX, start.y - expectedY) <= 1 &&
      Math.hypot(end.x - (target.x + target.width / 2), end.y - target.top) <= 1;
  })), { message: 'Connectors remain attached to their actual checkpoints after fitting or zooming' }).toBe(true);
  await expect(dialog.locator('.diagram-error')).toHaveCount(0);
}

async function expectCurrent(dialog: Locator, checkpointId?: string) {
  await expect(dialog.locator(`${nodeSelector}[aria-current="step"]`)).toHaveCount(checkpointId ? 1 : 0);
  await expect(dialog.locator(`${nodeSelector}.current`)).toHaveCount(checkpointId ? 1 : 0);
  if (checkpointId) {
    await expect(dialog.locator(`[data-full-checkpoint="${checkpointId}"]`)).toHaveAttribute('aria-current', 'step');
    await expect(dialog.locator(`[data-full-checkpoint="${checkpointId}"]`)).toHaveClass(/\bcurrent\b/);
  } else {
    await expect(dialog.getByRole('button', { name: 'Current checkpoint', exact: true })).toBeDisabled();
  }
}

async function expectCurrentInView(dialog: Locator) {
  await expect.poll(() => dialog.evaluate(root => {
    const viewport = root.querySelector<HTMLElement>('.full-roadmap-viewport')!;
    const bounds = viewport.getBoundingClientRect();
    const current = root.querySelector('[data-full-checkpoint][aria-current="step"]')!.getBoundingClientRect();
    const left = bounds.left + viewport.clientLeft;
    const top = bounds.top + viewport.clientTop;
    return current.left >= left - 1 && current.right <= left + viewport.clientWidth + 1 &&
      current.top >= top - 1 && current.bottom <= top + viewport.clientHeight + 1;
  })).toBe(true);
}

test('Fabric opens beside the mission title with all 5 stages and 32 checkpoints fitted, and inspection is read-only', async ({ page }) => {
  let state = createInitialState(false);
  state.missions.fabric.mode = 'active';
  for (let index = 0; index < 12; index++) state = completeCurrent(state, 'fabric');
  state.plans[localDate()] = generatePlan(state);
  const mission = getMission('fabric', state);
  await loadMission(page, state, mission.id);
  const before = await storage(page);
  const titleRow = page.locator('.page-title-row').filter({ has: page.getByRole('heading', { level: 1, name: mission.name, exact: true }) });
  await expect(titleRow.getByRole('button', { name: 'Full roadmap', exact: true })).toBeVisible();
  const dialog = await openRoadmap(page, mission);
  await expectMap(dialog, mission, 5, 32);
  await expectConnections(dialog, mission);
  await expectCurrent(dialog, state.missions.fabric.checkpointId);
  await expect(dialog.locator(`${nodeSelector}.complete`)).toHaveCount(12);
  const last = mission.checkpoints.at(-1)!;
  await dialog.locator(`[data-full-checkpoint="${last.id}"]`).click();
  await expect(dialog.locator('.full-roadmap-inspector')).toContainText(last.action);
  for (const criterion of last.criteria) await expect(dialog.locator('.full-roadmap-details')).toContainText(criterion);
  await expect(dialog.locator('.full-roadmap-details')).toContainText(/view only/i);
  await expect(dialog.locator('input, textarea')).toHaveCount(0);
  await expect(dialog.getByLabel('Find a roadmap topic', { exact: true })).toHaveCount(1);
  await expect(dialog.getByRole('button', { name: /Record evidence|Make current|Complete & unlock/i })).toHaveCount(0);
  await expectCurrent(dialog, state.missions.fabric.checkpointId);
  expect(await storage(page)).toEqual(before);
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Full roadmap', exact: true })).toBeFocused();
  expect(await storage(page)).toEqual(before);
});

test('System keeps all 7 stages and 28 source topic groups connected in one overview', async ({ page }) => {
  const state = createInitialState(false, '2.0.0');
  const mission = getMission('system', state);
  await loadMission(page, state, mission.id);
  const before = await storage(page);
  const dialog = await openRoadmap(page, mission);
  await dialog.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await expectMap(dialog, mission, 7, 28);
  await expectConnections(dialog, mission);
  await expectCurrent(dialog, state.missions.system.checkpointId);
  await dialog.getByRole('button', { name: '100%', exact: true }).click();
  await expectConnections(dialog, mission);
  await dialog.getByRole('button', { name: 'Fit all', exact: true }).click();
  await expectFit(dialog);
  expect(await storage(page)).toEqual(before);
});

test('Pattern shows the real late-branch current checkpoint even when background and blocked', async ({ page }) => {
  let state = createInitialState(false);
  for (let index = 0; index < 3; index++) state = completeCurrent(state, 'pattern');
  const mission = getMission('pattern', state);
  const grouping = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.4')!;
  const complement = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.3')!;
  const frequency = mission.checkpoints.find(checkpoint => checkpoint.sourceId === '2.2')!;
  state = activateCheckpoint(state, 'pattern', grouping.id);
  state.missions.pattern.mode = 'background';
  state.missions.pattern.blocker = 'Synthetic blocked branch; keep its saved position.';
  await loadMission(page, state, mission.id);
  const before = await storage(page);
  const dialog = await openRoadmap(page, mission);
  await expectMap(dialog, mission, 14, 48);
  await expectConnections(dialog, mission);
  await expectCurrent(dialog, grouping.id);
  await expect(dialog.locator(`[data-connection="${frequency.id}:${grouping.id}"]`)).toBeVisible();
  await expect(dialog.locator(`[data-connection="${frequency.id}:${complement.id}"]`)).toBeVisible();
  await expect(dialog.locator(`[data-connection="${complement.id}:${grouping.id}"]`)).toHaveCount(0);
  const branchBoxes = await dialog.locator(`[data-full-checkpoint="${complement.id}"], [data-full-checkpoint="${grouping.id}"]`)
    .evaluateAll(nodes => nodes.map(node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top };
    }));
  expect(Math.abs(branchBoxes[0].top - branchBoxes[1].top)).toBeLessThanOrEqual(1);
  expect(branchBoxes[1].left).toBeGreaterThan(branchBoxes[0].right);
  const current = dialog.locator(`[data-full-checkpoint="${grouping.id}"]`);
  const glow = await current.evaluate(node => {
    const style = getComputedStyle(node, '::after');
    return { name: style.animationName, duration: parseFloat(style.animationDuration), shadow: style.boxShadow, opacity: Number(style.opacity) };
  });
  expect(glow.name).not.toBe('none');
  expect(glow.duration).toBeGreaterThan(0);
  expect(glow.shadow).not.toBe('none');
  await expect.poll(() => current.evaluate(node => Number(getComputedStyle(node, '::after').opacity)))
    .not.toBe(glow.opacity);
  await dialog.locator(`[data-full-checkpoint="${complement.id}"]`).click();
  await expect(dialog.locator('.full-roadmap-inspector')).toContainText(complement.action);
  await expectCurrent(dialog, grouping.id);
  await dialog.getByRole('button', { name: 'Current checkpoint', exact: true }).click();
  await expectCurrentInView(dialog);
  await expect(current).toBeFocused();
  expect(await storage(page)).toEqual(before);
});

test('saved Credential v2 includes 9 stages, 6 tracked nodes, and three explicit optional references', async ({ page }) => {
  const state = createInitialState(false, '2.0.0');
  const mission = getMission('credential', state);
  await loadMission(page, state, mission.id);
  const before = await storage(page);
  const dialog = await openRoadmap(page, mission);
  await dialog.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await expectMap(dialog, mission, 9, 6);
  await expectConnections(dialog, mission);
  const optional = mission.stages!.filter(stage => stage.optional);
  expect(optional).toHaveLength(3);
  for (const stage of optional) {
    const group = dialog.locator(`[data-full-stage="${stage.id}"]`);
    await expect(group).toContainText(/optional reference/i);
    await expect(group).toContainText(/reference only; no completion credit/i);
    await expect(group.locator(nodeSelector)).toHaveCount(0);
    await expect(group.getByRole('button')).toHaveCount(0);
    for (const topic of stage.topics) await expect(group).toContainText(topic);
  }
  await expectCurrent(dialog, state.missions.credential.checkpointId);
  expect(await storage(page)).toEqual(before);
});

test('saved Algorithm v2 fits all four forecast stages without inventing tracked nodes or a current checkpoint', async ({ page }) => {
  const state = createInitialState(false, '2.0.0');
  const mission = getMission('algorithm', state);
  await loadMission(page, state, mission.id);
  const before = await storage(page);
  const dialog = await openRoadmap(page, mission);
  await dialog.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await expectMap(dialog, mission, 4, 0);
  await expectCurrent(dialog);
  await expect(dialog.locator('.diagram-edge')).toHaveCount(0);
  for (const stage of mission.stages!) {
    const group = dialog.locator(`[data-full-stage="${stage.id}"]`);
    await expect(group).toContainText(/planning reference/i);
    await expect(group).toContainText(/no completion credit/i);
  }
  await dialog.getByRole('button', { name: '100%', exact: true }).click();
  await dialog.getByRole('button', { name: 'Fit all', exact: true }).click();
  await expectFit(dialog);
  await expectCurrent(dialog);
  expect(await storage(page)).toEqual(before);
});

test('saved v1 stages stay v1 and a completed legacy mission has no fake current checkpoint', async ({ page }) => {
  let state = createInitialState(false, '1.0.0');
  for (let index = 0; index < 5; index++) state = completeCurrent(state, 'pattern');
  state.plans[localDate()] = generatePlan(state);
  await loadMission(page, state, 'fabric');
  const before = await storage(page);
  const fabric = getMissionVersion('fabric', '1.0.0');
  let dialog = await openRoadmap(page, fabric);
  await dialog.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await expectMap(dialog, fabric, 3, 5);
  await expectConnections(dialog, fabric);
  await expect(dialog).toContainText('Tracker v1.0.0');
  await expectCurrent(dialog, state.missions.fabric.checkpointId);
  const currentIds = getMissionVersion('fabric', '2.0.0').checkpoints.map(checkpoint => checkpoint.id);
  expect(await dialog.locator(nodeSelector).evaluateAll(nodes => nodes.map(node => node.getAttribute('data-full-checkpoint'))))
    .not.toEqual(expect.arrayContaining([currentIds[0]]));
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.goto('./#/mission/pattern');
  dialog = await openRoadmap(page, getMissionVersion('pattern', '1.0.0'));
  await expect(dialog.locator(nodeSelector)).toHaveCount(48);
  await dialog.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await expectMap(dialog, getMissionVersion('pattern', '1.0.0'), 3, 5);
  await expectCurrent(dialog);
  await expect(dialog.locator(`${nodeSelector}.complete`)).toHaveCount(5);
  await expect(dialog).toContainText(/all tracked checkpoints complete/i);
  await dialog.locator(nodeSelector).first().click();
  await expect(dialog.locator('.full-roadmap-details')).toContainText(/view only/i);
  await expectCurrent(dialog);
  expect(await storage(page)).toEqual(before);
});

for (const { theme, width } of [{ theme: 'dark', width: 320 }, { theme: 'light', width: 390 }]) {
  test(`${theme} full roadmap fits desktop and ${width}px, with keyboard zoom, native scrolling, and Escape focus restoration`, async ({ page }, testInfo) => {
    let state = createInitialState(false);
    state.missions.fabric.mode = 'active';
    for (let index = 0; index < 25; index++) state = completeCurrent(state, 'fabric');
    const mission = getMission('fabric', state);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await loadMission(page, state, mission.id, theme);
    const before = await storage(page);
    const dialog = await openRoadmap(page, mission, true);
    await expectMap(dialog, mission, 5, 32);
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    const current = dialog.locator(`${nodeSelector}[aria-current="step"]`);
    const fitWidth = (await current.boundingBox())!.width;
    await dialog.getByRole('button', { name: '100%', exact: true }).click();
    await expect.poll(async () => (await current.boundingBox())!.width).toBeGreaterThan(fitWidth);
    const readableWidth = (await current.boundingBox())!.width;
    await dialog.getByRole('button', { name: 'Fit all', exact: true }).click();
    await expectFit(dialog);

    await page.setViewportSize({ width, height: 844 });
    await expectFit(dialog);
    await expectConnections(dialog, mission);
    const bounds = await dialog.boundingBox();
    expect(bounds).not.toBeNull();
    expect(Math.abs(bounds!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds!.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds!.width - width)).toBeLessThanOrEqual(1);
    expect(Math.abs(bounds!.height - 844)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    expect(await dialog.evaluate(node => node.scrollWidth - node.clientWidth)).toBeLessThanOrEqual(1);
    await testInfo.attach(`full-roadmap-${theme}-${width}-fit`, {
      body: await dialog.screenshot(), contentType: 'image/png',
    });

    const zoomIn = dialog.getByRole('button', { name: 'Zoom in', exact: true });
    const mobileFitWidth = (await current.boundingBox())!.width;
    await zoomIn.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await current.boundingBox())!.width).toBeGreaterThan(mobileFitWidth);
    const zoomedWidth = (await current.boundingBox())!.width;
    await dialog.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await expect.poll(async () => (await current.boundingBox())!.width).toBeLessThan(zoomedWidth);
    const goToCurrent = dialog.getByRole('button', { name: 'Current checkpoint', exact: true });
    await goToCurrent.focus();
    await page.keyboard.press('Enter');
    await expectCurrentInView(dialog);
    await expect(current).toBeFocused();
    await expect.poll(async () => Math.abs((await current.boundingBox())!.width - readableWidth)).toBeLessThanOrEqual(1);
    await expectConnections(dialog, mission);
    const viewport = dialog.locator('.full-roadmap-viewport');
    const originalScroll = await viewport.evaluate(node => ({ left: node.scrollLeft, top: node.scrollTop }));
    expect(originalScroll.left + originalScroll.top).toBeGreaterThan(0);
    await viewport.focus();
    await page.keyboard.press('ArrowLeft');
    await expect.poll(() => viewport.evaluate(node => node.scrollLeft)).toBeLessThan(originalScroll.left);
    await goToCurrent.click();
    await expectCurrentInView(dialog);
    await current.press('Enter');
    await expect(dialog.locator('.full-roadmap-details')).toContainText(mission.checkpoints[25].action);
    await expectCurrent(dialog, state.missions.fabric.checkpointId);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Full roadmap', exact: true })).toBeFocused();
    expect(await storage(page)).toEqual(before);
  });
}

test('reduced motion keeps a bright static glow on only the real current node', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const state = completeCurrent(createInitialState(false), 'pattern');
  const mission = getMission('pattern', state);
  await loadMission(page, state, mission.id);
  const before = await storage(page);
  const dialog = await openRoadmap(page, mission);
  await expectMap(dialog, mission, 14, 48);
  await expectCurrent(dialog, state.missions.pattern.checkpointId);
  const styles = await dialog.locator(nodeSelector).evaluateAll(nodes => nodes.map(node => {
    const glow = getComputedStyle(node, '::after');
    return {
      current: node.getAttribute('aria-current') === 'step', animation: glow.animationName,
      opacity: Number(glow.opacity), shadow: glow.boxShadow, content: glow.content, pointerEvents: glow.pointerEvents,
    };
  }));
  const current = styles.find(style => style.current)!;
  expect(current.animation).toBe('none');
  expect(current.opacity).toBeGreaterThan(0);
  expect(current.shadow).not.toBe('none');
  expect(current.content).not.toBe('none');
  expect(current.pointerEvents).toBe('none');
  expect(styles.filter(style => !style.current).every(style => style.animation === 'none' && style.shadow === 'none')).toBe(true);
  await dialog.getByRole('button', { name: 'Current checkpoint', exact: true }).click();
  await expectCurrentInView(dialog);
  expect(await storage(page)).toEqual(before);
});

test('320x568 Tutorial fits the roadmap with its compact guide and resumes the same expanded coach without changing real storage', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  let state = createInitialState(false);
  for (let index = 0; index < 3; index++) state = completeCurrent(state, 'pattern');
  state.plans[localDate()] = generatePlan(state);
  await loadMission(page, state, 'pattern', 'light');
  const before = await storage(page);
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'practice');
  const coach = page.locator('.tutorial-panel');
  await expect(coach).toHaveAttribute('data-step', 'welcome-intro');
  await coach.getByRole('combobox', { name: 'Tutorial chapter', exact: true }).selectOption('mission');
  await expect(coach).toHaveAttribute('data-step', 'mission-save-state');
  await coach.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(coach).toHaveAttribute('data-step', 'mission-roadmap-intro');
  await coach.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(coach).toHaveAttribute('data-step', 'mission-full-roadmap');
  await expect(coach).not.toHaveClass(/\btutorial-collapsed\b/);
  await expect(coach.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  const practiceCurrent = await page.locator('[data-tour="mission-roadmap"] .flow-checkpoint.current').getAttribute('data-checkpoint');
  expect(practiceCurrent).toBeTruthy();
  expect(practiceCurrent).not.toBe(state.missions.pattern.checkpointId);
  const dialog = await openRoadmap(page, getMission('pattern', state));
  await expect(dialog.locator('.tutorial-map-guide')).toBeVisible();
  await expect(coach.getByRole('button', { name: 'Next', exact: true })).toHaveCount(0);
  await expect(coach.getByRole('button', { name: 'Back to tutorial', exact: true })).toBeVisible();
  await expect(coach.getByRole('button', { name: 'Exit tutorial', exact: true })).toBeVisible();
  await expectMap(dialog, getMission('pattern', state), 14, 48);
  await expectCurrent(dialog, practiceCurrent!);
  await expect(coach).toHaveAttribute('data-step', 'mission-full-roadmap');
  await expect.poll(() => dialog.evaluate(root => {
    const viewport = root.querySelector('.full-roadmap-viewport')!.getBoundingClientRect();
    const guide = root.querySelector('.tutorial-map-guide')!.getBoundingClientRect();
    return viewport.bottom <= guide.top + 1 || guide.bottom <= viewport.top + 1;
  }), { message: 'The compact tutorial guide does not cover the fitted canvas' }).toBe(true);
  await coach.getByRole('button', { name: 'Back to tutorial', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(coach).toHaveAttribute('data-step', 'mission-full-roadmap');
  await expect(coach).not.toHaveClass(/\btutorial-collapsed\b|\btutorial-map-guide\b/);
  await expect(coach.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Full roadmap', exact: true })).toBeFocused();
  await openRoadmap(page, getMission('pattern', state), true);
  await expect(dialog.locator('.tutorial-map-guide')).toBeVisible();
  await expectFit(dialog);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(coach).toHaveAttribute('data-step', 'mission-full-roadmap');
  await expect(coach).not.toHaveClass(/\btutorial-collapsed\b|\btutorial-map-guide\b/);
  await expect(page.getByRole('button', { name: 'Full roadmap', exact: true })).toBeFocused();
  await openRoadmap(page, getMission('pattern', state));
  await expect(dialog.locator('.tutorial-map-guide')).toBeVisible();
  await expectFit(dialog);
  await dialog.getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  await expect(dialog).toHaveCount(0);
  await expect(coach).toHaveCount(0);
  expect(await storage(page)).toEqual(before);
});

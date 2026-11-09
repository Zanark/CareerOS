import { expect, test, type Page } from '@playwright/test';
import { getCheckpoint } from '../src/domain/catalog';
import { createInitialState, generatePlan, localDate, upgradeRoadmap } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { careerSkillLinks } from '../src/graph/careerSkillLinks';
import { focusedGraphForState } from './mission-ring-policy';
import { graphCheckbox, searchGraphNodes, setGraphCheckbox, setGraphScope } from './graph-ui';

test.use({ launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } });
const key = 'careerhq.workspace.v1';
const link = careerSkillLinks.find(item => item.id === 'array-regions-to-contest-state');
if (!link) throw new Error('Missing PDF-to-PDF shared-skill fixture.');
const source = getCheckpoint(link.source.missionId, link.source.checkpointId, link.source.roadmapVersion);
const target = getCheckpoint(link.target.missionId, link.target.checkpointId, link.target.roadmapVersion);

async function openGraph(page: Page, state = createInitialState(false)) {
  state.plans[localDate()] = generatePlan(state);
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.goto('./#/home');
  await expect(page.locator('.career-graph-scene')).toHaveAttribute('data-scene-state', 'ready', { timeout: 20_000 });
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  return raw;
}

async function inspectSource(page: Page, checkpoint = source) {
  await searchGraphNodes(page, checkpoint.title);
  await page.locator('.career-graph-node-list > button').filter({ hasText: checkpoint.title }).first().click();
  const inspector = page.getByRole('complementary', { name: 'Selected career node' });
  await expect(inspector.getByRole('heading', { level: 2 })).toHaveText(checkpoint.title);
  await inspector.locator('.career-graph-connections > summary').click();
  return inspector;
}

test('shared links add only edges, have a visibility toggle, and do not recreate the scene or save progress', async ({ page }) => {
  const state = createInitialState(false);
  const expected = focusedGraphForState(state).edges.filter(edge => edge.kind === 'shared-skill').length;
  const raw = await openGraph(page, state);
  const scene = page.locator('.career-graph-scene');
  const count = Number(await scene.getAttribute('data-edge-count'));
  const nodes = await scene.getAttribute('data-node-count');
  await page.locator('.career-graph-stage canvas').evaluate(canvas => canvas.setAttribute('data-original', 'true'));
  await expect(page.locator('.career-graph-link-key')).toContainText(`${expected} shared skill links`);
  await setGraphCheckbox(page, 'Shared skill links', false);
  await expect(scene).toHaveAttribute('data-edge-count', String(count - expected));
  await expect(scene).toHaveAttribute('data-node-count', nodes!);
  await expect(page.locator('.career-graph-stage canvas')).toHaveAttribute('data-original', 'true');
  await setGraphCheckbox(page, 'Shared skill links', true);
  await expect(scene).toHaveAttribute('data-edge-count', String(count));
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

for (const width of [1440, 320]) {
  test(`connection reasons and source pages are inspectable at ${width}px without changing the tracker`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const raw = await openGraph(page);
    const inspector = await inspectSource(page);
    await expect(inspector.locator('.career-graph-connections')).toContainText('not source-declared prerequisites');
    const entry = inspector.locator('li[data-connection-kind="shared-skill"]').filter({ has: page.getByText(link.reason, { exact: true }) });
    await expect(entry).toContainText(target.title);
    await entry.getByText('Curriculum basis', { exact: true }).click();
    await expect(entry).toContainText(source.source!.document);
    await expect(entry).toContainText(`p. ${source.source!.page}`);
    await expect(entry).toContainText(target.source!.document);
    await expect(entry).toContainText(`p. ${target.source!.page}`);
    await testInfo.attach('connection-reason', { body: await page.screenshot(), contentType: 'image/png' });
    await entry.getByRole('button', { name: `Reveal and inspect ${target.title}`, exact: true }).click();
    await expect(inspector.getByRole('heading', { level: 2 })).toHaveText(target.title);
    await expect(inspector).toBeFocused();
    await expect(inspector).toContainText('Details only: this mission is outside focus');
    await expect(page.getByRole('button', { name: 'Focus node', exact: true })).toBeDisabled();
    await expect(page.locator('.career-graph-stage canvas')).toHaveAttribute('data-selected-node-id', '');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });

  test(`Fieldcraft connections disclose web research alongside PDF pages at ${width}px without changing progress`, async ({ page }) => {
    const fieldcraftLink = careerSkillLinks.find(item => item.id === 'keyed-state-to-fieldcraft-debugging');
    if (!fieldcraftLink) throw new Error('Missing PDF-to-Fieldcraft shared-skill fixture.');
    const pdfCheckpoint = getCheckpoint(fieldcraftLink.source.missionId, fieldcraftLink.source.checkpointId, fieldcraftLink.source.roadmapVersion);
    const researchCheckpoint = getCheckpoint(fieldcraftLink.target.missionId, fieldcraftLink.target.checkpointId, fieldcraftLink.target.roadmapVersion);
    await page.setViewportSize({ width, height: 1000 });
    const raw = await openGraph(page);
    const inspector = await inspectSource(page, pdfCheckpoint);
    const entry = inspector.locator('li[data-connection-kind="shared-skill"]').filter({ has: page.getByText(fieldcraftLink.reason, { exact: true }) });
    await entry.getByText('Curriculum basis', { exact: true }).click();
    await expect(entry).toContainText(pdfCheckpoint.source!.document);
    await expect(entry).toContainText(`p. ${pdfCheckpoint.source!.page}`);
    await expect(entry).toContainText(researchCheckpoint.source!.document);
    await expect(entry).toContainText(researchCheckpoint.source!.section);
    await expect(entry).not.toContainText('p. undefined');
    await expect(entry.getByRole('link', { name: 'Read the research basis', exact: true }))
      .toHaveAttribute('href', 'https://github.com/Zanark/CareerOS/blob/main/docs/FDE-RESEARCH.md');
    await entry.getByRole('button', { name: `Reveal and inspect ${researchCheckpoint.title}`, exact: true }).click();
    await expect(inspector.getByRole('heading', { level: 2 })).toHaveText(researchCheckpoint.title);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });
}

test('following a hidden peer explicitly reveals its mission, reference layer and disabled shared links', async ({ page }) => {
  const state = upgradeRoadmap(createInitialState(false, '2.0.0'), link.source.missionId);
  const raw = await openGraph(page, state);
  await setGraphScope(page, link.source.missionId);
  await setGraphCheckbox(page, 'References', false);
  await setGraphCheckbox(page, 'Shared skill links', false);
  const inspector = await inspectSource(page);
  const entry = inspector.locator('li[data-connection-kind="shared-skill"]').filter({ has: page.getByText(link.reason, { exact: true }) });
  await expect(entry).toContainText('outside the current view');
  await expect(entry).toContainText('Shared skill lines are off');
  await entry.getByRole('button', { name: `Reveal and inspect ${target.title}`, exact: true }).click();
  await expect(page.getByLabel('Filter career graph by mission')).toHaveValue('all');
  await expect(graphCheckbox(page, 'References')).toBeChecked();
  await expect(graphCheckbox(page, 'Shared skill links')).toBeChecked();
  await expect(inspector.getByRole('heading', { level: 2 })).toHaveText(target.title);
  await expect(inspector.locator('.graph-status-tag')).toHaveText('Reference');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

import { test, expect, type Page } from '@playwright/test';
import { createInitialState, recordEvidence } from '../src/domain/engine';
import { getMissionVersion } from '../src/domain/catalog';

async function expectVerticalFlow(page: Page) {
  const boxes = await page.locator('[data-tour="mission-roadmap"] .flow-checkpoint').evaluateAll(nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect();
    return { x: rect.x, y: rect.y, height: rect.height };
  }));
  expect(boxes).toHaveLength(5);
  for (let index = 1; index < boxes.length; index++) {
    expect(boxes[index].y).toBeGreaterThanOrEqual(boxes[index - 1].y + boxes[index - 1].height + 15);
    expect(Math.abs(boxes[index].x - boxes[index - 1].x)).toBeLessThan(1);
  }
  const diagram = page.locator('[data-tour="mission-roadmap"]');
  await expect(diagram.locator('.diagram-edge')).toHaveCount(9);
  await expect(diagram.locator('[data-connection="decision:practice"]')).toBeVisible();
  await expect(diagram.locator('[data-connection^="practice:"]')).toBeVisible();
  expect(await diagram.locator('.diagram-edge > path').evaluateAll(paths =>
    paths.every(path => !!path.getAttribute('d') && !/NaN|Infinity/.test(path.getAttribute('d')!)))).toBe(true);
  await expect.poll(() => diagram.locator('.diagram-canvas').evaluate(canvas => {
    const area = canvas.getBoundingClientRect();
    return [...canvas.querySelectorAll<SVGGElement>('.diagram-edge')].every(edge => {
      const [from, to] = edge.dataset.connection!.split(':');
      const a = canvas.querySelector(`[data-diagram-node="${from}"]`)!.getBoundingClientRect();
      const b = canvas.querySelector(`[data-diagram-node="${to}"]`)!.getBoundingClientRect();
      const path = edge.querySelector('path')!;
      const start = path.getPointAtLength(0);
      const end = path.getPointAtLength(path.getTotalLength());
      const side = edge.dataset.kind === 'branch' || edge.dataset.kind === 'return';
      const expectedStart = { x: (side ? a.right : a.x + a.width / 2) - area.x, y: (side ? a.y + a.height / 2 : a.bottom) - area.y };
      const expectedEnd = {
        x: (edge.dataset.kind === 'return' ? b.right : side ? b.left : b.x + b.width / 2) - area.x,
        y: (side ? b.y + b.height / 2 : b.top) - area.y,
      };
      return Math.hypot(start.x - expectedStart.x, start.y - expectedStart.y) < 1 &&
        Math.hypot(end.x - expectedEnd.x, end.y - expectedEnd.y) < 1;
    });
  })).toBe(true);
  await expect(page.locator('.diagram-error')).toHaveCount(0);
}

for (const width of [1440, 1024, 390, 320]) {
  test(`tree and checkpoint flowchart stay connected and vertical at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(state => localStorage.setItem('careerhq.workspace.v1', JSON.stringify(state)), createInitialState(false, '1.0.0'));
    await page.goto('./#/roadmap');
    await expect(page.getByRole('heading', { name: 'Roadmap', level: 1, exact: true })).toBeVisible();
    const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
    await expect(page.locator('.tree-mission')).toHaveCount(10);
    await expect(page.locator('.roadmap-tree .diagram-edge')).toHaveCount(13);
    await expectVerticalFlow(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
    const screenshot = testInfo.outputPath(`roadmap-flowchart-${width}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach(`roadmap-flowchart-${width}`, { path: screenshot, contentType: 'image/png' });

    await page.getByRole('button', { name: 'View System Design flowchart', exact: true }).click();
    await expect(page.locator('.roadmap-selected-heading h2')).toHaveText('System Design');
    await expectVerticalFlow(page);
    await page.getByRole('checkbox', { name: 'In-focus missions only' }).check();
    await expect(page.locator('.tree-mission')).toHaveCount(3);
    await expect(page.locator('.tree-group')).toHaveCount(1);
    await expect(page.locator('.roadmap-tree .diagram-edge')).toHaveCount(4);
    await page.emulateMedia({ media: 'print' });
    await expectVerticalFlow(page);
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('link', { name: 'Open System Design mission', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'System Design', level: 1, exact: true })).toBeVisible();
    await expectVerticalFlow(page);
    expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
  });
}

test('planned missions have no invented graph and filters keep selection valid', async ({ page }) => {
  await page.addInitScript(state => localStorage.setItem('careerhq.workspace.v1', JSON.stringify(state)), createInitialState(false, '1.0.0'));
  await page.goto('./#/roadmap');
  await page.getByRole('button', { name: 'View Competitive programming flowchart', exact: true }).click();
  await expect(page.locator('.diagram-pending')).toContainText('No checkpoints or prerequisite branches have been invented');
  await expect(page.locator('.flow-checkpoint')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'In-focus missions only' }).check();
  await expect(page.locator('.roadmap-selected-heading h2')).toHaveText('DSA');
  await expectVerticalFlow(page);
});

test('an empty focus branch remains usable without stale connectors', async ({ page }) => {
  const state = createInitialState(false, '1.0.0');
  for (const progress of Object.values(state.missions)) {
    if (progress.mode !== 'planned') progress.mode = 'background';
  }
  await page.addInitScript(state => localStorage.setItem('careerhq.workspace.v1', JSON.stringify(state)), state);
  await page.goto('./#/roadmap');
  const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
  await page.getByRole('checkbox', { name: 'In-focus missions only' }).check();
  await expect(page.locator('.tree-mission')).toHaveCount(0);
  await expect(page.locator('.roadmap-tree .diagram-edge')).toHaveCount(0);
  await expect(page.locator('.roadmap-selected')).toHaveCount(0);
  await expect(page.getByText('No missions are in focus. Clear the filter to see all missions.', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'In-focus missions only' }).uncheck();
  await expect(page.locator('.tree-mission')).toHaveCount(10);
  await expectVerticalFlow(page);
  expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
});

test('completing the final checkpoint removes the decision without breaking connectors', async ({ page }) => {
  let state = createInitialState(false, '1.0.0');
  for (const checkpoint of getMissionVersion('pattern', '1.0.0').checkpoints.slice(0, -1)) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: checkpoint.id, title: 'Synthetic completed example',
      summary: 'Test-owned evidence with explicitly confirmed completion criteria.',
      kind: 'code', url: '', advance: true, criteriaConfirmed: true,
    });
  }
  await page.addInitScript(state => localStorage.setItem('careerhq.workspace.v1', JSON.stringify(state)), state);
  await page.goto('./#/mission/pattern');
  await expect(page.locator('[data-tour="mission-roadmap"] .diagram-edge')).toHaveCount(9);
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('Artifact title').fill('Final synthetic checkpoint');
  await form.getByLabel('What did you practice?').fill('Synthetic final rehearsal and confirmed criteria for the diagram transition.');
  await form.getByRole('checkbox', { name: /This checkpoint is complete/ }).check();
  for (const checkbox of await form.locator('fieldset input').all()) await checkbox.check();
  await form.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  await expect(page.locator('[data-tour="mission-roadmap"] .flow-checkpoint.complete')).toHaveCount(5);
  await expect(page.locator('[data-tour="mission-roadmap"] .flow-decision')).toHaveCount(0);
  await expect(page.locator('[data-tour="mission-roadmap"] .flow-terminal.complete')).toHaveText('Previous roadmap complete');
  await expect(page.locator('[data-tour="mission-roadmap"] .diagram-edge')).toHaveCount(6);
});

test('flowchart printing redraws connectors without browser errors or data changes', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(state => localStorage.setItem('careerhq.workspace.v1', JSON.stringify(state)), createInitialState(false, '1.0.0'));
  await page.goto('./#/roadmap');
  await expectVerticalFlow(page);
  const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
  const path = testInfo.outputPath('roadmap-flowcharts.pdf');
  const pdf = await page.pdf({ path, format: 'A4', printBackground: true, margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' } });
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  expect(pdf.length).toBeGreaterThan(1000);
  await testInfo.attach('printed-flowcharts', { path, contentType: 'application/pdf' });
  await expectVerticalFlow(page);
  expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
  expect(errors).toEqual([]);
});

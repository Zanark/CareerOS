import { expect, test, type Page } from '@playwright/test';
import { getLatestMission, getMissionVersion } from '../src/domain/catalog';
import { createInitialState, generatePlan, localDate, parseState, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { getDiscoverySnapshot } from '../src/discovery/model';
import { agentCloudSteps } from '../src/tutorial/agentCloudSteps';
import { getSourcePackOutline } from '../src/domain/roadmapPacks/registry';

const key = 'careerhq.workspace.v1';

function prior(completed = 3) {
  let state = createInitialState(false);
  const source = getMissionVersion('neural', '3.0.0');
  state.missions.neural = { ...state.missions.neural, roadmapVersion: '3.0.0', checkpointId: source.checkpoints[0].id };
  for (let index = 0; index < completed; index++) state = recordEvidence(state, {
    missionId: 'neural', checkpointId: state.missions.neural.checkpointId,
    title: 'Synthetic earlier architecture artifact',
    summary: 'A fictional diagram and changed-case explanation with explicitly checked source criteria.',
    kind: 'diagram', url: '', advance: true, criteriaConfirmed: true,
  });
  state.plans[localDate()] = generatePlan(state);
  return parseState(state);
}

async function seed(page: Page, state: AppState) {
  const raw = JSON.stringify(state);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  return raw;
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

for (const width of [1440, 320]) {
  test(`mixed web/PDF AI lessons and optional cases preserve old state at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    const raw = await seed(page, prior());
    await page.goto('./#/practice/neural/neural-agent-authority');
    await expect(page.locator('.pack-unit-meta')).toContainText('RESEARCH-BACKED FIELDWORK');
    await expect(page.locator('.pack-exercises > ol > li')).toHaveCount(4);
    await page.locator('[data-tour="pack-unit-sources"] > summary').click();
    await expect(page.locator('[data-tour="pack-unit-sources"]')).toContainText('administrator user-hook allow');
    await expect(page.locator('[data-tour="pack-unit-sources"] a[href="https://learn.microsoft.com/azure/sre-agent/tool-access-policies"]')).toBeVisible();
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
      if (width === 1440 && theme === 'dark' || width === 320 && theme === 'light') {
        const path = testInfo.outputPath(`agent-cloud-${width}-${theme}.png`);
        await page.screenshot({ path });
        await testInfo.attach('Agent-cloud lesson / synthetic prior v3 tracker', { path, contentType: 'image/png' });
      }
    }
    await page.getByLabel('Practice module or reference', { exact: true }).selectOption('neural-agent-case-race');
    await expect(page.locator('.pack-reference-note')).toBeVisible();
    await expect(page.locator('.pack-exercises > ol > li')).toHaveCount(3);
    await page.goto(`./#/practice/neural/${getSourcePackOutline('neural')!.units[0].id}`);
    await expect(page.locator('.pack-unit-meta')).toContainText('PDF PAGES');
    await expect(page.locator('[data-tour="pack-unit-sources"]')).toHaveCount(0);
    for (const theme of ['dark', 'light']) {
      await page.evaluate(theme => document.documentElement.dataset.theme = theme, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    }
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  });

  test(`final agent-cloud tutorial uses real controls without changing storage at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await seed(page, prior());
    await page.goto('./#/settings');
    const before = await allStorage(page);
    await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
    await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('agent-cloud');
    for (const step of agentCloudSteps) {
      const coach = page.locator('.tutorial-panel');
      await expect(coach).toHaveAttribute('data-step', step.id);
      if (step.id === 'agent-cloud-sources') await page.locator('[data-tour="pack-unit-sources"] > summary').click();
      if (step.id === 'agent-cloud-cases') await page.locator('[data-tour="pack-unit-select"]').selectOption('neural-agent-case-race');
      const next = coach.getByRole('button', { name: step.id === 'agent-cloud-finish' ? 'Finish tutorial' : 'Next', exact: true });
      await expect(next).toBeEnabled();
      expect(await allStorage(page)).toEqual(before);
      await next.click();
    }
    await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
    expect(await allStorage(page)).toEqual(before);
  });
}

test('confirmed v3 append preserves actual records, old position and Atlas while preview exposes all40 nodes', async ({ page }) => {
  const old = prior();
  const raw = await seed(page, old);
  await page.goto('./#/mission/neural');
  await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
  const map = page.locator('.full-roadmap-modal');
  await expect(map.locator('.full-roadmap-node')).toHaveCount(40);
  await expect(map.locator('[data-full-current="true"]')).toHaveCount(0);
  await page.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await expect(map.locator('.full-roadmap-node')).toHaveCount(28);
  await expect(map.locator('[data-full-current="true"]')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await page.goto('./#/sources/neural');
  const append = page.getByRole('button', { name: 'Append expanded roadmap', exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await append.click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  page.once('dialog', dialog => dialog.accept());
  await append.click();
  await expect(page.locator('.source-heading')).toContainText('Active tracker v4.0.0');
  const next = await stored(page);
  expect(next.missions.neural).toEqual({ ...old.missions.neural, roadmapVersion: '4.0.0' });
  expect(next.evidence).toEqual(old.evidence);
  expect(next.archives[0].progress).toEqual(old.missions.neural);
  expect(next.focusMissionId).toBe(old.focusMissionId);
  expect(getDiscoverySnapshot(next).earned).toBe(getDiscoverySnapshot(old).earned);
  await page.reload();
  expect(await stored(page)).toEqual(next);
});

test('a completed old track resumes at7.1 and new confirmed work is stored as v4 evidence', async ({ page }) => {
  const old = prior(28);
  await seed(page, old);
  await page.goto('./#/sources/neural');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Append expanded roadmap', exact: true }).click();
  await page.goto('./#/mission/neural');
  await expect(page.locator('[data-tour="save-state"]')).toContainText(getLatestMission('neural').checkpoints[28].title);
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'Record progress', exact: true });
  await form.getByLabel('What did you make?').selectOption('code');
  await form.getByLabel('Artifact title').fill('Synthetic agent-cloud responsibility map');
  await form.getByLabel('What did you practice?').fill('Synthetic controller versus agent diagram, bounded authority and independently checked local outcome.');
  await form.locator('[data-tour="checkpoint-complete"]').check();
  for (const check of await form.locator('[data-tour="evidence-criteria"] input').all()) await check.check();
  await form.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
  const next = await stored(page);
  expect(next.missions.neural.completedCheckpointIds).toHaveLength(29);
  expect(next.evidence.slice(0, 28)).toEqual(old.evidence);
  expect(next.evidence.at(-1)?.roadmapVersion).toBe('4.0.0');
  expect(next.archives[0].progress).toEqual(old.missions.neural);
  expect(next.missions.neural.checkpointId).toBe(getLatestMission('neural').checkpoints[29].id);
  await page.reload();
  expect(await stored(page)).toEqual(next);
  await page.goto('./#/settings');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('[data-tour="backup-export"]').click();
  const stream = await (await downloadPromise).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const backup = Buffer.concat(chunks);
  expect(JSON.parse(backup.toString())).toEqual(next);
  await page.getByLabel('What are you working toward?').fill('Synthetic changed direction after export.');
  await page.locator('[data-tour="goal-form"]').getByRole('button', { name: 'Save direction', exact: true }).click();
  expect((await stored(page)).objective).not.toBe(next.objective);
  const chooserPromise = page.waitForEvent('filechooser');
  await page.locator('[data-tour="backup-import"]').click();
  page.once('dialog', dialog => dialog.accept());
  await (await chooserPromise).setFiles({ name: 'synthetic-neural-v4.json', mimeType: 'application/json', buffer: backup });
  await expect.poll(() => stored(page)).toEqual(next);
});

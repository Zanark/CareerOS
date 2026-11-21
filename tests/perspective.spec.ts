import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate, parseState, recordEvidence, upgradeRoadmap } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';

const key = 'careerhq.workspace.v1';
const historyRecord = {
  id: 'personal-fixture', title: 'Built a sample parser',
  detail: 'Completed a fictional parser and handled malformed input in a practice repository.',
  source: 'Synthetic history document, page 4', url: '',
};
const historyFile = { format: 'careerhq-personal-proof', version: 1, records: [historyRecord] };

function recordedWorkspace() {
  let state = createInitialState(false, '1.0.0');
  for (let index = 1; index <= 4; index++) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
      title: `Recorded attempt ${index}`, summary: `Synthetic practice ${index}: traced the lookup and noted one remaining question.`,
      kind: 'explanation', url: '', advance: index === 2, criteriaConfirmed: index === 2,
    });
  }
  state = upgradeRoadmap(state, 'pattern');
  state.evidence.reverse();
  return state;
}

async function seed(page: Page, state: AppState) {
  state.plans[localDate()] = generatePlan(state);
  const canonical = parseState(state);
  expect(canonical).toEqual(state);
  const raw = JSON.stringify(canonical);
  await page.addInitScript(({ key, raw }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, { key, raw });
  return raw;
}

async function chooseHistory(page: Page, value: unknown = historyFile) {
  await page.getByLabel('Choose personal-history file', { exact: true }).setInputFiles({
    name: 'synthetic-personal-history.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)),
  });
}

test('Keep going stays optional and contains no research, generic encouragement or invented personal wins', async ({ page }) => {
  await page.goto('./');
  const before = await page.evaluate(key => localStorage.getItem(key), key);
  const navigation = page.getByRole('complementary', { name: 'Main navigation' }).getByRole('navigation', { name: 'TRACKING', exact: true });
  await expect(navigation.getByRole('link').nth(0)).toHaveText('Career graph');
  await expect(navigation.getByRole('link').nth(1)).toHaveText('Keep going');
  await navigation.getByRole('link', { name: 'Keep going', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("What you've already done.");
  await expect(page.locator('.perspective-empty')).toContainText('Import a private personal-history file or a workspace backup.');
  await expect(page.locator('.personal-proof-card, .perspective-receipt')).toHaveCount(0);
  await expect(page.locator('.perspective-page')).not.toContainText(/Harkin|Dunlosky|hard is not|hopeless|missed day|whole life tonight|research averages/i);
  await page.reload();
  await expect(page).toHaveTitle('Keep going - CareerOS');
  await page.getByRole('link', { name: 'Back to Overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true, level: 1 })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test('completed work is first and practice stays labeled without hiding older records or inflating claims', async ({ page }) => {
  const raw = await seed(page, recordedWorkspace());
  await page.goto('./#/perspective');
  const receipts = page.locator('.perspective-receipt');
  await expect(receipts).toHaveCount(4);
  await expect(receipts.locator('h3')).toHaveText(['Recorded attempt 2', 'Recorded attempt 4', 'Recorded attempt 3', 'Recorded attempt 1']);
  await expect(receipts.first()).toContainText('Checkpoint marked complete');
  await expect(receipts.nth(1)).toContainText('Practice recorded');
  await expect(receipts.first()).toContainText('v1.0.0');
  await expect(receipts.nth(1)).toContainText('one remaining question');
  await receipts.first().click();
  await expect(page.locator('.evidence-card.highlighted h3')).toHaveText('Recorded attempt 2');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('sample-containing workspaces are not described as personal achievements', async ({ page }) => {
  const raw = await seed(page, createInitialState(true));
  await page.goto('./#/perspective');
  await expect(page.getByRole('heading', { name: 'Examples and added records', exact: true })).toBeVisible();
  await expect(page.locator('.perspective-record')).toContainText('These records are not all personal achievements.');
  await expect(page.locator('.perspective-receipt-meta').first()).toContainText('Sample-containing workspace');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('private history requires review, merges without changing progress, and travels in the normal backup', async ({ page }) => {
  const raw = await seed(page, recordedWorkspace());
  await page.goto('./#/perspective');
  await chooseHistory(page);
  const dialog = page.getByRole('dialog', { name: 'Review your personal history', exact: true });
  await expect(dialog).toContainText(historyRecord.title);
  await expect(dialog).toContainText(historyRecord.source);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await chooseHistory(page);
  await dialog.getByRole('button', { name: 'Add these records', exact: true }).click();
  await expect(page.locator('.personal-proof-card h3')).toHaveText(historyRecord.title);
  await expect(page.locator('.personal-proof-source')).toContainText(historyRecord.source);
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(after.personalProof).toEqual([historyRecord]);
  for (const field of ['missions', 'evidence', 'plans', 'archives', 'recalls']) expect(after[field]).toEqual(JSON.parse(raw)[field]);
  await page.reload();
  await expect(page.locator('.personal-proof-card h3')).toHaveText(historyRecord.title);
  await chooseHistory(page);
  await expect(page.getByRole('status')).toContainText('already saved');
  await page.goto('./#/settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const stream = await (await download).createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  expect(JSON.parse(Buffer.concat(chunks).toString()).personalProof).toEqual([historyRecord]);
});

test('malformed personal history and conflicting IDs never replace existing work', async ({ page }) => {
  const state = recordedWorkspace();
  state.personalProof = [historyRecord];
  const raw = await seed(page, state);
  await page.goto('./#/perspective');
  for (const value of [{ ...historyFile, records: [{ ...historyRecord, url: 'javascript:alert(1)' }] }, { ...historyFile, records: [{ ...historyRecord, detail: 'A changed record with the same identifier.' }] }]) {
    await chooseHistory(page, value);
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  }
});

test('past accomplishments can be recorded without inventing a date or completing a mission', async ({ page }) => {
  await page.goto('./#/perspective');
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  await page.getByRole('button', { name: 'Add a past accomplishment', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add past work', exact: true });
  await dialog.getByLabel('What did you accomplish?').fill(historyRecord.title);
  await dialog.getByLabel('What did you actually do?').fill(historyRecord.detail);
  await dialog.getByLabel('Evidence or source').fill(historyRecord.source);
  await dialog.getByRole('button', { name: 'Save past accomplishment', exact: true }).click();
  await expect(page.locator('.personal-proof-card h3')).toHaveText(historyRecord.title);
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(after.missions).toEqual(before.missions);
  expect(after.evidence).toEqual(before.evidence);
  expect(after.personalProof[0]).not.toHaveProperty('date');
});

test('tutorial history imports remain temporary and never expose the real private history', async ({ page }) => {
  const state = recordedWorkspace();
  state.personalProof = [{ ...historyRecord, title: 'Real-workspace private fixture' }];
  const raw = await seed(page, state);
  await page.goto('./#/perspective');
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  const coach = page.locator('.tutorial-panel');
  await coach.getByLabel('Tutorial chapter').selectOption('perspective');
  await expect(page.locator('.perspective-page')).not.toContainText('Real-workspace private fixture');
  await chooseHistory(page);
  await page.getByRole('dialog', { name: 'Review your personal history', exact: true }).getByRole('button', { name: 'Add these records', exact: true }).click();
  await expect(page.locator('.personal-proof-card h3')).toHaveText(historyRecord.title);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  await coach.getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.personal-proof-card h3')).toHaveText('Real-workspace private fixture');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

for (const theme of ['dark', 'light']) for (const width of [1440, 390, 320]) {
  test(`actual personal-history cards and evidence fit ${width}px in ${theme}`, async ({ page, baseURL }, testInfo) => {
    const state = recordedWorkspace();
    state.personalProof = [historyRecord, {
      id: 'personal-test-2', title: 'Rebuilt a sample graph traversal',
      detail: historyRecord.detail, source: historyRecord.source,
      date: '2026-01-03', url: 'https://example.com/fictional-evidence',
    }];
    const raw = await seed(page, state);
    const external: string[] = [];
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(baseURL!).origin) external.push(request.url()); });
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('./#/perspective');
    await expect(page.locator('.personal-proof-card')).toHaveCount(2);
    await expect(page.locator('.personal-proof-source time')).toHaveText('2026-01-03');
    await expect(page.getByRole('link', { name: 'Open supporting artifact' })).toHaveAttribute('rel', 'noopener noreferrer');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await testInfo.attach('personal-proof', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
    expect(external).toEqual([]);
  });
}

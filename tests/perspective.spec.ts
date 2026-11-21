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
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Keep going.');
  await expect(page.locator('.perspective-empty')).toContainText('Add past work or load your private history whenever you want.');
  await expect(page.locator('.personal-proof-card, .perspective-receipt')).toHaveCount(0);
  await expect(page.locator('.perspective-page')).not.toContainText(/Harkin|Dunlosky|hard is not|hopeless|missed day|whole life tonight|research averages/i);
  await page.reload();
  await expect(page).toHaveTitle('Keep going - CareerOS');
  await page.getByRole('link', { name: 'Back to Overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true, level: 1 })).toBeVisible();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
});

test('newest work is first regardless of completion and practice stays labeled without changing records', async ({ page }) => {
  const raw = await seed(page, recordedWorkspace());
  await page.goto('./#/perspective');
  const receipts = page.locator('.perspective-receipt');
  await expect(receipts).toHaveCount(4);
  await expect(receipts.locator('h3')).toHaveText(['Recorded attempt 4', 'Recorded attempt 3', 'Recorded attempt 2', 'Recorded attempt 1']);
  await expect(receipts.nth(2)).toContainText('Checkpoint marked complete');
  await expect(receipts.first()).toContainText('Practice recorded');
  await receipts.first().locator('.journal-details > summary').click();
  await expect(receipts.first().locator('.journal-source')).toContainText('v1.0.0');
  await expect(receipts.nth(1)).toContainText('one remaining question');
  await receipts.first().getByRole('link', { name: 'Open full record', exact: true }).click();
  await expect(page.locator('.evidence-card.highlighted h3')).toHaveText('Recorded attempt 4');
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('sample-containing workspaces are not described as personal achievements', async ({ page }) => {
  const raw = await seed(page, createInitialState(true));
  await page.goto('./#/perspective');
  await expect(page.locator('.journal-mode-note')).toContainText('these are not all personal achievements.');
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
  await page.getByRole('button', { name: 'Add a memory', exact: true }).click();
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

test('journal merges history and saved work in one sequence and leaves unknown dates explicit', async ({ page }) => {
  const state = recordedWorkspace();
  state.personalProof = [
    { ...historyRecord, id: 'undated', title: 'Undated fictional memory' },
    { ...historyRecord, id: 'today', title: 'Dated fictional memory', date: localDate() },
    { ...historyRecord, id: 'older', title: 'An older fictional memory', date: '2025-12-10' },
  ];
  const raw = await seed(page, state);
  await page.goto('./#/perspective');
  await expect(page.locator('.journal-card h3')).toHaveText([
    'Recorded attempt 4', 'Recorded attempt 3', 'Recorded attempt 2', 'Recorded attempt 1',
    'Dated fictional memory', 'An older fictional memory', 'Undated fictional memory',
  ]);
  await expect(page.getByRole('heading', { name: 'Date not recorded', exact: true })).toBeVisible();
  await expect(page.locator('[data-record-id="personal:undated"] time')).toHaveCount(0);
  const geometry = await page.locator('.journal-card').evaluateAll(cards => cards.map(card => {
    const box = card.getBoundingClientRect();
    return { top: box.top, left: box.left };
  }));
  for (let index = 1; index < geometry.length; index++) {
    const current = geometry[index], previous = geometry[index - 1];
    expect(current.top).toBeGreaterThanOrEqual(previous.top - 1);
    if (Math.abs(current.top - previous.top) < 1) expect(current.left).toBeGreaterThan(previous.left);
  }
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('journal stories and source disclosures work by keyboard without rewriting records', async ({ page }) => {
  const state = recordedWorkspace();
  state.personalProof = [{ ...historyRecord, detail: `${historyRecord.detail} `.repeat(12) }];
  const raw = await seed(page, state);
  await page.goto('./#/perspective');
  const card = page.locator('.personal-proof-card');
  const story = card.locator('.journal-story-text');
  const compact = (await story.boundingBox())!.height;
  const expand = card.locator('.journal-expand');
  await expect(expand).toHaveAccessibleName(`Read more of ${historyRecord.title}`);
  await expand.focus();
  await expand.press('Enter');
  await expect(expand).toHaveAttribute('aria-expanded', 'true');
  expect((await story.boundingBox())!.height).toBeGreaterThan(compact + 20);
  await card.getByRole('button', { name: `Show less of ${historyRecord.title}`, exact: true }).press('Enter');
  expect(Math.abs((await story.boundingBox())!.height - compact)).toBeLessThan(2);
  const source = card.locator('.journal-details > summary');
  await source.focus(); await source.press('Enter');
  await expect(card.locator('.journal-source')).toBeVisible();
  await expect(card.locator('.journal-source')).toContainText(historyRecord.source);
  const add = page.getByRole('button', { name: 'Add a memory', exact: true });
  await add.focus(); await add.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Add past work', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(add).toBeFocused();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

test('journal memory removal still requires confirmation and leaves saved work unchanged', async ({ page }) => {
  const state = recordedWorkspace();
  state.personalProof = [historyRecord];
  const raw = await seed(page, state);
  await page.goto('./#/perspective');
  await page.locator('.personal-proof-card .journal-details > summary').click();
  const remove = page.getByRole('button', { name: `Remove history record: ${historyRecord.title}`, exact: true });
  page.once('dialog', dialog => dialog.dismiss());
  await remove.click();
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
  page.once('dialog', dialog => dialog.accept());
  await remove.click();
  await expect(page.locator('.personal-proof-card')).toHaveCount(0);
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), key);
  expect(after.personalProof).toEqual([]);
  for (const field of ['missions', 'evidence', 'plans', 'archives', 'recalls']) expect(after[field]).toEqual(JSON.parse(raw)[field]);
});

test('journal shows undated memories even while older dated records are paginated', async ({ page }) => {
  let state = createInitialState(false, '1.0.0');
  for (let index = 1; index <= 14; index++) {
    state = recordEvidence(state, {
      missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
      title: `Fictional practice ${index}`, summary: 'A synthetic record for journal pagination.',
      kind: 'note', url: '', advance: false, criteriaConfirmed: false,
    });
  }
  state.personalProof = [historyRecord];
  const raw = await seed(page, state);
  await page.goto('./#/perspective');
  await expect(page.locator('.perspective-receipt')).toHaveCount(12);
  await expect(page.locator('.personal-proof-card h3')).toHaveText(historyRecord.title);
  await page.getByRole('button', { name: 'Show older memories', exact: true }).click();
  await expect(page.locator('.perspective-receipt')).toHaveCount(14);
  await expect(page.getByRole('button', { name: 'Show older memories', exact: true })).toHaveCount(0);
  await expect(page.locator('.journal-card h3').last()).toHaveText(historyRecord.title);
  expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
});

for (const [timezoneId, recordedDay] of [['Asia/Kolkata', '2026-11-21'], ['America/Los_Angeles', '2026-11-20']]) {
  test.describe(`journal calendar dates in ${timezoneId}`, () => {
    test.use({ timezoneId, locale: 'en-GB' });
    test('journal distinguishes a supplied calendar date from a local recorded date', async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-11-21T12:00:00Z'));
      let state = createInitialState(false, '1.0.0');
      state = recordEvidence(state, {
        missionId: 'pattern', checkpointId: state.missions.pattern.checkpointId,
        title: 'A fictional boundary recording', summary: 'A synthetic timestamp around a local midnight.',
        kind: 'note', url: '', advance: false, criteriaConfirmed: false,
      });
      state.evidence[0].createdAt = '2026-11-21T00:30:00Z';
      state.personalProof = [{ ...historyRecord, date: '2026-11-21' }];
      state.plans['2026-11-21'] = generatePlan(state, '2026-11-21');
      const raw = await seed(page, state);
      await page.goto('./#/perspective');
      const memory = page.locator('.personal-proof-card .journal-date');
      const work = page.locator('.perspective-receipt .journal-date');
      await expect(memory).toHaveAttribute('datetime', '2026-11-21');
      await expect(memory).toHaveText('21 Nov');
      await expect(work).toHaveAttribute('datetime', recordedDay);
      await expect(work).toHaveText(`Recorded ${recordedDay.endsWith('21') ? '21' : '20'} Nov`);
      expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
    });
  });
}

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
    const controls = await page.locator('.perspective-intro button, .perspective-intro summary').evaluateAll(elements => elements.filter(element => element.getClientRects().length).map(element => {
      const box = element.getBoundingClientRect(), title = document.querySelector('.journal-heading h1')!.getBoundingClientRect();
      return {
        left: box.left, right: box.right, overflow: element.scrollWidth - element.clientWidth,
        overlap: Math.max(0, Math.min(title.right, box.right) - Math.max(title.left, box.left))
          * Math.max(0, Math.min(title.bottom, box.bottom) - Math.max(title.top, box.top)),
      };
    }));
    for (const control of controls) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(width);
      expect(control.overflow).toBeLessThanOrEqual(2);
      expect(control.overlap).toBe(0);
    }
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('24px');
    await testInfo.attach('personal-proof', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
    expect(external).toEqual([]);
  });
}

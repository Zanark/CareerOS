import { expect, test, type BrowserContext, type Download, type Page } from '@playwright/test';
import { createInitialState, generatePlan, parseState, recordEvidence } from '../src/domain/engine';
import type { AppState } from '../src/domain/types';
import { createJournal, appendWorkspace, deriveJournalKey, unlockJournal } from '../src/repositorySync/journal';
import { journalText, parseJournal, unpublishedText } from '../src/repositorySync/journalFormat';
import { REPOSITORY_SYNC_KEY } from '../src/repositorySync/journalCache';

const storageKey = 'careerhq.workspace.v1';
const phrase = 'A synthetic browser test journal phrase';
const date = '2026-11-03';

function fixture() {
  const state = createInitialState(false);
  state.plans[date] = generatePlan(state, date);
  return parseState(state);
}

async function prepare(page: Page, state = fixture()) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.setFixedTime(new Date('2026-11-03T09:00:00.000Z'));
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: storageKey, state });
  await page.goto('./#/repository-sync');
  await expect(page.getByRole('heading', { name: 'Repository sync', level: 1 })).toBeVisible();
}

async function serve(context: BrowserContext, published: { text: string }) {
  await context.route('**/careeros-progress.jsonl', route =>
    route.fulfill({ contentType: 'application/x-ndjson', body: published.text }));
}

async function raw(page: Page) {
  return page.evaluate(key => localStorage.getItem(key), storageKey);
}

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function cache(page: Page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), REPOSITORY_SYNC_KEY);
}

async function create(page: Page) {
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByLabel('Confirm passphrase', { exact: true }).fill(phrase);
  await page.getByRole('checkbox', { name: /I will keep this passphrase/ }).check();
  await page.getByRole('button', { name: 'Create encrypted journal', exact: true }).click();
  await expect(page.getByLabel('Encrypted appendable text')).toBeVisible();
  return page.getByLabel('Encrypted appendable text').inputValue();
}

async function connect(page: Page) {
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Unlock your journal', exact: true })).toBeVisible();
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByRole('button', { name: 'Unlock selected journal', exact: true }).click();
  const review = page.getByRole('region', { name: 'Review repository progress' });
  await expect(review).toBeVisible();
  await review.getByText('Choose which complete workspace to keep', { exact: true }).click();
  await review.getByRole('checkbox', { name: /I reviewed both snapshots/ }).check();
  await review.getByRole('button', { name: 'Use incoming workspace', exact: true }).click();
  await expect(review).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prepare encrypted updates', exact: true })).toBeVisible();
}

async function navigate(page: Page, name: string | RegExp) {
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name, exact: true }).click();
}

async function openSyncFromSettings(page: Page) {
  await navigate(page, 'Settings & data');
  await page.getByRole('link', { name: 'Open repository sync', exact: true }).click();
}

async function downloadText(download: Download) {
  const stream = await download.createReadStream();
  if (!stream) throw new Error('The expected download has no readable stream.');
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString('utf8');
}

test('real laptop-to-phone append workflow preserves existing backups and completion criteria', async ({ page, browser, context, baseURL }, testInfo) => {
  const published = { text: '' };
  await serve(context, published);
  await prepare(page);
  const initialRaw = await raw(page);
  const baseline = await create(page);
  expect(await raw(page)).toBe(initialRaw);
  expect(baseline).not.toContain(phrase);
  expect((await cache(page)).confirmedCount).toBe(0);
  published.text = baseline;
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect.poll(async () => (await cache(page)).confirmedCount).toBe(1);

  const phoneContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  try {
    await serve(phoneContext, published);
    const phone = await phoneContext.newPage();
    await prepare(phone);
    await connect(phone);
    expect(await stored(phone)).toEqual(await stored(page));
    await navigate(phone, /^Missions/);
    await phone.getByRole('button', { name: 'Open DSA', exact: true }).click();
    const before = await stored(phone);
    await phone.getByRole('button', { name: 'Record evidence', exact: true }).click();
    const dialog = phone.getByRole('dialog', { name: 'Record progress' });
    await dialog.getByLabel('Artifact title').fill('Synthetic phone checkpoint proof');
    await dialog.getByLabel('What did you practice?').fill('A synthetic solved example, boundary cases and independently checked completion criteria.');
    await dialog.getByRole('checkbox', { name: /This checkpoint is complete/ }).check();
    await expect(dialog.getByRole('button', { name: 'Complete & unlock next', exact: true })).toBeDisabled();
    for (const criterion of await dialog.getByRole('group', { name: 'My completion evidence meets these criteria' }).getByRole('checkbox').all()) await criterion.check();
    await dialog.getByRole('button', { name: 'Complete & unlock next', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await openSyncFromSettings(phone);
    await expect(phone.getByLabel('Journal passphrase', { exact: true })).toHaveCount(0);
    await phone.getByRole('button', { name: 'Prepare encrypted updates', exact: true }).click();
    const block = await phone.getByLabel('Encrypted appendable text').inputValue();
    expect(block).not.toContain('Synthetic phone checkpoint proof');
    expect(block.trim().split('\n')).toHaveLength(1);
    expect((await cache(phone)).confirmedCount).toBe(1);
    published.text += block + block;
    await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
    await expect.poll(async () => (await stored(page)).evidence.length).toBe(1);
    const loaded = await stored(page);
    expect(loaded.missions.pattern.completedCheckpointIds).toEqual([before.missions.pattern.checkpointId]);
    expect(loaded.evidence[0].title).toBe('Synthetic phone checkpoint proof');
    expect((await cache(page)).confirmedCount).toBe(2);
    expect((await cache(phone)).confirmedCount).toBe(1);
    await phone.getByRole('button', { name: 'Check published updates', exact: true }).click();
    await expect.poll(async () => (await cache(phone)).confirmedCount).toBe(2);
    await expect.poll(() => phone.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await phone.screenshot({ path: testInfo.outputPath('repository-sync-phone.png'), fullPage: true, animations: 'disabled' });

    await navigate(page, 'Settings & data');
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export backup', exact: true }).click();
    const backup = JSON.parse(await downloadText(await downloading));
    expect(backup).toEqual(await stored(page));
    expect(backup).not.toHaveProperty('repositorySync');
    expect(backup).not.toHaveProperty('passphrase');
  } finally { await phoneContext.close(); }
});

test('unconfirmed exports survive reload and repeat with the same IDs; locking never locks ordinary progress', async ({ page, context }) => {
  const published = { text: '' };
  await serve(context, published);
  await prepare(page);
  const first = await create(page);
  const saved = await raw(page);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Unlock your journal' })).toBeVisible();
  expect(await raw(page)).toBe(saved);
  const persisted = await page.evaluate(key => localStorage.getItem(key), REPOSITORY_SYNC_KEY);
  expect(persisted).not.toContain(phrase);
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByRole('button', { name: 'Unlock & check published updates', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Prepare encrypted updates', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Prepare encrypted updates', exact: true }).click();
  expect(await page.getByLabel('Encrypted appendable text').inputValue()).toBe(first);
  await page.getByRole('button', { name: 'Lock journal', exact: true }).click();
  await navigate(page, 'Settings & data');
  await page.getByRole('textbox', { name: 'What are you working toward?' }).fill('Ordinary saving still works with a locked journal.');
  await page.getByRole('button', { name: 'Save direction', exact: true }).click();
  await expect.poll(async () => (await stored(page)).objective).toBe('Ordinary saving still works with a locked journal.');
});

test('checking published progress retains compatible unpublished focus records from this browser', async ({ page, context }) => {
  const published = { text: '' };
  await serve(context, published);
  await prepare(page);
  published.text = await create(page);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect.poll(async () => (await cache(page)).confirmedCount).toBe(1);
  const baseline = parseJournal(published.text)!;
  const key = await deriveJournalKey(phrase, baseline.header);
  const journal = await unlockJournal(baseline, key);
  const remote = recordEvidence(journal.state, {
    missionId: 'pattern', checkpointId: journal.state.missions.pattern.checkpointId,
    title: 'Synthetic separately published practice', summary: 'An independent fictional evidence entry from another device.',
    kind: 'exercise', url: '', advance: false, criteriaConfirmed: false,
  });
  published.text = journalText((await appendWorkspace(journal, remote, key)).file);
  await navigate(page, 'Daily plan');
  await page.getByRole('button', { name: 'Start focus session', exact: true }).click();
  await expect.poll(async () => (await stored(page)).focusSessions?.length).toBe(1);
  const localFocus = (await stored(page)).focusSessions;
  await openSyncFromSettings(page);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect.poll(async () => (await stored(page)).evidence.length).toBe(1);
  expect((await stored(page)).focusSessions).toEqual(localFocus);
  expect((await stored(page)).evidence[0].title).toBe(remote.evidence[0].title);
  await page.getByRole('button', { name: 'Prepare encrypted updates', exact: true }).click();
  expect((await cache(page)).confirmedCount).toBe(2);
  expect(parseJournal((await cache(page)).journal)?.batches).toHaveLength(3);
});

test('conflicting offline edits are preserved until an explicit whole-workspace choice', async ({ page, context, browser, baseURL }) => {
  const published = { text: '' };
  await serve(context, published);
  await prepare(page);
  published.text = await create(page);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect.poll(async () => (await cache(page)).confirmedCount).toBe(1);
  const otherContext = await browser.newContext({ baseURL });
  try {
    await serve(otherContext, published);
    const other = await otherContext.newPage();
    await prepare(other);
    await connect(other);
    for (const [tab, goal] of [[page, 'Local offline goal to preserve'], [other, 'Other device published goal']] as const) {
      await navigate(tab, 'Settings & data');
      await tab.getByRole('textbox', { name: 'What are you working toward?' }).fill(goal);
      await tab.getByRole('button', { name: 'Save direction', exact: true }).click();
      await tab.getByRole('link', { name: 'Open repository sync', exact: true }).click();
    }
    await other.getByRole('button', { name: 'Prepare encrypted updates', exact: true }).click();
    published.text += await other.getByLabel('Encrypted appendable text').inputValue();
    const before = await raw(page), beforeCache = JSON.stringify(await cache(page));
    await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Changes need your decision' })).toBeVisible();
    expect(await raw(page)).toBe(before);
    expect(JSON.stringify(await cache(page))).toBe(beforeCache);
    await expect(page.getByRole('button', { name: "Keep this browser's workspace", exact: true })).not.toBeVisible();
    await page.getByText('Choose which complete workspace to keep', { exact: true }).click();
    await expect(page.getByRole('button', { name: "Keep this browser's workspace", exact: true })).toBeDisabled();
    await page.getByRole('checkbox', { name: /I reviewed both snapshots/ }).check();
    await page.getByRole('button', { name: "Keep this browser's workspace", exact: true }).click();
    expect(await raw(page)).toBe(before);
    expect((await cache(page)).confirmedCount).toBe(2);
    await page.getByRole('button', { name: 'Prepare encrypted updates', exact: true }).click();
    expect((await cache(page)).confirmedCount).toBe(2);
    expect(parseJournal((await cache(page)).journal)?.batches).toHaveLength(3);
  } finally { await otherContext.close(); }
});

test('wrong passwords, damaged ciphertext and missing published history never overwrite saved work', async ({ page, context }) => {
  const created = await createJournal(fixture(), phrase);
  const published = { text: journalText(created.journal.file) };
  await serve(context, published);
  await prepare(page);
  const before = await raw(page);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await page.getByLabel('Journal passphrase', { exact: true }).fill('Not the correct synthetic phrase');
  await page.getByRole('button', { name: 'Unlock selected journal', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('passphrase is incorrect or the journal is damaged');
  expect(await raw(page)).toBe(before);
  expect(await cache(page)).toBeNull();
  await connect(page);
  const advanced = await appendWorkspace(created.journal, { ...created.journal.state, objective: 'A new published goal' }, created.key);
  published.text = journalText(advanced.file);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect.poll(async () => (await cache(page)).confirmedCount).toBe(2);
  const safe = await raw(page), metadata = JSON.stringify(await cache(page));
  published.text = '';
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('missing previously confirmed history');
  expect(await raw(page)).toBe(safe);
  expect(JSON.stringify(await cache(page))).toBe(metadata);
  published.text = journalText(created.journal.file);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('previously confirmed history');
  expect(await raw(page)).toBe(safe);
  const damaged = structuredClone(advanced.file);
  damaged.batches[1].ciphertext = 'AAAAAAAAAAAAAAAAAAAAAAAA';
  published.text = journalText(damaged);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('damaged');
  expect(await raw(page)).toBe(safe);
  expect(JSON.stringify(await cache(page))).toBe(metadata);
});

test('file review is not publication and clipboard denial retains the encrypted download', async ({ page, context }) => {
  const published = { text: '' };
  await serve(context, published);
  await prepare(page);
  const initial = await create(page);
  await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async () => { throw new DOMException('Synthetic denial', 'NotAllowedError'); } },
  }));
  await page.getByRole('button', { name: 'Copy encrypted updates', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Updates were not copied');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download encrypted updates', exact: true }).click();
  expect(await downloadText(await downloading)).toBe(initial);
  await page.getByText('Review a full journal file or pasted journal', { exact: true }).click();
  await page.getByLabel('Paste a complete encrypted journal', { exact: true }).fill(initial);
  await page.getByRole('button', { name: 'Review pasted journal', exact: true }).click();
  await page.getByRole('button', { name: 'Apply combined updates', exact: true }).click();
  expect((await cache(page)).confirmedCount).toBe(0);
});

test('storage failures do not acknowledge a deployment or replace an unchanged browser on a failed save', async ({ page, context }) => {
  const remote = fixture();
  remote.objective = 'Incoming progress requiring a confirmed save';
  const created = await createJournal(remote, phrase);
  const published = { text: journalText(created.journal.file) };
  await serve(context, published);
  await prepare(page);
  const before = await raw(page);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByRole('button', { name: 'Unlock selected journal', exact: true }).click();
  await page.getByText('Choose which complete workspace to keep', { exact: true }).click();
  await page.getByRole('checkbox', { name: /I reviewed both snapshots/ }).check();
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('Synthetic quota failure', 'QuotaExceededError');
      original.call(this, name, value);
    };
  }, storageKey);
  await page.getByRole('button', { name: 'Use incoming workspace', exact: true }).click();
  await expect(page.getByText(/Journal progress was not applied/)).toBeVisible();
  expect(await raw(page)).toBe(before);
  expect(await cache(page)).toBeNull();
});

test('a sync-metadata quota failure reports the saved workspace honestly and permits explicit recovery', async ({ page, context }) => {
  const remote = fixture();
  remote.objective = 'A synthetic incoming workspace with a separately failed checkpoint save';
  const created = await createJournal(remote, phrase);
  await serve(context, { text: journalText(created.journal.file) });
  await prepare(page);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByRole('button', { name: 'Unlock selected journal', exact: true }).click();
  await page.getByText('Choose which complete workspace to keep', { exact: true }).click();
  await page.getByRole('checkbox', { name: /I reviewed both snapshots/ }).check();
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    document.documentElement.dataset.blockJournalMetadata = 'true';
    Storage.prototype.setItem = function (name, value) {
      if (name === key && document.documentElement.dataset.blockJournalMetadata === 'true') {
        throw new DOMException('Synthetic journal quota failure', 'QuotaExceededError');
      }
      original.call(this, name, value);
    };
  }, REPOSITORY_SYNC_KEY);
  await page.getByRole('button', { name: 'Use incoming workspace', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('workspace was saved, but its journal checkpoint could not be stored');
  expect((await stored(page)).objective).toBe(remote.objective);
  expect(await cache(page)).toBeNull();
  await page.evaluate(() => { delete document.documentElement.dataset.blockJournalMetadata; });
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByRole('button', { name: 'Unlock selected journal', exact: true }).click();
  await page.getByText('Choose which complete workspace to keep', { exact: true }).click();
  await page.getByRole('checkbox', { name: /I reviewed both snapshots/ }).check();
  await page.getByRole('button', { name: 'Use incoming workspace', exact: true }).click();
  await expect.poll(async () => (await cache(page))?.confirmedCount).toBe(1);
});

test('a stale review cannot overwrite work recorded while visiting another page', async ({ page, context }) => {
  const remote = fixture();
  remote.objective = 'Incoming goal from before this review';
  const created = await createJournal(remote, phrase);
  await serve(context, { text: journalText(created.journal.file) });
  await prepare(page);
  await page.getByRole('button', { name: 'Check published updates', exact: true }).click();
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByRole('button', { name: 'Unlock selected journal', exact: true }).click();
  await navigate(page, 'Settings & data');
  await page.getByRole('textbox', { name: 'What are you working toward?' }).fill('Newer local work saved after the review opened');
  await page.getByRole('button', { name: 'Save direction', exact: true }).click();
  const saved = await raw(page);
  await page.getByRole('link', { name: 'Open repository sync', exact: true }).click();
  await page.getByText('Choose which complete workspace to keep', { exact: true }).click();
  await page.getByRole('checkbox', { name: /I reviewed both snapshots/ }).check();
  await page.getByRole('button', { name: 'Use incoming workspace', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('workspace changed while this review was open');
  expect(await raw(page)).toBe(saved);
  expect(await cache(page)).toBeNull();
});

test('another tab cannot silently replace the encrypted outbox checkpoint', async ({ page, context }) => {
  await serve(context, { text: '' });
  await prepare(page);
  await create(page);
  const other = await context.newPage();
  await other.goto('./#/repository-sync');
  await expect(other.getByRole('heading', { name: 'Unlock your journal' })).toBeVisible();
  const prior = await cache(page);
  await page.getByText('Encrypted recovery and disconnect', { exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Disconnect repository sync', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText('Repository sync changed in another tab');
  await expect(other.getByRole('button', { name: 'Unlock & check published updates', exact: true })).toBeDisabled();
  expect(await cache(other)).toBeNull();
  expect(prior.journal).toContain('careeros-encrypted-journal');
  await other.close();
});

test('unavailable browser encryption fails explicitly while ordinary saving remains available', async ({ page, context }) => {
  await serve(context, { text: '' });
  await page.addInitScript(() => Object.defineProperty(crypto, 'subtle', { configurable: true, value: undefined }));
  await prepare(page);
  const before = await raw(page);
  await page.getByLabel('Journal passphrase', { exact: true }).fill(phrase);
  await page.getByLabel('Confirm passphrase', { exact: true }).fill(phrase);
  await page.getByRole('checkbox', { name: /I will keep this passphrase/ }).check();
  await page.getByRole('button', { name: 'Create encrypted journal', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Browser encryption is unavailable');
  expect(await raw(page)).toBe(before);
  expect(await cache(page)).toBeNull();
});

test('tutorial navigation cannot read, export or modify the real journal', async ({ page, context }) => {
  const published = { text: '' };
  await serve(context, published);
  await prepare(page);
  await create(page);
  const saved = await raw(page), metadata = JSON.stringify(await cache(page));
  await page.getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await expect(page.locator('[data-workspace="practice"]')).toBeVisible();
  await page.evaluate(() => { location.hash = '/repository-sync'; });
  await expect(page.getByRole('heading', { name: 'Real-journal controls are unavailable in tutorial practice.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prepare encrypted updates', exact: true })).toHaveCount(0);
  await expect(page.getByLabel('Journal passphrase', { exact: true })).toHaveCount(0);
  expect(await raw(page)).toBe(saved);
  expect(JSON.stringify(await cache(page))).toBe(metadata);
});

for (const width of [320, 390]) {
  test(`repository sync preserves enlarged typography, themes and layout at ${width}px`, async ({ page, context }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await serve(context, { text: '' });
    await prepare(page);
    await create(page);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    await page.screenshot({ path: testInfo.outputPath(`journal-${width}.png`), fullPage: true, animations: 'disabled' });
    await expect(page.getByRole('button', { name: 'Download encrypted updates', exact: true })).toBeVisible();
    const before = await raw(page);
    await page.getByRole('switch', { name: 'Dark theme', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    expect(await raw(page)).toBe(before);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });
}

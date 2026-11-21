import { test as base, expect, type Page, type TestInfo } from '@playwright/test';
import type { AppState } from '../src/domain/types';
import { createInitialState } from '../src/domain/engine';

const storageKey = 'careerhq.workspace.v1';
const sampleMessage = /Includes example data/;

const test = base.extend<{ browserHealth: void }>({
  browserHealth: [async ({ context, baseURL }, use) => {
    const appOrigin = new URL(baseURL!).origin;
    const errors: string[] = [];
    const externalRequests: string[] = [];
    const watch = (page: Page) => {
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => {
        if (message.type() === 'error') errors.push(message.text());
      });
    };
    context.pages().forEach(watch);
    context.on('page', watch);
    context.on('request', request => {
      const url = new URL(request.url());
      if (['http:', 'https:'].includes(url.protocol) && url.origin !== appOrigin) {
        externalRequests.push(request.url());
      }
    });
    context.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    await use();
    expect(errors, 'No console errors, page exceptions, or failed HTTP responses').toEqual([]);
    expect(externalRequests, 'The app must not request external assets or services').toEqual([]);
  }, { auto: true }],
});

async function stored(page: Page): Promise<AppState> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), storageKey);
}

async function rawStored(page: Page): Promise<string | null> {
  return page.evaluate(key => localStorage.getItem(key), storageKey);
}

async function navigate(page: Page, name: string | RegExp) {
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible() && await menu.getAttribute('aria-expanded') !== 'true') {
    await menu.click();
  }
  const link = page.getByRole('complementary', { name: 'Main navigation', includeHidden: true }).getByRole('link', { name, includeHidden: true });
  await link.click();
  await expect(link).toHaveClass(/\bselected\b/);
  if (await menu.isVisible()) await expect(menu).toHaveAttribute('aria-expanded', 'false');
}

async function confirmNext(page: Page, action: () => Promise<unknown>, accept = true) {
  const confirmation = page.waitForEvent('dialog');
  const click = action();
  const dialog = await confirmation;
  expect(dialog.type()).toBe('confirm');
  if (accept) await dialog.accept();
  else await dialog.dismiss();
  await click;
}

async function freshWorkspace(page: Page) {
  await page.goto('./');
  await navigate(page, 'Settings & data');
  await confirmNext(page, () => page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click());
  await expect(page.getByText(sampleMessage)).toHaveCount(0);
  await expect.poll(async () => (await stored(page)).sampleData).toBe(false);
}

async function openPatternForge(page: Page) {
  await navigate(page, /^Missions/);
  await page.getByRole('button', { name: 'Open DSA', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DSA', exact: true, level: 1 })).toBeVisible();
}

async function fillEvidence(page: Page, title: string, summary = 'I traced an example and explained the result in my own words.') {
  const dialog = page.getByRole('dialog', { name: 'Record progress' });
  await dialog.getByLabel('Artifact title').fill(title);
  await dialog.getByLabel('What did you practice?').fill(summary);
  return dialog;
}

async function screenshot(page: Page, testInfo: TestInfo, name: string, fullPage = true) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  ), { message: 'No horizontal document overflow' }).toBeLessThanOrEqual(0);
}

test('empty workspace, accessible navigation, and hash deep-link reload', async ({ page }, testInfo) => {
  await page.goto('./#/hq');
  await expect(page.getByRole('heading', { level: 1, name: 'Overview', exact: true })).toBeVisible();
  await expect(page.locator('script[type="module"][src]')).toHaveAttribute('src', /^\/CareerOS\/assets\/.+\.js$/);
  await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
    'content', /(?:^|;)\s*script-src 'self'\s*(?:;|$)/,
  );
  await expect(page.getByText(sampleMessage)).toHaveCount(0);
  expect((await stored(page)).sampleData).toBe(false);
  expect((await stored(page)).evidence).toEqual([]);
  await noOverflow(page);
  await screenshot(page, testInfo, 'hq-desktop');

  const pages = [
    [/^Missions/, 'Missions'],
    ['Roadmap', 'Roadmap'],
    ['Daily plan', 'Daily plan'],
    ['Saved work', 'Saved work'],
  ] as const;
  for (const [link, title] of pages) {
    await navigate(page, link);
    await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
  }
  await openPatternForge(page);
  await expect(page).toHaveURL(/\/CareerOS\/#\/mission\/pattern$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'DSA', exact: true })).toBeVisible();
  await screenshot(page, testInfo, 'mission-desktop');
});

for (const width of [390, 320]) {
  test(`all primary routes and evidence dialog fit ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('./');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await noOverflow(page);
    await screenshot(page, testInfo, `hq-${width}`);
    for (const link of [/^Missions/, 'Roadmap', 'Daily plan', 'Saved work', 'History',
      'Opportunities', 'Interview readiness', 'Settings & data']) {
      await navigate(page, link);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await noOverflow(page);
      await expect(page.getByRole('button', { name: 'Open navigation', exact: true })).toHaveAttribute('aria-expanded', 'false');
    }
    await openPatternForge(page);
    await noOverflow(page);
    await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Record progress' })).toBeVisible();
    await noOverflow(page);
    const dialogBox = await page.getByRole('dialog', { name: 'Record progress' }).boundingBox();
    expect(dialogBox).not.toBeNull();
    expect(dialogBox!.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox!.x + dialogBox!.width).toBeLessThanOrEqual(width);
    await screenshot(page, testInfo, `evidence-dialog-${width}`, false);
    const dialog = await fillEvidence(page, `Synthetic proof recorded at ${width}px`);
    await dialog.getByRole('button', { name: 'Save evidence', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect((await stored(page)).evidence.some(item => item.title === `Synthetic proof recorded at ${width}px`)).toBe(true);
    await noOverflow(page);
  });
}

test('reset needs confirmation, removes samples, and survives reload', async ({ page }) => {
  await page.addInitScript(({ key, state }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(state));
  }, { key: storageKey, state: createInitialState(true) });
  await page.goto('./');
  await navigate(page, 'Settings & data');
  const before = await rawStored(page);
  await confirmNext(page, () => page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click(), false);
  expect(await rawStored(page)).toBe(before);
  await expect(page.getByText(sampleMessage)).toBeVisible();
  await confirmNext(page, () => page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click());
  const clean = await stored(page);
  expect(clean.sampleData).toBe(false);
  expect(clean.evidence).toEqual([]);
  expect(clean.opportunities).toEqual([]);
  expect(Object.values(clean.missions).every(mission => mission.completedCheckpointIds.length === 0)).toBe(true);
  await page.reload();
  await expect(page.getByText(sampleMessage)).toHaveCount(0);
  expect((await stored(page)).evidence).toEqual([]);
});

test('required evidence records action progress without claiming mastery', async ({ page }) => {
  await freshWorkspace(page);
  await navigate(page, 'Daily plan');
  const before = await stored(page);
  const action = page.getByRole('article').filter({ has: page.getByText('DSA', { exact: true }) });
  await action.getByRole('button', { name: 'Log progress', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Record progress' });
  await dialog.getByRole('button', { name: 'Save evidence', exact: true }).click();
  expect(await dialog.getByLabel('Artifact title').evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
  expect((await stored(page)).evidence).toHaveLength(0);
  await dialog.getByLabel('Artifact title').fill('A test-owned practice trace');
  await dialog.getByRole('button', { name: 'Save evidence', exact: true }).click();
  expect(await dialog.getByLabel('What did you practice?').evaluate((input: HTMLTextAreaElement) => input.validity.valueMissing)).toBe(true);
  expect((await stored(page)).evidence).toHaveLength(0);
  await dialog.getByLabel('What did you practice?').fill('I traced a small example and recorded the boundary cases, without claiming completion.');
  await dialog.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(action.getByText('Evidence recorded', { exact: true })).toBeVisible();
  const after = await stored(page);
  expect(after.evidence).toHaveLength(1);
  expect(after.evidence[0].completedCheckpoint).toBe(false);
  expect(after.missions.pattern.checkpointId).toBe(before.missions.pattern.checkpointId);
  expect(after.missions.pattern.completedCheckpointIds).toEqual([]);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  await page.reload();
  await expect(action.getByText('Evidence recorded', { exact: true })).toBeVisible();
  await openPatternForge(page);
  await expect(page.getByRole('progressbar', { name: 'Mission checkpoint progress' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('In progress', { exact: true })).toBeVisible();
});

test('checkpoint unlock requires all criteria and retains evidence across reload', async ({ page }) => {
  await freshWorkspace(page);
  await openPatternForge(page);
  const before = await stored(page);
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const dialog = await fillEvidence(page, 'A test-owned checkpoint demonstration');
  await dialog.getByRole('checkbox', { name: /This checkpoint is complete/ }).check();
  const complete = dialog.getByRole('button', { name: 'Complete & unlock next', exact: true });
  await expect(complete).toBeDisabled();
  const criteria = dialog.getByRole('group', { name: 'My completion evidence meets these criteria' }).getByRole('checkbox');
  expect(await criteria.count()).toBeGreaterThan(0);
  for (const checkbox of await criteria.all()) await checkbox.check();
  await expect(complete).toBeEnabled();
  await complete.click();
  await expect(dialog).toHaveCount(0);
  const after = await stored(page);
  expect(after.missions.pattern.completedCheckpointIds).toEqual([before.missions.pattern.checkpointId]);
  expect(after.missions.pattern.checkpointId).not.toBe(before.missions.pattern.checkpointId);
  expect(after.missions.pattern.status).toBe('not-started');
  expect(after.evidence[0].completedCheckpoint).toBe(true);
  expect(after.events.slice(0, before.events.length)).toEqual(before.events);
  await page.reload();
  expect((await stored(page)).missions.pattern).toEqual(after.missions.pattern);
  await expect(page.getByRole('progressbar', { name: 'Mission checkpoint progress' })).not.toHaveAttribute('aria-valuenow', '0');
  await navigate(page, 'Saved work');
  await expect(page.getByRole('heading', { name: 'A test-owned checkpoint demonstration', exact: true })).toBeVisible();
  await expect(page.getByText('Checkpoint proof', { exact: true })).toBeVisible();
});

test('mission and evidence filters use real browser-owned records', async ({ page }) => {
  await freshWorkspace(page);
  await navigate(page, /^Missions/);
  await page.getByRole('button', { name: /^Background/ }).click();
  await expect(page.getByRole('button', { name: /^Open Competitive/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open DSA', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: /^All missions/ }).click();
  await page.getByRole('button', { name: 'Open DSA', exact: true }).click();
  await page.getByRole('button', { name: 'Record evidence', exact: true }).click();
  const dialog = await fillEvidence(page, 'Filterable practice artifact');
  await dialog.getByLabel('What did you make?').selectOption('code');
  await dialog.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await navigate(page, 'Saved work');
  const artifact = page.getByRole('heading', { name: 'Filterable practice artifact', exact: true });
  await expect(artifact).toBeVisible();
  await page.getByRole('combobox', { name: 'Filter evidence by mission' }).selectOption('system');
  await expect(artifact).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filter evidence by mission' }).selectOption('pattern');
  await page.getByRole('combobox', { name: 'Filter evidence by type' }).selectOption('diagram');
  await expect(artifact).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Filter evidence by type' }).selectOption('code');
  await expect(artifact).toBeVisible();
  await page.getByRole('textbox', { name: 'Search evidence', exact: true }).fill('not-a-matching-artifact');
  await expect(page.getByRole('heading', { name: 'No work matches those filters.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search evidence', exact: true }).fill('Filterable');
  await expect(artifact).toBeVisible();
});

test('gentle capacity rebuilds an untouched plan to at most one short action', async ({ page }) => {
  await freshWorkspace(page);
  await navigate(page, 'Daily plan');
  await page.getByRole('group', { name: 'Daily capacity' }).getByRole('button', { name: 'Gentle', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gentle', exact: true })).toHaveAttribute('aria-pressed', 'true');
  const state = await stored(page);
  const today = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  expect(state.capacity).toBe('gentle');
  expect(state.plans[today].length).toBeLessThanOrEqual(1);
  expect(state.plans[today].reduce((sum, action) => sum + action.minutes, 0)).toBeLessThanOrEqual(15);
  expect(await page.getByRole('button', { name: 'Log progress', exact: true }).count()).toBeLessThanOrEqual(1);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Gentle', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect((await stored(page)).plans[today]).toEqual(state.plans[today]);
});

test('opportunities can be created and moved between stages without changing mastery', async ({ page }) => {
  await freshWorkspace(page);
  const before = await stored(page);
  await navigate(page, 'Opportunities');
  await page.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Add opportunity', exact: true });
  await dialog.getByLabel('Company', { exact: true }).fill('Example Test Workshop');
  await dialog.getByLabel('Role', { exact: true }).fill('Fictional Platform Engineer');
  await dialog.getByLabel('Job listing').fill('https://example.com/synthetic-role');
  await dialog.getByLabel('Next step').fill('Read the fictional role requirements.');
  await dialog.getByRole('button', { name: 'Add opportunity', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Example Test Workshop', exact: true })).toBeVisible();
  const stage = page.getByRole('combobox', { name: 'Stage for Example Test Workshop', exact: true });
  await expect(stage).toHaveValue('Found');
  for (const value of ['Screening', 'Technical', 'Offer', 'Accepted']) {
    await stage.selectOption(value);
    await expect(stage).toHaveValue(value);
    expect((await stored(page)).opportunities[0].stage).toBe(value);
  }
  await page.getByRole('button', { name: 'Table', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Example Test Workshop' })).toContainText('Fictional Platform Engineer');
  const after = await stored(page);
  expect(after.missions).toEqual(before.missions);
  expect(after.evidence).toEqual([]);
  expect(after.events.filter(event => event.title.startsWith('Opportunity moved'))).toHaveLength(4);
  await page.reload();
  await expect(stage).toHaveValue('Accepted');
  await navigate(page, 'History');
  await page.getByRole('combobox', { name: 'Filter history by mission' }).selectOption('escape');
  await expect(page.getByRole('heading', { name: 'Opportunity moved from Offer to Accepted: Example Test Workshop', exact: true })).toBeVisible();
});

test('malformed JSON, incompatible schema, and broken references never overwrite data', async ({ page }) => {
  await freshWorkspace(page);
  const fileInput = page.getByLabel('Choose backup file', { exact: true });
  const before = await rawStored(page);
  const brokenReference = await stored(page);
  brokenReference.missions.pattern.checkpointId = 'nonexistent-checkpoint';
  const invalidBackups = [
    '{"schemaVersion":',
    JSON.stringify({ schemaVersion: 999 }),
    JSON.stringify(brokenReference),
  ];
  for (const content of invalidBackups) {
    await fileInput.setInputFiles({ name: 'invalid-backup.json', mimeType: 'application/json', buffer: Buffer.from(content) });
    await expect(page.getByRole('alert')).toContainText('Backup not imported. Your workspace is unchanged.');
    expect(await rawStored(page)).toBe(before);
  }
  await page.reload();
  expect(await rawStored(page)).toBe(before);
});

test('private export restores an exact snapshot only after replacement confirmation', async ({ page }) => {
  await freshWorkspace(page);
  const direction = page.getByLabel('What are you working toward?');
  await direction.fill('An explicitly saved synthetic direction.');
  await page.getByRole('button', { name: 'Save direction', exact: true }).click();
  const snapshot = await stored(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^careerhq-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const content = Buffer.concat(chunks);
  expect(JSON.parse(content.toString())).toEqual(snapshot);
  await direction.fill('A newer synthetic direction to replace.');
  await page.getByRole('button', { name: 'Save direction', exact: true }).click();
  const newer = await rawStored(page);
  const upload = () => page.getByLabel('Choose backup file', { exact: true }).setInputFiles({
    name: 'private-synthetic-backup.json', mimeType: 'application/json', buffer: content,
  });
  await confirmNext(page, upload, false);
  expect(await rawStored(page)).toBe(newer);
  await confirmNext(page, upload);
  await expect(direction).toHaveValue(snapshot.objective);
  expect(await stored(page)).toEqual(snapshot);
  await page.reload();
  await expect(direction).toHaveValue(snapshot.objective);
});

test.describe('storage recovery regressions', () => {
  test('import without today’s plan creates it immediately without a reload', async ({ page }) => {
    await freshWorkspace(page);
    const today = await page.evaluate(() => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    });
    const backup = await stored(page);
    delete backup.plans[today];
    backup.objective = 'A synthetic restored workspace with no current daily plan.';
    backup.capacity = 'gentle';
    const documentStarted = await page.evaluate(() => performance.timeOrigin);
    await confirmNext(page, () => page.getByLabel('Choose backup file', { exact: true }).setInputFiles({
      name: 'synthetic-backup-without-today.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(backup)),
    }));
    await expect(page.getByLabel('What are you working toward?')).toHaveValue(backup.objective);
    await expect.poll(async () => (await stored(page)).plans[today]?.length).toBe(1);
    const restored = await stored(page);
    expect(restored.plans[today][0].date).toBe(today);
    expect(restored.plans[today][0].completed).toBe(false);
    expect(restored.missions).toEqual(backup.missions);
    expect(restored.evidence).toEqual(backup.evidence);
    expect(restored.events).toEqual(backup.events);
    await navigate(page, 'Daily plan');
    await expect(page.getByRole('button', { name: 'Log progress', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: restored.plans[today][0].title, exact: true })).toBeVisible();
    expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStarted);
  });

  for (const kind of ['corrupted', 'unsupported'] as const) {
    test(`${kind} saved workspace retains original bytes and permits recovery download`, async ({ page }) => {
      await freshWorkspace(page);
      const original = kind === 'corrupted'
        ? '  {"schemaVersion":1,"syntheticNote":"preserve these exact bytes",\n'
        : JSON.stringify({ ...await stored(page), schemaVersion: 999 }, null, 2);
      await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: storageKey, raw: original });
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Your existing data comes first.', exact: true })).toBeVisible();
      await expect(page.getByRole('complementary', { name: 'Main navigation' })).toHaveCount(0);
      expect(await rawStored(page)).toBe(original);

      const downloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download original data', exact: true }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/^careerhq-backup-recovery-\d{4}-\d{2}-\d{2}\.json$/);
      const stream = await download.createReadStream();
      expect(stream).not.toBeNull();
      const chunks: Buffer[] = [];
      for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
      expect(Buffer.concat(chunks).toString()).toBe(original);
      expect(await rawStored(page)).toBe(original);

      await page.getByRole('button', { name: 'Try again', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Your existing data comes first.', exact: true })).toBeVisible();
      expect(await rawStored(page)).toBe(original);
    });
  }
});

test('readiness is explicit self-assessment and persists without checkpoint credit', async ({ page }) => {
  await freshWorkspace(page);
  const before = await stored(page);
  await navigate(page, 'Interview readiness');
  const coding = page.getByRole('group', { name: 'Coding patterns readiness', exact: true });
  await coding.getByRole('button', { name: 'Building', exact: true }).click();
  await expect(coding.getByRole('button', { name: 'Building', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await coding.getByRole('button', { name: 'Ready', exact: true }).click();
  const after = await stored(page);
  expect(after.readiness['Coding patterns']).toBe('ready');
  expect(after.missions).toEqual(before.missions);
  expect(after.evidence).toEqual([]);
  await page.reload();
  await expect(coding.getByRole('button', { name: 'Ready', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('another tab cannot silently overwrite a newer workspace', async ({ page, context }) => {
  await freshWorkspace(page);
  await navigate(page, 'Daily plan');
  const other = await context.newPage();
  await other.goto('./#/plan');
  await expect(other.getByRole('heading', { name: 'Daily plan', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gentle', exact: true }).click();
  const latest = await rawStored(page);
  await expect(other.getByRole('alert').filter({ hasText: /changed in another tab/ })).toBeVisible();
  await other.getByRole('button', { name: 'Deep focus', exact: true }).click();
  expect(await rawStored(page)).toBe(latest);
  await other.reload();
  await expect(other.getByRole('button', { name: 'Gentle', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(other.getByRole('alert')).toHaveCount(0);
});

test('focus timer can pause, resume, and reset without recording mastery', async ({ page }) => {
  await freshWorkspace(page);
  await navigate(page, 'Daily plan');
  await page.getByRole('button', { name: 'Gentle', exact: true }).click();
  await page.clock.install();
  const before = await rawStored(page);
  await expect(page.getByRole('timer')).toHaveText('10:00');
  await page.getByRole('button', { name: 'Start focus session', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.getByRole('timer')).toHaveText('09:58');
  await page.getByRole('button', { name: 'Pause session', exact: true }).click();
  await page.clock.runFor(2000);
  await expect(page.getByRole('timer')).toHaveText('09:58');
  await page.getByRole('button', { name: 'Continue session', exact: true }).click();
  await page.clock.runFor(1000);
  await expect(page.getByRole('timer')).toHaveText('09:57');
  await page.getByRole('button', { name: 'Reset focus timer', exact: true }).click();
  await expect(page.getByRole('timer')).toHaveText('10:00');
  const after = JSON.parse((await rawStored(page))!);
  const original = JSON.parse(before!);
  for (const field of ['missions', 'evidence', 'events', 'plans', 'readiness']) expect(after[field]).toEqual(original[field]);
  expect(after.focusSessions).toHaveLength(1);
  expect(after.focusSessions[0].events.map((event: { kind: string }) => event.kind)).toEqual(['pause', 'resume', 'reset']);
});

test('running focus timer survives mission and daily-plan navigation', async ({ page }) => {
  await freshWorkspace(page);
  await navigate(page, 'Daily plan');
  await page.getByRole('button', { name: 'Steady', exact: true }).click();
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  const documentStarted = await page.evaluate(() => performance.timeOrigin);
  await expect(page.getByRole('timer')).toHaveText('25:00');
  await page.getByRole('button', { name: 'Start focus session', exact: true }).click();
  await page.clock.fastForward(65_000);
  await expect(page.getByRole('timer')).toHaveText('23:55');
  await openPatternForge(page);
  await expect(page.getByRole('timer')).toHaveCount(0);
  await navigate(page, 'Daily plan');
  await expect(page.getByRole('timer')).toHaveText('23:55');
  await expect(page.getByRole('button', { name: 'Pause session', exact: true })).toBeVisible();
  await page.clock.fastForward(1000);
  await expect(page.getByRole('timer')).toHaveText('23:54');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStarted);
});

test('a midnight rollover preserves an open evidence draft without completing yesterday’s action', async ({ page }) => {
  const nearMidnight = await page.evaluate(() => {
    const date = new Date();
    date.setHours(23, 59, 30, 0);
    return date.getTime();
  });
  await page.clock.install({ time: new Date(nearMidnight - 1000) });
  await page.clock.pauseAt(nearMidnight);
  await freshWorkspace(page);
  await navigate(page, 'Daily plan');
  const before = await stored(page);
  const previousDate = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  const documentStarted = await page.evaluate(() => performance.timeOrigin);
  const action = page.getByRole('article').filter({ has: page.getByText('DSA', { exact: true }) });
  await action.getByRole('button', { name: 'Log progress', exact: true }).click();
  const title = 'Synthetic practice draft spanning midnight';
  const summary = 'I traced the boundary cases before midnight and kept this explanation open to finish it safely.';
  const dialog = await fillEvidence(page, title, summary);
  await page.clock.fastForward(65_000);
  const currentDate = await page.evaluate(() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  expect(currentDate).not.toBe(previousDate);
  await expect.poll(async () => (await stored(page)).plans[currentDate]).toBeDefined();
  const newPlan = (await stored(page)).plans[currentDate];
  await expect(dialog.getByText(/A new day has started\. Your draft is safe/)).toBeVisible();
  await expect(dialog.getByLabel('Artifact title')).toHaveValue(title);
  await expect(dialog.getByLabel('What did you practice?')).toHaveValue(summary);
  await dialog.getByRole('button', { name: 'Save evidence', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const after = await stored(page);
  expect(after.plans[previousDate]).toEqual(before.plans[previousDate]);
  expect(after.plans[currentDate]).toEqual(newPlan);
  expect(after.evidence).toHaveLength(1);
  expect(after.evidence[0]).toMatchObject({
    title, summary, missionId: 'pattern',
    checkpointId: before.missions.pattern.checkpointId,
    completedCheckpoint: false,
  });
  expect(Date.parse(after.evidence[0].createdAt)).toBeGreaterThanOrEqual(nearMidnight + 30_000);
  expect(after.missions.pattern.status).toBe('in-progress');
  expect(after.missions.pattern.completedCheckpointIds).toEqual([]);
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(documentStarted);
});

test('large valid workspace exports compact bytes and imports its actual backup', async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await freshWorkspace(page);
  const large = await stored(page);
  large.objective = 'Synthetic large workspace used only to verify portable backup limits.';
  large.missions.pattern.status = 'in-progress';
  const count = 5000;
  const timestamp = Date.parse(large.updatedAt);
  const summary = 'Synthetic practice note: I traced a public example, checked an edge case, and recorded a limitation at the caf\u00e9. ';
  large.evidence = Array.from({ length: count }, (_, index): AppState['evidence'][number] => ({
    id: `synthetic-large-proof-${index}`,
    missionId: 'pattern',
    checkpointId: large.missions.pattern.checkpointId,
    roadmapVersion: large.missions.pattern.roadmapVersion,
    title: `Synthetic practice artifact ${index}`,
    summary,
    kind: 'note',
    url: '',
    visibility: 'local',
    createdAt: new Date(timestamp - (count - index) * 1000).toISOString(),
    completedCheckpoint: false,
  }));
  large.events = large.evidence.map((item, index) => ({
    id: `synthetic-large-event-${index}`,
    type: 'evidence-recorded',
    title: `Evidence: ${item.title}`,
    missionId: item.missionId,
    createdAt: item.createdAt,
  }));
  const limit = 5 * 1024 * 1024;
  const initialBytes = Buffer.byteLength(JSON.stringify(large), 'utf8');
  const extraPerArtifact = Math.floor((4.7 * 1024 * 1024 - initialBytes) / count);
  expect(extraPerArtifact).toBeGreaterThan(0);
  for (const item of large.evidence) {
    item.summary += ' I revisited boundary conditions and documented an explicit limitation.'.repeat(30).slice(0, extraPerArtifact);
  }
  const compact = JSON.stringify(large);
  const compactBytes = Buffer.byteLength(compact, 'utf8');
  const prettyBytes = Buffer.byteLength(JSON.stringify(large, null, 2), 'utf8');
  expect(compactBytes).toBeLessThanOrEqual(limit);
  expect(prettyBytes, 'Pretty-printing this valid workspace would exceed the import limit').toBeGreaterThan(limit);
  await testInfo.attach('backup-byte-sizes', {
    body: JSON.stringify({ artifacts: count, events: count, compactBytes, prettyBytes, limit }),
    contentType: 'application/json',
  });

  await navigate(page, 'Overview');
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: storageKey, raw: compact });
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  expect((await stored(page)).evidence).toHaveLength(count);
  const persisted = await rawStored(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).click();
  const download = await downloadPromise;
  const stream = await download.createReadStream();
  expect(stream).not.toBeNull();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const exported = Buffer.concat(chunks);
  expect(exported.byteLength).toBeLessThanOrEqual(limit);
  expect(exported.equals(Buffer.from(persisted!)), 'Export must contain the same compact JSON as persisted storage').toBe(true);

  await navigate(page, 'Settings & data');
  await confirmNext(page, () => page.getByRole('button', { name: 'Start a fresh workspace', exact: true }).click());
  expect((await stored(page)).evidence).toHaveLength(0);
  await confirmNext(page, () => page.getByLabel('Choose backup file', { exact: true }).setInputFiles({
    name: download.suggestedFilename(), mimeType: 'application/json', buffer: exported,
  }));
  await expect(page.getByLabel('What are you working toward?')).toHaveValue(large.objective);
  await expect(page.getByRole('alert')).toHaveCount(0);
  const restored = await stored(page);
  expect(restored.evidence).toHaveLength(count);
  expect(restored.events).toHaveLength(count);
  expect(Buffer.from((await rawStored(page))!).equals(exported), 'Import must preserve the entire exported workspace').toBe(true);
});

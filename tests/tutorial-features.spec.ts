import { test, expect, type Page } from '@playwright/test';

async function snapshot(page: Page) {
  return page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])));
}

async function begin(page: Page, chapter: string) {
  await page.goto('./#/hq');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  const before = await snapshot(page);
  await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
  await page.getByLabel('Tutorial chapter', { exact: true }).selectOption(chapter);
  return before;
}

async function next(page: Page, id: string) {
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', id);
}

async function finish(page: Page, before: Awaited<ReturnType<typeof snapshot>>) {
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Exit tutorial', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-workspace', 'saved');
  expect(await snapshot(page)).toEqual(before);
}

test('bulk preview cancels before per-mission adoption and never changes the real roadmap', async ({ page }) => {
  const before = await begin(page, 'sources');
  await next(page, 'source-bulk-preview');
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Adopt all documented roadmaps', exact: true }).click();
  const review = page.locator('dialog.bulk-roadmap-modal[open]');
  await expect(review.locator('.tutorial-panel')).toBeVisible();
  await expect(review).toContainText('v1.0.0 → v3.0.0');
  await expect(review).toContainText('No new checkpoint is marked complete');
  await next(page, 'source-bulk-cancel');
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await review.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(review).toHaveCount(0);
  await next(page, 'source-select-fabric');
  await page.locator('[data-tour="source-mission"]').selectOption('fabric');
  await expect(page.locator('.source-heading')).toContainText('Active tracker v1.0.0');
  await expect(page.locator('[data-tour="source-archive"]')).toHaveCount(0);
  await next(page, 'source-preview');
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.locator('[data-tour="source-preview"] > summary').click();
  await next(page, 'source-adopt');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('[data-tour="source-adopt"]').click();
  await expect(page.locator('.source-heading')).toContainText('Active tracker v1.0.0');
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-tour="source-adopt"]').click();
  await expect(page.locator('.source-heading')).toContainText('Active tracker v3.0.0');
  await next(page, 'source-archive');
  await page.locator('[data-tour="source-archive"] > summary').click();
  await expect(page.locator('[data-tour="source-archive"]')).toContainText('0/5 completed');
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await finish(page, before);
});

for (const width of [1440, 320]) {
test(`checkpoint visibility lessons remain reachable at ${width}px without changing real data`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  const before = await begin(page, 'career-graph');
  await next(page, 'career-graph-orbits');
  await next(page, 'graph-pause');
  await page.getByRole('button', { name: 'Pause animation', exact: true }).click();
  await next(page, 'career-graph-checkpoints-hide');
  const nextButton = page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true });
  await expect(nextButton).toBeDisabled();
  await expect(page.locator('[data-graph-panel-trigger="view"]')).toHaveAttribute('aria-expanded', 'true');
  if (width === 320) expect((await page.locator('.career-graph-stage').boundingBox())!.height).toBeGreaterThan(320);
  const checkpoints = page.getByRole('checkbox', { name: 'Checkpoints', exact: true });
  await expect(checkpoints).toBeChecked();
  await checkpoints.uncheck();
  await next(page, 'career-graph-checkpoints-show');
  await expect(nextButton).toBeDisabled();
  await checkpoints.check();
  await next(page, 'graph-labels-hide');
  await finish(page, before);
});
}

test('saved practice evidence explains a work day without requiring completion', async ({ page }) => {
  const before = await begin(page, 'evidence');
  await page.locator('[data-tour="record-evidence"]').click();
  await next(page, 'evidence-save');
  await page.locator('[data-tour="evidence-example"]').click();
  await expect(page.locator('[data-tour="checkpoint-complete"]')).not.toBeChecked();
  await page.locator('[data-tour="evidence-submit"]').click();
  await next(page, 'evidence-activity');
  const streak = page.locator('.mission-work-streak[data-mission-id="pattern"]');
  await expect(streak).toHaveAttribute('data-worked-today', 'true');
  await expect(streak).toHaveAttribute('data-work-streak', '1');
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await streak.getByRole('button', { name: 'About Recorded-work streak', exact: true }).click();
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await finish(page, before);
});

test('jumping to review can create a fictional recall example without completion credit', async ({ page }) => {
  const before = await begin(page, 'review');
  await next(page, 'review-filter-work');
  await page.locator('[data-tour="saved-work-type"]').selectOption('code');
  await next(page, 'review-history');
  await next(page, 'review-recall-setup');
  await page.locator('[data-tour="recall-example"]').click();
  await expect(page.locator('.recall-card')).toHaveCount(1);
  await next(page, 'review-recall');
  await page.locator('[data-tour="recall-add"]').click();
  await page.getByRole('radio', { name: 'Partial', exact: true }).check();
  await page.locator('[data-tour="recall-save"]').click();
  await next(page, 'review-independent');
  await page.locator('[data-tour="recall-add"]').click();
  await page.locator('[data-tour="recall-independent-choice"]').check();
  await expect(page.locator('[data-tour="recall-save"]')).toBeDisabled();
  for (const check of await page.locator('[data-tour="recall-checks"] input[data-required="true"]').all()) await check.check();
  await page.locator('[data-tour="recall-save"]').click();
  await expect(page.locator('.recall-card')).not.toContainText('Retained');
  await finish(page, before);
});

test('opening a workbook keeps its module chooser available on the next lesson', async ({ page }) => {
  const before = await begin(page, 'pack-practice');
  await page.locator('[data-tour="pack-library-open"]').click();
  await expect(page).toHaveURL(/#\/practice\/fabric$/);
  await next(page, 'pack-reference');
  await expect(page).toHaveURL(/#\/practice\/fabric$/);
  const select = page.locator('[data-tour="pack-unit-select"]');
  const reference = select.locator('option').filter({ hasText: /\((practice|reference)\)$/ }).first();
  await select.selectOption((await reference.getAttribute('value'))!);
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await finish(page, before);
});

test('a denied clipboard write does not complete the copy lesson', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: { writeText: async () => { throw new DOMException('Denied for test', 'NotAllowedError'); } },
    });
  });
  const before = await begin(page, 'freelance');
  await page.locator('[data-tour="freelance-add"]').click();
  await page.locator('[data-tour="freelance-example"]').click();
  await page.locator('[data-tour="freelance-save"]').click();
  await next(page, 'freelance-classify');
  await page.locator('[data-tour="freelance-verdict"]').selectOption('Apply Now');
  await next(page, 'freelance-research-examples');
  await page.locator('[data-tour="freelance-research-examples"]').click();
  await expect(page.locator('.freelance-table tbody tr')).toHaveCount(10);
  await next(page, 'freelance-filters');
  await next(page, 'freelance-brief');
  for (const checkbox of (await page.locator('[data-tour="freelance-select"]').all()).slice(0, 5)) await checkbox.check();
  await next(page, 'freelance-copy');
  await page.locator('[data-tour="freelance-copy"]').click();
  await expect(page.locator('[data-tour="freelance-copy-error"]')).toBeVisible();
  await expect(page.locator('[data-tour="freelance-copy-success"]')).toHaveCount(0);
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await page.locator('.tutorial-panel').getByRole('button', { name: 'Skip step', exact: true }).click();
  await finish(page, before);
});

test('the compact full-map chapter guides controls without silently adopting a roadmap', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const before = await begin(page, 'full-map');
  await page.locator('[data-tour="full-roadmap-open"]').click();
  await expect(page.locator('.tutorial-map-guided')).toBeVisible();
  await expect(page.locator('.full-roadmap-modal')).toContainText('Preview v3.0.0');
  await expect(page.locator('[data-full-current="true"]')).toHaveCount(0);
  await next(page, 'full-map-zoom');
  await expect(page.locator('.tutorial-map-copy > strong')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.tutorial-map-actions').getByRole('button', { name: 'Next', exact: true })).toBeInViewport({ ratio: 1 });
  await page.locator('[data-tour="full-map-zoom-in"]').click();
  await next(page, 'full-map-inspect');
  await page.locator('[data-tour="full-map-last-node"]').click();
  await expect(page.locator('.full-roadmap-details')).toContainText('View only');
  await expect.poll(() => page.locator('.full-roadmap-viewport').evaluate(element => element.clientHeight)).toBeGreaterThan(80);
  await next(page, 'full-map-current');
  await page.getByLabel('Roadmap view', { exact: true }).selectOption('saved');
  await page.locator('[data-tour="full-map-current"]').click();
  await next(page, 'full-map-pan');
  await next(page, 'full-map-fit');
  await page.locator('[data-tour="full-map-fit"]').click();
  await next(page, 'full-map-close');
  await page.locator('[data-tour="dialog-close"]').click();
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await finish(page, before);
});

test('Show this step reopens a roadmap after returning from a different route', async ({ page }) => {
  const before = await begin(page, 'full-map');
  await page.locator('[data-tour="full-roadmap-open"]').click();
  await next(page, 'full-map-zoom');
  await page.locator('.full-roadmap-modal').getByRole('link', { name: 'Review tracker update', exact: true }).click();
  await expect(page).toHaveURL(/#\/sources\/fabric$/);
  await page.getByRole('button', { name: 'Show this step', exact: true }).click();
  await expect(page).toHaveURL(/#\/mission\/fabric$/);
  await expect(page.locator('.full-roadmap-modal')).toBeVisible();
  await expect(page.locator('.tutorial-map-guided')).toHaveAttribute('data-step', 'full-map-zoom');
  await page.locator('[data-tour="full-map-zoom-in"]').click();
  await expect(page.locator('.tutorial-panel').getByRole('button', { name: 'Next', exact: true })).toBeEnabled();
  await finish(page, before);
});

for (const viewport of [{ width: 568, height: 320 }, { width: 640, height: 360 }]) {
  test(`landscape ${viewport.width}x${viewport.height} keeps instructions and navigation reachable`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('./');
    const before = await snapshot(page);
    await page.locator('header').getByRole('button', { name: 'Start tutorial', exact: true }).click();
    await expect.poll(() => page.locator('.tutorial-content').evaluate(element => element.clientHeight)).toBeGreaterThanOrEqual(80);
    await expect(page.locator('.tutorial-body')).toBeInViewport();
    await next(page, 'career-graph-intro');
    await page.getByLabel('Tutorial chapter', { exact: true }).selectOption('perspective');
    await expect(page.locator('.tutorial-panel')).toHaveAttribute('data-step', 'perspective-intro');
    await next(page, 'overview-today');
    await finish(page, before);
  });
}

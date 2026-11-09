import { expect, test, type Page } from '@playwright/test';
import { createInitialState, generatePlan, localDate } from '../src/domain/engine';
import { MISSION_COLORS } from '../src/missionVisuals';

const key = 'careerhq.workspace.v1';

async function readable(page: Page, selector: string, minimum = 4.5) {
  const results = await page.locator(selector).evaluateAll((elements) => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    const rgba = (color: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return Array.from(context.getImageData(0, 0, 1, 1).data).map((value, index) => index === 3 ? value / 255 : value);
    };
    const blend = (foreground: number[], background: number[]) => [
      ...foreground.slice(0, 3).map((value, index) => value * foreground[3] + background[index] * (1 - foreground[3])),
      1,
    ];
    const luminance = (rgb: number[]) => rgb.slice(0, 3).map(value => {
      const channel = value / 255;
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [.2126, .7152, .0722][index], 0);
    return elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map(element => {
      const ancestors: Element[] = [];
      for (let node: Element | null = element; node; node = node.parentElement) ancestors.unshift(node);
      const background = ancestors.reduce((color, node) => blend(rgba(getComputedStyle(node).backgroundColor), color), [255, 255, 255, 1]);
      const foreground = blend(rgba(getComputedStyle(element).color), background);
      const a = luminance(foreground);
      const b = luminance(background);
      return { text: element.textContent?.trim().slice(0, 80) || element.tagName, ratio: (Math.max(a, b) + .05) / (Math.min(a, b) + .05) };
    });
  });
  expect(results.length, `Expected actual color samples for ${selector}`).toBeGreaterThan(0);
  for (const result of results) expect(result.ratio, `${result.text}: ${result.ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(minimum);
}

for (const theme of ['dark', 'light']) {
  test(`${theme} uses visible multi-hue identities even with zero progress and readable navigation`, async ({ page }, testInfo) => {
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    await page.goto('./#/hq');
    const before = await page.evaluate(key => localStorage.getItem(key), key);
    const metricColors = await page.locator('.overview-summary > a').evaluateAll(elements => elements.map(element => getComputedStyle(element).borderTopColor));
    expect(new Set(metricColors).size).toBe(3);
    await readable(page, '.overview-summary strong, .overview-summary > a > span, .overview-action .overview-row-content > span, .overview-checkpoint h3');
    await readable(page, '.sidebar .nav-item');
    await readable(page, '.sidebar .nav-item > svg', 3);
    const navColors = await page.locator('.sidebar .nav-item > svg').evaluateAll(elements => elements.map(element => getComputedStyle(element).color));
    expect(new Set(navColors).size).toBeGreaterThanOrEqual(6);

    await page.getByRole('link', { name: /^Missions/, exact: false }).click();
    await expect(page.getByRole('heading', { name: 'Missions', exact: true, level: 1 })).toBeVisible();
    await expect(page.locator('.mission-card')).toHaveCount(10);
    const cardColors = await page.locator('.mission-card').evaluateAll(elements => elements.map(element => getComputedStyle(element).borderTopColor));
    expect(new Set(cardColors).size).toBe(10);
    for (const [id, color] of Object.entries(MISSION_COLORS)) {
      const rgb = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
      await expect(page.locator(`.mission-card[data-mission-id="${id}"]`)).toHaveCSS('border-top-color', `rgb(${rgb.join(', ')})`);
    }
    await readable(page, '.mission-card h3, .mission-subtitle, .page-heading .eyebrow');
    await readable(page, '.mission-icon', 3);
    const selected = page.locator('.nav-item.selected');
    await expect(selected).toHaveAttribute('aria-current', 'page');
    await selected.hover();
    await readable(page, '.nav-item.selected, .nav-item.selected .nav-count');
    await page.screenshot({ path: testInfo.outputPath(`full-palette-missions-${theme}.png`), fullPage: true });
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  });

  test(`${theme} editorial reminders, saved work, plan and source views retain readable colored ink`, async ({ page }) => {
    const state = createInitialState(true);
    state.personalProof = ['Parser', 'Queue', 'Tree', 'Graph'].map((title, index) => ({
      id: `personal-color-${index}`, title: `Fictional ${title} implementation`,
      detail: 'Synthetic completed work for appearance coverage, not actual personal history.',
      source: 'Fictional color fixture', url: '',
    }));
    state.plans[localDate()] = generatePlan(state);
    const raw = JSON.stringify(state);
    await page.addInitScript(({ theme, key, raw }) => {
      localStorage.setItem('careerhq.theme.v1', theme);
      if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    }, { theme, key, raw });
    for (const [route, selector] of [
      ['perspective', '.personal-proof-card h3, .personal-proof-source, .perspective-receipt h3'],
      ['plan', '.mission-tag, .plan-item .text-link, .plan-number, .timer-time'],
      ['evidence', '.mission-tag, .evidence-card h3'],
      ['roadmap', '.tree-mission strong'],
      ['sources/fabric', '.source-heading h3, .mission-flowchart > figcaption h3'],
    ]) {
      await page.goto(`./#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await readable(page, selector);
      if (route === 'perspective') {
        const colors = await page.locator('.personal-proof-card').evaluateAll(elements => elements.map(element => getComputedStyle(element).borderTopColor));
        expect(new Set(colors).size).toBe(4);
      }
      expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(raw);
    }
  });

  test(`${theme} fullscreen stage colors do not replace the genuine current or completed status`, async ({ page }) => {
    await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
    await page.goto('./#/mission/fabric');
    const before = await page.evaluate(key => localStorage.getItem(key), key);
    await page.getByRole('button', { name: 'Full roadmap', exact: true }).click();
    await expect(page.locator('.full-roadmap-stage')).toHaveCount(5);
    const colors = await page.locator('.full-roadmap-stage').evaluateAll(elements => elements.map(element => getComputedStyle(element).borderTopColor));
    expect(new Set(colors).size).toBe(5);
    await readable(page, '.full-roadmap-stage-heading h3');
    await expect(page.locator('.full-roadmap-node[aria-current="step"]')).toHaveCount(1);
    await expect(page.locator('.full-roadmap-here')).toHaveText('You are here');
    await expect(page.locator('.full-roadmap-node.current')).toHaveCSS('border-top-color', theme === 'dark' ? 'rgb(0, 165, 145)' : 'rgb(0, 111, 99)');
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    expect(await page.evaluate(key => localStorage.getItem(key), key)).toBe(before);
  });
}

test('full-palette pages fit narrow screens and selected navigation remains readable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('./');
  for (const theme of ['dark', 'light']) {
    if (theme === 'light') {
      await page.getByRole('switch', { name: 'Dark theme', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
      await expect(page.locator('.palette-veil')).toHaveCount(0);
    }
    for (const route of ['hq', 'missions', 'perspective', 'plan', 'mission/fabric']) {
      await page.goto(`./#/${route}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await readable(page, '.nav-item.selected');
      await page.getByRole('button', { name: 'Close navigation', exact: true }).click({ position: { x: 310, y: 10 } });
    }
  }
});

import { expect, test } from '@playwright/test';

for (const theme of ['dark', 'light']) {
  for (const width of [2400, 1841, 1840, 1440, 1051, 1024, 768, 390, 320]) {
    test(`the full search hint fits at ${width}px in ${theme} without reducing type`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(theme => localStorage.setItem('careerhq.theme.v1', theme), theme);
      await page.goto('./#/mission/credential');
      const search = page.getByRole('textbox', { name: 'Search missions and evidence', exact: true });
      if (width <= 1840) {
        await expect(search).toHaveCSS('opacity', '0');
        await search.click();
        const panel = await page.locator('.search-wrap').boundingBox();
        const header = await page.locator('.topbar').boundingBox();
        expect(panel!.y).toBeGreaterThanOrEqual(header!.y + header!.height);
      }
      await expect(search).toHaveCSS('opacity', '1');
      await expect(search).toHaveCSS('font-size', '16.5px');
      await expect(search).toHaveAttribute('placeholder', 'Search missions and work');
      for (const fallback of [false, true]) {
        if (fallback) await page.addStyleTag({ content: ':root { font-family: Arial, sans-serif; }' });
        const measured = await search.evaluate(input => {
          const style = getComputedStyle(input);
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d')!;
          context.font = getComputedStyle(input, '::placeholder').font;
          return {
            text: context.measureText(input.getAttribute('placeholder')!).width,
            room: input.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
          };
        });
        expect(measured.room).toBeGreaterThanOrEqual(measured.text + 4);
        const bounds = await search.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      }
      const path = testInfo.outputPath(`search-${theme}-${width}.png`);
      await page.screenshot({ path, animations: 'disabled' });
      await testInfo.attach('readable-search-hint', { path, contentType: 'image/png' });
    });
  }
}

test('compact search keeps results usable and Escape closes it without workspace edits', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('./');
  const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
  const search = page.getByRole('textbox', { name: 'Search missions and evidence', exact: true });
  await page.keyboard.press('Control+k');
  await expect(search).toBeFocused();
  await search.fill('Pattern');
  const result = page.locator('.search-results a').first();
  await result.focus();
  await expect(search).toHaveCSS('opacity', '1');
  await result.press('Enter');
  await expect(page.getByRole('heading', { name: 'DSA', exact: true, level: 1 })).toBeVisible();
  await expect(page.locator('.search-results')).toHaveCount(0);
  await page.keyboard.press('Control+k');
  await search.fill('System');
  await page.keyboard.press('Escape');
  await expect(search).not.toBeFocused();
  await expect(search).toHaveValue('');
  await expect(search).toHaveCSS('opacity', '0');
  await page.keyboard.press('Control+k');
  await search.fill('Pattern');
  await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
  await expect(page.locator('.search-results')).toHaveCount(0);
  await expect(search).toHaveCSS('opacity', '0');
  await expect(page.getByRole('complementary', { name: 'Main navigation' }).getByRole('link', { name: 'Overview', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
});

import { expect, type Page } from '@playwright/test';

export async function openLibraryBrowser(page: Page) {
  const browser = page.locator('[data-tour="pack-browser"]');
  if (!await browser.evaluate((element: HTMLDetailsElement) => element.open)) {
    await browser.locator(':scope > summary').click();
  }
  await expect(browser).toHaveAttribute('open', '');
  return browser;
}

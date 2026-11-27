import { expect, test } from '@playwright/test';
import { createInitialState, recordEvidence } from '../src/domain/engine';
import { getDiscoverySnapshot } from '../src/discovery/model';
import { WAYFINDER_HISTORY_KEY, wayfinderSourceId } from '../src/discovery/useWayfinderHistory';

for (const theme of ['dark', 'light']) {
  for (const width of [1440, 320]) {
    test(`Atlas celebrations use readable frosted-glass surfaces in ${theme} at ${width}px`, async ({ page }) => {
      const empty = createInitialState(false);
      const state = recordEvidence(empty, {
        missionId: 'pattern', checkpointId: empty.missions.pattern.checkpointId,
        title: 'Synthetic glass showcase', summary: 'Synthetic completed code artifact for a material-style regression.',
        kind: 'code', url: '', advance: true, criteriaConfirmed: true,
      });
      const snapshot = getDiscoverySnapshot(state);
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(({ state, theme, historyKey, history }) => {
        localStorage.setItem('careerhq.workspace.v1', JSON.stringify(state));
        localStorage.setItem('careerhq.theme.v1', theme);
        localStorage.setItem(historyKey, JSON.stringify(history));
      }, { state, theme, historyKey: WAYFINDER_HISTORY_KEY,
        history: { version: 1, sourceId: wayfinderSourceId(snapshot), xp: snapshot.journey.xp } });
      await page.goto('./#/discoveries');
      const viewer = page.locator('[data-tour="wayfinder-viewer"]');
      await viewer.scrollIntoViewIfNeeded();
      await expect(viewer).toHaveAttribute('data-viewer-state', 'ready');
      const before = await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'));
      await page.locator('[data-tour="wayfinder-replay"]').click();
      await expect(page.locator('[data-tour="wayfinder-sequence"]')).toHaveAttribute('data-phase', 'complete');
      const surfaces = await page.evaluate(() => {
        const selectors = ['.wayfinder-panel', '.wayfinder-screen-column', '.wayfinder-next-reward',
          '.wayfinder-reward-row', '.wayfinder-levelup-banner > strong'];
        return selectors.map(selector => {
          const element = document.querySelector(selector);
          if (!element) throw new Error(`Missing actual surface: ${selector}`);
          const style = getComputedStyle(element);
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 1;
          const context = canvas.getContext('2d')!;
          context.fillStyle = style.backgroundColor;
          context.fillRect(0, 0, 1, 1);
          return { selector, backdrop: style.backdropFilter, alpha: context.getImageData(0, 0, 1, 1).data[3] / 255,
            radius: parseFloat(style.borderRadius), fontSize: parseFloat(style.fontSize) };
        });
      });
      for (const surface of surfaces) {
        expect(surface.backdrop, `${surface.selector} needs static frosted blur`).toContain('blur(');
        expect(surface.alpha, `${surface.selector} needs an actual translucent material`).toBeGreaterThan(.45);
        expect(surface.alpha).toBeLessThan(1);
        expect(surface.radius, `${surface.selector} needs square glass corners`).toBe(0);
      }
      const corners = await page.locator('.wayfinder-panel-head, .wayfinder-scene, .wayfinder-chapters > button, .wayfinder-actions > button, .wayfinder-levelup-banner > span, .discovery-card, .discovery-family, .discovery-activity')
        .evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomLeftRadius, style.borderBottomRightRadius];
        }));
      expect(corners.length).toBeGreaterThan(10);
      expect(corners.every(values => values.every(value => value === '0px'))).toBe(true);

      expect(surfaces.at(-1)!.fontSize).toBeGreaterThanOrEqual(width === 320 ? 18 : 26);
      expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(24);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await page.evaluate(() => localStorage.getItem('careerhq.workspace.v1'))).toBe(before);
      await expect(viewer).toHaveAttribute('data-model-level', '3');
      await expect(viewer).toHaveAttribute('data-motion', 'still');
    });
  }
}

test('the glass celebration highlight uses only bounded transform and opacity motion', async ({ page }) => {
  await page.goto('./#/discoveries');
  const viewer = page.locator('[data-tour="wayfinder-viewer"]');
  await viewer.scrollIntoViewIfNeeded();
  await expect(viewer).toHaveAttribute('data-viewer-state', 'ready');
  await page.clock.install();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
  await page.getByRole('button', { name: 'Play prologue', exact: true }).click();
  await page.clock.runFor(720);
  const effect = await page.locator('.wayfinder-levelup-banner > strong').evaluate(element => {
    const animation = element.getAnimations().find(item => item instanceof CSSAnimation && item.animationName === 'atlas-glass-impact');
    if (!animation || !(animation.effect instanceof KeyframeEffect)) throw new Error('Expected the actual glass highlight animation.');
    animation.pause();
    animation.currentTime = 0;
    const before = `${getComputedStyle(element).transform}/${getComputedStyle(element).opacity}`;
    animation.currentTime = 300;
    const after = `${getComputedStyle(element).transform}/${getComputedStyle(element).opacity}`;
    return { keys: [...new Set(animation.effect.getKeyframes().flatMap(frame => Object.keys(frame)))],
      duration: animation.effect.getTiming().duration, iterations: animation.effect.getTiming().iterations, changed: before !== after };
  });
  expect(effect.iterations).toBe(1);
  expect(Number(effect.duration)).toBeLessThanOrEqual(500);
  expect(effect.changed).toBe(true);
  expect(effect.keys.every(key => ['offset', 'computedOffset', 'easing', 'composite', 'transform', 'opacity'].includes(key))).toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-tour="wayfinder-sequence"]')).toHaveAttribute('data-phase', 'complete');
  expect(await page.locator('[data-tour="wayfinder-panel"]').evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
});

test('the authored no-blur fallback stays opaque and readable when its declarations are forced', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./#/discoveries');
  const fallback = await page.evaluate(() => {
    for (const sheet of document.styleSheets) {
      for (const rule of sheet.cssRules) {
        if (rule instanceof CSSSupportsRule && rule.conditionText.startsWith('not') &&
          rule.conditionText.includes('backdrop-filter') && rule.cssText.includes('--atlas-glass-fill')) {
          return Array.from(rule.cssRules, item => item.cssText).join('\n');
        }
      }
    }
    throw new Error('Missing the authored frosted-glass fallback.');
  });
  await page.addStyleTag({ content: fallback });
  const material = await page.locator('.wayfinder-panel').evaluate(element => {
    const style = getComputedStyle(element);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, 1, 1);
    return { alpha: context.getImageData(0, 0, 1, 1).data[3], ink: style.color };
  });
  expect(material.alpha).toBe(255);
  expect(material.ink).toBe('rgb(238, 232, 213)');
  await expect(page.locator('[data-tour="wayfinder-panel"]')).toContainText('WAYFINDER');
});

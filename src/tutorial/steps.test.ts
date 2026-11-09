import { describe, expect, it } from 'vitest';
import { chapters, steps } from './steps';
import { graphSteps } from './graphSteps';
import { cameraChanged } from './graphControls';

const ui = (controls: Record<string, object> = {}) => ({
  querySelector: (selector: string) => controls[selector] ?? null,
  querySelectorAll: () => [],
}) as unknown as Document;

const gate = (id: string, root: Document) => steps.find(step => step.id === id)!.checkUi!(root);

describe('current tutorial curriculum', () => {
  it('has unique steps, valid chapters, and actual gates for required actions', () => {
    expect(steps).toHaveLength(164);
    expect(chapters).toHaveLength(29);
    expect(new Set(steps.map(step => step.id)).size).toBe(steps.length);
    expect(new Set(chapters.map(chapter => chapter.id)).size).toBe(chapters.length);
    for (const chapter of chapters) expect(steps.some(step => step.chapter === chapter.id)).toBe(true);
    for (const step of steps) {
      expect(chapters.some(chapter => chapter.id === step.chapter)).toBe(true);
      if (step.kind === 'action') expect(!!step.check || !!step.checkUi, step.id).toBe(true);
    }
  });

  it('makes the graph expansion hands-on instead of claiming prose-only feature coverage', () => {
    expect(graphSteps.filter(step => step.kind === 'action').length).toBeGreaterThanOrEqual(45);
    for (const id of [
      'graph-everything-on', 'graph-everything-off', 'graph-labels-hide', 'graph-labels-show',
      'graph-spacing-spread', 'graph-spacing-reset', 'graph-records-references-hide', 'graph-records-references-show',
      'graph-shared-hide', 'graph-shared-show', 'graph-rings-hide', 'graph-rings-show',
      'graph-sparks-hide', 'graph-sparks-show', 'graph-spark-amount', 'graph-spark-lines', 'graph-spark-reset',
      'graph-autorotate-off', 'graph-pause', 'graph-heartbeat-off', 'graph-clear-center',
      'graph-ring-select', 'graph-ring-speed', 'graph-ring-speed-reset', 'graph-ring-stage', 'graph-ring-basis',
      'graph-ring-members', 'graph-focus-ring', 'graph-ring-current', 'graph-connections', 'graph-connection-sources',
      'graph-hidden-inspect', 'graph-group-hide', 'graph-individual-search', 'graph-individual-mixed', 'graph-select-all',
      'graph-focus-node', 'graph-zoom', 'graph-rotate', 'graph-drag', 'graph-frame', 'graph-fullscreen', 'graph-fullscreen-exit',
    ]) {
      const step = steps.find(candidate => candidate.id === id);
      expect(step?.kind, id).toBe('action');
      expect(step?.checkUi, id).toBeTypeOf('function');
    }
    for (const id of ['control-background-evidence', 'control-background-complete', 'control-background-graph', 'dsa-notebook-companion']) {
      expect(steps.find(step => step.id === id)?.kind, id).toBe('action');
    }
    for (const step of graphSteps) {
      expect(step.body.split(/\s+/).length, `${step.id}: mobile instruction length`).toBeLessThanOrEqual(85);
    }
  });

  it('fails closed on absent graph controls, even for inverse/off exercises', () => {
    for (const step of graphSteps.filter(step => step.kind === 'action')) {
      expect(step.checkUi?.(ui()), step.id).toBe(false);
    }
  });

  it('requires both a real camera control interaction and a subsequent ready-scene change', () => {
    const scene = (status: string, revision: string) => ui({
      '.career-graph-page .career-graph-scene': { dataset: { sceneState: status, viewRevision: revision } },
    });
    expect(cameraChanged(scene('ready', '3'))).toBe(false);
    expect(cameraChanged(scene('ready', '3'), { interacted: false, viewRevision: 2 })).toBe(false);
    expect(cameraChanged(scene('ready', '3'), { interacted: true, viewRevision: 3 })).toBe(false);
    expect(cameraChanged(scene('unavailable', '4'), { interacted: true, viewRevision: 3 })).toBe(false);
    expect(cameraChanged(scene('ready', '4'), { interacted: true, viewRevision: 3 })).toBe(true);
  });

  it('never passes a layer exercise using Show everything disabled overrides', () => {
    expect(gate('graph-labels-show', ui({
      'input[aria-label="Node labels"]': { checked: true, disabled: true },
    }))).toBe(false);
    expect(gate('graph-everything-on', ui({
      'input[aria-label="Show everything"]': { checked: true, disabled: false },
      'input[aria-label="Node labels"]': { checked: true, disabled: true },
    }))).toBe(true);
    expect(gate('graph-spark-reset', ui({
      'input[aria-label="Spark dots"]': { value: '10', disabled: false },
      'input[aria-label="Spark lines"]': { value: '35', disabled: false },
    }))).toBe(false);
    expect(gate('graph-spark-amount', ui({
      'input[aria-label="Spark dots"]': { value: '35', disabled: false },
      'input[aria-label="Spark lines"]': { value: '35', disabled: false },
    }))).toBe(false);
    expect(gate('graph-spark-amount', ui({
      'input[aria-label="Spark dots"]': { value: '35', disabled: false },
      'input[aria-label="Spark lines"]': { value: '10', disabled: false },
    }))).toBe(true);
  });

  it('starts each graph chapter with a recoverable route and panel command', () => {
    for (const chapter of ['career-graph', 'graph-view', 'graph-motion', 'graph-rings', 'graph-nodes', 'graph-camera']) {
      const first = steps.find(step => step.chapter === chapter)!;
      expect(first.route).toBe('home');
      expect(first.command).toBeDefined();
    }
    for (const step of steps.filter(step => step.uiAction && step.id !== 'graph-select-all')) {
      expect(step.checkUi).toBe(cameraChanged);
      expect(step.body).toMatch(/Skip|skip/);
    }
  });

  it('covers the newer tools without removing the original safe workflow', () => {
    const ids = new Set(steps.map(step => step.id));
    for (const id of [
      'source-preview', 'source-adopt', 'source-archive', 'source-stage', 'source-optional', 'source-forecast',
      'source-bulk-preview', 'source-bulk-cancel',
      'source-projects', 'full-map-open', 'full-map-zoom', 'full-map-inspect', 'full-map-current', 'full-map-fit',
      'pipeline-details', 'pipeline-metrics', 'freelance-research-examples', 'freelance-brief', 'freelance-copy',
      'review-recall-setup', 'review-independent', 'settings-export', 'settings-import', 'persistence-transfer',
      'evidence-save', 'evidence-activity', 'evidence-complete', 'control-blocker', 'tools-theme', 'perspective-intro',
      'dsa-library', 'dsa-library-section', 'dsa-library-filter',
      'system-concepts-intro', 'system-concepts-search',
      'system-practice-intro', 'system-practice-select', 'system-practice-transfer',
      'career-graph-intro', 'career-graph-orbits', 'career-graph-visibility', 'career-graph-search', 'career-graph-select',
      'career-graph-checkpoints-hide', 'career-graph-checkpoints-show',
      'pack-open', 'pack-reference', 'pack-exercises', 'pack-guide', 'pack-gate',
      'focus-room-open', 'focus-room-run', 'focus-room-report', 'focus-room-data', 'focus-room-close', 'focus-room-history',
    ]) expect(ids.has(id), id).toBe(true);
  });

  it('does not complete the new control lessons when their real UI is missing', () => {
    for (const id of [
      'career-graph-checkpoints-hide', 'career-graph-checkpoints-show',
      'source-bulk-preview', 'source-bulk-cancel', 'evidence-activity',
    ]) expect(gate(id, ui()), id).toBe(false);
  });

  it('appends real discovery interactions after the original tour and fails closed on missing controls', () => {
    const originalFinish = steps.findIndex(step => step.id === 'finish');
    expect(originalFinish).toBe(149);
    expect(steps.slice(originalFinish + 1).every(step => step.chapter === 'discovery')).toBe(true);
    for (const step of steps.filter(step => step.chapter === 'discovery' && step.checkUi)) {
      expect(step.checkUi!(ui()), step.id).toBe(false);
    }
    expect(steps.at(-1)?.id).toBe('discovery-finish');
  });

  it('requires hiding and restoring Checkpoints, not a different layer checkbox', () => {
    for (const checked of [false, true]) {
      const root = {
        querySelector: () => null,
        querySelectorAll: () => [
          { textContent: 'Work records', querySelector: () => ({ checked: !checked }) },
          { textContent: ' Checkpoints ', querySelector: () => ({ checked }) },
        ],
      } as unknown as Document;
      expect(gate('career-graph-checkpoints-hide', root)).toBe(!checked);
      expect(gate('career-graph-checkpoints-show', root)).toBe(checked);
    }
  });

  it('gates bulk preview on the review dialog and cancel on returning to sources', () => {
    const source = { '[data-tour="source-mission"]': {}, '.source-page-actions button': { disabled: false } };
    expect(gate('source-bulk-preview', ui(source))).toBe(false);
    expect(gate('source-bulk-cancel', ui(source))).toBe(true);
    const reviewing = ui({ ...source, 'dialog.bulk-roadmap-modal[open]': {} });
    expect(gate('source-bulk-preview', reviewing)).toBe(true);
    expect(gate('source-bulk-cancel', reviewing)).toBe(false);
    expect(gate('source-bulk-preview', ui({ '.source-page-actions button': { disabled: true } }))).toBe(true);
  });

  it('requires expanding the recorded-work explanation on the practice mission', () => {
    expect(gate('evidence-activity', ui({ '.mission-work-streak[data-mission-id="fabric"] details[open]': {} }))).toBe(false);
    expect(gate('evidence-activity', ui({ '.mission-work-streak[data-mission-id="pattern"] details[open]': {} }))).toBe(true);
  });

  it('keeps preview-and-cancel ahead of the deliberate per-mission archive exercise', () => {
    const ordered = ['source-upgrades', 'source-bulk-preview', 'source-bulk-cancel', 'source-select-fabric', 'source-preview', 'source-adopt', 'source-archive'];
    const positions = ordered.map(id => steps.findIndex(step => step.id === id));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const id of ['source-bulk-preview', 'source-bulk-cancel']) {
      expect(steps.find(step => step.id === id)?.command).toBeUndefined();
    }
    expect(steps.find(step => step.id === 'source-bulk-cancel')?.body).toContain('Click Cancel, not Confirm all roadmaps');
  });
});

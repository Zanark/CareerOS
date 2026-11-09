import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ArrowRight, ChevronDown, ChevronUp, GripHorizontal, LogOut, RotateCcw, SkipForward, X } from 'lucide-react';
import type { TutorialCommand, TutorialProps } from './types';
import { chapters, graphCheckpointToggle, steps } from './steps';
import type { TutorialStep, TutorialUiObservation } from './steps';
import { graphTarget, graphToggle } from './graphControls';
import { CUE_VIEWPORT_MARGIN, SECTION_PADDING, TutorialCue } from './TutorialCue';
import { useTutorialPosition } from './useTutorialPosition';

const MOBILE_WIDTH = 640;
const PANEL_MARGIN = 24;

function findOpenDialog(): HTMLElement | null {
  const dialog = document.querySelector<HTMLElement>('dialog[open]');
  return dialog?.querySelector<HTMLElement>('[data-focus-room-stage]') ?? dialog ??
    (document.fullscreenElement instanceof HTMLElement ? document.fullscreenElement : null);
}

function findTarget(targets: string[] | undefined, dialog: HTMLElement | null): HTMLElement | null {
  if (!targets || targets.length === 0) return null;
  for (const name of targets) {
    const target = graphTarget(document, name);
    if (!target || target.closest('[hidden]')) continue;
    if ('disabled' in target && target.disabled && graphToggle(document, 'Show everything')?.checked) {
      return graphToggle(document, 'Show everything');
    }
    if (name === 'graph-ring-members' && target.parentElement?.hasAttribute('open')) {
      return graphTarget(document, 'graph-ring-search');
    }
    if (name === 'graph-individuals' && target.parentElement?.hasAttribute('open')) {
      return graphTarget(document, 'graph-visibility-search');
    }
    if (name === 'graph-keyboard' && target.parentElement?.hasAttribute('open')) {
      return graphTarget(document, 'graph-rotate');
    }
    if (name === 'graph-clear-center' && !graphToggle(document, 'Core heartbeat')?.checked) {
      return graphToggle(document, 'Core heartbeat');
    }
    if (name === 'graph-spark-amount' && targets.includes('graph-spark-lines') &&
        document.querySelector<HTMLInputElement>('input[aria-label="Spark dots"]')?.value === '10') {
      return graphTarget(document, 'graph-spark-lines');
    }
    if (name === 'graph-toggle:Work records' && targets.includes('graph-toggle:References')) {
      const records = graphToggle(document, 'Work records');
      const references = graphToggle(document, 'References');
      if (records?.checked !== references?.checked) return references;
    }
    return target;
  }
  if (targets.includes('career-graph-list')) return document.querySelector('[data-tour="career-graph-list"] button');
  if (targets.includes('career-graph-checkpoints') && !dialog) {
    const trigger = document.querySelector<HTMLElement>('[data-graph-panel-trigger="view"]');
    return trigger?.getAttribute('aria-expanded') === 'true' ? graphCheckpointToggle(document) : trigger;
  }
  if (targets.includes('source-bulk-preview')) {
    return dialog?.querySelector('.bulk-roadmap-body') ?? document.querySelector('.source-page-actions button');
  }
  if (targets.includes('source-bulk-cancel')) return dialog?.querySelector('.bulk-roadmap-actions .secondary') ?? null;
  if (targets.includes('mission-work-streak') && !dialog) {
    return document.querySelector('.mission-work-streak[data-mission-id="pattern"] summary');
  }
  if (dialog && targets.includes('full-map-last-node') &&
      dialog.querySelector('.full-roadmap-node[aria-pressed="true"]:not([aria-current="step"])')) {
    const showDetails = dialog.querySelector<HTMLElement>('[data-tour="map-details-toggle"][aria-expanded="false"]');
    if (showDetails) return showDetails;
  }
  if (targets.includes('source-optional')) {
    const mission = document.querySelector<HTMLSelectElement>('[data-tour="source-mission"]');
    return mission?.value === 'credential' ? document.querySelector('[data-tour="roadmap-stage"]') : mission;
  }
  if (targets.includes('freelance-select')) {
    return document.querySelector('[data-tour="freelance-select"]:not(:checked):not(:disabled)') ??
      document.querySelector('[data-tour="freelance-copy"]');
  }
  if (targets.includes('application-details') && dialog) {
    const company = dialog.querySelector<HTMLInputElement>('[name="company"]')?.value.trim();
    const lane = dialog.querySelector<HTMLSelectElement>('[name="lane"]')?.value;
    return company && lane ? dialog.querySelector('[data-tour="application-details"] > summary') : dialog.querySelector('[data-tour="opportunity-example"]');
  }
  if (targets.includes('recall-independent')) {
    if (!dialog) return document.querySelector('[data-tour="recall-add"]');
    const choice = dialog.querySelector<HTMLInputElement>('[data-tour="recall-independent-choice"]');
    if (!choice?.checked) return choice;
    return dialog.querySelector('[data-tour="recall-checks"] input[data-required="true"]:not(:checked)') ??
      dialog.querySelector('[data-tour="recall-save"]');
  }
  if (dialog && (targets.includes('evidence-example') || targets.includes('checkpoint-complete'))) {
    const title = dialog.querySelector<HTMLInputElement>('[name="title"]')?.value.trim() ?? '';
    const summary = dialog.querySelector<HTMLTextAreaElement>('[name="summary"]')?.value.trim() ?? '';
    if (title.length < 3 || summary.length < 10) return dialog.querySelector('[data-tour="evidence-example"]');
    if (targets.includes('checkpoint-complete')) {
      const complete = dialog.querySelector<HTMLInputElement>('[data-tour="checkpoint-complete"]');
      if (!complete?.checked) return complete;
      const remaining = dialog.querySelector<HTMLInputElement>('[data-tour="evidence-criteria"] input:not(:checked)');
      if (remaining) return remaining;
    }
    return dialog.querySelector('[data-tour="evidence-submit"]');
  }
  if (dialog && targets.includes('opportunity-example')) {
    const company = dialog.querySelector<HTMLInputElement>('[name="company"]')?.value.trim();
    const role = dialog.querySelector<HTMLInputElement>('[name="role"]')?.value.trim();
    if (company && role) return dialog.querySelector('[data-tour="opportunity-submit"]');
  }
  if (dialog && targets.includes('freelance-example')) {
    const title = dialog.querySelector<HTMLInputElement>('[name="title"]')?.value.trim();
    const platform = dialog.querySelector<HTMLInputElement>('[name="platform"]')?.value.trim();
    if (title && platform) return dialog.querySelector('[data-tour="freelance-save"]');
  }
  if (dialog && targets.includes('recall-outcome') && dialog.querySelector<HTMLInputElement>('input[name="outcome"]:checked')?.parentElement?.textContent?.trim() === 'Partial') {
    return dialog.querySelector('[data-tour="recall-save"]');
  }
  if (!dialog && targets.includes('capacity')) {
    const buttons = document.querySelectorAll<HTMLElement>('[data-tour="capacity"] button');
    return [...buttons].find(button => button.textContent?.trim() === 'Gentle') ?? null;
  }
  if (!dialog && targets.includes('readiness-coding')) {
    const buttons = document.querySelectorAll<HTMLElement>('[data-tour="readiness-coding"] button');
    return [...buttons].find(button => button.textContent?.trim() === 'Building') ?? null;
  }
  for (const name of targets) {
    const scoped = dialog?.querySelector<HTMLElement>(`[data-tour="${name}"]`);
    if (scoped) return scoped instanceof HTMLDetailsElement ? scoped.querySelector('summary') : scoped;
  }
  if (dialog) return null;
  for (const name of targets) {
    const global = document.querySelector<HTMLElement>(`[data-tour="${name}"]`);
    if (global) return global instanceof HTMLDetailsElement ? global.querySelector('summary') : global;
  }
  return null;
}

function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface Placement {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

function computePlacement(targetRect: DOMRect | null, panelSize: { width: number; height: number }, mobile: boolean): Placement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  if (mobile) {
    const width = viewportWidth - PANEL_MARGIN * 2;
    return { top: viewportHeight - panelSize.height - PANEL_MARGIN, left: PANEL_MARGIN, width, maxHeight: viewportHeight * 0.6 };
  }
  const width = Math.min(440, viewportWidth - PANEL_MARGIN * 2);
  if (!targetRect) {
    return { top: viewportHeight - panelSize.height - PANEL_MARGIN, left: viewportWidth - width - PANEL_MARGIN, width, maxHeight: viewportHeight - PANEL_MARGIN * 2 };
  }
  const spaceRight = viewportWidth - targetRect.right;
  const spaceLeft = targetRect.left;
  const spaceBelow = viewportHeight - targetRect.bottom;
  const spaceAbove = targetRect.top;
  let left: number;
  let top: number;
  if (spaceRight >= width + PANEL_MARGIN) {
    left = targetRect.right + PANEL_MARGIN;
    top = Math.min(Math.max(targetRect.top, PANEL_MARGIN), viewportHeight - panelSize.height - PANEL_MARGIN);
  } else if (spaceLeft >= width + PANEL_MARGIN) {
    left = targetRect.left - width - PANEL_MARGIN;
    top = Math.min(Math.max(targetRect.top, PANEL_MARGIN), viewportHeight - panelSize.height - PANEL_MARGIN);
  } else if (spaceBelow >= panelSize.height + PANEL_MARGIN) {
    top = targetRect.bottom + PANEL_MARGIN;
    left = Math.min(Math.max(targetRect.left, PANEL_MARGIN), viewportWidth - width - PANEL_MARGIN);
  } else if (spaceAbove >= panelSize.height + PANEL_MARGIN) {
    top = targetRect.top - panelSize.height - PANEL_MARGIN;
    left = Math.min(Math.max(targetRect.left, PANEL_MARGIN), viewportWidth - width - PANEL_MARGIN);
  } else {
    left = viewportWidth - width - PANEL_MARGIN;
    top = PANEL_MARGIN;
  }
  left = Math.min(Math.max(left, PANEL_MARGIN), viewportWidth - width - PANEL_MARGIN);
  top = Math.min(Math.max(top, PANEL_MARGIN), viewportHeight - panelSize.height - PANEL_MARGIN);
  return { top, left, width, maxHeight: viewportHeight - PANEL_MARGIN * 2 };
}

export function Tutorial({ state, route, signals, onNavigate, onCommand, onExit, onRestart }: TutorialProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [achieved, setAchieved] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);
  const [dialogHost, setDialogHost] = useState<HTMLElement | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [targetMissing, setTargetMissing] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 440, height: 220 });
  const [mobile, setMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth <= MOBILE_WIDTH);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const targetElRef = useRef<HTMLElement | null>(null);
  const enterThemeRef = useRef(signals.theme);
  const rafRef = useRef(0);
  const pendingRef = useRef(false);
  const pendingCommand = useRef<{ route: string; stepId: string; command: TutorialCommand } | null>(null);
  const uiObservation = useRef<TutorialUiObservation & { stepId: string }>({ stepId: '', interacted: false, viewRevision: null });
  const dragStart = useRef<{ x: number; y: number; revision: number | null } | null>(null);
  const moveHelpId = useId();

  const step: TutorialStep = steps[stepIndex];
  const total = steps.length;
  const satisfied = step.kind === 'explain' || achieved.has(step.id);
  const nextCue = satisfied && (step.kind === 'action' || !step.targets?.length);
  const stepRoute = [...steps.slice(0, stepIndex + 1)].reverse().find(candidate => candidate.route)?.route ?? 'hq';

  // Navigate / invoke command exactly once when the step changes.
  useEffect(() => {
    enterThemeRef.current = signals.theme;
    uiObservation.current = { stepId: step.id, interacted: false, viewRevision: null };
    dragStart.current = null;
    pendingCommand.current = null;
    if (stepRoute !== route) {
      if (step.command) pendingCommand.current = { route: stepRoute, stepId: step.id, command: step.command };
      onNavigate(stepRoute);
    } else if (step.command) onCommand(step.command);
    panelRef.current?.scrollTo({ top: 0 });
    panelRef.current?.querySelector('.tutorial-content, .tutorial-map-copy')?.scrollTo({ top: 0 });
    setCollapsed(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  useEffect(() => {
    const pending = pendingCommand.current;
    if (pending?.route === route && pending.stepId === step.id) {
      pendingCommand.current = null;
      onCommand(pending.command);
    }
  }, [route, step.id, onCommand]);

  const checkStep = useCallback(() => {
    if (step.kind !== 'action' || (!step.check && !step.checkUi) || achieved.has(step.id)) return;
    const ok = (!step.check || step.check({ state, signals, route, enterTheme: enterThemeRef.current })) &&
      (!step.checkUi || step.checkUi(document, uiObservation.current.stepId === step.id ? uiObservation.current : undefined));
    if (ok) setAchieved((prev) => (prev.has(step.id) ? prev : new Set(prev).add(step.id)));
  }, [step, state, signals, route, achieved]);
  useEffect(checkStep, [checkStep]);

  const scan = useCallback(() => {
    const dialog = findOpenDialog();
    setDialogHost((prev) => (prev === dialog ? prev : dialog));
    const target = findTarget(step.targets, dialog);
    if (target && isVisible(target)) {
      targetElRef.current = target;
      setTargetElement(previous => previous === target ? previous : target);
      const rect = target.getBoundingClientRect();
      setTargetRect(previous => previous && previous.x === rect.x && previous.y === rect.y &&
        previous.width === rect.width && previous.height === rect.height ? previous : rect);
      setTargetMissing(false);
    } else {
      if (targetElRef.current) targetElRef.current = null;
      setTargetElement(null);
      setTargetRect(null);
      setTargetMissing(Boolean(step.targets && step.targets.length > 0));
    }
    setMobile(window.innerWidth <= MOBILE_WIDTH);
    checkStep();
  }, [step, checkStep]);

  const schedule = useCallback(() => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    rafRef.current = window.requestAnimationFrame(() => {
      pendingRef.current = false;
      scan();
    });
  }, [scan]);

  // Re-scan on step change, DOM mutation (dialogs opening/closing), resize, and scroll.
  useEffect(() => {
    schedule();
    const observeAction = (event: Event) => {
      const action = step.uiAction;
      if (action?.event === 'pointerup' && event.type === 'pointerdown' && event instanceof PointerEvent &&
          event.target instanceof Element && event.target.matches(action.selector)) {
        const revision = document.querySelector<HTMLElement>('.career-graph-page .career-graph-scene')?.dataset.viewRevision;
        dragStart.current = { x: event.clientX, y: event.clientY, revision: revision === undefined ? null : Number(revision) };
        return;
      }
      if (!action || event.type !== action.event || !(event.target instanceof Element) ||
          !event.target.closest(action.selector) || (action.key && (!(event instanceof KeyboardEvent) || event.key !== action.key))) return;
      const revision = document.querySelector<HTMLElement>('.career-graph-page .career-graph-scene')?.dataset.viewRevision;
      if (action.event === 'pointerup') {
        const start = dragStart.current;
        dragStart.current = null;
        if (!(event instanceof PointerEvent) || !start || Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
        uiObservation.current = { stepId: step.id, interacted: true, viewRevision: start.revision };
      } else {
        uiObservation.current = { stepId: step.id, interacted: true, viewRevision: revision === undefined ? null : Number(revision) };
      }
      schedule();
    };
    const mutation = new MutationObserver(() => schedule());
    mutation.observe(document.body, { childList: true, subtree: true, attributes: true,
      attributeFilter: ['open', 'class', 'hidden', 'aria-pressed',
        ...(step.chapter === 'discovery' ? [
          'data-orbit-offset', 'data-pan-offset', 'data-control-mode', 'data-reset-count',
          'data-view-default', 'data-replay-count', 'data-phase', 'data-view-level',
        ] : []),
        ...(step.uiAction ? ['data-view-revision', 'data-scene-state'] : [])] });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    document.addEventListener('input', schedule, true);
    document.addEventListener('change', schedule, true);
    document.addEventListener('click', schedule, true);
    document.addEventListener('click', observeAction, true);
    document.addEventListener('keydown', observeAction, true);
    document.addEventListener('pointerup', observeAction, true);
    document.addEventListener('pointerdown', observeAction, true);
    document.addEventListener('fullscreenchange', schedule);
    return () => {
      mutation.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      document.removeEventListener('input', schedule, true);
      document.removeEventListener('change', schedule, true);
      document.removeEventListener('click', schedule, true);
      document.removeEventListener('click', observeAction, true);
      document.removeEventListener('keydown', observeAction, true);
      document.removeEventListener('pointerup', observeAction, true);
      document.removeEventListener('pointerdown', observeAction, true);
      document.removeEventListener('fullscreenchange', schedule);
      window.cancelAnimationFrame(rafRef.current);
      pendingRef.current = false;
    };
  }, [schedule]);

  // Track the highlighted target's own size changes (e.g. expanding content).
  useEffect(() => {
    const target = targetElement;
    if (!target || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => schedule());
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetElement, schedule]);

  // Measure the coach panel itself so placement can avoid covering the target.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const measure = () => {
      const rect = panel.getBoundingClientRect();
      setPanelSize((prev) => (prev.width === rect.width && prev.height === rect.height ? prev : { width: rect.width, height: rect.height }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [step.id, collapsed, targetMissing, dialogHost]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('tutorial-running');
    root.style.setProperty('--tutorial-clearance', `${mobile ? panelSize.height + 32 : 24}px`);
    return () => {
      root.classList.remove('tutorial-running');
      root.style.removeProperty('--tutorial-clearance');
    };
  }, [mobile, panelSize.height]);

  // Scroll the target into view once when the step (or found target) changes, not continuously.
  useEffect(() => {
    const target = targetElement;
    if (!target || nextCue) return;
    const map = target.closest('.full-roadmap-modal')?.querySelector<HTMLElement>('.full-roadmap-viewport');
    if (map) {
      if (map !== target && map.contains(target)) {
        const surface = map.getBoundingClientRect();
        const rect = target.getBoundingClientRect();
        map.scrollTo({ left: map.scrollLeft + rect.left + rect.width / 2 - surface.left - map.clientWidth / 2,
          top: map.scrollTop + rect.top + rect.height / 2 - surface.top - map.clientHeight / 2 });
      }
      return;
    }
    const coachHeight = window.innerWidth <= MOBILE_WIDTH ? (panelRef.current?.getBoundingClientRect().height ?? 0) + 32 : 0;
    const availableHeight = window.innerHeight - coachHeight;
    const fits = target.getBoundingClientRect().height + 2 * (SECTION_PADDING + CUE_VIEWPORT_MARGIN) <= availableHeight;
    target.classList.add('tutorial-highlight');
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: fits ? 'center' : 'start', inline: 'nearest' });
    return () => target.classList.remove('tutorial-highlight');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, targetElement, nextCue]);

  const chapterOf = (id: string) => chapters.find((candidate) => candidate.id === id);
  const currentChapter = chapterOf(step.chapter);
  const chapterStartIndex = useMemo(() => {
    const map = new Map<string, number>();
    steps.forEach((candidate, index) => { if (!map.has(candidate.chapter)) map.set(candidate.chapter, index); });
    return map;
  }, []);

  function goTo(index: number) {
    const clamped = Math.min(Math.max(index, 0), total - 1);
    setStepIndex(clamped);
  }
  function next() { goTo(stepIndex + 1); }
  function back() { goTo(stepIndex - 1); }
  function skip() { goTo(stepIndex + 1); }
  function jumpToChapter(chapterId: string) {
    const start = chapterStartIndex.get(chapterId);
    if (start !== undefined) goTo(start);
  }
  function showStep() {
    if (stepRoute !== route) {
      pendingCommand.current = step.command ? { route: stepRoute, stepId: step.id, command: step.command } : null;
      onNavigate(stepRoute);
    } else if (step.command) onCommand(step.command);
    else if (dialogHost) onCommand('close-dialogs');
    schedule();
  }
  function focusControl() {
    const target = targetElRef.current;
    if (!target) return;
    const control = target.matches('button,input,select,textarea,a[href]')
      ? target
      : target.querySelector<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');
    control?.focus({ preventScroll: true });
  }
  function handleEscape() {
    onExit();
  }

  const placement = computePlacement(mobile ? null : targetRect, panelSize, mobile);
  const movable = useTutorialPosition(panelRef, {
    width: mobile ? window.innerWidth - 20 : placement.width,
    height: panelSize.height,
  }, dialogHost);
  const host = dialogHost ?? document.body;
  const progressPct = Math.round(((stepIndex + 1) / total) * 100);
  const focusRoomHost = !!dialogHost?.matches('[data-focus-room-stage]');
  const mobileAboveTarget = mobile && !!dialogHost?.matches('.career-graph-stage-wrap') &&
    targetRect !== null && targetRect.top >= panelSize.height + 20 &&
    targetRect.bottom > window.innerHeight - panelSize.height - 20;

  if ((dialogHost?.classList.contains('full-roadmap-modal') && step.chapter === 'full-map') ||
      (focusRoomHost && step.chapter === 'focus-room')) return createPortal(
    <>
      <TutorialCue target={satisfied ? nextRef.current : targetElement} panel={panelRef.current} anchorRect={targetRect} />
      <div ref={panelRef} data-step={step.id} className={`tutorial-panel tutorial-map-guide ${focusRoomHost ? 'tutorial-focus-guide' : 'tutorial-map-guided'}`} role="region"
        aria-label={`Tutorial step ${stepIndex + 1} of ${total}: ${step.title}`}>
        <div className="tutorial-map-copy"><strong>{step.title}</strong><p>{satisfied && step.kind === 'action' ? 'Done. Click Next to continue.' : step.body}</p></div>
        <div className="tutorial-map-actions">
          <button type="button" className="button secondary" onClick={back}>Back</button>
          <button type="button" className="button secondary" onClick={skip}>Skip step</button>
          <button ref={nextRef} data-tutorial-next="next" type="button" className="button primary" disabled={!satisfied} onClick={next}>Next<ArrowRight size={14} /></button>
          <button type="button" className="icon-button" aria-label="Exit tutorial" onClick={onExit}><X size={18} /></button>
        </div>
      </div>
    </>, host);

  if (dialogHost?.classList.contains('full-roadmap-modal') || focusRoomHost) return createPortal(
    <div ref={panelRef} data-step={step.id} className={`tutorial-panel tutorial-map-guide ${focusRoomHost ? 'tutorial-focus-guide' : ''}`} role="region" aria-label="Tutorial view practice">
      <span>Practice only. Tutorial paused.</span>
      <button type="button" className="button secondary" onClick={() => onCommand('close-dialogs')}>Back to tutorial</button>
      <button type="button" className="icon-button" aria-label="Exit tutorial" onClick={onExit}><X size={18} /></button>
    </div>, host);

  const panel = (
    <>
    <TutorialCue target={nextCue ? nextRef.current : targetElement} panel={panelRef.current} anchorRect={targetRect} panelPosition={movable.position} />
    <div
      ref={panelRef}
      data-step={step.id}
      data-position={movable.position ? 'manual' : 'auto'}
      className={`tutorial-panel ${mobile ? 'tutorial-panel-mobile' : 'tutorial-panel-floating'} ${collapsed ? 'tutorial-collapsed' : ''} ${movable.dragging ? 'tutorial-dragging' : ''}`}
      style={movable.position
        ? { ...movable.position, bottom: 'auto', right: 'auto', width: mobile ? window.innerWidth - 20 : placement.width, maxHeight: placement.maxHeight }
        : mobile
        ? { ...(mobileAboveTarget ? { top: 10, bottom: 'auto' } : {}), maxHeight: collapsed ? undefined : placement.maxHeight }
        : { top: placement.top, left: placement.left, width: placement.width, maxHeight: placement.maxHeight }}
      role="region"
      aria-label={`Tutorial step ${stepIndex + 1} of ${total}: ${step.title}`}
      onKeyDown={(event) => { if (event.key === 'Escape' && !(event.target instanceof HTMLSelectElement)) { event.preventDefault(); event.stopPropagation(); handleEscape(); } }}
    >
      <div className="tutorial-head">
        <div className="tutorial-position-bar">
          <button type="button" className="tutorial-drag-handle" aria-label="Drag to move tutorial window"
            aria-describedby={moveHelpId} aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight Home"
            title="Drag to move. Arrow keys move; Home resets." {...movable.handleProps}>
            <GripHorizontal size={17} /><span>Drag to move</span>
          </button>
          <button type="button" className="tutorial-position-reset" onClick={movable.reset}
            disabled={!movable.position} aria-label="Reset tutorial position" title="Restore automatic positioning">
            <RotateCcw size={13} />Reset position
          </button>
          <span id={moveHelpId} className="sr-only">Drag with a mouse or touch. Arrow keys move this window; Shift moves farther. Home restores automatic positioning. Escape cancels an active drag.</span>
        </div>
        <div className="tutorial-head-main">
        <div className="tutorial-head-text">
          <span className="tutorial-eyebrow">{currentChapter?.title ?? 'Tutorial'} &middot; {stepIndex + 1}/{total}</span>
          {!collapsed && <h2 className="tutorial-title">{step.title}</h2>}
        </div>
        <div className="tutorial-head-actions">
          <button type="button" className="icon-button" aria-label={collapsed ? 'Expand tutorial panel' : 'Collapse tutorial panel'} onClick={() => setCollapsed((value) => !value)}>
            {collapsed ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          <button type="button" className="icon-button" aria-label="Exit tutorial" onClick={onExit}><X size={18} /></button>
        </div>
        </div>
      </div>
      <div className="tutorial-progress-track" aria-hidden="true"><div className="tutorial-progress-fill" style={{ width: `${progressPct}%` }} /></div>
      {!collapsed && (
        <>
          <div className="tutorial-content">
          <label className="tutorial-chapter-nav">Chapter
            <select aria-label="Tutorial chapter" value={step.chapter} onChange={event => jumpToChapter(event.target.value)}>
              {chapters.map(chapter => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}
            </select>
          </label>
          <p className="tutorial-body" aria-live="polite">{step.body}</p>
          {step.kind === 'action' && (
            <p className="tutorial-status" aria-live="polite">
              {satisfied ? 'Done. Click Next to continue.' : 'Try the action above, then Next unlocks.'}
            </p>
          )}
          {step.kind === 'action' && !satisfied && targetElement && <button type="button" className="tutorial-link-button" onClick={focusControl}>Focus highlighted control</button>}
          {targetMissing && !satisfied && (
            <div className="tutorial-missing">
              <p>This step&rsquo;s control isn&rsquo;t visible right now.</p>
              <button type="button" className="button secondary" onClick={showStep}>Show this step</button>
            </div>
          )}
          </div>
          <div className="tutorial-actions">
            <button type="button" className="button secondary" onClick={back} disabled={stepIndex === 0}>
              <ArrowLeft size={14} /> Back
            </button>
            <button type="button" className="button secondary" onClick={skip} disabled={stepIndex === total - 1}>
              <SkipForward size={14} /> Skip step
            </button>
            <button ref={nextRef} data-tutorial-next="next" type="button" className="button primary" onClick={stepIndex === total - 1 ? onExit : next} disabled={!satisfied}>
              {stepIndex === total - 1 ? 'Finish tutorial' : 'Next'} <ArrowRight size={14} />
            </button>
          </div>
          <div className="tutorial-footer-actions">
            <button type="button" className="tutorial-link-button" onClick={onRestart}><RotateCcw size={13} /> Restart tutorial</button>
            <button type="button" className="tutorial-link-button" onClick={onExit}><LogOut size={13} /> Exit to real workspace</button>
          </div>
        </>
      )}
    </div>
    </>
  );

  return createPortal(panel, host);
}

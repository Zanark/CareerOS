import {
  Component, forwardRef, lazy, Suspense, useCallback, useEffect, useId,
  useImperativeHandle, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import type { ReactNode } from 'react';
import { CircleDot, Maximize2, Minimize2, Pause, Play, RotateCcw, X } from 'lucide-react';
import type { AppState } from '../domain/types';
import { buildCareerGraph } from '../graph/careerGraphModel';
import type { CareerGraph } from '../graph/careerGraphModel';
import { DEFAULT_NODE_SPACING, spaceCareerGraph } from '../graph/careerNodeSpacing';
import { focusCareerGraph, getCareerFocusVisibility, type CareerFocusVisibility } from '../graph/careerFocusVisibility';
import type { FocusRoomHandle, FocusSessionController } from './focusTypes';
import { ContextHelp } from '../ContextHelp';
import { FocusPlaylist } from './FocusPlaylist';
import './focus-room.css';

export type { FocusRoomHandle } from './focusTypes';

const CareerGraphScene = lazy(() => import('../graph/CareerGraphScene'));
const ignoreSelection = () => {};
const phaseLabels = { ready: 'Ready when you are', running: 'Focusing', paused: 'Paused', finished: 'Session finished' };

class BackgroundBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFailure(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function clockText(seconds: number): string {
  const remaining = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor(remaining / 60) % 60;
  const tail = `${String(minutes).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return hours ? `${hours}:${tail}` : tail;
}

const FocusRoom = forwardRef<FocusRoomHandle, {
  state: AppState;
  date: string;
  session: FocusSessionController;
  practice: boolean;
}>(function FocusRoom({ state, date, session, practice }, ref) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const routeRef = useRef('');
  const openRef = useRef(false);
  const requestRef = useRef(0);
  const focusFrameRef = useRef(0);
  const lastFullscreenExit = useRef(-Infinity);
  const controlledFullscreenExit = useRef(false);
  const cleanupWarningReported = useRef(false);
  const latest = useRef({ state, practice, date });
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<{ graph: CareerGraph; focus: CareerFocusVisibility } | null>(null);
  const snapshotView = useMemo(() => {
    if (!snapshot) return null;
    const eligible = snapshot.focus.date === date ? snapshot.focus.detailedMissionIds : snapshot.focus.activeMissionIds;
    const graph = focusCareerGraph(snapshot.graph, eligible);
    return { ...graph, orbits: graph.orbits.filter(orbit => orbit.kind === 'mission'
      && orbit.missionId !== undefined && eligible.has(orbit.missionId)) };
  }, [snapshot, date]);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenMessage, setFullscreenMessage] = useState('');
  const [ambientMotion, setAmbientMotion] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [heartbeat, setHeartbeat] = useState(true);
  const [motionOptIn, setMotionOptIn] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [graphics, setGraphics] = useState<'loading' | 'ready' | 'unavailable' | 'lost'>('loading');
  const [acknowledgment, setAcknowledgment] = useState('');
  const [actionError, setActionError] = useState('');

  useLayoutEffect(() => { latest.current = { state, practice, date }; }, [state, practice, date]);
  useEffect(() => {
    if (!session.error && !session.pendingSave) setActionError('');
  }, [session.error, session.pendingSave]);

  const reportFullscreenExitFailure = useCallback(() => {
    controlledFullscreenExit.current = false;
    if (openRef.current) {
      setFullscreenMessage('The browser could not exit fullscreen. Use its fullscreen or Escape control.');
    } else if (!cleanupWarningReported.current) {
      cleanupWarningReported.current = true;
      console.warn('Focus room: fullscreen cleanup could not finish. Use the browser fullscreen control if needed.');
    }
  }, []);

  const leaveFullscreen = useCallback(() => {
    if (document.fullscreenElement !== stageRef.current) return Promise.resolve();
    controlledFullscreenExit.current = true;
    return document.exitFullscreen().catch(reportFullscreenExitFailure);
  }, [reportFullscreenExitFailure]);

  const enterFullscreen = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !openRef.current) return;
    if (document.fullscreenElement === stage) return;
    if (document.fullscreenElement) {
      setFullscreenMessage('Another view is fullscreen. This focus room is using viewport mode.');
      return;
    }
    if (!document.fullscreenEnabled || typeof stage.requestFullscreen !== 'function') {
      setFullscreenMessage('Window-filling mode: browser fullscreen is unavailable.');
      return;
    }
    const request = ++requestRef.current;
    setFullscreenMessage('');
    // Called directly by open()/the button, while user activation is still live.
    const fail = () => {
      if (openRef.current && request === requestRef.current) {
        setFullscreenMessage('Window-filling mode: browser fullscreen was not enabled.');
      }
    };
    try {
      void stage.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        if (!openRef.current && document.fullscreenElement === stage) {
          void document.exitFullscreen().catch(reportFullscreenExitFailure);
        }
      }, fail);
    } catch {
      fail();
    }
  }, [reportFullscreenExitFailure]);

  const closeRoom = useCallback(() => {
    if (!openRef.current) return;
    openRef.current = false;
    const closedRequest = ++requestRef.current;
    const fullscreenExit = leaveFullscreen();
    dialogRef.current?.close();
    setOpen(false);
    setSnapshot(null);
    setAcknowledgment('');
    const opener = openerRef.current;
    const restoreFocus = () => {
      if (!openRef.current && requestRef.current === closedRequest && opener?.isConnected && location.hash === routeRef.current) {
        opener.focus({ preventScroll: true });
      }
    };
    restoreFocus();
    void fullscreenExit.then(() => {
      if (openRef.current || requestRef.current !== closedRequest) return;
      restoreFocus();
      cancelAnimationFrame(focusFrameRef.current);
      focusFrameRef.current = requestAnimationFrame(restoreFocus);
    });
  }, [leaveFullscreen]);

  const openRoom = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    routeRef.current = location.hash;
    const graph = spaceCareerGraph(buildCareerGraph(latest.current.state), DEFAULT_NODE_SPACING);
    setSnapshot({ graph, focus: getCareerFocusVisibility(latest.current.state, latest.current.date) });
    setGraphics('loading');
    setAcknowledgment('');
    setActionError('');
    setFullscreenMessage('');
    dialog.showModal();
    if (centerRef.current) centerRef.current.scrollTop = 0;
    openRef.current = true;
    setOpen(true);
    if (!latest.current.practice) enterFullscreen();
  }, [enterFullscreen]);

  useImperativeHandle(ref, () => ({ open: openRoom, close: closeRoom }), [openRoom, closeRoom]);

  useEffect(() => {
    const stage = stageRef.current;
    openRef.current = dialogRef.current?.open ?? false;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onMotion = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) {
        setAmbientMotion(false);
        setMotionOptIn(false);
      }
    };
    const onFullscreen = () => {
      const owned = document.fullscreenElement === stageRef.current;
      setFullscreen(owned);
      if (!owned) {
        lastFullscreenExit.current = controlledFullscreenExit.current ? -Infinity : performance.now();
        controlledFullscreenExit.current = false;
      }
      if (owned) setFullscreenMessage('');
    };
    const onRoute = () => {
      if (openRef.current && location.hash !== routeRef.current) closeRoom();
    };
    preference.addEventListener('change', onMotion);
    document.addEventListener('fullscreenchange', onFullscreen);
    window.addEventListener('hashchange', onRoute);
    return () => {
      openRef.current = false;
      requestRef.current++;
      cancelAnimationFrame(focusFrameRef.current);
      preference.removeEventListener('change', onMotion);
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.removeEventListener('hashchange', onRoute);
      if (document.fullscreenElement === stage) void document.exitFullscreen().catch(reportFullscreenExitFailure);
    };
  }, [closeRoom, reportFullscreenExitFailure]);

  const onGraphics = useCallback((status: 'ready' | 'unavailable' | 'lost') => setGraphics(status), []);
  const onGraphicsFailure = useCallback(() => setGraphics('unavailable'), []);
  const runAction = (action: () => boolean, success: string, failure: string) => {
    setAcknowledgment('');
    setActionError('');
    if (action()) setAcknowledgment(success);
    else setActionError(failure);
  };
  const error = session.error || actionError || (session.pendingSave ? 'A session change has not been saved yet. Retry saving before continuing.' : '');
  const toggleLabel = session.running ? 'Pause' : session.phase === 'paused' ? 'Continue' : session.phase === 'finished' ? 'Start again' : 'Start';
  const motionActive = open && ambientMotion && (!reducedMotion || motionOptIn);
  const motionDescription = graphics !== 'ready' ? '' : motionActive
    ? ' Gentle motion is on.'
    : reducedMotion && !motionOptIn
      ? ' Reduced motion: off until you enable Ambient motion.'
      : ' Ambient motion is off.';

  return (
    <dialog
      ref={dialogRef} className="focus-room" data-tour="focus-room" aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        if (document.fullscreenElement === stageRef.current) {
          void leaveFullscreen();
          controlledFullscreenExit.current = false;
        }
        else if (performance.now() - lastFullscreenExit.current > 250) closeRoom();
      }}
      onClose={closeRoom}
    >
      <div ref={stageRef} className="focus-room__stage" data-focus-room-stage data-tour="focus-room-stage" data-fullscreen={fullscreen} data-phase={session.phase}>
        <div className="focus-room__background" aria-hidden="true" inert>
          {open && snapshot && snapshotView && (
            <BackgroundBoundary onFailure={onGraphicsFailure}>
              <Suspense fallback={null}>
                <CareerGraphScene graph={snapshotView} framingNodes={snapshot.graph.nodes} activityDate={date} selectedId={null} onSelect={ignoreSelection}
                  autoRotate={motionActive} animate={motionActive} allowReducedMotion={motionOptIn}
                  rimOnly={false} heartbeat={heartbeat} visualProfile="focus" onStatusChange={onGraphics} />
              </Suspense>
            </BackgroundBoundary>
          )}
        </div>
        <header className="focus-room__header">
          <div><h2 id={titleId}>Focus room</h2>{practice && <span className="focus-room__practice">Tutorial practice</span>}</div>
          <div className="focus-room__header-actions">
            <button type="button" className="focus-room__utility" data-tour="focus-room-fullscreen" onClick={fullscreen ? leaveFullscreen : enterFullscreen}
              aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
              {fullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}<span className="focus-room__fullscreen-label">{fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
            </button>
            <button type="button" className="focus-room__utility" data-tour="focus-room-close" onClick={closeRoom} aria-label="Close focus room" autoFocus><X size={18} /><span>Close</span></button>
          </div>
        </header>
        <div ref={centerRef} className="focus-room__center">
          <section className="focus-room__glass" aria-label="Focus timer and self-reported distractions">
            <div className="focus-room__clock">
              <p className="focus-room__phase" role="status" aria-live="polite">{phaseLabels[session.phase]}</p>
              <div className="focus-room__time" data-tour="focus-room-time" data-long-time={session.remaining >= 3600} role="timer" aria-live="off" aria-label={`${Math.max(0, Math.floor(session.remaining / 60))} minutes and ${Math.max(0, Math.ceil(session.remaining) % 60)} seconds remaining`}>
                {clockText(session.remaining)}
              </div>
              <p className="focus-room__duration">{session.duration}-minute focus session</p>
              <div className="focus-room__timer-actions">
                <button type="button" className="focus-room__button focus-room__button--primary" data-tour="focus-room-toggle" disabled={session.pendingSave}
                  onClick={() => runAction(session.toggle, '', 'The timer change could not be saved. Please retry saving.')}>
                  {session.running ? <Pause size={18} /> : <Play size={18} />}{toggleLabel}
                </button>
                <button type="button" className="focus-room__button" disabled={session.pendingSave} title="Reset this timer. Saved session reports are retained."
                  onClick={() => runAction(session.reset, 'Timer reset. Saved reports are retained.', 'The timer could not be reset. Please retry saving.')}>
                  <RotateCcw size={17} />Reset
                </button>
              </div>
            </div>
            <div className="focus-room__report">
              <button type="button" className="focus-room__distraction" data-tour="focus-room-distraction" disabled={!session.canLogDistraction || session.pendingSave}
                onClick={() => runAction(session.logDistraction, 'Distraction saved.', 'That distraction was not saved. Please retry saving.')}>
                <CircleDot size={21} />I got distracted
              </button>
              <div className="focus-room__count" data-tour="focus-room-count" role="status" aria-live="polite" aria-atomic="true">
                <p><strong>{session.distractionCount}</strong> self-reported {session.distractionCount === 1 ? 'distraction' : 'distractions'}</p>
                <span>{session.hasRecordedSession ? session.distractionLabel : 'Start a session to record distractions.'}</span>
                <span className="focus-room__acknowledgment">{!error && acknowledgment ? acknowledgment : '\u00a0'}</span>
              </div>
              {error && <div className="focus-room__error" data-tour="focus-room-error" role="alert">
                <p>{error}</p>
                {session.pendingSave && <button type="button" className="focus-room__button"
                  onClick={() => runAction(session.retrySave, 'Session data saved.', 'Saving did not succeed. Your unsaved change still needs attention.')}>Retry saving</button>}
              </div>}
              <p className="focus-room__record-note">Only your button presses are recorded. Closing this room keeps the timer and reports.</p>
            </div>
            <FocusPlaylist />
          </section>
        </div>
        <footer className="focus-room__footer">
          <div className="focus-room__preferences">
            <label className="focus-room__ambient"><input type="checkbox" data-tour="focus-room-ambient" checked={ambientMotion} onChange={event => {
              setAmbientMotion(event.target.checked);
              setMotionOptIn(event.target.checked && reducedMotion);
            }} />Ambient motion</label>
            <label className="focus-room__ambient" title="A gentle outward-and-back mesh ripple from the white core every 10 seconds. Requires Ambient motion.">
              <input type="checkbox" data-tour="focus-room-heartbeat" checked={heartbeat} onChange={event => setHeartbeat(event.target.checked)} />Core heartbeat
            </label>
            <ContextHelp title="Focus room visuals">A snapshot of saved work, not live AI. Ambient motion and the core ripple are independent of the timer.{motionDescription}</ContextHelp>
          </div>
          {(graphics === 'unavailable' || graphics === 'lost') && <p className="focus-room__notice" role="status">
            {graphics === 'lost' ? '3D connection lost.' : '3D unavailable.'} Timer and reports still work.
          </p>}
          {fullscreenMessage && <p className="focus-room__notice" role="status">{fullscreenMessage}</p>}
        </footer>
      </div>
    </dialog>
  );
});

export default FocusRoom;

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Pause, Play } from 'lucide-react';
import { useDecorativeMotion, useDecorativeVisibility } from '../useDecorativeMotion';
import { createFirePainter } from './firePainter';
import type { FireVariant } from './firePainter';
import './streak-fire.css';

type Draw = (time: number) => void;
interface FireMotion {
  mode: string;
  reduced: boolean;
  available: boolean;
  paused: boolean;
  toggle: () => void;
  register: (draw: Draw) => () => void;
  unavailable: boolean;
  reportUnavailable: () => void;
}
const FireContext = createContext<FireMotion | null>(null);

export function StreakFireProvider({ children }: { children: ReactNode }) {
  const motion = useDecorativeMotion();
  const [dialog, setDialog] = useState(() => !!document.querySelector('dialog[open]'));
  const [unavailable, setUnavailable] = useState(false);
  const painters = useRef(new Set<Draw>());
  const frame = useRef<number | null>(null);
  const enabled = useRef(false);
  const clock = useRef({ previous: 0, drawn: 0, elapsed: 1.4 });
  const tick = useRef<(time: number) => void>(() => {});
  const wake = useCallback(() => {
    if (enabled.current && painters.current.size && frame.current === null) frame.current = requestAnimationFrame(time => tick.current(time));
  }, []);
  tick.current = time => {
    frame.current = null;
    if (!enabled.current || !painters.current.size) return;
    const c = clock.current;
    if (c.previous) c.elapsed += Math.min(50, Math.max(0, time - c.previous)) / 1000;
    c.previous = time;
    const interval = 1000 / (painters.current.size > 3 ? 15 : 24);
    if (time - c.drawn >= interval) {
      for (const paint of painters.current) paint(c.elapsed);
      c.drawn = time;
    }
    wake();
  };
  const register = useCallback((draw: Draw) => {
    painters.current.add(draw);
    wake();
    return () => {
      painters.current.delete(draw);
      if (!painters.current.size && frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
        clock.current.previous = 0;
      }
    };
  }, [wake]);
  useEffect(() => {
    const observer = new MutationObserver(() => setDialog(!!document.querySelector('dialog[open]')));
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    enabled.current = motion.mode === 'live' && !dialog && !unavailable;
    clock.current.previous = 0;
    if (enabled.current) wake();
    else if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    return () => {
      enabled.current = false;
      if (frame.current !== null) { cancelAnimationFrame(frame.current); frame.current = null; }
    };
  }, [motion.mode, dialog, unavailable, wake]);
  const reportUnavailable = useCallback(() => setUnavailable(true), []);
  const value = useMemo(() => ({
    ...motion, mode: dialog ? 'dialog' : motion.mode, register, unavailable, reportUnavailable,
  }), [motion.mode, motion.reduced, motion.available, motion.paused, motion.toggle, dialog, register, unavailable, reportUnavailable]);
  return <FireContext.Provider value={value}>{children}</FireContext.Provider>;
}

export function useStreakFireMotion() {
  const value = useContext(FireContext);
  if (!value) throw new Error('Streak fire requires its motion provider.');
  return value;
}

export function FireMotionButton({ compact = false }: { compact?: boolean }) {
  const motion = useStreakFireMotion();
  const label = motion.paused ? 'Resume streak fire' : 'Pause streak fire';
  return <button type="button" className={compact ? 'icon-button streak-fire-toggle' : 'button secondary'}
    aria-label={label} aria-pressed={motion.paused} disabled={motion.reduced || !motion.available || motion.unavailable}
    title={motion.reduced ? 'Your system requests reduced motion. Fire is shown still.' : !motion.available || motion.unavailable ? 'Fire animation is unavailable; recorded streaks are unchanged.' : label}
    onClick={motion.toggle}>{motion.paused ? <Play size={16} /> : <Pause size={16} />}{!compact && <span>{motion.paused ? 'Resume fire' : 'Pause fire'}</span>}</button>;
}

export function FireAvailabilityNotice() {
  const motion = useStreakFireMotion();
  return motion.unavailable || !motion.available
    ? <div className="alert streak-motion-notice" role="status">Fire animation is unavailable in this browser. Your recorded streaks and history are unchanged.</div>
    : null;
}

export function StreakFire({ burning, variant = 'card' }: { burning: boolean; variant?: FireVariant }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const painter = useRef<Draw | null>(null);
  const motion = useStreakFireMotion();
  const visibility = useDecorativeVisibility(canvas);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    const draw = createFirePainter(node, burning, variant);
    painter.current = draw;
    setReady(!!draw);
    if (!draw) { motion.reportUnavailable(); return; }
    draw(1.4);
    return () => { painter.current = null; };
  }, [burning, variant, motion.reportUnavailable]);
  useEffect(() => {
    if (!ready || !burning || !visibility.visible || motion.mode !== 'live' || motion.unavailable) return;
    return motion.register(time => painter.current?.(time));
  }, [ready, burning, visibility.visible, motion.mode, motion.unavailable, motion.register]);
  const mode = !burning ? 'out' : motion.unavailable ? 'unavailable' : motion.mode !== 'live' ? motion.mode : !visibility.visible ? 'offscreen' : 'live';
  return <canvas ref={canvas} className={`streak-fire streak-fire--${variant}`} aria-hidden="true"
    data-burning={burning} data-fire-motion={mode} data-fire-ready={ready} />;
}

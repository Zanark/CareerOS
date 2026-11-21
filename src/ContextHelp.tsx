import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp, X } from 'lucide-react';
import './context-help.css';

const focusable = 'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';

export function ContextHelp({ title, children, tour }: { title: string; children: ReactNode; tour?: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissed = useRef(false);
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [position, setPosition] = useState<CSSProperties>({ visibility: 'hidden' });

  function clearTimer() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }
  function show() {
    clearTimer();
    if (!dismissed.current) setOpen(true);
  }
  function close(restoreFocus = false) {
    clearTimer();
    dismissed.current = restoreFocus;
    setOpen(false); setPinned(false);
    if (restoreFocus && trigger.current?.isConnected) trigger.current.focus({ preventScroll: true });
  }
  function leave() {
    dismissed.current = false;
    if (pinned) return;
    clearTimer();
    timer.current = setTimeout(() => {
      if (!panel.current?.contains(document.activeElement) && document.activeElement !== trigger.current) close();
    }, 140);
  }

  useEffect(() => () => clearTimer(), []);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); event.stopPropagation();
      close(!!panel.current?.contains(document.activeElement) || document.activeElement === trigger.current);
    };
    const route = () => close();
    const another = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== id) close();
    };
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('keydown', escape, true);
    document.addEventListener('careeros-context-help', another);
    window.addEventListener('hashchange', route);
    document.dispatchEvent(new CustomEvent('careeros-context-help', { detail: id }));
    return () => {
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('keydown', escape, true);
      document.removeEventListener('careeros-context-help', another);
      window.removeEventListener('hashchange', route);
    };
  }, [open, id]);

  useLayoutEffect(() => {
    if (!open) { setPosition({ visibility: 'hidden' }); return; }
    const place = () => {
      if (!trigger.current || !panel.current) return;
      const rect = trigger.current.getBoundingClientRect(), margin = 12, gap = 8;
      const width = Math.min(420, window.innerWidth - margin * 2);
      const available = window.innerHeight - margin * 2;
      const below = Math.max(0, Math.min(available, window.innerHeight - rect.bottom - margin - gap));
      const above = Math.max(0, Math.min(available, rect.top - margin - gap));
      const showBelow = below >= Math.min(panel.current.scrollHeight, 220) || below >= above;
      const maxHeight = showBelow ? below : above;
      // A hover preview must leave its own trigger clickable.
      panel.current.style.maxHeight = `${maxHeight}px`;
      const height = panel.current.getBoundingClientRect().height;
      const top = showBelow ? rect.bottom + gap : rect.top - height - gap;
      setPosition({
        width, maxHeight,
        left: Math.max(margin, Math.min(rect.left, window.innerWidth - width - margin)),
        top: Math.max(margin, Math.min(top, window.innerHeight - height - margin)), visibility: 'visible',
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); observer.disconnect(); };
  }, [open]);
  useLayoutEffect(() => {
    if (open && pinned) panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  }, [open, pinned]);

  const fullscreen = open ? document.fullscreenElement : null;
  const host = open ? fullscreen && trigger.current && fullscreen.contains(trigger.current) ? fullscreen
    : trigger.current?.closest('dialog[open]') ?? document.body : null;
  return <>
    <button ref={trigger} type="button" className="context-help-trigger" aria-label={`About ${title}`}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      data-tour={tour} data-context-help-open={open ? 'true' : undefined}
      onPointerEnter={event => { if (event.pointerType !== 'touch') show(); }}
      onPointerLeave={leave} onFocus={show} onBlur={event => {
        if (!pinned && !(event.relatedTarget instanceof Node && panel.current?.contains(event.relatedTarget))) close();
        dismissed.current = false;
      }}
      onClick={() => {
        if (pinned) close(true);
        else { dismissed.current = false; clearTimer(); setOpen(true); setPinned(true); }
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'Tab' && !event.shiftKey && open) {
          event.preventDefault(); dismissed.current = false; setOpen(true); setPinned(true);
        }
      }}><CircleHelp size={17} aria-hidden="true" /></button>
    {open && host && createPortal(<div ref={panel} id={id} role="dialog" aria-modal="false"
      aria-labelledby={`${id}-title`} aria-describedby={`${id}-content`} className="context-help-panel" style={position}
      onPointerEnter={clearTimer} onPointerLeave={leave}
      onBlur={event => {
        if (!(event.relatedTarget instanceof Node && (panel.current?.contains(event.relatedTarget) || trigger.current?.contains(event.relatedTarget)))) close();
      }}
      onKeyDown={event => {
        if (event.key !== 'Tab' || !panel.current) return;
        const controls = [...panel.current.querySelectorAll<HTMLElement>(focusable)].filter(element => element.getClientRects().length);
        if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); close(true); }
        else if (!event.shiftKey && document.activeElement === controls.at(-1)) {
          dismissed.current = true; trigger.current?.focus({ preventScroll: true }); setOpen(false); setPinned(false);
        }
      }}>
      <div className="context-help-heading"><strong id={`${id}-title`}>{title}</strong>
        <button type="button" className="icon-button" aria-label={`Close ${title} help`} onClick={() => close(true)}><X size={17} /></button></div>
      <div id={`${id}-content`} className="context-help-content">{children}</div>
    </div>, host)}
  </>;
}

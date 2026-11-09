import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowUpRight, Award, Blocks, BookOpen, BrainCircuit, BriefcaseBusiness, Check, Code2, Compass,
  FileText, Layers3, Network, Rocket, Sparkles, Trophy, X,
} from 'lucide-react';
import type { EvidenceKind, Mission } from './domain/types';
import { missionAccentStyle } from './missionVisuals';

export function MissionIcon({ mission, size = 20 }: { mission: Mission; size?: number }) {
  const Icon = { code: Code2, layers: Layers3, rocket: Rocket, network: Network, compass: Compass, award: Award, cpu: BrainCircuit, trophy: Trophy, briefcase: BriefcaseBusiness }[mission.icon] ?? Blocks;
  return <span className={`mission-icon ${mission.color}`} style={missionAccentStyle(mission.id)}><Icon size={size} strokeWidth={1.7} /></span>;
}

export function Star({ className = '' }: { className?: string }) {
  return <svg className={className} width="32" height="32" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="m24 2 6.3 15.7L46 24l-15.7 6.3L24 46l-6.3-15.7L2 24l15.7-6.3L24 2Z" fill="currentColor" /><circle cx="24" cy="24" r="4" fill="var(--forest)" /></svg>;
}

export function OrbitArt() {
  return <svg className="orbit-art" viewBox="0 0 380 270" fill="none" aria-hidden="true">
    <g stroke="var(--dsf-hero-muted)" strokeOpacity=".35">
      <ellipse cx="214" cy="145" rx="131" ry="73" transform="rotate(-35 214 145)" />
      <ellipse cx="214" cy="145" rx="103" ry="56" transform="rotate(-35 214 145)" />
      <circle cx="214" cy="145" r="103" strokeDasharray="2 7" />
      <path d="M62 219 354 45M89 66l250 158M214 19v239" strokeDasharray="3 6" />
    </g>
    <path d="m214 108 10.5 26.5L251 145l-26.5 10.5L214 182l-10.5-26.5L177 145l26.5-10.5L214 108Z" fill="var(--dsf-hero-accent)" />
    <circle cx="214" cy="145" r="7" fill="var(--dsf-hero-bg)" />
    <circle cx="113" cy="198" r="7" fill="var(--dsf-hero-accent)" /><circle cx="319" cy="90" r="5" fill="var(--dsf-hero-muted)" />
    <circle cx="157" cy="59" r="3" fill="var(--dsf-hero-muted)" /><circle cx="295" cy="212" r="3" fill="var(--dsf-hero-muted)" />
    <path d="M104 224h42M311 64h30" stroke="var(--dsf-hero-muted)" strokeOpacity=".6" />
    <text x="103" y="239" fill="var(--dsf-hero-muted)" fontSize="0.5625rem" fontFamily="monospace" letterSpacing="2">YOU ARE HERE</text>
    <text x="276" y="52" fill="var(--dsf-hero-muted)" fontSize="0.5625rem" fontFamily="monospace" letterSpacing="2">WHAT'S NEXT</text>
  </svg>;
}

export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function SectionTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return <div className="section-title"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>{children}</div>;
}

export function PageHeading({ eyebrow, title, description, children, titleAction }: { eyebrow: string; title: string; description: string; children?: ReactNode; titleAction?: ReactNode }) {
  return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span>{titleAction ? <div className="page-title-row"><h1>{title}</h1>{titleAction}</div> : <h1>{title}</h1>}<p>{description}</p></div>{children}</div>;
}

export function Empty({ title, children, icon = 'sparkles' }: { title: string; children: ReactNode; icon?: string }) {
  const Icon = icon === 'book' ? BookOpen : icon === 'file' ? FileText : Sparkles;
  return <div className="empty"><span className="empty-icon"><Icon size={24} strokeWidth={1.5} /></span><h3>{title}</h3><p>{children}</p></div>;
}

export function Progress({ value, label }: { value: number; label: string }) {
  return <div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}><div style={{ '--progress': `${value}%` } as CSSProperties} /></div>;
}

export function Modal({ title, subtitle, children, onClose, wide = false, className = '', eyebrow = 'YOUR WORK, MADE VISIBLE', restoreFocus = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean; className?: string; eyebrow?: string; restoreFocus?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement;
    const route = location.hash;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (restoreFocus && location.hash === route && opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true });
    };
  }, [restoreFocus]);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''} ${className}`} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="modal-header"><div><span className="eyebrow">{eyebrow}</span><h2 id="dialog-title">{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" data-tour="dialog-close" onClick={onClose} aria-label="Close dialog"><X size={20} /></button></div>
    {children}
  </dialog>;
}

export const kindLabels: Record<EvidenceKind, string> = { code: 'Code', diagram: 'Architecture diagram', explanation: 'Explanation from memory', exercise: 'Practice exercise', project: 'Project change', application: 'Application', interview: 'Interview', note: 'Note' };
export const statusLabels = { 'not-started': 'Ready to start', 'in-progress': 'In progress', completed: 'Completed' };

export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer noopener" className="text-link">{children}<ArrowUpRight size={15} /></a>;
}

export function Checkmark({ checked }: { checked: boolean }) {
  return <span className={`checkmark ${checked ? 'checked' : ''}`}>{checked && <Check size={14} strokeWidth={2.5} />}</span>;
}

import { useId, useState } from 'react';
import { ArrowRight, Play, Sparkles } from 'lucide-react';
import type { DiscoverySnapshot } from './model';
import { getWayfinderProgress } from './model';
import './wayfinder.css';

export function WayfinderArt({ level, decorative = false }: { level: number; decorative?: boolean }) {
  const id = useId();
  return <svg className="wayfinder-art" viewBox="0 0 260 290" fill="none" role={decorative ? undefined : 'img'}
    aria-hidden={decorative || undefined} aria-label={decorative ? undefined : `Your original fictional Wayfinder character, collection level ${level}. Equipment evolves with recorded discoveries, not measured ability.`} data-character-level={level}>
    <defs>
      <linearGradient id={`${id}-shell`} x1="65" y1="31" x2="187" y2="157" gradientUnits="userSpaceOnUse"><stop stopColor="#b9d1c2" /><stop offset=".45" stopColor="#518e88" /><stop offset="1" stopColor="#1c5057" /></linearGradient>
      <linearGradient id={`${id}-glass`} x1="92" y1="52" x2="160" y2="114" gradientUnits="userSpaceOnUse"><stop stopColor="#15454f" /><stop offset=".65" stopColor="#05242e" /><stop offset="1" stopColor="#00151c" /></linearGradient>
      <linearGradient id={`${id}-coat`} x1="57" y1="147" x2="194" y2="250" gradientUnits="userSpaceOnUse"><stop stopColor="#306e6e" /><stop offset="1" stopColor="#082f3b" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="69" y1="96" x2="172" y2="165" gradientUnits="userSpaceOnUse"><stop stopColor="#f3ddb0" /><stop offset=".5" stopColor="#d2ae63" /><stop offset="1" stopColor="#987337" /></linearGradient>
    </defs>
    <ellipse cx="130" cy="266" rx="74" ry="12" fill="#000f13" opacity=".55" />
    <ellipse cx="130" cy="265" rx="54" ry="5" stroke="#799e95" strokeOpacity=".25" />
    <g className="wayfinder-arrival"><g className="wayfinder-character">
      {level >= 4 && <g className="wayfinder-cloak"><path d="M92 124c-18 17-28 41-35 104l30-8 43 24 48-21 25 6c-7-60-20-88-39-105Z" fill={`url(#${id}-coat)`} stroke="#8bb4a4" strokeWidth="1.5" /><path d="m74 164-8 49 22-4 42 21 47-20 15 5-12-52M91 143l-3 66m43-62v83m34-86 12 66" stroke="#6b9c8d" strokeOpacity=".6" strokeWidth="1.4" />{level >= 7 && <path d="m78 182 11 4 41 22 45-22 8-3M73 198l15 4 42 23 48-22 9-4" stroke="#d6b66e" strokeWidth="2" />}</g>}
      {level >= 3 && <g><rect x="69" y="126" width="30" height="70" rx="11" fill="#8a9275" stroke="#d1c59b" strokeWidth="1.5" /><path d="M73 144h21m-21 24h21" stroke="#b9bb91" strokeWidth="3" /><rect x="65" y="132" width="9" height="46" rx="4" fill="#173f45" stroke="#b8b68c" /><path d="M81 125v-8c0-7 11-7 11 0v9" stroke="#b3bf9e" strokeWidth="3" /></g>}
      <path d="m104 202-3 43 23 1 4-40m8-1 3 40 22-1-3-44" fill="#41676a" stroke="#90b0a3" strokeWidth="1.5" />
      <path d="M97 238c7-4 18-3 26 1v14H95v-7Zm42 1c8-4 18-4 25 0l6 8v6h-31Z" fill="#0b2d38" stroke="#91aaa0" strokeWidth="1.5" /><path d="M97 251h26m18 0h27" stroke="#d6b66e" strokeWidth="2" />
      <path d="M97 129c-8 2-17 13-21 28l-6 28 14 7 11-25 7-20m61-16c11 4 17 13 19 25l5 23-14 8-10-25-7-16" fill="#6b9990" stroke="#b1c8b3" strokeWidth="1.5" />
      <path d="m70 183-3 10c-1 7 9 10 14 4l5-8m87-12 5 12c4 7 15 2 13-5l-4-10" fill="#b9be9d" stroke="#d6d4ad" strokeWidth="1.5" />
      <path d="M101 127c13-6 42-7 57 1l14 28-7 52c-19 9-45 9-66-1l-9-50Z" fill={`url(#${id}-shell)`} stroke="#b9d1ba" strokeWidth="1.5" /><path d="m99 172 66 1m-56-42-9 24m53-24 10 25" stroke="#d9ddbc" strokeOpacity=".6" strokeWidth="2" />
      <rect x="106" y="159" width="51" height="33" rx="8" fill="#0e3540" stroke="#adc2a4" strokeWidth="1.5" />
      <path d="m118 175 6-7 6 7-6 7Z" fill="#d6b66e" /><path d="M137 169h10m-10 6h7m-7 6h10" stroke="#91c5b3" strokeWidth="2" strokeLinecap="round" />
      {level >= 2 && <g><path d="M92 117c15 10 49 10 73-1l2 18c-24 12-55 12-75-1Z" fill={`url(#${id}-gold)`} stroke="#e6c78a" /><path d="m99 132-9 35 14-7 8 9 5-31" fill="#c69a55" stroke="#f0cf93" /><path d="m101 142-4 12m12-15-3 17" stroke="#f1d7a3" strokeOpacity=".65" /></g>}
      <path d="M87 52C94 24 158 24 175 51l7 45c-9 28-91 35-107 2Z" fill={`url(#${id}-shell)`} stroke="#d7ddbe" strokeWidth="2" />
      <path d="M83 64c8-32 81-38 94-4" stroke="#edf0d3" strokeOpacity=".65" strokeWidth="3" strokeLinecap="round" />
      <path d="M91 66c11-18 58-23 74-8l7 28c-10 24-64 28-82 8Z" fill={`url(#${id}-glass)`} stroke="#a9c5b8" strokeWidth="2" />
      <path d="m99 64 13-7m-16 17 26-14" stroke="#d6efdc" strokeOpacity=".22" strokeWidth="3" strokeLinecap="round" />
      <g className="wayfinder-eyes" fill="#ccf3df"><rect x="108" y="76" width="9" height="14" rx="4.5" /><rect x="143" y="74" width="9" height="14" rx="4.5" /></g>
      <path d="M125 94c4 3 8 3 12-1" stroke="#8abdb4" strokeWidth="2" strokeLinecap="round" />
      <path d="m130 34 1-15" stroke="#a5c2ac" strokeWidth="4" /><circle cx="131" cy="16" r="6" fill={level >= 5 ? '#e5c478' : '#68a99d'} stroke="#d5ddbc" strokeWidth="1.5" />
      <rect x="72" y="70" width="11" height="25" rx="5" fill="#315c62" stroke="#c1cbb0" /><rect x="177" y="67" width="11" height="25" rx="5" fill="#315c62" stroke="#c1cbb0" />
      {level >= 5 && <g><path d="m180 178 1-34" stroke="#d5c38b" strokeWidth="3" /><path d="m181 143 13-8 12 8v24l-12 8-13-8Z" fill="#133b44" stroke="#e1c47b" strokeWidth="1.5" /><path d="m194 142 2.5 9.5L202 155l-5.5 3.5L194 168l-2.5-9.5L186 155l5.5-3.5Z" fill="#edcf87" /><path d="M184 138v-6c0-10 20-10 20 0v6" stroke="#c7b173" strokeWidth="2" /></g>}
      {level >= 6 && <g><path d="m47 110 24 7 7 36-25-8Z" fill="#c7d7bd" stroke="#e5dfbb" /><path d="m52 119 11 3 5 20-10-3-1-10 11 3M59 120l3 8" stroke="#4e7e79" strokeWidth="1.5" /><path d="m58 150 3 9m-17-47-5-4m34-1 4-7" stroke="#b6bc91" strokeWidth="1.5" /></g>}
      {level >= 7 && <g><path d="m96 40-3-21 20 11 17-17 17 17 18-12-2 23" fill="#9d824a" stroke="#ead59c" strokeWidth="2" /><path d="M102 39c19-7 37-8 55-1" stroke="#f3d9a1" strokeWidth="2" /><circle cx="130" cy="26" r="3" fill="#f3e8c1" /></g>}
      <path d="m123 207 8 4 8-4v12l-8 5-8-5Z" fill="#172f38" stroke="#d6b66e" /><text x="131" y="219" textAnchor="middle" fill="#eddbb0" fontSize="9" fontFamily="Consolas, monospace">{level}</text>
    </g></g>
    <g className="wayfinder-sparks" stroke="#d6b66e" strokeWidth="1.5" strokeLinecap="round"><path d="M53 62v9m-4-4.5h8M209 92v11m-5.5-5.5h11M44 210v7m-3.5-3.5h7" /><circle cx="200" cy="214" r="2" fill="#93b9a6" stroke="none" /><circle cx="67" cy="29" r="2" fill="#d6b66e" stroke="none" /></g>
  </svg>;
}

export function Wayfinder({ snapshot }: { snapshot: DiscoverySnapshot }) {
  const progress = getWayfinderProgress(snapshot.earned);
  const [replay, setReplay] = useState(0);
  return <section className="wayfinder-panel" data-tour="wayfinder-panel" data-level={progress.level} data-replay-count={replay}>
    <div className="wayfinder-scene"><span className="wayfinder-scene-label">YOUR WAYFINDER</span><WayfinderArt key={`${progress.level}-${replay}`} level={progress.level} /><span className="wayfinder-scene-coordinates">COLLECTION 01 / {String(snapshot.earned).padStart(2, '0')} SIGNALS</span></div>
    <div className="wayfinder-copy"><span className="eyebrow"><Sparkles size={13} />AN EXPLORER, NOT AN EVALUATION</span>
      <div className="wayfinder-heading"><span className="wayfinder-level"><small>LV</small>{String(progress.level).padStart(2, '0')}</span><div><h2>{progress.title}</h2><p>Your character grows with the collection.</p></div></div>
      <p className="wayfinder-description">{progress.description}</p>
      <div className="wayfinder-progress-copy"><strong>{progress.nextAt === null ? 'Every form discovered.' : `${progress.remaining} more ${progress.remaining === 1 ? 'discovery' : 'discoveries'} to the next form`}</strong><span>{snapshot.earned}/{snapshot.total}</span></div>
      <div className="wayfinder-progress" role="progressbar" aria-label="Wayfinder progress to next collection level" aria-valuenow={snapshot.earned} aria-valuemin={progress.nextAt === null ? 0 : progress.startsAt} aria-valuemax={progress.nextAt ?? snapshot.total}><i style={{ width: `${progress.percent}%` }} /></div>
      <div className="wayfinder-actions"><button data-tour="wayfinder-replay" onClick={() => setReplay(count => count + 1)}><Play size={13} />Replay arrival</button><span>Looking and replaying never add progress.<ArrowRight size={12} /></span></div>
      <p className="wayfinder-boundary">Level {progress.level} belongs to this fictional character, not your career, seniority or readiness. Equipment reflects discoveries in the records you currently hold. Reduced motion keeps the character still.</p>
    </div>
  </section>;
}

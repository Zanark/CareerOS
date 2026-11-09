import {
  BrainCircuit, Code2, Flag, FlaskConical, Footprints, Layers3, LockKeyhole,
  MessageSquareText, MoonStar, Network, Orbit, RotateCcw, ScanEye, Sunrise, Telescope,
} from 'lucide-react';
import type { Discovery } from './model';

const icons = {
  recorded: Footprints, code: Code2, diagram: Network, explanation: MessageSquareText,
  exercise: FlaskConical, project: Layers3, lenses: ScanEye, completed: Flag,
  reviewed: RotateCcw, independent: BrainCircuit, delayed: MoonStar,
  spaced: Orbit, longSpaced: Telescope, days: Sunrise,
};

export function DiscoverySeal({ discovery, index, revealed = false }: { discovery: Discovery; index: number; revealed?: boolean }) {
  const earned = !!discovery.earnedAt;
  const Icon = earned || revealed ? icons[discovery.metric] : LockKeyhole;
  return <svg className={`discovery-seal ${discovery.track}${earned ? ' earned' : ''}`} viewBox="0 0 112 120" fill="none" aria-hidden="true">
    <path className="seal-shadow" d="m56 9 44 25v53l-44 25-44-25V34Z" />
    <path className="seal-edge" d="m56 3 44 25v53l-44 25-44-25V28Z" />
    <path className="seal-face" d="m56 11 37 21v45L56 98 19 77V32Z" />
    <path className="seal-inlay" d="m56 20 29 17v34L56 88 27 71V37Z" />
    <path className="seal-engraving" d="M19 32 56 53l37-21M56 53v45M12 28l7 4m74 0 7-4M56 3v8" />
    <circle className="seal-halo" cx="56" cy="54" r="23" />
    <Icon x={40} y={38} width={32} height={32} strokeWidth={1.5} className="seal-symbol" />
    {Array.from({ length: index % 6 + 1 }, (_, tick) => <path key={tick} className="seal-tick" d={`M${42 + tick * 5} 105v5`} />)}
    {earned && <><path className="seal-glint" d="m88 12 2.5 6.5L97 21l-6.5 2.5L88 30l-2.5-6.5L79 21l6.5-2.5Z" /><circle className="seal-pin" cx="19" cy="78" r="3" /></>}
  </svg>;
}

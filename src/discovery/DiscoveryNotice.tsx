import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Gem, X } from 'lucide-react';
import type { DiscoverySnapshot } from './model';
import { getWayfinderProgress } from './model';
import { WayfinderArt } from './WayfinderArt';

export function DiscoveryNotice({ snapshot, onViewLevelUp }: { snapshot: DiscoverySnapshot; onViewLevelUp: (from: number, to: number) => void }) {
  const previous = useRef(new Set(snapshot.discoveries.filter(item => item.earnedAt).map(item => item.id)));
  const [notice, setNotice] = useState<{ ids: string[]; title: string; level: number; levelUp: boolean; from: number; to: number } | null>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const earned = snapshot.discoveries.filter(item => item.earnedAt);
    const fresh = earned.filter(item => !previous.current.has(item.id));
    const from = previous.current.size;
    const oldLevel = getWayfinderProgress(from).level;
    const progress = getWayfinderProgress(earned.length);
    previous.current = new Set(earned.map(item => item.id));
    if (fresh.length) setNotice({ ids: fresh.map(item => item.id), title: fresh[0].title, level: progress.level, levelUp: progress.level > oldLevel, from, to: earned.length });
    else setNotice(current => current && current.to <= earned.length && current.ids.every(id => previous.current.has(id)) ? current : null);
  }, [snapshot]);
  useEffect(() => {
    if (!notice || hovered || focused) return;
    const timer = window.setTimeout(() => setNotice(null), 6500);
    return () => window.clearTimeout(timer);
  }, [notice, hovered, focused]);
  useEffect(() => {
    if (!notice) { setHovered(false); setFocused(false); }
  }, [notice]);
  if (!notice) return null;
  return <aside className="discovery-notice" aria-label="Discovery notification" data-tour="discovery-notice" data-level-up={notice.levelUp}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    {notice.levelUp ? <WayfinderArt level={notice.level} decorative /> : <span className="discovery-notice-icon"><Gem size={24} /></span>}<div><div role="status"><small>{notice.ids.length === 1 ? 'DISCOVERY UNLOCKED' : `${notice.ids.length} DISCOVERIES UNLOCKED`}</small><strong>{notice.title}</strong>{notice.levelUp && <span className="wayfinder-notice-level">COLLECTION LEVEL {getWayfinderProgress(notice.from).level} → {notice.level} · +{(notice.to - notice.from) * 100} EXP</span>}</div><div className="wayfinder-notice-actions">{notice.levelUp && <button onClick={() => { onViewLevelUp(notice.from, notice.to); setNotice(null); }}>View level-up</button>}<a href="#/discoveries" onClick={() => setNotice(null)}>Visit your atlas<ArrowUpRight size={13} /></a></div></div>
    <button className="icon-button" aria-label="Dismiss discovery" onClick={() => setNotice(null)}><X size={15} /></button>
  </aside>;
}

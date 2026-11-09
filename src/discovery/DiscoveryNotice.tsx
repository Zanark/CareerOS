import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Gem, X } from 'lucide-react';
import type { DiscoverySnapshot } from './model';
import { getWayfinderProgress } from './model';
import { WayfinderArt } from './Wayfinder';

export function DiscoveryNotice({ snapshot }: { snapshot: DiscoverySnapshot }) {
  const previous = useRef(new Set(snapshot.discoveries.filter(item => item.earnedAt).map(item => item.id)));
  const [notice, setNotice] = useState<{ ids: string[]; title: string; level: number; levelUp: boolean } | null>(null);
  useEffect(() => {
    const earned = snapshot.discoveries.filter(item => item.earnedAt);
    const fresh = earned.filter(item => !previous.current.has(item.id));
    const oldLevel = getWayfinderProgress(previous.current.size).level;
    const progress = getWayfinderProgress(earned.length);
    previous.current = new Set(earned.map(item => item.id));
    if (fresh.length) setNotice({ ids: fresh.map(item => item.id), title: fresh[0].title, level: progress.level, levelUp: progress.level > oldLevel });
    else setNotice(current => current && current.ids.some(id => previous.current.has(id)) ? current : null);
  }, [snapshot]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 6500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  if (!notice) return null;
  return <aside className="discovery-notice" aria-label="Discovery notification" data-tour="discovery-notice" data-level-up={notice.levelUp}>
    {notice.levelUp ? <WayfinderArt level={notice.level} decorative /> : <span className="discovery-notice-icon"><Gem size={24} /></span>}<div role="status"><small>{notice.ids.length === 1 ? 'DISCOVERY UNLOCKED' : `${notice.ids.length} DISCOVERIES UNLOCKED`}</small><strong>{notice.title}</strong>{notice.levelUp && <span className="wayfinder-notice-level">WAYFINDER LEVEL UP · {notice.level}</span>}<a href="#/discoveries" onClick={() => setNotice(null)}>Visit your atlas<ArrowUpRight size={13} /></a></div>
    <button className="icon-button" aria-label="Dismiss discovery" onClick={() => setNotice(null)}><X size={15} /></button>
  </aside>;
}

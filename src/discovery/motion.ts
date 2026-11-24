import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function useAtlasMotion() {
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [foreground, setForeground] = useState(() => !document.hidden);
  const available = typeof IntersectionObserver !== 'undefined';

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReduced(preference.matches);
    const updateVisibility = () => setForeground(!document.hidden);
    preference.addEventListener('change', updatePreference);
    document.addEventListener('visibilitychange', updateVisibility);
    updatePreference();
    updateVisibility();
    return () => {
      preference.removeEventListener('change', updatePreference);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  const mode = reduced ? 'reduced' : !available ? 'unavailable' : paused ? 'paused' : foreground ? 'live' : 'hidden';
  return { mode, reduced, available, paused, toggle: () => setPaused(current => !current) };
}

export function useAtlasVisibility(ref: RefObject<HTMLElement | null>) {
  const [visibility, setVisibility] = useState({ visible: false, entered: false });
  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    let active = true;
    const observer = new IntersectionObserver(entries => {
      if (!active) return;
      const visible = entries.some(entry => entry.isIntersecting);
      setVisibility(current => current.visible === visible ? current : { visible, entered: current.entered || visible });
    });
    observer.observe(node);
    return () => { active = false; observer.disconnect(); };
  }, [ref]);
  return visibility;
}

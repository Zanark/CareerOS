import { lazy, Suspense } from 'react';
import type { CSSProperties } from 'react';
import { wayfinderStages } from './model';

const WayfinderViewer = lazy(async () => ({ default: (await import('./WayfinderViewer')).WayfinderViewer }));

const coats = [
  'M24 28h17v4h3v19h-4v7H22v-6h-3V34h5Z',
  'M25 29h15v3h5v15h-5v7H24v-6h-5V34h6Z',
  'M23 28h19v5h5v25H18V36h5Z',
  'M24 29h16v3h6v19h-6v8H23v-7h-5V34h6Z',
  'M22 28h21v5h5v9h-5v16H18V39h4Z',
  'M24 29h17v5h4v13h-5v10H24v-9h-5V34h5Z',
  'M22 27h21v6h6v11h-5v17H17V36h5Z',
];
const colors = ['#497c79', '#547f78', '#537b98', '#337b8d', '#6772a4', '#7b6ba3', '#b08a51'];

/** Original integer-grid artwork; the seven silhouettes and props are authored separately. */
export function WayfinderArt({ level, decorative = false }: { level: number; decorative?: boolean }) {
  const stage = wayfinderStages[level - 1];
  if (!stage) throw new Error('Unknown Wayfinder art level.');
  return <svg className="wayfinder-art" viewBox="0 0 64 72" shapeRendering="crispEdges"
    role={decorative ? undefined : 'img'} aria-hidden={decorative || undefined}
    aria-label={decorative ? undefined : `Wayfinder level ${level}: ${stage.form}, carrying ${stage.relic}. Original fictional pixel character.`}
    data-character-level={level} data-outfit={stage.effect}>
    <g className="wayfinder-sprite">
      {level === 6 && <g className="wayfinder-wings" stroke="#111f32" strokeWidth="2">
        <path d="M31 9 3 14v6H0v11l17-4 14-13Z" fill="#aaa1d8" /><path d="m33 9 27 5v6h4v11l-18-4-13-13Z" fill="#69b5d1" />
        <path d="m7 19 23-8-13 13Zm50 0-23-8 12 13Z" fill="#eee8d5" stroke="none" />
      </g>}
      <path d="M25 49h8v15h-3v3h-9v-5h4Zm10 0h8v13h4v5H35Z" fill="#0b2635" stroke="#071a25" strokeWidth="2" />
      <path d={coats[level - 1]} fill={colors[level - 1]} stroke="#071a25" strokeWidth="2" data-coat-path={level} />
      <path d="M25 33h6v17h-7v-9h-3v-6h4Zm12 0h4v17h-4Z" fill="#93b9a6" opacity=".55" />
      <path d="M25 51h16v4H25Z" fill="#172f3b" /><path d="M31 51h5v4h-5Z" fill="#d6b66e" />
      {level === 3 && <><path d="M20 34h6v21h-6v4h-5v-9h3V36h2Zm20-1h4v22h5v4H38Z" fill="#9b986f" /><path d="M28 34h3v15h-3Zm6 0h3v15h-3Z" fill="#d9c99c" /></>}
      {level === 4 && <><path d="M20 32h6v9h-9v-7h3Zm19 0h7v3h3v8H39Z" fill="#adc4b0" /><path d="M26 35h13v13H26Z" fill="#173c4b" /><path d="M29 38h7v6h-7Z" fill="#69b5d1" /><path d="M21 63h10v4H17v-2h4Zm15 0h11v2h4v2H36Z" fill="#76a5a1" /></>}
      {level === 5 && <><path d="M19 30h8v5h11v-5h8v8h-7v19h-6V39h-6v18h-6V39h-4v-7h2Z" fill="#aaa1d8" /><path d="M26 31h13v4H26Z" fill="#e1c385" /></>}
      {level === 7 && <><path d="M21 29h7v8h-7v19h-4V36h4Zm17 0h6v8h5v7h-6v15h-7V37h2Z" fill="#e0c58c" /><path d="M25 42h5v15h-5Zm10 0h5v15h-5Z" fill="#bcb5df" /><path d="M17 58h27v4H17Z" fill="#e0c58c" /></>}
      <path d="M25 10h14v3h4v5h3v14H20V18h2v-5h3Z" fill={level === 4 ? '#82b3b1' : colors[level - 1]} stroke="#071a25" strokeWidth="2" />
      <path d="M26 14h12v3h4v13H23V18h3Z" fill="#122d3a" />
      <path d="M28 21h3v3h-3Zm8 0h3v3h-3Z" fill="#eee8d5" />
      <path d="M25 12h13v2H25Z" fill="#b4cec0" opacity=".8" />
      {level === 2 && <><path d="M20 29h25v5H20Zm20 3h7v4h8v4H44v-3h-4Z" fill="#d6b66e" /><path d="M41 38h7v4h5v3h-9v-4h-3Z" fill="#af8044" /></>}
      {level === 3 && <path d="M22 29h21v5H22Zm0 5h6v11h-4v6h-4V40h2Z" fill="#d99383" />}
      {level === 4 && <><path d="M20 16h26v4H20Zm0 12h26v5H20Z" fill="#bad5c4" /><path d="M23 20h19v8H23Z" fill="#23536a" /><path d="M27 21h3v3h-3Zm9 0h3v3h-3Z" fill="#d5f0d7" /><path d="M18 20h4v10h-4Zm25 0h5v10h-5Z" fill="#d6b66e" /></>}
      {level === 5 && <path d="M24 9h15v4h4v4H21v-4h3Zm2 19h14v4H26Z" fill="#d5c49c" />}
      {level === 6 && <><path d="M21 16h24v4H21Z" fill="#d6b66e" /><path d="M24 19h9v5h-9Zm12 0h8v5h-8Z" fill="#84c2d1" /><path d="M15 30h9v5h-5v5h-6v-8h2Zm25 0h9v4h4v6h-6v-5h-7Z" fill="#92afa9" /></>}
      {level === 7 && <><path d="M23 12V3h5v5h3V0h5v8h4V3h5v11H23Z" fill="#e4c67f" stroke="#071a25" strokeWidth="2" /><path d="M31 8h5v5h-5Z" fill="#aaa1d8" /></>}
      {level !== 6 && <><path d="M20 36h5v14h-6v-3h-3v-7h4Z" fill={colors[level - 1]} stroke="#071a25" strokeWidth="2" /><path d="M18 46h6v5h-6Z" fill="#d6c6a0" /></>}
      {level === 1 && <><path d="M39 36h7v15h-6Z" fill="#568b83" stroke="#071a25" strokeWidth="2" /><path d="M43 48h6v5h-6Z" fill="#d6c6a0" /><path d="M43 44h11v9H43Z" fill="#dfce9e" /><path d="M46 46h5v2h-5Z" fill="#7a8d7b" /></>}
      {level === 2 && <><path d="M40 36h7v5h8v6H44v-4h-4Z" fill="#749b91" stroke="#071a25" strokeWidth="2" /><path d="M49 32h9v3h3v9h-3v3h-9v-3h-3v-9h3Z" fill="#d6b66e" stroke="#172c37" strokeWidth="2" /><path d="M52 34h3v9h-3Zm-3 3h9v3h-9Z" fill="#eee8d5" /><path d="M52 37h3v3h-3Z" fill="#cb4b16" /></>}
      {level === 3 && <g className="wayfinder-held-map"><path d="M35 37h23v18H35Z" fill="#e0d5aa" stroke="#122d3a" strokeWidth="2" /><path d="M37 39h5v4h6v-2h6v3h-4v6h5v2H39v-7h-2Z" fill="#779c8b" /><path d="M41 44h4v3h5v3" fill="none" stroke="#b37c48" strokeWidth="2" /><path d="M33 36h4v20h-4Zm23 0h4v20h-4Z" fill="#b2a57f" /></g>}
      {level === 4 && <><path d="M42 35h7v7h6v7H44v-8h-2Z" fill="#82b3b1" stroke="#071a25" strokeWidth="2" /><path d="M51 34h5v3h4v8h-4v5h-5v-5h-4v-8h4Z" fill="#69b5d1" stroke="#153345" strokeWidth="2" /><path d="M52 37h3v9h-3Z" fill="#d7eee4" /></>}
      {level === 5 && <g className="wayfinder-lantern"><path d="M48 18h3v44h-3Z" fill="#a88a53" stroke="#112734" strokeWidth="2" /><path d="M43 20h13v3h3v17H40V23h3Z" fill="#d6b66e" stroke="#112734" strokeWidth="2" /><path d="M44 25h11v11H44Z" fill="#e9b65f" /><path d="M48 23h3v15h-3Z" fill="#fff0b9" /><path d="M41 39h17v4H41Z" fill="#d6b66e" /><path d="M40 42h9v6h-9Z" fill="#c6bc9d" /></g>}
      {level === 6 && <><path d="M10 19h2v18h-2Zm43 0h2v18h-2Z" fill="#d6b66e" /><path d="M9 34h7v6H9Zm41 0h7v6h-7Z" fill="#d6c6a0" /><path d="m43 43 12 3v5l-8-2v7l-4-2Z" fill="#d99383" /></>}
      {level === 7 && <><path d="M49 15h3v50h-3Z" fill="#d6b66e" /><path d="M44 14h4V8h7v6h4v7h-4v5h-7v-5h-4Z" fill="#aaa1d8" stroke="#152736" strokeWidth="2" /><path d="M49 13h5v8h-5Z" fill="#eee8d5" /><path d="M41 39h10v7H41Z" fill="#c7bc9a" /></>}
    </g>
  </svg>;
}

function SceneEffect({ level }: { level: number }) {
  if (level === 1) return <g className="wayfinder-effect wayfinder-wake" fill="#96bbae"><path d="M78 142h39v2H78Zm134 0h29v2h-29Zm-87-8h14v2h-14Z" /></g>;
  if (level === 2) return <g className="wayfinder-effect wayfinder-compass-rose" fill="none" stroke="#dfc58c"><path d="m160 42 13 13 17 1 1 17 13 13-13 13-1 17-17 1-13 13-13-13-17-1-1-17-13-13 13-13 1-17 17-1Z" /><path d="m160 34 3 12h-6Zm51 52-12 3v-6Zm-51 52-3-12h6Zm-51-52 12-3v6Z" fill="#dfc58c" /></g>;
  if (level === 3) return <g className="wayfinder-effect wayfinder-map-pages" fill="#dfd5af" stroke="#497b7b" strokeWidth="1"><path d="m87 78 28-5 5 35-27 5Z" /><path d="m200 69 29 6-7 34-28-6Z" /><path d="m139 38 29-3 4 25-29 3Z" /><path d="m93 86 13-2 2 7-10 2 2 8 10-2m96-20 13 3-2 9-9-2-2 7m-59-52 12-1 1 8-11 1" fill="none" /></g>;
  if (level === 4) return <g className="wayfinder-effect wayfinder-bubbles" fill="none" stroke="#a0d4cd" strokeWidth="1">{[[101,135,5],[224,130,4],[114,111,3],[205,103,5],[98,90,3],[216,70,4],[126,58,3],[190,41,4]].map(([x,y,s],i) => <rect key={i} x={x} y={y} width={s} height={s} style={{ '--particle': i } as CSSProperties} />)}</g>;
  if (level === 5) return <g className="wayfinder-effect wayfinder-beacon-ray" fill="#f0cd82"><path d="M264 29 0 7v64Z" opacity=".17" /><path d="M264 31 0 33v4Z" opacity=".75" /><path d="M186 61h3v7h7v3h-7v7h-3v-7h-7v-3h7Z" /></g>;
  if (level === 6) return <g className="wayfinder-effect wayfinder-wind" fill="none" stroke="#c3b9df" strokeWidth="2"><path d="M21 103h37v-6h26m143 25h39v-7h34M46 71h39v-5h29m87-12h38v-6h29" /><path d="m91 45 12 3v7l-8-2v9l-4-3Z" fill="#d99383" stroke="none" /></g>;
  return <g className="wayfinder-effect wayfinder-star-manta" fill="#d6b66e"><path d="M98 82h3v9h9v3h-9v9h-3v-9h-9v-3h9Zm117-19h3v7h7v3h-7v7h-3v-7h-7v-3h7Zm12 50h3v5h5v3h-5v5h-3v-5h-5v-3h5Z" /></g>;
}

export function WayfinderScene({ level, phase = 'still' }: { level: number; phase?: string }) {
  const stage = wayfinderStages[level - 1];
  if (!stage) throw new Error('Unknown Wayfinder scene.');
  return <div className="wayfinder-scene" data-scene={stage.effect} data-phase={phase}>
    <Suspense fallback={<span className="wayfinder-viewer-loading" role="status">Preparing 3D viewer...</span>}>
      <WayfinderViewer level={level} animate={phase === 'ascend' || phase === 'reward'} fallback={<WayfinderArt level={level} />} />
    </Suspense>
    <svg className="wayfinder-scene-effects" viewBox="0 0 320 240" shapeRendering="crispEdges" aria-hidden="true"
      style={{ display: phase === 'ascend' || phase === 'reward' ? 'block' : 'none' }}><SceneEffect level={level} /></svg>
    <span className="wayfinder-scene-marker" aria-hidden="true">SECTOR {String(level).padStart(2, '0')} / {stage.realm.toUpperCase()}</span>
    <span className="wayfinder-scene-corner" aria-hidden="true">C / OS</span>
  </div>;
}

export function WayfinderRelic({ level }: { level: number }) {
  return <svg className="wayfinder-relic" viewBox="0 0 24 24" shapeRendering="crispEdges" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
    {level === 1 && <><path d="M4 5h16v14H4Z" /><path d="M8 9h5m-5 4h8" /></>}
    {level === 2 && <><path d="M7 3h10v3h4v12h-4v3H7v-3H3V6h4Z" /><path d="m12 6 3 6-3 6-3-6Z" fill="currentColor" stroke="none" /></>}
    {level === 3 && <><path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z" /><path d="M9 3v16m6-14v16" /></>}
    {level === 4 && <><path d="m12 2 8 8-8 12-8-12Z" /><path d="M12 2v20M4 10h16" /></>}
    {level === 5 && <><path d="M6 7h12v14H6Zm3 0V3h6v4" /><path d="m12 10 3 4-3 4-3-4Z" fill="currentColor" stroke="none" /></>}
    {level === 6 && <><path d="M5 2v21M6 4h15l-5 5 5 6H6" /><path d="M9 7h5" /></>}
    {level === 7 && <><path d="M3 19V6l5 4 4-7 4 7 5-4v13Z" /><path d="M3 16h18m-9-7v4" /></>}
  </svg>;
}

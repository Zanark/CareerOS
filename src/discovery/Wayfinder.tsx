import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Compass, FastForward, Layers, LockKeyhole, MapPin, Play, X } from 'lucide-react';
import type { DiscoverySnapshot, WayfinderRun } from './model';
import { getWayfinderCrossings, getWayfinderProgress, wayfinderStages, wayfinderXpPerDiscovery } from './model';
import { WayfinderRelic, WayfinderScene } from './WayfinderArt';
import './wayfinder.css';

type Phase = 'ready' | 'fill' | 'threshold' | 'ascend' | 'reward' | 'complete';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(preference.matches);
    preference.addEventListener('change', update);
    update();
    return () => preference.removeEventListener('change', update);
  }, []);
  return reduced;
}

function useSequence(run: WayfinderRun | null) {
  const reduced = useReducedMotion();
  const [skippedId, setSkippedId] = useState<string | null>(null);
  const [frame, setFrame] = useState<{ id: string | null; index: number; phase: Phase }>({ id: null, index: 0, phase: 'ready' });
  const settled = useRef<string | null>(null);
  const stages = useMemo(() => {
    if (!run) return [];
    const crossings = getWayfinderCrossings(run.from, run.to);
    return crossings.length ? crossings : [{ ...wayfinderStages[0], level: 1 }];
  }, [run]);
  const skipped = !!run && skippedId === run.id;

  useEffect(() => {
    if (!run) return;
    if (reduced || skipped) {
      settled.current = run.id;
      setFrame({ id: run.id, index: stages.length - 1, phase: 'complete' });
      return;
    }
    if (settled.current === run.id) return;
    const timers: number[] = [];
    let cancelled = false;
    const show = (index: number, phase: Phase) => {
      if (!cancelled) setFrame({ id: run.id, index, phase });
    };
    for (let index = 0; index < stages.length; index++) {
      for (const [offset, phase] of [[0, 'ready'], [60, 'fill'], [650, 'threshold'], [1050, 'ascend'], [1650, 'reward']] as const) {
        timers.push(window.setTimeout(() => show(index, phase), index * 2200 + offset));
      }
    }
    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      settled.current = run.id;
      show(stages.length - 1, 'complete');
    }, stages.length * 2200));
    return () => { cancelled = true; timers.forEach(timer => window.clearTimeout(timer)); };
  }, [run, reduced, skipped, stages]);

  if (!run) return null;
  const phase = reduced || skipped ? 'complete' : frame.id === run.id ? frame.phase : 'ready';
  const index = phase === 'complete' ? stages.length - 1 : frame.id === run.id ? frame.index : 0;
  const stage = stages[index];
  const arrived = phase === 'ascend' || phase === 'reward' || phase === 'complete';
  const prologue = run.from === 0 && run.to === 0;
  const shownLevel = prologue || arrived ? stage.level : stage.level - 1;
  const startingCount = index === 0 ? run.from : stages[index - 1].at;
  const before = getWayfinderProgress(startingCount);
  const after = getWayfinderProgress(phase === 'complete' ? run.to : stage.at);
  const percent = prologue ? 0 : phase === 'fill' || phase === 'threshold' ? 100 : arrived ? after.percent : before.percent;
  const shownXp = arrived ? after.xp : phase === 'threshold' ? stage.at * wayfinderXpPerDiscovery : before.xp;
  const reached = phase === 'complete' ? stages : stages.slice(0, index + (phase === 'reward' ? 1 : 0));
  return { run, phase, index, stage, arrived, prologue, shownLevel, after, percent, shownXp, reached, stages, skipped, skip: () => setSkippedId(run.id) };
}

function SequenceDetails({ sequence }: { sequence: NonNullable<ReturnType<typeof useSequence>> }) {
  const { phase, prologue, shownLevel, shownXp, arrived, after, stage, percent, stages, reached, run } = sequence;
  return <>
    <div className="wayfinder-sequence-meter">
      <div><span>LV {String(shownLevel).padStart(2, '0')} <small>COLLECTION EXP</small></span><strong>{shownXp.toLocaleString()} <small>/ {(arrived ? after.nextAtXp : stage.at * wayfinderXpPerDiscovery)?.toLocaleString() ?? 'MAX'}</small></strong></div>
      <div className="wayfinder-exp-track" aria-hidden="true"><i style={{ width: `${percent}%` }} /></div>
    </div>
    <div className="wayfinder-sequence-controls">
      {phase !== 'complete' ? <button data-tour="wayfinder-skip" onClick={sequence.skip}><FastForward size={14} />Skip animation</button>
        : <span className="wayfinder-sequence-complete" role="status"><Check size={14} />{prologue ? 'Starter chapter ready' : `${stages.length === 1 ? 'New chapter' : `${stages.length} chapters`} revealed`}</span>}
      <span>{run.replay || prologue ? 'Replay only. Your saved EXP is unchanged.' : 'Already in your records. Nothing to claim.'}</span>
    </div>
    <div className="wayfinder-sequence-rewards" data-tour="wayfinder-rewards" aria-label="Revealed chapter rewards">
      {reached.length ? reached.map(reward => <div key={reward.level} className="wayfinder-reward-row" data-reward-level={reward.level}>
        <WayfinderRelic level={reward.level} /><div><span>LV {String(reward.level).padStart(2, '0')} / {reward.chapter}</span><strong>{reward.form} <i>+</i> {reward.relic}</strong><small>{reward.realm}{reward.level === 7 ? ' + star-manta companion' : ''}</small></div>
      </div>) : <p>A new form. A new relic. Somewhere you have not been.</p>}
    </div>
  </>;
}

export function Wayfinder({ snapshot, request, onRequestViewed }: {
  snapshot: DiscoverySnapshot; request: WayfinderRun | null; onRequestViewed: () => void;
}) {
  const progress = getWayfinderProgress(snapshot.earned);
  const [replay, setReplay] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
  const [run, setRun] = useState<WayfinderRun | null>(null);
  const seenRequest = useRef<string | null>(null);
  const viewingLevel = peek !== null && peek <= progress.level ? peek : progress.level;
  const stage = wayfinderStages[viewingLevel - 1];
  const memory = viewingLevel !== progress.level;
  const activeRun = run && run.to <= snapshot.earned ? run : null;
  const sequence = useSequence(activeRun);

  useEffect(() => {
    if (!request || request.id === seenRequest.current) return;
    seenRequest.current = request.id;
    if (request.to <= snapshot.earned && getWayfinderCrossings(request.from, request.to).length) {
      setPeek(null);
      setRun(request);
    }
    onRequestViewed();
  }, [request, snapshot.earned, onRequestViewed]);

  function replayChapter() {
    const count = replay + 1;
    setReplay(count);
    setRun({ id: `replay-${count}`, from: Math.max(0, stage.at - 1), to: stage.at, replay: true });
  }

  return <section className="wayfinder-panel" data-tour="wayfinder-panel" data-level={progress.level} data-view-level={viewingLevel} data-replay-count={replay}>
    <header className="wayfinder-panel-head"><span><span className="wayfinder-save-light" />LOCAL SAVE / BROWSER</span><strong>WAYFINDER</strong><span>COLLECTION LV {String(progress.level).padStart(2, '0')}</span></header>
    <div className="wayfinder-console">
      <div className={`wayfinder-screen-column${sequence ? ' wayfinder-sequence' : ''}`}
        data-tour={sequence ? 'wayfinder-sequence' : undefined} data-phase={sequence?.phase} data-sequence-level={sequence?.stage.level}
        data-skipped={sequence?.skipped} data-from={activeRun?.from} data-to={activeRun?.to}
        data-sequence-kind={sequence ? sequence.prologue ? 'prologue' : activeRun?.replay ? 'replay' : 'recorded' : undefined}>
        <div className="wayfinder-sequence-label" hidden={!sequence}>{sequence && <><span>{sequence.prologue ? 'PROLOGUE' : activeRun?.replay ? 'MEMORY REPLAY' : 'RECORDED LEVEL-UP'}</span><button aria-label="Close level-up sequence" onClick={() => setRun(null)}><X size={15} /></button></>}</div>
        <div className="wayfinder-sequence-screen">
          <WayfinderScene level={sequence?.shownLevel ?? viewingLevel} phase={sequence?.phase ?? 'still'} />
          {sequence && <div className="wayfinder-levelup-banner" aria-hidden="true">
            <span>{sequence.prologue ? 'THE JOURNEY BEGINS' : sequence.arrived ? sequence.stage.title.toUpperCase() : 'A NEW SIGNAL'}</span>
            <strong>{sequence.prologue ? 'FIRST LIGHT' : sequence.phase === 'ready' || sequence.phase === 'fill' ? 'GATHERING EXP' : 'LEVEL UP'}</strong>
            <span>{sequence.prologue ? 'LV 01 / TIDEBOUND HARBOR' : `LV ${String(Math.max(1, sequence.stage.level - 1)).padStart(2, '0')} \u2192 ${String(sequence.stage.level).padStart(2, '0')}`}</span>
          </div>}
        </div>
        {sequence ? <SequenceDetails sequence={sequence} /> : <div className="wayfinder-scene-caption"><span>CHAPTER {String(viewingLevel).padStart(2, '0')}</span><strong>{stage.chapter}</strong><span>{memory ? 'UNLOCKED MEMORY' : 'CURRENT CHAPTER'}</span></div>}
      </div>
      <div className="wayfinder-copy">
        <span className="wayfinder-overline">{memory ? `MEMORY / LV ${String(viewingLevel).padStart(2, '0')}` : 'YOUR CURRENT FORM'}</span>
        <div className="wayfinder-heading"><span className="wayfinder-level"><small>LV</small>{String(viewingLevel).padStart(2, '0')}</span><h2>{stage.title}</h2></div>
        <p className="wayfinder-description">{stage.description}</p>
        <dl className="wayfinder-loadout"><div><dt><Layers size={14} />FORM</dt><dd>{stage.form}</dd></div><div><dt><WayfinderRelic level={viewingLevel} />RELIC</dt><dd>{stage.relic}</dd></div><div><dt><MapPin size={14} />REALM</dt><dd>{stage.realm}</dd></div>{viewingLevel === 7 && <div><dt><Compass size={14} />COMPANION</dt><dd>A little star-manta</dd></div>}</dl>
        <div className="wayfinder-progress-copy"><strong>{progress.xp.toLocaleString()} <small>COLLECTION EXP</small></strong><span>{progress.nextAtXp === null ? 'MAX LEVEL' : `NEXT ${progress.nextAtXp.toLocaleString()}`}</span></div>
        <div className="wayfinder-exp-track" role="progressbar" aria-label="Wayfinder collection EXP"
          aria-valuenow={progress.xp} aria-valuemin={progress.nextAtXp === null ? 0 : progress.startsAtXp}
          aria-valuemax={progress.nextAtXp ?? snapshot.total * wayfinderXpPerDiscovery}
          aria-valuetext={`${progress.xp} collection EXP; ${snapshot.earned} of ${snapshot.total} discoveries; level ${progress.level}`}>
          <i style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="wayfinder-next-level">{progress.nextAt === null ? 'Every form discovered. The whole journey is yours to revisit.' : `${progress.remaining} more ${progress.remaining === 1 ? 'discovery' : 'discoveries'} to the next chapter.`}</p>
        <div className="wayfinder-actions"><button data-tour="wayfinder-replay" onClick={replayChapter}><Play size={14} />{viewingLevel === 1 ? 'Play prologue' : 'Replay level-up'}</button>{memory && <button className="wayfinder-return" data-tour="wayfinder-current" onClick={() => { setPeek(null); setRun(null); }}>Current chapter<ArrowRight size={14} /></button>}</div>
        <div className="wayfinder-source-stats"><div><strong>{snapshot.recordedDays}</strong><span>recorded days</span></div><div><strong>{snapshot.practicedCheckpoints}</strong><span>ideas practiced</span></div><div><strong>{snapshot.reviewedCheckpoints}</strong><span>ideas revisited</span></div></div>
      </div>
    </div>
    <div className="wayfinder-chapters" data-tour="wayfinder-chapters" role="group" aria-label="Wayfinder chapters; future artwork stays hidden">
      {wayfinderStages.map((chapter, index) => {
        const level = index + 1;
        const unlocked = level <= progress.level;
        return <button key={chapter.at} disabled={!unlocked} aria-pressed={viewingLevel === level}
          data-chapter-level={level} data-unlocked={unlocked} data-tour={level === 1 ? 'wayfinder-first-chapter' : undefined}
          onClick={() => { setRun(null); setPeek(level === progress.level ? null : level); }}
          aria-label={unlocked ? `View level ${level}: ${chapter.title}` : `Level ${level}, uncharted; ${chapter.at * wayfinderXpPerDiscovery} collection EXP`}>
          <span>LV {String(level).padStart(2, '0')}</span>{unlocked ? <WayfinderRelic level={level} /> : <LockKeyhole size={18} />}
          <small>{unlocked ? chapter.title : 'Uncharted'}</small><span className="wayfinder-chapter-exp">{(chapter.at * wayfinderXpPerDiscovery).toLocaleString()} EXP</span>
        </button>;
      })}
    </div>
    <p className="wayfinder-boundary">100 collection EXP per discovery. A fictional journey, not your career level or readiness. Replay earns nothing; gaps take nothing away. Your real work stays in charge.</p>
  </section>;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Check, Compass, Eye, FastForward, Layers, LockKeyhole, MapPin, Play, X } from 'lucide-react';
import type { DiscoverySnapshot, WayfinderRun } from './model';
import { getWayfinderCrossings, getWayfinderProgress, wayfinderRewards, wayfinderStages } from './model';
import { WayfinderRelic, WayfinderScene } from './WayfinderArt';
import { useAtlasVisibility } from './motion';
import { useWayfinderHistory } from './useWayfinderHistory';
import './wayfinder.css';

type Phase = 'ready' | 'fill' | 'threshold' | 'ascend' | 'reward' | 'complete';

function useSequence(run: WayfinderRun | null, motionAllowed: boolean, active: boolean) {
  const reduced = !motionAllowed;
  const [skippedId, setSkippedId] = useState<string | null>(null);
  const [frame, setFrame] = useState<{ id: string | null; index: number; phase: Phase }>({ id: null, index: 0, phase: 'ready' });
  const settled = useRef<string | null>(null);
  const clock = useRef({ id: '', elapsed: 0 });
  const stages = useMemo(() => {
    if (!run) return [];
    const crossings = getWayfinderCrossings(run.from, run.to);
    return crossings.length ? crossings : [{ ...wayfinderStages[0], level: 1 }];
  }, [run]);
  const skipped = !!run && skippedId === run.id;

  useEffect(() => {
    if (!run) return;
    if (clock.current.id !== run.id) clock.current = { id: run.id, elapsed: 0 };
    if (!active) return;
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
    const elapsed = clock.current.elapsed;
    const started = performance.now();
    let current: { index: number; phase: Phase } = { index: 0, phase: 'ready' };
    for (let index = 0; index < stages.length; index++) {
      for (const [offset, phase] of [[0, 'ready'], [60, 'fill'], [650, 'threshold'], [1050, 'ascend'], [1650, 'reward']] as const) {
        const at = index * 2200 + offset;
        if (at <= elapsed) current = { index, phase };
        else timers.push(window.setTimeout(() => show(index, phase), at - elapsed));
      }
    }
    show(current.index, current.phase);
    timers.push(window.setTimeout(() => {
      if (cancelled) return;
      settled.current = run.id;
      show(stages.length - 1, 'complete');
    }, Math.max(0, stages.length * 2200 - elapsed)));
    return () => {
      cancelled = true;
      clock.current.elapsed = Math.min(stages.length * 2200, elapsed + performance.now() - started);
      timers.forEach(timer => window.clearTimeout(timer));
    };
  }, [run, reduced, skipped, stages, active]);

  if (!run) return null;
  const phase = active && (reduced || skipped) ? 'complete' : frame.id === run.id ? frame.phase : 'ready';
  const index = phase === 'complete' ? stages.length - 1 : frame.id === run.id ? frame.index : 0;
  const stage = stages[index];
  const arrived = phase === 'ascend' || phase === 'reward' || phase === 'complete';
  const prologue = run.from === 0 && run.to === 0;
  const shownLevel = prologue || arrived ? stage.level : stage.level - 1;
  const startingXp = index === 0 ? run.from : stages[index - 1].at;
  const before = getWayfinderProgress(startingXp);
  const after = getWayfinderProgress(phase === 'complete' ? run.to : stage.at);
  const percent = prologue ? 0 : phase === 'fill' || phase === 'threshold' ? 100 : arrived ? after.percent : before.percent;
  const shownXp = arrived ? after.xp : phase === 'threshold' ? stage.at : before.xp;
  const reached = phase === 'complete' ? stages : stages.slice(0, index + (phase === 'reward' ? 1 : 0));
  return { run, phase, index, stage, arrived, prologue, shownLevel, after, percent, shownXp, reached, stages, skipped, skip: () => setSkippedId(run.id) };
}

function SequenceDetails({ sequence }: { sequence: NonNullable<ReturnType<typeof useSequence>> }) {
  const { phase, prologue, shownLevel, shownXp, arrived, after, stage, percent, stages, reached, run } = sequence;
  return <>
    <div className="wayfinder-sequence-meter">
      <div><span>LV {String(shownLevel).padStart(2, '0')} <small>JOURNEY EXP</small></span><strong>{shownXp.toLocaleString()} <small>/ {(arrived ? after.nextAtXp : stage.at)?.toLocaleString() ?? 'MAX'}</small></strong></div>
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

export function Wayfinder({ snapshot, request, onRequestViewed, children, motionAllowed, foreground, practice }: {
  snapshot: DiscoverySnapshot; request: WayfinderRun | null; onRequestViewed: () => void; children: ReactNode; motionAllowed: boolean; foreground: boolean; practice: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const visibility = useAtlasVisibility(ref);
  const screenRef = useRef<HTMLDivElement>(null);
  const screenVisibility = useAtlasVisibility(screenRef);
  const progress = getWayfinderProgress(snapshot.journey.xp);
  const [replay, setReplay] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ level: number; xp: number } | null>(null);
  const [run, setRun] = useState<(WayfinderRun & { sourceId: string | null }) | null>(null);
  const [viewerReady, setViewerReady] = useState(false);
  const history = useWayfinderHistory(snapshot, practice);
  const arrivalId = useRef(0);
  const seenRequest = useRef<string | null>(null);
  const next = wayfinderStages[progress.level];
  const previewing = !!preview && preview.xp === progress.xp && preview.level === progress.level + 1 && !!next;
  const viewingLevel = previewing ? preview.level : peek !== null && peek <= progress.level ? peek : progress.level;
  const stage = wayfinderStages[viewingLevel - 1];
  const memory = viewingLevel < progress.level;
  const activeRun = run && run.sourceId === history.sourceId && run.to <= progress.xp ? run : null;
  const presenting = viewerReady && foreground && (screenVisibility.visible || typeof IntersectionObserver === 'undefined');
  const sequence = useSequence(activeRun, motionAllowed, presenting);

  useEffect(() => {
    if (!presenting || !activeRun || activeRun.replay) return;
    if (sequence?.phase === 'reward') history.markViewed(sequence.stage.at);
    else if (sequence?.phase === 'complete') history.markViewed(activeRun.to);
  }, [activeRun, sequence?.phase, sequence?.stage.at, presenting, history.markViewed]);

  useEffect(() => {
    if (!request || request.id === seenRequest.current) return;
    seenRequest.current = request.id;
    if (request.to <= progress.xp && getWayfinderCrossings(request.from, request.to).length) {
      setPeek(null);
      setPreview(null);
      setRun({ ...request, from: practice ? request.from : Math.min(request.from, history.from), sourceId: history.sourceId });
    }
    onRequestViewed();
  }, [request, progress.xp, onRequestViewed, practice, history.from, history.sourceId]);

  useEffect(() => {
    if (practice || request || !presenting || (activeRun && sequence?.phase !== 'complete')) return;
    const from = sequence?.phase === 'complete' && activeRun && !activeRun.replay
      ? Math.max(history.from, activeRun.to) : history.from;
    if (!getWayfinderCrossings(from, progress.xp).length) return;
    setPeek(null);
    setPreview(null);
    setRun({ id: `arrival-${++arrivalId.current}`, from, to: progress.xp, sourceId: history.sourceId });
  }, [practice, request, presenting, activeRun, sequence?.phase, history.from, history.sourceId, progress.xp]);

  function dismissSequence() {
    history.markViewed(progress.xp);
    setRun(null);
  }

  function replayChapter() {
    const count = replay + 1;
    setReplay(count);
    history.markViewed(progress.xp);
    setRun({ id: `replay-${count}`, from: Math.max(0, stage.at - 1), to: stage.at, replay: true, sourceId: history.sourceId });
  }

  return <section ref={ref} className="wayfinder-panel" data-tour="wayfinder-panel" data-level={progress.level} data-view-level={viewingLevel} data-preview={previewing} data-replay-count={replay} data-atlas-visible={visibility.visible} data-presentation-active={presenting}>
    <header className="wayfinder-panel-head"><div className="atlas-ambient atlas-panel-gleam" aria-hidden="true" /><span><span className="wayfinder-save-light" />REAL WORK. UNCHARTED WATER.</span><strong>WAYFINDER</strong><span>JOURNEY LV {String(progress.level).padStart(2, '0')}</span></header>
    {history.notice && <p className="form-error" role="status">{history.notice}</p>}
    <div className="wayfinder-console">
      <div className={`wayfinder-screen-column${sequence ? ' wayfinder-sequence' : ''}`}
        data-tour={sequence ? 'wayfinder-sequence' : undefined} data-phase={sequence?.phase} data-sequence-level={sequence?.stage.level}
        data-skipped={sequence?.skipped} data-from={activeRun?.from} data-to={activeRun?.to}
        data-sequence-kind={sequence ? sequence.prologue ? 'prologue' : activeRun?.replay ? 'replay' : 'recorded' : undefined}>
        <div className="wayfinder-sequence-label" hidden={!sequence}>{sequence && <><span>{sequence.prologue ? 'PROLOGUE' : activeRun?.replay ? 'MEMORY REPLAY' : 'RECORDED LEVEL-UP'}</span><button aria-label="Close level-up sequence" onClick={dismissSequence}><X size={15} /></button></>}</div>
        <div ref={screenRef} className="wayfinder-sequence-screen">
          <WayfinderScene level={sequence?.shownLevel ?? viewingLevel} phase={sequence?.phase ?? 'still'} onReady={setViewerReady} />
          {previewing && !sequence && <span className="wayfinder-preview-label"><Eye size={14} />NEXT REWARD PREVIEW / NOT EARNED</span>}
          {sequence && <div className="wayfinder-levelup-banner" aria-hidden="true">
            <span>{sequence.prologue ? 'THE JOURNEY BEGINS' : sequence.arrived ? sequence.stage.title.toUpperCase() : 'A NEW SIGNAL'}</span>
            <strong>{sequence.prologue ? 'FIRST LIGHT' : sequence.phase === 'ready' || sequence.phase === 'fill' ? 'GATHERING EXP' : 'LEVEL UP'}</strong>
            <span>{sequence.prologue ? 'LV 01 / TIDEBOUND HARBOR' : `LV ${String(Math.max(1, sequence.stage.level - 1)).padStart(2, '0')} \u2192 ${String(sequence.stage.level).padStart(2, '0')}`}</span>
          </div>}
        </div>
        {sequence ? <SequenceDetails sequence={sequence} /> : <div className="wayfinder-scene-caption"><span>{previewing ? 'NOT EARNED / PREVIEW' : memory ? 'UNLOCKED MEMORY' : 'CURRENT CHAPTER'} / LV {String(viewingLevel).padStart(2, '0')}</span><h2>{stage.title}</h2><span>{stage.chapter}</span></div>}
        <div className="wayfinder-actions">
          {!previewing && <button data-tour="wayfinder-replay" onClick={replayChapter}><Play size={14} />{viewingLevel === 1 ? 'Play prologue' : 'Replay level-up'}</button>}
          {(memory || previewing) && <button className="wayfinder-return" data-tour="wayfinder-current" onClick={() => { setPeek(null); setPreview(null); dismissSequence(); }}>Current chapter<ArrowRight size={14} /></button>}
        </div>
        <details className="wayfinder-kit"><summary>{previewing ? 'Preview equipment & story' : memory ? "This memory's equipment & story" : 'Your equipment & story'}</summary>
          <p className="wayfinder-description">{stage.description}</p>
          <dl className="wayfinder-loadout"><div><dt><Layers size={14} />FORM</dt><dd>{stage.form}</dd></div><div><dt><WayfinderRelic level={viewingLevel} />RELIC</dt><dd>{stage.relic}</dd></div><div><dt><MapPin size={14} />REALM</dt><dd>{stage.realm}</dd></div>{viewingLevel === 7 && <div><dt><Compass size={14} />COMPANION</dt><dd>A little star-manta</dd></div>}</dl>
        </details>
      </div>
      <div className="wayfinder-copy">
        {children}
        <div className="wayfinder-progress-copy"><strong>{progress.xp.toLocaleString()} <small>JOURNEY EXP</small></strong><span>{progress.nextAtXp === null ? 'ALL FORMS EARNED' : `NEXT ${progress.nextAtXp.toLocaleString()}`}</span></div>
        <div className="wayfinder-exp-track" role="progressbar" aria-label="Wayfinder journey EXP"
          aria-valuenow={progress.xp} aria-valuemin={progress.nextAtXp === null ? 0 : progress.startsAtXp}
          aria-valuemax={progress.nextAtXp ?? Math.max(progress.xp, wayfinderStages.at(-1)!.at)}
          aria-valuetext={`${progress.xp} journey EXP from saved work; ${snapshot.earned} of ${snapshot.total} discoveries; level ${progress.level}`}>
          <i style={{ width: `${progress.percent}%` }} />
        </div>
        <p className="wayfinder-next-level">{next ? `${progress.remaining.toLocaleString()} EXP to ${next.realm}. Real checkpoint work moves you forward, even between discoveries.` : 'Every form is yours. Your real expeditions and saved-work EXP can keep growing.'}</p>
        {next && <div className="wayfinder-next-reward" data-tour="wayfinder-next-reward">
          <span className="atlas-ambient atlas-reward-token"><WayfinderRelic level={progress.level + 1} /></span><div><span>NEXT CHAPTER / LV {String(progress.level + 1).padStart(2, '0')}</span><strong>{next.form} + {next.relic}</strong><small>{next.realm}</small></div>
          <button data-tour="wayfinder-preview" aria-pressed={previewing} onClick={() => {
            setPeek(null); dismissSequence();
            setPreview(previewing ? null : { level: progress.level + 1, xp: progress.xp });
          }}><Eye size={14} />{previewing ? 'End preview' : 'Preview reward'}</button>
        </div>}
      </div>
    </div>
    <div className="wayfinder-chapters" data-tour="wayfinder-chapters" role="group" aria-label="Earned Wayfinder chapters; locked chapters cannot be selected">
      {wayfinderStages.map((chapter, index) => {
        const level = index + 1;
        const unlocked = level <= progress.level;
        return <button key={chapter.at} disabled={!unlocked} aria-pressed={!previewing && viewingLevel === level}
          data-chapter-level={level} data-unlocked={unlocked} data-tour={level === 1 ? 'wayfinder-first-chapter' : undefined}
          onClick={() => { dismissSequence(); setPreview(null); setPeek(level === progress.level ? null : level); }}
          aria-label={unlocked ? `View level ${level}: ${chapter.title}` : `Level ${level}, uncharted; ${chapter.at} journey EXP`}>
          <span>LV {String(level).padStart(2, '0')}</span>{unlocked ? <WayfinderRelic level={level} /> : <LockKeyhole size={18} />}
          <small>{unlocked ? chapter.title : 'Uncharted'}</small><span className="wayfinder-chapter-exp">{chapter.at.toLocaleString()} EXP</span>
        </button>;
      })}
    </div>
    <details className="wayfinder-ledger" data-tour="wayfinder-ledger"><summary>Where your EXP comes from<span>{snapshot.journey.xp.toLocaleString()} EXP / SAVED WORK ONLY</span></summary>
      <div className="wayfinder-ledger-body"><dl>{(['practice', 'completion', 'recall', 'day', 'discovery'] as const).map(kind => <div key={kind}><dt>{wayfinderRewards[kind].label}<small>{snapshot.journey.counts[kind]} × {wayfinderRewards[kind].xp} EXP</small></dt><dd>{(snapshot.journey.counts[kind] * wayfinderRewards[kind].xp).toLocaleString()}</dd></div>)}</dl>
        {snapshot.journey.recent.length > 0 && <div className="wayfinder-recent-awards"><span className="wayfinder-overline">RECENT SOURCE RECEIPTS</span><ul>{[...snapshot.journey.recent].reverse().map(award => <li key={award.id}><span>+{award.xp}</span><a href={award.source.href}>{award.label}<small>{award.source.title}</small></a></li>)}</ul></div>}
      </div>
    </details>
    <p className="wayfinder-boundary">A fictional journey, not your career level or readiness. First traces, confirmed finishes, honest revisits, recorded days and discoveries count once each. Preview and replay earn nothing; gaps take nothing away.</p>
  </section>;
}

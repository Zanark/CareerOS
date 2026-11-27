import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  Check, ChevronLeft, ChevronRight, Crown, FileCheck2, Flag, Layers3,
  LockKeyhole, Network, Pause, Play, RotateCcw, Route, Sparkles, Target, Terminal, Trophy,
} from 'lucide-react';
import { Modal } from './components';
import './mission-hierarchy.css';

const scenes = [
  { title: 'Choose a mission', detail: 'A mission is a whole learning route. Each mission keeps its own progress.' },
  { title: 'See the stages inside', detail: 'Stages group checkpoints into chapters. They are not extra completion tasks.' },
  { title: 'Work on one checkpoint', detail: 'Save evidence as you practice. Saving a note alone does not complete the checkpoint.' },
  { title: 'Confirm, complete, unlock', detail: 'When your evidence meets every criterion, confirm completion. The next eligible checkpoint opens.' },
  { title: 'Finish a stage', detail: 'Both Build checkpoints are complete. That chapter is done; the mission still has two checkpoints left.' },
  { title: 'Complete the mission', detail: 'All four checkpoints are complete. This mission finishes; the other mission keeps its own progress.' },
];
const sceneDuration = 3600;
const totalDuration = scenes.length * sceneDuration;
const exampleMissions = [
  { id: 'api', title: 'Build a tiny API', icon: Network, color: '#00A591',
    stages: [{ title: 'Build', checkpoints: ['Sketch routes', 'Build handlers'] },
      { title: 'Verify', checkpoints: ['Add checks', 'Package demo'] }] },
  { id: 'cli', title: 'Make a useful CLI', icon: Terminal, color: '#268BD2',
    stages: [{ title: 'Create', checkpoints: ['Parse arguments', 'Read a file'] },
      { title: 'Deliver', checkpoints: ['Handle errors', 'Ship a build'] }] },
];

function ExampleMission({ mission, step, secondary = false }: {
  mission: typeof exampleMissions[number]; step: number; secondary?: boolean;
}) {
  const completed = secondary ? 0 : step >= 5 ? 4 : step === 4 ? 2 : step === 3 ? 1 : 0;
  const MissionSymbol = mission.icon;
  return <article className={`hierarchy-mission${secondary ? ' hierarchy-mission--secondary' : ''}`}
    aria-label={`${mission.title} example`} data-completed={completed}
    style={{ '--route-accent': mission.color } as CSSProperties}>
    <header className="hierarchy-mission-heading">
      <span className="hierarchy-mission-icon"><MissionSymbol size={23} aria-hidden="true" /></span>
      <div><span className="hierarchy-small-label">MISSION {secondary ? '02' : '01'}</span><h3>{mission.title}</h3></div>
      <span className="hierarchy-mission-count"><strong>{completed}</strong> / 4<span>checkpoints</span></span>
    </header>
    <div className="hierarchy-mission-badges">
      <span><Target size={13} aria-hidden="true" />In focus</span>
      {!secondary && <span className="hierarchy-primary"><Crown size={13} aria-hidden="true" />Primary</span>}
      {completed === 4 && <span className="hierarchy-finish"><Trophy size={14} aria-hidden="true" />Mission complete</span>}
    </div>
    <div className="hierarchy-stages">
      {mission.stages.map((stage, stageIndex) => <section className="hierarchy-stage" key={stage.title}
        aria-label={`Stage ${stageIndex + 1}: ${stage.title}`} data-complete={completed >= (stageIndex + 1) * 2}
        data-highlight={!secondary && step === 1}>
        <h4><Layers3 size={13} aria-hidden="true" /><span>STAGE {stageIndex + 1}</span>{stage.title}
          {completed >= (stageIndex + 1) * 2 && <Check size={14} aria-label="Stage complete" />}</h4>
        <ol className="hierarchy-waypoints">
          {stage.checkpoints.map((title, offset) => {
            const index = stageIndex * 2 + offset;
            const status = index < completed ? 'complete' : index === completed ? 'current' : 'locked';
            const Icon = status === 'complete' ? Check : status === 'current' ? Flag : LockKeyhole;
            return <li key={title} data-state={status} aria-label={`Checkpoint ${index + 1}: ${title}, ${status}`}>
              <span className="hierarchy-orb"><Icon size={20} aria-hidden="true" /><b>{String(index + 1).padStart(2, '0')}</b></span>
              <strong>{title}</strong><small>{status === 'complete' ? 'Complete' : status === 'current' ? 'Current checkpoint' : 'Not yet unlocked'}</small>
            </li>;
          })}
        </ol>
      </section>)}
    </div>
  </article>;
}

function HierarchyWalkthrough({ onClose }: { onClose: () => void }) {
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [playing, setPlaying] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
  const [step, setStep] = useState(0);
  const [run, setRun] = useState(0);
  const [manual, setManual] = useState(false);
  const clock = useRef({ elapsed: 0 });

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motion = () => {
      setReducedMotion(preference.matches);
      if (preference.matches) setPlaying(false);
    };
    const visibility = () => setVisible(document.visibilityState === 'visible');
    preference.addEventListener('change', motion);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      preference.removeEventListener('change', motion);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  useEffect(() => {
    if (!playing || !visible) return;
    const current = clock.current;
    const started = performance.now();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const advance = () => {
      const elapsed = current.elapsed + performance.now() - started;
      setStep(Math.min(scenes.length - 1, Math.floor(elapsed / sceneDuration)));
      if (elapsed >= totalDuration) { setPlaying(false); return; }
      timer = setTimeout(advance, sceneDuration - elapsed % sceneDuration);
    };
    advance();
    return () => {
      clearTimeout(timer);
      current.elapsed = Math.min(totalDuration, current.elapsed + performance.now() - started);
    };
  }, [playing, visible, run]);

  function seek(index: number, autoplay = false) {
    clock.current = { elapsed: index * sceneDuration };
    setStep(index); setPlaying(autoplay); setManual(!autoplay); setRun(value => value + 1);
  }
  function toggle() {
    if (playing) setPlaying(false);
    else if (clock.current.elapsed >= totalDuration) seek(0, true);
    else { setManual(false); setPlaying(true); }
  }
  const active = playing && visible;
  return <Modal title="How missions work" eyebrow="MISSION BRIEFING"
    wide className="mission-hierarchy-modal" onClose={onClose} restoreFocus>
    <div className="hierarchy-body" data-tour="mission-hierarchy" data-step={step}
      data-playing={active} data-manual={manual}>
      <div className="hierarchy-levels" aria-label="Mission hierarchy">
        <span><Route size={16} aria-hidden="true" />Mission</span><ChevronRight size={14} aria-hidden="true" />
        <span><Layers3 size={16} aria-hidden="true" />Stage</span><ChevronRight size={14} aria-hidden="true" />
        <span><Flag size={16} aria-hidden="true" />Checkpoint</span><ChevronRight size={14} aria-hidden="true" />
        <span><FileCheck2 size={16} aria-hidden="true" />Evidence + criteria</span>
      </div>
      <div className="hierarchy-caption" role="status" aria-live={playing ? 'off' : 'polite'} aria-atomic="true">
        <span>{String(step + 1).padStart(2, '0')}</span><div><h3>{scenes[step].title}</h3><p>{scenes[step].detail}</p></div>
      </div>
      <div key={run} className="hierarchy-scene" data-step={step} data-playing={active} data-manual={manual}>
        <div className="hierarchy-sky" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
        <div className="hierarchy-scene-label"><Sparkles size={14} aria-hidden="true" />FICTIONAL EXAMPLE / NO PROGRESS SAVED</div>
        <ExampleMission mission={exampleMissions[0]} step={step} />
        <div className="hierarchy-evidence-slot">
          {step >= 2 && <div className="hierarchy-evidence" aria-label="Example evidence and criteria">
            <span className="hierarchy-evidence-file"><FileCheck2 size={22} aria-hidden="true" />
              <span><strong>route-sketch.md</strong><small>Example evidence saved</small></span></span>
            <div className="hierarchy-criteria" data-confirmed={step >= 3}>
              <span><Check size={13} aria-hidden="true" />Routes explained</span>
              <span><Check size={13} aria-hidden="true" />Request shape shown</span>
            </div>
            <strong className="hierarchy-evidence-outcome">{step >= 3 ? <><Flag size={16} aria-hidden="true" />Criteria confirmed</> : 'Checkpoint still open'}</strong>
          </div>}
        </div>
        <ExampleMission mission={exampleMissions[1]} step={step} secondary />
      </div>
      <div className="hierarchy-priorities">
        <p><Target size={17} aria-hidden="true" /><span><strong>In focus</strong>Several missions can be in your active planning pool.</span></p>
        <p><Crown size={17} aria-hidden="true" /><span><strong>Primary</strong>One first-priority choice when a new plan is generated.</span></p>
      </div>
      <p className="hierarchy-boundary">Primary does not activate a background mission or rewrite an existing plan. Completion is self-confirmed, not independently graded. Related missions are connections, not prerequisite locks.</p>
    </div>
    <footer className="hierarchy-controls">
      <div className="hierarchy-playback">
        <button type="button" className="button primary" onClick={toggle}>
          {playing ? <Pause size={17} /> : <Play size={17} />}{playing ? 'Pause animation' : 'Play animation'}
        </button>
        <button type="button" className="icon-button" aria-label="Replay animation" onClick={() => seek(0, true)}><RotateCcw size={19} /></button>
        <span>{reducedMotion ? 'Reduced motion / manual steps available' : 'A short, one-time walkthrough'}</span>
      </div>
      <div className="hierarchy-navigation">
        <button type="button" className="icon-button" aria-label="Previous animation step" disabled={step === 0} onClick={() => seek(step - 1)}><ChevronLeft size={20} /></button>
        <div className="hierarchy-step-buttons" aria-label="Animation steps">{scenes.map((scene, index) =>
          <button type="button" key={scene.title} aria-label={`Step ${index + 1}: ${scene.title}`}
            aria-current={index === step ? 'step' : undefined} onClick={() => seek(index)}><span>{index + 1}</span></button>)}</div>
        <button type="button" className="icon-button" aria-label="Next animation step" disabled={step === scenes.length - 1} onClick={() => seek(step + 1)}><ChevronRight size={20} /></button>
      </div>
    </footer>
  </Modal>;
}

export function MissionHierarchy() {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="button secondary mission-hierarchy-open" data-tour="mission-hierarchy-open"
      onClick={() => setOpen(true)}><span><Play size={15} fill="currentColor" aria-hidden="true" /></span>How missions work<Sparkles size={16} aria-hidden="true" /></button>
    {open && <HierarchyWalkthrough onClose={() => setOpen(false)} />}
  </>;
}

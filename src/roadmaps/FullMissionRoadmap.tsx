import { useMemo, useState } from 'react';
import { BookOpen, Check, Flag, Focus, LockKeyhole, Maximize2, Minus, Plus } from 'lucide-react';
import { getLatestMission, getProgressForVersion, prerequisitesFor } from '../domain/catalog';
import type { AppState, Checkpoint, Mission } from '../domain/types';
import { Modal } from '../components';
import { Diagram } from './Diagram';
import type { DiagramEdge } from './Diagram';
import { checkpointLevels, roadmapGroups } from './roadmapGraph';
import './full-roadmap.css';
import { dsaStudySectionFor } from '../domain/operations/dsaStudy';
import { useMapViewport } from './useMapViewport';
import { SystemConceptMap } from '../system/SystemConcepts';
import { systemConceptGroups, systemConcepts } from '../system/concepts';
import { systemPracticeFor } from '../domain/operations/systemPracticeStudy';
import { systemPracticeCases } from '../domain/operations/systemPracticeContent';
import { MapInspector } from './MapInspector';
import { getPackOutline, packUnitForCheckpoint, packUnitHref } from '../domain/roadmapPacks/registry';

const stageNodeId = (id: string) => `full-stage-${id}`;
const caseNodeId = (id: string) => `practice-${id}`;

export function FullMissionRoadmap({ mission, state, onClose }: {
  mission: Mission; state: AppState; onClose: () => void;
}) {
  const latest = getLatestMission(mission.id);
  const hasExpanded = mission.roadmapVersion !== latest.roadmapVersion;
  const [mode, setMode] = useState<'complete' | 'saved' | 'concepts'>('complete');
  const [inspectorExpanded, setInspectorExpanded] = useState<boolean | null>(null);
  const showSaved = mode === 'saved';
  const concepts = mission.id === 'system' && mode === 'concepts';
  const preview = hasExpanded && !showSaved && !concepts;
  const displayed = preview ? latest : mission;
  const groupCount = roadmapGroups(displayed).length;
  const subtitle = concepts ? `${systemConceptGroups.length} sections · ${systemConcepts.length} concept nodes`
    : `${groupCount} ${['3.0.0', '4.0.0'].includes(displayed.roadmapVersion) && getPackOutline(displayed.id) ? 'curriculum groups' : 'stages'} · ${displayed.checkpoints.length} ${preview ? 'checkpoints' : 'tracked checkpoints'} · ${preview ? 'Preview' : 'Tracker'} v${displayed.roadmapVersion}`;

  return <Modal title={`${mission.name} full roadmap`} subtitle={subtitle}
    eyebrow={mission.operation} className={`full-roadmap-modal ${preview || concepts ? 'full-roadmap-preview' : ''}`} onClose={onClose} restoreFocus>
    {(hasExpanded || mission.id === 'system') && <div className="full-roadmap-version-bar" data-tour="full-map-version">
      <label>View<select aria-label="Roadmap view" value={mode}
        onChange={event => { const next = event.target.value; if (next === 'complete' || next === 'saved' || next === 'concepts') setMode(next); }}>
        <option value="complete">{mission.id === 'system' ? `Problems & exercises · v${latest.roadmapVersion}` : `Complete curriculum · v${latest.roadmapVersion}`}</option>
        {mission.id === 'system' && <option value="concepts">Concepts · system-design.pdf</option>}
        <option value="saved">My saved tracker · v{mission.roadmapVersion}</option>
      </select></label>
      <span>{preview || concepts ? `Saved: v${mission.roadmapVersion}` : 'Your saved progress'}</span>
      <a className="text-link" href={`#/sources/${mission.id}`}>{mission.id === 'system' ? 'Source and tracker' : 'Review tracker update'}</a>
    </div>}
    {concepts ? <SystemConceptMap onClose={onClose} inspectorExpanded={inspectorExpanded} onInspectorExpandedChange={setInspectorExpanded} /> :
      <RoadmapCanvas key={`${displayed.id}-${displayed.roadmapVersion}`} mission={displayed}
        savedMission={mission} preview={preview} state={state} onClose={onClose}
        inspectorExpanded={inspectorExpanded} onInspectorExpandedChange={setInspectorExpanded} />}
  </Modal>;
}

function RoadmapCanvas({ mission, savedMission, preview, state, onClose, inspectorExpanded, onInspectorExpandedChange }: {
  mission: Mission; savedMission: Mission; preview: boolean; state: AppState; onClose: () => void;
  inspectorExpanded: boolean | null; onInspectorExpandedChange: (expanded: boolean) => void;
}) {
  const progress = preview ? undefined : getProgressForVersion(state, mission.id, mission.roadmapVersion);
  const savedProgress = state.missions[savedMission.id];
  const savedCheckpoint = savedMission.checkpoints.find(checkpoint => checkpoint.id === savedProgress.checkpointId);
  const completed = useMemo(() => new Set(progress?.completedCheckpointIds ?? []), [progress]);
  const current = progress?.status !== 'completed'
    ? mission.checkpoints.find(checkpoint => checkpoint.id === progress?.checkpointId)
    : undefined;
  const groups = useMemo(() => roadmapGroups(mission).map(group => {
    const levels = checkpointLevels(mission, group.checkpoints);
    const columns = Math.max(1, ...levels.map(level => level.length));
    return { ...group, levels, width: columns * 280 + (columns - 1) * 24 + 48 };
  }), [mission]);
  const edges = useMemo<DiagramEdge[]>(() => {
    const membership = new Map(groups.flatMap(group => group.checkpoints.map(checkpoint => [checkpoint.id, group.id] as const)));
    return mission.checkpoints.flatMap(checkpoint => prerequisitesFor(mission, checkpoint).map(parent => {
      const across = membership.get(parent) !== membership.get(checkpoint.id);
      return {
        from: parent, to: checkpoint.id,
        kind: across ? 'cross-stage' : 'down',
        via: across ? stageNodeId(membership.get(parent)!) : undefined,
        tone: completed.has(parent) ? 'complete' : checkpoint.id === current?.id ? 'current' : 'normal',
      };
    }));
  }, [mission, groups, completed, current?.id]);

  const { viewport, graph, size, view, fit, zoom, dragging, changeZoom, registerNode, panProps } = useMapViewport(onClose);
  const [selectedId, setSelectedId] = useState<string | undefined>(current?.id ?? mission.checkpoints[0]?.id);
  const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
  const references = useMemo(() => {
    if (!['3.0.0', '4.0.0'].includes(mission.roadmapVersion)) return [];
    if (mission.id === 'system') return systemPracticeCases.map(unit => ({
      id: unit.id, title: unit.title, summary: unit.summary, sourceId: `Case ${unit.letter}`,
      stageId: 'system-practice-i', href: `#/system-practice/${unit.id}`,
    }));
    return getPackOutline(mission.id)?.units.filter(unit => unit.role !== 'checkpoint' &&
      mission.stages?.some(stage => stage.id === `${mission.id}-pack-${unit.phaseId}`)).map(unit => ({
      id: unit.id, title: unit.title, summary: unit.summary, sourceId: unit.sourceId,
      stageId: `${mission.id}-pack-${unit.phaseId}`, href: packUnitHref(mission.id, unit.id),
    })) ?? [];
  }, [mission]);
  const selectedReference = references.find(unit => unit.id === selectedReferenceId);
  const selected = mission.checkpoints.find(checkpoint => checkpoint.id === selectedId);
  const studySection = mission.id === 'pattern' ? dsaStudySectionFor(selected) : undefined;
  const systemPractice = mission.id === 'system' ? systemPracticeFor(selected) : undefined;
  const packPractice = packUnitForCheckpoint(mission.id, selected);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function statusOf(checkpoint: Checkpoint) {
    if (preview) return 'reference';
    return completed.has(checkpoint.id) ? 'complete' : checkpoint.id === current?.id ? 'current'
      : progress && prerequisitesFor(mission, checkpoint).every(id => completed.has(id)) ? 'available' : 'locked';
  }

  return <>
    <div className="full-roadmap-toolbar">
      <button className="button secondary" data-tour="full-map-fit" onClick={() => changeZoom(null, 'fit')} aria-pressed={view.zoom === null}><Maximize2 size={17} />Fit all</button>
      {!preview && <button className="button primary" data-tour="full-map-current" aria-label="Current checkpoint" disabled={!current} onClick={() => {
        setSelectedReferenceId(null);
        setSelectedId(current?.id);
        setDetailsOpen(false);
        if (current) changeZoom(1, { nodeId: current.id });
      }}><Focus size={17} /><span className="full-roadmap-current-label">Current checkpoint</span></button>}
      {(mission.checkpoints.length > 0 || references.length > 0) && <select className="full-roadmap-topic-finder" aria-label="Find a roadmap topic" value=""
        onChange={event => {
          const reference = references.find(unit => caseNodeId(unit.id) === event.target.value);
          if (reference) {
            setSelectedReferenceId(reference.id);
            setSelectedId(undefined);
            setDetailsOpen(true);
            changeZoom(1, { nodeId: caseNodeId(reference.id) });
            return;
          }
          const checkpoint = mission.checkpoints.find(candidate => candidate.id === event.target.value);
          if (!checkpoint) return;
          setSelectedReferenceId(null);
          setSelectedId(checkpoint.id);
          setDetailsOpen(true);
          changeZoom(1, { nodeId: checkpoint.id });
        }}>
        <option value="" disabled>{mission.id === 'system' ? 'Find a module/case...' : 'Find a topic...'}</option>
        {mission.checkpoints.map(checkpoint => <option key={checkpoint.id} value={checkpoint.id}>{checkpoint.title}</option>)}
        {references.length > 0 && <optgroup label={mission.id === 'system' ? 'Case studies - practice bank' : 'Practice and supporting references'}>
          {references.map(unit => <option key={unit.id} value={caseNodeId(unit.id)}>{unit.sourceId}: {unit.title}</option>)}
        </optgroup>}
      </select>}
      <div className="full-roadmap-zoom" role="group" aria-label="Roadmap zoom">
        <button className="icon-button" data-tour="full-map-zoom-out" aria-label="Zoom out" disabled={zoom <= Math.min(fit, 0.25)} onClick={() => changeZoom(zoom / 1.5)}><Minus size={18} /></button>
        <output aria-label="Roadmap zoom level">{Math.round(zoom * 100)}%</output>
        <button className="icon-button" data-tour="full-map-zoom-in" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => changeZoom(zoom * 1.5)}><Plus size={18} /></button>
        <button className="text-button" data-tour="full-map-readable" onClick={() => changeZoom(1)}>100%</button>
      </div>
    </div>
    <p className="full-roadmap-hint" id="full-roadmap-help">Zoom to read. Drag or scroll to explore. Viewing never changes progress.</p>
    <div className={`full-roadmap-viewport ${dragging ? 'is-dragging' : ''}`} ref={viewport} data-tour="full-map-canvas"
      role="region" aria-label="Full roadmap canvas" aria-describedby="full-roadmap-help" tabIndex={0}
      {...panProps}>
      <div className="full-roadmap-space">
        <div className="full-roadmap-plane" data-ready={size.ready} style={{ width: size.width * zoom, height: size.height * zoom }}>
          <div className="full-roadmap-graph" ref={graph} style={{ transform: `scale(${zoom})` }}>
            <Diagram edges={edges} className="full-roadmap-connections">
              <div className="full-roadmap-stages">
                {groups.map(group => <section key={group.id} data-full-stage={group.id}
                  data-diagram-node={stageNodeId(group.id)} className={`full-roadmap-stage ${group.optional ? 'optional' : ''}`} style={{ width: group.width }}>
                  <header className="full-roadmap-stage-heading">
                    <span>{group.optional ? 'Optional reference' : group.checkpoints.length ? `${group.checkpoints.length} ${group.checkpoints.length === 1 ? 'checkpoint' : 'checkpoints'}` : mission.planned ? 'Planning reference' : 'Parallel / supporting work'}</span>
                    <h3>{group.title}</h3>
                  </header>
                  {group.levels.map((level, index) => <div className="full-roadmap-level" key={index}>
                    {level.map(checkpoint => {
                      const status = statusOf(checkpoint);
                      return <button key={checkpoint.id} ref={node => registerNode(checkpoint.id, node)}
                        className={`full-roadmap-node ${status}`} data-diagram-node={checkpoint.id}
                        data-full-checkpoint={checkpoint.id} data-full-current={status === 'current' ? 'true' : undefined}
                        data-tour={checkpoint.id === mission.checkpoints.at(-1)?.id ? 'full-map-last-node' : undefined}
                        aria-current={status === 'current' ? 'step' : undefined} aria-pressed={selected?.id === checkpoint.id}
                        onClick={() => { setSelectedReferenceId(null); setSelectedId(checkpoint.id); setDetailsOpen(true); }}>
                        <span className="full-roadmap-state">{status === 'complete' ? <Check size={16} /> : status === 'current' ? <Flag size={16} /> : status === 'reference' ? <BookOpen size={16} /> : <LockKeyhole size={16} />}
                          {status === 'complete' ? 'Completed' : status === 'current' ? 'Current checkpoint' : status === 'available' ? 'Available' : status === 'reference' ? 'Not tracked' : 'Locked'}</span>
                        <strong>{checkpoint.sourceId && !checkpoint.title.startsWith(checkpoint.sourceId) ? `${checkpoint.sourceId} · ` : ''}{checkpoint.title}</strong>
                        {status === 'current' && <span className="full-roadmap-here">You are here</span>}
                      </button>;
                    })}
                  </div>)}
                  {!group.checkpoints.length && !references.some(unit => unit.stageId === group.id) && <div className="full-roadmap-reference" data-full-reference>
                    <p>{group.summary}</p>
                    <ul>{group.topics.map(topic => <li key={topic}>{topic}</li>)}</ul>
                    <strong>Reference only; no completion credit.</strong>
                  </div>}
                  {references.some(unit => unit.stageId === group.id) && <div className="full-roadmap-case-bank">
                    <h4>{mission.id === 'system' ? '15 case-study exercises' : 'Practice and reference material'}</h4><p>Choose independently. These are practice references, not required serial checkpoints.</p>
                    {references.filter(unit => unit.stageId === group.id).map(unit => <button key={unit.id} className="full-roadmap-case-node"
                      data-system-case={mission.id === 'system' ? unit.id : undefined}
                      data-pack-reference={mission.id !== 'system' ? unit.id : undefined}
                      ref={node => registerNode(caseNodeId(unit.id), node)} aria-pressed={selectedReferenceId === unit.id}
                      onClick={() => { setSelectedId(undefined); setSelectedReferenceId(unit.id); setDetailsOpen(true); }}>
                      <span className="full-roadmap-state"><BookOpen size={16} />{unit.sourceId} / Reference</span><strong>{unit.title}</strong>
                    </button>)}
                  </div>}
                </section>)}
                {!groups.length && <p className="diagram-pending">This roadmap has no defined stages or checkpoints yet. No progress has been invented.</p>}
              </div>
            </Diagram>
          </div>
        </div>
      </div>
    </div>
    <MapInspector title={selectedReference?.title ?? selected?.title ?? 'Roadmap details'}
      expanded={inspectorExpanded ?? detailsOpen} onExpandedChange={onInspectorExpandedChange}>
      {preview ? <p className="full-roadmap-summary">
        {savedProgress.status === 'completed' ? `Your saved v${savedMission.roadmapVersion} tracker is complete.` : <>Saved v{savedMission.roadmapVersion} checkpoint: <strong>{savedCheckpoint?.title}</strong>.</>}
        {' '}Progress unchanged.
      </p> : !current && <p className="full-roadmap-summary">{progress?.status === 'completed' ? 'All tracked checkpoints complete. Your saved work is preserved.' : 'Planning / reference material only. There is no current checkpoint.'}</p>}
      {selected && <div>
        <div className="full-roadmap-selection"><span>{selected.id === current?.id ? 'Your current checkpoint' : 'Inspect checkpoint'}</span><strong>{selected.title}</strong></div>
        <div className="full-roadmap-details"><p>{selected.action}</p><h4>Completion criteria</h4><ul>{selected.criteria.map(criterion => <li key={criterion}>{criterion}</li>)}</ul>
          {prerequisitesFor(mission, selected).length > 0 && <p><strong>Requires: </strong>{prerequisitesFor(mission, selected).map(id => mission.checkpoints.find(checkpoint => checkpoint.id === id)?.title).join(', ')}</p>}
          {!!selected.topics?.length && <><h4>Topics</h4><ul>{selected.topics.map(topic => <li key={topic}>{topic}</li>)}</ul></>}
          {studySection && <p><a className="text-link" href={`#/dsa/${studySection.number}`}>Open this topic's practice set</a></p>}
          {systemPractice && <p><a className="text-link" href={`#/system-practice/${systemPractice.id}`}>Open these design exercises</a></p>}
          {packPractice && <p><a className="text-link" href={packUnitHref(mission.id, packPractice.id)}>Open this checkpoint's study material and exercises</a></p>}
          <p>View only. Record evidence from the mission page to update progress.</p>
        </div>
      </div>}
      {selectedReference && <div>
        <div className="full-roadmap-selection"><span>Independent practice / reference</span><strong>{selectedReference.title}</strong></div>
        <div className="full-roadmap-details"><p>{selectedReference.summary}</p>
          <p>Independently selectable practice, not a required serial checkpoint. This inspection records no completion.</p>
          <a className="text-link" href={selectedReference.href}>{mission.id === 'system' ? 'Open this case-study exercise' : 'Open this practice or reference unit'}</a>
        </div>
      </div>}
      {mission.roadmapVersion !== getLatestMission(mission.id).roadmapVersion && <p className="full-roadmap-summary">This is your saved v{mission.roadmapVersion} roadmap. <a href={`#/sources/${mission.id}`}>Review the newer operation documents</a> before adopting a different version.</p>}
    </MapInspector>
  </>;
}

import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUpRight, FileDown, GitBranch } from 'lucide-react';
import { getMission, getMissions } from '../domain/catalog';
import { getSaveState } from '../domain/engine';
import type { AppState, MissionId, MissionMode } from '../domain/types';
import { MissionIcon, PageHeading } from '../components';
import { Diagram } from './Diagram';
import type { DiagramEdge } from './Diagram';
import { MissionFlowchart } from './MissionFlowchart';
import { missionAccentStyle } from '../missionVisuals';
import { AcademicBasis } from '../omscs/AcademicBasis';

const groupNames: Record<MissionMode, string> = { active: 'In focus', background: 'Background', planned: 'Planned' };

export function RoadmapPage({ state }: { state: AppState }) {
  const [onlyActive, setOnlyActive] = useState(false);
  const [selection, setSelection] = useState<MissionId>(state.focusMissionId);
  const detail = useRef<HTMLElement>(null);
  const visible = useMemo(() => getMissions(state).filter(mission => !onlyActive || state.missions[mission.id].mode === 'active'), [onlyActive, state]);
  const groups = useMemo(() => (['active', 'background', 'planned'] as const).map(mode => ({
    mode, missions: visible.filter(mission => state.missions[mission.id].mode === mode),
  })).filter(group => group.missions.length), [visible, state.missions]);
  const selected = visible.find(mission => mission.id === selection) ?? visible[0];
  const edges = useMemo<DiagramEdge[]>(() => groups.flatMap(group => [
    { from: 'goal', to: `group-${group.mode}`, kind: 'root' },
    ...group.missions.map(mission => ({ from: `group-${group.mode}`, to: `mission-${mission.id}`, kind: 'member' as const })),
  ]), [groups]);

  function selectMission(id: MissionId) {
    setSelection(id);
    requestAnimationFrame(() => detail.current?.scrollIntoView({
      block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    }));
  }

  return <>
    <PageHeading eyebrow="CAREER MAP" title="Roadmap" help="Select a mission to inspect its checkpoint sequence. Branches group focus modes, not prerequisite dependencies; reading a map changes no progress.">
      <button className="button secondary" onClick={() => window.print()}><FileDown size={16} />Print roadmap</button>
    </PageHeading>
    <div className="roadmap-map-toolbar"><span><GitBranch size={15} />Top-down tree</span><label className="checkbox-label"><input type="checkbox" checked={onlyActive} onChange={event => setOnlyActive(event.target.checked)} />In-focus missions only</label></div>
    <figure className="roadmap-tree" data-tour="master-roadmap" aria-label="Career goal and mission tree" aria-describedby="roadmap-tree-description">
      <Diagram edges={edges} className="tree-canvas">
        <div className="tree-goal" data-diagram-node="goal"><span>CAREER GOAL</span><h2>{state.objective}</h2></div>
        <div className="tree-branches" data-count={groups.length}>
          {groups.map(group => <section className="tree-branch" key={group.mode} aria-label={`${groupNames[group.mode]} missions`}>
            <h3 className="tree-group" data-diagram-node={`group-${group.mode}`}>{groupNames[group.mode]}<span>{group.missions.length}</span></h3>
            <ul className="tree-missions">
              {group.missions.map(mission => {
                const save = getSaveState(mission, state);
                return <li key={mission.id}>
                  <button className={`tree-mission ${mission.color} ${selected?.id === mission.id ? 'selected' : ''}`} style={missionAccentStyle(mission.id)} data-diagram-node={`mission-${mission.id}`} data-mission={mission.id} aria-label={`View ${mission.name} flowchart`} aria-pressed={selected?.id === mission.id} onClick={() => selectMission(mission.id)}>
                    <MissionIcon mission={mission} size={18} /><span className="tree-mission-copy"><strong>{mission.name}</strong><small>{save.checkpoint?.title ?? 'Roadmap pending'}</small></span><ArrowDown size={15} />
                  </button>
                </li>;
              })}
            </ul>
          </section>)}
        </div>
        {!groups.length && <p className="diagram-pending">No missions are in focus. Clear the filter to see all missions.</p>}
      </Diagram>
      <figcaption id="roadmap-tree-description" className="sr-only">Missions grouped by focus setting, not prerequisites.</figcaption>
    </figure>
    {selected && <section className="roadmap-selected" ref={detail} aria-label="Selected mission flowchart" tabIndex={-1}>
      <div className="roadmap-selected-heading"><div><span className="eyebrow">{selected.operation}</span><h2>{selected.name}</h2></div><a className="button secondary" href={`#/mission/${selected.id}`} aria-label={`Open ${selected.name} mission`}>Open mission<ArrowUpRight size={15} /></a></div>
      {selected.id === 'omscs' && <AcademicBasis state={state} />}
      <MissionFlowchart key={selected.id} mission={selected} state={state} />
      {selected.dependencies.length > 0 && <div className="flow-related"><span>Related skills, not unlock gates:</span>{selected.dependencies.map(id => <a key={id} href={`#/mission/${id}`}>{getMission(id).name}<ArrowUpRight size={12} /></a>)}</div>}
    </section>}
  </>;
}

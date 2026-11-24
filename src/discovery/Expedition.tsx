import { useRef, useState } from 'react';
import { ArrowRight, Check, Compass, Feather, Flag, LockKeyhole } from 'lucide-react';
import { checkpointIdentity, getMissions } from '../domain/catalog';
import { getSaveState } from '../domain/engine';
import type { AppState, MissionId } from '../domain/types';
import type { DiscoverySnapshot } from './model';
import { wayfinderRewards } from './model';
import { useAtlasVisibility } from './motion';

export function Expedition({ state, snapshot, onRecord }: {
  state: AppState; snapshot: DiscoverySnapshot; onRecord: (missionId: MissionId) => void;
}) {
  const [selectedId, setSelectedId] = useState(state.focusMissionId);
  const ref = useRef<HTMLElement>(null);
  const visibility = useAtlasVisibility(ref);
  const routes = getMissions(state).filter(mission => !mission.planned && state.missions[mission.id].mode !== 'planned');
  const mission = routes.find(route => route.id === selectedId) ?? routes[0];
  if (!mission) return <section ref={ref} className="atlas-expedition" data-tour="discovery-next" data-atlas-visible={visibility.visible}>
    <span className="wayfinder-overline">YOUR NEXT EXPEDITION</span><h3>No available route yet.</h3>
    <p>Choose an available mission in Missions. Planned routes are not activated by the Atlas.</p>
    <a className="atlas-expedition-link" href="#/missions">Open Missions<ArrowRight size={14} /></a>
  </section>;

  const progress = state.missions[mission.id];
  const save = getSaveState(mission, state);
  const checkpoint = save.checkpoint;
  const index = checkpoint ? mission.checkpoints.findIndex(item => item.id === checkpoint.id) : -1;
  const trailStart = Math.max(0, Math.min(index - 2, mission.checkpoints.length - 5));
  const trail = mission.checkpoints.slice(trailStart, trailStart + 5);
  const identity = checkpoint ? checkpointIdentity(mission.id, checkpoint.id, mission.roadmapVersion) : null;
  const practiced = identity !== null && snapshot.journey.practiced.has(identity);
  const completed = identity !== null && snapshot.journey.completed.has(identity);
  const finished = progress.status === 'completed';
  const canRecord = !!checkpoint && !finished && !progress.blocker.trim();

  return <section ref={ref} className="atlas-expedition" data-tour="discovery-next" data-expedition={mission.id} data-atlas-visible={visibility.visible} data-atlas-playable={canRecord}>
    <div className="atlas-expedition-top"><span><Compass size={14} />YOUR NEXT EXPEDITION</span>
      <label><span className="wayfinder-viewer-sr-only">Expedition route</span><select aria-label="Expedition route" value={mission.id} onChange={event => {
        const route = routes.find(item => item.id === event.currentTarget.value);
        if (!route) throw new Error('Unknown expedition route.');
        setSelectedId(route.id);
      }}>{routes.map(route => <option key={route.id} value={route.id}>{route.operation}</option>)}</select></label>
    </div>
    <div className="atlas-expedition-position"><span>{mission.name}</span><strong>{save.completed} / {save.total} checkpoints</strong></div>
    <h3>{progress.blocker.trim() ? 'A blocker on this route.' : finished ? 'This route is in your wake.' : checkpoint?.title ?? 'No actionable checkpoint on this route.'}</h3>
    <p>{progress.blocker.trim() || (finished ? 'Your saved work stays here. Choose another expedition whenever you are ready.' : checkpoint?.action ?? 'Open the mission to inspect its roadmap before recording work.')}</p>
    {trail.length > 0 && <ol className="atlas-expedition-trail" aria-label="Nearby checkpoint positions, not prerequisite links">
      {trail.map((point, offset) => {
        const done = progress.completedCheckpointIds.includes(point.id);
        const here = point.id === checkpoint?.id && !finished;
        return <li key={point.id} data-checkpoint-state={done ? 'done' : here ? 'current' : 'ahead'}>
          <span className="atlas-waypoint">{done ? <Check size={13} aria-hidden="true" /> : <span aria-hidden="true">{trailStart + offset + 1}</span>}</span>
          <small aria-hidden="true">{done ? 'DONE' : here ? 'HERE' : 'AHEAD'}</small>
          <span className="wayfinder-viewer-sr-only">{point.title}: {done ? 'completed' : here ? 'current checkpoint' : 'on this route'}</span>
        </li>;
      })}
    </ol>}
    {checkpoint && !finished && <div className="atlas-expedition-awards" role="group" aria-label="Checkpoint EXP awards">
      <span data-checkpoint-award="practice" data-earned={practiced}>{practiced ? <Check size={13} /> : <Feather size={13} />}{practiced ? 'Trace recorded' : `+${wayfinderRewards.practice.xp} first trace`}</span>
      <span data-checkpoint-award="completion" data-earned={completed}>{completed ? <Check size={13} /> : <Flag size={13} />}{completed ? 'Finish recorded' : `+${wayfinderRewards.completion.xp} criteria-confirmed finish`}</span>
    </div>}
    <div className="atlas-expedition-actions">
      {canRecord && <button className="atlas-expedition-record" data-tour="expedition-record" onClick={() => onRecord(mission.id)}>Record real work<ArrowRight size={15} /></button>}
      <a className="atlas-expedition-link" href={finished ? '#/evidence' : `#/mission/${mission.id}`}>
        {finished ? 'Revisit saved work' : progress.blocker.trim() ? <><LockKeyhole size={13} />Inspect the blocker</> : 'Open checkpoint & criteria'}<ArrowRight size={14} />
      </a>
    </div>
    <details className="atlas-expedition-help"><summary>Small steps count. Finishing is separate.</summary>
      <p>Do the actual work first. Saving practice does not complete this checkpoint; completion still requires the normal criteria confirmation. Choosing a route here changes only this view, not mission focus. Repeated same-checkpoint notes do not farm EXP.</p>
    </details>
  </section>;
}

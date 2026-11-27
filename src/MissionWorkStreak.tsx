import { CalendarDays } from 'lucide-react';
import { getMissionActivity } from './domain/missionActivity';
import type { AppState, Mission } from './domain/types';
import { missionAccentStyle } from './missionVisuals';
import { ContextHelp } from './ContextHelp';
import { FireMotionButton, StreakFire } from './streaks/StreakFire';
import './mission-activity.css';

export function MissionWorkStreak({ mission, state }: { mission: Mission; state: AppState }) {
  const activity = getMissionActivity(state, mission.id);
  return <section className="mission-work-streak" style={missionAccentStyle(mission.id)}
    aria-label={`${mission.name} recorded work streak`} data-mission-id={mission.id}
    data-worked-today={activity.workedToday} data-work-streak={activity.streak}
    data-streak-state={activity.streak > 0 ? 'burning' : 'out'}>
    <StreakFire burning={activity.streak > 0} />
    <div className="mission-work-streak-summary">
      <span className="mission-work-streak-label"><CalendarDays size={17} aria-hidden="true" />Recorded streak</span>
      <strong>{activity.streak} {activity.streak === 1 ? 'day' : 'days'}</strong>
      <p>{activity.workedToday ? 'Work recorded today' : 'No work recorded today'}
        {activity.lastWorkedOn && !activity.workedToday ? ` · Last recorded day: ${activity.lastWorkedOn}` : ''}</p>
    </div>
    <div className="mission-work-streak-tools"><ContextHelp title="Recorded-work streak" tour="mission-work-streak">
      <p>Saving progress/evidence or any recall review counts as work for this mission. Multiple records
        on one local calendar day count once. Browsing, timers, settings and plan creation do not count.</p>
      <p>If today has no record yet, a streak ending yesterday remains available until today ends.
        This measures recorded work days, not attention or mastery.</p>
      <a className="text-link" href="#/streaks">View all streaks and activity history</a>
    </ContextHelp>
      {activity.streak > 0 && <FireMotionButton compact />}
    </div>
  </section>;
}

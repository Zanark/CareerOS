import { useMemo } from 'react';
import { Clock3, Maximize2, Pause, Play, RotateCcw } from 'lucide-react';
import type { AppState } from '../domain/types';
import { focusSessionSummary } from '../domain/focusSession';
import type { FocusSessionController } from './focusTypes';
import { FocusPlaylist } from './FocusPlaylist';
import './focus-timer.css';

export function focusTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
}

export function FocusTimer({ session, state, onOpen }: {
  session: FocusSessionController; state: AppState; onOpen: () => void;
}) {
  const history = useMemo(() => {
    const records = state.focusSessions ?? [];
    return {
      sessions: records.length,
      reports: records.reduce((count, record) => count + record.events.filter(event => event.kind === 'distraction').length, 0),
      recent: [...records].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt)).slice(0, 10)
        .map(record => ({ record, summary: focusSessionSummary(record) })),
    };
  }, [state.focusSessions]);
  const { remaining, running, duration, toggle, reset } = session;
  return <section className="focus-timer panel" data-tour="focus-timer">
    <div className="focus-top"><span className="eyebrow"><span className={`status-dot ${running ? 'pulsing' : ''}`} />FOCUS TIMER</span><span className="timer-tab-note">THIS TAB</span></div>
    <div className="timer-time" role="timer" aria-live="off" aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}>{focusTime(remaining)}</div>
    <p>{remaining === 0 ? 'Timer finished. No learning completion was awarded.' : 'The timer does not automatically record learning progress.'}</p>
    <div className="timer-buttons">
      <button className="button primary" data-tour="focus-start" onClick={toggle} disabled={session.pendingSave}>
        {running ? <Pause size={15} /> : <Play size={15} />}
        {running ? 'Pause session' : session.phase === 'paused' ? 'Continue session' : 'Start focus session'}
      </button>
      <button className="icon-button" aria-label="Reset focus timer" title="Reset the clock; saved focus reports stay in your history" onClick={reset} disabled={session.pendingSave}><RotateCcw size={16} /></button>
    </div>
    <button className="button secondary focus-room-launch" data-tour="focus-room-open" onClick={onOpen}><Maximize2 size={16} />Full screen focus</button>
    <p className="focus-saved-count">{session.hasRecordedSession ? `${session.distractionLabel}: ${session.distractionCount} distraction ${session.distractionCount === 1 ? 'report' : 'reports'}. ` : ''}
      Reports save when you press the button in the focus room, not when the session ends.</p>
    {session.error && <p className="focus-timer-error" role="alert">{session.error}</p>}
    {session.pendingSave && <button className="button secondary" onClick={session.retrySave}>Retry saving session end</button>}
    <FocusPlaylist />
    <details className="focus-history" data-tour="focus-history">
      <summary><Clock3 size={15} />Focus history: {history.sessions} sessions / {history.reports} reports</summary>
      <p>Self-reported distractions, not measured attention. An open record without an ending is not proof the timer continued after the tab closed.</p>
      {history.recent.length ? <ol>{history.recent.map(({ record, summary }) => <li key={record.id}>
        <details>
          <summary>{new Date(record.startedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            {' / '}{record.plannedSeconds / 60} min / {summary.distractions.length} reports
          </summary>
          <p>{summary.outcome === 'completed' ? 'Timer elapsed' : summary.outcome === 'reset' ? 'Clock reset; reports retained' : 'No ending recorded'}.
            {' '}Last saved running-clock time: {focusTime(summary.elapsedMs / 1000)}.</p>
          {summary.distractions.length > 0 && <ul>{summary.distractions.map(event => <li key={event.id}>
            {new Date(event.at).toLocaleTimeString()} / timer +{focusTime(event.elapsedMs / 1000)}{event.whilePaused ? ' / reported while paused' : ''}
          </li>)}</ul>}
        </details>
      </li>)}</ol> : <p>No focus sessions have been recorded yet.</p>}
      {history.sessions > history.recent.length && <p>Showing the latest {history.recent.length}; all {history.sessions} sessions remain in your export.</p>}
      <p><a className="text-link" href="#/settings">Export the full focus and distraction log</a></p>
    </details>
    <span className="sr-only">The next new session uses your current capacity. The running session keeps its original {duration}-minute length.</span>
  </section>;
}

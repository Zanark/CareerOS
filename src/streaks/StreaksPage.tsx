import { useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Flame, History, Layers3, Trophy } from 'lucide-react';
import { ContextHelp, MissionIcon, PageHeading } from '../components';
import { getMissions } from '../domain/catalog';
import { localDate } from '../domain/engine';
import { getRecordedWorkHistory } from '../domain/missionActivity';
import type { AppState, MissionId } from '../domain/types';
import { missionAccentStyle } from '../missionVisuals';
import { FireMotionButton, StreakFire } from './StreakFire';
import './streaks.css';

function dayDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  return date;
}

function dayLabel(value: string, full = false) {
  return dayDate(value).toLocaleDateString('en', { month: full ? 'long' : 'short', day: 'numeric', year: 'numeric' });
}

function monthDays(year: number, month: number) {
  const cursor = new Date(0);
  cursor.setFullYear(year, month, 1);
  cursor.setHours(12, 0, 0, 0);
  const leading = (cursor.getDay() + 6) % 7;
  const days: string[] = [];
  while (cursor.getMonth() === month) {
    days.push(localDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return { leading, days };
}

export default function StreaksPage({ state, date }: { state: AppState; date: string }) {
  const missions = getMissions(state);
  const [filter, setFilter] = useState<MissionId | 'all'>('all');
  const [year, setYear] = useState(() => dayDate(date).getFullYear());
  const [selectedDay, setSelectedDay] = useState(date);
  const [view, setView] = useState<'calendar' | 'runs'>('calendar');
  const [runLimit, setRunLimit] = useState(12);
  const dayButtons = useRef(new Map<string, HTMLButtonElement>());
  const global = useMemo(() => getRecordedWorkHistory(state, undefined, dayDate(date)), [state, date]);
  const history = useMemo(() => filter === 'all' ? global : getRecordedWorkHistory(state, filter, dayDate(date)), [state, date, filter, global]);
  const running = useMemo(() => getMissions(state).map(mission => ({
    mission, history: getRecordedWorkHistory(state, mission.id, dayDate(date)),
  })).filter(item => item.history.streak > 0).sort((a, b) => b.history.streak - a.history.streak), [state, date]);
  const years = [...new Set([dayDate(date).getFullYear(), year, ...history.days.map(day => dayDate(day.date).getFullYear())])].sort((a, b) => b - a);
  const daysByDate = new Map(history.days.map(day => [day.date, day]));
  const selected = daysByDate.get(selectedDay);
  const yearly = history.days.filter(day => dayDate(day.date).getFullYear() === year);
  const records = [
    ...state.evidence.filter(record => selected?.evidenceIds.includes(record.id)).map(record => ({
      id: `evidence-${record.id}`, title: record.title, detail: record.summary, missionId: record.missionId, href: `#/evidence/${record.id}`, kind: 'Saved work',
    })),
    ...state.recalls.filter(record => selected?.recallIds.includes(record.id)).map(record => ({
      id: `recall-${record.id}`, title: 'Recall practice', detail: record.notes, missionId: record.missionId, href: '#/recall', kind: record.outcome.replaceAll('-', ' '),
    })),
  ];
  const runs = [...history.runs].reverse();
  const monthNames = Array.from({ length: 12 }, (_, month) => {
    const first = monthDays(year, month).days[0];
    return dayDate(first).toLocaleDateString('en', { month: 'long' });
  });

  function chooseYear(next: number) {
    setYear(next);
    setSelectedDay(next === dayDate(date).getFullYear() ? date : monthDays(next, 0).days[0]);
  }

  function moveDay(event: KeyboardEvent<HTMLButtonElement>, value: string) {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 };
    if (!(event.key in steps)) return;
    event.preventDefault();
    const next = dayDate(value);
    next.setDate(next.getDate() + steps[event.key]);
    const key = localDate(next);
    if (next.getFullYear() !== year || next > dayDate(date)) return;
    setSelectedDay(key);
    dayButtons.current.get(key)?.focus();
  }

  return <div className="streaks-page">
    <PageHeading eyebrow="THE EMBER ATLAS" title="Streaks" help={<>
      <p>Every saved evidence entry or recall review adds to its actual local calendar day. One day counts once in a streak; brighter cells contain more saved entries.</p>
      <p>Yesterday-ending runs can continue today. Timers, browsing and settings add no days. This is recorded activity, not assessed mastery. Fire can be paused for this visit and respects your system's reduced-motion preference.</p>
    </>}><FireMotionButton /><a className="button primary" href="#/missions">Open missions<ArrowRight size={16} /></a></PageHeading>

    <section className="streak-overview" aria-label="Recorded activity overview">
      <div className="streak-overview-feature" data-burning={running.length > 0}>
        <StreakFire burning={running.length > 0} variant="hero" />
        <div><span className="eyebrow">{running.length ? 'KEEP THE FIRE GOING' : 'A QUIET FIREPIT'}</span>
          <strong>{global.streak}<small>{global.streak === 1 ? 'day' : 'days'} in a row</small></strong>
          <p>{global.workedToday ? 'Work recorded today.' : global.streak ? 'Your run is still open today.' : 'Your next recorded day starts a new run.'}</p>
        </div>
      </div>
      <div className="streak-stat"><Flame size={20} /><strong>{running.length}</strong><span>Running missions</span></div>
      <div className="streak-stat"><Trophy size={20} /><strong>{global.longestStreak}</strong><span>Longest recorded run</span></div>
      <div className="streak-stat"><CalendarDays size={20} /><strong>{global.days.length}</strong><span>Recorded days</span></div>
    </section>

    {running.length > 0 && <section className="streak-running" aria-labelledby="running-streaks-title">
      <div className="section-title"><h2 id="running-streaks-title">Fires still burning</h2><span className="small">{running.length} running</span></div>
      <div className="streak-running-grid">{running.map(({ mission, history: activity }) => {
        const run = activity.runs.at(-1)!;
        return <a key={mission.id} href={`#/mission/${mission.id}`} className="streak-running-card"
          style={missionAccentStyle(mission.id)} data-mission-id={mission.id} data-work-streak={activity.streak}>
          <StreakFire burning />
          <div className="streak-running-heading"><MissionIcon mission={mission} /><span>{mission.name}</span><ArrowRight size={16} /></div>
          <strong>{activity.streak}<small>{activity.streak === 1 ? 'day' : 'days'}</small></strong>
          <span className="streak-running-range"><time dateTime={run.start}>{dayLabel(run.start)}</time><span>to</span><time dateTime={run.end}>{dayLabel(run.end)}</time></span>
          <span className="streak-running-today">{activity.workedToday ? 'Recorded today' : 'Can continue today'}</span>
        </a>;
      })}</div>
    </section>}

    <section className="streak-ledger" aria-labelledby="streak-ledger-title">
      <div className="streak-ledger-toolbar">
        <div><span className="eyebrow">YOUR RECORDED RHYTHM</span><h2 id="streak-ledger-title">The days you showed up</h2></div>
        <label className="streak-filter"><span>Mission</span><select value={filter} onChange={event => {
          const value = event.target.value;
          if (value === 'all') setFilter('all');
          else {
            const mission = missions.find(item => item.id === value);
            if (!mission) throw new Error('Unknown streak mission filter.');
            setFilter(mission.id);
          }
          setRunLimit(12);
        }}><option value="all">All recorded work</option>{missions.map(mission => <option value={mission.id} key={mission.id}>{mission.name}</option>)}</select></label>
      </div>
      <div className="streak-ledger-controls">
        <div className="segmented" role="group" aria-label="Streaks view">
          <button type="button" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}><CalendarDays size={16} />Activity calendar</button>
          <button type="button" aria-pressed={view === 'runs'} onClick={() => setView('runs')}><History size={16} />Run history</button>
        </div>
        {view === 'calendar' && <div className="streak-year-controls">
          <button type="button" className="icon-button" aria-label="Previous recorded year" disabled={years.indexOf(year) === years.length - 1} onClick={() => chooseYear(years[years.indexOf(year) + 1])}><ChevronLeft size={18} /></button>
          <label><span className="sr-only">Activity year</span><select value={year} onChange={event => chooseYear(Number(event.target.value))}>{years.map(value => <option value={value} key={value}>{value}</option>)}</select></label>
          <button type="button" className="icon-button" aria-label="Next recorded year" disabled={years.indexOf(year) === 0} onClick={() => chooseYear(years[years.indexOf(year) - 1])}><ChevronRight size={18} /></button>
        </div>}
      </div>
      {view === 'calendar' ? <>
        <div className="streak-calendar-caption"><span>{yearly.length} recorded {yearly.length === 1 ? 'day' : 'days'} in {year}</span>
          <span className="streak-intensity-key" aria-label="Brightness represents saved entry count">Quiet{[0, 1, 2, 3, 4].map(level => <i key={level} data-intensity={level} />)}More work</span></div>
        <p id="streak-calendar-keys" className="sr-only">Use arrow keys to explore days. Choose a day to inspect its saved entries below the calendar.</p>
        <div className="streak-months" aria-label={`${year} recorded work calendar`}>
          {monthNames.map((name, month) => {
            const grid = monthDays(year, month);
            const count = grid.days.filter(value => daysByDate.has(value)).length;
            return <section className="streak-month" key={`${year}-${month}`} aria-label={`${name} ${year}`}>
              <div className="streak-month-heading"><h3>{name}</h3><span>{count}<small>days</small></span></div>
              <div className="streak-weekdays" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <span key={index}>{day}</span>)}</div>
              <div className="streak-month-days" role="group" aria-label={`${name} recorded days`}>
                {Array.from({ length: grid.leading }, (_, index) => <span key={`space-${index}`} aria-hidden="true" />)}
                {grid.days.map(value => {
                  const day = daysByDate.get(value), entries = (day?.evidenceIds.length ?? 0) + (day?.recallIds.length ?? 0);
                  const future = dayDate(value) > dayDate(date);
                  const intensity = Math.min(4, Math.ceil(Math.log2(entries + 1)));
                  return <button key={value} type="button" ref={element => { if (element) dayButtons.current.set(value, element); else dayButtons.current.delete(value); }}
                    className="streak-day" disabled={future} data-date={value} data-intensity={intensity} data-today={value === date}
                    aria-label={`${dayLabel(value, true)}: ${future ? 'future day' : `${entries} saved ${entries === 1 ? 'entry' : 'entries'}`}`}
                    aria-pressed={selectedDay === value} aria-describedby="streak-calendar-keys" tabIndex={selectedDay === value ? 0 : -1}
                    title={`${dayLabel(value, true)} · ${entries} saved entries`}
                    onFocus={() => setSelectedDay(value)} onClick={() => setSelectedDay(value)} onKeyDown={event => moveDay(event, value)}>
                    <span>{dayDate(value).getDate()}</span>
                  </button>;
                })}
              </div>
            </section>;
          })}
        </div>
        <section className="streak-day-detail" aria-labelledby="streak-day-title">
          <div className="section-title"><div><span className="eyebrow">RECORDED WORK</span><h2 id="streak-day-title">{dayLabel(selectedDay, true)}</h2></div><span className="small">{records.length} saved {records.length === 1 ? 'entry' : 'entries'}</span></div>
          {records.length ? <div className="streak-records">{records.map(record => <a key={record.id} href={record.href} className="streak-record">
            <span className="streak-record-kind"><Layers3 size={15} />{missions.find(mission => mission.id === record.missionId)!.name}<span>{record.kind}</span></span>
            <strong>{record.title}</strong>{record.detail && <p>{record.detail}</p>}<ArrowRight size={16} />
          </a>)}</div> : <p className="streak-empty-day">No work recorded for this day{filter === 'all' ? '.' : ' in this mission.'}</p>}
        </section>
      </> : <div className="streak-run-history">
        {runs.length ? <ol>{runs.slice(0, runLimit).map(run => <li key={run.start} data-running={run.running}>
          <span className="streak-run-marker" aria-hidden="true" /><div><span className="streak-run-state">{run.running ? 'Running' : 'Recorded run'}</span>
            <h3><time dateTime={run.start}>{dayLabel(run.start)}</time><ArrowRight size={16} /><time dateTime={run.end}>{dayLabel(run.end)}</time></h3></div>
          <strong>{run.days}<small>{run.days === 1 ? 'day' : 'days'}</small></strong>
        </li>)}</ol> : <p className="streak-empty-day">No recorded runs yet.</p>}
        {runs.length > runLimit && <button className="button secondary" onClick={() => setRunLimit(value => value + 12)}>Show older runs</button>}
      </div>}
    </section>
    <div className="streak-page-note"><ContextHelp title="Recorded streaks and activity history"><p>All recorded work combines local days across missions; a mission filter shows only its own records. Roadmap editions do not erase earlier recorded days. A run ends when a calendar day is missed; a run ending yesterday remains open today.</p><p>These are your saved activity records, not verified learning or an obligation to work every day. Empty days stay honest, and your history is never reset by this page.</p></ContextHelp><span>Recorded activity, not a mastery score.</span></div>
  </div>;
}

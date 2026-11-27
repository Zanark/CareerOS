import { StreakFire } from './streaks/StreakFire';
import './header-calendar.css';

export function HeaderCalendar({ date, burning }: { date: string; burning: boolean }) {
  const day = new Date(`${date}T12:00:00`);
  const label = day.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

  return <a className="header-calendar" href="#/streaks" data-weekend={isWeekend} data-burning={burning}
    aria-label={`View recorded streaks. Today, ${label}`}>
    <time className="topbar-date" dateTime={date} title={label}>
      <span className="sr-only">Today, {label}</span>
      <span className="topbar-date-month" aria-hidden="true">
        <span className="calendar-label-full">{day.toLocaleDateString('en', { month: 'long' })}</span>
        <span className="calendar-label-short">{day.toLocaleDateString('en', { month: 'short' })}</span>
      </span>
      <span className="calendar-core" aria-hidden="true">
        {burning && <StreakFire burning variant="calendar" />}
        <span className="calendar-binding calendar-binding--left" />
        <span className="calendar-binding calendar-binding--right" />
        <span key={date} className="calendar-page"><strong>{day.getDate()}</strong></span>
      </span>
      <span className="topbar-date-weekday" aria-hidden="true">
        <span className="calendar-label-full">{day.toLocaleDateString('en', { weekday: 'long' })}</span>
        <span className="calendar-label-short">{day.toLocaleDateString('en', { weekday: 'short' })}</span>
      </span>
    </time>
  </a>;
}

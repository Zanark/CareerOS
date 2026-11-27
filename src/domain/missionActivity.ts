import { localDate } from './engine';
import { timestampSchema } from './legacyState';
import type { AppState, MissionId } from './types';

export interface MissionActivitySummary {
  asOfDate: string;
  workedToday: boolean;
  streak: number;
  lastWorkedOn: string | null;
}

export interface RecordedWorkDay {
  date: string;
  evidenceIds: string[];
  recallIds: string[];
  missionIds: MissionId[];
}

export interface RecordedWorkRun {
  start: string;
  end: string;
  days: number;
  running: boolean;
}

export interface RecordedWorkHistory extends MissionActivitySummary {
  days: RecordedWorkDay[];
  runs: RecordedWorkRun[];
  longestStreak: number;
}

function calendarDay(date: Date): number {
  // Put local date components on a UTC axis so DST never changes a day's step size.
  const day = new Date(0);
  day.setUTCFullYear(date.getFullYear(), date.getMonth(), date.getDate());
  return day.getTime() / 86_400_000;
}

function recordedDays(
  state: Pick<AppState, 'evidence' | 'recalls'>,
  now: Date,
  missionId?: MissionId,
) {
  const today = calendarDay(now);
  const days = new Map<number, RecordedWorkDay>();
  for (const [kind, records] of [['evidenceIds', state.evidence], ['recallIds', state.recalls]] as const) {
    for (const record of records) {
      if (missionId && record.missionId !== missionId) continue;
      const timestamp = new Date(timestampSchema.parse(record.createdAt));
      const workedOn = localDate(timestamp);
      const day = calendarDay(timestamp);
      // Monotonic save timestamps can be slightly ahead of now on the same day.
      if (day > today) continue;
      const entry: RecordedWorkDay = days.get(day) ?? { date: workedOn, evidenceIds: [], recallIds: [], missionIds: [] };
      entry[kind].push(record.id);
      if (!entry.missionIds.includes(record.missionId)) entry.missionIds.push(record.missionId);
      days.set(day, entry);
    }
  }
  return days;
}

function summarize(days: Map<number, RecordedWorkDay>, now: Date): MissionActivitySummary {
  const today = calendarDay(now);
  const workedToday = days.has(today);
  let cursor = workedToday ? today : today - 1;
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor--;
  }
  let lastDay = -Infinity;
  for (const day of days.keys()) if (day > lastDay) lastDay = day;
  return { asOfDate: localDate(now), workedToday, streak, lastWorkedOn: days.get(lastDay)?.date ?? null };
}

export function getMissionActivity(
  state: Pick<AppState, 'evidence' | 'recalls'>,
  missionId: MissionId,
  now: Date = new Date(),
): MissionActivitySummary {
  return summarize(recordedDays(state, now, missionId), now);
}

export function getRecordedWorkHistory(
  state: Pick<AppState, 'evidence' | 'recalls'>,
  missionId?: MissionId,
  now: Date = new Date(),
): RecordedWorkHistory {
  const indexed = recordedDays(state, now, missionId);
  const ordered = [...indexed].sort(([a], [b]) => a - b);
  const runs: RecordedWorkRun[] = [];
  let previous = -Infinity;
  const today = calendarDay(now);
  for (const [day, entry] of ordered) {
    const last = runs.at(-1);
    if (last && day === previous + 1) {
      last.end = entry.date;
      last.days++;
      last.running = day >= today - 1;
    } else {
      runs.push({ start: entry.date, end: entry.date, days: 1, running: day >= today - 1 });
    }
    previous = day;
  }
  return { ...summarize(indexed, now), days: ordered.map(([, day]) => day), runs,
    longestStreak: runs.reduce((longest, run) => Math.max(longest, run.days), 0) };
}

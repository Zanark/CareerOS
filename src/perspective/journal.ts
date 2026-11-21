import { localDate } from '../domain/engine';
import type { AppState, Evidence, PersonalProof } from '../domain/types';

export type JournalEntry = {
  key: string;
  day?: string;
  order: number;
} & (
  | { kind: 'personal'; record: PersonalProof }
  | { kind: 'evidence'; record: Evidence }
);

export interface JournalGroup {
  key: string;
  day?: string;
  entries: JournalEntry[];
}

export function getJournalEntries(state: Pick<AppState, 'personalProof' | 'evidence'>): JournalEntry[] {
  const personal: JournalEntry[] = (state.personalProof ?? []).map((record, order) => ({
    kind: 'personal', key: `personal:${record.id}`, day: record.date, record, order,
  }));
  const evidence: JournalEntry[] = state.evidence.map((record, order) => ({
    kind: 'evidence', key: `evidence:${record.id}`, day: localDate(new Date(record.createdAt)), record, order,
  }));
  return [...personal, ...evidence].sort((left, right) => {
    if (!left.day) return right.day ? 1 : left.order - right.order;
    if (!right.day) return -1;
    const dateOrder = Number(right.day.replaceAll('-', '')) - Number(left.day.replaceAll('-', ''));
    if (dateOrder) return dateOrder;
    // Within a shared day, known recording times precede date-only memories.
    if (left.kind !== right.kind) return left.kind === 'evidence' ? -1 : 1;
    if (left.kind === 'evidence' && right.kind === 'evidence') {
      const timeOrder = Date.parse(right.record.createdAt) - Date.parse(left.record.createdAt);
      if (timeOrder) return timeOrder;
    }
    return left.order - right.order;
  });
}

export function groupJournalEntries(entries: readonly JournalEntry[]): JournalGroup[] {
  const groups = new Map<string, JournalGroup>();
  for (const entry of entries) {
    const key = entry.day?.slice(0, entry.day.lastIndexOf('-')) ?? 'undated';
    const group = groups.get(key);
    if (group) group.entries.push(entry);
    else groups.set(key, { key, day: entry.day, entries: [entry] });
  }
  return [...groups.values()];
}

function calendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

export function journalMonthLabel(day: string): string {
  return calendarDate(day).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

export function journalDateLabel(day: string): string {
  return calendarDate(day).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

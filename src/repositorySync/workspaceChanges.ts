import { z } from 'zod';
import { parseState } from '../domain/engine';
import type { AppState } from '../domain/types';
import { missionIds, readinessKeys } from '../domain/types';
import { isDate } from '../domain/legacyState';
import { serializeWorkspace } from '../workspaceFile';

const settings = ['sampleData', 'objective', 'focusMissionId', 'capacity', 'interviewMode'] as const;
const collections = ['evidence', 'events', 'opportunities', 'freelanceOpportunities', 'recalls',
  'personalProof', 'focusSessions'] as const;
const optionalCollections = ['personalProof', 'focusSessions'] as const;
const recordId = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function validKey(key: string) {
  const [group, id, extra] = key.split('/');
  if (!id || extra !== undefined) return false;
  if (group === 'setting') return settings.some(value => value === id);
  if (group === 'mission') return missionIds.some(value => value === id);
  if (group === 'readiness') return readinessKeys.some(value => value === id);
  if (group === 'plan') return isDate(id);
  if (group === 'present') return optionalCollections.some(value => value === id);
  if (group === 'archive') return /^(pattern|system|escape|fabric|blueprint|credential|neural|algorithm|income):(1|2|3)\.0\.0$/.test(id);
  return collections.some(value => value === group) && recordId.test(id);
}

export const workspaceChangeSchema = z.object({
  key: z.string().max(180).refine(validKey, 'Unknown workspace change location.'),
  before: z.string().max(5 * 1024 * 1024).nullable(),
  after: z.string().max(5 * 1024 * 1024).nullable(),
}).strict().refine(change => change.before !== change.after, 'An update must change its value.');

export type WorkspaceChange = z.infer<typeof workspaceChangeSchema>;

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    const json = JSON.stringify(value);
    if (json === undefined) throw new Error('Undefined journal value.');
    return json;
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(',')}}`;
}

function project(state: AppState): Map<string, string> {
  const cells = new Map<string, string>();
  const add = (key: string, value: unknown) => cells.set(key, canonicalJson(value));
  for (const key of settings) add(`setting/${key}`, state[key]);
  for (const id of missionIds) add(`mission/${id}`, state.missions[id]);
  for (const key of readinessKeys) add(`readiness/${key}`, state.readiness[key]);
  for (const [date, actions] of Object.entries(state.plans)) add(`plan/${date}`, actions);
  for (const key of optionalCollections) if (state[key] !== undefined) add(`present/${key}`, true);
  for (const key of collections) for (const item of state[key] ?? []) add(`${key}/${item.id}`, item);
  for (const archive of state.archives) add(`archive/${archive.missionId}:${archive.progress.roadmapVersion}`, archive);
  return cells;
}

function timestamp(item: unknown): number {
  if (!item || typeof item !== 'object' || !('createdAt' in item) || typeof item.createdAt !== 'string') {
    throw new Error('Invalid history record in the journal.');
  }
  const time = Date.parse(item.createdAt);
  if (!Number.isFinite(time)) throw new Error('Invalid history timestamp in the journal.');
  return time;
}

function assemble(cells: ReadonlyMap<string, string>, updatedAt: string): AppState {
  const get = (key: string): unknown => {
    const value = cells.get(key);
    return value === undefined ? undefined : JSON.parse(value);
  };
  const rows = (prefix: string) => [...cells.entries()]
    .filter(([key]) => key.startsWith(`${prefix}/`)).map(([, value]): unknown => JSON.parse(value));
  const value: Record<string, unknown> = {
    schemaVersion: 2, roadmapVersion: '2.0.0', updatedAt,
    ...Object.fromEntries(settings.map(key => [key, get(`setting/${key}`)])),
    missions: Object.fromEntries(missionIds.map(id => [id, get(`mission/${id}`)])),
    readiness: Object.fromEntries(readinessKeys.map(key => [key, get(`readiness/${key}`)])),
    plans: Object.fromEntries([...cells.keys()].filter(key => key.startsWith('plan/'))
      .map(key => [key.slice(5), get(key)])),
    archives: rows('archive'),
  };
  for (const key of collections) {
    const items = rows(key);
    if (key === 'events') items.sort((a, b) => timestamp(a) - timestamp(b));
    if (key === 'personalProof' || key === 'focusSessions') {
      if (get(`present/${key}`) === true || items.length) value[key] = items;
    } else value[key] = items;
  }
  const valid = parseState(value);
  serializeWorkspace(valid);
  return valid;
}

export function workspaceChanges(before: AppState, after: AppState): WorkspaceChange[] {
  const a = project(before), b = project(after);
  const changes: WorkspaceChange[] = [];
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const previous = a.get(key) ?? null, next = b.get(key) ?? null;
    if (previous !== next) changes.push({ key, before: previous, after: next });
  }
  return changes;
}

export function applyWorkspaceChanges(state: AppState, changes: readonly WorkspaceChange[], updatedAt: string): AppState {
  const cells = project(state);
  const seen = new Set<string>();
  for (const change of changes) {
    workspaceChangeSchema.parse(change);
    if (seen.has(change.key)) throw new Error('A journal batch changes the same location twice.');
    seen.add(change.key);
    if ((cells.get(change.key) ?? null) !== change.before) {
      throw new Error(`Journal update does not match its parent at ${changeLabel(change.key)}.`);
    }
    if (change.after === null) cells.delete(change.key);
    else {
      JSON.parse(change.after);
      cells.set(change.key, change.after);
    }
  }
  return assemble(cells, updatedAt);
}

export interface WorkspaceMerge {
  state: AppState | null;
  conflicts: string[];
  validationError: string;
  localChanges: number;
  publishedChanges: number;
}

export function mergeWorkspaces(base: AppState, local: AppState, published: AppState): WorkspaceMerge {
  const changes = workspaceChanges(base, local), remote = workspaceChanges(base, published);
  const cells = project(published);
  const conflicts: string[] = [];
  for (const change of changes) {
    const value = cells.get(change.key) ?? null;
    if (value === change.after) continue;
    if (value !== change.before) { conflicts.push(changeLabel(change.key)); continue; }
    if (change.after === null) cells.delete(change.key);
    else cells.set(change.key, change.after);
  }
  const result = { conflicts, localChanges: changes.length, publishedChanges: remote.length, validationError: '' };
  if (conflicts.length) return { ...result, state: null };
  try {
    const updatedAt = Date.parse(local.updatedAt) >= Date.parse(published.updatedAt) ? local.updatedAt : published.updatedAt;
    return { ...result, state: assemble(cells, updatedAt) };
  } catch (error) {
    return { ...result, state: null, validationError: error instanceof Error ? error.message : 'The combined workspace is invalid.' };
  }
}

export function changeLabel(key: string): string {
  const [group, id] = key.split('/');
  const labels: Record<string, string> = {
    setting: 'Setting', mission: 'Mission', readiness: 'Readiness', plan: 'Daily plan',
    evidence: 'Evidence', events: 'History record', opportunities: 'Opportunity',
    freelanceOpportunities: 'Freelance lead', recalls: 'Recall', archive: 'Roadmap archive',
    personalProof: 'Past accomplishment', focusSessions: 'Focus session', present: 'Optional collection',
  };
  return `${labels[group] ?? group}: ${id}`;
}

export function changeSummary(changes: readonly WorkspaceChange[]) {
  return {
    added: changes.filter(change => change.before === null).length,
    changed: changes.filter(change => change.before !== null && change.after !== null).length,
    removed: changes.filter(change => change.after === null).length,
  };
}

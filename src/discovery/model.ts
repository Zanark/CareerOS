import { checkpointIdentity, getCheckpoint, getMissionVersion, recordRoadmapVersion } from '../domain/catalog';
import { localDate } from '../domain/engine';
import { timestampSchema } from '../domain/legacyState';
import type { AppState, Evidence, MissionId, RecallEntry, RoadmapVersion } from '../domain/types';

export type DiscoveryTrack = 'craft' | 'depth' | 'memory' | 'rhythm';
type Metric = 'recorded' | 'code' | 'diagram' | 'explanation' | 'exercise' | 'project' |
  'lenses' | 'completed' | 'reviewed' | 'independent' | 'delayed' | 'spaced' | 'longSpaced' | 'days';

export interface DiscoveryDefinition {
  id: string;
  track: DiscoveryTrack;
  title: string;
  clue: string;
  description: string;
  requirement: string;
  metric: Metric;
  target: number;
  unit: string;
}

export const discoveryTracks: { id: DiscoveryTrack; title: string; subtitle: string }[] = [
  { id: 'craft', title: 'Leave a trace', subtitle: 'Make the work tangible.' },
  { id: 'depth', title: 'Go beneath', subtitle: 'Build depth, not a bigger counter.' },
  { id: 'memory', title: 'Carry it forward', subtitle: 'Meet your learning again.' },
  { id: 'rhythm', title: 'Find your rhythm', subtitle: 'Every recorded day can belong.' },
];

export const discoveryCatalogue: readonly DiscoveryDefinition[] = [
  { id: 'first-footprint', track: 'craft', title: 'First footprint', clue: 'A journey becomes visible when it leaves a trace.', description: 'You made your first piece of practice visible.', requirement: 'Save evidence on one checkpoint. A practice note is enough; completion is separate.', metric: 'recorded', target: 1, unit: 'checkpoint' },
  { id: 'working-thought', track: 'craft', title: 'A working thought', clue: 'Let an idea become something that runs.', description: 'You recorded code rather than only an intention.', requirement: 'Save a Code evidence record describing code you actually worked on.', metric: 'code', target: 1, unit: 'checkpoint' },
  { id: 'shape-of-an-idea', track: 'craft', title: 'Shape of an idea', clue: 'Some reasoning is easier to see than to say.', description: 'You gave a piece of reasoning a visible shape.', requirement: 'Save an Architecture diagram evidence record for an actual diagram.', metric: 'diagram', target: 1, unit: 'checkpoint' },
  { id: 'own-words', track: 'craft', title: 'In your own words', clue: 'Borrow the understanding, not the sentence.', description: 'You recorded an explanation from memory.', requirement: 'Save an Explanation from memory evidence record. This records your account, not an automatic grade.', metric: 'explanation', target: 1, unit: 'checkpoint' },
  { id: 'hands-on', track: 'craft', title: 'Hands on', clue: 'An attempt can teach more than another bookmark.', description: 'You recorded a real practice exercise.', requirement: 'Save a Practice exercise evidence record. An honest unfinished attempt counts.', metric: 'exercise', target: 1, unit: 'checkpoint' },
  { id: 'something-real', track: 'craft', title: 'Something real', clue: 'Let one small change escape the notebook.', description: 'You recorded a change to a project.', requirement: 'Save a Project change evidence record describing something you actually changed. No public link is required.', metric: 'project', target: 1, unit: 'checkpoint' },
  { id: 'second-lens', track: 'depth', title: 'A second lens', clue: 'Look at the same idea in a different way.', description: 'One checkpoint has two different kinds of evidence.', requirement: 'Record two different evidence kinds on the same checkpoint. Repeated notes do not add another lens.', metric: 'lenses', target: 2, unit: 'evidence kinds' },
  { id: 'three-dimensions', track: 'depth', title: 'Three dimensions', clue: 'The same idea can leave more than one kind of trace.', description: 'One checkpoint has three different kinds of evidence.', requirement: 'Record three different evidence kinds on the same checkpoint. They must describe real work, not relabelled copies.', metric: 'lenses', target: 3, unit: 'evidence kinds' },
  { id: 'follow-through', track: 'depth', title: 'Follow through', clue: 'There is a difference between trying and meeting the criteria.', description: 'You explicitly confirmed a checkpoint against its criteria.', requirement: 'Complete one checkpoint through the existing evidence and criteria confirmation. This remains self-attested.', metric: 'completed', target: 1, unit: 'checkpoint' },
  { id: 'trail-builder', track: 'depth', title: 'Trail builder', clue: 'A path starts to form behind a few finished steps.', description: 'Three distinct checkpoints have completion evidence.', requirement: 'Complete three distinct checkpoints with their criteria confirmed. Verified append lineage counts once.', metric: 'completed', target: 3, unit: 'checkpoints' },
  { id: 'deep-roots', track: 'depth', title: 'Deep roots', clue: 'Let the path grow before calling it a forest.', description: 'Seven distinct checkpoints have completion evidence.', requirement: 'Complete seven distinct checkpoints with their criteria confirmed. No mission switching or deadline is required.', metric: 'completed', target: 7, unit: 'checkpoints' },
  { id: 'working-library', track: 'depth', title: 'A working library', clue: 'Different ideas deserve their own honest attempts.', description: 'You have practice evidence on five distinct checkpoints.', requirement: 'Save evidence on five distinct checkpoints. Multiple records for one checkpoint count once; completion is not required.', metric: 'recorded', target: 5, unit: 'checkpoints' },
  { id: 'first-echo', track: 'memory', title: 'First echo', clue: 'Return to something you have already met.', description: 'You recorded a recall attempt.', requirement: 'Save a recall on one eligible DSA or System Design checkpoint with learning evidence. Any honest outcome counts.', metric: 'reviewed', target: 1, unit: 'checkpoint' },
  { id: 'without-the-map', track: 'memory', title: 'Without the map', clue: 'Try finding the way before looking it up.', description: 'You reported an independent recall with the required self-checks.', requirement: 'Save one Independent recall with the existing required explanation/exercise checks, and diagram check for System Design.', metric: 'independent', target: 1, unit: 'checkpoint' },
  { id: 'sleep-on-it', track: 'memory', title: 'Sleep on it', clue: 'An idea feels different after some distance.', description: 'You reported independent recall at least a day after the first learning record.', requirement: 'Save an Independent recall at least 24 hours after the first evidence on the same checkpoint.', metric: 'delayed', target: 1, unit: 'checkpoint' },
  { id: 'spaced-signal', track: 'memory', title: 'Spaced signal', clue: 'Let a little distance stand between two returns.', description: 'Two independent recalls were recorded at least three days apart.', requirement: 'On one checkpoint, record two Independent recalls at least 72 hours apart. The first must be at least 24 hours after the first evidence.', metric: 'spaced', target: 2, unit: 'spaced reviews' },
  { id: 'long-echo', track: 'memory', title: 'The long echo', clue: 'See what is still there after a longer quiet.', description: 'Two independent recalls were recorded at least a week apart.', requirement: 'On one checkpoint, record two Independent recalls at least seven days apart. The first must be at least 24 hours after the first evidence.', metric: 'longSpaced', target: 2, unit: 'spaced reviews' },
  { id: 'three-anchors', track: 'memory', title: 'Three anchors', clue: 'Carry more than one idea without the map.', description: 'You reported independent recall on three distinct checkpoints.', requirement: 'Save an Independent recall on three distinct eligible checkpoints. Repeating one checkpoint cannot substitute for another.', metric: 'independent', target: 3, unit: 'checkpoints' },
  { id: 'another-day', track: 'rhythm', title: 'Another day', clue: 'One recorded day does not have to stand alone.', description: 'You recorded learning on two different days.', requirement: 'Save evidence or recall on two different local-calendar days. They do not have to be consecutive.', metric: 'days', target: 2, unit: 'recorded days' },
  { id: 'steady-thread', track: 'rhythm', title: 'A steady thread', clue: 'Pick up the thread when you have room.', description: 'Three days of recorded learning belong to your collection.', requirement: 'Record evidence or recall on three different local-calendar days, at your own pace.', metric: 'days', target: 3, unit: 'recorded days' },
  { id: 'five-small-steps', track: 'rhythm', title: 'Five small steps', clue: 'Small days can add up without becoming a race.', description: 'Five different days hold a learning record.', requirement: 'Record evidence or recall on five different local-calendar days. Extra same-day records do not multiply days.', metric: 'days', target: 5, unit: 'recorded days' },
  { id: 'a-week-in-pieces', track: 'rhythm', title: 'A week, in pieces', clue: 'A week of work need not fit inside one week.', description: 'Seven different days hold a learning record.', requirement: 'Record evidence or recall on seven different local-calendar days. Gaps do not erase earlier days.', metric: 'days', target: 7, unit: 'recorded days' },
  { id: 'quiet-consistency', track: 'rhythm', title: 'Quiet consistency', clue: 'Keep the earlier days; make room for a few more.', description: 'Fourteen different days hold a learning record.', requirement: 'Record evidence or recall on fourteen different local-calendar days. There is no deadline or streak to protect.', metric: 'days', target: 14, unit: 'recorded days' },
  { id: 'the-long-game', track: 'rhythm', title: 'The long game', clue: 'A collection can grow at the pace of a life.', description: 'Twenty-one different days hold a learning record.', requirement: 'Record evidence or recall on twenty-one different local-calendar days. This is recorded activity, not measured learning time.', metric: 'days', target: 21, unit: 'recorded days' },
];

export interface DiscoverySource {
  id: string;
  kind: 'evidence' | 'recall';
  title: string;
  detail: string;
  missionId: MissionId;
  checkpointId: string;
  roadmapVersion: RoadmapVersion;
  createdAt: string;
  href: string;
}

export interface Discovery extends DiscoveryDefinition {
  current: number;
  earnedAt: string | null;
  sources: DiscoverySource[];
}

export interface DiscoveryDay {
  date: string;
  evidence: number;
  recalls: number;
  checkpoints: number;
  sources: DiscoverySource[];
}

export interface DiscoverySnapshot {
  discoveries: Discovery[];
  earned: number;
  total: number;
  recordedDays: number;
  practicedCheckpoints: number;
  reviewedCheckpoints: number;
  recentDays: DiscoveryDay[];
}

export const wayfinderStages = [
  { at: 0, title: 'First light', realm: 'Tidebound Harbor', effect: 'departure', form: 'Harbor cloak', relic: 'The blank chart', chapter: 'A chart with no borders',
    description: 'The harbor is quiet. A blank chart, an old cloak, and somewhere worth going.' },
  { at: 1, title: 'Trail scout', realm: 'Windward Reach', effect: 'compass', form: 'Windrunner scarf', relic: 'Tide compass', chapter: 'A direction of your own',
    description: 'The compass wakes. Beyond the harbor, a trail of gold runs along the water.' },
  { at: 3, title: 'Chart keeper', realm: 'The Chart Archive', effect: 'chart', form: 'Cartographer coat', relic: 'Living field map', chapter: 'The walls remember',
    description: 'A folded map opens into a room of forgotten routes. Some of them are yours now.' },
  { at: 6, title: 'Deep explorer', realm: 'The Drowned Gate', effect: 'dive', form: 'Abyss diving suit', relic: 'Pressure crystal', chapter: 'Below the familiar',
    description: 'The diving seal closes. Far below the surface, something answers the crystal.' },
  { at: 10, title: 'Signal bearer', realm: 'The Beacon Spire', effect: 'beacon', form: 'Beaconkeeper mantle', relic: 'Sunfire lantern', chapter: 'A light across the distance',
    description: 'The lantern catches. One beam reaches from the spire to the edge of the sea.' },
  { at: 16, title: 'Wayfinder', realm: 'The Skybridge', effect: 'glider', form: 'Stormsail glider', relic: 'Aether pennant', chapter: 'No road required',
    description: 'The stormsilk unfolds. The bridge ends here; the journey does not.' },
  { at: 24, title: 'Atlas keeper', realm: 'The Astral Observatory', effect: 'constellation', form: 'Astral regalia', relic: 'Constellation crown', chapter: 'The sky you brought with you',
    description: 'Every signal has a place. A little star-manta arrives to keep the completed atlas company.' },
] as const;

export const wayfinderXpPerDiscovery = 100;
export type WayfinderStage = typeof wayfinderStages[number];
export interface WayfinderRun { id: string; from: number; to: number; replay?: boolean }

export function getWayfinderProgress(earned: number) {
  if (!Number.isInteger(earned) || earned < 0 || earned > discoveryCatalogue.length) {
    throw new Error('Wayfinder progression requires a valid discovered-collection count.');
  }
  let index = 0;
  while (index + 1 < wayfinderStages.length && earned >= wayfinderStages[index + 1].at) index++;
  const stage = wayfinderStages[index];
  const nextAt = wayfinderStages[index + 1]?.at ?? null;
  return {
    level: index + 1, title: stage.title, description: stage.description, stage, startsAt: stage.at, nextAt,
    xp: earned * wayfinderXpPerDiscovery, startsAtXp: stage.at * wayfinderXpPerDiscovery,
    nextAtXp: nextAt === null ? null : nextAt * wayfinderXpPerDiscovery,
    remaining: nextAt === null ? 0 : nextAt - earned,
    percent: nextAt === null ? 100 : (earned - stage.at) / (nextAt - stage.at) * 100,
  };
}

export function getWayfinderCrossings(from: number, to: number) {
  const before = getWayfinderProgress(from);
  const after = getWayfinderProgress(to);
  return wayfinderStages.map((stage, index) => ({ ...stage, level: index + 1 }))
    .slice(before.level, Math.max(before.level, after.level));
}

type LearningRecord = { kind: 'evidence'; record: Evidence } | { kind: 'recall'; record: RecallEntry };
interface MetricState { value: number; proofs: DiscoverySource[][] }
const DAY_MS = 86_400_000;

function proofFor(metric: MetricState, target: number): DiscoverySource[] {
  return [...new Map(metric.proofs.slice(0, target).flat().map(source => [source.id, source])).values()];
}

/** Read-only projection of an already validated workspace; discoveries never write progress. */
export function getDiscoverySnapshot(state: AppState, now = new Date()): DiscoverySnapshot {
  const today = localDate(now);
  const empty = (): MetricState => ({ value: 0, proofs: [] });
  const metrics: Record<Metric, MetricState> = {
    recorded: empty(), code: empty(), diagram: empty(), explanation: empty(), exercise: empty(), project: empty(),
    lenses: empty(), completed: empty(), reviewed: empty(), independent: empty(), delayed: empty(),
    spaced: empty(), longSpaced: empty(), days: empty(),
  };
  const seen = new Map<Metric, Set<string>>();
  const firstEvidence = new Map<string, DiscoverySource>();
  const kinds = new Map<string, Map<string, DiscoverySource>>();
  const firstIndependent = new Map<string, DiscoverySource>();
  const contexts = new Map<string, { identity: string; title: string; detail: string }>();
  const days = new Map<string, DiscoveryDay & { identities: Set<string> }>();
  const earned = new Map<string, { at: string; sources: DiscoverySource[] }>();

  function credit(metric: Metric, key: string, sources: DiscoverySource[]) {
    const keys = seen.get(metric) ?? new Set<string>();
    if (keys.has(key)) return;
    keys.add(key);
    seen.set(metric, keys);
    metrics[metric].value++;
    if (metrics[metric].proofs.length < 21) metrics[metric].proofs.push(sources);
  }

  const records: LearningRecord[] = [
    ...state.evidence.map(record => ({ kind: 'evidence' as const, record })),
    ...state.recalls.map(record => ({ kind: 'recall' as const, record })),
  ];
  const chronological = records
    .map(item => ({ ...item, time: Date.parse(timestampSchema.parse(item.record.createdAt)) }))
    // Match recorded-work days: monotonic same-day timestamps remain eligible, later days do not.
    .filter(item => localDate(new Date(item.time)) <= today)
    .sort((a, b) => a.time - b.time || a.record.id.localeCompare(b.record.id));

  for (const item of chronological) {
    const record = item.record;
    const version = recordRoadmapVersion(record);
    const rawKey = `${record.missionId}:${version}:${record.checkpointId}`;
    let context = contexts.get(rawKey);
    if (!context) {
      const mission = getMissionVersion(record.missionId, version);
      const checkpoint = getCheckpoint(record.missionId, record.checkpointId, version);
      context = {
        identity: checkpointIdentity(record.missionId, record.checkpointId, version),
        title: checkpoint.title, detail: `${mission.name} / ${checkpoint.title} / v${version}`,
      };
      contexts.set(rawKey, context);
    }
    const identity = context.identity;
    const source: DiscoverySource = {
      id: record.id, kind: item.kind, missionId: record.missionId, checkpointId: record.checkpointId,
      roadmapVersion: version, createdAt: record.createdAt,
      title: item.kind === 'evidence' ? item.record.title : `${context.title} recall`,
      detail: context.detail,
      href: item.kind === 'evidence' ? `#/evidence/${record.id}` : '#/recall',
    };
    const date = localDate(new Date(item.time));
    const day = days.get(date) ?? { date, evidence: 0, recalls: 0, checkpoints: 0, sources: [], identities: new Set<string>() };
    if (item.kind === 'evidence') day.evidence++;
    else day.recalls++;
    day.identities.add(identity);
    day.checkpoints = day.identities.size;
    if (day.sources.length < 5) day.sources.push(source);
    days.set(date, day);
    credit('days', date, [source]);

    if (item.kind === 'evidence') {
      if (!firstEvidence.has(identity)) firstEvidence.set(identity, source);
      credit('recorded', identity, [source]);
      const kind = item.record.kind;
      if (kind === 'code' || kind === 'diagram' || kind === 'explanation' || kind === 'exercise' || kind === 'project') {
        credit(kind, identity, [source]);
      }
      if (item.record.completedCheckpoint) credit('completed', identity, [source]);
      const lenses = kinds.get(identity) ?? new Map<string, DiscoverySource>();
      if (!lenses.has(item.record.kind)) lenses.set(item.record.kind, source);
      kinds.set(identity, lenses);
      if (lenses.size > metrics.lenses.value) {
        metrics.lenses = { value: lenses.size, proofs: [...lenses.values()].map(proof => [proof]) };
      }
    } else {
      credit('reviewed', identity, [source]);
      if (item.record.outcome === 'independent') {
        credit('independent', identity, [source]);
        const learning = firstEvidence.get(identity);
        if (learning && item.time >= Date.parse(learning.createdAt) + DAY_MS) {
          credit('delayed', identity, [learning, source]);
          const first = firstIndependent.get(identity) ?? source;
          firstIndependent.set(identity, first);
          for (const [metric, interval] of [['spaced', 3 * DAY_MS], ['longSpaced', 7 * DAY_MS]] as const) {
            if (metrics[metric].value === 0) metrics[metric] = { value: 1, proofs: [[learning, source]] };
            if (metrics[metric].value < 2 && item.time >= Date.parse(first.createdAt) + interval) {
              metrics[metric] = { value: 2, proofs: [[learning, first], [source]] };
            }
          }
        }
      }
    }
    for (const definition of discoveryCatalogue) {
      const metric = metrics[definition.metric];
      if (!earned.has(definition.id) && metric.value >= definition.target) {
        earned.set(definition.id, { at: record.createdAt, sources: proofFor(metric, definition.target) });
      }
    }
  }

  const discoveries = discoveryCatalogue.map(definition => {
    const receipt = earned.get(definition.id);
    return {
      ...definition, current: Math.min(metrics[definition.metric].value, definition.target),
      earnedAt: receipt?.at ?? null,
      sources: receipt?.sources ?? proofFor(metrics[definition.metric], definition.target),
    };
  });
  const recentDays = Array.from({ length: 28 }, (_, index): DiscoveryDay => {
    const cursor = new Date(now);
    cursor.setHours(12, 0, 0, 0);
    cursor.setDate(cursor.getDate() - 27 + index);
    const date = localDate(cursor);
    const day = days.get(date);
    return { date, evidence: day?.evidence ?? 0, recalls: day?.recalls ?? 0, checkpoints: day?.checkpoints ?? 0, sources: day?.sources ?? [] };
  });
  return {
    discoveries, earned: earned.size, total: discoveries.length,
    recordedDays: metrics.days.value, practicedCheckpoints: metrics.recorded.value,
    reviewedCheckpoints: metrics.reviewed.value, recentDays,
  };
}

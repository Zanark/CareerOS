import { defineOperation } from '../operationBuilder';
import type { Mission, ReferenceGroup } from '../types';
import { getSourcePackOutline, isPackMissionId, PACK_ROADMAP_VERSION, formatPackPages, packUnitHref } from './registry';
import type { PackUnitOutline } from './types';

export function documentedPackMission(original: Mission): Mission {
  if (!isPackMissionId(original.id)) return original;
  const pack = getSourcePackOutline(original.id);
  if (!pack) throw new Error(`The complete roadmap pack is missing for ${original.id}.`);
  const checkpoints = pack.units.filter(unit => unit.role === 'checkpoint');
  if (!checkpoints.length) throw new Error(`The ${original.id} roadmap pack has no defined checkpoints.`);
  const referenceGroup = (title: string, kind: ReferenceGroup['kind'], units: PackUnitOutline[]): ReferenceGroup => ({
    title, kind, items: units.map(unit => ({
      title: `${unit.sourceId}: ${unit.title}`,
      detail: `${unit.summary} PDF pages ${formatPackPages(unit.pages)}. Open the practice library for the full exercises and guidance.`,
      href: packUnitHref(pack.missionId, unit.id),
    })),
  });
  return defineOperation({
    ...original,
    description: pack.overview,
    purpose: 'Build and demonstrate the source-defined capabilities through practice, transfer, diagnostics and retained evidence.',
    coverage: 'documented',
    completionLabel: 'Expanded roadmap checkpoints completed (self-confirmed)',
    sourceNotes: [
      ...pack.sourceNotes,
      'This expanded edition preserves the previous roadmap as a separate version. Adoption is explicit: old progress, evidence, plans and recall stay available; different new checkpoints receive no guessed completion credit.',
      'Tracked connections follow the source study sequence. Independent practice banks and reference material remain browsable without becoming mandatory checkpoint gates.',
      'Reading a page is not completion. Capability labels, diagnostic rubrics and source save-state examples are guidance, not automatic assessments or imported personal progress.',
      'Minutes estimate one starting practice session, not the time to master the entire module. Original PDFs and private source baselines are not published.',
    ],
    sources: [
      { document: pack.document, section: `Complete source roadmap (${pack.pageCount} pages)` },
      { document: 'Master_Prompt_Roadmap_Document_Generator.pdf', section: 'Capability, practice, diagnostic and continuity framework; authoring reference, not a separate mission', page: 2 },
    ],
    referenceGroups: [
      referenceGroup('Practice and case-study bank', 'projects', pack.units.filter(unit => unit.role === 'practice')),
      referenceGroup('Supporting guides and references', 'parallel', pack.units.filter(unit => unit.role === 'reference')),
    ].filter(group => group.items.length > 0),
    stages: pack.phases.map(phase => {
      const units = pack.units.filter(unit => unit.phaseId === phase.id);
      const tracked = units.filter(unit => unit.role === 'checkpoint');
      const firstPage = units.flatMap(unit => unit.pages).sort((a, b) => a - b)[0];
      return {
        id: `${pack.missionId}-pack-${phase.id}`,
        title: phase.title,
        summary: phase.summary,
        topics: units.map(unit => `${unit.sourceId}: ${unit.title}`),
        optional: tracked.length === 0,
        source: { document: pack.document, section: phase.title, ...(firstPage ? { page: firstPage } : {}) },
        checkpoints: tracked.map(unit => ({
          id: unit.id, title: unit.title, sourceId: unit.sourceId,
          action: unit.action, recoveryAction: unit.recovery, minutes: unit.minutes,
          criteria: unit.criteria, topics: unit.concepts,
          granularity: 'topic-group',
          source: { document: pack.document, section: `${unit.sourceId}: ${unit.title}`, page: unit.pages[0] },
        })),
      };
    }),
  }, PACK_ROADMAP_VERSION);
}

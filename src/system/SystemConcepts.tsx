import { useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Maximize2, Minus, Plus } from 'lucide-react';
import { PageHeading } from '../components';
import { Diagram } from '../roadmaps/Diagram';
import type { DiagramEdge } from '../roadmaps/Diagram';
import { useMapViewport } from '../roadmaps/useMapViewport';
import { MapInspector } from '../roadmaps/MapInspector';
import {
  matchingConceptGroups, SYSTEM_CONCEPT_SOURCE, SYSTEM_PATTERN_GUIDANCE,
  systemConceptGroups, systemConcepts, systemRelatedTracks,
} from './concepts';
import type { ConceptTopic } from './concepts';
import './system-concepts.css';

function ConceptBranches({ children, parentId, render }: {
  children: ConceptTopic[]; parentId: string; render: (node: ConceptTopic, id: string) => ReactNode;
}) {
  if (!children.length) return null;
  return <ul className="system-concept-branches">{children.map((child, index) => {
    const id = `${parentId}-${index + 1}`;
    return <li key={id}>{render(child, id)}<ConceptBranches children={child.children} parentId={id} render={render} /></li>;
  })}</ul>;
}

export function SystemConceptsPage({ groupId }: { groupId?: string }) {
  const [query, setQuery] = useState('');
  const groups = matchingConceptGroups(query).filter(group => !groupId || group.id === groupId);
  return <div className="system-concepts-page">
    <div data-tour="system-concepts-intro">
      <PageHeading eyebrow="SYSTEM FORGE / CONCEPTS REFERENCE" title="System Design concepts"
        help={<><p>{SYSTEM_PATTERN_GUIDANCE}</p><p>Concept branches and repeated placements are references, not prerequisite locks or completion credit.</p>
          <p>Source: {SYSTEM_CONCEPT_SOURCE.document}, p.{SYSTEM_CONCEPT_SOURCE.page}. <a href={SYSTEM_CONCEPT_SOURCE.url} target="_blank" rel="noopener noreferrer">{SYSTEM_CONCEPT_SOURCE.attribution}</a></p></>}>
        <a href="#/mission/system" className="button secondary">System Design mission<ArrowRight size={15} /></a>
      </PageHeading>
      <div className="system-concept-notice">
        <p><strong>{systemConceptGroups.length} sections / {systemConcepts.length} concept placements.</strong></p>
      </div>
      {groupId && <a className="text-link" href="#/system-concepts">Show all concept sections<ArrowRight size={14} /></a>}
    </div>
    <div className="system-concept-search" data-tour="system-concept-search">
      <label>Find a concept<input aria-label="Search System Design concepts" placeholder="CAP, caching, CQRS" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <button type="button" className="button secondary" disabled={!query} onClick={() => setQuery('')}>Clear search</button>
      <span role="status">{groups.length} of {systemConceptGroups.length} sections</span>
    </div>
    <div className="system-concept-browser-grid">
      {groups.map(group => <section key={group.id} className={`system-concept-card ${group.color}`} data-concept-group={group.id}>
        <span className="system-concept-order">{String(systemConceptGroups.indexOf(group) + 1).padStart(2, '0')}{group.overview ? ' / PATTERN OVERVIEW' : ''}</span>
        <h2>{group.title}</h2><p>{group.summary}</p>
        <ConceptBranches children={group.children} parentId={`concept-${group.id}`} render={(node, id) => <span data-concept-label={id}>{node.title}</span>} />
        <a className="text-link system-concept-practice" href={`#/system-practice/concept/${group.id}`}>Practice related design problems<ArrowRight size={14} /></a>
      </section>)}
    </div>
    {!groups.length && <p className="system-concept-empty">No concepts match that search. Clear it to see the complete map.</p>}
    <aside className="system-concept-related"><h2>Related tracks from the source</h2>
      <div>{systemRelatedTracks.map(track => <a key={track.title} href={track.url} target="_blank" rel="noopener noreferrer">{track.title}<ArrowUpRight size={14} /></a>)}</div>
    </aside>
  </div>;
}

const conceptEdges: DiagramEdge[] = [
  ...systemConceptGroups.slice(1).map((group, index): DiagramEdge => ({
    from: `concept-${systemConceptGroups[index].id}`, to: `concept-${group.id}`, kind: 'cross-stage',
    via: `concept-group-${systemConceptGroups[index].id}`,
  })),
  ...systemConcepts.filter(concept => concept.parentId).map((concept): DiagramEdge => ({
    from: concept.parentId!, to: concept.id, kind: 'member',
  })),
];

export function SystemConceptMap({ onClose, inspectorExpanded, onInspectorExpandedChange }: {
  onClose: () => void; inspectorExpanded: boolean | null; onInspectorExpandedChange: (expanded: boolean) => void;
}) {
  const map = useMapViewport(onClose);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = systemConcepts.find(concept => concept.id === selectedId);
  const group = selected ? systemConceptGroups.find(candidate => candidate.id === selected.groupId) : undefined;
  const render = (node: ConceptTopic, id: string) => <button type="button" data-concept-node={id} data-diagram-node={id}
    ref={element => map.registerNode(id, element)} className="system-concept-node"
    aria-pressed={selectedId === id} onClick={() => setSelectedId(id)}>{node.title}</button>;

  return <>
    <div className="full-roadmap-toolbar">
      <button className="button secondary" onClick={() => map.changeZoom(null, 'fit')} aria-pressed={map.view.zoom === null}><Maximize2 size={17} />Fit all</button>
      <select className="full-roadmap-topic-finder" aria-label="Find a System Design concept" value="" onChange={event => {
        setSelectedId(event.target.value);
        map.changeZoom(1, { nodeId: event.target.value });
      }}>
        <option value="" disabled>Find a concept...</option>
        {systemConceptGroups.map(group => <optgroup key={group.id} label={group.title}>
          {systemConcepts.filter(concept => concept.groupId === group.id).map(concept =>
            <option key={concept.id} value={concept.id}>{concept.path.join(' / ')}</option>)}
        </optgroup>)}
      </select>
      <div className="full-roadmap-zoom" role="group" aria-label="Concept map zoom">
        <button className="icon-button" aria-label="Zoom out" disabled={map.zoom <= Math.min(map.fit, .25)} onClick={() => map.changeZoom(map.zoom / 1.5)}><Minus size={18} /></button>
        <output aria-label="Concept map zoom level">{Math.round(map.zoom * 100)}%</output>
        <button className="icon-button" aria-label="Zoom in" disabled={map.zoom >= 2} onClick={() => map.changeZoom(map.zoom * 1.5)}><Plus size={18} /></button>
        <button className="text-button" onClick={() => map.changeZoom(1)}>100%</button>
      </div>
    </div>
    <p className="full-roadmap-hint" id="system-concept-map-help">Source reading route and concept branches, not unlock rules. Find a concept to read it at 100%. Viewing records no progress.</p>
    <div ref={map.viewport} className={`full-roadmap-viewport ${map.dragging ? 'is-dragging' : ''}`}
      role="region" aria-label="System Design concept canvas" aria-describedby="system-concept-map-help" tabIndex={0} {...map.panProps}>
      <div className="full-roadmap-space">
        <div className="full-roadmap-plane" data-ready={map.size.ready} style={{ width: map.size.width * map.zoom, height: map.size.height * map.zoom }}>
          <div ref={map.graph} className="full-roadmap-graph" style={{ transform: `scale(${map.zoom})` }}>
            <Diagram edges={conceptEdges} className="system-concept-map-diagram">
              <div className="system-concept-map-grid">
                {systemConceptGroups.map((group, index) => <section key={group.id} className={`system-concept-map-group ${group.color}`}
                  data-concept-map-group={group.id} data-diagram-node={`concept-group-${group.id}`}>
                  <span className="system-concept-order">{String(index + 1).padStart(2, '0')}{group.overview ? ' / OVERVIEW' : ''}</span>
                  {render(group, `concept-${group.id}`)}
                  <ConceptBranches children={group.children} parentId={`concept-${group.id}`} render={render} />
                </section>)}
              </div>
            </Diagram>
          </div>
        </div>
      </div>
    </div>
    <MapInspector title={selected?.title ?? 'Concept map details'} expanded={inspectorExpanded ?? selectedId !== null}
      onExpandedChange={onInspectorExpandedChange} contentClassName="system-concept-inspector">
      {selected && group ? <><strong>{selected.path.join(' / ')}</strong><p>{group.summary}</p></> : <p>{SYSTEM_PATTERN_GUIDANCE}</p>}
      {group && <a className="text-link" href={`#/system-practice/concept/${group.id}`}>Practice related design problems<ArrowRight size={14} /></a>}
      <p className="system-concept-source">Source: {SYSTEM_CONCEPT_SOURCE.document}, p.1 / {SYSTEM_CONCEPT_SOURCE.attribution}. <a className="text-link" href="#/system-concepts">Read the concepts and source notes<ArrowRight size={14} /></a></p>
    </MapInspector>
  </>;
}

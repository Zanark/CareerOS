import type { CareerGraphEdge, CareerGraphNode } from './careerGraphModel';

function connectionLabel(edge: CareerGraphEdge, selectedId: string): string {
  const outgoing = edge.source === selectedId;
  switch (edge.kind) {
    case 'shared-skill': return 'Shared skill';
    case 'prerequisite': return outgoing ? 'Study sequence: leads to' : 'Study sequence: follows';
    case 'contains': return outgoing ? 'Contains' : 'Part of';
    case 'evidence': return outgoing ? 'Saved evidence' : 'Evidence for';
    case 'related': return 'Related missions';
  }
}

const connectionNotes = {
  prerequisite: 'Defined by the roadmap prerequisites or study sequence; this line does not mark either checkpoint complete.',
  contains: 'A structural connection to this mission, checkpoint or career workspace.',
  evidence: 'A saved evidence record attached to this checkpoint, or its mission when the original checkpoint is not shown.',
  related: 'A soft mission relationship declared in the roadmap, not an extra completion gate.',
};

export function CareerGraphConnections({ selectedId, edges, nodes, visibleIds, includeSharedSkills, onInspect }: {
  selectedId: string;
  edges: CareerGraphEdge[];
  nodes: ReadonlyMap<string, CareerGraphNode>;
  visibleIds: ReadonlySet<string>;
  includeSharedSkills: boolean;
  onInspect: (node: CareerGraphNode, edge: CareerGraphEdge) => void;
}) {
  const connections = edges.filter(edge => edge.source === selectedId || edge.target === selectedId);
  const sharedCount = connections.filter(edge => edge.kind === 'shared-skill').length;
  return <details className="career-graph-connections">
    <summary>Connections ({connections.length}){sharedCount > 0 && <span>{sharedCount} shared skill</span>}</summary>
    <p>Shared skills are curated comparisons of the cited curriculum, not source-declared prerequisites, equivalent mastery or new tasks.</p>
    {!connections.length && <p>No connections in this graph.</p>}
    <ul>
      {[...connections].sort((a, b) => Number(b.kind === 'shared-skill') - Number(a.kind === 'shared-skill')).map(edge => {
        const peer = nodes.get(edge.source === selectedId ? edge.target : edge.source)!;
        const hiddenNode = !visibleIds.has(peer.id);
        const hiddenLink = edge.kind === 'shared-skill' && !includeSharedSkills;
        return <li key={edge.id} data-connection-kind={edge.kind}>
          <span className={`career-graph-connection-kind ${edge.kind}`}>{connectionLabel(edge, selectedId)}</span>
          <strong>{peer.label}</strong>
          <small>{peer.context}</small>
          {edge.kind === 'shared-skill' ? edge.reasons.map(reason => <div className="career-graph-connection-reason" key={reason.id}>
            <b>{reason.concept}</b><p>{reason.reason}</p>
            <details><summary>Curriculum basis</summary>
              {reason.sources.map(source => <p key={source.nodeId}>
                <b>{nodes.get(source.nodeId)!.label}</b>
                <span>{source.reference.document} · {source.reference.section}{source.reference.page !== undefined && ` · p. ${source.reference.page}`}</span>
                {source.reference.url && <a href={source.reference.url} target="_blank" rel="noopener noreferrer">Read the research basis</a>}
              </p>)}
            </details>
          </div>) : <p>{connectionNotes[edge.kind]}</p>}
          {(hiddenNode || hiddenLink) && <p className="career-graph-connection-hidden">
            {hiddenNode && 'This node is outside the current view. Inspecting it reveals the required mission/layer filters. '}
            {hiddenLink && 'Shared skill lines are off. Inspecting this connection turns them on.'}
          </p>}
          <button className="button secondary" onClick={() => onInspect(peer, edge)}>
            {hiddenNode || hiddenLink ? 'Reveal and inspect' : 'Inspect'} {peer.label}
          </button>
        </li>;
      })}
    </ul>
  </details>;
}

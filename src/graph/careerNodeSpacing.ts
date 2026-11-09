import type { CareerGraph, CareerGraphNode } from './careerGraphModel';

export const DEFAULT_NODE_SPACING = 100;
export const MAX_NODE_SPACING = 300;
export const CAREER_NODE_HOME_DIRECTION = [0.58, 0.32, 1] as const;

// A fixed presentation basis, never the live camera: rotation and filtering cannot relayout nodes.
const FORWARD = normalize(CAREER_NODE_HOME_DIRECTION);
const RIGHT = normalize([FORWARD[2], 0, -FORWARD[0]]);
const UP = [
  FORWARD[1] * RIGHT[2] - FORWARD[2] * RIGHT[1],
  FORWARD[2] * RIGHT[0] - FORWARD[0] * RIGHT[2],
  FORWARD[0] * RIGHT[1] - FORWARD[1] * RIGHT[0],
];
const INNER_RADIUS = 52;
const OUTER_RADIUS = 116;
const DESIGN_DISTANCE = 520;
const ROW_HEIGHT = Math.sqrt(3) / 2;
const NEIGHBOR_CELLS = Array.from({ length: 17 * 17 }, (_, index) => [index % 17 - 8, Math.floor(index / 17) - 8])
  .filter(([q, r]) => Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 8)
  .sort(([aq, ar], [bq, br]) => (aq + ar / 2) ** 2 + (ar * ROW_HEIGHT) ** 2
    - (bq + br / 2) ** 2 - (br * ROW_HEIGHT) ** 2 || aq - bq || ar - br);

/** Redistribute presentation coordinates before filtering, never the source graph or saved workspace. */
export function spaceCareerGraph(graph: CareerGraph, spacing: number): CareerGraph {
  if (!Number.isFinite(spacing) || spacing < DEFAULT_NODE_SPACING || spacing > MAX_NODE_SPACING) {
    throw new RangeError('Node spacing must be between 100 and 300 percent.');
  }
  if (graph.nodes.length === 0) return graph;
  const core = graph.nodes.find(node => node.kind === 'core');
  if (!core) throw new Error('Node spacing requires the unfiltered graph with its core.');
  const spread = (spacing - DEFAULT_NODE_SPACING) / (MAX_NODE_SPACING - DEFAULT_NODE_SPACING);
  const compact = compactPositions(graph, core);
  if (spread === 0) return withPositions(graph, compact);
  const neighborhoods = unfoldNeighborhoods(graph, core, spread);
  const unfold = Math.min(1, spread * 2);
  const positions = new Map<string, CareerGraphNode['position']>();
  for (const node of graph.nodes) {
    if (node.kind === 'core') continue;
    const source = compact.get(node.id)!;
    const target = neighborhoods.get(node.id);
    if (!target) {
      positions.set(node.id, source);
      continue;
    }
    const from = source.map((value, axis) => value - core.position[axis]);
    const to = target.map((value, axis) => value - core.position[axis]);
    const fromDepth = dot(from, FORWARD), toDepth = dot(to, FORWARD);
    const fromAngle = Math.atan2(dot(from, UP), dot(from, RIGHT));
    const toAngle = Math.atan2(dot(to, UP), dot(to, RIGHT));
    const turn = Math.atan2(Math.sin(toAngle - fromAngle), Math.cos(toAngle - fromAngle));
    const fromRadius = Math.hypot(dot(from, RIGHT), dot(from, UP)) / (1 - fromDepth / DESIGN_DISTANCE);
    const toRadius = Math.hypot(dot(to, RIGHT), dot(to, UP)) / (1 - toDepth / DESIGN_DISTANCE);
    const depth = fromDepth + (toDepth - fromDepth) * unfold;
    const radius = fromRadius + (toRadius - fromRadius) * unfold;
    const angle = fromAngle + turn * unfold;
    // Travel around the white core, never through it during intermediate steps.
    positions.set(node.id, inBasis(core, Math.cos(angle) * radius, Math.sin(angle) * radius, depth));
  }
  return withPositions(graph, positions);
}

function withPositions(graph: CareerGraph, positions: ReadonlyMap<string, CareerGraphNode['position']>): CareerGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node): CareerGraphNode => node.kind === 'core' ? node : { ...node, position: positions.get(node.id)! }),
  };
}

function compactPositions(graph: CareerGraph, core: CareerGraphNode) {
  const missions = new Map(graph.nodes.filter(node => node.kind === 'mission').map(node => [node.missionId, node]));
  const area = Math.PI * (OUTER_RADIUS ** 2 - INNER_RADIUS ** 2);
  // Enlarge local exclusion cells, not the containing composition. Dense imports share the same finite room.
  const densityScale = Math.min(1, 0.98 * Math.sqrt(area / Math.max(600, graph.nodes.length - 1)) / 8);
  const separation = 5.4 * densityScale;
  const cells = new Map<string, [number, number]>();
  const limit = Math.ceil(OUTER_RADIUS / separation / ROW_HEIGHT);
  for (let r = -limit; r <= limit; r++) for (let q = -limit * 2; q <= limit * 2; q++) {
    const x = (q + r / 2) * separation, y = r * ROW_HEIGHT * separation;
    if (x * x + y * y >= INNER_RADIUS ** 2 && x * x + y * y <= OUTER_RADIUS ** 2) cells.set(`${q},${r}`, [x, y]);
  }
  const fallback = [...cells.keys()].sort((a, b) => unitHash(a) - unitHash(b));
  let fallbackIndex = 0;
  const positions = new Map<string, CareerGraphNode['position']>();
  // Interleave stable IDs so one mission cannot claim every nearby cell before another mission is placed.
  const ordered = graph.nodes.filter(node => node.kind !== 'core')
    .sort((a, b) => priority(a) - priority(b) || unitHash(a.id) - unitHash(b.id)
      || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const node of ordered) {
    const hub = missions.get(node.missionId);
    const relative = node.position.map((value, axis) => value - core.position[axis]);
    const hubPosition = hub?.position.map((value, axis) => value - core.position[axis]);
    const expanded = hubPosition
      ? relative.map((value, axis) => hubPosition[axis] * 1.55 + (value - hubPosition[axis]) * 1.9)
      : relative.map(value => value * 2.5);
    const depth = Math.max(-48, Math.min(48, dot(expanded, FORWARD) * 0.45));
    let x = dot(expanded, RIGHT), y = dot(expanded, UP);
    const length = Math.hypot(x, y);
    const radius = Math.max(INNER_RADIUS + 2, Math.min(OUTER_RADIUS - 2, length));
    const angle = length > 0 ? Math.atan2(y, x) : unitHash(node.id) * Math.PI * 2;
    x = Math.cos(angle) * radius;
    y = Math.sin(angle) * radius;
    const r = Math.round(y / (ROW_HEIGHT * separation)), q = Math.round(x / separation - r / 2);
    let key: string | undefined;
    // Bounded local searches retain mission neighborhoods; overflow uses a single linear free-cell scan.
    for (const [dq, dr] of NEIGHBOR_CELLS) {
      const candidate = `${q + dq},${r + dr}`;
      if (cells.has(candidate)) { key = candidate; break; }
    }
    while (!key && fallbackIndex < fallback.length) {
      const candidate = fallback[fallbackIndex++];
      if (cells.has(candidate)) key = candidate;
    }
    if (!key) throw new Error('Career graph spatial cells exhausted.');
    [x, y] = cells.get(key)!;
    cells.delete(key);
    // Retain real depth, with compensation for the perspective in the fitted home view.
    const perspective = 1 - depth / DESIGN_DISTANCE;
    positions.set(node.id, core.position.map((value, axis) => value + RIGHT[axis] * x * perspective
      + UP[axis] * y * perspective + FORWARD[axis] * depth) as CareerGraphNode['position']);
  }
  return positions;
}

/**
 * Open the interleaved cloud into separate mission fans. Each fan keeps real
 * source depth; stage order comes from existing membership, never new edges.
 * The finite polar rows are built once per slider change, not per frame.
 */
function unfoldNeighborhoods(graph: CareerGraph, core: CareerGraphNode, spread: number) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  const groups = graph.orbits.filter(orbit => orbit.kind === 'mission').sort((a, b) => a.index - b.index).map(orbit => {
    const ids = new Set<string>([orbit.hubNodeId]);
    for (const segment of orbit.segments) for (const member of segment.members) ids.add(member.nodeId);
    const extra = graph.nodes.filter(node => node.missionId === orbit.missionId && !ids.has(node.id))
      .sort((a, b) => priority(a) - priority(b) || compareIds(a, b));
    return [...ids].map(id => byId.get(id)).filter((node): node is CareerGraphNode => Boolean(node)).concat(extra);
  });
  const unaffiliated = graph.nodes.filter(node => node.kind !== 'core' && !node.missionId).sort(compareIds);
  const definitionCount = groups.reduce((sum, group) => sum + group.filter(node => priority(node) < 2).length, 0);
  const separation = 7 + spread * 3;
  const outer = 156;
  const inner = INNER_RADIUS + 8;
  const angles = groups.map(group => Math.max(18, group.filter(node => priority(node) < 2).length));
  const total = angles.reduce((sum, count) => sum + count, 0);
  const positions = new Map<string, CareerGraphNode['position']>();
  let start = -Math.PI / 2;
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const width = Math.PI * 2 * angles[groupIndex] / total;
    const margin = width * (0.02 + spread * 0.02);
    let cells: [number, number][] = [];
    const definitionNodes = group.filter(node => priority(node) < 2);
    // Saved records do not consume catalogue slots or shuffle its checkpoints.
    let step = separation * Math.min(1, Math.sqrt(520 / Math.max(520, definitionCount)));
    for (let attempt = 0; attempt < 8; attempt++) {
      cells = [];
      for (let radius = inner; radius <= outer; radius += step * ROW_HEIGHT) {
        const slots = Math.max(1, Math.floor((width - margin * 2) * radius / step));
        for (let slot = 0; slot < slots; slot++) {
          const angle = start + margin + (slot + 0.5) * (width - margin * 2) / slots;
          cells.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
        }
      }
      if (cells.length >= definitionNodes.length) break;
      step *= 0.85;
    }
    if (cells.length < definitionNodes.length) throw new Error('Career graph mission fan exhausted.');
    definitionNodes.forEach((node, index) => {
      const cell = cells[index];
      positions.set(node.id, toWorld(node, cell[0], cell[1], core));
    });
    const records = group.filter(node => priority(node) === 2);
    records.forEach((node, index) => {
      const angle = start + margin + (index + 0.5) / Math.max(1, records.length) * (width - margin * 2);
      const radius = inner - 7 + 3 * Math.sqrt((index + 0.5) / Math.max(1, records.length));
      positions.set(node.id, toWorld(node, Math.cos(angle) * radius, Math.sin(angle) * radius, core));
    });
    start += width;
  }
  unaffiliated.forEach((node, index) => {
    const angle = index * Math.PI * (3 - Math.sqrt(5));
    const radius = inner - 8 + 3 * Math.sqrt((index + 0.5) / Math.max(1, unaffiliated.length));
    positions.set(node.id, toWorld(node, Math.cos(angle) * radius, Math.sin(angle) * radius, core));
  });
  return positions;
}

function priority(node: CareerGraphNode) {
  return node.kind === 'mission' ? 0 : node.kind === 'checkpoint' || node.kind === 'curriculum' ? 1 : 2;
}

function compareIds(a: CareerGraphNode, b: CareerGraphNode) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function toWorld(node: CareerGraphNode, x: number, y: number, core: CareerGraphNode): CareerGraphNode['position'] {
  const relative = node.position.map((value, axis) => value - core.position[axis]);
  const depth = Math.max(-48, Math.min(48, dot(relative, FORWARD) * 0.8));
  return inBasis(core, x, y, depth);
}

function inBasis(core: CareerGraphNode, x: number, y: number, depth: number): CareerGraphNode['position'] {
  const perspective = 1 - depth / DESIGN_DISTANCE;
  return core.position.map((value, axis) => value + RIGHT[axis] * x * perspective
    + UP[axis] * y * perspective + FORWARD[axis] * depth) as CareerGraphNode['position'];
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, axis) => sum + value * b[axis], 0);
}

function normalize(vector: readonly number[]): number[] {
  const length = Math.hypot(...vector);
  return vector.map(value => value / length);
}

function unitHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

import {
  BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, Group, LineSegments,
  PerspectiveCamera, Points, ShaderMaterial, Vector3, type InterleavedBufferAttribute,
} from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import type { CareerGraphNode } from './careerGraphModel';
import type { CareerOrbit, CareerOrbitSelection } from './careerOrbitTypes';
import { CAREER_ORBIT_PLANES, careerOrbitMotion, orbitPoint, orbitRotation } from './careerOrbitMotion';
import type { CareerOrbitMotion } from './careerOrbitMotion';
import { CareerOrbitSavedPulses, SAVED_STATUS_PULSE_SECONDS } from './careerOrbitSavedPulses';
import type { SavedStatusPulse } from './careerOrbitSavedPulses';
import type { CareerOrbitScreenHit } from './careerSceneInteraction';
import { careerRippleVertexShader, createRippleUniforms } from './careerRipple';
import type { CareerRippleField } from './careerRipple';
import { DEFAULT_ROTATION_SPEED, validateCareerOrbitSpeeds, type CareerOrbitSpeeds } from './careerOrbitSpeeds';

const TAU = Math.PI * 2;
const STATUS_INTENSITY = { complete: 1, incomplete: 0.35, reference: 0.55 };
const WHITE = new Color('#EEE8D5');
export const ORBIT_ANCHOR_DIAMETER = 32;
export const SELECTED_ORBIT_ANCHOR_DIAMETER = 36;
export const ORBIT_ACTIVITY_BORDER_BRIGHT = 1;
export const ORBIT_ACTIVITY_BORDER_DIM = 0.18;
export const ORBIT_COLLECTION_BORDER_STRENGTH = 0.55;
export const ORBIT_HIGHLIGHT_SEGMENTS = 256;
export const ORBIT_HIGHLIGHT_WIDTH = 4;
export const ORBIT_HIGHLIGHT_HALO_WIDTH = 18;
const vertex = `
  ${careerRippleVertexShader}
  attribute float aRippleWeight;
  varying vec3 vColor;
  varying vec3 vViewPosition;
  void main() {
    vec4 basePosition = modelViewMatrix * vec4(position, 1.0);
    vec4 viewPosition = mix(basePosition, rippleView(basePosition), aRippleWeight);
    vColor = color;
    vViewPosition = viewPosition.xyz;
    gl_Position = projectionMatrix * viewPosition;
  }
`;
const mask = `
  uniform vec3 uCenterView;
  uniform float uRadius;
  uniform float uRimOnly;
  varying vec3 vViewPosition;
  float rimVisibility() {
    if (uRimOnly < 0.5) return 1.0;
    float clearance = length(cross(uCenterView, normalize(vViewPosition))) / uRadius;
    if (clearance < 1.035) discard;
    return smoothstep(1.035, 1.075, clearance);
  }
`;

function lineMaterial(masked = false, opacity = 0.65): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: `
      varying vec3 vColor;
      uniform float uOpacity;
      ${masked ? mask : ''}
      void main() {
        gl_FragColor = vec4(vColor, uOpacity ${masked ? '* rimVisibility()' : ''});
        #include <colorspace_fragment>
      }`,
    vertexColors: true, transparent: true, depthWrite: false, toneMapped: false,
    uniforms: {
      ...createRippleUniforms(),
      uOpacity: { value: opacity }, uCenterView: { value: new Vector3() },
      uRadius: { value: 1 }, uRimOnly: { value: 0 },
    },
  });
}

function highlightMaterial(halo = false): LineMaterial {
  const material = new LineMaterial({
    linewidth: halo ? ORBIT_HIGHLIGHT_HALO_WIDTH : ORBIT_HIGHLIGHT_WIDTH,
    opacity: halo ? 0.42 : 0.96,
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
  });
  Object.assign(material.uniforms, createRippleUniforms(), {
    uRippleWeight: { value: 1 }, uCenterView: { value: new Vector3() },
    uRadius: { value: 1 }, uRimOnly: { value: 0 },
  });
  material.vertexShader = material.vertexShader
    .replace('#include <fog_pars_vertex>', `#include <fog_pars_vertex>
      ${careerRippleVertexShader}
      uniform float uRippleWeight;
      varying vec3 vViewPosition;`)
    .replace('vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );', `
      vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );
      start = mix(start, rippleView(start), uRippleWeight);
      end = mix(end, rippleView(end), uRippleWeight);`)
    .replace('#include <logdepthbuf_vertex>', `
      vViewPosition = mvPosition.xyz;
      // Mask the actual ribbon pixels, including the halo width, not just its centerline.
      vViewPosition.xy += (clip.xy - (projectionMatrix * mvPosition).xy)
        / vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
      #include <logdepthbuf_vertex>`);
  material.fragmentShader = material.fragmentShader
    .replace('#include <fog_pars_fragment>', `#include <fog_pars_fragment>\n${mask}`)
    .replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );', `
      float across = abs(vUv.x);
      alpha *= ${halo ? 'exp(-3.5 * across * across) * (1.0 - smoothstep(0.72, 1.0, across))'
        : '(1.0 - smoothstep(0.65, 1.0, across))'};
      gl_FragColor = vec4(diffuseColor.rgb, alpha * rimVisibility());`);
  return material;
}

const flatDotFragment = `
  varying vec3 vColor;
  varying float vActivityBorderStrength;
  uniform float uDotDiameter;
  void main() {
    float distance = length(gl_PointCoord - 0.5) * uDotDiameter;
    float outerRadius = uDotDiameter * 0.5;
    if (distance > outerRadius) discard;
    float borderCenter = outerRadius - 3.0;
    float border = 1.0 - smoothstep(1.0, 1.5, abs(distance - borderCenter));
    float body = 1.0 - smoothstep(borderCenter - 2.0, borderCenter - 1.5, distance);
    float glow = exp(-0.75 * abs(distance - borderCenter))
      * (1.0 - smoothstep(outerRadius - 0.6, outerRadius, distance));
    float alpha = max(body * 0.68, max(border * vActivityBorderStrength,
      glow * (0.08 + 0.18 * vActivityBorderStrength)));
    gl_FragColor = vec4(vColor, alpha);
    #include <colorspace_fragment>
  }
`;

const packetFragment = `
  varying vec3 vColor;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float alpha = max(1.0 - smoothstep(0.3, 0.5, r), 1.0 - smoothstep(0.08, 0.16, abs(r - 0.8)));
    gl_FragColor = vec4(vColor, alpha);
    #include <colorspace_fragment>
  }
`;

function pointMaterial(diameter: number, fragmentShader: string): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex.replace('void main()', 'uniform float uPixelRatio;\nvoid main()').replace(
      'gl_Position = projectionMatrix * viewPosition;',
      `gl_Position = projectionMatrix * viewPosition; gl_PointSize = ${diameter.toFixed(1)} * uPixelRatio;`),
    fragmentShader,
    uniforms: { ...createRippleUniforms(), uPixelRatio: { value: 1 } },
    vertexColors: true, transparent: true, depthWrite: false, depthTest: false, toneMapped: false,
  });
}

function anchorMaterial(diameter: number): ShaderMaterial {
  const material = pointMaterial(diameter, flatDotFragment);
  material.vertexShader = material.vertexShader
    .replace('varying vec3 vColor;', `varying vec3 vColor;
      attribute float aActivityBorderStrength;
      varying float vActivityBorderStrength;`)
    .replace('vColor = color;', 'vColor = color; vActivityBorderStrength = aActivityBorderStrength;');
  material.uniforms.uDotDiameter = { value: diameter };
  return material;
}

export interface OrbitActivityPresentation {
  workedToday: boolean | null;
  streak: number | null;
  asOfDate: string | null;
  borderStrength: number;
}

function activityPresentation(orbit: CareerOrbit, date: string): OrbitActivityPresentation {
  if (orbit.kind !== 'mission') {
    return { workedToday: null, streak: null, asOfDate: null, borderStrength: ORBIT_COLLECTION_BORDER_STRENGTH };
  }
  const activity = orbit.activity;
  const current = Boolean(date && activity?.asOfDate === date);
  const workedToday = current && Boolean(activity?.workedToday);
  return {
    workedToday, streak: activity ? current ? activity.streak : null : 0, asOfDate: activity?.asOfDate ?? null,
    borderStrength: workedToday ? ORBIT_ACTIVITY_BORDER_BRIGHT : ORBIT_ACTIVITY_BORDER_DIM,
  };
}

interface PathRange { start: number; end: number; selection: CareerOrbitSelection }
interface OrbitEntry {
  orbit: CareerOrbit;
  motion: CareerOrbitMotion;
  activity: OrbitActivityPresentation;
  start: number;
  end: number;
  segmentAngles: Map<string, number>;
  visibleMemberCount: number;
}
interface Tether {
  entry: OrbitEntry;
  angle: number;
  offset: number;
  target: readonly [number, number, number];
  nodeId: string;
}
export interface OrbitAnchorInfo {
  orbit: CareerOrbit;
  motion: CareerOrbitMotion;
  visibleMemberCount: number;
}

function dynamicPositions(values: number[] | Float32Array): BufferAttribute {
  return new BufferAttribute(new Float32Array(values), 3).setUsage(DynamicDrawUsage);
}

/** Derived views only: never owns, moves, or mutates a graph node. */
export class CareerOrbitVisuals {
  readonly object = new Group();
  readonly paths = new LineSegments(new BufferGeometry(), lineMaterial(true));
  readonly anchors = new Points(new BufferGeometry(), anchorMaterial(ORBIT_ANCHOR_DIAMETER));
  readonly primaryTethers = new LineSegments(new BufferGeometry(), lineMaterial(false, 0.22));
  readonly detailTethers = new LineSegments(new BufferGeometry(), lineMaterial(false, 0.55));
  readonly savedPulseTethers = new LineSegments(new BufferGeometry(), lineMaterial(false, 0.55));
  readonly savedPulsePackets = new Points(new BufferGeometry(), pointMaterial(10, packetFragment));
  readonly selectedAnchor = new Points(new BufferGeometry(), anchorMaterial(SELECTED_ORBIT_ANCHOR_DIAMETER));
  private readonly highlightPositions = new Float32Array(ORBIT_HIGHLIGHT_SEGMENTS * 6);
  private readonly highlightGeometry = new LineSegmentsGeometry().setPositions(this.highlightPositions);
  private readonly highlightBuffer = (this.highlightGeometry.attributes.instanceStart as InterleavedBufferAttribute).data.setUsage(DynamicDrawUsage);
  readonly highlight = new LineSegments2(this.highlightGeometry, highlightMaterial());
  readonly highlightHalo = new LineSegments2(this.highlightGeometry, highlightMaterial(true));
  private entries: OrbitEntry[] = [];
  private readonly byId = new Map<string, OrbitEntry>();
  private ranges: PathRange[] = [];
  private local = new Float32Array();
  private originalColors = new Float32Array();
  private primary: Tether[] = [];
  private details: Tether[] = [];
  private readonly savedPulses = new CareerOrbitSavedPulses();
  private readonly pulseTargets = new Map<SavedStatusPulse, Tether>();
  private pulseColorsDirty = false;
  private nodes: ReadonlyMap<string, CareerGraphNode> = new Map();
  private selection: CareerOrbitSelection | null = null;
  private activityDate = '';
  private readonly center = new Vector3();
  private readonly scratch = new Vector3();
  private readonly end = new Vector3();
  private readonly middle = new Vector3();
  private readonly projectedA = new Vector3();
  private readonly projectedB = new Vector3();
  private radius = 60;
  private phase = 0;
  private rotationSpeeds: CareerOrbitSpeeds = {};
  private readonly rotationTimes = new Map<string, number>();
  private motionAllowed = true;
  private dirty = true;
  private disposed = false;
  private ripple: CareerRippleField | null = null;
  private detailSegments = 8;
  private readonly primarySegments = 8;

  constructor(private readonly calm = false) {
    this.object.name = 'Real career orbit views';
    this.paths.name = 'Semantic orbit paths';
    this.anchors.name = 'Pickable orbit identities';
    this.primaryTethers.name = 'Orbit to actual hub membership';
    this.detailTethers.name = 'Selected orbit visible members';
    this.selectedAnchor.name = 'Selected orbit or stage anchor';
    this.savedPulseTethers.name = 'Transient saved-status membership tethers';
    this.savedPulsePackets.name = 'Saved-status packets - not inferred mastery';
    this.highlight.name = 'Selected full orbit highlight';
    this.highlightHalo.name = 'Selected full orbit halo';
    this.savedPulseTethers.visible = this.savedPulsePackets.visible = false;
    for (const item of [this.paths, this.primaryTethers, this.detailTethers, this.anchors, this.selectedAnchor, this.savedPulseTethers, this.savedPulsePackets]) {
      item.frustumCulled = false;
      item.renderOrder = item instanceof Points ? 4 : -1;
    }
    this.selectedAnchor.visible = false;
    // One shared, reusable ring; draw only ribbon bodies to avoid overlapping soft endcaps.
    this.highlightGeometry.setDrawRange(6, 6);
    this.highlightGeometry.instanceCount = 0;
    for (const item of [this.highlightHalo, this.highlight]) {
      item.frustumCulled = false;
      item.visible = false;
    }
    this.highlightHalo.renderOrder = 1.1;
    this.highlight.renderOrder = 1.2;
    this.selectedAnchor.geometry.setAttribute('position', dynamicPositions(new Float32Array(3)));
    this.selectedAnchor.geometry.setAttribute('color', new BufferAttribute(new Float32Array([WHITE.r, WHITE.g, WHITE.b]), 3));
    this.selectedAnchor.geometry.setAttribute('aRippleWeight', new BufferAttribute(new Float32Array([1]), 1));
    this.selectedAnchor.geometry.setAttribute('aActivityBorderStrength',
      new BufferAttribute(new Float32Array([ORBIT_ACTIVITY_BORDER_DIM]), 1).setUsage(DynamicDrawUsage));
    this.object.add(this.paths, this.primaryTethers, this.detailTethers, this.anchors, this.selectedAnchor, this.savedPulseTethers, this.savedPulsePackets, this.highlightHalo, this.highlight);
    if (calm) {
      this.paths.material.uniforms.uOpacity.value = 0.38;
      this.primaryTethers.material.uniforms.uOpacity.value = 0.12;
    }
  }

  get animationTime(): number { return this.phase; }
  get orbitCount(): number { return this.entries.length; }
  get tetherCount(): number { return this.primary.length + this.details.length + this.savedPulses.active.length; }
  get savedPulseCount(): number { return this.savedPulses.active.length; }
  get detailTetherSegments(): number { return this.detailSegments; }
  get highlightedOrbitId(): string | null { return !this.disposed && this.highlight.visible ? this.selection?.orbitId ?? null : null; }
  get highlightVisible(): boolean {
    return !this.disposed && this.object.visible && this.highlight.visible && this.highlightHalo.visible && this.highlightGeometry.instanceCount > 0;
  }
  get tetherTargetIds(): readonly string[] {
    return [...this.primary, ...this.details].map(tether => tether.nodeId).concat(this.savedPulses.active.map(pulse => pulse.nodeId));
  }
  get anchorInfo(): OrbitAnchorInfo[] { return this.entries.map(({ orbit, motion, visibleMemberCount }) => ({ orbit, motion, visibleMemberCount })); }

  getMotion(orbitId: string): CareerOrbitMotion | undefined { return this.byId.get(orbitId)?.motion; }

  setRotationSpeeds(speeds: CareerOrbitSpeeds): void {
    this.rotationSpeeds = validateCareerOrbitSpeeds(speeds);
  }

  getRotationSpeed(orbitId: string): number {
    return Object.hasOwn(this.rotationSpeeds, orbitId) ? this.rotationSpeeds[orbitId] : DEFAULT_ROTATION_SPEED;
  }

  /** Signed radians; quiet mission rings keep their existing stationary orientation. */
  getRotationPhase(orbitId: string): number | undefined {
    const entry = this.byId.get(orbitId);
    return entry ? orbitRotation(entry.orbit.index, this.rotationTime(entry), this.calm, entry.motion.revolving) : undefined;
  }

  private rotationTime(entry: OrbitEntry): number {
    return this.rotationTimes.get(entry.orbit.id) ?? 0;
  }

  getActivity(orbitId: string): OrbitActivityPresentation | undefined {
    const entry = this.byId.get(orbitId);
    if (!entry) return undefined;
    const strength = this.anchors.geometry.getAttribute('aActivityBorderStrength').getX(this.entries.indexOf(entry));
    return { ...entry.activity, borderStrength: strength };
  }

  setActivityDate(date: string): void {
    if (this.disposed || this.activityDate === date) return;
    this.activityDate = date;
    this.updateActivityBorders();
  }

  private updateActivityBorders(): void {
    const strengths = this.anchors.geometry.getAttribute('aActivityBorderStrength');
    this.entries.forEach((entry, index) => {
      entry.activity = activityPresentation(entry.orbit, this.activityDate);
      strengths?.setX(index, entry.activity.borderStrength);
    });
    if (strengths) strengths.needsUpdate = true;
    const selected = this.selection ? this.byId.get(this.selection.orbitId) : undefined;
    const marker = this.selectedAnchor.geometry.getAttribute('aActivityBorderStrength');
    marker.setX(0, selected?.activity.borderStrength ?? ORBIT_ACTIVITY_BORDER_DIM);
    marker.needsUpdate = true;
  }

  setData(orbits: readonly CareerOrbit[], nodes: ReadonlyMap<string, CareerGraphNode>, center: Vector3, radius: number): void {
    if (this.disposed) return;
    this.nodes = nodes;
    this.center.copy(center);
    this.radius = Math.max(1, radius);
    this.byId.clear();
    this.entries = [];
    this.ranges = [];
    const positions: number[] = [];
    const colors: number[] = [];
    const anchorColors: number[] = [];
    const rippleWeights: number[] = [];
    const addArc = (entry: OrbitEntry, from: number, to: number, offset: number, color: Color, selection: CareerOrbitSelection) => {
      if (to <= from) return;
      const start = positions.length / 3;
      const segments = Math.max(1, Math.ceil((to - from) / TAU * 220));
      for (let sample = 0; sample < segments; sample++) {
        for (let endpoint = 0; endpoint < 2; endpoint++) {
          const angle = from + (to - from) * (sample + endpoint) / segments;
          const r = (CAREER_ORBIT_PLANES[entry.orbit.index].radius + offset) * entry.motion.radiusScale;
          positions.push(Math.cos(angle) * r, Math.sin(angle) * r, 0);
          colors.push(color.r, color.g, color.b);
          rippleWeights.push(entry.motion.rippleWeight);
        }
      }
      this.ranges.push({ start, end: positions.length / 3, selection });
    };
    for (const orbit of orbits) {
      if (!Number.isInteger(orbit.index) || orbit.index < 0 || orbit.index >= CAREER_ORBIT_PLANES.length || this.byId.has(orbit.id)) continue;
      const entry: OrbitEntry = {
        orbit, motion: careerOrbitMotion(orbit), activity: activityPresentation(orbit, this.activityDate),
        start: positions.length / 3, end: 0, segmentAngles: new Map(),
        visibleMemberCount: orbit.memberIds.reduce((count, id) => count + Number(nodes.has(id)), 0),
      };
      this.byId.set(orbit.id, entry);
      this.entries.push(entry);
      // Hidden rings retain their integrated time; filtering must not restart an identity.
      if (!this.rotationTimes.has(orbit.id)) this.rotationTimes.set(orbit.id, this.phase);
      const color = new Color(orbit.color);
      color.toArray(anchorColors, anchorColors.length);
      if (!orbit.memberIds.length) color.multiplyScalar(0.32);
      addArc(entry, 0, TAU, 0, color.clone().multiplyScalar(0.62), { orbitId: orbit.id });
      const total = orbit.segments.reduce((count, segment) => count + segment.members.length, 0);
      let cursor = 0;
      for (const segment of orbit.segments) {
        if (!segment.members.length || !total) continue;
        const from = cursor / total * TAU;
        cursor += segment.members.length;
        const to = cursor / total * TAU;
        const gap = Math.min(0.035, (to - from) * 0.08);
        const selection = { orbitId: orbit.id, segmentId: segment.id };
        entry.segmentAngles.set(segment.id, (from + to) / 2);
        addArc(entry, from + gap, to - gap, 0.012, color, selection);
        if (orbit.kind === 'mission') {
          segment.members.forEach((member, index) => {
            const start = from + (to - from) * index / segment.members.length;
            const end = from + (to - from) * (index + 1) / segment.members.length;
            const slotGap = Math.min(0.008, (end - start) * 0.12);
            addArc(entry, start + slotGap, end - slotGap, 0.025, color.clone().multiplyScalar(STATUS_INTENSITY[member.status]), selection);
            if (member.current) addArc(entry, start + slotGap, end - slotGap, 0.037, entry.motion.quiet ? color : WHITE, selection);
          });
        }
      }
      entry.end = positions.length / 3;
    }
    this.local = new Float32Array(positions);
    this.originalColors = new Float32Array(colors);
    this.paths.geometry.dispose();
    this.paths.geometry.setAttribute('position', dynamicPositions(this.local));
    this.paths.geometry.setAttribute('color', dynamicPositions(this.originalColors));
    this.paths.geometry.setAttribute('aRippleWeight', new BufferAttribute(new Float32Array(rippleWeights), 1));
    this.anchors.geometry.dispose();
    this.anchors.geometry.setAttribute('position', dynamicPositions(new Float32Array(this.entries.length * 3)));
    this.anchors.geometry.setAttribute('color', new BufferAttribute(new Float32Array(anchorColors), 3));
    this.anchors.geometry.setAttribute('aRippleWeight', new BufferAttribute(new Float32Array(this.entries.map(entry => entry.motion.rippleWeight)), 1));
    this.anchors.geometry.setAttribute('aActivityBorderStrength',
      new BufferAttribute(new Float32Array(this.entries.map(entry => entry.activity.borderStrength)), 1).setUsage(DynamicDrawUsage));
    this.primary = this.entries.flatMap(entry => {
      const hub = nodes.get(entry.orbit.hubNodeId);
      return hub ? [{ entry, angle: CAREER_ORBIT_PLANES[entry.orbit.index].anchorAngle, offset: 0, target: hub.position, nodeId: hub.id }] : [];
    });
    this.allocateTethers(this.primaryTethers.geometry, this.primary, this.primarySegments);
    this.savedPulses.observe(this.entries.map(entry => entry.orbit), nodes);
    this.rebuildPulseGeometry();
    this.setSelection(this.selection, true);
    this.dirty = true;
    this.updateGeometry();
  }

  setSelection(selection: CareerOrbitSelection | null, refresh = false): void {
    if (this.disposed) return;
    const active = selection && this.byId.has(selection.orbitId) ? selection : null;
    if (!refresh && this.selection?.orbitId === active?.orbitId
      && this.selection?.segmentId === active?.segmentId) return;
    this.selection = active;
    const entry = selection ? this.byId.get(selection.orbitId) : undefined;
    const segment = selection?.segmentId ? entry?.orbit.segments.find(item => item.id === selection.segmentId) : undefined;
    const ids = selection?.segmentId ? segment?.members.map(member => member.nodeId) ?? [] : entry?.orbit.memberIds ?? [];
    const angle = selection?.segmentId
      ? entry?.segmentAngles.get(selection.segmentId) ?? (entry ? CAREER_ORBIT_PLANES[entry.orbit.index].anchorAngle : 0)
      : entry ? CAREER_ORBIT_PLANES[entry.orbit.index].anchorAngle : 0;
    this.details = [];
    for (const id of new Set(ids)) {
      const node = this.nodes.get(id);
      if (entry && node) this.details.push({ entry, angle, offset: segment?.members.length ? 0.012 : 0, target: node.position, nodeId: id });
    }
    this.detailSegments = this.details.length > 2000 ? 1 : this.details.length > 500 ? 2 : 8;
    this.allocateTethers(this.detailTethers.geometry, this.details, this.detailSegments);
    this.updatePathColors();
    this.selectedAnchor.visible = Boolean(this.selection);
    this.highlight.visible = this.highlightHalo.visible = Boolean(entry);
    this.highlightGeometry.instanceCount = entry ? ORBIT_HIGHLIGHT_SEGMENTS : 0;
    // Keep original status ticks readable above the glow and real work markers above both.
    this.paths.renderOrder = entry ? 1.3 : -1;
    const markerColor = entry ? new Color(entry.orbit.color) : WHITE;
    for (const material of [this.highlight.material, this.highlightHalo.material]) {
      material.color.copy(markerColor).multiplyScalar(1.5);
      material.uniforms.uRippleWeight.value = entry?.motion.rippleWeight ?? 0;
    }
    const colors = this.selectedAnchor.geometry.getAttribute('color');
    colors.setXYZ(0, markerColor.r, markerColor.g, markerColor.b);
    colors.needsUpdate = true;
    const weights = this.selectedAnchor.geometry.getAttribute('aRippleWeight');
    weights.setX(0, entry?.motion.rippleWeight ?? 1);
    weights.needsUpdate = true;
    this.updateActivityBorders();
    this.dirty = true;
    this.updateGeometry();
  }

  private updatePathColors(): void {
    const colors = this.paths.geometry.getAttribute('color');
    if (colors) {
      const values = colors.array;
      values.set(this.originalColors);
      for (const range of this.ranges) {
        let emphasis = 0;
        for (const pulse of this.savedPulses.active) {
          if (pulse.orbitId === range.selection.orbitId && pulse.segmentId === range.selection.segmentId) {
            emphasis = Math.max(emphasis, 0.55 * (1 - pulse.elapsed / SAVED_STATUS_PULSE_SECONDS));
          }
        }
        if (emphasis > 0) {
          for (let index = range.start * 3; index < range.end * 3; index += 3) {
            values[index] += (WHITE.r - values[index]) * emphasis;
            values[index + 1] += (WHITE.g - values[index + 1]) * emphasis;
            values[index + 2] += (WHITE.b - values[index + 2]) * emphasis;
          }
        }
      }
      colors.needsUpdate = true;
    }
    this.pulseColorsDirty = false;
  }

  getAnchor(selection: CareerOrbitSelection, target: Vector3): boolean {
    const entry = this.byId.get(selection.orbitId);
    if (!entry) return false;
    const angle = selection.segmentId ? entry.segmentAngles.get(selection.segmentId) : undefined;
    orbitPoint(entry.orbit.index, angle ?? CAREER_ORBIT_PLANES[entry.orbit.index].anchorAngle,
      this.rotationTime(entry), this.center, this.radius, target, angle === undefined ? 0 : 0.012, this.calm, entry.motion);
    return true;
  }

  getDisplayedAnchor(selection: CareerOrbitSelection, target: Vector3): boolean {
    if (!this.getAnchor(selection, target)) return false;
    if (this.byId.get(selection.orbitId)?.motion.rippleWeight) this.ripple?.deformWorld(target, target);
    return true;
  }

  setRippleField(field: CareerRippleField): void {
    this.ripple = field;
    for (const material of [this.paths.material, this.anchors.material, this.selectedAnchor.material, this.savedPulsePackets.material, this.primaryTethers.material, this.detailTethers.material, this.savedPulseTethers.material, this.highlight.material, this.highlightHalo.material]) {
      Object.assign(material.uniforms, field.uniforms);
    }
  }

  setVisible(value: boolean): void { this.object.visible = value; }
  setRimOnly(value: boolean): void {
    for (const material of [this.paths.material, this.highlight.material, this.highlightHalo.material]) {
      material.uniforms.uRimOnly.value = Number(value);
    }
  }
  resize(pixelRatio: number): void {
    for (const material of [this.anchors.material, this.selectedAnchor.material, this.savedPulsePackets.material]) {
      material.uniforms.uPixelRatio.value = pixelRatio;
    }
  }

  setMotionAllowed(value: boolean): void {
    if (this.disposed) return;
    this.motionAllowed = value;
    const wasActive = this.savedPulses.active.length > 0;
    this.savedPulses.setEnabled(value);
    if (!value && wasActive) {
      this.savedPulseTethers.visible = this.savedPulsePackets.visible = false;
      this.pulseTargets.clear();
      this.updatePulseGeometry();
      this.updatePathColors();
    }
  }

  update(camera: PerspectiveCamera, delta: number): void {
    if (this.disposed) return;
    if (this.motionAllowed && delta > 0 && Number.isFinite(delta)) {
      this.phase += delta;
      for (const entry of this.entries) {
        this.rotationTimes.set(entry.orbit.id, this.rotationTime(entry) + delta * this.getRotationSpeed(entry.orbit.id) / 100);
      }
      this.dirty = true;
    }
    if (this.savedPulses.active.length) {
      this.savedPulses.advance(delta);
      this.pulseColorsDirty = true;
    }
    camera.updateMatrixWorld();
    for (const material of [this.paths.material, this.highlight.material, this.highlightHalo.material]) {
      material.uniforms.uCenterView.value.copy(this.center).applyMatrix4(camera.matrixWorldInverse);
      material.uniforms.uRadius.value = this.radius;
    }
    if (this.dirty) this.updateGeometry();
    if (this.pulseColorsDirty) this.updatePathColors();
    this.updatePulseGeometry();
  }

  private updateGeometry(): void {
    const positions = this.paths.geometry.getAttribute('position');
    const anchors = this.anchors.geometry.getAttribute('position');
    if (!positions || !anchors) return;
    const values = positions.array;
    this.entries.forEach((entry, anchorIndex) => {
      const plane = CAREER_ORBIT_PLANES[entry.orbit.index];
      const angle = orbitRotation(entry.orbit.index, this.rotationTime(entry), this.calm, entry.motion.revolving);
      const cos = Math.cos(angle), sin = Math.sin(angle);
      for (let vertex = entry.start; vertex < entry.end; vertex++) {
        const index = vertex * 3;
        const x = (this.local[index] * cos - this.local[index + 1] * sin) * this.radius;
        const y = (this.local[index] * sin + this.local[index + 1] * cos) * this.radius;
        values[index] = this.center.x + plane.x.x * x + plane.y.x * y;
        values[index + 1] = this.center.y + plane.x.y * x + plane.y.y * y;
        values[index + 2] = this.center.z + plane.x.z * x + plane.y.z * y;
      }
      orbitPoint(entry.orbit.index, plane.anchorAngle, this.rotationTime(entry), this.center, this.radius, this.scratch, 0, this.calm, entry.motion);
      anchors.setXYZ(anchorIndex, this.scratch.x, this.scratch.y, this.scratch.z);
    });
    positions.needsUpdate = true;
    anchors.needsUpdate = true;
    if (this.selection && this.getAnchor(this.selection, this.scratch)) {
      const marker = this.selectedAnchor.geometry.getAttribute('position');
      marker.setXYZ(0, this.scratch.x, this.scratch.y, this.scratch.z);
      marker.needsUpdate = true;
    }
    this.updateTethers(this.primaryTethers.geometry, this.primary, this.primarySegments);
    this.updateTethers(this.detailTethers.geometry, this.details, this.detailSegments);
    this.updateHighlightGeometry();
    this.dirty = false;
  }

  private updateHighlightGeometry(): void {
    const entry = this.selection ? this.byId.get(this.selection.orbitId) : undefined;
    if (!entry) return;
    const angle = CAREER_ORBIT_PLANES[entry.orbit.index].anchorAngle;
    for (let segment = 0; segment < ORBIT_HIGHLIGHT_SEGMENTS; segment++) {
      orbitPoint(entry.orbit.index, angle + segment / ORBIT_HIGHLIGHT_SEGMENTS * TAU,
        this.rotationTime(entry), this.center, this.radius, this.scratch, 0, this.calm, entry.motion);
      this.scratch.toArray(this.highlightPositions, segment * 6);
      if (segment > 0) this.scratch.toArray(this.highlightPositions, (segment - 1) * 6 + 3);
    }
    this.highlightPositions.set(this.highlightPositions.subarray(0, 3), this.highlightPositions.length - 3);
    this.highlightBuffer.needsUpdate = true;
  }

  private allocateTethers(geometry: BufferGeometry, tethers: Tether[], segments: number): void {
    geometry.dispose();
    geometry.setAttribute('position', dynamicPositions(new Float32Array(tethers.length * segments * 6)));
    const colors = new Float32Array(tethers.length * segments * 6);
    const weights = new Float32Array(tethers.length * segments * 2);
    tethers.forEach((tether, index) => {
      const color = new Color(tether.entry.orbit.color);
      for (let vertex = 0; vertex < segments * 2; vertex++) {
        const offset = index * segments * 2 + vertex;
        color.toArray(colors, offset * 3);
        // Pin quiet ring ends while sharing the exact work-node field at t=1.
        weights[offset] = tether.entry.motion.quiet ? (Math.floor(vertex / 2) + vertex % 2) / segments : 1;
      }
    });
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.setAttribute('aRippleWeight', new BufferAttribute(weights, 1));
  }

  private rebuildPulseGeometry(): void {
    this.pulseTargets.clear();
    const tethers: Tether[] = [];
    for (const pulse of this.savedPulses.active) {
      const entry = this.byId.get(pulse.orbitId);
      const node = this.nodes.get(pulse.nodeId);
      const angle = entry?.segmentAngles.get(pulse.segmentId);
      if (!entry || !node || angle === undefined) continue;
      const tether = { entry, angle, offset: 0.012, target: node.position, nodeId: node.id };
      this.pulseTargets.set(pulse, tether);
      tethers.push(tether);
    }
    this.allocateTethers(this.savedPulseTethers.geometry, tethers, this.primarySegments);
    this.savedPulsePackets.geometry.dispose();
    this.savedPulsePackets.geometry.setAttribute('position', dynamicPositions(new Float32Array(tethers.length * 3)));
    this.savedPulsePackets.geometry.setAttribute('color', dynamicPositions(new Float32Array(tethers.length * 3)));
    this.savedPulsePackets.geometry.setAttribute('aRippleWeight', new BufferAttribute(new Float32Array(tethers.length).fill(1), 1));
    this.updatePulseGeometry();
  }

  private updatePulseGeometry(): void {
    const tethers = this.savedPulseTethers.geometry.getAttribute('position');
    const packets = this.savedPulsePackets.geometry.getAttribute('position');
    const colors = this.savedPulsePackets.geometry.getAttribute('color');
    let count = 0;
    for (const pulse of this.savedPulses.active) {
      const tether = this.pulseTargets.get(pulse);
      if (!tether || !tethers || !packets) continue;
      this.writeTether(tethers.array, tether, count, this.primarySegments);
      const progress = pulse.elapsed / SAVED_STATUS_PULSE_SECONDS;
      // writeTether leaves the real moving anchor, control point and node in these scratch vectors.
      const t = 1 - progress;
      const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      packets.setXYZ(count,
        a * this.scratch.x + b * this.middle.x + c * this.end.x,
        a * this.scratch.y + b * this.middle.y + c * this.end.y,
        a * this.scratch.z + b * this.middle.z + c * this.end.z);
      const brightness = Math.min(1, (1 - progress) * 5);
      colors.setXYZ(count, WHITE.r * brightness, WHITE.g * brightness, WHITE.b * brightness);
      count++;
    }
    this.savedPulseTethers.visible = this.savedPulsePackets.visible = count > 0;
    this.savedPulseTethers.geometry.setDrawRange(0, count * this.primarySegments * 2);
    this.savedPulsePackets.geometry.setDrawRange(0, count);
    if (count > 0) {
      tethers.needsUpdate = packets.needsUpdate = colors.needsUpdate = true;
    } else this.pulseTargets.clear();
  }

  private writeTether(values: ArrayLike<number> & { [index: number]: number }, tether: Tether, index: number, segments: number): void {
    const entry = tether.entry;
    orbitPoint(entry.orbit.index, tether.angle, this.rotationTime(entry), this.center, this.radius, this.scratch, tether.offset, this.calm, entry.motion);
    this.end.fromArray(tether.target);
    this.middle.copy(this.scratch).add(this.end).multiplyScalar(0.5);
    // A shallow curve, not a fabricated intermediate node. Both ends remain exact.
    this.middle.addScaledVector(CAREER_ORBIT_PLANES[entry.orbit.index].y, this.radius * 0.06);
    for (let segment = 0; segment < segments; segment++) {
      for (let endpoint = 0; endpoint < 2; endpoint++) {
        const t = (segment + endpoint) / segments;
        const a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
        const offset = (index * segments * 2 + segment * 2 + endpoint) * 3;
        values[offset] = a * this.scratch.x + b * this.middle.x + c * this.end.x;
        values[offset + 1] = a * this.scratch.y + b * this.middle.y + c * this.end.y;
        values[offset + 2] = a * this.scratch.z + b * this.middle.z + c * this.end.z;
      }
    }
  }

  private updateTethers(geometry: BufferGeometry, tethers: Tether[], segments: number): void {
    const positions = geometry.getAttribute('position');
    if (!positions) return;
    const values = positions.array;
    tethers.forEach((tether, index) => this.writeTether(values, tether, index, segments));
    positions.needsUpdate = true;
  }

  /** Screen-space tests use the very buffers rendered this frame, never stale base arcs. */
  pick(x: number, y: number, camera: PerspectiveCamera, width: number, height: number): CareerOrbitSelection | undefined {
    return this.pickAnchor(x, y, camera, width, height)?.selection ?? this.pickPath(x, y, camera, width, height);
  }

  pickAnchor(x: number, y: number, camera: PerspectiveCamera, width: number, height: number): CareerOrbitScreenHit | undefined {
    if (!this.object.visible || this.disposed) return undefined;
    const project = (point: Vector3) => {
      point.project(camera);
      const visible = point.z >= -1 && point.z <= 1;
      point.x = (point.x + 1) * width / 2;
      point.y = (1 - point.y) * height / 2;
      return visible;
    };
    let best: CareerOrbitSelection | undefined;
    let closest = Infinity;
    if (this.selection && this.getDisplayedAnchor(this.selection, this.projectedA) && project(this.projectedA)) {
      const distance = Math.hypot(x - this.projectedA.x, y - this.projectedA.y);
      if (distance <= SELECTED_ORBIT_ANCHOR_DIAMETER / 2 + 2) {
        closest = distance;
        best = this.selection;
      }
    }
    const anchors = this.anchors.geometry.getAttribute('position');
    if (!anchors) return undefined;
    this.entries.forEach((entry, index) => {
      this.projectedA.fromBufferAttribute(anchors, index);
      if (entry.motion.rippleWeight) this.ripple?.deformWorld(this.projectedA, this.projectedA);
      if (!project(this.projectedA)) return;
      const distance = Math.hypot(x - this.projectedA.x, y - this.projectedA.y);
      if (distance <= ORBIT_ANCHOR_DIAMETER / 2 + 2 && distance < closest) {
        closest = distance;
        best = { orbitId: entry.orbit.id };
      }
    });
    return best ? { selection: best, distance: closest } : undefined;
  }

  pickPath(x: number, y: number, camera: PerspectiveCamera, width: number, height: number): CareerOrbitSelection | undefined {
    if (!this.object.visible || this.disposed) return undefined;
    const project = (point: Vector3) => {
      point.project(camera);
      const visible = point.z >= -1 && point.z <= 1;
      point.x = (point.x + 1) * width / 2;
      point.y = (1 - point.y) * height / 2;
      return visible;
    };
    let best: CareerOrbitSelection | undefined;
    let closest = 6;
    const positions = this.paths.geometry.getAttribute('position');
    const weights = this.paths.geometry.getAttribute('aRippleWeight');
    const masked = this.paths.material.uniforms.uRimOnly.value > 0.5;
    const centerView = this.paths.material.uniforms.uCenterView.value as Vector3;
    for (const range of this.ranges) {
      for (let index = range.start; index < range.end; index += 2) {
        this.projectedA.fromBufferAttribute(positions, index);
        this.projectedB.fromBufferAttribute(positions, index + 1);
        if (weights.getX(index)) this.ripple?.deformWorld(this.projectedA, this.projectedA);
        if (weights.getX(index + 1)) this.ripple?.deformWorld(this.projectedB, this.projectedB);
        if (masked) {
          this.scratch.copy(this.projectedA).add(this.projectedB).multiplyScalar(0.5)
            .applyMatrix4(camera.matrixWorldInverse).normalize().cross(centerView);
          if (this.scratch.length() / this.radius < 1.035) continue;
        }
        if (!project(this.projectedA) || !project(this.projectedB)) continue;
        const dx = this.projectedB.x - this.projectedA.x, dy = this.projectedB.y - this.projectedA.y;
        const t = Math.max(0, Math.min(1, ((x - this.projectedA.x) * dx + (y - this.projectedA.y) * dy) / (dx * dx + dy * dy || 1)));
        const distance = Math.hypot(x - this.projectedA.x - dx * t, y - this.projectedA.y - dy * t);
        if (distance < closest) {
          closest = distance;
          best = range.selection;
        }
      }
    }
    return best;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const item of [this.paths, this.anchors, this.primaryTethers, this.detailTethers, this.selectedAnchor, this.savedPulseTethers, this.savedPulsePackets]) item.geometry.dispose();
    this.highlightGeometry.dispose();
    for (const material of [this.paths.material, this.anchors.material, this.selectedAnchor.material, this.savedPulsePackets.material, this.primaryTethers.material, this.detailTethers.material, this.savedPulseTethers.material, this.highlight.material, this.highlightHalo.material]) material.dispose();
    this.object.clear();
    this.entries = [];
    this.byId.clear();
    this.rotationTimes.clear();
    this.rotationSpeeds = {};
    this.nodes = new Map();
    this.primary = [];
    this.details = [];
    this.ranges = [];
    this.local = new Float32Array();
    this.originalColors = new Float32Array();
    this.savedPulses.dispose();
    this.pulseTargets.clear();
    this.ripple = null;
  }
}

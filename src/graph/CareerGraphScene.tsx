import { forwardRef, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import {
  AdditiveBlending,
  Box3,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Fog,
  InstancedBufferAttribute,
  MathUtils,
  MOUSE,
  PerspectiveCamera,
  Points,
  QuadraticBezierCurve3,
  Raycaster,
  Scene,
  ShaderMaterial,
  Sphere,
  Spherical,
  SRGBColorSpace,
  TOUCH,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { HolographicCore } from './HolographicCore';
import { DEFAULT_SPARK_DENSITY, DEFAULT_SPARK_LINE_DENSITY } from './careerSparkDensity';
import type { CareerOrbitSpeeds } from './careerOrbitSpeeds';
import { CoreHeartbeat } from './CoreHeartbeat';
import { HEARTBEAT_PERIOD_MS } from './coreHeartbeatTiming';
import { coreCenteredBounds } from './careerCoreFraming';
import { CAREER_ORBIT_SHELL_RADIUS, careerOrbitFrameRadius } from './careerOrbitMotion';
import { CAREER_NODE_HOME_DIRECTION } from './careerNodeSpacing';
import { careerEdgeVertexShader, careerRippleVertexShader, createRippleUniforms } from './careerRipple';
import { CareerOrbitVisuals, ORBIT_ANCHOR_DIAMETER, SELECTED_ORBIT_ANCHOR_DIAMETER } from './CareerOrbitVisuals';
import type { OrbitActivityPresentation, OrbitAnchorInfo } from './CareerOrbitVisuals';
import { careerNodeColor, careerNodeStatusClass } from './careerGraphColors';
import type { CareerOrbitSelection } from './careerOrbitTypes';
import { chooseCareerSceneHit, compactOrbitTooltip, showOrbitIdentityLabels } from './careerSceneInteraction';
import type { CareerNodeScreenHit, CareerSceneHit } from './careerSceneInteraction';
import { CURSOR_REPULSION_PX, cursorRepulsionOffset } from './edgeRepulsion';
import type { CareerGraph } from './careerGraphModel';
import './career-graph-scene.css';

type GraphNode = CareerGraph['nodes'][number];
type SceneStatus = 'ready' | 'unavailable' | 'lost';
type Direction = 'left' | 'right' | 'up' | 'down';
type LabelBox = { left: number; top: number; right: number; bottom: number };

export interface CareerGraphSceneHandle {
  resetView: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  focusNode: (id: string) => void;
  focusOrbit: (selection: CareerOrbitSelection) => void;
  rotate: (direction: Direction) => void;
}

export interface CareerGraphSceneProps {
  graph: CareerGraph;
  /** Current workspace calendar date; updates snapshot activity borders without rebuilding the graph. */
  activityDate?: string;
  /** Bounds before item-level hiding, so checkbox choices do not shift remaining orbits. */
  framingNodes?: readonly GraphNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  selectedOrbit?: CareerOrbitSelection | null;
  onOrbitSelect?: (selection: CareerOrbitSelection) => void;
  autoRotate: boolean;
  /** Ambient motion only; defaults to true, or autoRotate in the focus profile. */
  animate?: boolean;
  /** Explicit user opt-in only; clear when the OS changes to reduced motion. */
  allowReducedMotion?: boolean;
  /** Clip the shell's projected interior; defaults to false, or true in focus. */
  rimOnly?: boolean;
  /** Show derived orbit paths, anchors and membership tethers. */
  showRings?: boolean;
  /** Show decorative particles independently of rings and node glow. */
  showSparks?: boolean;
  /** Percentage of the original particle budget; independent of the visibility switch. */
  sparkDensity?: number;
  sparkLineDensity?: number;
  orbitSpeeds?: CareerOrbitSpeeds;
  /** Independent visual rhythm from the actual core; still respects ambient motion preferences. */
  heartbeat?: boolean;
  onInteraction?: () => void;
  onStatusChange?: (status: SceneStatus, message?: string) => void;
  visualProfile?: 'career' | 'focus';
}

interface SceneCallbacks {
  onSelect: (id: string) => void;
  onOrbitSelect: (selection: CareerOrbitSelection) => void;
  onInteraction: () => void;
  onStatusChange: (status: SceneStatus, message?: string) => void;
}

const CORE_COLOR = new Color('#EEE8D5');
// Every supplied relationship, including shared-skill, uses the same palette orange.
const EDGE_COLOR = new Color('#F34B00');
const HOME_DIRECTION = new Vector3(...CAREER_NODE_HOME_DIRECTION).normalize();
const FRAME_INTERVAL = 1000 / 30;
const VIEW_ATTRIBUTE_INTERVAL = 120;
const CURSOR_EPSILON = 0.0001;

const pointVertexShader = `
  ${careerRippleVertexShader}
  attribute float aSize;
  attribute float aKind;
  uniform float uHeight;
  uniform float uPixelRatio;
  uniform float uSizeScale;
  uniform float uCoreScale;
  varying vec3 vColor;
  varying float vKind;
  varying float vDepth;
  void main() {
    vec4 viewPosition = rippleView(modelViewMatrix * vec4(position, 1.0));
    vColor = color;
    vKind = aKind;
    vDepth = -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
    float coreScale = aKind > 2.5 ? uCoreScale : 1.0;
    gl_PointSize = clamp(aSize * uHeight / max(1.0, vDepth), 7.0 * uPixelRatio, 90.0 * uPixelRatio) * uSizeScale * coreScale;
  }
`;

const pointFragmentShader = `
  uniform float uNear;
  uniform float uFar;
  varying vec3 vColor;
  varying float vKind;
  varying float vDepth;
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;
    float glow = exp(-5.5 * r * r) * 0.28;
    float center = 1.0 - smoothstep(0.17, 0.3, r);
    float ring = (1.0 - smoothstep(0.035, 0.09, abs(r - 0.55))) * 0.65;
    if (vKind > 1.5) {
      ring = max(ring, (1.0 - smoothstep(0.015, 0.055, abs(r - 0.8))) * 0.5);
    }
    if (vKind > 0.5 && vKind < 1.5) {
      float diamond = abs(p.x) + abs(p.y);
      ring = (1.0 - smoothstep(0.035, 0.09, abs(diamond - 0.6))) * 0.75;
    }
    float depth = mix(1.0, 0.4, smoothstep(uNear, uFar, vDepth));
    float alpha = max(center, max(ring, glow)) * depth;
    float backing = vKind > 2.5 ? 0.0 : (1.0 - smoothstep(0.48, 0.64, r)) * 0.78;
    float coreFill = vKind > 2.5 ? 1.0 - smoothstep(0.62, 0.76, r) : 0.0;
    vec3 ink = mix(vec3(0.0, 0.005, 0.008), vColor, max(center, ring));
    ink = mix(ink, vColor, coreFill);
    gl_FragColor = vec4(ink, max(coreFill, max(alpha, backing)));
    #include <colorspace_fragment>
  }
`;

const selectionFragmentShader = `
  varying vec3 vColor;
  varying float vKind;
  varying float vDepth;
  void main() {
    vec2 p = (gl_PointCoord - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ring = 1.0 - smoothstep(0.018, 0.04, abs(r - 0.7));
    float corners = step(0.32, min(abs(p.x), abs(p.y)));
    float outer = (1.0 - smoothstep(0.012, 0.03, abs(r - 0.9))) * corners;
    gl_FragColor = vec4(vColor, max(ring * 0.7, outer));
    #include <colorspace_fragment>
  }
`;

const nodeAuraFragmentShader = `
  uniform float uNear;
  uniform float uFar;
  uniform float uOpacity;
  uniform float uCoreGlow;
  varying vec3 vColor;
  varying float vKind;
  varying float vDepth;
  void main() {
    float r = length(gl_PointCoord - 0.5) * 2.0;
    if (r > 1.0) discard;
    float depth = mix(1.0, 0.25, smoothstep(uNear, uFar, vDepth));
    float glow = exp(-5.0 * r * r) * (1.0 - smoothstep(0.7, 1.0, r));
    float emphasis = vKind > 1.5 ? 1.0 : 0.18;
    float coreGlow = vKind > 2.5 ? uCoreGlow : 1.0;
    gl_FragColor = vec4(vColor * 3.2 * coreGlow, glow * uOpacity * depth * emphasis);
    #include <colorspace_fragment>
  }
`;

function nodeSize(node: GraphNode): number {
  if (node.kind === 'core') return 15;
  if (node.kind === 'mission') return 9;
  if (node.kind === 'history' || node.kind === 'opportunity' || node.kind === 'freelance') return 6.5;
  return node.current ? 6 : 4;
}

function pointMaterial(selected = false, aura = false): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: pointVertexShader,
    fragmentShader: selected ? selectionFragmentShader : aura ? nodeAuraFragmentShader : pointFragmentShader,
    vertexColors: true,
    uniforms: {
      ...createRippleUniforms(),
      uHeight: { value: 1 },
      uPixelRatio: { value: 1 },
      uSizeScale: { value: aura ? 1.35 : 1 },
      uCoreScale: { value: 1 },
      uCoreGlow: { value: 1 },
      uNear: { value: 100 },
      uFar: { value: 500 },
      uOpacity: { value: 0.5 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: !selected,
    toneMapped: false,
    ...(aura ? { blending: AdditiveBlending } : {}),
  });
}

function edgeMaterial(opacity: number, width: number, glow = false): LineMaterial {
  return new LineMaterial({
    color: EDGE_COLOR.clone().multiplyScalar(glow ? 1.8 : 1),
    linewidth: width,
    worldUnits: false,
    opacity,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    fog: true,
  });
}

function writePointGeometry(geometry: BufferGeometry, nodes: readonly GraphNode[], selected = false): void {
  const positions = new Float32Array(nodes.length * 3);
  const colors = new Float32Array(nodes.length * 3);
  const sizes = new Float32Array(nodes.length);
  const kinds = new Float32Array(nodes.length);
  nodes.forEach((node, index) => {
    positions.set(node.position, index * 3);
    const color = selected ? CORE_COLOR : new Color(careerNodeColor(node));
    color.toArray(colors, index * 3);
    sizes[index] = selected ? Math.max(14, nodeSize(node) * 1.85) : nodeSize(node);
    kinds[index] = node.kind === 'core' ? 3 : node.kind === 'mission' ? 2 : node.kind === 'evidence' || node.status === 'reference' ? 1 : 0;
  });
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('aKind', new Float32BufferAttribute(kinds, 1));
  geometry.computeBoundingSphere();
}

function writeActivityDiagnostics(element: HTMLElement, activity?: OrbitActivityPresentation): void {
  element.dataset.workedToday = activity?.workedToday == null ? '' : String(activity.workedToday);
  element.dataset.workStreak = activity?.streak == null ? '' : String(activity.streak);
  element.dataset.activityAsOfDate = activity?.asOfDate ?? '';
  element.dataset.activityBorderStrength = activity?.borderStrength.toFixed(2) ?? '';
}

function writeEdgeGeometry(
  geometry: LineSegmentsGeometry,
  edges: CareerGraph['edges'],
  nodes: ReadonlyMap<string, GraphNode>,
  segments: number,
): void {
  const validEdges = edges.filter(edge => nodes.has(edge.source) && nodes.has(edge.target));
  // Adjacent curve segments share endpoints; per-segment round caps multiply
  // overdraw and bloom at every sample, so draw only the ribbon bodies.
  geometry.setDrawRange(6, 6);
  const positions = new Float32Array(validEdges.length * segments * 6);
  const curveTimes = new Float32Array(validEdges.length * segments * 2);
  validEdges.forEach((edge, index) => {
    const source = nodes.get(edge.source)!;
    const target = nodes.get(edge.target)!;
    const start = new Vector3().fromArray(source.position);
    const end = new Vector3().fromArray(target.position);
    const middle = start.clone().add(end).multiplyScalar(0.5);
    middle.addScaledVector(middle.clone().normalize(), Math.min(8, start.distanceTo(end) * 0.17));
    const curve = new QuadraticBezierCurve3(start, middle, end);
    const sample = new Vector3();
    for (let segment = 0; segment < segments; segment++) {
      const instance = index * segments + segment;
      const from = segment / segments;
      const to = (segment + 1) / segments;
      curve.getPoint(from, sample).toArray(positions, instance * 6);
      curve.getPoint(to, sample).toArray(positions, instance * 6 + 3);
      curveTimes[instance * 2] = from;
      curveTimes[instance * 2 + 1] = to;
    }
  });
  geometry.setPositions(positions);
  geometry.setAttribute('aCurveT', new InstancedBufferAttribute(curveTimes, 2));
}

function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const context = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
  if (!context) throw new Error('This browser could not create a WebGL 2 graphics context.');
  try {
    return new WebGLRenderer({ canvas, context, antialias: true, alpha: false });
  } catch (error) {
    context.getExtension('WEBGL_lose_context')?.loseContext();
    throw error;
  }
}

class CareerScene implements CareerGraphSceneHandle {
  private readonly scene = new Scene();
  private readonly workScene = new Scene();
  private readonly fog = new Fog('#000F13', 100, 500);
  private readonly camera = new PerspectiveCamera(46, 1, 0.1, 3000);
  private readonly controls: OrbitControls;
  private readonly nodeGeometry = new BufferGeometry();
  private readonly edgeGeometry = new LineSegmentsGeometry();
  private readonly selectedGeometry = new BufferGeometry();
  private readonly selectedEdgeGeometry = new LineSegmentsGeometry();
  private readonly nodesMaterial = pointMaterial();
  private readonly selectionMaterial = pointMaterial(true);
  private readonly nodeAuraMaterial = pointMaterial(false, true);
  private readonly edgesMaterial = edgeMaterial(0.5, 0.9);
  private readonly selectedEdgesMaterial = edgeMaterial(0.85, 1.5);
  private readonly edgeGlowMaterial = edgeMaterial(0.16, 1.6, true);
  private readonly selectedEdgeGlowMaterial = edgeMaterial(0.38, 2.2, true);
  private readonly points = new Points(this.nodeGeometry, this.nodesMaterial);
  private readonly nodeAuras = new Points(this.nodeGeometry, this.nodeAuraMaterial);
  private readonly selection = new Points(this.selectedGeometry, this.selectionMaterial);
  private readonly edges = new LineSegments2(this.edgeGeometry, this.edgesMaterial);
  private readonly selectedEdges = new LineSegments2(this.selectedEdgeGeometry, this.selectedEdgesMaterial);
  private readonly edgeGlow = new LineSegments2(this.edgeGeometry, this.edgeGlowMaterial);
  private readonly selectedEdgeGlow = new LineSegments2(this.selectedEdgeGeometry, this.selectedEdgeGlowMaterial);
  private readonly hologram: HolographicCore;
  private readonly heartbeat: CoreHeartbeat;
  private readonly orbits: CareerOrbitVisuals;
  private readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloomPass = new UnrealBloomPass(new Vector2(256, 256), 0.72, 0.08, 0.9);
  private readonly outputPass = new OutputPass();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly projected = new Vector3();
  private readonly pickPosition = new Vector3();
  private readonly bounds = new Sphere(new Vector3(), 100);
  private readonly focusBounds = new Sphere(new Vector3(), 124);
  private readonly corePosition = new Vector3();
  private coreNode: GraphNode | null = null;
  private readonly resizeObserver: ResizeObserver;
  private readonly intersectionObserver: IntersectionObserver;
  private readonly motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  private lastReducedMotion = this.motionPreference.matches;
  private readonly cursorUniforms = {
    uCursor: { value: new Vector2() },
    uCursorViewport: { value: new Vector2(1, 1) },
    uCursorStrength: { value: 0 },
    uCursorRadius: { value: 115 },
    uCursorOffset: { value: CURSOR_REPULSION_PX },
  };
  private readonly cursorTarget = new Vector2();
  private cursorTargetStrength = 0;
  private cursorHasPosition = false;
  private cursorRevision = 0;
  private lastCursorAttribute = 0;
  private edgeSegments = 24;
  private graph: CareerGraph | null = null;
  private nodeMap = new Map<string, GraphNode>();
  private selectedId: string | null = null;
  private selectedOrbit: CareerOrbitSelection | null = null;
  private hoveredOrbit: CareerOrbitSelection | null = null;
  private hoveredId: string | null = null;
  private labelId: string | null = null;
  private missionLabels: { node: GraphNode; element: HTMLSpanElement; width: number; height: number }[] = [];
  private orbitLabels: (OrbitAnchorInfo & { element: HTMLSpanElement; diagnostic: HTMLSpanElement; width: number; height: number })[] = [];
  private readonly orbitLabelRects: LabelBox[] = [];
  private orbitLabelRectCount = 0;
  private readonly orbitPoint = new Vector3();
  private ringsVisible = true;
  private autoRotate = false;
  private animate = false;
  private allowReducedMotion = false;
  private intersecting = true;
  private lost = false;
  private disposed = false;
  private framed = false;
  private reportedReady = false;
  private frame = 0;
  private lastDraw = 0;
  private animationRevision = 0;
  private lastAnimationAttribute = 0;
  private viewRevision = 0;
  private lastViewAttribute = 0;
  private viewTimer = 0;
  private hoverTimer = 0;
  private lastHover = 0;
  private hoverPosition: { x: number; y: number } | null = null;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private pointers = new Set<number>();
  private gesture: { pointerId: number; x: number; y: number; moved: boolean; selectable: boolean } | null = null;

  constructor(
    private readonly root: HTMLDivElement,
    private readonly viewport: HTMLDivElement,
    private readonly label: HTMLDivElement,
    private readonly marker: HTMLDivElement,
    private readonly missionLabelLayer: HTMLDivElement,
    private readonly orbitLabelLayer: HTMLDivElement,
    private readonly orbitMarker: HTMLDivElement,
    private readonly renderer: WebGLRenderer,
    private readonly callbacks: SceneCallbacks,
    private readonly visualProfile: 'career' | 'focus',
  ) {
    this.hologram = new HolographicCore(visualProfile === 'focus', false);
    this.heartbeat = new CoreHeartbeat(visualProfile === 'focus');
    this.orbits = new CareerOrbitVisuals(visualProfile === 'focus');
    this.hologram.setRippleField(this.heartbeat.field.uniforms);
    this.orbits.setRippleField(this.heartbeat.field);
    for (const material of [this.nodesMaterial, this.selectionMaterial, this.nodeAuraMaterial]) {
      Object.assign(material.uniforms, this.heartbeat.field.uniforms);
    }
    this.scene.background = new Color('#000F13');
    this.scene.fog = this.fog;
    this.workScene.fog = this.fog;
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.camera.position.copy(HOME_DIRECTION).multiplyScalar(340);
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = false;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = true;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 1800;
    this.controls.rotateSpeed = 0.65;
    this.controls.zoomSpeed = 0.8;
    this.controls.autoRotateSpeed = visualProfile === 'focus' ? 0.24 : 0.3;
    this.root.dataset.cameraRotationSpeed = String(this.controls.autoRotateSpeed);
    this.controls.enabled = visualProfile !== 'focus';
    this.controls.mouseButtons = { LEFT: MOUSE.ROTATE, MIDDLE: MOUSE.DOLLY, RIGHT: MOUSE.PAN };
    this.controls.touches = { ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_PAN };
    this.controls.addEventListener('change', this.onCameraChange);
    this.controls.addEventListener('start', this.onControlStart);

    for (const material of [this.edgesMaterial, this.selectedEdgesMaterial, this.edgeGlowMaterial, this.selectedEdgeGlowMaterial]) {
      Object.assign(material.uniforms, this.cursorUniforms, this.heartbeat.field.uniforms);
      material.vertexShader = careerEdgeVertexShader(material.vertexShader);
    }

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);
    this.bloomPass.threshold = 0.06;
    this.bloomPass.strength = visualProfile === 'focus' ? 0.28 : 0.44;
    this.bloomPass.radius = 0;
    this.bloomPass.compositeMaterial.uniforms.bloomFactors.value = [1, 0.08, 0, 0, 0];
    this.root.dataset.ambience = 'semantic-orbits-decorative-sparks';
    this.root.dataset.postprocessing = 'gpu-bloom';
    this.root.dataset.edgeStyle = 'orange-screen-space-ribbons';
    this.root.dataset.edgeColor = '#F34B00';
    this.root.dataset.edgeRepulsion = visualProfile === 'focus' ? 'disabled' : 'view-space-interiors';
    this.root.dataset.cursorState = visualProfile === 'focus' ? 'disabled' : 'idle';
    this.points.frustumCulled = false;
    this.nodeAuras.frustumCulled = false;
    this.edges.frustumCulled = this.selectedEdges.frustumCulled = false;
    this.edgeGlow.frustumCulled = this.selectedEdgeGlow.frustumCulled = false;
    this.selection.frustumCulled = false;
    this.selection.visible = false;
    this.selection.renderOrder = 3;
    this.edges.renderOrder = 0;
    this.points.renderOrder = 2;
    this.selectedEdges.renderOrder = 1;
    this.scene.add(this.hologram.object, this.edgeGlow, this.selectedEdgeGlow, this.nodeAuras);
    this.workScene.add(this.orbits.object, this.edges, this.points, this.selectedEdges, this.selection);

    this.canvas.addEventListener('pointerdown', this.onPointerDown, true);
    this.canvas.addEventListener('pointermove', this.onPointerMove, true);
    this.canvas.addEventListener('pointerup', this.onPointerUp, true);
    this.canvas.addEventListener('pointercancel', this.onPointerCancel, true);
    this.canvas.addEventListener('lostpointercapture', this.onPointerCancel);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('keydown', this.onKeyDown);
    this.canvas.addEventListener('webglcontextlost', this.onContextLost);
    this.canvas.addEventListener('webglcontextrestored', this.onContextRestored);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.motionPreference.addEventListener('change', this.onMotionChange);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(this.viewport);
    this.intersectionObserver = new IntersectionObserver(entries => {
      this.intersecting = entries.some(entry => entry.isIntersecting);
      this.syncVisibility();
    }, { threshold: 0 });
    this.intersectionObserver.observe(this.root);
    this.setRimOnly(visualProfile === 'focus');
    this.resize();
  }

  private get canvas(): HTMLCanvasElement { return this.renderer.domElement; }

  setGraph(graph: CareerGraph, framingNodes: readonly GraphNode[] = graph.nodes): void {
    const previous = this.graph;
    const pointsChanged = !previous || previous.nodes.length !== graph.nodes.length || graph.nodes.some((node, index) => {
      const before = previous.nodes[index];
      return node.id !== before.id || node.kind !== before.kind || node.status !== before.status || node.missionId !== before.missionId
        || node.current !== before.current || node.position.some((value, axis) => value !== before.position[axis]);
    });
    const edgesChanged = pointsChanged || !previous || previous.edges.length !== graph.edges.length
      || graph.edges.some((edge, index) => {
        const before = previous.edges[index];
        return edge.id !== before.id || edge.source !== before.source || edge.target !== before.target;
      });
    this.graph = graph;
    this.nodeMap = new Map(graph.nodes.map(node => [node.id, node]));
    // Metadata-only updates (including mission mode) leave work geometry intact.
    if (pointsChanged) {
      this.nodeGeometry.dispose();
      writePointGeometry(this.nodeGeometry, graph.nodes);
    }
    this.edgeSegments = graph.edges.length > 2000 ? 6 : 12;
    if (this.visualProfile === 'focus') this.edgeSegments /= 2;
    if (edgesChanged) {
      this.edgeGeometry.dispose();
      writeEdgeGeometry(this.edgeGeometry, graph.edges, this.nodeMap, this.edgeSegments);
    }
    const dense = graph.edges.length > 2000;
    this.edgesMaterial.opacity = this.visualProfile === 'focus' ? 0.3 : dense ? 0.32 : 0.5;
    this.edgeGlowMaterial.opacity = this.visualProfile === 'focus' ? 0.08 : dense ? 0.1 : 0.16;
    this.nodeAuraMaterial.uniforms.uOpacity.value = this.visualProfile === 'focus' ? 0.08 : graph.nodes.length > 2000 ? 0.1 : 0.22;
    const box = new Box3();
    for (const node of framingNodes) box.expandByPoint(this.projected.fromArray(node.position));
    if (!box.isEmpty()) {
      const framingCore = framingNodes.find(node => node.kind === 'core');
      if (framingCore) this.bounds.center.fromArray(framingCore.position);
      else box.getCenter(this.bounds.center);
      let radiusSquared = 35 * 35;
      for (const node of framingNodes) {
        radiusSquared = Math.max(radiusSquared, this.projected.fromArray(node.position).distanceToSquared(this.bounds.center));
      }
      this.bounds.radius = Math.sqrt(radiusSquared);
    } else {
      this.bounds.set(new Vector3(), 60);
    }
    const core = graph.nodes.find(node => node.kind === 'core');
    this.coreNode = core ?? null;
    if (core) this.corePosition.fromArray(core.position);
    const previousFocusBounds = this.focusBounds.clone();
    coreCenteredBounds(this.bounds, core ? this.corePosition : undefined, this.focusBounds);
    this.focusBounds.radius = this.bounds.radius * CAREER_ORBIT_SHELL_RADIUS
      + this.focusBounds.center.distanceTo(this.bounds.center);
    const focusBoundsChanged = previousFocusBounds.radius !== this.focusBounds.radius
      || !previousFocusBounds.center.equals(this.focusBounds.center);
    this.hologram.setBounds(this.bounds.center, this.bounds.radius, core ? this.corePosition : undefined);
    this.heartbeat.setSource(core ? this.corePosition : undefined, this.focusBounds.radius, this.bounds.radius);
    this.refreshHeartbeat();
    this.hologram.object.visible = framingNodes.length > 0;
    const disconnected = graph.disconnectedNodeIds;
    const tetherNodes = disconnected?.size
      ? new Map([...this.nodeMap].filter(([id]) => !disconnected.has(id))) : this.nodeMap;
    this.orbits.setData(graph.orbits, tetherNodes, this.bounds.center, this.bounds.radius);
    this.root.dataset.orbitCount = String(this.orbits.orbitCount);
    this.canvas.dataset.orbitCount = String(this.orbits.orbitCount);
    for (const element of [this.root, this.canvas]) {
      element.dataset.orbitDataRadius = this.bounds.radius.toFixed(6);
      element.dataset.orbitCenterX = this.bounds.center.x.toFixed(6);
      element.dataset.orbitCenterY = this.bounds.center.y.toFixed(6);
      element.dataset.orbitCenterZ = this.bounds.center.z.toFixed(6);
    }
    this.root.dataset.nodeCount = String(graph.nodes.length);
    this.root.dataset.edgeCount = String(graph.edges.filter(edge => this.nodeMap.has(edge.source) && this.nodeMap.has(edge.target)).length);
    this.hoveredId = null;
    this.hoveredOrbit = null;
    this.labelId = null;
    this.missionLabelLayer.replaceChildren();
    this.missionLabels = graph.nodes.filter(node => this.visualProfile === 'career' && node.kind === 'mission').map(node => {
      const element = document.createElement('span');
      element.className = 'career-graph-scene__mission-label';
      element.dataset.nodeId = node.id;
      element.textContent = node.label;
      element.style.visibility = 'hidden';
      this.missionLabelLayer.appendChild(element);
      return { node, element, width: 0, height: 0 };
    });
    this.orbitLabelLayer.replaceChildren();
    this.orbitLabels = this.orbits.anchorInfo.map(info => {
      const element = document.createElement('span');
      element.className = 'career-graph-scene__orbit-label';
      element.dataset.orbitId = info.orbit.id;
      element.dataset.orbitIndex = String(info.orbit.index);
      element.dataset.orbitMode = info.orbit.kind === 'mission' ? info.orbit.missionMode ?? '' : 'collection';
      element.dataset.orbitNormalizedRadius = info.motion.normalizedRadius.toFixed(6);
      element.dataset.missionMode = element.dataset.orbitMode;
      element.dataset.orbitRadius = element.dataset.orbitNormalizedRadius;
      element.dataset.orbitColor = info.orbit.color;
      element.dataset.memberCount = String(info.orbit.memberIds.length);
      element.dataset.visibleMemberCount = String(info.visibleMemberCount);
      element.dataset.emptyState = !info.orbit.memberIds.length ? 'empty' : !info.visibleMemberCount ? 'filtered' : 'populated';
      element.style.setProperty('--orbit-color', info.orbit.color);
      element.textContent = `${info.orbit.label}${!info.orbit.memberIds.length ? ' · No records' : !info.visibleMemberCount ? ' · Members hidden' : ''}`;
      this.orbitLabelLayer.appendChild(element);
      const diagnostic = document.createElement('span');
      diagnostic.className = 'career-graph-scene__orbit-diagnostic';
      diagnostic.hidden = true;
      diagnostic.dataset.orbitId = info.orbit.id;
      diagnostic.dataset.orbitIndex = String(info.orbit.index);
      diagnostic.dataset.missionMode = element.dataset.missionMode;
      diagnostic.dataset.orbitRadius = element.dataset.orbitRadius;
      diagnostic.dataset.orbitColor = info.orbit.color;
      this.orbitLabelLayer.appendChild(diagnostic);
      return { ...info, element, diagnostic, width: 0, height: 0 };
    });
    this.setOrbitSelection(this.selectedOrbit, true);
    if ((!this.framed || (this.visualProfile === 'focus' && focusBoundsChanged))
      && (graph.nodes.length > 0 || graph.orbits.length > 0)) {
      this.frameAll(this.framed && this.visualProfile === 'focus');
      this.framed = true;
    }
    this.requestFrame();
  }

  setSelection(id: string | null): void {
    this.selectedId = id;
    const node = id ? this.nodeMap.get(id) : undefined;
    const orbit = this.graph?.orbits.find(item => item.id === this.selectedOrbit?.orbitId);
    const memberIds = this.selectedOrbit?.segmentId
      ? orbit?.segments.find(segment => segment.id === this.selectedOrbit?.segmentId)?.members.map(member => member.nodeId) ?? []
      : orbit?.memberIds ?? [];
    const highlights = node ? [node] : memberIds.map(memberId => this.nodeMap.get(memberId)).filter((item): item is GraphNode => Boolean(item));
    this.selection.visible = highlights.length > 0;
    this.selectedGeometry.dispose();
    this.selectedEdgeGeometry.dispose();
    writePointGeometry(this.selectedGeometry, highlights, true);
    writeEdgeGeometry(
      this.selectedEdgeGeometry,
      this.graph?.edges.filter(edge => edge.source === id || edge.target === id) ?? [],
      this.nodeMap,
      this.edgeSegments,
    );
    this.canvas.dataset.selectedNodeId = node?.id ?? '';
    this.marker.dataset.nodeId = node?.id ?? '';
    this.requestFrame();
  }

  setOrbitSelection(selection: CareerOrbitSelection | null, refresh = false): void {
    if (!refresh && this.selectedOrbit?.orbitId === selection?.orbitId
      && this.selectedOrbit?.segmentId === selection?.segmentId) return;
    this.selectedOrbit = selection;
    const active = selection && this.graph?.orbits.some(orbit => orbit.id === selection.orbitId) ? selection : null;
    this.orbits.setSelection(active);
    for (const element of [this.root, this.canvas]) {
      element.dataset.selectedOrbitId = active?.orbitId ?? '';
      element.dataset.selectedOrbitSegmentId = active?.segmentId ?? '';
      element.dataset.selectedSegmentId = active?.segmentId ?? '';
      element.dataset.orbitTetherCount = String(this.orbits.tetherCount);
      element.dataset.orbitTetherSegments = String(this.orbits.detailTetherSegments);
      element.dataset.orbitPulseCount = String(this.orbits.savedPulseCount);
    }
    this.orbitMarker.dataset.orbitId = active?.orbitId ?? '';
    this.orbitMarker.dataset.segmentId = active?.segmentId ?? '';
    this.updateSelectedOrbitDiagnostics();
    this.setSelection(this.selectedId);
  }

  private updateSelectedOrbitDiagnostics(): void {
    const orbit = this.graph?.orbits.find(item => item.id === this.selectedOrbit?.orbitId);
    const motion = orbit ? this.orbits.getMotion(orbit.id) : undefined;
    const mode = orbit ? orbit.kind === 'mission' ? orbit.missionMode ?? '' : 'collection' : '';
    const radius = motion?.normalizedRadius.toFixed(6) ?? '';
    const revolving = String(Boolean(motion?.revolving));
    const motionRunning = String(Boolean(motion?.revolving && this.orbitMotionAllowed
      && orbit && this.orbits.getRotationSpeed(orbit.id) > 0));
    for (const element of [this.root, this.canvas]) {
      element.dataset.selectedOrbitMode = mode;
      element.dataset.selectedOrbitNormalizedRadius = radius;
      element.dataset.selectedOrbitRevolving = revolving;
      element.dataset.selectedOrbitMotionRunning = motionRunning;
      element.dataset.highlightedOrbitId = this.orbits.highlightedOrbitId ?? '';
      element.dataset.orbitHighlightVisible = String(this.orbits.highlightVisible && !this.lost);
      element.dataset.orbitHighlightWidth = String(this.orbits.highlight.material.linewidth);
      element.dataset.orbitHighlightHaloWidth = String(this.orbits.highlightHalo.material.linewidth);
      element.dataset.orbitHighlightSegments = String(this.orbits.highlight.geometry.instanceCount);
    }
    this.orbitMarker.dataset.orbitMode = mode;
    this.orbitMarker.dataset.missionMode = mode;
    this.orbitMarker.dataset.orbitNormalizedRadius = radius;
    this.orbitMarker.dataset.orbitRadius = radius;
    this.orbitMarker.dataset.orbitRevolving = revolving;
    this.orbitMarker.dataset.orbitMotionRunning = motionRunning;
    this.orbitMarker.dataset.orbitColor = orbit?.color ?? '';
    writeActivityDiagnostics(this.orbitMarker, orbit ? this.orbits.getActivity(orbit.id) : undefined);
    for (const entry of this.orbitLabels) {
      const activity = this.orbits.getActivity(entry.orbit.id);
      for (const marker of [entry.element, entry.diagnostic]) {
        marker.dataset.orbitRevolving = String(entry.motion.revolving);
        marker.dataset.orbitMotionRunning = String(entry.motion.revolving && this.orbitMotionAllowed
          && this.orbits.getRotationSpeed(entry.orbit.id) > 0);
        marker.dataset.rotationSpeed = String(this.orbits.getRotationSpeed(entry.orbit.id));
        marker.dataset.rotationPhase = this.orbits.getRotationPhase(entry.orbit.id)?.toFixed(9) ?? '';
        writeActivityDiagnostics(marker, activity);
      }
    }
  }

  setActivityDate(date: string): void {
    this.orbits.setActivityDate(date);
    this.root.dataset.activityDate = this.canvas.dataset.activityDate = date;
    this.updateSelectedOrbitDiagnostics();
    this.requestFrame();
  }

  setMotion(autoRotate: boolean, animate: boolean, allowReducedMotion: boolean): void {
    this.autoRotate = autoRotate;
    this.animate = animate;
    this.lastReducedMotion = this.motionPreference.matches;
    this.allowReducedMotion = allowReducedMotion && (autoRotate || animate);
    this.orbits.setMotionAllowed(this.animate && this.automaticMotionAllowed && this.intersecting && !document.hidden && !this.lost);
    this.updateSelectedOrbitDiagnostics();
    this.refreshHeartbeat();
    this.controls.autoRotate = false;
    // Start from the resumed frame, never from time spent paused or hidden.
    this.lastDraw = performance.now();
    this.requestFrame();
  }

  setRimOnly(value: boolean): void {
    this.hologram.setRimOnly(value);
    this.orbits.setRimOnly(value);
    this.root.dataset.decorationMode = value ? 'outer-rim-only' : 'full-shell';
    this.requestFrame();
  }

  setRingsVisible(value: boolean): void {
    this.ringsVisible = value;
    this.orbits.setVisible(value);
    if (!value) this.hoveredOrbit = null;
    this.root.dataset.ringsVisible = String(this.orbits.object.visible);
    this.updateSelectedOrbitDiagnostics();
    this.requestFrame();
  }

  setSparksVisible(value: boolean): void {
    this.hologram.setSparksVisible(value);
    this.root.dataset.sparksVisible = String(value);
    this.requestFrame();
  }

  setSparkDensity(density: number): void {
    this.hologram.setSparkDensity(density);
    this.updateSparkAttributes();
    this.requestFrame();
  }

  setSparkLineDensity(density: number): void {
    this.hologram.setSparkLineDensity(density);
    this.updateSparkAttributes();
    this.requestFrame();
  }

  setRotationSpeeds(speeds: CareerOrbitSpeeds): void {
    this.orbits.setRotationSpeeds(speeds);
    this.updateSelectedOrbitDiagnostics();
    this.requestFrame();
  }

  private updateSparkAttributes(): void {
    for (const element of [this.root, this.canvas]) {
      element.dataset.sparkDensity = String(this.hologram.sparkDensity);
      element.dataset.sparkCount = String(this.hologram.sparkCount);
      element.dataset.sparkLineDensity = String(this.hologram.sparkLineDensity);
      element.dataset.sparkLineCount = String(this.hologram.sparkLineCount);
    }
  }

  setHeartbeat(value: boolean): void {
    this.heartbeat.setEnabled(value);
    this.refreshHeartbeat();
    this.requestFrame();
  }

  private refreshHeartbeat(now = performance.now()): void {
    const allowed = this.animate && this.automaticMotionAllowed && this.intersecting && !document.hidden && !this.lost;
    this.heartbeat.update(now, allowed);
    this.heartbeat.field.updateCamera(this.camera);
    this.hologram.setHeartbeatStrength(this.heartbeat.strength);
    this.nodesMaterial.uniforms.uCoreScale.value = this.heartbeat.coreScale;
    this.selectionMaterial.uniforms.uCoreScale.value = this.heartbeat.coreScale;
    this.nodeAuraMaterial.uniforms.uCoreScale.value = this.heartbeat.coreScale;
    this.nodeAuraMaterial.uniforms.uCoreGlow.value = this.heartbeat.coreGlow;
    this.updateHeartbeatAttributes();
  }

  private updateHeartbeatAttributes(): void {
    const projectedCore = this.coreNode ? this.projectNode(this.coreNode) : false;
    const coreVisible = projectedCore && !this.lost && this.intersecting && !document.hidden;
    const coreX = this.projected.x.toFixed(2), coreY = this.projected.y.toFixed(2);
    for (const element of [this.root, this.canvas]) {
      element.dataset.heartbeatEnabled = String(this.heartbeat.isEnabled);
      element.dataset.heartbeatRunning = String(this.heartbeat.running);
      element.dataset.heartbeatPeriodMs = String(HEARTBEAT_PERIOD_MS);
      element.dataset.heartbeatPhase = (Math.floor(this.heartbeat.phase * 1000) / 1000).toFixed(3);
      element.dataset.heartbeatCycle = String(this.heartbeat.cycle);
      element.dataset.heartbeatRadius = this.heartbeat.radius.toFixed(4);
      delete element.dataset.heartbeatWaveVisible;
      element.dataset.heartbeatVisualization = 'mesh-ripple';
      element.dataset.heartbeatWaveActive = String(this.heartbeat.field.active);
      element.dataset.heartbeatDeformationMax = this.heartbeat.field.maxDisplacement.toFixed(4);
      element.dataset.heartbeatBandWidth = this.heartbeat.field.bandWidth.toFixed(4);
      element.dataset.heartbeatCoreScale = this.heartbeat.coreScale.toFixed(4);
      element.dataset.coreScreenVisible = String(coreVisible);
      if (this.heartbeat.hasSource) {
        element.dataset.heartbeatSourceX = String(this.heartbeat.sourcePosition.x);
        element.dataset.heartbeatSourceY = String(this.heartbeat.sourcePosition.y);
        element.dataset.heartbeatSourceZ = String(this.heartbeat.sourcePosition.z);
      } else {
        delete element.dataset.heartbeatSourceX;
        delete element.dataset.heartbeatSourceY;
        delete element.dataset.heartbeatSourceZ;
      }
      if (this.coreNode) {
        element.dataset.coreScreenX = coreX;
        element.dataset.coreScreenY = coreY;
      } else {
        delete element.dataset.coreScreenX;
        delete element.dataset.coreScreenY;
      }
    }
  }

  resetView = (): void => {
    if (this.lost) return;
    this.callbacks.onInteraction();
    this.frameAll();
  };

  zoomIn = (): void => { this.zoom(0.8); };
  zoomOut = (): void => { this.zoom(1.25); };

  focusNode = (id: string): void => {
    const node = this.nodeMap.get(id);
    if (!node || this.lost) return;
    this.callbacks.onInteraction();
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.displayedNodePosition(node, this.controls.target);
    this.camera.position.copy(this.controls.target).addScaledVector(direction, Math.max(45, nodeSize(node) * 7));
    this.controls.update();
    this.requestFrame();
  };

  focusOrbit = (selection: CareerOrbitSelection): void => {
    if (this.lost || !this.orbits.getDisplayedAnchor(selection, this.orbitPoint)) return;
    this.callbacks.onInteraction();
    const direction = this.camera.position.clone().sub(this.controls.target).normalize();
    this.controls.target.copy(this.orbitPoint);
    this.camera.position.copy(this.orbitPoint).addScaledVector(direction, Math.max(65, this.bounds.radius * 1.25));
    this.controls.update();
    this.requestFrame();
  };

  rotate = (direction: Direction): void => {
    if (this.lost) return;
    this.callbacks.onInteraction();
    const spherical = new Spherical().setFromVector3(this.camera.position.clone().sub(this.controls.target));
    const step = Math.PI / 15;
    if (direction === 'left') spherical.theta -= step;
    if (direction === 'right') spherical.theta += step;
    if (direction === 'up') spherical.phi -= step;
    if (direction === 'down') spherical.phi += step;
    spherical.phi = MathUtils.clamp(spherical.phi, 0.02, Math.PI - 0.02);
    this.camera.position.copy(this.controls.target).add(new Vector3().setFromSpherical(spherical));
    this.controls.update();
    this.requestFrame();
  };

  private zoom(factor: number): void {
    if (this.lost) return;
    this.callbacks.onInteraction();
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = MathUtils.clamp(offset.length() * factor, this.controls.minDistance, this.controls.maxDistance);
    this.camera.position.copy(this.controls.target).add(offset.setLength(distance));
    this.controls.update();
    this.requestFrame();
  }

  private fittedDistance(): number {
    const halfFov = MathUtils.degToRad(this.camera.fov / 2);
    const limitingFov = Math.min(halfFov, Math.atan(Math.tan(halfFov) * this.camera.aspect));
    const radius = careerOrbitFrameRadius(this.bounds.radius, this.visualProfile === 'focus'
      ? this.focusBounds.center.distanceTo(this.bounds.center) : 0);
    return radius / Math.sin(limitingFov);
  }

  private frameAll(preserveDirection = false): void {
    const center = this.visualProfile === 'focus' ? this.focusBounds.center : this.bounds.center;
    const direction = preserveDirection ? this.camera.position.clone().sub(this.controls.target).normalize() : HOME_DIRECTION;
    const distance = this.fittedDistance();
    this.controls.maxDistance = Math.max(1800, distance * 4);
    this.camera.far = Math.max(3000, this.controls.maxDistance + this.bounds.radius * 3);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(center);
    this.camera.position.copy(center).addScaledVector(direction, distance);
    this.controls.update();
    this.requestFrame();
  }

  private resize = (): void => {
    this.width = Math.max(1, this.viewport.clientWidth);
    this.height = Math.max(1, this.viewport.clientHeight);
    this.cursorUniforms.uCursorViewport.value.set(this.width, this.height);
    this.clearCursor(true);
    const compact = this.width < 700;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, this.visualProfile === 'focus' ? 1 : compact ? 1.25 : 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(this.width, this.height);
    // UnrealBloomPass starts its first mip at half this size, then halves four
    // more times; mobile bloom is therefore one-quarter of canvas resolution.
    const bloomScale = compact || this.visualProfile === 'focus' ? 0.5 : 0.7;
    this.bloomPass.setSize(this.width * this.pixelRatio * bloomScale, this.height * this.pixelRatio * bloomScale);
    this.hologram.resize(this.height, this.pixelRatio, compact);
    this.updateSparkAttributes();
    this.orbits.resize(this.pixelRatio);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    if (this.visualProfile === 'focus' && this.framed) this.frameAll(true);
    for (const label of this.missionLabels) label.width = 0;
    for (const label of this.orbitLabels) label.width = 0;
    for (const material of [this.nodesMaterial, this.selectionMaterial, this.nodeAuraMaterial]) {
      material.uniforms.uHeight.value = this.height * this.pixelRatio;
      material.uniforms.uPixelRatio.value = this.pixelRatio;
    }
    this.requestFrame();
  };

  private requestFrame = (): void => {
    if (!this.frame && !this.disposed && !this.lost && (this.intersecting || !this.reportedReady) && !document.hidden) {
      this.frame = requestAnimationFrame(this.render);
    }
  };

  private get automaticMotionAllowed(): boolean {
    return !this.motionPreference.matches || this.allowReducedMotion;
  }

  private get orbitMotionAllowed(): boolean {
    return this.animate && this.automaticMotionAllowed && this.intersecting && !document.hidden && !this.lost;
  }

  private render = (time: number): void => {
    this.frame = 0;
    if (this.disposed || this.lost || (!this.intersecting && this.reportedReady) || document.hidden) return;
    if (this.motionPreference.matches !== this.lastReducedMotion) this.refreshMotionPreference();
    const ambient = this.intersecting && this.animate && this.automaticMotionAllowed && Boolean(this.graph?.nodes.length || this.graph?.orbits.length);
    const rotating = this.intersecting && this.autoRotate && this.automaticMotionAllowed && this.pointers.size === 0;
    if ((ambient || rotating || this.cursorSettling) && time - this.lastDraw < FRAME_INTERVAL) {
      this.requestFrame();
      return;
    }
    this.controls.autoRotate = rotating;
    // Fullscreen frost can lower the frame rate; a 50ms cap would turn calm
    // motion into near-stillness. Pause/visibility transitions reset lastDraw.
    const delta = Math.max(0, Math.min((time - this.lastDraw) / 1000, this.visualProfile === 'focus' ? 0.25 : 0.05));
    if (rotating) this.controls.update(delta);
    this.updateCursor(delta, time);
    const distance = this.controls.getDistance();
    this.cursorUniforms.uCursorOffset.value = cursorRepulsionOffset(distance / this.fittedDistance());
    const cursorOffset = this.cursorUniforms.uCursorOffset.value.toFixed(3);
    if (this.root.dataset.cursorOffset !== cursorOffset) this.root.dataset.cursorOffset = cursorOffset;
    this.fog.near = Math.max(1, distance - this.bounds.radius * 0.7);
    this.fog.far = distance + this.bounds.radius * 2;
    for (const material of [this.nodesMaterial, this.nodeAuraMaterial]) {
      material.uniforms.uNear.value = Math.max(1, distance - this.bounds.radius);
      material.uniforms.uFar.value = distance + this.bounds.radius * 1.3;
    }
    this.hologram.update(this.camera, ambient ? delta : 0);
    // The heartbeat reads the monotonic RAF timestamp, never the capped ring-motion delta.
    this.refreshHeartbeat(time);
    this.orbits.setMotionAllowed(ambient);
    this.orbits.update(this.camera, ambient ? delta : 0);
    const orbitTetherCount = String(this.orbits.tetherCount);
    const orbitPulseCount = String(this.orbits.savedPulseCount);
    if (this.root.dataset.orbitTetherCount !== orbitTetherCount) {
      this.root.dataset.orbitTetherCount = this.canvas.dataset.orbitTetherCount = orbitTetherCount;
    }
    if (this.root.dataset.orbitPulseCount !== orbitPulseCount) {
      this.root.dataset.orbitPulseCount = this.canvas.dataset.orbitPulseCount = orbitPulseCount;
    }
    this.composer.render();
    // Work markers bypass bloom: decorative brightness must not bleach status
    // colors, hide selection, or become an apparent completion indicator.
    this.renderer.autoClear = false;
    this.renderer.clearDepth();
    this.renderer.render(this.workScene, this.camera);
    this.renderer.autoClear = true;
    this.lastDraw = time;
    if (ambient && delta > 0) this.animationRevision++;
    this.updateAnimationState(!this.intersecting ? 'suspended' : ambient ? 'running' : 'paused', time);
    if (this.visualProfile === 'career') {
      this.updateLabels();
    }
    this.updateOrbitLabels();
    if (this.visualProfile === 'career') this.updateMissionLabels();
    if (!this.reportedReady) {
      this.reportedReady = true;
      this.callbacks.onStatusChange('ready');
    }
    if (ambient || rotating || this.cursorSettling) this.requestFrame();
  };

  private updateAnimationState(state: string, time = performance.now()): void {
    const changed = this.root.dataset.animationState !== state;
    if (changed) this.root.dataset.animationState = state;
    if (changed || time - this.lastAnimationAttribute >= VIEW_ATTRIBUTE_INTERVAL) {
      this.root.dataset.animationRevision = String(this.animationRevision);
      this.root.dataset.animationTime = this.hologram.animationTime.toFixed(3);
      this.lastAnimationAttribute = time;
    }
  }

  private onCameraChange = (): void => {
    this.viewRevision++;
    if (!this.viewTimer) {
      const remaining = Math.max(0, VIEW_ATTRIBUTE_INTERVAL - (performance.now() - this.lastViewAttribute));
      this.viewTimer = window.setTimeout(() => {
        this.viewTimer = 0;
        this.lastViewAttribute = performance.now();
        this.root.dataset.viewRevision = String(this.viewRevision);
        this.canvas.dataset.viewRevision = String(this.viewRevision);
      }, remaining);
    }
    this.requestFrame();
  };

  private onControlStart = (): void => {
    this.clearHover();
    this.callbacks.onInteraction();
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (this.visualProfile === 'focus') return;
    if (event.pointerType === 'touch') this.clearCursor();
    this.pointers.add(event.pointerId);
    this.clearHover();
    if (this.pointers.size === 1) {
      this.gesture = {
        pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        moved: false, selectable: event.isPrimary && event.button === 0,
      };
    } else if (this.gesture) {
      this.gesture.selectable = false;
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.visualProfile === 'focus') return;
    if (event.pointerType === 'mouse' || event.pointerType === 'pen') this.trackCursor(event);
    else this.clearCursor();
    if (this.gesture && Math.hypot(event.clientX - this.gesture.x, event.clientY - this.gesture.y) > 5) {
      this.gesture.moved = true;
    }
    if (this.pointers.size > 0 || event.pointerType === 'touch') return;
    this.hoverPosition = { x: event.clientX, y: event.clientY };
    if (!this.hoverTimer) {
      this.hoverTimer = window.setTimeout(() => {
        this.hoverTimer = 0;
        this.lastHover = performance.now();
        if (!this.hoverPosition || this.pointers.size || this.lost) return;
        const hit = this.pick(this.hoverPosition.x, this.hoverPosition.y);
        this.hoveredId = hit?.kind === 'node' ? hit.nodeId : null;
        this.hoveredOrbit = hit?.kind === 'orbit' ? hit.selection : null;
        this.canvas.style.cursor = this.hoveredId || this.hoveredOrbit ? 'pointer' : 'grab';
        this.requestFrame();
      }, Math.max(0, 75 - (performance.now() - this.lastHover)));
    }
  };

  private onPointerUp = (event: PointerEvent): void => {
    const gesture = this.gesture;
    this.pointers.delete(event.pointerId);
    if (gesture?.pointerId === event.pointerId) {
      const moved = gesture.moved || Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 5;
      if (!moved && gesture.selectable && !this.lost) {
        const hit = this.pick(event.clientX, event.clientY);
        if (hit?.kind === 'node') this.callbacks.onSelect(hit.nodeId);
        else if (hit?.kind === 'orbit') this.callbacks.onOrbitSelect(hit.selection);
      }
      this.gesture = null;
    }
    this.requestFrame();
  };

  private onPointerCancel = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId);
    this.gesture = null;
    if (event.type === 'pointercancel') this.clearCursor();
    this.requestFrame();
  };

  private onPointerLeave = (): void => { this.clearHover(); this.clearCursor(); };

  private get cursorSettling(): boolean {
    return Math.abs(this.cursorUniforms.uCursorStrength.value - this.cursorTargetStrength) > CURSOR_EPSILON
      || this.cursorUniforms.uCursor.value.distanceToSquared(this.cursorTarget) > CURSOR_EPSILON * CURSOR_EPSILON;
  }

  private trackCursor(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (!rect.width || !rect.height || x < 0 || y < 0 || x > rect.width || y > rect.height) {
      this.clearCursor();
      return;
    }
    this.cursorTarget.set(x / rect.width * 2 - 1, 1 - y / rect.height * 2);
    if (!this.cursorHasPosition) this.cursorUniforms.uCursor.value.copy(this.cursorTarget);
    this.cursorHasPosition = true;
    this.cursorTargetStrength = 1;
    this.requestFrame();
  }

  private clearCursor(immediate = false): void {
    this.cursorTargetStrength = 0;
    this.cursorTarget.copy(this.cursorUniforms.uCursor.value);
    if (immediate) {
      this.cursorUniforms.uCursorStrength.value = 0;
      this.cursorHasPosition = false;
      this.updateCursor(0, performance.now());
    }
    this.requestFrame();
  }

  private updateCursor(delta: number, time: number): void {
    const position = this.cursorUniforms.uCursor.value;
    const strength = this.cursorUniforms.uCursorStrength;
    const beforeX = position.x;
    const beforeY = position.y;
    const beforeStrength = strength.value;
    const blend = this.motionPreference.matches ? 1 : 1 - Math.exp(-delta * 18);
    position.lerp(this.cursorTarget, blend);
    strength.value = MathUtils.lerp(strength.value, this.cursorTargetStrength, blend);
    if (position.distanceToSquared(this.cursorTarget) <= CURSOR_EPSILON * CURSOR_EPSILON) position.copy(this.cursorTarget);
    if (Math.abs(strength.value - this.cursorTargetStrength) <= CURSOR_EPSILON) strength.value = this.cursorTargetStrength;
    if (strength.value === 0) this.cursorHasPosition = false;
    const moved = position.x !== beforeX || position.y !== beforeY || strength.value !== beforeStrength;
    if (moved) this.cursorRevision++;
    const state = this.visualProfile === 'focus' ? 'disabled' : this.cursorTargetStrength ? 'active' : strength.value ? 'settling' : 'idle';
    const changed = this.root.dataset.cursorState !== state;
    if (changed) this.root.dataset.cursorState = state;
    if (changed || time - this.lastCursorAttribute >= VIEW_ATTRIBUTE_INTERVAL || (moved && !this.cursorSettling)) {
      this.root.dataset.cursorRevision = String(this.cursorRevision);
      this.root.dataset.cursorStrength = strength.value.toFixed(4);
      this.lastCursorAttribute = time;
    }
  }

  private clearHover(): void {
    window.clearTimeout(this.hoverTimer);
    this.hoverTimer = 0;
    this.hoverPosition = null;
    this.hoveredId = null;
    this.hoveredOrbit = null;
    this.canvas.style.cursor = 'grab';
    this.requestFrame();
  }

  private pickNode(x: number, y: number, width: number, height: number): CareerNodeScreenHit | undefined {
    if (!this.graph?.nodes.length) return undefined;
    this.pointer.set(x / width * 2 - 1, -(y / height) * 2 + 1);
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const farthest = this.controls.getDistance() + this.bounds.radius * 2;
    // Raycast the immutable base buffers broadly, then test actual deformed screen positions.
    this.raycaster.params.Points.threshold = Math.max(10, 18 * 2 * farthest * Math.tan(MathUtils.degToRad(this.camera.fov / 2)) / this.height)
      + this.heartbeat.field.maxDisplacement;
    const hits = this.raycaster.intersectObject(this.points, false);
    let picked: GraphNode | undefined;
    let closest = Infinity;
    for (const hit of hits) {
      if (hit.index === undefined) continue;
      const node = this.graph.nodes[hit.index];
      if (!node || !this.projectNode(node)) continue;
      const distance = Math.hypot(this.projected.x - x, this.projected.y - y);
      const depth = -this.displayedNodePosition(node, this.pickPosition).applyMatrix4(this.camera.matrixWorldInverse).z;
      const coreScale = node.kind === 'core' ? this.heartbeat.coreScale : 1;
      const visibleRadius = MathUtils.clamp(nodeSize(node) * this.height / Math.max(1, depth), 7, 90) * 0.42 * coreScale;
      if (distance <= Math.max(8, visibleRadius + 3) && distance < closest) {
        closest = distance;
        picked = node;
      }
    }
    return picked ? { nodeId: picked.id, distance: closest } : undefined;
  }

  private projectNode(node: GraphNode): boolean {
    this.displayedNodePosition(node, this.projected).project(this.camera);
    const visible = this.projected.z >= -1 && this.projected.z <= 1
      && Math.abs(this.projected.x) <= 1 && Math.abs(this.projected.y) <= 1;
    this.projected.x = (this.projected.x + 1) * this.width / 2;
    this.projected.y = (1 - this.projected.y) * this.height / 2;
    return visible;
  }

  private displayedNodePosition(node: GraphNode, target: Vector3): Vector3 {
    target.fromArray(node.position);
    return this.heartbeat.field.deformWorld(target, target);
  }

  private pick(clientX: number, clientY: number): CareerSceneHit | undefined {
    if (this.visualProfile === 'focus') return undefined;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return undefined;
    const x = clientX - rect.left, y = clientY - rect.top;
    const node = this.pickNode(x, y, rect.width, rect.height);
    const anchor = this.ringsVisible ? this.orbits.pickAnchor(x, y, this.camera, rect.width, rect.height) : undefined;
    const path = !node && !anchor && this.ringsVisible
      ? this.orbits.pickPath(x, y, this.camera, rect.width, rect.height) : undefined;
    return chooseCareerSceneHit(node, anchor, path);
  }

  private projectOrbit(selection: CareerOrbitSelection): boolean {
    if (!this.orbits.getDisplayedAnchor(selection, this.orbitPoint)) return false;
    this.projected.copy(this.orbitPoint).project(this.camera);
    const visible = this.projected.z >= -1 && this.projected.z <= 1
      && Math.abs(this.projected.x) <= 1 && Math.abs(this.projected.y) <= 1;
    this.projected.x = (this.projected.x + 1) * this.width / 2;
    this.projected.y = (1 - this.projected.y) * this.height / 2;
    return visible;
  }

  private updateOrbitLabels(): void {
    this.orbitLabelLayer.hidden = this.visualProfile === 'focus'
      || !showOrbitIdentityLabels(this.width, this.height, this.ringsVisible);
    this.orbitLabelRectCount = 0;
    this.updateSelectedOrbitDiagnostics();
    const selectedProjected = this.selectedOrbit ? this.projectOrbit(this.selectedOrbit) : false;
    const selectedVisible = this.ringsVisible && selectedProjected;
    this.orbitMarker.hidden = !selectedVisible;
    this.orbitMarker.dataset.screenVisible = String(selectedVisible);
    if (this.selectedOrbit && this.orbits.getMotion(this.selectedOrbit.orbitId)) {
      this.orbitMarker.dataset.worldX = this.orbitPoint.x.toFixed(6);
      this.orbitMarker.dataset.worldY = this.orbitPoint.y.toFixed(6);
      this.orbitMarker.dataset.worldZ = this.orbitPoint.z.toFixed(6);
    } else {
      delete this.orbitMarker.dataset.worldX;
      delete this.orbitMarker.dataset.worldY;
      delete this.orbitMarker.dataset.worldZ;
    }
    if (selectedVisible) {
      const x = this.projected.x.toFixed(2), y = this.projected.y.toFixed(2);
      this.orbitMarker.dataset.screenX = x;
      this.orbitMarker.dataset.screenY = y;
      this.orbitMarker.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    const tooltip = this.hoveredOrbit ?? (!this.hoveredId ? this.selectedOrbit : null);
    if (this.visualProfile === 'career' && tooltip && this.ringsVisible && this.projectOrbit(tooltip)) {
      const orbit = this.graph?.orbits.find(item => item.id === tooltip.orbitId);
      if (orbit) {
        this.label.hidden = false;
        this.labelId = null;
        this.label.textContent = compactOrbitTooltip(orbit, tooltip, Boolean(this.hoveredOrbit));
        this.label.dataset.status = 'orbit';
        this.label.style.setProperty('--orbit-color', orbit.color);
        const x = MathUtils.clamp(this.projected.x + SELECTED_ORBIT_ANCHOR_DIAMETER / 2 + 8, 8, Math.max(8, this.width - this.label.offsetWidth - 8));
        const y = MathUtils.clamp(this.projected.y - this.label.offsetHeight - 14, 8, Math.max(8, this.height - this.label.offsetHeight - 8));
        this.label.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
    }
    // Identity labels are secondary to the hover/selected detail and avoid one another.
    for (const entry of this.orbitLabels) {
      const { element, orbit } = entry;
      const projected = this.projectOrbit({ orbitId: orbit.id });
      const visible = this.ringsVisible && projected;
      for (const marker of [element, entry.diagnostic]) {
        marker.dataset.worldX = this.orbitPoint.x.toFixed(6);
        marker.dataset.worldY = this.orbitPoint.y.toFixed(6);
        marker.dataset.worldZ = this.orbitPoint.z.toFixed(6);
        marker.dataset.screenVisible = String(visible);
        marker.dataset.screenX = this.projected.x.toFixed(2);
        marker.dataset.screenY = this.projected.y.toFixed(2);
      }
      element.style.visibility = 'hidden';
      element.dataset.labelVisible = 'false';
      if (!visible || this.orbitLabelLayer.hidden) continue;
      if (!entry.width) {
        entry.width = element.offsetWidth;
        entry.height = element.offsetHeight;
      }
      const { width, height } = entry;
      const x = MathUtils.clamp(this.projected.x + ORBIT_ANCHOR_DIAMETER / 2 + 6, 5, Math.max(5, this.width - width - 5));
      const y = MathUtils.clamp(this.projected.y - height / 2, 5, Math.max(5, this.height - height - 5));
      let overlaps = false;
      for (let index = 0; index < this.orbitLabelRectCount; index++) {
        const box = this.orbitLabelRects[index];
        if (x < box.right + 3 && x + width > box.left - 3 && y < box.bottom + 3 && y + height > box.top - 3) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      element.style.visibility = 'visible';
      element.dataset.labelVisible = 'true';
      element.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      const box = this.orbitLabelRects[this.orbitLabelRectCount] ?? { left: 0, top: 0, right: 0, bottom: 0 };
      box.left = x;
      box.top = y;
      box.right = x + width;
      box.bottom = y + height;
      this.orbitLabelRects[this.orbitLabelRectCount++] = box;
    }
  }

  private updateLabels(): void {
    const selected = this.selectedId ? this.nodeMap.get(this.selectedId) : undefined;
    const selectedVisible = selected ? this.projectNode(selected) : false;
    this.marker.hidden = !selectedVisible;
    this.marker.dataset.screenVisible = String(selectedVisible);
    if (selectedVisible) {
      const x = this.projected.x.toFixed(2);
      const y = this.projected.y.toFixed(2);
      this.marker.dataset.screenX = x;
      this.marker.dataset.screenY = y;
      this.canvas.dataset.screenX = x;
      this.canvas.dataset.screenY = y;
      this.marker.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    } else {
      delete this.canvas.dataset.screenX;
      delete this.canvas.dataset.screenY;
    }
    const node = this.nodeMap.get(this.hoveredId ?? this.selectedId ?? '');
    const visible = node ? this.projectNode(node) : false;
    this.label.hidden = !visible;
    if (!node || !visible) return;
    if (this.labelId !== node.id) {
      this.label.textContent = node.label;
      this.label.dataset.status = careerNodeStatusClass(node);
      this.labelId = node.id;
    }
    const labelWidth = Math.min(this.label.offsetWidth, this.width - 16);
    const x = MathUtils.clamp(this.projected.x + 16, 8, Math.max(8, this.width - labelWidth - 8));
    const y = MathUtils.clamp(this.projected.y - this.label.offsetHeight - 14, 8, Math.max(8, this.height - this.label.offsetHeight - 8));
    this.label.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
  }

  private updateMissionLabels(): void {
    this.missionLabelLayer.hidden = this.width < 640 || this.height < 350;
    if (this.missionLabelLayer.hidden) return;
    const occupied: LabelBox[] = [];
    for (let index = 0; index < this.orbitLabelRectCount; index++) occupied.push(this.orbitLabelRects[index]);
    if (!this.label.hidden) {
      const labelRect = this.label.getBoundingClientRect();
      const rootRect = this.root.getBoundingClientRect();
      occupied.push({
        left: labelRect.left - rootRect.left, top: labelRect.top - rootRect.top,
        right: labelRect.right - rootRect.left, bottom: labelRect.bottom - rootRect.top,
      });
    }
    const projectedLabels = this.missionLabels.map(entry => {
      const visible = this.projectNode(entry.node);
      return { entry, visible, x: this.projected.x, y: this.projected.y };
    });
    for (const point of projectedLabels) {
      if (point.visible) occupied.push({ left: point.x - 10, top: point.y - 10, right: point.x + 10, bottom: point.y + 10 });
    }
    for (const { entry, visible, x, y } of projectedLabels) {
      const { element, node } = entry;
      element.style.visibility = 'hidden';
      if (!visible || node.id === this.hoveredId || node.id === this.selectedId
        || Math.hypot(x - this.width / 2, y - this.height / 2) < this.height * 0.19) continue;
      if (!entry.width) {
        entry.width = element.offsetWidth;
        entry.height = element.offsetHeight;
      }
      const { width, height } = entry;
      const candidates = [
        [x + 18, y - height / 2],
        [x - width - 18, y - height / 2],
        [x - width / 2, y - height - 18],
        [x - width / 2, y + 18],
      ];
      for (const [left, top] of candidates) {
        const box = { left, top, right: left + width, bottom: top + height };
        if (left < 12 || top < 46 || box.right > this.width - 12 || box.bottom > this.height - 38) continue;
        const overlaps = occupied.some(other =>
          box.left < other.right + 6 && box.right > other.left - 6
          && box.top < other.bottom + 6 && box.bottom > other.top - 6);
        if (overlaps) continue;
        element.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0)`;
        element.style.visibility = 'visible';
        occupied.push(box);
        break;
      }
    }
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (this.visualProfile === 'focus') return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const directions: Record<string, Direction | undefined> = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
    const direction = directions[event.key];
    if (direction) this.rotate(direction);
    else if (event.key === '+' || event.key === '=') this.zoomIn();
    else if (event.key === '-' || event.key === '_') this.zoomOut();
    else if (event.key === 'Home') this.resetView();
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  private refreshMotionPreference(): void {
    const reduced = this.motionPreference.matches;
    if (reduced === this.lastReducedMotion) return;
    this.lastReducedMotion = reduced;
    if (this.lastReducedMotion) {
      this.allowReducedMotion = false;
      this.controls.autoRotate = false;
    }
    this.orbits.setMotionAllowed(this.animate && this.automaticMotionAllowed && this.intersecting && !document.hidden && !this.lost);
    this.updateSelectedOrbitDiagnostics();
    this.refreshHeartbeat();
  }

  private onMotionChange = (): void => {
    this.lastDraw = performance.now();
    this.refreshMotionPreference();
    this.requestFrame();
  };
  private onVisibilityChange = (): void => { this.syncVisibility(); };

  private syncVisibility(): void {
    this.refreshHeartbeat();
    this.updateSelectedOrbitDiagnostics();
    if (!this.intersecting || document.hidden) {
      this.orbits.setMotionAllowed(false);
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.clearHover();
      this.clearCursor(true);
      this.updateAnimationState('suspended');
      // Initialize once below the fold so controls become usable; later offscreen frames stay suspended.
      if (!this.reportedReady && !document.hidden) this.requestFrame();
    } else {
      this.lastDraw = performance.now();
      this.requestFrame();
    }
  }

  private onContextLost = (event: Event): void => {
    event.preventDefault();
    this.lost = true;
    this.orbits.setMotionAllowed(false);
    this.updateSelectedOrbitDiagnostics();
    this.refreshHeartbeat();
    this.reportedReady = false;
    this.controls.enabled = false;
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.clearHover();
    this.clearCursor(true);
    this.label.hidden = true;
    this.marker.hidden = true;
    this.orbitMarker.hidden = true;
    this.orbitMarker.dataset.screenVisible = 'false';
    this.orbitLabelLayer.hidden = true;
    this.missionLabelLayer.hidden = true;
    this.updateAnimationState('lost');
    this.callbacks.onStatusChange('lost', 'The 3D graphics context was lost. The graph will reconnect if the browser restores it. Your saved work is unchanged; the node list remains available.');
  };

  private onContextRestored = (): void => {
    this.lost = false;
    this.controls.enabled = this.visualProfile !== 'focus';
    this.pointers.clear();
    this.gesture = null;
    this.resize();
    this.requestFrame();
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.clearTimeout(this.viewTimer);
    window.clearTimeout(this.hoverTimer);
    this.resizeObserver.disconnect();
    this.intersectionObserver.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.motionPreference.removeEventListener('change', this.onMotionChange);
    this.controls.removeEventListener('change', this.onCameraChange);
    this.controls.removeEventListener('start', this.onControlStart);
    this.controls.dispose();
    this.canvas.removeEventListener('pointerdown', this.onPointerDown, true);
    this.canvas.removeEventListener('pointermove', this.onPointerMove, true);
    this.canvas.removeEventListener('pointerup', this.onPointerUp, true);
    this.canvas.removeEventListener('pointercancel', this.onPointerCancel, true);
    this.canvas.removeEventListener('lostpointercapture', this.onPointerCancel);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('webglcontextlost', this.onContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    for (const geometry of [this.nodeGeometry, this.edgeGeometry, this.selectedGeometry, this.selectedEdgeGeometry]) geometry.dispose();
    for (const material of [this.nodesMaterial, this.selectionMaterial, this.nodeAuraMaterial, this.edgesMaterial, this.selectedEdgesMaterial, this.edgeGlowMaterial, this.selectedEdgeGlowMaterial]) material.dispose();
    this.hologram.dispose();
    this.heartbeat.dispose();
    this.orbits.dispose();
    this.renderPass.dispose();
    this.bloomPass.dispose();
    this.bloomPass.materialHighPassFilter.dispose();
    this.outputPass.dispose();
    this.composer.dispose();
    this.scene.clear();
    this.workScene.clear();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
    this.missionLabelLayer.replaceChildren();
    this.orbitLabelLayer.replaceChildren();
  }
}

const CareerGraphScene = forwardRef<CareerGraphSceneHandle, CareerGraphSceneProps>(function CareerGraphScene(
  { graph, activityDate, framingNodes, selectedId, onSelect, selectedOrbit = null, onOrbitSelect, autoRotate, animate, allowReducedMotion = false, rimOnly, showRings = true, showSparks = true, sparkDensity = DEFAULT_SPARK_DENSITY, sparkLineDensity = DEFAULT_SPARK_LINE_DENSITY, orbitSpeeds, heartbeat = true, onInteraction, onStatusChange, visualProfile = 'career' }, ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const missionLabelLayerRef = useRef<HTMLDivElement>(null);
  const orbitLabelLayerRef = useRef<HTMLDivElement>(null);
  const orbitMarkerRef = useRef<HTMLDivElement>(null);
  const runtimeRef = useRef<CareerScene | null>(null);
  const callbacks = useRef({ onSelect, onOrbitSelect, onInteraction, onStatusChange });
  const instructionsId = useId();
  const [state, setState] = useState<{ status: SceneStatus | 'loading'; message?: string }>({ status: 'loading' });

  useLayoutEffect(() => {
    callbacks.current = { onSelect, onOrbitSelect, onInteraction, onStatusChange };
  }, [onSelect, onOrbitSelect, onInteraction, onStatusChange]);

  useImperativeHandle(ref, () => ({
    resetView: () => runtimeRef.current?.resetView(),
    zoomIn: () => runtimeRef.current?.zoomIn(),
    zoomOut: () => runtimeRef.current?.zoomOut(),
    focusNode: id => runtimeRef.current?.focusNode(id),
    focusOrbit: selection => runtimeRef.current?.focusOrbit(selection),
    rotate: direction => runtimeRef.current?.rotate(direction),
  }), []);

  useEffect(() => {
    const root = rootRef.current;
    const viewport = viewportRef.current;
    const label = labelRef.current;
    const marker = markerRef.current;
    const missionLabelLayer = missionLabelLayerRef.current;
    const orbitLabelLayer = orbitLabelLayerRef.current;
    const orbitMarker = orbitMarkerRef.current;
    if (!root || !viewport || !label || !marker || !missionLabelLayer || !orbitLabelLayer || !orbitMarker) return;
    // A fresh canvas also makes StrictMode's setup/cleanup/setup safe after forceContextLoss.
    const canvas = document.createElement('canvas');
    canvas.className = 'career-graph-scene__canvas';
    canvas.tabIndex = visualProfile === 'focus' ? -1 : 0;
    if (visualProfile === 'career') {
      canvas.setAttribute('aria-label', 'Interactive 3D career graph');
      canvas.setAttribute('aria-describedby', instructionsId);
    } else canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.renderer = 'webgl';
    canvas.dataset.contextApi = 'webgl2';
    canvas.dataset.viewRevision = '0';
    viewport.appendChild(canvas);
    let renderer: WebGLRenderer;
    try {
      renderer = createRenderer(canvas);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'The browser could not initialize 3D graphics.';
      const message = `3D view unavailable. ${reason} ${visualProfile === 'focus' ? 'The timer and distraction recording remain available.' : 'Use the accessible node list to explore the same career data.'}`;
      setState({ status: 'unavailable', message });
      root.dataset.animationState = 'unavailable';
      callbacks.current.onStatusChange?.('unavailable', message);
      canvas.remove();
      return;
    }
    const runtime = new CareerScene(root, viewport, label, marker, missionLabelLayer, orbitLabelLayer, orbitMarker, renderer, {
      onSelect: id => callbacks.current.onSelect(id),
      onOrbitSelect: selection => callbacks.current.onOrbitSelect?.(selection),
      onInteraction: () => callbacks.current.onInteraction?.(),
      onStatusChange: (status, message) => {
        setState({ status, message });
        callbacks.current.onStatusChange?.(status, message);
      },
    }, visualProfile);
    runtimeRef.current = runtime;
    return () => {
      runtimeRef.current = null;
      runtime.dispose();
    };
  }, [instructionsId, visualProfile]);

  useEffect(() => { runtimeRef.current?.setActivityDate(activityDate ?? ''); }, [activityDate, visualProfile]);
  useEffect(() => { runtimeRef.current?.setGraph(graph, framingNodes); }, [graph, framingNodes, visualProfile]);
  useEffect(() => { runtimeRef.current?.setSelection(selectedId); }, [selectedId, visualProfile]);
  const selectedOrbitId = selectedOrbit?.orbitId;
  const selectedOrbitSegmentId = selectedOrbit?.segmentId;
  useEffect(() => {
    runtimeRef.current?.setOrbitSelection(selectedOrbitId
      ? { orbitId: selectedOrbitId, ...(selectedOrbitSegmentId ? { segmentId: selectedOrbitSegmentId } : {}) }
      : null);
  }, [selectedOrbitId, selectedOrbitSegmentId, visualProfile]);
  const animateAmbient = animate ?? (visualProfile === 'focus' ? autoRotate : true);
  const maskInterior = rimOnly ?? (visualProfile === 'focus');
  useEffect(() => { runtimeRef.current?.setMotion(autoRotate, animateAmbient, allowReducedMotion); }, [autoRotate, animateAmbient, allowReducedMotion, visualProfile]);
  useEffect(() => { runtimeRef.current?.setRimOnly(maskInterior); }, [maskInterior, visualProfile]);
  useEffect(() => { runtimeRef.current?.setRingsVisible(showRings); }, [showRings, visualProfile]);
  useEffect(() => { runtimeRef.current?.setSparksVisible(showSparks); }, [showSparks, visualProfile]);
  useEffect(() => { runtimeRef.current?.setSparkDensity(sparkDensity); }, [sparkDensity, visualProfile]);
  useEffect(() => { runtimeRef.current?.setSparkLineDensity(sparkLineDensity); }, [sparkLineDensity, visualProfile]);
  useEffect(() => { runtimeRef.current?.setRotationSpeeds(orbitSpeeds ?? {}); }, [orbitSpeeds, visualProfile]);
  useEffect(() => { runtimeRef.current?.setHeartbeat(heartbeat); }, [heartbeat, visualProfile]);

  return (
    <div ref={rootRef} className="career-graph-scene" data-visual-profile={visualProfile} data-scene-state={state.status} data-view-revision="0" data-animation-state="loading" data-animation-revision="0" data-animation-time="0.000" data-cursor-strength="0.0000" data-cursor-revision="0" data-heartbeat-enabled={heartbeat} data-heartbeat-running="false" data-heartbeat-period-ms={HEARTBEAT_PERIOD_MS} data-heartbeat-phase="0.000" data-heartbeat-cycle="0" data-heartbeat-radius="0.0000" data-core-screen-visible="false" role={visualProfile === 'career' ? 'region' : undefined} aria-label={visualProfile === 'career' ? 'Career graph in 3D' : undefined} aria-hidden={visualProfile === 'focus' || undefined}>
      <div ref={viewportRef} className="career-graph-scene__viewport" />
      <div ref={missionLabelLayerRef} className="career-graph-scene__mission-labels" aria-hidden="true" hidden />
      <div ref={orbitLabelLayerRef} className="career-graph-scene__orbit-labels" aria-hidden="true" hidden />
      <div ref={markerRef} className="career-graph-scene__selected-marker" data-screen-visible="false" aria-hidden="true" hidden />
      <div ref={orbitMarkerRef} className="career-graph-scene__selected-orbit-marker" data-screen-visible="false" aria-hidden="true" hidden />
      <div ref={labelRef} className="career-graph-scene__node-label" aria-hidden="true" hidden />
      <p id={instructionsId} className="career-graph-scene__sr-only">
        Drag to rotate. Scroll or pinch to zoom. Use two fingers or the right mouse button to pan.
        With the canvas focused, arrow keys rotate, plus and minus zoom, and Home fits the graph.
        Select a ringed point to inspect real work. Select an orbit identity or a moving stage arc to inspect its actual members.
        Bright orange links connect actual nodes; colored orbit tethers show real membership. Only sparks are decorative.
        Moving the pointer gently bends link interiors without moving their endpoints, including while automatic animation is paused.
        The accessible node list and orbit index offer the same selections without the canvas.
      </p>
      <div className="career-graph-scene__status" role="status" aria-live="polite" aria-atomic="true">
        {state.status === 'loading' && <p>Opening 3D space…</p>}
        {(state.status === 'unavailable' || state.status === 'lost') && <p>{state.message}</p>}
        {state.status === 'ready' && graph.nodes.length === 0 && <p>No nodes in this view. Adjust the graph filters.</p>}
      </div>
      {state.status === 'ready' && visualProfile === 'career' && <span className="career-graph-scene__space-note" aria-hidden="true">
        {showRings ? maskInterior ? 'Ring paths: clear center · Membership anchors stay visible' : 'Rings: saved missions and records · Tethers: membership' : 'Orange links: connections · Rings hidden'}
        {' · '}{showSparks ? 'Sparks: decoration' : 'Sparks hidden'}
      </span>}
    </div>
  );
});

export default CareerGraphScene;

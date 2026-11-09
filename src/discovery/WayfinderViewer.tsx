import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Minus, Move, Plus, RotateCcw } from 'lucide-react';
import {
  MOUSE, Mesh, MeshBasicMaterial, NoToneMapping, OrthographicCamera, Scene,
  Spherical, SRGBColorSpace, TOUCH, Vector3, WebGLRenderer,
} from 'three';
import type { Group } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createWayfinderDiorama, createWayfinderModel, disposeWayfinderModel } from './wayfinderGeometry';
import { wayfinderStages } from './model';

interface ViewerControls {
  level: (level: number, animate: boolean) => void;
  move: (theta: number, phi: number, zoom?: number) => void;
  mode: (pan: boolean) => void;
  reset: () => void;
}

export function WayfinderViewer({ level, animate, fallback }: { level: number; animate: boolean; fallback: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const runtime = useRef<ViewerControls | null>(null);
  const instructions = useId();
  const [panMode, setPanMode] = useState(false);
  const [status, setStatus] = useState<{ state: 'loading' | 'ready' | 'unavailable' | 'lost'; message?: string }>({ state: 'loading' });

  useEffect(() => {
    const root = rootRef.current!;
    const viewport = viewportRef.current!;
    const canvas = document.createElement('canvas');
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', 'Interactive 3D Wayfinder diorama; drag to rotate the scene');
    canvas.setAttribute('aria-describedby', instructions);
    canvas.dataset.renderer = 'webgl';
    let context: WebGL2RenderingContext | null = null;
    let renderer: WebGLRenderer;
    try {
      context = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'low-power', stencil: false });
      if (!context) throw new Error('This browser could not create a WebGL 2 context.');
      renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: false, stencil: false });
    } catch (error) {
      context?.getExtension('WEBGL_lose_context')?.loseContext();
      const reason = error instanceof Error ? error.message : '3D graphics could not initialize.';
      setStatus({ state: 'unavailable', message: `3D viewer unavailable. ${reason} A still illustration is shown; your records are unchanged.` });
      return;
    }
    viewport.append(canvas);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NoToneMapping;
    const scene = new Scene();
    const camera = new OrthographicCamera(-3.74, 3.74, 2.8, -2.8, .1, 40);
    camera.position.set(6, 6.65, 6);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, .65, 0);
    controls.enableDamping = false;
    controls.enablePan = true;
    controls.screenSpacePanning = true;
    controls.minZoom = .65;
    controls.maxZoom = 3.5;
    controls.minDistance = 2.8;
    controls.maxDistance = 10;
    controls.minPolarAngle = .06;
    controls.maxPolarAngle = Math.PI - .06;
    controls.rotateSpeed = .7;
    controls.zoomSpeed = .7;
    controls.update();
    controls.saveState();
    const home = camera.position.clone();
    const homeTarget = controls.target.clone();
    const homeZoom = camera.zoom;
    const homeTheta = controls.getAzimuthalAngle();
    const homePhi = controls.getPolarAngle();
    let resets = 0;
    const material = new MeshBasicMaterial({ vertexColors: true });
    let model: Group | null = null;
    let diorama: Mesh | null = null;
    let currentLevel = 0;
    let pending: number | null = null;
    let disposed = false;
    let intersecting = false;
    let lost = false;
    let draws = 0;
    let ready = false;
    let flourish: { mesh: Mesh; start: number; level: number } | null = null;

    function settle() {
      if (!flourish) return;
      flourish.mesh.position.set(0, 0, 0);
      flourish.mesh.rotation.set(0, 0, 0);
      flourish.mesh.scale.set(1, 1, 1);
      flourish = null;
      root.dataset.motion = 'still';
    }
    function invalidate() {
      if (disposed || lost || !intersecting || document.hidden || pending !== null) return;
      pending = requestAnimationFrame(draw);
    }
    function draw(time: number) {
      pending = null;
      if (disposed || lost || !intersecting || document.hidden) return;
      if (flourish) {
        const amount = Math.min(1, Math.max(0, (time - flourish.start) / 650));
        const tail = Math.pow(1 - amount, 3);
        const piece = flourish.mesh;
        if (flourish.level === 2) { piece.scale.setScalar(1 - .25 * tail); piece.rotation.y = -.65 * tail; }
        if (flourish.level === 3) piece.position.y = .28 * tail;
        if (flourish.level === 4) piece.scale.setScalar(1 + .14 * tail);
        if (flourish.level === 5) piece.rotation.z = .2 * tail;
        if (flourish.level === 6) piece.scale.x = 1 - .92 * tail;
        if (flourish.level === 7) { piece.position.y = .35 * tail; piece.rotation.y = .35 * tail; }
        if (amount === 1) settle();
      }
      const start = performance.now();
      renderer.render(scene, camera);
      root.dataset.lastRenderMs = (performance.now() - start).toFixed(3);
      root.dataset.renderCount = String(++draws);
      root.dataset.drawCalls = String(renderer.info.render.calls);
      root.dataset.triangles = String(renderer.info.render.triangles);
      root.dataset.geometries = String(renderer.info.memory.geometries);
      root.dataset.camera = `${controls.getAzimuthalAngle().toFixed(3)},${controls.getPolarAngle().toFixed(3)},${controls.getDistance().toFixed(3)},${camera.zoom.toFixed(3)}`;
      root.dataset.projection = 'orthographic';
      root.dataset.orbitOffset = (Math.abs(controls.getAzimuthalAngle() - homeTheta) + Math.abs(controls.getPolarAngle() - homePhi)).toFixed(4);
      root.dataset.panOffset = controls.target.distanceTo(homeTarget).toFixed(4);
      root.dataset.viewDefault = String(camera.position.distanceTo(home) < .0001 &&
        controls.target.distanceTo(homeTarget) < .0001 && Math.abs(camera.zoom - homeZoom) < .0001);
      if (!ready) { ready = true; setStatus({ state: 'ready' }); }
      if (flourish) invalidate();
    }
    function setLevel(next: number, motion: boolean) {
      if (next === currentLevel) {
        if (!motion && flourish) { settle(); invalidate(); }
        return;
      }
      settle();
      if (model) { scene.remove(model); disposeWayfinderModel(model); }
      if (diorama) { scene.remove(diorama); diorama.geometry.dispose(); }
      model = createWayfinderModel(next, material);
      diorama = createWayfinderDiorama(next, material);
      scene.add(model);
      scene.add(diorama);
      if (motion && next > currentLevel && currentLevel > 0) {
        const newest = model.children.at(-1);
        if (newest instanceof Mesh) {
          flourish = { mesh: newest, level: next, start: performance.now() };
          root.dataset.motion = 'revealing';
        }
      }
      currentLevel = next;
      root.dataset.modelLevel = String(next);
      root.dataset.dioramaLevel = String(next);
      root.dataset.equipment = model.children.map(child => child.name).join(',');
      invalidate();
    }
    function move(theta: number, phi: number, zoom = 1) {
      if (lost || disposed) return;
      const spherical = new Spherical().setFromVector3(camera.position.clone().sub(controls.target));
      spherical.theta += theta;
      spherical.phi = Math.max(controls.minPolarAngle, Math.min(controls.maxPolarAngle, spherical.phi + phi));
      camera.zoom = Math.max(controls.minZoom, Math.min(controls.maxZoom, camera.zoom / zoom));
      camera.updateProjectionMatrix();
      camera.position.setFromSpherical(spherical).add(controls.target);
      controls.update();
      invalidate();
    }
    const pan = (x: number, y: number) => {
      if (lost || disposed) return;
      const step = (camera.top - camera.bottom) / camera.zoom * .06;
      const offset = new Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(x * step)
        .add(new Vector3().setFromMatrixColumn(camera.matrix, 1).multiplyScalar(y * step));
      camera.position.add(offset);
      controls.target.add(offset);
      controls.update();
      invalidate();
    };
    const mode = (move: boolean) => {
      controls.mouseButtons.LEFT = move ? MOUSE.PAN : MOUSE.ROTATE;
      controls.touches.ONE = move ? TOUCH.PAN : TOUCH.ROTATE;
      root.dataset.controlMode = move ? 'move' : 'rotate';
    };
    const reset = () => {
      controls.reset();
      mode(false);
      setPanMode(false);
      root.dataset.resetCount = String(++resets);
      invalidate();
    };
    const resize = () => {
      const bounds = viewport.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const aspect = bounds.width / bounds.height;
      const width = Math.max(1, Math.min(384, Math.round(bounds.width), Math.floor(Math.sqrt(82_944 * aspect))));
      const height = Math.max(1, Math.floor(width / aspect));
      renderer.setSize(width, height, false);
      camera.left = -2.8 * aspect;
      camera.right = 2.8 * aspect;
      camera.updateProjectionMatrix();
      root.dataset.resolution = `${width}x${height}`;
      invalidate();
    };
    const visibility = () => {
      if (!intersecting || document.hidden) {
        if (pending !== null) cancelAnimationFrame(pending);
        pending = null;
        settle();
      } else invalidate();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      controls.enabled = false;
      if (pending !== null) cancelAnimationFrame(pending);
      pending = null;
      settle();
      setStatus({ state: 'lost', message: '3D graphics paused. The viewer will reconnect if the browser restores them. Your saved work is unchanged.' });
    };
    const onRestored = () => { lost = false; ready = false; controls.enabled = true; resize(); invalidate(); };
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const directions: Record<string, [number, number, number?]> = {
        ArrowLeft: [-.2, 0], ArrowRight: [.2, 0], ArrowUp: [0, -.15], ArrowDown: [0, .15],
        '+': [0, 0, .85], '=': [0, 0, .85], '-': [0, 0, 1.15],
      };
      if (event.key === 'Home') { event.preventDefault(); reset(); }
      else if (directions[event.key]) {
        event.preventDefault();
        if (event.shiftKey && event.key.startsWith('Arrow')) {
          pan(event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0,
            event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0);
        } else move(...directions[event.key]);
      }
    };
    const onStart = () => { root.dataset.dragging = 'true'; canvas.focus({ preventScroll: true }); };
    const onEnd = () => { root.dataset.dragging = 'false'; };
    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(entries => {
      intersecting = entries.some(entry => entry.isIntersecting);
      root.dataset.visible = String(intersecting);
      visibility();
    });
    resizeObserver.observe(viewport);
    intersectionObserver.observe(root);
    document.addEventListener('visibilitychange', visibility);
    canvas.addEventListener('webglcontextlost', onLost);
    canvas.addEventListener('webglcontextrestored', onRestored);
    canvas.addEventListener('keydown', onKey);
    controls.addEventListener('change', invalidate);
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);
    runtime.current = { level: setLevel, move, mode, reset };
    mode(false);
    root.dataset.motion = 'still';
    resize();
    return () => {
      disposed = true;
      runtime.current = null;
      if (pending !== null) cancelAnimationFrame(pending);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      canvas.removeEventListener('keydown', onKey);
      controls.removeEventListener('change', invalidate);
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.dispose();
      if (model) disposeWayfinderModel(model);
      diorama?.geometry.dispose();
      material.dispose();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [instructions]);

  useEffect(() => { runtime.current?.level(level, animate); }, [level, animate]);
  useEffect(() => { runtime.current?.mode(panMode); }, [panMode]);
  const stage = wayfinderStages[level - 1];
  return <div ref={rootRef} className="wayfinder-viewer" data-viewer-state={status.state} data-tour="wayfinder-viewer">
    <div ref={viewportRef} className="wayfinder-viewer-viewport" />
    {status.state === 'unavailable' && <div className="wayfinder-viewer-fallback">{fallback}</div>}
    {status.message && <p className="wayfinder-viewer-message" role="status">{status.message}</p>}
    {status.state !== 'unavailable' && <div className="wayfinder-viewer-tools"><span>{panMode ? '3D / DRAG TO MOVE' : '3D / DRAG TO ORBIT'}</span><div>
      <button disabled={status.state !== 'ready'} aria-label="Zoom out character" onClick={() => runtime.current?.move(0, 0, 1.15)}><Minus size={13} /></button>
      <button disabled={status.state !== 'ready'} aria-label="Zoom in character" onClick={() => runtime.current?.move(0, 0, .85)}><Plus size={13} /></button>
      <button disabled={status.state !== 'ready'} data-tour="wayfinder-pan-mode" aria-label="Move diorama" aria-pressed={panMode} onClick={() => setPanMode(value => !value)}><Move size={13} /></button>
      <button disabled={status.state !== 'ready'} data-tour="wayfinder-reset-view" aria-label="Reset diorama view" onClick={() => runtime.current?.reset()}><RotateCcw size={13} /></button>
    </div></div>}
    <p id={instructions} className="wayfinder-viewer-sr-only">Original low-poly isometric diorama and character with cumulative equipment through level {level}: {stage.form} and {stage.relic}. Drag or use arrow keys to rotate the whole scene. Right-drag, Shift plus arrow keys, or Move diorama mode moves the view. Scroll, pinch or use plus and minus to zoom. Home resets camera and move mode. These controls never change your records.</p>
  </div>;
}

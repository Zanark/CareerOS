import { describe, expect, it, vi } from 'vitest';
import { BufferGeometry, Color, LineSegments, PerspectiveCamera, Points, Vector3 } from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import type { CareerGraphNode } from './careerGraphModel';
import type { CareerOrbit } from './careerOrbitTypes';
import {
  CareerOrbitVisuals, ORBIT_ANCHOR_DIAMETER, SELECTED_ORBIT_ANCHOR_DIAMETER,
  ORBIT_HIGHLIGHT_SEGMENTS, ORBIT_HIGHLIGHT_WIDTH, ORBIT_HIGHLIGHT_HALO_WIDTH,
  ORBIT_ACTIVITY_BORDER_BRIGHT, ORBIT_ACTIVITY_BORDER_DIM, ORBIT_COLLECTION_BORDER_STRENGTH,
} from './CareerOrbitVisuals';
import { CHECKPOINT_COMPLETE_COLOR, COLLECTION_COLORS, MISSION_COLORS } from '../missionVisuals';
import { CAREER_ORBIT_PLANES, careerOrbitMotion, orbitPoint } from './careerOrbitMotion';
import { SAVED_STATUS_PULSE_SECONDS } from './careerOrbitSavedPulses';
import { CareerRippleField } from './careerRipple';

function node(id: string, position: [number, number, number] = [12, 7, 3]): CareerGraphNode {
  return { id, position, kind: 'checkpoint', roadmapVersion: '1.0.0', status: 'incomplete', label: id, detail: '', context: '', href: '/' };
}

function orbit(index = 0): CareerOrbit {
  return {
    id: `orbit:${index}`, index, kind: 'mission', missionMode: 'active', label: `Mission ${index}`,
    summary: '1 of 3 checkpoints complete', detail: '', color: MISSION_COLORS.pattern, href: '/',
    hubNodeId: 'mission:hub', memberIds: ['checkpoint:done', 'checkpoint:now', 'checkpoint:later'],
    roadmapVersion: '1.0.0',
    progress: { completed: 1, total: 3 }, currentNodeId: 'checkpoint:now',
    segments: [
      { id: 'stage:first', label: 'First stage', summary: '1 of 2 complete', detail: '', members: [
        { nodeId: 'checkpoint:done', status: 'complete', current: false },
        { nodeId: 'checkpoint:now', status: 'incomplete', current: true },
      ] },
      { id: 'stage:second', label: 'Second stage', summary: '0 of 1 complete', detail: '', members: [
        { nodeId: 'checkpoint:later', status: 'reference', current: false },
      ] },
    ],
  };
}

function nodes(): Map<string, CareerGraphNode> {
  return new Map([
    node('mission:hub', [0, 0, 0]), node('checkpoint:done', [9, 2, -8]),
    node('checkpoint:now', [-6, 7, 8]), node('checkpoint:later', [2, -4, 6]),
    node('unrelated', [35, 0, 0]),
  ].map(item => [item.id, item]));
}

function camera(): PerspectiveCamera {
  const camera = new PerspectiveCamera(46, 1, 0.1, 1000);
  camera.position.set(0, 0, 260);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  return camera;
}

function position(geometry: BufferGeometry, index: number): Vector3 {
  return new Vector3().fromBufferAttribute(geometry.getAttribute('position'), index);
}

function displayedPosition(geometry: BufferGeometry, index: number, field: CareerRippleField): Vector3 {
  const base = position(geometry, index);
  return base.clone().lerp(field.deformWorld(base, new Vector3()), geometry.getAttribute('aRippleWeight').getX(index));
}

function highlightPoint(visuals: CareerOrbitVisuals, segment: number, end = false): Vector3 {
  return new Vector3().fromBufferAttribute(visuals.highlight.geometry.getAttribute(end ? 'instanceEnd' : 'instanceStart'), segment);
}

function screen(point: Vector3, view: PerspectiveCamera): [number, number] {
  point.project(view);
  return [(point.x + 1) * 400, (1 - point.y) * 400];
}

describe('independent ring rotation speeds', () => {
  it.each([false, true])('integrates actual 100/200/0-percent angles without jumps or changing other rings (calm=%s)', calm => {
    const visuals = new CareerOrbitVisuals(calm), view = camera(), actual = nodes(), data = [orbit(0), orbit(1)];
    const beforeData = JSON.stringify(data), beforeNodes = JSON.stringify([...actual]);
    visuals.setData(data, actual, new Vector3(), 60);
    visuals.setSelection({ orbitId: data[0].id, segmentId: 'stage:first' });
    const signedAngle = (index: number) => {
      const point = new Vector3();
      visuals.getAnchor({ orbitId: data[index].id }, point);
      const plane = CAREER_ORBIT_PLANES[index];
      return Math.atan2(point.dot(plane.y), point.dot(plane.x));
    };
    const angleDelta = (before: number, after: number) => Math.atan2(Math.sin(after - before), Math.cos(after - before));
    let angle = signedAngle(0);
    visuals.update(view, 2);
    const rate = CAREER_ORBIT_PLANES[0].speed * (calm ? 0.4 : 1);
    expect(angleDelta(angle, signedAngle(0))).toBeCloseTo(2 * rate, 9);
    const positionAttributes = [visuals.paths, visuals.anchors, visuals.detailTethers, visuals.selectedAnchor]
      .map(object => object.geometry.getAttribute('position'));
    const buffers = positionAttributes.map(attribute => attribute.array.slice());
    const highlight = highlightPoint(visuals, 0), phase = visuals.getRotationPhase(data[0].id)!;
    const speeds = { [data[0].id]: 200 };
    visuals.setRotationSpeeds(speeds);
    speeds[data[0].id] = 0;
    expect(visuals.getRotationSpeed(data[0].id)).toBe(200);
    expect(visuals.getRotationSpeed(data[1].id)).toBe(100);
    expect(visuals.getRotationPhase(data[0].id)).toBe(phase);
    visuals.update(view, 0);
    positionAttributes.forEach((attribute, index) => expect(attribute.array).toEqual(buffers[index]));
    expect(highlightPoint(visuals, 0)).toEqual(highlight);
    angle = signedAngle(0);
    const otherAngle = signedAngle(1);
    visuals.update(view, 2);
    expect(angleDelta(angle, signedAngle(0))).toBeCloseTo(4 * rate, 9);
    expect(angleDelta(otherAngle, signedAngle(1))).toBeCloseTo(2 * CAREER_ORBIT_PLANES[1].speed * (calm ? .4 : 1), 9);
    expect(visuals.getRotationPhase(data[0].id)).toBeCloseTo(6 * rate);
    const frozen = position(visuals.anchors.geometry, 0);
    const other = position(visuals.anchors.geometry, 1);
    visuals.setRotationSpeeds({ [data[0].id]: 0 });
    visuals.update(view, 2);
    expect(position(visuals.anchors.geometry, 0)).toEqual(frozen);
    expect(position(visuals.anchors.geometry, 1)).not.toEqual(other);
    visuals.setRotationSpeeds({});
    visuals.update(view, 1);
    expect(visuals.getRotationPhase(data[0].id)).toBeCloseTo(7 * rate);
    expect(visuals.animationTime).toBe(7);
    expect(visuals.savedPulseCount).toBe(0);
    expect(JSON.stringify(data)).toBe(beforeData);
    expect(JSON.stringify([...actual])).toBe(beforeNodes);
    visuals.dispose();
  });

  it('retains each phase through setData, hidden restoration, pause and invalid updates', () => {
    const visuals = new CareerOrbitVisuals(), view = camera(), data = [orbit(0), orbit(1)], actual = nodes();
    visuals.setData(data, actual, new Vector3(), 60);
    visuals.setRotationSpeeds({ [data[0].id]: 200 });
    visuals.update(view, 3);
    const phase = visuals.getRotationPhase(data[0].id);
    const anchor = position(visuals.anchors.geometry, 0);
    visuals.setData(data, actual, new Vector3(), 60);
    expect(position(visuals.anchors.geometry, 0)).toEqual(anchor);
    visuals.setData([data[1]], actual, new Vector3(), 60);
    visuals.update(view, 4);
    visuals.setRotationSpeeds({ [data[0].id]: 300 });
    visuals.setData(data, actual, new Vector3(), 60);
    expect(visuals.getRotationPhase(data[0].id)).toBe(phase);
    expect(position(visuals.anchors.geometry, 0)).toEqual(anchor);
    for (const speed of [-1, 301, NaN, Infinity]) {
      expect(() => visuals.setRotationSpeeds({ [data[1].id]: 0, [data[0].id]: speed })).toThrow(RangeError);
      expect(visuals.getRotationSpeed(data[0].id)).toBe(300);
      expect(visuals.getRotationSpeed(data[1].id)).toBe(100);
    }
    visuals.setMotionAllowed(false);
    const other = visuals.getRotationPhase(data[1].id);
    visuals.update(view, 100);
    expect(visuals.animationTime).toBe(7);
    expect(visuals.getRotationPhase(data[0].id)).toBe(phase);
    expect(visuals.getRotationPhase(data[1].id)).toBe(other);
    visuals.setMotionAllowed(true);
    visuals.update(view, 1);
    expect(visuals.getRotationPhase(data[0].id)).toBeCloseTo(phase! + CAREER_ORBIT_PLANES[0].speed * 3);
    expect(visuals.savedPulseCount).toBe(0);
    visuals.dispose();
  });

  it.each(['background', 'planned'] as const)('keeps %s mission rings stationary even at 300 percent', missionMode => {
    const visuals = new CareerOrbitVisuals(), data = { ...orbit(2), missionMode };
    visuals.setData([data], nodes(), new Vector3(), 60);
    visuals.setSelection({ orbitId: data.id, segmentId: 'stage:first' });
    const anchor = position(visuals.anchors.geometry, 0), highlight = highlightPoint(visuals, 0);
    visuals.setRotationSpeeds({ [data.id]: 300 });
    visuals.update(camera(), 15);
    expect(visuals.getRotationSpeed(data.id)).toBe(300);
    expect(visuals.getRotationPhase(data.id)).toBe(0);
    expect(position(visuals.anchors.geometry, 0)).toEqual(anchor);
    expect(highlightPoint(visuals, 0)).toEqual(highlight);
    visuals.dispose();
  });

  it('keeps stage anchors, full-circle highlight, paths, picking and both tether endpoints on the integrated phase', () => {
    const visuals = new CareerOrbitVisuals(), field = new CareerRippleField(), view = camera(), data = orbit(0), actual = nodes();
    visuals.setRippleField(field);
    visuals.setData([data], actual, new Vector3(), 60);
    const selection = { orbitId: data.id, segmentId: 'stage:first' };
    visuals.setSelection(selection);
    visuals.update(view, 1);
    visuals.setRotationSpeeds({ [data.id]: 200 });
    visuals.update(view, 3);
    field.source.set(3, 4, -2);
    field.setWave(65, 200, 3);
    field.updateCamera(view);
    const base = new Vector3(), displayed = new Vector3();
    visuals.getAnchor(selection, base);
    visuals.getDisplayedAnchor(selection, displayed);
    expect(base.distanceTo(orbitPoint(0, Math.PI * 2 / 3, 7, new Vector3(), 60, new Vector3(), .012))).toBeLessThan(.00001);
    expect(displayed.distanceTo(field.deformWorld(base, new Vector3()))).toBeLessThan(.00001);
    expect(position(visuals.selectedAnchor.geometry, 0).distanceTo(base)).toBeLessThan(.00001);
    expect(displayedPosition(visuals.detailTethers.geometry, 0, field).distanceTo(displayed)).toBeLessThan(.00001);
    const target = new Vector3().fromArray(actual.get('checkpoint:done')!.position);
    expect(displayedPosition(visuals.detailTethers.geometry, 15, field).distanceTo(field.deformWorld(target, new Vector3()))).toBeLessThan(.00001);
    expect(visuals.pickAnchor(...screen(displayed.clone(), view), view, 800, 800)?.selection).toEqual(selection);
    expect(visuals.pickPath(...screen(displayed.clone(), view), view, 800, 800)).toEqual(selection);
    for (const segment of [0, 64, 128, 192, 255]) {
      const expected = orbitPoint(0, CAREER_ORBIT_PLANES[0].anchorAngle + segment / ORBIT_HIGHLIGHT_SEGMENTS * Math.PI * 2,
        7, new Vector3(), 60, new Vector3());
      expect(highlightPoint(visuals, segment).distanceTo(expected)).toBeLessThan(.00001);
    }
    const primary = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, primary);
    expect(position(visuals.primaryTethers.geometry, 0).distanceTo(primary)).toBeLessThan(.00001);
    expect(visuals.highlightVisible).toBe(true);
    expect(visuals.savedPulseCount).toBe(0);
    visuals.dispose();
  });
});

describe('semantic career orbit geometry', () => {
  it.each([false, true])('uses flat glowing identity dots with a CSS-pixel activity border and separate small packets (calm=%s)', calm => {
    const visuals = new CareerOrbitVisuals(calm), data = orbit();
    visuals.setData([data], nodes(), new Vector3(), 60);
    visuals.setSelection({ orbitId: data.id });
    expect(ORBIT_ANCHOR_DIAMETER).toBe(32);
    expect(SELECTED_ORBIT_ANCHOR_DIAMETER).toBe(36);
    expect(visuals.anchors.material.vertexShader).toContain('gl_PointSize = 32.0 * uPixelRatio');
    expect(visuals.selectedAnchor.material.vertexShader).toContain('gl_PointSize = 36.0 * uPixelRatio');
    expect(visuals.savedPulsePackets.material.vertexShader).toContain('gl_PointSize = 10.0 * uPixelRatio');
    for (const marker of [visuals.anchors, visuals.selectedAnchor]) {
      expect(marker.material.vertexShader).toContain('attribute float aActivityBorderStrength');
      expect(marker.material.fragmentShader).toContain('smoothstep(1.0, 1.5, abs(distance - borderCenter))');
      expect(marker.material.fragmentShader).toContain('gl_FragColor = vec4(vColor, alpha)');
      expect(marker.material.fragmentShader).not.toMatch(/diffuse|specular|sphere|normal|light/);
      expect(marker.geometry.getAttribute('aActivityBorderStrength').count).toBe(marker.geometry.getAttribute('position').count);
      expect(marker.material.uniforms.uDotDiameter.value).toBe(marker === visuals.anchors ? 32 : 36);
    }
    expect(visuals.savedPulsePackets.material.vertexShader).not.toContain('aActivityBorderStrength');
    expect(visuals.savedPulsePackets.geometry.getAttribute('aActivityBorderStrength')).toBeUndefined();
    expect(visuals.savedPulsePackets.material).not.toBe(visuals.anchors.material);
    expect(position(visuals.selectedAnchor.geometry, 0)).toEqual(position(visuals.anchors.geometry, 0));
    const color = new Color(data.color);
    const selected = visuals.selectedAnchor.geometry.getAttribute('color');
    expect([selected.getX(0), selected.getY(0), selected.getZ(0)])
      .toEqual(color.toArray().map(value => Math.fround(value)));
    for (const ratio of [1, 2, 1.5]) {
      visuals.resize(ratio);
      for (const point of [visuals.anchors, visuals.selectedAnchor, visuals.savedPulsePackets]) {
        expect(point.material.uniforms.uPixelRatio.value).toBe(ratio);
      }
    }
    visuals.dispose();
  });

  it('picks the flat dot and selected halo without enlarging unrelated path hit areas', () => {
    const visuals = new CareerOrbitVisuals(), data = orbit(), view = camera();
    visuals.setData([data], nodes(), new Vector3(), 60);
    const center = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, center);
    const [x, y] = screen(center, view);
    expect(visuals.pickAnchor(x + 14, y, view, 800, 800)?.selection).toEqual({ orbitId: data.id });
    expect(visuals.pickAnchor(x + 19, y, view, 800, 800)).toBeUndefined();
    visuals.setSelection({ orbitId: data.id });
    expect(visuals.pickAnchor(x + 19, y, view, 800, 800)?.selection).toEqual({ orbitId: data.id });
    expect(visuals.pickAnchor(x + 21, y, view, 800, 800)).toBeUndefined();
    visuals.dispose();
  });

  it('uses only same-day mission activity for border strength and treats collection activity as not applicable', () => {
    const today = '2026-10-06';
    const worked = { ...orbit(0), activity: { asOfDate: today, workedToday: true, streak: 4, lastWorkedOn: today } };
    const notWorked = { ...orbit(1), activity: { asOfDate: today, workedToday: false, streak: 3, lastWorkedOn: '2026-10-05' } };
    const stale = { ...orbit(2), activity: { asOfDate: '2026-10-05', workedToday: true, streak: 7, lastWorkedOn: '2026-10-05' } };
    const missing = orbit(3);
    const collection = { ...worked, id: 'records', index: 9, kind: 'action' as const, color: COLLECTION_COLORS.action };
    delete collection.missionMode;
    const data = [worked, notWorked, stale, missing, collection], before = JSON.stringify(data);
    const visuals = new CareerOrbitVisuals();
    visuals.setActivityDate(today);
    visuals.setData(data, nodes(), new Vector3(), 60);
    const strengths = visuals.anchors.geometry.getAttribute('aActivityBorderStrength');
    expect([...strengths.array]).toEqual([
      ORBIT_ACTIVITY_BORDER_BRIGHT, ORBIT_ACTIVITY_BORDER_DIM, ORBIT_ACTIVITY_BORDER_DIM,
      ORBIT_ACTIVITY_BORDER_DIM, ORBIT_COLLECTION_BORDER_STRENGTH,
    ].map(Math.fround));
    expect(visuals.getActivity(worked.id)).toMatchObject({ workedToday: true, streak: 4, asOfDate: today, borderStrength: 1 });
    expect(visuals.getActivity(notWorked.id)).toMatchObject({ workedToday: false, streak: 3 });
    expect(visuals.getActivity(stale.id)).toMatchObject({ workedToday: false, streak: null, asOfDate: '2026-10-05' });
    expect(visuals.getActivity(missing.id)).toMatchObject({ workedToday: false, streak: 0, asOfDate: null });
    expect(visuals.getActivity(collection.id)).toMatchObject({ workedToday: null, streak: null, asOfDate: null });
    expect(visuals.getActivity('missing')).toBeUndefined();
    for (const entry of data) {
      visuals.setSelection({ orbitId: entry.id, segmentId: 'stage:first' });
      expect(visuals.selectedAnchor.geometry.getAttribute('aActivityBorderStrength').getX(0))
        .toBe(visuals.getActivity(entry.id)!.borderStrength);
    }
    expect(JSON.stringify(data)).toBe(before);
    visuals.dispose();
  });

  it.each([false, true])('dims a stale snapshot at midnight while paused without rebuilding any geometry or resetting phase (calm=%s)', calm => {
    const data = { ...orbit(3), activity: { asOfDate: '2026-10-06', workedToday: true, streak: 4, lastWorkedOn: '2026-10-06' } };
    const before = JSON.stringify(data), visuals = new CareerOrbitVisuals(calm), view = camera();
    visuals.setActivityDate('2026-10-06');
    visuals.setData([data], nodes(), new Vector3(), 60);
    visuals.setSelection({ orbitId: data.id });
    visuals.update(view, 8);
    visuals.setMotionAllowed(false);
    const geometries = [visuals.paths.geometry, visuals.anchors.geometry, visuals.selectedAnchor.geometry,
      visuals.primaryTethers.geometry, visuals.detailTethers.geometry, visuals.highlight.geometry];
    const attributes = geometries.map(geometry => ({ ...geometry.attributes }));
    const buffers = geometries.map(geometry => geometry.getAttribute('position').array.slice());
    const disposals = geometries.map(geometry => vi.spyOn(geometry, 'dispose'));
    const highlight = highlightPoint(visuals, 0), cameraMatrix = view.matrixWorld.clone();
    const border = visuals.anchors.geometry.getAttribute('aActivityBorderStrength');
    const selectedBorder = visuals.selectedAnchor.geometry.getAttribute('aActivityBorderStrength');
    visuals.setActivityDate('2026-10-07');
    visuals.update(view, 0);
    expect(border.getX(0)).toBe(Math.fround(ORBIT_ACTIVITY_BORDER_DIM));
    expect(selectedBorder.getX(0)).toBe(border.getX(0));
    expect(visuals.getActivity(data.id)).toMatchObject({ workedToday: false, streak: null });
    expect(visuals.animationTime).toBe(8);
    expect(highlightPoint(visuals, 0)).toEqual(highlight);
    expect(visuals.highlightVisible).toBe(true);
    expect(view.matrixWorld).toEqual(cameraMatrix);
    expect(visuals.savedPulseCount).toBe(0);
    for (const [index, geometry] of geometries.entries()) {
      for (const [name, attribute] of Object.entries(attributes[index])) expect(geometry.attributes[name]).toBe(attribute);
      expect(geometry.getAttribute('position').array).toEqual(buffers[index]);
      expect(disposals[index]).not.toHaveBeenCalled();
    }
    visuals.setActivityDate('');
    expect(border.getX(0)).toBe(Math.fround(ORBIT_ACTIVITY_BORDER_DIM));
    expect(JSON.stringify(data)).toBe(before);
    visuals.dispose();
  });

  it.each(['active', 'background', 'planned'] as const)('updates real activity and current streak for %s dots without changing identity color or saved-status pulses', missionMode => {
    const visuals = new CareerOrbitVisuals(), field = new CareerRippleField(), view = camera(), actual = nodes();
    const data = { ...orbit(3), missionMode, color: MISSION_COLORS.fabric,
      activity: { asOfDate: '2026-10-06', workedToday: false, streak: 0, lastWorkedOn: null as string | null } };
    visuals.setActivityDate('2026-10-06');
    visuals.setRippleField(field);
    visuals.setMotionAllowed(true);
    visuals.setData([data], actual, new Vector3(), 60);
    visuals.setSelection({ orbitId: data.id, segmentId: 'stage:first' });
    visuals.update(view, 8);
    const phase = visuals.animationTime, pointBefore = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, pointBefore);
    data.activity = { asOfDate: '2026-10-06', workedToday: true, streak: 1, lastWorkedOn: '2026-10-06' };
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.getActivity(data.id)).toMatchObject({ workedToday: true, streak: 1, borderStrength: 1 });
    expect(visuals.selectedAnchor.geometry.getAttribute('aActivityBorderStrength').getX(0)).toBe(1);
    expect(visuals.anchors.geometry.getAttribute('aRippleWeight').getX(0)).toBe(missionMode === 'active' ? 1 : 0);
    for (const point of [visuals.anchors, visuals.selectedAnchor]) {
      const color = point.geometry.getAttribute('color');
      expect([color.getX(0), color.getY(0), color.getZ(0)]).toEqual(new Color(data.color).toArray().map(Math.fround));
      expect(point.material.uniforms.uRippleAmplitude).toBe(field.uniforms.uRippleAmplitude);
    }
    visuals.setActivityDate('2026-10-07');
    data.activity = { asOfDate: '2026-10-07', workedToday: true, streak: 2, lastWorkedOn: '2026-10-07' };
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.getActivity(data.id)).toMatchObject({ workedToday: true, streak: 2, borderStrength: 1 });
    const pointAfter = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, pointAfter);
    expect(pointAfter).toEqual(pointBefore);
    expect(visuals.animationTime).toBe(phase);
    expect(visuals.savedPulseCount).toBe(0);
    visuals.dispose();
  });

  it('preserves all mission and collection palette identities, including the small quiet rings, without green ring geometry', () => {
    const missions = Object.entries(MISSION_COLORS).map(([, color], index) => ({
      ...orbit(index), color, missionMode: index < 3 ? 'active' as const : 'background' as const,
    }));
    const collections = Object.entries(COLLECTION_COLORS).map(([kind, color], index) => ({
      ...orbit(index + missions.length), kind: kind as Exclude<CareerOrbit['kind'], 'mission'>, color, missionMode: undefined,
    }));
    const visuals = new CareerOrbitVisuals(), data = [...missions, ...collections];
    visuals.setData(data, nodes(), new Vector3(), 60);
    const anchors = visuals.anchors.geometry.getAttribute('color'), green = new Color(CHECKPOINT_COMPLETE_COLOR);
    expect(new Set(data.map(item => item.color)).size).toBe(data.length);
    data.forEach((item, index) => {
      expect([anchors.getX(index), anchors.getY(index), anchors.getZ(index)]).toEqual(new Color(item.color).toArray().map(Math.fround));
    });
    const pathColors = visuals.paths.geometry.getAttribute('color');
    expect(Array.from({ length: pathColors.count }, (_, index) => new Vector3().fromBufferAttribute(pathColors, index))
      .some(color => color.distanceTo(new Vector3(green.r, green.g, green.b)) < 0.00001)).toBe(false);
    visuals.dispose();
  });

  it('keeps an empty collection dot recognizable with a steady identity border and no mission activity claim', () => {
    const data = {
      ...orbit(9), kind: 'action' as const, missionMode: undefined, color: COLLECTION_COLORS.action,
      memberIds: [], segments: [],
    };
    const visuals = new CareerOrbitVisuals();
    visuals.setData([data], nodes(), new Vector3(), 60);
    const colors = visuals.anchors.geometry.getAttribute('color');
    expect([colors.getX(0), colors.getY(0), colors.getZ(0)]).toEqual(new Color(data.color).toArray().map(Math.fround));
    const before = visuals.anchors.geometry.getAttribute('aActivityBorderStrength').getX(0);
    for (const date of ['2026-10-06', '2026-10-07']) {
      visuals.setActivityDate(date);
      expect(visuals.getActivity(data.id)).toEqual({
        workedToday: null, streak: null, asOfDate: null, borderStrength: before,
      });
      expect(before).toBe(Math.fround(ORBIT_COLLECTION_BORDER_STRENGTH));
    }
    visuals.dispose();
  });

  it('uses fixed identity planes and exactly two deterministic speed boosts, not filtered order', () => {
    expect(CAREER_ORBIT_PLANES.map(item => item.multiplier).sort()).toEqual([...Array<number>(CAREER_ORBIT_PLANES.length - 2).fill(1), 1.5, 2]);
    expect(new Set(CAREER_ORBIT_PLANES.map(item => item.speed)).size).toBe(CAREER_ORBIT_PLANES.length);
    expect(CAREER_ORBIT_PLANES.some(item => item.speed < 0)).toBe(true);
    const first = new CareerOrbitVisuals();
    const second = new CareerOrbitVisuals();
    const a = orbit(2), b = orbit(12);
    first.setData([a, b], nodes(), new Vector3(), 60);
    second.setData([b], nodes(), new Vector3(), 60);
    first.update(camera(), 7);
    second.update(camera(), 7);
    const pointA = new Vector3(), pointB = new Vector3();
    first.getAnchor({ orbitId: b.id }, pointA);
    second.getAnchor({ orbitId: b.id }, pointB);
    expect(pointA.distanceTo(pointB)).toBeLessThan(0.000001);
    expect(pointA.length()).toBeCloseTo(CAREER_ORBIT_PLANES[12].radius * 60);
    const expected = orbitPoint(12, CAREER_ORBIT_PLANES[12].anchorAngle, 7, new Vector3(), 60, new Vector3());
    expect(pointA).toEqual(expected);
    first.dispose();
    second.dispose();
  });

  it('never moves nodes, connects invented neighbors, or treats membership as actual graph edges', () => {
    const actual = nodes();
    for (const item of actual.values()) {
      Object.freeze(item.position);
      Object.freeze(item);
    }
    const before = JSON.stringify([...actual]);
    const visuals = new CareerOrbitVisuals();
    visuals.setData([orbit()], actual, new Vector3(8, 3, -4), 65);
    expect(visuals.orbitCount).toBe(1);
    expect(visuals.tetherTargetIds).toEqual(['mission:hub']);
    visuals.setSelection({ orbitId: 'orbit:0', segmentId: 'stage:first' });
    expect(visuals.tetherTargetIds).toEqual(['mission:hub', 'checkpoint:done', 'checkpoint:now']);
    visuals.update(camera(), 12);
    expect(JSON.stringify([...actual])).toBe(before);
    expect(visuals.tetherTargetIds).not.toContain('unrelated');
    visuals.dispose();
  });

  it('uses identity-hue intensity for saved status ticks, neutral current slots, and no completion green', () => {
    const data = orbit();
    const visuals = new CareerOrbitVisuals();
    visuals.setData([data], nodes(), new Vector3(), 60);
    const colorSet = () => {
      const colors = visuals.paths.geometry.getAttribute('color');
      return new Set(Array.from({ length: colors.count }, (_, index) =>
        [colors.getX(index), colors.getY(index), colors.getZ(index)].map(value => value.toFixed(5)).join(',')));
    };
    const expectedColor = (hex: string, strength = 1) => new Color(hex).multiplyScalar(strength).toArray().map(value => value.toFixed(5)).join(',');
    for (const strength of [1, 0.35, 0.55]) {
      expect(colorSet().has(expectedColor(data.color, strength))).toBe(true);
    }
    expect(colorSet().has(expectedColor('#EEE8D5'))).toBe(true);
    expect(colorSet().has(expectedColor(CHECKPOINT_COMPLETE_COLOR))).toBe(false);
    const positions = visuals.paths.geometry.getAttribute('position').array.slice();
    data.segments[0].members[1].status = 'complete';
    visuals.setData([data], nodes(), new Vector3(), 60);
    expect(colorSet().has(expectedColor(data.color, 0.35))).toBe(false);
    expect(colorSet().has(expectedColor(CHECKPOINT_COMPLETE_COLOR))).toBe(false);
    expect(visuals.paths.geometry.getAttribute('position').array).toEqual(positions);
    visuals.dispose();
  });

  it('sizes collection buckets by actual record counts rather than a fictitious completion percentage', () => {
    const data = orbit(10);
    data.kind = 'evidence';
    delete data.missionMode;
    delete data.progress;
    data.segments[0].members = [data.segments[0].members[0]];
    data.segments[1].members = [
      { nodeId: 'a', status: 'reference', current: false },
      { nodeId: 'b', status: 'reference', current: false },
      { nodeId: 'c', status: 'reference', current: false },
    ];
    const visuals = new CareerOrbitVisuals();
    visuals.setData([data], nodes(), new Vector3(), 60);
    const anchor = new Vector3();
    visuals.getAnchor({ orbitId: data.id, segmentId: data.segments[0].id }, anchor);
    expect(anchor.distanceTo(orbitPoint(10, Math.PI / 4, 0, new Vector3(), 60, new Vector3(), 0.012))).toBeLessThan(0.000001);
    visuals.getAnchor({ orbitId: data.id, segmentId: data.segments[1].id }, anchor);
    expect(anchor.distanceTo(orbitPoint(10, Math.PI * 1.25, 0, new Vector3(), 60, new Vector3(), 0.012))).toBeLessThan(0.000001);
    const white = new Color('#EEE8D5').toArray();
    const colors = visuals.paths.geometry.getAttribute('color');
    expect(Array.from({ length: colors.count }, (_, index) =>
      Math.abs(colors.getX(index) - white[0]) < 0.0001
      && Math.abs(colors.getY(index) - white[1]) < 0.0001
      && Math.abs(colors.getZ(index) - white[2]) < 0.0001).some(Boolean)).toBe(false);
    visuals.dispose();
  });

  it('keeps complete membership but draws only visible, verified targets and distinguishes empty from filtered', () => {
    const real = orbit();
    real.memberIds.push('missing');
    real.segments[0].members.push({ nodeId: 'missing', status: 'incomplete', current: false });
    const empty = { ...orbit(9), kind: 'action' as const, memberIds: [], segments: [], hubNodeId: 'core:hidden' };
    const visible = new Map([['checkpoint:now', node('checkpoint:now')]]);
    const visuals = new CareerOrbitVisuals();
    visuals.setData([real, empty], visible, new Vector3(), 60);
    expect(visuals.tetherCount).toBe(0);
    visuals.setSelection({ orbitId: real.id });
    expect(visuals.tetherTargetIds).toEqual(['checkpoint:now']);
    expect(visuals.anchorInfo.map(item => [item.orbit.memberIds.length, item.visibleMemberCount])).toEqual([[4, 1], [0, 0]]);
    visuals.setData([real, empty], new Map(), new Vector3(), 60);
    expect(visuals.anchorInfo.map(item => [item.orbit.memberIds.length, item.visibleMemberCount])).toEqual([[4, 0], [0, 0]]);
    expect(visuals.tetherCount).toBe(0);
    expect(visuals.orbitCount).toBe(2);
    visuals.dispose();
  });

  it('stretches tethers from moving primary and selected stage anchors to unchanged endpoints', () => {
    const visuals = new CareerOrbitVisuals();
    const data = nodes();
    visuals.setData([orbit()], data, new Vector3(), 60);
    const selection = { orbitId: 'orbit:0', segmentId: 'stage:first' };
    visuals.setSelection(selection);
    const primary = visuals.primaryTethers.geometry.getAttribute('position');
    const details = visuals.detailTethers.geometry.getAttribute('position');
    const start = position(visuals.primaryTethers.geometry, 0);
    visuals.update(camera(), 8);
    expect(position(visuals.primaryTethers.geometry, 0).distanceTo(start)).toBeGreaterThan(10);
    expect(position(visuals.primaryTethers.geometry, primary.count - 1).toArray()).toEqual(data.get('mission:hub')!.position);
    const anchor = new Vector3();
    visuals.getAnchor(selection, anchor);
    expect(position(visuals.detailTethers.geometry, 0).distanceTo(anchor)).toBeLessThan(0.00001);
    expect(position(visuals.detailTethers.geometry, 15).toArray()).toEqual(data.get('checkpoint:done')!.position);
    expect(position(visuals.detailTethers.geometry, details.count - 1).toArray()).toEqual(data.get('checkpoint:now')!.position);
    expect(visuals.primaryTethers.geometry.getAttribute('position')).toBe(primary);
    expect(visuals.detailTethers.geometry.getAttribute('position')).toBe(details);
    visuals.dispose();
  });

  it('rotates all stage and status slots coherently and picks current anchors and arcs', () => {
    const visuals = new CareerOrbitVisuals();
    const view = camera();
    const data = orbit();
    visuals.setData([data], nodes(), new Vector3(), 60);
    const before = position(visuals.paths.geometry, 0);
    visuals.update(view, 8);
    const plane = CAREER_ORBIT_PLANES[0];
    const axis = plane.x.clone().cross(plane.y).normalize();
    expect(position(visuals.paths.geometry, 0).distanceTo(before.applyAxisAngle(axis, plane.speed * 8))).toBeLessThan(0.00001);
    const current = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, current);
    expect(visuals.pick(...screen(current, view), view, 800, 800)).toEqual({ orbitId: data.id });
    for (const segment of data.segments) {
      const selection = { orbitId: data.id, segmentId: segment.id };
      visuals.getAnchor(selection, current);
      expect(visuals.pick(...screen(current, view), view, 800, 800)).toEqual(selection);
    }
    visuals.dispose();
  });

  it('exposes nearest foreground-anchor screen distance separately from underlying ring paths', () => {
    const visuals = new CareerOrbitVisuals(), view = camera(), data = orbit();
    visuals.setData([data], nodes(), new Vector3(), 60);
    visuals.update(view, 8);
    const point = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, point);
    const [x, y] = screen(point, view);
    const hit = visuals.pickAnchor(x + 3, y + 4, view, 800, 800);
    expect(hit?.selection).toEqual({ orbitId: data.id });
    expect(hit?.distance).toBeCloseTo(5, 4);
    expect(visuals.pickPath(x, y, view, 800, 800)?.orbitId).toBe(data.id);
    const stage = { orbitId: data.id, segmentId: data.segments[0].id };
    visuals.getAnchor(stage, point);
    const [stageX, stageY] = screen(point, view);
    expect(visuals.pickAnchor(stageX, stageY, view, 800, 800)).toBeUndefined();
    expect(visuals.pickPath(stageX, stageY, view, 800, 800)).toEqual(stage);
    visuals.setSelection(stage);
    expect(visuals.pickAnchor(stageX, stageY, view, 800, 800)?.selection).toEqual(stage);
    visuals.setVisible(false);
    expect(visuals.pickAnchor(x, y, view, 800, 800)).toBeUndefined();
    expect(visuals.pickPath(stageX, stageY, view, 800, 800)).toBeUndefined();
    visuals.dispose();
  });

  it('keeps all orbit layers on one field and picks displayed anchors without double-deforming base buffers', () => {
    const visuals = new CareerOrbitVisuals(), field = new CareerRippleField(), view = camera();
    const data = orbit(), actual = nodes();
    const selection = { orbitId: data.id, segmentId: data.segments[0].id };
    visuals.setRippleField(field);
    visuals.setData([data], actual, new Vector3(), 60);
    visuals.setSelection(selection);
    const base = new Vector3(), displayed = new Vector3();
    visuals.getAnchor(selection, base);
    field.setWave(base.length(), 24, 2.4);
    field.updateCamera(view);
    visuals.getDisplayedAnchor(selection, displayed);
    expect(displayed.distanceTo(base)).toBeCloseTo(2.4);
    expect(position(visuals.selectedAnchor.geometry, 0).distanceTo(base)).toBeLessThan(0.00001);
    const paths = visuals.paths.geometry.getAttribute('position');
    const before = paths.array.slice();
    expect(visuals.pickAnchor(...screen(displayed.clone(), view), view, 800, 800)?.selection).toEqual(selection);
    expect(visuals.pickPath(...screen(displayed.clone(), view), view, 800, 800)).toEqual(selection);
    for (const material of [
      visuals.paths.material, visuals.anchors.material, visuals.primaryTethers.material,
      visuals.detailTethers.material, visuals.selectedAnchor.material, visuals.savedPulsePackets.material,
      visuals.savedPulseTethers.material, visuals.savedPulsePackets.material,
    ]) {
      expect(material.uniforms.uRippleAmplitude).toBe(field.uniforms.uRippleAmplitude);
      expect(material.vertexShader).toContain('mix(basePosition, rippleView(basePosition), aRippleWeight)');
    }
    const tetherStart = position(visuals.detailTethers.geometry, 0);
    expect(field.deformWorld(tetherStart, tetherStart).distanceTo(displayed)).toBeLessThan(0.00001);
    field.setWave(new Vector3().fromArray(actual.get('checkpoint:now')!.position).length(), 24, 2.4);
    const end = position(visuals.detailTethers.geometry, visuals.detailTethers.geometry.getAttribute('position').count - 1);
    const nodePoint = new Vector3().fromArray(actual.get('checkpoint:now')!.position);
    expect(field.deformWorld(end, end).distanceTo(field.deformWorld(nodePoint, nodePoint))).toBeLessThan(0.00001);
    visuals.update(view, 0);
    expect(paths.array).toEqual(before);
    expect(visuals.savedPulseCount).toBe(0);
    field.cancel();
    visuals.getDisplayedAnchor(selection, displayed);
    expect(displayed).toEqual(base);
    visuals.dispose();
  });

  it('masks only orbit paths, preserving primary anchors, details and selection hit testing', () => {
    const visuals = new CareerOrbitVisuals();
    const view = camera();
    visuals.setData([orbit()], nodes(), new Vector3(), 60);
    visuals.setSelection({ orbitId: 'orbit:0' });
    const geometry = visuals.paths.geometry.getAttribute('position');
    visuals.setRimOnly(true);
    visuals.update(view, 0);
    const anchor = new Vector3();
    visuals.getAnchor({ orbitId: 'orbit:0' }, anchor);
    expect(visuals.pick(...screen(anchor, view), view, 800, 800)).toEqual({ orbitId: 'orbit:0' });
    const stage = { orbitId: 'orbit:0', segmentId: 'stage:first' };
    visuals.setSelection(stage);
    visuals.getAnchor(stage, anchor);
    expect(visuals.pick(...screen(anchor, view), view, 800, 800)).toEqual(stage);
    expect(visuals.paths.material.fragmentShader).toContain('rimVisibility()');
    for (const material of [visuals.anchors.material, visuals.primaryTethers.material, visuals.detailTethers.material]) {
      expect(material.fragmentShader).not.toContain('rimVisibility()');
    }
    visuals.setRimOnly(false);
    expect(visuals.paths.geometry.getAttribute('position')).toBe(geometry);
    visuals.setVisible(false);
    expect(visuals.pick(...screen(new Vector3(60, 0, 0), view), view, 800, 800)).toBeUndefined();
    visuals.dispose();
  });

  it('preserves active time over selection/data rebuilds and pauses without resume catch-up', () => {
    const visuals = new CareerOrbitVisuals();
    const view = camera();
    visuals.setData([orbit()], nodes(), new Vector3(), 60);
    visuals.update(view, 0.05);
    const geometry = visuals.paths.geometry.getAttribute('position');
    const before = geometry.array.slice();
    for (let frame = 0; frame < 30; frame++) visuals.update(view, 0);
    visuals.update(view, -1);
    visuals.update(view, Infinity);
    expect(geometry.array).toEqual(before);
    expect(visuals.animationTime).toBe(0.05);
    visuals.setSelection({ orbitId: 'orbit:0', segmentId: 'stage:first' });
    visuals.setData([orbit()], nodes(), new Vector3(), 60);
    expect(visuals.animationTime).toBe(0.05);
    expect(visuals.paths.geometry.getAttribute('position').array).toEqual(before);
    visuals.update(view, 0.03);
    expect(visuals.animationTime).toBe(0.08);
    visuals.dispose();
  });

  it('compares selection identities, ignoring equivalent parent-render objects without rebuilding buffers', () => {
    const visuals = new CareerOrbitVisuals();
    visuals.setData([orbit()], nodes(), new Vector3(), 60);
    visuals.setSelection({ orbitId: 'orbit:0', segmentId: 'stage:first' });
    const positions = visuals.detailTethers.geometry.getAttribute('position');
    const dispose = vi.spyOn(visuals.detailTethers.geometry, 'dispose');
    for (let render = 0; render < 10; render++) visuals.setSelection({ orbitId: 'orbit:0', segmentId: 'stage:first' });
    expect(visuals.detailTethers.geometry.getAttribute('position')).toBe(positions);
    expect(dispose).not.toHaveBeenCalled();
    visuals.setData([], nodes(), new Vector3(), 60);
    visuals.setSelection({ orbitId: 'orbit:0', segmentId: 'stage:first' });
    expect(visuals.selectedAnchor.visible).toBe(false);
    expect(visuals.tetherCount).toBe(0);
    visuals.dispose();
  });

  it('runs the focus profile at 40% orbit speed, independent of any timer', () => {
    const normal = new CareerOrbitVisuals(), calm = new CareerOrbitVisuals(true);
    const view = camera();
    normal.setData([orbit()], nodes(), new Vector3(), 60);
    calm.setData([orbit()], nodes(), new Vector3(), 60);
    normal.update(view, 4);
    calm.update(view, 10);
    expect(calm.paths.geometry.getAttribute('position').array).toEqual(normal.paths.geometry.getAttribute('position').array);
    normal.dispose();
    calm.dispose();
  });

  it.each(['background', 'planned'] as const)('keeps %s missions small and stationary in their own identity hue without changing saved work', mode => {
    const visuals = new CareerOrbitVisuals();
    const data = { ...orbit(7), missionMode: mode, color: MISSION_COLORS.algorithm };
    const before = JSON.stringify(data), actual = nodes(), beforeNodes = JSON.stringify([...actual]);
    const center = new Vector3(8, 3, -4), view = camera();
    visuals.setMotionAllowed(true);
    visuals.setData([data], actual, center, 60);
    const anchor = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, anchor);
    expect(anchor.distanceTo(center) / 60).toBeCloseTo(0.55);
    expect(visuals.getMotion(data.id)).toMatchObject({ quiet: true, revolving: false, normalizedRadius: 0.55, rippleWeight: 0 });
    const paths = visuals.paths.geometry.getAttribute('position').array.slice();
    const anchors = visuals.anchors.geometry.getAttribute('position').array.slice();
    const identity = new Color(data.color);
    for (const selection of [{ orbitId: data.id }, { orbitId: data.id, segmentId: 'stage:first' }]) {
      visuals.setSelection(selection);
      visuals.update(view, 12);
      expect(visuals.paths.geometry.getAttribute('position').array).toEqual(paths);
      expect(visuals.anchors.geometry.getAttribute('position').array).toEqual(anchors);
      for (const mesh of [visuals.paths, visuals.anchors, visuals.primaryTethers, visuals.detailTethers, visuals.selectedAnchor]) {
        const colors = mesh.geometry.getAttribute('color');
        for (let index = 0; index < colors.count; index++) {
          expect(colors.getX(index) / colors.getY(index)).toBeCloseTo(identity.r / identity.g, 5);
          expect(colors.getZ(index) / colors.getY(index)).toBeCloseTo(identity.b / identity.g, 5);
        }
      }
      expect(visuals.savedPulseCount).toBe(0);
    }
    expect(JSON.stringify(data)).toBe(before);
    expect(JSON.stringify([...actual])).toBe(beforeNodes);
    visuals.dispose();
  });

  it('updates live mission modes at the existing phase without changing other identities, radii or the camera', () => {
    const visuals = new CareerOrbitVisuals(), filtered = new CareerOrbitVisuals();
    const data = { ...orbit(4), missionMode: 'background' as const, color: MISSION_COLORS.blueprint };
    const active = orbit(1), collection = { ...orbit(12), kind: 'evidence' as const };
    delete collection.missionMode;
    const actual = nodes(), view = camera(), center = new Vector3(8, 3, -4);
    const cameraPosition = view.position.clone(), quiet = new Vector3(), other = new Vector3(), records = new Vector3();
    visuals.setMotionAllowed(true);
    visuals.setData([data, active, collection], actual, center, 60);
    visuals.setSelection({ orbitId: data.id, segmentId: 'stage:first' });
    visuals.update(view, 12);
    visuals.getAnchor({ orbitId: data.id }, quiet);
    visuals.getAnchor({ orbitId: active.id }, other);
    visuals.getAnchor({ orbitId: collection.id }, records);
    const resumed = { ...data, missionMode: 'active' as const };
    visuals.setData([collection, resumed, active], actual, center, 60);
    const point = new Vector3();
    visuals.getAnchor({ orbitId: data.id }, point);
    expect(point).toEqual(orbitPoint(4, CAREER_ORBIT_PLANES[4].anchorAngle, 12, center, 60, new Vector3()));
    visuals.getAnchor({ orbitId: active.id }, point);
    expect(point).toEqual(other);
    visuals.getAnchor({ orbitId: collection.id }, point);
    expect(point).toEqual(records);
    expect(visuals.getMotion(collection.id)?.quiet).toBe(false);
    expect(visuals.selectedAnchor.geometry.getAttribute('aRippleWeight').getX(0)).toBe(1);
    visuals.setData([collection, data, active], actual, center, 60);
    visuals.getAnchor({ orbitId: data.id }, point);
    expect(point).toEqual(quiet);
    expect(visuals.selectedAnchor.geometry.getAttribute('aRippleWeight').getX(0)).toBe(0);
    filtered.setData([data], actual, center, 60);
    filtered.update(view, 32);
    filtered.getAnchor({ orbitId: data.id }, point);
    expect(point).toEqual(quiet);
    expect(visuals.animationTime).toBe(12);
    expect(visuals.savedPulseCount).toBe(0);
    expect(view.position).toEqual(cameraPosition);
    visuals.dispose();
    filtered.dispose();
  });

  it.each([false, true])('pins quiet rings and markers through heartbeat while every real tether endpoint stays attached (calm=%s)', calm => {
    const visuals = new CareerOrbitVisuals(calm), field = new CareerRippleField(), view = camera();
    const data = { ...orbit(5), missionMode: 'planned' as const, color: MISSION_COLORS.credential }, actual = nodes();
    const center = new Vector3(8, 3, -4);
    view.position.set(55, 30, 250);
    view.lookAt(center);
    view.updateMatrixWorld();
    field.source.copy(center);
    visuals.setRippleField(field);
    visuals.setData([data], actual, center, 60);
    const selected = { orbitId: data.id, segmentId: 'stage:first' };
    visuals.setSelection(selected);
    const base = new Vector3(), shown = new Vector3();
    visuals.getAnchor(selected, base);
    const before = visuals.paths.geometry.getAttribute('position').array.slice();
    field.setWave(base.distanceTo(center), 100, 2.4);
    field.updateCamera(view);
    visuals.update(view, 15);
    visuals.getDisplayedAnchor(selected, shown);
    expect(shown).toEqual(base);
    expect(field.deformWorld(base, new Vector3()).distanceTo(base)).toBeGreaterThan(1);
    expect(visuals.paths.geometry.getAttribute('position').array).toEqual(before);
    for (const mesh of [visuals.paths, visuals.anchors, visuals.selectedAnchor]) {
      const positions = mesh.geometry.getAttribute('position');
      const weights = mesh.geometry.getAttribute('aRippleWeight');
      expect(weights.count).toBe(positions.count);
      expect([...weights.array].every(weight => weight === 0)).toBe(true);
      expect(displayedPosition(mesh.geometry, 0, field)).toEqual(position(mesh.geometry, 0));
    }
    expect(visuals.pickAnchor(...screen(shown.clone(), view), view, 800, 800)?.selection).toEqual(selected);
    expect(visuals.pickPath(...screen(shown.clone(), view), view, 800, 800)).toEqual(selected);
    const primaryAnchor = new Vector3();
    visuals.getDisplayedAnchor({ orbitId: data.id }, primaryAnchor);
    expect(visuals.pickAnchor(...screen(primaryAnchor.clone(), view), view, 800, 800)?.selection).toEqual({ orbitId: data.id });
    for (const [mesh, ids, anchor] of [
      [visuals.primaryTethers, ['mission:hub'], primaryAnchor],
      [visuals.detailTethers, ['checkpoint:done', 'checkpoint:now'], shown],
    ] as const) {
      const weights = mesh.geometry.getAttribute('aRippleWeight');
      ids.forEach((id, index) => {
        const start = index * 16, end = start + 15;
        expect(weights.getX(start)).toBe(0);
        expect(weights.getX(end)).toBe(1);
        expect(displayedPosition(mesh.geometry, start, field).distanceTo(anchor)).toBeLessThan(0.00001);
        const node = new Vector3().fromArray(actual.get(id)!.position);
        const endpoint = field.deformWorld(node, new Vector3());
        expect(endpoint.distanceTo(node)).toBeGreaterThan(0);
        expect(displayedPosition(mesh.geometry, end, field).distanceTo(endpoint)).toBeLessThan(0.00001);
      });
    }
    field.cancel();
    visuals.getDisplayedAnchor(selected, shown);
    expect(shown).toEqual(base);
    visuals.dispose();
  });

  it('retains collection revolution, full radius and heartbeat response beside quiet missions', () => {
    const visuals = new CareerOrbitVisuals(), field = new CareerRippleField(), view = camera();
    const quiet = { ...orbit(2), missionMode: 'background' as const, color: MISSION_COLORS.escape };
    const collection = { ...orbit(11), kind: 'evidence' as const };
    delete collection.missionMode;
    visuals.setRippleField(field);
    visuals.setData([quiet, collection], nodes(), new Vector3(), 60);
    const before = new Vector3(), after = new Vector3(), displayed = new Vector3();
    visuals.getAnchor({ orbitId: collection.id }, before);
    visuals.update(view, 8);
    visuals.getAnchor({ orbitId: collection.id }, after);
    expect(after.distanceTo(before)).toBeGreaterThan(10);
    expect(after.length() / 60).toBeCloseTo(CAREER_ORBIT_PLANES[11].radius);
    field.setWave(after.length(), 24, 2.4);
    field.updateCamera(view);
    visuals.getDisplayedAnchor({ orbitId: collection.id }, displayed);
    expect(displayed.distanceTo(after)).toBeCloseTo(2.4);
    expect(displayedPosition(visuals.anchors.geometry, 1, field).distanceTo(displayed)).toBeLessThan(0.00001);
    expect(visuals.pickAnchor(...screen(displayed, view), view, 800, 800)?.selection).toEqual({ orbitId: collection.id });
    visuals.dispose();
  });

  it('cancels rendered saved-status geometry on a quiet transition without replay when reactivated', () => {
    const visuals = new CareerOrbitVisuals(), data = orbit(), actual = nodes();
    visuals.setMotionAllowed(true);
    visuals.setData([data], actual, new Vector3(), 60);
    data.segments[0].members[1].status = 'complete';
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(1);
    data.missionMode = 'background';
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(0);
    expect(visuals.savedPulseTethers.visible).toBe(false);
    expect(visuals.savedPulsePackets.geometry.drawRange.count).toBe(0);
    data.missionMode = 'active';
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(0);
    visuals.dispose();
  });

  it('sends a finite saved-status packet along only the changed checkpoint membership toward its moving stage', () => {
    const visuals = new CareerOrbitVisuals();
    visuals.setMotionAllowed(true);
    const data = orbit(), actual = nodes(), view = camera();
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(0);
    data.segments[0].members[1].status = 'complete';
    data.segments[0].members[1].current = false;
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(1);
    for (const mesh of [visuals.paths, visuals.anchors, visuals.primaryTethers, visuals.detailTethers,
      visuals.selectedAnchor, visuals.savedPulseTethers, visuals.savedPulsePackets]) {
      const weights = mesh.geometry.getAttribute('aRippleWeight');
      expect(weights.count).toBe(mesh.geometry.getAttribute('position').count);
      expect([...weights.array].every(weight => weight === 1)).toBe(true);
    }
    expect(visuals.tetherTargetIds).toEqual(['mission:hub', 'checkpoint:now']);
    expect(position(visuals.savedPulsePackets.geometry, 0).toArray()).toEqual(actual.get('checkpoint:now')!.position);
    const tether = visuals.savedPulseTethers.geometry.getAttribute('position');
    const packets = visuals.savedPulsePackets.geometry.getAttribute('position');
    visuals.update(view, SAVED_STATUS_PULSE_SECONDS / 2);
    expect(position(visuals.savedPulsePackets.geometry, 0).distanceTo(position(visuals.savedPulseTethers.geometry, 8))).toBeLessThan(0.00001);
    const anchor = new Vector3();
    visuals.getAnchor({ orbitId: data.id, segmentId: data.segments[0].id }, anchor);
    expect(position(visuals.savedPulseTethers.geometry, 0).distanceTo(anchor)).toBeLessThan(0.00001);
    expect(position(visuals.savedPulseTethers.geometry, tether.count - 1).toArray()).toEqual(actual.get('checkpoint:now')!.position);
    visuals.update(view, SAVED_STATUS_PULSE_SECONDS);
    expect(visuals.savedPulseCount).toBe(0);
    expect(visuals.tetherCount).toBe(1);
    expect(visuals.savedPulseTethers.visible).toBe(false);
    expect(visuals.savedPulsePackets.geometry.drawRange.count).toBe(0);
    expect(visuals.savedPulseTethers.geometry.getAttribute('position')).toBe(tether);
    expect(visuals.savedPulsePackets.geometry.getAttribute('position')).toBe(packets);
    const staticUpdated = new CareerOrbitVisuals();
    staticUpdated.setData([data], actual, new Vector3(), 60);
    expect(visuals.paths.geometry.getAttribute('color').array).toEqual(staticUpdated.paths.geometry.getAttribute('color').array);
    expect(actual.get('checkpoint:now')!.status).toBe('incomplete');
    visuals.dispose();
    staticUpdated.dispose();
  });

  it('deforms saved-status packets and their real membership endpoints with the same independent ripple', () => {
    const visuals = new CareerOrbitVisuals(), field = new CareerRippleField(), data = orbit(), actual = nodes();
    const view = camera();
    visuals.setRippleField(field);
    visuals.setMotionAllowed(true);
    visuals.setData([data], actual, new Vector3(), 60);
    const nodePoint = new Vector3().fromArray(actual.get('checkpoint:now')!.position);
    field.setWave(nodePoint.length(), 20, 2.4);
    field.updateCamera(view);
    visuals.update(view, 0);
    expect(visuals.savedPulseCount).toBe(0);
    data.segments[0].members[1].status = 'complete';
    data.segments[0].members[1].current = false;
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(1);
    const packet = position(visuals.savedPulsePackets.geometry, 0);
    expect(field.deformWorld(packet, packet)).toEqual(field.deformWorld(nodePoint, new Vector3()));
    visuals.update(view, SAVED_STATUS_PULSE_SECONDS / 2);
    const midPacket = position(visuals.savedPulsePackets.geometry, 0);
    const midTether = position(visuals.savedPulseTethers.geometry, 8);
    expect(field.deformWorld(midPacket, midPacket).distanceTo(field.deformWorld(midTether, midTether))).toBeLessThan(0.00001);
    const anchor = new Vector3();
    visuals.getDisplayedAnchor({ orbitId: data.id, segmentId: data.segments[0].id }, anchor);
    const tetherStart = position(visuals.savedPulseTethers.geometry, 0);
    expect(field.deformWorld(tetherStart, tetherStart).distanceTo(anchor)).toBeLessThan(0.00001);
    visuals.update(view, SAVED_STATUS_PULSE_SECONDS);
    expect(visuals.savedPulseCount).toBe(0);
    expect(field.active).toBe(true);
    visuals.dispose();
  });

  it('cancels saved-status packets immediately when motion is disallowed and never replays on resume', () => {
    const visuals = new CareerOrbitVisuals();
    const data = orbit(), actual = nodes();
    visuals.setMotionAllowed(true);
    visuals.setData([data], actual, new Vector3(), 60);
    data.segments[0].members[1].status = 'complete';
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(1);
    visuals.setMotionAllowed(false);
    expect(visuals.savedPulseCount).toBe(0);
    expect(visuals.savedPulseTethers.visible).toBe(false);
    expect(visuals.savedPulsePackets.geometry.drawRange.count).toBe(0);
    visuals.update(camera(), 0);
    visuals.setMotionAllowed(true);
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.savedPulseCount).toBe(0);
    visuals.dispose();
  });

  it('retains all 10,000 records and tethers with reduced curve complexity and stable frame buffers', () => {
    const data = orbit(9);
    data.kind = 'action';
    delete data.missionMode;
    data.memberIds = Array.from({ length: 10000 }, (_, index) => `record:${index}`);
    delete data.progress;
    data.segments = [{
      id: 'bucket', label: 'Recorded work', summary: '10,000 records', detail: '',
      members: data.memberIds.map(nodeId => ({ nodeId, status: 'reference', current: false })),
    }];
    const actual = nodes();
    for (const id of data.memberIds) actual.set(id, node(id));
    const visuals = new CareerOrbitVisuals();
    visuals.setData([data], actual, new Vector3(), 60);
    expect(visuals.tetherCount).toBe(1);
    visuals.setSelection({ orbitId: data.id });
    expect(visuals.tetherCount).toBe(10001);
    expect(visuals.detailTetherSegments).toBe(1);
    expect(visuals.detailTethers.geometry.getAttribute('position').count).toBe(20000);
    expect(visuals.paths.geometry.getAttribute('position').count).toBeLessThan(1000);
    const positions = visuals.detailTethers.geometry.getAttribute('position');
    const before = positions.array;
    for (let frame = 0; frame < 10; frame++) visuals.update(camera(), 0.03);
    expect(visuals.detailTethers.geometry.getAttribute('position').array).toBe(before);
    expect(new Set(visuals.tetherTargetIds).size).toBe(10001);
    expect(visuals.anchorInfo[0].visibleMemberCount).toBe(10000);
    visuals.dispose();
  });

  it('rejects invalid identity indices, tolerates zero-record segments and missing selections', () => {
    const data = orbit(4);
    data.segments.push({ id: 'empty', label: 'No records', summary: 'No records', detail: '', members: [] });
    const visuals = new CareerOrbitVisuals();
    visuals.setData([data, data, orbit(-1), orbit(CAREER_ORBIT_PLANES.length), orbit(1.5)], nodes(), new Vector3(), 0);
    expect(visuals.orbitCount).toBe(1);
    visuals.setSelection({ orbitId: data.id, segmentId: 'empty' });
    expect(visuals.tetherCount).toBe(1);
    expect(visuals.getAnchor({ orbitId: data.id, segmentId: 'empty' }, new Vector3())).toBe(true);
    expect(visuals.getAnchor({ orbitId: 'missing' }, new Vector3())).toBe(false);
    visuals.setSelection({ orbitId: 'missing' });
    expect(visuals.selectedAnchor.visible).toBe(false);
    visuals.setData([], new Map(), new Vector3(), 60);
    visuals.update(camera(), 1);
    expect(visuals.orbitCount).toBe(0);
    expect(visuals.tetherCount).toBe(0);
    expect(visuals.pick(400, 400, camera(), 800, 800)).toBeUndefined();
    visuals.dispose();
  });

  it('highlights the full 360-degree identity ring for whole-orbit and stage selections, without altering status ticks or membership', () => {
    const visuals = new CareerOrbitVisuals(), data = orbit(6), actual = nodes(), view = camera();
    const center = new Vector3(8, 3, -4), beforeData = JSON.stringify(data), beforeNodes = JSON.stringify([...actual]);
    const beforeCamera = view.matrixWorld.clone();
    visuals.setData([data], actual, center, 60);
    visuals.update(view, 8);
    const paths = visuals.paths.geometry.getAttribute('position').array.slice();
    const colors = visuals.paths.geometry.getAttribute('color').array.slice();
    const plane = CAREER_ORBIT_PLANES[6];
    for (const selection of [{ orbitId: data.id }, { orbitId: data.id, segmentId: 'stage:first' }]) {
      visuals.setSelection(selection);
      expect(visuals.highlightVisible).toBe(true);
      expect(visuals.highlightedOrbitId).toBe(data.id);
      expect(visuals.highlight.geometry).toBe(visuals.highlightHalo.geometry);
      expect(visuals.highlight.geometry.instanceCount).toBe(ORBIT_HIGHLIGHT_SEGMENTS);
      expect(visuals.highlight.geometry.drawRange).toEqual({ start: 6, count: 6 });
      for (let segment = 0; segment < ORBIT_HIGHLIGHT_SEGMENTS; segment++) {
        const start = highlightPoint(visuals, segment), end = highlightPoint(visuals, segment, true);
        const expected = orbitPoint(6, plane.anchorAngle + segment / ORBIT_HIGHLIGHT_SEGMENTS * Math.PI * 2,
          8, center, 60, new Vector3());
        expect(start.distanceTo(expected)).toBeLessThan(0.00001);
        expect(start.distanceTo(center)).toBeCloseTo(plane.radius * 60, 5);
        expect(end).toEqual(highlightPoint(visuals, (segment + 1) % ORBIT_HIGHLIGHT_SEGMENTS));
      }
      expect(highlightPoint(visuals, 0)).toEqual(position(visuals.anchors.geometry, 0));
      const anchor = new Vector3();
      visuals.getAnchor(selection, anchor);
      expect(position(visuals.selectedAnchor.geometry, 0).distanceTo(anchor)).toBeLessThan(0.00001);
      expect(position(visuals.detailTethers.geometry, 0).distanceTo(anchor)).toBeLessThan(0.00001);
      expect(visuals.tetherTargetIds).toEqual(selection.segmentId
        ? ['mission:hub', 'checkpoint:done', 'checkpoint:now']
        : ['mission:hub', 'checkpoint:done', 'checkpoint:now', 'checkpoint:later']);
      expect(visuals.paths.geometry.getAttribute('position').array).toEqual(paths);
      expect(visuals.paths.geometry.getAttribute('color').array).toEqual(colors);
    }
    expect(visuals.highlight.material.linewidth).toBe(ORBIT_HIGHLIGHT_WIDTH);
    expect(visuals.highlightHalo.material.linewidth).toBe(ORBIT_HIGHLIGHT_HALO_WIDTH);
    expect(visuals.highlightHalo.material.fragmentShader).toContain('exp(-3.5 * across * across)');
    expect(visuals.highlight.material.worldUnits).toBe(false);
    expect(visuals.highlight.material.vertexShader).toContain('offset *= linewidth;');
    expect(visuals.highlight.material.color).toEqual(new Color(data.color).multiplyScalar(1.5));
    expect(visuals.paths.renderOrder).toBeGreaterThan(visuals.highlight.renderOrder);
    expect(visuals.highlight.renderOrder).toBeLessThan(2); // Actual work markers render at order 2.
    expect(JSON.stringify(data)).toBe(beforeData);
    expect(JSON.stringify([...actual])).toBe(beforeNodes);
    expect(view.matrixWorld).toEqual(beforeCamera);
    visuals.dispose();
  });

  it.each(['active', 'background', 'planned'] as const)('keeps %s highlight geometry and flat dot attachment on the same ripple policy', missionMode => {
    const visuals = new CareerOrbitVisuals(), field = new CareerRippleField(), view = camera();
    const data = { ...orbit(4), missionMode, color: MISSION_COLORS.blueprint };
    const center = new Vector3(8, 3, -4), quiet = missionMode !== 'active';
    visuals.setRippleField(field);
    visuals.setData([data], nodes(), center, 60);
    visuals.setSelection({ orbitId: data.id });
    const initial = highlightPoint(visuals, 0);
    visuals.update(view, 8);
    const baseline = highlightPoint(visuals, 0);
    expect(baseline.equals(initial)).toBe(quiet);
    field.source.copy(center);
    field.setWave(baseline.distanceTo(center), 24, 2.4);
    field.updateCamera(view);
    visuals.update(view, 0);
    const displayed = new Vector3();
    visuals.getDisplayedAnchor({ orbitId: data.id }, displayed);
    const gpuEquivalent = baseline.clone().lerp(field.deformWorld(baseline, new Vector3()), quiet ? 0 : 1);
    expect(gpuEquivalent.distanceTo(displayed)).toBeLessThan(0.00001);
    expect(displayedPosition(visuals.selectedAnchor.geometry, 0, field).distanceTo(displayed)).toBeLessThan(0.00001);
    expect(highlightPoint(visuals, 0)).toEqual(baseline);
    for (const material of [visuals.highlight.material, visuals.highlightHalo.material]) {
      expect(material.uniforms.uRippleWeight.value).toBe(quiet ? 0 : 1);
      expect(material.uniforms.uRippleAmplitude).toBe(field.uniforms.uRippleAmplitude);
      expect(material.vertexShader).toContain('start = mix(start, rippleView(start), uRippleWeight);');
      expect(material.vertexShader).toContain('end = mix(end, rippleView(end), uRippleWeight);');
      expect(material.color).toEqual(new Color(data.color).multiplyScalar(1.5));
      expect(material.depthWrite).toBe(false);
    }
    visuals.setRimOnly(true);
    visuals.update(view, 0);
    for (const material of [visuals.highlight.material, visuals.highlightHalo.material]) {
      expect(material.uniforms.uRimOnly.value).toBe(1);
      expect(material.uniforms.uRadius.value).toBe(60);
      expect(material.uniforms.uCenterView.value).toEqual(center.clone().applyMatrix4(view.matrixWorldInverse));
      expect(material.fragmentShader).toContain('alpha * rimVisibility()');
      expect(material.vertexShader).toContain('clip.xy - (projectionMatrix * mvPosition).xy');
    }
    visuals.setMotionAllowed(false);
    field.cancel();
    visuals.update(view, 0);
    expect(visuals.highlightVisible).toBe(true);
    expect(highlightPoint(visuals, 0)).toEqual(baseline);
    visuals.setRimOnly(false);
    expect(visuals.highlight.material.uniforms.uRimOnly.value).toBe(0);
    visuals.dispose();
  });

  it('reuses one highlight buffer through switches, live modes, filtered order, visibility and pause, and clears stale identities', () => {
    const visuals = new CareerOrbitVisuals(), first = orbit(2), second = orbit(8), actual = nodes(), view = camera();
    const geometry = visuals.highlight.geometry;
    const starts = geometry.getAttribute('instanceStart'), ends = geometry.getAttribute('instanceEnd');
    const dispose = vi.spyOn(geometry, 'dispose');
    const center = new Vector3(8, 3, -4);
    visuals.setData([first, second], actual, center, 60);
    expect(visuals.highlightVisible).toBe(false);
    expect(geometry.instanceCount).toBe(0);
    visuals.setSelection({ orbitId: first.id });
    visuals.update(view, 8);
    const firstPoint = highlightPoint(visuals, 0);
    visuals.setSelection({ orbitId: second.id, segmentId: 'stage:second' });
    expect(visuals.highlightedOrbitId).toBe(second.id);
    expect(highlightPoint(visuals, 0)).not.toEqual(firstPoint);
    visuals.setData([second], actual, center, 60);
    expect(visuals.animationTime).toBe(8);
    expect(highlightPoint(visuals, 0).distanceTo(orbitPoint(8, CAREER_ORBIT_PLANES[8].anchorAngle,
      8, center, 60, new Vector3()))).toBeLessThan(0.00001);
    second.missionMode = 'background';
    visuals.setData([second, first], actual, center, 60);
    expect(highlightPoint(visuals, 0).distanceTo(center) / 60).toBeCloseTo(0.56);
    const quiet = highlightPoint(visuals, 0);
    visuals.update(view, 30);
    expect(highlightPoint(visuals, 0)).toEqual(quiet);
    visuals.setVisible(false);
    expect(visuals.highlightVisible).toBe(false);
    visuals.setVisible(true);
    expect(visuals.highlightVisible).toBe(true);
    expect(highlightPoint(visuals, 0)).toEqual(quiet);
    visuals.setData([first], actual, center, 60);
    expect(visuals.highlightVisible).toBe(false);
    expect(visuals.highlightedOrbitId).toBeNull();
    expect(geometry.instanceCount).toBe(0);
    visuals.setSelection({ orbitId: first.id });
    expect(visuals.highlightedOrbitId).toBe(first.id);
    visuals.setSelection(null);
    expect(visuals.highlightVisible).toBe(false);
    expect(visuals.highlightedOrbitId).toBeNull();
    expect(visuals.paths.renderOrder).toBe(-1);
    expect(geometry.instanceCount).toBe(0);
    expect(geometry.getAttribute('instanceStart')).toBe(starts);
    expect(geometry.getAttribute('instanceEnd')).toBe(ends);
    expect(visuals.highlightHalo.geometry).toBe(geometry);
    expect(dispose).not.toHaveBeenCalled();
    visuals.dispose();
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('leaves unselected calm focus unchanged and gives an explicit selection the same quiet full-circle policy', () => {
    const visuals = new CareerOrbitVisuals(true), data = { ...orbit(3), missionMode: 'background' as const, color: MISSION_COLORS.fabric };
    visuals.setData([data], nodes(), new Vector3(), 60);
    visuals.update(camera(), 10);
    expect(visuals.highlightVisible).toBe(false);
    expect(visuals.paths.renderOrder).toBe(-1);
    expect(visuals.paths.material.uniforms.uOpacity.value).toBe(0.38);
    visuals.setSelection({ orbitId: data.id, segmentId: 'stage:first' });
    const before = highlightPoint(visuals, 0);
    visuals.update(camera(), 10);
    expect(visuals.highlight.geometry.instanceCount).toBe(ORBIT_HIGHLIGHT_SEGMENTS);
    expect(highlightPoint(visuals, 0)).toEqual(before);
    expect(visuals.highlight.material.uniforms.uRippleWeight.value).toBe(0);
    visuals.dispose();
  });

  it('disposes geometries and shared materials exactly once, safely after pause or repeated cleanup', () => {
    const visuals = new CareerOrbitVisuals();
    visuals.setData([orbit()], nodes(), new Vector3(), 60);
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<import('three').Material>();
    visuals.object.traverse(item => {
      if (!(item instanceof LineSegments || item instanceof Points || item instanceof LineSegments2)) return;
      geometries.add(item.geometry);
      for (const material of Array.isArray(item.material) ? item.material : [item.material]) materials.add(material);
    });
    const disposals = [...geometries, ...materials].map(item => vi.spyOn(item, 'dispose'));
    visuals.dispose();
    visuals.dispose();
    visuals.update(camera(), 1);
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledOnce();
    expect(visuals.object.children).toHaveLength(0);
    expect(visuals.tetherCount).toBe(0);
    expect(visuals.highlightVisible).toBe(false);
    expect(visuals.highlightedOrbitId).toBeNull();
  });
});

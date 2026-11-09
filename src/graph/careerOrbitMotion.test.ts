import { describe, expect, it } from 'vitest';
import { Euler, PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { CAREER_ORBIT_PLANES, careerOrbitFrameRadius, careerOrbitMotion, orbitPoint } from './careerOrbitMotion';

describe('saved mission orbit motion policy', () => {
  it('moves only active missions and collections farther outside the data, without changing their planes', () => {
    for (const index of [0, 4, 8, 14]) {
      for (const identity of [{ kind: 'mission' as const, missionMode: 'active' as const }, { kind: 'evidence' as const }]) {
        const motion = careerOrbitMotion({ ...identity, index });
        expect(motion).toEqual({
          quiet: false, revolving: true, normalizedRadius: CAREER_ORBIT_PLANES[index].radius, radiusScale: 1, rippleWeight: 1,
        });
        const oldRadius = 1.06 + index / 15 * 0.13;
        expect(motion.normalizedRadius - 1).toBeGreaterThan((oldRadius - 1) * 2.5);
        const rotation = new Quaternion().setFromEuler(new Euler(0.28 + index * 0.213, index * 0.41, -0.6 + index * 0.19));
        expect(CAREER_ORBIT_PLANES[index].x).toEqual(new Vector3(1, 0, 0).applyQuaternion(rotation));
        expect(CAREER_ORBIT_PLANES[index].y).toEqual(new Vector3(0, 1, 0).applyQuaternion(rotation));
        const angle = CAREER_ORBIT_PLANES[index].anchorAngle, center = new Vector3(8, 3, -4);
        expect(orbitPoint(index, angle, 12, center, 60, new Vector3(), 0.012, true, motion))
          .toEqual(orbitPoint(index, angle, 12, center, 60, new Vector3(), 0.012, true));
      }
    }
  });

  it.each([0.4, 1, 1.8])('fits all outer member tracks and ripple clearance at aspect %s, including offset-core focus', aspect => {
    const center = new Vector3(12, -9, 5), core = new Vector3(-4, 3, 2), dataRadius = 125;
    for (const target of [center, core]) {
      const camera = new PerspectiveCamera(46, aspect, 0.1, 3000);
      const fov = Math.min(23 * Math.PI / 180, Math.atan(Math.tan(23 * Math.PI / 180) * aspect));
      camera.position.copy(target).addScaledVector(new Vector3(0.58, 0.32, 1).normalize(),
        careerOrbitFrameRadius(dataRadius, target.distanceTo(center)) / Math.sin(fov));
      camera.lookAt(target);
      camera.updateMatrixWorld();
      for (let index = 0; index < CAREER_ORBIT_PLANES.length; index++) for (let step = 0; step < 90; step++) {
        const point = orbitPoint(index, step / 90 * Math.PI * 2, 7, center, dataRadius, new Vector3(), 0.012);
        point.addScaledVector(point.clone().sub(center).normalize(), dataRadius * 0.04).project(camera);
        expect(Math.max(Math.abs(point.x), Math.abs(point.y))).toBeLessThan(0.94);
      }
    }
  });

  it.each(['background', 'planned', undefined] as const)('treats %s mission mode as quiet, with stable distinct inner spacing', missionMode => {
    const radii = [];
    for (let index = 0; index < CAREER_ORBIT_PLANES.length; index++) {
      const motion = careerOrbitMotion({ kind: 'mission', missionMode, index });
      const center = new Vector3(8, 3, -4);
      const initial = orbitPoint(index, 0.7, 0, center, 60, new Vector3(), 0, false, motion);
      for (const calm of [false, true]) {
        expect(orbitPoint(index, 0.7, 100, center, 60, new Vector3(), 0, calm, motion)).toEqual(initial);
      }
      expect(motion).toMatchObject({ quiet: true, revolving: false, rippleWeight: 0 });
      expect(initial.distanceTo(center) / 60).toBeCloseTo(motion.normalizedRadius);
      expect(motion.normalizedRadius).toBeGreaterThanOrEqual(0.45);
      expect(motion.normalizedRadius).toBeLessThanOrEqual(0.65);
      radii.push(motion.normalizedRadius);
    }
    expect(new Set(radii).size).toBe(CAREER_ORBIT_PLANES.length);
  });
});

import { Euler, Quaternion, Vector3 } from 'three';
import type { CareerOrbit } from './careerOrbitTypes';
import { missionIds } from '../domain/types';

function seededRandom(seed: number): () => number {
  return () => {
    seed = Math.imul(seed ^ seed >>> 15, 1 | seed);
    seed ^= seed + Math.imul(seed ^ seed >>> 7, 61 | seed);
    return ((seed ^ seed >>> 14) >>> 0) / 4294967296;
  };
}

const pick = seededRandom(0x52494e47);
const faster = Math.floor(pick() * 15);
const fastest = (faster + 1 + Math.floor(pick() * 14)) % 15;
const speedRandom = seededRandom(0x43485131);

/** Fixed identity, independent of filtered array order or current membership. */
export const CAREER_ORBIT_PLANES = Array.from({ length: missionIds.length + 6 }, (_, index) => {
  const rotation = new Quaternion().setFromEuler(new Euler(0.28 + index * 0.213, index * 0.41, -0.6 + index * 0.19));
  const multiplier = index === faster ? 1.5 : index === fastest ? 2 : 1;
  // Retain each original ring's first speed, consuming the old four-arc seed.
  const original = Array.from({ length: 4 }, (_, arc) =>
    (0.028 + speedRandom() * 0.085) * ((index + arc) % 3 === 0 ? -1 : 1));
  return {
    x: new Vector3(1, 0, 0).applyQuaternion(rotation),
    y: new Vector3(0, 1, 0).applyQuaternion(rotation),
    radius: 1.3 + index / 15 * 0.18,
    speed: original[0] * multiplier,
    multiplier,
    anchorAngle: index * 2.399963229728653,
  };
});

/** Includes the raised member track and the largest permitted heartbeat displacement. */
export const CAREER_ORBIT_SHELL_RADIUS = Math.max(...CAREER_ORBIT_PLANES.map(plane => plane.radius)) + 0.012 + 0.04;

export function careerOrbitFrameRadius(dataRadius: number, centerOffset = 0): number {
  return (dataRadius * CAREER_ORBIT_SHELL_RADIUS + centerOffset) * 1.08;
}

export interface CareerOrbitMotion {
  quiet: boolean;
  revolving: boolean;
  normalizedRadius: number;
  radiusScale: number;
  rippleWeight: number;
}

/** Saved mission mode alone controls presentation; collections keep their original motion. */
export function careerOrbitMotion(orbit: Pick<CareerOrbit, 'kind' | 'missionMode' | 'index'>): CareerOrbitMotion {
  const quiet = orbit.kind === 'mission' && orbit.missionMode !== 'active';
  const radius = CAREER_ORBIT_PLANES[orbit.index].radius;
  const normalizedRadius = quiet ? 0.48 + orbit.index * 0.01 : radius;
  return { quiet, revolving: !quiet, normalizedRadius, radiusScale: normalizedRadius / radius, rippleWeight: quiet ? 0 : 1 };
}

export function orbitRotation(index: number, time: number, calm = false, revolving = true): number {
  return revolving ? time * CAREER_ORBIT_PLANES[index].speed * (calm ? 0.4 : 1) : 0;
}

export function orbitPoint(
  index: number, angle: number, time: number, center: Vector3, radius: number,
  target: Vector3, offset = 0, calm = false, motion?: CareerOrbitMotion,
): Vector3 {
  const plane = CAREER_ORBIT_PLANES[index];
  const phase = angle + orbitRotation(index, time, calm, motion?.revolving);
  const distance = radius * (plane.radius + offset) * (motion?.radiusScale ?? 1);
  return target.copy(center)
    .addScaledVector(plane.x, Math.cos(phase) * distance)
    .addScaledVector(plane.y, Math.sin(phase) * distance);
}

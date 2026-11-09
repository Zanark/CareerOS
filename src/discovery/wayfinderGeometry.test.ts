import { describe, expect, it } from 'vitest';
import { Box3, Mesh, MeshBasicMaterial } from 'three';
import { createWayfinderDiorama, createWayfinderModel, disposeWayfinderModel } from './wayfinderGeometry';

describe('original PS1 Wayfinder geometry', () => {
  it('builds seven different real dioramas inside the same combined geometry and draw-call budget', () => {
    const material = new MeshBasicMaterial({ vertexColors: true });
    const shapes = new Set<string>();
    for (let level = 1; level <= 7; level++) {
      const world = createWayfinderDiorama(level, material);
      const model = createWayfinderModel(level, material);
      let triangles = world.geometry.getAttribute('position').count / 3;
      model.traverse(child => { if (child instanceof Mesh) triangles += child.geometry.getAttribute('position').count / 3; });
      expect(triangles).toBeLessThan(1600);
      expect(model.children.length + 1).toBeLessThanOrEqual(8);
      const positions = Array.from(world.geometry.getAttribute('position').array);
      expect(positions.every(Number.isFinite)).toBe(true);
      shapes.add(positions.join(','));
      const bounds = new Box3().setFromObject(world);
      expect(bounds.max.y - bounds.min.y).toBeGreaterThan(1);
      expect(Math.max(Math.abs(bounds.min.x), bounds.max.x, Math.abs(bounds.min.z), bounds.max.z)).toBeLessThan(3);
      world.geometry.dispose();
      disposeWayfinderModel(model);
    }
    expect(shapes.size).toBe(7);
    material.dispose();
  });

  it('adds every earned equipment bundle without replacing the base or exceeding the render budget', () => {
    const material = new MeshBasicMaterial({ vertexColors: true });
    let previousNames: string[] = [];
    let base: number[] | undefined;
    for (let level = 1; level <= 7; level++) {
      const model = createWayfinderModel(level, material);
      const names = model.children.map(child => child.name);
      expect(names.slice(0, previousNames.length)).toEqual(previousNames);
      expect(names).toHaveLength(level);
      let triangles = 0;
      model.traverse(child => {
        expect(child instanceof Mesh || child === model).toBe(true);
        if (!(child instanceof Mesh)) return;
        const positions = child.geometry.getAttribute('position');
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
        expect(child.geometry.getAttribute('color').count).toBe(positions.count);
        expect(child.material).toBe(material);
        triangles += positions.count / 3;
        if (child.name === 'harbor-traveler') {
          if (base) expect(Array.from(positions.array)).toEqual(base);
          else base = Array.from(positions.array);
        }
      });
      expect(triangles).toBeLessThan(1600);
      const bounds = new Box3().setFromObject(model);
      expect(bounds.min.y).toBeGreaterThanOrEqual(0);
      expect(bounds.max.y).toBeLessThan(2.5);
      previousNames = names;
      const disposed: string[] = [];
      for (const child of model.children) {
        if (child instanceof Mesh) child.geometry.addEventListener('dispose', () => disposed.push(child.name));
      }
      disposeWayfinderModel(model);
      expect(disposed).toEqual(names);
      expect(model.children).toHaveLength(0);
    }
    material.dispose();
  });

  it('rejects invalid levels instead of drawing an unearned or malformed outfit', () => {
    const material = new MeshBasicMaterial();
    for (const level of [-1, 0, 2.5, 8, NaN]) expect(() => createWayfinderModel(level, material)).toThrow('Invalid');
    material.dispose();
  });
});

import { describe, expect, it } from 'vitest';
import { missionIds } from './domain/types';
import { CHECKPOINT_COMPLETE_COLOR, COLLECTION_COLORS, MISSION_COLORS, missionAccentStyle, missionColor } from './missionVisuals';

describe('shared mission and ring identities', () => {
  it('assigns every mission and collection a different non-green identity', () => {
    const colors = [...Object.values(MISSION_COLORS), ...Object.values(COLLECTION_COLORS)];
    expect(colors).toHaveLength(missionIds.length + 6);
    expect(new Set(colors).size).toBe(missionIds.length + 6);
    expect(colors).not.toContain(CHECKPOINT_COMPLETE_COLOR);
    for (const color of colors) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/);
      const [red, green, blue] = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16));
      expect(green > red && green > blue, `${color} must not compete with completion green`).toBe(false);
    }
  });

  it('uses the identical mission hue for UI accents and ring projection', () => {
    for (const id of missionIds) {
      expect(missionColor(id)).toBe(MISSION_COLORS[id]);
      expect(missionAccentStyle(id)).toEqual({ '--accent': MISSION_COLORS[id] });
    }
    expect(Object.isFrozen(MISSION_COLORS)).toBe(true);
    expect(Object.isFrozen(COLLECTION_COLORS)).toBe(true);
  });
});

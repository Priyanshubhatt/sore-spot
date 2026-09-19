import { describe, expect, it } from 'vitest';
import { MUSCLES } from '../../engine';
import { SILHOUETTE, VIEWBOX, ZONES, mirrorPath, musclesInView, type BodySide } from './zones';

const SIDES: BodySide[] = ['front', 'back'];

describe('mirrorPath', () => {
  it('mirrors x across the centre line and keeps y', () => {
    expect(mirrorPath('M 10 20 L 30 40 Z')).toBe('M 190 20 L 170 40 Z');
  });

  it('handles curves and decimals, and mirroring twice gives the original', () => {
    const d = 'M 44 78.5 Q 44 64 58 64 Q 72 66 74 82 Z';
    expect(mirrorPath(d)).toBe('M 156 78.5 Q 156 64 142 64 Q 128 66 126 82 Z');
    expect(mirrorPath(mirrorPath(d))).toBe(d);
  });
});

describe('zones', () => {
  it('draws every one of the 12 muscles in at least one view', () => {
    const drawn = new Set(SIDES.flatMap((s) => musclesInView(s)));
    for (const m of MUSCLES) expect(drawn.has(m), m).toBe(true);
    expect(drawn.size).toBe(12);
  });

  it('has non-empty front and back views and a non-empty silhouette', () => {
    for (const s of SIDES) expect(musclesInView(s).length).toBeGreaterThan(0);
    expect(SILHOUETTE.length).toBeGreaterThan(0);
  });

  it('uses only absolute M, L, Q, C and Z commands, starting with M and closed with Z', () => {
    for (const s of SIDES) {
      for (const [muscle, paths] of Object.entries(ZONES[s])) {
        for (const d of paths ?? []) {
          expect(d, `${s}/${muscle}`).toMatch(/^M [MLQCZ\d\s.-]+ Z$/);
        }
      }
    }
  });

  it('keeps every coordinate inside the canvas', () => {
    for (const s of SIDES) {
      for (const [muscle, paths] of Object.entries(ZONES[s])) {
        for (const d of paths ?? []) {
          const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
          nums.forEach((n, i) => {
            const max = i % 2 === 0 ? VIEWBOX.width : VIEWBOX.height;
            expect(n, `${s}/${muscle}`).toBeGreaterThanOrEqual(0);
            expect(n, `${s}/${muscle}`).toBeLessThanOrEqual(max);
          });
        }
      }
    }
  });

  it('gives paired zones a left shape and a distinct mirrored right shape', () => {
    for (const s of SIDES) {
      for (const [muscle, paths] of Object.entries(ZONES[s])) {
        if (muscle === 'core' || muscle === 'upperBack') {
          expect(paths, `${s}/${muscle}`).toHaveLength(1);
        } else {
          expect(paths, `${s}/${muscle}`).toHaveLength(2);
          expect(mirrorPath(paths![0]), `${s}/${muscle}`).toBe(paths![1]);
        }
      }
    }
  });
});

import type { Muscle } from '../../engine';

export type BodySide = 'front' | 'back';

export const VIEWBOX = { width: 200, height: 420 } as const;

/**
 * Mirror an absolute-coordinate path across the vertical centre line (x -> 200 - x).
 * Only M, L, Q, C and Z with absolute coordinates are supported; the zones test enforces that.
 */
export function mirrorPath(d: string): string {
  const tokens = d.match(/[A-Za-z]|-?\d+(?:\.\d+)?/g) ?? [];
  const out: string[] = [];
  let isX = true;
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) {
      out.push(t);
      isX = true;
    } else {
      out.push(isX ? String(VIEWBOX.width - Number(t)) : t);
      isX = !isX;
    }
  }
  return out.join(' ');
}

/** A left-side shape plus its mirror image. */
const pair = (leftPath: string): string[] => [leftPath, mirrorPath(leftPath)];

export interface SilhouetteShape {
  d: string;
  kind: 'fill' | 'stroke';
  strokeWidth?: number;
}

// Neutral body outline, drawn under the zones. Not interactive.
export const SILHOUETTE: readonly SilhouetteShape[] = [
  { kind: 'fill', d: 'M 80 32 A 20 20 0 1 1 120 32 A 20 20 0 1 1 80 32 Z' },
  { kind: 'fill', d: 'M 90 50 L 110 50 L 110 66 L 90 66 Z' },
  { kind: 'fill', d: 'M 62 66 Q 100 56 138 66 L 134 178 Q 100 194 66 178 Z' },
  { kind: 'stroke', strokeWidth: 20, d: 'M 52 80 L 44 140 L 40 200' },
  { kind: 'stroke', strokeWidth: 20, d: 'M 148 80 L 156 140 L 160 200' },
  { kind: 'stroke', strokeWidth: 34, d: 'M 82 192 L 78 290 L 76 388' },
  { kind: 'stroke', strokeWidth: 34, d: 'M 118 192 L 122 290 L 124 388' },
];

// Zone shapes, hand-drawn on a 200x420 canvas. Each muscle can appear in either view.
const SHOULDER = 'M 44 78 Q 44 64 58 64 Q 72 66 74 82 Q 68 94 52 96 Q 44 90 44 78 Z';
const FOREARM = 'M 36 140 Q 46 136 56 140 L 50 198 Q 42 204 32 198 Q 32 166 36 140 Z';
const CALF = 'M 66 302 Q 82 296 90 306 Q 88 344 84 376 Q 74 382 66 374 Q 60 338 66 302 Z';

export const ZONES: Record<BodySide, Partial<Record<Muscle, string[]>>> = {
  front: {
    shoulders: pair(SHOULDER),
    chest: pair('M 76 78 Q 98 72 99 80 L 99 108 Q 84 118 72 106 Q 68 92 76 78 Z'),
    biceps: pair('M 42 98 Q 52 96 58 100 L 56 132 Q 46 136 40 132 Q 38 114 42 98 Z'),
    forearms: pair(FOREARM),
    core: ['M 76 116 Q 100 124 124 116 L 122 170 Q 100 180 78 170 Z'],
    adductors: pair('M 92 198 L 99 198 L 99 252 Q 94 264 88 254 Q 86 224 92 198 Z'),
    quads: pair('M 66 192 Q 82 186 90 198 Q 86 232 86 264 Q 80 286 68 288 Q 60 242 66 192 Z'),
    calves: pair(CALF),
  },
  back: {
    shoulders: pair(SHOULDER),
    upperBack: ['M 74 68 Q 100 60 126 68 L 132 104 Q 124 134 100 138 Q 76 134 68 104 Z'],
    triceps: pair('M 42 98 Q 52 96 58 100 L 56 132 Q 46 136 40 132 Q 38 114 42 98 Z'),
    forearms: pair(FOREARM),
    glutes: pair('M 68 178 Q 90 172 99 182 L 99 216 Q 82 228 70 210 Q 62 194 68 178 Z'),
    hamstrings: pair('M 66 222 Q 84 218 92 228 L 90 282 Q 78 294 68 288 Q 60 252 66 222 Z'),
    calves: pair(CALF),
  },
};

/** The muscles drawn in a view, in a stable order. */
export function musclesInView(side: BodySide): Muscle[] {
  return Object.keys(ZONES[side]) as Muscle[];
}

/** Whether a muscle has a zone drawn in this view. */
export function hasMuscle(side: BodySide, muscle: Muscle): boolean {
  return Object.prototype.hasOwnProperty.call(ZONES[side], muscle);
}

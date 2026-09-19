import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseReplay } from '../engine/replay';
import { loadReplay } from './index';
import { syntheticReplay } from './replay.synthetic';

describe('loadReplay', () => {
  it.skipIf(existsSync(join(__dirname, 'replay.json')))(
    'falls back to the labeled synthetic replay when there is no local export',
    () => {
      expect(loadReplay()).toEqual(parseReplay(syntheticReplay));
      expect(loadReplay().synthetic).toBe(true);
    },
  );

  it('always returns a validated replay with an explicit synthetic flag', () => {
    const r = loadReplay();
    expect(typeof r.synthetic).toBe('boolean');
    expect(() => parseReplay(r)).not.toThrow();
    expect(r.workouts.length).toBeGreaterThan(0);
  });
});

import { parseReplay } from '../engine/replay';
import type { ReplayFile } from '../engine/types';
import { syntheticReplay } from './replay.synthetic';

/** The real export is optional and gitignored. Metro treats a require inside try/catch as optional. */
function readLocalExport(): unknown {
  try {
    return require('./replay.json');
  } catch {
    return null;
  }
}

export function loadReplay(): ReplayFile {
  return parseReplay(readLocalExport() ?? syntheticReplay);
}

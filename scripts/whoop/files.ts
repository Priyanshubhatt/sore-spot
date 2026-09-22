import { chmodSync, writeFileSync } from 'node:fs';

/**
 * Writes a file only its owner can read (where the system supports it): mode 600 on creation, and
 * again afterwards in case the file already existed with wider permissions. Used for the token file
 * and the health data.
 */
export function writePrivate(path: string, text: string): void {
  writeFileSync(path, text, { mode: 0o600 });
  chmodSync(path, 0o600);
}

import { describe, expect, it } from 'vitest';
import type { Tokens } from './auth';
import { loadTokens, saveTokens, type TokenFile } from './tokenStore';

const memory = (initial: string | null = null): TokenFile & { text: string | null } => {
  const f = {
    text: initial,
    read: () => f.text,
    write: (t: string) => {
      f.text = t;
    },
  };
  return f;
};

const tokens: Tokens = { access_token: 'acc', refresh_token: 'ref', expires_at: 1_800_000_000_000, scope: 'offline', token_type: 'bearer' };

describe('token storage', () => {
  it('saves and loads the same tokens', () => {
    const file = memory();
    saveTokens(file, tokens);
    expect(loadTokens(file)).toEqual(tokens);
  });

  it('loads nothing when there is no file', () => {
    expect(loadTokens(memory(null))).toBeNull();
  });

  it('treats a file that is not valid tokens as no sign-in, so the script signs in again', () => {
    for (const bad of ['not json', '{}', '{"access_token":1}', '{"access_token":"a"}', 'null']) {
      expect(loadTokens(memory(bad)), bad).toBeNull();
    }
  });

  it('copes with a save that has no refresh token', () => {
    const file = memory();
    saveTokens(file, { ...tokens, refresh_token: undefined });
    expect(loadTokens(file)?.refresh_token).toBeUndefined();
  });
});

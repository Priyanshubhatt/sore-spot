import type { Tokens } from './auth';

export interface TokenFile {
  read(): string | null;
  write(text: string): void;
}

/** The saved tokens, or null when there is no usable file (missing, unreadable or not in the expected shape). */
export function loadTokens(file: TokenFile): Tokens | null {
  const text = file.read();
  if (text === null) return null;
  try {
    const o = JSON.parse(text) as Record<string, unknown>;
    if (typeof o.access_token !== 'string' || typeof o.expires_at !== 'number') return null;
    return {
      access_token: o.access_token,
      refresh_token: typeof o.refresh_token === 'string' ? o.refresh_token : undefined,
      expires_at: o.expires_at,
      scope: typeof o.scope === 'string' ? o.scope : '',
      token_type: typeof o.token_type === 'string' ? o.token_type : 'bearer',
    };
  } catch {
    return null;
  }
}

export function saveTokens(file: TokenFile, tokens: Tokens): void {
  file.write(JSON.stringify(tokens, null, 2));
}

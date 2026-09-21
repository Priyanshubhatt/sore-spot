export const REQUIRED_VARS = ['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET', 'WHOOP_REDIRECT_URI'] as const;

export interface WhoopEnv {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** A tiny .env reader: KEY=VALUE lines, blank lines and # comments ignored, one pair of quotes stripped. */
export function parseEnvFile(text: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

/** Names the missing variables and never echoes a value, so an error can be pasted anywhere. */
export function readWhoopEnv(vars: Record<string, string | undefined>): WhoopEnv {
  const missing = REQUIRED_VARS.filter((name) => !vars[name]?.trim());
  if (missing.length > 0) {
    throw new Error(`Missing in .env: ${missing.join(', ')}. Add each as NAME=value on its own line.`);
  }
  return {
    clientId: vars.WHOOP_CLIENT_ID!.trim(),
    clientSecret: vars.WHOOP_CLIENT_SECRET!.trim(),
    redirectUri: vars.WHOOP_REDIRECT_URI!.trim(),
  };
}

/** The local address the sign-in redirect comes back to. Only http://localhost is accepted. */
export function callbackTarget(redirectUri: string): { port: number; path: string } {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new Error('WHOOP_REDIRECT_URI is not a valid URL. Use the one you registered, for example http://localhost:3000/callback');
  }
  if (url.protocol !== 'http:' || (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')) {
    throw new Error('WHOOP_REDIRECT_URI must be an http://localhost address for this script to catch the sign-in redirect.');
  }
  const port = url.port === '' ? 80 : Number(url.port);
  return { port, path: url.pathname };
}

/** Removes every secret from text before it is printed or put in an error. */
export function redact(text: string, secrets: readonly string[]): string {
  let out = text;
  for (const secret of secrets) {
    if (secret.length >= 4) out = out.split(secret).join('[redacted]');
  }
  return out;
}

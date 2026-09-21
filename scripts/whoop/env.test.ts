import { describe, expect, it } from 'vitest';
import { REQUIRED_VARS, callbackTarget, parseEnvFile, readWhoopEnv, redact } from './env';

describe('parseEnvFile', () => {
  it('reads NAME=value lines, ignoring blanks and comments, on Windows or Unix line endings', () => {
    const text = '# WHOOP\r\nWHOOP_CLIENT_ID=abc\r\n\r\nWHOOP_CLIENT_SECRET=def\nWHOOP_REDIRECT_URI=http://localhost:3000/callback\n';
    expect(parseEnvFile(text)).toEqual({
      WHOOP_CLIENT_ID: 'abc',
      WHOOP_CLIENT_SECRET: 'def',
      WHOOP_REDIRECT_URI: 'http://localhost:3000/callback',
    });
  });

  it('keeps an = inside a value, trims spaces and strips one pair of quotes', () => {
    expect(parseEnvFile('A = "x=y" \nB=\'z\'\nC=plain')).toEqual({ A: 'x=y', B: 'z', C: 'plain' });
  });

  it('skips lines with no name', () => {
    expect(parseEnvFile('=novalue\njust text\n')).toEqual({});
  });
});

describe('readWhoopEnv', () => {
  const full = { WHOOP_CLIENT_ID: ' id ', WHOOP_CLIENT_SECRET: 'secret', WHOOP_REDIRECT_URI: 'http://localhost:3000/callback' };

  it('returns the three values, trimmed', () => {
    expect(readWhoopEnv(full)).toEqual({ clientId: 'id', clientSecret: 'secret', redirectUri: 'http://localhost:3000/callback' });
  });

  it('names every missing variable and never echoes a value', () => {
    let message = '';
    try {
      readWhoopEnv({ WHOOP_CLIENT_ID: 'super-private-id', WHOOP_CLIENT_SECRET: '   ' });
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toContain('WHOOP_CLIENT_SECRET');
    expect(message).toContain('WHOOP_REDIRECT_URI');
    expect(message).not.toContain('WHOOP_CLIENT_ID,');
    expect(message).not.toContain('super-private-id');
  });

  it('requires exactly the three names the README tells the user to set', () => {
    expect([...REQUIRED_VARS]).toEqual(['WHOOP_CLIENT_ID', 'WHOOP_CLIENT_SECRET', 'WHOOP_REDIRECT_URI']);
  });
});

describe('callbackTarget', () => {
  it('reads the port and path of a localhost redirect', () => {
    expect(callbackTarget('http://localhost:3000/callback')).toEqual({ host: 'localhost', port: 3000, path: '/callback' });
    expect(callbackTarget('http://127.0.0.1:8123/cb')).toEqual({ host: '127.0.0.1', port: 8123, path: '/cb' });
  });

  it('refuses a redirect the script could not catch', () => {
    expect(() => callbackTarget('https://example.com/callback')).toThrow(/http:\/\/localhost/);
    expect(() => callbackTarget('http://example.com:3000/callback')).toThrow(/http:\/\/localhost/);
    expect(() => callbackTarget('not a url')).toThrow(/not a valid URL/);
  });
});

describe('redact', () => {
  it('removes every occurrence of every secret', () => {
    expect(redact('a SECRET1234 b SECRET1234 c tok-abcdef', ['SECRET1234', 'tok-abcdef'])).toBe('a [redacted] b [redacted] c [redacted]');
  });

  it('also removes a secret that was URL-encoded, form-encoded or JSON-escaped in an echoed request', () => {
    const secret = 'p@ss word/+"x';
    const echoed = [encodeURIComponent(secret), encodeURIComponent(secret).replace(/%20/g, '+'), JSON.stringify(secret).slice(1, -1)].join(' | ');
    const out = redact(`echo: ${secret} | ${echoed}`, [secret]);
    expect(out).not.toContain('word');
    expect(out).not.toContain('%40');
    expect(out.match(/\[redacted\]/g)).toHaveLength(4);
  });

  it('ignores empty or very short secrets, so it never blanks ordinary text', () => {
    expect(redact('hello world', ['', 'lo'])).toBe('hello world');
  });
});

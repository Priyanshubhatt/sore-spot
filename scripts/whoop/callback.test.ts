import { networkInterfaces } from 'node:os';
import { connect, createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { waitForCallback } from './callback';
import { failure, freePort, hit } from './fakes';

const STATE = 'abcd1234abcd1234';
const hasIpv6Loopback = () => Object.values(networkInterfaces()).some((list) => list?.some((a) => a.address === '::1'));
const options = (port: number, timeoutMs = 5000) => ({ port, path: '/callback', expectedState: STATE, timeoutMs });

describe('waitForCallback', () => {
  it('resolves with the code when the redirect brings the right state, and tells the browser to close the tab', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    const page = await hit(`http://localhost:${port}/callback?code=the-code&state=${STATE}`);
    expect(await code).toBe('the-code');
    expect(page.status).toBe(200);
    expect(page.text).toMatch(/close this tab/);
  });

  it('ignores other paths, such as a browser asking for a favicon, and keeps waiting', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    expect((await hit(`http://localhost:${port}/favicon.ico`)).status).toBe(404);
    await hit(`http://localhost:${port}/callback?code=c2&state=${STATE}`);
    expect(await code).toBe('c2');
  });

  it('ignores a redirect with a different or missing state and keeps waiting, so a stray page cannot end or hijack the sign-in', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    const wrong = await hit(`http://localhost:${port}/callback?code=evil&state=WRONGSTATE`);
    const none = await hit(`http://localhost:${port}/callback?code=evil`);
    expect([wrong.status, none.status]).toEqual([400, 400]);
    expect(wrong.text).toMatch(/did not match/);
    // Still waiting: the real redirect that follows is the one that counts.
    await hit(`http://localhost:${port}/callback?code=the-real-code&state=${STATE}`);
    expect(await code).toBe('the-real-code');
  });

  it('cannot be cancelled by a stray denial that lacks the state', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    await hit(`http://localhost:${port}/callback?error=access_denied`);
    await hit(`http://localhost:${port}/callback?code=ok&state=${STATE}`);
    expect(await code).toBe('ok');
  });

  it('rejects when WHOOP reports that the sign-in was denied (with the right state)', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    await hit(`http://localhost:${port}/callback?error=access_denied&state=${STATE}`);
    expect((await result).message).toMatch(/access_denied/);
  });

  it('prints only a short, plain reason from a denial, never control codes or long text', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    const hostile = encodeURIComponent('\u001b[31mBAD\u001b[0m' + 'x'.repeat(200));
    await hit(`http://localhost:${port}/callback?error=${hostile}&state=${STATE}`);
    const message = (await result).message;
    expect(message).not.toMatch(/[\u0000-\u001f]/);
    expect(message.length).toBeLessThan(120);
  });

  it('never puts anything from the request into the page it returns', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    const script = encodeURIComponent('<script>alert(1)</script>');
    const page = await hit(`http://localhost:${port}/callback?code=${script}&state=${STATE}`);
    await code;
    expect(page.text).not.toContain('script');
    expect(page.text).not.toContain('alert');
  });

  it('answers a malformed request target with 400 and carries on', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    await hit(`http://localhost:${port}/`); // make sure the server is up
    const raw = await new Promise<string>((resolve, reject) => {
      const socket = connect(port, 'localhost', () => socket.write('GET //[ HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n'));
      let data = '';
      socket.on('data', (d) => (data += d));
      socket.on('end', () => resolve(data));
      socket.on('error', reject);
    });
    expect(raw).toMatch(/^HTTP\/1\.1 400/);
    await hit(`http://localhost:${port}/callback?code=fine&state=${STATE}`);
    expect(await code).toBe('fine');
  });

  it('settles once: two redirects at the same moment give the first code and no crash', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    await hit(`http://localhost:${port}/`);
    const first = hit(`http://localhost:${port}/callback?code=c1&state=${STATE}`);
    const second = hit(`http://localhost:${port}/callback?code=c2&state=${STATE}`, 2).catch(() => null);
    await Promise.all([first, second]);
    expect(['c1', 'c2']).toContain(await code);
  });

  it('binds the address the redirect names, so a 127.0.0.1 redirect is reachable at 127.0.0.1', async () => {
    const port = await freePort();
    const code = waitForCallback({ ...options(port), host: '127.0.0.1' });
    const page = await hit(`http://127.0.0.1:${port}/callback?code=v4&state=${STATE}`);
    expect(page.status).toBe(200);
    expect(await code).toBe('v4');
  });

  it('binds both loopback addresses for localhost, so a browser that resolves it to either one gets through', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    const v4 = await hit(`http://127.0.0.1:${port}/callback?code=wrong&state=NOPE0000`);
    expect(v4.status).toBe(400); // reached the server (and ignored, for the wrong state)
    if (hasIpv6Loopback()) {
      const v6 = await hit(`http://[::1]:${port}/callback?code=v6-code&state=${STATE}`);
      expect(v6.status).toBe(200);
      expect(await code).toBe('v6-code');
    } else {
      await hit(`http://127.0.0.1:${port}/callback?code=v4-code&state=${STATE}`);
      expect(await code).toBe('v4-code');
    }
  });

  it('frees both loopback addresses when it finishes', async () => {
    const port = await freePort();
    const code = waitForCallback(options(port));
    await hit(`http://127.0.0.1:${port}/callback?code=done&state=${STATE}`);
    await code;
    const hosts = hasIpv6Loopback() ? ['127.0.0.1', '::1'] : ['127.0.0.1'];
    for (const host of hosts) {
      await new Promise<void>((resolve, reject) => {
        const s = createServer();
        s.once('error', reject);
        s.listen({ port, host }, () => s.close(() => resolve()));
      });
    }
  });

  it('rejects a redirect that has the right state but no code', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    await hit(`http://localhost:${port}/callback?state=${STATE}`);
    expect((await result).message).toMatch(/no code/);
  });

  it('gives up after the timeout and frees the port', async () => {
    const port = await freePort();
    const err = await failure(waitForCallback(options(port, 150)));
    expect(err.message).toMatch(/No sign-in arrived/);
    // The port is free again on the same address the server used, so another server can take it.
    await new Promise<void>((resolve, reject) => {
      const s = createServer();
      s.once('error', reject);
      s.listen({ port, host: 'localhost' }, () => s.close(() => resolve()));
    });
  });

  it('explains a port that is already in use', async () => {
    const port = await freePort();
    const blocker = createServer();
    await new Promise<void>((resolve) => blocker.listen({ port, host: 'localhost' }, resolve));
    try {
      const err = await failure(waitForCallback(options(port)));
      expect(err.message).toMatch(new RegExp(`Port ${port} is already in use`));
    } finally {
      blocker.close();
    }
  });
});

import { createServer } from 'node:net';
import { describe, expect, it } from 'vitest';
import { waitForCallback } from './callback';
import { failure, freePort, hit } from './fakes';

const STATE = 'abcd1234abcd1234';
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

  it('rejects a redirect with a different state, so a forged or stale sign-in is not used', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    const page = await hit(`http://localhost:${port}/callback?code=evil&state=WRONGSTATE`);
    expect(page.status).toBe(400);
    expect((await result).message).toMatch(/different state/);
  });

  it('rejects a redirect with no state at all', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    await hit(`http://localhost:${port}/callback?code=evil`);
    expect((await result).message).toMatch(/different state/);
  });

  it('rejects when WHOOP reports that the sign-in was denied', async () => {
    const port = await freePort();
    const result = failure(waitForCallback(options(port)));
    await hit(`http://localhost:${port}/callback?error=access_denied&state=${STATE}`);
    expect((await result).message).toMatch(/access_denied/);
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
    // The port is free again, so another server can take it.
    await new Promise<void>((resolve, reject) => {
      const s = createServer();
      s.once('error', reject);
      s.listen(port, () => s.close(() => resolve()));
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

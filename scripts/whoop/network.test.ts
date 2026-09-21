import { describe, expect, it } from 'vitest';
import { explainNetworkError } from './network';

describe('explainNetworkError', () => {
  it('says a timeout was a timeout', () => {
    const timeout = Object.assign(new Error('The operation was aborted due to timeout'), { name: 'TimeoutError' });
    expect(explainNetworkError(timeout).message).toMatch(/did not answer within 30 seconds/);
  });

  it('names the underlying cause code when there is one', () => {
    const err = Object.assign(new TypeError('fetch failed'), { cause: Object.assign(new Error('x'), { code: 'ENOTFOUND' }) });
    expect(explainNetworkError(err).message).toMatch(/Could not reach WHOOP \(ENOTFOUND\)/);
  });

  it('uses the cause message for a refused redirect, and the plain message when there is no cause', () => {
    const redirect = Object.assign(new TypeError('fetch failed'), { cause: new Error('unexpected redirect') });
    expect(explainNetworkError(redirect).message).toMatch(/\(unexpected redirect\)/);
    expect(explainNetworkError(new Error('boom')).message).toMatch(/\(boom\)/);
    expect(explainNetworkError('odd').message).toMatch(/\(unknown\)/);
  });

  it('cuts a long cause short', () => {
    const err = new Error('y'.repeat(500));
    expect(explainNetworkError(err).message.length).toBeLessThan(250);
  });
});

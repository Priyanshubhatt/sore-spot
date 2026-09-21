/** A dropped connection, a timeout or a refused redirect would otherwise all read as "fetch failed". */
export function explainNetworkError(err: unknown): Error {
  const e = err as { name?: string; message?: string; cause?: { code?: string; message?: string } };
  if (e?.name === 'TimeoutError') return new Error('WHOOP did not answer within 30 seconds. Check the connection and run the export again.');
  const why = e?.cause?.code ?? e?.cause?.message ?? e?.message ?? 'unknown';
  return new Error(`Could not reach WHOOP (${String(why).slice(0, 80)}). Check the connection, and that nothing (a proxy or VPN) is redirecting the request.`);
}

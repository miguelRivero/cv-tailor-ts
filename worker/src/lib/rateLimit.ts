/**
 * A deliberately simple daily request counter, backed by KV. This is
 * NOT per-visitor rate limiting - it's a single global counter shared
 * by every caller, which is the right shape for a personal tool with
 * one legitimate user: the point is to cap worst-case OpenAI spend if
 * the shared passphrase ever leaks, not to fairly ration traffic across
 * many independent users. Pair it with a hard monthly budget on the
 * OpenAI project key itself (see docs/WEB.md) - this counter is the
 * fast, free backstop; the budget is the one that can't be bypassed by
 * a bug here.
 */
export async function checkAndIncrementDailyLimit(
  kv: KVNamespace,
  limit: number
): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const key = `rate:${today}`;

  const current = Number((await kv.get(key)) ?? '0');
  if (current >= limit) {
    return false;
  }

  // A 2-day TTL is generous headroom past the key's useful lifetime,
  // regardless of what time of day it was first written.
  await kv.put(key, String(current + 1), { expirationTtl: 60 * 60 * 48 });
  return true;
}

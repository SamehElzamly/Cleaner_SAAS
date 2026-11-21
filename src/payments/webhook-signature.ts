import { createHmac, timingSafeEqual } from 'node:crypto';

export type SignatureCheck = { ok: true } | { ok: false; reason: string };

// Signed payload is `${timestamp}.${rawBody}` (Stripe-style): binding the
// timestamp into the signature stops an attacker replaying an old, validly
// signed request later.
export function verifyWebhookSignature(params: {
  secret: string;
  timestamp: string | undefined;
  signature: string | undefined;
  rawBody: Buffer | undefined;
  nowMs?: number;
  toleranceSeconds?: number;
}): SignatureCheck {
  const { secret, timestamp, signature, rawBody } = params;
  const nowMs = params.nowMs ?? Date.now();
  const tolerance = params.toleranceSeconds ?? 300;

  if (!timestamp || !signature || !rawBody) return { ok: false, reason: 'missing signature headers or body' };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(nowMs / 1000 - ts) > tolerance) {
    return { ok: false, reason: 'stale or invalid timestamp' };
  }

  const expected = createHmac('sha256', secret).update(`${timestamp}.`).update(rawBody).digest();
  const given = Buffer.from(signature, 'hex'); // non-hex input yields a short buffer -> rejected below
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return { ok: false, reason: 'invalid signature' };
  }
  return { ok: true };
}

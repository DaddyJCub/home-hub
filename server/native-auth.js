// Broker access-token validation for native JCubHub Apps clients.
//
// Verifies the HS256 access token minted by the central identity broker
// (issuer "jcubhub-apps-identity"), enforces capability claims
// (deny-by-default), and exposes the caller's identity on req.native.
// Bearer only — no cookies.
//
// The signing key matches the central broker: IDENTITY_TOKEN_SIGNING_SECRET if
// set, else a key DERIVED from ENCRYPTION_KEY with the same domain-separation
// label the broker uses (see CM backend/app/integrations/identity/tokens.py).
//
// Implemented with Node's built-in crypto (no jsonwebtoken dependency): strict
// alg=HS256 enforcement (red flags "none"), constant-time signature compare,
// and issuer/exp/nbf checks. Mirrors jcubhub-books middleware/native-auth.js.

import crypto from 'crypto';

export const ISSUER = 'jcubhub-apps-identity';
const DERIVE_LABEL = 'jcubhub-apps:identity-access-token-signing:v1';
// Small tolerance (seconds) for exp/nbf to absorb minor clock skew between hosts.
const CLOCK_SKEW_SEC = 30;

export function resolveSigningKey() {
  const explicit = (process.env.IDENTITY_TOKEN_SIGNING_SECRET || '').trim();
  if (explicit) return explicit;
  const enc = (process.env.ENCRYPTION_KEY || '').trim();
  if (enc) return crypto.createHmac('sha256', enc).update(DERIVE_LABEL).digest('hex');
  return null;
}

function base64urlToBuffer(input) {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

/** Raised for any token that fails verification. `code` is a stable, secret-safe slug. */
export class BrokerTokenError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BrokerTokenError';
    this.code = code;
  }
}

/**
 * Verify a broker HS256 access token and return its payload.
 * Throws BrokerTokenError on any failure. `now` is injectable for tests.
 */
export function verifyBrokerToken(token, { now = Math.floor(Date.now() / 1000) } = {}) {
  const key = resolveSigningKey();
  if (!key) throw new BrokerTokenError('not_configured', 'No signing key configured');
  if (typeof token !== 'string' || token.length === 0) {
    throw new BrokerTokenError('malformed', 'Empty token');
  }

  const parts = token.split('.');
  if (parts.length !== 3) throw new BrokerTokenError('malformed', 'Token is not a JWT');
  const [headerB64, payloadB64, sigB64] = parts;

  let header;
  try {
    header = JSON.parse(base64urlToBuffer(headerB64).toString('utf8'));
  } catch {
    throw new BrokerTokenError('malformed', 'Unreadable header');
  }
  // Strict: only HS256. Explicitly rejects alg:"none" and any asymmetric alg.
  if (header.alg !== 'HS256') {
    throw new BrokerTokenError('bad_alg', `Unsupported alg: ${header.alg}`);
  }

  // Constant-time signature comparison over the exact signed input.
  const expected = crypto
    .createHmac('sha256', key)
    .update(`${headerB64}.${payloadB64}`)
    .digest();
  const provided = base64urlToBuffer(sigB64);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    throw new BrokerTokenError('bad_signature', 'Signature verification failed');
  }

  let payload;
  try {
    payload = JSON.parse(base64urlToBuffer(payloadB64).toString('utf8'));
  } catch {
    throw new BrokerTokenError('malformed', 'Unreadable payload');
  }

  if (payload.iss !== ISSUER) throw new BrokerTokenError('bad_issuer', 'Issuer mismatch');
  if (typeof payload.exp === 'number' && now > payload.exp + CLOCK_SKEW_SEC) {
    throw new BrokerTokenError('expired', 'Token expired');
  }
  if (typeof payload.nbf === 'number' && now + CLOCK_SKEW_SEC < payload.nbf) {
    throw new BrokerTokenError('not_yet_valid', 'Token not yet valid');
  }
  return payload;
}

function errorBody(code, message) {
  return { error: { code, message } };
}

/** Express middleware: require a valid broker token. Sets req.native = { userId, username, email, caps }. */
export function requireBrokerAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return res.status(401).json(errorBody('unauthorized', 'Missing Bearer token'));
  }
  let payload;
  try {
    payload = verifyBrokerToken(match[1]);
  } catch (err) {
    if (err instanceof BrokerTokenError && err.code === 'not_configured') {
      return res.status(503).json(errorBody('upstream_unavailable', 'Native auth not configured'));
    }
    // Secret-safe diagnostic: a short, non-reversible fingerprint of the key so
    // both sides can be compared without exposing it.
    const key = resolveSigningKey();
    const fp = key ? crypto.createHash('sha256').update(key).digest('hex').slice(0, 8) : 'none';
    console.warn(`[native-auth] 401: ${err.code || 'verify_failed'} (${err.message}); key_fp=${fp}`);
    return res.status(401).json(errorBody('unauthorized', 'Invalid or expired token'));
  }
  if (!payload.email) {
    return res.status(403).json(errorBody('forbidden', 'Token has no email claim; cannot scope requests'));
  }
  req.native = {
    userId: payload.sub,
    username: payload.username,
    email: payload.email,
    caps: Array.isArray(payload.caps) ? payload.caps : [],
  };
  next();
}

/** Require a specific capability (deny-by-default). */
export function requireCapability(cap) {
  return function (req, res, next) {
    if (!req.native || !req.native.caps.includes(cap)) {
      return res.status(403).json(errorBody('forbidden', `Missing capability: ${cap}`));
    }
    next();
  };
}

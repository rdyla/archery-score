import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

// Derive JWKS URL from publishable key
// pk_test_<base64(domain$)> -> domain
function getJwksUrl(publishableKey: string): string {
  const base64 = publishableKey.replace(/^pk_(test|live)_/, '');
  const domain = atob(base64).replace(/\$$/, '');
  return `https://${domain}/.well-known/jwks.json`;
}

interface JwksKey {
  kty: string;
  use: string;
  kid: string;
  n: string;
  e: string;
}

function base64urlToBuffer(b64: string): ArrayBuffer {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    b64.length + ((4 - (b64.length % 4)) % 4), '='
  );
  const binary = atob(padded);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

async function verifyJwt(
  token: string,
  jwksUrl: string
): Promise<{ sub: string; email?: string } | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;

  let kid: string;
  try {
    kid = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))).kid;
  } catch {
    return null;
  }

  // Fetch JWKS
  const jwksRes = await fetch(jwksUrl);
  if (!jwksRes.ok) return null;
  const { keys } = await jwksRes.json() as { keys: JwksKey[] };
  const jwk = keys.find((k) => k.kid === kid);
  if (!jwk) return null;

  // Import the public key
  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  // Verify signature
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig = base64urlToBuffer(sigB64);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, sig, data);
  if (!valid) return null;

  // Decode payload
  try {
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

export const clerkAuth = createMiddleware<{
  Bindings: Env;
  Variables: { userId: string; userEmail: string | null };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const jwksUrl = getJwksUrl(c.env.CLERK_PUBLISHABLE_KEY);

  try {
    const payload = await verifyJwt(token, jwksUrl);
    if (!payload) {
      return c.json({ error: 'Invalid token' }, 401);
    }
    c.set('userId', payload.sub);
    c.set('userEmail', payload.email ?? null);
    await next();
  } catch {
    return c.json({ error: 'Token verification failed' }, 401);
  }
});

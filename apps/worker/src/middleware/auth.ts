import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';

/**
 * Verifies Clerk session tokens using the Clerk JWT verification endpoint.
 * Attaches the Clerk user ID and basic claims to the Hono context.
 */
export const clerkAuth = createMiddleware<{
  Bindings: Env;
  Variables: { userId: string; userEmail: string | null };
}>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    // Verify the JWT against Clerk's JWKS endpoint
    const verifyRes = await fetch(
      'https://api.clerk.com/v1/tokens/verify',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${c.env.CLERK_SECRET_KEY}`,
        },
        body: JSON.stringify({ token }),
      }
    );

    if (!verifyRes.ok) {
      return c.json({ error: 'Invalid token' }, 401);
    }

    const payload = await verifyRes.json() as { sub: string; email?: string };
    c.set('userId', payload.sub);
    c.set('userEmail', payload.email ?? null);
    await next();
  } catch {
    return c.json({ error: 'Token verification failed' }, 401);
  }
});

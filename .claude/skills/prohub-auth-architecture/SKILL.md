---
name: prohub-auth-architecture
description: >
  The provider-agnostic authentication architecture of ProHub, all in TypeScript on Next.js: JWT
  access tokens via jose (HS256, 15-min), opaque refresh tokens stored as SHA-256 hashes in a
  sessions table with rotation, the AuthProvider interface (password ships now; LDAP/OAuth drop in
  later), auth Route Handlers, middleware.ts route protection + a requireAuth helper, and the
  frontend Zustand authStore with silent refresh. USE WHEN: implementing or changing login,
  register, refresh, logout, token handling, session management, role checks, or auth providers.
  Trigger on: "login", "auth", "JWT", "jose", "refresh token", "session", "bcrypt", "middleware",
  "requireAuth", "requireRole", "AuthProvider", "LDAP", "OAuth", "authStore", "silent refresh",
  "httpOnly cookie".
---

# ProHub Authentication Architecture (Next.js + TypeScript)

A composed, **provider-agnostic** auth stack — all TypeScript, running inside Next.js. Every login
method produces the *same* session record, so new providers drop in as new files under
`lib/server/auth/providers/` with **zero changes** to session, token, or middleware logic.

| Concern | Mechanism |
|---|---|
| Access token | `jose` (`SignJWT` / `jwtVerify`), HS256, short-lived (15 min) |
| Password hash | `bcryptjs` (or Node `argon2`), cost ≥ 12 |
| Refresh token | opaque (`crypto.randomBytes(32)` → base64url); only its **SHA-256 hash** is stored in `sessions`; rotated on every refresh |
| Transport | access token in `Authorization: Bearer` (Zustand) **or** httpOnly cookie; refresh token always an **httpOnly, Secure, SameSite=Lax cookie** |
| Password login | `providers/password.ts` — ships now |
| OAuth / Azure AD | `providers/oauth.ts` — future, additive |
| On-prem AD | `providers/ldap.ts` via `ldapjs` — future, additive |

## The AuthProvider interface (the extensibility seam)
```typescript
// lib/server/auth/provider.ts
import 'server-only';

export interface Identity {
  providerName: 'password' | 'google' | 'azuread' | 'ldap';
  externalId: string;           // provider's user id (empty for password)
  username: string;
  email: string;
  displayName: string;
}

export class InvalidCredentialsError extends Error {}
export class AccountDisabledError extends Error {}

export interface AuthProvider {
  readonly providerName: Identity['providerName'];
  authenticate(credentials: unknown): Promise<Identity>;
}
```
The service calls `provider.authenticate(...)` without knowing the concrete type. The password
provider compares with bcrypt and throws `InvalidCredentialsError` for both "user not found" and
"wrong password" (never leak which).

## Provider-agnostic login service
```typescript
// lib/server/auth/auth-service.ts
import 'server-only';
import { SignJWT } from 'jose';
import { randomBytes, createHash } from 'node:crypto';
import type { AuthProvider } from './provider';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function login(provider: AuthProvider, credentials: unknown) {
  const identity = await provider.authenticate(credentials);     // handler maps InvalidCredentialsError → 401
  const user = await userRepository.upsertByIdentity(identity);  // creates on first OAuth/LDAP login

  const rawRefresh = randomBytes(32).toString('base64url');
  const tokenHash = createHash('sha256').update(rawRefresh).digest('hex');
  await sessionRepository.create({
    userId: user.id, tokenHash, provider: identity.providerName,
    expiresAt: new Date(Date.now() + REFRESH_EXPIRY_MS),
  });

  const accessToken = await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setExpirationTime('15m')
    .sign(secret);

  return { accessToken, refreshToken: rawRefresh, expiresIn: 15 * 60 };
}
```

## Refresh rotation flow
`POST /api/auth/refresh` (reads the refresh-token httpOnly cookie) → SHA-256 hash it → look up
session → check not expired / not revoked → **revoke old session** → create new session + new
refresh token → sign new access token → set the new refresh cookie → return the new access token.
(The old refresh token is now dead — rotation.)

## Verifying the access token + middleware
```typescript
// lib/server/auth/verify.ts
import 'server-only';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export interface Claims { sub: string; email: string; role: string; }

export async function verifyAccessToken(token: string): Promise<Claims> {
  const { payload } = await jwtVerify(token, secret);            // throws on invalid/expired
  return payload as unknown as Claims;
}
```
```typescript
// middleware.ts (repo root) — gate whole route subtrees at the edge
import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('access_token')?.value
    ?? req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return NextResponse.redirect(new URL('/login', req.url));
  try {
    await jwtVerify(token, secret);                              // jose works on the Edge runtime
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
export const config = { matcher: ['/dashboard/:path*', '/products/:path*'] };
```
For per-handler checks and role gates inside a Route Handler / Server Action, use a `requireAuth` /
`requireRole` helper that verifies the token and returns the `Claims` (or throws → mapped to
401/403 via `lib/server/response.ts`):
```typescript
// lib/server/auth/guard.ts
import 'server-only';
export async function requireAuth(req: Request): Promise<Claims> { /* read header/cookie → verifyAccessToken */ }
export function requireRole(claims: Claims, ...roles: string[]) {
  if (!roles.includes(claims.role)) throw new ForbiddenError();
}
```

## DB schema
`users` separates identity from credentials (`passwordHash` is **NULL** for OAuth/LDAP users):
`id, username UNIQUE, email UNIQUE, password_hash NULL, display_name, role DEFAULT 'staff',
is_active, created_at, updated_at, deleted_at`.
`sessions` is provider-agnostic from day one:
`id, user_id FK ON DELETE CASCADE, token_hash UNIQUE (SHA-256), provider DEFAULT 'password',
device_info, ip_address, expires_at, created_at, revoked_at` — indexes on `user_id` and
`token_hash`. (Until a real DB lands, back these with the in-memory repository impls; the interface
stays identical.)

## Routes
```
# Ships now
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
# Add later — existing routes unchanged
GET    /api/auth/oauth/[provider]
GET    /api/auth/oauth/[provider]/callback
```
All under `app/api/auth/**/route.ts` with `export const runtime = 'nodejs'` (bcrypt + `node:crypto`).

## Frontend: Zustand authStore (persisted as `auth-storage`)
```typescript
// stores/authStore.ts
'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  user: { id: number; username: string; email: string; role: string } | null;
  setAuth: (accessToken: string, user: AuthState['user']) => void;
  logout: () => void;
}
export const useAuthStore = create<AuthState>()(
  persist((set) => ({
    accessToken: null, user: null,
    setAuth: (accessToken, user) => set({ accessToken, user }),
    logout: () => set({ accessToken: null, user: null }),
  }), { name: 'auth-storage' }),
);
```
> The **refresh token lives only in an httpOnly cookie** — never in Zustand/localStorage. The
> short-lived access token may sit in Zustand (for the `Authorization` header) or also as a cookie
> for `middleware.ts` to read; pick one and be consistent.

## Frontend: silent refresh in the fetch client
Extend `lib/api/client.ts` (see `prohub-type-contract`): on a 401 (and not already retried), queue
concurrent requests, `POST /api/auth/refresh` **once** (the browser sends the httpOnly refresh
cookie automatically), `setAuth` with the new access token, replay the queued requests; on failure,
`logout()`. Guard with an `isRefreshing` flag + `failedQueue` so concurrent 401s trigger only one
refresh.

## Related skills
- `prohub-type-contract` — the fetch client these interceptors live in.
- `prohub-backend-route-handler` — handler/service/repository layering and the response envelope.
- `prohub-conventions-and-contract` — error envelope and status-code mapping.

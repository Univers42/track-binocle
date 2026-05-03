# Authentication environment and production transition

Last updated: 2026-05-03

`opposite-osiris` is currently an Astro/Vite frontend. The auth client is implemented in a React-compatible hook-style module at `opposite-osiris/src/hooks/useAuth.ts`, but it has no React runtime dependency so the existing Astro build stays lightweight.

## Development variables

Set these in `opposite-osiris/.env.local`:

```dotenv
PUBLIC_AUTH_GATEWAY_URL=/api/auth
PUBLIC_PORTAL_URL=https://portal.example.com/sign-in
PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
TURNSTILE_BYPASS_LOCAL=true
PUBLIC_SITE_URL=http://localhost:4322
```

The public site key is safe for browser code. The Turnstile secret must only be read by the auth gateway or production backend.

## Optional local HTTPS

The Astro dev server can also run at `https://localhost:4322` using a certificate generated from `mini-baas-infra`:

```bash
cd opposite-osiris
npm run cert:localhost
npm run cert:trust
npm run dev:https
```

`npm run cert:localhost` creates a reusable local CA plus a `localhost` server certificate inside `mini-baas-infra`. `npm run cert:trust` imports that local CA into the user Chromium/NSS certificate store so the browser can show `https://localhost:4322` as trusted after a browser restart. `npm run dev:https` generates the local certificate if it is missing, refuses to start if another server already owns port `4322`, and starts Astro with TLS enabled. If a plain HTTP server is already running on `4322`, stop it first; otherwise browsers will show `ERR_SSL_PROTOCOL_ERROR` because they are trying to speak TLS to an HTTP server.

You can also regenerate the certificate manually:

```bash
npm run cert:localhost
npm run cert:trust
```

Equivalent `.env.local` values:

```dotenv
PUBLIC_SITE_URL=https://localhost:4322
ASTRO_DEV_HOST=localhost
ASTRO_DEV_PORT=4322
ASTRO_DEV_HTTPS=true
ASTRO_DEV_HTTPS_KEY=../infrastructure/baas/mini-baas-infra/certs/localhost-key.pem
ASTRO_DEV_HTTPS_CERT=../infrastructure/baas/mini-baas-infra/certs/localhost.pem
```

The generated CA, key, and certificate files live in `infrastructure/baas/mini-baas-infra/certs/` and are ignored by Git. For `curl` or other system-level clients to trust the same local CA, run `sh ../infrastructure/baas/mini-baas-infra/scripts/trust-localhost-cert.sh --system` from `opposite-osiris` and enter the sudo password when prompted. When switching to HTTPS locally, also make sure `PUBLIC_SITE_URL`, `GOTRUE_SITE_URL`, and `GOTRUE_URI_ALLOW_LIST` include `https://localhost:4322/**` before restarting the BaaS auth service.

## Production variables

For a live domain:

1. Create a Cloudflare Turnstile widget for the production hostname.
2. Replace `PUBLIC_TURNSTILE_SITE_KEY` with the live site key.
3. Store `TURNSTILE_SECRET_KEY` in the production secret manager, not in source control.
4. Set `TURNSTILE_BYPASS_LOCAL=false`.
5. Set `PUBLIC_AUTH_GATEWAY_URL` to the HTTPS auth gateway origin or a same-origin reverse proxy path.
6. Set `PUBLIC_PORTAL_URL` to the HTTPS portal sign-in URL.
7. Ensure the gateway can reach Kong/GoTrue through `PUBLIC_BAAS_URL` and has a service role key for audit logging.

## Auth gateway responsibilities

`scripts/auth-gateway.mjs` is the reference backend boundary for secure auth:

- verifies Cloudflare Turnstile server-side before registration, login, and recovery
- applies per-IP rate limiting and sends `Retry-After` for client exponential backoff
- validates email with an RFC 5322-compatible regex
- enforces registration passwords with at least 12 characters, uppercase, lowercase, number, and symbol
- proxies registration/login/recovery to GoTrue
- stores refresh tokens in `HttpOnly`, `Secure`, `SameSite=Lax` cookies
- rotates refresh tokens through `/api/auth/refresh`
- exposes reserved MFA hooks for TOTP and WebAuthn
- writes security audit events through `auth_record_audit_event`

Run locally:

```bash
cd opposite-osiris
npm run auth:gateway
```

Astro dev proxies `/api/auth` to `http://localhost:8787`.

## Session model

The browser receives short-lived access tokens only. Refresh tokens are handled by the gateway as `HttpOnly` cookies to reduce XSS exposure. CSRF risk is reduced by `SameSite=Lax`; production deployments should add origin checks and CSRF tokens if cross-site auth flows are introduced.

## MFA hooks

The gateway returns `501` for reserved MFA endpoints until a provider is enabled:

- `/api/auth/mfa/totp/enroll`
- `/api/auth/mfa/totp/verify`
- `/api/auth/mfa/webauthn/options`

Recommended future wiring:

- TOTP: store encrypted TOTP secrets in a private table and verify with a backend-only library.
- WebAuthn: store credential IDs/public keys and challenge state server-side; require HTTPS and user verification.

## Email verification protection

GoTrue must run with `GOTRUE_MAILER_AUTOCONFIRM=false`. Registration returns a neutral success state instructing the user to check email, and the UI does not grant a full session until the user confirms their address and signs in.

## Audit retention

`models/auth-security-migration.sql` creates `auth_audit_events`. Retain these records for 13 months unless a legal hold applies, then purge or anonymise IP/user-agent data.

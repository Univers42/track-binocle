# track-binocle

SDK-first local BaaS runtime for the Prismatica frontend.

## Local BaaS runtime

The root Compose stack is project-owned and image-based. Normal app, gateway, and verification code use the `@mini-baas/js` SDK boundary; the raw `infrastructure/baas/mini-baas-infra` checkout is not required at runtime.

### Bootstrap environment

Generate the ignored runtime env file:

```sh
node infrastructure/baas/scripts/bootstrap-env.mjs
```

Then make sure `opposite-osiris/.env.local` exists and points browser code at the dev proxy:

```dotenv
PUBLIC_BAAS_URL=/api
PUBLIC_AUTH_GATEWAY_URL=/api/auth
PUBLIC_BAAS_ANON_KEY=<same value as KONG_PUBLIC_API_KEY from infrastructure/baas/.env.local>
```

Runtime secrets and generated certificates stay ignored:

- `infrastructure/baas/.env.local`
- `infrastructure/baas/certs/*`
- `opposite-osiris/.env.local`

### Start and verify

```sh
docker compose up -d --build
cd opposite-osiris
npm run dev
npm run verify:sdk-boundaries
npm run check
npm run build
npm run baas:verify
```

`npm run dev` now runs the project HTTPS wrapper. It generates the localhost certificate, imports the local CA into common Linux browser trust stores, and refuses to fall back to a random port when the expected dev port is already occupied by a stale server.

### Optional image overrides

The Compose stack supports pinned or remote images via environment variables:

- `BAAS_KONG_IMAGE`
- `BAAS_POSTGRES_IMAGE`
- `BAAS_GOTRUE_IMAGE`
- `BAAS_POSTGREST_IMAGE`
- `BAAS_PG_META_IMAGE`
- `BAAS_SUPAVISOR_IMAGE`
- `BAAS_REDIS_IMAGE`

The default Kong image is built locally from [infrastructure/baas/Dockerfile](infrastructure/baas/Dockerfile).

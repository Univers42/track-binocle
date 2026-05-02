# track-binocle BaaS SDK integration

`track-binocle` must talk to the BaaS through the public Kong gateway only. Do not call PostgREST, pg-meta, Redis, Supavisor, or Postgres directly from frontend code.

## Start the BaaS profile

From `infrastructure/baas/mini-baas-infra`:

```bash
cp .env.example .env
make config-up PROFILE=track-binocle
```

The profile exposes:

- Kong gateway: `http://localhost:8000`
- Optional local Postgres admin: `localhost:55432`

All other service traffic stays inside the Docker network.

## Frontend environment

In `opposite-osiris`, copy `.env.example` to `.env.local` and set the anon key from the BaaS `.env`:

```bash
cp .env.example .env.local
```

Astro browser variables:

```dotenv
PUBLIC_BAAS_URL=http://localhost:8000
PUBLIC_BAAS_ANON_KEY=<anon_key_from_mini_baas_env>
```

Next.js-compatible names are also documented in `.env.example` for future migrations.

## SDK initialization

Install or link the official SDK package, then initialize it with the environment-backed config:

```ts
import { createClient } from 'mini-baas-sdk';
import { baasConfig } from './baas-config';

export const client = createClient({
	url: baasConfig.url,
	anonKey: baasConfig.anonKey,
});
```

Use the SDK for reads and writes. The gateway routes REST calls to PostgREST at `/rest/v1`, and project seed data is available after `project-db-init` finishes.

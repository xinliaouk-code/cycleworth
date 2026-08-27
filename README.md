# CycleWorth

CycleWorth is an independent Next.js application. Its application-owned Supabase objects live in the `personal_cycleworth` schema, with row-level security limiting records to the authenticated owner. The app is intended to use its own dedicated Supabase project; the historical shared project is not a valid migration target.

## Supabase configuration

Set these variables in local development and the Vercel Production environment:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
```

The publishable key is the only Supabase key used by the browser and user-scoped server clients. Do not add anonymous-key, secret-key, or service-role variables to client code. `STRAVA_CLIENT_SECRET` is server-only.

Before any remote migration, verify that the Supabase CLI link is the exact dedicated CycleWorth project and run:

```bash
npm run supabase:verify -- --require-dedicated-target
```

Do not run `supabase db push` while the local link points to the legacy shared project. The active migration is `supabase/migrations/202608270001_cycleworth_isolated_baseline.sql`; historical migrations are preserved under `supabase/legacy-migrations/` and are not part of the active push set. After the dedicated project is verified and the baseline is pushed, run `supabase/tests/validation.sql` against that project only.

## Development

```bash
npm run dev
```

Useful checks before delivery:

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run supabase:verify
```

The production app uses `https://cycleworth.vercel.app` for the existing Vercel project. Auth and Strava live-flow verification still requires the user-controlled account/session flow; never paste passwords, access tokens, or secret values into chat.

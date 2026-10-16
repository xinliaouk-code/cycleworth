# Personal Projects Supabase

> Historical pre-separation notes. Do not use this document to configure or migrate
> current CycleWorth. The shared project is out of scope; follow README.md and
> MIGRATION_NOTES.md for the dedicated `qmegopdnnkfrnhtohvhe` target.

The personal applications share one Supabase project, conceptually named **Personal Projects**, with one Auth system. Application-owned database objects are isolated by schema: `personal_cycleworth`, `personal_london_explorer` (reserved), `personal_aesthetic_marking`, and `personal_monthly_cost`; `shared` is reserved for genuinely shared API-facing objects. Supabase-managed schemas such as `auth`, `storage`, `realtime`, `extensions`, and `vault` are not modified.

CycleWorth uses `personal_cycleworth` as the default PostgREST schema. Monthly Cost and Aesthetic Marking use their corresponding schema through the Supabase client `db.schema` option. Public browser variables contain only the shared project URL and publishable/anon key; service-role/secret keys remain server-only.

The four repositories and their Vercel projects remain independent. The second Supabase Free project slot is reserved for formal, collaborative, or work-related projects. The custom schemas must be added to Supabase Data API Exposed schemas in the Dashboard before their REST clients can query them; this repository cannot verify or change that setting without a connected Supabase management credential.

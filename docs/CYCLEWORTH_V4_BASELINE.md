# CycleWorth V4 baseline

V1–V3 completed in chat `1.0 base code`; it was idle at handoff. Base: `a24eb93` (V3), preceded by `f6c8c7d` (V2) and `9ad016c` (V1). Original checkout was clean. V4 uses a separate managed worktree and `codex/cycleworth-v4`; no concurrent edits to the original worktree.

Baseline: 24/24 tests pass. Next.js installed route handler and proxy documentation read before implementation. README, migration notes, four Supabase migrations, Health handlers/parser and dashboard access audited.

Neon: new project `falling-sound-48715113`, CycleWorth, AWS London, PostgreSQL 17, organization Free plan. Validation branch `br-royal-waterfall-zanv71f0` (`v4-validation`), parent `br-little-smoke-za0kxi8g`. Managed Better Auth enabled on validation only.

Real migration BLOCKED: the only authorized source, `qmegopdnnkfrnhtohvhe`, is INACTIVE; a read-only table inventory timed out. No source mutations, restore request or access to the excluded shared project. Real row counts and GPS reconciliation are not available. Continue schema, scripts and synthetic validation.

Production environment variables, credentials and deployment remain unchanged. Passwords are not migrated. Application user UUIDs will be preserved; linking a new Auth identity to imported data requires an exact verified email match (never unverified signup input).

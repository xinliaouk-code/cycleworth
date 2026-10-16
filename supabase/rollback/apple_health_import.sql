-- Prefer stopping application writes; this removes only new import functions.
-- Verify exact dedicated project identity and approval before any remote rollback.
begin;
drop function personal_cycleworth.health_import(jsonb,boolean);
drop function personal_cycleworth_private.session_health_import(jsonb,boolean);
-- V3 token functions must be rolled back first, before removing the shared helper.
drop function personal_cycleworth_private.apply_health_import(uuid,jsonb,boolean);
drop schema personal_cycleworth_private;
commit;

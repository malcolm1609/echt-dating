\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

-- Ohne Anmeldung nur die Frage, ob der Testbetrieb läuft.
select pg_temp.assert(has_function_privilege('anon', 'beta_enabled()', 'execute'), 'anon: beta_enabled');
select pg_temp.assert(not has_function_privilege('anon', 'my_matches()', 'execute'), 'anon: keine Matches');
select pg_temp.assert(not has_function_privilege('anon', 'touch_activity()', 'execute'), 'anon: keine Aktivität');
select pg_temp.assert(not has_function_privilege('anon', 'beta_prepare_tester(uuid)', 'execute'), 'anon: keine Testdaten anlegen');

-- Angemeldet: die App-Funktionen, aber keine Server-Helfer.
select pg_temp.assert(has_function_privilege('authenticated', 'my_matches()', 'execute'), 'angemeldet: Matches');
select pg_temp.assert(has_function_privilege('authenticated', 'todays_picks()', 'execute'), 'angemeldet: Vorschläge');
select pg_temp.assert(not has_function_privilege('authenticated', 'beta_prepare_tester(uuid)', 'execute'), 'angemeldet: keine Testdaten für andere');
select pg_temp.assert(not has_function_privilege('authenticated', 'beta_prepare_events(uuid)', 'execute'), 'angemeldet: keine Test-Events für andere');
select pg_temp.assert(not exists (
  select from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.proname like 'beta\_%'
    and p.proname not in ('beta_enabled', 'beta_verify', 'beta_finish_date', 'beta_reset_me')
    and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))),
  'interne Testbetrieb-Helfer sind gesperrt');
select pg_temp.assert(not exists (
  select from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prorettype = 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'execute')),
  'Trigger-Funktionen sind nicht direkt aufrufbar');

rollback;

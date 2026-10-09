-- Sicherheitswache: prüft bei jeder Änderung, wer was auf dem Server darf.
-- Jede neue Freigabe (Tabelle, Spalte, Funktion, Regel, Sicht) lässt diesen Test scheitern,
-- bis sie hier bewusst eingetragen ist. So rutscht keine Lücke unbemerkt durch.
\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

create function pg_temp.same(label text, actual text[], expected text[],
  fix text default 'Prüfen und dann in guard.test.sql eintragen.') returns void language plpgsql as $$
declare
  extra text[] := array(select unnest(actual) except select unnest(expected) order by 1);
  missing text[] := array(select unnest(expected) except select unnest(actual) order by 1);
begin
  if cardinality(extra) > 0 then
    raise exception 'FAILED: % – neu und noch nicht geprüft: %. %', label, array_to_string(extra, ', '), fix;
  end if;
  if cardinality(missing) > 0 then
    raise exception 'FAILED: % – nicht mehr vorhanden: %. Bitte aus guard.test.sql streichen.', label, array_to_string(missing, ', ');
  end if;
  raise notice 'ok - %', label;
end $$;

-- 1. Jede Tabelle hat Zeilenschutz (RLS). Ohne ihn könnte jede angemeldete Person alles lesen und ändern.
select pg_temp.same('Tabellen ohne Zeilenschutz', array(
  select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
), '{}', 'Zeilenschutz einschalten: alter table … enable row level security.');

-- 2. Server-Funktionen mit erhöhten Rechten haben einen festen Suchpfad (sonst lassen sie sich umleiten).
select pg_temp.same('Funktionen mit erhöhten Rechten ohne festen Suchpfad', array(
  select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
), '{}', 'In der Funktion „set search_path = public“ ergänzen.');

-- 3. Was Besucher ohne Anmeldung aufrufen dürfen.
select pg_temp.same('Funktionen mit erhöhten Rechten für Besucher ohne Anmeldung', array(
  select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('anon', p.oid, 'execute')
), '{beta_enabled,date_check_public}');

-- 4. Was angemeldete Personen aufrufen dürfen.
select pg_temp.same('Funktionen mit erhöhten Rechten für angemeldete Personen', array(
  select p.proname::text from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and has_function_privilege('authenticated', p.oid, 'execute')
), '{accept_date,active_nearby,answer_after_date,answer_date_check,answer_question,beta_enabled,beta_finish_date,beta_reset_me,beta_verify,block_user,can_hear,create_event,current_date_check,date_check_location,date_check_public,delete_my_account,end_match,has_confirmed_phone,is_discoverable,join_event,leave_event,mark_read,my_events,my_matches,propose_date,record_consent,report_user,review_event,send_event_message,send_message,send_voice,start_date_check,todays_picks,touch_activity}');

-- 5. Direkter Zugriff auf Tabellen und Sichten (ohne Funktionen).
select pg_temp.same('Direkter Tabellenzugriff', array(
  select format('%s:%s:%s', table_name, grantee, lower(privilege_type)) from information_schema.table_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated')
), '{area_stats:authenticated:select,areas:authenticated:select,consents:authenticated:select,likes:authenticated:select,matches:authenticated:select,my_picks_today:authenticated:select,my_waitlist_position:authenticated:select,profiles:authenticated:select,public_profiles:authenticated:select}');

-- 6. Welche Spalten man selbst schreiben darf. Status, Gebiet, Prüfung und Plus gehören nie dazu.
select pg_temp.same('Selbst beschreibbare Spalten', array(
  select distinct format('%s.%s:%s', table_name, column_name, lower(privilege_type)) from information_schema.column_privileges
  where table_schema = 'public' and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE')
), '{likes.decision:insert,likes.from_id:insert,likes.to_id:insert,profiles.age_max:insert,profiles.age_max:update,profiles.age_min:insert,profiles.age_min:update,profiles.bio:insert,profiles.bio:update,profiles.birthdate:insert,profiles.display_name:insert,profiles.display_name:update,profiles.gender:insert,profiles.goal:insert,profiles.goal:update,profiles.id:insert,profiles.interests:insert,profiles.interests:update,profiles.lat:insert,profiles.lat:update,profiles.lng:insert,profiles.lng:update,profiles.max_distance_km:insert,profiles.max_distance_km:update,profiles.music:insert,profiles.music:update,profiles.paused:update,profiles.photos:insert,profiles.photos:update,profiles.prompts:insert,profiles.prompts:update,profiles.seeking:insert,profiles.seeking:update}');

-- 7. Zeilenregeln. Keine darf für Besucher ohne Anmeldung gelten.
select pg_temp.same('Zeilenregeln', array(
  select format('%s:%s:%s', tablename, policyname, lower(cmd)) from pg_policies where schemaname = 'public'
), '{"areas:areas lesbar:select","consents:consents_own:select","likes:eigene Entscheidungen lesen:select","likes:nur sichtbare Profile liken:insert","matches:eigene Matches:select","profiles:eigenes Profil:all","profiles:nur mit bestätigter Handynummer:insert"}');
select pg_temp.same('Zeilenregeln für Besucher ohne Anmeldung', array(
  select format('%s:%s', tablename, policyname) from pg_policies
  where schemaname = 'public' and (roles && '{anon,public}'::name[])
), '{}', 'Die Regel nur für „to authenticated“ anlegen.');

-- 8. Sichten laufen mit den Rechten ihres Besitzers. Neue Sichten müssen das ausdrücklich vermeiden.
select pg_temp.same('Sichten mit Besitzerrechten', array(
  select c.relname::text from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
    and not coalesce('security_invoker=true' = any(c.reloptions), false)
), '{area_stats,my_picks_today,my_waitlist_position,public_profiles}');

rollback;

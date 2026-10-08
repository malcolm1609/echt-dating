-- Gefunden im Tiefentest auf dem Beta-Server: Supabase gibt neue Funktionen direkt für anon und authenticated
-- frei. Das „revoke … from public“ der früheren Migrationen hat das nicht aufgehoben, deshalb konnte man z. B.
-- die Testbetrieb-Helfer (beta_prepare_tester für beliebige Konten) ohne Anmeldung aufrufen.
-- Jetzt gilt: Nur was die App wirklich aufruft, ist freigegeben, alles andere nur für den Server selbst.
do $$
declare
  f regprocedure;
  -- Kleine Rechenhelfer ohne Datenzugriff, die Regeln und Ansichten brauchen.
  helpers text[] := array['day_start', 'distance_km', 'goal_fit', 'valid_music', 'valid_photos', 'valid_prompts'];
begin
  for f in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname <> all (helpers)
      and not exists (select from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
end $$;

-- Künftige Funktionen nicht mehr automatisch für alle freigeben.
alter default privileges in schema public revoke execute on functions from anon, authenticated;

grant execute on function beta_enabled to anon, authenticated;
grant execute on function
  touch_activity, todays_picks, active_nearby, has_confirmed_phone, is_discoverable,
  my_matches, answer_question, send_message, propose_date, accept_date, answer_after_date, end_match,
  mark_read, block_user, report_user,
  my_events, create_event, join_event, leave_event, send_event_message, review_event,
  delete_my_account, beta_verify, beta_finish_date, beta_reset_me
  to authenticated;
grant execute on function beta_prepare_tester, beta_prepare_events to service_role;

-- Gefunden im Stresstest: Jeder App-Start hat auch alle Beispielprofile als aktiv markiert. Bei 100 Leuten
-- gleichzeitig haben sich diese Speicherungen gegenseitig blockiert (Deadlocks, Wartezeiten bis 20 s).
-- Die Beispielprofile werden jetzt höchstens einmal pro Stunde aufgefrischt, und wer gerade sperrt, wird übersprungen.
create or replace function touch_activity() returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set last_active_at = now() where id = auth.uid();
  if beta_enabled() then
    update profiles p set last_active_at = now()
      from (select id from profiles
            where is_sample and last_active_at < now() - interval '1 hour'
            order by id for update skip locked) s
     where p.id = s.id;
  end if;
end $$;

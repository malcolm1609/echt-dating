\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

update beta_settings set enabled = true;
insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);

-- 6 Beispielfrauen, die Männer suchen, und ein Testkonto
insert into auth.users (id) select ('00000000-0000-0000-0000-0000000005' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 6) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, is_sample, prompts, last_active_at)
  select ('00000000-0000-0000-0000-0000000005' || lpad(i::text, 2, '0'))::uuid, 'Probe' || i, '2003-01-01', 'f', '{m}', 1,
         50.58, 8.68, 'admitted', true, '[{"prompt_id": "anknuepfen-1", "answer": "Die Lahnwiesen im Sommer."}]', now() - interval '10 days'
  from generate_series(1, 6) i;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b1');

-- Anmeldung im Testbetrieb: ohne SMS ein Profil, ohne Ausweis zugelassen
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert(beta_enabled(), 'Testbetrieb läuft');
insert into profiles (id, display_name, birthdate, gender, seeking, lat, lng)
  values ('00000000-0000-0000-0000-0000000000b1', 'Tester', '2002-01-01', 'm', '{f}', 50.59, 8.67);
select pg_temp.assert(true, 'Profil ohne bestätigte Handynummer angelegt');
select beta_verify();
select pg_temp.assert((select status = 'admitted' and area_id = 1 from profiles where id = auth.uid()), 'ohne Ausweisprüfung im nächsten Gebiet zugelassen');
select touch_activity();
reset role;
select pg_temp.assert((select bool_and(last_active_at > now() - interval '1 minute') from profiles where is_sample),
  'Beispielprofile bleiben aktiv, solange jemand die Beta nutzt');

-- Startzustand des Testkontos
select beta_prepare_tester('00000000-0000-0000-0000-0000000000b1');
select beta_prepare_tester('00000000-0000-0000-0000-0000000000b1');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert(jsonb_array_length(my_matches()) = 2, 'zwei Matches zum Start, auch nach zweimal Zurücksetzen');
select pg_temp.assert((select count(*) from todays_picks()) = 4, 'die übrigen 4 kommen in die Vorschläge, das Limit ist frei');
select pg_temp.assert((select used from my_picks_today) = 0, 'vorbereitete Likes zählen nicht zu heute');

create temp table picks as select id from todays_picks();
reset role;
create temp table fan as select id from picks p
  where exists (select from likes l where l.from_id = p.id and l.to_id = '00000000-0000-0000-0000-0000000000b1');
grant select on fan to authenticated;
select pg_temp.assert((select count(*) from fan) = 3, 'drei Vorschläge haben schon geliked');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
insert into likes (from_id, to_id, decision) select auth.uid(), id, 'like' from fan limit 1;
select pg_temp.assert(jsonb_array_length(my_matches()) = 3, 'Like an einen Fan ergibt ein Match');

-- Beispielprofile antworten selbst
create temp table fresh as select (m->>'id')::uuid as id from jsonb_array_elements(my_matches()) m where m->'answers' = '{}' limit 1;
select answer_question((select id from fresh), '0-0', 'Meine Antwort');
select pg_temp.assert(
  (select m->'answers'->'0-0'->>'theirs' from jsonb_array_elements(my_matches()) m where (m->>'id')::uuid = (select id from fresh)) like 'Ich habe deine Antworten gelesen%',
  'Beispielprofil beantwortet die Frage');

create temp table chat as select (m->>'id')::uuid as id from jsonb_array_elements(my_matches()) m where jsonb_array_length(m->'messages') > 0;
select send_message((select id from chat), 'Gern, Samstag?');
select propose_date((select id from chat), 'Kaffee', 'Café', 'Samstag, 15 Uhr', false);
select beta_finish_date((select id from chat));
select answer_after_date((select id from chat), 'yes');
select pg_temp.assert(
  (select (m->'date'->>'accepted')::boolean and m->'after_date'->>'theirs' = 'yes' and jsonb_array_length(m->'messages') = 5
   from jsonb_array_elements(my_matches()) m where (m->>'id')::uuid = (select id from chat)),
  'Beispielprofil antwortet im Chat, sagt dem Date zu und will sich wiedersehen');

select report_user((select id from chat), 'fake');
select beta_reset_me();
select pg_temp.assert(jsonb_array_length(my_matches()) = 2, 'Zurücksetzen bringt den Startzustand, auch nach dem Melden');
reset role;

-- Ohne Testbetrieb gilt wieder alles
update beta_settings set enabled = false;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000b2');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.assert(not has_confirmed_phone(), 'ohne Testbetrieb braucht ein Profil wieder die Handynummer');
reset role;

rollback;

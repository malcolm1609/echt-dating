\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000), (2, 'Kassel', 51.31, 9.48, 30, 1000);
-- c1 Host (m), c2 Lea (f), c3 Mia (f), c4 Ben (m), c5 Kassel (f)
insert into auth.users (id) select ('00000000-0000-0000-0000-0000000000c' || i)::uuid from generate_series(1, 5) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000c1', 'Host', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted'),
  ('00000000-0000-0000-0000-0000000000c2', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000c3', 'Mia', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000c4', 'Ben', '2002-02-01', 'm', '{f}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000c5', 'Kassel', '2002-02-01', 'f', '{m}', 2, 51.31, 9.48, 'admitted');

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- Anlegen -------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(pg_temp.fails($$select create_event('Party', 'Feiern', 'Bar', 'Heute', now() + interval '2 hours', 12, 0, 'open', null, true, null)$$),
  'heute Abend höchstens 8 Plätze');
select pg_temp.assert(pg_temp.fails($$select create_event('Quiz', 'Spiele', 'Pub', 'Morgen', now() + interval '1 day', 10, 80, 'open', null, false, null)$$),
  'höchstens 50 €');
create temp table ev as select create_event('Kneipentour', 'Feiern', 'Seltersweg', 'Heute, 21:00 Uhr', now() + interval '2 hours', 4, 0, 'open', null, true, null) as id;
grant select on ev to authenticated;
select pg_temp.assert((my_events()->'events'->0->>'mine')::boolean, 'der Gastgeber ist selbst dabei');
select pg_temp.assert((my_events()->'events'->0->'joined'->>'m')::int = 1, 'und belegt einen Platz seiner Hälfte');
reset role;

-- Anmelden ------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c5');
select pg_temp.assert(jsonb_array_length(my_events()->'events') = 0, 'Events aus anderen Gebieten sind unsichtbar');
select pg_temp.assert(pg_temp.fails($$select join_event((select id from ev))$$), 'und nicht buchbar');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.assert(my_events()->'events'->0->'people' = 'null', 'wer nicht dabei ist, sieht keine Teilnehmenden');
select join_event((select id from ev));
select pg_temp.assert(my_events()->'events'->0->'people'->0->>'name' = 'Host', 'nach dem Anmelden schon');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select join_event((select id from ev));
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select join_event((select id from ev));
select pg_temp.assert((my_events()->'events'->0->'joined'->>'m')::int = 2, 'Männerhälfte jetzt voll');
reset role;
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000c6');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000c6', 'Kai', '2002-02-01', 'm', '{f}', 1, 50.58, 8.68, 'admitted');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c6');
select pg_temp.assert(pg_temp.fails($$select join_event((select id from ev))$$), 'volle Hälfte ist nicht buchbar');
select pg_temp.assert(pg_temp.fails($$select send_event_message((select id from ev), 'Hi')$$), 'Gruppenchat nur für Teilnehmende');
reset role;

-- Gruppenchat und Absagen -----------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select send_event_message((select id from ev), 'Ich komme etwas später!');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select pg_temp.assert(my_events()->'events'->0->'messages'->0->>'name' = 'Lea', 'alle Teilnehmenden lesen mit');
select leave_event((select id from ev));
select pg_temp.assert(not (my_events()->'events'->0->>'mine')::boolean, 'absagen gibt den Platz frei');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(pg_temp.fails($$select leave_event((select id from ev))$$), 'der Gastgeber kann nicht absagen');
reset role;

-- Einladung -----------------------------------------------------------------------------
insert into likes (from_id, to_id, decision) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2', 'like'),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c1', 'like');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
create temp table inv as select create_event('Picknick', 'Draußen', 'Lahnwiesen', 'Sonntag', now() + interval '3 days', 10, 0, 'invite', null, false,
  array['00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000c3']::uuid[]) as id;
grant select on inv to authenticated;
select pg_temp.assert((select e->'invitees' from jsonb_array_elements(my_events()->'events') e where e->>'id' = (select id from inv)) = '["Lea"]',
  'einladen kann man nur eigene Matches');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select pg_temp.assert(pg_temp.fails($$select join_event((select id from inv))$$), 'ohne Einladung kein Platz');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select join_event((select id from inv));
reset role;

-- Nach dem Event ---------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select pg_temp.assert(pg_temp.fails($$select review_event((select id from ev), 5, '', null)$$), 'bewerten erst nach dem Event');
reset role;
update events set starts_at = now() - interval '1 day' where id = (select id::bigint from ev);
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c3');
select pg_temp.assert(jsonb_array_length(my_events()->'past') = 1, 'vorbei: es steht im Rückblick');
select pg_temp.assert(review_event((select id from ev), 5, 'Super Runde', array['00000000-0000-0000-0000-0000000000c1']::uuid[]) = '[]',
  'ein einseitiger Wunsch bleibt verborgen');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(review_event((select id from ev), 4, '', array['00000000-0000-0000-0000-0000000000c3']::uuid[]) = '["00000000-0000-0000-0000-0000000000c3"]',
  'gegenseitig: ein Match');
select pg_temp.assert(exists (select from jsonb_array_elements(my_matches()) m where m->>'name' = 'Mia'), 'Mia steht bei den Matches');
select pg_temp.assert(pg_temp.fails($$select review_event((select id from ev), 4, '', null)$$), 'nur einmal bewerten');
select pg_temp.assert((select e->'host'->'ratings' from jsonb_array_elements(my_events()->'events') e where e->>'id' = (select id from inv)) = '[5]',
  'die Bewertung zählt beim Gastgeber, die eigene nicht');
reset role;

-- Blockieren --------------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c2');
select block_user('00000000-0000-0000-0000-0000000000c1');
select pg_temp.assert(jsonb_array_length(my_events()->'events') = 0, 'Events blockierter Gastgeber verschwinden');
reset role;

-- Testbetrieb: Events der Beispielprofile ------------------------------------------------------
update beta_settings set enabled = true;
insert into auth.users (id) select ('00000000-0000-0000-0000-0000000006' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 10) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, is_sample)
  select ('00000000-0000-0000-0000-0000000006' || lpad(i::text, 2, '0'))::uuid, 'Probe' || i, '2003-01-01',
         case when i <= 6 then 'f' else 'm' end, case when i <= 6 then '{m}' else '{f}' end::text[], 1, 50.58, 8.68, 'admitted', true
  from generate_series(1, 10) i;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000c4');
select beta_reset_me();
select beta_reset_me();
select pg_temp.assert((select count(*) from jsonb_array_elements(my_events()->'events') e where (e->>'tonight')::boolean) = 1,
  'ein Event für heute Abend, auch nach zweimal Zurücksetzen');
select pg_temp.assert(jsonb_array_length(my_events()->'past') = 1, 'ein vergangener Abend zum Bewerten');
select pg_temp.assert((select bool_and(e->>'address' <> '') from jsonb_array_elements(my_events()->'events') e where e->'host'->>'name' like 'Probe%'),
  'jedes Beispiel-Event hat eine Adresse für die Karten-App');
select pg_temp.assert(jsonb_array_length(review_event(my_events()->'past'->0->>'id', 5, '',
  array(select (p->>'id')::uuid from jsonb_array_elements(my_events()->'past'->0->'attendees') p where p->>'gender' = 'f'))) = 2,
  'zwei Beispielprofile möchten die Testperson wiedersehen');
reset role;

rollback;

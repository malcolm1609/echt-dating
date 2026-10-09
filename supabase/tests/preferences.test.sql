\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Berlin', 52.52, 13.405, 30, 1000);
-- Lea (29) sucht Männer; Max ist zu jung für sie, Ole findet sie zu alt, Fern wohnt 15 km weg und will höchstens 10.
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000007a'), ('00000000-0000-0000-0000-00000000007b'),
  ('00000000-0000-0000-0000-00000000007c'), ('00000000-0000-0000-0000-00000000007d'), ('00000000-0000-0000-0000-00000000007e');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at, goal, age_min, age_max, max_distance_km) values
  ('00000000-0000-0000-0000-00000000007a', 'Lea',  date_trunc('year', now()) - interval '29 years' - interval '1 day', 'f', '{m}', 1, 52.52, 13.40, 'admitted', now(), 'fest', 25, 40, 30),
  ('00000000-0000-0000-0000-00000000007b', 'Max',  date_trunc('year', now()) - interval '22 years' - interval '1 day', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now(), 'fest', 18, 99, 30),
  ('00000000-0000-0000-0000-00000000007c', 'Ole',  date_trunc('year', now()) - interval '31 years' - interval '1 day', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now(), 'fest', 20, 28, 30),
  ('00000000-0000-0000-0000-00000000007d', 'Fern', date_trunc('year', now()) - interval '31 years' - interval '1 day', 'm', '{f}', 1, 52.655, 13.40, 'admitted', now(), 'fest', 18, 99, 10),
  ('00000000-0000-0000-0000-00000000007e', 'Ben',  date_trunc('year', now()) - interval '31 years' - interval '1 day', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now(), 'fest', 18, 99, 30);

select pg_temp.as_user('00000000-0000-0000-0000-00000000007a');
select pg_temp.assert((select array_agg(display_name) from public_profiles) = '{Ben}', 'nur wer beidseitig in Alter und Entfernung passt');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000007b');
select pg_temp.assert(not exists (select from public_profiles where display_name = 'Lea'), 'Altersfilter gilt auch andersherum');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000007d');
select pg_temp.assert(not exists (select from public_profiles where display_name = 'Lea'), 'Entfernung: die kürzere von beiden gilt');
update profiles set age_min = 30, age_max = 45, max_distance_km = 20 where id = auth.uid();
select pg_temp.assert((select age_min from profiles where id = auth.uid()) = 30, 'eigene Wünsche sind änderbar');
reset role;

do $$ begin
  update profiles set age_min = 17 where display_name = 'Lea';
  raise exception 'FAILED: unter 18 gespeichert';
exception when check_violation then raise notice 'ok - Altersgrenze ab 18';
end $$;
do $$ begin
  update profiles set max_distance_km = 500 where display_name = 'Lea';
  raise exception 'FAILED: beliebige Entfernung gespeichert';
exception when check_violation then raise notice 'ok - höchstens 100 km';
end $$;
do $$ begin
  update profiles set max_distance_km = 12 where display_name = 'Lea';
  raise exception 'FAILED: krumme Entfernung gespeichert';
exception when check_violation then raise notice 'ok - nur 5-km-Schritte';
end $$;

-- Weiter als der Gebietsradius (30 km): Wer beidseitig 60 km zulässt, sieht sich trotzdem.
update profiles set max_distance_km = 60, age_min = 18, age_max = 99 where display_name in ('Lea', 'Fern');
update profiles set lat = 52.92 where display_name = 'Fern';
select pg_temp.as_user('00000000-0000-0000-0000-00000000007a');
select pg_temp.assert(exists (select from public_profiles where display_name = 'Fern' and distance_km > 30), 'auch über den Gebietsradius hinaus');
reset role;
update profiles set lat = 52.655 where display_name = 'Fern';

-- Reihenfolge: 8 passende Männer mit gleichem Ziel; Fan passt schlechter, hat Lea aber schon geliked.
update profiles set age_min = 18, age_max = 99, max_distance_km = 30;
insert into auth.users (id) select ('00000000-0000-0000-0000-0000000008' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 9) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at, goal)
  select ('00000000-0000-0000-0000-0000000008' || lpad(i::text, 2, '0'))::uuid, case when i = 9 then 'Fan' else 'M' || i end,
         '1994-01-01', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now() - interval '4 days', case when i = 9 then 'freundschaft' else 'fest' end
  from generate_series(1, 9) i;
insert into likes (from_id, to_id, decision) values ('00000000-0000-0000-0000-000000000809', '00000000-0000-0000-0000-00000000007a', 'like');

select pg_temp.as_user('00000000-0000-0000-0000-00000000007a');
select pg_temp.assert(exists (select from todays_picks() where display_name = 'Fan'), 'wer mich geliked hat, bekommt einen Platz');
select pg_temp.assert((select display_name from todays_picks() limit 1) in ('Ben', 'Ole', 'Fern', 'Max'), 'gleiches Ziel und kürzlich aktiv steht vorne');
select pg_temp.assert(not exists (
  select from information_schema.columns where table_name = 'public_profiles' and column_name in ('liked_me', 'score')), 'wer mich geliked hat, bleibt unsichtbar');
reset role;

-- Ben wurde heute schon 12-mal bewertet und pausiert bis morgen.
insert into auth.users (id) select ('00000000-0000-0000-0000-0000000009' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 12) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at)
  select ('00000000-0000-0000-0000-0000000009' || lpad(i::text, 2, '0'))::uuid, 'F' || i, '1994-01-01', 'f', '{m}', 1, 52.52, 13.40, 'admitted', now()
  from generate_series(1, 12) i;
insert into likes (from_id, to_id, decision)
  select ('00000000-0000-0000-0000-0000000009' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-00000000007e', 'pass' from generate_series(1, 12) i;
-- Leas Vorschläge für heute stehen schon fest; geprüft wird die Berechnung für jemanden, der erst jetzt öffnet.
delete from daily_picks;
select pg_temp.as_user('00000000-0000-0000-0000-00000000007a');
select pg_temp.assert(not exists (select from todays_picks() where display_name = 'Ben'), 'wer heute schon oft gezeigt wurde, pausiert bis morgen');
reset role;

rollback;

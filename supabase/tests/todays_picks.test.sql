\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Berlin', 52.52, 13.405, 30, 1000);
insert into auth.users values ('00000000-0000-0000-0000-00000000001a'), ('00000000-0000-0000-0000-00000000001b');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at) values
  ('00000000-0000-0000-0000-00000000001a', 'Lea', '1997-03-03', 'f', '{m}', 1, 52.52, 13.40, 'admitted', now()),
  ('00000000-0000-0000-0000-00000000001b', 'Wartende', '1997-03-03', 'f', '{m}', 1, 52.52, 13.40, 'waitlisted', now());
insert into auth.users select ('00000000-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 8) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at)
  select ('00000000-0000-0000-0000-0000000002' || lpad(i::text, 2, '0'))::uuid, 'M' || i, '1992-01-01', 'm', '{f}', 1, 52.5 + i / 100.0, 13.40, 'admitted', now()
  from generate_series(1, 8) i;

select pg_temp.as_user('00000000-0000-0000-0000-00000000001a');
create temp table first_round as select row_number() over () as n, id from todays_picks();
select pg_temp.assert((select count(*) from first_round) = 6, 'höchstens 6 Vorschläge pro Tag');
select pg_temp.assert(
  (select array_agg(id) from todays_picks()) = (select array_agg(id order by n) from first_round),
  'Neu laden ergibt dieselben Vorschläge in derselben Reihenfolge');

insert into likes (from_id, to_id, decision) select auth.uid(), id, 'pass' from first_round where n <= 2;
select pg_temp.assert((select count(*) from todays_picks()) = 4, 'nach 2 Entscheidungen bleiben 4');
select pg_temp.assert(
  (select id from todays_picks() limit 1) = (select id from first_round where n = 3),
  'es geht mit dem nächsten Vorschlag weiter');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000001b');
select pg_temp.assert((select count(*) from todays_picks()) = 0, 'Warteliste bekommt keine Vorschläge');
reset role;

rollback;

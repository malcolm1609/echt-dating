\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Berlin', 52.52, 13.405, 30, 1000);
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000aa');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000aa', 'Ich', '1995-01-01', 'f', '{m}', null, 52.52, 13.40, 'waitlisted');
insert into auth.users (id) select ('00000000-0000-0000-0000-000000000' || lpad(i::text, 3, '0'))::uuid from generate_series(100, 299) i;
-- 50 heute aktiv in der Nähe, dazu Gestrige, Pausierte und Entfernte, die nicht zählen.
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at, paused)
  select ('00000000-0000-0000-0000-000000000' || lpad(i::text, 3, '0'))::uuid, 'P' || i, '1994-01-01', 'm', '{f}', 1,
         case when i >= 280 then 53.5 else 52.52 end, 13.40, 'admitted',
         case when i between 150 and 199 then now() - interval '2 days' else now() end,
         i between 200 and 279
  from generate_series(100, 299) i;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000aa');
select pg_temp.assert(active_nearby() is null, 'unter 51 Aktiven bleibt die Zahl verborgen');
reset role;
update profiles set paused = false where display_name like 'P2%' and display_name < 'P250';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000aa');
select pg_temp.assert(active_nearby() = 50, '100 Aktive in der Nähe ergeben „über 50“, Gestrige und Entfernte zählen nicht');
reset role;
update profiles set last_active_at = now() where display_name like 'P1%';
select pg_temp.as_user('00000000-0000-0000-0000-0000000000aa');
select pg_temp.assert(active_nearby() = 100, '150 Aktive ergeben „über 100“');
reset role;

rollback;

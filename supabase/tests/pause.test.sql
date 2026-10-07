\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Berlin', 52.52, 13.405, 30, 1000);
insert into auth.users values ('00000000-0000-0000-0000-00000000003a'), ('00000000-0000-0000-0000-00000000003b');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at) values
  ('00000000-0000-0000-0000-00000000003a', 'Ida', '1996-01-01', 'f', '{m}', 1, 52.52, 13.40, 'admitted', now()),
  ('00000000-0000-0000-0000-00000000003b', 'Tim', '1994-01-01', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now());

select pg_temp.as_user('00000000-0000-0000-0000-00000000003b');
update profiles set paused = true where id = auth.uid();
select pg_temp.assert((select count(*) from todays_picks()) = 0, 'wer pausiert, bekommt keine Vorschläge');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000003a');
select pg_temp.assert((select count(*) from public_profiles where display_name = 'Tim') = 0, 'pausierte Profile werden niemandem gezeigt');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000003b');
update profiles set paused = false where id = auth.uid();
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000003a');
select pg_temp.assert((select count(*) from public_profiles where display_name = 'Tim') = 1, 'nach der Pause wieder sichtbar');
reset role;

rollback;

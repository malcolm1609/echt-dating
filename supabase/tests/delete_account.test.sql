\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000d1', 'Tom', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted'),
  ('00000000-0000-0000-0000-0000000000d2', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted');
insert into likes (from_id, to_id, decision) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000d2', 'like'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000d1', 'like');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000d1');
select create_event('Pub-Quiz', 'Spiele', 'Pub', 'Morgen', now() + interval '1 day', 10, 0, 'open', null, false, null);
select delete_my_account();
reset role;
select pg_temp.assert(not exists (select from profiles where id = '00000000-0000-0000-0000-0000000000d1'), 'Profil ist weg');
select pg_temp.assert(not exists (select from matches), 'Matches sind weg');
select pg_temp.assert(not exists (select from events), 'eigene Events sind weg');
select pg_temp.assert(exists (select from profiles where id = '00000000-0000-0000-0000-0000000000d2'), 'andere bleiben');

rollback;

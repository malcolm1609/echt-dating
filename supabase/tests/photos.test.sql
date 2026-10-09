\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) values ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000e1', 'Tom', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted'),
  ('00000000-0000-0000-0000-0000000000e2', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted');

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

insert into approved_photos (path, user_id, group_photo, checked_by) values
  ('00000000-0000-0000-0000-0000000000e2/a1b2.jpg', '00000000-0000-0000-0000-0000000000e2', false, 'test'),
  ('00000000-0000-0000-0000-0000000000e2/c3d4.png', '00000000-0000-0000-0000-0000000000e2', false, 'test'),
  ('00000000-0000-0000-0000-0000000000e2/gruppe1.jpg', '00000000-0000-0000-0000-0000000000e2', true, 'test'),
  ('00000000-0000-0000-0000-0000000000e2/gruppe2.jpg', '00000000-0000-0000-0000-0000000000e2', true, 'test');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
select pg_temp.assert(pg_temp.fails($$update profiles set photos = array['00000000-0000-0000-0000-0000000000e2/ungeprueft.jpg'] where id = auth.uid()$$),
  'nur geprüfte Fotos');
select pg_temp.assert(pg_temp.fails($$update profiles set photos = array['00000000-0000-0000-0000-0000000000e2/a1b2.jpg', '00000000-0000-0000-0000-0000000000e2/gruppe1.jpg', '00000000-0000-0000-0000-0000000000e2/gruppe2.jpg'] where id = auth.uid()$$),
  'höchstens ein Gruppenfoto');
select pg_temp.assert(pg_temp.fails($$update profiles set photos = array['00000000-0000-0000-0000-0000000000e2/gruppe1.jpg', '00000000-0000-0000-0000-0000000000e2/a1b2.jpg'] where id = auth.uid()$$),
  'Hauptfoto ist kein Gruppenfoto');
update profiles set photos = array['00000000-0000-0000-0000-0000000000e2/a1b2.jpg', '00000000-0000-0000-0000-0000000000e2/gruppe1.jpg'] where id = auth.uid();
update profiles set photos = array['00000000-0000-0000-0000-0000000000e2/a1b2.jpg', '00000000-0000-0000-0000-0000000000e2/c3d4.png'] where id = auth.uid();
select pg_temp.assert(pg_temp.fails($$update profiles set photos = array['00000000-0000-0000-0000-0000000000e1/fremd.jpg'] where id = auth.uid()$$),
  'nur Fotos aus dem eigenen Ordner');
select pg_temp.assert(pg_temp.fails($$update profiles set photos = array['https://example.com/x.jpg'] where id = auth.uid()$$),
  'keine fremden Bild-Adressen');
select pg_temp.assert(pg_temp.fails($$update profiles set photos = array_fill('00000000-0000-0000-0000-0000000000e2/a.jpg'::text, array[7]) where id = auth.uid()$$),
  'höchstens 6 Fotos');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
select pg_temp.assert((select photos[1] from todays_picks() where id = '00000000-0000-0000-0000-0000000000e2') = '00000000-0000-0000-0000-0000000000e2/a1b2.jpg',
  'Vorschläge zeigen die Fotos in Reihenfolge');
reset role;

rollback;

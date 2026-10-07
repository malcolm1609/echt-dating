-- Läuft als Superuser; wechselt per set_config/set role in die Sicht einzelner Nutzer.
\set ON_ERROR_STOP 1
begin;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), -- Anna, zugelassen, aktiv
  ('00000000-0000-0000-0000-00000000000b'), -- Ben, zugelassen, aktiv
  ('00000000-0000-0000-0000-00000000000c'), -- Carl, zugelassen, 10 Tage inaktiv
  ('00000000-0000-0000-0000-00000000000d'); -- Dora, auf der Warteliste

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Berlin', 52.52, 13.405, 30, 1000);

insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at) values
  ('00000000-0000-0000-0000-00000000000a', 'Anna', '1998-01-01', 'f', '{m}', 1, 52.52, 13.40, 'admitted', now()),
  ('00000000-0000-0000-0000-00000000000b', 'Ben',  '1996-01-01', 'm', '{f}', 1, 52.50, 13.42, 'admitted', now()),
  ('00000000-0000-0000-0000-00000000000c', 'Carl', '1995-01-01', 'm', '{f}', 1, 52.51, 13.41, 'admitted', now() - interval '10 days'),
  ('00000000-0000-0000-0000-00000000000d', 'Dora', '1999-01-01', 'f', '{m}', 1, 52.53, 13.39, 'waitlisted', now());

create function pg_temp.as_user(uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', uid, true);
  execute 'set local role authenticated';
end $$;

create function pg_temp.assert(ok boolean, msg text) returns void language plpgsql as $$
begin
  if not coalesce(ok, false) then raise exception 'FAILED: %', msg; end if;
  raise notice 'ok - %', msg;
end $$;

-- Sichtbarkeit
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.assert((select count(*) from public_profiles where id = '00000000-0000-0000-0000-00000000000b') = 1, 'zugelassene Person sieht passende aktive Profile');
select pg_temp.assert((select count(*) from public_profiles where id = '00000000-0000-0000-0000-00000000000d') = 0, 'Wartelisten-Profile sind unsichtbar');
select pg_temp.assert((select count(*) from profiles) = 1, 'Rohdaten (Geburtsdatum, Standort) nur vom eigenen Profil lesbar');
select pg_temp.assert((select count(*) from public_profiles where id = '00000000-0000-0000-0000-00000000000c') = 0, 'inaktive Profile (> 7 Tage) sind unsichtbar');
do $$ begin
  perform from verifications;
  raise exception 'FAILED: Prüfergebnisse lesbar';
exception when insufficient_privilege then raise notice 'ok - Prüfergebnisse sind für Nutzer nicht lesbar';
end $$;
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.assert((select count(*) from public_profiles) = 0, 'Person auf der Warteliste bekommt keine Vorschläge');
select pg_temp.assert((select position from my_waitlist_position) = 1, 'Wartelistenplatz ist abrufbar');
reset role;

-- Status ist nicht selbst änderbar
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
do $$ begin
  update profiles set status = 'admitted' where id = auth.uid();
  raise exception 'FAILED: Status durfte selbst geändert werden';
exception when insufficient_privilege then raise notice 'ok - Status ist nicht selbst änderbar';
end $$;
update profiles set bio = 'Hallo' where id = auth.uid();
reset role;
select pg_temp.assert((select bio from profiles where display_name = 'Dora') = 'Hallo', 'eigenes Profil ist bearbeitbar');

-- Likes und Match
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into likes (from_id, to_id, decision) values (auth.uid(), '00000000-0000-0000-0000-00000000000b', 'like');
select pg_temp.assert((select count(*) from matches) = 0, 'einseitiges Like ergibt kein Match');
do $$ begin
  insert into likes (from_id, to_id, decision) values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'like');
  raise exception 'FAILED: Like im Namen anderer möglich';
exception when insufficient_privilege then raise notice 'ok - Likes nur im eigenen Namen';
end $$;
do $$ begin
  insert into likes (from_id, to_id, decision) values (auth.uid(), '00000000-0000-0000-0000-00000000000c', 'like');
  raise exception 'FAILED: Like an unsichtbares Profil möglich';
exception when insufficient_privilege then raise notice 'ok - keine Likes an unsichtbare Profile';
end $$;
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into likes (from_id, to_id, decision) values (auth.uid(), '00000000-0000-0000-0000-00000000000a', 'like');
select pg_temp.assert((select count(*) from matches) = 1, 'gegenseitiges Like ergibt ein Match');
select pg_temp.assert((select used from my_picks_today) = 1, 'Tageszähler zählt eigene Entscheidungen');
reset role;

-- Tageslimit von 6 Entscheidungen
insert into auth.users select ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 6) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at)
  select ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, 'M' || i, '1990-01-01', 'm', '{f}', 1, 52.52, 13.40, 'admitted', now()
  from generate_series(1, 6) i;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into likes (from_id, to_id, decision)
  select auth.uid(), ('00000000-0000-0000-0000-0000000001' || lpad(i::text, 2, '0'))::uuid, 'pass' from generate_series(1, 5) i;
do $$ begin
  insert into likes (from_id, to_id, decision) values (auth.uid(), '00000000-0000-0000-0000-000000000106', 'pass');
  raise exception 'FAILED: mehr als 6 Entscheidungen pro Tag möglich';
exception when check_violation then raise notice 'ok - höchstens 6 Entscheidungen pro Tag';
end $$;
reset role;

-- Meldungen sperren ab 3
insert into auth.users values ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e1');
insert into reports (reporter_id, reported_id, reason) values (auth.uid(), '00000000-0000-0000-0000-00000000000b', 'spam');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000e2');
insert into reports (reporter_id, reported_id, reason) values (auth.uid(), '00000000-0000-0000-0000-00000000000b', 'spam');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
insert into reports (reporter_id, reported_id, reason) values (auth.uid(), '00000000-0000-0000-0000-00000000000b', 'spam');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.assert((select count(*) from public_profiles where display_name = 'Ben') = 0, 'ab 3 offenen Meldungen unsichtbar');
reset role;

-- Gebietsstatistik für die Zulassung
select pg_temp.assert((select f = 1 and m = 8 from area_stats where area_id = 1), 'area_stats zählt nur zugelassene Personen');

rollback;

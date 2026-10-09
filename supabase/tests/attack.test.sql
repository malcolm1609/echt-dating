-- Angriffe aus dem Angriffstest vom 9. Oktober 2026. Jeder davon hat vorher funktioniert und muss jetzt scheitern.
\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

insert into areas (id, name, lat, lng, radius_km, capacity) values
  (1, 'Gießen', 50.5841, 8.6784, 30, 1000), (2, 'Frankfurt', 50.1109, 8.6821, 30, 1000);
insert into auth.users (id, phone_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000a1', now()), ('00000000-0000-0000-0000-0000000000a2', now()),
  ('00000000-0000-0000-0000-0000000000a3', now()), ('00000000-0000-0000-0000-0000000000a4', now()),
  ('00000000-0000-0000-0000-0000000000a9', null);
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at) values
  ('00000000-0000-0000-0000-0000000000a1', 'Tom', '2002-05-01', 'm', '{f}', 1, 50.58, 8.68, 'admitted', now()),
  ('00000000-0000-0000-0000-0000000000a2', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted', now()),
  ('00000000-0000-0000-0000-0000000000a3', 'Mia', '2003-02-01', 'f', '{m}', 2, 50.11, 8.68, 'admitted', now()),
  ('00000000-0000-0000-0000-0000000000a4', 'Ana', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted', now());

-- 1. Profile mit Wegwerf-Konten verstecken ---------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a9');
select pg_temp.assert(pg_temp.fails($$insert into reports (reporter_id, reported_id, reason) values (auth.uid(), '00000000-0000-0000-0000-0000000000a2', 'fake')$$),
  'Meldungen nicht mehr direkt in die Tabelle');
select pg_temp.assert(pg_temp.fails($$select report_user('00000000-0000-0000-0000-0000000000a2', 'fake')$$),
  'Konto ohne zugelassenes Profil kann nicht melden');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.assert(pg_temp.fails($$select report_user('00000000-0000-0000-0000-0000000000a3', 'fake')$$),
  'nur Leute melden, die man in der App gesehen hat');
select report_user('00000000-0000-0000-0000-0000000000a2', 'harassment');
reset role;
select pg_temp.assert((select count(*) from reports) = 1, 'Meldung gegen einen Vorschlag klappt');

-- 2. Warteliste umgehen, indem man nach der Zulassung den Standort verschiebt ------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.assert(pg_temp.fails($$update profiles set lat = 50.11, lng = 8.68 where id = auth.uid()$$),
  'nach der Zulassung kein Umzug in einen anderen Landkreis');
update profiles set lat = 50.59, lng = 8.67 where id = auth.uid();
select pg_temp.assert((select lat from profiles where id = auth.uid()) = 50.59, 'innerhalb des Landkreises geht es');
reset role;

-- 3. Unter 18 ---------------------------------------------------------------------------------
select pg_temp.assert(pg_temp.fails($$insert into profiles (id, display_name, birthdate, gender, seeking, lat, lng)
  values ('00000000-0000-0000-0000-0000000000a9', 'Kid', current_date - interval '15 years', 'f', '{m}', 50.58, 8.68)$$),
  'Profile unter 18 lehnt der Server ab');
select pg_temp.assert(pg_temp.fails($$insert into profiles (id, display_name, birthdate, gender, seeking, lat, lng)
  values ('00000000-0000-0000-0000-0000000000a9', 'Alt', '1850-01-01', 'f', '{m}', 50.58, 8.68)$$),
  'unmögliches Geburtsdatum');

-- 4. Social Media über Song und Interessen -----------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.assert(pg_temp.fails($$update profiles set music = '{"provider":"spotify","kind":"track","url":"https://open.spotify.com/track/abc","title":"insta: tom_gi"}' where id = auth.uid()$$),
  'kein Social Media im Songtitel');
select pg_temp.assert(pg_temp.fails($$update profiles set interests = '{Kaffee,"snap: tommy"}' where id = auth.uid()$$),
  'kein Social Media in den Interessen');
update profiles set interests = '{Kaffee,Kino}' where id = auth.uid();
reset role;

-- 5. Nachricht vor der Fragenrunde über „Freundlich beenden“ ----------------------------------
insert into matches (user_a, user_b) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a4');
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select end_match('00000000-0000-0000-0000-0000000000a4', 'Ruf mich an: 0151 2345 6789');
reset role;
select pg_temp.assert((select body from messages) not like '%0151%', 'vor der Fragenrunde nur der feste Abschiedsgruß');

rollback;

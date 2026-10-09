\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) select ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid from generate_series(1, 13) i;
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status)
  select ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, 'P' || i, '2002-05-01',
         case when i % 2 = 0 then 'f' else 'm' end, case when i % 2 = 0 then '{m}'::text[] else '{f}'::text[] end,
         1, 50.584123, 8.678456, 'admitted'
  from generate_series(1, 13) i;

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- Standort ------------------------------------------------------------------------
select pg_temp.assert((select lat = 50.58 and lng = 8.68 from profiles where id = '00000000-0000-0000-0000-000000000001'),
  'Standort wird beim Anlegen grob gespeichert');
select pg_temp.as_user('00000000-0000-0000-0000-000000000001');
update profiles set lat = 50.601234, lng = 8.654321 where id = auth.uid();
reset role;
select pg_temp.assert((select lat = 50.6 and lng = 8.65 from profiles where id = '00000000-0000-0000-0000-000000000001'),
  'Standort wird beim Ändern grob gespeichert');

-- Längen --------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-000000000002');
select pg_temp.assert(pg_temp.fails($$update profiles set bio = repeat('x', 501) where id = auth.uid()$$), 'Profiltext höchstens 500 Zeichen');
select pg_temp.assert(pg_temp.fails($$update profiles set display_name = repeat('x', 51) where id = auth.uid()$$), 'Name höchstens 50 Zeichen');
select pg_temp.assert(pg_temp.fails($$insert into reports (reporter_id, reported_id, reason) values (auth.uid(), '00000000-0000-0000-0000-000000000003', repeat('x', 5000))$$),
  'nur bekannte Meldegründe');
reset role;

-- Nachrichten ---------------------------------------------------------------------
insert into matches (user_a, user_b) values ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
insert into messages (match_id, sender_id, body)
  select (select id from matches limit 1), '00000000-0000-0000-0000-000000000001', 'Nachricht ' || i from generate_series(1, 20) i;
select pg_temp.assert(pg_temp.fails($$insert into messages (match_id, sender_id, body) values ((select id from matches limit 1), '00000000-0000-0000-0000-000000000001', 'eine zu viel')$$),
  'höchstens 20 Nachrichten pro Minute');
insert into messages (match_id, sender_id, body) values ((select id from matches limit 1), '00000000-0000-0000-0000-000000000002', 'Die andere Person darf antworten');

-- Events --------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-000000000003');
select create_event('Runde ' || i, 'Spiele', 'Pub', 'Morgen', now() + interval '1 day', 10, 0, 'open', null, false, null) from generate_series(1, 5) i;
select pg_temp.assert(pg_temp.fails($$select create_event('Noch eine', 'Spiele', 'Pub', 'Morgen', now() + interval '1 day', 10, 0, 'open', null, false, null)$$),
  'höchstens 5 kommende Events');
reset role;

-- Meldungen -----------------------------------------------------------------------
-- Alle haben P4 schon einmal gesehen (ein Like an P4), sonst darf P4 sie nicht melden.
insert into likes (from_id, to_id, decision)
  select ('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, '00000000-0000-0000-0000-000000000004', 'pass'
  from generate_series(1, 13) i where i <> 4;
select pg_temp.as_user('00000000-0000-0000-0000-000000000004');
select report_user(('00000000-0000-0000-0000-0000000000' || lpad(i::text, 2, '0'))::uuid, 'spam') from generate_series(3, 12) i where i <> 4;
select report_user('00000000-0000-0000-0000-000000000001', 'spam');
select pg_temp.assert(pg_temp.fails($$select report_user('00000000-0000-0000-0000-000000000013', 'spam')$$), 'höchstens 10 Meldungen pro Tag');
reset role;

rollback;

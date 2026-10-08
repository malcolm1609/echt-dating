\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000b1'), ('00000000-0000-0000-0000-0000000000b2'),
  ('00000000-0000-0000-0000-0000000000b3'), ('00000000-0000-0000-0000-0000000000b4'),
  ('00000000-0000-0000-0000-0000000000b5');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000b1', 'Tom', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted'),
  ('00000000-0000-0000-0000-0000000000b2', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000b3', 'Fake', '2001-01-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000b4', 'Ben', '2002-01-01', 'm', '{f}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000b5', 'Jan', '2002-01-01', 'm', '{f}', 1, 50.58, 8.68, 'admitted');
insert into likes (from_id, to_id, decision) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000b2', 'like'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', 'like');

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- Neu-Hinweise ------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert((my_matches()->0->>'unread')::boolean, 'ein frisches Match ist neu');
select mark_read('00000000-0000-0000-0000-0000000000b2');
select pg_temp.assert(not (my_matches()->0->>'unread')::boolean, 'nach dem Ansehen nicht mehr');
reset role;

insert into match_answers (match_id, user_id, question_key, answer, created_at)
  select id, '00000000-0000-0000-0000-0000000000b2', '0-0', 'Leas Antwort', now() + interval '1 minute' from matches;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert((my_matches()->0->>'unread')::boolean, 'eine Antwort der anderen Person ist neu');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.assert((my_matches()->0->>'unread')::boolean, 'für Lea ist das Match auch neu');
select mark_read('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert(not (my_matches()->0->>'unread')::boolean, 'die eigene Antwort macht nichts neu');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b3');
select pg_temp.assert(pg_temp.fails($$select mark_read('00000000-0000-0000-0000-0000000000b1')$$),
  'ohne Match nichts als gelesen markieren');
reset role;

-- Melden ------------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert(exists (select from public_profiles where id = '00000000-0000-0000-0000-0000000000b3'),
  'Tom sieht Fake in den Vorschlägen');
select pg_temp.assert(pg_temp.fails($$select report_user('00000000-0000-0000-0000-0000000000b3', 'egal')$$),
  'nur feste Gründe');
select report_user('00000000-0000-0000-0000-0000000000b3', 'fake');
select report_user('00000000-0000-0000-0000-0000000000b3', 'fake');
select pg_temp.assert(not exists (select from public_profiles where id = '00000000-0000-0000-0000-0000000000b3'),
  'nach dem Melden ist Fake für Tom weg');
select pg_temp.assert(pg_temp.fails($$select * from reports$$), 'Meldungen sind nicht lesbar');
reset role;
select pg_temp.assert((select count(*) from reports where reported_id = '00000000-0000-0000-0000-0000000000b3') = 1,
  'doppelte Meldung zählt einmal');

select pg_temp.as_user('00000000-0000-0000-0000-0000000000b4');
select report_user('00000000-0000-0000-0000-0000000000b3', 'spam');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b5');
select pg_temp.assert(exists (select from public_profiles where id = '00000000-0000-0000-0000-0000000000b3'),
  'nach 2 Meldungen sehen andere Fake noch');
select report_user('00000000-0000-0000-0000-0000000000b3', 'harassment');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.assert(not exists (select from public_profiles where id = '00000000-0000-0000-0000-0000000000b3'),
  'ab 3 Meldungen ist Fake für alle gesperrt');
reset role;

-- Blockieren --------------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b2');
select pg_temp.assert(pg_temp.fails($$select block_user('00000000-0000-0000-0000-0000000000b2')$$),
  'sich selbst blockieren geht nicht');
select block_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert(jsonb_array_length(my_matches()) = 0, 'das Match ist für Lea weg');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000b1');
select pg_temp.assert(jsonb_array_length(my_matches()) = 0, 'und für Tom auch');
select pg_temp.assert(pg_temp.fails($$select answer_question('00000000-0000-0000-0000-0000000000b2', '0-0', 'Hallo?')$$),
  'Tom kann Lea nichts mehr schicken');
reset role;

rollback;

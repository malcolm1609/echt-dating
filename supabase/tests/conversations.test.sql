\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'), ('00000000-0000-0000-0000-0000000000a3');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000a1', 'Tom', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted'),
  ('00000000-0000-0000-0000-0000000000a2', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000a3', 'Fremd', '2001-01-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted');
insert into likes (from_id, to_id, decision) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2', 'like'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1', 'like');

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

-- Fragenrunde --------------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.assert(jsonb_array_length(my_matches()) = 1, 'Tom sieht sein Match');
select pg_temp.assert(my_matches()->0->>'name' = 'Lea', 'mit Name der anderen Person');
select pg_temp.assert(pg_temp.fails($$select answer_question('00000000-0000-0000-0000-0000000000a2', '1-0', 'zu früh')$$),
  'Runde 2 ist zu, solange Runde 1 nicht fertig ist');
select answer_question('00000000-0000-0000-0000-0000000000a2', '0-0', 'Toms Antwort');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select pg_temp.assert(my_matches()->0->'answers' = '{}', 'Lea sieht Toms Antwort erst nach ihrer eigenen');
select answer_question('00000000-0000-0000-0000-0000000000a1', '0-0', 'Leas Antwort');
select pg_temp.assert(my_matches()->0->'answers'->'0-0'->>'theirs' = 'Toms Antwort', 'danach ist sie sichtbar');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000a3');
select pg_temp.assert(jsonb_array_length(my_matches()) = 0, 'Fremde sehen keine fremden Matches');
select pg_temp.assert(pg_temp.fails($$select answer_question('00000000-0000-0000-0000-0000000000a1', '0-1', 'x')$$),
  'und können ohne Match nicht antworten');
select pg_temp.assert(pg_temp.fails($$select * from messages$$), 'Tabellen sind nicht direkt lesbar');
reset role;

-- Chat erst nach allen Runden ------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select pg_temp.assert(pg_temp.fails($$select send_message('00000000-0000-0000-0000-0000000000a2', 'Hallo')$$),
  'Chat ist zu, solange die Fragenrunde läuft');
select answer_question('00000000-0000-0000-0000-0000000000a2', '0-1', 'T');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select answer_question('00000000-0000-0000-0000-0000000000a1', '0-1', 'L');
reset role;
-- Runden 2 und 3 nacheinander für beide
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select answer_question('00000000-0000-0000-0000-0000000000a2', '1-0', 'T'), answer_question('00000000-0000-0000-0000-0000000000a2', '1-1', 'T');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select answer_question('00000000-0000-0000-0000-0000000000a1', '1-0', 'L'), answer_question('00000000-0000-0000-0000-0000000000a1', '1-1', 'L');
select answer_question('00000000-0000-0000-0000-0000000000a1', '2-0', 'L'), answer_question('00000000-0000-0000-0000-0000000000a1', '2-1', 'L');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select answer_question('00000000-0000-0000-0000-0000000000a2', '2-0', 'T'), answer_question('00000000-0000-0000-0000-0000000000a2', '2-1', 'T');
select send_message('00000000-0000-0000-0000-0000000000a2', 'Hallo Lea');
select pg_temp.assert((my_matches()->0->'messages'->0->>'mine')::boolean, 'eigene Nachricht ist als meine markiert');
select pg_temp.assert(jsonb_array_length(my_matches()->0->'messages') = 1, 'echte Menschen antworten nicht automatisch');

-- Date ------------------------------------------------------------------------
select propose_date('00000000-0000-0000-0000-0000000000a2', 'Kaffee', 'Café', 'Samstag, 15 Uhr', false);
select accept_date('00000000-0000-0000-0000-0000000000a2');
select pg_temp.assert(not (my_matches()->0->'date'->>'accepted')::boolean, 'den eigenen Vorschlag kann man nicht selbst zusagen');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a2');
select accept_date('00000000-0000-0000-0000-0000000000a1');
select pg_temp.assert((my_matches()->0->'date'->>'accepted')::boolean, 'die andere Person sagt zu');
select pg_temp.assert(pg_temp.fails($$select beta_finish_date('00000000-0000-0000-0000-0000000000a1')$$),
  'Date vorspulen geht nur im Testbetrieb');
select pg_temp.assert(pg_temp.fails($$select answer_after_date('00000000-0000-0000-0000-0000000000a1', 'yes')$$),
  'Check danach erst nach dem Date');
select pg_temp.assert(pg_temp.fails($$select beta_verify()$$), 'Prüfung überspringen geht nur im Testbetrieb');
reset role;

-- Freundlich beenden -----------------------------------------------------------
select pg_temp.as_user('00000000-0000-0000-0000-0000000000a1');
select end_match('00000000-0000-0000-0000-0000000000a2', 'Alles Gute!');
select pg_temp.assert((my_matches()->0->>'ended')::boolean, 'beendet');
select pg_temp.assert(pg_temp.fails($$select send_message('00000000-0000-0000-0000-0000000000a2', 'Noch was')$$),
  'nach dem Beenden keine Nachrichten mehr');
reset role;

rollback;

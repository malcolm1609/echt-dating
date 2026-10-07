\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Berlin', 52.52, 13.405, 30, 1000);
insert into auth.users values
  ('00000000-0000-0000-0000-00000000005a'), ('00000000-0000-0000-0000-00000000005b'),
  ('00000000-0000-0000-0000-00000000005c'), ('00000000-0000-0000-0000-00000000005d');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at, goal, interests, prompts) values
  ('00000000-0000-0000-0000-00000000005a', 'Ich', '1996-01-01', 'f', '{m}', 1, 52.52, 13.40, 'admitted', now(), 'fest', '{Kochen}', '[]'),
  ('00000000-0000-0000-0000-00000000005b', 'Freund', '1994-01-01', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now(), 'freundschaft', '{}', '[]'),
  ('00000000-0000-0000-0000-00000000005c', 'Fest', '1994-01-01', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now(), 'fest', '{Kochen,Laufen}',
   '[{"prompt_id": "anknuepfen-1", "answer": "Der Kiosk an der Admiralbrücke."}]'),
  ('00000000-0000-0000-0000-00000000005d', 'Ernst', '1994-01-01', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now(), 'ernst', '{}', '[]');

select pg_temp.as_user('00000000-0000-0000-0000-00000000005a');
select pg_temp.assert(
  (select array_agg(display_name) from todays_picks()) = '{Fest,Ernst,Freund}',
  'Vorschläge mit passendem Beziehungsziel kommen zuerst');
select pg_temp.assert(
  (select prompts->0->>'answer' = 'Der Kiosk an der Admiralbrücke.' and goal = 'fest' and interests = '{Kochen,Laufen}'
   from todays_picks() where display_name = 'Fest'),
  'Vorschläge zeigen Fragen, Ziel und Interessen');
update profiles set goal = 'offen', interests = '{Kino}',
  prompts = '[{"prompt_id": "alltag-1", "answer": "Ausschlafen und Markt."}]' where id = auth.uid();
select pg_temp.assert((select goal from profiles where id = auth.uid()) = 'offen', 'eigene Fragen, Ziel und Interessen sind änderbar');
reset role;

do $$ begin
  update profiles set interests = '{a,b,c,d,e,f}' where display_name = 'Ich';
  raise exception 'FAILED: mehr als 5 Interessen gespeichert';
exception when check_violation then raise notice 'ok - höchstens 5 Interessen';
end $$;
do $$ begin
  update profiles set prompts = '[{"prompt_id": "alltag-1", "answer": ""}]' where display_name = 'Ich';
  raise exception 'FAILED: leere Antwort gespeichert';
exception when check_violation then raise notice 'ok - Antworten sind nicht leer';
end $$;
do $$ begin
  update profiles set goal = 'egal' where display_name = 'Ich';
  raise exception 'FAILED: unbekanntes Ziel gespeichert';
exception when check_violation then raise notice 'ok - nur bekannte Beziehungsziele';
end $$;

rollback;

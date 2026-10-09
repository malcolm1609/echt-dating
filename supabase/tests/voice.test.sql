\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Gießen', 50.5841, 8.6784, 30, 1000);
insert into auth.users (id) values
  ('00000000-0000-0000-0000-0000000000f1'), ('00000000-0000-0000-0000-0000000000f2'), ('00000000-0000-0000-0000-0000000000f3');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status) values
  ('00000000-0000-0000-0000-0000000000f1', 'Tom', '2002-05-01', 'm', '{f}', 1, 50.58, 8.67, 'admitted'),
  ('00000000-0000-0000-0000-0000000000f2', 'Lea', '2003-02-01', 'f', '{m}', 1, 50.58, 8.68, 'admitted'),
  ('00000000-0000-0000-0000-0000000000f3', 'Ben', '2002-01-01', 'm', '{f}', 1, 50.58, 8.68, 'admitted');
insert into likes (from_id, to_id, decision) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2', 'like'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1', 'like');

create function pg_temp.fails(stmt text) returns boolean language plpgsql as $$
begin
  execute stmt;
  return false;
exception when others then
  return true;
end $$;

\set tom_file '''00000000-0000-0000-0000-0000000000f1/memo1.m4a'''

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.assert(pg_temp.fails($$select send_voice('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1/memo1.m4a', 4000)$$),
  'vor der Fragenrunde keine Sprachmemos');
reset role;

-- Fragenrunde fertig: Chat offen.
insert into match_answers (match_id, user_id, question_key, answer)
  select m.id, u, r || '-' || q, 'Antwort' from matches m,
    unnest(array['00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000f2']::uuid[]) u,
    generate_series(0, 2) r, generate_series(0, 1) q;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f1');
select pg_temp.assert(pg_temp.fails($$select send_voice('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f2/fremd.m4a', 4000)$$),
  'nur eigene Dateien');
select pg_temp.assert(pg_temp.fails($$select send_voice('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000f1/lang.m4a', 61000)$$),
  'höchstens eine Minute');
select send_voice('00000000-0000-0000-0000-0000000000f2', :tom_file, 4200);
select pg_temp.assert((my_matches()->0->'messages'->-1->>'audio') = :tom_file, 'Sprachmemo im Verlauf');
select pg_temp.assert((my_matches()->0->'messages'->-1->>'duration_ms')::int = 4200, 'mit Länge');
select pg_temp.assert(can_hear(:tom_file), 'Tom hört sein eigenes Memo');
reset role;

select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select pg_temp.assert(can_hear(:tom_file), 'Lea hört Toms Memo');
reset role;
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f3');
select pg_temp.assert(not can_hear(:tom_file), 'Ben nicht');
reset role;

update matches set ended_at = now();
select pg_temp.as_user('00000000-0000-0000-0000-0000000000f2');
select pg_temp.assert(not can_hear(:tom_file), 'nach dem Beenden nicht mehr abspielbar');
reset role;

select pg_temp.assert(pg_temp.fails($$insert into messages (match_id, sender_id, body) select id, '00000000-0000-0000-0000-0000000000f1', '' from matches$$),
  'leere Textnachricht bleibt verboten');

rollback;

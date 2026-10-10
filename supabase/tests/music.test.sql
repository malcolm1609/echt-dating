\set ON_ERROR_STOP 1
begin;
\ir helpers.sql

insert into areas (id, name, lat, lng, radius_km, capacity) values (1, 'Berlin', 52.52, 13.405, 30, 1000);
insert into auth.users values ('00000000-0000-0000-0000-00000000006a'), ('00000000-0000-0000-0000-00000000006b');
insert into profiles (id, display_name, birthdate, gender, seeking, area_id, lat, lng, status, last_active_at, music) values
  ('00000000-0000-0000-0000-00000000006a', 'Ich', '1996-01-01', 'f', '{m}', 1, 52.52, 13.40, 'admitted', now(), null),
  ('00000000-0000-0000-0000-00000000006b', 'Jonas', '1994-01-01', 'm', '{f}', 1, 52.52, 13.41, 'admitted', now(),
   '{"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/4u7EnebtmKWzUH433cf5Qv", "title": "Bohemian Rhapsody"}');

select pg_temp.as_user('00000000-0000-0000-0000-00000000006a');
select pg_temp.assert((select music->>'title' from todays_picks() where display_name = 'Jonas') = 'Bohemian Rhapsody', 'Vorschläge zeigen den Lieblingssong');
update profiles set music = '{"provider": "apple", "kind": "playlist", "url": "https://music.apple.com/de/playlist/sonntag/pl.u-abc", "title": "Sonntag"}' where id = auth.uid();
select pg_temp.assert((select music->>'provider' from profiles where id = auth.uid()) = 'apple', 'eigener Song ist änderbar');
update profiles set music = null where id = auth.uid();
select pg_temp.assert((select music is null from profiles where id = auth.uid()), 'Song lässt sich entfernen');
reset role;

do $$ begin
  update profiles set music = '{"provider": "spotify", "kind": "track", "url": "https://evil.example/track/1", "title": "x"}' where display_name = 'Ich';
  raise exception 'FAILED: fremder Link gespeichert';
exception when check_violation then raise notice 'ok - nur Links von Spotify oder Apple Music';
end $$;
do $$ begin
  update profiles set music = '{"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/1", "title": ""}' where display_name = 'Ich';
  raise exception 'FAILED: Song ohne Titel gespeichert';
exception when check_violation then raise notice 'ok - Song braucht einen Titel';
end $$;

-- Top-Songs: bis zu drei als Liste.
select pg_temp.as_user('00000000-0000-0000-0000-00000000006a');
update profiles set music = '[
  {"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/1", "title": "Erster"},
  {"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/2", "title": "Zweiter"},
  {"provider": "apple", "kind": "track", "url": "https://music.apple.com/de/song/dritter/123", "title": "Dritter"}]' where id = auth.uid();
select pg_temp.assert((select jsonb_array_length(music) from profiles where id = auth.uid()) = 3, 'drei Top-Songs lassen sich speichern');
reset role;

do $$ begin
  update profiles set music = '[
    {"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/1", "title": "a"},
    {"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/2", "title": "b"},
    {"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/3", "title": "c"},
    {"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/4", "title": "d"}]' where display_name = 'Ich';
  raise exception 'FAILED: vier Songs gespeichert';
exception when check_violation then raise notice 'ok - höchstens drei Songs';
end $$;
do $$ begin
  update profiles set music = '[]' where display_name = 'Ich';
  raise exception 'FAILED: leere Liste gespeichert';
exception when check_violation then raise notice 'ok - keine leere Liste, dafür gibt es null';
end $$;
do $$ begin
  update profiles set music = '[{"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/1", "title": "a"}, "x"]' where display_name = 'Ich';
  raise exception 'FAILED: kaputter Eintrag gespeichert';
exception when check_violation then raise notice 'ok - jeder Eintrag muss ein Song sein';
end $$;
do $$ begin
  update profiles set music = '[{"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/1", "title": "a"}, {"provider": "spotify", "kind": "track", "url": "https://evil.example/2", "title": "b"}]' where display_name = 'Ich';
  raise exception 'FAILED: fremder Link im zweiten Song gespeichert';
exception when check_violation then raise notice 'ok - jeder Song wird geprüft';
end $$;
do $$ begin
  update profiles set music = '[{"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/1", "title": "a"}, {"provider": "spotify", "kind": "track", "url": "https://open.spotify.com/track/2", "title": "insta: tom_gi"}]' where display_name = 'Ich';
  raise exception 'FAILED: Kontaktdaten im zweiten Songtitel gespeichert';
exception when check_violation then raise notice 'ok - Kontaktdaten in jedem Songtitel abgefangen';
end $$;

rollback;

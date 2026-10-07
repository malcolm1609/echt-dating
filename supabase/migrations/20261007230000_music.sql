-- Lieblingssong oder Playlist als öffentlicher Link (src/domain/music.ts). Keine Kontoverbindung.

create function valid_music(m jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select m is null or (
    m->>'provider' in ('spotify', 'apple')
    and m->>'kind' in ('track', 'album', 'playlist', 'artist')
    and (m->>'url' ~ '^https://open\.spotify\.com/(track|album|playlist|artist)/[A-Za-z0-9]+$'
      or m->>'url' ~ '^https://music\.apple\.com/[a-z]{2}/')
    and length(trim(coalesce(m->>'title', ''))) between 1 and 80)
$$;

alter table profiles add column music jsonb check (valid_music(music));
grant insert (music), update (music) on profiles to authenticated;
grant execute on function valid_music to authenticated;

create or replace view public_profiles as
  select t.id, t.display_name, date_part('year', age(t.birthdate))::int as age, t.gender, t.bio,
         round(distance_km(me.lat, me.lng, t.lat, t.lng))::int as distance_km,
         t.goal, t.prompts, t.interests, goal_fit(me.goal, t.goal) as goal_fit, t.music
  from profiles me
  join areas a on a.id = me.area_id
  join profiles t on t.id <> me.id
  where me.id = auth.uid()
    and is_discoverable(me)
    and is_discoverable(t)
    and t.gender = any(me.seeking) and me.gender = any(t.seeking)
    and distance_km(me.lat, me.lng, t.lat, t.lng) <= a.radius_km
    and not exists (select from likes l where l.from_id = me.id and l.to_id = t.id);

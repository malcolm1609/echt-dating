-- Für viele Personen: Bisher hat jede Vorschlagsliste für jedes Profil der Datenbank die Entfernung berechnet
-- und für jedes Profil alle Likes durchsucht (es gab keinen Index auf „wer wurde geliked“). Mit 10.000 Personen
-- wird das langsam. Jetzt kommen nur Profile im Umkreis in Frage (Vorfilter über Breiten-/Längengrad mit Index),
-- und Likes, Matches, Blockierungen und Meldungen lassen sich von beiden Seiten aus schnell finden.

create index if not exists likes_to on likes (to_id, created_at);
create index if not exists matches_user_b on matches (user_b);
create index if not exists blocks_blocked on blocks (blocked_id);
create index if not exists reports_open on reports (reported_id) where status = 'open';
create index if not exists profiles_lat on profiles (lat);

create or replace view public_profiles as
  select t.id, t.display_name, date_part('year', age(t.birthdate))::int as age, t.gender, t.bio,
         round(distance_km(me.lat, me.lng, t.lat, t.lng))::int as distance_km,
         t.goal, t.prompts, t.interests, goal_fit(me.goal, t.goal) as goal_fit, t.music, t.photos
  from profiles me
  join profiles t on t.id <> me.id
    -- Grobes Rechteck um den eigenen Umkreis (1 Breitengrad ≈ 111 km), genau gerechnet wird danach.
    and t.lat between me.lat - me.max_distance_km / 111.0 and me.lat + me.max_distance_km / 111.0
    and t.lng between me.lng - me.max_distance_km / (111.0 * cos(radians(me.lat)))
                  and me.lng + me.max_distance_km / (111.0 * cos(radians(me.lat)))
  where me.id = auth.uid()
    and t.gender = any(me.seeking) and me.gender = any(t.seeking)
    and date_part('year', age(t.birthdate)) between me.age_min and me.age_max
    and date_part('year', age(me.birthdate)) between t.age_min and t.age_max
    and distance_km(me.lat, me.lng, t.lat, t.lng) <= least(me.max_distance_km, t.max_distance_km)
    and is_discoverable(me)
    and is_discoverable(t)
    and not exists (select from likes l where l.from_id = me.id and l.to_id = t.id)
    and not exists (select from blocks b where (b.blocker_id = me.id and b.blocked_id = t.id)
                                          or (b.blocker_id = t.id and b.blocked_id = me.id));

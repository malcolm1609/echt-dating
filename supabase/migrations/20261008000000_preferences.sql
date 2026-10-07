-- Präferenzen und Regeln für die Tagesvorschläge (src/domain/preferences.ts, src/domain/ranking.ts).
-- Harte Filter gelten beidseitig: Alter und Entfernung. Alles andere ändert nur die Reihenfolge.

alter table profiles
  add column age_min int not null default 18,
  add column age_max int not null default 99,
  add column max_distance_km int not null default 30,
  add constraint preferences_valid check (
    age_min >= 18 and age_max <= 99 and age_min <= age_max and max_distance_km in (5, 10, 20, 30));

grant insert (age_min, age_max, max_distance_km), update (age_min, age_max, max_distance_km) on profiles to authenticated;

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
    and date_part('year', age(t.birthdate)) between me.age_min and me.age_max
    and date_part('year', age(me.birthdate)) between t.age_min and t.age_max
    and distance_km(me.lat, me.lng, t.lat, t.lng) <= least(a.radius_km, me.max_distance_km, t.max_distance_km)
    and not exists (select from likes l where l.from_id = me.id and l.to_id = t.id);

-- Punkte: gleiches Ziel 3, nah dran 1; gemeinsame Interessen je 1 (max. 3); in den letzten 2 Tagen aktiv 2.
-- Ein Platz für jemanden, der mich schon geliked hat (bleibt verborgen), einer für die diese Woche am
-- seltensten Gezeigten. Wer heute schon 12-mal bewertet wurde, pausiert bis morgen.
-- Bewusst nicht: wie oft jemand geliked wird. Läuft als Eigentümer, weil fremde Likes nur gezählt werden.
create or replace function todays_picks() returns setof public_profiles
language sql stable security definer set search_path = public as $$
  with me as (select interests from profiles where id = auth.uid()),
  c as (
    select p.*,
      (array[0, 1, 3])[p.goal_fit + 1]
        + least(3, cardinality(array(select unnest(p.interests) intersect select unnest(me.interests))))
        + case when t.last_active_at > now() - interval '2 days' then 2 else 0 end as score,
      exists (select from likes l where l.from_id = p.id and l.to_id = auth.uid() and l.decision = 'like') as liked_me,
      (select count(*) from likes l where l.to_id = p.id and l.created_at > now() - interval '7 days') as shown_week,
      (select count(*) from likes l where l.to_id = p.id and l.created_at >= day_start()) as shown_today,
      md5(p.id::text || auth.uid()::text || day_start()::text) as h
    from public_profiles p join profiles t on t.id = p.id cross join me
  ),
  open as (select * from c where shown_today < 12),
  fan as (select id from open where liked_me order by score desc, h limit 1),
  quiet as (select id from open where id not in (select id from fan) order by shown_week, score desc, h limit 1),
  chosen as (
    select * from open
    order by id in (select id from fan) desc, id in (select id from quiet) desc, score desc, h
    limit (select remaining from my_picks_today)
  )
  select id, display_name, age, gender, bio, distance_km, goal, prompts, interests, goal_fit, music
  from chosen order by score desc, h
$$;

revoke execute on function todays_picks from public, anon;
grant execute on function todays_picks to authenticated;

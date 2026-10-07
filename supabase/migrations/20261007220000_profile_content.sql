-- Profilinhalt: drei Fragen mit Antwort, Beziehungsziel, bis zu fünf Interessen (src/domain/profileContent.ts).

create function valid_prompts(p jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 3
     and not exists (
       select from jsonb_array_elements(p) e
       where jsonb_typeof(e->'prompt_id') is distinct from 'string'
          or length(trim(coalesce(e->>'answer', ''))) not between 1 and 160)
$$;

alter table profiles
  add column prompts jsonb not null default '[]' check (valid_prompts(prompts)),
  add column goal text check (goal in ('fest', 'ernst', 'offen', 'freundschaft')),
  add column interests text[] not null default '{}' check (cardinality(interests) <= 5);

grant insert (prompts, goal, interests), update (prompts, goal, interests) on profiles to authenticated;

-- 2 = gleiches Ziel, 1 = nah dran, 0 = passt kaum (wie goalFit in der App).
create function goal_fit(a text, b text) returns int
language sql immutable set search_path = '' as $$
  select coalesce(greatest(0, 2 - abs(
    array_position(array['fest', 'ernst', 'offen', 'freundschaft'], a) -
    array_position(array['fest', 'ernst', 'offen', 'freundschaft'], b))), 0)
$$;

create or replace view public_profiles as
  select t.id, t.display_name, date_part('year', age(t.birthdate))::int as age, t.gender, t.bio,
         round(distance_km(me.lat, me.lng, t.lat, t.lng))::int as distance_km,
         t.goal, t.prompts, t.interests, goal_fit(me.goal, t.goal) as goal_fit
  from profiles me
  join areas a on a.id = me.area_id
  join profiles t on t.id <> me.id
  where me.id = auth.uid()
    and is_discoverable(me)
    and is_discoverable(t)
    and t.gender = any(me.seeking) and me.gender = any(t.seeking)
    and distance_km(me.lat, me.lng, t.lat, t.lng) <= a.radius_km
    and not exists (select from likes l where l.from_id = me.id and l.to_id = t.id);

-- Wer dasselbe sucht, kommt zuerst; innerhalb gleicher Passung bleibt die Reihenfolge pro Tag stabil.
create or replace function todays_picks() returns setof public_profiles
language sql stable set search_path = public as $$
  select p.* from public_profiles p
  order by p.goal_fit desc, md5(p.id::text || auth.uid()::text || day_start()::text)
  limit (select remaining from my_picks_today)
$$;

grant execute on function goal_fit, valid_prompts to authenticated;

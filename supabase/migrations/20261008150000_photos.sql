-- Profilfotos: 1 bis 6 Bilder, das erste ist das Hauptfoto. Die Dateien liegen in Supabase Storage im
-- Bucket „photos“, jede Person nur in ihrem eigenen Ordner (<user-id>/<zufall>.jpg). In profiles steht nur
-- die Reihenfolge der Pfade. Beispielprofile im Testbetrieb dürfen Platzhalter-Adressen (https) nutzen.
-- Noch offen: Hauptfoto mit dem Selfie aus der Ausweisprüfung abgleichen; Bucket ist öffentlich lesbar,
-- die Pfade sind aber zufällig und nirgends aufgelistet.

create function valid_photos(owner uuid, sample boolean, photos text[]) returns boolean
language sql immutable as $$
  select cardinality(photos) <= 6
     and coalesce(bool_and(p ~ ('^' || owner::text || '/[a-z0-9-]+\.(jpg|jpeg|png|webp)$')
                           or (sample and p like 'https://%')), true)
  from unnest(photos) p
$$;

alter table profiles
  add column photos text[] not null default '{}',
  add constraint photos_valid check (valid_photos(id, is_sample, photos));

grant insert (photos), update (photos) on profiles to authenticated;

create or replace view public_profiles as
  select t.id, t.display_name, date_part('year', age(t.birthdate))::int as age, t.gender, t.bio,
         round(distance_km(me.lat, me.lng, t.lat, t.lng))::int as distance_km,
         t.goal, t.prompts, t.interests, goal_fit(me.goal, t.goal) as goal_fit, t.music, t.photos
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

-- Wie in 20261008000000_preferences.sql, nur mit Fotos in der Ausgabe.
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
  select id, display_name, age, gender, bio, distance_km, goal, prompts, interests, goal_fit, music, photos
  from chosen order by score desc, h
$$;

-- Speicher (nur auf Supabase; die lokalen Tests haben kein storage-Schema).
do $do$
begin
  if not exists (select from pg_namespace where nspname = 'storage') then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('photos', 'photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  execute $p$create policy "eigene Fotos hochladen" on storage.objects for insert to authenticated
    with check (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "eigene Fotos löschen" on storage.objects for delete to authenticated
    using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
end $do$;

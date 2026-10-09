-- Umkreis per Schieberegler: 5 bis 100 km in 5-km-Schritten statt fester Stufen bis 30 km.
-- In kleinen Unistädten war die Auswahl sonst zu klein; so sehen sich z. B. Gießen, Marburg und Wetzlar.
-- Der Gebietsradius bleibt für Zulassung und Warteliste zuständig, begrenzt aber nicht mehr die Vorschläge.

alter table profiles drop constraint preferences_valid;
alter table profiles alter column max_distance_km set default 50;
alter table profiles add constraint preferences_valid check (
  age_min >= 18 and age_max <= 99 and age_min <= age_max
  and max_distance_km between 5 and 100 and max_distance_km % 5 = 0);

create or replace view public_profiles as
  select t.id, t.display_name, date_part('year', age(t.birthdate))::int as age, t.gender, t.bio,
         round(distance_km(me.lat, me.lng, t.lat, t.lng))::int as distance_km,
         t.goal, t.prompts, t.interests, goal_fit(me.goal, t.goal) as goal_fit, t.music, t.photos
  from profiles me
  join profiles t on t.id <> me.id
  where me.id = auth.uid()
    and is_discoverable(me)
    and is_discoverable(t)
    and t.gender = any(me.seeking) and me.gender = any(t.seeking)
    and date_part('year', age(t.birthdate)) between me.age_min and me.age_max
    and date_part('year', age(me.birthdate)) between t.age_min and t.age_max
    and distance_km(me.lat, me.lng, t.lat, t.lng) <= least(me.max_distance_km, t.max_distance_km)
    and not exists (select from likes l where l.from_id = me.id and l.to_id = t.id)
    and not exists (select from blocks b where (b.blocker_id = me.id and b.blocked_id = t.id)
                                          or (b.blocker_id = t.id and b.blocked_id = me.id));

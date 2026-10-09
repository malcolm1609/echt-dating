-- Gefunden im Beta-Test: Seit die Vorschläge des Tages gemerkt werden, zeigte todays_picks nach 6 Entscheidungen
-- noch die übrigen gemerkten Vorschläge, wenn ein Teil der Entscheidungen nicht auf diese Vorschläge fiel.
-- Ist das Tageslimit erreicht, gibt es keine Vorschläge mehr.

create or replace function todays_picks() returns setof public_profiles
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today timestamptz := day_start();
  picked uuid[];
begin
  if me is null then return; end if;
  if (select remaining from my_picks_today) <= 0 then return; end if;
  select ids into picked from daily_picks where user_id = me and day = today;
  if picked is null then
    select coalesce(array_agg(id order by n), '{}') into picked from pick_candidates() with ordinality x(id, n);
    -- Leere Listen nicht merken: wer später am Tag zugelassen wird oder die Pause beendet, bekommt dann Vorschläge.
    if cardinality(picked) > 0 then
      insert into daily_picks (user_id, day, ids) values (me, today, picked) on conflict (user_id, day) do nothing;
      delete from daily_picks where user_id = me and day < today;
    end if;
  end if;
  return query select p.* from public_profiles p where p.id = any(picked) order by array_position(picked, p.id);
end $$;

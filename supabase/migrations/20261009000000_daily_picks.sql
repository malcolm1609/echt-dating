-- Gefunden im Stadttest mit 10.000 Personen: Die Vorschläge wurden bei jedem Öffnen der App neu berechnet,
-- für jede Person in der Nähe mit Punkten und Zählungen. Schon bei 250 Leuten gleichzeitig lief der Server
-- damit voll. Jetzt:
-- 1. Die 6 Vorschläge des Tages werden beim ersten Öffnen berechnet und für den Tag gemerkt. Danach ist
--    das Laden nur noch ein Nachschlagen. (Wer entschieden, pausiert, blockiert oder gemeldet wurde,
--    fällt trotzdem sofort heraus, weil weiter über public_profiles gefiltert wird.)
-- 2. Die Berechnung selbst zählt die teuren „wie oft gezeigt“-Werte nur noch für die 100 besten
--    Kandidaten nach den einfachen Punkten, nicht mehr für alle in der Nähe.

create table daily_picks (
  user_id uuid not null references profiles on delete cascade,
  day timestamptz not null,
  ids uuid[] not null,
  primary key (user_id, day)
);
alter table daily_picks enable row level security;
revoke all on daily_picks from anon, authenticated;

create function pick_candidates() returns setof uuid
language sql stable security definer set search_path = public as $$
  with me as (select interests from profiles where id = auth.uid()),
  base as (
    select p.id,
      (array[0, 1, 3])[p.goal_fit + 1]
        + least(3, cardinality(array(select unnest(p.interests) intersect select unnest(me.interests))))
        + case when t.last_active_at > now() - interval '2 days' then 2 else 0 end as score,
      exists (select from likes l where l.from_id = p.id and l.to_id = auth.uid() and l.decision = 'like') as liked_me,
      md5(p.id::text || auth.uid()::text || day_start()::text) as h
    from public_profiles p join profiles t on t.id = p.id cross join me
  ),
  -- Fans immer dabei, sonst die 100 mit den meisten Punkten.
  short as (select * from base order by liked_me desc, score desc, h limit 100),
  c as (
    select s.*,
      (select count(*) from likes l where l.to_id = s.id and l.created_at > now() - interval '7 days') as shown_week,
      (select count(*) from likes l where l.to_id = s.id and l.created_at >= day_start()) as shown_today
    from short s
  ),
  open as (select * from c where shown_today < 12),
  fan as (select id from open where liked_me order by score desc, h limit 1),
  quiet as (select id from open where id not in (select id from fan) order by shown_week, score desc, h limit 1),
  chosen as (
    select * from open
    order by id in (select id from fan) desc, id in (select id from quiet) desc, score desc, h
    limit (select remaining from my_picks_today)
  )
  select id from chosen order by score desc, h
$$;

create or replace function todays_picks() returns setof public_profiles
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today timestamptz := day_start();
  picked uuid[];
begin
  if me is null then return; end if;
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

-- Werden Likes gelöscht (Testdaten zurücksetzen, Konto löschen), gelten die gemerkten Vorschläge nicht mehr.
create function forget_daily_picks() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from daily_picks where user_id in (old.from_id, old.to_id);
  return old;
end $$;
create trigger likes_forget_picks after delete on likes for each row execute function forget_daily_picks();

revoke execute on function pick_candidates, forget_daily_picks from public, anon, authenticated;
grant execute on function todays_picks to authenticated;

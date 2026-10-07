-- Tagesvorschläge: stabile Reihenfolge pro Person und Tag, höchstens so viele wie heute noch übrig sind.
create function todays_picks() returns setof public_profiles
language sql stable set search_path = public as $$
  select p.* from public_profiles p
  order by md5(p.id::text || auth.uid()::text || day_start()::text)
  limit (select remaining from my_picks_today)
$$;

revoke execute on function todays_picks from public, anon;
grant execute on function todays_picks to authenticated;

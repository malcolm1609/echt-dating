-- „Heute in deiner Nähe aktiv“ (src/domain/activeNearby.ts): erst ab 50 Personen, grob abgerundet,
-- damit niemand mitzählen kann. Zählt Zugelassene im Umkreis, die heute in der App waren.
create function active_nearby() returns int
language sql stable security definer set search_path = public as $$
  with n as (
    select count(*)::int as c
    from profiles me
    left join areas a on a.id = me.area_id
    join profiles t on t.id <> me.id
    where me.id = auth.uid()
      and t.status = 'admitted' and not t.paused
      and t.last_active_at >= day_start()
      and distance_km(me.lat, me.lng, t.lat, t.lng) <= coalesce(a.radius_km, 30)
  )
  select case
    when c <= 50 then null
    when c <= 100 then (c - 1) / 50 * 50
    when c <= 1000 then (c - 1) / 100 * 100
    else (c - 1) / 1000 * 1000
  end from n
$$;

revoke execute on function active_nearby from public, anon;
grant execute on function active_nearby to authenticated;

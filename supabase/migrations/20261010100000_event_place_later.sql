-- Treffpunkt erst später zeigen (Malcolm, 2026-10-10): Vorher sieht man nur Art und Stadt. Name und
-- Adresse des Treffpunkts bekommen nur Leute, die zugesagt haben, sobald die Gruppe voll ist, spätestens
-- 3 Stunden vor Beginn (bei „Heute Abend“ 1 Stunde). Der Gastgeber sieht sie immer.
-- Ältere App-Versionen bekommen leere Texte statt null, damit sie nicht abstürzen.

create function event_reveal_at(e events) returns timestamptz
language sql immutable as $$
  select e.starts_at - case when e.tonight then interval '1 hour' else interval '3 hours' end
$$;

create function event_place_shown(e events, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select e.host_id = p_user
    or exists (select from event_attendees a where a.event_id = e.id and a.user_id = p_user)
       and (now() >= event_reveal_at(e) or (select count(*) from event_attendees a where a.event_id = e.id) >= e.seats)
$$;
revoke execute on function event_reveal_at, event_place_shown from public, anon, authenticated;

create or replace function my_events() returns jsonb
language sql stable security definer set search_path = public as $$
  with me as (select * from profiles where id = auth.uid() and status = 'admitted')
  select jsonb_build_object(
    'events', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id::text, 'title', e.title, 'kind', e.kind, 'when', e.when_text, 'starts_at', e.starts_at,
        'place', case when v.shown then e.place else '' end,
        'address', case when v.shown then e.address else '' end,
        'hidden', not v.shown, 'reveal_at', event_reveal_at(e), 'area', (select name from areas where id = e.area_id),
        'seats', e.seats, 'price', e.price, 'access', e.access, 'campus', e.campus, 'tonight', e.tonight,
        'joined', jsonb_build_object(
          'f', (select count(*) from event_attendees where event_id = e.id and gender = 'f'),
          'm', (select count(*) from event_attendees where event_id = e.id and gender = 'm')),
        'host', event_host(e.host_id),
        'is_host', e.host_id = me.id,
        'mine', exists (select from event_attendees where event_id = e.id and user_id = me.id),
        'invited', exists (select from event_invites where event_id = e.id and user_id = me.id),
        'invitees', case when e.host_id = me.id then (
          select coalesce(jsonb_agg(p.display_name), '[]') from event_invites i join profiles p on p.id = i.user_id
          where i.event_id = e.id) end,
        'people', case when exists (select from event_attendees where event_id = e.id and user_id = me.id)
          then event_people(e.id) end,
        'messages', case when exists (select from event_attendees where event_id = e.id and user_id = me.id) then (
          select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'mine', m.sender_id = me.id, 'name', p.display_name,
                   'text', m.body, 'at', m.created_at) order by m.created_at, m.id), '[]')
          from event_messages m join profiles p on p.id = m.sender_id where m.event_id = e.id) end
      ) order by e.tonight desc, e.starts_at), '[]')
      from events e cross join me cross join lateral (select event_place_shown(e, me.id) as shown) v
      where e.area_id = me.area_id and not event_over(e) and not blocked_between(me.id, e.host_id)),
    'past', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id::text, 'title', e.title, 'when', e.when_text, 'place', e.place, 'address', e.address,
        'host', (select display_name from profiles where id = e.host_id),
        'attendees', event_people(e.id),
        'review', (select jsonb_build_object('stars', r.stars, 'text', r.body, 'mutual', (
                     select coalesce(jsonb_agg(w.to_id), '[]') from event_wishes w
                     where w.event_id = e.id and w.from_id = auth.uid()
                       and exists (select from event_wishes back where back.event_id = e.id and back.from_id = w.to_id and back.to_id = auth.uid())))
                   from event_reviews r where r.event_id = e.id and r.user_id = auth.uid())
      ) order by e.starts_at desc), '[]')
      from events e join event_attendees a on a.event_id = e.id and a.user_id = auth.uid()
      where event_over(e) and e.starts_at > now() - interval '14 days')
  )
$$;

-- Melden, Blockieren und „Neu“-Hinweise.
-- Blockieren wirkt in beide Richtungen: Die Personen sehen sich nicht mehr in den Vorschlägen,
-- das Match verschwindet für beide, und keiner kann dem anderen noch schreiben.
-- Melden blockiert immer mit; ab 3 offenen Meldungen greift die Sperre aus is_discoverable().

create table blocks (
  blocker_id uuid not null references profiles on delete cascade,
  blocked_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

-- Bis wann jemand ein Match zuletzt angesehen hat; alles danach von der anderen Person ist neu.
create table match_reads (
  match_id bigint not null references matches on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table blocks enable row level security;
alter table match_reads enable row level security;
revoke all on blocks, match_reads from anon, authenticated;

create function blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

-- Wie bisher, nur ohne blockierte Personen. Über die Sicht laufen auch Likes und todays_picks().
-- Die Sicht liest blocks als Eigentümer; Funktionen darin würden mit den Rechten der App laufen.
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
    and not exists (select from likes l where l.from_id = me.id and l.to_id = t.id)
    and not exists (select from blocks b where (b.blocker_id = me.id and b.blocked_id = t.id)
                                          or (b.blocker_id = t.id and b.blocked_id = me.id));

-- Alle Schreib-Funktionen gehen über match_with(): Nach dem Blockieren gibt es kein Match mehr.
create or replace function match_with(other uuid) returns matches
language plpgsql stable security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches
  where user_a = least(auth.uid(), other) and user_b = greatest(auth.uid(), other);
  if m.id is null or blocked_between(auth.uid(), other) then
    raise exception 'no match' using errcode = 'insufficient_privilege';
  end if;
  return m;
end $$;

-- Wie bisher, dazu „unread“: Das Match ist neu oder die andere Person hat seit dem letzten Ansehen
-- geschrieben, geantwortet oder ein Date vorgeschlagen. Blockierte Matches fehlen.
create or replace function my_matches() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(m order by last_at desc), '[]') from (
    select greatest(x.created_at, (select max(created_at) from messages where match_id = x.id)) as last_at,
      jsonb_build_object(
        'id', o.id,
        'name', o.display_name,
        'age', date_part('year', age(o.birthdate))::int,
        'prompts', o.prompts,
        'interests', o.interests,
        'ended', x.ended_at is not null,
        'unread', r.read_at is null
          or exists (select from messages where match_id = x.id and sender_id = o.id and created_at > r.read_at)
          or exists (select from match_answers where match_id = x.id and user_id = o.id and created_at > r.read_at)
          or exists (select from match_dates where match_id = x.id and proposed_by = o.id and created_at > r.read_at),
        'answers', (
          select coalesce(jsonb_object_agg(mine.question_key, jsonb_build_object('mine', mine.answer, 'theirs', theirs.answer)), '{}')
          from match_answers mine
          left join match_answers theirs on theirs.match_id = x.id and theirs.user_id = o.id and theirs.question_key = mine.question_key
          where mine.match_id = x.id and mine.user_id = auth.uid()),
        'messages', (
          select coalesce(jsonb_agg(jsonb_build_object('id', id, 'mine', sender_id = auth.uid(), 'text', body, 'at', created_at) order by created_at, id), '[]')
          from messages where match_id = x.id),
        'date', (
          select jsonb_build_object('idea', idea, 'place', place, 'when', when_text, 'reserved', reserved,
                                    'accepted', accepted, 'past', past, 'mine', proposed_by = auth.uid())
          from match_dates where match_id = x.id),
        'after_date', (
          select jsonb_build_object('mine', mine.answer, 'theirs', theirs.answer)
          from after_date mine
          left join after_date theirs on theirs.match_id = x.id and theirs.user_id = o.id
          where mine.match_id = x.id and mine.user_id = auth.uid())
      ) as m
    from matches x
    join profiles o on o.id = case when x.user_a = auth.uid() then x.user_b else x.user_a end
    left join match_reads r on r.match_id = x.id and r.user_id = auth.uid()
    where auth.uid() in (x.user_a, x.user_b)
      and not blocked_between(x.user_a, x.user_b)
  ) s
$$;

create function mark_read(other uuid) returns void
language sql security definer set search_path = public as $$
  insert into match_reads (match_id, user_id) values ((match_with(other)).id, auth.uid())
  on conflict (match_id, user_id) do update set read_at = now()
$$;

create function block_user(other uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if other = auth.uid() or not exists (select from profiles where id = other) then
    raise exception 'unknown user' using errcode = 'check_violation';
  end if;
  insert into blocks (blocker_id, blocked_id) values (auth.uid(), other) on conflict do nothing;
end $$;

-- Gemeldet werden kann jede Person, die man in der App gesehen hat; doppelte Meldungen zählen einmal.
create function report_user(other uuid, reason text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if reason not in ('fake', 'harassment', 'inappropriate', 'spam', 'underage', 'other') then
    raise exception 'unknown reason' using errcode = 'check_violation';
  end if;
  perform block_user(other);
  insert into reports (reporter_id, reported_id, reason) values (auth.uid(), other, reason) on conflict do nothing;
end $$;

-- Testbetrieb: Zurücksetzen hebt auch Blockaden und Meldungen zwischen mir und Beispielprofilen auf.
create or replace function beta_reset_me() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not beta_enabled() then raise exception 'beta disabled' using errcode = 'insufficient_privilege'; end if;
  delete from blocks where (blocker_id = auth.uid() and blocked_id in (select id from profiles where is_sample))
                        or (blocked_id = auth.uid() and blocker_id in (select id from profiles where is_sample));
  delete from reports where reporter_id = auth.uid() and reported_id in (select id from profiles where is_sample);
  perform beta_prepare_tester(auth.uid());
end $$;

revoke execute on function blocked_between, mark_read, block_user, report_user from public;
grant execute on function mark_read, block_user, report_user to authenticated;

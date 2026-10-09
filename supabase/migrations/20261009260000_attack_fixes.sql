-- Lücken aus dem Angriffstest vom 9. Oktober 2026 (Bericht: /mnt/project-files/sicherheit/angriffstest-2026-10-09.md).

-- 1. Profile verstecken mit Wegwerf-Konten: Bisher konnte jedes Konto, auch ohne Profil und Prüfung, direkt in
--    „reports“ schreiben. Drei Meldungen verstecken ein Profil. Jetzt geht Melden nur noch über report_user,
--    nur als zugelassene Person und nur gegen jemanden, mit dem man in der App zu tun hatte.
drop policy if exists "im eigenen Namen melden" on reports;
revoke insert on reports from anon, authenticated;

create or replace function report_user(other uuid, reason text) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if reason not in ('fake', 'harassment', 'inappropriate', 'spam', 'underage', 'other') then
    raise exception 'unknown reason' using errcode = 'check_violation';
  end if;
  if not exists (select from profiles where id = me and status = 'admitted') then
    raise exception 'not admitted' using errcode = 'insufficient_privilege';
  end if;
  -- Gesehen hat man jemanden als Vorschlag, als Match, über ein Like, bei einem gemeinsamen Event
  -- oder man hat die Person schon blockiert.
  if not (
    exists (select from public_profiles where id = other)
    or exists (select from blocks where blocker_id = me and blocked_id = other)
    or exists (select from matches where (user_a = me and user_b = other) or (user_a = other and user_b = me))
    or exists (select from likes where (from_id = me and to_id = other) or (from_id = other and to_id = me))
    or exists (select from daily_picks where user_id = me and other = any(ids))
    or exists (select from event_attendees a join event_attendees b using (event_id) where a.user_id = me and b.user_id = other)
  ) then
    raise exception 'unknown user' using errcode = 'check_violation';
  end if;
  perform block_user(other);
  insert into reports (reporter_id, reported_id, reason) values (me, other, reason) on conflict do nothing;
end $$;

-- 2. Warteliste umgehen: Nach der Zulassung ließ sich der Standort in eine ganz andere Stadt verschieben.
--    Wer zugelassen ist oder wartet, bleibt im eigenen Landkreis. Bei einem Umzug hilft der Support.
create function stay_in_area() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Gilt für Änderungen durch die Person selbst; der Server (Support, Tests) darf umziehen.
  if current_setting('role', true) is distinct from 'authenticated' or new.area_id is null or new.status not in ('admitted', 'waitlisted') then
    return new;
  end if;
  if area_for(new.lat, new.lng) is distinct from new.area_id then
    raise exception 'outside area' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger stay_in_area before update of lat, lng on profiles
  for each row when (new.lat is distinct from old.lat or new.lng is distinct from old.lng)
  execute function stay_in_area();

-- 3. Mindestens 18: Bisher prüfte das nur die App und später der Ausweis. Jetzt auch der Server.
create function adults_only() returns trigger
language plpgsql set search_path = public as $$
begin
  if not new.is_sample and (new.birthdate > current_date - interval '18 years' or new.birthdate < date '1900-01-01') then
    raise exception 'underage' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger adults_only before insert or update of birthdate on profiles
  for each row execute function adults_only();

-- 4. Werbung fürs eigene Social Media ging noch über den Songtitel und die Interessen.
create or replace function block_contact_info() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.is_sample then return new; end if;
  if (tg_op = 'INSERT' or new.display_name is distinct from old.display_name) and has_contact_info(new.display_name)
     or (tg_op = 'INSERT' or new.bio is distinct from old.bio) and has_contact_info(new.bio)
     or (tg_op = 'INSERT' or new.prompts is distinct from old.prompts)
        and exists (select from jsonb_array_elements(new.prompts) e where has_contact_info(e->>'answer'))
     or (tg_op = 'INSERT' or new.music is distinct from old.music)
        and (has_contact_info(new.music->>'title') or has_contact_info(new.music->>'artist'))
     or (tg_op = 'INSERT' or new.interests is distinct from old.interests)
        and exists (select from unnest(new.interests) i where has_contact_info(i) or length(i) > 40) then
    raise exception 'contact info' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger block_contact_info on profiles;
create trigger block_contact_info before insert or update of display_name, bio, prompts, music, interests on profiles
  for each row execute function block_contact_info();

-- 5. Vor der Fragenrunde ließ sich über „Freundlich beenden“ ein beliebiger Text schicken (z. B. eine Nummer).
--    Dann geht jetzt nur der feste Abschiedsgruß.
create or replace function end_match(other uuid, goodbye text) returns void
language plpgsql security definer set search_path = public as $$
declare m matches := match_with(other);
begin
  if m.ended_at is not null then return; end if;
  insert into messages (match_id, sender_id, body) values (m.id, auth.uid(),
    case when chat_open(m.id) then trim(goodbye) else 'Danke für die Fragenrunde. Für mich passt es nicht ganz, alles Gute!' end);
  update matches set ended_at = now(), ended_by = auth.uid() where id = m.id;
end $$;

-- 6. Date-Check
-- 6a. Ort und Zeit werden beim Start festgehalten. Bisher konnte das Match sie danach per neuem Vorschlag ändern,
--     und die Vertrauensperson hätte den falschen Ort gesehen.
alter table date_checks add column place text, add column when_text text,
  -- Wie oft schon eine SMS wegen „keine Antwort“ rausging. Höchstens zweimal pro Check.
  add column overdue_alarms int not null default 0;

-- 6b. SMS nur an Handynummern aus Deutschland, Österreich und der Schweiz; dieselbe Nummer höchstens dreimal
--     am Tag als Vertrauensperson, egal von wem. Sonst ließe sich der Date-Check als SMS-Schleuder missbrauchen.
create or replace function start_date_check(other uuid, contact_name text, contact_phone text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  m matches := match_with(other);
  d match_dates;
  c date_checks;
begin
  select * into d from match_dates where match_id = m.id and accepted and not past;
  if d.match_id is null then raise exception 'no date' using errcode = 'check_violation'; end if;
  if contact_phone !~ '^\+(49|43|41)[1-9][0-9]{6,13}$' then
    raise exception 'contact_phone country' using errcode = 'check_violation';
  end if;
  if (select count(*) from date_checks where user_id = auth.uid() and created_at > now() - interval '1 day') >= 3 then
    raise exception 'too many date checks' using errcode = 'check_violation';
  end if;
  if (select count(*) from date_checks c2 where c2.contact_phone = start_date_check.contact_phone
        and c2.created_at > now() - interval '1 day') >= 3 then
    raise exception 'too many date checks for contact' using errcode = 'check_violation';
  end if;
  update date_checks set status = 'ended', ended_at = now(), lat = null, lng = null
    where user_id = auth.uid() and match_id = m.id and status <> 'ended';
  insert into date_checks (user_id, match_id, contact_name, contact_phone, place, when_text)
    values (auth.uid(), m.id, trim(contact_name), contact_phone, d.place, d.when_text) returning * into c;
  return jsonb_build_object('token', c.token, 'check_at', c.check_at, 'status', c.status, 'contact_name', c.contact_name);
end $$;

-- 6c. Der Link der Vertrauensperson zeigt nach dem Ende (oder nach einer Blockade) nur noch „beendet“,
--     nicht mehr dauerhaft Name, Alter und Foto des Matches.
create or replace function date_check_public(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select case
    when c.status = 'ended' or c.created_at < now() - interval '12 hours' or blocked_between(m.user_a, m.user_b)
      then jsonb_build_object('name', me.display_name, 'status', 'ended')
    else jsonb_build_object(
      'name', me.display_name,
      'photo', me.photos[1],
      'match', jsonb_build_object('name', o.display_name, 'age', date_part('year', age(o.birthdate))::int, 'photo', o.photos[1]),
      'place', c.place,
      'when', c.when_text,
      'status', case when c.status = 'help' then 'help' when date_check_overdue(c) then 'overdue' else 'active' end,
      'check_at', c.check_at,
      'location', case when c.lat is not null then jsonb_build_object('lat', c.lat, 'lng', c.lng, 'at', c.located_at) end)
  end
  from date_checks c
  join profiles me on me.id = c.user_id
  join matches m on m.id = c.match_id
  join profiles o on o.id = case when m.user_a = c.user_id then m.user_b else m.user_a end
  where c.token = p_token
$$;

-- 6d. „Keine Antwort“ löst pro Check höchstens zwei SMS aus (plus Entwarnung). Hilferufe zählen nicht mit.
create or replace function claim_date_alarms() returns table (id bigint, kind text, previous text, contact_phone text, contact_name text, user_name text, token text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with due as (
    select c.id, c.alarm_sent as previous,
      case
        when c.status = 'help' and c.alarm_sent is distinct from 'help' then 'help'
        when date_check_overdue(c) and c.alarm_sent is null and c.overdue_alarms < 2 then 'overdue'
        when c.alarm_sent in ('overdue', 'help') and (c.status = 'ended' or (c.status = 'active' and not date_check_overdue(c))) then 'clear'
      end as kind
    from date_checks c
    where c.created_at > now() - interval '12 hours'
    for update skip locked
  ),
  claimed as (
    update date_checks c set alarm_sent = d.kind, overdue_alarms = c.overdue_alarms + (d.kind = 'overdue')::int
    from due d where c.id = d.id and d.kind is not null
    returning c.id, d.kind, d.previous, c.contact_phone, c.contact_name, c.user_id, c.token
  )
  select x.id, x.kind, x.previous, x.contact_phone, x.contact_name, p.display_name, x.token
  from claimed x join profiles p on p.id = x.user_id;
  update date_checks c set alarm_sent = null where c.alarm_sent = 'clear' and c.status = 'active';
end $$;

create or replace function release_date_alarm(p_id bigint, p_previous text) returns void
language sql security definer set search_path = public as $$
  update date_checks set alarm_sent = p_previous,
    overdue_alarms = overdue_alarms - (alarm_sent = 'overdue' and p_previous is distinct from 'overdue')::int
  where id = p_id
$$;

-- 6e. Die Alarm-Funktion antwortet nur noch dem eigenen Server: Er schickt ein Geheimnis mit, das nur hier steht.
insert into app_settings (key, value) values ('date_alarm_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
  on conflict (key) do nothing;

create or replace function date_check_tick() returns void
language plpgsql security definer set search_path = public as $$
declare
  url text := (select value from app_settings where key = 'date_alarm_url');
  secret text := (select value from app_settings where key = 'date_alarm_secret');
begin
  update date_checks set status = 'ended', ended_at = now(), lat = null, lng = null
    where status <> 'ended' and created_at < now() - interval '12 hours';
  if url is not null and exists (
    select from date_checks c where c.created_at > now() - interval '12 hours' and (
      (c.status = 'help' and c.alarm_sent is distinct from 'help')
      or (date_check_overdue(c) and c.alarm_sent is null and c.overdue_alarms < 2)
      or (c.alarm_sent in ('overdue', 'help') and (c.status = 'ended' or (c.status = 'active' and not date_check_overdue(c))))))
  then
    perform net.http_post(url := url, body := '{}'::jsonb,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-alarm-secret', secret));
  end if;
end $$;

revoke execute on function stay_in_area, adults_only, block_contact_info, date_check_tick, claim_date_alarms,
  release_date_alarm from public, anon, authenticated;
revoke execute on function report_user, end_match, start_date_check, date_check_public from public;
grant execute on function report_user, end_match, start_date_check to authenticated;
grant execute on function date_check_public to anon, authenticated;
grant execute on function claim_date_alarms, release_date_alarm to service_role;

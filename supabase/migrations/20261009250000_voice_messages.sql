-- Sprachmemos im Chat (Malcolm, 2026-10-09): höchstens 1 Minute, nur nach der Fragenrunde wie Textnachrichten.
-- Die Datei liegt im privaten Bucket voice unter <absender>/<datei>. Abspielen dürfen nur die beiden im Match,
-- solange der Chat nicht beendet und niemand blockiert ist. Sprachmemos werden nicht automatisch geprüft,
-- deshalb lassen sie sich wie Nachrichten melden.

alter table messages
  add column audio text check (audio ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,80}$'),
  add column duration_ms int check (duration_ms between 500 and 60000),
  drop constraint messages_body_check,
  add constraint messages_body_check check (
    (audio is null and duration_ms is null and length(trim(body)) between 1 and 2000)
    or (audio is not null and duration_ms is not null and body = ''));

create function send_voice(other uuid, path text, duration_ms int) returns void
language plpgsql security definer set search_path = public as $$
declare m matches := match_with(other);
begin
  if m.ended_at is not null or not chat_open(m.id) then raise exception 'chat closed' using errcode = 'check_violation'; end if;
  if split_part(path, '/', 1) <> auth.uid()::text then raise exception 'not your file' using errcode = 'insufficient_privilege'; end if;
  insert into messages (match_id, sender_id, body, audio, duration_ms) values (m.id, auth.uid(), '', path, send_voice.duration_ms);
  perform beta_reply(m, other);
end $$;

-- Darf die angemeldete Person dieses Sprachmemo abspielen?
create function can_hear(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select split_part(path, '/', 1) = auth.uid()::text or exists (
    select from messages x join matches m on m.id = x.match_id
    where x.audio = path and auth.uid() in (m.user_a, m.user_b)
      and m.ended_at is null and not blocked_between(m.user_a, m.user_b))
$$;

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
        'bio', o.bio,
        'goal', o.goal,
        'music', o.music,
        'photos', o.photos,
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
          select coalesce(jsonb_agg(jsonb_build_object('id', id, 'mine', sender_id = auth.uid(), 'text', body, 'at', created_at, 'audio', audio, 'duration_ms', duration_ms) order by created_at, id), '[]')
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

revoke execute on function send_voice, can_hear from public, anon;
grant execute on function send_voice, can_hear to authenticated;

do $do$
begin
  if not exists (select from pg_namespace where nspname = 'storage') then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('voice', 'voice', false, 2097152, array['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav'])
    on conflict (id) do nothing;
  execute $p$create policy "Sprachmemos hochladen" on storage.objects for insert to authenticated
    with check (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  execute $p$create policy "Sprachmemos abspielen" on storage.objects for select to authenticated
    using (bucket_id = 'voice' and public.can_hear(name))$p$;
  execute $p$create policy "eigene Sprachmemos löschen" on storage.objects for delete to authenticated
    using (bucket_id = 'voice' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
end $do$;

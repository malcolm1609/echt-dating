-- Top-Songs: statt eines Songs bis zu drei selbst gewählte Links (src/domain/music.ts).
-- profiles.music ist jetzt eine Liste. Ein einzelner Song als Objekt bleibt erlaubt, damit ältere
-- App-Versionen weiter speichern können.

create function valid_music_link(m jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(m) = 'object'
    and m->>'provider' in ('spotify', 'apple')
    and m->>'kind' in ('track', 'album', 'playlist', 'artist')
    and (m->>'url' ~ '^https://open\.spotify\.com/(track|album|playlist|artist)/[A-Za-z0-9]+$'
      or m->>'url' ~ '^https://music\.apple\.com/[a-z]{2}/')
    and length(trim(coalesce(m->>'title', ''))) between 1 and 80
$$;

create or replace function valid_music(m jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select m is null
    or case jsonb_typeof(m)
      when 'object' then public.valid_music_link(m)
      when 'array' then jsonb_array_length(m) between 1 and 3
        and not exists (select from jsonb_array_elements(m) e where not coalesce(public.valid_music_link(e), false))
      else false
    end
$$;

grant execute on function valid_music_link to authenticated;

-- Kontaktdaten in jedem Songtitel abfangen, nicht nur im ersten.
create or replace function block_contact_info() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.is_sample then return new; end if;
  if (tg_op = 'INSERT' or new.display_name is distinct from old.display_name) and has_contact_info(new.display_name)
     or (tg_op = 'INSERT' or new.bio is distinct from old.bio) and has_contact_info(new.bio)
     or (tg_op = 'INSERT' or new.prompts is distinct from old.prompts)
        and exists (select from jsonb_array_elements(new.prompts) e where has_contact_info(e->>'answer'))
     or (tg_op = 'INSERT' or new.music is distinct from old.music)
        and exists (
          select from jsonb_array_elements(case jsonb_typeof(new.music) when 'array' then new.music when 'object' then jsonb_build_array(new.music) else '[]' end) s
          where has_contact_info(s->>'title') or has_contact_info(s->>'artist'))
     or (tg_op = 'INSERT' or new.interests is distinct from old.interests)
        and exists (select from unnest(new.interests) i where has_contact_info(i) or length(i) > 40) then
    raise exception 'contact info' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- Keine Werbung fürs eigene Social Media im Profil (Regeln wie src/domain/contactInfo.ts): @-Namen, Links,
-- Plattform plus Benutzername, „folgt mir“ und Handynummern sind in Name, „Über mich“ und den Antworten
-- nicht erlaubt. Geprüft wird nur, was sich ändert; Beispielprofile sind ausgenommen. Im Chat bleibt es frei.

create function has_contact_info(t text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(t, '') ~* any (array[
    '@[[:alnum:]_.]{2,}',
    'https?://|www\.|\m(t\.me|wa\.me|linktr\.ee)\M',
    '\m[a-z0-9-]{2,}\.(com|de|net|org|io|me|ly|gg|tv|app|link|bio|eu|info|co)\M',
    '\m(insta(gram)?|ig|snap(chat)?|sc|tik ?tok|tt|onlyfans|of|telegram|tg|discord|dc|twitter|twitch|fansly)\s*[:=]\s*\S',
    '\m(insta(gram)?|snap(chat)?|tik ?tok|onlyfans|telegram|discord|twitch|fansly)\s+((ist|is)\s+)?[[:alnum:]]*[._0-9][[:alnum:]._]*',
    '\m(follow (me|mir)|folg(t|e)? mir|add (me|mich)|adde? mich)\M',
    '(\+|\m0)[0-9]([ /-]?[0-9]){6,}'
  ])
$$;

create function block_contact_info() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.is_sample then return new; end if;
  if (tg_op = 'INSERT' or new.display_name is distinct from old.display_name) and has_contact_info(new.display_name)
     or (tg_op = 'INSERT' or new.bio is distinct from old.bio) and has_contact_info(new.bio)
     or (tg_op = 'INSERT' or new.prompts is distinct from old.prompts)
        and exists (select from jsonb_array_elements(new.prompts) e where has_contact_info(e->>'answer')) then
    raise exception 'contact info' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger block_contact_info before insert or update of display_name, bio, prompts on profiles
  for each row execute function block_contact_info();

revoke execute on function block_contact_info from public, anon, authenticated;

-- Fotoprüfung: Jedes Foto wird vor dem Veröffentlichen automatisch geprüft (Edge Function photo-check,
-- Regeln in supabase/functions/_shared/photoCheck.ts): ein klar erkennbares Gesicht, keine Nacktfotos,
-- keine KI-Bilder, keine starken Filter. Höchstens ein Gruppenfoto, und das Hauptfoto ist kein Gruppenfoto.
--
-- Ablauf: Die App lädt in den privaten Ordner „photo-uploads“ hoch. Die Prüfung holt das Bild dort ab,
-- legt es nur bei Erfolg in den öffentlichen Ordner „photos“ und trägt es hier ein. Ins Profil dürfen nur
-- eingetragene Fotos. Direkt in „photos“ hochladen geht nicht mehr.

create table approved_photos (
  path text primary key,
  user_id uuid not null references auth.users on delete cascade,
  group_photo boolean not null default false,
  checked_by text not null,
  checked_at timestamptz not null default now()
);
create index approved_photos_user on approved_photos (user_id);
alter table approved_photos enable row level security;
revoke all on approved_photos from anon, authenticated;

-- Fotos, die schon vor der Prüfung im Profil waren, bleiben (Testbetrieb).
insert into approved_photos (path, user_id, checked_by)
  select p, id, 'vor-der-pruefung' from profiles, unnest(photos) p where not is_sample
  on conflict do nothing;

create function enforce_approved_photos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_sample then return new; end if;
  if exists (select from unnest(new.photos) p
             where not exists (select from approved_photos a where a.path = p and a.user_id = new.id)) then
    raise exception 'photo not checked' using errcode = 'check_violation';
  end if;
  if (select count(*) from approved_photos a where a.path = any(new.photos) and a.group_photo) > 1 then
    raise exception 'too many group photos' using errcode = 'check_violation';
  end if;
  if exists (select from approved_photos a where a.path = new.photos[1] and a.group_photo) then
    raise exception 'main photo is a group photo' using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger profiles_approved_photos before insert or update of photos on profiles
  for each row execute function enforce_approved_photos();

revoke execute on function enforce_approved_photos from public, anon, authenticated;

do $do$
begin
  if not exists (select from pg_namespace where nspname = 'storage') then return; end if;
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('photo-uploads', 'photo-uploads', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
    on conflict (id) do nothing;
  execute $p$drop policy if exists "eigene Fotos hochladen" on storage.objects$p$;
  execute $p$drop policy if exists "Fotos zur Prüfung hochladen" on storage.objects$p$;
  execute $p$create policy "Fotos zur Prüfung hochladen" on storage.objects for insert to authenticated
    with check (bucket_id = 'photo-uploads' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
end $do$;

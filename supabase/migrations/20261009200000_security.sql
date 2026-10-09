-- Sicherheitsprüfung (2026-10-09).

-- 1. Standort nur grob speichern. Bisher stand die genaue GPS-Position (oft die eigene Wohnung) in der
--    Datenbank, und die Entfernung in den Vorschlägen wurde daraus berechnet. Wer seinen eigenen Standort
--    mehrmals verschiebt und jeweils die Entfernung abliest, hätte andere so auf wenige hundert Meter genau
--    orten können. Jetzt wird jede Position auf ein Raster von etwa 1 km gerundet, bevor sie gespeichert
--    wird. Für Umkreis und Zulassung reicht das, und mehr als „in welchem Viertel“ lässt sich nicht ablesen.
create function coarse_location() returns trigger
language plpgsql set search_path = public as $$
begin
  new.lat := round(new.lat::numeric, 2);
  new.lng := round(new.lng::numeric, 2);
  return new;
end $$;

create trigger profiles_coarse_location before insert or update of lat, lng on profiles
  for each row execute function coarse_location();

update profiles set lat = lat, lng = lng
where lat <> round(lat::numeric, 2) or lng <> round(lng::numeric, 2);

-- 2. Längen begrenzen, wo die Datenbank bisher beliebig lange Texte angenommen hat (die App begrenzt schon,
--    aber wer den Server direkt anspricht, könnte sonst riesige Texte bei anderen ablegen).
--    „not valid“: gilt für alles Neue, bestehende Zeilen bleiben unberührt.
alter table profiles
  add constraint display_name_length check (length(trim(display_name)) between 1 and 50) not valid,
  add constraint bio_length check (length(bio) <= 500) not valid;
alter table match_dates
  add constraint match_dates_length check (
    length(coalesce(idea, '')) <= 200 and length(place) <= 200 and length(when_text) <= 100) not valid;
alter table events
  add constraint events_text_length check (length(when_text) <= 100 and length(coalesce(campus, '')) <= 80) not valid;
alter table reports
  add constraint reports_reason check (reason in ('fake', 'harassment', 'inappropriate', 'spam', 'underage', 'other')) not valid;

-- 3. Bremsen gegen Massenanfragen: Wer den Server mit einem Programm statt der App anspricht, soll andere
--    nicht mit Nachrichten fluten, Events in Massen anlegen oder massenhaft Leute melden können.
create function limit_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from messages
      where match_id = new.match_id and sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'too many messages' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger messages_rate_limit before insert on messages for each row execute function limit_messages();

create function limit_event_messages() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from event_messages
      where event_id = new.event_id and sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'too many messages' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger event_messages_rate_limit before insert on event_messages for each row execute function limit_event_messages();

-- Höchstens 5 kommende Events gleichzeitig pro Person (Beispielprofile im Testbetrieb ausgenommen).
create function limit_events() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select from profiles where id = new.host_id and is_sample)
     and (select count(*) from events e where e.host_id = new.host_id and not event_over(e)) >= 5 then
    raise exception 'too many events' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger events_rate_limit before insert on events for each row execute function limit_events();

-- Höchstens 10 Meldungen pro Tag und Person.
create function limit_reports() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from reports where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too many reports' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger reports_rate_limit before insert on reports for each row execute function limit_reports();

revoke execute on function coarse_location, limit_messages, limit_event_messages, limit_events, limit_reports
  from public, anon, authenticated;

-- 4. Fotos: Die App löscht jetzt Bilder, die jemand entfernt, und beim Löschen des Kontos alle eigenen Bilder.
--    Dafür muss man den eigenen Ordner sehen dürfen (fremde Ordner weiterhin nicht).
do $do$
begin
  if not exists (select from pg_namespace where nspname = 'storage') then return; end if;
  execute $p$drop policy if exists "eigene Fotos sehen" on storage.objects$p$;
  execute $p$create policy "eigene Fotos sehen" on storage.objects for select to authenticated
    using (bucket_id = 'photos' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
end $do$;

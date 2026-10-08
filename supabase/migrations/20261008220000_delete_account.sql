-- Konto löschen (Pflicht für App Store, Play Store und DSGVO): Das Anmeldekonto wird gelöscht, alles andere
-- hängt per „on delete cascade“ daran (Profil, Prüfergebnis, Likes, Matches, Nachrichten, Events, Meldungen).
-- Offene Meldungen gegen die Person verschwinden mit; wer gesperrt war, braucht für ein neues Konto
-- trotzdem wieder Ausweis und Handynummer.
create function delete_my_account() returns void
language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid()
$$;

revoke execute on function delete_my_account from public, anon;
grant execute on function delete_my_account to authenticated;

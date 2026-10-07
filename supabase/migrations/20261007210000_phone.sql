-- Doppelte Prüfung: neben der E-Mail braucht jedes Konto eine bestätigte Handynummer,
-- bevor ein Profil entsteht. Supabase Auth erlaubt jede Nummer nur einmal.
create function has_confirmed_phone() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select from auth.users u where u.id = auth.uid() and u.phone_confirmed_at is not null)
$$;
revoke execute on function has_confirmed_phone from public;
grant execute on function has_confirmed_phone to authenticated;

create policy "nur mit bestätigter Handynummer" on profiles as restrictive for insert to authenticated
  with check (has_confirmed_phone());

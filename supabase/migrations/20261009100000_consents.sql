-- Einwilligungen bei der Registrierung: wer wann welcher Fassung der Datenschutzerklärung zugestimmt hat.
-- Nachweis nach Art. 7 Abs. 1 DSGVO. Wird mit dem Konto gelöscht.
create table consents (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('privacy', 'sensitive_data')),
  version text not null check (version ~ '^\d{4}-\d{2}-\d{2}$'),
  accepted_at timestamptz not null default now(),
  primary key (user_id, kind, version)
);
alter table consents enable row level security;
revoke all on consents from anon, authenticated;
grant select on consents to authenticated;
create policy consents_own on consents for select to authenticated using (user_id = auth.uid());

create function record_consent(kinds text[], version text) returns void
language sql security definer set search_path = public as $$
  insert into consents (user_id, kind, version)
  select auth.uid(), k, version from unnest(kinds) k
  on conflict do nothing
$$;
revoke execute on function record_consent from public, anon, authenticated;
grant execute on function record_consent to authenticated;

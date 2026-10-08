-- Nur für lokale Tests ohne Supabase: bildet auth.users, auth.uid() und die Rollen nach.
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, phone text unique, phone_confirmed_at timestamptz);
create or replace function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
-- Wie bei Supabase: neue Tabellen und Funktionen sind für anon und authenticated direkt freigegeben;
-- „revoke … from public“ allein nimmt ihnen das Recht also nicht.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

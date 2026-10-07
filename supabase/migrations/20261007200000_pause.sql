-- Profil pausieren: keine Vorschläge bekommen und niemandem gezeigt werden.
alter table profiles add column paused boolean not null default false;
grant update (paused) on profiles to authenticated;

create or replace function is_discoverable(p profiles) returns boolean
language sql stable security definer set search_path = public as $$
  select p.status = 'admitted'
     and not p.paused
     and p.last_active_at > now() - interval '7 days'
     and (select count(*) from reports r where r.reported_id = p.id and r.status = 'open') < 3
$$;

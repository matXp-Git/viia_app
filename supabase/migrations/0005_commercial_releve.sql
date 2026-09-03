-- New role "commercial": sales reps who record street-segment surveys
-- ("relevés") to show prospects what ViiA finds on their patch. No scope
-- entity (like manager) — commercials see all relevés, not a subset.

alter table app_user drop constraint if exists app_user_role_check;
alter table app_user add constraint app_user_role_check
  check (role in ('operator', 'manager', 'client', 'city', 'commercial'));

alter table app_user drop constraint if exists app_user_scope_matches_role;
alter table app_user add constraint app_user_scope_matches_role check (
  (role = 'operator' and operator_id is not null and client_id is null and city_id is null) or
  (role = 'manager' and operator_id is null and client_id is null and city_id is null) or
  (role = 'client' and client_id is not null and operator_id is null and city_id is null) or
  (role = 'city' and city_id is not null and operator_id is null and client_id is null) or
  (role = 'commercial' and operator_id is null and client_id is null and city_id is null)
);

create table releve (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references client(id),
  city_id uuid not null references city(id),
  troncon text not null,
  length_m numeric(10, 2) not null check (length_m > 0),
  count_aller integer not null default 0 check (count_aller >= 0),
  count_retour integer not null default 0 check (count_retour >= 0),
  -- Déchets/m is derived (aller+retour)/length_m, not stored — no reason to
  -- risk it drifting from the source counts.
  density text not null check (density in ('faible', 'moyen', 'fort')),
  recorded_at timestamptz not null default now()
);

alter table releve enable row level security;

create policy releve_select on releve for select using (app_role() in ('manager', 'commercial'));
create policy releve_write on releve for all
  using (app_role() in ('manager', 'commercial'))
  with check (app_role() in ('manager', 'commercial'));

grant select, insert, update, delete on releve to authenticated;

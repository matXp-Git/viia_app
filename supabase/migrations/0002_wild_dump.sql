-- Dépôt sauvage — an operator flags a spot ViiA won't collect (too heavy,
-- too large, out of perimeter) so the client/city can be informed and see
-- it on the map. Unlike weighing, this is meant to be visible to
-- client/city (it's a report *to* them), so it follows the track_segment
-- visibility pattern rather than the manager-only one.

create table wild_dump (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references mission(id) on delete cascade,
  operator_id uuid not null references operator(id),
  lat double precision not null,
  lng double precision not null,
  note text,
  reported_at timestamptz not null default now()
);

alter table wild_dump enable row level security;

create policy wild_dump_select on wild_dump for select using (
  app_role() = 'manager'
  or operator_id = app_operator_id()
  or exists (
    select 1 from mission m
    where m.id = wild_dump.mission_id
      and (
        (app_role() = 'client' and m.client_id = app_client_id())
        or (app_role() = 'city' and m.city_id = app_city_id())
      )
  )
);

create policy wild_dump_insert_self on wild_dump for insert with check (operator_id = app_operator_id());

grant select, insert on wild_dump to authenticated;

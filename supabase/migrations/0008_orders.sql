-- Client ordering: a client (or a manager/commercial on their behalf) builds
-- named "zones" (ordered lists of streets), then turns a zone into an order.
-- Validating an order creates a real mission in one transaction.
--
-- All writes to zones/orders go through the SECURITY DEFINER functions below
-- so the ownership rules (a client only ever orders for their own account,
-- a zone with an order is frozen) live in one place, in the database —
-- not only in the UI.

-- ============================================================================
-- Pricing settings (single row, editable by the manager)
-- ============================================================================

create table pricing_setting (
  id boolean primary key default true check (id),
  price_per_street numeric(10, 2) not null default 70 check (price_per_street >= 0),
  discontinuity_fee numeric(10, 2) not null default 10 check (discontinuity_fee >= 0),
  price_mode text not null default 'ttc' check (price_mode in ('ttc', 'ht')),
  updated_at timestamptz not null default now()
);

insert into pricing_setting (id) values (true);

alter table pricing_setting enable row level security;
create policy pricing_select on pricing_setting for select using (auth.role() = 'authenticated');
create policy pricing_update_manager on pricing_setting for update
  using (app_role() = 'manager') with check (app_role() = 'manager');
grant select, update on pricing_setting to authenticated;

-- ============================================================================
-- What the operators need to know about a mission created from an order
-- ============================================================================

alter table mission add column streets text[] not null default '{}';
alter table mission add column time_slot text check (time_slot in ('matin', 'apres_midi'));
alter table mission add column remark text check (char_length(remark) <= 500);

-- ============================================================================
-- Zones
-- ============================================================================

create table zone (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references client(id),
  city_id uuid not null references city(id),
  name text not null check (char_length(name) between 1 and 100),
  created_by uuid references app_user(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index zone_client_name_key on zone (client_id, lower(name));

create table zone_street (
  id uuid primary key default gen_random_uuid(),
  zone_id uuid not null references zone(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 150),
  position integer not null
);

create index zone_street_zone_idx on zone_street (zone_id, position);

-- ============================================================================
-- Orders
-- ============================================================================

create table client_order (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null unique references mission(id),
  zone_id uuid not null references zone(id),
  client_id uuid not null references client(id),
  delay_type text not null check (delay_type in ('date', 'within_days')),
  within_days integer check (within_days in (7, 15, 30)),
  target_date date not null,
  street_count integer not null check (street_count > 0),
  -- Price terms are copied onto the order when it's placed, so later changes
  -- to the tariff never rewrite an existing purchase order.
  unit_price numeric(10, 2) not null,
  discontinuity_fee numeric(10, 2) not null,
  price_mode text not null check (price_mode in ('ttc', 'ht')),
  estimated_amount numeric(10, 2) not null,
  final_amount numeric(10, 2) check (final_amount >= 0),
  created_by uuid references app_user(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((delay_type = 'within_days') = (within_days is not null))
);

create index client_order_client_idx on client_order (client_id);
create index client_order_zone_idx on client_order (zone_id);

-- ============================================================================
-- Row level security (read-only for users: writes go through the functions)
-- ============================================================================

alter table zone enable row level security;
alter table zone_street enable row level security;
alter table client_order enable row level security;

create policy zone_select on zone for select using (
  app_role() in ('manager', 'commercial')
  or (app_role() = 'client' and client_id = app_client_id())
);

create policy zone_street_select on zone_street for select using (
  exists (select 1 from zone z where z.id = zone_street.zone_id)
);

create policy client_order_select on client_order for select using (
  app_role() in ('manager', 'commercial')
  or (app_role() = 'client' and client_id = app_client_id())
);

create policy client_order_update_manager on client_order for update
  using (app_role() = 'manager') with check (app_role() = 'manager');

grant select on zone, zone_street, client_order to authenticated;
-- The manager only ever edits the final (adjusted) amount after the fact.
grant update (final_amount) on client_order to authenticated;

-- Commercials place orders for any client and need to see the resulting
-- missions (read-only). Same policy as before plus 'commercial'.
drop policy mission_select on mission;
create policy mission_select on mission for select using (
  app_role() in ('manager', 'commercial')
  or (app_role() = 'client' and client_id = app_client_id())
  or (app_role() = 'city' and city_id = app_city_id())
  or (app_role() = 'operator' and exists (
    select 1 from mission_assignment ma where ma.mission_id = mission.id and ma.operator_id = app_operator_id()
  ))
);

-- ============================================================================
-- Functions
-- ============================================================================

-- Ownership rule shared by every function below: a client only acts on their
-- own account; managers and commercials act for any client; anyone else is out.
create or replace function public.assert_can_order_for(p_client_id uuid) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  v_role text := app_role();
begin
  if v_role = 'client' then
    if app_client_id() is null or app_client_id() <> p_client_id then
      raise exception 'forbidden';
    end if;
  elsif v_role not in ('manager', 'commercial') or v_role is null then
    raise exception 'forbidden';
  end if;
end;
$$;

create or replace function public.save_zone(
  p_zone_id uuid,
  p_client_id uuid,
  p_city_id uuid,
  p_name text,
  p_streets text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_zone_id uuid := p_zone_id;
  v_client uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_streets text[];
  v_street text;
  v_pos integer := 0;
begin
  if v_zone_id is not null then
    select client_id into v_client from zone where id = v_zone_id for update;
    if v_client is null then
      raise exception 'zone_not_found';
    end if;
    perform public.assert_can_order_for(v_client);
    if exists (select 1 from client_order where zone_id = v_zone_id) then
      raise exception 'zone_locked';
    end if;
  else
    v_client := coalesce(p_client_id, case when app_role() = 'client' then app_client_id() end);
    if v_client is null then
      raise exception 'client_required';
    end if;
    perform public.assert_can_order_for(v_client);
  end if;

  if v_name = '' or char_length(v_name) > 100 then
    raise exception 'invalid_name';
  end if;
  if p_city_id is null or not exists (select 1 from city where id = p_city_id) then
    raise exception 'invalid_city';
  end if;

  v_streets := array(
    select btrim(s)
    from unnest(coalesce(p_streets, '{}'::text[])) with ordinality as t(s, ord)
    where btrim(s) <> ''
    order by ord
  );
  if coalesce(array_length(v_streets, 1), 0) = 0 then
    raise exception 'no_streets';
  end if;
  if array_length(v_streets, 1) > 50 then
    raise exception 'too_many_streets';
  end if;
  if exists (select 1 from unnest(v_streets) as s where char_length(s) > 150) then
    raise exception 'invalid_street';
  end if;

  if v_zone_id is null then
    insert into zone (client_id, city_id, name, created_by)
    values (v_client, p_city_id, v_name, auth.uid())
    returning id into v_zone_id;
  else
    update zone set city_id = p_city_id, name = v_name, updated_at = now() where id = v_zone_id;
    delete from zone_street where zone_id = v_zone_id;
  end if;

  foreach v_street in array v_streets loop
    v_pos := v_pos + 1;
    insert into zone_street (zone_id, name, position) values (v_zone_id, v_street, v_pos);
  end loop;

  return v_zone_id;
exception
  when unique_violation then
    raise exception 'duplicate_name';
end;
$$;

create or replace function public.delete_zone(p_zone_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_client uuid;
begin
  select client_id into v_client from zone where id = p_zone_id for update;
  if v_client is null then
    raise exception 'zone_not_found';
  end if;
  perform public.assert_can_order_for(v_client);
  if exists (select 1 from client_order where zone_id = p_zone_id) then
    raise exception 'zone_locked';
  end if;
  delete from zone where id = p_zone_id;
end;
$$;

create or replace function public.create_order(
  p_zone_id uuid,
  p_delay_type text,
  p_target_date date,
  p_within_days integer,
  p_time_slot text,
  p_remark text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_zone zone%rowtype;
  v_streets text[];
  v_count integer;
  v_pricing pricing_setting%rowtype;
  v_today date := (now() at time zone 'Europe/Paris')::date;
  v_target date;
  v_slot text := nullif(btrim(coalesce(p_time_slot, '')), '');
  v_remark text := nullif(btrim(coalesce(p_remark, '')), '');
  v_mission_id uuid;
  v_reference text;
  v_order_id uuid;
begin
  -- FOR SHARE: a concurrent save_zone/delete_zone (FOR UPDATE) waits for us,
  -- so a zone can't be edited between reading its streets and ordering it.
  select * into v_zone from zone where id = p_zone_id for share;
  if not found then
    raise exception 'zone_not_found';
  end if;
  perform public.assert_can_order_for(v_zone.client_id);

  if p_delay_type = 'date' then
    if p_target_date is null or p_target_date < v_today then
      raise exception 'invalid_date';
    end if;
    v_target := p_target_date;
  elsif p_delay_type = 'within_days' then
    if p_within_days is null or p_within_days not in (7, 15, 30) then
      raise exception 'invalid_delay';
    end if;
    v_target := v_today + p_within_days;
  else
    raise exception 'invalid_delay';
  end if;

  if v_slot is not null and v_slot not in ('matin', 'apres_midi') then
    raise exception 'invalid_slot';
  end if;
  if v_remark is not null and char_length(v_remark) > 500 then
    raise exception 'remark_too_long';
  end if;

  select array_agg(name order by position) into v_streets from zone_street where zone_id = p_zone_id;
  v_count := coalesce(array_length(v_streets, 1), 0);
  if v_count = 0 then
    raise exception 'no_streets';
  end if;

  select * into v_pricing from pricing_setting where id;
  if not found then
    raise exception 'pricing_missing';
  end if;

  insert into mission (city_id, client_id, date, kind, note, streets, time_slot, remark)
  values (v_zone.city_id, v_zone.client_id, v_target, 'operation', left(v_zone.name, 100), v_streets, v_slot, v_remark)
  returning id, reference into v_mission_id, v_reference;

  insert into client_order (
    mission_id, zone_id, client_id, delay_type, within_days, target_date,
    street_count, unit_price, discontinuity_fee, price_mode, estimated_amount, created_by
  ) values (
    v_mission_id, v_zone.id, v_zone.client_id, p_delay_type,
    case when p_delay_type = 'within_days' then p_within_days end,
    v_target, v_count, v_pricing.price_per_street, v_pricing.discontinuity_fee,
    v_pricing.price_mode, round(v_count * v_pricing.price_per_street, 2), auth.uid()
  ) returning id into v_order_id;

  return jsonb_build_object('order_id', v_order_id, 'mission_id', v_mission_id, 'reference', v_reference);
end;
$$;

revoke all on function public.assert_can_order_for(uuid) from public, anon, authenticated;
revoke all on function public.save_zone(uuid, uuid, uuid, text, text[]) from public, anon;
revoke all on function public.delete_zone(uuid) from public, anon;
revoke all on function public.create_order(uuid, text, date, integer, text, text) from public, anon;
grant execute on function public.save_zone(uuid, uuid, uuid, text, text[]) to authenticated;
grant execute on function public.delete_zone(uuid) to authenticated;
grant execute on function public.create_order(uuid, text, date, integer, text, text) to authenticated;

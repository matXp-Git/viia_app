-- Prospect reports: a commercial curates a subset of relevés (+ up to 10
-- photos) into a named, shareable report. The public link is served to
-- people with no ViiA Pick account at all, so read access can't go through
-- the normal per-role RLS policies — see get_public_report() below, which
-- exposes only the rows a given report actually links to.

create table report (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  client_id uuid references client(id),
  city_id uuid references city(id),
  date_from date,
  date_to date,
  created_by uuid references app_user(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table report_releve (
  report_id uuid not null references report(id) on delete cascade,
  releve_id uuid not null references releve(id) on delete cascade,
  primary key (report_id, releve_id)
);

create table report_photo (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references report(id) on delete cascade,
  storage_path text not null,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table report enable row level security;
alter table report_releve enable row level security;
alter table report_photo enable row level security;

create policy report_write on report for all
  using (app_role() in ('manager', 'commercial'))
  with check (app_role() in ('manager', 'commercial'));
create policy report_releve_write on report_releve for all
  using (app_role() in ('manager', 'commercial'))
  with check (app_role() in ('manager', 'commercial'));
create policy report_photo_write on report_photo for all
  using (app_role() in ('manager', 'commercial'))
  with check (app_role() in ('manager', 'commercial'));

grant select, insert, update, delete on report, report_releve, report_photo to authenticated;

-- SECURITY DEFINER so an anonymous prospect (no auth session, no app_user
-- row) can read one report by its slug — deliberately narrow: only the
-- report row itself and whatever it links to via report_releve/report_photo,
-- never the wider releve/report tables.
create or replace function get_public_report(p_slug text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_report report%rowtype;
  v_result jsonb;
begin
  select * into v_report from report where slug = p_slug;
  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'title', v_report.title,
    'city_name', (select name from city where id = v_report.city_id),
    'releves', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'troncon', r.troncon,
        'length_m', r.length_m,
        'count_aller', r.count_aller,
        'count_retour', r.count_retour,
        'density', r.density,
        'recorded_at', r.recorded_at,
        'city_name', c.name
      ) order by r.recorded_at desc), '[]'::jsonb)
      from report_releve rr
      join releve r on r.id = rr.releve_id
      join city c on c.id = r.city_id
      where rr.report_id = v_report.id
    ),
    'photos', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'storage_path', p.storage_path
      ) order by p.position), '[]'::jsonb)
      from report_photo p
      where p.report_id = v_report.id
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function get_public_report(text) to anon, authenticated;

-- Storage bucket for report photos — public read (the report page has no
-- auth to check), writes restricted to manager/commercial.
insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

create policy report_photos_public_read on storage.objects
  for select using (bucket_id = 'report-photos');
create policy report_photos_write on storage.objects
  for insert with check (bucket_id = 'report-photos' and app_role() in ('manager', 'commercial'));
create policy report_photos_delete on storage.objects
  for delete using (bucket_id = 'report-photos' and app_role() in ('manager', 'commercial'));

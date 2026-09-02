-- track_segment_select called can_view_segment(id), which itself queries
-- track_segment — a self-referential RLS check on the same table/policy.
-- INSERT ... RETURNING (used by `.insert().select()` in the app) needs the
-- SELECT policy to pass for the newly inserted row to be returned; the
-- circular reference makes that evaluate to false, surfacing as
-- "new row violates row-level security policy for table track_segment" on
-- the INSERT itself, even though the row and the INSERT's own WITH CHECK
-- are both correct.
--
-- Fix: check operator_id/mission_id directly off the row being evaluated
-- (already available, no subquery needed) instead of re-querying
-- track_segment through can_view_segment().

drop policy if exists track_segment_select on track_segment;

create policy track_segment_select on track_segment for select using (
  app_role() = 'manager'
  or operator_id = app_operator_id()
  or exists (
    select 1 from mission m
    where m.id = track_segment.mission_id
      and (
        (app_role() = 'client' and m.client_id = app_client_id())
        or (app_role() = 'city' and m.city_id = app_city_id())
      )
  )
);

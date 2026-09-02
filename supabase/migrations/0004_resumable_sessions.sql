-- Missions can span multiple days and be worked in several sessions by one
-- or several operators (sectors assigned informally, offline, by the
-- manager). "Finishing" on the operator side is per-session, not a
-- permanent completion — only the manager ends the mission itself.

-- Weighing becomes an append-only log (one row per depot return / weigh-in
-- event) instead of a single upsertable total per operator — otherwise a
-- second weigh-in would silently overwrite the first one's numbers.
alter table weighing drop constraint if exists weighing_mission_id_operator_id_key;

-- Auto-completing the mission when every mission_assignment.completed_at is
-- set no longer matches reality (an operator "finishing" is just pausing
-- for now). Mission completion is now an explicit manager action instead.
drop trigger if exists trg_mission_completed on mission_assignment;
drop function if exists public.mark_mission_completed();
alter table mission_assignment drop column if exists completed_at;

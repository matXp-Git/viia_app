-- Missions carry a free-text note (detail for the team) and a kind: most
-- are real "opérations" (client-assigned cleanup work), but the manager can
-- also log a "relevé" — not actual work, just a commercial's waste count
-- entered on-site. Purely a label on the existing mission entity; unrelated
-- to the separate `releve` table used for the detailed commercial survey.
alter table mission add column kind text not null default 'operation' check (kind in ('operation', 'releve'));
alter table mission add column note text check (char_length(note) <= 100);

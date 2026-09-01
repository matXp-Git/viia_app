import type { Role } from "@/lib/roles";

export type MissionStatus = "planned" | "in_progress" | "completed";
export type OperatorStatus = "active" | "inactive";
export type TrackSource = "vehicle" | "manual";

export type City = { id: string; name: string; code: string };

export type Client = { id: string; name: string };

export type Operator = {
  id: string;
  matricule: string | null;
  name: string;
  contact: string | null;
  status: OperatorStatus;
};

export type Mission = {
  id: string;
  reference: string | null;
  client_id: string | null;
  city_id: string;
  date: string;
  status: MissionStatus;
  started_at: string | null;
  ended_at: string | null;
};

export type MissionAssignment = {
  id: string;
  mission_id: string;
  operator_id: string;
  completed_at: string | null;
};

export type AppUser = {
  id: string;
  role: Role;
  operator_id: string | null;
  client_id: string | null;
  city_id: string | null;
};

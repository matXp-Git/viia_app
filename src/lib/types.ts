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
};

export type TrackSegment = {
  id: string;
  mission_id: string;
  operator_id: string;
  source: TrackSource;
  created_at: string;
};

export type Weighing = {
  id: string;
  mission_id: string;
  operator_id: string;
  kilos_total: number;
  kilos_recycled: number;
  recorded_at: string;
};

export type WildDump = {
  id: string;
  mission_id: string;
  operator_id: string;
  lat: number;
  lng: number;
  note: string | null;
  reported_at: string;
};

export type Density = "faible" | "moyen" | "fort";

export type Releve = {
  id: string;
  client_id: string | null;
  city_id: string;
  troncon: string;
  length_m: number;
  count_aller: number;
  count_retour: number;
  density: Density;
  recorded_at: string;
};

export type AppUser = {
  id: string;
  role: Role;
  operator_id: string | null;
  client_id: string | null;
  city_id: string | null;
};

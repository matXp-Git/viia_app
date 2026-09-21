import type { Role } from "@/lib/roles";

export type MissionStatus = "planned" | "in_progress" | "completed";
export type MissionKind = "operation" | "releve";
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

export type TimeSlot = "matin" | "apres_midi";
export type DelayType = "date" | "within_days";
export type PriceMode = "ttc" | "ht";

export type Mission = {
  id: string;
  reference: string | null;
  client_id: string | null;
  city_id: string;
  date: string;
  status: MissionStatus;
  kind: MissionKind;
  note: string | null;
  streets: string[];
  time_slot: TimeSlot | null;
  remark: string | null;
  started_at: string | null;
  ended_at: string | null;
};

export type Zone = {
  id: string;
  client_id: string;
  city_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type ZoneStreet = {
  id: string;
  zone_id: string;
  name: string;
  position: number;
};

export type PricingSetting = {
  price_per_street: number;
  discontinuity_fee: number;
  price_mode: PriceMode;
};

export type ClientOrder = {
  id: string;
  mission_id: string;
  zone_id: string;
  client_id: string;
  delay_type: DelayType;
  within_days: number | null;
  target_date: string;
  street_count: number;
  unit_price: number;
  discontinuity_fee: number;
  price_mode: PriceMode;
  estimated_amount: number;
  final_amount: number | null;
  created_by: string | null;
  created_at: string;
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

export type Report = {
  id: string;
  slug: string;
  title: string;
  client_id: string | null;
  city_id: string | null;
  date_from: string | null;
  date_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ReportPhoto = {
  id: string;
  report_id: string;
  storage_path: string;
  position: number;
  created_at: string;
};

// Shape returned by the get_public_report() RPC — the only view a
// non-authenticated prospect ever gets of a report.
export type PublicReport = {
  title: string;
  city_name: string | null;
  releves: {
    id: string;
    troncon: string;
    length_m: number;
    count_aller: number;
    count_retour: number;
    density: Density;
    recorded_at: string;
    city_name: string;
  }[];
  photos: { storage_path: string }[];
};

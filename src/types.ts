export type JobStatus = 'In Progress' | 'Waiting on Parts' | 'Completed';

export type PartStatus = 'Needed' | 'Ordered' | 'Arrived';

export interface VehicleDetails {
  year: string;
  make: string;
  model: string;
  engine: string;
  drivetrain: string;
  trim?: string;
  bodyClass?: string;
  fuelType?: string;
  transmission?: string;
  rawVin?: string;
}

export interface PartItem {
  id: string;
  part_name: string;
  status: PartStatus;
  notes?: string;
  partNumber?: string;
  addedAt: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  customer_name: string;
  vin: string;
  vehicle_details: VehicleDetails;
  parts_list: PartItem[];
  created_at: string;
  updated_at?: string;
  service_notes?: string;
  mileage?: string;
}

export interface DecodeVinResponse {
  year: string;
  make: string;
  model: string;
  engine: string;
  drivetrain: string;
  trim: string;
  bodyClass: string;
  fuelType: string;
  rawResponse?: Record<string, unknown>;
  error?: string;
}

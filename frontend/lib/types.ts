export type Role =
  | "admin"
  | "manager"
  | "employee"
  | "driver"
  | "traveler"
  | "middleman"
  | "customer";

export type Gender = "male" | "female" | "other" | "undisclosed";

export type IdDocumentType =
  | "passport"
  | "national_id"
  | "driver_license"
  | "residence_permit"
  | "other";

export type ShipmentStatus =
  | "draft"
  | "pending"
  | "picked_up"
  | "at_origin_hub"
  | "in_transit"
  | "at_customs"
  | "at_destination_hub"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery"
  | "returned"
  | "cancelled";

export type CarrierType = "driver" | "traveler" | "middleman" | "external";

export interface User {
  id: string;

  // Identity
  first_name: string;
  last_name: string;
  middle_name: string | null;
  full_name: string; // computed server-side, always present in responses

  date_of_birth: string | null; // ISO date "YYYY-MM-DD"
  gender: Gender | null;
  nationality: string | null; // ISO 3166-1 alpha-2

  // Government ID
  id_document_type: IdDocumentType | null;
  id_document_number: string | null;
  id_document_expires_at: string | null;
  id_document_issuing_country: string | null;

  // Contact
  email: string;
  phone: string | null;
  phone_secondary: string | null;

  // Address
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal_code: string | null;

  // Auth / status
  role: Role;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
  kyc_verified: boolean;

  // Preferences
  preferred_language: string;
  preferred_currency: string;
  timezone: string | null;

  profile: Record<string, unknown> | null;
  avatar_url: string | null;

  last_login_at: string | null;
  created_at: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface TrackingEvent {
  id: string;
  status: ShipmentStatus;
  note: string | null;
  location_id: string | null;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  recorded_by_id: string | null;
  timestamp: string;
}

export interface Shipment {
  id: string;
  tracking_code: string;
  status: ShipmentStatus;
  sender_user_id: string | null;
  sender_name: string;
  sender_phone: string;
  sender_address: string;
  recipient_user_id: string | null;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  origin_location_id: string | null;
  destination_location_id: string | null;
  carrier_type: CarrierType | null;
  carrier_user_id: string | null;
  flight_number: string | null;
  flight_date: string | null;
  description: string | null;
  weight_kg: number | null;
  declared_value: number | null;
  currency: string;
  piece_count: number;
  shipping_cost: number | null;
  order_id: string | null;
  created_at: string;
  updated_at: string;
  picked_up_at: string | null;
  delivered_at: string | null;
}

export interface ShipmentDetail extends Shipment {
  events: TrackingEvent[];
}

export interface PublicTracking {
  tracking_code: string;
  status: ShipmentStatus;
  recipient_first_name: string;
  destination_city: string;
  created_at: string;
  delivered_at: string | null;
  events: TrackingEvent[];
}

export interface ShipmentCreate {
  sender_name: string;
  sender_phone: string;
  sender_email?: string;
  sender_address: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_email?: string;
  recipient_address: string;
  description?: string;
  weight_kg?: number;
  declared_value?: number;
  currency?: string;
  piece_count?: number;
  carrier_type?: CarrierType;
  flight_number?: string;
  flight_date?: string;
}
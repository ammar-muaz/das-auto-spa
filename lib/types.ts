export type Role = "customer" | "admin" | "serviceProvider";
export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Assigned"
  | "En Route"
  | "In Progress"
  | "Completion Pending"
  | "Issue/Delayed"
  | "Completed"
  | "Cancelled";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  address?: string;
  role: Role;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  features: string[];
}

export interface Booking {
  id: string;
  bookingId: string;
  userId: string;
  customerName: string;
  service: string;
  date: string;
  timeSlot: string;
  address: string;
  carDetails: string;
  amount: number;
  status: BookingStatus;
  paymentMethod: string;
  paymentStatus: string;
  assignedTo?: string;
  assignedProviderId?: string;
  aiAnalysis?: { dirtLevel: "Clean" | "Moderate" | "Very Dirty" } | null;
  proofOfCompletion?: string;
  issueReport?: { reason: string; remarks: string; reportedAt: string };
  specialInstructions?: string;
  createdAt?: string;
}

export interface BookingRow {
  id: string;
  booking_id: string;
  user_id: string;
  customer_name: string;
  service_name: string;
  scheduled_date: string;
  time_slot: string;
  address: string;
  car_details: string;
  amount: number;
  status: BookingStatus;
  payment_method: string | null;
  payment_status: string | null;
  assigned_to: string | null;
  assigned_provider_id: string | null;
  ai_dirt_level: "Clean" | "Moderate" | "Very Dirty" | null;
  ai_image_url: string | null;
  proof_of_completion_url: string | null;
  issue_reason: string | null;
  issue_remarks: string | null;
  issue_reported_at: string | null;
  special_instructions: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  address?: string | null;
  role: Role;
  status?: "Active" | "Inactive" | null;
  created_at?: string | null;
}

export interface DirectoryUser {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: Role;
  status: "Active" | "Inactive";
  registeredDate: string;
  totalBookings?: number;
}

export interface BookingData {
  carDetails: {
    carBrand: string;
    carModel: string;
    carType: string;
    plateNumber: string;
    carColor: string;
  };
  service: Service;
  location: {
    address: string;
    date: string;
    timeSlot: string;
    travelFee: number;
    selectedArea: string;
  };
  aiAnalysis?: { dirtLevel: "Clean" | "Moderate" | "Very Dirty"; imageUrl: string } | null;
}

export function mapBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    customerName: row.customer_name,
    service: row.service_name,
    date: row.scheduled_date,
    timeSlot: row.time_slot,
    address: row.address,
    carDetails: row.car_details,
    amount: row.amount,
    status: row.status,
    paymentMethod: row.payment_method || "",
    paymentStatus: row.payment_status || "",
    assignedTo: row.assigned_to || undefined,
    assignedProviderId: row.assigned_provider_id || undefined,
    aiAnalysis: row.ai_dirt_level ? { dirtLevel: row.ai_dirt_level } : null,
    proofOfCompletion: row.proof_of_completion_url || undefined,
    issueReport: row.issue_reason
      ? { reason: row.issue_reason, remarks: row.issue_remarks || "", reportedAt: row.issue_reported_at || "" }
      : undefined,
    specialInstructions: row.special_instructions || undefined,
    createdAt: row.created_at,
  };
}

export function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    phone: row.phone || "",
    address: row.address || "",
    role: row.role,
  };
}

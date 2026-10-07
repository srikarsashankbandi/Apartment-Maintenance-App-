export type UserRole = 'Maintenance' | 'FlatOwner';

export interface UserNotificationPrefs {
  whatsapp_reminders: boolean;
  email_receipts: boolean;
  sms_alerts: boolean;
  emergency_broadcasts: boolean;
}

export interface User {
  id: string; // UUID linked to auth.users
  name: string;
  phone: string;
  role: UserRole;
  contact?: string;
  email?: string;
  avatar_url?: string;
  emergency_contact?: string;
  parking_slot?: string;
  notification_prefs?: UserNotificationPrefs;
  created_at: string;
}

export interface Flat {
  id: string;
  flat_number: string;
  owner_id: string | null;
  block?: string;
  floor?: number;
  square_feet?: number;
  parking_slot?: string;
  created_at: string;
}

export type DueStatus = 'Pending' | 'Paid' | 'Under Verification' | 'Overdue';

export interface Due {
  id: string;
  amount: number;
  due_date: string; // YYYY-MM-DD
  status: DueStatus;
  flat_id: string;
  payment_proof_url?: string;
  notes?: string;
  updated_at?: string;
  created_at: string;
  flat?: Flat;
  user?: User;
}

export type TransactionType = 'Credit' | 'Debit';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  flat_id?: string | null;
  user_id?: string | null;
  created_at: string;
  user?: { name: string };
  flat?: { flat_number: string };
}

export interface Budget {
  id: string;
  category: string;
  allocated_amount: number;
  month_year: string; // MM/YYYY or YYYY-MM
}

export type GrievanceStatus = 'Open' | 'In Progress' | 'Resolved' | 'Reopened';

export interface Grievance {
  id: string;
  title: string;
  description: string;
  user_id: string;
  flat_id?: string;
  status: GrievanceStatus;
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  created_at: string;
  user?: { name: string; phone?: string };
  flat?: { flat_number: string };
}

export interface Comment {
  id: string;
  text: string;
  user_id: string | null;
  transaction_id?: string | null;
  grievance_id?: string | null;
  created_at: string;
  user?: { name: string };
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  location: string;
  next_maintenance_date: string; // YYYY-MM-DD
  last_serviced_date?: string;
  vendor_name?: string;
  vendor_contact?: string;
  health_score?: number; // 0-100
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_id: string;
  urgency: 'Normal' | 'Urgent';
  read_by?: string[];
}

export type TaskType = 'ASSET' | 'GRIEVANCE' | 'DUE';

export interface MaintenanceTask {
  id: string;
  type: TaskType;
  title: string;
  subtitle: string;
  date: string;
  priority: number; // 1 for Assets, 2 for Grievance/Due
  status?: string;
  metadata: any;
}

export interface AdminDashboardStats {
  expected_dues: number;
  collected_dues: number;
  under_verification_dues: number;
  overdue_dues: number;
  collection_percentage: number;
  total_monthly_budget: number;
  total_monthly_spent: number;
  monthly_budget_remaining: number;
  monthly_budget_percentage: number;
  monthly_burn_rate: number; // e.g. 74%
  monthly_history: {
    month: string;
    allocated: number;
    spent: number;
    status: 'surplus' | 'deficit' | 'on_track';
  }[];
  budget_health: {
    category: string;
    allocated_amount: number;
    spent_amount: number;
    is_over_budget: boolean;
    percentage: number;
  }[];
}

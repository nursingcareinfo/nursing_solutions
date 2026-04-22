import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'https://your-project.supabase.co') {
    throw new Error('Supabase configuration missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment secrets.');
  }

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  return supabaseInstance;
}

// Keep a dummy export for now to prevent breaking other files immediately, 
// but we will update them to use getSupabase() for safety.
export const supabase = {
  from: (table: string) => getSupabase().from(table),
  rpc: (fn: string, params?: any) => getSupabase().rpc(fn, params),
  auth: {
    getUser: () => getSupabase().auth.getUser(),
  }
} as any;

export type Staff = {
  id: string;
  full_name: string;
  cnic: string;
  gender: 'Male' | 'Female' | 'Other';
  category: 'Nurse' | 'Attendant' | 'Caretaker' | 'Baby Sitter' | 'Doctor';
  designation: string;
  phone_primary: string;
  whatsapp_number: string;
  email: string;
  area_town: string;
  complete_address: string;
  rating: number;
  experience_years: number;
  status: 'Available' | 'On Duty' | 'On Leave' | 'Inactive';
  is_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type Patient = {
  id: string;
  full_name: string;
  cnic: string;
  date_of_birth: string;
  gender: string;
  blood_group: string;
  mobile_number: string;
  area_town: string;
  complete_address: string;
  primary_diagnosis: string;
  current_medications: string;
  allergies: string;
  service_type: string;
  shift_type: string;
  start_date: string;
  duration: string;
  status: 'Active' | 'Pending' | 'Completed' | 'Cancelled';
  assigned_staff_id: string | null;
  created_at: string;
  updated_at: string;
};

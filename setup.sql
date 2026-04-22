-- KARACHI HOME CARE PORTAL - DATABASE SCHEMA
-- This script sets up the tables for Staff and Patients with Karachi-specific fields.

-- 1. STAFF TABLE
CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT auth.uid(), -- Or gen_random_uuid() if not linked to auth
  full_name TEXT NOT NULL,
  father_husband_name TEXT,
  cnic TEXT UNIQUE NOT NULL, -- Format: XXXXX-XXXXXXX-X
  date_of_birth DATE,
  gender TEXT DEFAULT 'Other',
  religion TEXT,
  
  -- Contact Info
  phone_primary TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT,
  
  -- Professional Info
  category TEXT NOT NULL DEFAULT 'Nurse', -- R/N, BSN, etc.
  designation TEXT,
  experience_years NUMERIC DEFAULT 0,
  expected_salary NUMERIC,
  shift_preference TEXT, -- Day, Night, 24hrs
  
  -- Geographic Info
  area_town TEXT, -- Korangi, Gulshan, Malir, etc.
  complete_address TEXT,
  
  -- Operations
  rating NUMERIC(3,2) DEFAULT 5.00,
  is_available BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PATIENTS TABLE
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  cnic TEXT,
  date_of_birth DATE,
  gender TEXT,
  blood_group TEXT,
  
  -- Contact & Location
  mobile_number TEXT NOT NULL,
  area_town TEXT,
  complete_address TEXT NOT NULL,
  
  -- Medical Info
  primary_diagnosis TEXT,
  current_medications TEXT,
  allergies TEXT,
  
  -- Care Details
  service_type TEXT, -- Chronic, Post-Op, Elderly, etc.
  shift_type TEXT, -- 12hr, 24hr, 8hr
  start_date DATE,
  duration TEXT,
  
  -- Management
  status TEXT DEFAULT 'Pending', -- Active, Pending, Completed, Cancelled
  assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (Optional but Recommended)
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 4. CREATE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_staff_category ON staff(category);
CREATE INDEX IF NOT EXISTS idx_staff_area ON staff(area_town);
CREATE INDEX IF NOT EXISTS idx_staff_cnic ON staff(cnic);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_patients_assigned ON patients(assigned_staff_id);

-- 5. FUNCTION TO UPDATE UPDATED_AT TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

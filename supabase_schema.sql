-- Supabase Schema for SpaceRent

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create partner_requests table
CREATE TABLE IF NOT EXISTS partner_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL,
  company_name TEXT NOT NULL,
  contact_number TEXT NOT NULL,
  business_number TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create locations table
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

-- Create support_requests table
CREATE TABLE IF NOT EXISTS support_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create signup_tokens
CREATE TABLE IF NOT EXISTS signup_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'partner',
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  transmission TEXT NOT NULL,
  fuel_type TEXT NOT NULL,
  price_per_day NUMERIC NOT NULL,
  ac BOOLEAN NOT NULL,
  image_url TEXT,
  partner_id UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  user_id UUID REFERENCES users(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create reviews
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  vehicle_id UUID REFERENCES vehicles(id),
  user_id UUID REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create payments
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'EUR',
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert original Seed Data
INSERT INTO locations (id, name) VALUES 
  ('PRN', 'Pristina Airport (PRN)'),
  ('PRC', 'Pristina Center'),
  ('PZ', 'Prizren'),
  ('PJ', 'Peja')
ON CONFLICT (id) DO NOTHING;

-- Optionally, enable Row Level Security (RLS)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- etc. For a simple migration we'll just allow all operations 
-- if they are handled by the backend Express server, 
-- or we can use Supabase Auth and configure RLS.

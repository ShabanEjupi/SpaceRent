import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;
const JWT_SECRET = "super-secret-key-change-me";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadsDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

const saveBase64Image = (dataUrl: string): string => {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return dataUrl;
  const matches = dataUrl.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return dataUrl;
  const extension = matches[1];
  const buffer = Buffer.from(matches[2], 'base64');
  const fileName = 'img_' + Date.now() + Math.random().toString(36).substring(7) + '.' + extension;
  fs.writeFileSync(path.join(uploadsDir, fileName), buffer);
  return '/uploads/' + fileName;
};

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_ANON_KEY missing. Database operations will fail. Please add them to .env");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};

app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = bcrypt.hashSync(password, 8);
  const { data, error } = await supabase.from('users').insert({ email, password_hash: hash, role: 'user' }).select().single();
  if (error || !data) return res.status(400).json({ error: "Email already exists" });
  
  const token = jwt.sign({ id: data.id, email, role: "user" }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: data.id, email, role: "user" } });
});

app.post("/api/auth/register-token", async (req, res) => {
  const { token, password } = req.body;
  const { data: tokenRecord } = await supabase.from('signup_tokens').select('*').eq('token', token).eq('used', false).single();
  
  if (!tokenRecord) return res.status(400).json({ error: "Invalid or expired token" });

  const hash = bcrypt.hashSync(password, 8);
  const { data: existingUser } = await supabase.from('users').select('*').eq('email', tokenRecord.email).maybeSingle();

  let id, role = tokenRecord.role;
  if (existingUser) {
    id = existingUser.id;
    await supabase.from('users').update({ password_hash: hash, role }).eq('email', tokenRecord.email);
  } else {
    const { data: newUser } = await supabase.from('users').insert({ email: tokenRecord.email, password_hash: hash, role }).select().single();
    id = newUser?.id;
  }
  
  await supabase.from('signup_tokens').update({ used: true }).eq('token', token);
  const jwtToken = jwt.sign({ id, email: tokenRecord.email, role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token: jwtToken, user: { id, email: tokenRecord.email, role } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { data: user } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get("/api/auth/me", authenticateToken, async (req: any, res) => {
  const { data: user } = await supabase.from('users').select('id, email, role').eq('id', req.user.id).single();
  res.json(user);
});

app.post("/api/partner/apply", async (req, res) => {
  const { email, company_name, contact_number, business_number } = req.body;
  if (!email || !company_name || !contact_number) return res.status(400).json({ error: "Missing required fields" });

  const { data: existing } = await supabase.from('partner_requests').select('*').eq('email', email).eq('status', 'pending').maybeSingle();
  if (existing) return res.status(400).json({ error: "You already have a pending application" });

  await supabase.from('partner_requests').insert({ email, company_name, contact_number, business_number: business_number || null });
  res.json({ success: true });
});

app.get("/api/admin/dashboard", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  
  const [{ count: bookingsCount }] = await Promise.all([
    supabase.from('bookings').select('*', { count: 'exact', head: true })
  ]);
  
  const { data: pendingPartners } = await supabase.from('partner_requests').select('*').eq('status', 'pending');
  const { data: supportRequests } = await supabase.from('support_requests').select('*, users(email, role)').order('created_at', { ascending: false });
  const { data: recentBookings } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(10);
  
  const { data: allUsersForPartners } = await supabase.from('users').select('id, email, role').eq('role', 'partner');
  
  let allPartners: any[] = [];
  if (allUsersForPartners && allUsersForPartners.length > 0) {
    const emails = allUsersForPartners.map((u: any) => u.email);
    const { data: relatedRequests } = await supabase.from('partner_requests').select('email, company_name, contact_number').in('email', emails);
    
    allPartners = allUsersForPartners.map((u: any) => {
      const pr = relatedRequests?.find(r => r.email === u.email);
      return {
        id: u.id,
        email: u.email,
        company_name: pr?.company_name || 'N/A',
        contact_number: pr?.contact_number || 'N/A'
      };
    });
  }

  const { data: vehicles } = await supabase.from('vehicles').select('*');
  const { data: users } = await supabase.from('users').select('id, email, role');
  const { data: locations } = await supabase.from('locations').select('*');
  
  res.json({
    metrics: { bookings: bookingsCount || 0 },
    applications: pendingPartners || [],
    supportRequests: supportRequests || [],
    bookings: recentBookings || [],
    partners: allPartners,
    vehicles: vehicles || [],
    users: users || [],
    locations: locations || []
  });
});

app.post("/api/admin/edit-booking/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { start_date, end_date, total_price, contact_name, contact_phone, contact_email, status } = req.body;
  await supabase.from('bookings').update({
    start_date, end_date, total_price, contact_name, contact_phone, contact_email, status
  }).eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/delete-booking/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  await supabase.from('payments').delete().eq('booking_id', req.params.id);
  await supabase.from('reviews').delete().eq('booking_id', req.params.id);
  await supabase.from('bookings').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/locations", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { id, name } = req.body;
  await supabase.from('locations').insert({ id, name });
  res.json({ success: true });
});

app.post("/api/admin/locations/:id/update", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { name } = req.body;
  await supabase.from('locations').update({ name }).eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/locations/:id/delete", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  await supabase.from('locations').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/users/:id/role", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { role } = req.body;
  if (!['admin', 'partner', 'user'].includes(role)) return res.status(400).json({ error: "Invalid role" });
  await supabase.from('users').update({ role }).eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/delete-vehicle/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  await supabase.from('bookings').delete().eq('vehicle_id', req.params.id);
  await supabase.from('vehicles').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/edit-vehicle/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { make, model, transmission, fuel_type, price_per_day, ac, partner_id, image_url } = req.body;
  
  let finalImageUrl = image_url;
  if (req.body.image_urls && Array.isArray(req.body.image_urls)) {
    const finalUrls = req.body.image_urls.map((img: string) => {
      if (typeof img === 'string' && img.startsWith('data:image/')) return saveBase64Image(img);
      return img;
    });
    if (finalUrls.length > 0) {
      finalImageUrl = JSON.stringify(finalUrls);
    }
  } else if (finalImageUrl && typeof finalImageUrl === 'string' && finalImageUrl.startsWith('data:image/')) {
    finalImageUrl = saveBase64Image(finalImageUrl);
  }

  const updateData: any = { make, model, transmission, fuel_type, price_per_day, ac, partner_id };
  if (finalImageUrl !== undefined) updateData.image_url = finalImageUrl;

  await supabase.from('vehicles').update(updateData).eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/delete-partner/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  
  const userId = req.params.id;

  try {
    // 1. Get user email
    const { data: user } = await supabase.from('users').select('email').eq('id', userId).single();

    // 2. Find their vehicles
    const { data: vehicles } = await supabase.from('vehicles').select('id').eq('partner_id', userId);
    const vehicleIds = vehicles?.map(v => v.id) || [];

    if (vehicleIds.length > 0) {
      // Find bookings for these vehicles
      const { data: bookings } = await supabase.from('bookings').select('id').in('vehicle_id', vehicleIds);
      const bookingIds = bookings?.map(b => b.id) || [];
      
      if (bookingIds.length > 0) {
        await supabase.from('payments').delete().in('booking_id', bookingIds);
        await supabase.from('reviews').delete().in('booking_id', bookingIds);
        await supabase.from('bookings').delete().in('id', bookingIds);
      }
      await supabase.from('vehicles').delete().in('id', vehicleIds);
    }

    // 3. User's own bookings
    const { data: userBookings } = await supabase.from('bookings').select('id').eq('user_id', userId);
    const userBookingIds = userBookings?.map(b => b.id) || [];
    if (userBookingIds.length > 0) {
      await supabase.from('payments').delete().in('booking_id', userBookingIds);
      await supabase.from('reviews').delete().in('booking_id', userBookingIds);
      await supabase.from('bookings').delete().in('id', userBookingIds);
    }

    // 4. Other user references
    await supabase.from('support_requests').delete().eq('user_id', userId);
    await supabase.from('reviews').delete().eq('user_id', userId);

    // 5. Delete partner requests with the same email
    if (user?.email) {
      await supabase.from('partner_requests').delete().eq('email', user.email);
    }

    // 6. Finally, delete the user
    await supabase.from('users').delete().eq('id', userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting partner:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/support/request", authenticateToken, async (req: any, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: "Missing fields" });
  await supabase.from('support_requests').insert({ user_id: req.user.id, subject, message });
  res.json({ success: true });
});

app.post("/api/admin/support/:id/resolve", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  await supabase.from('support_requests').update({ status: 'resolved' }).eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/users/:id/update", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { email, company_name, contact_number } = req.body;
  
  const { data: user } = await supabase.from('users').select('email').eq('id', req.params.id).maybeSingle();
  if (!user) return res.status(404).json({ error: "Not found" });
  
  await supabase.from('users').update({ email }).eq('id', req.params.id);
  await supabase.from('partner_requests').update({ email, company_name, contact_number }).eq('email', user.email);
  res.json({ success: true });
});

app.get("/api/partner/dashboard", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  
  let vehicles, bookings;
  if (req.user.role === 'admin') {
    const { data: v } = await supabase.from('vehicles').select('*');
    vehicles = v;
    const { data: b } = await supabase.from('bookings').select('*, vehicles(make, model), users(email)').order('start_date', { ascending: false });
    bookings = b?.map((booking: any) => ({ ...booking, make: booking.vehicles?.make, model: booking.vehicles?.model, user_email: booking.users?.email }));
  } else {
    const { data: v } = await supabase.from('vehicles').select('*').eq('partner_id', req.user.id);
    vehicles = v;
    const { data: b } = await supabase.from('bookings').select('*, vehicles!inner(make, model, partner_id), users(email)').eq('vehicles.partner_id', req.user.id).order('start_date', { ascending: false });
    bookings = b?.map((booking: any) => ({ ...booking, make: booking.vehicles?.make, model: booking.vehicles?.model, user_email: booking.users?.email }));
  }

  res.json({ vehicles: vehicles || [], bookings: bookings || [] });
});

app.post("/api/partner/vehicles", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  
  const { make, model, transmission, fuel_type, price_per_day, ac, image_url, partner_id } = req.body;
  const targetPartnerId = (req.user.role === 'admin' && partner_id) ? partner_id : req.user.id;
  
  let finalImageUrl = image_url || '';
  
  if (req.body.image_urls && Array.isArray(req.body.image_urls)) {
    const finalUrls = req.body.image_urls.map((img: string) => {
      if (typeof img === 'string' && img.startsWith('data:image/')) return saveBase64Image(img);
      return img;
    });
    if (finalUrls.length > 0) {
      finalImageUrl = JSON.stringify(finalUrls);
    }
  } else if (finalImageUrl.startsWith('data:image/')) {
    finalImageUrl = saveBase64Image(finalImageUrl);
  }
  
  const { data } = await supabase.from('vehicles').insert({ 
    make, model, transmission, fuel_type, price_per_day, ac: !!ac, image_url: finalImageUrl, partner_id: targetPartnerId 
  }).select().single();
  
  res.json({ success: true, vehicle_id: data?.id });
});

app.post("/api/partner/edit-vehicle/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { make, model, transmission, fuel_type, price_per_day, ac, image_url } = req.body;
  
  let finalImageUrl = image_url;
  if (req.body.image_urls && Array.isArray(req.body.image_urls)) {
    const finalUrls = req.body.image_urls.map((img: string) => {
      if (typeof img === 'string' && img.startsWith('data:image/')) return saveBase64Image(img);
      return img;
    });
    if (finalUrls.length > 0) {
      finalImageUrl = JSON.stringify(finalUrls);
    }
  } else if (finalImageUrl && typeof finalImageUrl === 'string' && finalImageUrl.startsWith('data:image/')) {
    finalImageUrl = saveBase64Image(finalImageUrl);
  }

  const updateData: any = { make, model, transmission, fuel_type, price_per_day, ac: !!ac };
  if (finalImageUrl !== undefined) updateData.image_url = finalImageUrl;

  await supabase.from('vehicles').update(updateData)
    .eq('id', req.params.id)
    .eq('partner_id', req.user.id);
    
  res.json({ success: true });
});

app.post("/api/partner/delete-vehicle/:id", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  
  const { data: v } = await supabase.from('vehicles').select('id').eq('id', req.params.id).eq('partner_id', req.user.id).maybeSingle();
  if (!v) return res.status(404).json({ error: "Vehicle not found" });

  await supabase.from('bookings').delete().eq('vehicle_id', req.params.id);
  await supabase.from('vehicles').delete().eq('id', req.params.id);
  res.json({ success: true });
});

app.post("/api/admin/partners/:id/:action", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { id, action } = req.params;
  if (action !== 'accept' && action !== 'reject') return res.status(400).json({ error: "Invalid action" });

  const { data: appRecord } = await supabase.from('partner_requests').select('*').eq('id', id).eq('status', 'pending').maybeSingle();
  if (!appRecord) return res.status(404).json({ error: "Application not found or already processed" });

  const newStatus = action === 'accept' ? 'accepted' : 'rejected';
  await supabase.from('partner_requests').update({ status: newStatus }).eq('id', id);

  let signupToken = "";
  if (action === 'accept') {
    signupToken = Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
    await supabase.from('signup_tokens').insert({ token: signupToken, email: appRecord.email, role: 'partner' });
  }

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      let emailText = `Hello ${appRecord.company_name},\n\nYour application to join SpaceRent has been ${newStatus}.`;
      if (action === 'accept') {
        const signupUrl = `${process.env.APP_URL || 'https://ais-pre-3zgnkqgcrx4367d2vtbdjk-337780065630.europe-west2.run.app'}/signup/${signupToken}`;
        emailText += `\n\nYou can now create your account using the link below:\n${signupUrl}\n\nNote: This link is unique to you.`;
      }
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: appRecord.email,
        subject: `SpaceRent Partner Application ${newStatus.toUpperCase()}`,
        text: emailText
      });
    }
  } catch (err) { console.error("Failed to send email", err); }

  res.json({ success: true });
});

const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'test';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'test';
const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';

async function generatePayPalAccessToken() {
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_CLIENT_SECRET).toString('base64');
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });
  const data = await response.json();
  return data.access_token;
}

app.post('/api/orders', authenticateToken, async (req: any, res) => {
  try {
    const { booking_id } = req.body;
    const { data: booking } = await supabase.from('bookings').select('*').eq('id', booking_id).single();
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    
    // Check if it belongs to user
    if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    
    const accessToken = await generatePayPalAccessToken();
    const url = `${PAYPAL_API_BASE}/v2/checkout/orders`;
    const payload = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'EUR',
            value: booking.total_price.toString(),
          },
          custom_id: booking_id,
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to create order' });
  }
});

app.post('/api/orders/:orderID/capture', authenticateToken, async (req: any, res) => {
  try {
    const { orderID } = req.params;
    const { booking_id } = req.body;
    
    const accessToken = await generatePayPalAccessToken();
    const url = `${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (data.status === 'COMPLETED') {
      await supabase.from('bookings').update({ status: 'paid' }).eq('id', booking_id);
      
      try {
        const capture = data.purchase_units[0].payments.captures[0];
        await supabase.from('payments').insert({
          booking_id,
          amount: parseFloat(capture.amount.value),
          currency: capture.amount.currency_code,
          status: 'completed',
          payment_method: 'paypal',
        });
      } catch (err) {
        console.error("Failed recording payment:", err);
      }
      
      return res.json(data);
    } else {
       return res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to capture order' });
  }
});

app.get("/api/locations", async (req, res) => {
  const { data } = await supabase.from('locations').select('*');
  res.json(data || []);
});

app.get("/api/vehicles", async (req, res) => {
  const { start_date, end_date } = req.query;

  if (start_date && end_date) {
    const { data: bookings } = await supabase.from('bookings')
      .select('vehicle_id')
      .neq('status', 'rejected')
      .neq('status', 'cancelled')
      .lte('start_date', end_date as string)
      .gte('end_date', start_date as string);
      
    const bookedIds = bookings?.map(b => b.vehicle_id) || [];
    
    // Fetch all vehicles
    const { data: allVehicles } = await supabase.from('vehicles').select('*');
    
    const available = allVehicles?.filter(v => !bookedIds.includes(v.id)) || [];
    res.json(available);
  } else {
    const { data: vehicles } = await supabase.from('vehicles').select('*');
    res.json(vehicles || []);
  }
});

app.post("/api/bookings", authenticateToken, async (req: any, res) => {
  const { vehicle_id, start_date, end_date, total_price, contact_name, contact_phone, contact_email } = req.body;
  
  const { data: overlaps } = await supabase.from('bookings')
    .select('id')
    .eq('vehicle_id', vehicle_id)
    .neq('status', 'rejected')
    .neq('status', 'cancelled')
    .lte('start_date', end_date)
    .gte('end_date', start_date);

  if (overlaps && overlaps.length > 0) {
    return res.status(400).json({ error: "Vehicle is already booked for these dates." });
  }

  const { data } = await supabase.from('bookings').insert({
    vehicle_id, user_id: req.user.id, start_date, end_date, total_price,
    contact_name, contact_phone, contact_email: contact_email || req.user.email, status: 'pending'
  }).select('id').single();
  
  res.json({ success: true, booking_id: data?.id });
});

app.post("/api/bookings/:id/status", authenticateToken, async (req: any, res) => {
  if (req.user.role !== "admin" && req.user.role !== "partner") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { status, language = 'en' } = req.body;
  if (!['pending', 'accepted', 'rejected', 'cancelled'].includes(status)) return res.status(400).json({ error: "Invalid status" });

  const { data: booking } = await supabase.from('bookings').select('*, vehicles(make, model, partner_id, users(email))').eq('id', req.params.id).maybeSingle();
  if (!booking) return res.status(404).json({ error: "Booking not found" });

  const vehicle = booking.vehicles;

  if (req.user.role === "partner") {
    if (!vehicle || vehicle.partner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  }

  await supabase.from('bookings').update({ status }).eq('id', req.params.id);

  if (status === 'accepted' || status === 'rejected' || status === 'cancelled') {
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const clientEmail = booking.contact_email;
        // In the nested select, it might be an object or array. Assume object since partner_id is foreign key.
        const partnerEmail = vehicle?.users?.email || vehicle?.users?.[0]?.email;
        
        const { data: adminUsers } = await supabase.from('users').select('email').eq('role', 'admin');
        const adminEmails = adminUsers?.map(a => a.email) || [];
        
        const carName = `\${vehicle?.make} \${vehicle?.model}`;
        
        const isSq = language === 'sq';
        const labels = {
          vehicle: isSq ? 'Automjeti' : 'Vehicle',
          dates: isSq ? 'Datat' : 'Dates',
          totalPrice: isSq ? 'Çmimi Total' : 'Total Price',
          contact: isSq ? 'Kontakti' : 'Contact',
          contactEmail: isSq ? 'Emaili i Klientit' : 'Client Email',
          acceptedSubject: isSq ? `SpaceRent: Rezervimi juaj u pranua (\${carName})` : `SpaceRent: Your Booking is Accepted (\${carName})`,
          rejectedSubject: isSq ? `SpaceRent: Rezervimi juaj u refuzua (\${carName})` : `SpaceRent: Your Booking is Rejected (\${carName})`,
          cancelledSubject: isSq ? `SpaceRent: Rezervimi juaj u anulua (\${carName})` : `SpaceRent: Your Booking is Cancelled (\${carName})`,
          acceptedBody: isSq ? `Përshëndetje \${booking.contact_name || 'Klient'},\n\nRezervimi juaj për \${carName} është pranuar.\n\nDetajet e Rezervimit:` : `Hello \${booking.contact_name || 'Client'},\n\nYour booking for \${carName} has been accepted.\n\nBooking Details:`,
          rejectedBody: isSq ? `Përshëndetje \${booking.contact_name || 'Klient'},\n\nNa vjen keq, por rezervimi juaj për \${carName} është refuzuar.\n\nDetajet e Rezervimit:` : `Hello \${booking.contact_name || 'Client'},\n\nWe are sorry, but your booking for \${carName} has been rejected.\n\nBooking Details:`,
          cancelledBody: isSq ? `Përshëndetje \${booking.contact_name || 'Klient'},\n\nRezervimi juaj për \${carName} është anulua.\n\nDetajet e Rezervimit:` : `Hello \${booking.contact_name || 'Client'},\n\nYour booking for \${carName} has been cancelled.\n\nBooking Details:`,
          thanks: isSq ? `\n\nFaleminderit që zgjodhët SpaceRent!` : `\n\nThank you for choosing SpaceRent!`,
        };

        const bookingDetails = `
\${labels.vehicle}: \${carName}
\${labels.dates}: \${booking.start_date} - \${booking.end_date}
\${labels.totalPrice}: EUR \${booking.total_price}
\${labels.contact}: \${booking.contact_name} (\${booking.contact_phone})
\${labels.contactEmail}: \${booking.contact_email}
        `;

        let subject = '';
        let bodyPrefix = '';
        if (status === 'accepted') {
          subject = labels.acceptedSubject;
          bodyPrefix = labels.acceptedBody;
        } else if (status === 'rejected') {
          subject = labels.rejectedSubject;
          bodyPrefix = labels.rejectedBody;
        } else if (status === 'cancelled') {
          subject = labels.cancelledSubject;
          bodyPrefix = labels.cancelledBody;
        }

        if (clientEmail) {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: clientEmail,
            subject: subject,
            text: `\${bodyPrefix}\${bookingDetails}\${labels.thanks}`,
          });
        }

        if (partnerEmail) {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: partnerEmail,
            subject: `SpaceRent: Booking \${status.toUpperCase()} (\${carName})`,
            text: `Hello Partner,\n\nA booking for your vehicle \${carName} has been \${status}.\n\nBooking Details:\${bookingDetails}`,
          });
        }

        if (adminEmails.length > 0) {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: adminEmails,
            subject: `SpaceRent: Booking \${status.toUpperCase()} (\${carName})`,
            text: `Hello Admin,\n\nA booking for partner vehicle \${carName} has been \${status}.\n\nBooking Details:\${bookingDetails}`,
          });
        }
      }
    } catch (err) {
      console.error("Failed to send booking emails", err);
    }
  }

  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

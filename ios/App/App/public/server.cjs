var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_bcryptjs = __toESM(require("bcryptjs"), 1);
var import_jsonwebtoken = __toESM(require("jsonwebtoken"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var app = (0, import_express.default)();
var PORT = 3e3;
var JWT_SECRET = "super-secret-key-change-me";
var transporter = import_nodemailer.default.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var uploadsDir = import_path.default.join("/tmp", "uploads");
if (!import_fs.default.existsSync(uploadsDir)) {
  import_fs.default.mkdirSync(uploadsDir);
}
app.use("/uploads", import_express.default.static(uploadsDir));
var saveBase64Image = (dataUrl) => {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) return dataUrl;
  const matches = dataUrl.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) return dataUrl;
  const extension = matches[1];
  const buffer = Buffer.from(matches[2], "base64");
  const fileName = "img_" + Date.now() + Math.random().toString(36).substring(7) + "." + extension;
  import_fs.default.writeFileSync(import_path.default.join(uploadsDir, fileName), buffer);
  return "/uploads/" + fileName;
};
var supabaseUrl = process.env.SUPABASE_URL || "";
var supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
if (!supabaseUrl || !supabaseKey) {
  console.warn("WARNING: SUPABASE_URL or SUPABASE_ANON_KEY missing. Database operations will fail. Please add them to .env");
}
var supabase = (0, import_supabase_js.createClient)(supabaseUrl, supabaseKey);
var authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });
  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  import_jsonwebtoken.default.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Forbidden" });
    req.user = user;
    next();
  });
};
app.post("/api/auth/register", async (req, res) => {
  const { email, password } = req.body;
  const hash = import_bcryptjs.default.hashSync(password, 8);
  const { data, error } = await supabase.from("users").insert({ email, password_hash: hash, role: "user" }).select().single();
  if (error || !data) return res.status(400).json({ error: "Email already exists" });
  const token = import_jsonwebtoken.default.sign({ id: data.id, email, role: "user" }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: data.id, email, role: "user" } });
});
app.post("/api/auth/register-token", async (req, res) => {
  const { token, password } = req.body;
  const { data: tokenRecord } = await supabase.from("signup_tokens").select("*").eq("token", token).eq("used", false).single();
  if (!tokenRecord) return res.status(400).json({ error: "Invalid or expired token" });
  const hash = import_bcryptjs.default.hashSync(password, 8);
  const { data: existingUser } = await supabase.from("users").select("*").eq("email", tokenRecord.email).maybeSingle();
  let id, role = tokenRecord.role;
  if (existingUser) {
    id = existingUser.id;
    await supabase.from("users").update({ password_hash: hash, role }).eq("email", tokenRecord.email);
  } else {
    const { data: newUser } = await supabase.from("users").insert({ email: tokenRecord.email, password_hash: hash, role }).select().single();
    id = newUser?.id;
  }
  await supabase.from("signup_tokens").update({ used: true }).eq("token", token);
  const jwtToken = import_jsonwebtoken.default.sign({ id, email: tokenRecord.email, role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token: jwtToken, user: { id, email: tokenRecord.email, role } });
});
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const { data: user } = await supabase.from("users").select("*").eq("email", email).maybeSingle();
  if (!user || !import_bcryptjs.default.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = import_jsonwebtoken.default.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});
app.get("/api/auth/me", authenticateToken, async (req, res) => {
  const { data: user } = await supabase.from("users").select("id, email, role").eq("id", req.user.id).single();
  res.json(user);
});
app.post("/api/partner/apply", async (req, res) => {
  const { email, company_name, contact_number, business_number } = req.body;
  if (!email || !company_name || !contact_number) return res.status(400).json({ error: "Missing required fields" });
  const { data: existing } = await supabase.from("partner_requests").select("*").eq("email", email).eq("status", "pending").maybeSingle();
  if (existing) return res.status(400).json({ error: "You already have a pending application" });
  await supabase.from("partner_requests").insert({ email, company_name, contact_number, business_number: business_number || null });
  res.json({ success: true });
});
app.get("/api/admin/dashboard", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const [{ count: bookingsCount }] = await Promise.all([
    supabase.from("bookings").select("*", { count: "exact", head: true })
  ]);
  const { data: pendingPartners } = await supabase.from("partner_requests").select("*").eq("status", "pending");
  const { data: supportRequests } = await supabase.from("support_requests").select("*, users(email, role)").order("created_at", { ascending: false });
  const { data: recentBookings } = await supabase.from("bookings").select("*").order("created_at", { ascending: false }).limit(10);
  const { data: allUsersForPartners } = await supabase.from("users").select("id, email, role").eq("role", "partner");
  let allPartners = [];
  if (allUsersForPartners && allUsersForPartners.length > 0) {
    const emails = allUsersForPartners.map((u) => u.email);
    const { data: relatedRequests } = await supabase.from("partner_requests").select("email, company_name, contact_number").in("email", emails);
    allPartners = allUsersForPartners.map((u) => {
      const pr = relatedRequests?.find((r) => r.email === u.email);
      return {
        id: u.id,
        email: u.email,
        company_name: pr?.company_name || "N/A",
        contact_number: pr?.contact_number || "N/A"
      };
    });
  }
  const { data: vehicles } = await supabase.from("vehicles").select("*");
  const { data: users } = await supabase.from("users").select("id, email, role");
  res.json({
    metrics: { bookings: bookingsCount || 0 },
    applications: pendingPartners || [],
    supportRequests: supportRequests || [],
    bookings: recentBookings || [],
    partners: allPartners,
    vehicles: vehicles || [],
    users: users || []
  });
});
app.post("/api/admin/users/:id/role", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { role } = req.body;
  if (!["admin", "partner", "user"].includes(role)) return res.status(400).json({ error: "Invalid role" });
  await supabase.from("users").update({ role }).eq("id", req.params.id);
  res.json({ success: true });
});
app.post("/api/admin/delete-vehicle/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  await supabase.from("bookings").delete().eq("vehicle_id", req.params.id);
  await supabase.from("vehicles").delete().eq("id", req.params.id);
  res.json({ success: true });
});
app.post("/api/admin/edit-vehicle/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { make, model, transmission, fuel_type, price_per_day, ac, partner_id, image_url } = req.body;
  let finalImageUrl = image_url;
  if (req.body.image_urls && Array.isArray(req.body.image_urls)) {
    const finalUrls = req.body.image_urls.map((img) => {
      if (typeof img === "string" && img.startsWith("data:image/")) return saveBase64Image(img);
      return img;
    });
    if (finalUrls.length > 0) {
      finalImageUrl = JSON.stringify(finalUrls);
    }
  } else if (finalImageUrl && typeof finalImageUrl === "string" && finalImageUrl.startsWith("data:image/")) {
    finalImageUrl = saveBase64Image(finalImageUrl);
  }
  const updateData = { make, model, transmission, fuel_type, price_per_day, ac, partner_id };
  if (finalImageUrl !== void 0) updateData.image_url = finalImageUrl;
  await supabase.from("vehicles").update(updateData).eq("id", req.params.id);
  res.json({ success: true });
});
app.post("/api/admin/delete-partner/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const userId = req.params.id;
  try {
    const { data: user } = await supabase.from("users").select("email").eq("id", userId).single();
    const { data: vehicles } = await supabase.from("vehicles").select("id").eq("partner_id", userId);
    const vehicleIds = vehicles?.map((v) => v.id) || [];
    if (vehicleIds.length > 0) {
      const { data: bookings } = await supabase.from("bookings").select("id").in("vehicle_id", vehicleIds);
      const bookingIds = bookings?.map((b) => b.id) || [];
      if (bookingIds.length > 0) {
        await supabase.from("payments").delete().in("booking_id", bookingIds);
        await supabase.from("reviews").delete().in("booking_id", bookingIds);
        await supabase.from("bookings").delete().in("id", bookingIds);
      }
      await supabase.from("vehicles").delete().in("id", vehicleIds);
    }
    const { data: userBookings } = await supabase.from("bookings").select("id").eq("user_id", userId);
    const userBookingIds = userBookings?.map((b) => b.id) || [];
    if (userBookingIds.length > 0) {
      await supabase.from("payments").delete().in("booking_id", userBookingIds);
      await supabase.from("reviews").delete().in("booking_id", userBookingIds);
      await supabase.from("bookings").delete().in("id", userBookingIds);
    }
    await supabase.from("support_requests").delete().eq("user_id", userId);
    await supabase.from("reviews").delete().eq("user_id", userId);
    if (user?.email) {
      await supabase.from("partner_requests").delete().eq("email", user.email);
    }
    await supabase.from("users").delete().eq("id", userId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting partner:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/api/support/request", authenticateToken, async (req, res) => {
  const { subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: "Missing fields" });
  await supabase.from("support_requests").insert({ user_id: req.user.id, subject, message });
  res.json({ success: true });
});
app.post("/api/admin/support/:id/resolve", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  await supabase.from("support_requests").update({ status: "resolved" }).eq("id", req.params.id);
  res.json({ success: true });
});
app.post("/api/admin/users/:id/update", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { email, company_name, contact_number } = req.body;
  const { data: user } = await supabase.from("users").select("email").eq("id", req.params.id).maybeSingle();
  if (!user) return res.status(404).json({ error: "Not found" });
  await supabase.from("users").update({ email }).eq("id", req.params.id);
  await supabase.from("partner_requests").update({ email, company_name, contact_number }).eq("email", user.email);
  res.json({ success: true });
});
app.get("/api/partner/dashboard", authenticateToken, async (req, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  let vehicles, bookings;
  if (req.user.role === "admin") {
    const { data: v } = await supabase.from("vehicles").select("*");
    vehicles = v;
    const { data: b } = await supabase.from("bookings").select("*, vehicles(make, model), users(email)").order("start_date", { ascending: false });
    bookings = b?.map((booking) => ({ ...booking, make: booking.vehicles?.make, model: booking.vehicles?.model, user_email: booking.users?.email }));
  } else {
    const { data: v } = await supabase.from("vehicles").select("*").eq("partner_id", req.user.id);
    vehicles = v;
    const { data: b } = await supabase.from("bookings").select("*, vehicles!inner(make, model, partner_id), users(email)").eq("vehicles.partner_id", req.user.id).order("start_date", { ascending: false });
    bookings = b?.map((booking) => ({ ...booking, make: booking.vehicles?.make, model: booking.vehicles?.model, user_email: booking.users?.email }));
  }
  res.json({ vehicles: vehicles || [], bookings: bookings || [] });
});
app.post("/api/partner/vehicles", authenticateToken, async (req, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { make, model, transmission, fuel_type, price_per_day, ac, image_url, partner_id } = req.body;
  const targetPartnerId = req.user.role === "admin" && partner_id ? partner_id : req.user.id;
  let finalImageUrl = image_url || "";
  if (req.body.image_urls && Array.isArray(req.body.image_urls)) {
    const finalUrls = req.body.image_urls.map((img) => {
      if (typeof img === "string" && img.startsWith("data:image/")) return saveBase64Image(img);
      return img;
    });
    if (finalUrls.length > 0) {
      finalImageUrl = JSON.stringify(finalUrls);
    }
  } else if (finalImageUrl.startsWith("data:image/")) {
    finalImageUrl = saveBase64Image(finalImageUrl);
  }
  const { data } = await supabase.from("vehicles").insert({
    make,
    model,
    transmission,
    fuel_type,
    price_per_day,
    ac: !!ac,
    image_url: finalImageUrl,
    partner_id: targetPartnerId
  }).select().single();
  res.json({ success: true, vehicle_id: data?.id });
});
app.post("/api/partner/edit-vehicle/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { make, model, transmission, fuel_type, price_per_day, ac, image_url } = req.body;
  let finalImageUrl = image_url;
  if (req.body.image_urls && Array.isArray(req.body.image_urls)) {
    const finalUrls = req.body.image_urls.map((img) => {
      if (typeof img === "string" && img.startsWith("data:image/")) return saveBase64Image(img);
      return img;
    });
    if (finalUrls.length > 0) {
      finalImageUrl = JSON.stringify(finalUrls);
    }
  } else if (finalImageUrl && typeof finalImageUrl === "string" && finalImageUrl.startsWith("data:image/")) {
    finalImageUrl = saveBase64Image(finalImageUrl);
  }
  const updateData = { make, model, transmission, fuel_type, price_per_day, ac: !!ac };
  if (finalImageUrl !== void 0) updateData.image_url = finalImageUrl;
  await supabase.from("vehicles").update(updateData).eq("id", req.params.id).eq("partner_id", req.user.id);
  res.json({ success: true });
});
app.post("/api/partner/delete-vehicle/:id", authenticateToken, async (req, res) => {
  if (req.user.role !== "partner" && req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { data: v } = await supabase.from("vehicles").select("id").eq("id", req.params.id).eq("partner_id", req.user.id).maybeSingle();
  if (!v) return res.status(404).json({ error: "Vehicle not found" });
  await supabase.from("bookings").delete().eq("vehicle_id", req.params.id);
  await supabase.from("vehicles").delete().eq("id", req.params.id);
  res.json({ success: true });
});
app.post("/api/admin/partners/:id/:action", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { id, action } = req.params;
  if (action !== "accept" && action !== "reject") return res.status(400).json({ error: "Invalid action" });
  const { data: appRecord } = await supabase.from("partner_requests").select("*").eq("id", id).eq("status", "pending").maybeSingle();
  if (!appRecord) return res.status(404).json({ error: "Application not found or already processed" });
  const newStatus = action === "accept" ? "accepted" : "rejected";
  await supabase.from("partner_requests").update({ status: newStatus }).eq("id", id);
  let signupToken = "";
  if (action === "accept") {
    signupToken = Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
    await supabase.from("signup_tokens").insert({ token: signupToken, email: appRecord.email, role: "partner" });
  }
  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      let emailText = `Hello ${appRecord.company_name},

Your application to join SpaceRent has been ${newStatus}.`;
      if (action === "accept") {
        const signupUrl = `${process.env.APP_URL || "https://ais-pre-3zgnkqgcrx4367d2vtbdjk-337780065630.europe-west2.run.app"}/signup/${signupToken}`;
        emailText += `

You can now create your account using the link below:
${signupUrl}

Note: This link is unique to you.`;
      }
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: appRecord.email,
        subject: `SpaceRent Partner Application ${newStatus.toUpperCase()}`,
        text: emailText
      });
    }
  } catch (err) {
    console.error("Failed to send email", err);
  }
  res.json({ success: true });
});
var PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || "test";
var PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || "test";
var PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";
async function generatePayPalAccessToken() {
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ":" + PAYPAL_CLIENT_SECRET).toString("base64");
  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  const data = await response.json();
  return data.access_token;
}
app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const { booking_id } = req.body;
    const { data: booking } = await supabase.from("bookings").select("*").eq("id", booking_id).single();
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.user_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    const accessToken = await generatePayPalAccessToken();
    const url = `${PAYPAL_API_BASE}/v2/checkout/orders`;
    const payload = {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "EUR",
            value: booking.total_price.toString()
          },
          custom_id: booking_id
        }
      ]
    };
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return res.json(data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to create order" });
  }
});
app.post("/api/orders/:orderID/capture", authenticateToken, async (req, res) => {
  try {
    const { orderID } = req.params;
    const { booking_id } = req.body;
    const accessToken = await generatePayPalAccessToken();
    const url = `${PAYPAL_API_BASE}/v2/checkout/orders/${orderID}/capture`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      }
    });
    const data = await response.json();
    if (data.status === "COMPLETED") {
      await supabase.from("bookings").update({ status: "paid" }).eq("id", booking_id);
      try {
        const capture = data.purchase_units[0].payments.captures[0];
        await supabase.from("payments").insert({
          booking_id,
          amount: parseFloat(capture.amount.value),
          currency: capture.amount.currency_code,
          status: "completed",
          payment_method: "paypal"
        });
      } catch (err) {
        console.error("Failed recording payment:", err);
      }
      return res.json(data);
    } else {
      return res.status(400).json({ error: "Payment not completed" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to capture order" });
  }
});
app.get("/api/locations", async (req, res) => {
  const { data } = await supabase.from("locations").select("*");
  res.json(data || []);
});
app.get("/api/vehicles", async (req, res) => {
  const { start_date, end_date } = req.query;
  if (start_date && end_date) {
    const { data: bookings } = await supabase.from("bookings").select("vehicle_id").neq("status", "rejected").neq("status", "cancelled").lte("start_date", end_date).gte("end_date", start_date);
    const bookedIds = bookings?.map((b) => b.vehicle_id) || [];
    const { data: allVehicles } = await supabase.from("vehicles").select("*");
    const available = allVehicles?.filter((v) => !bookedIds.includes(v.id)) || [];
    res.json(available);
  } else {
    const { data: vehicles } = await supabase.from("vehicles").select("*");
    res.json(vehicles || []);
  }
});
app.post("/api/bookings", authenticateToken, async (req, res) => {
  const { vehicle_id, start_date, end_date, total_price, contact_name, contact_phone, contact_email } = req.body;
  const { data: overlaps } = await supabase.from("bookings").select("id").eq("vehicle_id", vehicle_id).neq("status", "rejected").neq("status", "cancelled").lte("start_date", end_date).gte("end_date", start_date);
  if (overlaps && overlaps.length > 0) {
    return res.status(400).json({ error: "Vehicle is already booked for these dates." });
  }
  const { data } = await supabase.from("bookings").insert({
    vehicle_id,
    user_id: req.user.id,
    start_date,
    end_date,
    total_price,
    contact_name,
    contact_phone,
    contact_email: contact_email || req.user.email,
    status: "pending"
  }).select("id").single();
  res.json({ success: true, booking_id: data?.id });
});
app.post("/api/bookings/:id/status", authenticateToken, async (req, res) => {
  if (req.user.role !== "admin" && req.user.role !== "partner") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const { status } = req.body;
  if (!["pending", "accepted", "rejected", "cancelled"].includes(status)) return res.status(400).json({ error: "Invalid status" });
  const { data: booking } = await supabase.from("bookings").select("*, vehicles(make, model, partner_id, users(email))").eq("id", req.params.id).maybeSingle();
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  const vehicle = booking.vehicles;
  if (req.user.role === "partner") {
    if (!vehicle || vehicle.partner_id !== req.user.id) return res.status(403).json({ error: "Forbidden" });
  }
  await supabase.from("bookings").update({ status }).eq("id", req.params.id);
  if (status === "accepted") {
    try {
      if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        const clientEmail = booking.contact_email;
        const partnerEmail = vehicle?.users?.email || vehicle?.users?.[0]?.email;
        const { data: adminUsers } = await supabase.from("users").select("email").eq("role", "admin");
        const adminEmails = adminUsers?.map((a) => a.email) || [];
        const carName = `${vehicle?.make} ${vehicle?.model}`;
        const bookingDetails = `
Vehicle: ${carName}
Dates: ${booking.start_date} to ${booking.end_date}
Total Price: EUR ${booking.total_price}
Contact: ${booking.contact_name} (${booking.contact_phone})
        `;
        if (clientEmail) {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: clientEmail,
            subject: `SpaceRent: Your Booking is Accepted (${carName})`,
            text: `Hello ${booking.contact_name || "Client"},

Your booking for ${carName} has been accepted.

Booking Details:${bookingDetails}

Thank you for choosing SpaceRent!`
          });
        }
        if (partnerEmail) {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: partnerEmail,
            subject: `SpaceRent: Booking Accepted (${carName})`,
            text: `Hello Partner,

A booking for your vehicle ${carName} has been accepted.

Booking Details:${bookingDetails}`
          });
        }
        if (adminEmails.length > 0) {
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: adminEmails,
            subject: `SpaceRent: Booking Accepted (${carName})`,
            text: `Hello Admin,

A booking for partner vehicle ${carName} has been accepted.

Booking Details:${bookingDetails}`
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
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map

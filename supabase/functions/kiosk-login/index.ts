// Kiosk NFC login — replaces the Apps Script `loginWithNfc` action.
//
// Flow: browser sends { uid, deviceId } -> we check the staff card + trusted
// device with the service key -> mint a one-time magic-link token for that
// staff member's email -> browser calls supabase.auth.verifyOtp() with the
// returned token_hash and receives a REAL Supabase session, so every RLS
// policy applies to kiosk users exactly like Google-signed-in users.
//
// Deploy:  supabase functions deploy kiosk-login
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from "npm:@supabase/supabase-js@2";

// Only these origins get a CORS response; anyone else's preflight fails and
// the browser blocks the request before it's sent.
const ALLOWED_ORIGINS = new Set([
  "https://bredliplaku.com",
  "https://www.bredliplaku.com",
  "https://bredliplaku.github.io",
]);
const LOCALHOST_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const isAllowed = ALLOWED_ORIGINS.has(origin) || LOCALHOST_RE.test(origin);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Vary": "Origin",
  };
  if (isAllowed) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

// Brute-force guard: this endpoint is unauthenticated by design (it IS the
// login step), and student UIDs need no trusted-device check, so it's the
// one place in the app reachable by a caller with no credentials at all.
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const { uid, deviceId } = await req.json();
    if (!uid) return json({ result: "error", message: "Missing uid" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();

    // Self-cleaning: every call prunes rows outside the window, so the table
    // never grows unbounded and there's nothing to schedule or maintain.
    await admin.from("login_attempts").delete().lt("created_at", windowStart);

    const { count: recentAttempts, error: rateErr } = await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", windowStart);
    if (rateErr) throw rateErr;
    if ((recentAttempts ?? 0) >= RATE_LIMIT_MAX_ATTEMPTS) {
      return json({ result: "error", message: "Too many attempts. Try again shortly." }, 429);
    }
    await admin.from("login_attempts").insert({ ip });

    // 1. Does this card belong to a staff member?
    const { data: staffRows, error: staffErr } = await admin
      .from("staff")
      .select("name,email,role")
      .eq("uid", String(uid).trim());
    if (staffErr) throw staffErr;
    if (!staffRows || staffRows.length === 0) {
      return json({ result: "not_admin", message: "UID not recognized as staff." });
    }

    const { name, email, role } = staffRows[0];

    // 2. Non-students may only log in from a trusted device
    if (role !== "Student") {
      const { data: devices, error: devErr } = await admin
        .from("trusted_devices")
        .select("id")
        .eq("device_id", String(deviceId ?? "").trim());
      if (devErr) throw devErr;
      if (!devices || devices.length === 0) {
        return json({
          result: "error",
          message: "Device not trusted. Sign in with Google to register this device.",
        });
      }
    }

    // 3. Mint a one-time token (creating the auth user on first kiosk login)
    let link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error && /not found/i.test(link.error.message ?? "")) {
      const { error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name },
      });
      if (createErr) throw createErr;
      link = await admin.auth.admin.generateLink({ type: "magiclink", email });
    }
    if (link.error) throw link.error;

    return json({
      result: "success",
      token_hash: link.data.properties.hashed_token,
      user: {
        email,
        name,
        picture:
          "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=random",
      },
    });
  } catch (e) {
    return json({ result: "error", message: String((e as Error)?.message ?? e) }, 500);
  }
});

// Smart Attendance — transactional email via Resend.
// Replaces the Apps Script MailApp templates 1:1.
//
// Secrets required (Dashboard → Edge Functions → Secrets, or `supabase secrets set`):
//   RESEND_API_KEY  — from resend.com (free tier)
//   MAIL_FROM       — e.g.  Smart Attendance <attendance@bredliplaku.com>
//
// Templates: absence_submitted | absence_approved | absence_rejected
//            | registration_approved | registration_rejected
//
// Security: the caller's Supabase JWT is verified; admin-only templates check
// check_admin_status(); absence_submitted requires the request to belong to
// the caller (or an admin). The service key never leaves this function.

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

const FALLBACK_GLOBAL_ADMINS = ["bplaku@epoka.edu.al"];
const APP_URL = "https://bredliplaku.com/attendance/";

const service = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------------------------------------------------------------------------
// Shared formatting helpers (ported from gscript.js)
// ---------------------------------------------------------------------------

const rowStyle = "border-bottom:1px solid #efefef;";
const labelStyle = `padding:10px 14px;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;vertical-align:middle;width:110px;${rowStyle}`;
const valueStyle = `padding:10px 14px;font-size:14px;color:#333;${rowStyle}`;
const lastLabelStyle = `padding:10px 14px;font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;vertical-align:middle;width:110px;`;
const lastValueStyle = `padding:10px 14px;font-size:14px;color:#333;`;
const footerHtml = `<hr style="border:none;border-top:1px solid #eee;margin:20px 0 8px;">
<p style="font-size:11px;color:#aaa;margin:0;">This is an automatically generated email. Please do not reply directly.</p>`;

function escapeHtml(s: string): string {
  return String(s ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function formatDateForEmail(dateStr: string): string {
  const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const parts = String(dateStr).split("-");
  if (parts.length !== 3) return String(dateStr);
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (isNaN(day) || monthIdx < 0 || monthIdx > 11) return String(dateStr);
  return `${day} ${MONTHS[monthIdx]} ${parts[0]}`;
}

function buildHourPillsHtml(hoursStr: string, approvedHoursStr: string | null): string {
  const hoursArray = (hoursStr || "").split(",").map((h) => h.trim()).filter(Boolean);
  const total = hoursArray.length;
  if (total === 0) return "";

  let approvedSet: Set<string> | null = null;
  if (approvedHoursStr !== null && approvedHoursStr !== undefined) {
    approvedSet = new Set(approvedHoursStr.split(",").map((h) => h.trim()).filter(Boolean));
  }

  return hoursArray.map((h, i) => {
    const isFirst = i === 0, isLast = i === total - 1, isOnly = total === 1;
    let borderRadius: string;
    if (isOnly) borderRadius = "8px";
    else if (isFirst) borderRadius = "8px 2px 2px 8px";
    else if (isLast) borderRadius = "2px 8px 8px 2px";
    else borderRadius = "2px";

    const tdPadding = isLast ? "0" : "0 2px 0 0";
    let bg: string, color: string, borderColor: string;
    if (approvedSet === null || approvedSet.has(h)) {
      bg = "#e8f0fe"; color = "#1a56db"; borderColor = "#c3d4fb";
    } else {
      bg = "#f5f5f5"; color = "#999"; borderColor = "#ddd";
    }
    const displayTime = h.split(/[–\-]/)[0].trim();
    return `<td style="padding:${tdPadding};"><span style="display:inline-block;background:${bg};color:${color};font-weight:600;font-size:13px;white-space:nowrap;padding:2px 10px;border-radius:${borderRadius};border:1px solid ${borderColor};">${displayTime}</span></td>`;
  }).join("");
}

function sessionBadgeHtml(session: string): string {
  return (session && session !== "Default" && session.trim())
    ? `&nbsp;<span style="background:#e3f2fd;color:#0053A1;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">${session}</span>`
    : "";
}

function attachmentLinkHtml(url: string): string {
  return url
    ? `<a href="${url}" style="color:#0053A1;text-decoration:none;font-weight:600;">View Document</a>`
    : `<span style="color:#aaa;font-style:italic;">No attachment</span>`;
}

function getSignatureHtml(): string {
  return `<tbody><tr><td style="padding:15px 0px;vertical-align:top"><table cellpadding="0" cellspacing="0" border="0" style="border-left:3px solid rgb(0,83,161);padding-left:12px;padding-bottom:10px"><tbody><tr><td style="padding-bottom:5px"><span style="font-weight:800;color:rgb(0,83,161);font-size:14px">Bredli PLAKU</span><br><span style="font-size:12px;color:rgb(0,0,0)">Assistant Lecturer | MSc</span><br><span style="color:rgb(0,83,161);font-size:12px">Department of Civil Engineering</span><br><span style="color:rgb(0,83,161);font-size:12px">Faculty of Architecture and Engineering</span><br></td></tr><tr><td><table cellpadding="0" cellspacing="0" border="0" style="font-size:12px"><tbody><tr><td style="padding-bottom:3px;width:60px"><strong>Website:</strong></td><td style="padding-bottom:3px;color:rgb(0,0,0)"><a href="https://bredliplaku.com" target="_blank" rel="noopener noreferrer" style="color: inherit; text-decoration: none;">bredliplaku.com</a></td></tr><tr><td style="padding-bottom:3px;width:60px"><strong>Office:</strong></td><td style="padding-bottom:3px;color:rgb(0,0,0)">A-032</td></tr><tr><td style="padding-bottom:3px;width:60px"><strong>Phone:</strong></td><td style="padding-bottom:3px;color:rgb(0,0,0)">+355 42 232 086 ext. 1556</td></tr><tr><td style="padding-bottom:3px;width:60px"><strong>Email:</strong></td><td style="padding-bottom:3px;color:rgb(0,0,0)">bplaku@epoka.edu.al</td></tr><tr><td style="padding-bottom:3px;width:60px;vertical-align:top"><strong>Address:</strong></td><td style="color:rgb(0,0,0)">Rruga Tiranë-Rinas, Km. 12<br>1032 Vorë, Tirana, Albania 🇦🇱</td></tr></tbody></table></td></tr></tbody></table></td></tr></tbody>`;
}

async function getSignatureForAdmin(adminEmail: string): Promise<string> {
  const isGlobalOwner = FALLBACK_GLOBAL_ADMINS.some(
    (a) => a.trim().toLowerCase() === (adminEmail || "").trim().toLowerCase(),
  );
  if (isGlobalOwner) {
    return `<p style="margin:0 0 4px;">Best,<br>Bredli</p><table cellpadding="0" cellspacing="0" border="0">${getSignatureHtml()}</table>`;
  }
  const { data } = await service.from("staff").select("name").ilike("email", adminEmail);
  if (data && data.length > 0 && data[0].name) {
    return `<p>Best,<br>${data[0].name.trim().split(" ")[0]}</p>`;
  }
  return `<p>Best,</p>`;
}

async function getAdminEmailsForCourse(courseName: string): Promise<string[]> {
  const { data } = await service.from("courses").select("admin_emails").eq("name", courseName);
  if (data && data.length > 0 && data[0].admin_emails) {
    return String(data[0].admin_emails).split(",").map((e) => e.trim()).filter(Boolean);
  }
  return [];
}

async function getAllGlobalAdminEmails(): Promise<string[]> {
  const globalEmails = [...FALLBACK_GLOBAL_ADMINS];
  const { data } = await service.from("staff").select("email").eq("role", "Global");
  (data || []).forEach((row) => { if (row.email) globalEmails.push(row.email); });
  return [...new Set(globalEmails)];
}

async function formatAdminEmailsForCC(emails: string[]): Promise<string[]> {
  if (!emails || emails.length === 0) return emails;
  const { data } = await service.from("staff").select("name,email").in("email", emails);
  const nameMap: Record<string, string> = {};
  (data || []).forEach((row) => { if (row.email) nameMap[row.email.toLowerCase()] = row.name; });
  return emails.map((email) => {
    const name = nameMap[email.toLowerCase()];
    return name ? `"${name}" <${email}>` : email;
  });
}

// Old rows store full Drive URLs; new rows store a Storage path. Storage paths
// become app deep-links, so the document is only reachable after signing in —
// the Storage RLS policy limits it to the requester and admins. A leaked email
// therefore never exposes the file itself.
function resolveAttachmentUrl(stored: string): string {
  if (!stored) return "";
  if (/^https?:\/\//i.test(stored)) return stored;
  return APP_URL + "?attachment=" + encodeURIComponent(stored);
}

async function sendViaResend(mail: { to: string[]; cc?: string[]; subject: string; html: string }) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": "Bearer " + Deno.env.get("RESEND_API_KEY")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: Deno.env.get("MAIL_FROM")!,
      to: mail.to,
      cc: mail.cc && mail.cc.length > 0 ? mail.cc : undefined,
      subject: mail.subject,
      html: mail.html,
    }),
  });
  if (!res.ok) throw new Error(`Resend [${res.status}]: ${await res.text()}`);
}

// ---------------------------------------------------------------------------
// Request handling
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });

  try {
    const params = await req.json();
    const template = params.template as string;

    // Verify the caller's session
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user?.email) return json({ result: "error", message: "Not signed in." }, 401);
    const callerEmail = user.email.toLowerCase();

    const adminTemplates = ["absence_approved", "absence_rejected", "registration_approved", "registration_rejected"];
    let isAdmin = false;
    if (adminTemplates.includes(template) || template === "absence_submitted") {
      const { data: status } = await userClient.rpc("check_admin_status");
      isAdmin = !!(status && status.isAdmin);
      if (adminTemplates.includes(template) && !isAdmin) {
        return json({ result: "error", message: "Not authorized." }, 403);
      }
    }

    // ------------------------------------------------------------------
    if (template === "absence_submitted") {
      const { data: rows } = await service.from("absences").select("*")
        .eq("request_id", params.request_id);
      const reqRow = rows?.[0];
      if (!reqRow) throw new Error("Request not found.");
      if (!isAdmin && (reqRow.student_email || "").toLowerCase() !== callerEmail) {
        return json({ result: "error", message: "Not authorized." }, 403);
      }

      const courseAdmins = await getAdminEmailsForCourse(reqRow.course);
      const globalAdmins = await getAllGlobalAdminEmails();
      const notifyAdmins = courseAdmins.length > 0 ? courseAdmins : globalAdmins;

      const formattedCourseName = String(reqRow.course || "").replace(/_/g, " ");
      const attachmentUrl = resolveAttachmentUrl(reqRow.attachment_url || "");
      const reviewUrl = `https://bredliplaku.com/attendance/#${reqRow.course}`;
      const descriptionHtml = (reqRow.description && reqRow.description.trim())
        ? escapeHtml(reqRow.description).replace(/\n/g, "<br>")
        : '<span style="color:#aaa;font-style:italic;">No description provided.</span>';

      const bodyHtml = `
        <div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6;max-width:600px;">
          <p style="margin:0 0 16px;color:#333;">Greetings,<br><br><span style="color:#555;">I am writing to submit a formal permission request. Please find the details of my request and the supporting documentation provided below for your review.</span></p>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:20px;background:#fafafa;cursor:default;">
            <tr><td style="${labelStyle}">Student</td><td style="${valueStyle}"><strong>${reqRow.student_name}</strong><br><span style="font-size:12px;color:#888;">${reqRow.student_email}</span></td></tr>
            <tr><td style="${labelStyle}">Course</td><td style="${valueStyle}"><strong>${formattedCourseName}</strong>${sessionBadgeHtml(reqRow.session || "")}</td></tr>
            <tr><td style="${labelStyle}">Date</td><td style="${valueStyle}">${formatDateForEmail(reqRow.absence_date)}</td></tr>
            <tr><td style="${labelStyle}">Hours</td><td style="${valueStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr>${buildHourPillsHtml(reqRow.hours, null)}</tr></table></td></tr>
            <tr><td style="${labelStyle}">Reason</td><td style="${valueStyle}">${reqRow.reason_type}</td></tr>
            <tr><td style="${labelStyle}">Description</td><td style="${valueStyle}text-align:justify;hyphens:auto;-webkit-hyphens:auto;-ms-hyphens:auto;" lang="en">${descriptionHtml}</td></tr>
            <tr><td style="${lastLabelStyle}">Attachment</td><td style="${lastValueStyle}">${attachmentLinkHtml(attachmentUrl)}</td></tr>
          </table>
          <p style="text-align:right;"><a href="${reviewUrl}" target="_blank" style="display:inline-block;background:#0053A1;color:#fff;text-decoration:none;font-weight:600;font-size:12px;border-radius:20px;padding:5px 16px;">Review Request</a></p>
          <p style="color:#333;">Kind regards,<br>${reqRow.student_name}</p>
          ${footerHtml}
        </div>`;

      await sendViaResend({
        to: await formatAdminEmailsForCC(notifyAdmins),
        cc: [`"${reqRow.student_name}" <${reqRow.student_email}>`],
        subject: `Permission Request for ${formattedCourseName}`,
        html: bodyHtml,
      });
      return json({ result: "success" });
    }

    // ------------------------------------------------------------------
    if (template === "absence_approved" || template === "absence_rejected") {
      const { data: rows } = await service.from("absences").select("*")
        .eq("request_id", params.request_id);
      const reqRow = rows?.[0];
      if (!reqRow) throw new Error("Request not found.");

      const formattedCourseName = String(reqRow.course || "").replace(/_/g, " ");
      const subject = `Permission Request for ${formattedCourseName}`;
      const firstName = reqRow.student_name ? reqRow.student_name.split(" ")[0] : "Student";
      const signatureHtml = await getSignatureForAdmin(callerEmail);
      const courseAdmins = await getAdminEmailsForCourse(reqRow.course);
      const attachmentUrl = resolveAttachmentUrl(reqRow.attachment_url || "");
      const formattedDate = reqRow.absence_date ? formatDateForEmail(reqRow.absence_date) : "";

      const dateRow = formattedDate
        ? `<tr><td style="${labelStyle}">Date</td><td style="${valueStyle}">${formattedDate}</td></tr>` : "";
      const reasonRow = reqRow.reason_type
        ? `<tr><td style="${labelStyle}">Reason</td><td style="${valueStyle}">${reqRow.reason_type}</td></tr>` : "";
      const descriptionHtml = (reqRow.description && String(reqRow.description).trim())
        ? escapeHtml(reqRow.description).replace(/\n/g, "<br>") : "";
      const descriptionRow = descriptionHtml
        ? `<tr><td style="${labelStyle}">Description</td><td style="${valueStyle}text-align:justify;hyphens:auto;-webkit-hyphens:auto;-ms-hyphens:auto;" lang="en">${descriptionHtml}</td></tr>` : "";
      const attachmentRow =
        `<tr><td style="${lastLabelStyle}">Attachment</td><td style="${lastValueStyle}">${attachmentLinkHtml(attachmentUrl)}</td></tr>`;

      let bodyHtml: string;

      if (template === "absence_approved") {
        const approvedHours = String(params.approvedHours ?? reqRow.hours);
        const originalHours = String(params.originalHours ?? reqRow.hours);
        const customMessage = String(params.customMessage ?? "");
        const isPartial = approvedHours !== originalHours;
        const statusText = isPartial ? "partially approved" : "approved";
        const statusColor = isPartial ? "#e67e22" : "#1a56db";
        const partialNote = isPartial
          ? `<p style="margin:4px 0 0;font-size:11px;color:#888;">Blue&nbsp;=&nbsp;approved &nbsp;&middot;&nbsp; Grey&nbsp;=&nbsp;not approved</p>` : "";
        const customMessageHtml = customMessage.trim()
          ? `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
              <tr><td style="background:#f0f7ff;border-left:3px solid #0053A1;padding:10px 14px;font-style:italic;color:#555;font-size:13px;text-align:justify;hyphens:auto;-webkit-hyphens:auto;-ms-hyphens:auto;" lang="en">${customMessage.replace(/\n/g, "<br>")}</td></tr>
             </table>` : "";

        bodyHtml = `
          <div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6;max-width:600px;">
            <p style="margin:0 0 16px;">Dear ${firstName},</p>
            <p style="margin:0 0 20px;">Your permission request for <strong>${formattedCourseName}</strong> has been <strong style="color:${statusColor};">${statusText}</strong>.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:20px;background:#fafafa;cursor:default;">
              <tr><td style="${labelStyle}">Course</td><td style="${valueStyle}"><strong>${formattedCourseName}</strong>${sessionBadgeHtml(reqRow.session || "")}</td></tr>
              ${dateRow}
              <tr><td style="${labelStyle}">Hours</td><td style="${valueStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr>${buildHourPillsHtml(originalHours, approvedHours)}</tr></table>${partialNote}</td></tr>
              ${reasonRow}
              ${descriptionRow}
              ${attachmentRow}
            </table>
            ${customMessageHtml}
            ${signatureHtml}
            ${footerHtml}
          </div>`;
      } else {
        const rejectionMessage = String(params.rejectionMessage ?? "");
        const rejectionBoxHtml = rejectionMessage.trim()
          ? `<table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
              <tr><td style="background:#fdf5f5;border-left:3px solid #c0392b;padding:10px 14px;font-style:italic;color:#555;font-size:13px;text-align:justify;hyphens:auto;-webkit-hyphens:auto;-ms-hyphens:auto;" lang="en">${rejectionMessage.replace(/\n/g, "<br>")}</td></tr>
             </table>` : "";

        bodyHtml = `
          <div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6;max-width:600px;">
            <p style="margin:0 0 16px;">Dear ${firstName},</p>
            <p style="margin:0 0 20px;">Your permission request for <strong>${formattedCourseName}</strong> has <span style="color:#c0392b;font-weight:600;">not been approved</span>.</p>
            <table cellpadding="0" cellspacing="0" border="0" style="width:100%;border:1px solid #e5e5e5;border-radius:6px;margin-bottom:20px;background:#fafafa;cursor:default;">
              <tr><td style="${labelStyle}">Course</td><td style="${valueStyle}"><strong>${formattedCourseName}</strong>${sessionBadgeHtml(reqRow.session || "")}</td></tr>
              ${dateRow}
              <tr><td style="${labelStyle}">Hours</td><td style="${valueStyle}"><table cellpadding="0" cellspacing="0" border="0"><tr>${buildHourPillsHtml(reqRow.hours, "")}</tr></table></td></tr>
              ${reasonRow}
              ${descriptionRow}
              ${attachmentRow}
            </table>
            ${rejectionBoxHtml}
            <p style="margin:0 0 20px;">Please feel free to reach out if you have any questions.</p>
            ${signatureHtml}
            ${footerHtml}
          </div>`;
      }

      await sendViaResend({
        to: [`"${reqRow.student_name}" <${reqRow.student_email}>`],
        cc: courseAdmins.length > 0 ? await formatAdminEmailsForCC(courseAdmins) : undefined,
        subject,
        html: bodyHtml,
      });
      return json({ result: "success" });
    }

    // ------------------------------------------------------------------
    if (template === "registration_approved") {
      const name = String(params.name ?? "");
      const email = String(params.email ?? "");
      if (!email) throw new Error("Missing student email.");
      const firstName = name.trim() ? name.split(" ")[0] : "Student";
      const greeting = name.trim() ? `Dear ${firstName},` : "Dear,";
      const signatureHtml = await getSignatureForAdmin(callerEmail);

      const bodyHtml = `
        <div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6;max-width:600px;">
          <p style="margin:0 0 16px;">${greeting}<br>I hope this email finds you well.</p>
          <p style="margin:0 0 20px;">Your application for your <strong>Student ID Card</strong> has been <span style="color:#1a7c3e;font-weight:600;">approved</span>.</p>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
            <tr><td style="background:#f0f7f1;border-left:3px solid #1a7c3e;padding:10px 14px;font-size:13px;color:#333;">
              Please ensure you always bring your student ID card to class. You are responsible for your own attendance if you do not have it with you.
            </td></tr>
          </table>
          <p style="margin:0 0 20px;font-size:13px;color:#555;">Track your attendance at <a href="https://attendance.bredliplaku.com" target="_blank" style="color:#0053A1;">attendance.bredliplaku.com</a>.</p>
          ${signatureHtml}
          ${footerHtml}
        </div>`;

      await sendViaResend({
        to: [`"${name}" <${email}>`],
        subject: "Your Student ID Card Application has been Approved",
        html: bodyHtml,
      });
      return json({ result: "success" });
    }

    // ------------------------------------------------------------------
    if (template === "registration_rejected") {
      const name = String(params.name ?? "");
      const email = String(params.email ?? "");
      const message = String(params.message ?? "");
      if (!email || !message) return json({ result: "success" }); // nothing to send
      const firstName = name.trim() ? name.split(" ")[0] : "Student";
      const signatureHtml = await getSignatureForAdmin(callerEmail);

      const bodyHtml = `
        <div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;font-size:14px;color:#333;line-height:1.6;max-width:600px;">
          <p style="margin:0 0 16px;">Dear ${firstName},</p>
          <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:20px;">
            <tr><td style="background:#fdf5f5;border-left:3px solid #c0392b;padding:10px 14px;color:#333;text-align:justify;hyphens:auto;-webkit-hyphens:auto;-ms-hyphens:auto;" lang="en">${message.replace(/\n/g, "<br>")}</td></tr>
          </table>
          ${signatureHtml}
          ${footerHtml}
        </div>`;

      await sendViaResend({
        to: [`"${name}" <${email}>`],
        subject: "Your Student ID Card Application has been Rejected",
        html: bodyHtml,
      });
      return json({ result: "success" });
    }

    return json({ result: "error", message: `Unknown template: ${template}` }, 400);
  } catch (e) {
    return json({ result: "error", message: String((e as Error)?.message ?? e) }, 500);
  }
});

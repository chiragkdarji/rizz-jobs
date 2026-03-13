import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_placeholder";

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY not set. Email features will not work.");
}

export const resend = new Resend(RESEND_API_KEY);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rizzjobs.in";

const emailShell = (body: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Rizz Jobs</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;padding:40px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

  <!-- Brand header -->
  <tr>
    <td bgcolor="#6366f1" style="background:#6366f1;border-radius:16px 16px 0 0;padding:28px 40px;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td>
            <span style="font-size:22px;font-weight:900;color:#ffffff;font-style:italic;letter-spacing:-0.5px;">&#10024; Rizz Jobs</span><br>
            <span style="font-size:11px;color:rgba(255,255,255,0.75);font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">Elite Career Intelligence</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- White body -->
  <tr>
    <td bgcolor="#ffffff" style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
      ${body}
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="padding:24px 8px;text-align:center;">
      <span style="font-size:12px;color:#9ca3af;">
        Sent by <a href="${BASE_URL}" style="color:#6366f1;text-decoration:none;">Rizz Jobs</a> &mdash; India&apos;s government job intelligence platform
      </span>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

export function buildConfirmationEmailHtml(token: string): string {
  const confirmUrl = `${BASE_URL}/api/subscribe/confirm?token=${token}`;

  return emailShell(`
    <h1 style="margin:0 0 8px 0;font-size:26px;font-weight:900;color:#111827;">Confirm your subscription</h1>
    <p style="margin:0 0 28px 0;font-size:15px;color:#6b7280;line-height:1.6;">
      Click the button below to start receiving government job alerts in your inbox.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:32px;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px 0;font-size:14px;font-weight:700;color:#374151;">What you&apos;ll get</p>
          <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
            Daily or weekly digests of new UPSC, SSC, Banking, Railway &amp; State Government job openings &mdash; filtered by your interests.
          </p>
        </td>
      </tr>
    </table>

    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td>
          <a href="${confirmUrl}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 32px;border-radius:10px;">
            &#10003;&nbsp; Confirm Email Address
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 6px 0;font-size:12px;color:#9ca3af;">Or paste this link in your browser:</p>
    <p style="margin:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px;font-size:11px;color:#6b7280;word-break:break-all;font-family:monospace;">${confirmUrl}</p>
    <p style="margin:20px 0 0 0;font-size:12px;color:#d1d5db;text-align:center;">Link expires in 24 hours. Didn&apos;t sign up? You can safely ignore this email.</p>
  `);
}

export function buildDigestEmailHtml(
  notifications: Array<{
    title: string;
    ai_summary: string;
    deadline?: string;
    slug?: string;
    id: string;
  }>,
  unsubscribeToken: string,
  digestType: "daily" | "weekly" = "daily"
): string {
  const unsubscribeUrl = `${BASE_URL}/api/subscribe/unsubscribe?token=${unsubscribeToken}`;
  const label = digestType === "daily" ? "Today&apos;s Job Alerts" : "This Week&apos;s Job Alerts";
  const count = notifications.length;

  const items = notifications
    .map(
      (n, i) => `
    <tr>
      <td style="padding:${i === 0 ? "0" : "24px"} 0 24px 0;border-bottom:1px solid #f3f4f6;">
        <a href="${BASE_URL}/exam/${n.slug || n.id}" style="font-size:16px;font-weight:800;color:#111827;text-decoration:none;display:block;margin-bottom:6px;line-height:1.4;">${n.title}</a>
        <p style="margin:0 0 10px 0;font-size:14px;color:#6b7280;line-height:1.6;">${n.ai_summary || ""}</p>
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            ${n.deadline ? `<td style="padding-right:12px;"><span style="display:inline-block;background:#fef9c3;color:#854d0e;font-size:11px;font-weight:700;padding:3px 10px;border-radius:6px;border:1px solid #fde047;">Apply by: ${n.deadline}</span></td>` : ""}
            <td><a href="${BASE_URL}/exam/${n.slug || n.id}" style="color:#6366f1;font-size:13px;font-weight:700;text-decoration:none;">View Details &rarr;</a></td>
          </tr>
        </table>
      </td>
    </tr>
  `
    )
    .join("");

  return emailShell(`
    <h1 style="margin:0 0 4px 0;font-size:26px;font-weight:900;color:#111827;">${label}</h1>
    <p style="margin:0 0 32px 0;font-size:14px;color:#6b7280;">
      ${count} new government job opening${count !== 1 ? "s" : ""} matching your profile.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      ${items}
    </table>

    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
      <tr>
        <td>
          <a href="${BASE_URL}" style="display:inline-block;background:#6366f1;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:12px 28px;border-radius:10px;">
            Browse All Jobs
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;padding-top:24px;border-top:1px solid #f3f4f6;font-size:12px;color:#d1d5db;text-align:center;">
      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
      &nbsp;&middot;&nbsp;
      <a href="${BASE_URL}/dashboard/settings" style="color:#9ca3af;text-decoration:underline;">Manage preferences</a>
    </p>
  `);
}

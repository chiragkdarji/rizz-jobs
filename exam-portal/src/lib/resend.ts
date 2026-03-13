import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_placeholder";

if (!process.env.RESEND_API_KEY) {
  console.warn("RESEND_API_KEY not set. Email features will not work.");
}

export const resend = new Resend(RESEND_API_KEY);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://rizzjobs.in";

const emailBase = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rizz Jobs</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#06b6d4 0%,#6366f1 50%,#a855f7 100%);border-radius:16px 16px 0 0;padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display:inline-block;background:rgba(255,255,255,0.2);border-radius:12px;padding:10px 16px;font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;font-style:italic;">
                      ✨ Rizz Jobs
                    </span>
                    <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.8);font-size:12px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">
                      Elite Career Intelligence
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px;border-radius:0 0 16px 16px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.6;">
                You're receiving this from <a href="${BASE_URL}" style="color:#6366f1;text-decoration:none;">rizzjobs.in</a> — India's government job intelligence platform.<br>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

export function buildConfirmationEmailHtml(token: string): string {
  const confirmUrl = `${BASE_URL}/api/subscribe/confirm?token=${token}`;

  return emailBase(`
    <h1 style="margin:0 0 8px 0;font-size:28px;font-weight:900;color:#111827;letter-spacing:-0.5px;">
      Confirm your subscription
    </h1>
    <p style="margin:0 0 24px 0;font-size:16px;color:#6b7280;line-height:1.6;">
      You're one step away from receiving the latest government job alerts directly in your inbox.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:32px;">
      <tr>
        <td style="padding:24px;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding-right:12px;font-size:28px;">📋</td>
              <td>
                <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">What you'll get</p>
                <p style="margin:4px 0 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
                  Daily or weekly digests of new UPSC, SSC, Banking, Railway, and State Government job openings — filtered by your interests.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.2px;">
            ✓ &nbsp; Confirm Email Address
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px 0;font-size:13px;color:#9ca3af;text-align:center;">
      Or copy this link into your browser:
    </p>
    <p style="margin:0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 16px;font-size:12px;color:#6b7280;word-break:break-all;font-family:monospace;">
      ${confirmUrl}
    </p>

    <p style="margin:24px 0 0 0;font-size:12px;color:#d1d5db;text-align:center;">
      This link expires in 24 hours. If you didn't sign up, you can safely ignore this email.
    </p>
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
  const label = digestType === "daily" ? "Today's" : "This Week's";

  const notificationRows = notifications
    .map(
      (n, i) => `
    <tr>
      <td style="padding:${i === 0 ? "0" : "24px"} 0 24px 0;border-bottom:1px solid #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:8px;">
              <a href="${BASE_URL}/exam/${n.slug || n.id}" style="font-size:16px;font-weight:800;color:#111827;text-decoration:none;line-height:1.4;display:block;">
                ${n.title}
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:10px;">
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">${n.ai_summary || ""}</p>
            </td>
          </tr>
          <tr>
            <td>
              <table cellpadding="0" cellspacing="0">
                <tr>
                  ${
                    n.deadline
                      ? `<td style="padding-right:12px;">
                          <span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:4px 10px;border-radius:6px;">
                            Apply by: ${n.deadline}
                          </span>
                        </td>`
                      : ""
                  }
                  <td>
                    <a href="${BASE_URL}/exam/${n.slug || n.id}" style="display:inline-block;color:#6366f1;font-size:13px;font-weight:700;text-decoration:none;">
                      View Details →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
    )
    .join("");

  return emailBase(`
    <h1 style="margin:0 0 4px 0;font-size:28px;font-weight:900;color:#111827;letter-spacing:-0.5px;">
      ${label} Job Alerts
    </h1>
    <p style="margin:0 0 32px 0;font-size:15px;color:#6b7280;">
      ${notifications.length} new government job opening${notifications.length !== 1 ? "s" : ""} found for you.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      ${notificationRows}
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
      <tr>
        <td align="center">
          <a href="${BASE_URL}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;padding:14px 36px;border-radius:12px;">
            Browse All Jobs
          </a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:12px;color:#d1d5db;text-align:center;border-top:1px solid #f3f4f6;padding-top:24px;">
      <a href="${unsubscribeUrl}" style="color:#9ca3af;text-decoration:underline;">Unsubscribe</a>
      &nbsp;·&nbsp;
      <a href="${BASE_URL}/dashboard/settings" style="color:#9ca3af;text-decoration:underline;">Manage preferences</a>
    </p>
  `);
}

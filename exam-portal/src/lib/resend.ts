import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_placeholder";

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "RESEND_API_KEY not set. Email features will not work."
  );
}

export const resend = new Resend(RESEND_API_KEY);

/**
 * Build HTML for email confirmation email
 */
export function buildConfirmationEmailHtml(token: string): string {
  const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://rizzjobs.in"}/api/subscribe/confirm?token=${token}`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #06b6d4, #6366f1, #a855f7);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✨ Confirm Your Email</h1>
          </div>

          <div class="content">
            <p>Thanks for subscribing to <strong>Rizz Jobs</strong>!</p>

            <p>We're excited to send you the latest government job alerts and exam notifications. Just confirm your email address to get started.</p>

            <center>
              <a href="${confirmUrl}" class="button">Confirm Email Address</a>
            </center>

            <p style="color: #666; font-size: 14px;">
              Or copy and paste this link in your browser:<br>
              <code style="word-break: break-all; background: white; padding: 10px; display: block; border-radius: 4px; margin: 10px 0;">
                ${confirmUrl}
              </code>
            </p>
          </div>

          <div class="footer">
            <p>This link expires in 24 hours. If you didn't sign up for Rizz Jobs, you can ignore this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Build HTML for digest email
 */
export function buildDigestEmailHtml(
  notifications: Array<{
    title: string;
    ai_summary: string;
    deadline?: string;
    slug?: string;
    id: string;
  }>,
  unsubscribeToken: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://rizzjobs.in";
  const unsubscribeUrl = `${baseUrl}/api/subscribe/unsubscribe?token=${unsubscribeToken}`;

  const notificationsHtml = notifications
    .map(
      (n) => `
    <div style="border-bottom: 1px solid #e5e7eb; padding: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #1f2937;">
        <a href="${baseUrl}/exam/${n.slug || n.id}" style="color: #6366f1; text-decoration: none;">
          ${n.title}
        </a>
      </h3>
      <p style="margin: 0 0 10px 0; color: #6b7280;">${n.ai_summary}</p>
      ${
        n.deadline
          ? `<p style="margin: 0; color: #9ca3af; font-size: 14px;">Apply By: <strong>${n.deadline}</strong></p>`
          : ""
      }
    </div>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #06b6d4, #6366f1, #a855f7);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
            text-align: center;
          }
          .content {
            background: #f9fafb;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 12px 30px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📢 Latest Job Alerts</h1>
          </div>

          <div class="content">
            <p>Here are the latest government job notifications for you:</p>

            ${notificationsHtml}

            <center>
              <a href="${baseUrl}/" class="button">View All Jobs</a>
            </center>
          </div>

          <div class="footer">
            <p>
              <a href="${unsubscribeUrl}" style="color: #6366f1;">Unsubscribe from emails</a> |
              <a href="${baseUrl}/subscribe" style="color: #6366f1;">Manage preferences</a>
            </p>
          </div>
        </div>
      </body>
    </html>
  `;
}

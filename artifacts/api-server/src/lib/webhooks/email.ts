const RESEND_API_KEY = process.env.RESEND_API_KEY;

export interface SendEmailParams {
  to: string;
  subject: string;
  projectName: string;
  message: string;
  projectLink?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ id?: string; error?: string }> {
  if (!RESEND_API_KEY) {
    return { error: "RESEND_API_KEY is not configured" };
  }

  const { to, subject, projectName, message, projectLink } = params;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; background: #fff;">
  <div style="margin-bottom: 32px;">
    <div style="display: inline-flex; align-items: center; gap: 8px;">
      <div style="width: 32px; height: 32px; border-radius: 8px; background: #6366f1; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: bold; font-size: 16px;">A</div>
      <span style="font-weight: 700; font-size: 18px;">AgencyFlow</span>
    </div>
  </div>

  <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #1a1a1a;">${escapeHtml(subject)}</h1>
  <p style="color: #555; margin-bottom: 24px; font-size: 14px;">Project: <strong>${escapeHtml(projectName)}</strong></p>

  <div style="background: #f8f9fa; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 4px; margin-bottom: 24px;">
    <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333;">${escapeHtml(message)}</p>
  </div>

  ${projectLink ? `<a href="${escapeHtml(projectLink)}" style="display: inline-block; background: #6366f1; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">View Project →</a>` : ""}

  <p style="color: #999; font-size: 12px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
    This email was sent by AgencyFlow workflow automation.
  </p>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AgencyFlow <noreply@agencyflow.app>",
        to: [to],
        subject,
        html,
      }),
    });

    const data = (await res.json()) as { id?: string; name?: string; message?: string };

    if (!res.ok) {
      return { error: data.message ?? `Resend API error: ${res.status}` };
    }

    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Email send failed" };
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

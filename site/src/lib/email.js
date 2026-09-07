/* Sending mail, through Cloudflare's own Email Service.
 *
 * Chosen over a third-party sender because the domain is already on Cloudflare: there is
 * no API key to store, no DNS records to add, no extra vendor holding our users' email
 * addresses, and nothing to keep in sync. The `EMAIL` binding is declared in
 * wrangler.jsonc and the runtime authenticates itself.
 *
 * Every message here is transactional - somebody asked for it by doing something. There is
 * no mailing list, no marketing and no tracking pixel, and the privacy policy says so.
 */

/** The binding only exists on a deployed Worker with `send_email` configured, so this is
 *  also the check for "can we offer password reset at all". */
export const emailConfigured = (env) => !!(env.EMAIL && env.MAIL_FROM);

/** Returns { sent, error }. Never throws: what to tell the user is a decision for the
 *  route, which knows who is asking and why. */
export async function sendEmail(env, { to, subject, text, html }) {
  if (!emailConfigured(env)) return { sent: false, error: 'not_configured' };

  try {
    await env.EMAIL.send({ to, from: env.MAIL_FROM, subject, text, html });
    return { sent: true };
  } catch (err) {
    // Logged rather than returned: a provider error can quote the recipient address, and
    // that does not belong in a response the sender's browser reads.
    console.error(`email send failed: ${err && err.message ? err.message : err}`);
    return { sent: false, error: 'send_failed' };
  }
}

/* ---------------------------------------------------------------- templates */

/** Plain text first, HTML second, both saying the same thing. A password email that only
 *  renders as HTML is one an old mail client turns into a blank page. */
export function passwordResetEmail({ link, name }) {
  const hello = name ? `Hello ${name},` : 'Hello,';
  return {
    subject: 'Reset your Prepare for Citizenship password',
    text: [
      hello,
      '',
      'Someone asked to reset the password for your Prepare for Citizenship account.',
      'Open this link to choose a new one. It works once, and it expires in one hour:',
      '',
      link,
      '',
      "If that wasn't you, you can ignore this email — nothing has changed, and your",
      'current password still works. If you keep getting these, reply and tell us.',
      '',
      'Prepare for Citizenship',
      'https://prepareforcitizenship.com',
    ].join('\n'),
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;line-height:1.6;color:#0b1f17;max-width:520px">
  <p>${escapeHtml(hello)}</p>
  <p>Someone asked to reset the password for your Prepare for Citizenship account.</p>
  <p>
    <a href="${escapeHtml(link)}" style="display:inline-block;background:#0FA968;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px">Choose a new password</a>
  </p>
  <p style="color:#5a6b63;font-size:14px">This link works once and expires in one hour.</p>
  <p style="color:#5a6b63;font-size:14px">If that wasn't you, ignore this email — nothing has changed and your current password still works. If you keep getting these, reply and tell us.</p>
  <p style="color:#5a6b63;font-size:13px;border-top:1px solid #e2e8e5;padding-top:14px;margin-top:22px">
    Prepare for Citizenship · <a href="https://prepareforcitizenship.com" style="color:#0FA968">prepareforcitizenship.com</a>
  </p>
</div>`,
  };
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

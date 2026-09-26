/**
 * Transactional email via the Resend HTTP API (no SDK dependency).
 * Requires RESEND_API_KEY and EMAIL_FROM (a sender on a domain verified in Resend).
 */

import { logger } from '@/lib/logger-secure';

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/** Returns true when the provider accepted the message. Never throws. */
export async function sendEmail({ to, subject, html, text }: SendEmailInput): Promise<boolean> {
  if (!isEmailConfigured()) {
    logger.error('Email not sent: RESEND_API_KEY / EMAIL_FROM not configured', { subject });
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, html, text }),
    });

    if (!res.ok) {
      logger.error('Email provider rejected message', { status: res.status, body: await res.text() });
      return false;
    }
    return true;
  } catch (error: any) {
    logger.error('Email send failed', { error: error?.message });
    return false;
  }
}

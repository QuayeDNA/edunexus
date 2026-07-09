import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
    return { success: true as const, id: 'dev-mode' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'EduNexus <noreply@edunexus.com>',
      to,
      subject,
      html,
    });

    if (error) {
      console.error('[EMAIL] Send failed:', error);
      return { success: false as const, error: error.message };
    }

    return { success: true as const, id: data?.id };
  } catch (err) {
    console.error('[EMAIL] Send error:', err);
    return { success: false as const, error: 'Failed to send email' };
  }
}

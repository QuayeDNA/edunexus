interface WaitlistedParams {
  guardianName: string;
  studentName: string;
}

export function applicationWaitlistedEmail({
  guardianName,
  studentName,
}: WaitlistedParams): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #1a1a2e;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: #ca8a04; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">EduNexus</h1>
    </div>
    <div style="padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <p style="font-size: 16px; line-height: 1.5;">Dear ${guardianName},</p>
      <p style="font-size: 16px; line-height: 1.5;">Your application for <strong>${studentName}</strong> has been placed on our waitlist.</p>
      <p style="font-size: 16px; line-height: 1.5;">Should a space become available, we will contact you at the earliest opportunity.</p>
      <p style="font-size: 16px; line-height: 1.5;">Thank you for your understanding.</p>
      <p style="font-size: 16px; line-height: 1.5;">Best regards,<br/>The EduNexus Team</p>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      &copy; ${new Date().getFullYear()} EduNexus. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}

interface WelcomeAdminParams {
  schoolName: string;
  schoolUrl: string;
  email: string;
  password: string;
  adminName: string;
}

export function welcomeAdminEmail(params: WelcomeAdminParams): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 32px; color: #1a1a2e;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">Welcome to EduNexus</h1>
    </div>
    <p style="font-size: 16px; line-height: 1.5;">Hi ${params.adminName},</p>
    <p style="font-size: 16px; line-height: 1.5;">
      Your school, <strong>${params.schoolName}</strong>, has been registered on EduNexus.
      You can now log in to manage your school&apos;s operations.
    </p>
    <div style="background: #f8f9fa; border-radius: 8px; padding: 24px; margin: 24px 0;">
      <p style="margin: 0 0 12px;"><strong>School Portal:</strong></p>
      <p style="margin: 0 0 4px;"><a href="${params.schoolUrl}" style="color: #4f46e5;">${params.schoolUrl}</a></p>
      <p style="margin: 0 0 12px;"><strong>Email:</strong> ${params.email}</p>
      <p style="margin: 0 0 4px;"><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${params.password}</code></p>
      <p style="margin: 0; font-size: 13px; color: #6b7280;">Please change your password after logging in.</p>
    </div>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
    <p style="font-size: 13px; color: #6b7280; text-align: center;">
      &copy; ${new Date().getFullYear()} EduNexus. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}

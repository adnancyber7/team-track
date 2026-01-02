import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (newPassword.length < 4) {
      return Response.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
    }

    // Get admin config
    const configs = await base44.asServiceRole.entities.AdminConfig.list();
    const adminConfig = configs[0];

    if (!adminConfig || adminConfig.admin_email !== email) {
      return Response.json({ error: 'Email not registered' }, { status: 404 });
    }

    // Check expiry
    if (Date.now() > adminConfig.otp_expiry) {
      return Response.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Check attempts
    if (adminConfig.otp_attempts >= 5) {
      return Response.json({ 
        error: 'Too many failed attempts. Please request a new OTP.' 
      }, { status: 429 });
    }

    // Verify OTP
    if (adminConfig.otp_code !== otp) {
      await base44.asServiceRole.entities.AdminConfig.update(adminConfig.id, {
        otp_attempts: adminConfig.otp_attempts + 1
      });
      return Response.json({ 
        error: 'Invalid OTP code',
        attemptsLeft: 5 - (adminConfig.otp_attempts + 1)
      }, { status: 400 });
    }

    // OTP verified - update password
    await base44.asServiceRole.entities.AdminConfig.update(adminConfig.id, {
      admin_password: newPassword,
      otp_code: null,
      otp_expiry: null,
      otp_attempts: 0
    });

    return Response.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
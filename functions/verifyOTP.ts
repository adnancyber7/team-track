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

    // Get OTP data from storage
    const otpData = globalThis.otpStorage?.[email];
    
    if (!otpData) {
      return Response.json({ error: 'No OTP found for this email' }, { status: 404 });
    }

    // Check expiry
    if (Date.now() > otpData.otp_expiry) {
      return Response.json({ error: 'OTP has expired' }, { status: 400 });
    }

    // Check attempts
    if (otpData.otp_attempts >= 5) {
      return Response.json({ 
        error: 'Too many failed attempts. Please request a new OTP.' 
      }, { status: 429 });
    }

    // Verify OTP
    if (otpData.otp_code !== otp) {
      otpData.otp_attempts++;
      return Response.json({ 
        error: 'Invalid OTP code',
        attemptsLeft: 5 - otpData.otp_attempts
      }, { status: 400 });
    }

    // OTP verified - clear from storage
    delete globalThis.otpStorage[email];

    return Response.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
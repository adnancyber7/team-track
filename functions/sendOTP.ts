import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email } = await req.json();

    if (!email || !email.trim()) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP temporarily (in production, use database)
    // For this demo, we'll store in a simple key-value format
    const otpData = {
      email,
      otp_code: otp,
      otp_expiry: expiry,
      otp_attempts: 0
    };
    
    // Store in localStorage-like mechanism (you can enhance to use actual DB)
    globalThis.otpStorage = globalThis.otpStorage || {};
    globalThis.otpStorage[email] = otpData;

    // Send OTP email
    await base44.integrations.Core.SendEmail({
      from_name: 'DHL Sheet Admin',
      to: email,
      subject: 'DHL Sheet - Password Reset OTP',
      body: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #000; margin: 0; font-size: 28px;">DHL Sheet</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px;">
            <h2 style="color: #111827; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
              You have requested to reset your admin password. Use the verification code below:
            </p>
            <div style="background: #fef3c7; border: 2px solid #fbbf24; border-radius: 8px; padding: 20px; text-align: center; margin: 25px 0;">
              <p style="color: #78716c; font-size: 14px; margin: 0 0 10px 0;">Your OTP Code</p>
              <h1 style="color: #000; font-size: 36px; letter-spacing: 8px; margin: 0; font-weight: bold;">${otp}</h1>
            </div>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.5;">
              This code will expire in <strong>10 minutes</strong>. If you didn't request this, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              DHL Sheet Admin Panel - Secure Authentication System
            </p>
          </div>
        </div>
      `
    });

    return Response.json({ success: true, message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Send OTP error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
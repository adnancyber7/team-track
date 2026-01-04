Admin Settings API (functions/adminSettingsApi.js)

Actions (POST via base44.functions.invoke):
- getSettings (admin)
- updateSettings (admin) payload: { admin_username?, admin_password?, admin_email?, allow_admin_login?, allow_agent_login?, allow_cs_login?, maintenance_mode?, banner_message? }
- listAgents (admin)
- createAgent (admin) payload: { username, password }
- deleteAgent (admin) payload: { username }
- listCS (admin)
- createCS (admin) payload: { username, password }
- deleteCS (admin) payload: { username }
- exportCredentialsXml (admin) → returns XML file
- sendOtp (public) payload: { email }
- verifyOtp (public) payload: { email, otp, newPassword }

Environment variables (.env):
- ADMIN_DEFAULT_USERNAME (default: admin)
- ADMIN_DEFAULT_PASSWORD (default: admin123)
- OTP_EXPIRY_MINUTES (default: 10)
- EMAIL_SENDER_NAME (optional display name for emails)
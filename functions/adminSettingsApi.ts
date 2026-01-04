import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// In-memory OTP store (temporary) – persists per runtime
const getOtpStore = () => {
  if (!globalThis.__otpStore) globalThis.__otpStore = {};
  return globalThis.__otpStore;
};

const ENV = {
  ADMIN_DEFAULT_USERNAME: Deno.env.get('ADMIN_DEFAULT_USERNAME') || 'admin',
  ADMIN_DEFAULT_PASSWORD: Deno.env.get('ADMIN_DEFAULT_PASSWORD') || 'admin123',
  OTP_EXPIRY_MINUTES: parseInt(Deno.env.get('OTP_EXPIRY_MINUTES') || '10', 10),
  EMAIL_SENDER_NAME: Deno.env.get('EMAIL_SENDER_NAME') || null,
};

function json(data, init = {}) {
  return Response.json(data, init);
}

async function ensureAdminUser(base44) {
  const user = await base44.auth.me();
  if (!user) {
    return { error: true, res: json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (user.role !== 'admin') {
    return { error: true, res: json({ error: 'Forbidden: Admin access required' }, { status: 403 }) };
  }
  return { error: false, user };
}

async function upsertUsersSync(base44) {
  try {
    const rows = await base44.asServiceRole.entities.AppState.filter({ state_key: 'users_sync' });
    const payload = { data: { ts: Date.now() } };
    if (rows && rows[0]) {
      await base44.asServiceRole.entities.AppState.update(rows[0].id, payload);
    } else {
      await base44.asServiceRole.entities.AppState.create({ state_key: 'users_sync', ...payload });
    }
  } catch (_e) {
    // Best-effort broadcast; ignore errors
  }
}

async function getOrCreateAdminConfig(base44) {
  const list = await base44.asServiceRole.entities.AdminConfig.filter({ config_key: 'main' });
  if (list && list[0]) return list[0];
  const created = await base44.asServiceRole.entities.AdminConfig.create({
    config_key: 'main',
    admin_username: ENV.ADMIN_DEFAULT_USERNAME,
    admin_password: ENV.ADMIN_DEFAULT_PASSWORD,
    allow_admin_login: true,
    allow_agent_login: true,
    allow_cs_login: true,
    maintenance_mode: false,
    banner_message: '',
    admin_email: '',
  });
  return created;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body = {};
    try { body = await req.json(); } catch { body = {}; }
    const action = body.action;
    const payload = body.payload || {};

    // Router
    switch (action) {
      // Settings
      case 'getSettings': {
        const { error, res } = await (async () => {
          const check = await ensureAdminUser(base44);
          if (check.error) return { error: true, res: check.res };
          const cfg = await getOrCreateAdminConfig(base44);
          return { error: false, res: json({ settings: cfg }) };
        })();
        if (error) return res; else return res;
      }
      case 'updateSettings': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const cfg = await getOrCreateAdminConfig(base44);
        const patch = {};
        const allowed = [
          'admin_username', 'admin_password', 'admin_email',
          'allow_admin_login', 'allow_agent_login', 'allow_cs_login',
          'maintenance_mode', 'banner_message'
        ];
        for (const k of allowed) {
          if (payload[k] !== undefined) patch[k] = payload[k];
        }
        const updated = await base44.asServiceRole.entities.AdminConfig.update(cfg.id, patch);
        return json({ settings: updated });
      }

      // Agent users
      case 'listAgents': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const agents = await base44.asServiceRole.entities.AgentUser.list();
        return json({ agents });
      }
      case 'createAgent': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const { username, password } = payload;
        if (!username || !password) return json({ error: 'username and password required' }, { status: 400 });
        const exists = await base44.asServiceRole.entities.AgentUser.filter({ username });
        if (exists && exists[0]) return json({ error: 'Agent already exists' }, { status: 409 });
        const created = await base44.asServiceRole.entities.AgentUser.create({ username, password });
        await upsertUsersSync(base44);
        return json({ agent: created });
      }
      case 'deleteAgent': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const { username } = payload;
        if (!username) return json({ error: 'username required' }, { status: 400 });
        const matches = await base44.asServiceRole.entities.AgentUser.filter({ username });
        if (matches && matches[0]) await base44.asServiceRole.entities.AgentUser.delete(matches[0].id);
        await upsertUsersSync(base44);
        return json({ success: true });
      }

      // CS users
      case 'listCS': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const users = await base44.asServiceRole.entities.CSUser.list();
        return json({ csUsers: users });
      }
      case 'createCS': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const { username, password } = payload;
        if (!username || !password) return json({ error: 'username and password required' }, { status: 400 });
        const exists = await base44.asServiceRole.entities.CSUser.filter({ username });
        if (exists && exists[0]) return json({ error: 'CS user already exists' }, { status: 409 });
        const created = await base44.asServiceRole.entities.CSUser.create({ username, password });
        await upsertUsersSync(base44);
        return json({ csUser: created });
      }
      case 'deleteCS': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const { username } = payload;
        if (!username) return json({ error: 'username required' }, { status: 400 });
        const matches = await base44.asServiceRole.entities.CSUser.filter({ username });
        if (matches && matches[0]) await base44.asServiceRole.entities.CSUser.delete(matches[0].id);
        await upsertUsersSync(base44);
        return json({ success: true });
      }

      // Export credentials as XML
      case 'exportCredentialsXml': {
        const check = await ensureAdminUser(base44);
        if (check.error) return check.res;
        const [agents, cs] = await Promise.all([
          base44.asServiceRole.entities.AgentUser.list(),
          base44.asServiceRole.entities.CSUser.list(),
        ]);
        const esc = (s) => String(s ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
        const agentsXML = (agents || []).map(a => `    <agent>\n      <username>${esc(a.username)}</username>\n      <password>${esc(a.password)}</password>\n    </agent>`).join('\n');
        const csXML = (cs || []).map(u => `    <csUser>\n      <username>${esc(u.username)}</username>\n      <password>${esc(u.password)}</password>\n    </csUser>`).join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<credentials>\n  <agents>\n${agentsXML}\n  </agents>\n  <csUsers>\n${csXML}\n  </csUsers>\n</credentials>`;
        return new Response(xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/xml; charset=utf-8',
            'Content-Disposition': 'attachment; filename=credentials.xml',
          },
        });
      }

      // OTP flows (no auth required; verify against AdminConfig email)
      case 'sendOtp': {
        const { email } = payload;
        if (!email) return json({ error: 'email required' }, { status: 400 });
        const cfg = await getOrCreateAdminConfig(base44);
        const configured = (cfg.admin_email || '').trim().toLowerCase();
        if (!configured) return json({ error: 'Recovery email not configured' }, { status: 400 });
        if (configured !== String(email).trim().toLowerCase()) {
          return json({ error: 'Email does not match registered email' }, { status: 400 });
        }
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + ENV.OTP_EXPIRY_MINUTES * 60 * 1000;
        const store = getOtpStore();
        store[email.toLowerCase()] = { code, expiresAt, attempts: 0 };
        // Send email via integration
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          from_name: ENV.EMAIL_SENDER_NAME || undefined,
          subject: 'Your OTP Code',
          body: `Your OTP is <b>${code}</b>. It expires in ${ENV.OTP_EXPIRY_MINUTES} minutes.`,
        });
        return json({ success: true });
      }
      case 'verifyOtp': {
        const { email, otp, newPassword } = payload;
        if (!email || !otp || !newPassword) return json({ error: 'email, otp, newPassword required' }, { status: 400 });
        if (String(newPassword).length < 4) return json({ error: 'Password must be at least 4 characters' }, { status: 400 });
        const store = getOtpStore();
        const rec = store[String(email).toLowerCase()];
        if (!rec) return json({ error: 'OTP not found or expired' }, { status: 400 });
        if (Date.now() > rec.expiresAt) {
          delete store[String(email).toLowerCase()];
          return json({ error: 'OTP expired' }, { status: 400 });
        }
        if (rec.attempts >= 5) return json({ error: 'Too many attempts' }, { status: 429 });
        if (String(otp) !== String(rec.code)) {
          rec.attempts += 1;
          return json({ error: 'Invalid OTP', attemptsLeft: Math.max(0, 5 - rec.attempts) }, { status: 400 });
        }
        // Reset password in AdminConfig
        const cfg = await getOrCreateAdminConfig(base44);
        await base44.asServiceRole.entities.AdminConfig.update(cfg.id, { admin_password: newPassword });
        delete store[String(email).toLowerCase()];
        return json({ success: true });
      }

      default:
        return json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return json({ error: error.message || 'Server error' }, { status: 500 });
  }
});
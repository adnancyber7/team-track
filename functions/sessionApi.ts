import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Session management API - handles login validation, session tracking, and logout
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const action = body.action;

    // Validate credentials (admin/agent/cs)
    if (action === 'validate') {
      const { role, username, password } = body.payload || {};

      // Check maintenance mode first
      const cfgs = await base44.asServiceRole.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = cfgs?.[0];
      
      if (cfg?.maintenance_mode && role !== 'admin') {
        return Response.json({ 
          valid: false, 
          error: cfg.banner_message || 'System under maintenance'
        }, { headers: corsHeaders });
      }

      // Check role permissions
      if (role === 'admin' && cfg?.allow_admin_login === false) {
        return Response.json({ valid: false, error: 'Admin logins disabled' }, { headers: corsHeaders });
      }
      if (role === 'agent' && cfg?.allow_agent_login === false) {
        return Response.json({ valid: false, error: 'Agent logins disabled' }, { headers: corsHeaders });
      }
      if (role === 'cs_allocator' && cfg?.allow_cs_login === false) {
        return Response.json({ valid: false, error: 'CS logins disabled' }, { headers: corsHeaders });
      }

      // Validate credentials
      if (role === 'admin') {
        const valid = cfg && cfg.admin_username === username && cfg.admin_password === password;
        return Response.json({ valid }, { headers: corsHeaders });
      } else if (role === 'agent') {
        const agents = await base44.asServiceRole.entities.AgentUser.filter({ username, password });
        const agent = agents?.[0];
        const valid = agent && agent.is_active !== false;
        return Response.json({ valid, user: valid ? { username: agent.username, email: agent.email, region: agent.region } : null }, { headers: corsHeaders });
      } else if (role === 'cs_allocator') {
        const csUsers = await base44.asServiceRole.entities.CSUser.filter({ username, password });
        const valid = csUsers?.[0] && csUsers[0].is_active !== false;
        return Response.json({ valid }, { headers: corsHeaders });
      }

      return Response.json({ valid: false }, { headers: corsHeaders });
    }

    // Get active sessions count - SECURED
    if (action === 'getActiveSessions') {
      // SECURITY: Require admin authentication
      const user = await base44.auth.me();
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403, headers: corsHeaders });
      }
      
      const rows = await base44.asServiceRole.entities.AppState.filter({ state_key: 'active_sessions' });
      const data = rows?.[0]?.data || {};
      const sessions = Object.values(data).filter(s => s && !s.kick);
      
      return Response.json({ 
        count: sessions.length,
        sessions: sessions.map(s => ({ 
          role: s.role, 
          username: s.username, 
          lastActivity: s.last_activity 
        }))
      }, { headers: corsHeaders });
    }

    // Heartbeat update
    if (action === 'heartbeat') {
      const { instanceId } = body.payload || {};
      if (!instanceId) {
        return Response.json({ error: 'Missing instanceId' }, { status: 400, headers: corsHeaders });
      }

      const rows = await base44.asServiceRole.entities.AppState.filter({ state_key: 'active_sessions' });
      const row = rows?.[0];
      const data = row?.data || {};
      
      if (data[instanceId]) {
        data[instanceId].last_activity = Date.now();
        if (row) await base44.asServiceRole.entities.AppState.update(row.id, { data });
      }

      return Response.json({ ok: true }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400, headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
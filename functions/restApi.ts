import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Central REST API for LAN access - supports all CRUD operations
// Access via http://[SERVER_IP]:PORT/restApi
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Role, X-Username',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const path = url.pathname.replace('/restApi', '') || '/';
    const method = req.method;

    // Parse body
    let body = {};
    if (method === 'POST' || method === 'PUT') {
      try { body = await req.json(); } catch {}
    }

    // ============================================================================
    // AUTH ROUTES
    // ============================================================================
    
    // POST /auth/login - Validate credentials
    if (path === '/auth/login' && method === 'POST') {
      const { role, username, password } = body;

      // Check maintenance mode
      const cfgs = await base44.asServiceRole.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = cfgs?.[0];
      
      if (cfg?.maintenance_mode && role !== 'admin') {
        return Response.json({ 
          success: false, 
          error: cfg.banner_message || 'System under maintenance'
        }, { headers: corsHeaders });
      }

      // Validate credentials
      if (role === 'admin') {
        const valid = cfg && cfg.admin_username === username && cfg.admin_password === password;
        return Response.json({ 
          success: valid, 
          user: valid ? { username, role: 'admin' } : null 
        }, { headers: corsHeaders });
      } else if (role === 'agent') {
        const agents = await base44.asServiceRole.entities.AgentUser.filter({ username, password });
        const agent = agents?.[0];
        const valid = agent && agent.is_active !== false;
        return Response.json({ 
          success: valid, 
          user: valid ? { username: agent.username, role: 'agent', email: agent.email } : null 
        }, { headers: corsHeaders });
      } else if (role === 'cs_allocator') {
        const csUsers = await base44.asServiceRole.entities.CSUser.filter({ username, password });
        const valid = csUsers?.[0] && csUsers[0].is_active !== false;
        return Response.json({ 
          success: valid, 
          user: valid ? { username, role: 'cs_allocator' } : null 
        }, { headers: corsHeaders });
      }

      return Response.json({ success: false, error: 'Invalid credentials' }, { headers: corsHeaders });
    }

    // POST /auth/logout - Clear session
    if (path === '/auth/logout' && method === 'POST') {
      const { instanceId } = body;
      if (instanceId) {
        const rows = await base44.asServiceRole.entities.AppState.filter({ state_key: 'active_sessions' });
        const data = rows?.[0]?.data || {};
        delete data[instanceId];
        if (rows?.[0]) await base44.asServiceRole.entities.AppState.update(rows[0].id, { data });
      }
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // ============================================================================
    // ADMIN ROUTES (require admin auth)
    // ============================================================================
    
    const user = await base44.auth.me();
    
    // GET /admin/users - List all users
    if (path === '/admin/users' && method === 'GET') {
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
      }
      
      const [agents, csUsers, admins] = await Promise.all([
        base44.asServiceRole.entities.AgentUser.list(),
        base44.asServiceRole.entities.CSUser.list(),
        base44.asServiceRole.entities.AdminConfig.filter({ config_key: 'main' })
      ]);

      return Response.json({ 
        agents: agents || [], 
        cs_users: csUsers || [],
        admin: admins?.[0] || null
      }, { headers: corsHeaders });
    }

    // POST /admin/users - Create user (agent or CS)
    if (path === '/admin/users' && method === 'POST') {
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
      }

      const { userType, username, password } = body;
      
      if (userType === 'agent') {
        await base44.asServiceRole.entities.AgentUser.create({ username, password, is_active: true });
      } else if (userType === 'cs') {
        await base44.asServiceRole.entities.CSUser.create({ username, password, is_active: true });
      }

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // DELETE /admin/users/:id - Delete user
    if (path.startsWith('/admin/users/') && method === 'DELETE') {
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
      }

      const id = path.split('/')[3];
      const userType = url.searchParams.get('type');
      
      if (userType === 'agent') {
        await base44.asServiceRole.entities.AgentUser.delete(id);
      } else if (userType === 'cs') {
        await base44.asServiceRole.entities.CSUser.delete(id);
      }

      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // ============================================================================
    // AGENT ROUTES
    // ============================================================================
    
    // GET /agent/data - Get agent's assigned data
    if (path === '/agent/data' && method === 'GET') {
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
      }

      const rows = await base44.asServiceRole.entities.AppState.filter({ state_key: 'cs_sheet' });
      const csSheet = rows?.[0]?.data || { raw: [], timers: [] };
      
      // Filter for this agent only
      const agentData = [];
      for (let i = 0; i < csSheet.raw.length; i++) {
        const agentCell = csSheet.raw[i]?.[5] || ''; // COL_AGENTS
        if (agentCell.toLowerCase() === user.username?.toLowerCase()) {
          agentData.push({ row: i, data: csSheet.raw[i], timer: csSheet.timers[i] });
        }
      }

      return Response.json({ data: agentData }, { headers: corsHeaders });
    }

    // ============================================================================
    // HEALTH CHECK
    // ============================================================================
    
    if (path === '/health' && method === 'GET') {
      return Response.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }, { headers: corsHeaders });
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
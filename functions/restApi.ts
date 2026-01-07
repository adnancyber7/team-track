import { createClient } from 'npm:@supabase/supabase-js@2.89.0';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Role, X-Username, X-Client-Info, Apikey',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const adn7 = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
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

      const { data: cfgs } = await adn7.from('admin_config').select('*').eq('config_key', 'main');
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
        const { data: agents } = await adn7.from('agent_users').select('*').eq('username', username).eq('password', password);
        const agent = agents?.[0];
        const valid = agent && agent.is_active !== false;
        return Response.json({
          success: valid,
          user: valid ? { username: agent.username, role: 'agent', email: agent.email } : null
        }, { headers: corsHeaders });
      } else if (role === 'cs_allocator') {
        const { data: csUsers } = await adn7.from('cs_users').select('*').eq('username', username).eq('password', password);
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
        const { data: rows } = await adn7.from('app_state').select('*').eq('state_key', 'active_sessions');
        const sessionData = rows?.[0]?.data || {};
        delete sessionData[instanceId];
        if (rows?.[0]) {
          await adn7.from('app_state').update({ data: sessionData }).eq('id', rows[0].id);
        }
      }
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // ============================================================================
    // ADMIN ROUTES (require admin auth)
    // ============================================================================

    const authHeader = req.headers.get('Authorization');
    const user = authHeader ? { role: req.headers.get('X-Role'), username: req.headers.get('X-Username') } : null;
    
    // GET /admin/users - List all users
    if (path === '/admin/users' && method === 'GET') {
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
      }
      
      const [agentsRes, csUsersRes, adminsRes] = await Promise.all([
        adn7.from('agent_users').select('*'),
        adn7.from('cs_users').select('*'),
        adn7.from('admin_config').select('*').eq('config_key', 'main')
      ]);

      return Response.json({
        agents: agentsRes.data || [],
        cs_users: csUsersRes.data || [],
        admin: adminsRes.data?.[0] || null
      }, { headers: corsHeaders });
    }

    // POST /admin/users - Create user (agent or CS)
    if (path === '/admin/users' && method === 'POST') {
      if (!user || user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
      }

      const { userType, username, password } = body;

      if (userType === 'agent') {
        await adn7.from('agent_users').insert({ username, password, is_active: true });
      } else if (userType === 'cs') {
        await adn7.from('cs_users').insert({ username, password, is_active: true });
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
        await adn7.from('agent_users').delete().eq('id', id);
      } else if (userType === 'cs') {
        await adn7.from('cs_users').delete().eq('id', id);
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

      const { data: rows } = await adn7.from('app_state').select('*').eq('state_key', 'cs_sheet');
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
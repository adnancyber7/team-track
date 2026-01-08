import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Comprehensive system health check - validates all components
Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can run health checks
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders });
    }

    const results = {
      timestamp: new Date().toISOString(),
      overall_status: 'healthy',
      checks: {}
    };

    // 1. Database connectivity
    try {
      await base44.asServiceRole.entities.AdminConfig.filter({ config_key: 'main' }, null, 1);
      results.checks.database = { status: 'healthy', message: 'Connected' };
    } catch (e) {
      results.checks.database = { status: 'unhealthy', message: e.message };
      results.overall_status = 'unhealthy';
    }

    // 2. AppState entities
    try {
      const states = await base44.asServiceRole.entities.AppState.list(null, 5);
      results.checks.app_state = { status: 'healthy', message: `${states?.length || 0} records` };
    } catch (e) {
      results.checks.app_state = { status: 'unhealthy', message: e.message };
      results.overall_status = 'unhealthy';
    }

    // 3. User entities
    try {
      const [agents, cs] = await Promise.all([
        base44.asServiceRole.entities.AgentUser.list(null, 5),
        base44.asServiceRole.entities.CSUser.list(null, 5)
      ]);
      results.checks.users = { 
        status: 'healthy', 
        message: `${agents?.length || 0} agents, ${cs?.length || 0} CS users` 
      };
    } catch (e) {
      results.checks.users = { status: 'unhealthy', message: e.message };
      results.overall_status = 'unhealthy';
    }

    // 4. Active sessions
    try {
      const rows = await base44.asServiceRole.entities.AppState.filter({ state_key: 'active_sessions' });
      const data = rows?.[0]?.data || {};
      const count = Object.keys(data).length;
      results.checks.sessions = { status: 'healthy', message: `${count} active sessions` };
    } catch (e) {
      results.checks.sessions = { status: 'warning', message: e.message };
    }

    // 5. Maintenance mode status
    try {
      const cfgs = await base44.asServiceRole.entities.AdminConfig.filter({ config_key: 'main' });
      const cfg = cfgs?.[0];
      results.checks.maintenance = { 
        status: cfg?.maintenance_mode ? 'warning' : 'healthy',
        message: cfg?.maintenance_mode ? `ON: ${cfg.banner_message}` : 'OFF'
      };
    } catch (e) {
      results.checks.maintenance = { status: 'unknown', message: e.message };
    }

    // 6. Data sync performance
    try {
      const start = Date.now();
      await base44.asServiceRole.entities.AppState.filter({ state_key: 'cs_sheet' }, null, 1);
      const latency = Date.now() - start;
      results.checks.sync_latency = { 
        status: latency < 500 ? 'healthy' : 'warning',
        message: `${latency}ms`
      };
    } catch (e) {
      results.checks.sync_latency = { status: 'unhealthy', message: e.message };
    }

    // 7. Audit log
    try {
      const logs = await base44.asServiceRole.entities.AuditLog.list('-created_date', 1);
      results.checks.audit_log = { 
        status: 'healthy', 
        message: logs?.[0] ? `Last: ${logs[0].action}` : 'No entries' 
      };
    } catch (e) {
      results.checks.audit_log = { status: 'warning', message: e.message };
    }

    return Response.json(results, { headers: corsHeaders });

  } catch (error) {
    return Response.json({ 
      overall_status: 'error', 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500, headers: corsHeaders });
  }
});
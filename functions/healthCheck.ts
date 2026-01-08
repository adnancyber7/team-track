import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // SECURITY: Require admin authentication
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json(
        { error: 'Forbidden: Admin access required' },
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Check database connectivity
    const dbCheck = await base44.asServiceRole.entities.AdminConfig.filter({ config_key: 'main' });
    
    // Check session storage
    const sessionCheck = await base44.asServiceRole.entities.AppState.filter({ state_key: 'active_sessions' });
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck ? 'ok' : 'error',
        session_store: sessionCheck ? 'ok' : 'error',
      },
      version: '1.0.0'
    };

    return Response.json(health, { headers: corsHeaders });
  } catch (error) {
    return Response.json({ 
      status: 'unhealthy', 
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503, headers: corsHeaders });
  }
});
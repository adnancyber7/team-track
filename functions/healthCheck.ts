import { createClient } from 'npm:@supabase/supabase-js@2.89.0';

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const adn7 = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: dbCheck } = await adn7.from('admin_config').select('*').eq('config_key', 'main').maybeSingle();
    const { data: sessionCheck } = await adn7.from('app_state').select('*').eq('state_key', 'active_sessions').maybeSingle();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbCheck ? 'ok' : 'error',
        session_store: sessionCheck !== null ? 'ok' : 'error',
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
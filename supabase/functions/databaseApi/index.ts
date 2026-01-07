import { createClient } from 'npm:@supabase/supabase-js@2.89.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { operation, table, data, filters, id, orderBy, limit } = body;

    // LIST operation
    if (operation === 'list') {
      let query = supabase.from(table).select('*');
      
      if (orderBy) {
        const isDescending = orderBy.startsWith('-');
        const column = isDescending ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !isDescending });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data: result, error } = await query;
      if (error) throw error;
      
      return Response.json(result || [], { headers: corsHeaders });
    }

    // CREATE operation
    if (operation === 'create') {
      const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return Response.json(result, { headers: corsHeaders });
    }

    // UPDATE operation
    if (operation === 'update') {
      const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return Response.json(result, { headers: corsHeaders });
    }

    // DELETE operation
    if (operation === 'delete') {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    // GET operation (by ID)
    if (operation === 'get') {
      const { data: result, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return Response.json(result, { headers: corsHeaders });
    }

    // FILTER operation
    if (operation === 'filter') {
      let query = supabase.from(table).select('*');
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }
      
      if (orderBy) {
        const isDescending = orderBy.startsWith('-');
        const column = isDescending ? orderBy.slice(1) : orderBy;
        query = query.order(column, { ascending: !isDescending });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data: result, error } = await query;
      if (error) throw error;
      
      return Response.json(result || [], { headers: corsHeaders });
    }

    // QUERY operation (custom queries for complex operations)
    if (operation === 'query') {
      const { query: queryStr } = body;
      
      // Special handling for AppState queries
      if (queryStr === 'getAppState') {
        const { state_key } = body;
        const { data, error } = await supabase
          .from('AppState')
          .select('*')
          .eq('state_key', state_key)
          .maybeSingle();
        
        if (error) throw error;
        return Response.json(data, { headers: corsHeaders });
      }
      
      // Special handling for updating AppState
      if (queryStr === 'upsertAppState') {
        const { state_key, data: stateData } = body;
        const { data: existing } = await supabase
          .from('AppState')
          .select('id')
          .eq('state_key', state_key)
          .maybeSingle();
        
        if (existing) {
          const { data, error } = await supabase
            .from('AppState')
            .update({ data: stateData, updated_date: new Date().toISOString() })
            .eq('state_key', state_key)
            .select()
            .single();
          
          if (error) throw error;
          return Response.json(data, { headers: corsHeaders });
        } else {
          const { data, error } = await supabase
            .from('AppState')
            .insert({ state_key, data: stateData })
            .select()
            .single();
          
          if (error) throw error;
          return Response.json(data, { headers: corsHeaders });
        }
      }
      
      return Response.json({ error: 'Unknown query operation' }, { status: 400, headers: corsHeaders });
    }

    return Response.json({ error: 'Invalid operation' }, { status: 400, headers: corsHeaders });

  } catch (error) {
    console.error('Database API Error:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

const createEntityWrapper = (tableName) => {
  return {
    async list(orderBy = 'created_at', limit = 1000) {
      try {
        let query = supabase.from(tableName).select('*');

        if (orderBy) {
          const isDescending = orderBy.startsWith('-');
          const column = isDescending ? orderBy.slice(1) : orderBy;
          query = query.order(column, { ascending: !isDescending });
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error(`[${tableName}] list error:`, error);
        throw error;
      }
    },

    async create(payload) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`[${tableName}] create error:`, error);
        throw error;
      }
    },

    async update(id, payload) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .update(payload)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`[${tableName}] update error:`, error);
        throw error;
      }
    },

    async delete(id) {
      try {
        const { error } = await supabase
          .from(tableName)
          .delete()
          .eq('id', id);

        if (error) throw error;
        return { success: true };
      } catch (error) {
        console.error(`[${tableName}] delete error:`, error);
        throw error;
      }
    },

    async filter(filters, orderBy = null, limit = null) {
      try {
        let query = supabase.from(tableName).select('*');

        Object.entries(filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });

        if (orderBy) {
          const isDescending = orderBy.startsWith('-');
          const column = isDescending ? orderBy.slice(1) : orderBy;
          query = query.order(column, { ascending: !isDescending });
        }

        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
      } catch (error) {
        console.error(`[${tableName}] filter error:`, error);
        throw error;
      }
    },

    async get(id) {
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`[${tableName}] get error:`, error);
        throw error;
      }
    }
  };
};

const createFunctionsWrapper = () => {
  return {
    async invoke(functionName, payload) {
      try {
        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload
        });

        if (error) throw error;
        return data;
      } catch (error) {
        console.error(`[Function] ${functionName} error:`, error);
        throw error;
      }
    }
  };
};

const createAuthWrapper = () => {
  return {
    async me() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
      } catch (error) {
        return null;
      }
    },

    async logout(redirectUrl) {
      try {
        await supabase.auth.signOut();
        if (redirectUrl && typeof window !== 'undefined') {
          window.location.href = redirectUrl;
        }
      } catch (error) {
        console.error('Logout error:', error);
      }
    },

    redirectToLogin(returnUrl) {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams({ returnUrl });
        window.location.href = `/login?${params.toString()}`;
      }
    }
  };
};

export const db = {
  entities: {
    AdminConfig: createEntityWrapper('AdminConfig'),
    AgentUser: createEntityWrapper('AgentUser'),
    CSUser: createEntityWrapper('CSUser'),
    AppState: createEntityWrapper('AppState'),
    SheetData: createEntityWrapper('SheetData'),
    SheetRow: createEntityWrapper('SheetRow'),
    AgentBreak: createEntityWrapper('AgentBreak'),
    PriorityConfig: createEntityWrapper('PriorityConfig'),
    AuditLog: createEntityWrapper('AuditLog')
  },
  functions: createFunctionsWrapper(),
  auth: createAuthWrapper(),
  asServiceRole: null
};

db.asServiceRole = db;

export default db;

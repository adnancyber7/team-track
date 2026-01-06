import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Self-check function: verifies CRUD for AgentUser and CSUser, and core AppState keys.
// Admin-only to prevent misuse.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const results = { agentUser: {}, csUser: {}, appState: {}, ok: true };

    // AgentUser CRUD
    const testAgent = `__test_agent_${Date.now()}`;
    try {
      await base44.entities.AgentUser.create({ username: testAgent, password: 'test1234', is_active: true });
      const found = await base44.entities.AgentUser.filter({ username: testAgent });
      results.agentUser.create = !!(found && found[0]);
      if (found && found[0]) {
        await base44.entities.AgentUser.update(found[0].id, { is_active: false });
        const found2 = await base44.entities.AgentUser.filter({ username: testAgent });
        results.agentUser.update = !!(found2 && found2[0] && found2[0].is_active === false);
        await base44.entities.AgentUser.delete(found[0].id);
        const found3 = await base44.entities.AgentUser.filter({ username: testAgent });
        results.agentUser.delete = !(found3 && found3[0]);
      }
    } catch (e) {
      results.agentUser.error = String(e?.message || e);
      results.ok = false;
    }

    // CSUser CRUD
    const testCS = `__test_cs_${Date.now()}`;
    try {
      await base44.entities.CSUser.create({ username: testCS, password: 'test1234' });
      const found = await base44.entities.CSUser.filter({ username: testCS });
      results.csUser.create = !!(found && found[0]);
      if (found && found[0]) {
        await base44.entities.CSUser.delete(found[0].id);
        const found2 = await base44.entities.CSUser.filter({ username: testCS });
        results.csUser.delete = !(found2 && found2[0]);
      }
    } catch (e) {
      results.csUser.error = String(e?.message || e);
      results.ok = false;
    }

    // AppState presence
    try {
      const keys = ['cs_sheet', 'agent_sheets', 'users_sync'];
      const presence = {};
      for (const k of keys) {
        const row = await base44.entities.AppState.filter({ state_key: k });
        presence[k] = !!(row && row[0]);
      }
      results.appState = presence;
    } catch (e) {
      results.appState = { error: String(e?.message || e) };
      results.ok = false;
    }

    return Response.json(results);
  } catch (error) {
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});
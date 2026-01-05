import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseTs(ts) {
  if (!ts) return 0;
  const n = Date.parse(ts);
  return isNaN(n) ? 0 : n;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body = {};
    try { body = await req.json(); } catch { body = {}; }

    // last known timestamps (number, epoch ms). Accept numbers or strings
    let lastCs = Number(body.last_cs || 0) || 0;
    let lastAgents = Number(body.last_agents || 0) || 0;
    let lastUsers = Number(body.last_users || 0) || 0;

    const deadline = Date.now() + 25000; // long-poll up to 25s
    let changes = [];
    let now = { cs: lastCs, agents: lastAgents, users: lastUsers };

    // Helper to fetch current update times
    const fetchTimes = async () => {
      const out = { cs: 0, agents: 0, users: 0 };
      try {
        const cs = await base44.entities.AppState.filter({ state_key: 'cs_sheet' });
        out.cs = parseTs(cs?.[0]?.updated_date);
      } catch {}
      try {
        const ag = await base44.entities.AppState.filter({ state_key: 'agent_sheets' });
        out.agents = parseTs(ag?.[0]?.updated_date);
      } catch {}
      try {
        const us = await base44.entities.AppState.filter({ state_key: 'users_sync' });
        out.users = parseTs(us?.[0]?.updated_date);
      } catch {}
      return out;
    };

    while (Date.now() < deadline) {
      const t = await fetchTimes();
      now = t;
      const csChanged = t.cs > lastCs;
      const agentsChanged = t.agents > lastAgents;
      const usersChanged = t.users > lastUsers;
      changes = [];
      if (csChanged) changes.push('cs_sheet');
      if (agentsChanged) changes.push('agent_sheets');
      if (usersChanged) changes.push('users_sync');
      if (changes.length) break;
      await sleep(900);
    }

    return Response.json({ changes, now });
  } catch (error) {
    return Response.json({ error: error.message || 'internal_error' }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function objectToXml(tagName, obj) {
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  if (obj == null) {
    return `<${tagName}/>`;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => objectToXml(tagName, item)).join('');
  }

  if (typeof obj !== 'object') {
    return `<${tagName}>${esc(obj)}</${tagName}>`;
  }

  const children = Object.entries(obj).map(([k, v]) => objectToXml(k, v)).join('');
  return `<${tagName}>${children}</${tagName}>`;
}

function toXmlEnvelope(rootName, payload) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n${objectToXml(rootName, payload)}`;
  return xml;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse JSON body (functions.invoke sends JSON); allow empty for health
    let body = {};
    if (req.method !== 'GET') {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const action = body.action || 'health';
    const format = (body.format || '').toLowerCase();

    // Helper: respond in JSON or XML
    const respond = (rootName, payload, preferXml = false) => {
      const wantsXml = preferXml || /xml/i.test(req.headers.get('accept') || '') || format === 'xml';
      if (wantsXml) {
        const xml = toXmlEnvelope(rootName, payload);
        return new Response(xml, {
          status: 200,
          headers: { 'Content-Type': 'application/xml; charset=utf-8' },
        });
      }
      return Response.json(payload);
    };

    if (action === 'health') {
      return respond('health', { status: 'ok', user: { email: user.email, role: user.role } });
    }

    if (action === 'getState') {
      const stateKey = body.state_key;
      if (!stateKey) {
        return Response.json({ error: 'state_key is required' }, { status: 400 });
      }
      const recs = await base44.entities.AppState.filter({ state_key: stateKey });
      const rec = recs && recs[0];
      if (!rec) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      return respond('state', {
        state_key: stateKey,
        updated_date: rec.updated_date,
        data: rec.data || null,
      });
    }

    if (action === 'bulkGet') {
      const keys = body.state_keys || ['cs_sheet', 'agent_sheets'];
      const out = {};
      for (const k of keys) {
        try {
          const recs = await base44.entities.AppState.filter({ state_key: k });
          const rec = recs && recs[0];
          out[k] = rec ? { updated_date: rec.updated_date, data: rec.data || null } : null;
        } catch (e) {
          out[k] = { error: e.message || 'fetch_error' };
        }
      }
      return respond('states', out);
    }

    if (action === 'setState') {
      // Admin-only for writes
      if (user?.role !== 'admin') {
        return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
      }
      const stateKey = body.state_key;
      const data = body.data;
      if (!stateKey) {
        return Response.json({ error: 'state_key is required' }, { status: 400 });
      }
      const rows = await base44.entities.AppState.filter({ state_key: stateKey });
      if (rows && rows[0]) {
        await base44.entities.AppState.update(rows[0].id, { data });
      } else {
        await base44.entities.AppState.create({ state_key: stateKey, data });
      }
      return respond('result', { status: 'ok', state_key: stateKey });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message || 'internal_error' }, { status: 500 });
  }
});
import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 as adn7 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Download, Save, Shield, Upload, Users, Trash2, ArrowLeft, KeyRound, FileCog, Search } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "./utils";

export default function AdminSettings() {
  // Simple session check (local) to guard page
  const [session, setSession] = useState({ role: null, username: null });
  useEffect(() => {
    try { setSession(JSON.parse(localStorage.getItem("DHL_LOGIN_DEMO_V1") || "{}")?.session || { role: null, username: null }); } catch {}
  }, []);

  const isAdmin = session.role === "admin";

  // Maintenance Mode
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceBanner, setMaintenanceBanner] = useState("");

  // Role permissions
  const [rolePerm, setRolePerm] = useState({
    agent: { allowCopyButtons: true, allowDownloadReport: true },
    cs_allocator: { allowUpload: true, allowClear: true, allowDownload: true },
  });

  // Users
  const [agents, setAgents] = useState([]);
  const [csAllocators, setCSAllocators] = useState([]);
  const [newAgent, setNewAgent] = useState({ username: "", password: "" });
  const [newCS, setNewCS] = useState({ username: "", password: "" });

  // Env (.env) template
  const [envTemplate, setEnvTemplate] = useState({ ADMIN_DEFAULT_USERNAME: "", ADMIN_DEFAULT_PASSWORD: "", OTP_EXPIRY_MINUTES: "10", EMAIL_SENDER_NAME: "" });

  // Audit
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearch, setAuditSearch] = useState("");

  // Helpers to read/write AppState role_permissions
  const loadRolePerms = async () => {
    try {
      const recs = await adn7.entities.AppState.filter({ state_key: "role_permissions" });
      const cfg = recs?.[0]?.data;
      if (cfg) setRolePerm((prev) => ({ agent: { ...prev.agent, ...(cfg.agent || {}) }, cs_allocator: { ...prev.cs_allocator, ...(cfg.cs_allocator || {}) } }));
    } catch {}
  };
  const saveRolePerms = async (next) => {
    try {
      const rows = await adn7.entities.AppState.filter({ state_key: "role_permissions" });
      if (rows && rows[0]) await adn7.entities.AppState.update(rows[0].id, { data: next });
      else await adn7.entities.AppState.create({ state_key: "role_permissions", data: next });
      setRolePerm(next);
      toast.success("Role permissions saved");
      await adn7.entities.AuditLog.create({ action: "update_role_permissions", actor_username: session.username, actor_role: "admin", details: JSON.stringify(next), timestamp: Date.now() });
    } catch {}
  };

  // Load data on mount
  useEffect(() => {
    (async () => {
      try {
        const cfgs = await adn7.entities.AdminConfig.filter({ config_key: "main" });
        const cfg = (cfgs || [])[0];
        if (cfg) {
          setMaintenanceMode(!!cfg.maintenance_mode);
          setMaintenanceBanner(String(cfg.banner_message || ""));
        }
      } catch {}
      await loadRolePerms();
      try {
        const [serverAgents, serverCS] = await Promise.all([adn7.entities.AgentUser.list(), adn7.entities.CSUser.list()]);
        setAgents(serverAgents || []);
        setCSAllocators(serverCS || []);
      } catch {}
      try {
        const res = await adn7.functions.invoke("adminSettingsApi", { action: "getEnvOverview" });
        const saved = res.data?.saved || {};
        setEnvTemplate({
          ADMIN_DEFAULT_USERNAME: saved.ADMIN_DEFAULT_USERNAME ?? "",
          ADMIN_DEFAULT_PASSWORD: saved.ADMIN_DEFAULT_PASSWORD ?? "",
          OTP_EXPIRY_MINUTES: String(saved.OTP_EXPIRY_MINUTES ?? "10"),
          EMAIL_SENDER_NAME: saved.EMAIL_SENDER_NAME ?? "",
          ...Object.fromEntries(Object.entries(saved).filter(([k]) => !["ADMIN_DEFAULT_USERNAME", "ADMIN_DEFAULT_PASSWORD", "OTP_EXPIRY_MINUTES", "EMAIL_SENDER_NAME"].includes(k)))
        });
      } catch {}
      try {
        const list = await adn7.entities.AuditLog.list();
        const sorted = (list || []).sort((a,b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
        setAuditLogs(sorted.slice(0, 200));
      } catch {}
    })();
  }, []);

  const saveMaintenance = async () => {
    try {
      await adn7.functions.invoke("adminSettingsApi", { action: "updateSettings", payload: { maintenance_mode: maintenanceMode, banner_message: maintenanceBanner } });
      toast.success("Maintenance settings saved");
      await adn7.entities.AuditLog.create({ action: "update_maintenance", actor_username: session.username, actor_role: "admin", details: JSON.stringify({ maintenance_mode: maintenanceMode, banner_message: maintenanceBanner }), timestamp: Date.now() });
    } catch {}
  };

  const filteredAudit = useMemo(() => {
    const q = (auditSearch || "").toLowerCase().trim();
    if (!q) return auditLogs;
    return auditLogs.filter((log) => {
      const details = (log.details || "").toLowerCase();
      const target = `${log.target_type || ""}:${log.target_identifier || ""}`.toLowerCase();
      return (
        (log.action || "").toLowerCase().includes(q) ||
        (log.actor_username || "").toLowerCase().includes(q) ||
        target.includes(q) ||
        details.includes(q)
      );
    });
  }, [auditLogs, auditSearch]);

  // User CRUD
  const createAgent = async () => {
    const u = String(newAgent.username || "").trim();
    const p = String(newAgent.password || "").trim();
    if (!u || p.length < 4) { toast.error("Provide username and 4+ char password"); return; }
    try {
      await adn7.entities.AgentUser.create({ username: u, password: p, is_active: true });
      const list = await adn7.entities.AgentUser.list();
      setAgents(list || []);
      setNewAgent({ username: "", password: "" });
      toast.success("Agent created");
      await adn7.entities.AuditLog.create({ action: "create_agent", actor_username: session.username, actor_role: "admin", details: JSON.stringify({ username: u }), timestamp: Date.now() });
    } catch (e) { toast.error("Failed"); }
  };
  const deleteAgent = async (u) => {
    try {
      const rows = await adn7.entities.AgentUser.filter({ username: u });
      if (rows && rows[0]) await adn7.entities.AgentUser.delete(rows[0].id);
      setAgents((await adn7.entities.AgentUser.list()) || []);
      toast.success("Agent deleted");
      await adn7.entities.AuditLog.create({ action: "delete_agent", actor_username: session.username, actor_role: "admin", details: JSON.stringify({ username: u }), timestamp: Date.now() });
    } catch { toast.error("Failed"); }
  };
  const toggleAgentActive = async (id, val) => {
    try { await adn7.entities.AgentUser.update(id, { is_active: !!val }); setAgents((await adn7.entities.AgentUser.list()) || []); } catch {}
  };

  const createCS = async () => {
    const u = String(newCS.username || "").trim();
    const p = String(newCS.password || "").trim();
    if (!u || p.length < 4) { toast.error("Provide username and 4+ char password"); return; }
    try {
      await adn7.entities.CSUser.create({ username: u, password: p });
      const list = await adn7.entities.CSUser.list();
      setCSAllocators(list || []);
      setNewCS({ username: "", password: "" });
      toast.success("CS user created");
      await adn7.entities.AuditLog.create({ action: "create_cs_allocator", actor_username: session.username, actor_role: "admin", details: JSON.stringify({ username: u }), timestamp: Date.now() });
    } catch { toast.error("Failed"); }
  };
  const deleteCS = async (u) => {
    try {
      const rows = await adn7.entities.CSUser.filter({ username: u });
      if (rows && rows[0]) await adn7.entities.CSUser.delete(rows[0].id);
      setCSAllocators((await adn7.entities.CSUser.list()) || []);
      toast.success("CS user deleted");
      await adn7.entities.AuditLog.create({ action: "delete_cs_allocator", actor_username: session.username, actor_role: "admin", details: JSON.stringify({ username: u }), timestamp: Date.now() });
    } catch { toast.error("Failed"); }
  };

  // Env actions
  const saveEnvTemplate = async () => {
    try { await adn7.functions.invoke("adminSettingsApi", { action: "updateEnvTemplate", payload: envTemplate }); toast.success(".env template saved"); } catch {}
  };
  const downloadDotEnv = async () => {
    try {
      const res = await adn7.functions.invoke("adminSettingsApi", { action: "downloadDotEnv" });
      const blob = new Blob([res.data], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = ".env"; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch {}
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <Card className="max-w-md w-full">
          <CardHeader><CardTitle>Forbidden</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">You must be an admin to view Admin Settings.</p>
            <div className="mt-3">
              <Button onClick={() => (window.location.href = createPageUrl("DHLSheet"))} variant="outline" className="font-bold">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4" style={{ background: "linear-gradient(180deg,#fff 0%,#fff7d1 100%)" }}>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-yellow-400 text-black font-black">ADMIN</Badge>
            <span className="font-bold">{session.username}</span>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => (window.location.href = createPageUrl("DHLSheet"))} variant="outline" className="font-bold">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Maintenance Mode */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="w-5 h-5" /> Maintenance Mode</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 border border-yellow-200">
              <div>
                <Label className="font-bold">Enable Maintenance Mode</Label>
                <p className="text-xs text-gray-600">Disables non-admin logins and shows a banner across the app.</p>
              </div>
              <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
            </div>
            <div>
              <Label className="text-xs text-black/60">Banner Message</Label>
              <Input value={maintenanceBanner} onChange={(e) => setMaintenanceBanner(e.target.value)} placeholder="We are doing some updates in the app, We will get back soon..." />
            </div>
            <Button onClick={saveMaintenance} className="font-bold bg-yellow-400 hover:bg-yellow-500 text-black">
              <Save className="w-4 h-4 mr-2" /> Save Maintenance Settings
            </Button>
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><FileCog className="w-5 h-5" /> Role Permissions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="p-3 rounded border">
                <Label className="font-bold">Agent</Label>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm">Allow Copy Buttons</span>
                  <Switch checked={!!rolePerm.agent.allowCopyButtons} onCheckedChange={(v)=>saveRolePerms({ ...rolePerm, agent: { ...rolePerm.agent, allowCopyButtons: v } })} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm">Allow Download Report</span>
                  <Switch checked={!!rolePerm.agent.allowDownloadReport} onCheckedChange={(v)=>saveRolePerms({ ...rolePerm, agent: { ...rolePerm.agent, allowDownloadReport: v } })} />
                </div>
              </div>
              <div className="p-3 rounded border">
                <Label className="font-bold">CS Allocator</Label>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm">Allow Upload</span>
                  <Switch checked={!!rolePerm.cs_allocator.allowUpload} onCheckedChange={(v)=>saveRolePerms({ ...rolePerm, cs_allocator: { ...rolePerm.cs_allocator, allowUpload: v } })} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm">Allow Clear</span>
                  <Switch checked={!!rolePerm.cs_allocator.allowClear} onCheckedChange={(v)=>saveRolePerms({ ...rolePerm, cs_allocator: { ...rolePerm.cs_allocator, allowClear: v } })} />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm">Allow Download</span>
                  <Switch checked={!!rolePerm.cs_allocator.allowDownload} onCheckedChange={(v)=>saveRolePerms({ ...rolePerm, cs_allocator: { ...rolePerm.cs_allocator, allowDownload: v } })} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Management */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> User Management</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Agents */}
              <div className="p-3 rounded border">
                <div className="font-bold mb-2">Agents</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input value={newAgent.username} onChange={(e)=>setNewAgent({ ...newAgent, username: e.target.value })} placeholder="username" />
                  <Input type="password" value={newAgent.password} onChange={(e)=>setNewAgent({ ...newAgent, password: e.target.value })} placeholder="password" />
                </div>
                <Button onClick={createAgent} className="w-full font-bold bg-yellow-400 hover:bg-yellow-500 text-black">Create Agent</Button>
                <Separator className="my-3" />
                <ScrollArea className="h-[220px] pr-2">
                  <div className="space-y-2">
                    {agents.length === 0 ? <p className="text-sm text-gray-500">No agents</p> : agents.map(a => (
                      <div key={a.id || a.username} className="p-2 rounded border bg-white flex items-center justify-between">
                        <div>
                          <div className="font-bold">{a.username}</div>
                          <div className="text-xs text-gray-600">{a.email || ""}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Active</Label>
                            <Switch checked={a.is_active !== false} onCheckedChange={(v)=>toggleAgentActive(a.id, v)} />
                          </div>
                          <Button size="sm" variant="outline" onClick={()=>deleteAgent(a.username)} className="text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              {/* CS Allocators */}
              <div className="p-3 rounded border">
                <div className="font-bold mb-2">CS Allocators</div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Input value={newCS.username} onChange={(e)=>setNewCS({ ...newCS, username: e.target.value })} placeholder="username" />
                  <Input type="password" value={newCS.password} onChange={(e)=>setNewCS({ ...newCS, password: e.target.value })} placeholder="password" />
                </div>
                <Button onClick={createCS} className="w-full font-bold">Create CS</Button>
                <Separator className="my-3" />
                <ScrollArea className="h-[220px] pr-2">
                  <div className="space-y-2">
                    {csAllocators.length === 0 ? <p className="text-sm text-gray-500">No CS users</p> : csAllocators.map(c => (
                      <div key={c.id || c.username} className="p-2 rounded border bg-white flex items-center justify-between">
                        <div>
                          <div className="font-bold">{c.username}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={()=>deleteCS(c.username)} className="text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Env Manager */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" /> Environment (.env) Manager</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-black/60">ADMIN_DEFAULT_USERNAME</Label>
                <Input value={envTemplate.ADMIN_DEFAULT_USERNAME} onChange={(e)=>setEnvTemplate({ ...envTemplate, ADMIN_DEFAULT_USERNAME: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-black/60">ADMIN_DEFAULT_PASSWORD</Label>
                <Input type="password" value={envTemplate.ADMIN_DEFAULT_PASSWORD} onChange={(e)=>setEnvTemplate({ ...envTemplate, ADMIN_DEFAULT_PASSWORD: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-black/60">OTP_EXPIRY_MINUTES</Label>
                <Input value={envTemplate.OTP_EXPIRY_MINUTES} onChange={(e)=>setEnvTemplate({ ...envTemplate, OTP_EXPIRY_MINUTES: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs text-black/60">EMAIL_SENDER_NAME</Label>
                <Input value={envTemplate.EMAIL_SENDER_NAME} onChange={(e)=>setEnvTemplate({ ...envTemplate, EMAIL_SENDER_NAME: e.target.value })} />
              </div>
            </div>
            {/* Custom vars */}
            <div className="space-y-2">
              <Label className="text-sm font-bold">Custom Variables</Label>
              {Object.entries(envTemplate).filter(([k])=>!["ADMIN_DEFAULT_USERNAME","ADMIN_DEFAULT_PASSWORD","OTP_EXPIRY_MINUTES","EMAIL_SENDER_NAME"].includes(k)).length === 0 && (
                <p className="text-xs text-black/40">No custom variables yet.</p>
              )}
              {Object.entries(envTemplate).filter(([k])=>!["ADMIN_DEFAULT_USERNAME","ADMIN_DEFAULT_PASSWORD","OTP_EXPIRY_MINUTES","EMAIL_SENDER_NAME"].includes(k)).map(([k,v]) => (
                <div key={k} className="grid md:grid-cols-5 gap-2 items-center">
                  <Input value={k} onChange={(e)=>{
                    const newKey = e.target.value.trim();
                    setEnvTemplate(prev => { const next = { ...prev }; const val = next[k]; delete next[k]; next[newKey || k] = val; return next; });
                  }} />
                  <div className="md:col-span-3">
                    <Input value={v} onChange={(e)=>setEnvTemplate(prev => ({ ...prev, [k]: e.target.value }))} />
                  </div>
                  <Button variant="outline" size="sm" onClick={()=>setEnvTemplate(prev => { const next = { ...prev }; delete next[k]; return next; })} className="text-red-600 hover:bg-red-50">
                    <Trash2 className="w-4 h-4 mr-1" /> Remove
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={()=>setEnvTemplate(prev => ({ ...prev, ["CUSTOM_VAR_"+Date.now()]: "" }))}>+ Add Variable</Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveEnvTemplate} className="font-bold bg-yellow-400 hover:bg-yellow-500 text-black"><Save className="w-4 h-4 mr-2" /> Save Template</Button>
              <Button variant="outline" onClick={downloadDotEnv} className="font-bold"><Download className="w-4 h-4 mr-2" /> Download .env</Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log */}
        <Card className="bg-white/95 border-black/10 shadow-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><Search className="w-5 h-5" /> Audit Log</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-2">
              <Input value={auditSearch} onChange={(e)=>setAuditSearch(e.target.value)} placeholder="Search by action, user, AWB, or details..." className="max-w-sm" />
              <Button variant="outline" onClick={async()=>{ const list = await adn7.entities.AuditLog.list(); const sorted = (list||[]).sort((a,b)=>new Date(b.created_date)-new Date(a.created_date)); setAuditLogs(sorted.slice(0,200)); }} className="font-bold">Refresh</Button>
            </div>
            {filteredAudit.length === 0 ? (
              <p className="text-sm text-black/50">No audit entries found.</p>
            ) : (
              <ScrollArea className="h-[280px] pr-4">
                <div className="space-y-2">
                  {filteredAudit.map((log) => (
                    <div key={log.id} className="p-2 rounded border bg-white flex items-center justify-between">
                      <div className="text-sm">
                        <div className="font-bold">{log.action}</div>
                        <div className="text-xs text-gray-600">By {log.actor_username} ({log.actor_role}) • {new Date(log.created_date).toLocaleString()}</div>
                        {log.details && (<div className="text-xs text-gray-700 mt-1 font-mono truncate">{log.details}</div>)}
                      </div>
                      {log.target_type && (
                        <Badge variant="outline" className="text-xs">{log.target_type}:{log.target_identifier}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
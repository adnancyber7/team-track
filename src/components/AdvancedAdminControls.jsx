import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Settings, Clock, Users, Zap, Shield, Megaphone, Download } from 'lucide-react';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

const AdvancedAdminControls = ({ agents, csSheet, onUpdate, ROWS_COUNT, COL_AGENTS, COL_AWB }) => { // Access Controls synced to backend
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('dhl-admin-settings');
    const defaults = {
      priorityUnlockCount: 0,
      breakReminderEnabled: false,
      breakReminderInterval: 60,
      autoAssignEnabled: false,
      userAccess: {
        allowAdminLogin: true,
        allowAgentLogin: true,
        allowCSLogin: true,
        maintenanceMode: false,
        bannerMessage: ""
      },
      userProfiles: {}
    };
    try {
      const data = saved ? JSON.parse(saved) : {};
      return {
        ...defaults,
        ...data,
        userAccess: { ...defaults.userAccess, ...(data.userAccess || {}) },
        userProfiles: { ...defaults.userProfiles, ...(data.userProfiles || {}) }
      };
    } catch {
      return defaults;
    }
  });

  const [breakTimers, setBreakTimers] = useState(() => {
    const saved = localStorage.getItem('dhl-break-timers');
    return saved ? JSON.parse(saved) : {};
  });

  const [massAssignment, setMassAssignment] = useState({
    awbList: '',
    selectedAgent: '',
    mode: 'assign'
  });

  useEffect(() => {
    localStorage.setItem('dhl-admin-settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const syncAccess = async () => {
      try {
        const ua = settings.userAccess || {};
        const cfgs = await base44.entities.AdminConfig.filter({ config_key: 'main' });
        const payload = {
          allow_admin_login: ua.allowAdminLogin ?? true,
          allow_agent_login: ua.allowAgentLogin ?? true,
          allow_cs_login: ua.allowCSLogin ?? true,
          maintenance_mode: ua.maintenanceMode ?? false,
          banner_message: ua.bannerMessage ?? ''
        };
        if (cfgs && cfgs[0]) {
          await base44.entities.AdminConfig.update(cfgs[0].id, payload);
        } else {
          await base44.entities.AdminConfig.create({
            config_key: 'main',
            admin_username: 'admin',
            admin_password: 'admin123',
            ...payload
          });
        }
      } catch (e) {
        // ignore sync errors
      }
    };
    syncAccess();
  }, [settings.userAccess]);

  useEffect(() => {
    localStorage.setItem('dhl-break-timers', JSON.stringify(breakTimers));
  }, [breakTimers]);

  // Break reminder system
  useEffect(() => {
    if (!settings.breakReminderEnabled) return;

    const interval = setInterval(() => {
      const now = Date.now();
      agents.forEach(agent => {
        if (!breakTimers[agent.username]) {
          setBreakTimers(prev => ({
            ...prev,
            [agent.username]: { startTime: now, lastBreak: now }
          }));
          return;
        }

        const timer = breakTimers[agent.username];
        const minutesSinceBreak = (now - timer.lastBreak) / 60000;

        if (minutesSinceBreak >= settings.breakReminderInterval) {
          toast(`⏰ Break Reminder: ${agent.username} should take a break`, {
            duration: 10000,
            action: {
              label: 'Mark Break Taken',
              onClick: () => {
                setBreakTimers(prev => ({
                  ...prev,
                  [agent.username]: { ...timer, lastBreak: now }
                }));
                toast.success(`Break logged for ${agent.username}`);
              }
            }
          });
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [settings.breakReminderEnabled, settings.breakReminderInterval, agents, breakTimers]);

  const handleSettingChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast.success('Settings updated');
  };

  const updateUserAccess = (patch) => {
    setSettings(prev => ({ ...prev, userAccess: { ...prev.userAccess, ...patch } }));
    toast.success('Access controls updated');
  };

  const updateUserProfile = (username, patch) => {
    setSettings(prev => ({
      ...prev,
      userProfiles: {
        ...(prev.userProfiles || {}),
        [username]: { role: 'agent', isActive: true, ...(prev.userProfiles?.[username] || {}), ...patch }
      }
    }));
  };

  const handleMassAssignment = () => {
    const awbs = massAssignment.awbList
      .split(/[\n,;]/)
      .map(a => a.trim())
      .filter(a => a && a.length === 10);

    if (awbs.length === 0) {
      toast.error('No valid 10-digit AWBs found');
      return;
    }

    if (massAssignment.mode === 'assign' && !massAssignment.selectedAgent) {
      toast.error('Please select an agent');
      return;
    }

    const sheets = JSON.parse(localStorage.getItem('dhl-agent-sheets') || '{}');
    
    if (massAssignment.mode === 'assign') {
      // Assign AWBs to selected agent
      const existingPriorities = sheets.agentPriorityMap?.[massAssignment.selectedAgent] || [];
      const newPriorities = [...new Set([...existingPriorities, ...awbs])];
      
      if (!sheets.agentPriorityMap) sheets.agentPriorityMap = {};
      sheets.agentPriorityMap[massAssignment.selectedAgent] = newPriorities;
      
      awbs.forEach(awb => {
        if (!sheets.priorityAgentMap) sheets.priorityAgentMap = {};
        sheets.priorityAgentMap[awb] = massAssignment.selectedAgent;
      });

      sheets.priorityModeActive = true;
      sheets.priorityNumbers = Object.values(sheets.agentPriorityMap).flat().join('\n');

      localStorage.setItem('dhl-agent-sheets', JSON.stringify(sheets));
      onUpdate();
      
      toast.success(`Assigned ${awbs.length} AWBs to ${massAssignment.selectedAgent}`);
    } else if (massAssignment.mode === 'reassign') {
      // Find and reassign AWBs to new agent
      if (!massAssignment.selectedAgent) {
        toast.error('Please select target agent');
        return;
      }

      let reassignedCount = 0;
      awbs.forEach(awb => {
        if (sheets.priorityAgentMap && sheets.priorityAgentMap[awb]) {
          const oldAgent = sheets.priorityAgentMap[awb];
          const newAgent = massAssignment.selectedAgent;

          // Remove from old agent
          if (sheets.agentPriorityMap[oldAgent]) {
            sheets.agentPriorityMap[oldAgent] = sheets.agentPriorityMap[oldAgent].filter(a => a !== awb);
          }

          // Add to new agent
          if (!sheets.agentPriorityMap[newAgent]) sheets.agentPriorityMap[newAgent] = [];
          if (!sheets.agentPriorityMap[newAgent].includes(awb)) {
            sheets.agentPriorityMap[newAgent].push(awb);
          }

          sheets.priorityAgentMap[awb] = newAgent;
          reassignedCount++;
        }
      });

      sheets.priorityNumbers = Object.values(sheets.agentPriorityMap).flat().join('\n');
      localStorage.setItem('dhl-agent-sheets', JSON.stringify(sheets));
      onUpdate();

      toast.success(`Reassigned ${reassignedCount} AWBs to ${massAssignment.selectedAgent}`);
    } else if (massAssignment.mode === 'remove') {
      // Remove AWBs from priority mode
      awbs.forEach(awb => {
        if (sheets.priorityAgentMap && sheets.priorityAgentMap[awb]) {
          const agent = sheets.priorityAgentMap[awb];
          if (sheets.agentPriorityMap[agent]) {
            sheets.agentPriorityMap[agent] = sheets.agentPriorityMap[agent].filter(a => a !== awb);
          }
          delete sheets.priorityAgentMap[awb];
        }
      });

      sheets.priorityNumbers = Object.values(sheets.agentPriorityMap).flat().join('\n');
      localStorage.setItem('dhl-agent-sheets', JSON.stringify(sheets));
      onUpdate();

      toast.success(`Removed ${awbs.length} AWBs from priority mode`);
    }

    setMassAssignment({ awbList: '', selectedAgent: '', mode: 'assign' });
  };

  const resetBreakTimer = (username) => {
    setBreakTimers(prev => ({
      ...prev,
      [username]: { ...prev[username], lastBreak: Date.now() }
    }));
    toast.success(`Break timer reset for ${username}`);
  };

  const getAgentWorkDuration = (username) => {
    if (!breakTimers[username]) return 0;
    return Math.floor((Date.now() - breakTimers[username].startTime) / 60000);
  };

  const getTimeSinceBreak = (username) => {
    if (!breakTimers[username]) return 0;
    return Math.floor((Date.now() - breakTimers[username].lastBreak) / 60000);
  };

  const handleExportXML = async () => {
    // Fetch latest data from backend to ensure cross-device accuracy
    try {
      const [agentUsers, csUsers] = await Promise.all([
        base44.entities.AgentUser.list(),
        base44.entities.CSUser.list()
      ]);

      const esc = (s) => String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const agentsXML = (agentUsers || []).map(a => `    <agent>\n      <username>${esc(a.username)}</username>\n      <password>${esc(a.password)}</password>\n    </agent>`).join('\n');
      const csXML = (csUsers || []).map(u => `    <csUser>\n      <username>${esc(u.username)}</username>\n      <password>${esc(u.password)}</password>\n    </csUser>`).join('\n');

      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<credentials>\n  <agents>\n${agentsXML}\n  </agents>\n  <csUsers>\n${csXML}\n  </csUsers>\n</credentials>`;

      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'credentials.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      // Fallback to exporting current in-memory lists if server fetch fails
      const esc = (s) => String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      const agentsXML = (agents || []).map(a => `    <agent>\n      <username>${esc(a.username)}</username>\n      <password>${esc(a.password)}</password>\n    </agent>`).join('\n');
      const csXML = ([]).map(u => `    <csUser>\n      <username>${esc(u.username)}</username>\n      <password>${esc(u.password)}</password>\n    </csUser>`).join('\n');
      const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<credentials>\n  <agents>\n${agentsXML}\n  </agents>\n  <csUsers>\n${csXML}\n  </csUsers>\n</credentials>`;
      const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'credentials.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Card className="w-full border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Settings className="w-6 h-6 text-purple-600" />
          Advanced Admin Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="priority" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="priority">Priority Settings</TabsTrigger>
            <TabsTrigger value="breaks">Break Reminders</TabsTrigger>
            <TabsTrigger value="mass">Mass Assignment</TabsTrigger>
            <TabsTrigger value="access">Access Controls</TabsTrigger>
            <TabsTrigger value="users">User Data</TabsTrigger>
          </TabsList>

          <TabsContent value="priority" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-bold mb-2 block">Priority Unlock Threshold</Label>
                  <p className="text-xs text-gray-600 mb-2">
                    Set how many priority AWBs an agent must complete before seeing all content (0 = disabled)
                  </p>
                  <Input
                    type="number"
                    min="0"
                    value={settings.priorityUnlockCount}
                    onChange={(e) => handleSettingChange('priorityUnlockCount', parseInt(e.target.value) || 0)}
                    className="w-40"
                  />
                  <Badge className="mt-2 bg-blue-100 text-blue-800">
                    {settings.priorityUnlockCount === 0 
                      ? 'All priorities must be completed'
                      : `Unlock after ${settings.priorityUnlockCount} completed`}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                  <div>
                    <Label className="font-bold">Auto-Assignment Mode</Label>
                    <p className="text-xs text-gray-600">Automatically assign new AWBs to available agents</p>
                  </div>
                  <Switch
                    checked={settings.autoAssignEnabled}
                    onCheckedChange={(checked) => handleSettingChange('autoAssignEnabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breaks" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div>
                    <Label className="font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Enable Break Reminders
                    </Label>
                    <p className="text-xs text-gray-600">Notify when agents should take breaks</p>
                  </div>
                  <Switch
                    checked={settings.breakReminderEnabled}
                    onCheckedChange={(checked) => handleSettingChange('breakReminderEnabled', checked)}
                  />
                </div>

                {settings.breakReminderEnabled && (
                  <>
                    <div>
                      <Label className="text-sm font-bold mb-2 block">Break Interval (minutes)</Label>
                      <Input
                        type="number"
                        min="15"
                        value={settings.breakReminderInterval}
                        onChange={(e) => handleSettingChange('breakReminderInterval', parseInt(e.target.value) || 60)}
                        className="w-40"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Agent Break Status</Label>
                      {agents.map(agent => {
                        const workDuration = getAgentWorkDuration(agent.username);
                        const timeSinceBreak = getTimeSinceBreak(agent.username);
                        const needsBreak = timeSinceBreak >= settings.breakReminderInterval;

                        return (
                          <div key={agent.username} className={`p-3 rounded-lg border ${needsBreak ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-200'}`}>
                            <div className="flex items-center justify-between">
                              <div>
                                <Badge className="bg-yellow-400 text-black font-bold">{agent.username}</Badge>
                                <div className="text-xs mt-1 space-y-1">
                                  <div>Work Duration: <span className="font-bold">{workDuration}m</span></div>
                                  <div>Since Break: <span className={`font-bold ${needsBreak ? 'text-red-600' : ''}`}>{timeSinceBreak}m</span></div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {needsBreak && (
                                  <Badge className="bg-red-500 text-white animate-pulse">
                                    BREAK NEEDED
                                  </Badge>
                                )}
                                <Button
                                  onClick={() => resetBreakTimer(agent.username)}
                                  size="sm"
                                  variant="outline"
                                  className="font-bold"
                                >
                                  Reset Timer
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mass" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label className="text-sm font-bold mb-2 block flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Mass AWB Assignment
                  </Label>
                  <p className="text-xs text-gray-600 mb-3">
                    Paste multiple AWBs (one per line or comma-separated) to assign, reassign, or remove from priority mode
                  </p>
                  
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">Operation Mode</Label>
                      <Select value={massAssignment.mode} onValueChange={(val) => setMassAssignment(prev => ({ ...prev, mode: val }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="assign">Assign to Agent</SelectItem>
                          <SelectItem value="reassign">Reassign to Different Agent</SelectItem>
                          <SelectItem value="remove">Remove from Priority Mode</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(massAssignment.mode === 'assign' || massAssignment.mode === 'reassign') && (
                      <div>
                        <Label className="text-xs text-gray-600 mb-1 block">
                          {massAssignment.mode === 'assign' ? 'Select Agent' : 'Reassign to Agent'}
                        </Label>
                        <Select value={massAssignment.selectedAgent} onValueChange={(val) => setMassAssignment(prev => ({ ...prev, selectedAgent: val }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose agent..." />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map(agent => (
                              <SelectItem key={agent.username} value={agent.username}>
                                {agent.username}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div>
                      <Label className="text-xs text-gray-600 mb-1 block">AWB Numbers (10 digits each)</Label>
                      <textarea
                        value={massAssignment.awbList}
                        onChange={(e) => setMassAssignment(prev => ({ ...prev, awbList: e.target.value }))}
                        placeholder="1234567890&#10;9876543210&#10;or comma-separated"
                        className="w-full h-32 p-2 border rounded-lg font-mono text-sm"
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        {massAssignment.awbList.split(/[\n,;]/).filter(a => a.trim().length === 10).length} valid AWBs detected
                      </div>
                    </div>

                    <Button
                      onClick={handleMassAssignment}
                      className="w-full bg-purple-600 hover:bg-purple-700 font-black"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      {massAssignment.mode === 'assign' && 'Assign AWBs'}
                      {massAssignment.mode === 'reassign' && 'Reassign AWBs'}
                      {massAssignment.mode === 'remove' && 'Remove AWBs'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div>
                    <Label className="font-bold flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Maintenance Mode
                    </Label>
                    <p className="text-xs text-gray-600">Disable logins and display a global banner</p>
                  </div>
                  <Switch checked={settings.userAccess?.maintenanceMode} onCheckedChange={(v) => updateUserAccess({ maintenanceMode: v })} />
                </div>

                <div className="grid md:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <Label className="font-bold">Admin Login</Label>
                      <p className="text-xs text-gray-600">Allow admin to login</p>
                    </div>
                    <Switch checked={settings.userAccess?.allowAdminLogin} onCheckedChange={(v) => updateUserAccess({ allowAdminLogin: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <Label className="font-bold">Agent Login</Label>
                      <p className="text-xs text-gray-600">Allow agents to login</p>
                    </div>
                    <Switch checked={settings.userAccess?.allowAgentLogin} onCheckedChange={(v) => updateUserAccess({ allowAgentLogin: v })} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
                    <div>
                      <Label className="font-bold">CS Team Login</Label>
                      <p className="text-xs text-gray-600">Allow CS team to login</p>
                    </div>
                    <Switch checked={settings.userAccess?.allowCSLogin} onCheckedChange={(v) => updateUserAccess({ allowCSLogin: v })} />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-bold flex items-center gap-2">
                    <Megaphone className="w-4 h-4" />
                    Banner Message
                  </Label>
                  <Input
                    value={settings.userAccess?.bannerMessage || ''}
                    onChange={(e) => updateUserAccess({ bannerMessage: e.target.value })}
                    placeholder="e.g., Scheduled maintenance at 6pm UAE time" className="mt-1" />
                  {settings.userAccess?.bannerMessage && (
                    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-sm font-medium">
                      Preview: {settings.userAccess.bannerMessage}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="text-sm text-gray-600">
                  Manage per-user data for agents. Stored locally in admin's browser (localStorage).
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleExportXML} variant="outline" className="font-bold">
                    <Download className="w-4 h-4 mr-2" /> Export Agents/CS as XML
                  </Button>
                </div>

                {agents.length === 0 ? (
                  <p className="text-sm text-black/50">No agents created yet.</p>
                ) : (
                  <div className="grid md:grid-cols-2 gap-3">
                    {agents.map(agent => {
                      const p = settings.userProfiles?.[agent.username] || { fullName: '', email: '', region: '', notes: '', isActive: true, role: 'agent' };
                      return (
                        <div key={agent.username} className="p-3 rounded-lg border bg-white space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-yellow-400 text-black font-bold">{agent.username}</Badge>
                              <Badge variant="outline" className="text-xs">{p.role || 'agent'}</Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Active</Label>
                              <Switch checked={p.isActive !== false} onCheckedChange={(v) => updateUserProfile(agent.username, { isActive: v })} />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-black/60">Full Name</Label>
                              <Input value={p.fullName} onChange={(e) => updateUserProfile(agent.username, { fullName: e.target.value })} placeholder="e.g. John Doe" />
                            </div>
                            <div>
                              <Label className="text-xs text-black/60">Email</Label>
                              <Input value={p.email} onChange={(e) => updateUserProfile(agent.username, { email: e.target.value })} placeholder="name@company.com" />
                            </div>
                            <div>
                              <Label className="text-xs text-black/60">Region</Label>
                              <Input value={p.region} onChange={(e) => updateUserProfile(agent.username, { region: e.target.value })} placeholder="e.g. DXB" />
                            </div>
                            <div className="col-span-2">
                              <Label className="text-xs text-black/60">Notes</Label>
                              <Textarea value={p.notes} onChange={(e) => updateUserProfile(agent.username, { notes: e.target.value })} placeholder="Optional notes..." />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          </Tabs>
          </CardContent>
          </Card>
  );
};

export default AdvancedAdminControls;
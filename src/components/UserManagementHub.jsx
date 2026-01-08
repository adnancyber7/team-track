import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, UserPlus, Trash2, Loader2, CheckCircle2, Edit2, Save, X, Sparkles, Shield } from 'lucide-react';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

export default function UserManagementHub({ onUpdate }) {
  const [agents, setAgents] = useState([]);
  const [csUsers, setCSUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bulkCreating, setBulkCreating] = useState(false);
  const [editDialog, setEditDialog] = useState({ open: false, user: null, type: null });
  const [editForm, setEditForm] = useState({ username: '', password: '' });

  // Real-time polling - optimized to prevent rate limits
  useEffect(() => {
    let mounted = true;

    const loadUsers = async () => {
      try {
        const [agentData, csData] = await Promise.all([
          base44.entities.AgentUser.list(),
          base44.entities.CSUser.list()
        ]);
        if (mounted) {
          setAgents(agentData || []);
          setCSUsers(csData || []);
        }
      } catch (e) {
        console.error('Failed to load users:', e);
      }
    };

    loadUsers();
    const interval = setInterval(loadUsers, 3000); // 3s to prevent rate limits

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Initialize default CS user on mount
  useEffect(() => {
    const initDefaultCS = async () => {
      try {
        const existing = await base44.entities.CSUser.filter({ username: 'cs01' });
        if (!existing || existing.length === 0) {
          await base44.functions.invoke('adminSettingsApi', {
            action: 'createCS',
            payload: { username: 'cs01', password: 'cs01' }
          });
        }
      } catch {}
    };
    initDefaultCS();
  }, []);

  const notifySync = async () => {
    try {
      const rows = await base44.entities.AppState.filter({ state_key: 'users_sync' });
      if (rows && rows[0]) {
        await base44.entities.AppState.update(rows[0].id, { data: { ts: Date.now() } });
      } else {
        await base44.entities.AppState.create({ state_key: 'users_sync', data: { ts: Date.now() } });
      }
    } catch {}
  };

  const createBulkAgents = async () => {
    if (!confirm('Create 30 default agent profiles with usernames agent01 to agent30?')) return;
    
    setBulkCreating(true);
    let created = 0;
    let failed = 0;

    try {
      for (let i = 1; i <= 30; i++) {
        const username = `agent${String(i).padStart(2, '0')}`;
        const password = `pass${String(i).padStart(2, '0')}`;
        
        try {
          const response = await base44.functions.invoke('adminSettingsApi', {
            action: 'createAgent',
            payload: { username, password }
          });
          
          if (!response.data.error) {
            created++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      // Reload users
      const agentData = await base44.entities.AgentUser.list();
      setAgents(agentData || []);
      await notifySync();
      
      toast.success(`✅ Created ${created} agents${failed > 0 ? `, ${failed} failed` : ''}`);
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error('Bulk creation failed: ' + e.message);
    } finally {
      setBulkCreating(false);
    }
  };

  const deleteUser = async (username, type) => {
    if (!confirm(`Delete ${type === 'agent' ? 'agent' : 'CS user'} "${username}"?`)) return;

    setLoading(true);
    try {
      const action = type === 'agent' ? 'deleteAgent' : 'deleteCS';
      const response = await base44.functions.invoke('adminSettingsApi', {
        action,
        payload: { username }
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      // Reload users
      const [agentData, csData] = await Promise.all([
        base44.entities.AgentUser.list(),
        base44.entities.CSUser.list()
      ]);
      setAgents(agentData || []);
      setCSUsers(csData || []);
      await notifySync();
      
      toast.success(`✅ ${type === 'agent' ? 'Agent' : 'CS user'} "${username}" deleted`);
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error('Delete failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user, type) => {
    setEditDialog({ open: true, user, type });
    setEditForm({ username: user.username, password: '' });
  };

  const saveEdit = async () => {
    if (!editForm.username.trim()) {
      toast.error('Username cannot be empty');
      return;
    }

    if (editForm.password && editForm.password.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    setLoading(true);
    try {
      const updateData = {};
      if (editForm.username !== editDialog.user.username) {
        updateData.username = editForm.username;
      }
      if (editForm.password.trim()) {
        updateData.password = editForm.password;
      }

      const entityName = editDialog.type === 'agent' ? 'AgentUser' : 'CSUser';
      await base44.entities[entityName].update(editDialog.user.id, updateData);

      // Reload users
      const [agentData, csData] = await Promise.all([
        base44.entities.AgentUser.list(),
        base44.entities.CSUser.list()
      ]);
      setAgents(agentData || []);
      setCSUsers(csData || []);
      await notifySync();
      
      toast.success(`✅ User updated globally`);
      setEditDialog({ open: false, user: null, type: null });
      if (onUpdate) onUpdate();
    } catch (e) {
      toast.error('Update failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 via-white to-amber-50 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-black bg-gradient-to-r from-yellow-600 to-amber-600 bg-clip-text text-transparent">
                User Management Hub
              </div>
              <div className="text-xs text-gray-500 font-normal">
                Global profile management • Real-time sync across all devices
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-yellow-100 text-yellow-800 font-bold">
              {agents.length} Agents
            </Badge>
            <Badge className="bg-amber-100 text-amber-800 font-bold">
              {csUsers.length} CS
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="agents" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-yellow-100">
            <TabsTrigger value="agents" className="font-bold data-[state=active]:bg-yellow-500 data-[state=active]:text-black">
              <Users className="w-4 h-4 mr-2" />
              Agents
            </TabsTrigger>
            <TabsTrigger value="cs" className="font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black">
              <Shield className="w-4 h-4 mr-2" />
              CS Team
            </TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4 mt-4">
            {/* Bulk Create */}
            {/* Bulk Create + Individual Create */}
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-2 border-yellow-200 bg-gradient-to-r from-yellow-50 to-amber-50">
                <CardContent className="p-4">
                  <Label className="font-bold text-yellow-900 flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-yellow-600" />
                    Quick: Create 30 Agents
                  </Label>
                  <p className="text-xs text-gray-600 mb-3">
                    Creates agent01-agent30 (pass01-pass30)
                  </p>
                  <Button
                    onClick={createBulkAgents}
                    disabled={bulkCreating}
                    className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-black shadow-lg">
                    {bulkCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Create 30 Agents
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                <CardContent className="p-4">
                  <Label className="font-bold text-amber-900 flex items-center gap-2 mb-3">
                    <UserPlus className="w-4 h-4 text-amber-600" />
                    Create Individual
                  </Label>
                  <p className="text-xs text-gray-600 mb-3">
                    Create single agent or CS user manually
                  </p>
                  <Button
                    onClick={async () => {
                      const username = prompt('Enter username:');
                      const password = prompt('Enter password (min 4 chars):');
                      const type = confirm('Agent (OK) or CS User (Cancel)') ? 'agent' : 'cs';
                      
                      if (!username || !password || password.length < 4) {
                        toast.error('Invalid username or password');
                        return;
                      }

                      try {
                        const action = type === 'agent' ? 'createAgent' : 'createCS';
                        const response = await base44.functions.invoke('adminSettingsApi', {
                          action,
                          payload: { username, password }
                        });

                        if (response.data.error) {
                          toast.error(response.data.error);
                          return;
                        }

                        const [agentData, csData] = await Promise.all([
                          base44.entities.AgentUser.list(),
                          base44.entities.CSUser.list()
                        ]);
                        setAgents(agentData || []);
                        setCSUsers(csData || []);
                        await notifySync();
                        toast.success(`✅ ${type === 'agent' ? 'Agent' : 'CS user'} created`);
                        if (onUpdate) onUpdate();
                      } catch (e) {
                        toast.error('Failed: ' + e.message);
                      }
                    }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-black shadow-lg">
                    <UserPlus className="w-4 h-4 mr-2" />
                    Create User
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Agents List */}
            <Card>
              <CardContent className="p-4">
                <Label className="font-bold text-lg mb-3 block flex items-center gap-2">
                  <Users className="w-5 h-5 text-yellow-600" />
                  Agent Profiles ({agents.length})
                </Label>
                <ScrollArea className="h-[400px] pr-4">
                  {agents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No agents yet. Create them using the button above.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {agents.map((agent) => (
                        <div
                          key={agent.id}
                          className="p-3 rounded-lg border-2 border-yellow-200 bg-gradient-to-br from-white to-yellow-50 hover:border-yellow-400 transition-all hover:shadow-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500 to-amber-500 flex items-center justify-center text-white font-bold text-sm">
                                {agent.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{agent.username}</div>
                                <Badge variant="outline" className="text-[10px] mt-1">
                                  {agent.is_active !== false ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {agent.full_name && (
                            <div className="text-xs text-gray-600 mb-1">📝 {agent.full_name}</div>
                          )}
                          {agent.email && (
                            <div className="text-xs text-gray-600 mb-1">✉️ {agent.email}</div>
                          )}
                          {agent.region && (
                            <Badge className="bg-blue-100 text-blue-800 text-[10px] mb-2">
                              {agent.region}
                            </Badge>
                          )}

                          <div className="flex gap-2 mt-2">
                            <Button
                              onClick={() => openEditDialog(agent, 'agent')}
                              size="sm"
                              variant="outline"
                              className="flex-1 font-bold text-yellow-700 hover:bg-yellow-50"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => deleteUser(agent.username, 'agent')}
                              size="sm"
                              variant="outline"
                              className="font-bold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CS Team Tab */}
          <TabsContent value="cs" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-4">
                <Label className="font-bold text-lg mb-3 block flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-600" />
                  CS Team Profiles ({csUsers.length})
                </Label>
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="font-bold">Default CS Profile: cs01 (password: cs01)</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    This permanent profile is always available. You can edit username/password below.
                  </p>
                </div>
                <ScrollArea className="h-[400px] pr-4">
                  {csUsers.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No CS users yet. Create them in the Agents tab.</p>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {csUsers.map((cs) => (
                        <div
                          key={cs.id}
                          className="p-3 rounded-lg border-2 border-amber-200 bg-gradient-to-br from-white to-amber-50 hover:border-amber-400 transition-all hover:shadow-lg"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                                {cs.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900">{cs.username}</div>
                                <Badge variant="outline" className="text-[10px] mt-1">
                                  {cs.is_active !== false ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          <div className="flex gap-2 mt-2">
                            <Button
                              onClick={() => openEditDialog(cs, 'cs')}
                              size="sm"
                              variant="outline"
                              className="flex-1 font-bold text-amber-700 hover:bg-amber-50"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button
                              onClick={() => deleteUser(cs.username, 'cs')}
                              size="sm"
                              variant="outline"
                              className="font-bold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Global Status */}
        <div className="mt-4 pt-4 border-t border-yellow-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>Real-time sync enabled • Changes visible across all computers instantly</span>
            </div>
            <div>Last sync: {new Date().toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Edit User Dialog */}
        <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ ...editDialog, open })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-purple-600" />
                Edit {editDialog.type === 'agent' ? 'Agent' : 'CS User'} Profile
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label className="text-sm font-bold mb-2 block">Username</Label>
                <Input
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              
              <div>
                <Label className="text-sm font-bold mb-2 block">New Password (optional)</Label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  placeholder="Leave empty to keep current"
                />
                <p className="text-xs text-gray-500 mt-1">Only fill to change password</p>
              </div>
            </div>

            <DialogFooter className="flex gap-2">
              <Button
                onClick={() => setEditDialog({ open: false, user: null, type: null })}
                variant="outline"
                className="flex-1 font-bold"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={saveEdit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-bold"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
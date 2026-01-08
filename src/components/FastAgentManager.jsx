import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Loader2, Users, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from "sonner";
import { base44 } from '@/api/base44Client';

export default function FastAgentManager({ onUpdate }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [operations, setOperations] = useState(new Set());

  // Fast polling for user_profiles changes from AppState
  useEffect(() => {
    let mounted = true;
    let lastSync = 0;

    const loadAgents = () => {
      const raw = localStorage.getItem('DHL_LOGIN_DEMO_V1');
      try {
        const state = JSON.parse(raw || '{}');
        if (mounted) setAgents(state.agents || []);
      } catch {
        if (mounted) setAgents([]);
      }
    };

    const checkSync = async () => {
      try {
        const rows = await base44.entities.AppState.filter({ state_key: 'user_profiles' });
        const rec = rows?.[0];
        const currentSync = rec?.data?.ts || 0;
        if (currentSync > lastSync) {
          lastSync = currentSync;
          // Pull from AppState to localStorage
          const state = JSON.parse(localStorage.getItem('DHL_LOGIN_DEMO_V1') || '{}');
          state.agents = rec.data.agents || [];
          state.csAllocators = rec.data.csAllocators || [];
          localStorage.setItem('DHL_LOGIN_DEMO_V1', JSON.stringify(state));
          loadAgents();
        }
      } catch {}
    };

    loadAgents();
    checkSync();
    const interval = setInterval(checkSync, 1000); // Poll every second

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const createAgent = async () => {
    if (!newUsername || !newPassword) {
      toast.error('Username and password required');
      return;
    }

    if (newPassword.length < 4) {
      toast.error('Password must be at least 4 characters');
      return;
    }

    const tempId = `temp_${Date.now()}`;
    setOperations(prev => new Set(prev).add(tempId));

    // Optimistic update
    const optimisticAgent = {
      id: tempId,
      username: newUsername,
      password: newPassword,
      is_active: true,
      _optimistic: true
    };
    setAgents(prev => [...prev, optimisticAgent]);
    setNewUsername('');
    setNewPassword('');

    try {
      // Direct localStorage creation
      const state = JSON.parse(localStorage.getItem('DHL_LOGIN_DEMO_V1') || '{}');
      if (!state.agents) state.agents = [];
      
      // Check duplicates
      if (state.agents.find(a => a.username.toLowerCase() === newUsername.toLowerCase())) {
        throw new Error('Agent already exists');
      }
      
      const newAgent = {
        id: `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        username: newUsername,
        password: newPassword,
        full_name: '',
        email: '',
        region: '',
        notes: '',
        is_active: true,
        created_date: new Date().toISOString()
      };
      
      state.agents.push(newAgent);
      localStorage.setItem('DHL_LOGIN_DEMO_V1', JSON.stringify(state));
      
      // Sync to AppState for cross-computer
      const rows = await base44.entities.AppState.filter({ state_key: 'user_profiles' });
      const syncData = {
        agents: state.agents,
        csAllocators: state.csAllocators || [],
        ts: Date.now()
      };
      
      if (rows && rows[0]) {
        await base44.entities.AppState.update(rows[0].id, { data: syncData });
      } else {
        await base44.entities.AppState.create({ state_key: 'user_profiles', data: syncData });
      }
      
      // Remove optimistic, reload from localStorage
      setAgents(prev => prev.filter(a => a.id !== tempId));
      setAgents(state.agents);
      
      toast.success(`Agent ${newUsername} created`);
      if (onUpdate) onUpdate();
    } catch (e) {
      // Revert optimistic update
      setAgents(prev => prev.filter(a => a.id !== tempId));
      toast.error(e.message || 'Failed to create agent');
    } finally {
      setOperations(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
    }
  };

  const deleteAgent = async (agent) => {
    if (!confirm(`Delete agent ${agent.username}?`)) return;

    const agentId = agent.id;
    setOperations(prev => new Set(prev).add(agentId));

    // Optimistic delete
    setAgents(prev => prev.filter(a => a.id !== agentId));

    try {
      // Direct localStorage deletion
      const state = JSON.parse(localStorage.getItem('DHL_LOGIN_DEMO_V1') || '{}');
      state.agents = (state.agents || []).filter(a => a.username !== agent.username);
      localStorage.setItem('DHL_LOGIN_DEMO_V1', JSON.stringify(state));
      
      // Sync to AppState for cross-computer
      const rows = await base44.entities.AppState.filter({ state_key: 'user_profiles' });
      const syncData = {
        agents: state.agents,
        csAllocators: state.csAllocators || [],
        ts: Date.now()
      };
      
      if (rows && rows[0]) {
        await base44.entities.AppState.update(rows[0].id, { data: syncData });
      } else {
        await base44.entities.AppState.create({ state_key: 'user_profiles', data: syncData });
      }
      
      setAgents(state.agents);
      toast.success(`Agent ${agent.username} deleted`);
      if (onUpdate) onUpdate();
    } catch (e) {
      // Revert optimistic delete - reload from localStorage
      const state = JSON.parse(localStorage.getItem('DHL_LOGIN_DEMO_V1') || '{}');
      setAgents(state.agents || []);
      toast.error(e.message || 'Failed to delete agent');
    } finally {
      setOperations(prev => {
        const next = new Set(prev);
        next.delete(agentId);
        return next;
      });
    }
  };

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Fast Agent Manager
          <Badge variant="outline" className="ml-auto">{agents.length} agents</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Create Form */}
        <div className="flex gap-2 p-3 bg-white rounded-lg border-2 border-dashed border-blue-300">
          <Input
            placeholder="Username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createAgent()}
            className="flex-1"
          />
          <Input
            type="password"
            placeholder="Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && createAgent()}
            className="flex-1"
          />
          <Button 
            onClick={createAgent}
            disabled={!newUsername || !newPassword}
            className="bg-blue-600 hover:bg-blue-700 font-bold"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </div>

        {/* Agent List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {agents.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              No agents yet. Create one above.
            </div>
          )}
          
          {agents.map((agent) => {
            const isProcessing = operations.has(agent.id);
            const isOptimistic = agent._optimistic;
            
            return (
              <div
                key={agent.id}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isOptimistic 
                    ? 'bg-blue-50 border-blue-300 animate-pulse' 
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isOptimistic ? (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  ) : agent.is_active !== false ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  
                  <div>
                    <div className="font-bold text-gray-900">{agent.username}</div>
                    {agent.email && (
                      <div className="text-xs text-gray-500">{agent.email}</div>
                    )}
                  </div>
                  
                  {agent.region && (
                    <Badge variant="outline" className="text-xs">
                      {agent.region}
                    </Badge>
                  )}
                </div>

                <Button
                  onClick={() => deleteAgent(agent)}
                  disabled={isProcessing || isOptimistic}
                  variant="destructive"
                  size="sm"
                  className="font-bold"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Real-time sync enabled • Changes visible across all computers instantly
        </div>
      </CardContent>
    </Card>
  );
}
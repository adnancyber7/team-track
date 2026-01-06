import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { MapContainer, TileLayer, Circle, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { base44 as adn7 } from '@/api/base44Client';
import { Users, Clock, Zap, CheckCircle2, AlertTriangle, Eye, Wifi, WifiOff, MapPin, Activity, Coffee } from 'lucide-react';

const RealtimeAdminDashboard = ({
  agents,
  csSheet,
  agentSheets,
  allAgentMetrics,
  getAgentStatus,
  setSelectedAgent,
  onTabChange,
}) => {
  const [fullAgents, setFullAgents] = useState([]);
  const [agentLocations, setAgentLocations] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  // Load full agent records (to get optional lat/lng set by admin)
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const list = await adn7.entities.AgentUser.list();
        if (!stop) setFullAgents(list || []);
      } catch {}
    };
    load();
    const id = setInterval(load, 10000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  // Extract locations from known fields: lat/lng | latitude/longitude | location.lat/lng
  useEffect(() => {
    const locs = (fullAgents || []).map((a) => {
      const lat = parseFloat(a.lat ?? a.latitude ?? a?.location?.lat);
      const lng = parseFloat(a.lng ?? a.longitude ?? a?.location?.lng);
      if (!isFinite(lat) || !isFinite(lng)) return null;
      const status = getAgentStatus ? getAgentStatus(a.username) : { label: 'Unknown' };
      return { username: a.username, lat, lng, status: status?.label };
    }).filter(Boolean);
    setAgentLocations(locs);
  }, [fullAgents, getAgentStatus]);

  // Live counts
  const statusCounts = useMemo(() => {
    let available = 0, busy = 0, onBreak = 0;
    (agents || []).forEach((a) => {
      const s = getAgentStatus(a.username);
      if (csSheet?.agentBreaks?.[a.username]?.active) { onBreak++; return; }
      if (s?.label === 'Busy') busy++; else if (s?.label === 'Available') available++; else if (s?.label === 'On Break') onBreak++; 
    });
    return { available, busy, onBreak };
  }, [agents, csSheet, getAgentStatus]);

  // Critical events stream
  const prevPriority = useRef(!!agentSheets?.priorityModeActive);
  const prevCounts = useRef({ done: 0, rej: 0 });
  const prevBreaks = useRef(JSON.stringify(csSheet?.agentBreaks || {}));

  const pushEvent = (ev) => {
    setRecentEvents((prev) => {
      const next = [{ ...ev, ts: new Date().toISOString() }, ...prev];
      return next.slice(0, 30);
    });
  };

  useEffect(() => {
    // Priority mode toggles
    const nowActive = !!agentSheets?.priorityModeActive;
    if (nowActive !== prevPriority.current) {
      pushEvent({ type: nowActive ? 'priority_on' : 'priority_off', message: nowActive ? 'Priority Mode ACTIVATED' : 'Priority Mode deactivated' });
      prevPriority.current = nowActive;
    }
  }, [agentSheets?.priorityModeActive]);

  useEffect(() => {
    // Rejection spikes
    let done = 0, rej = 0;
    for (let i = 0; i < (csSheet?.timers?.length || 0); i++) {
      const st = String(csSheet.timers[i]?.state || '').toUpperCase();
      if (st === 'DONE') done++; else if (st === 'REJECTED') rej++;
    }
    const prev = prevCounts.current;
    if (rej > prev.rej && (rej - prev.rej) >= 5) {
      const rate = done + rej > 0 ? Math.round((rej / (done + rej)) * 100) : 0;
      if (rate >= 30) pushEvent({ type: 'rejection_spike', message: `High rejection spike: ${rej - prev.rej} new rejections (rate ${rate}%)` });
    }
    prevCounts.current = { done, rej };
  }, [csSheet?.timers]);

  useEffect(() => {
    // Break start/end
    const prev = JSON.parse(prevBreaks.current || '{}');
    const cur = csSheet?.agentBreaks || {};
    const prevKeys = new Set(Object.keys(prev));
    const curKeys = new Set(Object.keys(cur));

    // Started or ended
    curKeys.forEach((k) => {
      const was = prev[k]?.active; const now = cur[k]?.active;
      if (now && !was) pushEvent({ type: 'break_start', message: `${k} started a break` });
      if (!now && was) pushEvent({ type: 'break_end', message: `${k} ended a break` });
    });
    prevKeys.forEach((k) => { if (!curKeys.has(k) && prev[k]?.active) pushEvent({ type: 'break_end', message: `${k} ended a break` }); });

    prevBreaks.current = JSON.stringify(cur);
  }, [csSheet?.agentBreaks]);

  const handleViewProfile = (agentName) => {
    setSelectedAgent(agentName);
    onTabChange('agents');
  };

  const priorityTasks = Object.entries(agentSheets.priorityAgentMap || {})
    .map(([priorityNum, agentName]) => {
      const status = agentSheets.priorityStatus?.[priorityNum] || 'pending';
      return { priorityNum, agentName, status };
    })
    .filter(task => task.status !== 'completed');

  const activeAgents = agents.filter(a => {
      const status = getAgentStatus(a.username);
      return status && status.label !== 'Offline';
  }).length;


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Agent Statuses Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Live Overview KPIs */}
        <Card className="border-2 border-indigo-200 bg-white shadow-lg">
          <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border bg-green-50 border-green-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-700 font-bold"><Activity className="w-4 h-4" /> Available</div>
              <div className="text-2xl font-black text-green-700">{statusCounts.available}</div>
            </div>
            <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 font-bold"><Clock className="w-4 h-4" /> Busy</div>
              <div className="text-2xl font-black text-blue-700">{statusCounts.busy}</div>
            </div>
            <div className="p-3 rounded-lg border bg-orange-50 border-orange-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-orange-700 font-bold"><Coffee className="w-4 h-4" /> On Break</div>
              <div className="text-2xl font-black text-orange-700">{statusCounts.onBreak}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-2 border-blue-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xl">
                <Users className="w-6 h-6 text-blue-600" />
                <span>Agent Live Status</span>
              </div>
              <Badge className="bg-blue-100 text-blue-800 font-bold">{activeAgents} / {agents.length} Active</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] -mx-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4">
                {agents.map((agent) => {
                  const status = getAgentStatus(agent.username);
                  const metrics = allAgentMetrics[agent.username.toLowerCase()] || { awb: 0, done: 0, rej: 0 };
                  const breakInfo = csSheet.agentBreaks?.[agent.username];
                  const breakDuration = breakInfo?.active && breakInfo.start ? Math.floor((Date.now() - breakInfo.start) / 60000) : 0;
                  
                  return (
                    <Card key={agent.username} className={`border-2 shadow-md transition-all hover:shadow-xl hover:-translate-y-1 ${status.label === 'Available' ? 'border-green-300' : status.label === 'Busy' ? 'border-blue-300' : 'border-orange-300'}`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-lg">{agent.username}</div>
                          <Badge className={`${status.classes} text-xs`}>{status.label}</Badge>
                        </div>
                        {status.label === 'On Break' && (
                           <div className="text-xs text-orange-700 font-semibold mt-1">
                             Break: {breakDuration} mins
                           </div>
                        )}
                        <div className="text-sm text-gray-600 mt-3 space-y-1 font-medium">
                          <div>Pending: <span className="font-bold float-right">{metrics.awb}</span></div>
                          <div>Done: <span className="font-bold float-right text-green-600">{metrics.done}</span></div>
                          <div>Rejected: <span className="font-bold float-right text-red-600">{metrics.rej}</span></div>
                        </div>
                         <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewProfile(agent.username)}
                            className="w-full mt-4 font-bold text-xs h-8 bg-gray-50 hover:bg-gray-100">
                            <Eye className="w-3 h-3 mr-2" /> View Profile
                          </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Priority Overview Column */}
      <div className="space-y-6">
        {/* Agent Map */}
        <Card className="border-2 border-green-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <MapPin className="w-6 h-6 text-green-600" />
              <span>Agent Map</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agentLocations.length > 0 ? (
              <div className="rounded overflow-hidden border">
                <MapContainer center={[25.2048, 55.2708]} zoom={10} style={{ height: 260, width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                  {agentLocations.map((loc) => (
                    <Circle key={loc.username} center={[loc.lat, loc.lng]} radius={200} pathOptions={{ color: loc.status === 'Busy' ? '#2563eb' : loc.status === 'On Break' ? '#d97706' : '#16a34a' }}>
                      <Popup>
                        <div className="text-sm">
                          <div className="font-bold">{loc.username}</div>
                          <div className="text-gray-600">{loc.status}</div>
                        </div>
                      </Popup>
                    </Circle>
                  ))}
                </MapContainer>
              </div>
            ) : (
              <div className="text-sm text-gray-600 p-3 rounded bg-gray-50 border">
                No locations configured. Add lat/lng to agents in Admin → User Data to enable the map.
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="border-2 border-red-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Zap className="w-6 h-6 text-red-600" />
              <span>Priority Overview</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-5xl font-black text-red-600">{priorityTasks.length}</div>
              <div className="text-sm text-gray-600 font-bold">Pending Priority AWBs</div>
            </div>
            <ScrollArea className="h-[350px] mt-4 -mx-2">
              <div className="space-y-2 px-2">
                {priorityTasks.length === 0 ? (
                   <div className="text-center pt-20">
                     <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
                     <p className="text-md font-semibold text-gray-700">All Priority Tasks Cleared!</p>
                   </div>
                ) : priorityTasks.map(task => (
                  <div key={task.priorityNum} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-200">
                    <div className="font-mono text-base font-bold text-red-800">{task.priorityNum}</div>
                    <Badge className="bg-yellow-400 text-black font-bold">{task.agentName || 'Unassigned'}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Critical Events */}
        <Card className="border-2 border-purple-200 bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <AlertTriangle className="w-6 h-6 text-purple-600" />
              <span>Critical Events</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[220px] -mx-2">
              <div className="space-y-2 px-2">
                {recentEvents.length === 0 ? (
                  <div className="text-sm text-gray-500 text-center py-8">No events yet</div>
                ) : recentEvents.map((ev, idx) => (
                  <div key={idx} className="p-2 rounded border bg-white flex items-center justify-between">
                    <div className="text-sm font-medium">{ev.message}</div>
                    <Badge variant="outline" className="text-xs">{new Date(ev.ts).toLocaleTimeString()}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RealtimeAdminDashboard;
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Users, Clock, Zap, CheckCircle2, AlertTriangle, Eye, Wifi, WifiOff } from 'lucide-react';

const RealtimeAdminDashboard = ({
  agents,
  csSheet,
  agentSheets,
  allAgentMetrics,
  getAgentStatus,
  setSelectedAgent,
  onTabChange,
}) => {

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
      </div>
    </div>
  );
};

export default RealtimeAdminDashboard;
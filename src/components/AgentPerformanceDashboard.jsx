import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Clock, XCircle, Activity, Award, AlertTriangle } from 'lucide-react';

const AgentPerformanceDashboard = ({ csSheet, agents, ROWS_COUNT, COL_AGENTS, COL_AWB, COL_LINE, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5 }) => {
  const [timeRange, setTimeRange] = useState('today');
  
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  
  const parseLineSum = (lineVal) => {
    const str = String(lineVal || "").trim();
    if (!str) return 0;
    const nums = str.split(/[+\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
  };
  
  const calculateMetrics = useMemo(() => {
    const metrics = {};
    const today = new Date().toDateString();
    const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    agents.forEach(agent => {
      metrics[agent.username] = {
        username: agent.username,
        totalCompleted: 0,
        todayCompleted: 0,
        weekCompleted: 0,
        totalRejected: 0,
        todayRejected: 0,
        weekRejected: 0,
        rejectionReasons: {},
        totalHandlingTime: 0,
        priorityHandlingTime: 0,
        normalHandlingTime: 0,
        priorityCount: 0,
        normalCount: 0,
        linesCompleted: 0,
        status: agent.is_active ? 'online' : 'offline'
      };
    });
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agentName = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim();
      if (!agentName || !metrics[agentName]) continue;
      
      const state = csSheet.timers[r]?.state?.toUpperCase() || '';
      const awb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
      const timerElapsed = csSheet.timers[r]?.elapsed || 0;
      const lineSum = parseLineSum(csSheet.raw[r]?.[COL_LINE]);
      
      const rowTimestamp = csSheet.timers[r]?.completedAt || Date.now();
      const rowDate = new Date(rowTimestamp);
      const isToday = rowDate.toDateString() === today;
      const isThisWeek = rowDate >= thisWeek;
      
      if (state === 'DONE' && awb) {
        metrics[agentName].totalCompleted++;
        if (isToday) metrics[agentName].todayCompleted++;
        if (isThisWeek) metrics[agentName].weekCompleted++;
        metrics[agentName].linesCompleted += lineSum;
        
        if (timerElapsed > 0) {
          metrics[agentName].totalHandlingTime += timerElapsed;
          metrics[agentName].normalHandlingTime += timerElapsed;
          metrics[agentName].normalCount++;
        }
      } else if (state === 'REJECTED' && awb) {
        metrics[agentName].totalRejected++;
        if (isToday) metrics[agentName].todayRejected++;
        if (isThisWeek) metrics[agentName].weekRejected++;
        
        const reasons = [
          csSheet.raw[r]?.[COL_REJ2],
          csSheet.raw[r]?.[COL_REJ3],
          csSheet.raw[r]?.[COL_REJ4],
          csSheet.raw[r]?.[COL_REJ5]
        ].filter(r => r && r.trim());
        
        reasons.forEach(reason => {
          const key = String(reason).trim();
          metrics[agentName].rejectionReasons[key] = (metrics[agentName].rejectionReasons[key] || 0) + 1;
        });
      }
    }
    
    Object.values(metrics).forEach(agent => {
      agent.avgHandlingTime = agent.normalCount > 0 
        ? Math.round(agent.normalHandlingTime / agent.normalCount / 1000) 
        : 0;
      agent.rejectionRate = agent.totalCompleted + agent.totalRejected > 0
        ? Math.round((agent.totalRejected / (agent.totalCompleted + agent.totalRejected)) * 100)
        : 0;
    });
    
    return metrics;
  }, [csSheet, agents, ROWS_COUNT, COL_AGENTS, COL_AWB, COL_LINE, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5]);
  
  const completionData = Object.values(calculateMetrics).map(agent => ({
    name: agent.username,
    Today: agent.todayCompleted,
    Week: agent.weekCompleted,
    Total: agent.totalCompleted
  }));
  
  const rejectionData = Object.values(calculateMetrics).map(agent => ({
    name: agent.username,
    rate: agent.rejectionRate,
    count: agent.totalRejected
  }));
  
  const handlingTimeData = Object.values(calculateMetrics).map(agent => ({
    name: agent.username,
    avgTime: agent.avgHandlingTime
  }));
  
  const topRejectionReasons = useMemo(() => {
    const allReasons = {};
    Object.values(calculateMetrics).forEach(agent => {
      Object.entries(agent.rejectionReasons).forEach(([reason, count]) => {
        allReasons[reason] = (allReasons[reason] || 0) + count;
      });
    });
    
    return Object.entries(allReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [calculateMetrics]);
  
  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };
  
  return (
    <Card className="w-full border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Activity className="w-6 h-6 text-blue-600" />
          Agent Performance Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="completion" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="completion">Completion</TabsTrigger>
            <TabsTrigger value="rejection">Rejections</TabsTrigger>
            <TabsTrigger value="timing">Handling Time</TabsTrigger>
            <TabsTrigger value="status">Agent Status</TabsTrigger>
          </TabsList>
          
          <TabsContent value="completion" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.values(calculateMetrics).map(agent => (
                <Card key={agent.username} className="border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-yellow-400 text-black font-bold">{agent.username}</Badge>
                      <Award className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Today:</span>
                        <span className="font-bold text-green-600">{agent.todayCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">This Week:</span>
                        <span className="font-bold text-blue-600">{agent.weekCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total:</span>
                        <span className="font-bold">{agent.totalCompleted}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1">
                        <span className="text-gray-600">Lines:</span>
                        <span className="font-bold text-purple-600">{agent.linesCompleted}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Completion Comparison
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={completionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Today" fill="#10b981" />
                    <Bar dataKey="Week" fill="#3b82f6" />
                    <Bar dataKey="Total" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="rejection" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Rejection Rates by Agent
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={rejectionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="rate" fill="#ef4444" name="Rejection %" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-bold mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    Top Rejection Reasons
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topRejectionReasons}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {topRejectionReasons.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {Object.values(calculateMetrics).map(agent => (
                  <Card key={agent.username} className="border-red-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-400 text-black font-bold">{agent.username}</Badge>
                          <span className="text-sm text-gray-600">
                            {agent.totalRejected} rejected ({agent.rejectionRate}%)
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {Object.keys(agent.rejectionReasons).length} unique reasons
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="timing" className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Average Handling Time per Agent
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={handlingTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Seconds', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="avgTime" stroke="#3b82f6" strokeWidth={2} name="Avg Time (s)" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(calculateMetrics).map(agent => (
                <Card key={agent.username} className="border-blue-200">
                  <CardContent className="p-4">
                    <Badge className="bg-yellow-400 text-black font-bold mb-3">{agent.username}</Badge>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Avg Time:</span>
                        <Badge className="bg-blue-100 text-blue-800">
                          {formatTime(agent.avgHandlingTime)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Processed:</span>
                        <span className="font-bold">{agent.normalCount} AWBs</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Time:</span>
                        <span className="font-bold text-purple-600">
                          {formatTime(Math.round(agent.totalHandlingTime / 1000))}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="status" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(calculateMetrics).map(agent => {
                const statusColor = agent.status === 'online' ? 'bg-green-500' : 'bg-gray-400';
                const statusText = agent.status === 'online' ? 'ONLINE' : 'OFFLINE';
                
                return (
                  <Card key={agent.username} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="bg-yellow-400 text-black font-bold">{agent.username}</Badge>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${statusColor} animate-pulse`} />
                          <Badge className={statusColor + " text-white"}>{statusText}</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="text-2xl font-bold text-green-600">{agent.todayCompleted}</div>
                          <div className="text-xs text-gray-600">Today</div>
                        </div>
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="text-2xl font-bold text-red-600">{agent.todayRejected}</div>
                          <div className="text-xs text-gray-600">Rejected</div>
                        </div>
                        <div className="text-center p-2 bg-blue-50 rounded">
                          <div className="text-2xl font-bold text-blue-600">{agent.avgHandlingTime}s</div>
                          <div className="text-xs text-gray-600">Avg Time</div>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded">
                          <div className="text-2xl font-bold text-purple-600">{agent.linesCompleted}</div>
                          <div className="text-xs text-gray-600">Lines</div>
                        </div>
                      </div>
                      
                      {agent.rejectionRate > 20 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          <AlertTriangle className="w-3 h-3" />
                          <span>High rejection rate: {agent.rejectionRate}%</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AgentPerformanceDashboard;
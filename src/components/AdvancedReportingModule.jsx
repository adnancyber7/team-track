import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Download, 
  FileSpreadsheet, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  BarChart3,
  Calendar
} from 'lucide-react';
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdvancedReportingModule = ({ csSheet, agents, ROWS_COUNT, COL_AGENTS, COL_AWB, COL_LINE, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5, COL_REGION, COL_REASON }) => {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [reportType, setReportType] = useState('summary');

  const parseLineSum = (lineVal) => {
    const str = String(lineVal || "").trim();
    if (!str) return 0;
    const nums = str.split(/[+\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
  };

  const getUniqueRegions = useMemo(() => {
    const regions = new Set();
    for (let r = 0; r < ROWS_COUNT; r++) {
      const region = String(csSheet.raw[r]?.[COL_REGION] || '').trim();
      if (region) regions.add(region);
    }
    return Array.from(regions).sort();
  }, [csSheet, ROWS_COUNT, COL_REGION]);

  const getFilteredData = useMemo(() => {
    const data = [];
    
    for (let r = 0; r < ROWS_COUNT; r++) {
      const agentName = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim();
      const awb = String(csSheet.raw[r]?.[COL_AWB] || '').trim();
      const state = csSheet.timers[r]?.state?.toUpperCase() || '';
      const region = String(csSheet.raw[r]?.[COL_REGION] || '').trim();
      
      if (!awb) continue;
      
      // Filter by agent
      if (selectedAgent !== 'all' && agentName.toLowerCase() !== selectedAgent.toLowerCase()) continue;
      
      // Filter by status
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'completed' && state !== 'DONE') continue;
        if (selectedStatus === 'rejected' && state !== 'REJECTED') continue;
        if (selectedStatus === 'pending' && (state === 'DONE' || state === 'REJECTED')) continue;
      }
      
      // Filter by region
      if (selectedRegion !== 'all' && region !== selectedRegion) continue;
      
      // Date filter (based on completion timestamp if available)
      const completedAt = csSheet.timers[r]?.completedAt;
      if (dateFrom || dateTo) {
        if (completedAt) {
          const date = new Date(completedAt);
          if (dateFrom && date < new Date(dateFrom)) continue;
          if (dateTo && date > new Date(dateTo + 'T23:59:59')) continue;
        } else if (state === 'DONE' || state === 'REJECTED') {
          // Skip if date filter is active but no timestamp
          continue;
        }
      }
      
      const lineSum = parseLineSum(csSheet.raw[r]?.[COL_LINE]);
      const elapsed = csSheet.timers[r]?.elapsed || 0;
      const reasons = [
        csSheet.raw[r]?.[COL_REJ2],
        csSheet.raw[r]?.[COL_REJ3],
        csSheet.raw[r]?.[COL_REJ4],
        csSheet.raw[r]?.[COL_REJ5]
      ].filter(Boolean);
      
      data.push({
        rowIndex: r,
        agent: agentName,
        awb,
        status: state || 'PENDING',
        region,
        reason: csSheet.raw[r]?.[COL_REASON] || '',
        rejectionReasons: reasons,
        lineSum,
        elapsed,
        doneClicks: csSheet.timers[r]?.doneClicks || 0,
        rejClicks: csSheet.timers[r]?.rejClicks || 0,
        completedAt: completedAt || null
      });
    }
    
    return data;
  }, [csSheet, selectedAgent, selectedStatus, selectedRegion, dateFrom, dateTo, ROWS_COUNT, COL_AGENTS, COL_AWB, COL_LINE, COL_REGION, COL_REASON, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5]);

  const generateSummaryReport = useMemo(() => {
    const agentStats = {};
    
    agents.forEach(agent => {
      agentStats[agent.username] = {
        username: agent.username,
        completed: 0,
        rejected: 0,
        pending: 0,
        totalLines: 0,
        completedLines: 0,
        rejectedLines: 0,
        avgHandlingTime: 0,
        totalTime: 0,
        count: 0,
        rejectionRate: 0,
        efficiency: 0
      };
    });
    
    getFilteredData.forEach(item => {
      const agent = agentStats[item.agent];
      if (!agent) return;
      
      if (item.status === 'DONE') {
        agent.completed++;
        agent.completedLines += item.lineSum;
        agent.totalTime += item.elapsed;
        agent.count++;
      } else if (item.status === 'REJECTED') {
        agent.rejected++;
        agent.rejectedLines += item.lineSum;
      } else {
        agent.pending++;
      }
      
      agent.totalLines += item.lineSum;
    });
    
    Object.values(agentStats).forEach(agent => {
      if (agent.count > 0) {
        agent.avgHandlingTime = Math.round(agent.totalTime / agent.count / 1000);
      }
      
      const total = agent.completed + agent.rejected;
      if (total > 0) {
        agent.rejectionRate = Math.round((agent.rejected / total) * 100);
        agent.efficiency = Math.round((agent.completed / total) * 100);
      }
    });
    
    return Object.values(agentStats).filter(a => a.completed + a.rejected + a.pending > 0);
  }, [getFilteredData, agents]);

  const identifyBottlenecks = useMemo(() => {
    const bottlenecks = [];
    
    // High rejection rate agents
    generateSummaryReport.forEach(agent => {
      if (agent.rejectionRate > 30 && agent.rejected > 5) {
        bottlenecks.push({
          type: 'high_rejection',
          severity: 'high',
          agent: agent.username,
          metric: `${agent.rejectionRate}% rejection rate`,
          details: `${agent.rejected} rejected out of ${agent.completed + agent.rejected} total`
        });
      }
    });
    
    // Slow processing agents
    generateSummaryReport.forEach(agent => {
      if (agent.avgHandlingTime > 0) {
        const avgTime = generateSummaryReport.reduce((sum, a) => sum + a.avgHandlingTime, 0) / generateSummaryReport.filter(a => a.avgHandlingTime > 0).length;
        if (agent.avgHandlingTime > avgTime * 1.5) {
          bottlenecks.push({
            type: 'slow_processing',
            severity: 'medium',
            agent: agent.username,
            metric: `${agent.avgHandlingTime}s avg time`,
            details: `${Math.round((agent.avgHandlingTime / avgTime - 1) * 100)}% slower than team average`
          });
        }
      }
    });
    
    // Agents with many pending items
    generateSummaryReport.forEach(agent => {
      if (agent.pending > 20) {
        bottlenecks.push({
          type: 'high_pending',
          severity: 'medium',
          agent: agent.username,
          metric: `${agent.pending} pending AWBs`,
          details: `Backlog may require attention`
        });
      }
    });
    
    // Top rejection reasons
    const reasonCounts = {};
    getFilteredData.forEach(item => {
      if (item.status === 'REJECTED' && item.rejectionReasons.length > 0) {
        item.rejectionReasons.forEach(reason => {
          const r = String(reason).trim();
          if (r) reasonCounts[r] = (reasonCounts[r] || 0) + 1;
        });
      }
    });
    
    const topReasons = Object.entries(reasonCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    topReasons.forEach(([reason, count]) => {
      if (count > 5) {
        bottlenecks.push({
          type: 'common_rejection',
          severity: 'low',
          agent: 'System-wide',
          metric: `"${reason}"`,
          details: `${count} occurrences - may indicate systematic issue`
        });
      }
    });
    
    return bottlenecks;
  }, [generateSummaryReport, getFilteredData]);

  const exportToExcel = (data, filename) => {
    const wb = XLSX.utils.book_new();
    
    if (reportType === 'summary') {
      // Summary Sheet
      const summaryData = [
        ['Agent', 'Completed', 'Rejected', 'Pending', 'Total Lines', 'Completed Lines', 'Avg Time (s)', 'Rejection Rate %', 'Efficiency %']
      ];
      generateSummaryReport.forEach(agent => {
        summaryData.push([
          agent.username,
          agent.completed,
          agent.rejected,
          agent.pending,
          agent.totalLines,
          agent.completedLines,
          agent.avgHandlingTime,
          agent.rejectionRate,
          agent.efficiency
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws, 'Summary');
      
      // Bottlenecks Sheet
      const bottleneckData = [
        ['Type', 'Severity', 'Agent', 'Metric', 'Details']
      ];
      identifyBottlenecks.forEach(b => {
        bottleneckData.push([
          b.type.replace(/_/g, ' ').toUpperCase(),
          b.severity.toUpperCase(),
          b.agent,
          b.metric,
          b.details
        ]);
      });
      const wsBottleneck = XLSX.utils.aoa_to_sheet(bottleneckData);
      XLSX.utils.book_append_sheet(wb, wsBottleneck, 'Bottlenecks');
    } else if (reportType === 'detailed') {
      // Detailed AWB Report
      const detailedData = [
        ['Agent', 'AWB', 'Status', 'Region', 'Reason', 'Rejection Reasons', 'Lines', 'Time (s)', 'Completed At']
      ];
      getFilteredData.forEach(item => {
        detailedData.push([
          item.agent,
          item.awb,
          item.status,
          item.region,
          item.reason,
          item.rejectionReasons.join(', '),
          item.lineSum,
          Math.round(item.elapsed / 1000),
          item.completedAt ? new Date(item.completedAt).toLocaleString() : 'N/A'
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(wb, ws, 'Detailed Report');
    }
    
    XLSX.writeFile(wb, filename);
    toast.success(`Report exported: ${filename}`);
  };

  const exportToCSV = (filename) => {
    let csvContent = '';
    
    if (reportType === 'summary') {
      csvContent = 'Agent,Completed,Rejected,Pending,Total Lines,Completed Lines,Avg Time (s),Rejection Rate %,Efficiency %\n';
      generateSummaryReport.forEach(agent => {
        csvContent += `${agent.username},${agent.completed},${agent.rejected},${agent.pending},${agent.totalLines},${agent.completedLines},${agent.avgHandlingTime},${agent.rejectionRate},${agent.efficiency}\n`;
      });
    } else if (reportType === 'detailed') {
      csvContent = 'Agent,AWB,Status,Region,Reason,Rejection Reasons,Lines,Time (s),Completed At\n';
      getFilteredData.forEach(item => {
        const escapeCsv = (val) => {
          const str = String(val || '');
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        };
        csvContent += `${escapeCsv(item.agent)},${escapeCsv(item.awb)},${escapeCsv(item.status)},${escapeCsv(item.region)},${escapeCsv(item.reason)},${escapeCsv(item.rejectionReasons.join('; '))},${item.lineSum},${Math.round(item.elapsed / 1000)},${item.completedAt ? new Date(item.completedAt).toLocaleString() : 'N/A'}\n`;
      });
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Report exported: ${filename}`);
  };

  const teamPerformanceData = useMemo(() => {
    return generateSummaryReport.map(agent => ({
      name: agent.username,
      completed: agent.completed,
      rejected: agent.rejected,
      efficiency: agent.efficiency
    }));
  }, [generateSummaryReport]);

  const handleExport = (format) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `DHL_Report_${reportType}_${timestamp}.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    if (format === 'excel') {
      exportToExcel(getFilteredData, filename);
    } else {
      exportToCSV(filename);
    }
  };

  return (
    <Card className="w-full border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="w-6 h-6 text-purple-600" />
          Advanced Reporting Module
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="filters" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="filters">Filters & Export</TabsTrigger>
            <TabsTrigger value="summary">Summary Report</TabsTrigger>
            <TabsTrigger value="bottlenecks">Bottleneck Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="filters" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Report Filters
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label className="text-xs text-gray-600">Date From</Label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Date To</Label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Report Type</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="summary">Summary Report</SelectItem>
                        <SelectItem value="detailed">Detailed AWB Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <Label className="text-xs text-gray-600">Agent</Label>
                    <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Agents</SelectItem>
                        {agents.map(agent => (
                          <SelectItem key={agent.username} value={agent.username}>
                            {agent.username}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Status</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">Region</Label>
                    <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Regions</SelectItem>
                        {getUniqueRegions.map(region => (
                          <SelectItem key={region} value={region}>
                            {region}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  <Button 
                    onClick={() => handleExport('excel')} 
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Export to Excel
                  </Button>
                  <Button 
                    onClick={() => handleExport('csv')} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export to CSV
                  </Button>
                  <Button 
                    onClick={() => {
                      setDateFrom('');
                      setDateTo('');
                      setSelectedAgent('all');
                      setSelectedStatus('all');
                      setSelectedRegion('all');
                      toast.success('Filters cleared');
                    }}
                    variant="outline"
                    className="font-bold"
                  >
                    Clear Filters
                  </Button>
                </div>

                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="text-sm font-bold text-purple-900 mb-1">Filtered Results:</div>
                  <div className="text-xs text-gray-600">
                    {getFilteredData.length} AWBs | 
                    {' '}{getFilteredData.filter(d => d.status === 'DONE').length} Completed | 
                    {' '}{getFilteredData.filter(d => d.status === 'REJECTED').length} Rejected | 
                    {' '}{getFilteredData.filter(d => d.status !== 'DONE' && d.status !== 'REJECTED').length} Pending
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Performance Chart */}
            <Card>
              <CardContent className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Team Performance Overview
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={teamPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#10b981" name="Completed" />
                    <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            <ScrollArea className="h-[600px]">
              <div className="space-y-3 pr-4">
                {generateSummaryReport.map(agent => (
                  <Card key={agent.username} className="border-2">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-yellow-400 text-black font-bold">{agent.username}</Badge>
                          <Badge className={`${agent.efficiency >= 80 ? 'bg-green-100 text-green-800' : agent.efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {agent.efficiency}% Efficiency
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          {agent.rejectionRate > 30 && (
                            <Badge className="bg-red-500 text-white animate-pulse">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              High Rejection
                            </Badge>
                          )}
                          {agent.avgHandlingTime > 120 && (
                            <Badge className="bg-orange-500 text-white">
                              <Clock className="w-3 h-3 mr-1" />
                              Slow Processing
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div className="text-center p-2 bg-green-50 rounded">
                          <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="font-bold">Completed</span>
                          </div>
                          <div className="text-2xl font-bold text-green-700">{agent.completed}</div>
                          <div className="text-xs text-gray-600">{agent.completedLines} lines</div>
                        </div>
                        
                        <div className="text-center p-2 bg-red-50 rounded">
                          <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                            <XCircle className="w-4 h-4" />
                            <span className="font-bold">Rejected</span>
                          </div>
                          <div className="text-2xl font-bold text-red-700">{agent.rejected}</div>
                          <div className="text-xs text-gray-600">{agent.rejectionRate}% rate</div>
                        </div>
                        
                        <div className="text-center p-2 bg-orange-50 rounded">
                          <div className="flex items-center justify-center gap-1 text-orange-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="font-bold">Pending</span>
                          </div>
                          <div className="text-2xl font-bold text-orange-700">{agent.pending}</div>
                          <div className="text-xs text-gray-600">{agent.avgHandlingTime}s avg</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="bottlenecks" className="space-y-4">
            <Card className="bg-orange-50 border-orange-300">
              <CardContent className="p-4">
                <h3 className="font-bold mb-3 flex items-center gap-2 text-orange-900">
                  <AlertTriangle className="w-5 h-5" />
                  Identified Bottlenecks & Issues ({identifyBottlenecks.length})
                </h3>
                
                {identifyBottlenecks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
                    <p className="font-bold text-green-700">No major bottlenecks detected!</p>
                    <p className="text-sm">Team performance is within acceptable ranges.</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3 pr-4">
                      {identifyBottlenecks.map((bottleneck, idx) => {
                        const severityColors = {
                          high: 'bg-red-100 border-red-400 text-red-900',
                          medium: 'bg-orange-100 border-orange-400 text-orange-900',
                          low: 'bg-yellow-100 border-yellow-400 text-yellow-900'
                        };
                        
                        const severityIcons = {
                          high: <AlertTriangle className="w-5 h-5 text-red-600" />,
                          medium: <TrendingDown className="w-5 h-5 text-orange-600" />,
                          low: <Clock className="w-5 h-5 text-yellow-600" />
                        };
                        
                        return (
                          <Card key={idx} className={`border-2 ${severityColors[bottleneck.severity]}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {severityIcons[bottleneck.severity]}
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className="bg-gray-800 text-white font-bold">
                                      {bottleneck.agent}
                                    </Badge>
                                    <Badge className={severityColors[bottleneck.severity]}>
                                      {bottleneck.severity.toUpperCase()}
                                    </Badge>
                                    <span className="text-xs font-bold text-gray-600">
                                      {bottleneck.type.replace(/_/g, ' ').toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="font-bold text-lg mb-1">{bottleneck.metric}</div>
                                  <div className="text-sm">{bottleneck.details}</div>
                                  
                                  {bottleneck.type === 'high_rejection' && (
                                    <div className="mt-2 p-2 bg-white rounded border text-xs">
                                      <span className="font-bold">Recommendation:</span> Review training materials, provide feedback sessions, investigate common rejection patterns.
                                    </div>
                                  )}
                                  {bottleneck.type === 'slow_processing' && (
                                    <div className="mt-2 p-2 bg-white rounded border text-xs">
                                      <span className="font-bold">Recommendation:</span> Check workload distribution, provide process optimization training, investigate technical issues.
                                    </div>
                                  )}
                                  {bottleneck.type === 'high_pending' && (
                                    <div className="mt-2 p-2 bg-white rounded border text-xs">
                                      <span className="font-bold">Recommendation:</span> Consider redistributing work, check for blockers, provide additional support.
                                    </div>
                                  )}
                                  {bottleneck.type === 'common_rejection' && (
                                    <div className="mt-2 p-2 bg-white rounded border text-xs">
                                      <span className="font-bold">Recommendation:</span> This may indicate a systematic issue requiring process review or additional training.
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdvancedReportingModule;
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, TrendingDown, AlertTriangle, Users, Target, Brain, Loader2, RefreshCw, CheckCircle2, XCircle, Lightbulb, TrendingUp } from 'lucide-react';
import { toast } from "sonner";
import { base44 as adn7 } from '@/api/base44Client';

export default function AIPerformanceInsights({ agents, csSheet, ROWS_COUNT, COL_AGENTS, COL_AWB, COL_LINE, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5 }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeInsightTab, setActiveInsightTab] = useState("summary");

  const parseLineSum = (lineVal) => {
    const str = String(lineVal || "").trim();
    if (!str) return 0;
    const nums = str.split(/[+\s]+/).map(s => parseFloat(s)).filter(n => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
  };

  const calculateAgentMetrics = () => {
    return agents.map(agent => {
      const metrics = {
        username: agent.username,
        totalCompleted: 0,
        todayCompleted: 0,
        weekCompleted: 0,
        totalRejected: 0,
        rejectionReasons: {},
        totalHandlingTime: 0,
        count: 0,
        avgHandlingTime: 0,
        rejectionRate: 0
      };

      const today = new Date().toDateString();
      const thisWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (let r = 0; r < ROWS_COUNT; r++) {
        const agentName = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim();
        if (agentName !== agent.username) continue;

        const state = csSheet.timers[r]?.state?.toUpperCase() || '';
        const timerElapsed = csSheet.timers[r]?.elapsed || 0;
        const rowTimestamp = csSheet.timers[r]?.completedAt || Date.now();
        const rowDate = new Date(rowTimestamp);
        const isToday = rowDate.toDateString() === today;
        const isThisWeek = rowDate >= thisWeek;

        if (state === 'DONE') {
          metrics.totalCompleted++;
          if (isToday) metrics.todayCompleted++;
          if (isThisWeek) metrics.weekCompleted++;
          if (timerElapsed > 0) {
            metrics.totalHandlingTime += timerElapsed;
            metrics.count++;
          }
        } else if (state === 'REJECTED') {
          metrics.totalRejected++;
          if (isToday) metrics.todayRejected = (metrics.todayRejected || 0) + 1;
          
          const reasons = [
            csSheet.raw[r]?.[COL_REJ2],
            csSheet.raw[r]?.[COL_REJ3],
            csSheet.raw[r]?.[COL_REJ4],
            csSheet.raw[r]?.[COL_REJ5]
          ].filter(r => r && r.trim());

          reasons.forEach(reason => {
            const key = String(reason).trim();
            metrics.rejectionReasons[key] = (metrics.rejectionReasons[key] || 0) + 1;
          });
        }
      }

      metrics.avgHandlingTime = metrics.count > 0 ? Math.round(metrics.totalHandlingTime / metrics.count / 1000) : 0;
      metrics.rejectionRate = metrics.totalCompleted + metrics.totalRejected > 0
        ? Math.round((metrics.totalRejected / (metrics.totalCompleted + metrics.totalRejected)) * 100)
        : 0;

      return metrics;
    });
  };

  const runAnalysis = async (type = 'full') => {
    setLoading(true);
    try {
      const agentMetrics = calculateAgentMetrics();
      const overallStats = {
        totalAgents: agents.length,
        totalCompleted: agentMetrics.reduce((sum, a) => sum + a.totalCompleted, 0),
        totalRejected: agentMetrics.reduce((sum, a) => sum + a.totalRejected, 0),
        avgRejectionRate: agentMetrics.length > 0 
          ? Math.round(agentMetrics.reduce((sum, a) => sum + a.rejectionRate, 0) / agentMetrics.length)
          : 0
      };

      const response = await adn7.functions.invoke('analyzePerformance', {
        agents: agentMetrics,
        csSheetData: { overallStats },
        analysisType: type
      });

      if (response.data.error) {
        toast.error(response.data.error);
        return;
      }

      setAnalysis(response.data.analysis);
      toast.success("AI analysis complete!");
    } catch (error) {
      toast.error(error.message || "Failed to analyze performance");
    } finally {
      setLoading(false);
    }
  };

  const severityColors = {
    low: 'bg-blue-100 text-blue-800 border-blue-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    critical: 'bg-red-100 text-red-800 border-red-300',
    urgent: 'bg-red-100 text-red-800 border-red-300'
  };

  const impactColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };

  return (
    <Card className="w-full border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl">
            <Brain className="w-6 h-6 text-indigo-600" />
            AI Performance Insights
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => runAnalysis('full')}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze Performance
                </>
              )}
            </Button>
            {analysis && (
              <Button
                onClick={() => runAnalysis('full')}
                variant="outline"
                size="sm"
                className="font-bold"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!analysis && !loading && (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 mx-auto mb-4 text-indigo-300" />
            <h3 className="text-lg font-bold text-gray-700 mb-2">AI-Powered Analytics Ready</h3>
            <p className="text-gray-500 mb-4">
              Click "Analyze Performance" to get intelligent insights about your team's performance
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto mt-6">
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <Target className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                <p className="text-xs font-bold text-purple-900">Rejection Analysis</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <TrendingDown className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                <p className="text-xs font-bold text-blue-900">Bottleneck Detection</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <Users className="w-5 h-5 mx-auto mb-1 text-green-600" />
                <p className="text-xs font-bold text-green-900">Assignment Tips</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-orange-600" />
                <p className="text-xs font-bold text-orange-900">Training Needs</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="text-center py-12">
            <div className="relative inline-block">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <Sparkles className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-600" />
            </div>
            <p className="mt-4 text-gray-600 font-medium">AI is analyzing performance data...</p>
            <p className="text-sm text-gray-500">This may take a few moments</p>
          </div>
        )}

        {analysis && !loading && (
          <Tabs value={activeInsightTab} onValueChange={setActiveInsightTab}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="rejections">Rejections</TabsTrigger>
              <TabsTrigger value="bottlenecks">Bottlenecks</TabsTrigger>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="space-y-4">
              <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-6 h-6 text-purple-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-purple-900 mb-2">Executive Summary</h3>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {analysis.summary}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {analysis.actionableInsights && analysis.actionableInsights.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Quick Action Items
                  </h3>
                  {analysis.actionableInsights.map((insight, idx) => (
                    <Card key={idx} className="border-l-4 border-indigo-500">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <Badge className={impactColors[insight.impact]}>
                            {insight.impact.toUpperCase()}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-bold text-sm text-gray-900">{insight.insight}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-semibold">Action:</span> {insight.action}
                            </p>
                            {insight.timeline && (
                              <p className="text-xs text-gray-500 mt-1">
                                <span className="font-semibold">Timeline:</span> {insight.timeline}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejections" className="space-y-4">
              {analysis.rejectionAnalysis?.topReasons && (
                <div className="space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    Top Rejection Reasons
                  </h3>
                  {analysis.rejectionAnalysis.topReasons.map((item, idx) => (
                    <Card key={idx} className="border-red-200 bg-red-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-red-600 text-white font-bold">
                                #{idx + 1}
                              </Badge>
                              <span className="font-bold text-gray-900">{item.reason}</span>
                              <Badge variant="outline" className="font-mono">
                                {item.count} occurrences
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-700 mb-2">
                              <span className="font-semibold">Affected agents:</span>{' '}
                              {item.affectedAgents.join(', ')}
                            </div>
                            <div className="p-2 bg-white rounded border border-red-200">
                              <p className="text-xs font-semibold text-red-800 mb-1">💡 Recommendation:</p>
                              <p className="text-xs text-gray-700">{item.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {analysis.rejectionAnalysis?.systemicIssues && analysis.rejectionAnalysis.systemicIssues.length > 0 && (
                <Card className="bg-orange-50 border-orange-300">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-orange-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Systemic Issues Detected
                    </h3>
                    <ul className="space-y-2">
                      {analysis.rejectionAnalysis.systemicIssues.map((issue, idx) => (
                        <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-orange-600 font-bold">•</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="bottlenecks" className="space-y-3">
              {analysis.bottlenecks && analysis.bottlenecks.length > 0 ? (
                analysis.bottlenecks.map((bottleneck, idx) => (
                  <Card key={idx} className={`border-2 ${severityColors[bottleneck.severity]}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${severityColors[bottleneck.severity]}`}>
                          <TrendingDown className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={severityColors[bottleneck.severity] + " font-bold"}>
                              {bottleneck.severity.toUpperCase()}
                            </Badge>
                            <span className="font-bold text-gray-900">{bottleneck.type}</span>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{bottleneck.description}</p>
                          {bottleneck.affectedAgents && bottleneck.affectedAgents.length > 0 && (
                            <div className="text-xs text-gray-600 mb-2">
                              <span className="font-semibold">Affected:</span> {bottleneck.affectedAgents.join(', ')}
                            </div>
                          )}
                          <div className="p-2 bg-white rounded border">
                            <p className="text-xs font-semibold text-gray-800 mb-1">🎯 Action Plan:</p>
                            <p className="text-xs text-gray-700">{bottleneck.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <p className="font-bold text-green-700">No major bottlenecks detected!</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="assignments" className="space-y-4">
              {analysis.assignmentOptimization?.workloadBalance && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      Workload Balance Analysis
                    </h3>
                    <p className="text-sm text-gray-700">{analysis.assignmentOptimization.workloadBalance}</p>
                  </CardContent>
                </Card>
              )}

              {analysis.assignmentOptimization?.suggestions && (
                <div className="space-y-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    Optimization Suggestions
                  </h3>
                  {analysis.assignmentOptimization.suggestions.map((suggestion, idx) => (
                    <Card key={idx} className="border-indigo-200">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Badge className="bg-yellow-400 text-black font-bold">
                            {suggestion.agent}
                          </Badge>
                          <div className="flex-1">
                            <p className="font-bold text-sm text-gray-900 mb-1">
                              {suggestion.recommendation}
                            </p>
                            <p className="text-xs text-gray-600">{suggestion.rationale}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="training" className="space-y-3">
              {analysis.trainingNeeds && analysis.trainingNeeds.length > 0 ? (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3 pr-4">
                    {analysis.trainingNeeds.map((need, idx) => (
                      <Card key={idx} className={`border-2 ${severityColors[need.priority]}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg ${severityColors[need.priority]}`}>
                              <Users className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="bg-yellow-400 text-black font-bold">
                                  {need.agent}
                                </Badge>
                                <Badge className={severityColors[need.priority] + " font-bold"}>
                                  {need.priority.toUpperCase()} PRIORITY
                                </Badge>
                              </div>
                              
                              {need.metrics && (
                                <div className="text-xs text-gray-600 mb-2 p-2 bg-white/50 rounded border">
                                  <span className="font-semibold">Performance Metrics:</span> {need.metrics}
                                </div>
                              )}

                              {need.issues && need.issues.length > 0 && (
                                <div className="mb-3">
                                  <p className="text-xs font-semibold text-gray-800 mb-1">⚠️ Identified Issues:</p>
                                  <ul className="space-y-1">
                                    {need.issues.map((issue, i) => (
                                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                        <span className="text-red-500">•</span>
                                        {issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {need.recommendations && need.recommendations.length > 0 && (
                                <div className="p-2 bg-white rounded border">
                                  <p className="text-xs font-semibold text-gray-800 mb-1">📚 Training Recommendations:</p>
                                  <ul className="space-y-1">
                                    {need.recommendations.map((rec, i) => (
                                      <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                        <span className="text-green-600">✓</span>
                                        {rec}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-600" />
                  <p className="font-bold text-green-700">All agents performing well!</p>
                  <p className="text-sm">No critical training needs identified</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {analysis && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              Analysis generated at {new Date(analysis.analyzedAt || Date.now()).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
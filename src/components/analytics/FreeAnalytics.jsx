import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb, XCircle, Users, TrendingUp, AlertTriangle, BarChart2 } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

// Free built-in analytics (no external AI) - Optimized single-pass computation
export default function FreeAnalytics({
  agents,
  csSheet,
  ROWS_COUNT,
  COL_AGENTS,
  COL_AWB,
  COL_LINE,
  COL_REJ2,
  COL_REJ3,
  COL_REJ4,
  COL_REJ5,
  COL_REGION
}) {
  // Helpers (mirror existing logic in page)
  const parseLineSum = (lineVal) => {
    const str = String(lineVal || "").trim();
    if (!str) return 0;
    const nums = str.split(/[+\s]+/).map((s) => parseFloat(s)).filter((n) => !isNaN(n));
    return nums.reduce((a, b) => a + b, 0);
  };

  const analytics = useMemo(() => {
    const agentMap = {};
    (agents || []).forEach((a) => {
      const key = (a.username || "").toLowerCase();
      agentMap[key] = {
        username: a.username,
        total: 0,
        done: 0,
        rejected: 0,
        pending: 0,
        pendingLines: 0,
        rejectionReasons: {}
      };
    });

    const reasonCounts = {}; // reason -> { count, agents: Set }

    for (let r = 0; r < ROWS_COUNT; r++) {
      const row = csSheet.raw[r] || [];
      const t = csSheet.timers[r] || {};
      const agentName = String(row[COL_AGENTS] || "").trim();
      const key = agentName.toLowerCase();
      const state = String(t.state || "").toUpperCase();
      const hasAwb = !!String(row[COL_AWB] || "").trim();

      if (!agentName && !hasAwb) continue; // skip empty rows

      if (!agentMap[key]) {
        agentMap[key] = {
          username: agentName || "Unassigned",
          total: 0,
          done: 0,
          rejected: 0,
          pending: 0,
          pendingLines: 0,
          rejectionReasons: {}
        };
      }

      agentMap[key].total += 1;

      if (state === "DONE") {
        agentMap[key].done += 1;
      } else if (state === "REJECTED" || String(row[COL_REJ2] || row[COL_REJ3] || row[COL_REJ4] || row[COL_REJ5] || "").trim()) {
        // Consider as rejected if timer says REJECTED or any rejection fields filled
        agentMap[key].rejected += 1;
        const reasons = [row[COL_REJ2], row[COL_REJ3], row[COL_REJ4], row[COL_REJ5]].map((v) => String(v || "").trim()).filter(Boolean);
        reasons.forEach((reason) => {
          agentMap[key].rejectionReasons[reason] = (agentMap[key].rejectionReasons[reason] || 0) + 1;
          if (!reasonCounts[reason]) reasonCounts[reason] = { count: 0, agents: new Set() };
          reasonCounts[reason].count += 1;
          if (agentName) reasonCounts[reason].agents.add(agentName);
        });
      } else if (hasAwb) {
        agentMap[key].pending += 1;
        agentMap[key].pendingLines += parseLineSum(row[COL_LINE]);
      }
    }

    // Build arrays
    const perAgent = Object.values(agentMap).map((a) => {
      const totalConsidered = a.done + a.rejected;
      const rejectionRate = totalConsidered > 0 ? Math.round((a.rejected / totalConsidered) * 100) : 0;
      return { ...a, rejectionRate };
    });

    const rejectionsByAgent = perAgent
      .filter((a) => a.username)
      .sort((a, b) => b.rejected - a.rejected)
      .slice(0, 15);

    const topReasons = Object.entries(reasonCounts)
      .map(([reason, data]) => ({ reason, count: data.count, affectedAgents: Array.from(data.agents).sort() }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const totals = perAgent.reduce((acc, a) => {
      acc.rejected += a.rejected;
      acc.done += a.done;
      acc.pending += a.pending;
      return acc;
    }, { rejected: 0, done: 0, pending: 0 });

    const avgRejectionRate = perAgent.length > 0
      ? Math.round(perAgent.reduce((s, a) => s + a.rejectionRate, 0) / perAgent.length)
      : 0;

    // Suggestions (simple heuristics)
    const suggestions = [];
    // High rejection agents
    perAgent
      .filter((a) => a.rejectionRate >= 25 && a.rejected >= 5)
      .slice(0, 5)
      .forEach((a) => suggestions.push({
        type: "training",
        text: `${a.username}: rejection rate ${a.rejectionRate}% with ${a.rejected} rejected – prioritize QA review and targeted coaching.`,
      }));

    // Workload balancing: top pending vs low pending
    const pendingSorted = [...perAgent].sort((a, b) => b.pending - a.pending);
    if (pendingSorted.length >= 2 && pendingSorted[0].pending - pendingSorted[1].pending >= 10) {
      const fromA = pendingSorted[0];
      const toB = pendingSorted[pendingSorted.length - 1];
      if (fromA && toB && fromA.username !== toB.username) {
        suggestions.push({
          type: "workload",
          text: `Shift part of backlog from ${fromA.username} (${fromA.pending} pending) to ${toB.username} (${toB.pending} pending) to balance workload.`,
        });
      }
    }

    // Common systemic reasons
    topReasons
      .filter((r) => r.count >= 8)
      .forEach((r) => suggestions.push({
        type: "process",
        text: `Reason "${r.reason}" appears ${r.count} times – consider updating SOPs or providing quick-reference guidance.`,
      }));

    return {
      perAgent,
      rejectionsByAgent,
      topReasons,
      totals,
      avgRejectionRate,
      suggestions,
    };
  }, [agents, csSheet, ROWS_COUNT, COL_AGENTS, COL_AWB, COL_LINE, COL_REJ2, COL_REJ3, COL_REJ4, COL_REJ5]);

  return (
    <Card className="w-full border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl">
            <BarChart2 className="w-6 h-6 text-indigo-600" />
            Free AI-Powered Analytics (Rejection Focus)
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 text-red-700 font-bold">
              <XCircle className="w-4 h-4" /> Total Rejected
            </div>
            <div className="text-2xl font-black text-red-700">{analytics.totals.rejected}</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 text-green-700 font-bold">
              <TrendingUp className="w-4 h-4" /> Avg Rejection Rate
            </div>
            <div className="text-2xl font-black text-green-700">{analytics.avgRejectionRate}%</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 text-blue-700 font-bold">
              <Users className="w-4 h-4" /> Pending Items
            </div>
            <div className="text-2xl font-black text-blue-700">{analytics.totals.pending}</div>
          </div>
        </div>

        {/* Rejections by Agent */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-600" /> Rejections by Agent
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.rejectionsByAgent.map((a) => ({ name: a.username, rejected: a.rejected }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="rejected" fill="#ef4444" name="Rejected" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Rejection Reasons */}
        {analytics.topReasons.length > 0 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" /> Top Rejection Reasons
              </h3>
              <div className="space-y-2">
                {analytics.topReasons.map((item, idx) => (
                  <div key={idx} className="p-3 rounded border bg-white flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-red-600 text-white font-bold">#{idx + 1}</Badge>
                        <span className="font-bold text-gray-900">{item.reason}</span>
                        <Badge variant="outline" className="font-mono">{item.count}</Badge>
                      </div>
                      {item.affectedAgents.length > 0 && (
                        <div className="text-xs text-gray-600">
                          Affected: {item.affectedAgents.join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Suggestions */}
        {analytics.suggestions.length > 0 && (
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-indigo-600" /> Optimization Suggestions
              </h3>
              <ScrollArea className="h-[220px] pr-4">
                <div className="space-y-2">
                  {analytics.suggestions.map((s, i) => (
                    <div key={i} className="p-3 rounded border bg-white text-sm">
                      {s.text}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Zap, Play, Settings } from "lucide-react";

export default function AutoAssignControls({ rules, onChange, onRun, running, lastResult }) {
  const update = (patch) => onChange({ ...rules, ...patch });
  const updateWeight = (key, val) => update({ weights: { ...rules.weights, [key]: Math.max(0, Number(val) || 0) } });

  return (
    <Card className="bg-white/95 border-black/10 shadow-lg">
      <CardHeader className="pb-2 flex items-center justify-between">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          <Zap className="w-5 h-5" /> Automated Assignment
          {rules.enabled && <Badge className="bg-green-600 text-white">Enabled</Badge>}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Switch checked={rules.enabled} onCheckedChange={(v) => update({ enabled: v })} />
          <span className="text-sm">Enable</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs text-black/60">Max Pending per Agent</Label>
            <Input value={rules.maxPendingPerAgent} onChange={(e) => update({ maxPendingPerAgent: Math.max(1, Number(e.target.value) || 1) })} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs text-black/60">Region Strict Mode</Label>
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={rules.regionStrict} onCheckedChange={(v) => update({ regionStrict: v })} />
              <span className="text-xs text-black/60">Assign only to matching region</span>
            </div>
          </div>
          <div>
            <Label className="text-xs text-black/60">Avoid High Rejection (>{rules.maxRejectionRate}%)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={rules.avoidHighRejection} onCheckedChange={(v) => update({ avoidHighRejection: v })} />
              <Input value={rules.maxRejectionRate} onChange={(e) => update({ maxRejectionRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} className="w-20" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-black/60">Prefer Low Avg Time</Label>
            <div className="flex items-center gap-2 mt-1">
              <Switch checked={rules.preferLowAvgTime} onCheckedChange={(v) => update({ preferLowAvgTime: v })} />
            </div>
          </div>
        </div>

        <div className="p-3 rounded-lg border bg-gray-50">
          <div className="flex items-center gap-2 mb-2 font-semibold text-sm"><Settings className="w-4 h-4" /> Weights</div>
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs text-black/60">Availability</Label>
              <Input value={rules.weights.availability} onChange={(e) => updateWeight('availability', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-black/60">Workload (lower better)</Label>
              <Input value={rules.weights.workload} onChange={(e) => updateWeight('workload', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-black/60">Region Match</Label>
              <Input value={rules.weights.region} onChange={(e) => updateWeight('region', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs text-black/60">Performance</Label>
              <Input value={rules.weights.performance} onChange={(e) => updateWeight('performance', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onRun} disabled={running || !rules.enabled} className="font-bold">
            <Play className="w-4 h-4 mr-2" />{running ? 'Assigning...' : 'Run Auto Assign'}
          </Button>
          {lastResult && (
            <div className="text-sm text-black/60">
              Assigned <b>{lastResult.assigned}</b> tasks to <b>{lastResult.touchedAgents}</b> agents
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
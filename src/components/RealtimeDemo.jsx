import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRealtimeTable, useRealtimeQuery } from '@/lib/RealtimeContext';
import { Activity, Users, FileText, Clock, Wifi } from 'lucide-react';
import RealtimeIndicator from './RealtimeIndicator';

export default function RealtimeDemo() {
  const [lastUpdate, setLastUpdate] = useState(null);
  const [updateCount, setUpdateCount] = useState(0);

  const agents = useRealtimeTable('AgentUser');
  const csUsers = useRealtimeTable('CSUser');
  const auditLogs = useRealtimeTable('AuditLog');
  const sheetRows = useRealtimeTable('SheetRow');

  const adminConfig = useRealtimeQuery('AdminConfig', (data) =>
    data.find(cfg => cfg.config_key === 'main')
  );

  useEffect(() => {
    setLastUpdate(new Date());
    setUpdateCount(prev => prev + 1);
  }, [agents, csUsers, auditLogs, sheetRows, adminConfig]);

  const stats = [
    {
      label: 'Agents',
      value: agents.length,
      active: agents.filter(a => a.is_active).length,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      label: 'CS Users',
      value: csUsers.length,
      active: csUsers.filter(u => u.is_active).length,
      icon: Users,
      color: 'text-green-600'
    },
    {
      label: 'Sheet Rows',
      value: sheetRows.length,
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      label: 'Audit Logs',
      value: auditLogs.length,
      icon: Activity,
      color: 'text-orange-600'
    }
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Real-Time Dashboard
            </CardTitle>
            <CardDescription>
              All data updates instantly across all users without page refresh
            </CardDescription>
          </div>
          <RealtimeIndicator />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="p-4 border rounded-lg bg-gradient-to-br from-white to-gray-50 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                  <Badge variant="secondary" className="text-xs">
                    {stat.value}
                  </Badge>
                </div>
                <div className="text-sm font-medium text-gray-600">
                  {stat.label}
                </div>
                {stat.active !== undefined && (
                  <div className="text-xs text-green-600 mt-1">
                    {stat.active} active
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {adminConfig && (
          <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={adminConfig.maintenance_mode ? 'destructive' : 'default'}
                className="text-xs"
              >
                {adminConfig.maintenance_mode ? 'Maintenance Mode' : 'Operational'}
              </Badge>
            </div>
            {adminConfig.banner_message && (
              <p className="text-sm text-gray-700">{adminConfig.banner_message}</p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Last Update:</span>
            <span className="text-sm font-medium">
              {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {updateCount} updates received
          </Badge>
        </div>

        <div className="text-xs text-gray-500 text-center">
          <p>
            Try making changes in another browser tab or device - they'll appear here instantly!
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

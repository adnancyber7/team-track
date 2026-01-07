import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useRealtime } from '@/lib/RealtimeContext';

export default function RealtimeIndicator({ className = '' }) {
  const { connectionStatus } = useRealtime();

  const statusConfig = {
    connected: {
      icon: Wifi,
      label: 'Live',
      className: 'bg-green-100 text-green-800 border-green-300',
      pulse: true
    },
    connecting: {
      icon: RefreshCw,
      label: 'Connecting',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      spin: true
    },
    disconnected: {
      icon: WifiOff,
      label: 'Offline',
      className: 'bg-red-100 text-red-800 border-red-300',
      pulse: false
    }
  };

  const config = statusConfig[connectionStatus] || statusConfig.disconnected;
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${className} flex items-center gap-1.5 px-2 py-1`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${config.spin ? 'animate-spin' : ''}`}
      />
      <span className="text-xs font-medium">{config.label}</span>
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </span>
      )}
    </Badge>
  );
}

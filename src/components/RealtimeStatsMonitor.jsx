import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Real-time statistics monitor - tracks all agent actions globally
export default function RealtimeStatsMonitor({ onUpdate }) {
  const [stats, setStats] = useState({});

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        // Fetch cs_sheet state for real-time counters
        const rows = await base44.entities.AppState.filter({ state_key: 'cs_sheet' });
        const csSheet = rows?.[0]?.data || { raw: [], timers: [] };
        
        // Compute stats from sheet data
        const agentStats = {};
        const COL_AGENTS = 5;
        const COL_AWB = 6;
        
        for (let r = 0; r < (csSheet.raw?.length || 0); r++) {
          const agentName = String(csSheet.raw[r]?.[COL_AGENTS] || '').trim();
          if (!agentName) continue;
          
          if (!agentStats[agentName]) {
            agentStats[agentName] = { done: 0, rejected: 0, pending: 0, started: 0 };
          }
          
          const state = csSheet.timers[r]?.state?.toUpperCase() || '';
          const hasTimer = csSheet.timers[r]?.start || csSheet.timers[r]?.elapsed;
          
          if (state === 'DONE') agentStats[agentName].done++;
          else if (state === 'REJECTED') agentStats[agentName].rejected++;
          else if (csSheet.raw[r]?.[COL_AWB]?.trim()) agentStats[agentName].pending++;
          
          if (hasTimer && state !== 'DONE' && state !== 'REJECTED') {
            agentStats[agentName].started++;
          }
        }
        
        if (mounted) {
          setStats(agentStats);
          if (onUpdate) onUpdate(agentStats);
        }
      } catch (e) {
        console.error('Stats fetch failed:', e);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Poll every 3s to prevent rate limits

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [onUpdate]);

  return null; // This is a headless component
}
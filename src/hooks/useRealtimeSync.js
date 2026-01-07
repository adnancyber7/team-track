import { useEffect, useCallback, useRef } from 'react';
import { useRealtime } from '@/lib/RealtimeContext';

export function useRealtimeAppState(stateKey, onUpdate) {
  const { data, subscribe } = useRealtime();
  const lastUpdateRef = useRef(0);

  useEffect(() => {
    const appStateRecords = data.AppState || [];
    const record = appStateRecords.find(r => r.state_key === stateKey);

    if (record) {
      const updateTime = new Date(record.updated_date || record.created_at).getTime();

      if (updateTime > lastUpdateRef.current) {
        lastUpdateRef.current = updateTime;
        if (onUpdate) {
          onUpdate(record.data);
        }
      }
    }
  }, [data.AppState, stateKey, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe('AppState', ({ eventType, record }) => {
      if (record.state_key === stateKey && (eventType === 'UPDATE' || eventType === 'INSERT')) {
        const updateTime = new Date(record.updated_date || record.created_at).getTime();

        if (updateTime > lastUpdateRef.current) {
          lastUpdateRef.current = updateTime;
          if (onUpdate) {
            onUpdate(record.data);
          }
        }
      }
    });

    return unsubscribe;
  }, [stateKey, onUpdate, subscribe]);
}

export function useRealtimeAdminConfig(onUpdate) {
  const { data, subscribe } = useRealtime();

  useEffect(() => {
    const configs = data.AdminConfig || [];
    const mainConfig = configs.find(cfg => cfg.config_key === 'main');

    if (mainConfig && onUpdate) {
      onUpdate(mainConfig);
    }
  }, [data.AdminConfig, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe('AdminConfig', ({ eventType, record }) => {
      if (record.config_key === 'main' && (eventType === 'UPDATE' || eventType === 'INSERT')) {
        if (onUpdate) {
          onUpdate(record);
        }
      }
    });

    return unsubscribe;
  }, [onUpdate, subscribe]);
}

export function useRealtimeAgents(onUpdate) {
  const { data, subscribe } = useRealtime();

  useEffect(() => {
    const agents = data.AgentUser || [];
    if (onUpdate) {
      onUpdate(agents);
    }
  }, [data.AgentUser, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe('AgentUser', ({ eventType, record }) => {
      if (onUpdate) {
        const agents = data.AgentUser || [];
        onUpdate(agents);
      }
    });

    return unsubscribe;
  }, [data.AgentUser, onUpdate, subscribe]);
}

export function useRealtimeCSUsers(onUpdate) {
  const { data, subscribe } = useRealtime();

  useEffect(() => {
    const csUsers = data.CSUser || [];
    if (onUpdate) {
      onUpdate(csUsers);
    }
  }, [data.CSUser, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe('CSUser', ({ eventType }) => {
      if (onUpdate) {
        const csUsers = data.CSUser || [];
        onUpdate(csUsers);
      }
    });

    return unsubscribe;
  }, [data.CSUser, onUpdate, subscribe]);
}

export function useRealtimeSheetRows(onUpdate) {
  const { data, subscribe } = useRealtime();

  useEffect(() => {
    const rows = data.SheetRow || [];
    if (onUpdate) {
      onUpdate(rows);
    }
  }, [data.SheetRow, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe('SheetRow', ({ eventType, record }) => {
      if (onUpdate) {
        const rows = data.SheetRow || [];
        onUpdate(rows);
      }
    });

    return unsubscribe;
  }, [data.SheetRow, onUpdate, subscribe]);
}

export function useRealtimeAgentBreaks(onUpdate) {
  const { data, subscribe } = useRealtime();

  useEffect(() => {
    const breaks = data.AgentBreak || [];
    if (onUpdate) {
      onUpdate(breaks);
    }
  }, [data.AgentBreak, onUpdate]);

  useEffect(() => {
    const unsubscribe = subscribe('AgentBreak', ({ eventType, record }) => {
      if (onUpdate) {
        const breaks = data.AgentBreak || [];
        onUpdate(breaks);
      }
    });

    return unsubscribe;
  }, [data.AgentBreak, onUpdate, subscribe]);
}

export function useRealtimeAuditLog(onUpdate, limit = 100) {
  const { data, subscribe } = useRealtime();

  useEffect(() => {
    let logs = data.AuditLog || [];
    logs = logs.slice(-limit);

    if (onUpdate) {
      onUpdate(logs);
    }
  }, [data.AuditLog, onUpdate, limit]);

  useEffect(() => {
    const unsubscribe = subscribe('AuditLog', ({ eventType, record }) => {
      if (eventType === 'INSERT' && onUpdate) {
        let logs = data.AuditLog || [];
        logs = logs.slice(-limit);
        onUpdate(logs);
      }
    });

    return unsubscribe;
  }, [data.AuditLog, onUpdate, subscribe, limit]);
}

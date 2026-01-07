import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/api/supabaseClient';

const RealtimeContext = createContext();

export function RealtimeProvider({ children }) {
  const [realtimeData, setRealtimeData] = useState({
    AdminConfig: [],
    AgentUser: [],
    CSUser: [],
    AppState: [],
    SheetData: [],
    SheetRow: [],
    AgentBreak: [],
    PriorityConfig: [],
    AuditLog: []
  });

  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const channelsRef = useRef({});
  const subscribersRef = useRef({});

  const updateTableData = useCallback((table, updateFn) => {
    setRealtimeData(prev => ({
      ...prev,
      [table]: updateFn(prev[table])
    }));
  }, []);

  const handleInsert = useCallback((table, newRecord) => {
    updateTableData(table, (data) => [...data, newRecord]);
    notifySubscribers(table, 'INSERT', newRecord);
  }, [updateTableData]);

  const handleUpdate = useCallback((table, updatedRecord) => {
    updateTableData(table, (data) =>
      data.map(item => item.id === updatedRecord.id ? updatedRecord : item)
    );
    notifySubscribers(table, 'UPDATE', updatedRecord);
  }, [updateTableData]);

  const handleDelete = useCallback((table, deletedRecord) => {
    updateTableData(table, (data) =>
      data.filter(item => item.id !== deletedRecord.id)
    );
    notifySubscribers(table, 'DELETE', deletedRecord);
  }, [updateTableData]);

  const notifySubscribers = useCallback((table, eventType, record) => {
    const tableSubscribers = subscribersRef.current[table] || [];
    tableSubscribers.forEach(callback => {
      callback({ eventType, record, table });
    });
  }, []);

  const fetchInitialData = useCallback(async (table) => {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) throw error;
      updateTableData(table, () => data || []);
    } catch (error) {
      console.error(`[Realtime] Failed to fetch initial ${table} data:`, error);
    }
  }, [updateTableData]);

  const subscribeToTable = useCallback((table) => {
    if (channelsRef.current[table]) return;

    const channel = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`[Realtime] ${table} INSERT:`, payload.new);
          handleInsert(table, payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`[Realtime] ${table} UPDATE:`, payload.new);
          handleUpdate(table, payload.new);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: table
        },
        (payload) => {
          console.log(`[Realtime] ${table} DELETE:`, payload.old);
          handleDelete(table, payload.old);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] ${table} subscription status:`, status);
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        }
      });

    channelsRef.current[table] = channel;
    fetchInitialData(table);
  }, [handleInsert, handleUpdate, handleDelete, fetchInitialData]);

  useEffect(() => {
    const tables = [
      'AdminConfig',
      'AgentUser',
      'CSUser',
      'AppState',
      'SheetData',
      'SheetRow',
      'AgentBreak',
      'PriorityConfig',
      'AuditLog'
    ];

    tables.forEach(table => subscribeToTable(table));

    return () => {
      Object.values(channelsRef.current).forEach(channel => {
        supabase.removeChannel(channel);
      });
      channelsRef.current = {};
    };
  }, [subscribeToTable]);

  const subscribe = useCallback((table, callback) => {
    if (!subscribersRef.current[table]) {
      subscribersRef.current[table] = [];
    }
    subscribersRef.current[table].push(callback);

    return () => {
      subscribersRef.current[table] = subscribersRef.current[table].filter(
        cb => cb !== callback
      );
    };
  }, []);

  const getTableData = useCallback((table) => {
    return realtimeData[table] || [];
  }, [realtimeData]);

  const refreshTable = useCallback(async (table) => {
    await fetchInitialData(table);
  }, [fetchInitialData]);

  const value = {
    data: realtimeData,
    connectionStatus,
    subscribe,
    getTableData,
    refreshTable
  };

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}

export function useRealtimeTable(tableName, filter = null) {
  const { data, subscribe } = useRealtime();
  const [tableData, setTableData] = useState([]);

  useEffect(() => {
    let filtered = data[tableName] || [];
    if (filter) {
      filtered = filtered.filter(filter);
    }
    setTableData(filtered);
  }, [data, tableName, filter]);

  useEffect(() => {
    const unsubscribe = subscribe(tableName, ({ eventType, record }) => {
      console.log(`[useRealtimeTable] ${tableName} ${eventType}:`, record);
    });
    return unsubscribe;
  }, [tableName, subscribe]);

  return tableData;
}

export function useRealtimeQuery(tableName, queryFn) {
  const { data } = useRealtime();
  const [result, setResult] = useState(null);

  useEffect(() => {
    const tableData = data[tableName] || [];
    const queryResult = queryFn ? queryFn(tableData) : tableData;
    setResult(queryResult);
  }, [data, tableName, queryFn]);

  return result;
}

export function useRealtimeRecord(tableName, id) {
  const { data } = useRealtime();
  const [record, setRecord] = useState(null);

  useEffect(() => {
    const tableData = data[tableName] || [];
    const found = tableData.find(item => item.id === id);
    setRecord(found || null);
  }, [data, tableName, id]);

  return record;
}

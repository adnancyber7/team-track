import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// WebSocket client for real-time multi-device sync
export function useRealtimeSync(onMessage, dependencies = []) {
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState(null);

  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/realtimeSync`;
  };

  const connect = () => {
    try {
      const ws = new WebSocket(getWebSocketUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Realtime] WebSocket connected');
        setIsConnected(true);
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
          reconnectTimerRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'connected') {
            setClientId(message.clientId);
            console.log(`[Realtime] Assigned client ID: ${message.clientId}`);
            return;
          }

          if (message.type === 'ack') {
            console.log(`[Realtime] Broadcast confirmed: ${message.originalType} → ${message.broadcastCount} clients`);
            return;
          }

          // Pass message to handler
          if (onMessage) {
            onMessage(message);
          }
        } catch (e) {
          console.error('[Realtime] Failed to parse message:', e);
        }
      };

      ws.onclose = () => {
        console.log('[Realtime] WebSocket closed. Reconnecting...');
        setIsConnected(false);
        setClientId(null);
        wsRef.current = null;
        
        // Reconnect after 2 seconds
        reconnectTimerRef.current = setTimeout(() => {
          connect();
        }, 2000);
      };

      ws.onerror = (error) => {
        console.error('[Realtime] WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (e) {
      console.error('[Realtime] Failed to connect:', e);
      // Retry connection
      reconnectTimerRef.current = setTimeout(() => {
        connect();
      }, 3000);
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, dependencies);

  const broadcast = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    console.warn('[Realtime] Cannot broadcast - WebSocket not connected');
    return false;
  };

  return { broadcast, isConnected, clientId };
}
import { useEffect, useRef, useState, useCallback } from 'react';
import { ScanEvent, DeviceStatus } from '../types';

interface UseWebSocketOptions {
  url?: string;
  onNewScan?: (scan: ScanEvent) => void;
  onDeviceHeartbeat?: (status: DeviceStatus) => void;
}

export function useWebSocket({
  url = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws/live',
  onNewScan,
  onDeviceHeartbeat,
}: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const pingIntervalRef = useRef<any>(null);

  const connect = useCallback(() => {
    try {
      if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        return;
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setReconnectAttempts(0);
        console.log('[WebSocket] Connected to Live Server:', url);

        // Periodic keep-alive ping every 25s
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.event === 'NEW_SCAN' && payload.data) {
            onNewScan?.(payload.data);
          } else if (payload.event === 'DEVICE_HEARTBEAT' && payload.data) {
            onDeviceHeartbeat?.(payload.data);
          }
        } catch (err) {
          // Non-JSON or pong message
        }
      };

      ws.onerror = (err) => {
        console.warn('[WebSocket] Error encountered:', err);
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        console.log('[WebSocket] Connection closed. Scheduling reconnect...');

        // Exponential backoff reconnect: min(1000 * 2^attempts, 10000)
        setReconnectAttempts((prev) => {
          const nextAttempts = prev + 1;
          const delay = Math.min(1000 * Math.pow(1.5, nextAttempts), 10000);
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
          return nextAttempts;
        });
      };
    } catch (e) {
      console.error('[WebSocket] Setup exception:', e);
    }
  }, [url, onNewScan, onDeviceHeartbeat]);

  useEffect(() => {
    connect();

    return () => {
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, reconnectAttempts };
}

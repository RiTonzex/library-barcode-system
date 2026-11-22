import React from 'react';
import { Server, Cpu } from 'lucide-react';
import { DeviceStatus } from '../types';

interface Props {
  wsConnected: boolean;
  reconnectAttempts: number;
  deviceStatus: DeviceStatus | null;
}

export const DeviceStatusBadge: React.FC<Props> = React.memo(({
  wsConnected,
  reconnectAttempts,
  deviceStatus,
}) => {
  const isEspOnline = deviceStatus?.is_online ?? false;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
      {/* WebSocket Status */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors backdrop-blur-sm ${
          wsConnected
            ? 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30'
            : 'bg-amber-500/20 text-amber-100 border-amber-400/30'
        }`}
      >
        <Server className="w-3.5 h-3.5 text-white/90" />
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
          }`}
        />
        <span>{wsConnected ? 'เซิร์ฟเวอร์: เชื่อมต่อสด' : `กำลังต่อใหม่ (${reconnectAttempts})...`}</span>
      </div>

      {/* ESP32 Status */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors backdrop-blur-sm ${
          isEspOnline
            ? 'bg-white/15 text-white border-white/25'
            : 'bg-white/10 text-blue-100/80 border-white/15'
        }`}
      >
        <Cpu className="w-3.5 h-3.5 text-white/90" />
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isEspOnline ? 'bg-emerald-400 animate-pulse' : 'bg-blue-300/50'
          }`}
        />
        <span>
          {isEspOnline
            ? `เครื่องสแกน ESP32 (${deviceStatus?.rssi ? `${deviceStatus.rssi} dBm` : 'ออนไลน์'})`
            : 'เครื่องสแกน: ออฟไลน์'}
        </span>
      </div>
    </div>
  );
});

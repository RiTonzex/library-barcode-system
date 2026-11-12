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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
          wsConnected
            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
        }`}
      >
        <Server className="w-3.5 h-3.5" />
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            wsConnected ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />
        <span>{wsConnected ? 'เซิร์ฟเวอร์: เชื่อมต่อสด' : `กำลังต่อใหม่ (${reconnectAttempts})...`}</span>
      </div>

      {/* ESP32 Status */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-colors ${
          isEspOnline
            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700'
        }`}
      >
        <Cpu className="w-3.5 h-3.5" />
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            isEspOnline ? 'bg-indigo-500' : 'bg-slate-400'
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

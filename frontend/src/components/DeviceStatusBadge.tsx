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
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 border border-slate-200/90 text-xs sm:text-sm font-semibold select-none shadow-2xs">
      {/* สถานะระบบเชื่อมต่อเซิร์ฟเวอร์ */}
      <div
        className="flex items-center gap-1.5"
        title={wsConnected ? 'ระบบเซิร์ฟเวอร์ออนไลน์และเชื่อมต่อสมบูรณ์' : 'กำลังพยายามเชื่อมต่อเซิร์ฟเวอร์'}
      >
        <Server className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span
          className={`w-2 h-2 rounded-full ${
            wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`}
        />
        <span className={wsConnected ? 'text-emerald-800' : 'text-amber-800'}>
          {wsConnected ? 'ระบบพร้อม' : `เชื่อมต่อ (${reconnectAttempts})`}
        </span>
      </div>

      <span className="text-slate-300 font-light mx-0.5">|</span>

      {/* สถานะเครื่องอ่านบาร์โค้ด */}
      <div
        className="flex items-center gap-1.5"
        title={isEspOnline ? 'เครื่องอ่านบาร์โค้ดฮาร์ดแวร์พร้อมใช้งาน' : 'เครื่องสแกนบาร์โค้ดออฟไลน์ (สามารถใช้โหมดพิมพ์ได้)'}
      >
        <Cpu className="w-3.5 h-3.5 text-slate-500 shrink-0" />
        <span
          className={`w-2 h-2 rounded-full ${
            isEspOnline ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
          }`}
        />
        <span className={isEspOnline ? 'text-blue-900' : 'text-slate-600'}>
          {isEspOnline ? 'เครื่องสแกนพร้อม' : 'สแกนเนอร์ออฟไลน์'}
        </span>
      </div>
    </div>
  );
});

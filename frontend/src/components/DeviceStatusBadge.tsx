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
    <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
      {/* สถานะระบบเชื่อมต่อ */}
      <div
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-colors ${
          wsConnected
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}
        title={wsConnected ? 'ระบบเชื่อมต่ออินเทอร์เน็ตสมบูรณ์' : 'กำลังพยายามเชื่อมต่อใหม่'}
      >
        <Server className="w-4 h-4 shrink-0 text-emerald-600" />
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
          }`}
        />
        <span className="font-semibold text-xs sm:text-sm">
          {wsConnected ? 'ระบบออนไลน์' : `กำลังเชื่อมต่อ (${reconnectAttempts})...`}
        </span>
      </div>

      {/* สถานะเครื่องอ่านบาร์โค้ด */}
      <div
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border transition-colors ${
          isEspOnline
            ? 'bg-blue-50 text-blue-900 border-blue-200'
            : 'bg-slate-100 text-slate-700 border-slate-200'
        }`}
        title={isEspOnline ? 'เครื่องอ่านบาร์โค้ดฮาร์ดแวร์พร้อมใช้งาน' : 'เครื่องอ่านบาร์โค้ดไม่ได้เชื่อมต่อ'}
      >
        <Cpu className="w-4 h-4 shrink-0 text-slate-500" />
        <span
          className={`inline-block w-2.5 h-2.5 rounded-full ${
            isEspOnline ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
          }`}
        />
        <span className="font-semibold text-xs sm:text-sm">
          {isEspOnline ? 'เครื่องสแกนพร้อม' : 'เครื่องสแกน: ออฟไลน์'}
        </span>
      </div>
    </div>
  );
});

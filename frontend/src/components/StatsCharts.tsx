import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity, GraduationCap, Building2 } from 'lucide-react';
import { HourlyStat, FacultyStat, YearLevelStat } from '../types';

interface Props {
  hourlyData: HourlyStat[];
  facultyData: FacultyStat[];
  yearData?: YearLevelStat[];
  peakHour?: string;
}

const YEAR_COLORS: Record<string, string> = {
  'ปี 1': 'bg-blue-500',
  'ปี 2': 'bg-emerald-500',
  'ปี 3': 'bg-amber-500',
  'ปี 4': 'bg-purple-500',
  'ปี 4+': 'bg-pink-500',
};

export const StatsCharts: React.FC<Props> = React.memo(({
  hourlyData,
  facultyData,
  yearData = [],
  peakHour = 'N/A',
}) => {
  // Calculate total counts for progress percentage
  const totalYearVisits = useMemo(() => {
    return yearData.reduce((acc, curr) => acc + curr.count, 0) || 1;
  }, [yearData]);

  const totalFacultyVisits = useMemo(() => {
    return facultyData.reduce((acc, curr) => acc + curr.count, 0) || 1;
  }, [facultyData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Left 8 Cols: Hourly Traffic Density (Area Chart) */}
      <div className="lg:col-span-8 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              <span>กราฟจำนวนคนเข้าใช้ตามช่วงเวลา (08:00 - 16:00 น.)</span>
            </h3>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              แสดงสถิติจำนวนคนเข้าใช้ห้องสมุดในแต่ละชั่วโมงตลอดทั้งวัน
            </p>
          </div>
          {peakHour && peakHour !== 'N/A' && (
            <span className="self-start sm:self-auto text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 whitespace-nowrap">
              คนเข้าเยอะสุดช่วง: {peakHour} น.
            </span>
          )}
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="softAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="#94a3b8"
                tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderColor: '#cbd5e1',
                  borderRadius: '1rem',
                  fontSize: '14px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)',
                  color: '#0f172a',
                  fontWeight: '600',
                }}
                labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                itemStyle={{ color: '#2563eb' }}
              />
              <Area
                type="monotone"
                dataKey="count"
                name="จำนวนคน (ครั้ง)"
                stroke="#2563eb"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#softAreaGradient)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Right 4 Cols: Year Level & Faculty Proportions */}
      <div className="lg:col-span-4 rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between space-y-6">
        {/* Year Level Progress Breakdown */}
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-blue-600" />
              สัดส่วนตามชั้นปี
            </h4>
            <span className="text-2xs font-semibold text-slate-400">คำนวณอัตโนมัติ</span>
          </div>

          {yearData.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">ยังไม่มีข้อมูลการสแกน</p>
          ) : (
            <div className="space-y-2.5">
              {yearData.map((item) => {
                const percent = Math.round((item.count / totalYearVisits) * 100);
                const colorClass = YEAR_COLORS[item.year] || 'bg-indigo-500';
                return (
                  <div key={item.year}>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>{item.year}</span>
                      <span className="text-slate-500 font-mono">
                        {item.count} ครั้ง ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorClass} transition-all duration-500`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Faculty Breakdown */}
        <div className="border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between mb-3.5">
            <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>สัดส่วนตามคณะ (ยอดนิยม)</span>
            </h4>
          </div>

          {facultyData.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีข้อมูลคณะ</p>
          ) : (
            <div className="space-y-2.5">
              {facultyData.slice(0, 4).map((fac) => {
                const percent = Math.round((fac.count / totalFacultyVisits) * 100);
                return (
                  <div key={fac.name}>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1 gap-2">
                      <span className="truncate flex-1 min-w-0" title={fac.name}>
                        {fac.name}
                      </span>
                      <span className="text-slate-500 font-mono whitespace-nowrap">
                        {fac.count} ครั้ง ({percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-slate-800 transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

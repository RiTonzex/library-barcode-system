import React from 'react';
import {
  Users,
  Sparkles,
  GraduationCap,
  Clock,
  BarChart3,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { StatsCharts } from './StatsCharts';
import { RecentLogsTable } from './RecentLogsTable';
import { DashboardStats, AccessLogItem } from '../types';

interface Props {
  stats: DashboardStats;
  recentLogs: AccessLogItem[];
  isRefreshing: boolean;
  onRefreshAll: () => Promise<void>;
  apiBaseUrl: string;
  onBackToCheckin: () => void;
}

export const DashboardView: React.FC<Props> = ({
  stats,
  recentLogs,
  isRefreshing,
  onRefreshAll,
  apiBaseUrl,
  onBackToCheckin,
}) => {
  const topFaculty = React.useMemo(() => {
    if (!stats.faculty_distribution || stats.faculty_distribution.length === 0) return null;
    return [...stats.faculty_distribution].sort((a, b) => b.count - a.count)[0];
  }, [stats.faculty_distribution]);

  const topYear = React.useMemo(() => {
    if (!stats.year_distribution || stats.year_distribution.length === 0) return null;
    return [...stats.year_distribution].sort((a, b) => b.count - a.count)[0];
  }, [stats.year_distribution]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8 animate-fadeIn">
      {/* 1. Page Header & Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/90">
        <div className="flex items-center gap-3.5">
          <button
            onClick={onBackToCheckin}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-2xs transition-all active:scale-95 group"
            title="กลับสู่หน้าจุดบันทึกการเข้าใช้ห้องสมุด"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base">กลับหน้าสแกนบัตร</span>
          </button>

          <div className="h-6 w-px bg-slate-200 hidden sm:block" />

          <div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-medium">
              <span>ห้องสมุด</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-600 font-semibold">สรุปสถิติและประวัติ</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-0.5">
              รายงานสถิติและประวัติการเข้าใช้งาน
            </h2>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={onRefreshAll}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-50"
            title="รีเฟรชข้อมูลสถิติและประวัติล่าสุด"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>รีเฟรชข้อมูล</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Modern Soft Color Metric Cards (Real Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. ยอดเข้าใช้วันนี้ */}
        <div className="rounded-3xl border border-blue-200/80 bg-blue-50/60 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-blue-900">
              ยอดเข้าใช้วันนี้
            </span>
            <div className="p-3 rounded-2xl bg-blue-600 text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                {stats.today_total_scans}
              </span>
              <span className="text-lg text-slate-700 font-bold">ครั้ง</span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-1.5">
              จำนวนการสแกนเข้าห้องสมุดทั้งหมดวันนี้
            </p>
          </div>
        </div>

        {/* 2. นักศึกษาไม่ซ้ำคน */}
        <div className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-amber-900">
              นักศึกษาไม่ซ้ำคน
            </span>
            <div className="p-3 rounded-2xl bg-amber-500 text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-5">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl sm:text-5xl font-black text-slate-900 font-mono tracking-tight">
                {stats.today_unique_students}
              </span>
              <span className="text-lg text-slate-700 font-bold">คน</span>
            </div>
            <p className="text-sm text-slate-600 font-medium mt-1.5">
              จำนวนผู้เข้าใช้จริงตามรหัสบัตรนักศึกษา
            </p>
          </div>
        </div>

        {/* 3. ชั้นปีเข้ามากที่สุด */}
        <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/60 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-indigo-900">
              ชั้นปีเข้ามากที่สุด
            </span>
            <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-xs">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-5">
            {topYear ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-indigo-950 font-mono">
                    {topYear.year}
                  </span>
                  <span className="text-base text-indigo-700 font-bold">อันดับ 1</span>
                </div>
                <div className="mt-2">
                  <span className="inline-flex items-center text-sm font-bold text-indigo-900 bg-indigo-100/90 px-3 py-1 rounded-xl">
                    {topYear.count} ครั้ง ({stats.today_total_scans > 0 ? Math.round((topYear.count / stats.today_total_scans) * 100) : 0}%)
                  </span>
                </div>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-400 block">ยังไม่มีข้อมูล</span>
                <p className="text-sm text-slate-500 mt-1">รอการบันทึกเข้าใช้ในวันนี้</p>
              </>
            )}
          </div>
        </div>

        {/* 4. ช่วงเวลาที่มีผู้เข้าใช้มากที่สุด */}
        <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/60 p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-base font-bold text-emerald-900">
              ช่วงเวลาที่มีผู้เข้าใช้มากที่สุด
            </span>
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-xs">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-5">
            {stats.peak_hour && stats.peak_hour !== 'N/A' && stats.peak_hour !== '-' ? (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-950 font-mono">
                    {stats.peak_hour}
                  </span>
                </div>
                <p className="text-sm text-emerald-800 font-semibold mt-1.5">
                  {topFaculty ? `คณะหลัก: ${topFaculty.name}` : 'ช่วงเวลาที่มีความหนาแน่นสูงสุด'}
                </p>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-400 block">08:00 - 16:00 น.</span>
                <p className="text-sm text-slate-500 mt-1">เวลาเปิดให้บริการห้องสมุด</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Interactive Charts (กราฟรายชั่วโมง & สัดส่วนคณะ) */}
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-100 text-blue-700">
            <BarChart3 className="w-5 h-5" />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
            กราฟวิเคราะห์แนวโน้มผู้เข้าใช้บริการ
          </h3>
        </div>

        <StatsCharts
          hourlyData={stats.hourly_distribution}
          facultyData={stats.faculty_distribution}
          yearData={stats.year_distribution || []}
          peakHour={stats.peak_hour}
        />
      </section>

      {/* 4. Full Attendance Logs Table (ตารางประวัติการเข้าใช้งานล่าสุด) */}
      <section className="space-y-4">
        <RecentLogsTable
          logs={recentLogs}
          apiBaseUrl={apiBaseUrl}
          onRefresh={onRefreshAll}
        />
      </section>
    </div>
  );
};

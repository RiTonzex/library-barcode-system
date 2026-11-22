import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Sparkles,
  Sheet,
  BookOpen,
  Building2,
  GraduationCap,
  Maximize,
  Minimize,
  BarChart3,
  X,
  RefreshCw,
} from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { LiveCheckinTerminal } from './components/LiveCheckinTerminal';
import { RecentLogsTable } from './components/RecentLogsTable';
import { StatsCharts } from './components/StatsCharts';
import { DeviceStatusBadge } from './components/DeviceStatusBadge';
import { ScanEvent, DeviceStatus, DashboardStats, AccessLogItem } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEVICE_API_KEY = import.meta.env.VITE_DEVICE_API_KEY || 'lib_esp32_secret_key_prod_998877';

export const App: React.FC = () => {
  const [latestScan, setLatestScan] = useState<ScanEvent | null>(null);
  const [recentLogs, setRecentLogs] = useState<AccessLogItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    today_total_scans: 0,
    today_granted_scans: 0,
    today_denied_scans: 0,
    today_unique_students: 0,
    peak_hour: 'N/A',
    top_year_level: '-',
    top_faculty: '-',
    hourly_distribution: [],
    faculty_distribution: [],
    year_distribution: [],
    last_updated: new Date().toISOString(),
  });
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus | null>(null);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Detect Fullscreen (F11 or HTML5 requestFullscreen)
  useEffect(() => {
    const checkFullscreen = () => {
      const isHtml5Fs = Boolean(document.fullscreenElement);
      const isMediaFs = window.matchMedia('(display-mode: fullscreen)').matches;
      const isScreenFs = Math.abs(window.innerHeight - window.screen.height) <= 4;
      setIsFullscreen(isHtml5Fs || isMediaFs || isScreenFs);
    };

    checkFullscreen();

    const mediaQuery = window.matchMedia('(display-mode: fullscreen)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsFullscreen(e.matches || Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', checkFullscreen);
    window.addEventListener('resize', checkFullscreen);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
      window.removeEventListener('resize', checkFullscreen);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Close Stats modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isStatsModalOpen) {
        setIsStatsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStatsModalOpen]);

  // Enforce Clean Light Mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.className = 'theme-light bg-[#f8fafc] text-slate-800 antialiased';
  }, []);

  // 1. Fetch Dashboard Stats (ดึงเฉพาะเมื่อเปิด Pop-up เพื่อไม่ให้หน้าแรกแล็ค)
  const fetchStats = useCallback(async () => {
    setIsRefreshingStats(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/stats/dashboard`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.warn('Failed to fetch stats:', err);
    } finally {
      setIsRefreshingStats(false);
    }
  }, []);

  // 2. Fetch Recent Logs (Up to 300 records for smooth pagination)
  const fetchRecentLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/logs/?limit=300`);
      if (res.ok) {
        const data = await res.json();
        setRecentLogs(data);
      }
    } catch (err) {
      console.warn('Failed to fetch recent logs:', err);
    }
  }, []);

  // 3. Fetch Device Status
  const fetchDeviceStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/scan/device-status`);
      if (res.ok) {
        const data = await res.json();
        setDeviceStatus(data);
      }
    } catch (err) {
      console.warn('Failed to fetch device status:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecentLogs();
    fetchDeviceStatus();
  }, [fetchRecentLogs, fetchDeviceStatus]);

  useEffect(() => {
    if (isStatsModalOpen) {
      fetchStats();
    }
  }, [isStatsModalOpen, fetchStats]);

  // 4. WebSocket Event Callbacks (เฉพาะข้อมูลที่ถูกต้องเท่านั้นจึงจะแสดงผล)
  const handleNewScan = useCallback(
    (event: ScanEvent) => {
      // หากข้อมูลไม่ถูกต้อง จะไม่นำมาแสดงบนการ์ดและไม่บันทึก
      if (event.status === 'INVALID' || event.status === 'REJECTED') {
        return;
      }

      setLatestScan(event);

      const newItem: AccessLogItem = {
        id: Date.now(),
        student_code: event.student_code,
        study_year: event.study_year,
        entry_year: event.entry_year,
        degree_level: event.degree_level,
        faculty: event.faculty,
        department: event.department,
        access_time: event.access_time,
        status: event.status,
      };
      setRecentLogs((prev) => [newItem, ...prev.slice(0, 299)]);

      if (isStatsModalOpen) {
        fetchStats();
      }
    },
    [isStatsModalOpen, fetchStats]
  );

  const handleDeviceHeartbeat = useCallback((statusData: DeviceStatus) => {
    setDeviceStatus(statusData);
  }, []);

  const { isConnected, reconnectAttempts } = useWebSocket({
    onNewScan: handleNewScan,
    onDeviceHeartbeat: handleDeviceHeartbeat,
  });

  // 5. Manual / Barcode Scanner Input Handler
  const handleScanBarcode = async (barcode: string): Promise<boolean> => {
    const cleanCode = barcode.trim();
    if (!cleanCode) return false;

    setIsScanning(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/scan/barcode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': DEVICE_API_KEY,
        },
        body: JSON.stringify({ barcode: cleanCode }),
      });

      if (res.ok) {
        const data = await res.json();

        // ❌ หากข้อมูลไม่ถูกต้อง/เกิน 10 หลัก: ไม่ต้องเซ็ต latestScan และไม่ต้องแสดงในกล่องข้อมูล
        if (data.status === 'INVALID' || data.status === 'REJECTED') {
          return false;
        }

        // ✅ เฉพาะข้อมูลที่ถูกต้อง: นำมาแสดงบนการ์ดและเพิ่มลงตาราง
        const newEvent: ScanEvent = {
          student_code: data.student_code,
          entry_year: data.entry_year,
          study_year: data.study_year,
          degree_level: data.degree_level,
          faculty: data.faculty,
          department: data.department,
          access_time: data.access_time,
          status: data.status,
          message: data.message,
        };

        setLatestScan(newEvent);

        const newLog: AccessLogItem = {
          id: Date.now(),
          student_code: data.student_code,
          study_year: data.study_year,
          entry_year: data.entry_year,
          degree_level: data.degree_level,
          faculty: data.faculty,
          department: data.department,
          access_time: data.access_time,
          status: data.status,
        };
        setRecentLogs((prev) => [newLog, ...prev.slice(0, 299)]);

        if (isStatsModalOpen) {
          fetchStats();
        }
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.error('Scan error:', err);
      return false;
    } finally {
      setIsScanning(false);
    }
  };

  // 6. Manual Google Sheets Sync Trigger
  const handleManualSheetsSync = async () => {
    setIsSyncingSheets(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/stats/sync-sheets-now`, {
        method: 'POST',
      });
      if (res.ok) {
        alert('ซิงก์ข้อมูลสรุปยอดประจำวันไปยัง Google Sheets สำเร็จเรียบร้อย!');
      } else {
        alert('การซิงก์เสร็จสิ้น');
      }
    } catch (e: any) {
      alert(`การซิงก์ล้มเหลว: ${e.message}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const topFaculty = useMemo(() => {
    if (!stats.faculty_distribution || stats.faculty_distribution.length === 0) return null;
    return [...stats.faculty_distribution].sort((a, b) => b.count - a.count)[0];
  }, [stats.faculty_distribution]);

  const topYear = useMemo(() => {
    if (!stats.year_distribution || stats.year_distribution.length === 0) return null;
    return [...stats.year_distribution].sort((a, b) => b.count - a.count)[0];
  }, [stats.year_distribution]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      {/* Top Header */}
      {/* Top Navigation Header - Modern University Blue Theme */}
      <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white sticky top-0 z-40 shadow-md border-b border-blue-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shadow-inner text-white border border-white/20">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  ระบบสถิติการเข้าใช้ห้องสมุด
                </h1>
                <span className="hidden sm:inline-flex text-2xs px-2.5 py-0.5 rounded-full bg-emerald-400/25 text-emerald-200 border border-emerald-300/30 font-bold backdrop-blur-xs">
                  Live
                </span>
              </div>
              <p className="text-xs text-blue-100/80 font-medium">
                Library Access & Demographic Analytics
              </p>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <DeviceStatusBadge
              wsConnected={isConnected}
              reconnectAttempts={reconnectAttempts}
              deviceStatus={deviceStatus}
            />

            {/* ปุ่มเปิด Pop-up สถิติ */}
            <button
              onClick={() => {
                setIsStatsModalOpen(true);
                fetchStats();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-white text-blue-700 hover:bg-blue-50 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              <span>ดูสถิติประจำวัน</span>
            </button>

            <button
              onClick={handleManualSheetsSync}
              disabled={isSyncingSheets}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/15 hover:bg-white/25 text-white rounded-xl transition-all border border-white/20 backdrop-blur-sm active:scale-95 disabled:opacity-50"
            >
              <Sheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isSyncingSheets ? 'กำลังซิงก์...' : 'ซิงก์ Sheets'}</span>
            </button>

            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'เปิดโหมดเต็มจอ (Kiosk Mode)'}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white/15 hover:bg-white/25 text-white rounded-xl transition-all border border-white/20 backdrop-blur-sm active:scale-95"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ย่อจอ</span>
                </>
              ) : (
                <>
                  <Maximize className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">เต็มจอ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex flex-col ${
          isFullscreen ? 'justify-center gap-7 sm:gap-9 py-6 sm:py-8' : 'py-7 space-y-7'
        }`}
      >
        {/* ========================================================================= */}
        {/* 1. HERO CHECK-IN TERMINAL (เฉพาะข้อมูลถูกต้องที่จะขึ้นในการ์ด)            */}
        {/* ========================================================================= */}
        <section>
          <LiveCheckinTerminal
            latestScan={latestScan}
            onScan={handleScanBarcode}
            isSubmitting={isScanning}
            isDeviceOnline={deviceStatus?.is_online ?? false}
          />
        </section>

        {/* ========================================================================= */}
        {/* 2. RECENT ATTENDANCE TABLE (ตารางประวัติการเข้าใช้งานล่าสุด)              */}
        {/* ========================================================================= */}
        {!isFullscreen && (
          <section className="fullscreen-hide">
            <RecentLogsTable
              logs={recentLogs}
              apiBaseUrl={API_BASE}
              onRefresh={fetchRecentLogs}
            />
          </section>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. STATS MODAL / POP-UP (แยกสถิติไว้ใน Pop-up เพื่อไม่ให้แล็ค)             */}
      {/* ========================================================================= */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#f8fafc] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 bg-white border-b border-slate-200/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    สถิติผู้เข้าใช้ห้องสมุดประจำวัน (Analytics Dashboard)
                  </h3>
                  <p className="text-xs text-slate-400">
                    ข้อมูลอัปเดตแบบเรียลไทม์ • ปิดยอดอัตโนมัติเวลา 16:30 น.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchStats}
                  disabled={isRefreshingStats}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  title="รีเฟรชข้อมูลสถิติ"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingStats ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">รีเฟรช</span>
                </button>
                <button
                  onClick={() => setIsStatsModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="ปิดหน้าต่าง (ESC)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {/* 4 KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 items-stretch">
                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      ยอดเข้าใช้วันนี้
                    </span>
                    <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                        {stats.today_total_scans}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">ครั้ง</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      การเข้าใช้ห้องสมุดทั้งหมดวันนี้
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      นักศึกษาไม่ซ้ำคน
                    </span>
                    <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                      <Sparkles className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-mono">
                        {stats.today_unique_students}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">คน</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5">
                      ผู้เข้าใช้จริงตามรหัสบัตร
                    </p>
                  </div>
                </div>

                <div className="rounded-3xl border border-blue-200/90 bg-gradient-to-b from-blue-50/50 to-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                      ชั้นปีเข้ามากที่สุด
                    </span>
                    <div className="p-2.5 rounded-2xl bg-blue-100/80 text-blue-600">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    {topYear ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl sm:text-4xl font-black text-blue-950 tracking-tight font-mono">
                            {topYear.year}
                          </span>
                          <span className="text-xs text-blue-700 font-bold">อันดับ 1</span>
                        </div>
                        <div className="mt-1.5">
                          <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md">
                            {topYear.count} ครั้ง ({stats.today_total_scans > 0 ? Math.round((topYear.count / stats.today_total_scans) * 100) : 0}%)
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-slate-400 block">ยังไม่มีข้อมูล</span>
                        <p className="text-xs text-slate-400 mt-1.5">รอการสแกนเข้าใช้</p>
                      </>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/40 to-white p-5 sm:p-6 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      คณะยอดนิยม
                    </span>
                    <div className="p-2.5 rounded-2xl bg-emerald-100/80 text-emerald-700">
                      <Building2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="mt-4">
                    {topFaculty ? (
                      <>
                        <h4
                          className="text-base sm:text-lg font-black text-slate-900 leading-snug break-words"
                          title={topFaculty.name}
                        >
                          {topFaculty.name}
                        </h4>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                            {topFaculty.count} ครั้ง
                          </span>
                          <span className="text-xs font-medium text-emerald-700">
                            สัดส่วน {stats.today_total_scans > 0 ? Math.round((topFaculty.count / stats.today_total_scans) * 100) : 0}%
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-xl font-bold text-slate-400 block">ยังไม่มีข้อมูล</span>
                        <p className="text-xs text-slate-400 mt-1.5">รอการสแกนเข้าใช้</p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Charts */}
              <StatsCharts
                hourlyData={stats.hourly_distribution}
                facultyData={stats.faculty_distribution}
                yearData={stats.year_distribution || []}
                peakHour={stats.peak_hour}
              />
            </div>
          </div>
        </div>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200/80 bg-white/90 backdrop-blur-md py-4 text-center text-xs text-slate-500 mt-auto transition-all">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-medium text-slate-600">
            ระบบสถิติการเข้าใช้ห้องสมุดอัตโนมัติ • ถอดรหัสบาร์โค้ด • ซิงก์ Google Sheets อัตโนมัติ
          </p>
          <div className="flex items-center gap-2.5 text-2xs text-slate-400 font-semibold">
            <span>🕒 เวลาทำการ 08:00 - 16:00 น.</span>
            <span>•</span>
            <span>⚡ ส่งยอดวันนี้ 16:30 น.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

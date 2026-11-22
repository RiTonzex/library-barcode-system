import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  Sparkles,
  BookOpen,
  GraduationCap,
  Maximize,
  Minimize,
  BarChart3,
  X,
  RefreshCw,
  Clock,
  ChevronDown,
  ArrowUp,
  TrendingUp,
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
  const [isScanning, setIsScanning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Monitor Scroll for Back-to-Top Button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  // 1. Fetch Dashboard Stats (ดึงข้อมูลสถิติจริงจากระบบ)
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

  // Load initial data on mount
  useEffect(() => {
    fetchStats();
    fetchRecentLogs();
    fetchDeviceStatus();
  }, [fetchStats, fetchRecentLogs, fetchDeviceStatus]);

  // 4. WebSocket Event Callbacks (เฉพาะข้อมูลที่ถูกต้องเท่านั้นจึงจะแสดงผล)
  const handleNewScan = useCallback(
    (event: ScanEvent) => {
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
      fetchStats();
    },
    [fetchStats]
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

        if (data.status === 'INVALID' || data.status === 'REJECTED') {
          return false;
        }

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
        fetchStats();
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

  const topFaculty = useMemo(() => {
    if (!stats.faculty_distribution || stats.faculty_distribution.length === 0) return null;
    return [...stats.faculty_distribution].sort((a, b) => b.count - a.count)[0];
  }, [stats.faculty_distribution]);

  const topYear = useMemo(() => {
    if (!stats.year_distribution || stats.year_distribution.length === 0) return null;
    return [...stats.year_distribution].sort((a, b) => b.count - a.count)[0];
  }, [stats.year_distribution]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* TOP HEADER - Clean, Spacious, Single-line (ไม่แน่น สบายตา)                */}
      {/* ========================================================================= */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & System Title */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/15 shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-none">
                ระบบบันทึกเวลาเข้าใช้ห้องสมุด
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
                มหาวิทยาลัยราชภัฏศรีสะเกษ (SSKRU Library)
              </p>
            </div>
          </div>

          {/* Clean Single-Row Navigation (ตัดซิงก์ Sheets ออกตามคำขอ ไม่แน่น) */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap">
            {/* สถานะระบบเชื่อมต่อ & สถานะเครื่องสแกน (กะทัดรัด สบายตา) */}
            <DeviceStatusBadge
              wsConnected={isConnected}
              reconnectAttempts={reconnectAttempts}
              deviceStatus={deviceStatus}
            />

            {/* ปุ่มนำทาง: สรุปสถิติ */}
            <button
              onClick={() => scrollToSection('stats-section')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all border border-blue-200 shadow-2xs active:scale-95 whitespace-nowrap"
              title="เลื่อนลงเพื่อดูสรุปสถิติประจำวัน"
            >
              <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>สรุปสถิติ</span>
            </button>

            {/* ปุ่มนำทาง: ประวัติการเข้า */}
            <button
              onClick={() => scrollToSection('logs-section')}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all border border-slate-200 shadow-2xs active:scale-95 whitespace-nowrap"
              title="เลื่อนลงเพื่อดูตารางประวัติการเข้าใช้งานล่าสุด"
            >
              <Clock className="w-4 h-4 text-slate-600 shrink-0" />
              <span>ประวัติการเข้า</span>
            </button>

            {/* ปุ่มเต็มจอ (Kiosk Mode) */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'ออกจากโหมดเต็มจอ' : 'เปิดโหมดเต็มจอ'}
              className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all border border-slate-200 shadow-2xs active:scale-95 whitespace-nowrap"
            >
              {isFullscreen ? (
                <>
                  <Minimize className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="hidden sm:inline">ย่อจอ</span>
                </>
              ) : (
                <>
                  <Maximize className="w-4 h-4 text-slate-600 shrink-0" />
                  <span className="hidden sm:inline">เต็มจอ</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 1. ABOVE-THE-FOLD: หน้าจอแรก จุดบันทึกการเข้าใช้ห้องสมุด (จัดสัดส่วนสมส่วน) */}
      {/* ========================================================================= */}
      <section className="flex-1 flex flex-col justify-center items-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {/* Main Workstation Terminal Card (สัดส่วนพอเหมาะ สมส่วน ไม่ลอยเคว้ง) */}
        <div className="w-full max-w-4xl lg:max-w-4xl xl:max-w-5xl">
          <LiveCheckinTerminal
            latestScan={latestScan}
            onScan={handleScanBarcode}
            isSubmitting={isScanning}
            isDeviceOnline={deviceStatus?.is_online ?? false}
          />
        </div>

        {/* Scroll-down Invitation Button (เชื่อมต่อสายตาลงสู่สถิติและประวัติ) */}
        {!isFullscreen && (
          <div className="fullscreen-hide flex flex-col items-center justify-center mt-8 sm:mt-10 text-center">
            <button
              onClick={() => scrollToSection('stats-section')}
              className="group flex flex-col items-center gap-1.5 text-slate-400 hover:text-blue-600 transition-colors focus:outline-hidden"
              title="เลื่อนลงเพื่อดูสรุปสถิติประจำวันและประวัติการเข้าใช้งาน"
            >
              <span className="text-xs sm:text-sm font-semibold tracking-wide">
                เลื่อนลงเพื่อดูสรุปสถิติและประวัติการเข้าใช้งาน
              </span>
              <div className="p-2 rounded-full bg-white border border-slate-200 shadow-2xs group-hover:border-blue-300 group-hover:bg-blue-50 transition-all animate-bounce">
                <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
              </div>
            </button>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* BELOW-THE-FOLD CONTENT (ต้องเลื่อนหน้าจอลงมาจึงจะพบส่วนนี้)                 */}
      {/* ========================================================================= */}
      {!isFullscreen && (
        <div className="fullscreen-hide border-t border-slate-200/80 bg-slate-100/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-12 sm:space-y-16">
            {/* ========================================================================= */}
            {/* 2. SECTION: สรุปสถิติผู้เข้าใช้ห้องสมุดประจำวัน (Real Data & Soft Colors)   */}
            {/* ========================================================================= */}
            <section id="stats-section" className="scroll-mt-24 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-100 text-blue-700">
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        สรุปสถิติผู้เข้าใช้ห้องสมุดประจำวัน
                      </h2>
                      <p className="text-sm sm:text-base text-slate-500 font-medium mt-0.5">
                        ข้อมูลสถิติจริงจากระบบประจำวัน • รีเฟรชข้อมูลอัตโนมัติเมื่อมีการสแกน
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 self-start sm:self-auto">
                  <button
                    onClick={fetchStats}
                    disabled={isRefreshingStats}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-50"
                    title="รีเฟรชข้อมูลสถิติล่าสุด"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshingStats ? 'animate-spin' : ''}`} />
                    <span>รีเฟรชสถิติ</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsStatsModalOpen(true);
                      fetchStats();
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-sm active:scale-95"
                    title="เปิดกราฟวิเคราะห์รายชั่วโมงและสัดส่วนคณะ"
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span>ดูกราฟวิเคราะห์เชิงลึก</span>
                  </button>
                </div>
              </div>

              {/* 4 Modern Soft Color Metric Cards (แสดงข้อมูลจริง ชัดเจน ทุกวัยอ่านง่าย) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {/* 1. ยอดเข้าใช้วันนี้ (Soft Blue) */}
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

                {/* 2. นักศึกษาไม่ซ้ำคน (Soft Amber) */}
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

                {/* 3. ชั้นปีเข้ามากที่สุด (Soft Indigo) */}
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

                {/* 4. ช่วงเวลาที่มีผู้เข้าใช้มากที่สุด (Soft Emerald) */}
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
            </section>

            {/* ========================================================================= */}
            {/* 3. SECTION: ประวัติการเข้าใช้งานห้องสมุดล่าสุด (Recent Logs Table)          */}
            {/* ========================================================================= */}
            <section id="logs-section" className="scroll-mt-24">
              <RecentLogsTable
                logs={recentLogs}
                apiBaseUrl={API_BASE}
                onRefresh={fetchRecentLogs}
              />
            </section>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. STATS DEEP-DIVE MODAL (กราฟวิเคราะห์รายชั่วโมง & สัดส่วนคณะ)            */}
      {/* ========================================================================= */}
      {isStatsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#f8fafc] rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-scaleIn">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-5 bg-white border-b border-slate-200/90 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-2xl bg-blue-100 text-blue-700">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                    กราฟวิเคราะห์และสถิติผู้เข้าใช้ห้องสมุด
                  </h3>
                  <p className="text-sm text-slate-500 font-medium mt-0.5">
                    ประมวลผลข้อมูลจริงจากระบบ • เวลาทำการ 08:00 - 16:00 น.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={fetchStats}
                  disabled={isRefreshingStats}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-95 disabled:opacity-50"
                  title="รีเฟรชข้อมูลสถิติล่าสุด"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingStats ? 'animate-spin' : ''}`} />
                  <span>รีเฟรช</span>
                </button>
                <button
                  onClick={() => setIsStatsModalOpen(false)}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                  title="ปิดหน้าต่างนี้"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
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

      {/* ========================================================================= */}
      {/* 5. FLOATING BACK-TO-TOP BUTTON (สะดวกสำหรับผู้สูงอายุและผู้ใช้งานทั่วไป)    */}
      {/* ========================================================================= */}
      {showBackToTop && !isFullscreen && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2.5 text-base font-bold animate-fadeIn"
          title="กลับขึ้นสู่จุดบันทึกการเข้าใช้ด้านบน"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="hidden sm:inline">กลับขึ้นด้านบน</span>
        </button>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500 mt-auto transition-all">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-700">
            ระบบบันทึกเวลาเข้าใช้ห้องสมุดอัตโนมัติ • มหาวิทยาลัยราชภัฏศรีสะเกษ
          </p>
          <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
            <span>🕒 เวลาทำการ 08:00 - 16:00 น.</span>
            <span>•</span>
            <span>⚡ ซิงก์ Google Sheets อัตโนมัติ</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;

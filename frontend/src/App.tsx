import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Maximize,
  Minimize,
  BarChart3,
  ArrowLeft,
  ArrowUp,
} from 'lucide-react';
import { useWebSocket } from './hooks/useWebSocket';
import { LiveCheckinTerminal } from './components/LiveCheckinTerminal';
import { DashboardView } from './components/DashboardView';
import { DeviceStatusBadge } from './components/DeviceStatusBadge';
import { ScanEvent, DeviceStatus, DashboardStats, AccessLogItem } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const DEVICE_API_KEY = import.meta.env.VITE_DEVICE_API_KEY || 'lib_esp32_secret_key_prod_998877';

export const App: React.FC = () => {
  // Navigation / View state: 'checkin' (หน้าหลัก สแกนบัตร) หรือ 'dashboard' (หน้าแยก สรุปสถิติ & ประวัติ)
  const [currentView, setCurrentView] = useState<'checkin' | 'dashboard'>(() => {
    return window.location.hash === '#dashboard' || window.location.hash === '#stats'
      ? 'dashboard'
      : 'checkin';
  });

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
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Sync view with hash in URL (รองรับปุ่ม Back/Forward ของเบราว์เซอร์)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#dashboard' || hash === '#stats') {
        setCurrentView('dashboard');
      } else {
        setCurrentView('checkin');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigateTo = (view: 'checkin' | 'dashboard') => {
    setCurrentView(view);
    if (view === 'dashboard') {
      window.location.hash = '#dashboard';
    } else {
      history.pushState('', document.title, window.location.pathname + window.location.search);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Monitor Scroll for Back-to-Top Button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // Enforce Clean Light Mode
  useEffect(() => {
    document.documentElement.classList.remove('dark');
    document.body.className = 'theme-light bg-[#f8fafc] text-slate-800 antialiased';
  }, []);

  // 1. Fetch Dashboard Stats (ดึงเมื่อเข้าหน้าแดชบอร์ด เพื่อให้หน้าหลักเร็วที่สุด)
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

  // 2. Fetch Recent Logs (ดึงเมื่อเข้าหน้าแดชบอร์ด)
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

  // Load Device Status on mount
  useEffect(() => {
    fetchDeviceStatus();
  }, [fetchDeviceStatus]);

  // Load Stats & Logs ONLY when user navigates to the 'dashboard' page (ป้องกันการแล็คในหน้าหลัก)
  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchStats();
      fetchRecentLogs();
    }
  }, [currentView, fetchStats, fetchRecentLogs]);

  // Refresh both Stats & Logs
  const handleRefreshAll = useCallback(async () => {
    await Promise.all([fetchStats(), fetchRecentLogs(), fetchDeviceStatus()]);
  }, [fetchStats, fetchRecentLogs, fetchDeviceStatus]);

  // 4. WebSocket Event Callbacks
  const handleNewScan = useCallback(
    (event: ScanEvent) => {
      if (event.status === 'INVALID' || event.status === 'REJECTED') {
        return;
      }

      setLatestScan(event);

      // If user is currently looking at the dashboard, update it
      if (currentView === 'dashboard') {
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
      }
    },
    [currentView, fetchStats]
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

        if (currentView === 'dashboard') {
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col font-sans">
      {/* ========================================================================= */}
      {/* TOP HEADER - Clean, Single-line, No Clutter                                */}
      {/* ========================================================================= */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Brand & System Title */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => navigateTo('checkin')}
            title="คลิกเพื่อกลับสู่หน้าหลัก"
          >
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

          {/* Quick Actions & Navigation Bar */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-nowrap">
            {/* สถานะระบบเชื่อมต่อ & สถานะเครื่องสแกน */}
            <DeviceStatusBadge
              wsConnected={isConnected}
              reconnectAttempts={reconnectAttempts}
              deviceStatus={deviceStatus}
            />

            {/* ปุ่มสลับหน้าระหว่าง จุดสแกนบัตร VS หน้าสรุปสถิติและประวัติ */}
            {currentView === 'checkin' ? (
              <button
                onClick={() => navigateTo('dashboard')}
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition-all border border-blue-200 shadow-2xs active:scale-95 whitespace-nowrap"
                title="เปิดหน้าแยกเพื่อดูรายงานสรุปสถิติและประวัติการเข้าใช้งาน"
              >
                <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                <span>สถิติและประวัติ</span>
              </button>
            ) : (
              <button
                onClick={() => navigateTo('checkin')}
                className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-sm active:scale-95 whitespace-nowrap"
                title="กลับสู่หน้าจุดบันทึกการเข้าใช้ห้องสมุด"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>จุดสแกนบัตร</span>
              </button>
            )}

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
      {/* MAIN VIEW CONTROLLER: สลับหน้าระหว่าง หน้าสแกนบัตร (Check-in) กับ หน้าสถิติ */}
      {/* ========================================================================= */}
      {currentView === 'checkin' ? (
        /* 1. หน้าหลัก: จุดบันทึกการเข้าใช้ห้องสมุด (Pure Kiosk, ไม่โหลดข้อมูลหนัก, ไม่แล็ค 100%) */
        <main className="flex-1 flex flex-col justify-center items-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
          <div className="w-full max-w-4xl lg:max-w-4xl xl:max-w-5xl">
            <LiveCheckinTerminal
              latestScan={latestScan}
              onScan={handleScanBarcode}
              isSubmitting={isScanning}
              isDeviceOnline={deviceStatus?.is_online ?? false}
            />
          </div>
        </main>
      ) : (
        /* 2. หน้าแยก: สรุปสถิติ & ประวัติการเข้าใช้งานล่าสุด (โหลดข้อมูลเฉพาะเมื่อกดเข้ามา) */
        <main className="flex-1">
          <DashboardView
            stats={stats}
            recentLogs={recentLogs}
            isRefreshing={isRefreshingStats}
            onRefreshAll={handleRefreshAll}
            apiBaseUrl={API_BASE}
            onBackToCheckin={() => navigateTo('checkin')}
          />
        </main>
      )}

      {/* Floating Back-to-Top Button (เฉพาะในหน้า Dashboard เมื่อเลื่อนจอ) */}
      {showBackToTop && currentView === 'dashboard' && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-40 p-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2.5 text-base font-bold animate-fadeIn"
          title="กลับขึ้นด้านบน"
        >
          <ArrowUp className="w-5 h-5" />
          <span className="hidden sm:inline">กลับขึ้นด้านบน</span>
        </button>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs sm:text-sm text-slate-500 mt-auto transition-all">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-semibold text-slate-700">
            ระบบบันทึกเวลาเข้าใช้ห้องสมุดอัตโนมัติ • มหาวิทยาลัยราชภัฏศรีสะเกษ
          </p>
          <div className="flex items-center gap-3 text-xs sm:text-sm text-slate-500 font-medium">
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

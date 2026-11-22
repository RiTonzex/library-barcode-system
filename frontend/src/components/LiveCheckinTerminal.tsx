import React, { useState, useRef, useEffect } from 'react';
import {
  Barcode,
  CheckCircle2,
  Clock,
  Scan,
  Keyboard,
  Building2,
  BookOpen,
  Calendar,
  GraduationCap,
  AlertCircle,
} from 'lucide-react';
import { ScanEvent } from '../types';

interface Props {
  latestScan: ScanEvent | null;
  onScan: (code: string) => Promise<boolean>;
  isSubmitting?: boolean;
  isDeviceOnline?: boolean;
}

export const LiveCheckinTerminal: React.FC<Props> = ({
  latestScan,
  onScan,
  isSubmitting = false,
  isDeviceOnline = false,
}) => {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-clear feedback toast after 5 seconds
  useEffect(() => {
    if (feedback.type) {
      const timer = setTimeout(() => {
        setFeedback({ type: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = barcodeInput.trim();
    if (!clean) {
      setFeedback({ type: 'error', message: 'กรุณากรอกหรือสแกนรหัสนักศึกษา 10 หลัก' });
      return;
    }

    setFeedback({ type: null, message: '' });
    const success = await onScan(clean);

    if (success) {
      setFeedback({
        type: 'success',
        message: `บันทึกข้อมูลรหัส ${clean} สำเร็จ`,
      });
      setBarcodeInput('');
      inputRef.current?.focus();
    } else {
      setFeedback({
        type: 'error',
        message: `ข้อมูลไม่ถูกต้อง: ${clean}`,
      });
      setBarcodeInput('');
      inputRef.current?.focus();
    }
  };

  const formattedTime = latestScan?.access_time
    ? new Date(latestScan.access_time).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const isValidScan =
    latestScan &&
    latestScan.status !== 'INVALID' &&
    latestScan.status !== 'REJECTED';

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden transition-all">
      {/* Top Hero Bar: Input & Scanner Field */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-50/90 via-white to-blue-50/30 border-b border-slate-100">
        {/* Title & Live Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
              <Barcode className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                จุดสแกนบัตรเข้าห้องสมุด
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                ยิงบาร์โค้ดบัตร หรือ พิมพ์รหัสนักศึกษา 10 หลักด้านล่าง
              </p>
            </div>
          </div>
          {isDeviceOnline ? (
            <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-extrabold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              เครื่องพร้อมใช้งาน (สแกนได้ทันที)
            </div>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-900 text-xs sm:text-sm font-extrabold shadow-2xs">
              <Keyboard className="w-4 h-4 text-blue-600" />
              <span>โหมดพิมพ์รหัสนักศึกษา</span>
            </div>
          )}
        </div>

        {/* Hero Input Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              maxLength={20}
              autoComplete="off"
              placeholder="พิมพ์รหัสนักศึกษา 10 หลัก เช่น 6812732119..."
              value={barcodeInput}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 20);
                setBarcodeInput(numericOnly);
              }}
              disabled={isSubmitting}
              className="w-full px-6 sm:px-7 py-4 sm:py-5 text-xl sm:text-3xl font-mono font-black text-slate-900 bg-slate-50/50 hover:bg-white focus:bg-white border-2 border-slate-200 hover:border-blue-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-2xl shadow-inner placeholder:text-slate-300 placeholder:font-sans placeholder:font-normal placeholder:text-base sm:placeholder:text-xl transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !barcodeInput.trim()}
            className="px-8 sm:px-10 py-4 sm:py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-md shadow-blue-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <CheckCircle2 className="w-5 h-5" />
            {isSubmitting ? 'กำลังตรวจสอบ...' : 'บันทึกการเข้า'}
          </button>
        </form>
      </div>

      {/* Bottom Area: Live Student Pass Display (เฉพาะข้อมูลถูกต้องเท่านั้นที่จะแสดงผล) */}
      <div className="px-6 sm:px-8 py-6 min-h-[195px] sm:min-h-[205px] lg:h-[380px] flex flex-col justify-center">
        {isValidScan ? (
          /* 🟢 กรณีข้อมูลถูกต้อง: แสดงการ์ดข้อมูลนักศึกษาครบถ้วน */
          <div className="w-full h-full flex flex-col justify-center gap-6 sm:gap-8 py-2 animate-fadeIn">
            {/* Student ID Hero & Timestamp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                  รหัสนักศึกษา (STUDENT ID)
                </span>
                <div className="flex flex-wrap items-center gap-3.5">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 font-mono tracking-tight">
                    {latestScan.student_code}
                  </h2>
                  {latestScan.study_year && latestScan.study_year !== '-' && (
                    <span className="inline-flex items-center px-4 py-1.5 sm:py-2 rounded-2xl text-base sm:text-xl font-black bg-blue-600 text-white shadow-md shadow-blue-600/25 whitespace-nowrap">
                      {latestScan.study_year}
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              {formattedTime && (
                <div className="self-start sm:self-auto">
                  <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-slate-500 font-bold bg-slate-100 px-4 py-2 rounded-2xl border border-slate-200">
                    <Clock className="w-4 h-4 text-slate-400" />
                    เวลา {formattedTime} น.
                  </span>
                </div>
              )}
            </div>

            {/* 4 Metadata Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="px-5 py-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors h-[100px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">คณะ</span>
                  <Building2 className="w-4 h-4 text-indigo-500" />
                </div>
                <p className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words" title={latestScan.faculty}>
                  {latestScan.faculty || '-'}
                </p>
              </div>

              <div className="px-5 py-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors h-[100px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">สาขาวิชา</span>
                  <BookOpen className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-sm sm:text-base font-black text-slate-900 leading-snug break-words" title={latestScan.department}>
                  {latestScan.department || '-'}
                </p>
              </div>

              <div className="px-5 py-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors h-[100px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">ปีการศึกษาที่เข้า</span>
                  <Calendar className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-sm sm:text-base font-mono font-black text-slate-900">
                  {latestScan.entry_year && latestScan.entry_year !== '-' ? `พ.ศ. ${latestScan.entry_year}` : '-'}
                </p>
              </div>

              <div className="px-5 py-4 rounded-2xl bg-slate-50/90 border border-slate-200/80 flex flex-col justify-between shadow-2xs hover:border-slate-300 transition-colors h-[100px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider">รูปแบบหลักสูตร</span>
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-sm sm:text-base font-black text-blue-700 leading-snug">
                  {latestScan.degree_level || '-'}
                </p>
              </div>
            </div>
          </div>
        ) : isDeviceOnline ? (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Scan className="w-7 h-7 text-blue-600 animate-pulse" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800">
              พร้อมรับการสแกนบาร์โค้ดบัตรนักศึกษา
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md">
              นำบาร์โค้ดบัตรนักศึกษาวางที่หัวอ่าน หรือพิมพ์รหัส 10 หลักในช่องด้านบน
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center text-center space-y-2.5">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Keyboard className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              กรุณาพิมพ์รหัสนักศึกษา 10 หลักในช่องด้านบน
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs sm:text-sm text-slate-500 font-medium max-w-2xl mx-auto pt-0.5">
              <span>ระบบพร้อมบันทึกการเข้าใช้ทันที</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                พิมพ์รหัส 10 หลักแล้วกด
                <kbd className="inline-flex items-center gap-1 font-mono font-bold text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-lg shadow-2xs">
                  Enter ↵
                </kbd>
                เพื่อเข้าห้องสมุด
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {feedback.type && feedback.message && (
        <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-toast-up">
          <div
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl shadow-xl backdrop-blur-md border text-sm sm:text-base font-semibold transition-all ${
              feedback.type === 'success'
                ? 'bg-slate-900/90 text-white border-emerald-500/40'
                : 'bg-slate-900/90 text-slate-200 border-slate-700'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
            )}
            <span className="tracking-wide whitespace-nowrap">{feedback.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

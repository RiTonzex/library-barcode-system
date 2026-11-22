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
      <div className="p-6 sm:p-8 bg-slate-50/70 border-b border-slate-200/80">
        {/* Title & Live Status Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
              <Barcode className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                จุดบันทึกการเข้าใช้ห้องสมุด
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                แตะบัตรนักศึกษาที่เครื่องสแกน หรือพิมพ์รหัส 10 หลักด้านล่าง
              </p>
            </div>
          </div>
          {isDeviceOnline ? (
            <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              เครื่องสแกนพร้อมทำงาน
            </div>
          ) : (
            <div className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm font-semibold shadow-2xs">
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
              placeholder="พิมพ์รหัสนักศึกษา 10 หลัก (เช่น 6812732119)..."
              value={barcodeInput}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, '').slice(0, 20);
                setBarcodeInput(numericOnly);
              }}
              disabled={isSubmitting}
              className="w-full px-6 py-4 sm:py-5 text-2xl sm:text-3xl font-mono font-bold text-slate-900 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-2xl shadow-inner placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:text-base sm:placeholder:text-lg transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !barcodeInput.trim()}
            className={`px-8 sm:px-10 py-4 sm:py-5 rounded-2xl font-bold text-base sm:text-lg flex items-center justify-center gap-2.5 transition-all shadow-sm whitespace-nowrap active:scale-[0.98] ${
              !barcodeInput.trim() || isSubmitting
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isSubmitting ? 'กำลังตรวจสอบ...' : 'บันทึกเวลาเข้า'}</span>
          </button>
        </form>
      </div>

      {/* Bottom Area: Live Student Pass Display (เฉพาะข้อมูลถูกต้องเท่านั้นที่จะแสดงผล) */}
      <div className="px-6 sm:px-8 py-6 sm:py-8 flex flex-col justify-center transition-all">
        {isValidScan ? (
          /* 🟢 กรณีข้อมูลถูกต้อง: แสดงการ์ดข้อมูลนักศึกษาครบถ้วน ตัวหนังสือขนาดใหญ่ สบายตา */
          <div className="w-full flex flex-col justify-center gap-6 py-1 animate-fadeIn">
            {/* Student ID Hero & Timestamp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                  รหัสนักศึกษา (STUDENT ID)
                </span>
                <div className="flex flex-wrap items-center gap-3.5">
                  <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 font-mono tracking-tight">
                    {latestScan.student_code}
                  </h2>
                  {latestScan.study_year && latestScan.study_year !== '-' && (
                    <span className="inline-flex items-center px-4 py-1.5 sm:py-2 rounded-xl text-base sm:text-lg font-bold bg-blue-600 text-white shadow-sm whitespace-nowrap">
                      {latestScan.study_year}
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              {formattedTime && (
                <div className="self-start sm:self-auto">
                  <span className="inline-flex items-center gap-2 text-sm sm:text-base text-slate-700 font-semibold bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200">
                    <Clock className="w-4 h-4 text-slate-500" />
                    เวลาเข้า: {formattedTime} น.
                  </span>
                </div>
              )}
            </div>

            {/* 4 Metadata Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between h-[105px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">คณะ</span>
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words" title={latestScan.faculty}>
                  {latestScan.faculty || '-'}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between h-[105px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">สาขาวิชา</span>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words" title={latestScan.department}>
                  {latestScan.department || '-'}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between h-[105px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">ปีการศึกษาที่เข้า</span>
                  <Calendar className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-base sm:text-lg font-mono font-bold text-slate-900">
                  {latestScan.entry_year && latestScan.entry_year !== '-' ? `พ.ศ. ${latestScan.entry_year}` : '-'}
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between h-[105px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm font-semibold text-slate-500">รูปแบบหลักสูตร</span>
                  <GraduationCap className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-base sm:text-lg font-bold text-blue-700 leading-snug">
                  {latestScan.degree_level || '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ⚪ สถานะสแตนด์บาย: สุภาพ สะอาดตา สบายตา ไม่มีพื้นที่ว่างรบกวน */
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 py-5 px-6 rounded-2xl bg-slate-50 border border-slate-200 text-center sm:text-left transition-all">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <Scan className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                ระบบพร้อมรับการสแกนบัตรนักศึกษา
              </h3>
              <p className="text-sm text-slate-500 font-medium">
                ท่านสามารถนำบัตรมาวางที่เครื่องสแกนได้ทันที หรือพิมพ์รหัส 10 หลักในช่องด้านบนแล้วกดปุ่ม Enter
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {feedback.type && feedback.message && (
        <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-toast-up">
          <div
            className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl shadow-xl border text-sm sm:text-base font-semibold transition-all ${
              feedback.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500'
                : 'bg-slate-900 text-slate-100 border-amber-500'
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

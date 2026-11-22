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
  X,
  Sparkles,
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
        message: `รหัสนักศึกษาไม่ถูกต้อง หรือไม่พบข้อมูล: ${clean}`,
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
    <div className="w-full rounded-3xl border border-slate-200/90 bg-white shadow-sm overflow-hidden transition-all">
      {/* Top Section: Header & Scanner Field */}
      <div className="p-6 sm:p-9 bg-gradient-to-b from-slate-50/90 to-slate-50/50 border-b border-slate-200/80">
        {/* Terminal Header & Mode Indicator */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Barcode className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  จุดบันทึกการเข้าใช้ห้องสมุด
                </h2>
              </div>
              <p className="text-base text-slate-600 font-medium mt-0.5">
                แตะบัตรนักศึกษาที่เครื่องสแกน หรือพิมพ์รหัส 10 หลักแล้วกดปุ่มบันทึก
              </p>
            </div>
          </div>

          {/* Mode Pill Badge */}
          {isDeviceOnline ? (
            <div className="flex items-center gap-2.5 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm sm:text-base font-semibold shadow-2xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>เครื่องสแกนพร้อมทำงาน</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-sm sm:text-base font-semibold shadow-2xs">
              <Keyboard className="w-4 h-4 text-blue-600 shrink-0" />
              <span>โหมดพิมพ์รหัสนักศึกษา</span>
            </div>
          )}
        </div>

        {/* Big Input Form (ออกแบบสำหรับทุกวัย ขนาดใหญ่ เห็นชัดเจน) */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row items-stretch gap-3.5">
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
              className="w-full h-[64px] sm:h-[72px] pl-6 pr-12 text-2xl sm:text-3xl lg:text-4xl font-mono font-bold text-slate-900 bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-2xl shadow-inner placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal placeholder:text-base sm:placeholder:text-lg transition-all"
            />
            {barcodeInput && (
              <button
                type="button"
                onClick={() => {
                  setBarcodeInput('');
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="ล้างข้อความ"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !barcodeInput.trim()}
            className={`h-[64px] sm:h-[72px] px-8 sm:px-12 rounded-2xl font-bold text-lg sm:text-xl flex items-center justify-center gap-3 transition-all shadow-sm whitespace-nowrap active:scale-[0.98] ${
              !barcodeInput.trim() || isSubmitting
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <span>{isSubmitting ? 'กำลังตรวจสอบ...' : 'บันทึกเวลาเข้า'}</span>
          </button>
        </form>
      </div>

      {/* Result Display: Verified Student Pass vs Standby State */}
      <div className="p-6 sm:p-9 flex flex-col justify-center transition-all bg-white min-h-[220px]">
        {isValidScan ? (
          /* 🟢 กรณีบันทึกสำเร็จ: แสดงการ์ดยืนยันตัวตนขนาดใหญ่ ชัดเจน สบายตา */
          <div className="w-full flex flex-col justify-center gap-6 animate-fadeIn">
            {/* Status Banner & Timestamp */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-emerald-900">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-bold text-base sm:text-lg">
                  ตรวจสอบข้อมูลถูกต้อง • บันทึกเวลาเข้าใช้ห้องสมุดสำเร็จ
                </span>
              </div>
              {formattedTime && (
                <div className="flex items-center gap-2 text-sm sm:text-base text-emerald-800 font-semibold bg-white/80 px-3.5 py-1.5 rounded-xl border border-emerald-200/60 self-start sm:self-auto">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>เวลาบันทึก: {formattedTime} น.</span>
                </div>
              )}
            </div>

            {/* Student ID Hero Display */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-slate-100">
              <div>
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  รหัสนักศึกษา (STUDENT ID)
                </span>
                <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                  <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 font-mono tracking-tight">
                    {latestScan.student_code}
                  </h3>
                  {latestScan.study_year && latestScan.study_year !== '-' && (
                    <span className="inline-flex items-center px-4 py-1.5 sm:py-2 rounded-xl text-lg sm:text-xl font-bold bg-blue-600 text-white shadow-sm whitespace-nowrap">
                      {latestScan.study_year}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 4 Metadata Cards: คณะ, สาขาวิชา, ปีการศึกษาที่เข้า, รูปแบบหลักสูตร */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-500">คณะ</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words" title={latestScan.faculty}>
                  {latestScan.faculty || '-'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-500">สาขาวิชา</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <BookOpen className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-snug break-words" title={latestScan.department}>
                  {latestScan.department || '-'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-500">ปีการศึกษาที่เข้า</span>
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-lg sm:text-xl font-mono font-bold text-slate-900">
                  {latestScan.entry_year && latestScan.entry_year !== '-' ? `พ.ศ. ${latestScan.entry_year}` : '-'}
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 flex flex-col justify-between min-h-[115px]">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-slate-500">รูปแบบหลักสูตร</span>
                  <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-base sm:text-lg font-bold text-blue-700 leading-snug">
                  {latestScan.degree_level || '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ⚪ สถานะสแตนด์บาย: สุภาพ สะอาดตา สบายตา แนะนำการใช้งานสำหรับทุกวัย */
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-5 py-6 px-7 rounded-2xl bg-slate-50/80 border border-dashed border-slate-300 text-center sm:text-left transition-all">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <Scan className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                ระบบพร้อมรับการสแกนบัตรนักศึกษา
              </h3>
              <p className="text-base text-slate-600 font-medium mt-1">
                สามารถนำบัตรนักศึกษามาวางที่เครื่องสแกนได้ทันที หรือพิมพ์รหัส 10 หลักในช่องด้านบนแล้วกดปุ่ม Enter
              </p>
              <div className="mt-2 flex items-center justify-center sm:justify-start gap-1.5 text-sm text-slate-500 font-medium">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>รหัสนักศึกษาประกอบด้วยตัวเลข 10 หลัก สามารถพิมพ์ต่อเนื่องได้ทันที</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notification */}
      {feedback.type && feedback.message && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-toast-up">
          <div
            className={`flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border text-base sm:text-lg font-bold transition-all ${
              feedback.type === 'success'
                ? 'bg-slate-900 text-white border-emerald-500'
                : 'bg-slate-900 text-slate-100 border-amber-500'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 text-amber-400 shrink-0" />
            )}
            <span className="tracking-wide whitespace-nowrap">{feedback.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

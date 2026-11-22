import React, { useState, useMemo, useEffect } from 'react';
import { Download, Search, Clock, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { AccessLogItem } from '../types';

interface Props {
  logs: AccessLogItem[];
  onRefresh?: () => void;
  apiBaseUrl: string;
}

export const RecentLogsTable: React.FC<Props> = React.memo(({ logs, apiBaseUrl }) => {
  const [search, setSearch] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter logs by search term
  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter((log) => {
      const code = (log.student_code || '').toLowerCase();
      const fac = (log.faculty || '').toLowerCase();
      const dept = (log.department || '').toLowerCase();
      const year = (log.entry_year || '').toLowerCase();
      const study = (log.study_year || '').toLowerCase();
      const degree = (log.degree_level || '').toLowerCase();
      return (
        code.includes(q) ||
        fac.includes(q) ||
        dept.includes(q) ||
        year.includes(q) ||
        study.includes(q) ||
        degree.includes(q)
      );
    });
  }, [logs, search]);

  // Reset to page 1 whenever search query or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, pageSize]);

  // Pagination metrics
  const totalItems = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Auto-clamp currentPage if it exceeds totalPages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentLogs = useMemo(
    () => filteredLogs.slice(startIndex, endIndex),
    [filteredLogs, startIndex, endIndex]
  );

  // Generate pagination items
  const paginationItems = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const items: (number | string)[] = [];
    if (currentPage <= 3) {
      items.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      items.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      items.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return items;
  }, [currentPage, totalPages]);

  const handleExportCsv = () => {
    const url = `${apiBaseUrl}/api/v1/logs/export/csv`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header & Controls Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-slate-100 text-slate-700">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                ประวัติการเข้าใช้งานห้องสมุดล่าสุด
              </h3>
              <p className="text-base text-slate-500 font-medium mt-0.5">
                รายการบันทึกเวลาที่สแกนบัตรนักศึกษาเรียงตามลำดับล่าสุด ({totalItems} รายการ)
              </p>
            </div>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 sm:flex-initial min-w-[280px]">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาด้วยรหัส คณะ หรือสาขา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 text-base text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 placeholder:text-slate-400 transition-all"
            />
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="จำนวนรายการต่อหน้า"
              className="py-3 px-4 text-base text-slate-700 font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 transition-all cursor-pointer"
            >
              <option value={10}>10 รายการ / หน้า</option>
              <option value={20}>20 รายการ / หน้า</option>
              <option value={50}>50 รายการ / หน้า</option>
              <option value={100}>100 รายการ / หน้า</option>
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2.5 px-5 py-3 text-base font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-all shadow-2xs active:scale-95"
            title="ดาวน์โหลดไฟล์สรุปข้อมูล CSV สำหรับเปิดใน Excel หรือ Google Sheets"
          >
            <Download className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/80 text-slate-700 text-sm sm:text-base font-bold">
              <th className="py-4 px-5">เวลาเข้า</th>
              <th className="py-4 px-5">รหัสนักศึกษา</th>
              <th className="py-4 px-5 text-center">ชั้นปี</th>
              <th className="py-4 px-5">คณะ</th>
              <th className="py-4 px-5">สาขาวิชา</th>
              <th className="py-4 px-5 text-center">ปีที่เข้า</th>
              <th className="py-4 px-5">ระดับหลักสูตร</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800 text-base">
            {currentLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
                    <Users className="w-10 h-10 stroke-[1.5]" />
                    <p className="text-base font-medium">
                      {search ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีประวัติการสแกนในระบบ'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              currentLogs.map((log) => {
                const timeString = log.access_time
                  ? new Date(log.access_time).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : '-';

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-blue-50/40 transition-colors"
                  >
                    {/* เวลาเข้า */}
                    <td className="py-4 px-5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                      {timeString} น.
                    </td>

                    {/* รหัสนักศึกษา */}
                    <td className="py-4 px-5 font-mono font-bold text-slate-900 text-lg whitespace-nowrap">
                      {log.student_code}
                    </td>

                    {/* ชั้นปี */}
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      {log.study_year && log.study_year !== '-' ? (
                        <span className="inline-flex items-center px-3.5 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {log.study_year}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-semibold">-</span>
                      )}
                    </td>

                    {/* คณะ */}
                    <td className="py-4 px-5 font-semibold text-slate-800">
                      {log.faculty || '-'}
                    </td>

                    {/* สาขาวิชา */}
                    <td className="py-4 px-5 text-slate-600 font-medium">
                      {log.department || '-'}
                    </td>

                    {/* ปีที่เข้า */}
                    <td className="py-4 px-5 text-center font-mono text-slate-600 whitespace-nowrap">
                      {log.entry_year ? `พ.ศ. ${log.entry_year}` : '-'}
                    </td>

                    {/* ระดับหลักสูตร */}
                    <td className="py-4 px-5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold bg-slate-100 text-slate-700">
                        {log.degree_level || '-'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
          <p className="text-base text-slate-600 font-medium">
            แสดง <span className="font-bold text-slate-900">{startIndex + 1}</span> ถึง{' '}
            <span className="font-bold text-slate-900">{endIndex}</span> จากทั้งหมด{' '}
            <span className="font-bold text-slate-900">{totalItems}</span> รายการ
          </p>

          <div className="flex items-center gap-1.5">
            {/* Previous Page Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="หน้าก่อนหน้า"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Page Number Buttons */}
            {paginationItems.map((item, idx) => {
              if (item === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-10 h-10 flex items-center justify-center text-slate-400 font-bold"
                  >
                    …
                  </span>
                );
              }
              const pageNum = Number(item);
              const isActive = pageNum === currentPage;
              return (
                <button
                  key={`page-${pageNum}`}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-10 h-10 rounded-xl text-base font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {/* Next Page Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="หน้าถัดไป"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

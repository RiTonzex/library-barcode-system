import React, { useState, useMemo, useEffect } from 'react';
import { Download, Search, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
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

  // Generate pagination items: e.g. [1, 2, 3, '...', 15] or [1, '...', 4, 5, 6, '...', 15]
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
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-blue-600 shrink-0" />
            <span>ประวัติการเข้าใช้งานห้องสมุดล่าสุด</span>
          </h3>
          <p className="text-sm text-slate-500 mt-1 font-medium">
            รายการบันทึกเวลาที่สแกนบัตรนักศึกษาเรียงตามลำดับล่าสุด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาด้วยรหัส คณะ หรือสาขา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-60 sm:w-72 pl-10 pr-4 py-2.5 text-sm sm:text-base bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 focus:bg-white transition-all"
            />
          </div>

          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3.5 py-2.5 text-sm sm:text-base font-semibold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-blue-600 transition-all cursor-pointer"
          >
            <option value={10}>10 รายการ / หน้า</option>
            <option value={20}>20 รายการ / หน้า</option>
            <option value={50}>50 รายการ / หน้า</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 text-sm sm:text-base font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors shadow-2xs active:scale-95"
            title="ดาวน์โหลดข้อมูลประวัติการสแกนเป็นไฟล์ CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm sm:text-base">
          <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">เวลา</th>
              <th className="py-3.5 px-4">รหัสนักศึกษา</th>
              <th className="py-3.5 px-4">ชั้นปี</th>
              <th className="py-3.5 px-4">คณะ</th>
              <th className="py-3.5 px-4">สาขาวิชา</th>
              <th className="py-3.5 px-4">ปีที่เข้า</th>
              <th className="py-3.5 px-4">ระดับหลักสูตร</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {currentLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 text-base font-medium">
                  {search.trim() ? 'ไม่พบข้อมูลที่ตรงกับคำค้นหา' : 'ยังไม่มีประวัติการสแกนในระบบ'}
                </td>
              </tr>
            ) : (
              currentLogs.map((log) => {
                let formattedTime = '-';
                try {
                  formattedTime = new Date(log.access_time).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });
                } catch {}

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 text-slate-700 font-mono whitespace-nowrap">
                      {formattedTime} น.
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-base">
                      {log.student_code || '-'}
                    </td>

                    <td className="py-3.5 px-4">
                      {log.study_year && log.study_year !== '-' ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs sm:text-sm font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {log.study_year}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {log.faculty || '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-800">
                      {log.department || '-'}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-700">
                      {log.entry_year ? `พ.ศ. ${log.entry_year}` : '-'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 text-xs sm:text-sm">
                      {log.degree_level || '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        {/* Count Summary */}
        <div className="text-sm sm:text-base text-slate-600 font-medium">
          {totalItems > 0 ? (
            <>
              แสดง <span className="font-bold text-slate-900">{startIndex + 1}</span> -{' '}
              <span className="font-bold text-slate-900">{endIndex}</span> จากทั้งหมด{' '}
              <span className="font-bold text-blue-700">{totalItems}</span> รายการ
            </>
          ) : (
            '0 รายการ'
          )}
        </div>

        {/* Page Controls */}
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>ก่อนหน้า</span>
            </button>

            {/* Page Number Buttons */}
            <div className="flex items-center gap-1">
              {paginationItems.map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <span key={`dots-${idx}`} className="px-2 text-slate-400 font-bold text-base">
                      ...
                    </span>
                  );
                }

                const isActive = item === currentPage;
                return (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl text-sm sm:text-base font-bold transition-all flex items-center justify-center ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-200 text-slate-700 border border-slate-200 active:scale-95'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs active:scale-95"
            >
              <span>ถัดไป</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

import os
import sqlite3
from datetime import datetime, date, time as dtime
from typing import List, Dict, Any, Optional
import pytz
from app.core.config import settings

# ตำแหน่งจัดเก็บฐานข้อมูลแคชในเครื่อง (Local Cache) เพื่อให้รันได้ 100% โดยไม่ต้องพึ่ง Database Server
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DATA_DIR, exist_ok=True)
DB_PATH = os.path.join(DATA_DIR, "local_cache.db")


class LocalStorageService:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS access_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    student_code TEXT,
                    entry_year TEXT,
                    study_year TEXT,
                    degree_level TEXT,
                    faculty TEXT,
                    department TEXT,
                    access_time TEXT,
                    status TEXT DEFAULT 'RECORDED',
                    card_uid TEXT
                );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_access_time ON access_logs (access_time DESC);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_student_code ON access_logs (student_code);")
            conn.commit()

    def add_log(
        self,
        student_code: str,
        entry_year: str,
        study_year: str,
        degree_level: str,
        faculty: str,
        department: str,
        access_time: str,
        status: str = "RECORDED",
        card_uid: Optional[str] = None
    ) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO access_logs (
                    student_code, entry_year, study_year, degree_level, 
                    faculty, department, access_time, status, card_uid
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                student_code, entry_year, study_year, degree_level,
                faculty, department, access_time, status, card_uid or student_code
            ))
            conn.commit()
            new_id = cursor.lastrowid
            return {
                "id": new_id,
                "student_code": student_code,
                "entry_year": entry_year,
                "study_year": study_year,
                "degree_level": degree_level,
                "faculty": faculty,
                "department": department,
                "access_time": access_time,
                "status": status,
            }

    def list_logs(
        self,
        student_code: Optional[str] = None,
        study_year: Optional[str] = None,
        faculty: Optional[str] = None,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM access_logs WHERE 1=1"
        params = []

        if student_code:
            query += " AND student_code LIKE ?"
            params.append(f"%{student_code.strip()}%")
        if study_year:
            query += " AND study_year LIKE ?"
            params.append(f"%{study_year.strip()}%")
        if faculty:
            query += " AND faculty LIKE ?"
            params.append(f"%{faculty.strip()}%")
        if from_date:
            query += " AND access_time >= ?"
            params.append(f"{from_date.isoformat()}T00:00:00")
        if to_date:
            query += " AND access_time <= ?"
            params.append(f"{to_date.isoformat()}T23:59:59")

        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def export_all_logs(
        self,
        from_date: Optional[date] = None,
        to_date: Optional[date] = None,
        limit: int = 5000
    ) -> List[Dict[str, Any]]:
        query = "SELECT * FROM access_logs WHERE 1=1"
        params = []

        if from_date:
            query += " AND access_time >= ?"
            params.append(f"{from_date.isoformat()}T00:00:00")
        if to_date:
            query += " AND access_time <= ?"
            params.append(f"{to_date.isoformat()}T23:59:59")

        query += " ORDER BY id DESC LIMIT ?"
        params.append(limit)

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_today_dashboard_stats(self) -> Dict[str, Any]:
        tz = pytz.timezone(settings.CRON_TIMEZONE)
        now_tz = datetime.now(tz)
        today_str = now_tz.strftime("%Y-%m-%d")

        start_time = f"{today_str}T00:00:00"
        end_time = f"{today_str}T23:59:59"

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 1. Total Visits Today
            cursor.execute("SELECT COUNT(*) FROM access_logs WHERE access_time >= ? AND access_time <= ?", (start_time, end_time))
            total_scans = cursor.fetchone()[0] or 0

            # 2. Unique Students Today
            cursor.execute("SELECT COUNT(DISTINCT student_code) FROM access_logs WHERE access_time >= ? AND access_time <= ? AND student_code IS NOT NULL", (start_time, end_time))
            unique_students = cursor.fetchone()[0] or 0

            # 3. Hourly Distribution (08:00 - 16:00)
            cursor.execute("""
                SELECT substr(access_time, 12, 2) as hr, COUNT(*)
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ?
                GROUP BY hr
            """, (start_time, end_time))
            hourly_raw = dict(cursor.fetchall())

            hourly_distribution = []
            peak_count = 0
            peak_hour_str = "N/A"

            for h in range(8, 17):
                h_str = f"{h:02d}"
                c = hourly_raw.get(h_str, 0)
                hour_label = f"{h_str}:00"
                hourly_distribution.append({"hour": hour_label, "count": c})
                if c > peak_count:
                    peak_count = c
                    peak_hour_str = f"{h_str}:00 - {h+1:02d}:00"

            # 4. Faculty Distribution
            cursor.execute("""
                SELECT coalesce(faculty, 'อื่นๆ') as fac, COUNT(*) as cnt
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ?
                GROUP BY fac
                ORDER BY cnt DESC
            """, (start_time, end_time))
            faculty_rows = cursor.fetchall()
            faculty_distribution = [{"name": r[0], "count": r[1]} for r in faculty_rows]
            top_faculty = f"{faculty_rows[0][0]} ({faculty_rows[0][1]} ครั้ง)" if faculty_rows else "-"

            # 5. Year Level Distribution
            cursor.execute("""
                SELECT coalesce(study_year, 'ไม่ระบุ') as yr, COUNT(*) as cnt
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ?
                GROUP BY yr
                ORDER BY cnt DESC
            """, (start_time, end_time))
            year_rows = cursor.fetchall()
            year_distribution = [{"year": r[0], "count": r[1]} for r in year_rows]
            top_year_level = f"{year_rows[0][0]} ({year_rows[0][1]} ครั้ง)" if year_rows else "-"

            return {
                "today_total_scans": total_scans,
                "today_granted_scans": total_scans,
                "today_denied_scans": 0,
                "today_unique_students": unique_students,
                "peak_hour": peak_hour_str,
                "top_year_level": top_year_level,
                "top_faculty": top_faculty,
                "hourly_distribution": hourly_distribution,
                "faculty_distribution": faculty_distribution,
                "year_distribution": year_distribution,
                "last_updated": now_tz.isoformat()
            }

    def get_summary_for_sheets(self, target_date: Optional[date] = None) -> Dict[str, Any]:
        tz = pytz.timezone(settings.CRON_TIMEZONE)
        if target_date is None:
            target_date = datetime.now(tz).date()

        date_str = target_date.strftime("%Y-%m-%d")
        start_time = f"{date_str}T00:00:00"
        end_time = f"{date_str}T23:59:59"

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Total visits & Unique
            cursor.execute("SELECT COUNT(*) FROM access_logs WHERE access_time >= ? AND access_time <= ?", (start_time, end_time))
            total_visits = cursor.fetchone()[0] or 0

            cursor.execute("SELECT COUNT(DISTINCT student_code) FROM access_logs WHERE access_time >= ? AND access_time <= ?", (start_time, end_time))
            unique_students = cursor.fetchone()[0] or 0

            avg_per_student = round(total_visits / unique_students, 2) if unique_students > 0 else 0.0

            # Peak hour
            cursor.execute("""
                SELECT substr(access_time, 12, 2) as hr, COUNT(*) as cnt
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ?
                GROUP BY hr
                ORDER BY cnt DESC
                LIMIT 1
            """, (start_time, end_time))
            peak_row = cursor.fetchone()
            if peak_row:
                h = int(peak_row[0])
                peak_hour_str = f"{h:02d}:00 - {h+1:02d}:00"
            else:
                peak_hour_str = "-"

            # Faculty breakdown
            cursor.execute("""
                SELECT faculty, COUNT(*) as cnt
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ? AND faculty IS NOT NULL
                GROUP BY faculty
                ORDER BY cnt DESC
            """, (start_time, end_time))
            fac_rows = cursor.fetchall()
            faculty_breakdown = {r[0]: r[1] for r in fac_rows}
            top_faculty = f"{fac_rows[0][0]} ({fac_rows[0][1]} ครั้ง)" if fac_rows else "-"

            # Year level breakdown
            cursor.execute("""
                SELECT study_year, COUNT(*) as cnt
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ? AND study_year IS NOT NULL
                GROUP BY study_year
                ORDER BY cnt DESC
            """, (start_time, end_time))
            yr_rows = cursor.fetchall()
            year_level_breakdown = {r[0]: r[1] for r in yr_rows}
            top_year_level = f"{yr_rows[0][0]} ({yr_rows[0][1]} ครั้ง)" if yr_rows else "-"

            year_1 = year_level_breakdown.get("ปี 1", 0)
            year_2 = year_level_breakdown.get("ปี 2", 0)
            year_3 = year_level_breakdown.get("ปี 3", 0)
            year_4 = year_level_breakdown.get("ปี 4", 0)
            year_other = sum(v for k, v in year_level_breakdown.items() if k not in ["ปี 1", "ปี 2", "ปี 3", "ปี 4"])

            # Degree breakdown
            cursor.execute("""
                SELECT degree_level, COUNT(*) as cnt
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ? AND degree_level IS NOT NULL
                GROUP BY degree_level
                ORDER BY cnt DESC
            """, (start_time, end_time))
            deg_rows = cursor.fetchall()
            degree_breakdown = {r[0]: r[1] for r in deg_rows}
            degree_regular = degree_breakdown.get("ภาคปกติ", 0)
            degree_special = degree_breakdown.get("กศ.บป.", 0)
            degree_postgrad = degree_breakdown.get("ปริญญาโท และ ปริญญาเอก", 0)

            # Department breakdown
            cursor.execute("""
                SELECT department, COUNT(*) as cnt
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ? AND department IS NOT NULL
                GROUP BY department
                ORDER BY cnt DESC
            """, (start_time, end_time))
            dept_rows = cursor.fetchall()
            department_breakdown = {r[0]: r[1] for r in dept_rows}
            top_department = f"{dept_rows[0][0]} ({dept_rows[0][1]} ครั้ง)" if dept_rows else "-"

            # Hourly breakdown
            cursor.execute("""
                SELECT substr(access_time, 12, 2) as hr, COUNT(*)
                FROM access_logs
                WHERE access_time >= ? AND access_time <= ?
                GROUP BY hr
                ORDER BY hr
            """, (start_time, end_time))
            hourly_res = cursor.fetchall()
            hourly_breakdown = {f"{r[0]}:00": r[1] for r in hourly_res}

            morning_visits = sum(hourly_breakdown.get(f"{h:02d}:00", 0) for h in range(8, 12))
            afternoon_visits = sum(hourly_breakdown.get(f"{h:02d}:00", 0) for h in range(12, 17))
            evening_visits = sum(hourly_breakdown.get(f"{h:02d}:00", 0) for h in range(17, 24))
            night_visits = total_visits - (morning_visits + afternoon_visits + evening_visits)
            if night_visits < 0:
                night_visits = 0

            return {
                "summary_date": date_str,
                "total_visits": total_visits,
                "unique_students": unique_students,
                "avg_per_student": avg_per_student,
                "peak_hour": peak_hour_str,
                "year_1": year_1,
                "year_2": year_2,
                "year_3": year_3,
                "year_4": year_4,
                "year_other": year_other,
                "top_year_level": top_year_level,
                "degree_regular": degree_regular,
                "degree_special": degree_special,
                "degree_postgrad": degree_postgrad,
                "top_faculty": top_faculty,
                "top_department": top_department,
                "morning_visits": morning_visits,
                "afternoon_visits": afternoon_visits,
                "evening_visits": evening_visits,
                "night_visits": night_visits,
                "year_level_breakdown": year_level_breakdown,
                "faculty_breakdown": faculty_breakdown,
                "department_breakdown": department_breakdown,
                "degree_breakdown": degree_breakdown,
                "hourly_breakdown": hourly_breakdown,
            }


storage_service = LocalStorageService()


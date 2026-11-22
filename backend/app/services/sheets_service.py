import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings

logger = logging.getLogger("sheets_service")


class GoogleSheetsService:
    def __init__(self):
        self.webhook_url = settings.GOOGLE_SHEET_WEBHOOK_URL.strip()
        if self.webhook_url:
            logger.info("Google Sheets Sync: Active via Google Apps Script Web App.")
        else:
            logger.warning("GOOGLE_SHEET_WEBHOOK_URL is not configured in .env.")

    def append_attendance_log(
        self,
        timestamp: str,
        student_code: str,
        entry_year: str,
        study_year: str,
        degree_level: str,
        faculty: str,
        department: str,
    ):
        """
        บันทึกข้อมูลการเข้าห้องสมุดไปยัง Google Sheets (Non-blocking):
        วัน-เวลา, รหัสนักศึกษา, ชั้นปี, ปีการศึกษา, ระดับหลักสูตร, คณะ, สาขาวิชา
        """
        if not self.webhook_url:
            return

        data_payload = {
            "timestamp": timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "student_code": student_code or "-",
            "study_year": study_year or "-",
            "entry_year": entry_year or "-",
            "degree_level": degree_level or "-",
            "faculty": faculty or "-",
            "department": department or "-",
        }

        try:
            with httpx.Client(timeout=10.0, follow_redirects=True) as client:
                resp = client.post(
                    self.webhook_url,
                    json={"action": "APPEND_LOG", "data": data_payload}
                )
                if resp.status_code == 200:
                    logger.debug(f"Logged attendance to Google Sheets: {student_code}")
                else:
                    logger.warning(f"Google Sheets responded with {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"Error calling Google Sheets webhook: {e}")

    def sync_daily_summary(
        self,
        summary_date: str,
        total_visits: int,
        unique_students: int,
        avg_per_student: float = 0.0,
        peak_hour: str = "-",
        year_1: int = 0,
        year_2: int = 0,
        year_3: int = 0,
        year_4: int = 0,
        year_other: int = 0,
        top_year_level: str = "-",
        degree_regular: int = 0,
        degree_special: int = 0,
        degree_postgrad: int = 0,
        top_faculty: str = "-",
        top_department: str = "-",
        morning_visits: int = 0,
        afternoon_visits: int = 0,
        evening_visits: int = 0,
        night_visits: int = 0,
        year_level_breakdown: dict = None,
        faculty_breakdown: dict = None,
        department_breakdown: dict = None,
        degree_breakdown: dict = None,
        hourly_breakdown: dict = None,
    ) -> bool:
        """ซิงก์สรุปยอดประจำวันแบบครอบคลุมและสวยงามไปยัง Google Sheets"""
        if not self.webhook_url:
            return False

        data_payload = {
            "summary_date": summary_date,
            "total_visits": total_visits,
            "unique_students": unique_students,
            "avg_per_student": avg_per_student,
            "peak_hour": peak_hour or "-",
            "year_1": year_1,
            "year_2": year_2,
            "year_3": year_3,
            "year_4": year_4,
            "year_other": year_other,
            "top_year_level": top_year_level or "-",
            "degree_regular": degree_regular,
            "degree_special": degree_special,
            "degree_postgrad": degree_postgrad,
            "top_faculty": top_faculty or "-",
            "top_department": top_department or "-",
            "morning_visits": morning_visits,
            "afternoon_visits": afternoon_visits,
            "evening_visits": evening_visits,
            "night_visits": night_visits,
            "year_level_breakdown": year_level_breakdown or {},
            "faculty_breakdown": faculty_breakdown or {},
            "department_breakdown": department_breakdown or {},
            "degree_breakdown": degree_breakdown or {},
            "hourly_breakdown": hourly_breakdown or {},
        }

        try:
            with httpx.Client(timeout=15.0, follow_redirects=True) as client:
                resp = client.post(
                    self.webhook_url,
                    json={"action": "SYNC_DAILY_SUMMARY", "data": data_payload}
                )
                if resp.status_code == 200:
                    logger.info(f"Daily summary synced to Google Sheets for {summary_date}")
                    return True
                else:
                    logger.warning(f"Google Sheets summary error: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"Error syncing daily summary to Google Sheets: {e}")

        return False


sheets_service = GoogleSheetsService()

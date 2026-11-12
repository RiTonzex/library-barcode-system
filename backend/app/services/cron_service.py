import logging
from datetime import datetime, date
from typing import Optional
import pytz
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.config import settings
from app.services.storage_service import storage_service
from app.services.sheets_service import sheets_service

logger = logging.getLogger("cron_service")
scheduler = AsyncIOScheduler()


async def aggregate_daily_summary(target_date: Optional[date] = None) -> bool:
    """
    สรุปสถิติผู้เข้าใช้ประจำวัน และส่งรายงานแบบ Executive Dashboard ขึ้น Google Sheets อัตโนมัติ
    """
    tz = pytz.timezone(settings.CRON_TIMEZONE)
    if target_date is None:
        target_date = datetime.now(tz).date()

    logger.info(f"Starting daily attendance summary calculation for {target_date}")

    try:
        data = storage_service.get_summary_for_sheets(target_date)

        # ส่งขึ้น Google Sheets ทันที
        synced = sheets_service.sync_daily_summary(
            summary_date=data["summary_date"],
            total_visits=data["total_visits"],
            unique_students=data["unique_students"],
            avg_per_student=data["avg_per_student"],
            peak_hour=data["peak_hour"],
            year_1=data["year_1"],
            year_2=data["year_2"],
            year_3=data["year_3"],
            year_4=data["year_4"],
            year_other=data["year_other"],
            top_year_level=data["top_year_level"],
            degree_regular=data["degree_regular"],
            degree_special=data["degree_special"],
            degree_postgrad=data["degree_postgrad"],
            top_faculty=data["top_faculty"],
            top_department=data["top_department"],
            morning_visits=data["morning_visits"],
            afternoon_visits=data["afternoon_visits"],
            evening_visits=data["evening_visits"],
            night_visits=data["night_visits"],
            year_level_breakdown=data["year_level_breakdown"],
            faculty_breakdown=data["faculty_breakdown"],
            department_breakdown=data["department_breakdown"],
            degree_breakdown=data["degree_breakdown"],
            hourly_breakdown=data["hourly_breakdown"]
        )

        logger.info(f"Daily summary sync for {target_date} -> Google Sheets: {'SUCCESS' if synced else 'FAILED'}")
        return synced

    except Exception as e:
        logger.error(f"Error aggregating daily summary: {e}", exc_info=True)
        return False


def start_scheduler():
    tz = pytz.timezone(settings.CRON_TIMEZONE)
    # ส่งยอดสรุปประจำวันอัตโนมัติเวลา 16:30 น. หลังห้องสมุดปิดทำการ (16:00 น.)
    trigger = CronTrigger(hour=16, minute=30, timezone=tz)
    scheduler.add_job(
        aggregate_daily_summary,
        trigger=trigger,
        id="daily_sheets_summary_job",
        replace_existing=True
    )
    scheduler.start()
    logger.info("APScheduler started: Daily summary at 16:30 Asia/Bangkok (auto send daily stats to Google Sheets).")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)

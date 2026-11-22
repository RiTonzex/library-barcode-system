from fastapi import APIRouter, status
from app.schemas.stats import DashboardStats, HourlyStat, FacultyStat, YearLevelStat
from app.services.storage_service import storage_service
from app.services.cron_service import aggregate_daily_summary

router = APIRouter()


@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats():
    """
    สรุปสถิติผู้เข้าใช้ห้องสมุดประจำวัน:
    - ยอดคนเข้าวันนี้
    - จำนวนนักศึกษาไม่ซ้ำคน
    - ช่วงเวลาพีค (Peak Hour)
    - สถิติรายชั่วโมง (08:00 - 16:00)
    - สัดส่วนแยกตามคณะ
    - สัดส่วนแยกตามชั้นปี
    """
    raw_stats = storage_service.get_today_dashboard_stats()

    return DashboardStats(
        today_total_scans=raw_stats["today_total_scans"],
        today_granted_scans=raw_stats["today_granted_scans"],
        today_denied_scans=raw_stats["today_denied_scans"],
        today_unique_students=raw_stats["today_unique_students"],
        peak_hour=raw_stats["peak_hour"],
        top_year_level=raw_stats["top_year_level"],
        top_faculty=raw_stats["top_faculty"],
        hourly_distribution=[HourlyStat(**h) for h in raw_stats["hourly_distribution"]],
        faculty_distribution=[FacultyStat(**f) for f in raw_stats["faculty_distribution"]],
        year_distribution=[YearLevelStat(**y) for y in raw_stats["year_distribution"]],
        last_updated=raw_stats["last_updated"]
    )


@router.post("/sync-sheets-now", status_code=status.HTTP_200_OK)
async def trigger_sheets_sync_now():
    """สั่งสรุปยอดประจำวันและส่งรายงานขึ้น Google Sheets ทันที"""
    success = await aggregate_daily_summary()
    return {
        "status": "SUCCESS" if success else "WARNING",
        "message": "ส่งข้อมูลสรุปรายงานประจำวันขึ้น Google Sheets เรียบร้อยแล้ว" if success else "ซิงก์รายงานไม่สำเร็จ (โปรดตรวจสอบ GOOGLE_SHEET_WEBHOOK_URL ใน .env)"
    }

import csv
import io
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Query, Response

from app.services.storage_service import storage_service

router = APIRouter()


@router.get("/")
async def list_access_logs(
    student_code: Optional[str] = None,
    study_year: Optional[str] = None,
    faculty: Optional[str] = None,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    """ดึงรายการประวัติการสแกนเข้าห้องสมุด"""
    logs = storage_service.list_logs(
        student_code=student_code,
        study_year=study_year,
        faculty=faculty,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
        offset=offset
    )

    return [
        {
            "id": log["id"],
            "student_code": log["student_code"],
            "entry_year": log["entry_year"],
            "study_year": log["study_year"] or "ปี 1",
            "degree_level": log["degree_level"],
            "faculty": log["faculty"],
            "department": log["department"],
            "access_time": log["access_time"],
            "status": log["status"],
        }
        for log in logs
    ]


@router.get("/export/csv")
async def export_logs_csv(
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
):
    """ดาวน์โหลดประวัติการเข้าเป็นไฟล์ CSV/Excel (UTF-8 with BOM สำหรับภาษาไทย)"""
    logs = storage_service.export_all_logs(
        from_date=from_date,
        to_date=to_date,
        limit=5000
    )

    output_stream = io.StringIO()
    writer = csv.writer(output_stream)
    writer.writerow([
        "ลำดับ", "วัน-เวลาที่เข้า", "รหัสนักศึกษา", "ชั้นปี", "ปีการศึกษา", "ระดับหลักสูตร", "คณะ", "สาขาวิชา"
    ])

    for log in logs:
        writer.writerow([
            log["id"],
            log["access_time"] or "",
            log["student_code"] or "",
            log["study_year"] or "",
            log["entry_year"] or "",
            log["degree_level"] or "",
            log["faculty"] or "",
            log["department"] or "",
        ])

    csv_data = output_stream.getvalue().encode("utf-8-sig")
    filename = f"library_attendance_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

from datetime import datetime
import time
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Body
from zoneinfo import ZoneInfo

from app.core.security import verify_device_api_key
from app.core.websocket import ws_manager
from app.schemas.scan import BarcodeScanRequest, ScanResponse, HeartbeatRequest, HeartbeatResponse
from app.services.decoder_service import decode_student_barcode
from app.services.sheets_service import sheets_service
from app.services.storage_service import storage_service

router = APIRouter()

latest_device_heartbeat: Dict[str, Any] = {
    "device_id": "ESP32_BARCODE_01",
    "ip_address": None,
    "rssi": None,
    "free_heap": None,
    "uptime_sec": None,
    "last_seen": None,
    "is_online": False,
}


@router.post(
    "/barcode",
    response_model=ScanResponse,
    status_code=status.HTTP_200_OK,
    summary="สแกนบาร์โค้ดนักศึกษา เพื่อบันทึกสถิติและซิงก์ Google Sheets"
)
async def scan_student_barcode(
    payload: BarcodeScanRequest,
    background_tasks: BackgroundTasks,
    _api_key: str = Depends(verify_device_api_key)
):
    """
    รับรหัสบาร์โค้ดนักศึกษา:
    1. ตรวจสอบความถูกต้องและถอดรหัส (ชั้นปี, คณะ, สาขา)
    2. หากไม่ถูกต้อง: ปฏิเสธการบันทึกทันที และไม่ส่งข้อมูลใดๆ
    3. หากถูกต้อง: บันทึก Local Cache, ส่งขึ้น Google Sheets และ Broadcast สด
    """
    bkk_tz = ZoneInfo("Asia/Bangkok")
    now_dt = datetime.now(bkk_tz)
    now_iso = now_dt.isoformat()
    raw_code = payload.barcode.strip()

    # 1. ถอดรหัสและตรวจสอบความถูกต้องตามเกณฑ์
    decoded = decode_student_barcode(raw_code, now_dt.date())

    # ❌ กรณีข้อมูลไม่ถูกต้อง / เกิน 10 หลัก / ไม่ตรงตามเกณฑ์ (ปฏิเสธและไม่บันทึกข้อมูลใดๆ)
    if not decoded.get("is_valid", False):
        error_reason = decoded.get("error_reason", "ข้อมูลไม่ถูกต้องตามรูปแบบ")

        # ส่งคำตอบกลับแจ้งว่า INVALID โดยไม่บันทึกและไม่แสดงผลข้อมูลนักศึกษา
        return ScanResponse(
            status="INVALID",
            student_code=raw_code,
            entry_year="-",
            study_year="ข้อมูลไม่ถูกต้อง",
            degree_level="ไม่ตรงรูปแบบ",
            faculty="ข้อมูลไม่ถูกต้อง",
            department=error_reason,
            access_time=now_iso,
            message=f"ปฏิเสธการบันทึก: {error_reason}"
        )

    # ✅ กรณีข้อมูลถูกต้องตามรูปแบบ 10 หลัก
    student_code = decoded["student_code"]
    entry_year = decoded["entry_year"]
    study_year = decoded["study_year"]
    degree_level = decoded["degree_level"]
    faculty = decoded["faculty"]
    department = decoded["department"]

    # 2. บันทึกลง Local Cache
    storage_service.add_log(
        student_code=student_code,
        entry_year=entry_year,
        study_year=study_year,
        degree_level=degree_level,
        faculty=faculty,
        department=department,
        access_time=now_iso,
        status="RECORDED",
        card_uid=student_code
    )

    # 3. Broadcast ไปยังจอ Dashboard ทันทีผ่าน WebSocket เฉพาะรายการที่ถูกต้อง
    broadcast_data = {
        "event": "NEW_SCAN",
        "data": {
            "student_code": student_code,
            "entry_year": entry_year,
            "study_year": study_year,
            "degree_level": degree_level,
            "faculty": faculty,
            "department": department,
            "access_time": now_iso,
            "status": "RECORDED",
            "message": "บันทึกข้อมูลเข้าห้องสมุดสำเร็จ"
        }
    }
    try:
        await ws_manager.broadcast(broadcast_data)
    except Exception:
        pass

    # 4. ซิงก์ขึ้น Google Sheets (วัน-เวลา, รหัสนักศึกษา, ชั้นปี, ปีการศึกษา, ระดับหลักสูตร, คณะ, สาขาวิชา)
    background_tasks.add_task(
        sheets_service.append_attendance_log,
        timestamp=now_dt.strftime("%Y-%m-%d %H:%M:%S"),
        student_code=student_code,
        entry_year=entry_year,
        study_year=study_year,
        degree_level=degree_level,
        faculty=faculty,
        department=department
    )

    return ScanResponse(
        status="RECORDED",
        student_code=student_code,
        entry_year=entry_year,
        study_year=study_year,
        degree_level=degree_level,
        faculty=faculty,
        department=department,
        access_time=now_iso,
        message="บันทึกข้อมูลเข้า Google Sheets สำเร็จ"
    )


# รองรับการเรียกผ่าน /card เพื่อความเข้ากันได้ย้อนหลัง
@router.post("/card", response_model=ScanResponse, status_code=status.HTTP_200_OK)
async def scan_card_legacy(
    background_tasks: BackgroundTasks,
    payload: Dict[str, Any] = Body(...),
    _api_key: str = Depends(verify_device_api_key)
):
    code = payload.get("barcode") or payload.get("card_uid") or "6812732119"
    req = BarcodeScanRequest(barcode=str(code))
    return await scan_student_barcode(req, background_tasks, _api_key)


@router.post("/heartbeat", response_model=HeartbeatResponse)
async def edge_heartbeat(
    payload: HeartbeatRequest,
    background_tasks: BackgroundTasks,
    _api_key: str = Depends(verify_device_api_key)
):
    now_iso = datetime.now().isoformat()
    latest_device_heartbeat["device_id"] = payload.device_id
    latest_device_heartbeat["ip_address"] = payload.ip_address
    latest_device_heartbeat["rssi"] = payload.rssi
    latest_device_heartbeat["free_heap"] = payload.free_heap
    latest_device_heartbeat["uptime_sec"] = payload.uptime_sec
    latest_device_heartbeat["last_seen"] = now_iso
    latest_device_heartbeat["is_online"] = True

    background_tasks.add_task(
        ws_manager.broadcast,
        {"event": "DEVICE_HEARTBEAT", "data": latest_device_heartbeat}
    )

    return HeartbeatResponse(status="OK", timestamp=now_iso, message="Heartbeat acknowledged")


@router.get("/device-status")
async def get_device_status():
    last_seen_iso = latest_device_heartbeat.get("last_seen")
    if last_seen_iso:
        last_dt = datetime.fromisoformat(last_seen_iso)
        if (datetime.now() - last_dt).total_seconds() > 120:
            latest_device_heartbeat["is_online"] = False
    else:
        latest_device_heartbeat["is_online"] = False

    return latest_device_heartbeat

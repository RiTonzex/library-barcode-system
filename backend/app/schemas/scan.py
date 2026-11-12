from typing import Optional
from pydantic import BaseModel, Field


class BarcodeScanRequest(BaseModel):
    barcode: str = Field(
        ...,
        pattern=r"^\d{10}$",
        description="รหัสนักศึกษาต้องเป็นตัวเลข 10 หลักเท่านั้น (ห้ามมีตัวอักษรหรืออักขระพิเศษ)",
        example="6812732119"
    )
    gate_code: Optional[str] = Field("MAIN_ENTRANCE", example="MAIN_ENTRANCE")


class ScanResponse(BaseModel):
    status: str = Field("RECORDED", description="Status of attendance recording", example="RECORDED")
    student_code: str = Field(..., example="6812732119")
    entry_year: str = Field(..., example="2568")
    study_year: str = Field(..., example="ปี 2")
    degree_level: str = Field(..., example="ปริญญาตรี (ภาคปกติ)")
    faculty: str = Field(..., example="คณะศิลปศาสตร์และวิทยาศาสตร์")
    department: str = Field(..., example="สาขาวิชาวิทยาการคอมพิวเตอร์")
    access_time: str = Field(..., example="2026-10-31T12:00:00+07:00")
    message: str = Field("บันทึกข้อมูลเข้าห้องสมุดสำเร็จ", example="บันทึกข้อมูลเข้าห้องสมุดสำเร็จ")


class HeartbeatRequest(BaseModel):
    device_id: str = Field(..., example="ESP32_BARCODE_01")
    ip_address: Optional[str] = Field(None, example="192.168.1.120")
    rssi: Optional[int] = Field(None, example=-58)
    free_heap: Optional[int] = Field(None, example=182400)
    uptime_sec: Optional[int] = Field(None, example=3600)


class HeartbeatResponse(BaseModel):
    status: str = "OK"
    timestamp: str
    message: str = "Heartbeat acknowledged"

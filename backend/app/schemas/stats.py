from typing import List, Dict, Optional
from pydantic import BaseModel


class HourlyStat(BaseModel):
    hour: str
    count: int


class FacultyStat(BaseModel):
    name: str
    count: int


class YearLevelStat(BaseModel):
    year: str
    count: int


class DashboardStats(BaseModel):
    today_total_scans: int
    today_granted_scans: int
    today_denied_scans: int
    today_unique_students: int
    peak_hour: str
    top_year_level: Optional[str] = "-"
    top_faculty: Optional[str] = "-"
    hourly_distribution: List[HourlyStat]
    faculty_distribution: List[FacultyStat]
    year_distribution: List[YearLevelStat] = []
    last_updated: str


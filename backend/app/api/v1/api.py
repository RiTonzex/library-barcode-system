from fastapi import APIRouter
from app.api.v1.endpoints import scan, logs, stats

api_router = APIRouter()

api_router.include_router(scan.router, prefix="/scan", tags=["Barcode Scan"])
api_router.include_router(logs.router, prefix="/logs", tags=["Attendance Logs"])
api_router.include_router(stats.router, prefix="/stats", tags=["Dashboard Statistics"])

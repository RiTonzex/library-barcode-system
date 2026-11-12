import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.websocket import ws_manager
from app.api.v1.api import api_router
from app.services.cron_service import start_scheduler, stop_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for startup and shutdown events."""
    logger.info("Initializing Library Access Control System Backend...")
    # 1. Start APScheduler for daily Google Sheets sync
    start_scheduler()
    yield
    # 2. Cleanup resources
    logger.info("Shutting down background services...")
    stop_scheduler()


app = FastAPI(
    title=settings.APP_NAME,
    description="Full-Stack Real-Time Library Access Control System with ESP32 & Google Sheets Sync",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.websocket("/ws/live")
async def websocket_live_stream(websocket: WebSocket):
    """
    WebSocket endpoint for the Admin Dashboard.
    Streams real-time RFID scan alerts, ESP32 heartbeats, and metric updates.
    """
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; accept any client messages (pings)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"event":"pong"}')
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket client error: {e}")
        ws_manager.disconnect(websocket)


@app.get("/health", tags=["System"])
async def health_check():
    """System health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "environment": settings.ENVIRONMENT
    }


@app.get("/", tags=["System"])
async def root():
    return {
        "message": "Library Access Control System API is running.",
        "docs": "/docs",
        "websocket": "/ws/live"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

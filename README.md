# Full-Stack Real-Time Library Access Control System
### ESP32 + FastAPI + Supabase PostgreSQL + React (Vite) + Google Sheets Sync

ระบบควบคุมและบันทึกการแตะบัตรนักศึกษาเข้า-ออกห้องสมุดแบบ Real-time ด้วยฮาร์ดแวร์ ESP32 RFID, Backend สถาปัตยกรรม Async Microservices (FastAPI), ฐานข้อมูล Supabase PostgreSQL, หน้าจอแสดงผลแบบ Kiosk Live Alert (React + Tailwind CSS), และระบบสรุปข้อมูลอัตโนมัติขึ้น Google Sheets (Google Apps Script Web App / Sheets API v4 & APScheduler)

---

## 📁 Project Structure (International Standard)

```text
d:\Product\SCAN_BAR/
├── .gitignore                 # มาตรฐานสากลสำหรับคัดกรอง Secrets (.env), node_modules, .venv, .pio
├── docker-compose.yml         # คำสั่งเดียวรัน Backend และ Frontend ผ่าน Container
├── README.md                  # คู่มือภาพรวม การติดตั้ง และการเชื่อมต่อระบบทั้งหมด
│
├── backend/                   # FastAPI Backend Service (Python 3.11+)
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── scan.py        # /api/v1/scan/card (Edge <200ms) & /heartbeat
│   │   │   │   │   ├── students.py    # CRUD นักศึกษาและบัตร RFID
│   │   │   │   │   ├── logs.py        # Query logs & Export CSV/Excel
│   │   │   │   │   └── stats.py       # สถิติ Dashboard & Manual Sheets Sync
│   │   │   │   └── api.py             # Assembler รวม router v1
│   │   ├── core/
│   │   │   ├── config.py              # Pydantic BaseSettings (.env reader)
│   │   │   ├── security.py            # ตรวจสอบ X-API-KEY (Timing-safe comparison)
│   │   │   └── websocket.py           # ConnectionManager สำหรับ Broadcast Real-time
│   │   ├── db/
│   │   │   ├── base.py                # Base Declarative Class
│   │   │   └── session.py             # SQLAlchemy Async Engine (asyncpg pooler)
│   │   ├── models/
│   │   │   └── models.py              # ORM: Student, Card, Gate, AccessLog, DailySummary
│   │   ├── schemas/
│   │   │   ├── scan.py                # Pydantic Schemas Scan & Heartbeat
│   │   │   ├── student.py             # Pydantic Schemas Student CRUD
│   │   │   ├── log.py                 # Pydantic Schemas AccessLog
│   │   │   └── stats.py               # Pydantic Schemas Dashboard Stats
│   │   ├── services/
│   │   │   ├── sheets_service.py      # Google Sheets Integration (Apps Script / Service Account)
│   │   │   └── cron_service.py        # Cron scheduler สรุปยอด 23:59 น. (APScheduler)
│   │   └── main.py                    # Entry point ของ FastAPI + WebSocket /ws/live
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── .env                           # Config (เชื่อมต่อ Supabase & Sheets สำเร็จแล้ว)
│   └── .env.example
│
├── frontend/                  # React Dashboard (Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/
│   │   │   ├── KioskLiveCard.tsx      # การ์ดแสดงผลบัตรที่แตะทันที (สไตล์มินิมอลสบายตา)
│   │   │   ├── RecentLogsTable.tsx    # ตารางประวัติ 30 รายการล่าสุด + Filter + Export CSV
│   │   │   ├── StatsCharts.tsx        # กราฟ Hourly Traffic & Faculty Donut (Recharts)
│   │   │   ├── DeviceStatusBadge.tsx  # ไฟสถานะ Heartbeat ของ ESP32 และ Server
│   │   │   └── StudentSearchModal.tsx # จัดการนักศึกษา ค้นหา และผูกบัตร RFID
│   │   ├── hooks/
│   │   │   └── useWebSocket.ts        # Custom hook รองรับ Auto-reconnect Backoff
│   │   ├── types/
│   │   │   └── index.ts               # Type Definitions
│   │   ├── App.tsx                    # หน้า Dashboard หลักพร้อมแถบจำลองแตะบัตร
│   │   ├── index.css                  # Google Fonts Sarabun + Clean Theme
│   │   └── main.tsx                   # React Entrypoint
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── index.html
│   ├── Dockerfile
│   ├── .env
│   └── .env.example
│
├── database/
│   └── schema.sql             # SQL Schema พร้อมเปิด RLS, Index และ Seed Data
│
├── google_apps_script/
│   └── Code.gs                # สคริปต์ Google Apps Script (Web App) สำหรับ Google Sheets
│
└── firmware/                  # ESP32 C++ (PlatformIO / Arduino Framework)
    ├── src/
    │   └── main.cpp           # โค้ด ESP32: RFID, Wi-Fi, HTTPS Client, Buzzer, LED, Offline Queue
    ├── platformio.ini
    └── README.md
```

---

## 🚀 Quick Run (เปิดใช้งานระบบ)

### วิธีที่ 1: รันด้วย Terminal ในเครื่อง
```powershell
# 1. รัน Backend
cd d:\Product\SCAN_BAR\backend
& "d:\Product\SCAN_BAR\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. รัน Frontend (เปิด Terminal อีกหน้าต่าง)
cd d:\Product\SCAN_BAR\frontend
npm run dev
```

### วิธีที่ 2: รันด้วย Docker Compose (ระดับ Production)
```bash
docker compose up --build
```
- Backend API: `http://localhost:8000` (Docs: `http://localhost:8000/docs`)
- Frontend Web: `http://localhost:5173`

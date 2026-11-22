-- ==============================================================================
-- DATABASE SCHEMA: LIBRARY ATTENDANCE & ACCESS CONTROL SYSTEM
-- Target: PostgreSQL / Supabase
-- Description: บันทึกข้อมูลการสแกนบาร์โค้ดบัตรนักศึกษา และสรุปยอดสถิติรายวัน
-- ==============================================================================

-- 1. ตารางประตู / จุดสแกน (Gates)
CREATE TABLE IF NOT EXISTS gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gate_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    direction VARCHAR(10) NOT NULL DEFAULT 'IN',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ตารางประวัติการเข้าห้องสมุด (Access Logs)
CREATE TABLE IF NOT EXISTS access_logs (
    id BIGSERIAL PRIMARY KEY,
    student_code VARCHAR(30) NULL,
    entry_year VARCHAR(10) NULL,         -- เช่น "2568"
    study_year VARCHAR(20) NULL,         -- เช่น "ปี 1", "ปี 2"
    degree_level VARCHAR(50) NULL,       -- เช่น "ภาคปกติ", "กศ.บป."
    faculty VARCHAR(100) NULL,           -- เช่น "คณะศิลปศาสตร์และวิทยาศาสตร์"
    department VARCHAR(100) NULL,        -- เช่น "สาธารณสุขชุมชน"
    access_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'RECORDED',
    card_uid VARCHAR(64) NULL,
    failure_reason VARCHAR(100) NULL,
    student_id UUID NULL,
    gate_id UUID NULL REFERENCES gates(id) ON DELETE SET NULL
);

-- ดัชนีเพื่อเพิ่มความเร็วในการสืบค้นข้อมูลและสถิติ (Indexes)
CREATE INDEX IF NOT EXISTS idx_access_logs_access_time ON access_logs (access_time DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_student_code ON access_logs (student_code);
CREATE INDEX IF NOT EXISTS idx_access_logs_study_year ON access_logs (study_year);
CREATE INDEX IF NOT EXISTS idx_access_logs_faculty ON access_logs (faculty);
CREATE INDEX IF NOT EXISTS idx_access_logs_status ON access_logs (status);

-- 3. ตารางสรุปยอดสถิติประจำวัน (Daily Summaries)
CREATE TABLE IF NOT EXISTS daily_summaries (
    date DATE PRIMARY KEY,
    total_visits INT NOT NULL DEFAULT 0,
    unique_students INT NOT NULL DEFAULT 0,
    peak_hour VARCHAR(20) NULL,
    top_year_level VARCHAR(50) NULL,
    top_faculty VARCHAR(100) NULL,
    year_level_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    faculty_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    hourly_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    synced_to_sheets BOOLEAN NOT NULL DEFAULT FALSE,
    synced_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_summaries_date ON daily_summaries (date DESC);

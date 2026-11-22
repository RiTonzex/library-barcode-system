export interface ScanEvent {
  student_code: string;
  entry_year: string;
  study_year?: string;
  degree_level: string;
  faculty: string;
  department: string;
  access_time: string;
  status?: string;
  message?: string;
}

export interface DeviceStatus {
  device_id: string | null;
  ip_address: string | null;
  rssi: number | null;
  free_heap: number | null;
  uptime_sec: number | null;
  last_seen: string | null;
  is_online: boolean;
}

export interface HourlyStat {
  hour: string;
  count: number;
}

export interface FacultyStat {
  name: string;
  count: number;
}

export interface YearLevelStat {
  year: string;
  count: number;
}

export interface DashboardStats {
  today_total_scans: number;
  today_granted_scans: number;
  today_denied_scans: number;
  today_unique_students: number;
  peak_hour: string;
  top_year_level?: string;
  top_faculty?: string;
  hourly_distribution: HourlyStat[];
  faculty_distribution: FacultyStat[];
  year_distribution?: YearLevelStat[];
  last_updated: string;
}

export interface AccessLogItem {
  id: number;
  student_code?: string | null;
  study_year?: string | null;
  entry_year?: string | null;
  degree_level?: string | null;
  faculty?: string | null;
  department?: string | null;
  access_time: string;
  status?: string;
}

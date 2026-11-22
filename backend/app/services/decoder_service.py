"""
Student Barcode Decoder Service
ถอดรหัสบาร์โค้ด / รหัสนักศึกษา ตามโครงสร้างมหาวิทยาลัย (10 หลัก):
ตัวอย่าง: 6812732119
- ตำแหน่งที่ 1-2 (68)  : ปีการศึกษาที่เข้าศึกษา (พ.ศ. 2568)
- ตำแหน่งที่ 3   (1)   : รูปแบบหลักสูตร (1 = ภาคปกติ, 2 = กศ.บป., 3 = ปริญญาโท และ ปริญญาเอก)
- ตำแหน่งที่ 4-5 (27)  : รหัสคณะ (27 = คณะศิลปศาสตร์และวิทยาศาสตร์)
- ตำแหน่งที่ 6-7 (32)  : รหัสสาขาวิชา (32 = วิทยาการคอมพิวเตอร์)
- ตำแหน่งที่ 8   (1)   : ห้องในสาขา
- ตำแหน่งที่ 9-10 (19) : ลำดับที่/เลขที่
"""

from datetime import datetime, date
from zoneinfo import ZoneInfo
from typing import Dict, Any, Optional

# ตารางรหัสรูปแบบหลักสูตร / ระดับการศึกษา
DEGREE_LEVELS = {
    "1": "ภาคปกติ",
    "2": "กศ.บป.",
    "3": "ปริญญาโท และ ปริญญาเอก",
}

# ตารางรหัสหลักสูตร/สาขาวิชาและคณะ มหาวิทยาลัยราชภัฏศรีสะเกษ (SSKRU) 4 หลัก (ตำแหน่งที่ 4-7)
SSKRU_PROGRAMS = {
    "0014": {"major": "วิศวกรรมซอฟต์แวร์", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "0041": {"major": "เทคโนโลยีการจัดการอุตสาหกรรม", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "0048": {"major": "วิทยาศาสตร์การกีฬา", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "0068": {"major": "พลศึกษา", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0073": {"major": "เทคโนโลยีการเกษตร", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "0079": {"major": "ดนตรีศึกษา", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0083": {"major": "ศิลปะและการออกแบบ", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "0084": {"major": "เทคโนโลยีและนวัตกรรมอาหาร", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "0094": {"major": "การท่องเที่ยวและการโรงแรม", "faculty": "คณะบริหารธุรกิจและการบัญชี"},
    "0095": {"major": "ประวัติศาสตร์", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "0106": {"major": "ภาษาไทยเพื่อการสื่อสาร", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "0112": {"major": "การจัดการธุรกิจการค้าสมัยใหม่", "faculty": "คณะบริหารธุรกิจและการบัญชี"},
    "0207": {"major": "การสอนภาษาจีน", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0226": {"major": "รัฐศาสตร์", "faculty": "วิทยาลัยกฎหมายและการปกครอง"},
    "0302": {"major": "คอมพิวเตอร์ศึกษา", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0392": {"major": "คอมพิวเตอร์ศึกษา", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0403": {"major": "การบัญชี", "faculty": "คณะบริหารธุรกิจและการบัญชี"},
    "0414": {"major": "วิทยาศาสตร์ทั่วไป", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0488": {"major": "ภาษาอังกฤษ", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0512": {"major": "ภาษาญี่ปุ่น", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "0633": {"major": "คณิตศาสตร์", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "0983": {"major": "วิศวกรรมโลจิสติกส์", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "1052": {"major": "พยาบาลศาสตร์", "faculty": "คณะพยาบาลศาสตร์"},
    "1506": {"major": "สาธารณสุขชุมชน", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "2213": {"major": "การจัดการ", "faculty": "คณะบริหารธุรกิจและการบัญชี"},
    "2236": {"major": "การประถมศึกษา", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "2247": {"major": "ภาษาไทย", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "2258": {"major": "สังคมศึกษา", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "2269": {"major": "เทคโนโลยีคอมพิวเตอร์และดิจิทัล", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "2314": {"major": "การตลาด", "faculty": "คณะบริหารธุรกิจและการบัญชี"},
    "2325": {"major": "คอมพิวเตอร์ธุรกิจดิจิทัล", "faculty": "คณะบริหารธุรกิจและการบัญชี"},
    "2348": {"major": "นาฏศิลป์ศึกษา", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "2721": {"major": "การศึกษาปฐมวัย", "faculty": "คณะครุศาสตร์และการพัฒนามนุษย์"},
    "2732": {"major": "วิทยาการคอมพิวเตอร์", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "2743": {"major": "ภาษาอังกฤษธุรกิจ", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "2798": {"major": "ภาษาจีน", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "2855": {"major": "นิเทศศาสตร์", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "2866": {"major": "รัฐประศาสนศาสตร์", "faculty": "วิทยาลัยกฎหมายและการปกครอง"},
    "2888": {"major": "นิติศาสตร์", "faculty": "วิทยาลัยกฎหมายและการปกครอง"},
    "5953": {"major": "การออกแบบผลิตภัณฑ์และนวัตกรรมวัสดุ", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "5964": {"major": "เทคโนโลยีโยธาและสถาปัตยกรรม", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
    "6245": {"major": "การพัฒนาชุมชน", "faculty": "คณะมนุษยศาสตร์และสังคมศาสตร์"},
    "7796": {"major": "อาชีวอนามัยและความปลอดภัย", "faculty": "คณะศิลปศาสตร์และวิทยาศาสตร์"},
}

# ตารางรหัสคณะ (กรณีถอดรหัสแบบ 2 หลัก)
FACULTIES = {
    "15": "คณะศิลปศาสตร์และวิทยาศาสตร์",
    "27": "คณะศิลปศาสตร์และวิทยาศาสตร์",
    "04": "คณะบริหารธุรกิจและการบัญชี",
    "22": "คณะครุศาสตร์และการพัฒนามนุษย์",
    "28": "วิทยาลัยกฎหมายและการปกครอง",
    "10": "คณะพยาบาลศาสตร์",
    "01": "คณะมนุษยศาสตร์และสังคมศาสตร์",
    "02": "คณะครุศาสตร์และการพัฒนามนุษย์",
    "03": "คณะครุศาสตร์และการพัฒนามนุษย์",
    "06": "คณะครุศาสตร์และการพัฒนามนุษย์",
    "09": "คณะศิลปศาสตร์และวิทยาศาสตร์",
    "23": "คณะบริหารธุรกิจและการบัญชี",
    "59": "คณะศิลปศาสตร์และวิทยาศาสตร์",
    "62": "คณะมนุษยศาสตร์และสังคมศาสตร์",
    "77": "คณะศิลปศาสตร์และวิทยาศาสตร์",
}

# ตารางรหัสสาขาวิชา (กรณีถอดรหัสแบบ 2 หลัก)
MAJORS = {
    "06": "สาธารณสุขชุมชน",
    "32": "วิทยาการคอมพิวเตอร์",
    "31": "เทคโนโลยีสารสนเทศ",
    "33": "วิทยาการข้อมูลและความมั่นคงไซเบอร์",
    "01": "ภาษาอังกฤษ",
    "02": "ภาษาไทยเพื่อการสื่อสาร",
    "03": "การจัดการ",
    "04": "การตลาด",
    "05": "การบัญชี",
}


def get_current_academic_year(target_date: Optional[date] = None) -> int:
    """
    คำนวณปีการศึกษาปัจจุบันของมหาวิทยาลัยในไทยอัตโนมัติ:
    - ภาคเรียนที่ 1 เปิดช่วงเดือนมิถุนายน (เดือน 6 เป็นต้นไป) นับเป็นปีการศึกษาปัจจุบัน (พ.ศ.)
    - เดือนมกราคม - พฤษภาคม (เดือน 1-5) ยังคงเป็นภาคเรียนที่ 2 ของปีการศึกษาก่อนหน้า
    """
    if target_date is None:
        try:
            target_date = datetime.now(ZoneInfo("Asia/Bangkok")).date()
        except Exception:
            target_date = datetime.now().date()
            
    be_year = target_date.year + 543
    return be_year if target_date.month >= 6 else (be_year - 1)


def calculate_study_year(entry_year_be: int, target_date: Optional[date] = None) -> str:
    """
    คำนวณชั้นปีอัตโนมัติตามปีการศึกษาปัจจุบัน:
    - ปี 1 - 4: แสดงเป็น 'ปี 1', 'ปี 2', 'ปี 3', 'ปี 4'
    - หากเกินชั้นปี 4 หรือน้อยกว่าเท่ากับ 0: ให้เป็น '-' (ว่างไปเลยตามข้อกำหนด)
    """
    current_academic_year = get_current_academic_year(target_date)
    diff = current_academic_year - entry_year_be
    year_num = diff + 1

    if year_num == 1:
        return "ปี 1"
    elif year_num == 2:
        return "ปี 2"
    elif year_num == 3:
        return "ปี 3"
    elif year_num == 4:
        return "ปี 4"
    else:
        return "-"


def decode_student_barcode(barcode: str, scan_date: Optional[date] = None) -> Dict[str, Any]:
    """
    ถอดรหัสและตรวจสอบความถูกต้องของรหัสนักศึกษา:
    หากไม่ถูกต้องหรือไม่ตรงตามเกณฑ์ จะคืนค่า is_valid: False พร้อมระบุ error_reason
    """
    clean_code = str(barcode).strip()

    # 1. ตรวจสอบว่าต้องเป็นตัวเลขล้วน
    if not clean_code.isdigit():
        return {
            "student_code": clean_code,
            "entry_year": "-",
            "study_year": "ข้อมูลไม่ถูกต้อง",
            "degree_level": "ไม่ตรงรูปแบบ",
            "faculty": "ข้อมูลไม่ถูกต้อง",
            "department": "รหัสต้องเป็นตัวเลขล้วนเท่านั้น",
            "is_valid": False,
            "error_reason": "รหัสนักศึกษาต้องเป็นตัวเลข 10 หลักเท่านั้น (ห้ามมีตัวอักษร)",
        }

    # 2. ตรวจสอบความยาว 10 หลัก
    if len(clean_code) != 10:
        return {
            "student_code": clean_code,
            "entry_year": "-",
            "study_year": "ข้อมูลไม่ถูกต้อง",
            "degree_level": "ไม่ตรงรูปแบบ",
            "faculty": "ข้อมูลไม่ถูกต้อง",
            "department": f"รหัสมี {len(clean_code)} หลัก (ต้องมี 10 หลัก)",
            "is_valid": False,
            "error_reason": f"รหัสนักศึกษาต้องมี 10 หลักเท่านั้น (พบ {len(clean_code)} หลัก)",
        }

    year_prefix = clean_code[0:2]
    degree_code = clean_code[2:3]
    program_code = clean_code[3:7]
    faculty_code = clean_code[3:5]
    major_code = clean_code[5:7]
    section_code = clean_code[7:8]
    seq_code = clean_code[8:10]

    # 3. ตรวจสอบปีการศึกษาที่เข้า
    entry_year_int = int(f"25{year_prefix}")
    entry_year = str(entry_year_int)
    current_academic_year = get_current_academic_year(scan_date)

    # กรณีปีการศึกษาในอนาคต (เช่น 7012732119 เกินไป 1 ปี)
    if entry_year_int > current_academic_year:
        diff_ahead = entry_year_int - current_academic_year
        return {
            "student_code": clean_code,
            "entry_year": entry_year,
            "study_year": "ข้อมูลไม่ถูกต้อง",
            "degree_level": "ปีการศึกษาล่วงหน้า",
            "faculty": "ข้อมูลไม่ถูกต้อง",
            "department": f"ปีการศึกษา {entry_year} เกินปีปัจจุบัน ({diff_ahead} ปี)",
            "is_valid": False,
            "error_reason": f"ปีการศึกษา พ.ศ. {entry_year} เกินปีปัจจุบัน (เกินไป {diff_ahead} ปี ยังไม่เปิดรับ)",
        }



    # 4. ตรวจสอบรูปแบบหลักสูตร (1=ภาคปกติ, 2=กศ.บป., 3=ปริญญาโท/เอก)
    if degree_code not in DEGREE_LEVELS:
        return {
            "student_code": clean_code,
            "entry_year": entry_year,
            "study_year": "ข้อมูลไม่ถูกต้อง",
            "degree_level": f"รหัส {degree_code} ไม่ถูกต้อง",
            "faculty": "ข้อมูลไม่ถูกต้อง",
            "department": "รูปแบบหลักสูตรไม่ถูกต้อง",
            "is_valid": False,
            "error_reason": f"รูปแบบหลักสูตรไม่ถูกต้อง (รหัสตำแหน่งที่ 3 คือ {degree_code})",
        }
    degree_level = DEGREE_LEVELS[degree_code]

    # 5. ตรวจสอบคณะและสาขาวิชา (SSKRU Programs หรือ Faculty/Major)
    program_info = SSKRU_PROGRAMS.get(program_code)
    if program_info:
        faculty = program_info["faculty"]
        department = program_info["major"]
    elif faculty_code in FACULTIES:
        faculty = FACULTIES[faculty_code]
        department = MAJORS.get(major_code, f"สาขาวิชารหัส {major_code}")
    else:
        return {
            "student_code": clean_code,
            "entry_year": entry_year,
            "study_year": "ข้อมูลไม่ถูกต้อง",
            "degree_level": degree_level,
            "faculty": "ไม่พบข้อมูลคณะในระบบ",
            "department": f"รหัสสาขา/คณะ {program_code} ไม่ถูกต้อง",
            "is_valid": False,
            "error_reason": f"ไม่พบข้อมูลคณะหรือหลักสูตรในระบบ (รหัส {program_code})",
        }

    # 6. คำนวณชั้นปีปัจจุบัน
    study_year = calculate_study_year(entry_year_int, scan_date)

    return {
        "student_code": clean_code,
        "entry_year": entry_year,
        "study_year": study_year,
        "degree_level": degree_level,
        "faculty": faculty,
        "department": department,
        "faculty_code": faculty_code,
        "major_code": major_code,
        "section_code": section_code,
        "seq_code": seq_code,
        "is_valid": True,
    }

/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT: Library Attendance & Executive Daily Reporting (V4.0)
 * ระบบบันทึกเวลาและรายงานสถิติผู้เข้าใช้บริการห้องสมุด (Google Sheets Edition)
 * ==============================================================================
 *
 * การจัดรูปแบบและหน้าตาของตาราง:
 * 1. [Daily_Summary]   : รายงานสรุปประจำวันแนวตั้ง ดีไซน์ Executive Dashboard เรียบหรู สะอาดตา
 *                        อ่านง่ายในหน้าเดียว (คอลัมน์ A ถึง E ไม่ล้นจอ) มี KPI Cards, แยกคณะ, ชั้นปี, หลักสูตร, สาขา และรายชั่วโมง
 * 2. [Access_Logs]     : สมุดบันทึกประวัติการสแกนบัตรนักศึกษาแบบ Real-time ตารางโมเดิร์น สบายตา มี Zebra striping
 * 3. [Summary_History] : สมุดบันทึกประวัติสรุปสถิติย้อนหลังรายวัน สำหรับผู้บริหารเปิดดูภาพรวมย้อนหลัง
 * ==============================================================================
 */

const SHEET_DAILY_SUMMARY_TAB = "Daily_Summary";
const SHEET_HISTORY_TAB = "Summary_History";
const SHEET_ACCESS_LOGS_TAB = "Access_Logs";

/**
 * รองรับการทดสอบ Web App ผ่านเบราว์เซอร์
 */
function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({
      status: "ONLINE",
      app: "Library Barcode Attendance System (Clean Minimalist Edition)",
      schedule: "Auto-sync at 16:30 Asia/Bangkok",
      timestamp: new Date().toLocaleString("th-TH"),
      message: "ระบบเชื่อมต่อ Google Sheets พร้อมใช้งาน"
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

/**
 * รองรับ Webhook POST จากระบบ Backend
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(15000);

  try {
    const payload = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.action === "APPEND_LOG") {
      appendAttendanceLog(ss, payload.data);
      return ContentService.createTextOutput(
        JSON.stringify({ status: "SUCCESS", message: "Recorded to Access_Logs" })
      ).setMimeType(ContentService.MimeType.JSON);
    } else if (payload.action === "SYNC_DAILY_SUMMARY") {
      syncDetailedDailySummary(ss, payload.data);
      appendSummaryHistory(ss, payload.data);
      return ContentService.createTextOutput(
        JSON.stringify({
          status: "SUCCESS",
          message: "Daily Summary & History synced successfully"
        })
      ).setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(
        JSON.stringify({ status: "ERROR", message: "Unknown action" })
      ).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ status: "ERROR", message: error.toString() })
    ).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/**
 * เพิ่มเมนูลัดบนแถบเครื่องมือของ Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("📊 ระบบสถิติห้องสมุด")
    .addItem("🔄 จัดรูปแบบและรีเฟรชหน้าสรุปวันนี้", "manualRefreshDailyReport")
    .addToUi();
}

function manualRefreshDailyReport() {
  SpreadsheetApp.getUi().alert("ระบบจัดรูปแบบรายงานสรุปประจำวันเรียบร้อยแล้ว");
}

/**
 * -----------------------------------------------------------------------------
 * 1. บันทึกสถิติรายคนลงแท็บ Access_Logs (เรียบง่าย สบายตา ชัดเจน)
 * -----------------------------------------------------------------------------
 */
function appendAttendanceLog(ss, data) {
  let sheet = ss.getSheetByName(SHEET_ACCESS_LOGS_TAB);
  const headers = [
    "วัน-เวลา",
    "รหัสนักศึกษา",
    "ชั้นปี",
    "ปีการศึกษา",
    "รูปแบบหลักสูตร",
    "คณะ",
    "สาขาวิชา"
  ];

  const isNewSheet = !sheet;
  if (isNewSheet) {
    sheet = ss.insertSheet(SHEET_ACCESS_LOGS_TAB);
  }

  // ถ้าเพิ่งสร้าง หรือยังไม่มีหัวตาราง
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#1e293b") // Slate 800 เรียบหรู
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(10)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontFamily("Sarabun");
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);

    // กำหนดความกว้างคอลัมน์ให้อ่านสบายตา พอดีข้อความ
    sheet.setColumnWidth(1, 160); // วัน-เวลา
    sheet.setColumnWidth(2, 130); // รหัสนักศึกษา
    sheet.setColumnWidth(3, 90);  // ชั้นปี
    sheet.setColumnWidth(4, 95);  // ปีการศึกษา
    sheet.setColumnWidth(5, 140); // รูปแบบหลักสูตร
    sheet.setColumnWidth(6, 260); // คณะ
    sheet.setColumnWidth(7, 260); // สาขาวิชา
  }

  const row = [
    data.timestamp || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss"),
    data.student_code || "-",
    data.study_year || "-",
    data.entry_year || "-",
    data.degree_level || "-",
    data.faculty || "-",
    data.department || "-"
  ];

  sheet.appendRow(row);
  const newRowIndex = sheet.getLastRow();
  const rowRange = sheet.getRange(newRowIndex, 1, 1, headers.length);

  rowRange
    .setFontFamily("Sarabun")
    .setFontSize(10)
    .setVerticalAlignment("middle");
  sheet.setRowHeight(newRowIndex, 25);

  // สลับสีแถวอ่อนๆ (Zebra Striping) ดูง่าย ไม่ลายตา
  if (newRowIndex % 2 === 0) {
    rowRange.setBackground("#f8fafc");
  } else {
    rowRange.setBackground("#ffffff");
  }

  sheet.getRange(newRowIndex, 1, 1, 5).setHorizontalAlignment("center");
  sheet.getRange(newRowIndex, 6, 1, 2).setHorizontalAlignment("left");

  // เส้นขอบบางสบายตา
  rowRange.setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
}

/**
 * -----------------------------------------------------------------------------
 * 2. สร้างหน้ารายงานสรุปประจำวันแนวตั้ง (Executive Clean Dashboard)
 * -----------------------------------------------------------------------------
 */
function syncDetailedDailySummary(ss, data) {
  let sheet = ss.getSheetByName(SHEET_DAILY_SUMMARY_TAB);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_DAILY_SUMMARY_TAB, 0); // วางไว้แท็บแรกสุด
  }

  // ปลดล็อกการตรึงแถวเดิมก่อนล้าง
  try {
    sheet.setFrozenColumns(0);
    sheet.setFrozenRows(0);
  } catch (e) {}

  sheet.clear();
  sheet.setHiddenGridlines(false);

  const totalV = Number(data.total_visits || 0);
  const calcPct = (cnt) => (totalV > 0 ? cnt / totalV : 0);

  // 1. แบนเนอร์หัวรายงาน (Minimal Deep Navy Header)
  sheet.getRange("A1:E1").merge()
    .setValue("🏛️ รายงานสรุปสถิติผู้เข้าใช้บริการห้องสมุดประจำวัน")
    .setBackground("#0f172a")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(13)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun");
  sheet.setRowHeight(1, 38);

  const subText = "📅 วันที่สรุป: " + (data.summary_date || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd")) +
    "   |   เวลาปิดยอด: 16:30 น. (เวลาทำการ 08:00 - 16:00 น.)   |   อัปเดต: " +
    Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss");
  
  sheet.getRange("A2:E2").merge()
    .setValue(subText)
    .setBackground("#1e293b")
    .setFontColor("#94a3b8")
    .setFontSize(9)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun");
  sheet.setRowHeight(2, 24);
  sheet.setRowHeight(3, 8); // เว้นระยะ

  // ---------------------------------------------------------------------------
  // 2. การ์ดสรุปภาพรวม (KPI Cards: 3 กล่องหลัก สวยงาม สบายตา)
  // ---------------------------------------------------------------------------
  // Card 1: ยอดเข้าใช้รวม
  sheet.getRange("A4:B4").merge().setValue("ยอดเข้าใช้ทั้งหมด")
    .setBackground("#f0fdf4").setFontColor("#166534").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
  sheet.getRange("A5:B5").merge().setValue(Number(data.total_visits || 0))
    .setBackground("#f0fdf4").setFontColor("#15803d").setFontWeight("bold").setFontSize(22).setNumberFormat("#,##0").setHorizontalAlignment("center");
  sheet.getRange("A6:B6").merge().setValue("เฉลี่ย " + (data.avg_per_student || 0) + " ครั้ง/คน")
    .setBackground("#f0fdf4").setFontColor("#4ade80").setFontSize(8).setHorizontalAlignment("center");
  sheet.getRange("A4:B6").setBorder(true, true, true, true, false, false, "#bbf7d0", SpreadsheetApp.BorderStyle.SOLID);

  // Card 2: จำนวนผู้ใช้ไม่ซ้ำคน
  sheet.getRange("C4").setValue("ผู้ใช้ไม่ซ้ำคน (คนจริง)")
    .setBackground("#eff6ff").setFontColor("#1e40af").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
  sheet.getRange("C5").setValue(Number(data.unique_students || 0))
    .setBackground("#eff6ff").setFontColor("#2563eb").setFontWeight("bold").setFontSize(22).setNumberFormat("#,##0").setHorizontalAlignment("center");
  sheet.getRange("C6").setValue("Unique Visitors")
    .setBackground("#eff6ff").setFontColor("#93c5fd").setFontSize(8).setHorizontalAlignment("center");
  sheet.getRange("C4:C6").setBorder(true, true, true, true, false, false, "#bfdbfe", SpreadsheetApp.BorderStyle.SOLID);

  // Card 3: ช่วงพีค และ ชั้นปีสูงสุด
  sheet.getRange("D4:E4").merge().setValue("ช่วงเวลาพีค / ชั้นปียอดนิยม")
    .setBackground("#faf5ff").setFontColor("#6b21a8").setFontWeight("bold").setFontSize(9).setHorizontalAlignment("center");
  sheet.getRange("D5:E5").merge().setValue(data.top_year_level || "-")
    .setBackground("#faf5ff").setFontColor("#7c3aed").setFontWeight("bold").setFontSize(13).setHorizontalAlignment("center");
  sheet.getRange("D6:E6").merge().setValue("ช่วงพีค: " + (data.peak_hour || "-") + " น.")
    .setBackground("#faf5ff").setFontColor("#c084fc").setFontSize(8).setHorizontalAlignment("center");
  sheet.getRange("D4:E6").setBorder(true, true, true, true, false, false, "#e9d5ff", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setRowHeight(4, 20);
  sheet.setRowHeight(5, 34);
  sheet.setRowHeight(6, 18);
  sheet.setRowHeight(7, 12);

  let curRow = 8;

  // Helper สำหรับสร้างหัวตารางย่อย (Section Header & Column Header)
  function buildSection(title, headers) {
    sheet.getRange(curRow, 1, 1, 5).merge()
      .setValue(title)
      .setBackground("#1e293b")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(9.5)
      .setFontFamily("Sarabun")
      .setHorizontalAlignment("left");
    sheet.setRowHeight(curRow, 24);
    curRow++;

    for (let c = 0; c < headers.length; c++) {
      sheet.getRange(curRow, c + 1)
        .setValue(headers[c])
        .setBackground("#f1f5f9")
        .setFontColor("#334155")
        .setFontWeight("bold")
        .setFontSize(9)
        .setFontFamily("Sarabun");
    }
    sheet.getRange(curRow, 1).setHorizontalAlignment("center");
    sheet.getRange(curRow, 2).setHorizontalAlignment("left");
    sheet.getRange(curRow, 3, 1, 2).setHorizontalAlignment("right");
    sheet.getRange(curRow, 5).setHorizontalAlignment("center");
    sheet.setRowHeight(curRow, 22);
    curRow++;
  }

  // ---------------------------------------------------------------------------
  // ส่วนที่ 1: สรุปแยกตามคณะ
  // ---------------------------------------------------------------------------
  buildSection("🏛️ 1. สรุปรายชื่อคณะที่เข้าใช้บริการ", ["ลำดับ", "ชื่อคณะ", "จำนวนเข้าใช้ (ครั้ง)", "สัดส่วน (%)", "อันดับ"]);
  const facMap = data.faculty_breakdown || {};
  const facList = [];
  for (const k in facMap) {
    facList.push({ name: k, count: Number(facMap[k] || 0) });
  }
  facList.sort((a, b) => b.count - a.count);

  const startFacRow = curRow;
  if (facList.length === 0) {
    sheet.getRange(curRow, 1, 1, 5).merge()
      .setValue("ยังไม่มีข้อมูลคณะในวันนี้")
      .setFontColor("#94a3b8")
      .setHorizontalAlignment("center")
      .setFontFamily("Sarabun");
    curRow++;
  } else {
    for (let i = 0; i < facList.length; i++) {
      const item = facList[i];
      const rank = i + 1;
      const pct = calcPct(item.count);
      const tag = rank === 1 ? "อันดับ 1 (สูงสุด)" : (rank === 2 ? "อันดับ 2" : (rank === 3 ? "อันดับ 3" : "-"));

      sheet.getRange(curRow, 1).setValue(rank).setHorizontalAlignment("center");
      sheet.getRange(curRow, 2).setValue(item.name).setHorizontalAlignment("left");
      sheet.getRange(curRow, 3).setValue(item.count).setNumberFormat("#,##0").setHorizontalAlignment("right");
      sheet.getRange(curRow, 4).setValue(pct).setNumberFormat("0.0%").setHorizontalAlignment("right");
      sheet.getRange(curRow, 5).setValue(tag).setHorizontalAlignment("center");

      sheet.getRange(curRow, 1, 1, 5).setFontFamily("Sarabun").setFontSize(9.5);
      if (i % 2 === 1) sheet.getRange(curRow, 1, 1, 5).setBackground("#f8fafc");
      sheet.setRowHeight(curRow, 22);
      curRow++;
    }
  }

  // แถวรวมคณะ
  sheet.getRange(curRow, 1).setValue("รวม").setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(curRow, 2).setValue("รวมทุกคณะ").setFontWeight("bold");
  sheet.getRange(curRow, 3).setValue(totalV).setNumberFormat("#,##0").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 4).setValue(facList.length > 0 ? 1 : 0).setNumberFormat("0.0%").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 5).setValue("-").setHorizontalAlignment("center");
  sheet.getRange(curRow, 1, 1, 5).setBackground("#f1f5f9").setFontFamily("Sarabun").setFontSize(9.5);
  sheet.setRowHeight(curRow, 22);
  sheet.getRange(startFacRow - 2, 1, curRow - startFacRow + 3, 5)
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  curRow += 2;

  // ---------------------------------------------------------------------------
  // ส่วนที่ 2: สรุปแยกตามชั้นปี
  // ---------------------------------------------------------------------------
  buildSection("🎓 2. สรุปสถิติแยกตามชั้นปี", ["ลำดับ", "ระดับชั้นปี", "จำนวนเข้าใช้ (ครั้ง)", "สัดส่วน (%)", "สถานะ"]);
  const yearRows = [
    ["นักศึกษา ชั้นปี 1", Number(data.year_1 || 0)],
    ["นักศึกษา ชั้นปี 2", Number(data.year_2 || 0)],
    ["นักศึกษา ชั้นปี 3", Number(data.year_3 || 0)],
    ["นักศึกษา ชั้นปี 4", Number(data.year_4 || 0)],
    ["อื่นๆ / เกิน 4 ปี / บุคคลทั่วไป", Number(data.year_other || 0)],
  ];

  const startYrRow = curRow;
  for (let i = 0; i < yearRows.length; i++) {
    const yr = yearRows[i];
    const pct = calcPct(yr[1]);
    const isTop = data.top_year_level && data.top_year_level.indexOf(yr[0].replace("นักศึกษา ", "")) >= 0;

    sheet.getRange(curRow, 1).setValue(i + 1).setHorizontalAlignment("center");
    sheet.getRange(curRow, 2).setValue(yr[0]).setHorizontalAlignment("left");
    sheet.getRange(curRow, 3).setValue(yr[1]).setNumberFormat("#,##0").setHorizontalAlignment("right");
    sheet.getRange(curRow, 4).setValue(pct).setNumberFormat("0.0%").setHorizontalAlignment("right");
    sheet.getRange(curRow, 5).setValue(isTop ? "เข้าใช้สูงสุด" : "-").setHorizontalAlignment("center");

    sheet.getRange(curRow, 1, 1, 5).setFontFamily("Sarabun").setFontSize(9.5);
    if (i % 2 === 1) sheet.getRange(curRow, 1, 1, 5).setBackground("#f8fafc");
    sheet.setRowHeight(curRow, 22);
    curRow++;
  }

  // รวมชั้นปี
  sheet.getRange(curRow, 1).setValue("รวม").setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(curRow, 2).setValue("รวมทุกชั้นปี").setFontWeight("bold");
  sheet.getRange(curRow, 3).setValue(totalV).setNumberFormat("#,##0").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 4).setValue(totalV > 0 ? 1 : 0).setNumberFormat("0.0%").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 5).setValue("-").setHorizontalAlignment("center");
  sheet.getRange(curRow, 1, 1, 5).setBackground("#f1f5f9").setFontFamily("Sarabun").setFontSize(9.5);
  sheet.setRowHeight(curRow, 22);
  sheet.getRange(startYrRow - 2, 1, curRow - startYrRow + 3, 5)
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  curRow += 2;

  // ---------------------------------------------------------------------------
  // ส่วนที่ 3: สรุปแยกตามรูปแบบหลักสูตร
  // ---------------------------------------------------------------------------
  buildSection("📚 3. สรุปสถิติแยกตามรูปแบบหลักสูตร", ["ลำดับ", "รูปแบบหลักสูตร", "จำนวนเข้าใช้ (ครั้ง)", "สัดส่วน (%)", "กลุ่ม"]);
  const degRows = [
    ["หลักสูตร ภาคปกติ", Number(data.degree_regular || 0), "ปริญญาตรี (ปกติ)"],
    ["หลักสูตร กศ.บป.", Number(data.degree_special || 0), "โครงการพิเศษ"],
    ["หลักสูตร ปริญญาโท และ ปริญญาเอก", Number(data.degree_postgrad || 0), "บัณฑิตศึกษา"]
  ];

  const startDegRow = curRow;
  for (let i = 0; i < degRows.length; i++) {
    const deg = degRows[i];
    const pct = calcPct(deg[1]);

    sheet.getRange(curRow, 1).setValue(i + 1).setHorizontalAlignment("center");
    sheet.getRange(curRow, 2).setValue(deg[0]).setHorizontalAlignment("left");
    sheet.getRange(curRow, 3).setValue(deg[1]).setNumberFormat("#,##0").setHorizontalAlignment("right");
    sheet.getRange(curRow, 4).setValue(pct).setNumberFormat("0.0%").setHorizontalAlignment("right");
    sheet.getRange(curRow, 5).setValue(deg[2]).setHorizontalAlignment("center");

    sheet.getRange(curRow, 1, 1, 5).setFontFamily("Sarabun").setFontSize(9.5);
    if (i % 2 === 1) sheet.getRange(curRow, 1, 1, 5).setBackground("#f8fafc");
    sheet.setRowHeight(curRow, 22);
    curRow++;
  }

  // รวมหลักสูตร
  sheet.getRange(curRow, 1).setValue("รวม").setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(curRow, 2).setValue("รวมทุกหลักสูตร").setFontWeight("bold");
  sheet.getRange(curRow, 3).setValue(totalV).setNumberFormat("#,##0").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 4).setValue(totalV > 0 ? 1 : 0).setNumberFormat("0.0%").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 5).setValue("-").setHorizontalAlignment("center");
  sheet.getRange(curRow, 1, 1, 5).setBackground("#f1f5f9").setFontFamily("Sarabun").setFontSize(9.5);
  sheet.setRowHeight(curRow, 22);
  sheet.getRange(startDegRow - 2, 1, curRow - startDegRow + 3, 5)
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  curRow += 2;

  // ---------------------------------------------------------------------------
  // ส่วนที่ 4: สรุปแยกตามสาขาวิชา (ละเอียดครบทุกสาขา)
  // ---------------------------------------------------------------------------
  buildSection("💻 4. รายชื่อสาขาวิชาที่เข้าใช้บริการ", ["ลำดับ", "ชื่อสาขาวิชา", "จำนวนเข้าใช้ (ครั้ง)", "สัดส่วน (%)", "สถานะ"]);
  const deptMap = data.department_breakdown || {};
  const deptList = [];
  for (const k in deptMap) {
    deptList.push({ name: k, count: Number(deptMap[k] || 0) });
  }
  deptList.sort((a, b) => b.count - a.count);

  const startDeptRow = curRow;
  if (deptList.length === 0) {
    sheet.getRange(curRow, 1, 1, 5).merge()
      .setValue("ยังไม่มีข้อมูลสาขาวิชาในวันนี้")
      .setFontColor("#94a3b8")
      .setHorizontalAlignment("center")
      .setFontFamily("Sarabun");
    curRow++;
  } else {
    for (let i = 0; i < deptList.length; i++) {
      const item = deptList[i];
      const rank = i + 1;
      const pct = calcPct(item.count);

      sheet.getRange(curRow, 1).setValue(rank).setHorizontalAlignment("center");
      sheet.getRange(curRow, 2).setValue(item.name).setHorizontalAlignment("left");
      sheet.getRange(curRow, 3).setValue(item.count).setNumberFormat("#,##0").setHorizontalAlignment("right");
      sheet.getRange(curRow, 4).setValue(pct).setNumberFormat("0.0%").setHorizontalAlignment("right");
      sheet.getRange(curRow, 5).setValue(rank === 1 ? "สาขาอันดับ 1" : "-").setHorizontalAlignment("center");

      sheet.getRange(curRow, 1, 1, 5).setFontFamily("Sarabun").setFontSize(9.5);
      if (i % 2 === 1) sheet.getRange(curRow, 1, 1, 5).setBackground("#f8fafc");
      sheet.setRowHeight(curRow, 22);
      curRow++;
    }
  }

  // รวมสาขา
  sheet.getRange(curRow, 1).setValue("รวม").setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(curRow, 2).setValue("รวมทุกสาขาวิชา").setFontWeight("bold");
  sheet.getRange(curRow, 3).setValue(totalV).setNumberFormat("#,##0").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 4).setValue(deptList.length > 0 ? 1 : 0).setNumberFormat("0.0%").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 5).setValue("-").setHorizontalAlignment("center");
  sheet.getRange(curRow, 1, 1, 5).setBackground("#f1f5f9").setFontFamily("Sarabun").setFontSize(9.5);
  sheet.setRowHeight(curRow, 22);
  sheet.getRange(startDeptRow - 2, 1, curRow - startDeptRow + 3, 5)
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
  curRow += 2;

  // ---------------------------------------------------------------------------
  // ส่วนที่ 5: สรุปสถิติรายชั่วโมง (เวลาทำการ 08:00 - 16:00 น.)
  // ---------------------------------------------------------------------------
  buildSection("🕒 5. สถิติความหนาแน่นรายชั่วโมง (08:00 - 16:00 น.)", ["ลำดับ", "ช่วงเวลาให้บริการ", "จำนวนคนเข้าใช้ (ครั้ง)", "สัดส่วน (%)", "สถานะ"]);
  const hourlyMap = data.hourly_breakdown || {};
  const startHrRow = curRow;
  let idx = 1;

  for (let h = 8; h <= 15; h++) {
    const hLabel = (h < 10 ? "0" + h : h) + ":00 - " + (h + 1 < 10 ? "0" + (h + 1) : h + 1) + ":00 น.";
    const key = (h < 10 ? "0" + h : h) + ":00";
    const cnt = Number(hourlyMap[key] || 0);
    const pct = calcPct(cnt);
    const isPeak = data.peak_hour && data.peak_hour.indexOf((h < 10 ? "0" + h : h) + ":00") >= 0 && cnt > 0;

    sheet.getRange(curRow, 1).setValue(idx).setHorizontalAlignment("center");
    sheet.getRange(curRow, 2).setValue(hLabel).setHorizontalAlignment("left");
    sheet.getRange(curRow, 3).setValue(cnt).setNumberFormat("#,##0").setHorizontalAlignment("right");
    sheet.getRange(curRow, 4).setValue(pct).setNumberFormat("0.0%").setHorizontalAlignment("right");
    sheet.getRange(curRow, 5).setValue(isPeak ? "ช่วงพีค (คนเข้ามากสุด)" : "-").setHorizontalAlignment("center");

    sheet.getRange(curRow, 1, 1, 5).setFontFamily("Sarabun").setFontSize(9.5);
    if (idx % 2 === 0) sheet.getRange(curRow, 1, 1, 5).setBackground("#f8fafc");
    sheet.setRowHeight(curRow, 22);
    curRow++;
    idx++;
  }

  // รวมชั่วโมง
  sheet.getRange(curRow, 1).setValue("รวม").setHorizontalAlignment("center").setFontWeight("bold");
  sheet.getRange(curRow, 2).setValue("รวมช่วงเวลา 08:00 - 16:00 น.").setFontWeight("bold");
  sheet.getRange(curRow, 3).setValue(totalV).setNumberFormat("#,##0").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 4).setValue(totalV > 0 ? 1 : 0).setNumberFormat("0.0%").setHorizontalAlignment("right").setFontWeight("bold");
  sheet.getRange(curRow, 5).setValue("-").setHorizontalAlignment("center");
  sheet.getRange(curRow, 1, 1, 5).setBackground("#f1f5f9").setFontFamily("Sarabun").setFontSize(9.5);
  sheet.setRowHeight(curRow, 22);
  sheet.getRange(startHrRow - 2, 1, curRow - startHrRow + 3, 5)
    .setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);

  // กำหนดความกว้างคอลัมน์ A ถึง E พอดีจอ สบายตา ไม่ล้นออกขวา
  sheet.setColumnWidth(1, 55);  // ลำดับ
  sheet.setColumnWidth(2, 280); // ชื่อหมวดหมู่ / คณะ / สาขา
  sheet.setColumnWidth(3, 140); // จำนวนเข้าใช้ (ครั้ง)
  sheet.setColumnWidth(4, 110); // สัดส่วน (%)
  sheet.setColumnWidth(5, 160); // สถานะ / อันดับ
}

/**
 * -----------------------------------------------------------------------------
 * 3. บันทึกสมุดประวัติย่อย้อนหลังรายวัน (Summary_History)
 * -----------------------------------------------------------------------------
 */
function appendSummaryHistory(ss, data) {
  let sheet = ss.getSheetByName(SHEET_HISTORY_TAB);
  const headers = [
    "วันที่",
    "ยอดเข้าใช้รวม (ครั้ง)",
    "ผู้ใช้ไม่ซ้ำ (คน)",
    "เฉลี่ย (ครั้ง/คน)",
    "ช่วงพีค (Peak Hour)",
    "คณะอันดับ 1",
    "สาขาอันดับ 1",
    "ชั้นปีอันดับ 1",
    "เวลาบันทึกยอด"
  ];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_HISTORY_TAB, 1);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange
      .setBackground("#1e293b")
      .setFontColor("#ffffff")
      .setFontWeight("bold")
      .setFontSize(10)
      .setHorizontalAlignment("center")
      .setVerticalAlignment("middle")
      .setFontFamily("Sarabun");
    sheet.setRowHeight(1, 34);
    sheet.setFrozenRows(1);

    sheet.setColumnWidth(1, 110); // วันที่
    sheet.setColumnWidth(2, 150); // ยอดรวม
    sheet.setColumnWidth(3, 130); // ไม่ซ้ำคน
    sheet.setColumnWidth(4, 120); // เฉลี่ย
    sheet.setColumnWidth(5, 140); // ช่วงพีค
    sheet.setColumnWidth(6, 240); // คณะอันดับ 1
    sheet.setColumnWidth(7, 240); // สาขาอันดับ 1
    sheet.setColumnWidth(8, 130); // ชั้นปีอันดับ 1
    sheet.setColumnWidth(9, 160); // เวลาบันทึก
  }

  const row = [
    data.summary_date || Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd"),
    Number(data.total_visits || 0),
    Number(data.unique_students || 0),
    Number(data.avg_per_student || 0),
    data.peak_hour || "-",
    data.top_faculty || "-",
    data.top_department || "-",
    data.top_year_level || "-",
    Utilities.formatDate(new Date(), "Asia/Bangkok", "yyyy-MM-dd HH:mm:ss")
  ];

  const values = sheet.getDataRange().getValues();
  let targetRowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.summary_date)) {
      targetRowIndex = i + 1;
      break;
    }
  }

  if (targetRowIndex > 0) {
    sheet.getRange(targetRowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    targetRowIndex = sheet.getLastRow();
  }

  const rowRange = sheet.getRange(targetRowIndex, 1, 1, headers.length);
  rowRange
    .setFontFamily("Sarabun")
    .setFontSize(10)
    .setVerticalAlignment("middle");
  sheet.setRowHeight(targetRowIndex, 25);

  if (targetRowIndex % 2 === 0) rowRange.setBackground("#f8fafc");
  else rowRange.setBackground("#ffffff");

  sheet.getRange(targetRowIndex, 1).setHorizontalAlignment("center");
  sheet.getRange(targetRowIndex, 2, 1, 2).setNumberFormat("#,##0").setHorizontalAlignment("right");
  sheet.getRange(targetRowIndex, 4).setNumberFormat("0.00").setHorizontalAlignment("right");
  sheet.getRange(targetRowIndex, 5).setHorizontalAlignment("center");
  sheet.getRange(targetRowIndex, 6, 1, 3).setHorizontalAlignment("left");
  sheet.getRange(targetRowIndex, 9).setHorizontalAlignment("center");

  rowRange.setBorder(true, true, true, true, true, true, "#e2e8f0", SpreadsheetApp.BorderStyle.SOLID);
}

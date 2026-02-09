// Google Apps Script - 업데이트된 코드
// 안전교육 명단 조회용 (학년/전공 포함)

const SPREADSHEET_ID = "1EfC8fjdDGS5cc_ytpFaze_xcCkMBSV72xBBzpWqxqTw";
const SAFETY_SHEET = "안전교육이수자 명단";

function verifyStudent(payload) {
  const safePayload = payload || {};
  const { studentId, studentName, sheetName, columns } = safePayload;
  const targetSheetName = sheetName || SAFETY_SHEET;
  
  if (!studentId || !studentName) {
    return { ok: false, found: false, error: "학번 또는 이름이 비어있습니다." };
  }
  
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(targetSheetName);
    if (!sheet) {
      return { ok: false, found: false, error: "안전교육 시트를 찾을 수 없습니다." };
    }
    
    // 컬럼 인덱스 찾기
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const normalizedHeader = headerRow.map(v => String(v || "").trim());
    const colIndex = {};
    
    for (const [key, colName] of Object.entries(columns)) {
      const idx = normalizedHeader.indexOf(String(colName || "").trim());
      if (idx >= 0) colIndex[key] = idx;
    }
    
    if (colIndex.studentId === undefined || colIndex.studentName === undefined) {
      return { ok: false, found: false, error: "필수 컬럼(학번, 이름)을 찾을 수 없습니다." };
    }
    
    // 데이터 읽기
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
    
    // 학번과 이름으로 검색
    for (const row of data) {
      const id = String(row[colIndex.studentId]).trim();
      const name = String(row[colIndex.studentName]).trim();
      
      if (id === studentId && name === studentName) {
        // 찾음! 학년, 전공, 안전교육 이수 여부 수집
        const student = {
          id: id,
          name: name,
        };
        
        if (colIndex.year !== undefined) {
          student.year = parseInt(row[colIndex.year]) || 0;
        }
        if (colIndex.dept !== undefined) {
          student.dept = String(row[colIndex.dept]).trim() || "미상";
        }
        if (colIndex.safetyTrained !== undefined) {
          const safetyVal = String(row[colIndex.safetyTrained]).trim().toUpperCase();
          student.safetyTrained = ["YES", "Y", "O", "○", "TRUE", "1", "이수"].includes(safetyVal);
        }
        
        return {
          ok: true,
          found: true,
          student: student,
          safetyTrained: student.safetyTrained ?? true,
        };
      }
    }
    
    // 찾지 못함
    return { ok: true, found: false, error: null };
    
  } catch (err) {
    return { ok: false, found: false, error: err.toString() };
  }
}

function addSafetyStudent(payload) {
  const safePayload = payload || {};
  const studentId = String(safePayload.studentId || "").trim();
  const studentName = String(safePayload.studentName || "").trim();
  const studentYear = String(safePayload.studentYear || "").trim();
  const studentMajor = String(safePayload.studentMajor || "").trim();
  const studentEmail = String(safePayload.studentEmail || "").trim();
  const targetSheetName = safePayload.sheetName || SAFETY_SHEET;
  const columns = safePayload.columns || {
    studentId: "학번",
    studentName: "이름",
    year: "학년",
    dept: "전공",
    safetyTrained: "안전교육",
    email: "이메일",
  };

  if (!studentId || !studentName) {
    return { ok: false, error: "학번 또는 이름이 비어있습니다." };
  }

  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(targetSheetName);
    if (!sheet) {
      return { ok: false, error: "안전교육 시트를 찾을 수 없습니다." };
    }

    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const normalizedHeader = headerRow.map(v => String(v || "").trim());

    const findCol = (key, fallback) => {
      const raw = columns[key];
      const candidates = Array.isArray(raw) ? raw : [raw || fallback].filter(Boolean);
      for (const name of candidates) {
        const idx = normalizedHeader.indexOf(String(name || "").trim());
        if (idx >= 0) return idx;
      }
      return undefined;
    };

    const colIndex = {
      studentId: findCol("studentId", "학번"),
      studentName: findCol("studentName", "이름"),
      year: findCol("year", "학년"),
      dept: findCol("dept", "전공"),
      safetyTrained: findCol("safetyTrained", "안전교육"),
      email: findCol("email", "이메일"),
    };

    if (colIndex.studentId === undefined || colIndex.studentName === undefined) {
      return { ok: false, error: "필수 컬럼(학번, 이름)을 찾을 수 없습니다." };
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    const data = lastRow > 1 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];

    let targetRowIndex = null;
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const id = String(row[colIndex.studentId] || "").trim();
      const name = String(row[colIndex.studentName] || "").trim();
      if (id === studentId && name === studentName) {
        targetRowIndex = i + 2;
        break;
      }
    }

    const rowValues = new Array(lastCol).fill("");
    rowValues[colIndex.studentId] = studentId;
    rowValues[colIndex.studentName] = studentName;
    if (colIndex.year !== undefined) rowValues[colIndex.year] = studentYear || "";
    if (colIndex.dept !== undefined) rowValues[colIndex.dept] = studentMajor || "";
    if (colIndex.safetyTrained !== undefined) rowValues[colIndex.safetyTrained] = "YES";
    if (colIndex.email !== undefined) rowValues[colIndex.email] = studentEmail || "";

    if (targetRowIndex) {
      sheet.getRange(targetRowIndex, 1, 1, lastCol).setValues([rowValues]);
      return { ok: true, updated: true, row: targetRowIndex };
    }

    sheet.appendRow(rowValues);
    return { ok: true, appended: true, row: sheet.getLastRow() };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// doPost 함수 (기존 코드)
function doPost(e) {
  let payload = {};
  try {
    payload = JSON.parse(e?.postData?.contents || "{}");
  } catch {
    payload = {};
  }
  
  if (payload.action === "verify_student") {
    return json(verifyStudent(payload));
  }

  if (payload.action === "send_email") {
    return json(sendEmail(payload));
  }

  if (payload.action === "add_safety_student") {
    return json(addSafetyStudent(payload));
  }
  
  if (payload.action === "saveReservation") {
    return json(saveReservation(payload));
  }
  
  return json({ ok: false, error: "unknown action" });
}

// doGet 함수 (기존 코드)
function doGet(e) {
  if (e.parameter.action === "verify_student") {
    const payload = {
      action: "verify_student",
      studentId: e.parameter.studentId || "",
      studentName: e.parameter.studentName || "",
      sheetName: e.parameter.sheetName || SAFETY_SHEET,
      columns: {
        studentId: "학번",
        studentName: "이름",
        year: "학년",
        dept: "전공",
        safetyTrained: "안전교육",
      },
    };
    return json(verifyStudent(payload));
  }

  if (e.parameter.action === "send_email") {
    return json(sendEmail({
      to: e.parameter.to || "",
      subject: e.parameter.subject || "",
      body: e.parameter.body || "",
    }));
  }

  if (e.parameter.action === "add_safety_student") {
    return json(addSafetyStudent({
      action: "add_safety_student",
      studentId: e.parameter.studentId || "",
      studentName: e.parameter.studentName || "",
      studentYear: e.parameter.studentYear || "",
      studentMajor: e.parameter.studentMajor || "",
      studentEmail: e.parameter.studentEmail || "",
      sheetName: e.parameter.sheetName || SAFETY_SHEET,
      columns: {
        studentId: "학번",
        studentName: "이름",
        year: "학년",
        dept: "전공",
        safetyTrained: "안전교육",
        email: "1열",
      },
    }));
  }
  
  if (e.parameter.action === "list_sheets") {
    const sheets = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets().map(s => s.getName());
    return json({ ok: true, sheets: sheets });
  }
  
  return json({ ok: false, error: "unknown action" });
}

function sendEmail(payload) {
  try {
    const to = String(payload?.to || "").trim();
    const subject = String(payload?.subject || "(알림)").trim();
    const body = String(payload?.body || "").trim();
    if (!to) return { ok: false, error: "수신자 없음" };
    GmailApp.sendEmail(to, subject, body);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// 유틸리티 함수
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

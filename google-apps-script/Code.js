/**
 * STEM Schedule Web App Backend API
 * Gắn script này vào Google Sheets hoặc Deploy dưới dạng Web App.
 * Cấu hình: 
 * - Execute as: Me
 * - Access: Anyone
 */

// Đặt ID của Google Sheet tại đây nếu chạy standalone script.
// Nếu gắn script trực tiếp vào Google Sheet (Bound script), hãy để trống.
var SHEET_ID = "";

// Thư mục Google Drive lưu ảnh. Thay ID của bạn vào đây (hoặc để trống, script sẽ tự tạo thư mục "STEM_Photos").
var DRIVE_FOLDER_ID = "https://drive.google.com/drive/folders/1MjP2tSkQBfRkEugPud-rwbOIMdgMhcwY?usp=sharing";

function getSpreadsheet() {
  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    if (doc) return doc;
  } catch (e) { }

  if (SHEET_ID && SHEET_ID !== "YOUR_SHEET_ID_HERE") {
    return SpreadsheetApp.openById(SHEET_ID);
  }

  throw new Error("Vui lòng cấu hình Google Sheet ID trong file Code.js hoặc gắn script này trực tiếp vào Sheet (Extensions -> Apps Script).");
}

function doGet(e) {
  return ContentService.createTextOutput("STEM Schedule Web App API is running! Please send POST requests.")
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  // Cho phép CORS
  var origin = "*";

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse({ success: false, error: "Empty request body" });
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var callerEmail = data.callerEmail;

    if (!action) {
      return jsonResponse({ success: false, error: "Action is required" });
    }

    // Nếu là thiết lập ban đầu (setupDatabase) hoặc kiểm tra tài khoản, cho phép không cần kiểm tra quyền trước
    if (action === "setupDatabase") {
      return jsonResponse({ success: true, message: setupDatabase() });
    }

    if (!callerEmail) {
      return jsonResponse({ success: false, error: "Authentication required (callerEmail is missing)" });
    }

    // Kiểm tra thông tin người gọi
    var user = getUserInfo(callerEmail);
    if (!user) {
      return jsonResponse({ success: false, error: "Tài khoản " + callerEmail + " chưa được cấp quyền truy cập hệ thống!" });
    }
    if (!user.active) {
      return jsonResponse({ success: false, error: "Tài khoản " + callerEmail + " đã bị vô hiệu hóa!" });
    }

    var isAdmin = (user.role === "admin");

    switch (action) {
      case "checkUser":
        return jsonResponse({ success: true, user: user });

      case "getScheduleByEmail":
        var emailToGet = data.email || callerEmail;
        // Giáo viên thường chỉ xem lịch của chính họ, Admin có thể xem lịch của người khác
        if (!isAdmin && emailToGet.toLowerCase().trim() !== callerEmail.toLowerCase().trim()) {
          return unauthorized();
        }
        return jsonResponse({ success: true, data: getScheduleByEmail(emailToGet) });

      case "getScheduleByWeek":
        return jsonResponse({ success: true, data: getScheduleByWeek(data.startDate, data.endDate) });

      case "getAllSchedule":
        // Admin xem toàn bộ, GV xem lịch của chính họ
        if (!isAdmin) {
          return jsonResponse({ success: true, data: getScheduleByEmail(callerEmail) });
        }
        return jsonResponse({ success: true, data: getAllSchedule() });

      case "addLesson":
        if (!isAdmin) return unauthorized();
        return jsonResponse({ success: true, data: addLesson(data.lesson) });

      case "editLesson":
        if (!isAdmin) return unauthorized();
        return jsonResponse({ success: true, data: editLesson(data.id, data.lesson) });

      case "deleteLesson":
        if (!isAdmin) return unauthorized();
        return jsonResponse({ success: true, data: deleteLesson(data.id) });

      case "uploadPhoto":
        return jsonResponse({ success: true, drive_url: uploadPhoto(data.scheduleId, data.base64Image, data.fileName, callerEmail) });

      case "getPhotos":
        return jsonResponse({ success: true, data: getPhotos(data.scheduleId) });

      case "getUsers":
        if (!isAdmin) return unauthorized();
        return jsonResponse({ success: true, data: getUsers() });

      case "addUser":
        if (!isAdmin) return unauthorized();
        return jsonResponse({ success: true, data: addUser(data.user) });

      case "deactivateUser":
        if (!isAdmin) return unauthorized();
        return jsonResponse({ success: true, data: deactivateUser(data.email, data.active) });

      default:
        return jsonResponse({ success: false, error: "Hành động không hợp lệ: " + action });
    }
  } catch (error) {
    return jsonResponse({ success: false, error: error.toString() });
  }
}

// Helpers
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function unauthorized() {
  return jsonResponse({ success: false, error: "Yêu cầu quyền Quản trị viên (Admin)" });
}

function rowToObject(headers, row) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = row[i];
  }
  return obj;
}

// 1. Quản lý Users
function getUserInfo(email) {
  if (!email) return null;
  var sheet = getSpreadsheet().getSheetByName("users");
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailIdx = headers.indexOf("email");
  var nameIdx = headers.indexOf("name");
  var roleIdx = headers.indexOf("role");
  var activeIdx = headers.indexOf("active");

  var searchEmail = email.toLowerCase().trim();
  for (var i = 1; i < data.length; i++) {
    if (data[i][emailIdx] && data[i][emailIdx].toString().toLowerCase().trim() === searchEmail) {
      return {
        email: data[i][emailIdx],
        name: data[i][nameIdx],
        role: data[i][roleIdx],
        active: data[i][activeIdx] === true || data[i][activeIdx].toString().toUpperCase() === "TRUE"
      };
    }
  }
  return null;
}

function getUsers() {
  var sheet = getSpreadsheet().getSheetByName("users");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push(rowToObject(headers, data[i]));
  }
  return list;
}

function addUser(user) {
  var sheet = getSpreadsheet().getSheetByName("users");
  if (!sheet) return null;
  var headers = sheet.getDataRange().getValues()[0];

  var existing = getUserInfo(user.email);
  if (existing) {
    throw new Error("Email này đã tồn tại trong danh sách!");
  }

  user.active = (user.active !== undefined) ? user.active : true;

  var rowValues = headers.map(function (h) {
    return user[h] !== undefined ? user[h] : "";
  });

  sheet.appendRow(rowValues);
  return user;
}

function deactivateUser(email, active) {
  var sheet = getSpreadsheet().getSheetByName("users");
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var emailIdx = headers.indexOf("email");
  var activeIdx = headers.indexOf("active");

  var searchEmail = email.toLowerCase().trim();
  for (var i = 1; i < data.length; i++) {
    if (data[i][emailIdx] && data[i][emailIdx].toString().toLowerCase().trim() === searchEmail) {
      sheet.getRange(i + 1, activeIdx + 1).setValue(active);
      return true;
    }
  }
  return false;
}

// 2. Quản lý Lịch dạy (Schedule)
function getScheduleByEmail(email) {
  var sheet = getSpreadsheet().getSheetByName("schedule");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var list = [];

  var gvEmailIdx = headers.indexOf("gv_email");
  var taEmailIdx = headers.indexOf("ta_email");

  var searchEmail = email.toLowerCase().trim();
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var gvEmail = row[gvEmailIdx] ? row[gvEmailIdx].toString().toLowerCase().trim() : "";
    var taEmail = row[taEmailIdx] ? row[taEmailIdx].toString().toLowerCase().trim() : "";

    if (gvEmail === searchEmail || taEmail === searchEmail) {
      list.push(rowToObject(headers, row));
    }
  }
  return list;
}

function parseDateString(str) {
  if (!str) return null;
  // Format YYYY-MM-DD
  var matchYMD = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchYMD) {
    return new Date(matchYMD[1], matchYMD[2] - 1, matchYMD[3]);
  }

  // Format DD/MM/YYYY hoặc D/M/Y
  var parts = str.toString().split("/");
  if (parts.length >= 2) {
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parts.length === 3 ? parseInt(parts[2], 10) : 2026;
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  var d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function getScheduleByWeek(startDate, endDate) {
  var sheet = getSpreadsheet().getSheetByName("schedule");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var list = [];

  var dateIdx = headers.indexOf("date");
  var start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  var end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var dateVal = row[dateIdx];
    var itemDate = null;

    if (dateVal instanceof Date) {
      itemDate = dateVal;
    } else {
      itemDate = parseDateString(dateVal);
    }

    if (itemDate) {
      itemDate.setHours(12, 0, 0, 0); // Tránh lệch múi giờ
      if (itemDate >= start && itemDate <= end) {
        list.push(rowToObject(headers, row));
      }
    }
  }
  return list;
}

function getAllSchedule() {
  var sheet = getSpreadsheet().getSheetByName("schedule");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var list = [];
  for (var i = 1; i < data.length; i++) {
    list.push(rowToObject(headers, data[i]));
  }
  return list;
}

function addLesson(lesson) {
  var sheet = getSpreadsheet().getSheetByName("schedule");
  if (!sheet) return null;
  var headers = sheet.getDataRange().getValues()[0];

  lesson.id = Utilities.getUuid();

  // Chuẩn hóa date sang định dạng YYYY-MM-DD
  if (lesson.date) {
    var d = parseDateString(lesson.date);
    if (d) {
      lesson.date = Utilities.formatDate(d, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
    }
  }

  var rowValues = headers.map(function (h) {
    return lesson[h] !== undefined ? lesson[h] : "";
  });

  sheet.appendRow(rowValues);
  return lesson;
}

function editLesson(id, lesson) {
  var sheet = getSpreadsheet().getSheetByName("schedule");
  if (!sheet) return null;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf("id");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idIdx] && data[i][idIdx].toString() === id.toString()) {
      var rowNum = i + 1;

      // Chuẩn hóa date
      if (lesson.date) {
        var d = parseDateString(lesson.date);
        if (d) {
          lesson.date = Utilities.formatDate(d, Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd");
        }
      }

      headers.forEach(function (h, idx) {
        if (lesson[h] !== undefined && h !== "id") {
          sheet.getRange(rowNum, idx + 1).setValue(lesson[h]);
        }
      });

      var updatedData = sheet.getRange(rowNum, 1, 1, headers.length).getValues()[0];
      return rowToObject(headers, updatedData);
    }
  }
  return null;
}

function deleteLesson(id) {
  var sheet = getSpreadsheet().getSheetByName("schedule");
  if (!sheet) return false;
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIdx = headers.indexOf("id");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idIdx] && data[i][idIdx].toString() === id.toString()) {
      sheet.deleteRow(i + 1);

      // Đồng thời xóa liên kết ảnh
      var pSheet = getSpreadsheet().getSheetByName("photos");
      if (pSheet) {
        var pData = pSheet.getDataRange().getValues();
        var pHeaders = pData[0];
        var sIdIdx = pHeaders.indexOf("schedule_id");
        for (var j = pData.length - 1; j >= 1; j--) {
          if (pData[j][sIdIdx] && pData[j][sIdIdx].toString() === id.toString()) {
            pSheet.deleteRow(j + 1);
          }
        }
      }
      return true;
    }
  }
  return false;
}

// 3. Quản lý hình ảnh
function uploadPhoto(scheduleId, base64Image, fileName, email) {
  var folder;
  if (DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== "YOUR_FOLDER_ID_HERE") {
    folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  } else {
    var folders = DriveApp.getFoldersByName("STEM_Photos");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("STEM_Photos");
    }
  }

  var contentType = "image/jpeg";
  var rawData = base64Image;
  if (base64Image.indexOf(",") > -1) {
    var parts = base64Image.split(",");
    contentType = parts[0].split(";")[0].split(":")[1];
    rawData = parts[1];
  }

  var decoded = Utilities.base64Decode(rawData);
  var blob = Utilities.newBlob(decoded, contentType, fileName);
  var file = folder.createFile(blob);

  // Phân quyền cho mọi người xem ảnh qua link
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Link hiển thị trực tiếp (dùng cấu trúc cdn để hiển thị được trong thẻ img)
  var driveUrl = "https://lh3.googleusercontent.com/d/" + file.getId();

  // Log vào Sheet photos
  var pSheet = getSpreadsheet().getSheetByName("photos");
  if (pSheet) {
    var pHeaders = pSheet.getDataRange().getValues()[0];
    var photoRecord = {
      id: Utilities.getUuid(),
      schedule_id: scheduleId,
      date: Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT+7", "yyyy-MM-dd"),
      uploaded_by: email,
      drive_url: driveUrl,
      timestamp: new Date().toISOString()
    };

    var rowValues = pHeaders.map(function (h) {
      return photoRecord[h] !== undefined ? photoRecord[h] : "";
    });
    pSheet.appendRow(rowValues);
  }

  return driveUrl;
}

function getPhotos(scheduleId) {
  var sheet = getSpreadsheet().getSheetByName("photos");
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  var headers = data[0];
  var list = [];

  var scheduleIdIdx = headers.indexOf("schedule_id");
  for (var i = 1; i < data.length; i++) {
    if (data[i][scheduleIdIdx] && data[i][scheduleIdIdx].toString() === scheduleId.toString()) {
      list.push(rowToObject(headers, data[i]));
    }
  }
  return list;
}

// 4. Khởi tạo cơ sở dữ liệu tự động
function setupDatabase() {
  var doc = getSpreadsheet();
  var log = [];

  // Bảng Users
  var uSheet = doc.getSheetByName("users");
  if (!uSheet) {
    uSheet = doc.insertSheet("users");
    uSheet.appendRow(["email", "name", "role", "active"]);
    uSheet.appendRow(["admin@gmail.com", "Admin System", "admin", true]);
    uSheet.appendRow(["gv1@gmail.com", "Thầy Phước", "teacher", true]);
    uSheet.appendRow(["gv2@gmail.com", "Thầy Tuấn", "teacher", true]);
    log.push("Đã tạo sheet 'users' và thêm tài khoản mẫu.");
  } else {
    log.push("Sheet 'users' đã tồn tại.");
  }

  // Bảng Schedule
  var sSheet = doc.getSheetByName("schedule");
  if (!sSheet) {
    sSheet = doc.insertSheet("schedule");
    sSheet.appendRow([
      "id", "date", "day_of_week", "session", "program", "class",
      "gv_email", "gv_name", "ta_email", "ta_name", "school", "room", "student_count"
    ]);

    // Thêm dữ liệu mẫu từ prompt
    var sampleLessons = [
      [Utilities.getUuid(), "2026-06-08", "2", "Sáng", "Cáp quang và laser", "Khối 9-7 lớp", "gv1@gmail.com", "Thầy Phước", "gv2@gmail.com", "Cô Ngân", "VA", "StemLab", 22],
      [Utilities.getUuid(), "2026-06-10", "4", "Sáng", "Lập trình App", "Khối 10-3lớp", "gv2@gmail.com", "Thầy Tuấn", "gv1@gmail.com", "Cô Uyên", "VA", "StemLab", 25],
      [Utilities.getUuid(), "2026-06-08", "2", "Chiều", "Bionics", "4D1-26", "gv2@gmail.com", "Thầy Tuấn", "gv1@gmail.com", "Thầy Minh", "Việt Anh 2", "314.B10", 26],
      [Utilities.getUuid(), "2026-06-08", "2", "Chiều", "Năng lượng tái tạo", "6A1-25", "gv1@gmail.com", "Thầy Mạnh", "gv2@gmail.com", "Cô Yến Nhi", "Việt Anh 2", "415.B8", 25]
    ];
    sampleLessons.forEach(function (row) {
      sSheet.appendRow(row);
    });

    log.push("Đã tạo sheet 'schedule' và nạp dữ liệu lịch học mẫu.");
  } else {
    log.push("Sheet 'schedule' đã tồn tại.");
  }

  // Bảng Photos
  var pSheet = doc.getSheetByName("photos");
  if (!pSheet) {
    pSheet = doc.insertSheet("photos");
    pSheet.appendRow(["id", "schedule_id", "date", "uploaded_by", "drive_url", "timestamp"]);
    log.push("Đã tạo sheet 'photos'.");
  } else {
    log.push("Sheet 'photos' đã tồn tại.");
  }

  // Xóa sheet mặc định (Sheet1) nếu trống và có sheet khác
  try {
    var defaultSheet = doc.getSheetByName("Sheet1") || doc.getSheetByName("Trang tính1");
    if (defaultSheet && doc.getSheets().length > 1 && defaultSheet.getDataRange().getValues().flat().join("") === "") {
      doc.deleteSheet(defaultSheet);
      log.push("Đã xóa Sheet1 trống mặc định.");
    }
  } catch (e) { }

  return log.join("\n");
}

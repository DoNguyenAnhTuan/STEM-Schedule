const getGasUrl = () => {
  const url = import.meta.env.VITE_GAS_URL;
  if (!url || url.includes("AKfycbz_SAMPLE_ID")) {
    console.warn("CẢNH BÁO: VITE_GAS_URL chưa được cấu hình chính xác trong file .env!");
  }
  return url;
};

/**
 * Gọi API đến Google Apps Script Web App
 * Sử dụng Content-Type là 'text/plain' để tránh kích hoạt CORS Preflight (OPTIONS request), 
 * do Google Apps Script Web App không hỗ trợ OPTIONS method.
 */
async function callApi(action, data = {}) {
  const url = getGasUrl();
  if (!url) {
    throw new Error("Chưa cấu hình URL của Google Apps Script Web App trong file .env!");
  }

  // Tự động đính kèm email của user hiện tại từ localStorage làm callerEmail
  let callerEmail = "";
  try {
    const sessionStr = localStorage.getItem("stem_schedule_session");
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      callerEmail = session.email;
    }
  } catch (e) {
    console.error("Lỗi đọc session từ localStorage:", e);
  }

  const payload = {
    action,
    callerEmail: data.callerEmail || callerEmail,
    ...data
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Lỗi kết nối máy chủ: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success === false) {
      throw new Error(result.error || "Có lỗi xảy ra trong quá trình xử lý!");
    }

    return result;
  } catch (error) {
    console.error(`Lỗi gọi API [${action}]:`, error);
    throw error;
  }
}

export const api = {
  // Xác thực & Kiểm tra tài khoản
  checkUser: async (email) => {
    return callApi("checkUser", { callerEmail: email });
  },

  // Khởi tạo Database mẫu (tiện ích)
  setupDatabase: async () => {
    return callApi("setupDatabase");
  },

  // Xem lịch dạy
  getScheduleByEmail: async (email) => {
    return callApi("getScheduleByEmail", { email });
  },

  getScheduleByWeek: async (startDate, endDate) => {
    return callApi("getScheduleByWeek", { startDate, endDate });
  },

  getAllSchedule: async () => {
    return callApi("getAllSchedule");
  },

  // CRUD Lịch học (Chỉ Admin)
  addLesson: async (lesson) => {
    return callApi("addLesson", { lesson });
  },

  editLesson: async (id, lesson) => {
    return callApi("editLesson", { id, lesson });
  },

  deleteLesson: async (id) => {
    return callApi("deleteLesson", { id });
  },

  // Upload hình ảnh
  uploadPhoto: async (scheduleId, base64Image, fileName) => {
    return callApi("uploadPhoto", { scheduleId, base64Image, fileName });
  },

  getPhotos: async (scheduleId) => {
    return callApi("getPhotos", { scheduleId });
  },

  // Quản lý Users (Chỉ Admin)
  getUsers: async () => {
    return callApi("getUsers");
  },

  addUser: async (user) => {
    return callApi("addUser", { user });
  },

  deactivateUser: async (email, active) => {
    return callApi("deactivateUser", { email, active });
  }
};

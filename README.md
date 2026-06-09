# 📅 STEM Schedule Web App — EIU FabLab

Ứng dụng quản lý lịch dạy STEM dành cho Giáo viên và Admin tại Trường Việt Anh & Việt Anh 2 (năm học 2025-2026). 

Giao diện thời khóa biểu đại học mượt mà trên Desktop và Mobile-first tiện lợi, tích hợp đăng nhập Google OAuth và lưu ảnh minh chứng buổi học trực tiếp vào thư mục Google Drive thông qua hệ thống lưu trữ Google Sheets.

---

## 🛠️ HƯỚNG DẪN CÀI ĐẶT CHI TIẾT

### Bước 1: Thiết lập Google Sheets & Google Apps Script
1. Tạo một trang tính **Google Sheet** mới.
2. Tại thanh Menu, chọn **Tiện ích mở rộng (Extensions)** -> **Apps Script**.
3. Copy toàn bộ nội dung trong file [google-apps-script/Code.js](file:///c:/Users/VirgoSu/Downloads/LICH/google-apps-script/Code.js) và paste vào cửa sổ chỉnh sửa code của Apps Script (thay thế file `Mã.gs` mặc định).
4. *(Tùy chọn)* Nếu muốn lưu ảnh vào một thư mục cụ thể trên Google Drive, hãy tạo một thư mục trên Drive, copy ID của thư mục đó và dán vào biến `DRIVE_FOLDER_ID` ở dòng đầu của file Code.js. Nếu để trống, script sẽ tự động tạo thư mục mang tên `"STEM_Photos"`.
5. Bấm vào nút **Lưu (Save icon)**.

### Bước 2: Deploy Google Apps Script dưới dạng Web App
1. Nhấp vào nút **Tạo bản phân phối mới (Deploy)** ở góc trên bên phải -> chọn **Bản phân phối mới (New deployment)**.
2. Chọn loại cấu hình là **Ứng dụng web (Web app)** bằng cách nhấn vào biểu tượng bánh răng cài đặt.
3. Cấu hình như sau:
   - **Mô tả (Description)**: *STEM Schedule API v1*
   - **Thực thi dưới danh nghĩa (Execute as)**: **Tôi (Me / email của bạn)**
   - **Ai có quyền truy cập (Who has access)**: **Mọi người (Anyone)** *(⚠️ BẮT BUỘC để React App gọi được API)*
4. Nhấn **Triển khai (Deploy)**.
5. Cấp quyền truy cập cho script (Authorize Access) và đăng nhập bằng tài khoản Google của bạn khi được yêu cầu.
6. Sau khi deploy thành công, sao chép **URL của ứng dụng web** (Web app URL) có dạng `https://script.google.com/macros/s/xxxx/exec`.

### Bước 3: Tạo Google OAuth Client ID
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo một dự án mới hoặc chọn dự án hiện có.
3. Vào mục **APIs & Services** -> **OAuth consent screen**:
   - Chọn **External** -> Nhập thông tin liên hệ bắt buộc.
   - Ở bước Scope, nhấn lưu tiếp tục.
4. Vào mục **APIs & Services** -> **Credentials**:
   - Nhấn **Create Credentials** ở thanh trên cùng -> Chọn **OAuth client ID**.
   - **Application type**: **Web application**.
   - **Name**: *STEM Schedule App*.
   - **Authorized JavaScript origins**:
     - Thêm: `http://localhost:5173` (cho quá trình chạy thử nghiệm local)
     - Thêm: URL trang web sau khi deploy lên Vercel (ví dụ: `https://ten-du-an.vercel.app`).
   - Nhấn **Create (Tạo)**.
5. Sao chép **Client ID** được cấp.

### Bước 4: Thiết lập biến môi trường
1. Tạo một file `.env` ở thư mục gốc của dự án (hoặc đổi tên file `.env.example`).
2. Nhập các giá trị đã lấy ở các bước trên vào:
   ```env
   VITE_GAS_URL=DÁN_URL_WEB_APP_APPS_SCRIPT_VÀO_ĐÂY
   VITE_GOOGLE_CLIENT_ID=DÁN_CLIENT_ID_GOOGLE_OAUTH_VÀO_ĐÂY
   ```

---

## 💻 CHẠY THỬ NGHIỆM LOCAL

1. Mở Terminal tại thư mục dự án và chạy lệnh sau để tải các package:
   ```bash
   npm install
   ```
2. Khởi chạy môi trường phát triển cục bộ:
   ```bash
   npm run dev
   ```
3. Mở trình duyệt truy cập `http://localhost:5173`.

### ⚡ Cấu hình nhanh cơ sở dữ liệu mẫu
Khi truy cập trang web lần đầu tiên, do Google Sheet của bạn chưa có các bảng tính mẫu, hệ thống sẽ hiện nút **"Khởi tạo Google Sheet mẫu"** tại màn hình đăng nhập.
- Hãy nhấp vào nút đó, hệ thống sẽ tự động tạo 3 tab: `users`, `schedule`, `photos` trên trang tính Google Sheet của bạn, đồng thời nạp một số tài khoản và lịch học STEM mẫu thực tế.
- Sau khi khởi tạo thành công, tài khoản admin mặc định sẽ được cấp quyền đăng nhập là: `admin@gmail.com` (và một số tài khoản giáo viên như `gv1@gmail.com`, `gv2@gmail.com`). 
- *Chú ý*: Để đăng nhập được bằng Gmail cá nhân của bạn, hãy đăng nhập Google Sheet bằng tài khoản Admin, thêm địa chỉ email của bạn vào tab `users` với role mong muốn (`admin` hoặc `teacher`), và đặt cột `active` thành `TRUE`.

---

## 🚀 DEPLOY LÊN VERCEL

1. Đẩy mã nguồn dự án lên GitHub cá nhân của bạn.
2. Truy cập [Vercel](https://vercel.com/) và kết nối với tài khoản GitHub của bạn.
3. Chọn dự án vừa tạo để tiến hành Import.
4. Ở phần **Environment Variables** (Biến môi trường), thêm 2 biến:
   - Key: `VITE_GAS_URL` | Value: *URL Apps Script của bạn*
   - Key: `VITE_GOOGLE_CLIENT_ID` | Value: *Google Client ID của bạn*
5. Nhấn **Deploy**. Sau khi hoàn tất, Vercel sẽ cấp cho bạn một domain trực tuyến.
6. **LƯU Ý QUAN TRỌNG**: Đừng quên quay lại Google Cloud Console -> Credentials, thêm URL domain của Vercel vào mục **Authorized JavaScript origins** của OAuth Client ID đã tạo để cho phép đăng nhập Google từ trang web chính thức.

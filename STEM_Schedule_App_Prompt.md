# STEM Schedule Web App — Full Build Prompt

> Copy toàn bộ nội dung bên dưới và paste vào Claude (hoặc Cursor / ChatGPT) để generate đầy đủ code.

---

## TECH STACK

- **Frontend**: React + Vite, deploy on Vercel
- **Auth**: Google OAuth (Gmail login)
- **Backend**: Google Apps Script (Web App) as REST API
- **Database**: Google Sheets (3 sheets)
- **File storage**: Google Drive (for class photos)

---

## GOOGLE SHEETS STRUCTURE

**Sheet 1: `users`**

| email | name | role | active |
|---|---|---|---|
| admin@gmail.com | Admin | admin | TRUE |
| gv1@gmail.com | Thầy Phước | teacher | TRUE |

**Sheet 2: `schedule`**

| id | date | day_of_week | session | program | class | gv_email | gv_name | ta_email | ta_name | school | room | student_count |
|---|---|---|---|---|---|---|---|---|---|---|---|---|

**Sheet 3: `photos`**

| id | schedule_id | date | uploaded_by | drive_url | timestamp |
|---|---|---|---|---|---|

---

## GOOGLE APPS SCRIPT (Backend API)

Create a Google Apps Script Web App deployed as:
- **Execute as**: Me
- **Access**: Anyone

Endpoints (all via POST with `action` param):

- `getScheduleByEmail` — returns all lessons for a given teacher email
- `getScheduleByWeek` — returns lessons for a date range
- `getAllSchedule` — admin only, returns full schedule
- `addLesson` — admin only, add new row to schedule sheet
- `editLesson` — admin only, edit existing row
- `deleteLesson` — admin only, delete row
- `uploadPhoto` — accepts base64 image, saves to Google Drive folder, logs URL to photos sheet, returns Drive URL
- `getPhotos` — returns all photos for a given schedule_id
- `getUsers` — admin only
- `addUser` / `deactivateUser` — admin only

All endpoints check the caller's email against the `users` sheet for role-based access.

---

## FRONTEND — PAGES & FEATURES

### Login page
- Google OAuth login button
- After login, check email against `users` sheet via Apps Script
- If not found or inactive → show "Tài khoản chưa được cấp quyền"
- Store session in localStorage

---

### Teacher view (role: teacher)

**Weekly calendar page** (main view — similar to university timetable UI):
- Header: current week range (e.g. "Tuần 40 | 08/06 – 14/06/2026")
- Left/right arrows to navigate weeks
- Column headers: Thứ 2–Chủ Nhật with dates
- Row headers: time slots (07:30, 08:30, 09:30 ... 20:00)
- Lesson cards appear in the correct day/time cell, showing: program name, class, room, time range, colored by program type
- Only show lessons where `gv_email` OR `ta_email` matches logged-in user

**Lesson detail modal** (click on a lesson card):
- Program name, class, school, room
- GV chính name + avatar initials
- Trợ giảng name + avatar initials
- Student count
- Date & time
- **"Thêm ảnh"** button → opens camera or file picker
- Upload photo → calls `uploadPhoto` API → saves to Drive → thumbnail appears below
- Show all previously uploaded photos for this lesson in a grid

---

### Admin view (role: admin)
- Same weekly calendar but shows ALL lessons
- **"+ Thêm tiết"** floating button → form modal to add new lesson
- Click lesson → detail modal with **Edit** and **Delete** buttons
- **Quản lý GV** page: table of users, add/deactivate accounts
- **Xem theo GV** filter: dropdown to filter calendar by specific teacher

---

## UI DESIGN

- Vietnamese language throughout
- Mobile-first responsive (works on phone browser)
- Dark navy header: `#1a3a5c`
- Each program has a unique accent color (left border on lesson cards):

| Chương trình | Màu |
|---|---|
| Bionics | `#9b59b6` |
| Khám phá xe robot | `#e67e22` |
| Năng lượng tái tạo | `#27ae60` |
| Lập trình App | `#2980b9` |
| Lập trình Drone | `#e74c3c` |
| Khám phá cơ điện tử | `#16a085` |
| Cáp quang và laser | `#1a3a5c` |

- Bottom tab nav on mobile, sidebar on desktop
- Clean card-based lesson cells like university timetable UI

---

## SAMPLE DATA (từ lịch thực tế)

| date | day_of_week | session | program | class | gv_name | ta_name | school | room | student_count |
|---|---|---|---|---|---|---|---|---|---|
| 8/9 | 2 | Sáng | Cáp quang và laser | Khối 9-7 lớp | Thầy Phước | Cô Ngân | VA | StemLab | 22 |
| 17/9 | 4 | Sáng | Lập trình App | Khối 10-3lớp | Thầy Tuấn | Cô Uyên | VA | StemLab | 25 |
| 13/10 | 2 | - | Bionics | 4D1-26 | Thầy Tuấn | Thầy Minh | Việt Anh 2 | 314.B10 | 26 |
| 13/10 | 2 | - | Năng lượng tái tạo | 6A1-25 | Thầy Mạnh | Cô Yến Nhi | Việt Anh 2 | 415.B8 | 25 |
| 14/10 | 3 | - | Khám phá xe robot | 7B3-25 | Cô Uyên | Cô Ngân | Việt Anh 2 | 415.B8 | 25 |
| 15/10 | 4 | - | Bionics | 4D3-24 | Thầy Minh | Cô Ngân | Việt Anh 2 | 314.B10 | 23 |
| 21/10 | 3 | - | Lập trình Drone | 5E4-20 | Thầy Minh | Thầy Mạnh | Việt Anh 2 | StemLab | 20 |

---

## SETUP INSTRUCTIONS (đưa vào README)

1. Tạo Google Sheet với 3 tab: `users`, `schedule`, `photos`
2. Mở Apps Script editor → paste backend code → Deploy as Web App → copy URL
3. Tạo file `.env`:
   ```
   VITE_GAS_URL=https://script.google.com/macros/s/YOUR_ID/exec
   VITE_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
   ```
4. Tạo Google OAuth credentials trong Google Cloud Console (Authorized origins: `http://localhost:5173` và domain Vercel)
5. Chạy local:
   ```bash
   npm install
   npm run dev
   ```
6. Deploy lên Vercel: kết nối GitHub repo → thêm env vars → deploy

---

*Generated for EIU FabLab — STEM Trường Việt Anh & Việt Anh 2, năm học 2025-2026*

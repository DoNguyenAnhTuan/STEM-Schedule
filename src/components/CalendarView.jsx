import React, { useState, useEffect } from 'react';
import { api } from '../api';
import {
  ChevronLeft, ChevronRight, Plus, Filter, Users, User,
  MapPin, Calendar, Clock, BookOpen, AlertCircle, RefreshCw
} from 'lucide-react';
import LessonDetailModal from './LessonDetailModal';

const PROGRAMS = [
  "Bionics",
  "Khám phá xe robot",
  "Năng lượng tái tạo",
  "Lập trình App",
  "Lập trình Drone",
  "Khám phá cơ điện tử",
  "Cáp quang và laser"
];

const PROGRAM_COLORS = {
  "Bionics": "bionics",
  "Khám phá xe robot": "robot",
  "Năng lượng tái tạo": "renewable",
  "Lập trình App": "app",
  "Lập trình Drone": "drone",
  "Khám phá cơ điện tử": "mech",
  "Cáp quang và laser": "laser"
};

const DAYS_VN = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
const SESSIONS = ["Sáng", "Chiều", "Tối"];

export default function CalendarView({ userRole, userSession }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [lessons, setLessons] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter state
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState("all");

  // Selected lesson for detail view
  const [selectedLesson, setSelectedLesson] = useState(null);

  // Form modal state
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formLessonId, setFormLessonId] = useState("");
  const [formData, setFormData] = useState({
    date: "",
    day_of_week: "2",
    session: "Sáng",
    program: PROGRAMS[0],
    class: "",
    gv_email: "",
    gv_name: "",
    ta_email: "",
    ta_name: "",
    school: "VA",
    room: "StemLab",
    student_count: 20
  });

  const [submitting, setSubmitting] = useState(false);

  // Lấy các ngày trong tuần hiện tại (Thứ 2 -> Chủ Nhật)
  const getWeekDates = (date) => {
    const current = new Date(date);
    const day = current.getDay(); // 0: Chủ Nhật, 1: Thứ 2...
    // Tính toán khoảng lệch để tìm ra ngày thứ 2
    const diff = current.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(current.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const nextDate = new Date(monday);
      nextDate.setDate(monday.getDate() + i);
      dates.push(nextDate);
    }
    return dates;
  };

  const weekDates = getWeekDates(currentDate);
  const startOfWeek = weekDates[0];
  const endOfWeek = weekDates[6];

  // Tính số tuần ISO
  const getISOWeekNumber = (date) => {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target) / 604800000);
  };

  const weekNumber = getISOWeekNumber(currentDate);

  useEffect(() => {
    fetchData();
    if (userRole === "admin") {
      fetchTeachers();
    }
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const startStr = startOfWeek.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];

      const res = await api.getScheduleByWeek(startStr, endStr);
      setLessons(res.data || []);
    } catch (err) {
      setError("Không thể tải lịch học: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.getUsers();
      setTeachersList(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách giáo viên:", err);
    }
  };

  const handlePrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(currentDate.getDate() - 7);
    setCurrentDate(prev);
  };

  const handleNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(currentDate.getDate() + 7);
    setCurrentDate(next);
  };

  // Ánh xạ buổi học sang row của grid (Sáng, Chiều, Tối)
  const getRowSession = (sessionStr) => {
    if (!sessionStr) return "Chiều";
    const s = sessionStr.toLowerCase();
    if (s.includes("sáng") || s.includes("sang") || s.includes("am") || s.includes("07:") || s.includes("08:") || s.includes("09:") || s.includes("10:") || s.includes("11:")) {
      return "Sáng";
    }
    if (s.includes("tối") || s.includes("toi") || s.includes("pm") || s.includes("18:") || s.includes("19:") || s.includes("20:")) {
      return "Tối";
    }
    return "Chiều";
  };

  // Ánh xạ thứ sang index column của grid (0 -> 6)
  const getDayColumnIndex = (dayStr) => {
    if (dayStr === null || dayStr === undefined) return 0;
    const d = dayStr.toString().trim().toLowerCase();
    if (d === "2" || d.includes("hai") || d === "t2") return 0;
    if (d === "3" || d.includes("ba") || d === "t3") return 1;
    if (d === "4" || d.includes("tư") || d.includes("tu") || d === "t4") return 2;
    if (d === "5" || d.includes("năm") || d.includes("nam") || d === "t5") return 3;
    if (d === "6" || d.includes("sáu") || d.includes("sau") || d === "t6") return 4;
    if (d === "7" || d.includes("bảy") || d.includes("bay") || d === "t7") return 5;
    if (d === "8" || d.includes("nhật") || d.includes("nhat") || d === "cn") return 6;
    return 0;
  };

  // Định dạng ngày thành DD/MM
  const formatDateDM = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${d}/${m}`;
  };

  const formatDateVN = (date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  // Tự động điền ngày thứ khi thay đổi ngày nhập liệu
  const handleDateChange = (dateValue) => {
    if (!dateValue) return;
    const dateObj = new Date(dateValue);
    const day = dateObj.getDay(); // 0 is Sunday, 1 is Monday...
    const dayStr = day === 0 ? "8" : (day + 1).toString();
    setFormData(prev => ({
      ...prev,
      date: dateValue,
      day_of_week: dayStr
    }));
  };

  // Tự động điền tên GV/TA khi chọn email
  const handleTeacherEmailChange = (fieldPrefix, email) => {
    const selected = teachersList.find(t => t.email.toLowerCase() === email.toLowerCase());
    setFormData(prev => ({
      ...prev,
      [`${fieldPrefix}_email`]: email,
      [`${fieldPrefix}_name`]: selected ? selected.name : ""
    }));
  };

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setFormLessonId("");
    setFormData({
      date: new Date().toISOString().split('T')[0],
      day_of_week: (new Date().getDay() === 0 ? 8 : new Date().getDay() + 1).toString(),
      session: "Sáng",
      program: PROGRAMS[0],
      class: "",
      gv_email: teachersList.length > 0 ? teachersList[0].email : "",
      gv_name: teachersList.length > 0 ? teachersList[0].name : "",
      ta_email: teachersList.length > 1 ? teachersList[1].email : "",
      ta_name: teachersList.length > 1 ? teachersList[1].name : "",
      school: "VA",
      room: "StemLab",
      student_count: 20
    });
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (lesson) => {
    setIsEditMode(true);
    setFormLessonId(lesson.id);

    // Parse date if string, handle different formats
    let parsedDate = "";
    if (lesson.date) {
      if (lesson.date.includes("T")) {
        parsedDate = lesson.date.split("T")[0];
      } else {
        parsedDate = lesson.date;
      }
    }

    setFormData({
      date: parsedDate,
      day_of_week: (lesson.day_of_week || "2").toString(),
      session: lesson.session || "Sáng",
      program: lesson.program || PROGRAMS[0],
      class: lesson.class || "",
      gv_email: lesson.gv_email || "",
      gv_name: lesson.gv_name || "",
      ta_email: lesson.ta_email || "",
      ta_name: lesson.ta_name || "",
      school: lesson.school || "VA",
      room: lesson.room || "StemLab",
      student_count: parseInt(lesson.student_count) || 0
    });
    setSelectedLesson(null); // đóng detail modal
    setShowAddEditModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (isEditMode) {
        await api.editLesson(formLessonId, formData);
      } else {
        await api.addLesson(formData);
      }
      setShowAddEditModal(false);
      fetchData();
    } catch (err) {
      setError("Không thể lưu buổi học: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async (id) => {
    setError("");
    try {
      await api.deleteLesson(id);
      setSelectedLesson(null);
      fetchData();
    } catch (err) {
      setError("Không thể xóa buổi học: " + err.message);
    }
  };

  // Lọc lịch hiển thị
  const filteredLessons = lessons.filter(lesson => {
    // 1. Phân quyền: Giáo viên chỉ thấy lịch của họ
    if (userRole !== "admin") {
      const email = userSession.email.toLowerCase().trim();
      const gvEmail = (lesson.gv_email || "").toLowerCase().trim();
      const taEmail = (lesson.ta_email || "").toLowerCase().trim();
      if (gvEmail !== email && taEmail !== email) {
        return false;
      }
    }

    // 2. Filter theo giáo viên (dành cho Admin)
    if (userRole === "admin" && selectedTeacherFilter !== "all") {
      const filterEmail = selectedTeacherFilter.toLowerCase().trim();
      const gvEmail = (lesson.gv_email || "").toLowerCase().trim();
      const taEmail = (lesson.ta_email || "").toLowerCase().trim();
      if (gvEmail !== filterEmail && taEmail !== filterEmail) {
        return false;
      }
    }

    return true;
  });

  // Chia dữ liệu ra ma trận: row=Session, col=DayIndex (0->6)
  const gridMatrix = {
    "Sáng": [[], [], [], [], [], [], []],
    "Chiều": [[], [], [], [], [], [], []],
    "Tối": [[], [], [], [], [], [], []]
  };

  filteredLessons.forEach(lesson => {
    const row = getRowSession(lesson.session);
    const col = getDayColumnIndex(lesson.day_of_week);
    if (gridMatrix[row] && gridMatrix[row][col]) {
      gridMatrix[row][col].push(lesson);
    }
  });

  // Nhóm lịch theo ngày học trên Mobile
  const mobileGroups = [[], [], [], [], [], [], []]; // index 0->6 đại diện cho Thứ 2 -> CN
  filteredLessons.forEach(lesson => {
    const col = getDayColumnIndex(lesson.day_of_week);
    mobileGroups[col].push(lesson);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      {/* Page Title & Actions */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Lịch STEM Đại học</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {userRole === 'admin' ? "Quản trị viên: xem và điều phối lịch giảng dạy." : `Giáo viên: ${userSession.name} — xem lịch phân công giảng dạy.`}
          </p>
        </div>
        {userRole === 'admin' && (
          <button className="btn btn-primary btn-floating" onClick={handleOpenAdd}>
            <Plus size={16} />
            <span>Thêm tiết</span>
          </button>
        )}
      </div>

      {error && (
        <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Navigation Panel */}
      <div className="calendar-filter-bar">
        {/* Navigation Week */}
        <div className="week-navigator">
          <button className="btn btn-secondary btn-icon-only" onClick={handlePrevWeek}>
            <ChevronLeft size={16} />
          </button>
          <span className="current-week-label">
            Tuần {weekNumber} | {formatDateDM(startOfWeek)} – {formatDateDM(endOfWeek)} ({startOfWeek.getFullYear()})
          </span>
          <button className="btn btn-secondary btn-icon-only" onClick={handleNextWeek}>
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Filters for Admin */}
        {userRole === 'admin' && (
          <div className="filter-selects">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <Filter size={16} style={{ color: 'var(--text-muted)' }} />
              <select
                className="input-select"
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
              >
                <option value="all">Xem tất cả GV & TA</option>
                {teachersList.map((t) => (
                  <option key={t.email} value={t.email}>{t.name} ({t.email})</option>
                ))}
              </select>
            </div>
            <button className="btn btn-secondary" onClick={fetchData} disabled={loading} title="Tải lại">
              <RefreshCw size={14} className={loading ? "spin" : ""} />
            </button>
          </div>
        )}

        {userRole !== 'admin' && (
          <button className="btn btn-secondary" style={{ alignSelf: 'flex-end' }} onClick={fetchData} disabled={loading}>
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            Cập nhật lịch
          </button>
        )}
      </div>

      {/* TIMETABLE GRID (Desktop view) */}
      {loading && lessons.length === 0 ? (
        <div className="shadow-wrapper" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="empty-state">
            <div className="loader" style={{ width: '40px', height: '40px' }}></div>
            <p>Đang tải dữ liệu thời khóa biểu...</p>
          </div>
        </div>
      ) : (
        <>
          <div className="calendar-grid">
            {/* Header: Row 0 */}
            <div className="calendar-time-col-header"></div>
            {weekDates.map((date, idx) => (
              <div key={idx} className="calendar-header-cell">
                <div className="calendar-header-day">{DAYS_VN[idx]}</div>
                <div className="calendar-header-date">{formatDateDM(date)}</div>
              </div>
            ))}

            {/* Sessions: Sáng, Chiều, Tối */}
            {SESSIONS.map((sessionName) => (
              <React.Fragment key={sessionName}>
                <div className="calendar-time-cell">Ca {sessionName}</div>
                {DAYS_VN.map((dayName, colIdx) => {
                  const items = gridMatrix[sessionName][colIdx];
                  return (
                    <div key={dayName} className="calendar-day-cell">
                      {items.map((lesson) => {
                        const pClass = PROGRAM_COLORS[lesson.program] || "laser";
                        return (
                          <div
                            key={lesson.id}
                            className={`lesson-card border-${pClass}`}
                            onClick={() => setSelectedLesson(lesson)}
                          >
                            <div className="lesson-card-program">{lesson.program}</div>
                            <div className="lesson-card-class">{lesson.class}</div>
                            <div className="lesson-card-info">
                              <MapPin size={10} />
                              <span>{lesson.room} ({lesson.school})</span>
                            </div>
                            <div className="lesson-card-info" style={{ marginTop: '2px' }}>
                              <User size={10} />
                              <span style={{ textOverflow: 'ellipsis', overflow: 'hidden' }}>{lesson.gv_name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          {/* LIST SCHEDULE (Mobile View) */}
          <div className="mobile-schedule-list">
            {weekDates.map((date, idx) => {
              const dayLessons = mobileGroups[idx];
              if (dayLessons.length === 0) return null;

              return (
                <div key={idx} className="mobile-day-group">
                  <div className="mobile-day-title">
                    <span>{DAYS_VN[idx]} — {formatDateDM(date)}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dayLessons.length} tiết</span>
                  </div>
                  {dayLessons.map((lesson) => {
                    const pClass = PROGRAM_COLORS[lesson.program] || "laser";
                    return (
                      <div
                        key={lesson.id}
                        className={`mobile-lesson-card border-${pClass}`}
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <div className="mobile-lesson-header">
                          <div>
                            <span className="mobile-lesson-program">{lesson.program}</span>
                            <div className="mobile-lesson-class">{lesson.class}</div>
                          </div>
                          <span className={`badge tag-${pClass}`} style={{ fontSize: '0.65rem' }}>
                            Ca {lesson.session}
                          </span>
                        </div>
                        <div className="mobile-lesson-details">
                          <div className="mobile-lesson-detail-item">
                            <MapPin />
                            <span>{lesson.school} - {lesson.room}</span>
                          </div>
                          <div className="mobile-lesson-detail-item">
                            <Users />
                            <span>{lesson.student_count} hs</span>
                          </div>
                          <div className="mobile-lesson-detail-item" style={{ gridColumn: 'span 2' }}>
                            <User />
                            <span>GV: {lesson.gv_name} | TA: {lesson.ta_name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {filteredLessons.length === 0 && (
              <div className="shadow-wrapper" style={{ padding: '3rem 1rem', textCentered: 'center' }}>
                <div className="empty-state">
                  <BookOpen size={48} />
                  <p>Không có tiết học nào được xếp trong tuần này.</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          userRole={userRole}
          userSession={userSession}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteLesson}
        />
      )}

      {/* Add / Edit Lesson Modal */}
      {showAddEditModal && (
        <div className="modal-overlay" onClick={() => setShowAddEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{isEditMode ? "Chỉnh sửa buổi học" : "Tạo buổi học mới"}</h2>
              <button className="btn btn-secondary btn-icon-only" style={{ border: 'none' }} onClick={() => setShowAddEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {/* Error alert inside form */}
                {error && (
                  <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Ngày học</label>
                    <input
                      type="date"
                      required
                      className="form-input"
                      value={formData.date}
                      onChange={(e) => handleDateChange(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thứ trong tuần</label>
                    <select
                      className="input-select"
                      style={{ width: '100%', minWidth: 'auto', padding: '0.65rem 1rem' }}
                      value={formData.day_of_week}
                      onChange={(e) => setFormData(prev => ({ ...prev, day_of_week: e.target.value }))}
                    >
                      <option value="2">Thứ 2</option>
                      <option value="3">Thứ 3</option>
                      <option value="4">Thứ 4</option>
                      <option value="5">Thứ 5</option>
                      <option value="6">Thứ 6</option>
                      <option value="7">Thứ 7</option>
                      <option value="8">Chủ Nhật</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Ca học</label>
                    <select
                      className="input-select"
                      style={{ width: '100%', minWidth: 'auto', padding: '0.65rem 1rem' }}
                      value={formData.session}
                      onChange={(e) => setFormData(prev => ({ ...prev, session: e.target.value }))}
                    >
                      <option value="Sáng">Sáng (Morning)</option>
                      <option value="Chiều">Chiều (Afternoon)</option>
                      <option value="Tối">Tối (Evening)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chương trình STEM</label>
                    <select
                      className="input-select"
                      style={{ width: '100%', minWidth: 'auto', padding: '0.65rem 1rem' }}
                      value={formData.program}
                      onChange={(e) => setFormData(prev => ({ ...prev, program: e.target.value }))}
                    >
                      {PROGRAMS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Lớp học</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 4D1-26, 7B3-25"
                      className="form-input"
                      value={formData.class}
                      onChange={(e) => setFormData(prev => ({ ...prev, class: e.target.value }))}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Sĩ số học sinh</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="form-input"
                      value={formData.student_count}
                      onChange={(e) => setFormData(prev => ({ ...prev, student_count: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Trường học</label>
                    <select
                      className="input-select"
                      style={{ width: '100%', minWidth: 'auto', padding: '0.65rem 1rem' }}
                      value={formData.school}
                      onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
                    >
                      <option value="VA">Việt Anh (VA)</option>
                      <option value="Việt Anh 2">Việt Anh 2</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phòng học</label>
                    <input
                      type="text"
                      required
                      placeholder="StemLab, 415.B8..."
                      className="form-input"
                      value={formData.room}
                      onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Teachers select */}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Giáo viên chính</label>
                    <select
                      className="input-select"
                      style={{ width: '100%', minWidth: 'auto', padding: '0.65rem 1rem' }}
                      value={formData.gv_email}
                      onChange={(e) => handleTeacherEmailChange("gv", e.target.value)}
                    >
                      <option value="">-- Chọn Giáo Viên --</option>
                      {teachersList.map((t) => (
                        <option key={`gv-${t.email}`} value={t.email}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Trợ giảng (TA)</label>
                    <select
                      className="input-select"
                      style={{ width: '100%', minWidth: 'auto', padding: '0.65rem 1rem' }}
                      value={formData.ta_email}
                      onChange={(e) => handleTeacherEmailChange("ta", e.target.value)}
                    >
                      <option value="">-- Chọn Trợ Giảng --</option>
                      {teachersList.map((t) => (
                        <option key={`ta-${t.email}`} value={t.email}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddEditModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="loader" style={{ borderTopColor: 'white' }}></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    "Lưu lịch học"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

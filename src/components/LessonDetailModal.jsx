import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { 
  Calendar, Clock, MapPin, Users, User, Camera, 
  Trash2, Edit, AlertCircle, Image as ImageIcon, ExternalLink 
} from 'lucide-react';

const PROGRAM_COLORS = {
  "Bionics": "bionics",
  "Khám phá xe robot": "robot",
  "Năng lượng tái tạo": "renewable",
  "Lập trình App": "app",
  "Lập trình Drone": "drone",
  "Khám phá cơ điện tử": "mech",
  "Cáp quang và laser": "laser"
};

export default function LessonDetailModal({ lesson, onClose, userRole, userSession, onEdit, onDelete }) {
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  
  const programClass = PROGRAM_COLORS[lesson.program] || "laser";
  const isAdmin = userRole === "admin";

  useEffect(() => {
    if (lesson && lesson.id) {
      fetchPhotos();
    }
  }, [lesson]);

  const fetchPhotos = async () => {
    setLoadingPhotos(true);
    setError("");
    try {
      const res = await api.getPhotos(lesson.id);
      setPhotos(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy ảnh:", err);
      // Không cần chặn UI nếu lỗi load ảnh, chỉ log
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Giới hạn dung lượng file upload (dưới 10MB để tránh tràn bộ nhớ base64 của Apps Script)
    if (file.size > 10 * 1024 * 1024) {
      setError("Dung lượng file quá lớn. Vui lòng chọn ảnh dưới 10MB.");
      return;
    }

    setUploading(true);
    setError("");
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result;
        const fileName = `lesson_${lesson.id}_${Date.now()}.jpg`;
        
        try {
          const res = await api.uploadPhoto(lesson.id, base64Data, fileName);
          
          // Thêm ảnh vừa upload vào danh sách đầu
          const newPhoto = {
            id: Date.now().toString(),
            schedule_id: lesson.id,
            drive_url: res.drive_url,
            uploaded_by: userSession.name || userSession.email,
            timestamp: new Date().toISOString()
          };
          setPhotos(prev => [newPhoto, ...prev]);
        } catch (err) {
          setError("Lỗi tải ảnh lên Google Drive: " + err.message);
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("Không đọc được tệp hình ảnh: " + err.message);
      setUploading(false);
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm("Bạn có chắc chắn muốn xóa buổi học này? Thao tác này cũng sẽ xóa liên kết tất cả hình ảnh liên quan.")) {
      onDelete(lesson.id);
    }
  };

  // Tạo avatar từ 2 chữ cái đầu của họ và tên
  const getInitials = (name) => {
    if (!name) return "?";
    const words = name.trim().split(" ");
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };

  // Chuyển ngày YYYY-MM-DD sang DD/MM/YYYY
  const formatDateVN = (dateStr) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        
        <div className="modal-header">
          <span className={`badge tag-${programClass}`} style={{ fontSize: '0.8rem' }}>
            {lesson.program}
          </span>
          <button className="btn btn-secondary btn-icon-only" style={{ border: 'none' }} onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-primary-dark)', lineHeight: 1.2 }}>
              Lớp: {lesson.class}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
              Chương trình: {lesson.program}
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Details Grid */}
          <div className="details-list">
            <div className="detail-row">
              <Calendar />
              <span className="detail-label">Ngày học:</span>
              <span className="detail-value">{formatDateVN(lesson.date)} (Thứ {lesson.day_of_week === "8" || lesson.day_of_week === "CN" ? "Chủ Nhật" : lesson.day_of_week})</span>
            </div>

            <div className="detail-row">
              <Clock />
              <span className="detail-label">Ca học:</span>
              <span className="detail-value">{lesson.session}</span>
            </div>

            <div className="detail-row">
              <MapPin />
              <span className="detail-label">Địa điểm:</span>
              <span className="detail-value">{lesson.school} — Phòng: {lesson.room}</span>
            </div>

            <div className="detail-row">
              <Users />
              <span className="detail-label">Sĩ số:</span>
              <span className="detail-value">{lesson.student_count} học sinh</span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Teacher and TA */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="avatar-circle" style={{ backgroundColor: 'var(--color-primary)' }}>
                {getInitials(lesson.gv_name)}
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>GIÁO VIÊN CHÍNH</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{lesson.gv_name}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="avatar-circle" style={{ backgroundColor: '#8e44ad' }}>
                {getInitials(lesson.ta_name)}
              </div>
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TRỢ GIẢNG (TA)</p>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary-dark)' }}>{lesson.ta_name}</p>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)' }} />

          {/* Images Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary-dark)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <ImageIcon size={18} />
                Hình ảnh minh chứng ({photos.length})
              </h3>
              
              {/* Upload input button */}
              <label className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', margin: 0 }}>
                <Camera size={14} />
                Chụp / Thêm ảnh
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" // trigger camera on mobile
                  style={{ display: 'none' }} 
                  onChange={handlePhotoUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {error && (
              <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
                <AlertCircle size={14} />
                <span style={{ fontSize: '0.75rem' }}>{error}</span>
              </div>
            )}

            {uploading && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontSize: '0.85rem', 
                color: 'var(--color-primary)',
                backgroundColor: '#eff6ff',
                padding: '0.75rem',
                borderRadius: 'var(--radius-sm)'
              }}>
                <div className="loader"></div>
                <span>Đang upload ảnh lên Google Drive...</span>
              </div>
            )}

            {/* Photos Grid */}
            {loadingPhotos ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                <div className="loader" style={{ width: '24px', height: '24px' }}></div>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Đang tải danh sách ảnh...</p>
              </div>
            ) : photos.length === 0 ? (
              <div className="photo-placeholder">
                Chưa có ảnh nào được tải lên cho buổi học này.
              </div>
            ) : (
              <div className="photo-grid">
                {photos.map((photo) => (
                  <a 
                    key={photo.id || photo.drive_url} 
                    href={photo.drive_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="photo-item"
                    title={`Người đăng: ${photo.uploaded_by || 'Không rõ'}`}
                  >
                    <img src={photo.drive_url} alt="Minh chứng lớp học" loading="lazy" />
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '0.25rem',
                      display: 'flex',
                      justifyContent: 'flex-end',
                      pointerEvents: 'none'
                    }}>
                      <ExternalLink size={10} color="white" />
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modal Actions (Edit/Delete for Admin) */}
        {isAdmin && (
          <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
            <button className="btn btn-danger" onClick={handleDeleteClick}>
              <Trash2 size={16} />
              Xóa buổi học
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" onClick={onClose}>Thoát</button>
              <button className="btn btn-primary" onClick={() => onEdit(lesson)}>
                <Edit size={16} />
                Chỉnh sửa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Shield, User, Mail, Search, RefreshCw, AlertCircle } from 'lucide-react';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("teacher");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      setError("Không thể tải danh sách tài khoản: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (email, currentActive) => {
    const nextActive = !currentActive;
    
    // Update local state first for instant UI response (optimistic update)
    setUsers(prev => prev.map(u => 
      (u.email || "").toLowerCase() === (email || "").toLowerCase() ? { ...u, active: nextActive } : u
    ));

    try {
      await api.deactivateUser(email, nextActive);
      showSuccessMessage(`Đã ${nextActive ? "kích hoạt" : "vô hiệu hóa"} tài khoản ${email}`);
    } catch (err) {
      // Revert if API fails
      setUsers(prev => prev.map(u => 
        u.email.toLowerCase() === email.toLowerCase() ? { ...u, active: currentActive } : u
      ));
      setError("Lỗi cập nhật trạng thái tài khoản: " + err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newEmail || !newName) return;
    
    setSubmitting(true);
    setError("");
    try {
      const newUser = {
        email: newEmail.trim(),
        name: newName.trim(),
        role: newRole,
        active: true
      };
      await api.addUser(newUser);
      
      setUsers(prev => [...prev, newUser]);
      setShowAddModal(false);
      
      // Reset form
      setNewEmail("");
      setNewName("");
      setNewRole("teacher");
      
      showSuccessMessage("Thêm tài khoản mới thành công!");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const showSuccessMessage = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 4000);
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const name = (user.name || "").toLowerCase();
    const email = (user.email || "").toLowerCase();
    const term = (searchTerm || "").toLowerCase();
    return name.includes(term) || email.includes(term);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Giáo viên & Nhân sự</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Quản lý tài khoản đăng nhập và phân quyền hệ thống.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={fetchUsers} disabled={loading}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
            Làm mới
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} />
            Thêm tài khoản
          </button>
        </div>
      </div>

      {success && (
        <div style={{ 
          padding: '1rem', 
          backgroundColor: '#d1fae5', 
          color: '#065f46', 
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.9rem',
          fontWeight: 500
        }}>
          {success}
        </div>
      )}

      {error && (
        <div className="login-error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="shadow-wrapper" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input 
          type="text" 
          placeholder="Tìm kiếm theo tên hoặc email..." 
          className="form-input" 
          style={{ flex: 1, border: 'none', padding: '0.25rem 0' }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Users Table */}
      <div className="table-container">
        {loading && users.length === 0 ? (
          <div className="empty-state">
            <div className="loader" style={{ width: '30px', height: '30px' }}></div>
            <p>Đang tải danh sách người dùng...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            <User size={48} />
            <p>Không tìm thấy tài khoản nào phù hợp.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Họ và tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'center' }}>Cho phép truy cập</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, idx) => (
                <tr key={user.email + '-' + idx}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar" style={{ 
                        backgroundColor: user.role === 'admin' ? 'var(--color-primary)' : 'var(--color-primary-light)',
                        width: '32px',
                        height: '32px'
                      }}>
                        {user.name ? user.name.charAt(0) : 'U'}
                      </div>
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)' }}>
                      <Mail size={14} />
                      <span>{user.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${user.role}`}>
                      {user.role === 'admin' ? 'Quản trị viên' : 'Giáo viên'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${user.active ? 'badge-success' : 'badge-danger'}`}>
                      {user.active ? 'Đang hoạt động' : 'Tạm khóa'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={user.active === true || user.active === 'true'} 
                        onChange={() => handleToggleActive(user.email, user.active)}
                      />
                      <span className="slider"></span>
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Cấp quyền Tài khoản Mới</h2>
              <button className="btn btn-secondary btn-icon-only" style={{ border: 'none' }} onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Tên hiển thị</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <User size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                    <input 
                      type="text" 
                      required
                      placeholder="Ví dụ: Thầy Phước, Cô Ngân"
                      className="form-input" 
                      style={{ paddingLeft: '2.2rem', width: '100%' }}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Địa chỉ Gmail</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Mail size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                    <input 
                      type="email" 
                      required
                      placeholder="username@gmail.com"
                      className="form-input" 
                      style={{ paddingLeft: '2.2rem', width: '100%' }}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Vai trò phân quyền</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Shield size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                    <select 
                      className="input-select" 
                      style={{ paddingLeft: '2.2rem', width: '100%', minWidth: 'auto' }}
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="teacher">Giáo viên / Trợ giảng (Teacher)</option>
                      <option value="admin">Quản trị viên (Admin)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <div className="loader" style={{ borderTopColor: 'white' }}></div>
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    "Thêm tài khoản"
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

import React, { useState, useEffect } from 'react';
import { api } from './api';
import CalendarView from './components/CalendarView';
import UserManagement from './components/UserManagement';
import { 
  Calendar, Users, LogOut, ShieldAlert, Award, 
  Settings, Database, HelpCircle, Loader, ShieldCheck
} from 'lucide-react';

export default function App() {
  const [userSession, setUserSession] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loginError, setLoginError] = useState("");
  const [activeTab, setActiveTab] = useState("calendar"); // calendar | users
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupMessage, setSetupMessage] = useState("");

  // Kiểm tra session hiện có khi khởi chạy
  useEffect(() => {
    const sessionStr = localStorage.getItem("stem_schedule_session");
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        // Kiểm tra lại với DB để đảm bảo tài khoản không bị khóa đột ngột
        verifyUserWithBackend(parsed.email, parsed);
      } catch (e) {
        localStorage.removeItem("stem_schedule_session");
        setCheckingAuth(false);
      }
    } else {
      setCheckingAuth(false);
    }
  }, []);

  const verifyUserWithBackend = async (email, localSessionBackup) => {
    try {
      const res = await api.checkUser(email);
      if (res.success && res.user) {
        const updatedSession = {
          email: res.user.email,
          name: res.user.name,
          role: res.user.role,
          active: res.user.active
        };
        setUserSession(updatedSession);
        localStorage.setItem("stem_schedule_session", JSON.stringify(updatedSession));
      } else {
        throw new Error(res.error || "Tài khoản không hợp lệ");
      }
    } catch (err) {
      console.error("Lỗi xác minh tài khoản:", err);
      setLoginError(err.message || "Tài khoản của bạn không có quyền truy cập hệ thống.");
      setUserSession(null);
      localStorage.removeItem("stem_schedule_session");
    } finally {
      setCheckingAuth(false);
    }
  };

  // Hàm tự giải mã JWT Token (IdToken của Google) không cần thư viện bên thứ ba
  const decodeJwt = (token) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.error("Lỗi giải mã JWT Google:", e);
      return null;
    }
  };

  // Xử lý callback sau khi đăng nhập Google thành công
  const handleCredentialResponse = async (response) => {
    setLoginError("");
    setCheckingAuth(true);
    
    try {
      const decoded = decodeJwt(response.credential);
      if (!decoded || !decoded.email) {
        throw new Error("Không thể trích xuất email từ tài khoản Google.");
      }
      
      await verifyUserWithBackend(decoded.email, null);
    } catch (err) {
      setLoginError(err.message || "Đăng nhập thất bại. Vui lòng liên hệ Admin.");
      setCheckingAuth(false);
    }
  };

  // Đăng nhập Google
  useEffect(() => {
    if (userSession) return; // Không cần render nút đăng nhập nếu đã login
    
    const initializeGoogleSignIn = () => {
      // @ts-ignore
      if (typeof window.google !== 'undefined') {
        // @ts-ignore
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse
        });
        
        // @ts-ignore
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "filled_blue", size: "large", width: 280, text: "signin_with" }
        );
      }
    };

    // Thử khởi tạo, nếu thư viện chưa tải xong thì đợi
    initializeGoogleSignIn();
    const interval = setInterval(() => {
      // @ts-ignore
      if (typeof window.google !== 'undefined') {
        initializeGoogleSignIn();
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [userSession, checkingAuth]);

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất?")) {
      localStorage.removeItem("stem_schedule_session");
      setUserSession(null);
      setActiveTab("calendar");
    }
  };

  // Hàm tiện ích hỗ trợ tạo Database mẫu nhanh
  const handleSetupDatabase = async () => {
    if (!window.confirm("Bạn muốn cấu hình khởi tạo 3 bảng tính mẫu (users, schedule, photos) tự động trên Google Sheets?")) return;
    setSetupLoading(true);
    setSetupMessage("");
    try {
      const res = await api.setupDatabase();
      setSetupMessage("Khởi tạo thành công! Hãy tải lại trang.\n" + res.message);
    } catch (err) {
      setSetupMessage("Lỗi khởi tạo: " + err.message + "\nHướng dẫn: Hãy đảm bảo bạn đã deploy Web App trong Apps Script và cấp quyền 'Anyone' truy cập.");
    } finally {
      setSetupLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="login-container" style={{ flexDirection: 'column', gap: '1rem', color: 'white' }}>
        <Loader className="spin" size={40} color="#38bdf8" />
        <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>Đang xác thực tài khoản...</p>
      </div>
    );
  }

  // MÀN HÌNH ĐĂNG NHẬP (Nếu chưa login)
  if (!userSession) {
    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-icon-wrapper">
            <svg viewBox="0 0 24 24">
              <path d="M19 4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2 9h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
            </svg>
          </div>
          
          <div>
            <h1 className="login-title">Hệ thống Lịch STEM</h1>
            <p className="login-subtitle">EIU FabLab — Trường Việt Anh & Việt Anh 2</p>
          </div>

          <div style={{ width: '100%', borderBottom: '1px solid var(--color-border)', margin: '0.5rem 0' }}></div>

          <div className="login-button-container">
            <div id="google-signin-btn"></div>
          </div>

          {loginError && (
            <div className="login-error" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                <ShieldAlert size={16} />
                <span>Lỗi đăng nhập</span>
              </div>
              <p style={{ fontSize: '0.8rem' }}>{loginError}</p>
            </div>
          )}

          {/* Quick Setup Assist for Developers */}
          <div style={{ marginTop: '1.5rem', width: '100%' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              style={{ width: '100%', fontSize: '0.75rem', gap: '0.35rem', padding: '0.4rem' }}
              onClick={handleSetupDatabase}
              disabled={setupLoading}
            >
              <Database size={12} />
              {setupLoading ? "Đang khởi tạo..." : "Khởi tạo Google Sheet mẫu"}
            </button>
            {setupMessage && (
              <pre style={{ 
                marginTop: '0.5rem', 
                padding: '0.5rem', 
                backgroundColor: '#f1f5f9', 
                borderRadius: 'var(--radius-sm)', 
                fontSize: '0.65rem', 
                textAlign: 'left',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                maxHeight: '120px',
                color: 'var(--text-main)'
              }}>
                {setupMessage}
              </pre>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = userSession.role === "admin";

  return (
    <div className="app-container">
      
      {/* SIDEBAR (Desktop View) */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <svg viewBox="0 0 24 24">
            <path d="M19 4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2 9h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
          <span>STEM Schedule</span>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab("calendar")}
          >
            <Calendar size={18} />
            <span>Lịch dạy</span>
          </button>
          
          {isAdmin && (
            <button 
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab("users")}
            >
              <Users size={18} />
              <span>Quản lý giáo viên</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-bar" style={{ marginBottom: '1rem' }}>
            <div className="avatar">
              {userSession.name ? userSession.name.charAt(0) : 'U'}
            </div>
            <div className="user-info">
              <span className="user-name" title={userSession.name}>{userSession.name}</span>
              <span className="user-role" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                {isAdmin ? <ShieldCheck size={10} color="#38bdf8" /> : null}
                {isAdmin ? "Quản trị viên" : "Giáo viên"}
              </span>
            </div>
          </div>
          <button className="nav-link" onClick={handleLogout} style={{ color: '#f87171' }}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* MOBILE TOP HEADER (Mobile View) */}
      <header className="main-header">
        <div className="mobile-logo-title">
          <svg viewBox="0 0 24 24">
            <path d="M19 4H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-2 9h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
          <span>STEM Schedule</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="avatar" style={{ width: '32px', height: '32px' }}>
            {userSession.name ? userSession.name.charAt(0) : 'U'}
          </div>
          <button 
            onClick={handleLogout} 
            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT WINDOW */}
      <main className="main-content">
        {activeTab === "calendar" ? (
          <CalendarView userRole={userSession.role} userSession={userSession} />
        ) : (
          <UserManagement />
        )}
      </main>

      {/* BOTTOM NAVIGATION BAR (Mobile View) */}
      {isAdmin && (
        <nav className="mobile-nav">
          <button 
            className={`mobile-nav-link ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab("calendar")}
          >
            <Calendar />
            <span>Lịch dạy</span>
          </button>
          <button 
            className={`mobile-nav-link ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab("users")}
          >
            <Users />
            <span>Giáo viên</span>
          </button>
        </nav>
      )}
    </div>
  );
}

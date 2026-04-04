import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import QuotesManager from './admin/QuotesManager';
import AIGenerator from './admin/AIGenerator';

// Simple Admin Dashboard
function Dashboard() {
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/admin/quotes" className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
          <h2 className="text-lg font-semibold text-slate-800">Quản lý Quotes</h2>
          <p className="text-slate-500 text-sm mt-2">Thêm, sửa, xoá và duyệt câu nói.</p>
        </Link>
        <Link to="/admin/ai" className="p-6 bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 transition-colors">
          <h2 className="text-lg font-semibold text-slate-800">AI Generator</h2>
          <p className="text-slate-500 text-sm mt-2">Tạo câu nói mới bằng AI.</p>
        </Link>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50">Đang tải...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-sm w-full">
          <div className="flex justify-center mb-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-900 shadow-lg" title="NGẪM">
              <svg viewBox="0 0 100 100" className="w-7 h-7 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M25 75C25 75 35 45 50 45C65 45 75 75 75 75" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M35 55C35 55 42 35 50 35C58 35 65 55 65 55" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="50" cy="22" r="6" fill="currentColor"/>
                <path d="M15 50C15 50 25 20 50 20C75 20 85 50 85 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 8" opacity="0.5"/>
              </svg>
            </div>
          </div>
          <h1 className="text-2xl font-serif font-bold text-slate-900 mb-2">Admin</h1>
          <p className="text-slate-500 mb-8">Đăng nhập để quản trị nội dung</p>
          <button 
            onClick={handleLogin}
            className="w-full py-3 px-4 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
          >
            Đăng nhập với Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center max-w-sm w-full">
          <h1 className="text-xl font-bold text-rose-600 mb-2">Không có quyền truy cập</h1>
          <p className="text-slate-500 mb-6">Tài khoản của bạn không phải là Admin.</p>
          <button 
            onClick={() => navigate('/')}
            className="w-full py-2 px-4 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  const NavLinks = () => (
    <>
      <Link 
        to="/admin" 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`block px-4 py-2 rounded-lg font-medium ${location.pathname === '/admin' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
      >
        Dashboard
      </Link>
      <Link 
        to="/admin/quotes" 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`block px-4 py-2 rounded-lg font-medium ${location.pathname === '/admin/quotes' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
      >
        Quản lý Quotes
      </Link>
      <Link 
        to="/admin/ai" 
        onClick={() => setIsMobileMenuOpen(false)}
        className={`block px-4 py-2 rounded-lg font-medium ${location.pathname === '/admin/ai' ? 'bg-slate-100 text-slate-900' : 'text-slate-700 hover:bg-slate-50'}`}
      >
        AI Generator
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 shadow-sm" title="NGẪM">
            <svg viewBox="0 0 100 100" className="w-5 h-5 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25 75C25 75 35 45 50 45C65 45 75 75 75 75" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M35 55C35 55 42 35 50 35C58 35 65 55 65 55" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="50" cy="22" r="6" fill="currentColor"/>
              <path d="M15 50C15 50 25 20 50 20C75 20 85 50 85 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 8" opacity="0.5"/>
            </svg>
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar (Desktop) & Mobile Menu */}
      <aside className={`
        ${isMobileMenuOpen ? 'block' : 'hidden'} 
        md:block w-full md:w-64 bg-white border-r border-slate-200 flex-col
        fixed md:sticky top-[73px] md:top-0 h-[calc(100vh-73px)] md:h-screen z-10
      `}>
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-100">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 shadow-sm" title="NGẪM">
            <svg viewBox="0 0 100 100" className="w-6 h-6 text-white" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M25 75C25 75 35 45 50 45C65 45 75 75 75 75" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M35 55C35 55 42 35 50 35C58 35 65 55 65 55" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="50" cy="22" r="6" fill="currentColor"/>
              <path d="M15 50C15 50 25 20 50 20C75 20 85 50 85 50" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 8" opacity="0.5"/>
            </svg>
          </div>
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Admin Panel</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavLinks />
        </nav>
        <div className="p-4 border-t border-slate-100 mt-auto">
          <button 
            onClick={async () => {
              await auth.signOut();
              navigate('/');
            }}
            className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quotes" element={<QuotesManager />} />
          <Route path="/ai" element={<AIGenerator />} />
        </Routes>
      </main>
    </div>
  );
}

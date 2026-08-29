"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { countPendingTasks } from "@/app/actions/events";
import ChangePasswordModal from './ChangePasswordModal';
import OnlineWidget from './OnlineWidget';
import "./Sidebar.css";
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CheckSquare, 
  Settings,
  LogOut,
  UserCircle,
  FileText,
  CreditCard,
  Receipt,
  Wallet,
  Package,
  Landmark,
  ChevronRight,
  Lock,
  Library,
  BookMarked,
  Megaphone,
  ClipboardCheck,
  PhoneCall,
  Presentation,
  BarChart3
} from "lucide-react";

const commonMenu = [
  { name: "Tổng quan", path: "/", icon: LayoutDashboard },
  { name: "Sự kiện & Checklist", path: "/events", icon: CheckSquare },
];

const internalMenu = [
  { name: "Đào tạo Nội bộ", path: "/internal-training", icon: Library },
];

const trainingMenu = [
  { name: "Học viên", path: "/students", icon: Users },
  { name: "Quản lý Lớp học", path: "/classes", icon: BookOpen },
  { name: "Báo cáo KPI", path: "/academic-kpis", icon: BarChart3 },
  { name: "Khung chương trình", path: "/curriculum", icon: BookMarked },
  { name: "Bài giảng", path: "/lectures", icon: Presentation },
];
const admissionMenu = [
  { name: "Khách hàng (CRM)", path: "/sales/crm", icon: Users },
  { name: "CRM Leads", path: "/sales/leads", icon: Users },
  { name: "Quản lý Chiến dịch", path: "/sales/campaigns", icon: Megaphone },
  { name: "Chăm sóc HV Trung tâm", path: "/sales/tasks", icon: PhoneCall },
  { name: "Báo cáo Check-in", path: "/sales/checkins", icon: ClipboardCheck },
  { name: "Landing Pages", path: "/sales/landing-pages", icon: Megaphone },
  { name: "Bài viết (Tin tức)", path: "/sales/articles", icon: FileText },
];

const financeMenu = [
  { name: "Phiếu đăng ký", path: "/enrollments", icon: FileText },
  { name: "Đăng ký trả góp", path: "/finance/installments", icon: CreditCard },
  { name: "Phiếu Thu Học viên", path: "/finance/transactions", icon: Receipt },
  { name: "Sổ Quỹ Thu Chi", path: "/finance/cashbooks", icon: Landmark },
  { name: "Bảng lương & KPI", path: "/finance/payroll", icon: Wallet },
  { name: "Vật tư & Kho", path: "/inventory", icon: Package },
];

const systemMenu = [
  { name: "Nhân sự", path: "/employees", icon: UserCircle },
  { name: "Cấu hình", path: "/settings", icon: Settings },
];

export default function Sidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (user?.id) {
      countPendingTasks(user.id)
        .then(count => setPendingTasksCount(count))
        .catch(console.error);
    }
  }, [user?.id, pathname]);

  
  if (!isMounted) return <aside className={`sidebar ${isOpen ? "open" : ""}`}></aside>;
  if (pathname === '/login') return null;

  const activeRole = user?.role || "User";
  const isForeignTeacher = user?.position === "Giáo viên nước ngoài";

  const canSeeTraining = ["Super Admin", "Kế toán HO", "Admin", "Kế toán Chi nhánh", "Giáo viên", "Sale", "User"].includes(activeRole);
  const canSeeAdmission = ["Super Admin", "Admin", "Sale", "Kế toán HO", "Kế toán Chi nhánh", "Giáo viên"].includes(activeRole) && !isForeignTeacher;
  const canSeeFinance = ["Super Admin", "Kế toán HO", "Admin", "Kế toán Chi nhánh"].includes(activeRole);
  const canSeeSystem = ["Super Admin", "Admin", "Kế toán HO", "Kế toán Chi nhánh"].includes(activeRole);

  let currentTrainingMenu = trainingMenu;
  if (activeRole === "Sale") {
    currentTrainingMenu = trainingMenu.filter(item => ["/classes", "/curriculum"].includes(item.path));
  }

  let currentSystemMenu = systemMenu;
  if (activeRole === "Kế toán Chi nhánh") {
    currentSystemMenu = systemMenu.filter(item => item.path === "/employees");
  }

  let currentFinanceMenu = financeMenu;
  if (!["Super Admin", "Kế toán HO", "Admin"].includes(activeRole)) {
    currentFinanceMenu = financeMenu.filter(item => item.path !== "/finance/payroll");
  }

  let currentAdmissionMenu = admissionMenu;
  if (!["Super Admin", "Admin", "Kế toán HO"].includes(activeRole)) {
    currentAdmissionMenu = currentAdmissionMenu.filter(item => item.path !== "/sales/checkins");
  }
  if (!["Super Admin", "Admin"].includes(activeRole)) {
    currentAdmissionMenu = currentAdmissionMenu.filter(item => item.path !== "/sales/landing-pages");
  }
  if (activeRole !== "Super Admin") {
    currentAdmissionMenu = currentAdmissionMenu.filter(item => item.path !== "/sales/articles");
  }

  const renderMenu = (items: any[], title?: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="menu-group">
      {title && <h3 className="menu-group-title">{title}</h3>}
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.path || (item.path !== "/" && pathname.startsWith(item.path));
        
        return (
          <Link 
            key={item.path} 
            href={item.path}
            className={`nav-item ${isActive ? "active" : ""}`}
            onClick={onClose}
          >
            <Icon className="nav-icon" size={20} />
            <span style={{ flex: 1 }}>{item.name}</span>
            {item.path === "/events" && pendingTasksCount > 0 && (
              <span className="animate-pulse" style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                padding: '2px 8px',
                borderRadius: '999px',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}>
                {pendingTasksCount}
              </span>
            )}
            {isActive && <div className="active-indicator" />}
          </Link>
        );
      })}
    </div>
    );
  };

  return (
    <aside className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src="/logo.png" alt="VicEdu Logo" style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
          <h2 className="logo-text" style={{ fontSize: '1.4rem', letterSpacing: '0.5px' }}>Hệ thống VicEdu</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
          {renderMenu(commonMenu)}
          {canSeeAdmission && renderMenu(currentAdmissionMenu, "TUYỂN SINH & CSKH")}
          {canSeeTraining && renderMenu(currentTrainingMenu, "ĐÀO TẠO")}
          {canSeeFinance && renderMenu(currentFinanceMenu, "TÀI CHÍNH - VẬT TƯ")}
          {!isForeignTeacher && renderMenu(internalMenu, "NỘI BỘ")}
          {canSeeSystem && renderMenu(currentSystemMenu, "HỆ THỐNG")}
        </nav>

      <div className="sidebar-footer" style={{ position: 'relative' }}>
        <OnlineWidget />
        
        <div 
          className="user-profile" 
          style={{ cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0.5rem' }}
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold', flexShrink: 0 }}>
            {user?.full_name?.charAt(0) || "U"}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.full_name || "Đang tải..."}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.role} - {user?.branch_id}</span>
          </div>
          <ChevronRight size={16} style={{ transform: showProfileMenu ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s', color: 'var(--text-muted)' }} />
        </div>

        {showProfileMenu && (
          <div className="profile-dropdown animate-fade-in" style={{ position: 'absolute', bottom: '100%', left: '1rem', right: '1rem', marginBottom: '0.5rem', borderRadius: '12px', padding: '0.5rem', zIndex: 50, background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            <button 
              className="nav-item" 
              style={{ width: '100%', marginBottom: '0.25rem' }}
              onClick={() => {
                setShowProfileMenu(false);
                setShowPasswordModal(true);
                onClose?.();
              }}
            >
              <Lock className="nav-icon" size={18} />
              <span>Đổi mật khẩu</span>
            </button>
            <button 
              onClick={() => {
                signOut();
                onClose?.();
              }} 
              className="nav-item logout-btn w-full" 
              style={{ width: '100%' }}
            >
              <LogOut className="nav-icon" size={18} />
              <span>Đăng xuất</span>
            </button>
          </div>
        )}
      </div>

      <ChangePasswordModal 
        isOpen={showPasswordModal} 
        onClose={() => setShowPasswordModal(false)} 
      />
    </aside>
  );
}

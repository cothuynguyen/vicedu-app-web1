"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Search, CheckCircle, Clock, Phone, AlertCircle } from "lucide-react";
import StudentModal from "@/components/students/StudentModal";
import CampaignDashboard from "@/components/sales/CampaignDashboard";

export default function SalesTasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("Chưa gọi");
  const [filterCampaign, setFilterCampaign] = useState("Tất cả");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"tasks" | "dashboard">("tasks");
  const isAdmin = user?.role === "Admin" || user?.role === "Super Admin" || user?.role === "Giám đốc";

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user, filterStatus, filterBranch]);

  const fetchTasks = async () => {
    setLoading(true);
    let query = supabase
      .from("internal_campaign_tasks")
      .select(`
        id, status, created_at,
        internal_campaigns!inner(name, type, branch_id, status),
        students!inner(id, full_name, dob, parent_phone, parent_name, status, remaining_hours, branch_id)
      `)
      .eq("internal_campaigns.status", "Đang chạy")
      .order("created_at", { ascending: false });

    // Sale only sees their tasks. Admin sees all (handled by RLS, but we can enforce here too).
    if (user?.role === "Sale") {
      query = query.eq("assigned_to", user.id);
    }

    if (filterBranch !== "Tất cả") {
      query = query.ilike("students.branch_id", `%${filterBranch}%`);
    } else {
      if (!['Super Admin', 'Kế toán HO', 'Giám đốc'].includes(user?.role)) {
        const branchList = user?.branch_id ? user.branch_id.split(',').map((b: string) => b.trim()) : [];
        if (branchList.length > 0) {
          const orConditions = branchList.map((b: string) => `branch_id.ilike.%${b}%`).join(',');
          query = query.or(orConditions, { referencedTable: 'students' });
        }
      }
    }

    if (filterStatus !== "Tất cả") {
      query = query.eq("status", filterStatus);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTasks(data);
    } else {
      console.error(error);
    }
    setLoading(false);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const { error } = await supabase
      .from("internal_campaign_tasks")
      .update({ status: newStatus })
      .eq("id", taskId);
    
    if (!error) {
      // Optimitic UI update
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    }
  };

  const openStudentModal = (studentId: string) => {
    setSelectedStudentId(studentId);
    setShowStudentModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Chưa gọi': return '#f59e0b';
      case 'Đã gọi': return '#3b82f6';
      case 'Thành công': return '#10b981';
      case 'Thất bại': return '#ef4444';
      default: return '#64748b';
    }
  };

  const uniqueCampaigns = Array.from(new Set(tasks.map(t => t.internal_campaigns?.name))).filter(Boolean);
  const displayedTasks = tasks.filter(t => filterCampaign === "Tất cả" || t.internal_campaigns?.name === filterCampaign);

  return (
    <>
    <div className="animate-fade-in" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', color: '#1e293b', marginBottom: '0.5rem' }}>Chăm sóc HV Trung tâm</h1>
          <p className="text-muted">Danh sách Nhiệm vụ / Chiến dịch CSKH được Đào tạo phân công.</p>
        </div>
        
        {isAdmin && (
          <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px' }}>
            <button 
              className={`btn ${viewMode === 'tasks' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem 1rem', background: viewMode === 'tasks' ? 'white' : 'transparent', color: viewMode === 'tasks' ? '#1e293b' : '#64748b', boxShadow: viewMode === 'tasks' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', borderRadius: '6px' }}
              onClick={() => setViewMode('tasks')}
            >
              Danh sách Nhiệm vụ
            </button>
            <button 
              className={`btn ${viewMode === 'dashboard' ? 'btn-primary' : ''}`}
              style={{ padding: '0.4rem 1rem', background: viewMode === 'dashboard' ? 'white' : 'transparent', color: viewMode === 'dashboard' ? '#1e293b' : '#64748b', boxShadow: viewMode === 'dashboard' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', border: 'none', borderRadius: '6px' }}
              onClick={() => setViewMode('dashboard')}
            >
              Báo cáo Chiến dịch
            </button>
          </div>
        )}
      </div>

      {viewMode === 'dashboard' ? (
        <CampaignDashboard />
      ) : (
        <>
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {isAdmin && (
              <select 
                className="form-input" 
                style={{ width: '180px' }} 
                value={filterBranch} 
                onChange={e => setFilterBranch(e.target.value)}
              >
                <option value="Tất cả">Tất cả chi nhánh</option>
                <option value="Việt Trì">Việt Trì</option>
                <option value="Lâm Thao">Lâm Thao</option>
                <option value="Tuyên Quang">Tuyên Quang</option>
                <option value="Dân Hòa">Dân Hòa</option>
              </select>
            )}
            <select 
              className="form-input" 
              style={{ width: '200px' }} 
              value={filterStatus} 
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="Tất cả">Tất cả Trạng thái</option>
              <option value="Chưa gọi">Chưa gọi</option>
              <option value="Đã gọi">Đã gọi</option>
              <option value="Thành công">Thành công</option>
              <option value="Thất bại">Thất bại</option>
            </select>
            
            <select
              className="form-input"
              style={{ width: '250px' }}
              value={filterCampaign}
              onChange={e => setFilterCampaign(e.target.value)}
            >
              <option value="Tất cả">Tất cả Chiến dịch</option>
              {uniqueCampaigns.map((camp: any, idx) => (
                <option key={idx} value={camp}>{camp}</option>
              ))}
            </select>
          </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem' }}>Đang tải danh sách nhiệm vụ...</div>
      ) : displayedTasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem', color: '#64748b' }}>
          <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3>Không có nhiệm vụ nào</h3>
          <p>Hiện không có học viên nào ở trạng thái "{filterStatus}" và chiến dịch "{filterCampaign}".</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: '12px', padding: 0 }}>
          <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Học viên</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Chiến dịch</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Phân loại</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Ngày giao</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Trạng thái Task</th>
                <th style={{ padding: '1rem', fontWeight: 600 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedTasks.map(task => (
                <tr key={task.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s', cursor: 'default' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{task.students.full_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Mã: {task.students.id} | Sinh: {task.students.dob}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>SĐT PH: {task.students.parent_phone}</div>
                    <div style={{ marginTop: '0.25rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '0.15rem 0.4rem', 
                        borderRadius: '4px', 
                        fontWeight: 600,
                        background: (task.students.remaining_hours || 0) <= 10 ? '#fee2e2' : '#f8fafc',
                        color: (task.students.remaining_hours || 0) <= 10 ? '#dc2626' : '#475569',
                        border: '1px solid',
                        borderColor: (task.students.remaining_hours || 0) <= 10 ? '#fca5a5' : '#e2e8f0'
                      }}>
                        Giờ còn lại: {task.students.remaining_hours || 0}h
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem', color: '#334155' }}>
                    <div style={{ fontWeight: 500 }}>{task.internal_campaigns.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{task.internal_campaigns.branch_id}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      background: '#e0e7ff', 
                      color: '#4338ca', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      fontWeight: 500
                    }}>
                      {task.internal_campaigns.type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.9rem' }}>
                    {new Date(task.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <select
                      className="form-input"
                      style={{ 
                        width: '130px', 
                        borderColor: getStatusColor(task.status),
                        color: getStatusColor(task.status),
                        fontWeight: 600,
                        background: 'transparent'
                      }}
                      value={task.status}
                      onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                    >
                      <option value="Chưa gọi">Chưa gọi</option>
                      <option value="Đã gọi">Đã gọi</option>
                      <option value="Thành công">Thành công</option>
                      <option value="Thất bại">Thất bại</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <button 
                      className="btn btn-primary" 
                      onClick={() => openStudentModal(task.students.id)}
                      style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Phone size={16} /> Gọi & Ghi chú
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}
    </div>

      {/* Student Modal (Read-only mode for Sales) */}
      {showStudentModal && selectedStudentId && (
        <StudentModal
          isOpen={showStudentModal}
          onClose={() => {
            setShowStudentModal(false);
            setSelectedStudentId(null);
            // Optionally refresh tasks if touchpoints changed
          }}
          studentId={selectedStudentId}
          initialStudent={null}
          activeRole={user?.role || ""}
          activeBranch={user?.branch_id || ""}
          onSuccess={() => {}}
          isReadOnly={true}
          allowCareLogEdit={true}
          initialTab="care"
        />
      )}
    </>
  );
}

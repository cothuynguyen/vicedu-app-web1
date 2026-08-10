"use client";

import { Users, BookOpen, GraduationCap, TrendingUp, Calendar, AlertCircle, PhoneOff } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import BirthdayWidget from "@/components/dashboard/BirthdayWidget";
import StudentModal from "@/components/students/StudentModal";
import "./Dashboard.css";

export default function Dashboard() {
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [neglectedStudents, setNeglectedStudents] = useState<any[]>([]);
  const [totalEnrolled, setTotalEnrolled] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [totalLeads, setTotalLeads] = useState(0);
  const [studentsWithDob, setStudentsWithDob] = useState<any[]>([]);
  const [parentFeedbacks, setParentFeedbacks] = useState<any[]>([]);
  
  // Student modal states
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentData, setSelectedStudentData] = useState<any>(null);

  const handleOpenStudent = (studentId: string, studentData: any) => {
    setSelectedStudentId(studentId);
    setSelectedStudentData(studentData);
    setIsStudentModalOpen(true);
  };
  
  const handleOpenStudentFromFeedback = async (studentId: string) => {
    const { data: student } = await supabase.from('students').select('*').eq('id', studentId).single();
    if (student) {
      handleOpenStudent(studentId, student);
    } else {
      handleOpenStudent(studentId, { id: studentId });
    }
  };
  const { user } = useAuth();
  const [filterBranch, setFilterBranch] = useState(user?.branch_id || "Tất cả");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats', { p_branch_id: filterBranch });
        
        if (statsError) {
          console.error("RPC Error:", statsError);
        } else if (statsData) {
          setTotalEnrolled(statsData.totalEnrolled || 0);
          setTotalClasses(statsData.totalClasses || 0);
          setTotalLeads(statsData.totalLeads || 0);
          setNeglectedStudents(statsData.neglectedStudents || []);
        }

        // Fetch Alerts (for absent students - keep existing logic if it relies on a different RPC)
        const { data: flags, error } = await supabase.rpc('get_red_flags');
        if (!error && flags && flags.length > 0) {
          const studentIds = flags.map((f: any) => f.student_id);
          const { data: students } = await supabase.from('students').select('id, full_name, parent_phone, branch_id').in('id', studentIds);
          
          if (students) {
             const absent: any[] = [];
             flags.forEach((f: any) => {
               const stuInfo = students.find((s: any) => s.id === f.student_id);
               if (stuInfo && f.reason === 'Nghỉ 2 buổi liên tiếp') {
                 if (filterBranch === 'Tất cả' || stuInfo.branch_id === filterBranch) {
                    absent.push(stuInfo);
                 }
               }
             });
             setAbsentStudents(absent);
          }
        } else {
          setAbsentStudents([]);
        }

        // Fetch students for birthday widget
        let studentsQuery = supabase
          .from('students')
          .select('id, full_name, dob, parent_phone, branch_id')
          .not('dob', 'is', null)
          .neq('status', 'Nghỉ hẳn');
          
        if (filterBranch !== 'Tất cả') {
          studentsQuery = studentsQuery.eq('branch_id', filterBranch);
        }
        
        const { data: studentsData, error: stuError } = await studentsQuery;
        if (!stuError && studentsData) {
          setStudentsWithDob(studentsData);
        }

        // Fetch parent feedbacks from the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const { data: feedbacksData, error: feedError } = await supabase
          .from('student_care_logs')
          .select('id, student_id, content, created_at, students!inner(id, full_name, parent_phone, branch_id)')
          .ilike('content', '[Ý KIẾN PHỤ HUYNH]%')
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false });

        if (!feedError && feedbacksData) {
          // Filter by branch if needed
          let filteredFeedbacks = feedbacksData;
          if (filterBranch !== 'Tất cả') {
            filteredFeedbacks = feedbacksData.filter((log: any) => log.students.branch_id === filterBranch);
          }
          setParentFeedbacks(filteredFeedbacks);
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filterBranch]);

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Tổng quan</h1>
          <p className="text-muted">Chào mừng trở lại, {user?.full_name || "Quản trị viên"}</p>
        </div>
        <div className="header-actions">
          {['Super Admin', 'Giám đốc', 'Kế toán HO'].includes(user?.role || '') && (
            <select 
              value={filterBranch} 
              onChange={e => setFilterBranch(e.target.value)}
              className="btn btn-secondary"
              style={{ appearance: 'auto', background: '#fff' }}
            >
              <option value="Tất cả">Tất cả Chi nhánh</option>
              <option value="Việt Trì 1">Việt Trì 1</option>
              <option value="Việt Trì 2">Việt Trì 2</option>
              <option value="Lâm Thao">Lâm Thao</option>
              <option value="Tuyên Quang">Tuyên Quang</option>
              <option value="Dân Hòa">Dân Hòa</option>
            </select>
          )}
          <button className="btn btn-secondary">
            <Calendar size={18} />
            <span>Tháng này</span>
          </button>
          <button className="btn btn-primary">
            <BookOpen size={18} />
            <span>Tạo lớp học mới</span>
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: "rgba(79, 70, 229, 0.1)", color: "var(--primary)" }}>
            <Users size={24} />
          </div>
          <div className="stat-info">
            <h3>{totalEnrolled}</h3>
            <p>Học viên đang học</p>
          </div>
          <div className="stat-trend positive">
            <TrendingUp size={16} />
            <span>Mới</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--success)" }}>
            <BookOpen size={24} />
          </div>
          <div className="stat-info">
            <h3>{totalClasses}</h3>
            <p>Lớp học đang mở</p>
          </div>
          <div className="stat-trend positive">
            <TrendingUp size={16} />
            <span>Đang HĐ</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)" }}>
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <h3>{absentStudents.length}</h3>
            <p>Học viên vắng 2 buổi</p>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon" style={{ background: "rgba(245, 158, 11, 0.1)", color: "var(--warning)" }}>
            <PhoneOff size={24} />
          </div>
          <div className="stat-info">
            <h3>{neglectedStudents.length}</h3>
            <p>Khách hàng chưa được CS (&gt;14 ngày)</p>
          </div>
        </div>
      </div>

      <div className="dashboard-content" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '1.5rem' }}>
        <div className="side-section glass-panel">
          <div className="section-header">
            <h2><AlertCircle size={20} style={{ color: 'var(--primary)', marginRight: '0.5rem', display: 'inline' }} /> 📩 Hòm thư Phụ huynh (7 ngày qua)</h2>
          </div>
          <div className="activity-list" style={{ padding: '0 1rem' }}>
            {loading ? <p className="text-muted">Đang tải...</p> : parentFeedbacks.length === 0 ? <p className="text-muted">Chưa có ý kiến nào mới.</p> : parentFeedbacks.map((fb) => (
              <div key={fb.id} className="activity-item" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div className="activity-dot" style={{ background: 'var(--primary)' }}></div>
                <div className="activity-content">
                  <p>
                    <strong>{fb.students.full_name}</strong> vừa gửi ý kiến: 
                    <span style={{ display: 'block', fontStyle: 'italic', marginTop: '0.25rem', color: '#334155' }}>"{fb.content.replace('[Ý KIẾN PHỤ HUYNH] - ', '')}"</span>
                  </p>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>{new Date(fb.created_at).toLocaleDateString('vi-VN')}</span>
                    <span style={{ color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => handleOpenStudentFromFeedback(fb.student_id)}>
                      Xem hồ sơ
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-section glass-panel">
          <div className="section-header">
            <h2><AlertCircle size={20} style={{ color: 'var(--danger)', marginRight: '0.5rem', display: 'inline' }} /> Cảnh báo Chuyên cần</h2>
          </div>
          <div className="class-list">
            {loading ? <p className="text-muted">Đang tải...</p> : absentStudents.length === 0 ? <p className="text-muted">Không có học viên nào vắng 2 buổi liên tiếp.</p> : absentStudents.map((stu) => (
              <div key={stu.id} className="class-item" style={{ borderLeft: '4px solid var(--danger)' }}>
                <div className="class-info">
                  <h4>{stu.full_name}</h4>
                  <p>SĐT Phụ huynh: {stu.parent_phone || 'Chưa cập nhật'}</p>
                </div>
                <div className="class-status">
                  <span className="status-badge danger">Vắng 2 buổi</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-content" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="side-section glass-panel">
          <div className="section-header">
            <h2><PhoneOff size={20} style={{ color: 'var(--warning)', marginRight: '0.5rem', display: 'inline' }} /> Báo động Chăm sóc</h2>
          </div>
          <div className="activity-list" style={{ padding: '0 1rem' }}>
            {loading ? <p className="text-muted">Đang tải...</p> : neglectedStudents.length === 0 ? <p className="text-muted">Tất cả học viên đều được chăm sóc tốt.</p> : neglectedStudents.map((stu) => (
              <div key={stu.id} className="activity-item" style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <div className="activity-dot" style={{ background: 'var(--warning)' }}></div>
                <div className="activity-content">
                  <p><strong>{stu.full_name}</strong> chưa được cập nhật Nhật ký chăm sóc hơn 14 ngày.</p>
                  <span style={{ display: 'block', marginTop: '0.25rem', color: 'var(--primary)', cursor: 'pointer' }}>SĐT: {stu.parent_phone || stu.phone || 'Chưa cập nhật'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BirthdayWidget 
          students={studentsWithDob} 
          onOpenStudent={handleOpenStudent} 
        />
      </div>

      {isStudentModalOpen && selectedStudentId && (
        <StudentModal
          isOpen={isStudentModalOpen}
          onClose={() => setIsStudentModalOpen(false)}
          studentId={selectedStudentId}
          initialStudent={selectedStudentData}
          activeRole={user?.role || ''}
          activeBranch={user?.branch_id || ''}
          isReadOnly={user?.role === "Sale" || user?.role === "Nhân viên Sale"}
          onSuccess={() => {
            // No action needed on dashboard refresh for now
          }}
        />
      )}
    </div>
  );
}

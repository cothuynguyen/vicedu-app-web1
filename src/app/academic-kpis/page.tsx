"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { Trophy, BarChart3, TrendingUp, AlertTriangle, Flame, Clock, Phone, Search, Filter, MessageCircle, BookOpen, Info } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import "./AcademicKpis.css";
import { useAuth } from "@/context/AuthContext";
import StudentModal from "@/components/students/StudentModal";

dayjs.extend(isSameOrAfter);
dayjs.locale('vi');

const MomentumBadge = ({ value }: { value: number }) => {
  if (value > 0) return <span className="badge-momentum momentum-up"><TrendingUp size={14} /> +{value}</span>;
  if (value < 0) return <span className="badge-momentum momentum-down"><TrendingUp size={14} className="transform rotate-180" /> {value}</span>;
  return <span className="badge-momentum momentum-flat">▬ 0</span>;
};

const BehaviorBadge = ({ label }: { label: string }) => {
  switch (label) {
    case 'Bền bỉ': return <span className="badge-behavior badge-marathon">🐢 Bền bỉ</span>;
    case 'Vượt chỉ tiêu': return <span className="badge-behavior badge-early">🌟 Vượt chỉ tiêu</span>;
    case 'Nước rút': return <span className="badge-behavior badge-crammer">⚡ Nước rút</span>;
    case 'Cưỡi ngựa xem hoa': return <span className="badge-behavior badge-low-effort">🐌 Cưỡi ngựa xem hoa</span>;
    case 'Tàng hình': return <span className="badge-behavior badge-ghost">👻 Tàng hình</span>;
    case 'Thiếu Padlet': return <span className="badge-behavior badge-missing">🛠️ Thiếu Padlet</span>;
    default: return <span className="badge-behavior badge-missing">{label}</span>;
  }
};

export default function AcademicKpiDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'hieu-suat' | 'hanh-vi' | 'dong-luong' | 'tra-cuu' | 'huong-dan'>('hieu-suat');
  
  // New Filter States
  const [leaderboardFilter, setLeaderboardFilter] = useState('Tat ca');
  const [selectedBehavior, setSelectedBehavior] = useState<string | null>(null);
  const [momentumFilter, setMomentumFilter] = useState('Tat ca');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  
  // Student Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentData, setSelectedStudentData] = useState<any>(null);

  // RBAC & Filters
  const activeRole = user?.role || "User";
  const activeBranch = user?.branch_id || "Việt Trì 1";
  const myBranches = useMemo(() => activeBranch ? activeBranch.split(',').map((b: string) => b.trim()).filter(Boolean) : [], [activeBranch]);
  const isGlobalRole = ["Super Admin", "Giám đốc", "Kế toán HO", "Kiểm toán HO", "Quản lý hệ thống"].includes(activeRole);

  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterTeacher, setFilterTeacher] = useState("Tất cả");
  const [filterClass, setFilterClass] = useState("Tất cả");
  const [searchTerm, setSearchTerm] = useState("");

  const getCurrentClass = (studentData: any) => {
    if (!studentData?.class_students) return '-';
    const activeClassObj = studentData.class_students.find((cs: any) => cs.status === 'Đang học' && cs.classes?.status === 'Đang học');
    return activeClassObj ? activeClassObj.classes.class_name : '-';
  };

  const getTeacherName = (vn_teacher_id: string) => {
    const teacher = teachers.find(t => t.id === vn_teacher_id);
    return teacher ? teacher.full_name : vn_teacher_id || '-';
  };

  useEffect(() => {
    if (activeRole === "Giáo viên" && user?.id) {
      setFilterTeacher(user.id);
    }
  }, [activeRole, user]);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Tìm tuần mới nhất có trong DB để không bị trùng lặp học sinh ở các tuần cũ
      const { data: latestWeekData } = await supabase
        .from('student_academic_kpis')
        .select('week_start')
        .order('week_start', { ascending: false })
        .limit(1);

      let currentWeekFilter = '';
      if (latestWeekData && latestWeekData.length > 0) {
        currentWeekFilter = latestWeekData[0].week_start;
      }

      let query = supabase
        .from('student_academic_kpis')
        .select(`
          *,
          students (
            *,
            class_students(status, classes(class_name, status))
          )
        `);

      if (currentWeekFilter) {
        query = query.eq('week_start', currentWeekFilter);
      }

      const { data: kpiData, error: kpiErr } = await query.order('diligence_score', { ascending: false });

      if (kpiErr) throw kpiErr;

      const { data: teacherData, error: teacherErr } = await supabase
        .from('users')
        .select('id, full_name, branch_id')
        .eq('role', 'Giáo viên')
        .neq('status', 'Nghỉ việc');

      if (!teacherErr && teacherData) {
        setTeachers(teacherData);
      } else {
        const { data: empData } = await supabase.from('employees').select('id, full_name, branch_id').eq('role', 'Giáo viên').neq('status', 'Nghỉ việc');
        if (empData) setTeachers(empData);
      }

      setKpis(kpiData || []);
    } catch (err) {
      console.error("Lỗi tải dữ liệu KPI:", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredKpis = useMemo(() => {
    return kpis.filter(k => {
      const s = k.students;
      if (!s) return false;
      
      if (!isGlobalRole && activeBranch !== "Tất cả") {
        if (filterBranch !== "Tất cả") {
          if (s.branch_id !== filterBranch) return false;
        } else {
          if (!myBranches.includes(s.branch_id)) return false;
        }
      } else {
        if (filterBranch !== "Tất cả" && s.branch_id !== filterBranch) return false;
      }

      if (filterTeacher !== "Tất cả") {
        if (s.vn_teacher !== filterTeacher) return false;
      }

      if (filterClass !== "Tất cả") {
        if (getCurrentClass(s) !== filterClass) return false;
      }

      if (searchTerm) {
        if (!s.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      }

      return true;
    });
  }, [kpis, isGlobalRole, activeBranch, myBranches, filterBranch, filterTeacher, filterClass, searchTerm]);

  useEffect(() => {
    if (activeRole !== "Giáo viên") {
      setFilterTeacher("Tất cả");
      setFilterClass("Tất cả");
    }
  }, [filterBranch, activeRole]);

  useEffect(() => {
    setFilterClass("Tất cả");
  }, [filterTeacher]);

  const filteredTeachersForUI = useMemo(() => {
    let availableTeachers = teachers;
    if (!isGlobalRole && activeBranch !== "Tất cả") {
      availableTeachers = availableTeachers.filter(t => {
        const teacherBranches = t.branch_id ? t.branch_id.split(',').map((b: any) => b.trim()).filter(Boolean) : [];
        return teacherBranches.some((b: any) => myBranches.includes(b));
      });
    }

    if (filterBranch !== "Tất cả") {
      availableTeachers = availableTeachers.filter(t => {
        const teacherBranches = t.branch_id ? t.branch_id.split(',').map((b: any) => b.trim()).filter(Boolean) : [];
        return teacherBranches.includes(filterBranch);
      });
    }

    return availableTeachers;
  }, [teachers, isGlobalRole, activeBranch, myBranches, filterBranch]);

  const availableClassesForUI = useMemo(() => {
    const classesSet = new Set<string>();
    kpis.forEach(k => {
      const s = k.students;
      if (!s) return;
      if (!isGlobalRole && activeBranch !== "Tất cả") {
        if (!myBranches.includes(s.branch_id)) return;
      }
      if (filterBranch !== "Tất cả" && s.branch_id !== filterBranch) return;
      if (filterTeacher !== "Tất cả" && s.vn_teacher !== filterTeacher) return;
      
      const c = getCurrentClass(s);
      if (c !== '-') classesSet.add(c);
    });
    return Array.from(classesSet).sort();
  }, [kpis, isGlobalRole, activeBranch, myBranches, filterBranch, filterTeacher]);

  const teacherLeaderboard = useMemo(() => {
    const map = new Map();
    filteredKpis.forEach(k => {
      if (!k.students?.vn_teacher) return;
      const tid = k.students.vn_teacher;
      if (!map.has(tid)) {
        map.set(tid, { id: tid, totalScore: 0, count: 0, avgScore: 0, streak: 0 });
      }
      const t = map.get(tid);
      t.totalScore += (k.diligence_score || 0);
      t.count += 1;
      if (k.streak_weeks >= 1) t.streak += 1;
    });

    const arr = Array.from(map.values()).map(t => {
      const teacherInfo = teachers.find(x => x.id === t.id);
      return {
        ...t,
        name: teacherInfo ? teacherInfo.full_name : 'Giáo viên ẩn',
        avgScore: Math.round(t.totalScore / t.count)
      };
    });
    
    return arr.sort((a, b) => b.avgScore - a.avgScore);
  }, [filteredKpis, teachers]);

  const leaderboardStudents = useMemo(() => {
    let list = filteredKpis.filter(k => k.diligence_score !== null);
    if (leaderboardFilter === 'Streak') {
      list = list.filter(k => k.streak_weeks > 0 && k.diligence_score >= 80);
    } else if (leaderboardFilter === 'Can don doc') {
      list = list.filter(k => k.diligence_score < 50 || ['Nước rút', 'Tàng hình'].includes(k.behavior_label));
    }
    return list.sort((a, b) => b.diligence_score - a.diligence_score);
  }, [filteredKpis, leaderboardFilter]);

  const momentumStudents = useMemo(() => {
    let list = filteredKpis.filter(k => k.momentum_trend !== null);
    if (momentumFilter === 'Tien bo') list = list.filter(k => k.momentum_trend > 0);
    else if (momentumFilter === 'Sa sut') list = list.filter(k => k.momentum_trend < 0);
    return list.sort((a, b) => a.momentum_trend - b.momentum_trend);
  }, [filteredKpis, momentumFilter]);

  return (
    <>
      <div className="animate-fade-in" style={{ paddingBottom: '3rem' }}>
      
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', margin: 0 }}>Báo cáo KPI Học thuật</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '1rem' }}>
            Phân tích đa chiều về độ chăm chỉ và thói quen học tập của học viên.
          </p>
        </div>
        <div className="header-actions">
          <button onClick={fetchData} className="btn btn-secondary">
            <Clock size={18} /> Làm mới dữ liệu
          </button>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 250px', background: 'var(--surface)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <Search size={18} style={{ color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm học viên..." 
            style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text-main)' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {isGlobalRole ? (
          <select className="form-input" style={{ width: 'auto', flex: '0 0 auto' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="Tất cả">Tất cả chi nhánh</option>
            <option value="Việt Trì 1">Việt Trì 1</option>
            <option value="Việt Trì 2">Việt Trì 2</option>
            <option value="Lâm Thao">Lâm Thao</option>
            <option value="Tuyên Quang">Tuyên Quang</option>
            <option value="Dân Hòa">Dân Hòa</option>
          </select>
        ) : (
          activeBranch.includes(",") && (
            <select className="form-input" style={{ width: 'auto', flex: '0 0 auto' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
              <option value="Tất cả">Tất cả chi nhánh của tôi</option>
              {activeBranch.split(",").map(b => b.trim()).filter(Boolean).map(br => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
          )
        )}

        <select 
          className="form-input" 
          style={{ width: 'auto', flex: '0 0 auto' }} 
          value={filterTeacher} 
          onChange={e => setFilterTeacher(e.target.value)}
          disabled={activeRole === "Giáo viên"}
        >
          <option value="Tất cả">Tất cả giáo viên</option>
          {filteredTeachersForUI.map(t => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>
        <select 
          className="form-control" 
          style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', minWidth: 150 }}
          value={filterClass} 
          onChange={e => setFilterClass(e.target.value)}
        >
          <option value="Tất cả">Tất cả các lớp</option>
          {availableClassesForUI.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="modal-tabs" style={{ background: 'transparent', padding: '0 0 1rem 0', marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          className={`tab-btn ${activeTab === 'hieu-suat' ? 'active' : ''}`}
          onClick={() => setActiveTab('hieu-suat')}
        >
          <Trophy size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} /> Bảng Phong Thần
        </button>
        <button 
          className={`tab-btn ${activeTab === 'hanh-vi' ? 'active' : ''}`}
          onClick={() => setActiveTab('hanh-vi')}
        >
          <BarChart3 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} /> Chân dung Hành vi
        </button>
        <button 
          className={`tab-btn ${activeTab === 'dong-luong' ? 'active' : ''}`}
          onClick={() => setActiveTab('dong-luong')}
        >
          <TrendingUp size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} /> Động lượng (Chữa cháy)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'tra-cuu' ? 'active' : ''}`}
          onClick={() => setActiveTab('tra-cuu')}
        >
          <Filter size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} /> Tra cứu Toàn bộ
        </button>
        <button 
          className={`tab-btn ${activeTab === 'huong-dan' ? 'active' : ''}`}
          onClick={() => setActiveTab('huong-dan')}
        >
          <BookOpen size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'text-bottom' }} /> Hướng dẫn sử dụng
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
        </div>
      ) : (
        <div className="animate-fade-in">
          
          {activeTab === 'hieu-suat' && (
            <div className="kpi-grid">
              
              <div className="glass-panel kpi-card">
                <div className="kpi-card-header">
                  <h2 style={{ color: '#D97706' }}><Trophy size={20} /> Bảng Vàng Giáo Viên</h2>
                </div>
                <div>
                  {teacherLeaderboard.slice(0, 5).map((t, i) => (
                    <div key={t.id} className="teacher-rank-item">
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div className={`rank-number ${i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other'}`}>
                          #{i + 1}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{t.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Flame size={12} style={{ color: '#D97706' }} /> {t.streak} học viên giữ lửa
                          </div>
                        </div>
                      </div>
                      <div style={{ fontWeight: 'bold', color: 'var(--primary)', fontSize: '1.1rem' }}>
                        {t.avgScore}đ
                      </div>
                    </div>
                  ))}
                  {teacherLeaderboard.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0' }}>Chưa có đủ dữ liệu xếp hạng</p>
                  )}
                </div>
              </div>

              <div className="glass-panel kpi-card">
                <div className="kpi-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <h2>Bảng Vàng Học Viên</h2>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setLeaderboardFilter('Tat ca')}
                      style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', border: '1px solid var(--border)', cursor: 'pointer', background: leaderboardFilter === 'Tat ca' ? 'var(--primary)' : 'transparent', color: leaderboardFilter === 'Tat ca' ? '#fff' : 'var(--text-main)' }}
                    >
                      Tất cả
                    </button>
                    <button 
                      onClick={() => setLeaderboardFilter('Streak')}
                      style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', border: '1px solid #D97706', cursor: 'pointer', background: leaderboardFilter === 'Streak' ? '#FEF3C7' : 'transparent', color: '#D97706', fontWeight: 600 }}
                    >
                      🔥 Nhóm Cần Tuyên dương
                    </button>
                    <button 
                      onClick={() => setLeaderboardFilter('Can don doc')}
                      style={{ padding: '4px 12px', borderRadius: '16px', fontSize: '0.8rem', border: '1px solid var(--danger)', cursor: 'pointer', background: leaderboardFilter === 'Can don doc' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', color: 'var(--danger)', fontWeight: 600 }}
                    >
                      ⚠️ Nhóm Cần Đôn đốc
                    </button>
                  </div>
                </div>
                <div className="kpi-table-container">
                  <table className="kpi-table">
                    <thead>
                      <tr>
                        <th>Học viên</th>
                        <th>Lớp hiện tại</th>
                        <th>Giáo viên CN</th>
                        <th>Tổng điểm</th>
                        <th>Huy hiệu</th>
                        <th>Chuỗi Lửa</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboardStudents.map(k => (
                        <tr key={k.id}>
                          <td 
                            style={{ fontWeight: 500, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                            onClick={() => {
                              setSelectedStudentId(k.student_id);
                              setSelectedStudentData(k.students);
                              setIsModalOpen(true);
                            }}
                          >
                            {k.students?.full_name}
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{getCurrentClass(k.students)}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{getTeacherName(k.students?.vn_teacher)}</td>
                          <td><span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{k.diligence_score}đ</span></td>
                          <td><BehaviorBadge label={k.behavior_label} /></td>
                          <td>
                            {k.streak_weeks > 0 ? (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 600 }}>
                                <Flame size={16} /> {k.streak_weeks} tuần
                              </span>
                            ) : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <a href={k.students?.parent_phone ? `tel:${k.students.parent_phone}` : '#'} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Gọi điện">
                                <Phone size={14} />
                              </a>
                              <a href={k.students?.parent_phone ? `https://zalo.me/${k.students.parent_phone}` : '#'} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#2563EB' }} title="Nhắn Zalo">
                                <MessageCircle size={14} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {leaderboardStudents.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            Chưa có học viên nào trong danh sách.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'hanh-vi' && (() => {
            const starCount = filteredKpis.filter(k => k.behavior_label === 'Vượt chỉ tiêu').length;
            const marathonCount = filteredKpis.filter(k => k.behavior_label === 'Bền bỉ').length;
            const crammerCount = filteredKpis.filter(k => k.behavior_label === 'Nước rút').length;
            const lowEffortCount = filteredKpis.filter(k => k.behavior_label === 'Cưỡi ngựa xem hoa').length;
            const ghostCount = filteredKpis.filter(k => k.behavior_label === 'Tàng hình').length;
            
            const pieData = [
              { name: 'Vượt chỉ tiêu (Star)', value: starCount, color: '#7C3AED' },
              { name: 'Bền bỉ (Marathon)', value: marathonCount, color: '#2563EB' },
              { name: 'Nước rút (Sprinter)', value: crammerCount, color: '#D97706' },
              { name: 'Cưỡi ngựa xem hoa', value: lowEffortCount, color: '#DB2777' },
              { name: 'Tàng hình (Ghost)', value: ghostCount, color: '#DC2626' },
            ].filter(d => d.value > 0);

            return (
              <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
                <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <BarChart3 size={28} style={{ color: 'var(--primary)' }} /> Thống kê Chân dung Hành vi
                </h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: 600, margin: '0 auto 2rem', lineHeight: 1.6 }}>
                  Dữ liệu tỷ trọng hành vi của học sinh đã được lọc theo chi nhánh và giáo viên đang chọn.
                </p>
                
                {pieData.length > 0 ? (
                  <div style={{ height: 350, width: '100%', marginBottom: '2rem' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={120}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value} học viên`, 'Số lượng']}
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div style={{ padding: '3rem', color: 'var(--text-muted)' }}>Chưa có dữ liệu thống kê hành vi</div>
                )}


                <div className="behavior-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
                  
                  <div 
                    className={`stat-box early-bird ${selectedBehavior === 'Vượt chỉ tiêu' ? 'selected' : ''}`}
                    onClick={() => setSelectedBehavior('Vượt chỉ tiêu')}
                    style={{ cursor: 'pointer', border: selectedBehavior === 'Vượt chỉ tiêu' ? '2px solid #7C3AED' : '1px solid transparent', padding: '1.5rem', background: 'rgba(124, 58, 237, 0.05)', borderRadius: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#6D28D9', fontSize: '1.1rem' }}>🌟 Vượt chỉ tiêu</h3>
                      <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7C3AED' }}>{starCount}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#5B21B6', margin: 0 }}>Đọc nhiều gấp đôi chuẩn & nộp bài đầy đủ.</p>
                  </div>

                  <div 
                    className={`stat-box marathon ${selectedBehavior === 'Bền bỉ' ? 'selected' : ''}`}
                    onClick={() => setSelectedBehavior('Bền bỉ')}
                    style={{ cursor: 'pointer', border: selectedBehavior === 'Bền bỉ' ? '2px solid #2563EB' : '1px solid transparent', padding: '1.5rem', background: 'rgba(37, 99, 235, 0.05)', borderRadius: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#1D4ED8', fontSize: '1.1rem' }}>🐢 Bền bỉ</h3>
                      <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563EB' }}>{marathonCount}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#1E40AF', margin: 0 }}>Tương tác rải đều &gt;4 ngày/tuần. Giữ thói quen rất tốt.</p>
                  </div>

                  <div 
                    className={`stat-box crammer ${selectedBehavior === 'Nước rút' ? 'selected' : ''}`}
                    onClick={() => setSelectedBehavior('Nước rút')}
                    style={{ cursor: 'pointer', border: selectedBehavior === 'Nước rút' ? '2px solid #D97706' : '1px solid transparent', padding: '1.5rem', background: 'rgba(217, 119, 6, 0.05)', borderRadius: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#B45309', fontSize: '1.1rem' }}>⚡ Nước rút</h3>
                      <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#D97706' }}>{crammerCount}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#92400E', margin: 0 }}>Làm dồn dập vào 1-2 ngày bất kỳ. Cần đôn đốc rải rác.</p>
                  </div>
                  
                  <div 
                    className={`stat-box low-effort ${selectedBehavior === 'Cưỡi ngựa xem hoa' ? 'selected' : ''}`}
                    onClick={() => setSelectedBehavior('Cưỡi ngựa xem hoa')}
                    style={{ cursor: 'pointer', border: selectedBehavior === 'Cưỡi ngựa xem hoa' ? '2px solid #DB2777' : '1px solid transparent', padding: '1.5rem', background: 'rgba(236, 72, 153, 0.05)', borderRadius: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#BE185D', fontSize: '1.1rem' }}>🐌 Cưỡi ngựa</h3>
                      <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#DB2777' }}>{lowEffortCount}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#9D174D', margin: 0 }}>Có mở app nhưng học chiếu lệ, lười làm BTVN.</p>
                  </div>

                  <div 
                    className={`stat-box ghost ${selectedBehavior === 'Tàng hình' ? 'selected' : ''}`}
                    onClick={() => setSelectedBehavior('Tàng hình')}
                    style={{ cursor: 'pointer', border: selectedBehavior === 'Tàng hình' ? '2px solid #DC2626' : '1px solid transparent', padding: '1.5rem', background: 'rgba(220, 38, 38, 0.05)', borderRadius: '12px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ margin: 0, color: '#B91C1C', fontSize: '1.1rem' }}>👻 Tàng hình</h3>
                      <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#DC2626' }}>{ghostCount}</span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#991B1B', margin: 0 }}>Gần như không tương tác. Nguy cơ bỏ học cao.</p>
                  </div>
                </div>

                {selectedBehavior && (
                  <div className="kpi-table-container" style={{ marginTop: '2rem', textAlign: 'left' }}>
                    <div style={{ padding: '1rem', background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                      <h3 style={{ margin: 0 }}>Danh sách Học viên nhóm "{selectedBehavior}"</h3>
                    </div>
                    <table className="kpi-table">
                      <thead>
                        <tr>
                          <th>Học viên</th>
                          <th>Lớp hiện tại</th>
                          <th>Giáo viên CN</th>
                          <th>Tổng điểm</th>
                          <th>Huy hiệu</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredKpis.filter(k => k.behavior_label === selectedBehavior).map(k => (
                          <tr key={k.id}>
                            <td 
                              style={{ fontWeight: 500, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => {
                                setSelectedStudentId(k.student_id);
                                setSelectedStudentData(k.students);
                                setIsModalOpen(true);
                              }}
                            >
                              {k.students?.full_name}
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{getCurrentClass(k.students)}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{getTeacherName(k.students?.vn_teacher)}</td>
                            <td style={{ fontWeight: 'bold' }}>{k.diligence_score}đ</td>
                            <td><BehaviorBadge label={k.behavior_label} /></td>
                            <td>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <a href={k.students?.parent_phone ? `tel:${k.students.parent_phone}` : '#'} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Gọi điện">
                                  <Phone size={14} />
                                </a>
                                <a href={k.students?.parent_phone ? `https://zalo.me/${k.students.parent_phone}` : '#'} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#2563EB' }} title="Nhắn Zalo">
                                  <MessageCircle size={14} />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })()}

          {activeTab === 'dong-luong' && (
            <div className="glass-panel kpi-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.05)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ color: 'var(--danger)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertTriangle size={20} /> Theo Dõi Động Lượng
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                    Theo dõi sự thay đổi phong độ của học sinh so với tuần trước để đưa ra hành động kịp thời.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setMomentumFilter('Tat ca')}
                    style={{ padding: '6px 16px', borderRadius: '16px', fontSize: '0.85rem', border: '1px solid var(--border)', cursor: 'pointer', background: momentumFilter === 'Tat ca' ? 'var(--primary)' : 'var(--surface)', color: momentumFilter === 'Tat ca' ? '#fff' : 'var(--text-main)' }}
                  >
                    Tất cả
                  </button>
                  <button 
                    onClick={() => setMomentumFilter('Tien bo')}
                    style={{ padding: '6px 16px', borderRadius: '16px', fontSize: '0.85rem', border: '1px solid #10B981', cursor: 'pointer', background: momentumFilter === 'Tien bo' ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface)', color: '#059669', fontWeight: 600 }}
                  >
                    📈 Đang tiến bộ
                  </button>
                  <button 
                    onClick={() => setMomentumFilter('Sa sut')}
                    style={{ padding: '6px 16px', borderRadius: '16px', fontSize: '0.85rem', border: '1px solid var(--danger)', cursor: 'pointer', background: momentumFilter === 'Sa sut' ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface)', color: 'var(--danger)', fontWeight: 600 }}
                  >
                    📉 Đang sa sút
                  </button>
                </div>
              </div>
              
              <div className="kpi-table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="kpi-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Lớp hiện tại</th>
                      <th>Giáo viên CN</th>
                      <th>Điểm</th>
                      <th>Hành vi</th>
                      <th>Động lượng</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {momentumStudents.map(k => (
                      <tr key={k.id}>
                        <td 
                          style={{ fontWeight: 500, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {
                            setSelectedStudentId(k.student_id);
                            setSelectedStudentData(k.students);
                            setIsModalOpen(true);
                          }}
                        >
                          {k.students?.full_name}
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{getCurrentClass(k.students)}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{getTeacherName(k.students?.vn_teacher)}</td>
                        <td style={{ fontWeight: 'bold' }}>{k.diligence_score !== null ? `${k.diligence_score}đ` : '-'}</td>
                        <td><BehaviorBadge label={k.behavior_label} /></td>
                        <td><MomentumBadge value={k.momentum_trend} /></td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <a href={k.students?.parent_phone ? `tel:${k.students.parent_phone}` : '#'} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} title="Gọi điện">
                              <Phone size={14} />
                            </a>
                            <a href={k.students?.parent_phone ? `https://zalo.me/${k.students.parent_phone.replace(/^0/, '84')}` : '#'} target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', color: '#2563EB', borderColor: '#BFDBFE', background: '#EFF6FF' }} title="Nhắn Zalo">
                              <MessageCircle size={14} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {momentumStudents.length === 0 && (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          Không có học viên nào khớp với bộ lọc động lượng.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: TRA CỨU TOÀN BỘ (MASTER DATA) */}
          {activeTab === 'tra-cuu' && (
            <div className="glass-panel kpi-card" style={{ padding: '0', overflow: 'hidden' }}>
              <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Filter size={20} /> Tra cứu Chi tiết 3 Chiều (Master Data)
                </h2>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginBottom: 0 }}>
                  Nơi Giáo viên kiểm soát dữ liệu thô: Khối lượng (Razkids, BTVN), Độ đều đặn (Active Days) và Chuỗi duy trì. Đã áp dụng bộ lọc nhánh/giáo viên.
                </p>
              </div>
              <div className="kpi-table-container" style={{ border: 'none', borderRadius: 0 }}>
                <table className="kpi-table">
                  <thead>
                    <tr>
                      <th>Học viên</th>
                      <th>Lớp hiện tại</th>
                      <th>Giáo viên CN</th>
                      <th>Khối lượng (Chiều 1)</th>
                      <th>Đều đặn (Chiều 2)</th>
                      <th>Tổng điểm</th>
                      <th>Chuỗi (Chiều 3)</th>
                      <th>Hành vi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredKpis.map(k => (
                      <tr key={k.id}>
                        <td 
                          style={{ fontWeight: 500, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                          onClick={() => {
                            setSelectedStudentId(k.student_id);
                            setSelectedStudentData(k.students);
                            setIsModalOpen(true);
                          }}
                        >
                          {k.students?.full_name}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{getCurrentClass(k.students)}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{getTeacherName(k.students?.vn_teacher)}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <div>Razkids: <strong style={{ color: 'var(--primary)' }}>{k.razkids_count}</strong> bài</div>
                          <div>BTVN: <strong style={{ color: 'var(--secondary)' }}>{k.btvn_count}</strong> bài</div>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <strong>{k.active_days}</strong> ngày
                          {k.diligence_score >= 90 && k.active_days <= 2 && (
                            <div style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: 2 }}>⚠️ Bị phạt -20% (Học nhồi)</div>
                          )}
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--text-main)', fontSize: '1.1rem' }}>
                          {k.diligence_score !== null ? `${k.diligence_score}đ` : '-'}
                        </td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 600 }}>
                            <Flame size={16} /> {k.streak_weeks}
                          </span>
                        </td>
                        <td><BehaviorBadge label={k.behavior_label} /></td>
                      </tr>
                    ))}
                    {filteredKpis.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                          Không tìm thấy học viên nào khớp với bộ lọc.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: HƯỚNG DẪN SỬ DỤNG */}
          {activeTab === 'huong-dan' && (
            <div className="glass-panel" style={{ padding: '3rem 2rem' }}>
              <div style={{ maxWidth: 800, margin: '0 auto' }}>
                <h2 style={{ fontSize: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
                  <Info style={{ color: 'var(--primary)' }} size={32} /> Hướng dẫn vận hành Hệ thống KPI
                </h2>

                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    1. Hệ thống Đánh giá 3 Chiều
                  </h3>
                  <p style={{ lineHeight: 1.6, color: 'var(--text-main)' }}>Khắc phục nhược điểm của việc đếm số lượng đơn thuần, tạo ra sự công bằng và chống học đối phó.</p>
                  <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
                    <li><strong>Chiều 1 (Khối lượng):</strong> Thang 100 điểm. 1 BTVN = 30đ. 1 bài Razkids = 5.7đ.</li>
                    <li><strong>Chiều 2 (Đều đặn):</strong> Nếu nộp dồn dập vào 1-2 ngày bất kỳ (dấu hiệu học nhồi, học đối phó), hệ thống tự động <strong>phạt trừ 20%</strong> tổng điểm.</li>
                    <li><strong>Chiều 3 (Chuỗi/Streak):</strong> Nếu học viên đạt điểm xuất sắc (&gt;80đ) liên tiếp các tuần, hệ thống sẽ thắp lên một ngọn lửa <Flame size={14} style={{ display: 'inline', color: '#D97706' }}/> để vinh danh sự bền bỉ.</li>
                  </ul>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    2. Từ điển "Chân dung Hành vi"
                  </h3>
                  <p style={{ lineHeight: 1.6, color: 'var(--text-main)' }}>Hệ thống tự động quét dữ liệu nộp bài trong tuần để phân loại tính cách học viên, giúp giáo viên có chiến lược tương tác phù hợp:</p>
                  <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #7C3AED' }}>
                      <strong>🦅 Chim sớm (Early Bird):</strong> Nộp bài siêu tốc ngay đầu tuần. Những học sinh rất chăm, bố mẹ sát sao.
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #2563EB' }}>
                      <strong>🐢 Bền bỉ (Marathon):</strong> Nộp bài rải đều hơn 4 ngày trong tuần. Có thói quen ngôn ngữ xuất sắc.
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #D97706' }}>
                      <strong>⚡ Nước rút (Sprinter):</strong> Nộp rất nhiều bài nhưng dồn cục vào 1-2 ngày. Cần gọi điện nhắc nhở phụ huynh chia nhỏ thời gian để con không bị "bội thực".
                    </div>
                    <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #DC2626' }}>
                      <strong>👻 Tàng hình (Ghost):</strong> Không làm hoặc làm cực ít (0-1 bài). Đây là báo động đỏ cần liên hệ phụ huynh ngay lập tức.
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', color: 'var(--primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                    3. Chỉ số Động lượng (Mũi tên Tăng/Giảm)
                  </h3>
                  <p style={{ lineHeight: 1.6, color: 'var(--text-main)' }}>So sánh học sinh với chính bản thân chúng ở tuần trước. Sự tiến bộ của bản thân mới là công bằng nhất.</p>
                  <ul style={{ paddingLeft: '1.5rem', lineHeight: 1.8, color: 'var(--text-muted)' }}>
                    <li><MomentumBadge value={2} /> <strong>Tiến bộ:</strong> Chăm chỉ hơn tuần trước (Ví dụ: Từ 0 bài lên 2 bài). Rất đáng khen ngợi.</li>
                    <li><MomentumBadge value={0} /> <strong>Đi ngang:</strong> Giữ vững phong độ bình thường.</li>
                    <li><MomentumBadge value={-3} /> <strong>Sa sút:</strong> Tụt lùi so với tuần trước. Cần bấm ngay vào nút Gọi điện 📞 để hỏi thăm nguyên nhân.</li>
                  </ul>
                </div>

              </div>
            </div>
          )}

        </div>
      )}
      </div>

      {/* Student Modal (Mở trực tiếp vào Nhật ký CSKH) */}
      {isModalOpen && (
        <StudentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          studentId={selectedStudentId}
          initialStudent={selectedStudentData}
          activeRole={activeRole}
          activeBranch={activeBranch}
          onSuccess={fetchData}
          initialTab="care"
        />
      )}
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Users, Calendar, BookOpen, MapPin, Trash2, Edit, LayoutList, CalendarDays, UserCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import ClassModal from "@/components/classes/ClassModal";
import TeacherHoursReport from "@/components/classes/TeacherHoursReport";
import MarketingScheduleModal from "@/components/classes/MarketingScheduleModal";
import "./Classes.css";

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "closed">("active");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterToday, setFilterToday] = useState(false);
  const [filterTeacher, setFilterTeacher] = useState("Tất cả");
  const [filterRoom, setFilterRoom] = useState("Tất cả");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "report">("list");
  const [allTeachers, setAllTeachers] = useState<any[]>([]);
  const [marketingSchedules, setMarketingSchedules] = useState<any[]>([]);

  // Week navigation state (defaulting to the Monday of the current week)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [showMarketingModal, setShowMarketingModal] = useState(false);
  const [editingMarketingItem, setEditingMarketingItem] = useState<any>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("create");
  const [selectedClassData, setSelectedClassData] = useState<any | null>(null);
  const [refreshReportTrigger, setRefreshReportTrigger] = useState(0);
  
  const { user, loading: authLoading } = useAuth();
  const activeRole = user?.role || "User";
  const activeBranch = user?.branch_id || "";
  const isForeignTeacher = user?.position === "Giáo viên nước ngoài";

  const canCreateClass = ["Super Admin", "Admin", "Kế toán HO", "Giám đốc", "Quản lý hệ thống", "Giáo viên"].includes(activeRole) && !isForeignTeacher;
  const canDeleteClass = ["Super Admin", "Admin", "Kế toán HO", "Giám đốc", "Quản lý hệ thống"].includes(activeRole);
  
  const GLOBAL_ROLES = ["Super Admin", "Giám đốc", "Kế toán HO", "Kiểm toán HO", "Quản lý hệ thống"];
  const isGlobalRole = GLOBAL_ROLES.includes(activeRole);

  const canEditClass = (cls: any) => {
    return ["Super Admin", "Admin", "Kế toán HO", "Giám đốc", "Quản lý hệ thống", "Giáo viên"].includes(activeRole);
  };

  useEffect(() => {
    if (authLoading) return;
    const fetchAllTeachers = async () => {
      let query = supabase.from("users").select("id, full_name, nickname").ilike("department", "%Đào tạo%");
      if (!isGlobalRole) {
        if (activeBranch) {
          const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
          if (branches.length > 1) {
            query = query.or(branches.map(b => `branch_id.ilike.%${b}%`).join(','));
          } else {
            query = query.ilike("branch_id", `%${branches[0]}%`);
          }
        } else {
          query = query.eq("id", "none");
        }
      } else if (filterBranch !== "Tất cả") {
        query = query.ilike("branch_id", `%${filterBranch}%`);
      }
      const { data } = await query;
      if (data) {
        const unique = Array.from(new Map(data.map((item: any) => [item.full_name, item])).values());
        setAllTeachers(unique);
      }
    };
    fetchAllTeachers();
  }, [activeBranch, filterBranch, isGlobalRole, authLoading]);

  const fetchClasses = async () => {
    if (authLoading) return;
    setLoading(true);
    // Tải toàn bộ lớp học và lịch marketing trên toàn hệ thống để kiểm tra chéo lịch dạy của giáo viên
    const { data, error } = await supabase.from("classes").select("*, class_students(count)").order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      alert("Lỗi tải danh sách lớp: " + error.message);
    } else {
      setClasses(data || []);
    }

    // Fetch marketing schedules (all branches)
    const { data: mData } = await supabase.from("marketing_schedules").select("*").order("date", { ascending: true });
    setMarketingSchedules(mData || []);

    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchClasses();
    }
  }, [activeBranch, filterBranch, isGlobalRole, authLoading]);

  const openModal = (cls?: any, mode: "view" | "edit" = "edit") => {
    if (cls) {
      setSelectedClassData(cls);
      setEditingId(cls.id);
      setModalMode(mode);
    } else {
      setSelectedClassData(null);
      setEditingId(null);
      setModalMode("create");
    }
    setShowModal(true);
  };

  const handleDeleteClass = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("CẢNH BÁO: Bạn có chắc chắn muốn xóa lớp học này không? Mọi dữ liệu liên quan (lộ trình, sỹ số, điểm danh) sẽ bị xóa sạch và không thể khôi phục!")) return;
    try {
      const { error } = await supabase.from("classes").delete().eq("id", id);
      if (error) throw error;
      alert("Đã xóa lớp thành công!");
      fetchClasses();
    } catch (err: any) {
      alert("Lỗi khi xóa lớp: " + err.message);
    }
  };

  const currentBranch = isGlobalRole ? filterBranch : (activeBranch.includes(",") ? filterBranch : activeBranch);

  // Lấy danh sách giáo viên hoạt động tại chi nhánh hiện tại
  const activeTeachersInBranch = (() => {
    const teachers = new Set<string>();
    classes.forEach(c => {
      if (currentBranch === "Tất cả" || c.branch_id === currentBranch) {
        if (c.teacher_vn) teachers.add(c.teacher_vn);
        if (c.teacher_foreign) teachers.add(c.teacher_foreign);
      }
    });
    return teachers;
  })();

  const baseFilteredClasses = classes.filter(cls => {
    const matchBranch = (() => {
      if (currentBranch === "Tất cả") {
        if (isGlobalRole) return true;
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        return branches.some(b => cls.branch_id.includes(b));
      }
      return !currentBranch || cls.branch_id.includes(currentBranch);
    })();
    const matchSearch = searchTerm === "" || cls.class_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTeacher = filterTeacher === "Tất cả" || cls.teacher_vn === filterTeacher || cls.teacher_foreign === filterTeacher;
    
    let matchToday = true;
    if (filterToday) {
      const todayDay = new Date().getDay();
      const mapDays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const currentDayStr = mapDays[todayDay];
      const clsSchedules = cls.schedules || [];
      matchToday = clsSchedules.some((sch: any) => sch.dayOfWeek === currentDayStr);
    }

    return matchBranch && matchSearch && matchToday && matchTeacher;
  });

  const activeClassesCount = baseFilteredClasses.filter(cls => cls.status === "Đang học" || cls.status === "Sắp khai giảng").length;
  const closedClassesCount = baseFilteredClasses.filter(cls => cls.status === "Đã kết thúc").length;

  const filteredClasses = baseFilteredClasses.filter(cls => {
    return activeTab === "active" ? (cls.status === "Đang học" || cls.status === "Sắp khai giảng") : (cls.status === "Đã kết thúc");
  });

  const handleSuccess = () => {
    fetchClasses();
    setRefreshReportTrigger(prev => prev + 1);
  };

  const getTeacherDisplay = (teacherForeign?: string, teacherVn?: string) => {
    const getNick = (name?: string) => {
      if (!name) return null;
      const t = allTeachers.find(x => x.full_name === name);
      return (t && t.nickname) ? t.nickname : name;
    };
    
    const nickForeign = getNick(teacherForeign);
    const nickVn = getNick(teacherVn);
    
    if (nickForeign && nickVn) return `${nickForeign} / ${nickVn}`;
    if (nickForeign) return nickForeign;
    if (nickVn) return nickVn;
    return null;
  };

  return (
    <>
      <div className="classes-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Quản Lý Lớp Học</h1>
          <p className="text-muted">Quản lý danh sách lớp, lộ trình giáo án và sỹ số học viên.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canCreateClass && (
            <>
              <button className="btn btn-secondary" onClick={() => { setEditingMarketingItem(null); setShowMarketingModal(true); }}>
                <Plus size={20} />
                <span>Lịch Marketing & Dạy thay</span>
              </button>
              <button className="btn btn-primary" onClick={() => openModal()}>
                <Plus size={20} />
                <span>Mở Lớp Mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="page-actions" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="view-toggle">
          <button 
            className={viewMode === 'list' ? 'active' : ''} 
            onClick={() => setViewMode('list')}
          >
            <LayoutList size={16} /> Danh sách
          </button>
          <button 
            className={viewMode === 'calendar' ? 'active' : ''} 
            onClick={() => setViewMode('calendar')}
          >
            <CalendarDays size={16} /> Lịch Tuần
          </button>
          <button 
            className={viewMode === 'report' ? 'active' : ''} 
            onClick={() => setViewMode('report')}
          >
            <UserCircle size={16} /> Báo cáo Giờ dạy
          </button>
        </div>

        <div className="search-bar" style={{ flex: 1, minWidth: '250px' }}>
          <Search className="search-icon" size={20} />
          <input 
            type="text" 
            placeholder="Tìm theo tên lớp..." 
            className="search-input" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isGlobalRole ? (
          <select className="form-input" style={{ width: 'auto' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="Tất cả">Tất cả Chi nhánh</option>
            <option value="Việt Trì 1">Việt Trì 1</option>
            <option value="Việt Trì 2">Việt Trì 2</option>
            <option value="Lâm Thao">Lâm Thao</option>
            <option value="Tuyên Quang">Tuyên Quang</option>
            <option value="Dân Hòa">Dân Hòa</option>
          </select>
        ) : (
          activeBranch.includes(",") && (
            <select className="form-input" style={{ width: 'auto' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
              <option value="Tất cả">Tất cả chi nhánh của tôi</option>
              {activeBranch.split(",").map(b => b.trim()).filter(Boolean).map(br => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
          )
        )}
        <select className="form-input" style={{ width: 'auto', maxWidth: '200px' }} value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
          <option value="Tất cả">Tất cả Giáo viên</option>
          {allTeachers.map(t => (
            <option key={t.id} value={t.full_name}>{t.full_name}</option>
          ))}
        </select>
        
        {viewMode === 'calendar' && (
          <select className="form-input" style={{ width: 'auto', maxWidth: '200px' }} value={filterRoom} onChange={e => setFilterRoom(e.target.value)}>
            <option value="Tất cả">Tất cả Phòng học</option>
            {Array.from(new Set(classes.map(c => c.room).filter(Boolean))).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        )}
        <button 
          className={`btn ${filterToday ? 'btn-primary' : 'btn-secondary'}`} 
          onClick={() => setFilterToday(!filterToday)}
        >
          <Calendar size={18} /> {filterToday ? "Đang lọc: Hôm nay" : "Lớp học hôm nay"}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : viewMode === 'list' ? (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
            <button className={`btn ${activeTab === 'active' ? 'btn-primary' : ''}`} style={{ background: activeTab === 'active' ? undefined : 'transparent', color: activeTab === 'active' ? undefined : '#64748b', boxShadow: activeTab === 'active' ? undefined : 'none' }} onClick={() => setActiveTab('active')}>Lớp đang hoạt động ({activeClassesCount})</button>
            <button className={`btn ${activeTab === 'closed' ? 'btn-primary' : ''}`} style={{ background: activeTab === 'closed' ? undefined : 'transparent', color: activeTab === 'closed' ? undefined : '#64748b', boxShadow: activeTab === 'closed' ? undefined : 'none' }} onClick={() => setActiveTab('closed')}>Lớp đã đóng ({closedClassesCount})</button>
          </div>
          
          {filteredClasses.length === 0 ? (
            <div className="empty-state glass-panel">
              <BookOpen size={48} className="text-muted" />
              <h3>Không tìm thấy lớp học</h3>
              <p>Chưa có lớp học nào phù hợp với bộ lọc hiện tại.</p>
            </div>
          ) : (
            <div className="glass-panel" style={{ overflowX: 'auto', borderRadius: '12px', padding: 0 }}>
              <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Lớp & Chi nhánh</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Lịch học & Phòng</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Giáo viên</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Sĩ số</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Trạng thái</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClasses.map(cls => {
                    const actualStudents = cls.class_students?.[0]?.count || 0;
                    const maxStudents = cls.max_students || 15;
                    const progress = maxStudents === 0 ? 0 : Math.min(100, Math.round((actualStudents / maxStudents) * 100));
                    
                    return (
                      <tr key={cls.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'} onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'} onClick={() => openModal(cls, 'view')}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>{cls.class_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>{cls.branch_id} • {cls.group_type}</div>
                          {(cls.start_date || cls.end_date) && (
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Calendar size={12} />
                              <span>
                                {cls.start_date ? (() => { const d = new Date(cls.start_date); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`; })() : '...'} ➔ {cls.end_date ? (() => { const d = new Date(cls.end_date); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`; })() : '...'}
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem', color: '#334155' }}>
                          {cls.schedules?.length > 0 ? cls.schedules.map((s: any, i: number) => <div key={i}>{s.dayOfWeek} ({s.startTime}-{s.endTime})</div>) : <div>Chưa xếp lịch</div>}
                          <div style={{ color: '#64748b', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MapPin size={12}/> {cls.room || "Chưa xếp phòng"}</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                          <div style={{ color: '#334155' }}>NN: {getTeacherDisplay(cls.teacher_foreign, undefined) || "---"}</div>
                          <div style={{ color: '#64748b', marginTop: '0.25rem' }}>VN: {getTeacherDisplay(undefined, cls.teacher_vn) || "---"}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontSize: '0.85rem', color: '#334155', marginBottom: '0.25rem' }}>{actualStudents} / {maxStudents}</div>
                          <div style={{ width: '100px', height: '6px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: progress >= 100 ? '#ef4444' : '#3b82f6', borderRadius: '999px' }}></div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span style={{ 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '999px', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            background: cls.status === 'Đang học' ? '#dcfce3' : cls.status === 'Sắp khai giảng' ? '#ffedd5' : '#f1f5f9',
                            color: cls.status === 'Đang học' ? '#16a34a' : cls.status === 'Sắp khai giảng' ? '#c2410c' : '#64748b'
                          }}>
                            {cls.status}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); openModal(cls, 'view'); }}>Xem</button>
                            {canEditClass(cls) && (
                              <button className="btn btn-primary btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); openModal(cls, 'edit'); }}>Sửa</button>
                            )}
                            {canDeleteClass && (
                              <button className="btn btn-sm" style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id, e); }}>Xóa</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : viewMode === 'report' ? (
        <TeacherHoursReport 
          key={refreshReportTrigger} 
          branchId={activeBranch} 
          isGlobalRole={isGlobalRole} 
          filterTeacher={filterTeacher} 
        />
      ) : (
        <div className="calendar-view">
          {/* Week navigation */}
          <div className="week-navigation" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '1.5rem', 
            padding: '1rem', 
            background: 'var(--card-bg, #ffffff)', 
            borderBottom: '1px solid var(--border, #e2e8f0)',
            borderRadius: '12px 12px 0 0'
          }}>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const prev = new Date(currentWeekStart);
              prev.setDate(currentWeekStart.getDate() - 7);
              setCurrentWeekStart(prev);
            }}>
              &larr; Tuần trước
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const today = new Date();
              const day = today.getDay();
              const diff = today.getDate() - day + (day === 0 ? -6 : 1);
              const monday = new Date(today.setDate(diff));
              monday.setHours(0, 0, 0, 0);
              setCurrentWeekStart(monday);
            }}>
              Tuần này
            </button>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>
              {(() => {
                const end = new Date(currentWeekStart);
                end.setDate(currentWeekStart.getDate() + 6);
                const startDay = String(currentWeekStart.getDate()).padStart(2, '0');
                const startMonth = String(currentWeekStart.getMonth() + 1).padStart(2, '0');
                const startYear = currentWeekStart.getFullYear();
                const endDay = String(end.getDate()).padStart(2, '0');
                const endMonth = String(end.getMonth() + 1).padStart(2, '0');
                const endYear = end.getFullYear();
                return `Tuần: ${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`;
              })()}
            </span>
            <button className="btn btn-secondary btn-sm" onClick={() => {
              const next = new Date(currentWeekStart);
              next.setDate(currentWeekStart.getDate() + 7);
              setCurrentWeekStart(next);
            }}>
              Tuần sau &rarr;
            </button>
          </div>

          <div className="calendar-grid-header">
            {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map((day, index) => {
              const colDate = new Date(currentWeekStart);
              colDate.setDate(currentWeekStart.getDate() + index);
              const dateStr = `${String(colDate.getDate()).padStart(2, '0')}/${String(colDate.getMonth() + 1).padStart(2, '0')}`;
              return (
                <div key={day} className="calendar-day-header">
                  {day} <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 500 }}>({dateStr})</span>
                </div>
              );
            })}
          </div>
          <div className="calendar-grid-body">
            {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map((day, index) => {
              let dayClasses: any[] = [];
              const columnDate = new Date(currentWeekStart);
              columnDate.setDate(currentWeekStart.getDate() + index);
              columnDate.setHours(0, 0, 0, 0);
              
              // 1. Lịch học chính thức (Classes)
              classes.forEach(cls => {
                const isCurrentBranch = currentBranch === "Tất cả" || !currentBranch || cls.branch_id === currentBranch;
                const clsSchedules = cls.schedules || [];
                
                clsSchedules.forEach((sch: any) => {
                  if (sch.dayOfWeek === day) {
                    // Kiểm tra start_date
                    const clsStartDate = cls.start_date ? new Date(cls.start_date) : null;
                    if (clsStartDate) {
                      clsStartDate.setHours(0, 0, 0, 0);
                      if (columnDate < clsStartDate) return;
                    }

                    // Kiểm tra end_date. Nếu ngày trên lịch vượt qua end_date của lớp (hoặc lớp đã Đã kết thúc) thì ẩn đi.
                    const clsEndDate = cls.end_date ? new Date(cls.end_date) : null;
                    if (clsEndDate) {
                      clsEndDate.setHours(23, 59, 59, 999);
                      if (columnDate > clsEndDate) return;
                    }
                    
                    if (isCurrentBranch) {
                      // Áp dụng bộ lọc phòng học, trạng thái, giáo viên và từ khóa tìm kiếm cho chi nhánh hiện tại
                      if (filterRoom !== "Tất cả" && cls.room !== filterRoom) return;
                      const matchStatus = activeTab === "active" ? (cls.status === "Đang học" || cls.status === "Sắp khai giảng") : (cls.status === "Đã kết thúc");
                      if (!matchStatus) return;
                      if (filterTeacher !== "Tất cả" && cls.teacher_vn !== filterTeacher && cls.teacher_foreign !== filterTeacher) return;
                      if (searchTerm !== "" && !cls.class_name.toLowerCase().includes(searchTerm.toLowerCase())) return;

                      dayClasses.push({ ...cls, schedule: sch, type: 'class', isDimmed: false });
                    } else {
                      // Thuộc chi nhánh khác. Chỉ hiển thị nếu giáo viên của lớp này đang dạy tại chi nhánh hiện tại
                      const hasActiveTeacher = (cls.teacher_vn && activeTeachersInBranch.has(cls.teacher_vn)) || 
                                              (cls.teacher_foreign && activeTeachersInBranch.has(cls.teacher_foreign));
                      if (hasActiveTeacher) {
                        // Áp dụng bộ lọc giáo viên, trạng thái và từ khóa cho chi nhánh khác
                        if (filterTeacher !== "Tất cả" && cls.teacher_vn !== filterTeacher && cls.teacher_foreign !== filterTeacher) return;
                        const matchStatus = activeTab === "active" ? (cls.status === "Đang học" || cls.status === "Sắp khai giảng") : (cls.status === "Đã kết thúc");
                        if (!matchStatus) return;
                        if (searchTerm !== "" && !cls.class_name.toLowerCase().includes(searchTerm.toLowerCase())) return;

                        dayClasses.push({ ...cls, schedule: sch, type: 'class', isDimmed: true });
                      }
                    }
                  }
                });
              });

              // 2. Lịch Dạy thay và Lịch Marketing
              marketingSchedules.forEach(m => {
                const mDate = new Date(m.date);
                const isSameDay = mDate.getFullYear() === columnDate.getFullYear() &&
                                  mDate.getMonth() === columnDate.getMonth() &&
                                  mDate.getDate() === columnDate.getDate();
                if (isSameDay) {
                  const isCurrentBranch = currentBranch === "Tất cả" || !currentBranch || m.branch_id === currentBranch;
                  
                  let className = "Marketing";
                  if (m.schedule_type === "Dạy thay") {
                    const clsObj = classes.find(c => c.id === m.class_id);
                    className = `Dạy thay: ${clsObj ? clsObj.class_name : "Lớp học"}`;
                  }

                  const itemData = {
                    id: m.id,
                    class_name: className,
                    teacher_vn: m.substituted_teacher_name || "",
                    teacher_foreign: m.teacher_name,
                    room: m.location,
                    schedule: { startTime: m.start_time, endTime: m.end_time },
                    status: m.status,
                    type: 'marketing',
                    branch_id: m.branch_id,
                    originalData: m
                  };

                  if (isCurrentBranch) {
                    if (filterTeacher !== "Tất cả" && m.teacher_name !== filterTeacher && m.substituted_teacher_name !== filterTeacher) return;
                    if (searchTerm !== "" && !className.toLowerCase().includes(searchTerm.toLowerCase())) return;

                    dayClasses.push({ ...itemData, isDimmed: false });
                  } else {
                    const hasActiveTeacher = (m.teacher_name && activeTeachersInBranch.has(m.teacher_name)) ||
                                            (m.substituted_teacher_name && activeTeachersInBranch.has(m.substituted_teacher_name));
                    if (hasActiveTeacher) {
                      if (filterTeacher !== "Tất cả" && m.teacher_name !== filterTeacher && m.substituted_teacher_name !== filterTeacher) return;
                      if (searchTerm !== "" && !className.toLowerCase().includes(searchTerm.toLowerCase())) return;

                      dayClasses.push({ ...itemData, isDimmed: true });
                    }
                  }
                }
              });
              
              dayClasses.sort((a, b) => a.schedule.startTime.localeCompare(b.schedule.startTime));

              return (
                <div key={day} className="calendar-column">
                  {dayClasses.map((cls, idx) => {
                    if (cls.type === 'marketing') {
                      const isSub = cls.originalData?.schedule_type === 'Dạy thay';
                      return (
                        <div 
                          key={`mkt-${cls.id}-${idx}`} 
                          className="calendar-item ielts" 
                          style={{ 
                            background: isSub ? "#f0fdf4" : "#fdf2f8", 
                            borderLeftColor: isSub ? "#22c55e" : "#db2777",
                            opacity: cls.isDimmed ? 0.45 : 1,
                            cursor: cls.isDimmed ? 'default' : 'pointer',
                            borderStyle: cls.isDimmed ? 'dashed' : 'solid'
                          }} 
                          onClick={() => { 
                            if (cls.isDimmed) return; // Không cho phép click sửa lịch mờ của chi nhánh khác
                            setEditingMarketingItem(cls.originalData); 
                            setShowMarketingModal(true); 
                          }}
                        >
                          <div className="cal-time" style={{ color: isSub ? "#15803d" : "#be185d" }}>{cls.schedule.startTime} - {cls.schedule.endTime}</div>
                          <div className="cal-title" style={{ color: isSub ? "#166534" : "#9d174d" }}>
                            {cls.class_name} ({cls.status}) {cls.isDimmed && `[${cls.branch_id}]`}
                          </div>
                          <div className="cal-detail"><MapPin size={12} /> {cls.room}</div>
                          <div className="cal-detail"><UserCircle size={12} /> {getTeacherDisplay(cls.teacher_foreign, undefined) || "Chưa xếp GVNN"}</div>
                          {isSub && cls.teacher_vn && (
                            <div className="cal-detail" style={{ fontStyle: 'italic', marginTop: '2px', color: '#15803d', fontWeight: 500 }}>
                              Thay cho: {getTeacherDisplay(undefined, cls.teacher_vn)}
                            </div>
                          )}
                        </div>
                      );
                    }

                    const kindyClass = cls.group_type?.toLowerCase().includes('kindy') ? 'kindy' : '';
                    const teenClass = cls.group_type?.toLowerCase().includes('teen') ? 'teen' : '';
                    const ieltsClass = cls.group_type?.toLowerCase().includes('ielts') ? 'ielts' : '';
                    const colorClass = kindyClass || teenClass || ieltsClass;

                    return (
                      <div 
                        key={`${cls.id}-${idx}`} 
                        className={`calendar-item ${colorClass}`} 
                        style={{
                          opacity: cls.isDimmed ? 0.45 : 1,
                          cursor: cls.isDimmed ? 'default' : 'pointer',
                          borderStyle: cls.isDimmed ? 'dashed' : 'solid'
                        }}
                        onClick={() => { 
                          if (cls.isDimmed) return; // Không cho phép click sửa lịch mờ của chi nhánh khác
                          openModal(cls, 'view'); 
                        }}
                      >
                        <div className="cal-time">{cls.schedule.startTime} - {cls.schedule.endTime}</div>
                        <div className="cal-title">{cls.class_name} {cls.isDimmed && `[${cls.branch_id}]`}</div>
                        <div className="cal-detail"><MapPin size={12} /> {cls.room || 'Chưa xếp phòng'}</div>
                        <div className="cal-detail"><UserCircle size={12} /> {getTeacherDisplay(cls.teacher_foreign, cls.teacher_vn) || 'Chưa xếp GV'}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
      </div>

      {/* Class Modal */}
      <ClassModal 
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); setSelectedClassData(null); }}
        classId={editingId}
        initialClassData={selectedClassData}
        mode={modalMode}
        activeRole={activeRole}
        activeBranch={activeBranch}
        onSuccess={handleSuccess}
      />

      {/* Marketing Schedule Modal */}
      <MarketingScheduleModal 
        isOpen={showMarketingModal}
        onClose={() => { setShowMarketingModal(false); setEditingMarketingItem(null); }}
        onSuccess={handleSuccess}
        editingItem={editingMarketingItem}
        branchId={isGlobalRole ? (filterBranch === "Tất cả" ? (activeBranch || "Việt Trì 1") : filterBranch) : activeBranch}
      />
    </>
  );
}

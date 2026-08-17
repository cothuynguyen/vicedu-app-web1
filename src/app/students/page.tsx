"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Users, Phone, MapPin, Calendar, Clock, DollarSign, BookOpen, Upload, Download, AlertCircle, LayoutGrid, List, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import StudentModal from "@/components/students/StudentModal";
import ImportStudentsModal from "@/components/students/ImportStudentsModal";
import CreateTaskModal from "@/components/students/CreateTaskModal";
import Image from "next/image";
import "./Students.css";

export default function StudentsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  // View Mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  useEffect(() => {
    const saved = localStorage.getItem("studentsViewMode");
    if (saved === "list") setViewMode("list");
  }, []);

  
  // Filter States
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterType, setFilterType] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [filterHours, setFilterHours] = useState("");
  const [showRedFlagsOnly, setShowRedFlagsOnly] = useState(false);
  const [redFlags, setRedFlags] = useState<Record<string, { reason: string }>>({});
  
  // Teacher Filter States
  const [teachers, setTeachers] = useState<any[]>([]);
  const [filterTeacher, setFilterTeacher] = useState("Tất cả");

  // Birth Month Filter
  const [filterBirthMonth, setFilterBirthMonth] = useState("Tất cả");

  // Birth Year Filter
  const [filterBirthYears, setFilterBirthYears] = useState<string[]>([]);
  const [showBirthYearDropdown, setShowBirthYearDropdown] = useState(false);

  // Modals States
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedStudentObj, setSelectedStudentObj] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [exporting, setExporting] = useState(false);

  const activeRole = user?.role || "User";
  const activeBranch = user?.branch_id || "Việt Trì 1";

  const canCreate = ["Super Admin", "Kế toán HO"].includes(activeRole);
  const canAssignTasks = ["Super Admin", "Admin"].includes(activeRole);
  const isGlobalRole = ["Super Admin", "Giám đốc", "Kế toán HO", "Kiểm toán HO", "Quản lý hệ thống"].includes(activeRole);

  const myBranches = useMemo(() => {
    return activeBranch ? activeBranch.split(',').map((b: any) => b.trim()).filter(Boolean) : [];
  }, [activeBranch]);

  const filteredTeachersForUI = useMemo(() => {
    if (isGlobalRole || activeBranch === "Tất cả") return teachers;
    return teachers.filter(t => {
      const teacherBranches = t.branch_id ? t.branch_id.split(',').map((b: any) => b.trim()).filter(Boolean) : [];
      return teacherBranches.some((b: any) => myBranches.includes(b));
    });
  }, [teachers, isGlobalRole, activeBranch, myBranches]);

  useEffect(() => {
    fetchData(true);
    fetchRedFlags();
  }, [activeBranch, activeRole, filterBranch, filterStatus, filterType, filterHours, searchTerm, showRedFlagsOnly, filterTeacher, filterBirthMonth, filterBirthYears]);

  useEffect(() => {
    supabase
      .from("users")
      .select("id, full_name, role, branch_id")
      .eq("role", "Giáo viên")
      .order("full_name", { ascending: true })
      .then((res: any) => {
        const { data, error } = res;
        if (!error && data) {
          setTeachers(data);
        }
      });
  }, []);

  useEffect(() => {
    if (user && user.role === "Giáo viên") {
      setFilterTeacher(user.id);
    }
  }, [user]);

  useEffect(() => {
    if (page > 0) {
      fetchData(false);
    }
  }, [page]);

  useEffect(() => {
    if (students.length > 0) {
      const openId = localStorage.getItem('openStudentModal');
      if (openId) {
        localStorage.removeItem('openStudentModal');
        const stu = students.find(s => s.id === openId);
        if (stu) {
          openEditModal(stu);
        } else {
          supabase.from('students').select('*').eq('id', openId).single().then(({ data }: { data: any }) => {
             if (data) openEditModal(data);
          });
        }
      }
    }
  }, [students]);

  const fetchRedFlags = async () => {
    const { data, error } = await supabase.rpc('get_red_flags');
    const redFlagMap: Record<string, { reason: string }> = {};
    if (!error && data) {
      data.forEach((row: any) => {
        redFlagMap[row.student_id] = { reason: row.reason };
      });
    }
    setRedFlags(redFlagMap);
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      let selectStr = "*, class_students(status, classes(class_name, teacher_vn, teacher_foreign, schedules, group_type, status)), enrollments(*)";
      if (filterType !== "Tất cả") {
        selectStr = "*, class_students!inner(status, classes!inner(class_name, teacher_vn, teacher_foreign, schedules, group_type, status)), enrollments(*)";
      }

      let query = supabase.from("students").select(selectStr).order("created_at", { ascending: false });
      
      if (!isGlobalRole && activeBranch && activeBranch !== "Tất cả") {
        if (filterBranch !== "Tất cả") {
          query = query.eq("branch_id", filterBranch);
        } else {
          const branches = activeBranch.split(",").map((b: string) => b.trim()).filter(Boolean);
          if (branches.length > 1) {
            query = query.in("branch_id", branches);
          } else if (branches.length === 1) {
            query = query.eq("branch_id", branches[0]);
          }
        }
      } else if (filterBranch !== "Tất cả") {
        query = query.eq("branch_id", filterBranch);
      }

      if (filterStatus === "Chờ xếp lớp") {
        try {
          const { data: assigned } = await supabase.from("class_students").select("student_id").eq("status", "Đang học");
          const assignedIds = Array.from(new Set((assigned || []).map((item: any) => item.student_id).filter(Boolean)));
          
          let orQuery = "status.eq.Chờ xếp lớp";
          if (assignedIds.length > 0) {
            orQuery += `,and(status.eq.Đang học,id.not.in.(${assignedIds.join(",")}))`;
          }
          query = query.or(orQuery);
        } catch (err) {
          console.error("Error fetching assigned student list:", err);
        }
      } else if (filterStatus !== "Tất cả") {
        query = query.eq("status", filterStatus);
      }

      if (filterType !== "Tất cả") {
        query = query.eq("class_students.status", "Đang học");
        query = query.eq("class_students.classes.group_type", filterType);
      }

      if (filterBirthMonth !== "Tất cả") {
        const targetMonth = parseInt(filterBirthMonth.replace("Tháng ", ""), 10);
        const startYear = 1990;
        const endYear = new Date().getFullYear();
        let orClauses = [];
        for (let year = startYear; year <= endYear; year++) {
          const monthStr = targetMonth.toString().padStart(2, '0');
          const lastDay = new Date(year, targetMonth, 0).getDate();
          orClauses.push(`and(dob.gte.${year}-${monthStr}-01,dob.lte.${year}-${monthStr}-${lastDay})`);
        }
        query = query.or(orClauses.join(','));
      }

      if (filterBirthYears.length > 0) {
        let orClauses = [];
        for (const year of filterBirthYears) {
          if (year === "null") {
            orClauses.push("dob.is.null");
          } else {
            orClauses.push(`and(dob.gte.${year}-01-01,dob.lte.${year}-12-31)`);
          }
        }
        query = query.or(orClauses.join(','));
      }

      if (filterHours !== "") {
        query = query.lte("remaining_hours", parseInt(filterHours));
      }

      if (filterTeacher !== "Tất cả") {
        query = query.or(`vn_teacher.eq.${filterTeacher},foreign_teacher.eq.${filterTeacher}`);
      }

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,parent_phone.ilike.%${searchTerm}%`);
      }

      if (showRedFlagsOnly && Object.keys(redFlags).length > 0) {
        query = query.in("id", Object.keys(redFlags));
      } else if (showRedFlagsOnly) {
        alert("Không có dữ liệu xuất!");
        setExporting(false);
        return;
      }

      const { data, error } = await query;
      if (error) throw error;
      if (!data || data.length === 0) {
        alert("Không có dữ liệu để xuất!");
        setExporting(false);
        return;
      }

      const XLSX = await import("xlsx");

      const exportData = data.map((stu: any) => {
        const remaining_hours = stu.remaining_hours || 0;
        
        const totalRegistered = stu.total_registered_hours || 0;
        const studiedHours = stu.total_studied_hours || (totalRegistered - remaining_hours);

        const totalRegisteredCost = stu.total_registered_cost || 0;
        const totalPaid = stu.total_paid || 0;
        const debt = totalRegisteredCost - totalPaid;
        const remainingValue = stu.remaining_cost || 0; // Trong DB, remaining_cost bị đặt tên nhầm nhưng có nghĩa là "Giá trị còn lại"
        
        let paymentStatus = "Chưa phát sinh";
        if (debt > 0) {
          paymentStatus = "⚠️ Còn nợ";
        } else if (debt <= 0 && totalRegisteredCost > 0) {
          paymentStatus = "✅ Hoàn thành";
        }

        return {
          "Mã HV": stu.id,
          "Họ tên": stu.full_name,
          "SĐT Phụ huynh": stu.parent_phone || "",
          "Email": stu.email || "",
          "Cơ sở": stu.branch_id || "",
          "Trạng thái": stu.status || "",
          "Tổng giờ đ.ký": totalRegistered,
          "Giờ đã học": studiedHours >= 0 ? studiedHours : 0,
          "Giờ còn lại": remaining_hours || 0,
          "Tổng học phí (đ)": totalRegisteredCost,
          "Đã đóng (đ)": totalPaid,
          "Còn nợ (đ)": debt,
          "Giá trị còn lại (đ)": remainingValue,
          "Tình trạng thanh toán": paymentStatus,
          "Ngày nhập học": stu.created_at ? new Date(stu.created_at).toLocaleDateString("vi-VN") : ""
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
      XLSX.writeFile(workbook, `Danh_sach_hoc_vien_${new Date().toISOString().split('T')[0]}.xlsx`);

    } catch (err: any) {
      console.error("Export error:", err);
      alert("Lỗi khi xuất file Excel: " + err.message);
    } finally {
      setExporting(false);
    }
  };
  
  const fetchData = async (reset = false) => {
    if (reset) {
      setPage(0);
      setStudents([]);
    }
    setLoading(true);

    // 1. Determine the select string based on filterType (group_type)
    let selectStr = "*, class_students(status, classes(class_name, teacher_vn, teacher_foreign, schedules, group_type, status)), enrollments(*)";
    if (filterType !== "Tất cả") {
      selectStr = "*, class_students!inner(status, classes!inner(class_name, teacher_vn, teacher_foreign, schedules, group_type, status)), enrollments(*)";
    }

    let query = supabase.from("students").select(selectStr, { count: 'exact' }).order("created_at", { ascending: false });
    
    if (!isGlobalRole && activeBranch && activeBranch !== "Tất cả") {
      if (filterBranch !== "Tất cả") {
        query = query.eq("branch_id", filterBranch);
      } else {
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          query = query.in("branch_id", branches);
        } else if (branches.length === 1) {
          query = query.eq("branch_id", branches[0]);
        }
      }
    } else if (filterBranch !== "Tất cả") {
      query = query.eq("branch_id", filterBranch);
    }

    // 2. Handle filterStatus (Tình trạng / Chờ xếp lớp)
    if (filterStatus === "Chờ xếp lớp") {
      try {
        const { data: assigned } = await supabase.from("class_students").select("student_id").eq("status", "Đang học");
        const assignedIds = Array.from(new Set((assigned || []).map((item: any) => item.student_id).filter(Boolean)));
        
        let orQuery = "status.eq.Chờ xếp lớp";
        if (assignedIds.length > 0) {
          orQuery += `,and(status.eq.Đang học,id.not.in.(${assignedIds.join(",")}))`;
        }
        query = query.or(orQuery);
      } catch (err) {
        console.error("Error fetching assigned student list:", err);
      }
    } else if (filterStatus !== "Tất cả") {
      query = query.eq("status", filterStatus);
    }

    // 3. Handle filterType (Phân loại / Trình độ)
    if (filterType !== "Tất cả") {
      query = query.eq("class_students.status", "Đang học");
      query = query.eq("class_students.classes.group_type", filterType);
    }

    if (filterBirthMonth !== "Tất cả") {
      const targetMonth = parseInt(filterBirthMonth.replace("Tháng ", ""), 10);
      const startYear = 1990;
      const endYear = new Date().getFullYear();
      let orClauses = [];
      for (let year = startYear; year <= endYear; year++) {
        const monthStr = targetMonth.toString().padStart(2, '0');
        const lastDay = new Date(year, targetMonth, 0).getDate();
        orClauses.push(`and(dob.gte.${year}-${monthStr}-01,dob.lte.${year}-${monthStr}-${lastDay})`);
      }
      query = query.or(orClauses.join(','));
    }

    if (filterBirthYears.length > 0) {
      let orClauses = [];
      for (const year of filterBirthYears) {
        if (year === "null") {
          orClauses.push("dob.is.null");
        } else {
          orClauses.push(`and(dob.gte.${year}-01-01,dob.lte.${year}-12-31)`);
        }
      }
      query = query.or(orClauses.join(','));
    }

    if (filterHours !== "") {
      query = query.lte("remaining_hours", parseInt(filterHours));
    }

    if (filterTeacher !== "Tất cả") {
      query = query.or(`vn_teacher.eq.${filterTeacher},foreign_teacher.eq.${filterTeacher}`);
    }

    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,id.ilike.%${searchTerm}%,parent_phone.ilike.%${searchTerm}%`);
    }

    if (showRedFlagsOnly && Object.keys(redFlags).length > 0) {
      query = query.in("id", Object.keys(redFlags));
    } else if (showRedFlagsOnly) {
      setStudents([]);
      setTotalStudents(0);
      setLoading(false);
      return;
    }

    const start = reset ? 0 : page * 50;
    const end = start + 49;
    query = query.range(start, end);
    
    const { data, count, error } = await query;
    if (!error && data) {
      const enhancedData = data.map((stu: any) => {
        let student_type = "Mới";
        if (stu.enrollments && stu.enrollments.length > 0) {
          student_type = stu.enrollments.length > 1 ? "Tái tục" : "Mới";
        }
        return { ...stu, student_type };
      });

      if (reset) {
        setStudents(enhancedData);
      } else {
        setStudents(prev => [...prev, ...enhancedData]);
      }
      setTotalStudents(count || 0);
      setHasMore((start + 50) < (count || 0));
    }
    setLoading(false);
  };

  const generateIdForBranch = async (branch: string) => {
    let prefix = "VICVT";
    if (branch === "Tuyên Quang") prefix = "VICTQ";
    else if (branch === "Lâm Thao") prefix = "VICLT";
    else if (branch === "Dân Hòa") prefix = "VICDH";
    else if (branch === "Việt Trì 1") prefix = "VICVT1";
    else if (branch === "Việt Trì 2") prefix = "VICVT2";
    
    const { data } = await supabase
      .from("students")
      .select("id")
      .ilike("id", `${prefix}%`)
      .order("id", { ascending: false })
      .limit(1);

    let nextId = `${prefix}001`;
    if (data && data.length > 0) {
      const lastId = data[0].id;
      const numMatch = lastId.replace(prefix, "").match(/\d+/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[0], 10) + 1;
        nextId = `${prefix}${nextNum.toString().padStart(3, '0')}`;
      }
    }
    return nextId;
  };

  const openCreateModal = async () => {
    const initBranch = isGlobalRole ? "Việt Trì 1" : (activeBranch.includes(",") ? activeBranch.split(",")[0].trim() : activeBranch);
    const nextId = await generateIdForBranch(initBranch);
    setSelectedStudentObj({
      id: nextId,
      branch_id: initBranch
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEditModal = (stu: any) => {
    setEditingId(stu.id);
    setSelectedStudentObj(stu);
    setShowModal(true);
  };

  const handleSuccess = () => {
    fetchData(true);
    fetchRedFlags();
  };

  if (activeRole === "Sale") {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>🚫 Quyền truy cập bị từ chối</h2>
        <p className="text-muted" style={{ marginTop: '1rem' }}>Tài khoản Sale (Tuyển sinh) chỉ được cấp quyền xem Quản lý Lớp học.</p>
      </div>
    );
  }

  return (
    <>
      <div className="students-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Hồ sơ Học viên</h1>
          <p className="text-muted">Quản lý lý lịch, liên hệ và tiến độ học tập.</p>
        </div>
        <div className="header-actions" style={{ display: 'flex', gap: '0.5rem' }}>
          
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '0.25rem', marginRight: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => { setViewMode('grid'); localStorage.setItem('studentsViewMode', 'grid'); }}
              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', background: viewMode === 'grid' ? '#fff' : 'transparent', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'grid' ? '#3b82f6' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Dạng lưới"
            ><LayoutGrid size={18} /></button>
            <button 
              onClick={() => { setViewMode('list'); localStorage.setItem('studentsViewMode', 'list'); }}
              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', background: viewMode === 'list' ? '#fff' : 'transparent', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'list' ? '#3b82f6' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Dạng danh sách"
            ><List size={18} /></button>
          </div>
          {canAssignTasks && (
            <button className="btn btn-warning" onClick={() => setShowTaskModal(true)} style={{ background: '#f59e0b', color: 'white', border: 'none' }}>
              <Phone size={18} style={{ marginRight: '0.5rem' }} />
              <span>Giao Task CSKH</span>
            </button>
          )}
          {canCreate && (
            <>
              {activeRole === "Super Admin" && (
                <>
                  <button className="btn btn-secondary" onClick={handleExportExcel} disabled={exporting}>
                    <Download size={18} style={{ marginRight: '0.5rem' }} />
                    <span>{exporting ? "Đang xuất..." : "Xuất Excel"}</span>
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
                    <Upload size={18} style={{ marginRight: '0.5rem' }} />
                    <span>Import (Excel)</span>
                  </button>
                </>
              )}
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={18} style={{ marginRight: '0.5rem' }} />
                <span>Thêm Học viên mới</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: '1 1 300px', background: '#ffffff', border: '2px solid #3b82f6', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.1)' }}>
          <Search size={20} style={{ color: '#3b82f6' }} />
          <input 
            type="text" 
            placeholder="Tìm tên học viên, SĐT PH, Mã HV..." 
            className="search-input" 
            style={{ fontWeight: 500, color: '#1e293b' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isGlobalRole ? (
          <select className="form-input" style={{ width: 'auto' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="Tất cả">Tất cả chi nhánh</option>
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
        
        <select className="form-input" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="Tất cả">Tất cả phân loại</option>
          <option value="Kindy">Kindy</option>
          <option value="Kids">Kids</option>
          <option value="Teens">Teens</option>
          <option value="IELTS">IELTS</option>
          <option value="Other">Other</option>
        </select>
        
        <select className="form-input" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="Tất cả">Tất cả tình trạng</option>
          <option value="Đang học">Đang học</option>
          <option value="Chờ xếp lớp">Chờ xếp lớp / Chưa xếp lớp</option>
          <option value="Bảo lưu">Bảo lưu</option>
          <option value="Nghỉ học">Nghỉ học</option>
        </select>

        <select className="form-input" style={{ width: 'auto' }} value={filterBirthMonth} onChange={e => setFilterBirthMonth(e.target.value)}>
          <option value="Tất cả">Tất cả Tháng sinh nhật</option>
          {Array.from({length: 12}, (_, i) => i + 1).map(m => (
            <option key={m} value={`Tháng ${m}`}>Tháng {m}</option>
          ))}
        </select>

        <div style={{ position: 'relative' }}>
          <button 
            className="form-input" 
            style={{ width: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: '#fff', cursor: 'pointer' }}
            onClick={() => setShowBirthYearDropdown(!showBirthYearDropdown)}
          >
            <span>{filterBirthYears.length > 0 ? `Đã chọn: ${filterBirthYears.length} năm` : "Tất cả Năm sinh"}</span>
            <ChevronDown size={16} style={{ color: '#64748b' }} />
          </button>
          
          {showBirthYearDropdown && (
            <div style={{ 
              position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: '#fff', 
              border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              zIndex: 50, minWidth: '200px', maxHeight: '300px', overflowY: 'auto'
            }}>
              <div style={{ padding: '0.5rem', borderBottom: '1px solid #e2e8f0' }}>
                <button 
                  style={{ fontSize: '0.8rem', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
                  onClick={() => setFilterBirthYears([])}
                >
                  Bỏ chọn tất cả
                </button>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                <input 
                  type="checkbox" 
                  checked={filterBirthYears.includes("null")}
                  onChange={(e) => {
                    if (e.target.checked) setFilterBirthYears(prev => [...prev, "null"]);
                    else setFilterBirthYears(prev => prev.filter(y => y !== "null"));
                  }}
                />
                <span style={{ fontSize: '0.9rem', color: '#ef4444', fontWeight: 500 }}>Chưa cập nhật (Trống)</span>
              </label>
              {Array.from({length: new Date().getFullYear() - 1999}, (_, i) => new Date().getFullYear() - i).map(year => (
                <label key={year} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={filterBirthYears.includes(year.toString())}
                    onChange={(e) => {
                      if (e.target.checked) setFilterBirthYears(prev => [...prev, year.toString()]);
                      else setFilterBirthYears(prev => prev.filter(y => y !== year.toString()));
                    }}
                  />
                  <span style={{ fontSize: '0.9rem', color: '#334155' }}>Năm {year}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <select className="form-input" style={{ width: 'auto' }} value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
          <option value="Tất cả">Tất cả giáo viên</option>
          {filteredTeachersForUI.map(t => (
            <option key={t.id} value={t.id}>{t.full_name}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label className="text-muted" style={{ fontSize: '0.875rem', whiteSpace: 'nowrap' }}>Giờ còn lại ≤</label>
          <input 
            type="number" 
            className="form-input" 
            placeholder="Giờ..." 
            style={{ width: '80px' }}
            value={filterHours}
            onChange={e => setFilterHours(e.target.value)}
          />
        </div>
        
        <button 
          className={`btn ${showRedFlagsOnly ? 'btn-danger' : 'btn-secondary'}`}
          onClick={() => setShowRedFlagsOnly(!showRedFlagsOnly)}
          style={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
        >
          🚩 {showRedFlagsOnly ? "Đang lọc: Báo động đỏ" : "Lọc Báo động đỏ"}
        </button>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : students.length === 0 ? (
        <div className="empty-state glass-panel">
          <Users size={48} className="text-muted" />
          <h3>Chưa có học viên nào</h3>
          <p>Không tìm thấy học viên khớp với bộ lọc hiện tại.</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1rem', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: 8, height: 24, background: '#3b82f6', borderRadius: 4 }}></span>
            Tìm thấy <span style={{ color: '#2563eb', fontSize: '1.1rem' }}>{students.length}</span> học viên
          </div>
          
          {viewMode === 'list' ? (
            <div className="students-list-view glass-panel" style={{ overflowX: 'auto', borderRadius: '12px' }}>
              <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Học viên</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Lớp đang học</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Giờ học</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Liên hệ</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Điểm chạm</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu) => {
                    const allClasses = stu.class_students?.filter((cs: any) => cs.status === "Đang học" && cs.classes) || [];
                    const activeClasses = allClasses.filter((cs: any) => cs.classes.status === "Đang học").map((cs: any) => cs.classes);
                    const pastClasses = allClasses.filter((cs: any) => cs.classes.status !== "Đang học").map((cs: any) => cs.classes);
                    const hasPadlet = stu.padlet_url && stu.padlet_api;
                    
                    const touchpointsList = stu.touchpoints && Array.isArray(stu.touchpoints) ? stu.touchpoints : [];
                    const touchpointCount = touchpointsList.filter((tp: any) => tp.done).length;
                    const touchpointPercent = Math.round((touchpointCount / 10) * 100);

                    return (
                      <tr key={stu.id} onClick={() => openEditModal(stu)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} className="student-list-row">
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {stu.avatar_url ? (
                              <Image src={stu.avatar_url} alt={stu.full_name} width={40} height={40} style={{ borderRadius: '8px', objectFit: 'cover' }} />
                            ) : (
                              <div className="student-avatar-large" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>{stu.full_name.charAt(0)}</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{stu.full_name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {stu.id}
                                {activeRole === "Super Admin" && !hasPadlet && (
                                  <span style={{ color: '#ef4444', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 4px', borderRadius: '4px' }}>
                                    <AlertCircle size={10} /> Thiếu Padlet
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155' }}>
                          {activeClasses.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {activeClasses.map((c: any, i: number) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} className="text-primary"/> <span>{c.class_name}</span></div>)}
                              {pastClasses.length > 0 && (
                                <div title={`Đã học: ${pastClasses.map((c:any) => c.class_name).join(', ')}`} style={{ fontSize: '0.75rem', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', width: 'fit-content', marginTop: '2px', cursor: 'help' }}>
                                  + {pastClasses.length} lớp cũ
                                </div>
                              )}
                            </div>
                          ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa xếp lớp</span>}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                          <div><span className="text-muted">Còn dư:</span> <strong style={{ color: 'var(--primary)' }}>{stu.remaining_hours || 0}h</strong></div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng: {stu.total_registered_hours || 0}h</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                          <div><Phone size={12} className="text-muted" style={{ marginRight: '4px' }}/> {stu.parent_phone || "Trống"}</div>
                          {stu.address && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stu.address}><MapPin size={10} style={{ marginRight: '2px' }}/> {stu.address}</div>}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', width: '60px' }}>
                              <div style={{ width: `${Math.min(touchpointPercent, 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>{touchpointCount}/10</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`status-badge ${stu.status === 'Đang học' ? 'active' : 'inactive'}`} style={{ whiteSpace: 'nowrap' }}>
                            {stu.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="students-grid">

          {students.map((stu) => (
            <div key={stu.id} className="student-card glass-panel" onClick={() => openEditModal(stu)}>
              <div className="student-header">
                {stu.avatar_url ? (
                  <Image src={stu.avatar_url} alt={stu.full_name} width={48} height={48} style={{ borderRadius: '12px', objectFit: 'cover' }} />
                ) : (
                  <div className="student-avatar-large">{stu.full_name.charAt(0)}</div>
                )}
                <div className="student-title" style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ 
                    fontSize: '1.05rem', 
                    fontWeight: 700, 
                    color: 'var(--text-main)', 
                    margin: 0, 
                    whiteSpace: 'nowrap', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis' 
                  }}>
                    {stu.full_name} {stu.nickname ? `(${stu.nickname})` : ''}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                      Mã HV: <strong>{stu.id}</strong>
                    </span>
                    {activeRole === "Super Admin" && (!stu.padlet_url || !stu.padlet_api) && (
                      <span 
                        title="Học viên chưa có hồ sơ Padlet đầy đủ (thiếu link hoặc API key)" 
                        style={{ 
                          color: '#ef4444', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.68rem', 
                          fontWeight: 600,
                          gap: '2px',
                          cursor: 'help'
                        }}
                      >
                        <AlertCircle size={10} /> Thiếu Padlet
                      </span>
                    )}
                  </div>
                </div>
                <div className={`status-badge ${stu.status === 'Đang học' ? 'active' : 'inactive'}`}>
                  {stu.status}
                </div>
              </div>
              
              {redFlags[stu.id] && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      🚩 {redFlags[stu.id].reason}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem' }}>SĐT Phụ huynh: <strong>{stu.parent_phone || "Trống"}</strong></span>
                    <button 
                      className="btn btn-primary" 
                      style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', background: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={(e) => { e.stopPropagation(); openEditModal(stu); }}
                    >
                      Nhật ký CSKH
                    </button>
                  </div>
                </div>
              )}
              
              <div className="student-info-grid">
                {(() => {
                  const allClasses = stu.class_students?.filter((cs: any) => cs.status === "Đang học" && cs.classes) || [];
                  const activeClasses = allClasses.filter((cs: any) => cs.classes.status === "Đang học").map((cs: any) => cs.classes);
                  const pastClasses = allClasses.filter((cs: any) => cs.classes.status !== "Đang học").map((cs: any) => cs.classes);
                  if (activeClasses.length > 0) {
                    return activeClasses.map((currentClassObj: any, idx: number) => (
                      <div key={idx} style={{ gridColumn: '1 / -1', marginBottom: '0.5rem' }}>
                        <div className="info-item" style={{ background: 'rgba(59, 130, 246, 0.05)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(59, 130, 246, 0.2)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <BookOpen size={16} className="text-primary" style={{ flexShrink: 0 }} />
                          <span style={{ fontWeight: 600, color: 'var(--primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentClassObj.class_name}</span>
                          {idx === 0 && pastClasses.length > 0 && (
                            <span title={`Đã học: ${pastClasses.map((c:any) => c.class_name).join(', ')}`} style={{ fontSize: '0.7rem', color: '#64748b', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', cursor: 'help', flexShrink: 0 }}>
                              + {pastClasses.length} lớp cũ
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingLeft: '0.5rem' }}>
                          <div className="info-item" style={{ gridColumn: '1 / -1', alignItems: 'flex-start' }}>
                            <Calendar size={16} className="info-icon" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', whiteSpace: 'normal', lineHeight: 1.3 }}>
                              {currentClassObj.schedules?.length > 0 ? currentClassObj.schedules.map((s: any) => `${s.dayOfWeek} (${s.startTime}-${s.endTime})`).join(' • ') : "Chưa xếp lịch"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ));
                  } else {
                    return (
                      <div className="info-item" style={{ gridColumn: '1 / -1', color: 'var(--warning)', background: 'rgba(245, 158, 11, 0.05)', padding: '0.5rem', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                        <AlertCircle size={16} />
                        <span>Chưa xếp lớp học</span>
                      </div>
                    );
                  }
                })()}

                <div className="info-item">
                  <Phone size={16} className="info-icon" />
                  <span>PH: {stu.parent_phone}</span>
                </div>
                <div className="info-item" style={{ gridColumn: '1 / -1', alignItems: 'flex-start' }}>
                  <MapPin size={16} className="info-icon" style={{ marginTop: '0.2rem', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.4 }}>
                    {stu.address || "Chưa có địa chỉ"}
                  </span>
                </div>
                
                <div className="info-item" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <Clock size={16} className="info-icon text-muted" />
                  <span>Tổng giờ: {stu.total_registered_hours || 0}h</span>
                </div>
                <div className="info-item" style={{ borderTop: '1px dashed var(--border)', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                  <Clock size={16} className="info-icon text-success" />
                  <span className="text-success" style={{ fontWeight: 'bold' }}>Còn dư: {stu.remaining_hours || 0}h</span>
                </div>

                {/* Thanh phần trăm điểm chạm */}
                {(() => {
                  const touchpointsList = stu.touchpoints && Array.isArray(stu.touchpoints) ? stu.touchpoints : [];
                  const doneCount = touchpointsList.filter((tp: any) => tp.done).length;
                  const totalCount = 10;
                  const percent = Math.round((doneCount / totalCount) * 100);
                  
                  return (
                    <div style={{ gridColumn: '1 / -1', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.75rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          🎯 Điểm chạm học viên:
                        </span>
                        <strong style={{ color: percent === 100 ? '#10b981' : 'var(--primary)' }}>
                          {doneCount}/{totalCount} ({percent}%)
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(0, 0, 0, 0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${percent}%`, 
                            height: '100%', 
                            background: percent === 100 ? '#10b981' : 'linear-gradient(90deg, var(--primary) 0%, #6366f1 100%)', 
                            borderRadius: '3px', 
                            transition: 'width 0.3s ease' 
                          }}
                        ></div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ))}
            </div>
          )}
        </>



      )}

      {hasMore && !loading && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
          <button className="btn btn-secondary" onClick={() => setPage(p => p + 1)}>
            Tải thêm học viên ({totalStudents - students.length} còn lại)
          </button>
        </div>
      )}
      </div>

      {/* Student Details and Create/Edit Modal */}
      <StudentModal 
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingId(null); setSelectedStudentObj(null); }}
        studentId={editingId}
        initialStudent={selectedStudentObj}
        activeRole={activeRole}
        activeBranch={activeBranch}
        onSuccess={handleSuccess}
        generateIdForBranch={generateIdForBranch}
      />

      {/* Import Excel Modal */}
      <ImportStudentsModal 
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleSuccess}
      />

      {/* Create Task Modal */}
      {showTaskModal && (
        <CreateTaskModal 
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          filters={{ filterBranch, filterStatus, filterType, filterHours, filterBirthMonth, filterBirthYears, searchTerm }}
          activeBranch={activeBranch}
          isGlobalRole={isGlobalRole}
        />
      )}
    </>



  );
}

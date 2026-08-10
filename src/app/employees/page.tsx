"use client";

import { useState, useEffect } from "react";
import { Plus, Search, UserCircle, Briefcase, MapPin, Mail, AlertCircle, Edit2, Trash2, ChevronDown, Filter, FileText, Download, Eye, EyeOff, Camera, X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { createAuthUser, updateAuthUserPassword, deleteAuthUser } from "@/app/actions/employee";
import { compressImage } from "@/utils/imageCompressor";
import { uploadImageToCloudflare } from "@/utils/uploadImage";
import "./Employees.css";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const activeRole = user?.role || "User";
  const activeBranch = user?.branch_id || "Việt Trì 1";

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterDepartment, setFilterDepartment] = useState("Tất cả");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [listTab, setListTab] = useState("active");

  const [activeTab, setActiveTab] = useState("general"); // 'general', 'docs', 'salary'

  // CCCD Upload & Lightbox state
  const [uploadingCCCD, setUploadingCCCD] = useState<{ front: boolean; back: boolean }>({ front: false, back: false });
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: "", full_name: "", nickname: "", gender: "Nữ", nationality: "Việt Nam",
    phone: "", email: "", password: "", branch_id: "Việt Trì 1", department: "Đào tạo", 
    position: "", role: "User", status: "Chính thức", avatar_url: "",
    // Các trường mở rộng HRIS
    dob: "", id_card: "", id_date: "", id_front_url: "", id_back_url: "", current_address: "",
    bank_account: "", bank_owner: "", bank_name: "", start_date: "", facebook_url: "",
    total_leave_days: 12, used_leave_days: 0, profile_info: "", record_status: "Thiếu thông tin",
    contract_status: "Thử việc", salary_level: "", base_salary: 0, insurance_salary: 0, notes: ""
  });

  const canCreateEmployee = ["Super Admin", "Admin"].includes(activeRole);
  const GLOBAL_ROLES = ["Super Admin", "Giám đốc", "Kế toán HO", "Kiểm toán HO", "Quản lý hệ thống"];
  const isGlobalRole = GLOBAL_ROLES.includes(activeRole);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    let query = supabase.from("users").select("id, password, full_name, nickname, email, branch_id, department, role, status, created_at, avatar_url, nationality, gender, phone, position, dob, id_card, id_date, id_front_url, id_back_url, current_address, bank_account, bank_owner, bank_name, start_date, facebook_url, total_leave_days, used_leave_days, profile_info, record_status, contract_status, salary_level, base_salary, insurance_salary, notes");
    
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
    }
    
    const { data, error } = await query.order("id", { ascending: true });
    if (!error && data) {
      setEmployees(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading, activeBranch, activeRole]);

  useEffect(() => {
    if (!authLoading && !isGlobalRole && activeBranch) {
      setFilterBranch(activeBranch.includes(",") ? "Tất cả" : activeBranch);
    }
  }, [authLoading, activeBranch, isGlobalRole]);

  const getBranchPrefix = (branchStr: string) => {
    if (!branchStr) return 'NVVT';
    const firstBranch = branchStr.split(',')[0].trim();
    switch (firstBranch) {
      case 'Việt Trì 1':
      case 'Việt Trì 2': return 'NVVT';
      case 'Lâm Thao': return 'NVLT';
      case 'Tuyên Quang': return 'NVTQ';
      case 'Dân Hòa': return 'NVDH';
      default: return 'NVVT';
    }
  };

  const calculateNextId = (prefix: string) => {
    const nextIdNumber = employees.reduce((max, emp) => {
      if (!emp.id || typeof emp.id !== 'string' || !emp.id.startsWith(prefix)) return max;
      const numStr = emp.id.replace(prefix, '');
      const num = parseInt(numStr, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0) + 1;
    return `${prefix}${nextIdNumber.toString().padStart(3, '0')}`;
  };

  useEffect(() => {
    // Tự động đổi ID theo chi nhánh đang chọn khi Tạo mới
    if (showCreateModal && !editingEmployeeId) {
      const prefix = getBranchPrefix(formData.branch_id);
      const nextId = calculateNextId(prefix);
      if (formData.id !== nextId) {
        setFormData(prev => ({ ...prev, id: nextId }));
      }
    }
  }, [formData.branch_id, showCreateModal, editingEmployeeId, employees]);

  const openCreateModal = () => {
    setEditingEmployeeId(null);
    
    const initialBranch = activeRole === "Super Admin" ? "Việt Trì 1" : (activeBranch.includes(",") ? activeBranch.split(",")[0].trim() : activeBranch);
    const prefix = getBranchPrefix(initialBranch);
    const nextId = calculateNextId(prefix);

    setFormData({
      id: nextId, full_name: "", nickname: "", gender: "Nữ", nationality: "Việt Nam",
      phone: "", email: "", password: "", branch_id: activeRole === "Super Admin" ? "Việt Trì 1" : (activeBranch.includes(",") ? activeBranch.split(",")[0].trim() : activeBranch), department: "Đào tạo", 
      position: "", role: "User", status: "Chính thức", avatar_url: "",
      dob: "", id_card: "", id_date: "", id_front_url: "", id_back_url: "", current_address: "",
      bank_account: "", bank_owner: "", bank_name: "", start_date: "", facebook_url: "",
      total_leave_days: 12, used_leave_days: 0, profile_info: "", record_status: "Thiếu thông tin",
      contract_status: "Thử việc", salary_level: "", base_salary: 0, insurance_salary: 0, notes: ""
    });
    setActiveTab("general");
    setShowCreateModal(true);
  };

  const openEditModal = (emp: any) => {
    setEditingEmployeeId(emp.id);
    setFormData({
      ...emp,
      nickname: emp.nickname || "",
      gender: emp.gender || "Nữ",
      nationality: emp.nationality || "Việt Nam",
      phone: emp.phone || "",
      position: emp.position || "",
      password: emp.password || "",
      avatar_url: emp.avatar_url || "",
      dob: emp.dob || "", id_card: emp.id_card || "", id_date: emp.id_date || "", 
      id_front_url: emp.id_front_url || "", id_back_url: emp.id_back_url || "", 
      current_address: emp.current_address || "", bank_account: emp.bank_account || "", 
      bank_owner: emp.bank_owner || "", bank_name: emp.bank_name || "", start_date: emp.start_date || "", 
      facebook_url: emp.facebook_url || "", total_leave_days: emp.total_leave_days || 12, 
      used_leave_days: emp.used_leave_days || 0, profile_info: emp.profile_info || "", 
      record_status: emp.record_status || "Thiếu thông tin", contract_status: emp.contract_status || "Thử việc", 
      salary_level: emp.salary_level || "", base_salary: emp.base_salary || 0, 
      insurance_salary: emp.insurance_salary || 0, notes: emp.notes || ""
    });
    setActiveTab("general");
    setShowCreateModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fix: Cột Date trong Supabase không nhận chuỗi rỗng "" -> Chuyển thành null
    const payload = { ...formData } as any;
    if (!payload.branch_id || payload.branch_id.trim() === '') {
      alert("Vui lòng chọn ít nhất một chi nhánh!");
      return;
    }
    if (!payload.dob) payload.dob = null;
    if (!payload.id_date) payload.id_date = null;
    if (!payload.start_date) payload.start_date = null;

    if (editingEmployeeId) {
      if (payload.password && payload.password.trim() !== '') {
        const authRes = await updateAuthUserPassword(payload.email, payload.password);
        if (!authRes.success) {
          alert("Lỗi khi cập nhật Mật khẩu hệ thống: " + authRes.error);
          return;
        }
        // Đồng thời sync auth_id vào DB nếu chưa có
        if (authRes.auth_id) {
          payload.auth_id = authRes.auth_id;
        }
      }

      // Lưu mật khẩu vào Database nội bộ để Super Admin quản lý
      const dbPayload = { ...payload };
      const { error } = await supabase.from("users").update(dbPayload).eq("id", editingEmployeeId);
      if (error) {
        alert("Lỗi khi cập nhật nhân sự: " + error.message);
        return;
      }
      alert(`Đã cập nhật nhân sự ${payload.full_name} thành công!`);
    } else {
      const initPass = payload.password && payload.password.trim() !== '' ? payload.password : 'vicedu123';
      const authRes = await createAuthUser(payload.email, initPass, payload.full_name);
      if (!authRes.success) {
        alert("Lỗi khi tạo Tài khoản Đăng nhập: " + authRes.error);
        return;
      }

      // Lưu mật khẩu khởi tạo + auth_id vào Database nội bộ để không bao giờ nhầm user
      const dbPayload = { ...payload, password: initPass, auth_id: authRes.auth_id };
      const { error } = await supabase.from("users").insert([dbPayload]);
      if (error) {
        alert("Lỗi khi lưu thông tin nhân sự: " + error.message);
        return;
      }
      alert(`Đã thêm nhân sự ${payload.full_name} thành công!\n\nTài khoản: ${payload.email}\nMật khẩu: ${initPass}`);
    }

    setShowCreateModal(false);
    fetchData();
  };

  const handleCCCDUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const empId = editingEmployeeId || `new_emp_${Date.now()}`;

    setUploadingCCCD(prev => ({ ...prev, [side]: true }));
    try {
      const compressedFile = await compressImage(file);
      const publicUrl = await uploadImageToCloudflare(compressedFile);

      if (side === "front") {
        setFormData(prev => ({ ...prev, id_front_url: publicUrl }));
      } else {
        setFormData(prev => ({ ...prev, id_back_url: publicUrl }));
      }
    } catch (err: any) {
      alert(`Lỗi khi tải lên ảnh CCCD mặt ${side === "front" ? "trước" : "sau"}: ` + err.message);
    } finally {
      setUploadingCCCD(prev => ({ ...prev, [side]: false }));
      e.target.value = "";
    }
  };

  const handleDeleteEmployee = async (id: string, fullName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa nhân sự ${fullName}? Thao tác này không thể hoàn tác.`)) {
      return;
    }

    const { error } = await supabase.from("users").delete().eq("id", id);
    if (error) {
      if (error.message.includes('foreign key constraint') || error.code === '23503') {
        if (window.confirm(`Nhân sự [${fullName}] đã phát sinh dữ liệu lịch sử trên hệ thống nên không thể xóa vĩnh viễn.\n\nBạn có muốn chuyển người này sang danh sách "Đã nghỉ việc" không?`)) {
          const { error: updateError } = await supabase.from("users").update({ status: "Nghỉ việc" }).eq("id", id);
          if (updateError) {
            alert("Lỗi khi chuyển trạng thái: " + updateError.message);
          } else {
            fetchData();
          }
        }
      } else {
        alert("Lỗi khi xóa dữ liệu nhân sự: " + error.message);
      }
      return;
    }
    
    // Nếu xóa DB thành công (chưa có dữ liệu liên kết), tiến hành xóa luôn tài khoản Auth
    const emp = employees.find(e => e.id === id);
    if (emp && emp.email) {
      const authRes = await deleteAuthUser(emp.email);
      if (!authRes.success) {
        alert("Đã xóa dữ liệu nhân sự, nhưng có lỗi khi xóa tài khoản Đăng nhập Auth: " + authRes.error);
        // Không return ở đây để vẫn load lại data
      }
    }

    alert(`Đã xóa nhân sự ${fullName} thành công!`);
    fetchData();
  };

  const handleRestoreEmployee = async (id: string, fullName: string) => {
    if (window.confirm(`Bạn muốn khôi phục trạng thái làm việc cho nhân sự [${fullName}]?`)) {
      const { data, error } = await supabase.from("users").update({ status: "Chính thức" }).eq("id", id).select();
      if (error) {
        alert("Lỗi khi khôi phục: " + error.message);
      } else if (!data || data.length === 0) {
        alert("Lỗi khi khôi phục: Không có quyền thực hiện hoặc nhân sự không tồn tại.");
      } else {
        alert("Khôi phục thành công!");
        fetchData();
      }
    }
  };

  const canDeleteEmployee = (empRole: string) => {
    if (activeRole === "Super Admin") return true;
    if (activeRole === "Admin" && (empRole === "Kế toán Chi nhánh" || empRole === "Giáo viên" || empRole === "Sale")) return true;
    return false;
  };

  const canEditEmployee = (emp: any) => {
    if (activeRole === "Super Admin") return true;
    if (emp.id === user?.id) return true; // Ai cũng có quyền tự sửa thông tin cá nhân của mình
    if (activeRole === "Admin" && ["Kế toán Chi nhánh", "Giáo viên", "Sale"].includes(emp.role)) return true;
    if (activeRole === "Kế toán HO") return true; // Cho phép Kế toán HO sửa hồ sơ nhân viên
    return false;
  };

  // Lọc dữ liệu
  const filteredEmployees = employees.filter(emp => {
    const empBranches = emp.branch_id ? emp.branch_id.split(',').map((b: string) => b.trim()) : [];
    // 1. Phân quyền dữ liệu (Data Isolation)
    if (!isGlobalRole) {
      const myBranches = activeBranch.split(',').map((b: string) => b.trim());
      const hasAccess = empBranches.some((eb: string) => myBranches.includes(eb));
      if (!hasAccess) return false;
    }

    // 2. Bộ lọc tìm kiếm UI
    const matchSearch = emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        emp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const currentBranch = isGlobalRole ? filterBranch : (activeBranch.includes(",") ? filterBranch : activeBranch);
    const matchBranch = (() => {
      if (currentBranch === "Tất cả") {
        if (isGlobalRole) return true;
        const myBranches = activeBranch.split(',').map((b: string) => b.trim());
        return empBranches.some((eb: string) => myBranches.includes(eb));
      }
      return empBranches.includes(currentBranch);
    })();

    const matchDept = filterDepartment === "Tất cả" || emp.department === filterDepartment;
    const matchStatus = filterStatus === "Tất cả" || emp.status === filterStatus;
    const matchTab = listTab === "active" ? emp.status !== "Nghỉ việc" : emp.status === "Nghỉ việc";
    return matchSearch && matchBranch && matchDept && matchStatus && matchTab;
  });

  return (
    <>
      <div className="employees-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Quản lý Nhân sự</h1>
          <p className="text-muted">Xem, thêm mới và phân quyền cho nhân viên các chi nhánh.</p>
        </div>
        <div className="header-actions">
          {canCreateEmployee && (
            <button className="btn btn-primary" onClick={openCreateModal}>
              <Plus size={18} />
              <span>Thêm nhân sự mới</span>
            </button>
          )}
        </div>
      </div>

      <div className="tabs-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button 
          onClick={() => { setListTab('active'); setFilterStatus('Tất cả'); }}
          style={{ padding: '0.5rem 1rem', background: listTab === 'active' ? 'var(--primary)' : 'var(--background)', color: listTab === 'active' ? 'white' : 'var(--text-main)', border: listTab === 'active' ? 'none' : '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
        >
          Đang làm việc
        </button>
        <button 
          onClick={() => { setListTab('archived'); setFilterStatus('Tất cả'); }}
          style={{ padding: '0.5rem 1rem', background: listTab === 'archived' ? 'var(--primary)' : 'var(--background)', color: listTab === 'archived' ? 'white' : 'var(--text-main)', border: listTab === 'archived' ? 'none' : '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
        >
          Đã nghỉ việc
        </button>
      </div>

      <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Tìm kiếm mã NV, tên, email..." 
            className="search-input" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select 
          className="form-input" 
          style={{ width: 'auto' }} 
          value={isGlobalRole ? filterBranch : (activeBranch.includes(",") ? filterBranch : activeBranch)} 
          onChange={e => setFilterBranch(e.target.value)}
          disabled={!isGlobalRole && !activeBranch.includes(",")}
        >
          {!isGlobalRole ? (
            !activeBranch.includes(",") ? (
              <option value={activeBranch}>{activeBranch}</option>
            ) : (
              <>
                <option value="Tất cả">Tất cả chi nhánh của tôi</option>
                {activeBranch.split(",").map(b => b.trim()).filter(Boolean).map(br => (
                  <option key={br} value={br}>{br}</option>
                ))}
              </>
            )
          ) : (
            <>
              <option value="Tất cả">Tất cả chi nhánh</option>
              <option value="Việt Trì 1">Việt Trì 1</option>
              <option value="Việt Trì 2">Việt Trì 2</option>
              <option value="Lâm Thao">Lâm Thao</option>
              <option value="Tuyên Quang">Tuyên Quang</option>
              <option value="Dân Hòa">Dân Hòa</option>
            </>
          )}
        </select>

        <select className="form-input" style={{ width: 'auto' }} value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}>
          <option value="Tất cả">Tất cả phòng ban</option>
          <option value="Đào tạo">Đào tạo</option>
          <option value="Tư vấn">Tư vấn</option>
          <option value="Kế toán">Kế toán</option>
          <option value="Quản lý">Quản lý</option>
        </select>

        {listTab === 'active' && (
          <select className="form-input" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="Tất cả">Tất cả trạng thái</option>
            <option value="Thử việc">Thử việc</option>
            <option value="Chính thức">Chính thức</option>
          </select>
        )}
      </div>

      <div style={{ marginBottom: '1rem', fontWeight: 600, color: 'var(--primary)' }}>
        Tổng số: {filteredEmployees.length} nhân sự
      </div>

      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : filteredEmployees.length === 0 ? (
        <div className="empty-state glass-panel">
          <UserCircle size={48} className="text-muted" />
          <h3>Không tìm thấy nhân sự nào</h3>
          <p>Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p>
        </div>
      ) : (
        <div className="employees-table-container glass-panel">
          <table className="employees-table">
            <thead>
              <tr>
                <th>Mã NV</th>
                <th>Họ và Tên</th>
                <th>Email</th>
                <th>Chi nhánh</th>
                <th>Phòng ban</th>
                <th>Phân quyền</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td><strong>{emp.id}</strong></td>
                  <td>
                    <div className="emp-name-cell">
                      <div className="emp-avatar">{emp.full_name.charAt(0)}</div>
                      <span>{emp.full_name}</span>
                      {emp.record_status === "Thiếu thông tin" && (
                        <span 
                          style={{
                            background: '#fef2f2',
                            color: '#ef4444',
                            border: '1px solid #fca5a5',
                            padding: '0.15rem 0.4rem',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            marginLeft: '0.5rem',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Hồ sơ nhân sự này đang thiếu thông tin (Kế toán HO cảnh báo)"
                        >
                          ⚠️ Thiếu HS
                        </span>
                      )}
                    </div>
                  </td>
                  <td>{emp.email}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'nowrap', alignItems: 'center' }}>
                      {emp.branch_id?.split(',').map((b: string) => (
                        <span key={b.trim()} className="badge branch-badge" style={{ whiteSpace: 'nowrap' }}>{b.trim()}</span>
                      ))}
                    </div>
                  </td>
                  <td>{emp.department}</td>
                  <td><span className={`badge role-badge ${emp.role === 'Admin' ? 'admin' : 'user'}`}>{emp.role}</span></td>
                  <td>
                    <span className={`status-text ${emp.status === 'Chính thức' ? 'success' : 'warning'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    {canEditEmployee(emp) && (
                      <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(emp)}>Sửa</button>
                    )}
                    {listTab === 'active' ? (
                      canDeleteEmployee(emp.role) && (
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{color: 'var(--danger)'}}
                          onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                        >
                          Xóa
                        </button>
                      )
                    ) : (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{color: 'var(--success)'}}
                        onClick={() => handleRestoreEmployee(emp.id, emp.full_name)}
                      >
                        Khôi phục
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* Modal Tạo Nhân sự */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>{editingEmployeeId ? "Sửa thông tin Nhân sự" : "Thêm Nhân sự mới"}</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            
                        <div className="modal-tabs">
              <button type="button" className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>Thông tin chung</button>
              <button type="button" className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>Giấy tờ & Liên hệ</button>
              <button type="button" className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>Hợp đồng & Lương</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              {activeTab === 'general' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Mã Nhân viên *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={formData.id}
                        disabled
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                        title="Mã nhân viên được tạo tự động và không thể chỉnh sửa"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quyền hệ thống *</label>
                      {(editingEmployeeId && activeRole !== "Super Admin" && !["Kế toán Chi nhánh", "Giáo viên", "Sale", "User"].includes(formData.role)) || activeRole === "Kế toán HO" ? (
                        // Không cho phép tài khoản dưới cấp hoặc không phải Super Admin hoặc Kế toán HO được thay đổi quyền của tài khoản cấp cao
                        <input
                          type="text"
                          className="form-input"
                          value={formData.role}
                          readOnly
                          style={{ backgroundColor: 'rgba(0,0,0,0.15)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                          title="Bạn không có quyền thay đổi trường này"
                        />
                      ) : (
                        <select 
                          className="form-input"
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                        >
                          {activeRole === "Super Admin" && (
                            <>
                              <option value="Super Admin">Super Admin (Toàn quyền hệ thống)</option>
                              <option value="Kế toán HO">Kế toán HO (Toàn bộ kế toán các chi nhánh)</option>
                              <option value="Admin">Admin Chi nhánh (Quản lý 1 chi nhánh)</option>
                            </>
                          )}
                          <option value="Kế toán Chi nhánh">Kế toán Chi nhánh</option>
                          <option value="Giáo viên">Giáo viên (Đào tạo)</option>
                          <option value="Sale">Sale (Tuyển sinh)</option>
                          <option value="User">Nhân viên bình thường (User)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    {activeRole === "Super Admin" ? (
                      <div className="form-group">
                        <label className="form-label">Chi nhánh *</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
                          {["Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"].map(br => {
                            const selectedBranches = formData.branch_id ? formData.branch_id.split(',').map(b => b.trim()).filter(Boolean) : [];
                            const isSelected = selectedBranches.includes(br);
                            return (
                              <label key={br} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setFormData({...formData, branch_id: [...selectedBranches, br].join(', ')});
                                    } else {
                                      setFormData({...formData, branch_id: selectedBranches.filter(b => b !== br).join(', ')});
                                    }
                                  }}
                                />
                                <span>{br}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="form-group">
                        <label className="form-label">Chi nhánh *</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.branch_id || ""}
                          readOnly
                          style={{ backgroundColor: 'rgba(0,0,0,0.15)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                          title="Bạn không có quyền thay đổi trường này"
                        />
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Phòng ban *</label>
                      {activeRole === "Kế toán Chi nhánh" || activeRole === "Kế toán HO" ? (
                        // Hiển thị read-only text để luôn hiển thị đúng giá trị thực tế
                        <input
                          type="text"
                          className="form-input"
                          value={formData.department}
                          readOnly
                          style={{ backgroundColor: 'rgba(0,0,0,0.15)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                          title="Bạn không có quyền thay đổi trường này"
                        />
                      ) : (
                          <select 
                          className="form-input"
                          value={formData.department}
                          onChange={(e) => {
                            const newDept = e.target.value;
                            let newRole = formData.role;
                            // Tự động map Role theo Department để tránh Admin chọn nhầm
                            if (newDept === "Tư vấn" && newRole === "User") newRole = "Sale";
                            else if (newDept === "Đào tạo" && newRole === "User") newRole = "Giáo viên";
                            
                            setFormData({...formData, department: newDept, role: newRole});
                          }}
                        >
                          <option value="Đào tạo">Đào tạo (Giáo viên)</option>
                          <option value="Tư vấn">Tư vấn (Tuyển sinh)</option>
                          <option value="Kế toán">Kế toán</option>
                          <option value="Quản lý">Quản lý (Giám đốc)</option>
                        </select>
                      )}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Họ và tên *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="Nguyễn Văn A"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Nick name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Tên thân mật"
                        value={formData.nickname}
                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Giới tính</label>
                      <select 
                        className="form-input"
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày sinh</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.dob}
                        onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Chức vụ</label>
                      {activeRole === "Kế toán HO" ? (
                        <input
                          type="text"
                          className="form-input"
                          value={formData.position || "Chưa thiết lập"}
                          readOnly
                          style={{ backgroundColor: 'rgba(0,0,0,0.15)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                          title="Bạn không có quyền thay đổi trường này"
                        />
                      ) : (
                        <select 
                          className="form-input"
                          value={formData.position}
                          onChange={(e) => setFormData({...formData, position: e.target.value})}
                        >
                          <option value="">-- Chọn chức vụ --</option>
                          {activeRole === "Super Admin" && (
                            <optgroup label="Cấp Quản lý / Hội sở">
                              <option value="GĐ Chi nhánh">GĐ Chi nhánh</option>
                              <option value="P.GĐ Chi nhánh">P.GĐ Chi nhánh</option>
                              <option value="Kế toán HO">Kế toán HO</option>
                              <option value="Kiểm toán HO">Kiểm toán HO</option>
                            </optgroup>
                          )}
                          <optgroup label="Cấp Chi nhánh">
                            <option value="Chuyên viên tư vấn">Chuyên viên tư vấn</option>
                            <option value="Nhân viên tư vấn">Nhân viên tư vấn</option>
                            <option value="Trưởng phòng Đào tạo">Trưởng phòng Đào tạo</option>
                            <option value="Nhân viên Đào tạo">Nhân viên Đào tạo</option>
                            <option value="Kế toán Chi nhánh">Kế toán Chi nhánh</option>
                            <option value="Giáo viên nước ngoài">Giáo viên nước ngoài</option>
                            <option value="Media Team">Media Team</option>
                            <option value="Bảo vệ">Bảo vệ</option>
                            <option value="Tạp vụ">Tạp vụ</option>
                            <option value="Part time">Part time</option>
                          </optgroup>
                        </select>
                      )}
                    </div>
                    <div className="form-group">
                      <label className="form-label">Trạng thái làm việc *</label>
                      <select 
                        className="form-input"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="Thử việc">Thử việc</option>
                        <option value="Chính thức">Chính thức</option>
                        <option value="Nghỉ việc">Nghỉ việc</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thông tin Profile (Kinh nghiệm / Bio)</label>
                    <textarea 
                      className="form-input" 
                      rows={3}
                      placeholder="Nhập giới thiệu ngắn gọn..."
                      value={formData.profile_info}
                      onChange={(e) => setFormData({...formData, profile_info: e.target.value})}
                    />
                  </div>
                </>
              )}

              {activeTab === 'docs' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Số CCCD / CMND</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="0123456789"
                        value={formData.id_card}
                        onChange={(e) => setFormData({...formData, id_card: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày cấp</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.id_date}
                        onChange={(e) => setFormData({...formData, id_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.25rem' }}>
                    {/* CCCD Mặt trước */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Ảnh CCCD mặt trước</label>
                      {formData.id_front_url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                          <div 
                            style={{ 
                              width: '100%', 
                              height: '150px', 
                              borderRadius: '8px', 
                              border: '1px solid #e2e8f0', 
                              overflow: 'hidden', 
                              position: 'relative', 
                              cursor: 'zoom-in',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                            onClick={() => {
                              const list = [formData.id_front_url, formData.id_back_url].filter(Boolean);
                              const index = list.indexOf(formData.id_front_url);
                              setLightboxImages(list);
                              setLightboxIndex(index !== -1 ? index : 0);
                              setLightboxOpen(true);
                            }}
                          >
                            <img 
                              src={formData.id_front_url} 
                              alt="CCCD mặt trước" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, id_front_url: "" })}
                            style={{
                              background: '#fee2e2',
                              color: '#ef4444',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              width: 'fit-content'
                            }}
                          >
                            <Trash2 size={12} /> Xóa ảnh mặt trước
                          </button>
                        </div>
                      ) : (
                        <div 
                          style={{
                            width: '100%',
                            height: '150px',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            gap: '0.5rem'
                          }}
                          onClick={() => document.getElementById("cccd-front-input")?.click()}
                        >
                          <Camera size={24} style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                            {uploadingCCCD.front ? "Đang tải lên..." : "Tải lên CCCD mặt trước"}
                          </span>
                          <input 
                            type="file" 
                            id="cccd-front-input" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleCCCDUpload(e, "front")} 
                            disabled={uploadingCCCD.front}
                          />
                        </div>
                      )}
                    </div>

                    {/* CCCD Mặt sau */}
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <label className="form-label" style={{ fontWeight: 600 }}>Ảnh CCCD mặt sau</label>
                      {formData.id_back_url ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                          <div 
                            style={{ 
                              width: '100%', 
                              height: '150px', 
                              borderRadius: '8px', 
                              border: '1px solid #e2e8f0', 
                              overflow: 'hidden', 
                              position: 'relative', 
                              cursor: 'zoom-in',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                            }}
                            onClick={() => {
                              const list = [formData.id_front_url, formData.id_back_url].filter(Boolean);
                              const index = list.indexOf(formData.id_back_url);
                              setLightboxImages(list);
                              setLightboxIndex(index !== -1 ? index : 0);
                              setLightboxOpen(true);
                            }}
                          >
                            <img 
                              src={formData.id_back_url} 
                              alt="CCCD mặt sau" 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, id_back_url: "" })}
                            style={{
                              background: '#fee2e2',
                              color: '#ef4444',
                              border: 'none',
                              padding: '0.4rem 0.8rem',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                              width: 'fit-content'
                            }}
                          >
                            <Trash2 size={12} /> Xóa ảnh mặt sau
                          </button>
                        </div>
                      ) : (
                        <div 
                          style={{
                            width: '100%',
                            height: '150px',
                            border: '2px dashed #cbd5e1',
                            borderRadius: '8px',
                            background: '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            gap: '0.5rem'
                          }}
                          onClick={() => document.getElementById("cccd-back-input")?.click()}
                        >
                          <Camera size={24} style={{ color: '#94a3b8' }} />
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>
                            {uploadingCCCD.back ? "Đang tải lên..." : "Tải lên CCCD mặt sau"}
                          </span>
                          <input 
                            type="file" 
                            id="cccd-back-input" 
                            accept="image/*" 
                            style={{ display: 'none' }} 
                            onChange={(e) => handleCCCDUpload(e, "back")} 
                            disabled={uploadingCCCD.back}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <hr style={{ borderColor: 'var(--glass-border)', margin: '0.5rem 0' }} />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Số điện thoại</label>
                      <input 
                        type="tel" 
                        className="form-input" 
                        placeholder="09..."
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email (Tài khoản) *</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        required 
                        placeholder="nva@vicedu.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        readOnly={activeRole === "Kế toán Chi nhánh"}
                        style={activeRole === "Kế toán Chi nhánh" ? { backgroundColor: 'rgba(0,0,0,0.15)', cursor: 'not-allowed', color: 'var(--text-muted)' } : {}}
                        title={activeRole === "Kế toán Chi nhánh" ? "Bạn không có quyền thay đổi Email tài khoản" : ""}
                      />
                    </div>
                  </div>
                  
                  {(activeRole === "Super Admin" || (activeRole === "Kế toán HO" && editingEmployeeId === user?.id)) && (
                    <div className="form-group">
                      <label className="form-label">Mật khẩu khởi tạo</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type={showPassword ? "text" : "password"} 
                          className="form-input" 
                          placeholder="Để trống nếu không đổi"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          style={{ paddingRight: '2.5rem' }}
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                        >
                          {showPassword ? <EyeOff size={18} color="#64748B" /> : <Eye size={18} color="#64748B" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Địa chỉ hiện tại</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Số nhà, đường, phường, quận..."
                      value={formData.current_address}
                      onChange={(e) => setFormData({...formData, current_address: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Facebook</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="https://facebook.com/..."
                      value={formData.facebook_url}
                      onChange={(e) => setFormData({...formData, facebook_url: e.target.value})}
                    />
                  </div>

                  <hr style={{ borderColor: 'var(--glass-border)', margin: '0.5rem 0' }} />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ngân hàng</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Techcombank, Vietcombank..."
                        value={formData.bank_name}
                        onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tên chủ tài khoản</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="NGUYEN VAN A"
                        value={formData.bank_owner}
                        onChange={(e) => setFormData({...formData, bank_owner: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Số tài khoản</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="1903..."
                      value={formData.bank_account}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                    />
                  </div>
                </>
              )}

              {activeTab === 'salary' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ngày bắt đầu làm việc</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tình trạng hợp đồng</label>
                      <select 
                        className="form-input"
                        value={formData.contract_status}
                        onChange={(e) => setFormData({...formData, contract_status: e.target.value})}
                      >
                        <option value="Thử việc">Thử việc</option>
                        <option value="Hợp đồng 1 năm">Hợp đồng 1 năm</option>
                        <option value="Hợp đồng 3 năm">Hợp đồng 3 năm</option>
                        <option value="Không xác định thời hạn">Không xác định thời hạn</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: '1.25rem' }}>
                    <label className="form-label">Bậc lương hiện tại</label>
                      <select 
                        className="form-input" 
                        value={formData.salary_level}
                        onChange={(e) => setFormData({...formData, salary_level: e.target.value})}
                      >
                        <option value="">-- Chọn bậc lương --</option>
                        <option value="Nhân viên tư vấn bậc 1">Nhân viên tư vấn bậc 1</option>
                        <option value="Nhân viên tư vấn bậc 2">Nhân viên tư vấn bậc 2</option>
                        <option value="Chuyên viên tư vấn bậc 1">Chuyên viên tư vấn bậc 1</option>
                        <option value="Chuyên viên tư vấn bậc 2">Chuyên viên tư vấn bậc 2</option>
                        <option value="Nhân viên Kế toán bậc 1">Nhân viên Kế toán bậc 1</option>
                        <option value="Nhân viên Kế toán bậc 2">Nhân viên Kế toán bậc 2</option>
                        <option value="Quản lý bậc 1">Quản lý bậc 1</option>
                        <option value="Quản lý bậc 2">Quản lý bậc 2</option>
                        <option value="Nhân viên đào tạo bậc 1">Nhân viên đào tạo bậc 1</option>
                        <option value="Nhân viên đào tạo bậc 2">Nhân viên đào tạo bậc 2</option>
                        <option value="Media Team bậc 1">Media Team bậc 1</option>
                        <option value="Media Team bậc 2">Media Team bậc 2</option>
                        <option value="Other (Khác)">Other (Khác)</option>
                      </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Lương cơ bản (VNĐ)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="5.000.000"
                        value={formData.base_salary ? Number(formData.base_salary).toLocaleString('vi-VN') : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData({...formData, base_salary: val ? Number(val) : 0});
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Lương đóng BHXH (VNĐ)</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="5.000.000"
                        value={formData.insurance_salary ? Number(formData.insurance_salary).toLocaleString('vi-VN') : ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setFormData({...formData, insurance_salary: val ? Number(val) : 0});
                        }}
                      />
                    </div>
                  </div>

                  <hr style={{ borderColor: 'var(--glass-border)', margin: '0.5rem 0' }} />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tổng phép năm</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={formData.total_leave_days}
                        onChange={(e) => setFormData({...formData, total_leave_days: Number(e.target.value)})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phép đã hưởng</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={formData.used_leave_days}
                        onChange={(e) => setFormData({...formData, used_leave_days: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ backgroundColor: 'rgba(0, 255, 128, 0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <span className="form-label" style={{ display: 'block', color: 'var(--primary)' }}>
                      Số ngày phép còn lại: <strong>{Number(formData.total_leave_days) - Number(formData.used_leave_days)} ngày</strong>
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ghi chú thêm</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      placeholder="Các thỏa thuận đặc biệt..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>

                  <div className="form-group" style={{ 
                    marginTop: '1.5rem', 
                    padding: '1.25rem', 
                    background: 'rgba(255, 255, 255, 0.03)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--glass-border)' 
                  }}>
                    <label className="form-label" style={{ fontWeight: 600, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Tình trạng hồ sơ (Kế toán HO)
                      {!["Super Admin", "Kế toán HO"].includes(activeRole) && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#94a3b8' }}>(Chỉ đọc)</span>
                      )}
                    </label>
                    <select 
                      className="form-input"
                      value={formData.record_status}
                      onChange={(e) => setFormData({...formData, record_status: e.target.value})}
                      disabled={!["Super Admin", "Kế toán HO"].includes(activeRole)}
                      style={!["Super Admin", "Kế toán HO"].includes(activeRole) ? { 
                        backgroundColor: 'rgba(0,0,0,0.15)', 
                        cursor: 'not-allowed',
                        color: '#64748b'
                      } : {
                        border: '2px solid var(--primary)',
                        fontWeight: 600
                      }}
                      title={!["Super Admin", "Kế toán HO"].includes(activeRole) ? "Chỉ Kế toán HO hoặc Super Admin mới có quyền chỉnh sửa trạng thái hồ sơ" : ""}
                    >
                      <option value="Thiếu thông tin">Thiếu thông tin</option>
                      <option value="Đang hoàn thiện hồ sơ">Đang hoàn thiện hồ sơ</option>
                      <option value="Đã hoàn thiện">Đã hoàn thiện</option>
                    </select>
                  </div>
                </>
              )}

              <div className="modal-actions" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployeeId ? 'Lưu hồ sơ' : 'Tạo hồ sơ mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox Viewer */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div 
          className="lightbox-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <div 
            className="lightbox-content" 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="lightbox-close" 
              style={{
                position: 'absolute',
                top: '-50px',
                right: 0,
                color: '#cbd5e1',
                background: 'none',
                border: 'none',
                fontSize: '2.5rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              onClick={() => setLightboxOpen(false)}
            >
              &times;
            </button>
            
            <img 
              src={lightboxImages[lightboxIndex]} 
              alt={`Ảnh CCCD ${lightboxIndex + 1}`} 
              className="lightbox-image" 
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            />

            {lightboxImages.length > 1 && (
              <>
                <button 
                  className="lightbox-nav prev" 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    left: '-70px',
                  }}
                  onClick={() => setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className="lightbox-nav next" 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    right: '-70px',
                  }}
                  onClick={() => setLightboxIndex(prev => (prev + 1) % lightboxImages.length)}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div 
              className="lightbox-indicator"
              style={{
                color: '#94a3b8',
                marginTop: '16px',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

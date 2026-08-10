"use client";

import { useState, useEffect } from "react";
import { Plus, Search, FileText, UploadCloud, Trash2, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { uploadImageToCloudflare } from "@/utils/uploadImage";
import "./Enrollments.css";

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const defaultFormData = {
  student_id: "",
  transaction_type: "Đăng ký gói mới",
  payment_method: "Trả thẳng",
  amount: 0,
  hours: 0,
  note: "",
  receipt_images: [] as string[],
  created_at: getTodayDateString()
};

export default function EnrollmentsPage() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState(defaultFormData);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  
  // Lọc hiển thị
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("Tất cả");
  const [filterMonth, setFilterMonth] = useState(""); // Format: "YYYY-MM"
  const [filterViewBranch, setFilterViewBranch] = useState("Tất cả");

  // Modal Student Filter & Search
  const [modalStudentSearch, setModalStudentSearch] = useState("");
  const [modalStudentBranchFilter, setModalStudentBranchFilter] = useState("Tất cả");
  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const activeRole = user?.role || "User";
  const activeBranch = user?.branch_id || "";
  const currentUser = user?.full_name || "Guest";

  useEffect(() => {
    // Bắt tín hiệu từ trang Học Viên (nhấn nút Phiếu Đăng Ký)
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const newStudentId = urlParams.get("new_student_id");
      if (newStudentId) {
        setFormData(prev => ({ ...prev, student_id: newStudentId }));
        setShowModal(true);
        // Xóa param đi để F5 không bị mở popup liên tục
        window.history.replaceState({}, '', '/enrollments');
      }
    }
  }, []);

  const GLOBAL_ROLES = ['Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống'];
  const isGlobalRole = GLOBAL_ROLES.includes(activeRole);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    
    // 1. Fetch Danh sách Học viên (để chọn)
    let stuQuery = supabase.from("students").select("id, full_name, nickname, parent_name, parent_phone, branch_id, total_registered_hours, total_registered_cost, remaining_hours, remaining_cost, total_paid");
    if (!isGlobalRole) {
      if (activeBranch) {
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          stuQuery = stuQuery.in("branch_id", branches);
        } else {
          stuQuery = stuQuery.eq("branch_id", branches[0]);
        }
      } else {
        stuQuery = stuQuery.eq("id", "none");
      }
    }
    const { data: stuData } = await stuQuery;
    if (stuData) setStudents(stuData);

    // 2. Fetch Các phiếu đăng ký
    let enrQuery = supabase.from("enrollments").select("id, student_id, branch_id, transaction_type, hours, amount, status, note, payment_method, receipt_images, created_at, created_by, students(full_name, nickname)").order("created_at", { ascending: false }).limit(1000);
    if (!isGlobalRole) {
      if (activeBranch) {
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          enrQuery = enrQuery.in("branch_id", branches);
        } else {
          enrQuery = enrQuery.eq("branch_id", branches[0]);
        }
      } else {
        enrQuery = enrQuery.eq("id", "none");
      }
    }
    const { data: enrData } = await enrQuery;
    if (enrData) setEnrollments(enrData);
    
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [activeBranch, isGlobalRole, authLoading]);

  useEffect(() => {
    if (formData.student_id) {
      const fetchStudentEnrollments = async () => {
        setLoadingEnrollments(true);
        const { data, error } = await supabase
          .from("enrollments")
          .select(`
            id,
            created_at,
            registered_hours,
            bonus_hours,
            remaining_hours,
            tuition_fee,
            payment_method,
            note,
            course_levels(group_name, level_name)
          `)
          .eq("student_id", formData.student_id)
          .order("created_at", { ascending: false });
        
        if (data) {
          setSelectedStudentEnrollments(data);
        } else {
          setSelectedStudentEnrollments([]);
        }
        setLoadingEnrollments(false);
      };
      fetchStudentEnrollments();
    } else {
      setSelectedStudentEnrollments([]);
    }
  }, [formData.student_id]);

  // Hàm tạo ID tự động cho Phiếu (VD: ENR-1718000000)
  const generateEnrollmentId = () => {
    return `ENR-${Date.now().toString().slice(-8)}`;
  };

  // Nén ảnh chứng từ
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800; // Chứng từ nên để nét một chút (800px)
          const scaleSize = img.width > MAX_WIDTH ? (MAX_WIDTH / img.width) : 1;
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            resolve(blob as Blob);
          }, "image/jpeg", 0.75); 
        };
      };
    });
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingReceipt(true);
    try {
      const newImages = [...formData.receipt_images];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedBlob = await compressImage(file);
        
        // Sử dụng Cloudflare Images
        const imageUrl = await uploadImageToCloudflare(compressedBlob);
        newImages.push(imageUrl);
      }
      
      setFormData({...formData, receipt_images: newImages});
    } catch (err: any) {
      alert("Lỗi upload ảnh chứng từ: " + err.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) {
      alert("Vui lòng chọn Học viên!");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const isRefund = formData.transaction_type === "Hủy gói" || formData.transaction_type === "Giảm trừ";
      const multiplier = isRefund ? -1 : 1;
      
      const newAmount = Number(formData.amount) * multiplier;
      const newHours = Number(formData.hours) * multiplier;
      
      const studentInfo = students.find(s => s.id === formData.student_id);
      const studentBranch = studentInfo ? studentInfo.branch_id : activeBranch;

      let deltaAmount = newAmount;
      let deltaHours = newHours;

      if (editingId) {
        // CẬP NHẬT PHIẾU CŨ
        const oldEnr = enrollments.find(e => e.id === editingId);
        if (!oldEnr) throw new Error("Không tìm thấy phiếu cũ");

        const oldIsRefund = oldEnr.transaction_type === "Hủy gói" || oldEnr.transaction_type === "Giảm trừ";
        const oldMultiplier = oldIsRefund ? -1 : 1;
        const oldAmount = Number(oldEnr.amount) * oldMultiplier;
        const oldHours = Number(oldEnr.hours) * oldMultiplier;

        deltaAmount = newAmount - oldAmount;
        deltaHours = newHours - oldHours;

        const payload = {
          transaction_type: formData.transaction_type,
          payment_method: formData.payment_method,
          amount: newAmount,
          hours: newHours,
          registered_hours: newHours,
          tuition_fee: newAmount,
          note: formData.note,
          receipt_images: formData.receipt_images,
          created_at: formData.created_at ? new Date(formData.created_at).toISOString() : undefined
        };

        const { error: updateError } = await supabase.from("enrollments").update(payload).eq("id", editingId);
        if (updateError) throw updateError;

        // Nếu chuyển từ Trả thẳng sang Trả góp, tự động sinh bản ghi Trả góp
        if (formData.payment_method.startsWith("Trả góp") && !oldEnr.payment_method?.startsWith("Trả góp")) {
          const installPayload = {
            branch_id: studentBranch,
            student_id: formData.student_id,
            student_name: studentInfo?.full_name || "",
            parent_name: studentInfo?.parent_name || "",
            parent_phone: studentInfo?.parent_phone || "",
            total_tuition: newAmount,
            installment_type: formData.payment_method,
            staff_name: currentUser,
            notes: `Tạo tự động do đổi hình thức sang Trả góp`
          };
          await supabase.from("installments").insert([installPayload]);
        }
      } else {
        // THÊM PHIẾU MỚI
        const payload = {
          student_id: formData.student_id,
          branch_id: studentBranch,
          transaction_type: formData.transaction_type,
          payment_method: formData.payment_method,
          amount: newAmount,
          hours: newHours,
          registered_hours: newHours,
          remaining_hours: newHours,
          status: 'Active',
          tuition_fee: newAmount,
          note: formData.note,
          receipt_images: formData.receipt_images,
          created_by: currentUser,
          created_at: formData.created_at ? new Date(formData.created_at).toISOString() : new Date().toISOString()
        };

        const { error: insertError } = await supabase.from("enrollments").insert([payload]);
        if (insertError) throw insertError;

        // Tự động sinh bản ghi Trả góp nếu chọn Trả góp
        if (formData.payment_method.startsWith("Trả góp")) {
          const installPayload = {
            branch_id: studentBranch,
            student_id: formData.student_id,
            student_name: studentInfo?.full_name || "",
            parent_name: studentInfo?.parent_name || "",
            parent_phone: studentInfo?.parent_phone || "",
            total_tuition: newAmount,
            installment_type: formData.payment_method,
            staff_name: currentUser,
            notes: `Tạo tự động từ Phiếu đăng ký mới`
          };
          await supabase.from("installments").insert([installPayload]);
        }
      }

      // Lưu ý: Cập nhật Số dư vào Ví điện tử của Học viên hiện đã được xử lý tự động qua Database Trigger (trg_enrollments_recalc)

      setShowModal(false);
      setFormData(defaultFormData);
      setEditingId(null);
      setSelectedStudentEnrollments([]);
      fetchData();
      
    } catch (err: any) {
      alert("Lỗi khi lưu phiếu: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (enr: any) => {
    setEditingId(enr.id);
    setFormData({
      student_id: enr.student_id,
      transaction_type: enr.transaction_type,
      payment_method: enr.payment_method || "Trả thẳng",
      amount: Math.abs(enr.amount || enr.tuition_fee || 0),
      hours: Math.abs(enr.hours || enr.registered_hours || 0),
      note: enr.note || "",
      receipt_images: enr.receipt_images || [],
      created_at: enr.created_at ? new Date(enr.created_at).toISOString().slice(0, 10) : getTodayDateString()
    });
    setModalStudentSearch("");
    setModalStudentBranchFilter(enr.branch_id || "Tất cả");
    setShowModal(true);
  };

  const handleDelete = async (enr: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Phiếu ${enr.id}? Hành động này sẽ tự động trừ đi số tiền/giờ tương ứng trong ví của học viên.`)) return;

    try {
      // 1. Tính toán số tiền/giờ cần hoàn trả (rollback)
      const isRefund = enr.transaction_type === "Hủy gói" || enr.transaction_type === "Giảm trừ";
      const multiplier = isRefund ? -1 : 1;
      const amountToRollback = Number(enr.amount || enr.tuition_fee || 0) * multiplier;
      const hoursToRollback = Number(enr.hours || enr.registered_hours || 0) * multiplier;

      // 2. Tìm học viên
      const studentInfo = students.find(s => s.id === enr.student_id);

      // 3. Xóa phiếu
      const { error: deleteError } = await supabase.from("enrollments").delete().eq("id", enr.id);
      if (deleteError) throw deleteError;

      // 4. Hoàn trả Ví Học Viên (Đã xử lý tự động qua Database Trigger)


      fetchData();
    } catch (err: any) {
      alert("Lỗi khi xóa phiếu: " + err.message);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...formData.receipt_images];
    newImages.splice(index, 1);
    setFormData({...formData, receipt_images: newImages});
  };

  // Tính toán Lọc hiển thị
  const filteredEnrollments = enrollments.filter(enr => {
    const matchSearch = searchTerm === "" || 
      enr.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      enr.students?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = filterType === "Tất cả" || enr.transaction_type === filterType;
    
    let matchMonth = true;
    if (filterMonth) {
      // enr.created_at is ISO string like "2026-06-13T07:59:30Z"
      const enrMonth = enr.created_at.substring(0, 7); // Gets "YYYY-MM"
      matchMonth = enrMonth === filterMonth;
    }
    
    const currentBranch = isGlobalRole ? filterViewBranch : (activeBranch.includes(",") ? filterViewBranch : activeBranch);
    const matchBranch = (() => {
      if (currentBranch === "Tất cả") {
        if (isGlobalRole) return true;
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        return branches.includes(enr.branch_id);
      }
      return enr.branch_id === currentBranch;
    })();
    
    return matchSearch && matchType && matchMonth && matchBranch;
  });

  const totalContractsValue = filteredEnrollments.reduce((sum, enr) => sum + Number(enr.amount || 0), 0);

  const canCreateContract = ["Super Admin", "Kế toán HO"].includes(activeRole);

  const filteredStudentsForModal = students.filter(s => {
    const matchBranch = modalStudentBranchFilter === "Tất cả" || s.branch_id === modalStudentBranchFilter;
    const matchSearch = modalStudentSearch === "" || 
      s.full_name.toLowerCase().includes(modalStudentSearch.toLowerCase()) || 
      s.id.toLowerCase().includes(modalStudentSearch.toLowerCase());
    return matchBranch && matchSearch;
  });

  if (authLoading) return <div className="loading-state">Đang tải...</div>;
  if (!["Super Admin", "Kế toán HO", "Admin", "Kế toán Chi nhánh"].includes(activeRole)) {
    return <div className="p-8 text-center text-muted" style={{ marginTop: '5rem', fontSize: '1.2rem' }}>Bạn không có quyền truy cập trang này.</div>;
  }

  return (
    <>
      <div className="enrollments-container animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Phiếu Đăng Ký (Hợp Đồng)</h1>
          <p className="text-muted">Quản lý các Gói học đã ký. Hệ thống tự động tính công nợ dựa trên giá trị gói này.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canCreateContract && (
            <button className="btn btn-primary" onClick={() => { setFormData(defaultFormData); setEditingId(null); setShowModal(true); }}>
              <Plus size={20} />
              <span>Lập Hợp Đồng Mới</span>
            </button>
          )}
        </div>
      </div>

      <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Tìm mã phiếu, tên học viên..." 
            className="search-input" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        {isGlobalRole ? (
          <select className="form-input" style={{ width: 'auto' }} value={filterViewBranch} onChange={e => setFilterViewBranch(e.target.value)}>
            <option value="Tất cả">Tất cả Chi nhánh</option>
            <option value="Việt Trì 1">Việt Trì 1</option>
            <option value="Việt Trì 2">Việt Trì 2</option>
            <option value="Lâm Thao">Lâm Thao</option>
            <option value="Tuyên Quang">Tuyên Quang</option>
            <option value="Dân Hòa">Dân Hòa</option>
          </select>
        ) : (
          activeBranch.includes(",") && (
            <select className="form-input" style={{ width: 'auto' }} value={filterViewBranch} onChange={e => setFilterViewBranch(e.target.value)}>
              <option value="Tất cả">Tất cả chi nhánh của tôi</option>
              {activeBranch.split(",").map(b => b.trim()).filter(Boolean).map(br => (
                <option key={br} value={br}>{br}</option>
              ))}
            </select>
          )
        )}
        
        <select className="form-input" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="Tất cả">Tất cả Loại gói</option>
          <option value="Đăng ký gói mới">Đăng ký gói mới</option>
          <option value="Tái đăng ký">Tái đăng ký</option>
          <option value="Hủy gói">Hủy gói (Trừ nợ)</option>
          <option value="Giảm trừ">Giảm trừ</option>
        </select>
        <input 
          type="month" 
          className="form-input" 
          style={{ width: 'auto' }} 
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
      </div>

      {/* Summary Bar for filtered totals */}
      {!loading && filteredEnrollments.length > 0 && (() => {
        const totalIncome = filteredEnrollments.filter(e => e.amount >= 0).reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const totalExpense = filteredEnrollments.filter(e => e.amount < 0).reduce((sum, e) => sum + Math.abs(Number(e.amount) || 0), 0);
        const netAmount = totalIncome - totalExpense;
        return (
          <div className="glass-panel animate-fade-in" style={{ 
            display: 'flex', 
            gap: '1.5rem', 
            padding: '0.75rem 1.25rem', 
            marginBottom: '1rem', 
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Kết quả: <strong>{filteredEnrollments.length}</strong> hợp đồng
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600 }}>
              Tổng đăng ký mới: +{totalIncome.toLocaleString('vi-VN')} đ
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600 }}>
              Tổng hủy/giảm: -{totalExpense.toLocaleString('vi-VN')} đ
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginLeft: 'auto' }}>
              Giá trị ròng: <span style={{ color: netAmount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {netAmount >= 0 ? '+' : ''}{netAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : filteredEnrollments.length === 0 ? (
        <div className="empty-state glass-panel">
          <FileText size={48} className="text-muted" />
          <h3>Chưa có giao dịch nào</h3>
          <p>Hệ thống chưa ghi nhận Phiếu đăng ký nào tại chi nhánh này.</p>
        </div>
      ) : (
        <div className="enrollments-grid">
          {filteredEnrollments.map((enr) => {
            const isPositive = enr.amount >= 0;
            return (
              <div key={enr.id} className="enrollment-card glass-panel" style={{ borderLeft: isPositive ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
                <div className="enrollment-info">
                  <div className={`enrollment-icon ${isPositive ? 'positive' : 'negative'}`}>
                    <FileText size={24} />
                  </div>
                  <div className="enrollment-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 
                        style={{ margin: 0, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'none' }}
                        onClick={() => {
                          localStorage.setItem('openStudentModal', enr.student_id);
                          window.location.href = '/students';
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        title="Đến trang Hồ sơ học viên"
                      >
                        [{enr.student_id}] {enr.students?.full_name} {enr.students?.nickname ? `(${enr.students.nickname})` : ''}
                      </h3>
                    </div>
                    <p style={{ marginTop: '0.25rem' }}>
                      Mã phiếu: <strong>{enr.id}</strong> • Loại: {enr.transaction_type} • 
                      Chi nhánh: {enr.branch_id} • Ngày: {new Date(enr.created_at).toLocaleDateString('vi-VN')}
                    </p>
                    {enr.note && <p style={{ marginTop: '0.25rem', fontStyle: 'italic', fontSize: '0.85rem' }}>Ghi chú: {enr.note}</p>}
                  </div>
                </div>
                <div className="enrollment-financials">
                  <div className={`amount ${isPositive ? 'positive' : 'negative'}`}>
                    {isPositive ? '+' : ''}{Number(enr.amount).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="hours">
                    {isPositive ? '+' : ''}{enr.hours} giờ
                  </div>
                  {["Super Admin", "Kế toán HO"].includes(activeRole) && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                      <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }} onClick={() => handleEdit(enr)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={() => handleDelete(enr)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>

      {/* Modal Lập Phiếu */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingId ? "Sửa Phiếu Đăng Ký (Hợp Đồng)" : "Lập Phiếu Đăng Ký (Hợp Đồng)"}</h2>
              <button className="close-btn" onClick={() => { setShowModal(false); setEditingId(null); setFormData(defaultFormData); setSelectedStudentEnrollments([]); }}>&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              
              <div className="form-group" style={{ marginBottom: formData.student_id ? '0.25rem' : '1.5rem' }}>
                <label className="form-label" style={{ fontWeight: 600 }}>Chọn Học viên *</label>
                {formData.student_id ? (() => {
                  const selectedStudent = students.find(s => s.id === formData.student_id);
                  const displayText = selectedStudent 
                    ? `[${selectedStudent.id}] ${selectedStudent.full_name} ${selectedStudent.nickname ? `(${selectedStudent.nickname})` : ''} - ${selectedStudent.branch_id}`
                    : formData.student_id;
                  return (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div className="form-input" style={{ 
                        background: '#f8fafc', 
                        border: '1px solid #cbd5e1',
                        flex: 1, 
                        display: 'flex', 
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        height: 'auto'
                      }}>
                        <span style={{ fontWeight: 500, color: '#1e293b' }}>{displayText}</span>
                        {!editingId && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setFormData({...formData, student_id: ""});
                              setSelectedStudentEnrollments([]);
                            }}
                            style={{ 
                              padding: '0.25rem 0.75rem', 
                              fontSize: '0.8rem', 
                              background: '#2563eb', 
                              color: '#ffffff', 
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                            }}
                          >
                            Thay đổi
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })() : (
                  <>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="Tìm theo Tên hoặc Mã..." 
                        className="form-input"
                        style={{ flex: 2 }}
                        value={modalStudentSearch}
                        onChange={e => setModalStudentSearch(e.target.value)}
                      />
                      {(isGlobalRole || activeBranch.includes(",")) && (
                        <select 
                          className="form-input"
                          style={{ flex: 1 }}
                          value={modalStudentBranchFilter}
                          onChange={e => setModalStudentBranchFilter(e.target.value)}
                        >
                          <option value="Tất cả">Cả Chi nhánh</option>
                          {(isGlobalRole ? ["Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"] : activeBranch.split(",").map(b => b.trim()).filter(Boolean)).map(b => (
                            <option key={b} value={b}>{b}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <select 
                      size={6}
                      className="form-input" 
                      required
                      value={formData.student_id}
                      onChange={e => setFormData({...formData, student_id: e.target.value})}
                      style={{ height: '140px', overflowY: 'auto' }}
                    >
                      <option value="" disabled>-- Chọn Học viên ({filteredStudentsForModal.length} kết quả) --</option>
                      {filteredStudentsForModal.map(s => {
                        const currentDebt = (Number(s.total_registered_cost) || 0) - (Number(s.total_paid) || 0);
                        return (
                          <option key={s.id} value={s.id}>
                            [{s.id}] {s.full_name} {s.nickname ? `(${s.nickname})` : ''} - {s.branch_id} {currentDebt > 0 ? `(Nợ: ${currentDebt.toLocaleString()}đ)` : '(Hết nợ)'}
                          </option>
                        )
                      })}
                    </select>
                  </>
                )}
                {editingId && <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem' }}>Không thể thay đổi học viên khi sửa hợp đồng. Nếu sai học viên, hãy Xóa hợp đồng này đi và lập hợp đồng mới.</small>}
              </div>

              {formData.student_id && (() => {
                const selectedStudent = students.find(s => s.id === formData.student_id);
                if (!selectedStudent) return null;
                const regCost = Number(selectedStudent.total_registered_cost) || 0;
                const paid = Number(selectedStudent.total_paid) || 0;
                const debt = regCost - paid;
                
                return (
                  <div style={{ 
                    padding: '0.75rem', 
                    background: '#f8fafc', 
                    borderRadius: '8px', 
                    border: '1px solid #e2e8f0',
                    marginTop: '0.25rem',
                    marginBottom: '0.75rem'
                  }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#1e293b', fontSize: '0.9rem', fontWeight: 600 }}>
                      Thông tin Học viên đã chọn:
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem 0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem', color: '#334155' }}>
                      <div><strong>Họ tên:</strong> {selectedStudent.full_name} {selectedStudent.nickname ? `(${selectedStudent.nickname})` : ''}</div>
                      <div><strong>Mã HV:</strong> {selectedStudent.id}</div>
                      <div><strong>Chi nhánh:</strong> {selectedStudent.branch_id}</div>
                      <div><strong>Tổng đăng ký:</strong> {regCost.toLocaleString('vi-VN')} đ</div>
                      <div><strong>Đã đóng (Ví):</strong> {paid.toLocaleString('vi-VN')} đ</div>
                      <div>
                        <strong>Còn nợ:</strong> <span style={{ color: debt > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{debt.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>

                    <h4 style={{ margin: '0.5rem 0 0.25rem 0', color: '#1e293b', fontSize: '0.85rem', fontWeight: 600 }}>
                      Lịch sử Phiếu đăng ký học (Hợp đồng):
                    </h4>
                    {loadingEnrollments ? (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Đang tải lịch sử...</div>
                    ) : selectedStudentEnrollments.length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Không có phiếu đăng ký học nào.</div>
                    ) : (
                      <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff' }}>
                        <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse', textAlign: 'left', color: '#334155' }}>
                          <thead>
                            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '0.3rem 0.5rem', fontWeight: 600 }}>Khóa học/Gói</th>
                              <th style={{ padding: '0.3rem 0.5rem', fontWeight: 600 }}>Học phí</th>
                              <th style={{ padding: '0.3rem 0.5rem', fontWeight: 600, textAlign: 'center' }}>Số giờ (còn lại)</th>
                              <th style={{ padding: '0.3rem 0.5rem', fontWeight: 600 }}>Hình thức</th>
                              <th style={{ padding: '0.3rem 0.5rem', fontWeight: 600 }}>Ngày ký</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedStudentEnrollments.map((enr) => {
                              const courseLabel = enr.course_levels 
                                ? `${enr.course_levels.group_name} - ${enr.course_levels.level_name}` 
                                : 'Chưa xếp lớp / Khác';
                              return (
                                <tr key={enr.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '0.3rem 0.5rem' }}>{courseLabel}</td>
                                  <td style={{ padding: '0.3rem 0.5rem', fontWeight: 600 }}>{(Number(enr.tuition_fee) || 0).toLocaleString('vi-VN')} đ</td>
                                  <td style={{ padding: '0.3rem 0.5rem', textAlign: 'center' }}>
                                    {enr.registered_hours}h ({enr.remaining_hours}h)
                                  </td>
                                  <td style={{ padding: '0.3rem 0.5rem' }}>{enr.payment_method}</td>
                                  <td style={{ padding: '0.3rem 0.5rem' }}>{new Date(enr.created_at).toLocaleDateString('vi-VN')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Loại hợp đồng *</label>
                  <select 
                    className="form-input" 
                    required
                    value={formData.transaction_type}
                    onChange={e => setFormData({...formData, transaction_type: e.target.value})}
                  >
                    <option value="Đăng ký gói mới">Đăng ký gói mới</option>
                    <option value="Tái đăng ký">Tái đăng ký</option>
                    <option value="Hủy gói">Hủy gói (Xóa giờ/Giảm nợ)</option>
                    <option value="Giảm trừ">Giảm trừ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Ngày ký *</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    required
                    value={formData.created_at}
                    onChange={e => setFormData({...formData, created_at: e.target.value})}
                    disabled={!["Super Admin", "Kế toán HO"].includes(activeRole)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label">Hình thức thanh toán *</label>
                  <select 
                    className="form-input" 
                    required
                    value={formData.payment_method}
                    onChange={e => setFormData({...formData, payment_method: e.target.value})}
                  >
                    <option value="Trả thẳng">Trả thẳng</option>
                    <option value="Trả góp ngân hàng">Trả góp ngân hàng</option>
                    <option value="Trả góp trung tâm">Trả góp trung tâm</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tổng giá trị Gói học (VNĐ) *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    min="0"
                    placeholder="VD: 10000000"
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                  {formData.amount > 0 && (
                    <small className="text-muted" style={{marginTop: '0.25rem', display: 'block'}}>
                      = {formData.amount.toLocaleString('vi-VN')} đ
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Tổng số giờ *</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    required 
                    min="0"
                    step="0.5"
                    placeholder="VD: 50"
                    value={formData.hours}
                    onChange={e => setFormData({...formData, hours: Number(e.target.value)})}
                    onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú (Tùy chọn)</label>
                <textarea 
                  className="form-input" 
                  rows={2} 
                  placeholder="Lý do hoàn phí, hoặc các lưu ý đặc biệt..."
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hình ảnh chứng từ (Phiếu thu, Biên lai...)</label>
                <div style={{ padding: '1.5rem', border: '2px dashed var(--border)', borderRadius: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.02)' }}>
                  <input 
                    type="file" 
                    id="receipt-upload" 
                    multiple 
                    accept="image/*" 
                    style={{ display: 'none' }} 
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                  />
                  <label htmlFor="receipt-upload" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    <UploadCloud size={32} className={uploadingReceipt ? 'text-primary' : 'text-muted'} />
                    <span style={{ fontWeight: 500, color: uploadingReceipt ? 'var(--primary)' : 'var(--text)' }}>
                      {uploadingReceipt ? 'Đang nén và tải lên...' : 'Bấm vào đây để tải ảnh lên'}
                    </span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>Tối đa 5 ảnh. Hỗ trợ JPG, PNG.</span>
                  </label>
                </div>
                
                {/* Image Preview Grid */}
                {formData.receipt_images.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                    {formData.receipt_images.map((url, idx) => (
                      <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                        <img src={url} alt="Receipt" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
                        <button 
                          type="button" 
                          onClick={() => removeImage(idx)}
                          style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'var(--danger)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingId(null); setFormData(defaultFormData); setSelectedStudentEnrollments([]); }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : "Ghi nhận Hợp đồng"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

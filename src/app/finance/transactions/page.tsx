"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Receipt, Trash2, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import "../../enrollments/Enrollments.css"; // Reuse the card styling

const getTodayDateString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const defaultFormData = {
  student_id: "",
  transaction_type: "Thu đặt cọc",
  payment_method: "Chuyển khoản",
  amount: 0,
  note: "",
  receipt_images: [] as string[],
  created_at: getTodayDateString()
};

export default function TransactionsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState(defaultFormData);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("Tất cả");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterMonth, setFilterMonth] = useState(""); // Format: "YYYY-MM"
  const [filterStatus, setFilterStatus] = useState("Tất cả");

  // Modal Student Filter & Search
  const [modalStudentSearch, setModalStudentSearch] = useState("");
  const [modalStudentBranchFilter, setModalStudentBranchFilter] = useState("Tất cả");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const { user, loading: authLoading } = useAuth();
  const activeRole = user?.role || "User";
  const activeBranch = user?.branch_id || "";
  const currentUser = user?.full_name || "Guest";

  const GLOBAL_ROLES = ['Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống'];
  const isGlobalRole = GLOBAL_ROLES.includes(activeRole);
  const canEditTransactions = ["Super Admin", "Kế toán HO"].includes(activeRole);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    
    // Fetch students
    let stuQuery = supabase.from("students").select("id, full_name, nickname, branch_id, total_registered_cost, total_paid");
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

    // Fetch receipts
    let recQuery = supabase.from("receipts").select("id, student_id, branch_id, amount, transaction_type, payment_method, note, receipt_images, created_at, created_by, status, approved_by, approved_at, students(full_name, nickname)").order("created_at", { ascending: false }).limit(1000);
    if (!isGlobalRole) {
      if (activeBranch) {
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          recQuery = recQuery.in("branch_id", branches);
        } else {
          recQuery = recQuery.eq("branch_id", branches[0]);
        }
      } else {
        recQuery = recQuery.eq("id", "none");
      }
    }
    const { data: recData } = await recQuery;
    if (recData) setReceipts(recData);
    
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

  if (authLoading) return <div className="loading-state">Đang tải...</div>;
  if (!["Super Admin", "Kế toán HO", "Admin", "Kế toán Chi nhánh"].includes(activeRole)) {
    return <div className="p-8 text-center text-muted" style={{ marginTop: '5rem', fontSize: '1.2rem' }}>Bạn không có quyền truy cập trang này.</div>;
  }

  const handleEdit = (rec: any) => {
    setEditingItem(rec);
    setFormData({
      student_id: rec.student_id,
      transaction_type: rec.transaction_type,
      payment_method: rec.payment_method,
      amount: Math.abs(rec.amount),
      note: rec.note || "",
      receipt_images: rec.receipt_images || [],
      created_at: rec.created_at ? new Date(rec.created_at).toISOString().slice(0, 10) : getTodayDateString()
    });
    setModalStudentSearch("");
    setModalStudentBranchFilter(rec.branch_id || "Tất cả");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.student_id) {
      alert("Vui lòng chọn Học viên!");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const isRefund = formData.transaction_type === "Hoàn phí" || formData.transaction_type === "Chi khác";
      const multiplier = isRefund ? -1 : 1;
      const actualAmount = Number(formData.amount) * multiplier;
      
      const studentInfo = students.find(s => s.id === formData.student_id);
      const studentBranch = studentInfo ? studentInfo.branch_id : activeBranch;

      if (editingItem) {
        // UPDATE TRANSACTION
        const payload = {
          student_id: formData.student_id,
          branch_id: studentBranch,
          transaction_type: formData.transaction_type,
          payment_method: formData.payment_method,
          amount: actualAmount,
          note: formData.note,
          created_at: formData.created_at ? new Date(formData.created_at).toISOString() : new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from("receipts")
          .update(payload)
          .eq("id", editingItem.id);
        if (updateError) throw updateError;

        // Update student wallet
        if (editingItem.student_id === formData.student_id) {
          const { data: currentStu } = await supabase
            .from("students")
            .select("total_paid")
            .eq("id", formData.student_id)
            .single();
          const currentTotalPaid = currentStu ? (Number(currentStu.total_paid) || 0) : (studentInfo ? (Number(studentInfo.total_paid) || 0) : 0);
          const diff = actualAmount - editingItem.amount;
          const { error: updateStuError } = await supabase
            .from("students")
            .update({ total_paid: currentTotalPaid + diff })
            .eq("id", formData.student_id);
          if (updateStuError) throw updateStuError;
        } else {
          // Revert old student wallet balance
          const { data: oldStu } = await supabase
            .from("students")
            .select("total_paid")
            .eq("id", editingItem.student_id)
            .single();
          const oldTotalPaid = oldStu ? (Number(oldStu.total_paid) || 0) : 0;
          const { error: updateOldStuError } = await supabase
            .from("students")
            .update({ total_paid: oldTotalPaid - editingItem.amount })
            .eq("id", editingItem.student_id);
          if (updateOldStuError) throw updateOldStuError;

          // Add to new student wallet balance
          const { data: newStu } = await supabase
            .from("students")
            .select("total_paid")
            .eq("id", formData.student_id)
            .single();
          const newTotalPaid = newStu ? (Number(newStu.total_paid) || 0) : (studentInfo ? (Number(studentInfo.total_paid) || 0) : 0);
          const { error: updateNewStuError } = await supabase
            .from("students")
            .update({ total_paid: newTotalPaid + actualAmount })
            .eq("id", formData.student_id);
          if (updateNewStuError) throw updateNewStuError;
        }
      } else {
        // CREATE TRANSACTION
        const payload = {
          student_id: formData.student_id,
          branch_id: studentBranch,
          transaction_type: formData.transaction_type,
          payment_method: formData.payment_method,
          amount: actualAmount,
          note: formData.note,
          created_by: currentUser,
          created_at: formData.created_at ? new Date(formData.created_at).toISOString() : new Date().toISOString()
        };

        const { error: insertError } = await supabase.from("receipts").insert([payload]);
        if (insertError) throw insertError;

        // Cập nhật Số dư vào Ví điện tử của Học viên
        if (studentInfo && actualAmount !== 0) {
          const { data: currentStu } = await supabase
            .from("students")
            .select("total_paid")
            .eq("id", formData.student_id)
            .single();
          const currentTotalPaid = currentStu ? (Number(currentStu.total_paid) || 0) : (Number(studentInfo.total_paid) || 0);
          const newTotalPaid = currentTotalPaid + actualAmount;

          const { error: updateStuError } = await supabase.from("students").update({
            total_paid: newTotalPaid
          }).eq("id", formData.student_id);
          
          if (updateStuError) throw updateStuError;
        }
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData(defaultFormData);
      setSelectedStudentEnrollments([]);
      fetchData();
      
    } catch (err: any) {
      alert("Lỗi khi lưu phiếu thu: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rec: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa Phiếu thu ${rec.id}? Số tiền thực thu sẽ bị trừ đi và Công nợ của học sinh sẽ TĂNG LÊN tương ứng.`)) return;

    try {
      // Xóa phiếu
      const { error: deleteError } = await supabase.from("receipts").delete().eq("id", rec.id);
      if (deleteError) throw deleteError;

      // Hoàn trả Ví Học Viên
      if (rec.amount !== 0) {
        const { data: currentStu } = await supabase
          .from("students")
          .select("total_paid")
          .eq("id", rec.student_id)
          .single();
        
        if (currentStu) {
          const newTotalPaid = (Number(currentStu.total_paid) || 0) - rec.amount;
          const { error: updateStuError } = await supabase.from("students").update({
            total_paid: newTotalPaid
          }).eq("id", rec.student_id);
          
          if (updateStuError) throw updateStuError;
        }
      }

      fetchData();
    } catch (err: any) {
      alert("Lỗi khi xóa phiếu thu: " + err.message);
    }
  };

  const handleApprove = async (rec: any) => {
    if (!window.confirm(`Bạn có chắc chắn muốn duyệt Phiếu thu ${rec.id}? Sau khi duyệt, nhân sự/kế toán sẽ không thể tự ý sửa hoặc xóa.`)) return;

    try {
      const { error } = await supabase
        .from("receipts")
        .update({
          status: "Đã duyệt",
          approved_by: currentUser,
          approved_at: new Date().toISOString()
        })
        .eq("id", rec.id);

      if (error) throw error;

      alert("Duyệt phiếu thu thành công!");
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi duyệt phiếu thu: " + err.message);
    }
  };

  const filteredReceipts = receipts.filter(rec => {
    const matchSearch = searchTerm === "" || 
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      rec.students?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = filterType === "Tất cả" || rec.transaction_type === filterType;
    const matchBranch = filterBranch === "Tất cả" || rec.branch_id === filterBranch;
    
    let matchMonth = true;
    if (filterMonth) {
      const recMonth = rec.created_at.substring(0, 7); // Gets "YYYY-MM"
      matchMonth = recMonth === filterMonth;
    }
    
    const matchStatus = filterStatus === "Tất cả" || 
      (filterStatus === "Đã duyệt" ? rec.status === "Đã duyệt" : rec.status !== "Đã duyệt");
    
    return matchSearch && matchType && matchBranch && matchMonth && matchStatus;
  });

  const filteredStudentsForModal = students.filter(s => {
    const matchBranch = modalStudentBranchFilter === "Tất cả" || s.branch_id === modalStudentBranchFilter;
    const matchSearch = modalStudentSearch === "" || 
      s.full_name.toLowerCase().includes(modalStudentSearch.toLowerCase()) || 
      s.id.toLowerCase().includes(modalStudentSearch.toLowerCase());
      
    // Chỉ lấy học viên còn nợ thực tế
    const currentDebt = (Number(s.total_registered_cost) || 0) - (Number(s.total_paid) || 0);
    const hasDebt = currentDebt > 0;
    
    return matchBranch && matchSearch && hasDebt;
  });

  return (
    <>
      <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1>Thu Chi (Thực Thu)</h1>
          <p className="text-muted">Ghi nhận dòng tiền thực tế thu từ phụ huynh (đặt cọc, bổ sung phí) và tự động cấn trừ công nợ.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canEditTransactions && (
            <button className="btn btn-primary" onClick={() => { setFormData(defaultFormData); setShowModal(true); }}>
              <Plus size={20} />
              <span>Lập Phiếu Thu Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Nút lọc nhanh trạng thái duyệt */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => setFilterStatus("Tất cả")}
          className={`btn btn-sm ${filterStatus === "Tất cả" ? "btn-primary" : "btn-secondary"}`}
          style={{ borderRadius: '20px', padding: '0.4rem 1.25rem', fontWeight: 600 }}
        >
          Tất cả phiếu
        </button>
        <button 
          onClick={() => setFilterStatus("Chờ duyệt")}
          className="btn btn-sm"
          style={{ 
            borderRadius: '20px', 
            padding: '0.4rem 1.25rem',
            background: filterStatus === "Chờ duyệt" ? '#f59e0b' : 'rgba(245, 158, 11, 0.15)',
            color: filterStatus === "Chờ duyệt" ? '#fff' : '#d97706',
            border: 'none',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          🟠 Chờ duyệt ({receipts.filter(r => r.status !== "Đã duyệt").length})
        </button>
        <button 
          onClick={() => setFilterStatus("Đã duyệt")}
          className="btn btn-sm"
          style={{ 
            borderRadius: '20px', 
            padding: '0.4rem 1.25rem',
            background: filterStatus === "Đã duyệt" ? '#10b981' : 'rgba(16, 185, 129, 0.15)',
            color: filterStatus === "Đã duyệt" ? '#fff' : '#059669',
            border: 'none',
            fontWeight: 600,
            transition: 'all 0.2s'
          }}
        >
          🟢 Đã duyệt ({receipts.filter(r => r.status === "Đã duyệt").length})
        </button>
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
        {(isGlobalRole || activeBranch.includes(",")) && (
          <select className="form-input" style={{ width: 'auto' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
            <option value="Tất cả">{isGlobalRole ? "Tất cả Chi nhánh" : "Tất cả chi nhánh của tôi"}</option>
            {(isGlobalRole ? ["Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"] : activeBranch.split(",").map(b => b.trim()).filter(Boolean)).map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}
        <select className="form-input" style={{ width: 'auto' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="Tất cả">Tất cả Giao dịch</option>
          <option value="Thu đặt cọc">Thu đặt cọc</option>
          <option value="Thu bổ sung phí">Thu bổ sung phí</option>
          <option value="Thu hoàn thiện">Thu hoàn thiện</option>
          <option value="Hoàn phí">Hoàn phí (Chi)</option>
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
      {!loading && filteredReceipts.length > 0 && (() => {
        const totalIncome = filteredReceipts.filter(r => r.amount >= 0).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const totalExpense = filteredReceipts.filter(r => r.amount < 0).reduce((sum, r) => sum + Math.abs(Number(r.amount) || 0), 0);
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
              Kết quả: <strong>{filteredReceipts.length}</strong> phiếu
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 600 }}>
              Tổng thu: +{totalIncome.toLocaleString('vi-VN')} đ
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 600 }}>
              Tổng chi: -{totalExpense.toLocaleString('vi-VN')} đ
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, marginLeft: 'auto' }}>
              Thực thu ròng: <span style={{ color: netAmount >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                {netAmount >= 0 ? '+' : ''}{netAmount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>
        );
      })()}

      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : filteredReceipts.length === 0 ? (
        <div className="empty-state glass-panel">
          <Receipt size={48} className="text-muted" />
          <h3>Chưa có phiếu thu nào</h3>
          <p>Hệ thống chưa ghi nhận dòng tiền nào tại chi nhánh này.</p>
        </div>
      ) : (
        <div className="enrollments-grid">
          {filteredReceipts.map((rec) => {
            const isPositive = rec.amount >= 0;
            return (
              <div key={rec.id} className="enrollment-card glass-panel" style={{ borderLeft: isPositive ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
                <div className="enrollment-info">
                  <div className={`enrollment-icon ${isPositive ? 'positive' : 'negative'}`}>
                    <Receipt size={24} />
                  </div>
                  <div className="enrollment-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <h3 
                        style={{ margin: 0, cursor: 'pointer', color: 'var(--primary)', textDecoration: 'none' }}
                        onClick={() => {
                          localStorage.setItem('openStudentModal', rec.student_id);
                          window.location.href = '/students';
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                        onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                        title="Đến trang Hồ sơ học viên"
                      >
                        [{rec.student_id}] {rec.students?.full_name} {rec.students?.nickname ? `(${rec.students.nickname})` : ''}
                      </h3>
                      {rec.status === 'Đã duyệt' ? (
                        <span className="badge" style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: 'rgba(16, 185, 129, 0.15)', 
                          color: '#10b981',
                          fontWeight: 600
                        }} title={`Đã duyệt bởi ${rec.approved_by} lúc ${new Date(rec.approved_at).toLocaleString('vi-VN')}`}>
                          Đã duyệt
                        </span>
                      ) : (
                        <span className="badge" style={{ 
                          fontSize: '0.75rem', 
                          padding: '2px 8px', 
                          borderRadius: '4px', 
                          background: 'rgba(245, 158, 11, 0.15)', 
                          color: '#f59e0b',
                          fontWeight: 600
                        }}>
                          Chờ duyệt
                        </span>
                      )}
                    </div>
                    <p style={{ marginTop: '0.25rem' }}>
                      Mã: <strong>{rec.id?.split('-')[0]}</strong> • Loại: {rec.transaction_type} • 
                      Chi nhánh: {rec.branch_id} • Ngày: {new Date(rec.created_at).toLocaleDateString('vi-VN')}
                    </p>
                    {rec.payment_method && <p style={{ marginTop: '0.25rem', color: 'var(--primary)', fontSize: '0.85rem' }}>HT: {rec.payment_method}</p>}
                    {rec.note && <p style={{ marginTop: '0.25rem', fontStyle: 'italic', fontSize: '0.85rem' }}>Ghi chú: {rec.note}</p>}
                    {rec.status === 'Đã duyệt' && rec.approved_by && (
                      <p style={{ marginTop: '0.25rem', color: 'var(--success)', fontSize: '0.8rem', fontWeight: 500 }}>
                        ✓ Đã duyệt bởi {rec.approved_by} lúc {new Date(rec.approved_at).toLocaleDateString('vi-VN')} {new Date(rec.approved_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="enrollment-financials">
                  <div className={`amount ${isPositive ? 'positive' : 'negative'}`} style={{ fontSize: '1.25rem' }}>
                    {isPositive ? '+' : ''}{Number(rec.amount).toLocaleString('vi-VN')} đ
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem', alignItems: 'center' }}>
                    {/* Approval button: only visible to Super Admin when status is not Approved */}
                    {activeRole === "Super Admin" && rec.status !== "Đã duyệt" && (
                      <button 
                        className="btn btn-sm btn-primary" 
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', height: '30px' }}
                        onClick={() => handleApprove(rec)}
                      >
                        Duyệt
                      </button>
                    )}
                    {canEditTransactions && (activeRole === "Super Admin" || rec.status !== "Đã duyệt") && (
                      <>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(rec)}>
                          <Edit size={16} />
                        </button>
                        <button className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={() => handleDelete(rec)}>
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>

      {/* Modal Lập Phiếu Thu */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingItem ? "Sửa Phiếu Thu Tiền" : "Lập Phiếu Thu Tiền"}</h2>
              <button className="close-btn" onClick={() => { setShowModal(false); setEditingItem(null); setFormData(defaultFormData); setSelectedStudentEnrollments([]); }}>&times;</button>
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Lý do thu/chi *</label>
                  <select 
                    className="form-input" 
                    required
                    value={formData.transaction_type}
                    onChange={e => setFormData({...formData, transaction_type: e.target.value})}
                  >
                    <option value="Thu đặt cọc">Thu đặt cọc</option>
                    <option value="Thu bổ sung phí">Thu bổ sung phí</option>
                    <option value="Thu hoàn thiện">Thu hoàn thiện</option>
                    <option value="Hoàn phí">Hoàn phí (Chi)</option>
                    <option value="Chi khác">Chi khác</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Hình thức *</label>
                  <select 
                    className="form-input" 
                    required
                    value={formData.payment_method}
                    onChange={e => setFormData({...formData, payment_method: e.target.value})}
                  >
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Quẹt thẻ (POS)">Quẹt thẻ (POS)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Ngày chứng từ (Ngày thu tiền) *</label>
                <input 
                  type="date" 
                  className="form-input" 
                  required
                  value={formData.created_at}
                  onChange={e => setFormData({...formData, created_at: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Số tiền thực tế (VNĐ) *</label>
                <input 
                  type="number" 
                  className="form-input" 
                  required 
                  min="0"
                  placeholder="VD: 1000000"
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
                <label className="form-label">Ghi chú thêm</label>
                <textarea 
                  className="form-input" 
                  rows={2} 
                  placeholder="Người nộp tiền, số tài khoản đích..."
                  value={formData.note}
                  onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); setEditingItem(null); setFormData(defaultFormData); setSelectedStudentEnrollments([]); }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : (editingItem ? "Cập nhật Phiếu" : "Lập Phiếu & Trừ nợ")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

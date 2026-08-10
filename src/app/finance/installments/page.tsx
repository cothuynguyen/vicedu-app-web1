"use client";

import { useState, useEffect } from "react";
import { Search, Plus, Edit, Trash2, CreditCard, RefreshCw, MessageCircle, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import "./Installments.css";

// Hàm chuyển số thành chữ (Tiếng Việt) cơ bản
function numberToVietnameseWords(n: number): string {
  if (n === 0) return "Không đồng";
  if (!n) return "";
  
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  
  function readGroup(group: string): string {
    const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
    let result = "";
    if (group.length === 3) {
      result += digits[parseInt(group[0])] + " trăm ";
      if (group[1] === "0" && group[2] !== "0") result += "lẻ ";
    }
    if (group.length >= 2) {
      const tens = parseInt(group[group.length - 2]);
      if (tens === 1) result += "mười ";
      else if (tens > 1) result += digits[tens] + " mươi ";
    }
    const ones = parseInt(group[group.length - 1]);
    if (ones === 1 && group.length >= 2 && parseInt(group[group.length - 2]) > 1) result += "mốt ";
    else if (ones === 5 && group.length >= 2 && parseInt(group[group.length - 2]) > 0) result += "lăm ";
    else if (ones > 0 || (group.length === 1 && ones === 0)) result += digits[ones] + " ";
    
    return result.trim();
  }

  let str = Math.floor(n).toString();
  let result = "";
  let unitIndex = 0;

  while (str.length > 0) {
    const group = str.slice(Math.max(0, str.length - 3));
    str = str.slice(0, Math.max(0, str.length - 3));
    
    if (parseInt(group) !== 0) {
      const groupWords = readGroup(group);
      result = groupWords + " " + units[unitIndex] + " " + result;
    }
    unitIndex++;
  }

  result = result.replace(/\s+/g, ' ').trim();
  result = result.charAt(0).toUpperCase() + result.slice(1) + " đồng chẵn.";
  return result;
}

const getIsConvertedBadgeStyle = (status: string) => {
  switch(status) {
    case "Đã chuyển đổi":
      return { background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' };
    case "Kết thúc trả góp":
      return { background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)' };
    case "Đã đóng thẻ thành công":
      return { background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' };
    case "Chưa":
    default:
      return { background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' };
  }
};

const defaultFormData = {
  installment_type: "Trả góp ngân hàng",
  student_id: "",
  student_name: "",
  parent_name: "",
  parent_phone: "",
  id_card: "",
  card_number: "",
  transaction_date: "",
  approval_code: "",
  swiped_amount: 0,
  swiped_amount_words: "",
  installment_amount: 0,
  installment_amount_words: "",
  installment_months: 0,
  interest_amount: 0,
  interest_amount_words: "",
  total_tuition: 0,
  total_tuition_words: "",
  paid_amount: 0,
  bank_submit_status: "Chưa gửi",
  bank_submit_date: "",
  is_converted: "Chưa",
  expected_end_date: "",
  notes: "",
  next_call_date: "",
  care_logs: [] as any[]
};

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Trạng thái Main Tabs
  const [activeMainTab, setActiveMainTab] = useState<"Trả góp ngân hàng" | "Trả góp trung tâm">("Trả góp ngân hàng");

  // Trạng thái cho Edit Log
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogNote, setEditingLogNote] = useState("");
  
  const [formData, setFormData] = useState(defaultFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterConverted, setFilterConverted] = useState("Tất cả");

  const { user, loading: authLoading } = useAuth();
  const activeRole = user?.role || "User";
  const activeBranch = user?.branch_id || "";
  const currentUser = user?.full_name || "Guest";

  // Tabs cho Modal CRM
  const [activeTab, setActiveTab] = useState<"info" | "crm">("info");
  const [newLogNote, setNewLogNote] = useState("");

  const GLOBAL_ROLES = ['Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống'];
  const isGlobalRole = GLOBAL_ROLES.includes(activeRole);
  const canCreate = ["Super Admin", "Kế toán HO", "Admin", "Giám đốc", "Quản lý hệ thống"].includes(activeRole);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    
    // Fetch students for dropdown
    let stuQuery = supabase.from("students").select("id, full_name, parent_name, parent_phone, branch_id");
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

    // Fetch installments
    let query = supabase.from("installments").select("*").order("created_at", { ascending: false });
    if (!isGlobalRole) {
      if (activeBranch) {
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          query = query.in("branch_id", branches);
        } else {
          query = query.eq("branch_id", branches[0]);
        }
      } else {
        query = query.eq("id", "none");
      }
    }
    
    const { data, error } = await query;
    if (!error && data) {
      setInstallments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [activeBranch, isGlobalRole, authLoading]);

  // Tự động tính "Số chữ" khi nhập "Số tiền"
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      swiped_amount_words: numberToVietnameseWords(prev.swiped_amount),
      installment_amount_words: numberToVietnameseWords(prev.installment_amount),
      interest_amount_words: numberToVietnameseWords(prev.interest_amount),
      total_tuition_words: numberToVietnameseWords(prev.total_tuition)
    }));
  }, [formData.swiped_amount, formData.installment_amount, formData.interest_amount, formData.total_tuition]);

  const handleStudentSelect = (studentId: string) => {
    const stu = students.find(s => s.id === studentId);
    if (stu) {
      setFormData(prev => ({
        ...prev,
        student_id: stu.id,
        student_name: stu.full_name,
        parent_name: stu.parent_name || "",
        parent_phone: stu.parent_phone || ""
      }));
    } else {
      setFormData(prev => ({ ...prev, student_id: studentId }));
    }
  };

  const handleAddLog = () => {
    if (!newLogNote.trim()) return;
    const log = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      staff: currentUser,
      note: newLogNote
    };
    setFormData(prev => ({
      ...prev,
      care_logs: [log, ...(prev.care_logs || [])]
    }));
    setNewLogNote("");
  };

  const handleEditLogSave = () => {
    if (!editingLogNote.trim()) return;
    setFormData(prev => ({
      ...prev,
      care_logs: (prev.care_logs || []).map(l => 
        l.id === editingLogId ? { ...l, note: editingLogNote } : l
      )
    }));
    setEditingLogId(null);
    setEditingLogNote("");
  };

  const handleEditLogStart = (log: any) => {
    setEditingLogId(log.id);
    setEditingLogNote(log.note);
  };

  const handleDeleteLog = (logId: string) => {
    setFormData(prev => ({
      ...prev,
      care_logs: (prev.care_logs || []).filter(l => l.id !== logId)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = { ...formData } as any;
      
      // Clean up empty dates
      if (!payload.transaction_date) payload.transaction_date = null;
      if (!payload.bank_submit_date) payload.bank_submit_date = null;
      if (!payload.expected_end_date) payload.expected_end_date = null;
      if (!payload.next_call_date) payload.next_call_date = null;

      if (editingId) {
        const { error } = await supabase.from("installments").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const studentInfo = students.find(s => s.id === payload.student_id);
        payload.branch_id = studentInfo ? studentInfo.branch_id : activeBranch;
        payload.staff_id = currentUser;
        payload.staff_name = currentUser;
        const { error } = await supabase.from("installments").insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      setFormData(defaultFormData);
      setEditingId(null);
      setActiveTab("info");
      fetchData();
      
    } catch (err: any) {
      alert("Lỗi lưu hồ sơ trả góp: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setActiveTab("info");
    setFormData({
      installment_type: record.installment_type || "Trả góp ngân hàng",
      student_id: record.student_id || "",
      student_name: record.student_name || "",
      parent_name: record.parent_name || "",
      parent_phone: record.parent_phone || "",
      id_card: record.id_card || "",
      card_number: record.card_number || "",
      transaction_date: record.transaction_date || "",
      approval_code: record.approval_code || "",
      swiped_amount: record.swiped_amount || 0,
      swiped_amount_words: record.swiped_amount_words || "",
      installment_amount: record.installment_amount || 0,
      installment_amount_words: record.installment_amount_words || "",
      installment_months: record.installment_months || 0,
      interest_amount: record.interest_amount || 0,
      interest_amount_words: record.interest_amount_words || "",
      total_tuition: record.total_tuition || 0,
      total_tuition_words: record.total_tuition_words || "",
      paid_amount: record.paid_amount || 0,
      bank_submit_status: record.bank_submit_status || "Chưa gửi",
      bank_submit_date: record.bank_submit_date || "",
      is_converted: record.is_converted || "Chưa",
      expected_end_date: record.expected_end_date || "",
      notes: record.notes || "",
      next_call_date: record.next_call_date || "",
      care_logs: record.care_logs || []
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hồ sơ trả góp này?")) return;
    const { error } = await supabase.from("installments").delete().eq("id", id);
    if (error) {
      alert("Lỗi khi xóa: " + error.message);
    } else {
      fetchData();
    }
  };

  const isCallOverdue = (nextCallDate: string) => {
    if (!nextCallDate) return false;
    const callDate = new Date(nextCallDate);
    const now = new Date();
    // Đặt giờ về 0 để so sánh đúng ngày
    callDate.setHours(0,0,0,0);
    now.setHours(0,0,0,0);
    return now.getTime() >= callDate.getTime();
  };

  const openZalo = (phone: string) => {
    if (!phone) return;
    const url = `https://zalo.me/${phone.replace(/[^0-9]/g, '')}`;
    window.open(url, '_blank');
  };

  const filteredInstallments = installments.filter(item => {
    // Filter by Tab
    if (item.installment_type !== activeMainTab) return false;

    const matchSearch = searchTerm === "" || 
      item.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.id_card?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.card_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === "Tất cả" || item.bank_submit_status === filterStatus;
    
    const matchBranch = (() => {
      if (filterBranch === "Tất cả") {
        if (isGlobalRole) return true;
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        return branches.includes(item.branch_id);
      }
      return item.branch_id === filterBranch;
    })();

    const matchConverted = filterConverted === "Tất cả" || (item.is_converted || "Chưa") === filterConverted;
    
    return matchSearch && matchStatus && matchBranch && matchConverted;
  });

  return (
    <>
      <div className="installments-container animate-fade-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Quản trị Trả góp</h1>
          <p className="text-muted">Quản lý các khoản nợ, trả góp ngân hàng và nhắc nhở thanh toán.</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => { setFormData({ ...defaultFormData, installment_type: activeMainTab }); setEditingId(null); setActiveTab("info"); setShowModal(true); }}>
            <Plus size={20} />
            <span>Thêm Hồ Sơ {activeMainTab === 'Trả góp trung tâm' ? 'Trung tâm' : 'Ngân hàng'}</span>
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <button 
          style={{ padding: '0.75rem 0', background: 'none', border: 'none', borderBottom: activeMainTab === 'Trả góp ngân hàng' ? '2px solid var(--primary)' : '2px solid transparent', color: activeMainTab === 'Trả góp ngân hàng' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeMainTab === 'Trả góp ngân hàng' ? 600 : 400, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => setActiveMainTab('Trả góp ngân hàng')}
        >
          💳 Trả góp Ngân hàng
        </button>
        <button 
          style={{ padding: '0.75rem 0', background: 'none', border: 'none', borderBottom: activeMainTab === 'Trả góp trung tâm' ? '2px solid var(--primary)' : '2px solid transparent', color: activeMainTab === 'Trả góp trung tâm' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeMainTab === 'Trả góp trung tâm' ? 600 : 400, cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={() => setActiveMainTab('Trả góp trung tâm')}
        >
          🏢 Trả góp Trung tâm
        </button>
      </div>

      <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', padding: '1rem', borderRadius: '12px' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} className="text-muted" style={{ position: 'absolute', left: '10px', top: '10px' }} />
          <input 
            type="text" 
            placeholder="Tìm theo Tên KH, CCCD, Số thẻ..." 
            className="form-input" 
            style={{ paddingLeft: '2.5rem' }}
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
        {activeMainTab === "Trả góp ngân hàng" && (
          <>
            <select className="form-input" style={{ width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="Tất cả">Trạng thái Ngân hàng</option>
              <option value="Chưa gửi">Chưa gửi</option>
              <option value="Đã gửi">Đã gửi</option>
            </select>
            <select className="form-input" style={{ width: 'auto' }} value={filterConverted} onChange={e => setFilterConverted(e.target.value)}>
              <option value="Tất cả">Tình trạng thẻ (Tất cả)</option>
              <option value="Chưa">Chưa</option>
              <option value="Đã chuyển đổi">Đã chuyển đổi</option>
              <option value="Kết thúc trả góp">Kết thúc trả góp</option>
              <option value="Đã đóng thẻ thành công">Đã đóng thẻ thành công</option>
            </select>
          </>
        )}
        <button className="btn btn-secondary" onClick={fetchData} title="Làm mới">
          <RefreshCw size={18} />
        </button>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            {activeMainTab === "Trả góp ngân hàng" ? (
              <tr>
                <th>Học viên / Phụ huynh</th>
                <th>Số thẻ / CCCD</th>
                <th>Ngày giao dịch</th>
                <th>Ngày hẹn gọi</th>
                <th>Gửi Ngân hàng</th>
                <th>Tình trạng thẻ</th>
                <th>Thao tác</th>
              </tr>
            ) : (
              <tr>
                <th>Học viên / Phụ huynh</th>
                <th>Ngày hẹn gọi</th>
                <th>Tổng số tiền</th>
                <th>Đã trả</th>
                <th>Còn nợ</th>
                <th>Thao tác</th>
              </tr>
            )}
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Đang tải dữ liệu...</td></tr>
            ) : filteredInstallments.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Chưa có dữ liệu.</td></tr>
            ) : (
              filteredInstallments.map((item) => {
                const isOverdue = isCallOverdue(item.next_call_date);
                const debt = Number(item.installment_amount || 0) - Number(item.paid_amount || 0);

                return (
                  <tr key={item.id} style={{ background: isOverdue ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                    <td>
                      <div style={{ fontWeight: 500, color: isOverdue ? 'var(--danger)' : 'inherit' }}>
                        {item.student_name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                        <span>{item.parent_name} - {item.parent_phone}</span>
                        {item.parent_phone && (
                          <button 
                            className="btn btn-sm" 
                            style={{ padding: '0.2rem 0.4rem', background: '#0068ff', color: 'white', borderRadius: '4px', fontSize: '12px' }}
                            onClick={() => openZalo(item.parent_phone)}
                            title="Chat Zalo ngay"
                          >
                            <MessageCircle size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                    
                    {activeMainTab === "Trả góp ngân hàng" && (
                      <>
                        <td>
                          <div>Thẻ: {item.card_number || "---"}</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>CCCD: {item.id_card || "---"}</div>
                        </td>
                        <td>{item.transaction_date ? new Date(item.transaction_date).toLocaleDateString('vi-VN') : "---"}</td>
                      </>
                    )}

                    <td>
                      {item.next_call_date ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: isOverdue ? 'var(--danger)' : 'var(--text)' }}>
                          <Calendar size={14} />
                          <span style={{ fontWeight: isOverdue ? 600 : 400 }}>
                            {new Date(item.next_call_date).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      ) : <span className="text-muted">---</span>}
                    </td>

                    {activeMainTab === "Trả góp ngân hàng" ? (
                      <>
                        <td>
                          <span className={`status-badge ${item.bank_submit_status === 'Đã gửi' ? 'success' : 'pending'}`}>
                            {item.bank_submit_status}
                          </span>
                        </td>
                        <td>
                          <span className="status-badge" style={getIsConvertedBadgeStyle(item.is_converted)}>
                            {item.is_converted || "Chưa"}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                          {Number(item.installment_amount || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                          {Number(item.paid_amount || 0).toLocaleString('vi-VN')} đ
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: debt > 0 ? 'var(--danger)' : 'var(--success)', background: debt > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>
                            {debt.toLocaleString('vi-VN')} đ
                          </span>
                        </td>
                      </>
                    )}

                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => handleEdit(item)}>Chi tiết</button>
                        {canCreate && (
                          <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white' }} onClick={() => handleDelete(item.id)}>Xóa</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
              <h2>{editingId ? `Sửa Hồ Sơ (${formData.installment_type})` : `Thêm Hồ Sơ (${formData.installment_type})`}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            {/* Modal Tabs */}
            <div style={{ display: 'flex', gap: '1rem', padding: '0 1.5rem', borderBottom: '1px solid var(--border)', marginTop: '1rem' }}>
              <button 
                style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'info' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'info' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'info' ? 600 : 400, cursor: 'pointer', fontSize: '1rem' }}
                onClick={() => setActiveTab("info")}
              >
                Thông tin Hợp đồng
              </button>
              <button 
                style={{ padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'crm' ? '2px solid var(--primary)' : '2px solid transparent', color: activeTab === 'crm' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: activeTab === 'crm' ? 600 : 400, cursor: 'pointer', fontSize: '1rem' }}
                onClick={() => setActiveTab("crm")}
              >
                Nhật ký Chăm sóc (CRM)
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
              {activeTab === "info" && (
                <form id="installment-form" onSubmit={handleSubmit} className="modal-form" style={{ padding: 0 }}>
                  <div className="form-section-title" style={{ marginTop: 0 }}>1. Thông tin Khách hàng</div>
                  <div className="two-col-grid">
                    <div className="form-group">
                      <label className="form-label">Chọn Học viên *</label>
                      <select 
                        className="form-input" 
                        required
                        value={formData.student_id}
                        onChange={e => handleStudentSelect(e.target.value)}
                      >
                        <option value="">-- Chọn học viên --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.id} - {s.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tên Học viên</label>
                      <input type="text" className="form-input" value={formData.student_name} onChange={e => setFormData({...formData, student_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tên Phụ huynh</label>
                      <input type="text" className="form-input" value={formData.parent_name} onChange={e => setFormData({...formData, parent_name: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Số điện thoại</label>
                      <input type="text" className="form-input" value={formData.parent_phone} onChange={e => setFormData({...formData, parent_phone: e.target.value})} />
                    </div>
                    {formData.installment_type === "Trả góp ngân hàng" && (
                      <div className="form-group">
                        <label className="form-label">Số CCCD</label>
                        <input type="text" className="form-input" value={formData.id_card} onChange={e => setFormData({...formData, id_card: e.target.value})} />
                      </div>
                    )}
                  </div>

                  {formData.installment_type === "Trả góp ngân hàng" ? (
                    <>
                      <div className="form-section-title">2. Thông tin Quẹt thẻ & Ngân hàng</div>
                      <div className="three-col-grid">
                        <div className="form-group">
                          <label className="form-label">Số thẻ</label>
                          <input type="text" className="form-input" value={formData.card_number} onChange={e => setFormData({...formData, card_number: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Ngày giao dịch</label>
                          <input type="date" className="form-input" value={formData.transaction_date} onChange={e => setFormData({...formData, transaction_date: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Mã số chuẩn chi</label>
                          <input type="text" className="form-input" value={formData.approval_code} onChange={e => setFormData({...formData, approval_code: e.target.value})} />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Số tiền đã quẹt thẻ (VNĐ)</label>
                          <input type="number" className="form-input" value={formData.swiped_amount} onChange={e => setFormData({...formData, swiped_amount: Number(e.target.value)})} />
                          <small className="text-muted">{formData.swiped_amount_words}</small>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Số tiền đăng ký trả góp</label>
                          <input type="number" className="form-input" value={formData.installment_amount} onChange={e => setFormData({...formData, installment_amount: Number(e.target.value)})} />
                          <small className="text-muted">{formData.installment_amount_words}</small>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Số tháng trả góp</label>
                          <input type="number" className="form-input" value={formData.installment_months} onChange={e => setFormData({...formData, installment_months: Number(e.target.value)})} />
                        </div>
                        
                        <div className="form-group">
                          <label className="form-label">Lãi phải trả</label>
                          <input type="number" className="form-input" value={formData.interest_amount} onChange={e => setFormData({...formData, interest_amount: Number(e.target.value)})} />
                          <small className="text-muted">{formData.interest_amount_words}</small>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tổng học phí</label>
                          <input type="number" className="form-input" value={formData.total_tuition} onChange={e => setFormData({...formData, total_tuition: Number(e.target.value)})} />
                          <small className="text-muted">{formData.total_tuition_words}</small>
                        </div>
                      </div>

                      <div className="form-section-title">3. Trạng thái & Theo dõi</div>
                      <div className="three-col-grid">
                        <div className="form-group">
                          <label className="form-label">Gửi thông tin sang NH</label>
                          <select className="form-input" value={formData.bank_submit_status} onChange={e => setFormData({...formData, bank_submit_status: e.target.value})}>
                            <option value="Chưa gửi">Chưa gửi</option>
                            <option value="Đã gửi">Đã gửi</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Ngày gửi NH</label>
                          <input type="date" className="form-input" value={formData.bank_submit_date} onChange={e => setFormData({...formData, bank_submit_date: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Tình trạng thẻ</label>
                          <select className="form-input" value={formData.is_converted} onChange={e => setFormData({...formData, is_converted: e.target.value})}>
                            <option value="Chưa">Chưa</option>
                            <option value="Đã chuyển đổi">Đã chuyển đổi</option>
                            <option value="Kết thúc trả góp">Kết thúc trả góp</option>
                            <option value="Đã đóng thẻ thành công">Đã đóng thẻ thành công</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Ngày dự kiến kết thúc</label>
                          <input type="date" className="form-input" value={formData.expected_end_date} onChange={e => setFormData({...formData, expected_end_date: e.target.value})} />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                          <label className="form-label">Ghi chú</label>
                          <input type="text" className="form-input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="form-section-title">2. Thông tin Tài chính & Thu nợ</div>
                      <div className="three-col-grid">
                        <div className="form-group">
                          <label className="form-label">Tổng số tiền trả góp</label>
                          <input type="number" className="form-input" value={formData.installment_amount} onChange={e => setFormData({...formData, installment_amount: Number(e.target.value)})} />
                          <small className="text-muted">{formData.installment_amount_words}</small>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Số tiền đã trả</label>
                          <input type="number" className="form-input" value={formData.paid_amount} onChange={e => setFormData({...formData, paid_amount: Number(e.target.value)})} />
                          <small className="text-muted">Kế toán cập nhật mỗi lần đóng thêm</small>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Số tiền còn nợ</label>
                          <div className="form-input" style={{ background: '#f8f9fa', fontWeight: 600, color: (formData.installment_amount - formData.paid_amount) > 0 ? 'var(--danger)' : 'var(--success)' }}>
                            {(formData.installment_amount - formData.paid_amount).toLocaleString('vi-VN')} đ
                          </div>
                        </div>

                        <div className="form-group">
                          <label className="form-label">Số tháng cam kết</label>
                          <input type="number" className="form-input" value={formData.installment_months} onChange={e => setFormData({...formData, installment_months: Number(e.target.value)})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Ngày dự kiến kết thúc</label>
                          <input type="date" className="form-input" value={formData.expected_end_date} onChange={e => setFormData({...formData, expected_end_date: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Ghi chú</label>
                          <input type="text" className="form-input" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                        </div>
                      </div>
                    </>
                  )}
                </form>
              )}

              {activeTab === "crm" && (
                <div>
                  <div className="form-section-title" style={{ marginTop: 0 }}>Lịch hẹn Nhắc nhở</div>
                  <div className="form-row" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '2rem' }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label className="form-label">Ngày hẹn gọi tiếp theo (Next Call Date)</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.next_call_date} 
                        onChange={e => setFormData({...formData, next_call_date: e.target.value})} 
                      />
                    </div>
                    <div style={{ paddingBottom: '8px' }}>
                      <small className="text-muted">Hệ thống sẽ bôi đỏ tên Khách hàng trên bảng tổng hợp khi đến ngày hẹn.</small>
                    </div>
                  </div>

                  <div className="form-section-title">Nhật ký Chăm sóc Khách hàng</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ghi chú nội dung chat Zalo, kết quả nhắc nợ..." 
                      style={{ flex: 1 }}
                      value={newLogNote}
                      onChange={e => setNewLogNote(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddLog(); } }}
                    />
                    <button className="btn btn-primary" onClick={handleAddLog}>Thêm ghi chú</button>
                  </div>

                  <div className="logs-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {!formData.care_logs || formData.care_logs.length === 0 ? (
                      <div className="text-muted" style={{ textAlign: 'center', padding: '2rem', background: 'var(--glass-bg)', borderRadius: '8px' }}>
                        Chưa có lịch sử chăm sóc nào.
                      </div>
                    ) : (
                      formData.care_logs.map((log) => (
                        <div key={log.id} style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                            <strong style={{ color: 'var(--primary)' }}>{log.staff}</strong>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <span className="text-muted">{new Date(log.date).toLocaleString('vi-VN')}</span>
                              {editingLogId !== log.id && (
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button 
                                    className="btn btn-sm" 
                                    style={{ color: 'var(--text-muted)', background: 'none', border: 'none', padding: '4px' }}
                                    onClick={() => handleEditLogStart(log)}
                                    title="Sửa ghi chú"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  <button 
                                    className="btn btn-sm" 
                                    style={{ color: 'var(--danger)', background: 'none', border: 'none', padding: '4px' }}
                                    onClick={() => handleDeleteLog(log.id)}
                                    title="Xóa ghi chú"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {editingLogId === log.id ? (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                              <input 
                                type="text" 
                                className="form-input" 
                                value={editingLogNote}
                                onChange={e => setEditingLogNote(e.target.value)}
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEditLogSave(); } }}
                              />
                              <button className="btn btn-sm btn-primary" onClick={handleEditLogSave}>Lưu</button>
                              <button className="btn btn-sm btn-secondary" onClick={() => setEditingLogId(null)}>Hủy</button>
                            </div>
                          ) : (
                            <div style={{ marginTop: '0.25rem' }}>{log.note}</div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', marginTop: 'auto', background: 'var(--background)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Đóng</button>
              {canCreate && (
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                >
                  {isSubmitting ? "Đang lưu..." : "Lưu Hồ Sơ & Nhật Ký"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

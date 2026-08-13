"use client";

import { useState, useEffect } from "react";
import { Plus, Search, CheckCircle, FileText, ChevronRight, X, AlertCircle, Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import "./Payroll.css";

function readNumberVN(num: number): string {
  if (num === 0) return "Không đồng chẵn./.";
  const words = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ"];
  let str = Math.floor(Math.abs(num)).toString();
  let result = [];
  let chunks = [];
  while (str.length > 0) {
    chunks.push(str.slice(-3));
    str = str.slice(0, -3);
  }
  
  for (let i = 0; i < chunks.length; i++) {
    if (parseInt(chunks[i]) !== 0) {
      let chunkStr = chunks[i].padStart(3, '0');
      let c = parseInt(chunkStr[0]);
      let b = parseInt(chunkStr[1]);
      let a = parseInt(chunkStr[2]);
      
      let chunkWords = [];
      if (c !== 0 || i < chunks.length - 1) {
        chunkWords.push(words[c], "trăm");
      }
      if (b === 0 && a !== 0 && (c !== 0 || i < chunks.length - 1)) {
        chunkWords.push("linh");
      } else if (b === 1) {
        chunkWords.push("mười");
      } else if (b > 1) {
        chunkWords.push(words[b], "mươi");
      }
      
      if (a === 1 && b > 1) chunkWords.push("mốt");
      else if (a === 5 && b > 0) chunkWords.push("lăm");
      else if (a !== 0 || (a === 0 && b === 0 && c === 0 && i === 0)) {
         if (a !== 0) chunkWords.push(words[a]);
      }
      
      if (chunkWords.length > 0) {
        result.push(...chunkWords, units[i]);
      }
    }
  }
  
  let finalStr = result.reverse().join(" ").trim();
  finalStr = finalStr.replace(/^không trăm linh /, "");
  finalStr = finalStr.replace(/^không trăm /, "");
  finalStr = finalStr.charAt(0).toUpperCase() + finalStr.slice(1);
  return finalStr + " đồng chẵn./.";
}

const defaultSlipData = {
  user_id: "",
  base_salary: 0,
  working_days: 26,
  leave_days: 0,
  actual_base_pay: 0,
  kpi_score: 100,
  salary_coefficient: 1.0,
  revenue_target: 0,
  revenue_actual: 0,
  revenue_bonus: 0,
  travel_allowance: 0,
  hot_bonus: 0,
  other_bonus: 0,
  insurance_deduction: 0,
  tax_deduction: 0,
  union_deduction: 0,
  advance_deduction: 0,
  arrears_deduction: 0,
  net_pay: 0,
  note: "",
};

const getStandardWorkingDays = (yearMonth: string) => {
  if (!yearMonth) return 26;
  const [year, month] = yearMonth.split('-').map(Number);
  
  // Lùi lại 1 tháng (vì lương tháng N trả cho công làm việc của tháng N-1)
  let targetYear = year;
  let targetMonth = month - 1;
  if (targetMonth === 0) {
    targetMonth = 12;
    targetYear -= 1;
  }

  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  let standardDays = daysInMonth;
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(targetYear, targetMonth - 1, i);
    if (date.getDay() === 0) { // Chủ nhật
      standardDays--;
    }
  }
  return standardDays;
};

export default function PayrollPage() {
  const [slips, setSlips] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // App state
  const { user, loading: authLoading } = useAuth();
  const [activeBranch, setActiveBranch] = useState("Việt Trì 1");
  const activeRole = user?.role || "User";
  const currentUser = user?.full_name || "Guest";

  // UI state
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7)); // "YYYY-MM"
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Form State
  const [slipData, setSlipData] = useState<any>(defaultSlipData);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.branch_id) {
      setActiveBranch(user.branch_id);
    }
  }, [user]);

  const GLOBAL_ROLES = ['Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống'];
  const isGlobalRole = GLOBAL_ROLES.includes(activeRole);
  const canApprove = activeRole === "Super Admin";

  const isAllowedToView = ["Super Admin", "Kế toán HO", "Admin"].includes(activeRole);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    
    const branchToFilter = isGlobalRole ? activeBranch : (user?.branch_id || "none");

    if (branchToFilter === "none") {
      setUsers([]);
      setSlips([]);
      setLoading(false);
      return;
    }

    // Fetch users for branch
    let usersQuery = supabase.from("users").select("id, full_name, nickname, branch_id, department, position, role, status, base_salary, insurance_salary, bank_account, bank_owner, bank_name, bank_branch");
    if (branchToFilter.includes(",")) {
      const branches = branchToFilter.split(",").map(b => b.trim()).filter(Boolean);
      usersQuery = usersQuery.or(branches.map(b => `branch_id.ilike.%${b}%`).join(','));
    } else {
      usersQuery = usersQuery.ilike("branch_id", `%${branchToFilter}%`);
    }
    const { data: usersData } = await usersQuery;
    if (usersData) setUsers(usersData);

    // Fetch slips for month and branch
    let slipsQuery = supabase
      .from("payroll_slips")
      .select("*, users(full_name, department, position)")
      .eq("month", filterMonth)
      .order("created_at", { ascending: false });

    if (branchToFilter.includes(",")) {
      const branches = branchToFilter.split(",").map(b => b.trim()).filter(Boolean);
      slipsQuery = slipsQuery.in("branch_id", branches);
    } else {
      slipsQuery = slipsQuery.eq("branch_id", branchToFilter);
    }

    const { data: slipsData } = await slipsQuery;
    if (slipsData) setSlips(slipsData);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [activeBranch, filterMonth, authLoading, isGlobalRole]);

  // Recalculate Actual Base Pay & Net Pay
  useEffect(() => {
    const workingDaysStandard = getStandardWorkingDays(filterMonth);
    
    const coeff = Number(slipData.salary_coefficient) || 1.0;
    const kpiRate = (Number(slipData.kpi_score) || 0) / 100;
    const wDays = Number(slipData.working_days) || 0;
    const lDays = Number(slipData.leave_days) || 0;
    const bSalary = Number(slipData.base_salary) || 0;
    
    // Tiền lương thực tế = (Lương cơ bản / Ngày công chuẩn) * (Ngày công + Ngày phép) * KPI * Hệ số
    const actualBase = Math.round((bSalary / workingDaysStandard) * (wDays + lDays) * kpiRate * coeff) || 0;
    
    const totalBonus = (Number(slipData.revenue_bonus) || 0) + (Number(slipData.travel_allowance) || 0) + (Number(slipData.hot_bonus) || 0) + (Number(slipData.other_bonus) || 0);
    const totalDeduction = (Number(slipData.insurance_deduction) || 0) + (Number(slipData.tax_deduction) || 0) + (Number(slipData.union_deduction) || 0) + (Number(slipData.advance_deduction) || 0) + (Number(slipData.arrears_deduction) || 0);
    
    const net = actualBase + totalBonus - totalDeduction;
    
    setSlipData((prev: any) => ({
      ...prev,
      actual_base_pay: actualBase,
      net_pay: net > 0 ? net : 0
    }));
  }, [
    slipData.base_salary, slipData.working_days, slipData.leave_days, 
    slipData.kpi_score, slipData.salary_coefficient,
    slipData.revenue_bonus, slipData.travel_allowance, slipData.hot_bonus, slipData.other_bonus,
    slipData.insurance_deduction, slipData.tax_deduction, slipData.union_deduction, slipData.advance_deduction, slipData.arrears_deduction
  ]);

  const handleUserSelect = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Gợi ý dữ liệu
    const insuranceDeduction = Math.round((user.insurance_salary || 0) * 0.105);
    const newSlip = { 
      ...slipData, 
      user_id: userId, 
      base_salary: user.base_salary || 0,
      insurance_deduction: insuranceDeduction
    };
    
    // Thử quét dữ liệu Sổ quỹ Tạm ứng trong tháng
    const startDate = `${filterMonth}-01`;
    const endDate = `${filterMonth}-31`; // Approx
    
    const { data: cashData } = await supabase
      .from("cashbooks")
      .select("amount")
      .eq("branch_id", activeBranch)
      .eq("type", "Chi")
      .ilike("category_name", "%Tạm ứng%")
      .ilike("note", `%${user.full_name}%`)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);
      
    if (cashData && cashData.length > 0) {
      newSlip.advance_deduction = cashData.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    }
    
    // Thử quét doanh thu thực hiện
    const { data: recData } = await supabase
      .from("receipts")
      .select("amount")
      .eq("branch_id", activeBranch)
      .eq("type", "Thu")
      .eq("created_by", user.full_name)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);
      
    if (recData && recData.length > 0) {
      newSlip.revenue_actual = recData.reduce((sum: number, item: any) => sum + Number(item.amount), 0);
    }

    setSlipData(newSlip);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!slipData.user_id) {
      alert("Vui lòng chọn nhân viên!");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Loại bỏ object users (do Supabase trả về lúc fetch) để tránh lỗi schema
      const { users, ...cleanData } = slipData;
      
      const payload = {
        ...cleanData,
        month: filterMonth,
        branch_id: activeBranch,
        created_by: currentUser,
        actual_base_pay: Number(cleanData.actual_base_pay) || 0,
        net_pay: Number(cleanData.net_pay) || 0,
      };
      
      console.log("Saving slip:", payload);
      
      if (editingId) {
        const { error } = await supabase.from("payroll_slips").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("payroll_slips").insert([payload]);
        if (error) throw error;
      }
      
      alert("Lưu phiếu lương thành công!");
      setShowModal(false);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error("Error saving slip:", err);
      alert("Lỗi lưu phiếu lương: " + (err.message || JSON.stringify(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phiếu lương này? Mọi dữ liệu sẽ không thể khôi phục.")) return;
    try {
      const { error } = await supabase.from("payroll_slips").delete().eq("id", id);
      if (error) throw error;
      alert("Xóa phiếu lương thành công!");
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  const handleApprove = async (id: string) => {
    if (!window.confirm("Sau khi DUYỆT, phiếu lương sẽ chốt và không thể sửa (trừ Super Admin). Đồng ý?")) return;
    try {
      const { error } = await supabase.from("payroll_slips").update({ status: 'Đã duyệt' }).eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Lỗi duyệt phiếu: " + err.message);
    }
  };

  const filteredSlips = slips.filter(s => {
    if (!searchTerm) return true;
    return s.users?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalPayroll = filteredSlips.reduce((sum, s) => sum + Number(s.net_pay), 0);

  if (authLoading || loading) return <div className="payroll-container"><div className="loading-spinner" style={{ margin: "3rem auto" }}></div></div>;

  if (!isAllowedToView) {
    return (
      <div className="payroll-container" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2 style={{ color: 'var(--danger)' }}>Truy cập bị từ chối</h2>
        <p>Bạn không có quyền xem Bảng lương & KPI.</p>
      </div>
    );
  }

  return (
    <div className="payroll-container animate-fade-in">
      <div className="no-print">
        <div className="page-header">
        <div>
          <h1>Bảng Lương & KPI</h1>
          <p className="text-muted">Quản lý phiếu lương, KPI và thưởng phạt của nhân sự.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSlipData(defaultSlipData); setEditingId(null); setShowModal(true); }}>
          <Plus size={20} />
          <span>Lập Phiếu Lương</span>
        </button>
      </div>

      <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {isGlobalRole && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Cơ sở:</span>
            <select 
              className="form-input" 
              style={{ width: 'auto', fontWeight: 'bold', color: 'var(--primary)' }}
              value={activeBranch}
              onChange={e => {
                setActiveBranch(e.target.value);
              }}
            >
              <option value="Việt Trì 1">Việt Trì 1</option>
              <option value="Việt Trì 2">Việt Trì 2</option>
              <option value="Lâm Thao">Lâm Thao</option>
              <option value="Tuyên Quang">Tuyên Quang</option>
              <option value="Dân Hòa">Dân Hòa</option>
            </select>
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Tháng:</span>
          <input 
            type="month" 
            className="form-input" 
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
          />
        </div>

        <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Tìm theo tên nhân sự..." 
            className="search-input" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card glass-panel">
          <h3 className="text-muted">Tổng Quỹ Lương ({filterMonth})</h3>
          <p className="stat-value text-primary">{totalPayroll.toLocaleString('vi-VN')} đ</p>
          <div className="stat-change text-muted">Có {filteredSlips.length} nhân sự</div>
        </div>
        <div className="stat-card glass-panel">
          <h3 className="text-muted">Đã Duyệt</h3>
          <p className="stat-value text-success">{filteredSlips.filter(s => s.status === 'Đã duyệt').length} phiếu</p>
        </div>
        <div className="stat-card glass-panel">
          <h3 className="text-muted">Chờ Duyệt</h3>
          <p className="stat-value text-warning">{filteredSlips.filter(s => s.status === 'Chờ duyệt').length} phiếu</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="payroll-table">
            <thead>
              <tr>
                <th>Nhân viên</th>
                <th>Phòng ban</th>
                <th className="number-col">Ngày công</th>
                <th className="number-col">KPI (%)</th>
                <th className="number-col">Thực nhận (VNĐ)</th>
                <th>Trạng thái</th>
                <th style={{ width: '150px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlips.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>
                    {s.users?.full_name}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.users?.position}</div>
                  </td>
                  <td>{s.users?.department}</td>
                  <td className="number-col">{s.working_days} / {getStandardWorkingDays(s.month || filterMonth)}</td>
                  <td className="number-col">{s.kpi_score}%</td>
                  <td className="number-col" style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {Number(s.net_pay).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <span className={`status-badge ${s.status === 'Đã duyệt' ? 'da-duyet' : 'cho-duyet'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => {
                        setEditingId(s.id);
                        setSlipData(s);
                        setShowModal(true);
                      }}>
                        Chi tiết
                      </button>
                      {(s.status === 'Chờ duyệt' || canApprove) && (
                        <button className="btn btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px' }} onClick={() => handleDelete(s.id)}>
                          Xóa
                        </button>
                      )}
                      {s.status === 'Chờ duyệt' && canApprove && (
                        <button className="btn btn-sm btn-primary" style={{ background: 'var(--success)', borderColor: 'var(--success)' }} onClick={() => handleApprove(s.id)}>
                          <CheckCircle size={16} /> Duyệt
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSlips.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có phiếu lương nào trong tháng {filterMonth}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      </div>

      {/* MODAL LẬP PHIẾU LƯƠNG */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '950px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ flexShrink: 0 }}>
              <h2>{editingId ? "Chi tiết Phiếu Lương" : "Lập Phiếu Lương Mới"}</h2>
              <button type="button" className="close-btn" onClick={() => setShowModal(false)}><X size={24} /></button>
            </div>
            
            <div className="modal-form" style={{ overflowY: 'auto', flex: 1, padding: '1.5rem' }}>
              {(slipData.status === 'Đã duyệt' && !canApprove) && (
                <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--primary)' }}>
                  <AlertCircle size={20} /> Phiếu này đã được PHÊ DUYỆT, Kế toán có thể thực hiện lệnh chuyển tiền
                </div>
              )}
              {isGlobalRole && !editingId && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Cơ sở / Chi nhánh *</label>
                  <select 
                    className="form-input" 
                    style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}
                    value={activeBranch}
                    onChange={e => {
                      setActiveBranch(e.target.value);
                      setSlipData({...slipData, user_id: ""}); // Reset user when branch changes
                    }}
                  >
                    <option value="Việt Trì 1">Việt Trì 1</option>
                    <option value="Việt Trì 2">Việt Trì 2</option>
                    <option value="Lâm Thao">Lâm Thao</option>
                    <option value="Tuyên Quang">Tuyên Quang</option>
                    <option value="Dân Hòa">Dân Hòa</option>
                  </select>
                </div>
              )}
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label">Chọn Nhân sự *</label>
                <select className="form-input" style={{ fontSize: '1.1rem', fontWeight: 600 }} required value={slipData.user_id} onChange={e => handleUserSelect(e.target.value)} disabled={!!editingId}>
                  <option value="">-- Chọn nhân viên --</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.full_name} ({u.position})</option>
                  ))}
                </select>
                {!editingId && slipData.user_id && (
                  <small className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem' }}>
                    <CheckCircle size={14} /> Hệ thống đã tự động gợi ý Doanh số thực tế và Tạm ứng (nếu có).
                  </small>
                )}
              </div>

              <div className="doc-payslip" style={{ pointerEvents: (slipData.status === 'Đã duyệt' && !canApprove) ? 'none' : 'auto', opacity: (slipData.status === 'Đã duyệt' && !canApprove) ? 0.8 : 1 }}>
                
                <div className="print-header">
                  <h4>TRUNG TÂM ANH NGỮ QUỐC TẾ & KỸ NĂNG SỐNG VIC EDU</h4>
                </div>

                <div className="doc-header">
                  <div className="doc-title">PHIẾU THANH TOÁN TIỀN LƯƠNG</div>
                  <div className="doc-month">Tháng {filterMonth.split('-')[1]}/{filterMonth.split('-')[0]}</div>
                </div>

                <div className="doc-grid-2">
                  {/* BẢNG TRÁI: THÔNG TIN */}
                  <table className="doc-table">
                    <tbody>
                      <tr>
                        <td className="label-cell" style={{ width: '40%' }}>Mã Nhân Viên</td>
                        <td className="value-cell" style={{ fontWeight: 'bold' }}>{users.find(u => u.id === slipData.user_id)?.id?.slice(0,8) || '---'}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Họ và Tên</td>
                        <td className="value-cell" style={{ fontWeight: 'bold' }}>{users.find(u => u.id === slipData.user_id)?.full_name || '---'}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Chức Danh</td>
                        <td className="value-cell">{users.find(u => u.id === slipData.user_id)?.position || '---'}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Bộ Phận</td>
                        <td className="value-cell">{users.find(u => u.id === slipData.user_id)?.department || '---'}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Doanh số được giao</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-center" placeholder="0" value={slipData.revenue_target ? Number(slipData.revenue_target).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, revenue_target: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* BẢNG PHẢI: THÔNG TIN */}
                  <table className="doc-table">
                    <tbody>
                      <tr>
                        <td className="label-cell" style={{ width: '50%' }}>Bậc lương</td>
                        <td className="value-cell">{users.find(u => u.id === slipData.user_id)?.position || '---'}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Ngày công đi làm thực tế</td>
                        <td className="value-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input type="number" className="doc-input text-center" step="0.5" min="0" max="31" value={slipData.working_days} onChange={e => setSlipData({...slipData, working_days: Number(e.target.value)})} style={{ width: '80px' }} />
                            <span style={{ color: 'var(--text-muted)' }}>/ {getStandardWorkingDays(filterMonth)} ngày</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="label-cell">Số ngày nghỉ phép</td>
                        <td className="value-cell">
                          <input type="number" className="doc-input text-center" step="0.5" min="0" max="31" value={slipData.leave_days} onChange={e => setSlipData({...slipData, leave_days: Number(e.target.value)})} />
                        </td>
                      </tr>
                      <tr>
                        <td className="label-cell">Hệ số Lương</td>
                        <td className="value-cell">
                           <input type="number" className="doc-input text-center" step="0.01" min="0" max="2" value={slipData.salary_coefficient} onChange={e => setSlipData({...slipData, salary_coefficient: Number(e.target.value)})} />
                        </td>
                      </tr>
                      <tr>
                        <td className="label-cell">% hoàn thành doanh số</td>
                        <td className="value-cell">
                          {slipData.revenue_target ? Math.round((slipData.revenue_actual / slipData.revenue_target) * 100) : 0}%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="doc-grid-2">
                  {/* BẢNG TRÁI: THU NHẬP */}
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>STT</th>
                        <th style={{ width: '55%' }}>Các Khoản Thu Nhập</th>
                        <th style={{ width: '35%' }}>Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-center font-bold">1</td>
                        <td className="font-bold">Tiền lương thực tế</td>
                        <td className="number-cell font-bold">{slipData.actual_base_pay.toLocaleString('vi-VN')}</td>
                      </tr>
                      <tr>
                        <td className="text-center">1.1</td>
                        <td>KPIs (%)</td>
                        <td className="value-cell">
                           <input type="number" className="doc-input text-center" step="any" min="0" max="200" value={slipData.kpi_score} onChange={e => {
                             let val = e.target.value;
                             if (val.length > 1 && val.startsWith('0') && !val.startsWith('0.')) {
                               val = val.replace(/^0+/, '');
                             }
                             setSlipData({...slipData, kpi_score: val === '' ? '' : Number(val)});
                           }} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center">1.2</td>
                        <td>Doanh số thực hiện (Ghi nhận)</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.revenue_actual ? Number(slipData.revenue_actual).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, revenue_actual: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center">1.3</td>
                        <td>Lương Cố định theo HĐ</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.base_salary ? Number(slipData.base_salary).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, base_salary: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">2</td>
                        <td className="font-bold">Thưởng doanh thu</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.revenue_bonus ? Number(slipData.revenue_bonus).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, revenue_bonus: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">3</td>
                        <td className="font-bold">Công tác phí</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.travel_allowance ? Number(slipData.travel_allowance).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, travel_allowance: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">4</td>
                        <td className="font-bold">Thưởng nóng</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.hot_bonus ? Number(slipData.hot_bonus).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, hot_bonus: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">5</td>
                        <td className="font-bold">Thưởng khác</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.other_bonus ? Number(slipData.other_bonus).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, other_bonus: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="text-right font-bold" style={{ paddingRight: '1rem' }}>Tổng thu nhập (1):</td>
                        <td className="number-cell font-bold">
                          {(slipData.actual_base_pay + slipData.revenue_bonus + slipData.travel_allowance + slipData.hot_bonus + slipData.other_bonus).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* BẢNG PHẢI: KHẤU TRỪ */}
                  <table className="doc-table">
                    <thead>
                      <tr>
                        <th style={{ width: '10%' }}>STT</th>
                        <th style={{ width: '55%' }}>Các Khoản Trừ vào Lương</th>
                        <th style={{ width: '35%' }}>Số Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="text-center font-bold">1</td>
                        <td className="font-bold">Bảo Hiểm Bắt Buộc (10.5%)</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.insurance_deduction ? Number(slipData.insurance_deduction).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, insurance_deduction: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center">1.1</td>
                        <td>Bảo hiểm xã hội (8%)</td>
                        <td className="number-cell" style={{ color: 'var(--text-muted)' }}>{slipData.insurance_deduction ? Math.round((slipData.insurance_deduction / 10.5) * 8).toLocaleString('vi-VN') : '---'}</td>
                      </tr>
                      <tr>
                        <td className="text-center">1.2</td>
                        <td>Bảo hiểm y tế (1,5%)</td>
                        <td className="number-cell" style={{ color: 'var(--text-muted)' }}>{slipData.insurance_deduction ? Math.round((slipData.insurance_deduction / 10.5) * 1.5).toLocaleString('vi-VN') : '---'}</td>
                      </tr>
                      <tr>
                        <td className="text-center">1.3</td>
                        <td>Bảo hiểm thất nghiệp (1%)</td>
                        <td className="number-cell" style={{ color: 'var(--text-muted)' }}>{slipData.insurance_deduction ? Math.round((slipData.insurance_deduction / 10.5) * 1).toLocaleString('vi-VN') : '---'}</td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">2</td>
                        <td className="font-bold">Thuế Thu Nhập Cá Nhân</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.tax_deduction ? Number(slipData.tax_deduction).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, tax_deduction: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">3</td>
                        <td className="font-bold">Công đoàn</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.union_deduction ? Number(slipData.union_deduction).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, union_deduction: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">4</td>
                        <td className="font-bold">Tạm ứng</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.advance_deduction ? Number(slipData.advance_deduction).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, advance_deduction: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td className="text-center font-bold">5</td>
                        <td className="font-bold">Truy thu</td>
                        <td className="value-cell">
                           <input type="text" className="doc-input text-right font-bold" style={{ paddingRight: '1rem' }} placeholder="0" value={slipData.arrears_deduction ? Number(slipData.arrears_deduction).toLocaleString('vi-VN') : ''} onChange={e => { const val = e.target.value.replace(/[^0-9]/g, ''); setSlipData({...slipData, arrears_deduction: val ? Number(val) : 0})}} />
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="text-right font-bold" style={{ paddingRight: '1rem' }}>Tổng trừ (2):</td>
                        <td className="number-cell font-bold">
                          {(slipData.insurance_deduction + slipData.tax_deduction + slipData.union_deduction + slipData.advance_deduction + slipData.arrears_deduction).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="doc-footer">
                  <div className="doc-footer-row" style={{ marginTop: '1rem', fontWeight: 'bold' }}>
                    <span style={{ display: 'inline-block', width: '300px', textAlign: 'right' }}>Tổng Số Tiền Lương Thực Nhận (1)-(2) :</span>
                    <span style={{ fontSize: '1.2rem', paddingLeft: '1rem' }}>{slipData.net_pay.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="doc-footer-row">
                    <span style={{ display: 'inline-block', width: '300px', textAlign: 'right', fontStyle: 'italic' }}>Bằng chữ :</span>
                    <span style={{ paddingLeft: '1rem', fontStyle: 'italic', fontWeight: 'bold' }}>{readNumberVN(slipData.net_pay)}</span>
                  </div>
                </div>

                {slipData.status === 'Đã duyệt' && slipData.user_id && (
                  <div style={{ marginTop: '2rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '8px', border: '2px dashed var(--primary)' }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontSize: '1.1rem', textTransform: 'uppercase' }}>Thông Tin Chuyển Khoản (Dành cho Kế toán HO)</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1rem', fontSize: '1.05rem' }}>
                      <div><span style={{ color: 'var(--text-muted)' }}>Chủ tài khoản:</span><br/><strong>{users.find(u => u.id === slipData.user_id)?.bank_owner || 'Chưa cập nhật'}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Số tài khoản:</span><br/><strong style={{ fontSize: '1.3rem', color: 'var(--primary)' }}>{users.find(u => u.id === slipData.user_id)?.bank_account || 'Chưa cập nhật'}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Ngân hàng:</span><br/><strong>{users.find(u => u.id === slipData.user_id)?.bank_name || 'Chưa cập nhật'}</strong></div>
                      <div><span style={{ color: 'var(--text-muted)' }}>Chi nhánh NH:</span><br/><strong>{users.find(u => u.id === slipData.user_id)?.bank_branch || 'Chưa cập nhật'}</strong></div>
                    </div>
                  </div>
                )}

                <div className="doc-signatures">
                  <div className="sign-box">
                    <div className="sign-title">Phê duyệt</div>
                    <div className="sign-sub">(Ký, họ tên)</div>
                  </div>
                  <div className="sign-box">
                    <div className="sign-title">Người nhận</div>
                    <div className="sign-sub">(Ký, họ tên)</div>
                  </div>
                  <div className="sign-box">
                    <div className="sign-title">Kế toán</div>
                    <div className="sign-sub">(Ký, họ tên)</div>
                  </div>
                </div>
                
                <div className="no-print" style={{ marginTop: '2rem', borderTop: '1px dashed #ccc', paddingTop: '1rem' }}>
                  <input type="text" className="doc-input" style={{ fontStyle: 'italic', color: '#666' }} placeholder="Ghi chú thêm cho hệ thống (không in ra phiếu)..." value={slipData.note} onChange={e => setSlipData({...slipData, note: e.target.value})} />
                </div>
              </div>

              <div className="modal-actions no-print" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => window.print()}>
                  <Printer size={16} /> In Phiếu
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy bỏ</button>
                {(slipData.status === 'Chờ duyệt' || !editingId || canApprove) ? (
                   <button type="button" className="btn btn-primary" disabled={isSubmitting} onClick={handleSubmit}>
                     {isSubmitting ? "Đang lưu..." : "Lưu Phiếu Lương"}
                   </button>
                ) : (
                   <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
                     <AlertCircle size={16} /> Phiếu đã duyệt, không thể sửa
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

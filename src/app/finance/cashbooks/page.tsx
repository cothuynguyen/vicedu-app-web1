"use client";

import { useState, useEffect } from "react";
import { Plus, Search, CheckCircle, XCircle, ArrowRightLeft, Landmark, Edit, Trash2, Paperclip, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { getParentCategories, getChildCategories, CASHBOOK_CATEGORIES } from "@/constants/cashbookCategories";
import { compressImage } from "@/utils/imageCompressor";
import { uploadImageToCloudflare } from "@/utils/uploadImage";
import "./Cashbooks.css";

const defaultFormData = {
  transaction_date: new Date().toISOString().split('T')[0],
  type: "Chi",
  amount: 0,
  category_parent_id: "",
  category_id: "",
  category_name: "",
  content: "",
  note: "",
  receipt_images: [] as string[]
};

const defaultTransferData = {
  transaction_date: new Date().toISOString().split('T')[0],
  amount: 0,
  content: "Cấp vốn/Nhập quỹ từ Trung tâm xuống Kế toán chi nhánh",
  note: "",
  receipt_images: [] as string[]
};

export default function CashbooksPage() {
  const [cashbooks, setCashbooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState("Quỹ Kế toán");
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(defaultFormData);
  const [transferData, setTransferData] = useState(defaultTransferData);

  // Image Uploading & Lightbox State
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadingTransfer, setUploadingTransfer] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterType, setFilterType] = useState("Tất cả");
  const [filterParentCat, setFilterParentCat] = useState("Tất cả");
  const [filterChildCat, setFilterChildCat] = useState("Tất cả");

  const { user, loading: authLoading } = useAuth();
  const [activeBranch, setActiveBranch] = useState("Việt Trì 1");
  const activeRole = user?.role || "User";
  const currentUser = user?.full_name || "Guest";

  useEffect(() => {
    if (user?.branch_id) {
      setActiveBranch(user.branch_id);
    }
  }, [user]);

  const GLOBAL_ROLES = ['Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống'];
  const isGlobalRole = GLOBAL_ROLES.includes(activeRole);
  const canApprove = ["Super Admin", "Admin"].includes(activeRole);
  const isBranchAccountant = activeRole === "Kế toán Chi nhánh";
  const canSeeCentralFund = ["Super Admin", "Admin"].includes(activeRole);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    
    const branchToFilter = isGlobalRole ? activeBranch : (user?.branch_id || "none");
    if (branchToFilter === "none") {
      setCashbooks([]);
      setLoading(false);
      return;
    }

    let query = supabase.from("cashbooks").select("*").order("created_at", { ascending: false });
    if (branchToFilter.includes(",")) {
      const branches = branchToFilter.split(",").map(b => b.trim()).filter(Boolean);
      query = query.in("branch_id", branches);
    } else {
      query = query.eq("branch_id", branchToFilter);
    }
    
    const { data } = await query;
    if (data) setCashbooks(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [activeBranch, isGlobalRole, authLoading, user]);

  // Derived state for categories
  const parentCategories = getParentCategories(formData.type as 'Thu' | 'Chi');
  const childCategories = formData.category_parent_id ? getChildCategories(formData.category_parent_id) : [];

  const handleParentCategoryChange = (e: any) => {
    setFormData({
      ...formData,
      category_parent_id: e.target.value,
      category_id: "",
      category_name: ""
    });
  };

  const handleChildCategoryChange = (e: any) => {
    const cat = childCategories.find(c => c.id === e.target.value);
    setFormData({
      ...formData,
      category_id: e.target.value,
      category_name: cat ? cat.name : ""
    });
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingReceipt(true);
    try {
      const newImages = [...(formData.receipt_images || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await compressImage(file);
        const imageUrl = await uploadImageToCloudflare(compressedFile);
        newImages.push(imageUrl);
      }

      setFormData({ ...formData, receipt_images: newImages });
    } catch (err: any) {
      alert("Lỗi upload ảnh chứng từ: " + err.message);
    } finally {
      setUploadingReceipt(false);
      e.target.value = "";
    }
  };

  const removeReceiptImage = (indexToRemove: number) => {
    const newImages = (formData.receipt_images || []).filter((_, idx) => idx !== indexToRemove);
    setFormData({ ...formData, receipt_images: newImages });
  };

  const handleTransferUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingTransfer(true);
    try {
      const newImages = [...(transferData.receipt_images || [])];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await compressImage(file);
        const imageUrl = await uploadImageToCloudflare(compressedFile);
        newImages.push(imageUrl);
      }

      setTransferData({ ...transferData, receipt_images: newImages });
    } catch (err: any) {
      alert("Lỗi upload ảnh chứng từ chuyển quỹ: " + err.message);
    } finally {
      setUploadingTransfer(false);
      e.target.value = "";
    }
  };

  const removeTransferImage = (indexToRemove: number) => {
    const newImages = (transferData.receipt_images || []).filter((_, idx) => idx !== indexToRemove);
    setTransferData({ ...transferData, receipt_images: newImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id) {
      alert("Vui lòng chọn Hạng mục chi tiết!");
      return;
    }
    
    // Bảo vệ Chi nhánh: Chỉ cho phép lưu vào chi nhánh của bản thân nếu không có quyền Global
    const branchToSave = isGlobalRole ? activeBranch : (user?.branch_id || "");
    if (!branchToSave) {
      alert("Không xác định được chi nhánh để lưu phiếu!");
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Xác định trạng thái dựa trên Role và Quỹ
      let status = "Đã kiểm tra";
      if (activeTab === "Quỹ Kế toán" && isBranchAccountant) {
        status = "Chờ duyệt"; // Kế toán tạo vào quỹ kế toán thì chờ duyệt
      }

      const payload = {
        branch_id: branchToSave,
        transaction_date: formData.transaction_date,
        type: formData.type,
        amount: formData.amount,
        category_id: formData.category_id,
        category_name: formData.category_name,
        content: formData.content,
        note: formData.note,
        fund_type: activeTab,
        status: status,
        created_by: currentUser,
        checked_by: status === "Đã kiểm tra" ? currentUser : null,
        receipt_images: formData.receipt_images || []
      };

      if (editingId) {
        // Kiểm tra quyền sửa chéo chi nhánh
        const { data: existingItem } = await supabase.from("cashbooks").select("branch_id").eq("id", editingId).maybeSingle();
        if (existingItem && !isGlobalRole && user?.branch_id !== existingItem.branch_id) {
          alert("Bạn không có quyền sửa phiếu của chi nhánh khác!");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.from("cashbooks").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cashbooks").insert([payload]);
        if (error) throw error;
      }

      setShowModal(false);
      setEditingId(null);
      setFormData(defaultFormData);
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi lưu: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferData.amount <= 0) {
      alert("Số tiền phải lớn hơn 0"); return;
    }
    
    // Bảo vệ Chi nhánh cho chuyển quỹ nội bộ
    const branchToSave = isGlobalRole ? activeBranch : (user?.branch_id || "");
    if (!branchToSave) {
      alert("Không xác định được chi nhánh để chuyển quỹ!");
      return;
    }

    setIsSubmitting(true);
    try {
      // Tạo 1 Phiếu Chi ở Quỹ Trung Tâm
      const chiPayload = {
        branch_id: branchToSave,
        transaction_date: transferData.transaction_date,
        type: "Chi",
        amount: transferData.amount,
        category_id: "10101", // Xuất tiền cho Kế toán chi tiêu
        category_name: "Xuất tiền cho Kế toán chi tiêu",
        content: transferData.content,
        note: transferData.note,
        fund_type: "Quỹ Trung tâm",
        status: "Đã kiểm tra",
        created_by: currentUser,
        checked_by: currentUser,
        receipt_images: transferData.receipt_images || []
      };

      // Tạo 1 Phiếu Thu ở Quỹ Kế toán
      const thuPayload = {
        branch_id: branchToSave,
        transaction_date: transferData.transaction_date,
        type: "Thu",
        amount: transferData.amount,
        category_id: "10912", // Nhập quỹ Kế toán
        category_name: "Nhập quỹ Kế toán",
        content: transferData.content,
        note: transferData.note,
        fund_type: "Quỹ Kế toán",
        status: "Đã kiểm tra", // Chuyển quỹ nội bộ mặc định đã kiểm tra
        created_by: currentUser,
        checked_by: currentUser,
        receipt_images: transferData.receipt_images || []
      };

      const { error } = await supabase.from("cashbooks").insert([chiPayload, thuPayload]);
      if (error) throw error;

      setShowTransferModal(false);
      setTransferData(defaultTransferData);
      fetchData();
    } catch (err: any) {
      alert("Lỗi chuyển quỹ: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string, newStatus: string, itemBranchId: string) => {
    if (!canApprove) return;
    
    // Chặn duyệt chéo chi nhánh (trừ Global Roles)
    if (!isGlobalRole && user?.branch_id !== itemBranchId) {
      alert("Bạn không có quyền duyệt phiếu của chi nhánh khác!");
      return;
    }

    if (newStatus === "Từ chối" && !window.confirm("Bạn có chắc chắn muốn TỪ CHỐI phiếu này không?")) return;
    
    try {
      const { error } = await supabase.from("cashbooks").update({
        status: newStatus,
        checked_by: currentUser
      }).eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Lỗi cập nhật trạng thái: " + err.message);
    }
  };

  const handleEdit = (item: any) => {
    // Chặn sửa chéo chi nhánh (trừ Global Roles)
    if (!isGlobalRole && user?.branch_id !== item.branch_id) {
      alert("Bạn không có quyền sửa phiếu của chi nhánh khác!");
      return;
    }

    const cat = CASHBOOK_CATEGORIES.find(c => c.id === item.category_id);
    setFormData({
      transaction_date: item.transaction_date,
      type: item.type,
      amount: item.amount,
      category_parent_id: cat ? cat.parentId || "" : "",
      category_id: item.category_id,
      category_name: item.category_name,
      content: item.content,
      note: item.note || "",
      receipt_images: item.receipt_images || []
    });
    setEditingId(item.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string, itemBranchId: string) => {
    // Chặn xóa chéo chi nhánh (trừ Global Roles)
    if (!isGlobalRole && user?.branch_id !== itemBranchId) {
      alert("Bạn không có quyền xóa phiếu của chi nhánh khác!");
      return;
    }

    if (!window.confirm("Bạn có chắc chắn muốn XÓA phiếu này không?")) return;
    try {
      const { error } = await supabase.from("cashbooks").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  // Tính toán hiển thị
  const filteredCashbooks = cashbooks.filter(item => {
    if (item.fund_type !== activeTab) return false;
    
    const matchSearch = searchTerm === "" || 
      item.content.toLowerCase().includes(searchTerm.toLowerCase()) || 
      item.category_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchMonth = true;
    if (filterMonth) {
      const itemMonth = item.transaction_date.substring(0, 7); // Gets "YYYY-MM"
      matchMonth = itemMonth === filterMonth;
    }
    
    const matchType = filterType === "Tất cả" || item.type === filterType;
    
    let matchCat = true;
    if (filterChildCat !== "Tất cả") {
      matchCat = item.category_id === filterChildCat;
    } else if (filterParentCat !== "Tất cả") {
      const childIds = CASHBOOK_CATEGORIES.filter(c => c.parentId === filterParentCat).map(c => c.id);
      matchCat = childIds.includes(item.category_id) || item.category_id === filterParentCat;
    }
    
    return matchSearch && matchMonth && matchType && matchCat;
  });

  // Tính số dư đầu kỳ (Lũy kế toàn bộ số liệu TRƯỚC tháng đang lọc)
  let openingBalance = 0;
  if (filterMonth) {
    const previousCashbooks = cashbooks.filter(item => {
      if (item.fund_type !== activeTab) return false;
      if (item.status === "Từ chối") return false;
      const itemMonth = item.transaction_date.substring(0, 7);
      return itemMonth < filterMonth;
    });
    const prevIncome = previousCashbooks.filter(i => i.type === "Thu").reduce((s, i) => s + Number(i.amount), 0);
    const prevExpense = previousCashbooks.filter(i => i.type === "Chi").reduce((s, i) => s + Number(i.amount), 0);
    openingBalance = prevIncome - prevExpense;
  }

  const totalIncome = filteredCashbooks.filter(i => i.type === "Thu" && i.status !== "Từ chối").reduce((s, i) => s + Number(i.amount), 0);
  const totalExpense = filteredCashbooks.filter(i => i.type === "Chi" && i.status !== "Từ chối").reduce((s, i) => s + Number(i.amount), 0);
  const balance = openingBalance + totalIncome - totalExpense;

  return (
    <>
      <div className="animate-fade-in cashbooks-container">
      <div className="page-header">
        <div>
          <h1>Sổ Quỹ Thu Chi</h1>
          <p className="text-muted">Quản lý dòng tiền vận hành của Cơ sở (Thu/Chi nội bộ, Điện nước, Lương, MKT...)</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {canApprove && (
            <button className="btn btn-secondary" onClick={() => setShowTransferModal(true)}>
              <ArrowRightLeft size={20} />
              <span>Chuyển Quỹ nội bộ</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { setEditingId(null); setFormData(defaultFormData); setShowModal(true); }}>
            <Plus size={20} />
            <span>Lập Phiếu Thu/Chi</span>
          </button>
        </div>
      </div>

      <div className="cashbooks-tabs">
        {/* Kế toán HO không liên quan tới 2 quỹ này, nhưng nếu có quyền Super Admin thì vẫn xem */}
        <button 
          className={activeTab === "Quỹ Kế toán" ? "active" : ""} 
          onClick={() => setActiveTab("Quỹ Kế toán")}
        >
          Quỹ Kế Toán Chi Nhánh
        </button>
        {canSeeCentralFund && (
          <button 
            className={activeTab === "Quỹ Trung tâm" ? "active" : ""} 
            onClick={() => setActiveTab("Quỹ Trung tâm")}
          >
            Quỹ Trung Tâm (HO/Admin)
          </button>
        )}
      </div>

      <div className="cashbooks-stats">
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <span className="stat-title">Số dư đầu kỳ {filterMonth ? `(${filterMonth})` : ''}</span>
          <span className="stat-value" style={{ color: '#8b5cf6' }}>{openingBalance.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="stat-card income">
          <span className="stat-title">Thu trong kỳ</span>
          <span className="stat-value success">{totalIncome.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="stat-card expense">
          <span className="stat-title">Chi trong kỳ</span>
          <span className="stat-value danger">{totalExpense.toLocaleString('vi-VN')} đ</span>
        </div>
        <div className="stat-card balance">
          <span className="stat-title">Tồn Quỹ Cuối Kỳ</span>
          <span className="stat-value primary">{balance.toLocaleString('vi-VN')} đ</span>
        </div>
      </div>

      <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {isGlobalRole && (
          <select 
            className="form-input" 
            style={{ width: 'auto', fontWeight: 'bold', color: 'var(--primary)' }}
            value={activeBranch}
            onChange={e => {
              setActiveBranch(e.target.value);
            }}
          >
            <option value="Việt Trì 1">Cơ sở: Việt Trì 1</option>
            <option value="Việt Trì 2">Cơ sở: Việt Trì 2</option>
            <option value="Lâm Thao">Cơ sở: Lâm Thao</option>
            <option value="Tuyên Quang">Cơ sở: Tuyên Quang</option>
            <option value="Dân Hòa">Cơ sở: Dân Hòa</option>
          </select>
        )}
        <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Tìm theo nội dung, hạng mục..." 
            className="search-input" 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <select 
          className="form-input" 
          style={{ width: 'auto' }} 
          value={filterType} 
          onChange={e => { 
            setFilterType(e.target.value); 
            setFilterParentCat("Tất cả"); 
            setFilterChildCat("Tất cả"); 
          }}
        >
          <option value="Tất cả">Tất cả loại phiếu</option>
          <option value="Thu">Phiếu Thu</option>
          <option value="Chi">Phiếu Chi</option>
        </select>

        <select 
          className="form-input" 
          style={{ width: 'auto' }} 
          value={filterParentCat} 
          onChange={e => { 
            setFilterParentCat(e.target.value); 
            setFilterChildCat("Tất cả"); 
          }}
        >
          <option value="Tất cả">Tất cả Nhóm Hạng mục</option>
          {CASHBOOK_CATEGORIES.filter(c => c.parentId === null && (filterType === "Tất cả" || c.type === filterType)).map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {(filterParentCat !== "Tất cả" || filterType !== "Tất cả") && (
          <select 
            className="form-input" 
            style={{ width: 'auto' }} 
            value={filterChildCat} 
            onChange={e => setFilterChildCat(e.target.value)}
          >
            <option value="Tất cả">Tất cả Hạng mục con</option>
            {CASHBOOK_CATEGORIES.filter(c => {
              if (filterParentCat !== "Tất cả") {
                return c.parentId === filterParentCat;
              } else {
                return c.parentId !== null && c.type === filterType;
              }
            }).map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <input 
          type="month" 
          className="form-input" 
          style={{ width: 'auto' }}
          value={filterMonth}
          onChange={e => setFilterMonth(e.target.value)}
        />
      </div>

      <div className="glass-panel" style={{ padding: '0' }}>
        <div className="table-responsive">
          <table className="cashbooks-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Loại</th>
                <th>Hạng mục</th>
                <th>Nội dung</th>
                <th>Số tiền</th>
                <th>Trạng thái</th>
                <th style={{textAlign: 'right'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{textAlign: 'center', padding: '2rem'}}>Đang tải dữ liệu...</td></tr>
              ) : filteredCashbooks.length === 0 ? (
                <tr><td colSpan={7} style={{textAlign: 'center', padding: '2rem'}}>Chưa có dữ liệu giao dịch</td></tr>
              ) : (
                filteredCashbooks.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div>{new Date(item.transaction_date).toLocaleDateString('vi-VN')}</div>
                      <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px'}}>
                        Tạo bởi: <strong>{item.created_by || 'Hệ thống'}</strong>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${item.type === 'Thu' ? 'badge-success' : 'badge-danger'}`}>
                        {item.type}
                      </span>
                    </td>
                    <td>
                      <strong style={{ display: 'block' }}>{item.category_name}</strong>
                      {item.note && <small className="text-muted">{item.note}</small>}
                    </td>
                    <td>
                      <div>{item.content}</div>
                      {item.receipt_images && item.receipt_images.length > 0 && (
                        <div 
                          className="receipt-images-badge"
                          onClick={() => {
                            setLightboxImages(item.receipt_images);
                            setLightboxIndex(0);
                            setLightboxOpen(true);
                          }}
                        >
                          <Paperclip size={12} />
                          <span>Chứng từ ({item.receipt_images.length})</span>
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold', color: item.type === 'Thu' ? 'var(--success)' : 'var(--danger)' }}>
                      {item.type === 'Thu' ? '+' : '-'}{Number(item.amount).toLocaleString('vi-VN')}
                    </td>
                    <td>
                      <span className={`badge ${item.status === 'Đã kiểm tra' ? 'badge-success' : item.status === 'Chờ duyệt' ? 'badge-warning' : 'badge-danger'}`}>
                        {item.status}
                      </span>
                      {item.checked_by && item.status !== 'Chờ duyệt' && (
                        <div style={{fontSize: '0.75rem', marginTop: '4px', color: 'var(--text-muted)'}}>
                          Duyệt bởi: <strong>{item.checked_by}</strong>
                        </div>
                      )}
                    </td>
                    <td style={{textAlign: 'right'}}>
                      <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                        {item.status === 'Chờ duyệt' && canApprove && (isGlobalRole || user?.branch_id === item.branch_id) && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'var(--success)', color: 'white', padding: '0.25rem 0.5rem' }} onClick={() => handleApprove(item.id, 'Đã kiểm tra', item.branch_id)} title="Duyệt">
                              <CheckCircle size={16} /> Duyệt
                            </button>
                            <button className="btn btn-sm" style={{ background: 'var(--danger)', color: 'white', padding: '0.25rem 0.5rem' }} onClick={() => handleApprove(item.id, 'Từ chối', item.branch_id)} title="Từ chối">
                              <XCircle size={16} /> Từ chối
                            </button>
                          </>
                        )}
                        {(canApprove || item.status === 'Chờ duyệt') && (isGlobalRole || user?.branch_id === item.branch_id) && (
                          <>
                            <button className="btn btn-sm" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '0.25rem 0.5rem' }} onClick={() => handleEdit(item)} title="Sửa">
                              <Edit size={16} />
                            </button>
                            <button className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.25rem 0.5rem' }} onClick={() => handleDelete(item.id, item.branch_id)} title="Xóa">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Modal Lập Phiếu Thu/Chi */}
    {showModal && (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '600px' }}>
          <div className="modal-header">
            <h2>{editingId ? "Sửa" : "Lập"} Phiếu {formData.type} ({activeTab})</h2>
            <button className="close-btn" onClick={() => setShowModal(false)}>&times;</button>
          </div>
          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ngày giao dịch</label>
                <input type="date" className="form-input" required value={formData.transaction_date} onChange={e => setFormData({...formData, transaction_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Loại phiếu</label>
                <select className="form-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value, category_parent_id: '', category_id: '', category_name: ''})}>
                  <option value="Chi">Phiếu Chi</option>
                  <option value="Thu">Phiếu Thu</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Hạng mục cha</label>
                <select className="form-input" required value={formData.category_parent_id} onChange={handleParentCategoryChange}>
                  <option value="">-- Chọn nhóm Hạng mục --</option>
                  {parentCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Chi tiết</label>
                <select className="form-input" required value={formData.category_id} onChange={handleChildCategoryChange} disabled={!formData.category_parent_id}>
                  <option value="">-- Chọn Hạng mục chi tiết --</option>
                  {childCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Số tiền (VNĐ)</label>
              <input type="number" className="form-input" required min="1" value={formData.amount} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} onWheel={e => (e.target as HTMLInputElement).blur()} />
              {formData.amount > 0 && <small className="text-muted" style={{marginTop: '4px', display: 'block'}}>= {formData.amount.toLocaleString('vi-VN')} đ</small>}
            </div>

            <div className="form-group">
              <label className="form-label">Nội dung chi tiết</label>
              <textarea className="form-input" required rows={2} placeholder="Nhập rõ mục đích thu/chi..." value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú (Tùy chọn)</label>
              <input type="text" className="form-input" placeholder="Thông tin thêm..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
            </div>

            <div className="image-upload-section">
              <label className="form-label" style={{ fontWeight: 600 }}>Ảnh Hóa đơn / Chứng từ (Tự động nén tối ưu dung lượng)</label>
              <div 
                className="file-upload-box"
                onClick={() => document.getElementById("receipt-file-input")?.click()}
              >
                <Plus size={20} style={{ margin: '0 auto 0.5rem', display: 'block', color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {uploadingReceipt ? "Đang xử lý nén và tải lên..." : "Click để chọn hoặc chụp ảnh hóa đơn"}
                </span>
                <input 
                  type="file" 
                  id="receipt-file-input" 
                  multiple 
                  accept="image/*" 
                  style={{ display: "none" }} 
                  onChange={handleReceiptUpload} 
                  disabled={uploadingReceipt}
                />
              </div>

              {formData.receipt_images && formData.receipt_images.length > 0 && (
                <div className="image-preview-grid">
                  {formData.receipt_images.map((url, idx) => (
                    <div key={idx} className="image-preview-item">
                      <img src={url} alt={`Preview ${idx}`} className="image-preview-img" />
                      <button 
                        type="button" 
                        className="image-remove-btn" 
                        onClick={() => removeReceiptImage(idx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploadingReceipt}>
                {isSubmitting ? "Đang lưu..." : "Lưu Phiếu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Modal Chuyển Quỹ Nội Bộ */}
    {showTransferModal && (
      <div className="modal-overlay">
        <div className="modal-content" style={{ maxWidth: '500px' }}>
          <div className="modal-header">
            <h2>Chuyển Quỹ Nội Bộ</h2>
            <button className="close-btn" onClick={() => setShowTransferModal(false)}>&times;</button>
          </div>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--primary)' }}>
            <Landmark size={24} />
            <p style={{ margin: 0, fontSize: '0.9rem' }}>Thao tác này sẽ tự động sinh ra 1 <b>Phiếu Chi</b> ở Quỹ Trung Tâm và 1 <b>Phiếu Thu</b> ở Quỹ Kế toán chi nhánh.</p>
          </div>
          <form onSubmit={handleTransfer} className="modal-form">
            <div className="form-group">
              <label className="form-label">Ngày giao dịch</label>
              <input type="date" className="form-input" required value={transferData.transaction_date} onChange={e => setTransferData({...transferData, transaction_date: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Số tiền cần chuyển (VNĐ)</label>
              <input type="number" className="form-input" required min="1" value={transferData.amount} onChange={e => setTransferData({...transferData, amount: Number(e.target.value)})} onWheel={e => (e.target as HTMLInputElement).blur()} />
              {transferData.amount > 0 && <small className="text-muted" style={{marginTop: '4px', display: 'block'}}>= {transferData.amount.toLocaleString('vi-VN')} đ</small>}
            </div>
            <div className="form-group">
              <label className="form-label">Nội dung</label>
              <textarea className="form-input" required rows={2} value={transferData.content} onChange={e => setTransferData({...transferData, content: e.target.value})} />
            </div>

            <div className="image-upload-section">
              <label className="form-label" style={{ fontWeight: 600 }}>Ảnh chứng từ chuyển khoản / rút tiền</label>
              <div 
                className="file-upload-box"
                onClick={() => document.getElementById("transfer-file-input")?.click()}
              >
                <Plus size={20} style={{ margin: '0 auto 0.5rem', display: 'block', color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {uploadingTransfer ? "Đang xử lý nén và tải lên..." : "Click để chọn hoặc chụp ảnh chứng từ"}
                </span>
                <input 
                  type="file" 
                  id="transfer-file-input" 
                  multiple 
                  accept="image/*" 
                  style={{ display: "none" }} 
                  onChange={handleTransferUpload} 
                  disabled={uploadingTransfer}
                />
              </div>

              {transferData.receipt_images && transferData.receipt_images.length > 0 && (
                <div className="image-preview-grid">
                  {transferData.receipt_images.map((url, idx) => (
                    <div key={idx} className="image-preview-item">
                      <img src={url} alt={`Preview ${idx}`} className="image-preview-img" />
                      <button 
                        type="button" 
                        className="image-remove-btn" 
                        onClick={() => removeTransferImage(idx)}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Hủy</button>
              <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploadingTransfer}>
                {isSubmitting ? "Đang xử lý..." : "Thực hiện Chuyển quỹ"}
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Lightbox Viewer */}
    {lightboxOpen && lightboxImages.length > 0 && (
      <div className="lightbox-overlay" onClick={() => setLightboxOpen(false)}>
        <div className="lightbox-content" onClick={e => e.stopPropagation()}>
          <button className="lightbox-close" onClick={() => setLightboxOpen(false)}>&times;</button>
          
          <img 
            src={lightboxImages[lightboxIndex]} 
            alt={`Chứng từ ${lightboxIndex + 1}`} 
            className="lightbox-image" 
          />

          {lightboxImages.length > 1 && (
            <>
              <button 
                className="lightbox-nav prev" 
                onClick={() => setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                className="lightbox-nav next" 
                onClick={() => setLightboxIndex(prev => (prev + 1) % lightboxImages.length)}
              >
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <div className="lightbox-indicator">
            {lightboxIndex + 1} / {lightboxImages.length}
          </div>
        </div>
      </div>
    )}

  </>
);
}

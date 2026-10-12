"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Package, ArrowDownToLine, ArrowUpFromLine, Edit, Trash2, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { compressImage } from "@/utils/imageCompressor";
import { uploadImageToCloudflare } from "@/utils/uploadImage";
import "./Inventory.css";

const defaultItemData = {
  category: "Áo + Balo",
  name: "",
  unit: "chiếc",
  import_price: 0,
  export_price: 0,
  star_points: 0,
  min_stock: 5,
  note: "",
  image_url: ""
};

const defaultTransactionData = {
  item_id: "",
  transaction_date: new Date().toISOString().split('T')[0],
  type: "Nhập",
  quantity: 1,
  reason: "",
  note: ""
};

export default function InventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // UI State
  const [activeTab, setActiveTab] = useState("Tồn Kho");
  const [showItemModal, setShowItemModal] = useState(false);
  const [showTransModal, setShowTransModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form State
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingTransId, setEditingTransId] = useState<string | null>(null);
  const [itemData, setItemData] = useState(defaultItemData);
  const [transData, setTransData] = useState(defaultTransactionData);

  // Image Uploading & Lightbox State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  // Filters & Sorting
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tất cả");
  const [stockStatusFilter, setStockStatusFilter] = useState("Tất cả");
  const [minStockFilter, setMinStockFilter] = useState("");
  const [maxStockFilter, setMaxStockFilter] = useState("");
  const [stockSortOrder, setStockSortOrder] = useState<"none" | "asc" | "desc">("none");
  const [transSearchTerm, setTransSearchTerm] = useState("");
  const [transTypeFilter, setTransTypeFilter] = useState("Tất cả");
  const [transCategoryFilter, setTransCategoryFilter] = useState("Tất cả");

  const toggleStockSort = () => {
    setStockSortOrder(prev => {
      if (prev === "none") return "asc";
      if (prev === "asc") return "desc";
      return "none";
    });
  };

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
  const canManageCatalog = ["Super Admin", "Kế toán HO", "Admin", "Kế toán Chi nhánh"].includes(activeRole);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    
    const branchToFilter = isGlobalRole ? activeBranch : (user?.branch_id || "none");
    if (branchToFilter === "none") {
      setItems([]);
      setTransactions([]);
      setLoading(false);
      return;
    }

    // 1. Fetch Items for active branch
    let itemsQuery = supabase
      .from("inventory_items")
      .select("*")
      .order("category")
      .order("name");
    
    if (branchToFilter.includes(",")) {
      const branches = branchToFilter.split(",").map(b => b.trim()).filter(Boolean);
      itemsQuery = itemsQuery.in("branch_id", branches);
    } else {
      itemsQuery = itemsQuery.eq("branch_id", branchToFilter);
    }
    const { data: itemsData } = await itemsQuery;
    if (itemsData) setItems(itemsData);

    let transQuery = supabase
      .from("inventory_transactions")
      .select("*, inventory_items(name, category, unit, image_url)")
      .order("created_at", { ascending: false });

    if (branchToFilter.includes(",")) {
      const branches = branchToFilter.split(",").map(b => b.trim()).filter(Boolean);
      transQuery = transQuery.in("branch_id", branches);
    } else {
      transQuery = transQuery.eq("branch_id", branchToFilter);
    }
    const { data: transData } = await transQuery;
    if (transData) setTransactions(transData);
    
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [activeBranch, authLoading, isGlobalRole]);

  const handleItemImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const file = files[0];
      const compressedFile = await compressImage(file);
      const imageUrl = await uploadImageToCloudflare(compressedFile);
      setItemData({ ...itemData, image_url: imageUrl });
    } catch (err: any) {
      alert("Lỗi upload ảnh hàng hóa: " + err.message);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const removeItemImage = () => {
    setItemData({ ...itemData, image_url: "" });
  };

  // CATEGORY SUBMIT
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const branchToSave = isGlobalRole ? activeBranch : (user?.branch_id || "");
      if (!branchToSave) {
        alert("Không xác định được chi nhánh để lưu vật tư!");
        setIsSubmitting(false);
        return;
      }

      const payload: any = {
        ...itemData,
        star_points: Number(itemData.star_points) || 0,
        min_stock: Number(itemData.min_stock) >= 0 ? Number(itemData.min_stock) : 5,
        branch_id: branchToSave
      };

      if (editingItemId) {
        // Kiểm tra quyền sửa chéo chi nhánh
        const { data: existingItem } = await supabase.from("inventory_items").select("branch_id").eq("id", editingItemId).maybeSingle();
        if (existingItem && !isGlobalRole && user?.branch_id !== existingItem.branch_id) {
          alert("Bạn không có quyền sửa hàng hóa của chi nhánh khác!");
          setIsSubmitting(false);
          return;
        }

        let { error } = await supabase.from("inventory_items").update(payload).eq("id", editingItemId);
        if (error && (error as any).code === "PGRST204") {
          delete payload.min_stock;
          const retry = await supabase.from("inventory_items").update(payload).eq("id", editingItemId);
          error = retry.error;
        }
        if (error) throw error;
      } else {
        let { error } = await supabase.from("inventory_items").insert([payload]);
        if (error && (error as any).code === "PGRST204") {
          delete payload.min_stock;
          const retry = await supabase.from("inventory_items").insert([payload]);
          error = retry.error;
        }
        if (error) throw error;
      }
      setShowItemModal(false);
      setEditingItemId(null);
      fetchData();
    } catch (err: any) {
      alert("Lỗi lưu vật tư: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleItemDelete = async (id: string, itemBranchId: string) => {
    if (!isGlobalRole && user?.branch_id !== itemBranchId) {
      alert("Bạn không có quyền xóa hàng hóa của chi nhánh khác!");
      return;
    }
    if (!window.confirm("Bạn có chắc muốn XÓA vật tư này khỏi danh mục không? Toàn bộ lịch sử giao dịch liên quan sẽ bị xóa!")) return;
    try {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Lỗi xóa vật tư: " + err.message);
    }
  };

  // TRANSACTION LOGIC
  const canUserManageTrans = (t: any) => {
    if (!canManageCatalog) return false;
    // Kế toán chi nhánh chỉ được lập phiếu, KHÔNG được sửa/xóa phiếu để tránh tự cân đối kho
    if (activeRole === "Kế toán Chi nhánh") return false;
    
    if (isGlobalRole) return true;
    return user?.branch_id === t.branch_id;
  };

  const canUserManageItem = (item: any) => {
    if (!canManageCatalog) return false;
    if (isGlobalRole) return true;
    return user?.branch_id === item.branch_id;
  };

  const handleTransSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transData.item_id) {
      alert("Vui lòng chọn Hàng hóa!");
      return;
    }
    
    // Bảo vệ Chi nhánh: Chỉ cho phép lưu vào chi nhánh của bản thân nếu không có quyền Global
    const branchToSave = isGlobalRole ? activeBranch : (user?.branch_id || "");
    if (!branchToSave) {
      alert("Không xác định được chi nhánh để lưu phiếu kho!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...transData,
        branch_id: branchToSave,
        created_by: currentUser
      };

      if (editingTransId) {
        // Kiểm tra quyền sửa chéo chi nhánh
        const { data: existingTrans } = await supabase.from("inventory_transactions").select("branch_id").eq("id", editingTransId).maybeSingle();
        if (existingTrans && !isGlobalRole && user?.branch_id !== existingTrans.branch_id) {
          alert("Bạn không có quyền sửa phiếu giao dịch của chi nhánh khác!");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase.from("inventory_transactions").update(payload).eq("id", editingTransId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_transactions").insert([payload]);
        if (error) throw error;
      }
      
      setShowTransModal(false);
      setEditingTransId(null);
      setTransData(defaultTransactionData);
      fetchData();
    } catch (err: any) {
      alert("Lỗi lưu phiếu kho: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransEdit = (t: any) => {
    if (!canUserManageTrans(t)) {
      alert("Bạn không có quyền sửa phiếu giao dịch này!");
      return;
    }
    setTransData({
      transaction_date: t.transaction_date,
      item_id: t.item_id,
      type: t.type,
      quantity: t.quantity,
      reason: t.reason,
      note: t.note || ""
    });
    setEditingTransId(t.id);
    setShowTransModal(true);
  };

  const handleTransDelete = async (id: string, itemBranchId: string) => {
    if (!isGlobalRole && user?.branch_id !== itemBranchId) {
      alert("Bạn không có quyền xóa phiếu của chi nhánh khác!");
      return;
    }
    if (!window.confirm("Bạn có chắc muốn XÓA phiếu giao dịch này? (Tồn kho sẽ bị trừ/cộng ngược lại)")) return;
    try {
      const { error } = await supabase.from("inventory_transactions").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Lỗi xóa phiếu: " + err.message);
    }
  };

  // DATA PROCESSING
  const allInventoryData = items.map(item => {
    const itemTrans = transactions.filter(t => t.item_id === item.id);
    const totalIn = itemTrans.filter(t => t.type === "Nhập").reduce((s, t) => s + t.quantity, 0);
    const totalOut = itemTrans.filter(t => t.type === "Xuất").reduce((s, t) => s + t.quantity, 0);
    const balance = totalIn - totalOut;
    const minStockThreshold = item.min_stock !== undefined && item.min_stock !== null ? Number(item.min_stock) : 5;

    let stockStatus: "negative" | "out" | "low" | "safe" = "safe";
    if (balance < 0) {
      stockStatus = "negative";
    } else if (balance === 0) {
      stockStatus = "out";
    } else if (balance <= minStockThreshold) {
      stockStatus = "low";
    } else {
      stockStatus = "safe";
    }

    return {
      ...item,
      minStockThreshold,
      stockStatus,
      totalIn,
      totalOut,
      balance
    };
  });

  const stockSummary = {
    total: allInventoryData.length,
    safe: allInventoryData.filter(i => i.stockStatus === "safe").length,
    low: allInventoryData.filter(i => i.stockStatus === "low").length,
    out: allInventoryData.filter(i => i.stockStatus === "out").length,
    negative: allInventoryData.filter(i => i.stockStatus === "negative").length,
  };

  const inventoryData = allInventoryData.filter(item => {
    const matchSearch = searchTerm === "" || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "Tất cả" || item.category === categoryFilter;
    
    let matchStockStatus = true;
    if (stockStatusFilter === "Còn hàng") {
      matchStockStatus = item.balance > 0;
    } else if (stockStatusFilter === "Đủ hàng") {
      matchStockStatus = item.stockStatus === "safe";
    } else if (stockStatusFilter === "Sắp hết") {
      matchStockStatus = item.stockStatus === "low";
    } else if (stockStatusFilter === "Hết hàng") {
      matchStockStatus = item.stockStatus === "out";
    } else if (stockStatusFilter === "Lệch kho (Âm)") {
      matchStockStatus = item.stockStatus === "negative";
    }
    
    // Min / Max filter
    const minVal = minStockFilter !== "" ? Number(minStockFilter) : null;
    const maxVal = maxStockFilter !== "" ? Number(maxStockFilter) : null;
    const matchMin = minVal === null || isNaN(minVal) || item.balance >= minVal;
    const matchMax = maxVal === null || isNaN(maxVal) || item.balance <= maxVal;

    return matchSearch && matchCat && matchStockStatus && matchMin && matchMax;
  }).sort((a, b) => {
    if (stockSortOrder === "asc") return a.balance - b.balance;
    if (stockSortOrder === "desc") return b.balance - a.balance;
    return 0;
  });

  // Dành riêng cho Tab "Danh Mục Hàng Hóa" (Master Data: chỉ lọc theo Tên & Nhóm, không phụ thuộc vào trạng thái tồn)
  const catalogData = allInventoryData.filter(item => {
    const matchSearch = searchTerm === "" || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === "Tất cả" || item.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const filteredTransactions = transactions.filter(t => {
    const matchSearch = transSearchTerm === "" || 
      t.inventory_items?.name?.toLowerCase().includes(transSearchTerm.toLowerCase());
    
    const matchType = transTypeFilter === "Tất cả" || t.type === transTypeFilter;
    
    const matchCat = transCategoryFilter === "Tất cả" || t.inventory_items?.category === transCategoryFilter;
    
    return matchSearch && matchType && matchCat;
  });

  const uniqueCategories = ["Tất cả", ...Array.from(new Set(items.map(i => i.category)))];

  return (
    <>
      <div className="animate-fade-in inventory-container">
      <div className="page-header no-print">
        <div>
          <h1>Vật tư & Kho ({activeBranch})</h1>
          <p className="text-muted">Quản lý nhập xuất, theo dõi tồn kho độc lập cho từng cơ sở.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-secondary" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => { setEditingTransId(null); setTransData({...defaultTransactionData, type: "Xuất"}); setShowTransModal(true); }}>
            <ArrowUpFromLine size={20} />
            <span>Lập Phiếu Xuất</span>
          </button>
          <button className="btn btn-primary" style={{ background: 'var(--success)' }} onClick={() => { setEditingTransId(null); setTransData({...defaultTransactionData, type: "Nhập"}); setShowTransModal(true); }}>
            <ArrowDownToLine size={20} />
            <span>Lập Phiếu Nhập</span>
          </button>
        </div>
      </div>

      {/* Header riêng dành cho Bản in */}
      <div className="print-only-block" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.5rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Phiếu Kiểm Kê Kho Vật Tư</h2>
        <p style={{ margin: '0.25rem 0' }}><strong>Cơ sở:</strong> {activeBranch} | <strong>Ngày kiểm kê:</strong> {new Date().toLocaleDateString('vi-VN')}</p>
        <p style={{ margin: '0.25rem 0' }}><strong>Người kiểm kê:</strong> ................................................................</p>
      </div>

      <div className="inventory-tabs no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className={activeTab === "Tồn Kho" ? "active" : ""} onClick={() => setActiveTab("Tồn Kho")}>Tồn Kho Hiện Tại</button>
          <button className={activeTab === "Lịch Sử" ? "active" : ""} onClick={() => setActiveTab("Lịch Sử")}>Lịch Sử Giao Dịch</button>
          {canManageCatalog && (
            <button className={activeTab === "Danh Mục" ? "active" : ""} onClick={() => setActiveTab("Danh Mục")}>Danh Mục Hàng Hóa</button>
          )}
        </div>
        
        {activeTab === "Tồn Kho" && (
          <button className="btn btn-secondary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
            <span>In Phiếu Kiểm Kê</span>
          </button>
        )}
      </div>

      {activeTab === "Tồn Kho" && (
        <div className="kpi-cards-grid no-print">
          <div 
            className={`kpi-card ${stockStatusFilter === "Tất cả" ? "active" : ""}`}
            onClick={() => setStockStatusFilter("Tất cả")}
            title="Click để hiển thị tất cả mặt hàng"
          >
            <div className="kpi-card-header">
              <span>📦 Tổng Mặt Hàng</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tất cả</span>
            </div>
            <div className="kpi-card-value" style={{ color: 'var(--primary)' }}>
              {stockSummary.total}
            </div>
            <div className="kpi-card-desc">Tất cả mặt hàng trong kho</div>
          </div>

          <div 
            className={`kpi-card ${stockStatusFilter === "Đủ hàng" ? "active" : ""}`}
            onClick={() => setStockStatusFilter(prev => prev === "Đủ hàng" ? "Tất cả" : "Đủ hàng")}
            title="Click để lọc các mặt hàng còn nhiều và đủ an toàn"
          >
            <div className="kpi-card-header">
              <span>✅ Đủ Hàng An Toàn</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600 }}>&gt; Định mức</span>
            </div>
            <div className="kpi-card-value" style={{ color: 'var(--success)' }}>
              {stockSummary.safe}
            </div>
            <div className="kpi-card-desc">Tồn kho vượt mức tối thiểu</div>
          </div>

          <div 
            className={`kpi-card ${stockStatusFilter === "Sắp hết" ? "active" : ""}`}
            onClick={() => setStockStatusFilter(prev => prev === "Sắp hết" ? "Tất cả" : "Sắp hết")}
            style={{ borderLeft: stockSummary.low > 0 ? '3px solid #f59e0b' : undefined }}
            title="Click để lọc các mặt hàng sắp hết cần dự trù nhập thêm"
          >
            <div className="kpi-card-header">
              <span>⚠️ Sắp Hết Hàng</span>
              <span style={{ fontSize: '0.75rem', color: '#d97706', fontWeight: 700 }}>&le; Định mức</span>
            </div>
            <div className="kpi-card-value" style={{ color: '#d97706' }}>
              {stockSummary.low}
            </div>
            <div className="kpi-card-desc">Cần dự trù nhập bổ sung</div>
          </div>

          <div 
            className={`kpi-card ${stockStatusFilter === "Hết hàng" ? "active" : ""}`}
            onClick={() => setStockStatusFilter(prev => prev === "Hết hàng" ? "Tất cả" : "Hết hàng")}
            style={{ borderLeft: stockSummary.out > 0 ? '3px solid #ef4444' : undefined }}
            title="Click để lọc các mặt hàng đã hết tồn kho"
          >
            <div className="kpi-card-header">
              <span>❌ Đã Hết Hàng</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 700 }}>Tồn = 0</span>
            </div>
            <div className="kpi-card-value" style={{ color: 'var(--danger)' }}>
              {stockSummary.out}
            </div>
            <div className="kpi-card-desc">Không còn hàng để xuất</div>
          </div>

          {stockSummary.negative > 0 && (
            <div 
              className={`kpi-card ${stockStatusFilter === "Lệch kho (Âm)" ? "active" : ""}`}
              onClick={() => setStockStatusFilter(prev => prev === "Lệch kho (Âm)" ? "Tất cả" : "Lệch kho (Âm)")}
              style={{ borderLeft: '3px solid #b91c1c', backgroundColor: '#fef2f2' }}
              title="Click để lọc các mặt hàng bị âm kho"
            >
              <div className="kpi-card-header">
                <span style={{ color: '#b91c1c' }}>🚨 Cảnh Báo Âm Kho</span>
                <span style={{ fontSize: '0.75rem', color: '#b91c1c', fontWeight: 700 }}>Tồn &lt; 0</span>
              </div>
              <div className="kpi-card-value" style={{ color: '#b91c1c' }}>
                {stockSummary.negative}
              </div>
              <div className="kpi-card-desc" style={{ color: '#b91c1c' }}>Xuất vượt nhập - Cần kiểm kê!</div>
            </div>
          )}
        </div>
      )}

      <div className="filters-bar glass-panel no-print" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {isGlobalRole && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Xem Kho Cơ sở:</span>
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
          </div>
        )}
        
        {activeTab !== "Lịch Sử" && (
          <>
            <div className="search-box" style={{ flex: 1, minWidth: '220px' }}>
              <Search size={20} className="text-muted" />
              <input 
                type="text" 
                placeholder="Tìm tên hàng hóa..." 
                className="search-input" 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: 'auto' }} value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === "Tất cả" ? "Tất cả nhóm hàng" : cat}</option>)}
            </select>
            {activeTab === "Tồn Kho" && (
              <>
                <select 
                  className="form-input" 
                  style={{ width: 'auto' }} 
                  value={stockStatusFilter} 
                  onChange={e => setStockStatusFilter(e.target.value)}
                >
                  <option value="Tất cả">Tất cả trạng thái tồn</option>
                  <option value="Đủ hàng">✅ Đủ hàng (&gt; Định mức)</option>
                  <option value="Sắp hết">⚠️ Sắp hết (&le; Định mức)</option>
                  <option value="Hết hàng">❌ Hết hàng (= 0)</option>
                  {stockSummary.negative > 0 && <option value="Lệch kho (Âm)">🚨 Lệch kho / Âm (&lt; 0)</option>}
                  <option value="Còn hàng">Còn hàng (&gt; 0)</option>
                </select>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Tồn từ:</span>
                  <input 
                    type="number" 
                    placeholder="Min" 
                    className="form-input" 
                    style={{ width: '70px', padding: '0.4rem 0.5rem', textAlign: 'center' }}
                    value={minStockFilter}
                    onChange={e => setMinStockFilter(e.target.value)}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    className="form-input" 
                    style={{ width: '70px', padding: '0.4rem 0.5rem', textAlign: 'center' }}
                    value={maxStockFilter}
                    onChange={e => setMaxStockFilter(e.target.value)}
                  />
                  {(minStockFilter !== "" || maxStockFilter !== "") && (
                    <button 
                      type="button" 
                      className="btn btn-sm" 
                      title="Xóa bộ lọc số lượng" 
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: '#f1f5f9', color: '#64748b' }}
                      onClick={() => { setMinStockFilter(""); setMaxStockFilter(""); }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "Lịch Sử" && (
          <>
            <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
              <Search size={20} className="text-muted" />
              <input 
                type="text" 
                placeholder="Tìm tên hàng hóa trong lịch sử..." 
                className="search-input" 
                value={transSearchTerm}
                onChange={e => setTransSearchTerm(e.target.value)}
              />
            </div>
            <select className="form-input" style={{ width: 'auto' }} value={transTypeFilter} onChange={e => setTransTypeFilter(e.target.value)}>
              <option value="Tất cả">Tất cả loại giao dịch</option>
              <option value="Nhập">Phiếu Nhập</option>
              <option value="Xuất">Phiếu Xuất</option>
            </select>
            <select className="form-input" style={{ width: 'auto' }} value={transCategoryFilter} onChange={e => setTransCategoryFilter(e.target.value)}>
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat === "Tất cả" ? "Tất cả nhóm hàng" : cat}</option>)}
            </select>
          </>
        )}
      </div>

      {loading ? (
        <div className="loading-state">Đang tải dữ liệu...</div>
      ) : (
        <div className="glass-panel" style={{ padding: '0', overflowX: 'auto' }}>
          <table className="inventory-table">
            
            {activeTab === "Tồn Kho" && (
              <>
                <thead>
                  <tr>
                    <th>Nhóm</th>
                    <th>Tên Hàng Hóa</th>
                    <th>ĐVT</th>
                    <th className="number-col no-print">Tổng Nhập</th>
                    <th className="number-col no-print">Tổng Xuất</th>
                    <th 
                      className="number-col no-print" 
                      style={{ width: '150px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={toggleStockSort}
                      title="Click để sắp xếp tồn kho (Ít nhất / Nhiều nhất)"
                    >
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', width: '100%' }}>
                        <span>Tồn Hệ Thống</span>
                        <span style={{ fontSize: '0.8rem', color: stockSortOrder !== 'none' ? 'var(--primary)' : '#94a3b8', fontWeight: 'bold' }}>
                          {stockSortOrder === 'asc' ? '▲ (Ít)' : stockSortOrder === 'desc' ? '▼ (Nhiều)' : '↕'}
                        </span>
                      </div>
                    </th>
                    <th className="number-col print-only-cell" style={{ width: '120px' }}>Tồn Hệ Thống</th>
                    <th className="print-only-cell" style={{ width: '120px', textAlign: 'center' }}>Thực Tế</th>
                    <th className="print-only-cell" style={{ width: '120px', textAlign: 'center' }}>Chênh Lệch</th>
                    <th className="print-only-cell" style={{ width: '150px' }}>Ghi Chú</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryData.map(item => (
                    <tr key={item.id}>
                      <td><span className="badge badge-warning">{item.category}</span></td>
                      <td style={{ fontWeight: 500 }}>
                        <div className="product-thumbnail-container">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="product-thumbnail" 
                              onClick={() => {
                                setLightboxImages([item.image_url]);
                                setLightboxIndex(0);
                                setLightboxOpen(true);
                              }}
                            />
                          ) : (
                            <div className="product-thumbnail-placeholder">
                              <Package size={18} />
                            </div>
                          )}
                          <div>
                            <div>{item.name}</div>
                            {item.star_points > 0 && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '4px', padding: '1px 6px', fontSize: '0.75rem', fontWeight: 700, marginTop: '2px' }}>
                                ⭐ {item.star_points} Sao
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{item.unit}</td>
                      <td className="number-col no-print">{item.totalIn > 0 ? item.totalIn : '-'}</td>
                      <td className="number-col no-print">{item.totalOut > 0 ? item.totalOut : '-'}</td>
                      <td className="number-col">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span className={item.balance > 0 ? (item.stockStatus === 'low' ? 'stock-low' : 'stock-positive') : item.balance === 0 ? 'text-muted' : 'stock-zero'} style={{ fontSize: '1rem', fontWeight: 700 }}>
                            {item.balance}
                          </span>
                          {item.stockStatus === 'negative' && (
                            <span style={{ fontSize: '0.7rem', color: '#ef4444', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              🚨 Âm kho
                            </span>
                          )}
                          {item.stockStatus === 'out' && (
                            <span style={{ fontSize: '0.7rem', color: '#ef4444', backgroundColor: '#fee2e2', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                              Hết hàng
                            </span>
                          )}
                          {item.stockStatus === 'low' && (
                            <span style={{ fontSize: '0.7rem', color: '#b45309', backgroundColor: '#fef3c7', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }} title={`Định mức an toàn: ≤ ${item.minStockThreshold} ${item.unit}`}>
                              ⚠️ Sắp hết (&le;{item.minStockThreshold})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="print-only-cell"></td>
                      <td className="print-only-cell"></td>
                      <td className="print-only-cell"></td>
                    </tr>
                  ))}
                  {inventoryData.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Không tìm thấy hàng hóa</td></tr>}
                </tbody>
              </>
            )}

            {activeTab === "Lịch Sử" && (
              <>
                <thead>
                  <tr>
                    <th>Ngày GD</th>
                    <th>Loại</th>
                    <th>Tên Hàng Hóa</th>
                    <th className="number-col">Số Lượng</th>
                    <th>Lý Do / Ghi chú</th>
                    <th>Người lập</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(t => (
                    <tr key={t.id}>
                      <td>{new Date(t.transaction_date).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <span className={`type-badge ${t.type === 'Nhập' ? 'nhap' : 'xuat'}`}>{t.type}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        <div className="product-thumbnail-container">
                          {t.inventory_items?.image_url ? (
                            <img 
                              src={t.inventory_items.image_url} 
                              alt={t.inventory_items.name} 
                              className="product-thumbnail" 
                              onClick={() => {
                                setLightboxImages([t.inventory_items.image_url]);
                                setLightboxIndex(0);
                                setLightboxOpen(true);
                              }}
                            />
                          ) : (
                            <div className="product-thumbnail-placeholder">
                              <Package size={18} />
                            </div>
                          )}
                          <div>
                            <div>{t.inventory_items?.name}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t.inventory_items?.category}</div>
                          </div>
                        </div>
                      </td>
                      <td className={`number-col ${t.type === 'Nhập' ? 'stock-positive' : 'stock-zero'}`}>
                        {t.type === 'Nhập' ? '+' : '-'}{t.quantity} {t.inventory_items?.unit}
                      </td>
                      <td>
                        <div><strong>{t.reason}</strong></div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t.note}</div>
                      </td>
                      <td>{t.created_by}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canUserManageTrans(t) && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }} onClick={() => handleTransEdit(t)}>
                              <Edit size={16} />
                            </button>
                            <button className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={() => handleTransDelete(t.id, t.branch_id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Chưa có giao dịch kho nào</td></tr>}
                </tbody>
              </>
            )}

            {activeTab === "Danh Mục" && canManageCatalog && (
              <>
                <thead>
                  <tr>
                    <th>Nhóm</th>
                    <th>Tên Hàng Hóa</th>
                    <th>ĐVT</th>
                    <th className="number-col">Mức Báo Sắp Hết</th>
                    <th className="number-col">Giá Nhập</th>
                    <th className="number-col">Giá Bán</th>
                    <th style={{ width: '100px' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogData.map(item => (
                    <tr key={item.id}>
                      <td><span className="badge badge-warning">{item.category}</span></td>
                      <td style={{ fontWeight: 500 }}>
                        <div className="product-thumbnail-container">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="product-thumbnail" 
                              onClick={() => {
                                setLightboxImages([item.image_url]);
                                setLightboxIndex(0);
                                setLightboxOpen(true);
                              }}
                            />
                          ) : (
                            <div className="product-thumbnail-placeholder">
                              <Package size={18} />
                            </div>
                          )}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{item.name}</span>
                              {item.star_points > 0 && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', backgroundColor: '#fef3c7', color: '#b45309', border: '1px solid #fde68a', borderRadius: '4px', padding: '1px 6px', fontSize: '0.75rem', fontWeight: 700 }}>
                                  ⭐ {item.star_points} Sao
                                </span>
                              )}
                            </div>
                            {item.note && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{item.note}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{item.unit}</td>
                      <td className="number-col">
                        <span style={{ fontWeight: 600, color: '#d97706', backgroundColor: '#fef3c7', padding: '2px 8px', borderRadius: '4px', fontSize: '0.82rem' }}>
                          &le; {item.min_stock !== undefined && item.min_stock !== null ? item.min_stock : 5} {item.unit}
                        </span>
                      </td>
                      <td className="number-col">{Number(item.import_price).toLocaleString('vi-VN')}</td>
                      <td className="number-col">{Number(item.export_price).toLocaleString('vi-VN')}</td>
                      <td style={{ textAlign: 'right' }}>
                        {canUserManageItem(item) && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-sm" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }} onClick={() => {
                              setEditingItemId(item.id);
                              setItemData({ 
                                category: item.category, 
                                name: item.name, 
                                unit: item.unit, 
                                import_price: item.import_price, 
                                export_price: item.export_price, 
                                star_points: item.star_points || 0,
                                min_stock: item.min_stock !== undefined && item.min_stock !== null ? Number(item.min_stock) : 5,
                                note: item.note || "",
                                image_url: item.image_url || ""
                              });
                              setShowItemModal(true);
                            }}>
                              <Edit size={16} />
                            </button>
                            <button className="btn btn-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }} onClick={() => handleItemDelete(item.id, item.branch_id)}>
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {catalogData.length === 0 && (
                    <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>Không tìm thấy hàng hóa trong danh mục</td></tr>
                  )}
                  <tr>
                    <td colSpan={7}>
                      <button className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => { setEditingItemId(null); setItemData(defaultItemData); setShowItemModal(true); }}>
                        <Plus size={20} /> Thêm Hàng hóa mới
                      </button>
                    </td>
                  </tr>
                </tbody>
              </>
            )}

          </table>
        </div>
      )}
      </div>

      {/* MODAL DANH MỤC */}
      {showItemModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingItemId ? "Sửa thông tin Hàng hóa" : "Thêm Hàng hóa mới"}</h2>
              <button className="close-btn" onClick={() => setShowItemModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleItemSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Nhóm hàng *</label>
                <select className="form-input" required value={itemData.category} onChange={e => setItemData({...itemData, category: e.target.value})}>
                  <option value="Áo + Balo">Áo + Balo</option>
                  <option value="Quà tặng">Quà tặng</option>
                  <option value="Đồ dùng học tập">Đồ dùng học tập</option>
                  <option value="Đồ dùng văn phòng phẩm">Đồ dùng văn phòng phẩm</option>
                  <option value="Sách">Sách</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tên Vật tư / Hàng hóa *</label>
                <input type="text" className="form-input" required placeholder="VD: Balo lớn VIC EDU" value={itemData.name} onChange={e => setItemData({...itemData, name: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Đơn vị tính *</label>
                  <input type="text" className="form-input" required placeholder="VD: chiếc" value={itemData.unit} onChange={e => setItemData({...itemData, unit: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" title="Khi tồn kho bằng hoặc dưới mức này, hệ thống sẽ cảnh báo Sắp hết hàng">
                    ⚠️ Mức báo sắp hết
                  </label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="0" 
                    placeholder="VD: 5" 
                    value={itemData.min_stock} 
                    onChange={e => setItemData({...itemData, min_stock: Number(e.target.value)})} 
                    onWheel={(e) => (e.target as HTMLInputElement).blur()} 
                  />
                  <small className="text-muted" style={{ fontSize: '0.75rem', marginTop: '2px', display: 'block' }}>
                    Báo vàng khi tồn &le; {itemData.min_stock || 0} {itemData.unit || 'đơn vị'}
                  </small>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Giá nhập (VNĐ)</label>
                  <input type="number" className="form-input" min="0" placeholder="VD: 100000" value={itemData.import_price} onChange={e => setItemData({...itemData, import_price: Number(e.target.value)})} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  {itemData.import_price > 0 && (
                    <small className="text-muted" style={{marginTop: '0.25rem', display: 'block', color: 'var(--primary)', fontWeight: 500}}>
                      = {itemData.import_price.toLocaleString('vi-VN')} đ
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Giá bán (VNĐ)</label>
                  <input type="number" className="form-input" min="0" placeholder="VD: 150000" value={itemData.export_price} onChange={e => setItemData({...itemData, export_price: Number(e.target.value)})} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
                  {itemData.export_price > 0 && (
                    <small className="text-muted" style={{marginTop: '0.25rem', display: 'block', color: 'var(--primary)', fontWeight: 500}}>
                      = {itemData.export_price.toLocaleString('vi-VN')} đ
                    </small>
                  )}
                </div>
              </div>

              <div className="form-group" style={{ backgroundColor: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '8px' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#b45309', fontWeight: 600 }}>
                  <span>⭐</span> Số Sao đổi thưởng (Dành cho Học viên)
                </label>
                <input 
                  type="number" 
                  className="form-input" 
                  min="0" 
                  placeholder="VD: 50, 80, 100... (Để 0 nếu không đổi sao)" 
                  value={itemData.star_points || ""} 
                  onChange={e => setItemData({...itemData, star_points: Number(e.target.value) || 0})} 
                  onWheel={(e) => (e.target as HTMLInputElement).blur()} 
                />
                <small className="text-muted" style={{ display: 'block', marginTop: '0.25rem', color: '#92400e', fontSize: '0.8rem' }}>
                  {itemData.star_points > 0 
                    ? `🎁 Món này sẽ tự động xuất hiện trong Kho Quà Tặng của học viên chi nhánh này với giá ${itemData.star_points} Sao.` 
                    : "💡 Nhập số Sao nếu món hàng này dùng làm quà tặng cho học viên đổi thưởng. Để 0 nếu là hàng bán/vật tư thông thường."}
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú</label>
                <textarea className="form-input" rows={2} value={itemData.note} onChange={e => setItemData({...itemData, note: e.target.value})} />
              </div>

              <div className="image-upload-section">
                <label className="form-label" style={{ fontWeight: 600 }}>Ảnh đại diện sản phẩm (Tự động nén tối ưu)</label>
                
                {itemData.image_url ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center' }}>
                    <div className="image-preview-item">
                      <img src={itemData.image_url} alt="Item Preview" className="image-preview-img" />
                      <button 
                        type="button" 
                        className="image-remove-btn" 
                        onClick={removeItemImage}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className="file-upload-box"
                    onClick={() => document.getElementById("item-image-input")?.click()}
                    style={{ padding: '1.5rem' }}
                  >
                    <Camera size={24} style={{ margin: '0 auto 0.5rem', display: 'block', color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      {uploadingImage ? "Đang xử lý nén và tải lên..." : "Click để chọn hoặc chụp ảnh sản phẩm"}
                    </span>
                    <input 
                      type="file" 
                      id="item-image-input" 
                      accept="image/*" 
                      style={{ display: "none" }} 
                      onChange={handleItemImageUpload} 
                      disabled={uploadingImage}
                    />
                  </div>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploadingImage}>{isSubmitting ? "Đang lưu..." : "Lưu Danh mục"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GIAO DỊCH KHO */}
      {showTransModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>{editingTransId ? "Sửa Phiếu" : "Lập Phiếu"} {transData.type} Kho ({activeBranch})</h2>
              <button className="close-btn" onClick={() => { setShowTransModal(false); setEditingTransId(null); setTransData(defaultTransactionData); }}>&times;</button>
            </div>
            <form onSubmit={handleTransSubmit} className="modal-form">
              <div className="form-group">
                <label className="form-label">Ngày giao dịch *</label>
                <input type="date" className="form-input" required value={transData.transaction_date} onChange={e => setTransData({...transData, transaction_date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Chọn Hàng hóa *</label>
                <select className="form-input" required value={transData.item_id} onChange={e => setTransData({...transData, item_id: e.target.value})}>
                  <option value="">-- Bấm để chọn --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Số lượng *</label>
                <input type="number" className="form-input" required min="1" value={transData.quantity} onChange={e => setTransData({...transData, quantity: Number(e.target.value)})} onWheel={(e) => (e.target as HTMLInputElement).blur()} />
              </div>
              <div className="form-group">
                <label className="form-label">Lý do *</label>
                <input type="text" className="form-input" required placeholder={transData.type === 'Nhập' ? 'VD: Nhập hàng từ NCC' : 'VD: Bán cho học viên A'} value={transData.reason} onChange={e => setTransData({...transData, reason: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú chi tiết</label>
                <textarea className="form-input" rows={2} placeholder="Ai nhận, số hóa đơn..." value={transData.note} onChange={e => setTransData({...transData, note: e.target.value})} />
              </div>
              <div className="modal-actions" style={{ marginTop: '2rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowTransModal(false); setEditingTransId(null); setTransData(defaultTransactionData); }}>Hủy</button>
                <button type="submit" className="btn btn-primary" style={{ background: transData.type === 'Nhập' ? 'var(--success)' : 'var(--danger)', borderColor: transData.type === 'Nhập' ? 'var(--success)' : 'var(--danger)' }} disabled={isSubmitting}>
                  {isSubmitting ? "Đang lưu..." : `Lưu Phiếu ${transData.type}`}
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
              alt={`Ảnh hàng hóa ${lightboxIndex + 1}`} 
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

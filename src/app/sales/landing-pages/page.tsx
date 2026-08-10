"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Plus, Edit, Trash2, ShieldAlert, LayoutTemplate, ExternalLink, Copy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

type LandingPage = {
  id: string;
  slug: string;
  title: string;
  branch_id: string;
  post_submit_action: string;
  config?: { 
    notes?: string; 
    facebook_pixel_id?: string;
  };
  created_at: string;
  lead_count?: number;
  views?: number;
  is_approved?: boolean;
  is_archived?: boolean;
};

export default function LandingPages() {
  const { user } = useAuth();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Filter states
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterMonth, setFilterMonth] = useState("Tất cả");
  const [filterViews, setFilterViews] = useState("");
  const [filterPixel, setFilterPixel] = useState("Tất cả");

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [branchId, setBranchId] = useState("Chỉ Admin được dùng");
  const [action, setAction] = useState("THANK_YOU");
  const [notes, setNotes] = useState("");

  const router = useRouter();

  // Kiểm tra quyền
  const isSuperAdmin = user?.role === "Super Admin";

  useEffect(() => {
    fetchPages();
  }, [isSuperAdmin]);

  const fetchPages = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("landing_pages")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error(error);
    } else if (data) {
      // Đếm số lead (phone unique) cho từng landing page
      const pagesWithCounts = await Promise.all(data.map(async (p: LandingPage) => {
        const { data: acts, error: countError } = await supabase
          .from("customer_activities")
          .select("phone")
          .eq("landing_page_id", p.id)
          .eq("activity_type", "FORM_SUBMIT");
        
        if (countError) return p;
        // Count unique phones
        const uniquePhones = new Set(acts.map((a: any) => a.phone));
        return { ...p, lead_count: uniquePhones.size };
      }));
      let filteredData = pagesWithCounts;
      if (!isSuperAdmin) {
        if (user?.branch_id) {
          const BASE_BRANCHES = ["Việt Trì", "Dân Hòa", "Lâm Thao", "Tuyên Quang"];
          const userBaseBranches = BASE_BRANCHES.filter(b => user.branch_id?.includes(b));
          filteredData = pagesWithCounts.filter(p => userBaseBranches.includes(p.branch_id));
        } else {
          filteredData = [];
        }
      }
      setPages(filteredData);
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Tự động tạo slug chuẩn nếu người dùng nhập có dấu hoặc khoảng trắng
    let finalSlug = slug.trim().toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Xóa dấu
      .replace(/đ/g, "d").replace(/Đ/g, "D") // Đổi đ
      .replace(/[^a-z0-9\s-]/g, "") // Xóa ký tự đặc biệt
      .replace(/\s+/g, "-"); // Thay khoảng trắng bằng gạch ngang

    if (editingId) {
      const { data: exist } = await supabase.from("landing_pages").select("config").eq("id", editingId).single();
      const newConfig = exist?.config || {};
      newConfig.notes = notes;

      const { error } = await supabase.from("landing_pages").update({
        slug: finalSlug,
        title,
        branch_id: branchId,
        post_submit_action: action,
        config: newConfig
      }).eq("id", editingId);

      if (error) {
        alert("Lỗi cập nhật Landing Page: " + error.message);
      } else {
        alert("Cập nhật thành công!");
        setShowModal(false);
        fetchPages();
      }
    } else {
      const { error } = await supabase.from("landing_pages").insert({
        slug: finalSlug,
        title,
        branch_id: branchId,
        post_submit_action: action,
        config: { notes },
        is_approved: isSuperAdmin ? true : false,
        created_by: user?.id,
      });

      if (error) {
        alert("Lỗi tạo Landing Page: " + error.message);
      } else {
        alert("Tạo thành công!");
        setShowModal(false);
        fetchPages();
      }
    }
  };

  const handleEdit = (p: LandingPage) => {
    setEditingId(p.id);
    setSlug(p.slug);
    setTitle(p.title);
    setBranchId(p.branch_id);
    setAction(p.post_submit_action);
    setNotes(p.config?.notes || "");
    setShowModal(true);
  };

  const handleDelete = async (id: string, title: string, leadCount: number = 0) => {
    if (leadCount > 0) {
      if (window.confirm(`Trang "${title}" đã thu thập được khách hàng nên không thể xóa vĩnh viễn. Bạn có muốn chuyển sang trạng thái "Đã lưu trữ" (Archive) không?`)) {
        const { error } = await supabase.from("landing_pages").update({ is_archived: true }).eq("id", id);
        if (error) {
          alert("Lỗi khi lưu trữ: " + error.message);
        } else {
          fetchPages();
        }
      }
    } else {
      if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn Landing Page "${title}" không? Hành động này không thể hoàn tác.`)) {
        const { error } = await supabase.from("landing_pages").delete().eq("id", id);
        if (error) {
          alert("Lỗi khi xóa: " + error.message);
        } else {
          fetchPages();
        }
      }
    }
  };

  const handleUnarchive = async (id: string, title: string) => {
    if (window.confirm(`Bạn muốn khôi phục hoạt động cho Landing Page "${title}"?`)) {
      const { data, error } = await supabase.from("landing_pages").update({ is_archived: false }).eq("id", id).select();
      if (error) {
        alert("Lỗi khi khôi phục: " + error.message);
      } else if (!data || data.length === 0) {
        alert("Lỗi khi khôi phục: Không có quyền thực hiện.");
      } else {
        fetchPages();
      }
    }
  };

  const handleDuplicate = async (p: LandingPage) => {
    if (window.confirm(`Bạn có chắc chắn muốn nhân bản Landing Page "${p.title}"?`)) {
      setLoading(true);
      const newTitle = p.title + " (Bản sao)";
      const newSlug = p.slug + "-copy-" + Math.floor(Math.random() * 10000);
      
      const { error } = await supabase.from("landing_pages").insert({
        slug: newSlug,
        title: newTitle,
        branch_id: p.branch_id,
        post_submit_action: p.post_submit_action,
        config: p.config,
        is_approved: p.is_approved,
        created_by: user?.id,
      });

      if (error) {
        alert("Lỗi khi nhân bản: " + error.message);
        setLoading(false);
      } else {
        alert("Nhân bản thành công!");
        fetchPages();
      }
    }
  };

  const handleToggleApproval = async (id: string, currentStatus: boolean) => {
    if (!isSuperAdmin) return;
    const { error } = await supabase.from("landing_pages").update({ is_approved: !currentStatus }).eq("id", id);
    if (error) {
      alert("Lỗi cập nhật trạng thái: " + error.message);
    } else {
      fetchPages();
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setSlug("");
    setTitle("");
    if (isSuperAdmin) {
      setBranchId("Chỉ Admin được dùng");
    } else {
      const branches = ["Việt Trì", "Dân Hòa", "Lâm Thao", "Tuyên Quang"];
      const userBranch = branches.find(b => user?.branch_id?.includes(b)) || branches[0];
      setBranchId(userBranch);
    }
    setAction("THANK_YOU");
    setShowModal(true);
  };

  // Tính toán danh sách tháng hiển thị trong bộ lọc
  const availableMonths = Array.from(new Set(pages.map(p => {
    const d = new Date(p.created_at);
    return `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
  }))).sort((a, b) => {
    const [m_a, y_a] = a.replace('Tháng ', '').split('/');
    const [m_b, y_b] = b.replace('Tháng ', '').split('/');
    return (parseInt(y_b) - parseInt(y_a)) || (parseInt(m_b) - parseInt(m_a));
  });

  // Lọc danh sách pages
  const displayedPages = pages.filter(p => {
    if (activeTab === "active" && p.is_archived) return false;
    if (activeTab === "archived" && !p.is_archived) return false;

    if (filterBranch !== "Tất cả" && p.branch_id !== filterBranch) return false;
    
    if (filterMonth !== "Tất cả") {
      const d = new Date(p.created_at);
      const m = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      if (m !== filterMonth) return false;
    }
    
    if (filterViews) {
      const minViews = parseInt(filterViews);
      if (!isNaN(minViews) && (p.views || 0) <= minViews) return false;
    }
    
    if (filterPixel === "Có" && !p.config?.facebook_pixel_id) return false;
    if (filterPixel === "Không" && p.config?.facebook_pixel_id) return false;
    
    return true;
  });

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0 }}>Quản lý Landing Pages</h1>
        <button
          onClick={openCreateModal}
          className="btn btn-primary"
        >
          <Plus size={20} /> Tạo Landing Page
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải dữ liệu...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "1rem", borderBottom: "1px solid var(--border)", marginBottom: "-0.5rem" }}>
            <button 
              onClick={() => setActiveTab("active")}
              style={{ padding: "0.75rem 1rem", background: "none", border: "none", borderBottom: activeTab === "active" ? "2px solid var(--primary)" : "2px solid transparent", color: activeTab === "active" ? "var(--primary)" : "var(--text-muted)", fontWeight: activeTab === "active" ? 600 : 500, cursor: "pointer", fontSize: "0.95rem" }}
            >
              Đang hoạt động ({pages.filter(p => !p.is_archived).length})
            </button>
            <button 
              onClick={() => setActiveTab("archived")}
              style={{ padding: "0.75rem 1rem", background: "none", border: "none", borderBottom: activeTab === "archived" ? "2px solid var(--primary)" : "2px solid transparent", color: activeTab === "archived" ? "var(--primary)" : "var(--text-muted)", fontWeight: activeTab === "archived" ? 600 : 500, cursor: "pointer", fontSize: "0.95rem" }}
            >
              Đã lưu trữ ({pages.filter(p => p.is_archived).length})
            </button>
          </div>

          {/* Bộ lọc thanh ngang */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", backgroundColor: "white", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}>
            {isSuperAdmin && (
              <div style={{ flex: 1, minWidth: "150px" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Chi nhánh</label>
                <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.875rem", outline: "none", backgroundColor: "#f9fafb" }}>
                  <option value="Tất cả">Tất cả chi nhánh</option>
                  <option value="Chỉ Admin được dùng">Chỉ Admin được dùng</option>
                  <option value="Việt Trì">Việt Trì</option>
                  <option value="Dân Hòa">Dân Hòa</option>
                  <option value="Lâm Thao">Lâm Thao</option>
                  <option value="Tuyên Quang">Tuyên Quang</option>
                </select>
              </div>
            )}
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tháng tạo</label>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.875rem", outline: "none", backgroundColor: "#f9fafb" }}>
                <option value="Tất cả">Tất cả thời gian</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Lượt xem &gt;</label>
              <input type="number" placeholder="Nhập số..." value={filterViews} onChange={e => setFilterViews(e.target.value)} style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.875rem", outline: "none", backgroundColor: "#f9fafb" }} />
            </div>
            <div style={{ flex: 1, minWidth: "150px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Trạng thái Pixel</label>
              <select value={filterPixel} onChange={e => setFilterPixel(e.target.value)} style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.875rem", outline: "none", backgroundColor: "#f9fafb" }}>
                <option value="Tất cả">Tất cả trạng thái</option>
                <option value="Có">Đã gắn Pixel</option>
                <option value="Không">Chưa gắn Pixel</option>
              </select>
            </div>
          </div>

          <div className="glass-panel table-responsive" style={{ padding: '1rem' }}>
            <table className="table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tiêu đề</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'center' }}>Link</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Trạng thái</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Phân bổ Chi nhánh</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Hành động sau Form</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Lượt Xem</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Số Leads</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Chuyển đổi</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Ngày tạo</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-muted)' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {displayedPages.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy kết quả nào phù hợp với bộ lọc.</td>
                </tr>
              ) : (
                displayedPages.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {p.title}
                      {p.config?.facebook_pixel_id && (
                        <span style={{ background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, flexShrink: 0 }}>Pixel</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <a 
                      href={`https://hoc.viceduvn.com/${p.slug}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ color: 'var(--primary)', display: 'inline-flex', padding: '6px', borderRadius: '4px', background: '#e0e7ff', transition: '0.2s' }} 
                      title={`Mở trang: https://hoc.viceduvn.com/${p.slug}`}
                    >
                      <ExternalLink size={18} />
                    </a>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600, 
                        backgroundColor: p.is_approved ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                        color: p.is_approved ? '#16a34a' : '#ca8a04'
                      }}>
                        {p.is_approved ? 'Đã duyệt' : 'Bản nháp'}
                      </span>
                      {isSuperAdmin && (
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={!!p.is_approved} 
                            onChange={() => handleToggleApproval(p.id, !!p.is_approved)}
                            style={{ width: '16px', height: '16px' }}
                          />
                        </label>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      backgroundColor: p.branch_id === 'Chỉ Admin được dùng' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                      color: p.branch_id === 'Chỉ Admin được dùng' ? '#6d28d9' : '#c2410c'
                    }}>
                      {p.branch_id}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {p.post_submit_action === "AUTO_LOGIN" ? (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'var(--success)', color: 'white' }}>Cấp TK & Học</span>
                    ) : (
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', backgroundColor: 'var(--border)', color: 'var(--text-main)' }}>Chỉ thu Lead</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                      {p.views || 0}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: p.lead_count ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {p.lead_count || 0}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--success)' }}>
                      {p.views ? ((p.lead_count || 0) / p.views * 100).toFixed(1) + '%' : '0.0%'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td style={{ padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => router.push(`/sales/landing-pages/${p.id}/builder`)} style={{ background: 'var(--primary)', border: 'none', cursor: 'pointer', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <LayoutTemplate size={14} /> Nội dung
                    </button>
                    <button onClick={() => handleEdit(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }} title="Sửa tên/slug"><Edit size={18} /></button>
                    <button onClick={() => handleDuplicate(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)' }} title="Nhân bản"><Copy size={18} /></button>
                    {activeTab === "active" ? (
                      <button onClick={() => handleDelete(p.id, p.title, p.lead_count || 0)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }} title="Xóa / Lưu trữ"><Trash2 size={18} /></button>
                    ) : (
                      <button onClick={() => handleUnarchive(p.id, p.title)} style={{ background: 'var(--success)', border: 'none', cursor: 'pointer', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>Khôi phục</button>
                    )}
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{editingId ? "Sửa Landing Page" : "Tạo Landing Page Mới"}</h2>
              <button className="close-btn" onClick={() => {
                setShowModal(false);
                setNotes("");
              }}>&times;</button>
            </div>
            <div className="modal-form">
              <form onSubmit={handleSave}>
                <div className="form-group">
                  <label className="form-label">Tiêu đề chiến dịch</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    className="form-input"
                    placeholder="VD: Tiếng Anh Trẻ em Tháng 8"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Đường dẫn (Slug)</label>
                  <input 
                    type="text" 
                    value={slug} 
                    onChange={(e) => setSlug(e.target.value)}
                    className="form-input"
                    placeholder="tieng-anh-tre-em-t8"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Dành cho Chi nhánh / Đối tượng</label>
                  <select 
                    value={branchId} 
                    onChange={(e) => setBranchId(e.target.value)}
                    className="form-input"
                    disabled={!isSuperAdmin}
                  >
                    <option value="Chỉ Admin được dùng">Chỉ Admin được dùng (Bán chéo toàn quốc)</option>
                    <option value="Việt Trì">Việt Trì</option>
                    <option value="Dân Hòa">Dân Hòa</option>
                    <option value="Lâm Thao">Lâm Thao</option>
                    <option value="Tuyên Quang">Tuyên Quang</option>
                  </select>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Chỉ Sale thuộc chi nhánh này mới thấy Lead đổ về.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Hành động khi nộp Form</label>
                  <select 
                    value={action} 
                    onChange={(e) => setAction(e.target.value)}
                    className="form-input"
                    disabled={!isSuperAdmin}
                  >
                    <option value="THANK_YOU">Chỉ thu Lead (Lưu vào CRM)</option>
                    <option value="AUTO_LOGIN">Thu Lead & Cấp Tài khoản Học Web 2</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Ghi chú (Nội bộ)</label>
                  <textarea 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    style={{ minHeight: '80px', fontFamily: 'inherit' }}
                    placeholder="Ghi chú các thông tin cần lưu ý về chiến dịch này..."
                  />
                </div>
                
                <div className="modal-actions">
                  <button type="button" onClick={() => {
                    setShowModal(false);
                    setNotes("");
                  }} className="btn btn-secondary">Hủy</button>
                  <button type="submit" className="btn btn-primary">{editingId ? "Cập nhật" : "Tạo mới"}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Search, Plus, Edit, Trash2, ExternalLink, BookOpen, AlertCircle } from "lucide-react";
import InternalTrainingModal, { InternalTraining } from "@/components/training/InternalTrainingModal";

const ALL_TABS = ["Sale", "Kế toán", "Đào tạo", "Media Team", "Quản lý", "Tài liệu Mật"];

export default function InternalTrainingPage() {
  const { user } = useAuth();
  const currentUser = user || { id: "", role: "User", branch_id: "", full_name: "" };
  
  const [trainings, setTrainings] = useState<InternalTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Logic hiển thị Tabs:
  // Nếu là Super Admin -> Thấy tất cả 6 tabs
  // Nếu là Giám đốc, Quản lý, Admin -> Thấy 5 tabs đầu (ẩn Tài liệu Mật)
  // Nếu là Sale, KT, ĐT... -> Chỉ thấy 4 tabs đầu, ẩn Quản lý và Tài liệu Mật
  const isSuperAdmin = currentUser.role === "Super Admin";
  const isManagerLevel = ["Super Admin", "Giám đốc", "Quản lý", "Admin"].includes(currentUser.role);
  const visibleTabs = isSuperAdmin ? ALL_TABS : isManagerLevel ? ALL_TABS.filter(t => t !== "Tài liệu Mật") : ALL_TABS.filter(t => t !== "Quản lý" && t !== "Tài liệu Mật");
  
  // Xác định Tab đầu tiên mà user này nên xem mặc định
  let defaultTab = "Sale";
  if (currentUser?.role?.includes("Kế toán")) defaultTab = "Kế toán";
  else if (currentUser?.role === "Đào tạo") defaultTab = "Đào tạo";
  else if (currentUser?.role === "Media Team") defaultTab = "Media Team";
  else if (["Quản lý", "Admin"].includes(currentUser?.role)) defaultTab = "Quản lý";
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InternalTraining | null>(null);

  const canManage = ["Super Admin", "Giám đốc"].includes(currentUser.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("internal_trainings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === '42P01') { // Bảng chưa tồn tại
            setTrainings([]);
            setLoading(false);
            return;
        }
        throw error;
      }
      setTrainings(data || []);
    } catch (err: any) {
      console.error("Lỗi tải tài liệu:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa tài liệu "${title}"?`)) return;
    try {
      const { error } = await supabase.from("internal_trainings").delete().eq("id", id);
      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Lỗi khi xóa: " + err.message);
    }
  };

  // Lọc dữ liệu theo Tab đang chọn, Chi nhánh và Từ khóa tìm kiếm
  const filteredTrainings = trainings.filter(t => {
    // SECURITY: Chặn cứng tuyệt đối, không ai ngoài Super Admin được phép nhìn thấy nội dung của Tab này dù có bị lỗi logic ở dưới.
    if (t.scopes?.includes("Tài liệu Mật") && currentUser.role !== "Super Admin") return false;

    const matchTab = t.scopes?.includes(activeTab);
    const isGlobalRole = ["Super Admin", "Giám đốc"].includes(currentUser.role);
    const matchBranch = isGlobalRole || !t.branches || t.branches.includes("Tất cả") || t.branches.includes(currentUser?.branch_id || "");
    const matchSearch = (t.title || "").toLowerCase().includes((searchTerm || "").toLowerCase()) || 
                        (t.description || "").toLowerCase().includes((searchTerm || "").toLowerCase());
    return matchTab && matchBranch && matchSearch;
  });

  if (!isMounted) return <div style={{ padding: "2rem" }}>Đang tải giao diện...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "1.875rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem 0", display: "flex", alignItems: "center", gap: 10 }}>
              <BookOpen size={28} color="#3b82f6" />
              Đào tạo Nội bộ
            </h1>
            <p style={{ color: "#64748b", margin: 0 }}>Trung tâm tài liệu, quy trình và hướng dẫn nghiệp vụ dành cho các bộ phận.</p>
          </div>
          {canManage && (
            <button 
              onClick={() => { setEditingItem(null); setShowModal(true); }}
              style={{ display: "flex", alignItems: "center", gap: 8, background: "#3b82f6", color: "white", border: "none", padding: "0.6rem 1.2rem", borderRadius: 8, fontWeight: 600, cursor: "pointer", boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)" }}
            >
              <Plus size={20} /> Thêm tài liệu
            </button>
          )}
        </div>

        {/* Cảnh báo nếu chưa chạy SQL */}
        {!loading && trainings.length === 0 && canManage && (
          <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", padding: "1rem", borderRadius: 8, marginBottom: "1.5rem", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#92400e" }}>Chưa có dữ liệu hoặc Bảng CSDL chưa được tạo!</p>
              <p style={{ margin: 0, fontSize: "0.9rem", color: "#b45309" }}>Vui lòng chạy file script SQL <code>internal_trainings.sql</code> trong Supabase SQL Editor nếu bạn chưa làm điều đó.</p>
            </div>
          </div>
        )}

        {/* Tabs & Search */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {visibleTabs.map(tab => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    background: "none", border: "none", padding: "0.75rem 0", fontSize: "1rem", fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#3b82f6" : "#64748b", cursor: "pointer", position: "relative",
                    borderBottom: isActive ? "3px solid #3b82f6" : "3px solid transparent",
                    transition: "all 0.2s"
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>
          <div style={{ position: "relative", width: 280, marginBottom: "0.5rem" }}>
            <Search size={18} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm tài liệu..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ width: "100%", padding: "0.5rem 1rem 0.5rem 2.2rem", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: "0.9rem", boxSizing: "border-box" }}
            />
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div style={{ padding: "4rem", textAlign: "center", color: "#64748b" }}>Đang tải danh sách tài liệu...</div>
        ) : (
          <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={{ padding: "1rem", width: 60, color: "#475569", fontWeight: 600 }}>STT</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 600 }}>Nội dung đào tạo</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 600 }}>Phạm vi áp dụng</th>
                  <th style={{ padding: "1rem", color: "#475569", fontWeight: 600 }}>Chi nhánh</th>
                  <th style={{ padding: "1rem", width: 140, textAlign: "center", color: "#475569", fontWeight: 600 }}>Đính kèm</th>
                  {canManage && <th style={{ padding: "1rem", width: 100, textAlign: "center", color: "#475569", fontWeight: 600 }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredTrainings.length === 0 ? (
                  <tr>
                    <td colSpan={canManage ? 6 : 5} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                      Chưa có tài liệu nào trong nhóm "{activeTab}".
                    </td>
                  </tr>
                ) : (
                  filteredTrainings.map((t, idx) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }} onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"} onMouseLeave={e => e.currentTarget.style.background = "white"}>
                      <td style={{ padding: "1rem", color: "#64748b" }}>{idx + 1}</td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{t.title}</div>
                        {t.description && <div style={{ fontSize: "0.85rem", color: "#64748b", whiteSpace: "pre-wrap" }}>{t.description}</div>}
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {t.scopes?.map(s => (
                            <span key={s} style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: "#e0e7ff", color: "#3730a3", borderRadius: 99, fontWeight: 500 }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "1rem" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {(t.branches || ["Tất cả"]).map(b => (
                            <span key={b} style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem", background: b === "Tất cả" ? "#dcfce7" : "#fef3c7", color: b === "Tất cả" ? "#166534" : "#92400e", borderRadius: 99, fontWeight: 500 }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "1rem", textAlign: "center" }}>
                        {t.link_url ? (
                          <a href={t.link_url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "0.4rem 0.75rem", background: "#f1f5f9", color: "#3b82f6", borderRadius: 6, textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>
                            <ExternalLink size={14} /> Mở link
                          </a>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Không có</span>
                        )}
                      </td>
                      {canManage && (
                        <td style={{ padding: "1rem", textAlign: "center" }}>
                          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem" }}>
                            <button onClick={() => { setEditingItem(t); setShowModal(true); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }} title="Sửa">
                              <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(t.id, t.title)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 }} title="Xóa">
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <InternalTrainingModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        currentUser={currentUser} 
        onSuccess={fetchData}
        editingItem={editingItem}
      />
    </div>
  );
}

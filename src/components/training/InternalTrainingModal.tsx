"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, Save, Link as LinkIcon, Loader2 } from "lucide-react";

export interface InternalTraining {
  id: string;
  title: string;
  description: string;
  scopes: string[];
  branches: string[];
  link_url: string;
  created_at: string;
  created_by: string;
}

interface InternalTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; role: string };
  onSuccess: () => void;
  editingItem?: InternalTraining | null;
}

const SCOPES = ["Sale", "Kế toán", "Đào tạo", "Media Team", "Quản lý", "Tài liệu Mật"];
const BRANCHES = ["Tất cả", "Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"];

export default function InternalTrainingModal({
  isOpen,
  onClose,
  currentUser,
  onSuccess,
  editingItem
}: InternalTrainingModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>(["Tất cả"]);
  const [linkUrl, setLinkUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingItem) {
      setTitle(editingItem.title || "");
      setDescription(editingItem.description || "");
      setScopes(editingItem.scopes || []);
      setBranches(editingItem.branches || ["Tất cả"]);
      setLinkUrl(editingItem.link_url || "");
    } else {
      setTitle("");
      setDescription("");
      setScopes([]);
      setBranches(["Tất cả"]);
      setLinkUrl("");
    }
  }, [editingItem, isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Vui lòng nhập nội dung đào tạo.");
      return;
    }
    if (scopes.length === 0) {
      alert("Vui lòng chọn ít nhất một Phạm vi áp dụng.");
      return;
    }
    if (branches.length === 0) {
      alert("Vui lòng chọn ít nhất một Chi nhánh áp dụng.");
      return;
    }

    setIsSaving(true);
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("internal_trainings")
          .update({
            title,
            description,
            scopes,
            branches,
            link_url: linkUrl,
            updated_at: new Date().toISOString()
          })
          .eq("id", editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("internal_trainings")
          .insert({
            title,
            description,
            scopes,
            branches,
            link_url: linkUrl,
            created_by: currentUser.id
          });
        if (error) throw error;
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Lỗi khi lưu tài liệu: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleScope = (scope: string) => {
    if (scopes.includes(scope)) {
      setScopes(scopes.filter(s => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  const toggleBranch = (branch: string) => {
    if (branch === "Tất cả") {
      setBranches(["Tất cả"]);
      return;
    }
    let newBranches = branches.filter(b => b !== "Tất cả");
    if (newBranches.includes(branch)) {
      newBranches = newBranches.filter(b => b !== branch);
    } else {
      newBranches.push(branch);
    }
    if (newBranches.length === 0) newBranches = ["Tất cả"];
    setBranches(newBranches);
  };

  return (
    <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div className="modal-content" style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {editingItem ? "Chỉnh sửa Tài liệu Đào tạo" : "Thêm mới Tài liệu Đào tạo"}
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem", overflowY: "auto" }}>
          <form id="training-form" onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                Nội dung đào tạo (Tiêu đề) <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                placeholder="VD: Quy trình chốt Sale dành cho Telesale"
                style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.95rem" }}
                required
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                Diễn giải chi tiết
              </label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                placeholder="Nhập mô tả ngắn gọn về tài liệu này..."
                style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.95rem", minHeight: 80, resize: "vertical" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                Phạm vi áp dụng <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {SCOPES.map(scope => {
                  if (scope === "Tài liệu Mật" && currentUser.role !== "Super Admin") return null;
                  
                  const isChecked = scopes.includes(scope);
                  return (
                    <label key={scope} style={{ 
                      display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                      padding: "0.4rem 0.8rem", borderRadius: 6,
                      background: isChecked ? "#eff6ff" : "#f8fafc",
                      border: `1px solid ${isChecked ? "#3b82f6" : "#e2e8f0"}`,
                      transition: "all 0.2s"
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleScope(scope)} 
                        style={{ cursor: "pointer", margin: 0 }}
                      />
                      <span style={{ fontSize: "0.9rem", color: isChecked ? "#1e3a8a" : "#475569", fontWeight: isChecked ? 600 : 400 }}>
                        {scope}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                Chi nhánh áp dụng <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                {BRANCHES.map(branch => {
                  const isChecked = branches.includes(branch);
                  return (
                    <label key={branch} style={{ 
                      display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                      padding: "0.4rem 0.8rem", borderRadius: 6,
                      background: isChecked ? "#fffbeb" : "#f8fafc",
                      border: `1px solid ${isChecked ? "#d97706" : "#e2e8f0"}`,
                      transition: "all 0.2s"
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleBranch(branch)} 
                        style={{ cursor: "pointer", margin: 0 }}
                      />
                      <span style={{ fontSize: "0.9rem", color: isChecked ? "#92400e" : "#475569", fontWeight: isChecked ? 600 : 400 }}>
                        {branch}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                <LinkIcon size={16} /> Link tài liệu đính kèm (Ảnh/Drive/Docs)
              </label>
              <input 
                type="url" 
                value={linkUrl} 
                onChange={e => setLinkUrl(e.target.value)} 
                placeholder="https://docs.google.com/..."
                style={{ width: "100%", padding: "0.625rem 0.875rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.95rem" }}
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div style={{ padding: "1.25rem 1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "0.75rem", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={isSaving}
            style={{ padding: "0.625rem 1.25rem", background: "white", border: "1px solid #cbd5e1", borderRadius: 6, color: "#475569", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer" }}
          >
            Hủy bỏ
          </button>
          <button 
            type="submit" 
            form="training-form"
            disabled={isSaving}
            style={{ padding: "0.625rem 1.25rem", background: "#3b82f6", border: "none", borderRadius: 6, color: "white", fontWeight: 600, cursor: isSaving ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
          >
            {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {isSaving ? "Đang lưu..." : "Lưu tài liệu"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Package, 
  Plus, 
  CheckCircle, 
  AlertTriangle, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Zap, 
  Check, 
  Database, 
  RefreshCw,
  Search,
  FileSpreadsheet,
  Layers,
  ArrowRight
} from "lucide-react";
import { 
  getPadletPoolStats, 
  getPadletPoolList, 
  addPadletsToPool, 
  deletePadletFromPool, 
  assignPadletsToAllMissingStudents,
  PadletPoolItem, 
  PadletPoolStats 
} from "@/app/actions/padletPool";

interface PadletPoolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssignedChange?: () => void;
}

export default function PadletPoolModal({ isOpen, onClose, onAssignedChange }: PadletPoolModalProps) {
  const [activeTab, setActiveTab] = useState<"import" | "list">("import");
  const [stats, setStats] = useState<PadletPoolStats>({
    total: 0,
    available: 0,
    assigned: 0,
    isLowStock: false,
    tableExists: true
  });
  const [items, setItems] = useState<PadletPoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "assigned">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Input state for bulk import
  const [rawInput, setRawInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchStatsAndList = async () => {
    setLoading(true);
    const [statsRes, listRes] = await Promise.all([
      getPadletPoolStats(),
      getPadletPoolList("all")
    ]);

    if (statsRes.success) setStats(statsRes.data);
    if (listRes.success) setItems(listRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatsAndList();
    }
  }, [isOpen]);

  // Bộ phân tích dữ liệu dán vào (Smart Parser)
  const parsedItems = useMemo(() => {
    if (!rawInput.trim()) return [];

    const lines = rawInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const result: { padlet_url: string; padlet_api: string; note?: string }[] = [];

    // Kiểm tra định dạng theo từng dòng
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Trường hợp 1: Dán 2 cột từ Excel phân tách bằng phím Tab hoặc dấu phẩy hoặc gạch đứng |
      if (line.includes("\t") || line.includes("|") || (line.includes(",") && line.includes("http"))) {
        const parts = line.includes("\t") 
          ? line.split("\t") 
          : line.includes("|") 
            ? line.split("|") 
            : line.split(",");

        const col1 = (parts[0] || "").trim();
        const col2 = (parts[1] || "").trim();

        let padlet_url = "";
        let padlet_api = "";

        if (col1.includes("padlet.com") && (col2.includes("api.padlet.dev") || col2.startsWith("http") || col2.length >= 10)) {
          padlet_url = col1;
          padlet_api = col2;
        } else if (col2.includes("padlet.com") && col1.includes("api.padlet.dev")) {
          padlet_url = col2;
          padlet_api = col1;
        } else if (col1.startsWith("http") && col2.startsWith("http")) {
          padlet_url = col1;
          padlet_api = col2;
        }

        if (padlet_url && padlet_api) {
          result.push({ padlet_url, padlet_api });
          continue;
        }
      }

      // Trường hợp 2: Dán xen kẽ dòng lẻ là Link, dòng chẵn là API
      if (i + 1 < lines.length) {
        const line1 = lines[i];
        const line2 = lines[i + 1];

        if (line1.includes("padlet.com") && (line2.includes("api.padlet.dev") || line2.includes("http") || line2.length >= 10)) {
          result.push({ padlet_url: line1, padlet_api: line2 });
          i++; // Nhảy cóc dòng tiếp theo
          continue;
        }
      }
    }

    return result;
  }, [rawInput]);

  const handleBulkSubmit = async () => {
    if (parsedItems.length === 0) {
      alert("Vui lòng dán danh sách gồm Link Padlet và Padlet API hợp lệ!");
      return;
    }

    setIsSubmitting(true);
    const res = await addPadletsToPool(parsedItems);
    setIsSubmitting(false);

    if (res.success) {
      setToastMessage({ type: "success", text: res.message || `Đã nạp ${parsedItems.length} link vào kho!` });
      setRawInput("");
      setActiveTab("list");
      fetchStatsAndList();
    } else {
      setToastMessage({ type: "error", text: res.error || "Không thể nạp link vào kho." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa link Padlet này khỏi kho dự trữ?")) return;
    const res = await deletePadletFromPool(id);
    if (res.success) {
      fetchStatsAndList();
    } else {
      alert(res.error || "Lỗi khi xóa link.");
    }
  };

  const handleAutoAssignAll = async () => {
    if (!window.confirm("Hệ thống sẽ tự động lấy các link từ kho dự trữ để cấp cho toàn bộ học viên đang 'Thiếu Padlet'. Tiếp tục?")) return;

    setIsAutoAssigning(true);
    const res = await assignPadletsToAllMissingStudents();
    setIsAutoAssigning(false);

    if (res.success) {
      setToastMessage({ type: "success", text: res.message || `Đã cấp cho ${res.assignedCount} học viên!` });
      fetchStatsAndList();
      if (onAssignedChange) onAssignedChange();
    } else {
      setToastMessage({ type: "error", text: res.error || "Lỗi khi tự động cấp Padlet." });
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchUrl = item.padlet_url.toLowerCase().includes(q);
        const matchStudent = (item.assigned_to_student_name || "").toLowerCase().includes(q) || (item.assigned_to_student_id || "").toLowerCase().includes(q);
        return matchUrl || matchStudent;
      }
      return true;
    });
  }, [items, statusFilter, searchTerm]);

  const sqlCode = `-- Chạy lệnh này trong SQL Editor của Supabase CRM:
CREATE TABLE IF NOT EXISTS padlet_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  padlet_url TEXT NOT NULL,
  padlet_api TEXT NOT NULL,
  status TEXT DEFAULT 'available',
  assigned_to_student_id TEXT,
  assigned_to_student_name TEXT,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_padlet_pool_status_created ON padlet_pool (status, created_at ASC);
ALTER TABLE padlet_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc ghi kho Padlet" ON padlet_pool FOR ALL USING (true);`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(15, 23, 42, 0.65)",
      backdropFilter: "blur(4px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      padding: "1rem"
    }}>
      <div style={{
        backgroundColor: "white",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "920px",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        overflow: "hidden"
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#f8fafc"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              backgroundColor: "#e0e7ff",
              color: "#4f46e5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Package size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                Kho Link & API Padlet Dự Trữ
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Nạp sẵn 20 - 50 link để hệ thống tự động điền khi Kế toán tạo học viên mới.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "6px",
              borderRadius: "8px",
              display: "flex"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Database Notice if table doesn't exist */}
        {!stats.tableExists && (
          <div style={{
            margin: "1rem 1.5rem 0",
            padding: "1rem 1.25rem",
            backgroundColor: "#fffbeb",
            borderRadius: "12px",
            border: "1px solid #fde68a",
            display: "flex",
            alignItems: "flex-start",
            gap: "12px"
          }}>
            <Database size={24} color="#d97706" style={{ flexShrink: 0, marginTop: "2px" }} />
            <div style={{ flex: 1, fontSize: "0.85rem", color: "#92400e" }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                Bảng `padlet_pool` chưa được tạo trong Database Supabase CRM!
              </div>
              <div>
                Để kích hoạt kho dự trữ tự động, bạn chỉ cần bấm nút bên cạnh để copy đoạn mã SQL, sau đó mở <strong>SQL Editor</strong> trong Supabase CRM và bấm <strong>RUN</strong> là xong.
              </div>
            </div>
            <button
              onClick={copySql}
              style={{
                padding: "0.45rem 0.9rem",
                borderRadius: "8px",
                backgroundColor: copiedSql ? "#16a34a" : "#d97706",
                color: "white",
                border: "none",
                fontWeight: 600,
                fontSize: "0.8rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap"
              }}
            >
              {copiedSql ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedSql ? "Đã copy SQL!" : "Copy mã SQL"}</span>
            </button>
          </div>
        )}

        {/* KPI Strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1rem",
          padding: "1rem 1.5rem 0"
        }}>
          {/* Card 1: Còn khả dụng */}
          <div style={{
            padding: "0.9rem 1.15rem",
            borderRadius: "12px",
            backgroundColor: stats.available > 5 ? "#ecfdf5" : "#fef2f2",
            border: stats.available > 5 ? "1px solid #a7f3d0" : "1px solid #fecaca",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: stats.available > 5 ? "#065f46" : "#991b1b", textTransform: "uppercase" }}>
                🟢 Khả dụng (Sẵn sàng cấp)
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: stats.available > 5 ? "#047857" : "#b91c1c", marginTop: "2px" }}>
                {stats.available} link
              </div>
            </div>
            {stats.available <= 5 && (
              <span style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                backgroundColor: "#ef4444",
                color: "white",
                padding: "2px 8px",
                borderRadius: "999px"
              }}>
                SẮP HẾT!
              </span>
            )}
          </div>

          {/* Card 2: Đã cấp */}
          <div style={{
            padding: "0.9rem 1.15rem",
            borderRadius: "12px",
            backgroundColor: "#f0f9ff",
            border: "1px solid #bae6fd",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                🔵 Đã cấp cho học viên
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0284c7", marginTop: "2px" }}>
                {stats.assigned} link
              </div>
            </div>
          </div>

          {/* Card 3: Tổng link trong kho */}
          <div style={{
            padding: "0.9rem 1.15rem",
            borderRadius: "12px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                📦 Tổng số đã nạp
              </div>
              <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1e293b", marginTop: "2px" }}>
                {stats.total} link
              </div>
            </div>
          </div>
        </div>

        {/* Toast Message */}
        {toastMessage && (
          <div style={{
            margin: "0.75rem 1.5rem 0",
            padding: "0.6rem 1rem",
            borderRadius: "8px",
            backgroundColor: toastMessage.type === "success" ? "#dcfce7" : "#fee2e2",
            color: toastMessage.type === "success" ? "#166534" : "#991b1b",
            fontSize: "0.85rem",
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <span>{toastMessage.text}</span>
            <button
              onClick={() => setToastMessage(null)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontWeight: 700 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Tab Selector */}
        <div style={{
          display: "flex",
          borderBottom: "1px solid #e2e8f0",
          padding: "0 1.5rem",
          marginTop: "1rem"
        }}>
          <button
            onClick={() => setActiveTab("import")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              borderBottom: activeTab === "import" ? "2px solid #4f46e5" : "2px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === "import" ? "#4f46e5" : "#64748b"
            }}
          >
            📥 Nạp thêm 20 - 50 Link Hàng Loạt
          </button>
          <button
            onClick={() => setActiveTab("list")}
            style={{
              padding: "0.75rem 1.25rem",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              borderBottom: activeTab === "list" ? "2px solid #4f46e5" : "2px solid transparent",
              backgroundColor: "transparent",
              color: activeTab === "list" ? "#4f46e5" : "#64748b",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>Danh sách link trong kho</span>
            <span style={{
              backgroundColor: "#f1f5f9",
              color: "#475569",
              padding: "1px 6px",
              borderRadius: "999px",
              fontSize: "0.75rem"
            }}>
              {items.length}
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "1.25rem 1.5rem", overflowY: "auto", flex: 1 }}>
          {/* TAB 1: BULK IMPORT */}
          {activeTab === "import" && (
            <div>
              <div style={{
                backgroundColor: "#f8fafc",
                borderRadius: "12px",
                border: "1px dashed #cbd5e1",
                padding: "1rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                color: "#475569"
              }}>
                <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: "4px" }}>
                  💡 Cách dán dữ liệu nhanh:
                </div>
                <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.6 }}>
                  <li><strong>Cách 1 (Từ Excel / Google Sheets):</strong> Copy 2 cột <code>Link Padlet</code> và <code>API Padlet</code> rồi dán thẳng vào ô bên dưới.</li>
                  <li><strong>Cách 2 (Dán xen kẽ dòng):</strong> Dòng 1 là Link Padlet, Dòng 2 là API Padlet, cứ thế tiếp tục cho 20 - 50 link.</li>
                  <li><strong>Cách 3 (Phân cách bằng dấu |):</strong> <code>https://padlet.com/... | https://api.padlet.dev/...</code></li>
                </ul>
              </div>

              <textarea
                rows={7}
                placeholder="Dán danh sách 20 - 50 link Padlet và API vào đây..."
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.85rem",
                  fontSize: "0.85rem",
                  fontFamily: "monospace",
                  borderRadius: "10px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  backgroundColor: "white",
                  lineHeight: 1.5
                }}
              />

              {/* Preview detected items */}
              {parsedItems.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem"
                  }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#166534" }}>
                      ✓ Đã nhận diện hợp lệ: <strong>{parsedItems.length} cặp Link & API</strong>
                    </span>
                    <button
                      onClick={handleBulkSubmit}
                      disabled={isSubmitting}
                      style={{
                        padding: "0.55rem 1.25rem",
                        backgroundColor: "#4f46e5",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)"
                      }}
                    >
                      <span>{isSubmitting ? "Đang nạp..." : `🚀 Nạp ${parsedItems.length} link vào kho`}</span>
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div style={{
                    maxHeight: "220px",
                    overflowY: "auto",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                    fontSize: "0.8rem"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px", width: "40px" }}>#</th>
                          <th style={{ padding: "8px 12px" }}>Link Padlet học tập</th>
                          <th style={{ padding: "8px 12px" }}>Padlet API / Board ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedItems.map((item, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{idx + 1}</td>
                            <td style={{ padding: "8px 12px", color: "#0f172a", fontWeight: 600 }}>{item.padlet_url}</td>
                            <td style={{ padding: "8px 12px", color: "#64748b", fontFamily: "monospace" }}>{item.padlet_api}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: LIST & MANAGEMENT */}
          {activeTab === "list" && (
            <div>
              {/* Filter and Auto-Assign action bar */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    style={{
                      padding: "0.45rem 0.75rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.85rem",
                      outline: "none",
                      backgroundColor: "white"
                    }}
                  >
                    <option value="all">Tất cả ({items.length})</option>
                    <option value="available">🟢 Chưa sử dụng ({stats.available})</option>
                    <option value="assigned">🔵 Đã cấp ({stats.assigned})</option>
                  </select>

                  <div style={{ position: "relative" }}>
                    <Search size={14} color="#94a3b8" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      type="text"
                      placeholder="Tìm link hoặc học viên..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        padding: "0.45rem 0.75rem 0.45rem 2rem",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.85rem",
                        outline: "none",
                        width: "200px"
                      }}
                    />
                  </div>
                </div>

                {/* One-click Auto-Assign for all missing students */}
                <button
                  onClick={handleAutoAssignAll}
                  disabled={isAutoAssigning || stats.available === 0}
                  style={{
                    padding: "0.45rem 0.9rem",
                    backgroundColor: stats.available > 0 ? "#10b981" : "#94a3b8",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: stats.available > 0 ? "pointer" : "not-allowed",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 1px 3px rgba(16, 185, 129, 0.2)"
                  }}
                  title="Tự động lấy link từ kho cấp cho toàn bộ học viên hiện đang thiếu Padlet"
                >
                  <Zap size={14} />
                  <span>{isAutoAssigning ? "Đang cấp..." : "⚡ Cấp tự động cho học viên đang thiếu Padlet"}</span>
                </button>
              </div>

              {/* Items Table */}
              {loading ? (
                <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>
                  Đang tải danh sách kho Padlet...
                </div>
              ) : filteredItems.length === 0 ? (
                <div style={{
                  padding: "3rem 1.5rem",
                  textAlign: "center",
                  backgroundColor: "#f8fafc",
                  borderRadius: "12px",
                  border: "1px dashed #cbd5e1"
                }}>
                  <Package size={32} color="#94a3b8" style={{ margin: "0 auto 8px" }} />
                  <div style={{ fontWeight: 700, color: "#334155" }}>Kho Padlet chưa có link nào</div>
                  <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "4px 0 1rem" }}>
                    Chuyển sang tab <strong>"Nạp thêm 20 - 50 Link"</strong> để thêm link vào kho.
                  </p>
                  <button
                    onClick={() => setActiveTab("import")}
                    style={{
                      padding: "0.45rem 1rem",
                      borderRadius: "8px",
                      backgroundColor: "#4f46e5",
                      color: "white",
                      border: "none",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    + Nạp link ngay
                  </button>
                </div>
              ) : (
                <div style={{
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  fontSize: "0.82rem"
                }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "10px 12px" }}>Link Padlet</th>
                        <th style={{ padding: "10px 12px" }}>Padlet API / ID</th>
                        <th style={{ padding: "10px 12px" }}>Trạng thái</th>
                        <th style={{ padding: "10px 12px", textAlign: "right" }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => {
                        const isAssigned = item.status === "assigned";

                        return (
                          <tr key={item.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            {/* Link Padlet */}
                            <td style={{ padding: "10px 12px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <a
                                  href={item.padlet_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    color: "#4f46e5",
                                    fontWeight: 600,
                                    textDecoration: "none",
                                    maxWidth: "240px",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    display: "inline-block"
                                  }}
                                  title={item.padlet_url}
                                >
                                  {item.padlet_url}
                                </a>
                                <ExternalLink size={12} color="#94a3b8" />
                              </div>
                            </td>

                            {/* Padlet API */}
                            <td style={{ padding: "10px 12px", fontFamily: "monospace", color: "#64748b" }}>
                              <span style={{
                                maxWidth: "200px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "inline-block"
                              }} title={item.padlet_api}>
                                {item.padlet_api}
                              </span>
                            </td>

                            {/* Status */}
                            <td style={{ padding: "10px 12px" }}>
                              {isAssigned ? (
                                <div>
                                  <span style={{
                                    backgroundColor: "#e0f2fe",
                                    color: "#0369a1",
                                    padding: "2px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 700,
                                    fontSize: "0.72rem"
                                  }}>
                                    ĐÃ CẤP
                                  </span>
                                  <div style={{ fontWeight: 600, color: "#0f172a", marginTop: "3px" }}>
                                    {item.assigned_to_student_name || "Học viên"} ({item.assigned_to_student_id})
                                  </div>
                                </div>
                              ) : (
                                <span style={{
                                  backgroundColor: "#dcfce7",
                                  color: "#166534",
                                  padding: "2px 8px",
                                  borderRadius: "4px",
                                  fontWeight: 700,
                                  fontSize: "0.72rem"
                                }}>
                                  CHƯA SỬ DỤNG
                                </span>
                              )}
                            </td>

                            {/* Actions */}
                            <td style={{ padding: "10px 12px", textAlign: "right" }}>
                              {!isAssigned && (
                                <button
                                  onClick={() => handleDelete(item.id)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid #fee2e2",
                                    backgroundColor: "#fff5f5",
                                    color: "#dc2626",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px"
                                  }}
                                  title="Xóa link này khỏi kho"
                                >
                                  <Trash2 size={12} />
                                  <span>Xóa</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: "0.85rem 1.5rem",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}>
          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
            Khi kho còn ≤ 5 link, hệ thống sẽ tự động gửi chuông thông báo cho Super Admin.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              backgroundColor: "#f1f5f9",
              color: "#334155",
              border: "1px solid #cbd5e1",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

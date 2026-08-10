"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { X, Upload, FileSpreadsheet, CheckCircle, AlertCircle, Loader2, ChevronDown, Download } from "lucide-react";
import * as XLSX from "xlsx";

type CRMUser = { id: string; full_name: string; status: string; role: string; branch_id: string };

interface ImportRow {
  phone: string;
  full_name: string;
  child_name: string;
  child_yob: number;
  child_school: string;
  child_grade: string;
  isValid: boolean;
  error?: string;
}

interface ImportResult {
  created: number;
  updated: number;
  errors: number;
  errorDetails: string[];
}

interface CRMImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: CRMUser[];
  currentUser: { id: string; role: string; branch_id: string; full_name: string };
  onSuccess: () => void;
}

const DEFAULT_TOUCHPOINTS = [
  { code: "checkin", name: "1. Checkin hoặc Hẹn gặp", done: false },
  { code: "insight", name: "2. Khai thác Nỗi đau/Sung sướng", done: false },
  { code: "gift_child", name: "3. Tặng cho con trẻ một món quà gì đó", done: false },
  { code: "gift_parent", name: "4. Tặng cho cha mẹ quà tặng Online", done: false },
  { code: "test", name: "5. Test đầu vào (Quay Video/Phiếu)", done: false },
  { code: "account", name: "6. Cấp tài khoản RazKids, Padlet", done: false },
  { code: "zalo", name: "7. Tạo nhóm Zalo", done: false },
  { code: "trial", name: "8. Học thử tại VicEdu", done: false },
  { code: "foreign_teacher", name: "9. Giáo viên nước ngoài tặng bé 1 món quà?", done: false },
  { code: "sale", name: "10. Tư vấn & Chốt Sale", done: false },
];

function cleanPhone(raw: string): string {
  if (!raw) return "";
  let s = String(raw).trim().replace(/\D/g, "");
  if (s.startsWith("84") && s.length >= 11) s = "0" + s.substring(2);
  return s;
}

function parseRows(sheet: XLSX.WorkSheet): ImportRow[] {
  const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  const rows: ImportRow[] = [];

  // Bỏ qua hàng đầu nếu là header
  const startIdx = json.length > 0 && isNaN(Number(cleanPhone(String(json[0][0])))) ? 1 : 0;

  for (let i = startIdx; i < json.length; i++) {
    const row = json[i];
    if (!row || row.every((c: any) => !c)) continue;

    const phone = cleanPhone(String(row[0] ?? ""));
    const full_name = String(row[1] ?? "").trim();
    const child_name = String(row[2] ?? "").trim();
    const child_yob = parseInt(String(row[3] ?? "0")) || 0;
    const child_school = String(row[4] ?? "").trim();
    const child_grade = String(row[5] ?? "").trim();

    let isValid = true;
    let error = "";

    if (!phone || phone.length !== 10 || !phone.startsWith("0")) {
      isValid = false;
      error = "SĐT không hợp lệ";
    } else if (!full_name) {
      isValid = false;
      error = "Thiếu tên phụ huynh";
    }

    rows.push({ phone, full_name, child_name, child_yob, child_school, child_grade, isValid, error });
  }
  return rows;
}

function downloadTemplate() {
  const headers = [
    "Số điện thoại (*)",
    "Tên bố/mẹ (*)",
    "Tên con",
    "Năm sinh con",
    "Trường đang học",
    "Lớp đang học",
  ];
  const sampleData = [
    ["0981234567", "Nguyễn Thị An", "Bé Minh", 2018, "Tiểu học Hùng Vương", "Lớp 3"],
    ["0912345678", "Trần Văn B", "Bé Hà", 2019, "Tiểu học Lê Lợi", "Lớp 2"],
    ["0923456789", "Lê Thị C", "Bé Nam", 2017, "Tiểu học Trưng Vương", "Lớp 4"],
    ["0934567890", "Phạm Thị D", "Bé Linh", 2020, "", ""],
    ["0945678901", "Hoàng Văn E", "Bé Khôi", 2016, "THCS Nguyễn Du", "Lớp 6"],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

  // Style cột rộng hơn cho dễ đọc
  ws["!cols"] = [
    { wch: 20 }, // Số điện thoại
    { wch: 22 }, // Tên bố/mẹ
    { wch: 16 }, // Tên con
    { wch: 14 }, // Năm sinh
    { wch: 28 }, // Trường
    { wch: 14 }, // Lớp
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Danh sách Telesale");
  XLSX.writeFile(wb, "mau-import-telesale-vicedu.xlsx");
}

export default function CRMImportModal({
  isOpen, onClose, users, currentUser, onSuccess,
}: CRMImportModalProps) {
  const [step, setStep] = useState<"upload" | "preview" | "processing" | "done">("upload");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [assignedToIds, setAssignedToIds] = useState<string[]>([currentUser.id]);
  const [sourceName, setSourceName] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const myBranches = useMemo(() => {
    return currentUser.branch_id ? currentUser.branch_id.split(',').map(b => b.trim()).filter(Boolean) : [];
  }, [currentUser.branch_id]);
  const [selectedBranch, setSelectedBranch] = useState(myBranches[0] || "");

  useEffect(() => {
    if (isOpen) {
      setSelectedBranch(myBranches[0] || "");
    }
  }, [isOpen, myBranches]);

  const validRows = rows.filter(r => r.isValid);
  const invalidRows = rows.filter(r => !r.isValid);

  const eligibleUsers = users.filter(u => {
    if (u.status === "Nghỉ việc") return false;
    const branches = u.branch_id ? u.branch_id.split(",").map(b => b.trim()) : [];
    const myBranches = currentUser.branch_id ? currentUser.branch_id.split(",").map(b => b.trim()) : [];
    const isGlobal = ["Super Admin", "Giám đốc"].includes(currentUser.role);
    return isGlobal || branches.some(b => myBranches.includes(b));
  });

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const parsed = parseRows(sheet);
      setRows(parsed);
      setStep("preview");
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".xlsx")) handleFile(file);
  };

  const handleImport = async () => {
    if (!sourceName.trim()) {
      alert("Vui lòng nhập tên nguồn danh sách (VD: Trường ABC - T6/2026)");
      return;
    }
    if (assignedToIds.length === 0) {
      alert("Vui lòng chọn ít nhất 1 Sale để phân bổ");
      return;
    }

    setStep("processing");
    setIsProcessing(true);
    setProgress(0);

    const resultAccum: ImportResult = { created: 0, updated: 0, errors: 0, errorDetails: [] };
    let assignmentIndex = 0; // Bộ đếm để chia đều round-robin chính xác
    const activeBranch = selectedBranch || (myBranches[0] || currentUser.branch_id);

    try {
      // 1. Lấy hoặc tạo Chiến dịch (Campaign) để Tối ưu dung lượng
      let campaignId = "";
      const { data: existingCamp } = await supabase
        .from("crm_campaigns")
        .select("id")
        .eq("name", sourceName)
        .eq("branch_id", activeBranch)
        .maybeSingle();

      if (existingCamp) {
        campaignId = existingCamp.id;
      } else {
        const { data: newCamp, error: campErr } = await supabase
          .from("crm_campaigns")
          .insert({ name: sourceName, branch_id: activeBranch, created_by: currentUser.id })
          .select("id")
          .single();
        if (campErr) throw campErr;
        campaignId = newCamp.id;
      }

      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        setProgress(Math.round(((i + 1) / validRows.length) * 100));

        try {
          // Kiểm tra trùng SĐT
          const { data: existing } = await supabase
            .from("crm_customers")
            .select("id, children, assigned_to, campaign_id")
            .eq("phone", row.phone)
            .maybeSingle();

          // Kiểm tra xem SĐT này đã có con học tại TT chưa (trong bảng students)
          const { data: studentMatch } = await supabase
            .from("students")
            .select("id")
            .eq("parent_phone", row.phone)
            .limit(1);
          
          const isStudentParent = studentMatch && studentMatch.length > 0;
          const targetStatus = isStudentParent ? "Đã chốt (Học viên)" : "Mới tiếp cận";

          const childObj = {
            name: row.child_name,
            yob: row.child_yob || 0,
            school: row.child_school,
            grade: row.child_grade,
          };

          if (existing) {
            // --- UPDATE: bổ sung thông tin còn thiếu ---
            const existingChildren: any[] = existing.children || [];
            // Tìm con trùng tên hoặc thêm mới
            const childIdx = existingChildren.findIndex(
              c => c.name && row.child_name && c.name.trim() === row.child_name.trim()
            );
            let newChildren = [...existingChildren];
            if (childIdx >= 0) {
              // Ghi đè thông tin con đã có
              newChildren[childIdx] = { ...newChildren[childIdx], ...childObj };
            } else if (row.child_name) {
              newChildren.push(childObj);
            }

            const updateData: any = {
              full_name: row.full_name,
              children: newChildren,
              campaign_id: campaignId,
              source_name: sourceName, // Giữ lại cho tương thích ngược nếu cần
            };
            
            // Nếu phát hiện là PH học viên, cập nhật lại status luôn
            if (isStudentParent) {
              updateData.status = "Đã chốt (Học viên)";
            }

            // BẢO VỆ NGƯỜI PHỤ TRÁCH HIỆN TẠI:
            if (!existing.assigned_to) {
              const newAssignee = assignedToIds[assignmentIndex % assignedToIds.length];
              updateData.assigned_to = newAssignee;
              assignmentIndex++;
            }

            await supabase.from("crm_customers").update(updateData).eq("id", existing.id);

            // Log interaction tối ưu Free Tier (Chỉ log nếu đổi campaign)
            if (existing.campaign_id !== campaignId) {
              await supabase.from("crm_interactions").insert({
                customer_id: existing.id,
                sale_id: currentUser.id,
                action_type: "SYS_TRANSFER",
                content: `${existing.campaign_id || 'NULL'}->${campaignId}`,
              });
            }

            resultAccum.updated++;
          } else {
            // --- CREATE mới ---
            const children = row.child_name ? [childObj] : [];
            const currentAssignedTo = assignedToIds[assignmentIndex % assignedToIds.length];
            assignmentIndex++;

            const { data: newCustomer, error: insertErr } = await supabase
              .from("crm_customers")
              .insert({
                full_name: row.full_name,
                phone: row.phone,
                branch_id: activeBranch,
                campaign_id: campaignId,
                children,
                parent_role: "Khác",
                status: targetStatus,
                touchpoints: DEFAULT_TOUCHPOINTS,
                assigned_to: currentAssignedTo,
                created_by: currentUser.id,
                source_name: sourceName,
                lead_status: "Chưa gọi",
                call_count: 0,
              })
              .select()
              .single();

            if (insertErr) throw insertErr;

            await supabase.from("crm_interactions").insert({
              customer_id: newCustomer.id,
              sale_id: currentUser.id,
              action_type: "Tạo mới",
              content: `Import: ${campaignId}`,
            });

            resultAccum.created++;
          }
        } catch (err: any) {
          resultAccum.errors++;
          resultAccum.errorDetails.push(`${row.phone} — ${err.message}`);
        }
      }
    } catch (globalErr: any) {
      alert("Lỗi khởi tạo Chiến dịch: " + globalErr.message);
    }

    setResult(resultAccum);
    setStep("done");
    setIsProcessing(false);
  };

  const handleClose = () => {
    setStep("upload");
    setRows([]);
    setFileName("");
    setSourceName("");
    setResult(null);
    setProgress(0);
    setSelectedBranch(myBranches[0] || "");
    onClose();
    if (result && (result.created > 0 || result.updated > 0)) onSuccess();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content crm-modal animate-scale-in" style={{ maxWidth: 860 }}>
        {/* Header */}
        <div className="crm-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FileSpreadsheet size={22} color="#16a34a" />
            <h2 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>Import Danh sách Telesale</h2>
          </div>
          <button type="button" onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={24} />
          </button>
        </div>

        <div className="crm-modal-body" style={{ padding: "1.5rem" }}>

          {/* STEP: Upload */}
          {step === "upload" && (
            <div>
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: 12,
                  padding: "3rem",
                  textAlign: "center",
                  cursor: "pointer",
                  background: "#f8fafc",
                  transition: "border-color 0.2s",
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = "#3b82f6")}
                onMouseLeave={e => (e.currentTarget.style.borderColor = "#cbd5e1")}
              >
                <Upload size={40} color="#94a3b8" style={{ margin: "0 auto 1rem" }} />
                <p style={{ fontSize: "1rem", fontWeight: 600, color: "#334155" }}>
                  Kéo thả file Excel vào đây
                </p>
                <p style={{ color: "#64748b", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                  hoặc click để chọn file .xlsx
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  style={{ display: "none" }}
                  onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                />
              </div>

              <div style={{ marginTop: "1rem", textAlign: "center" }}>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 8,
                    padding: "0.6rem 1.25rem", borderRadius: 8, cursor: "pointer",
                    border: "1px solid #3b82f6", background: "#eff6ff",
                    color: "#2563eb", fontWeight: 600, fontSize: "0.9rem",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#dbeafe"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#eff6ff"; }}
                >
                  <Download size={16} />
                  Tải file mẫu (.xlsx)
                </button>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.4rem" }}>
                  File mẫu gồm 5 dòng dữ liệu ví dụ — xóa đi và nhập data thật
                </p>
              </div>

              <div style={{ marginTop: "1.5rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "1rem" }}>
                <p style={{ fontWeight: 600, color: "#166534", marginBottom: "0.5rem" }}>📋 Định dạng file Excel yêu cầu:</p>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ fontSize: "0.85rem", borderCollapse: "collapse", width: "100%" }}>
                    <thead>
                      <tr style={{ background: "#dcfce7" }}>
                        {["Cột A — Số điện thoại *", "Cột B — Tên bố/mẹ *", "Cột C — Tên con", "Cột D — Năm sinh con", "Cột E — Trường đang học", "Cột F — Lớp đang học"].map(h => (
                          <th key={h} style={{ padding: "0.5rem 0.75rem", border: "1px solid #86efac", color: "#166534" }}>{h}</th>
                        ))}
                      </tr>
                      <tr>
                        {["0981234567", "Nguyễn Thị A", "Bé Minh", "2018", "Tiểu học ABC", "Lớp 3"].map((v, i) => (
                          <td key={i} style={{ padding: "0.5rem 0.75rem", border: "1px solid #e2e8f0", color: "#64748b" }}>{v}</td>
                        ))}
                      </tr>
                    </thead>
                  </table>
                </div>
                <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.75rem" }}>
                  * Bắt buộc. Hàng đầu tiên có thể là tiêu đề (tự động bỏ qua). Mỗi dòng = 1 phụ huynh (1 con).
                </p>
              </div>
            </div>

          )}

          {/* STEP: Preview */}
          {step === "preview" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <p style={{ fontWeight: 600, color: "#1e293b" }}>📄 {fileName}</p>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>
                    Tổng: <b>{rows.length}</b> dòng &nbsp;|&nbsp;
                    <span style={{ color: "#16a34a" }}>✅ {validRows.length} hợp lệ</span>
                    {invalidRows.length > 0 && (
                      <span style={{ color: "#dc2626" }}> &nbsp;|&nbsp; ❌ {invalidRows.length} lỗi</span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep("upload"); setRows([]); }}
                  style={{ background: "none", border: "1px solid #cbd5e1", borderRadius: 6, padding: "0.4rem 0.75rem", cursor: "pointer", fontSize: "0.875rem", color: "#64748b" }}
                >
                  Chọn file khác
                </button>
              </div>

              {/* Config */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem", background: "#f8fafc", padding: "1rem", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div>
                    <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "0.4rem" }}>
                      📌 Tên nguồn danh sách *
                    </label>
                    <input
                      type="text"
                      value={sourceName}
                      onChange={e => setSourceName(e.target.value)}
                      placeholder="VD: Trường Tiểu học ABC - T6/2026"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", boxSizing: "border-box" }}
                    />
                  </div>
                  {myBranches.length > 1 && (
                    <div>
                      <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "0.4rem" }}>
                        🏢 Chi nhánh import dữ liệu *
                      </label>
                      <select
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", boxSizing: "border-box", background: "white" }}
                      >
                        {myBranches.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: "0.875rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "0.4rem" }}>
                    👤 Phân bổ cho (Chia đều tự động) *
                  </label>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", maxHeight: "120px", overflowY: "auto", padding: "0.25rem 0" }}>
                    {eligibleUsers.map(u => {
                      const isSelected = assignedToIds.includes(u.id);
                      return (
                        <label key={u.id} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: isSelected ? "#eff6ff" : "white",
                          padding: "0.4rem 0.75rem", borderRadius: 6,
                          border: `1px solid ${isSelected ? "#3b82f6" : "#cbd5e1"}`,
                          cursor: "pointer", transition: "all 0.2s"
                        }}>
                          <input type="checkbox" checked={isSelected} onChange={(e) => {
                            if (e.target.checked) setAssignedToIds([...assignedToIds, u.id]);
                            else setAssignedToIds(assignedToIds.filter(id => id !== u.id));
                          }} style={{ cursor: "pointer", margin: 0 }} />
                          <span style={{ fontSize: "0.85rem", fontWeight: isSelected ? 600 : 400, color: isSelected ? "#1e3a8a" : "#475569" }}>
                            {u.full_name}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Preview table */}
              <div style={{ maxHeight: 320, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                  <thead style={{ position: "sticky", top: 0, background: "#f8fafc", zIndex: 1 }}>
                    <tr>
                      {["#", "SĐT", "Phụ huynh", "Tên con", "Năm sinh", "Trường", "Lớp", ""].map(h => (
                        <th key={h} style={{ padding: "0.6rem 0.75rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={idx} style={{ background: row.isValid ? "transparent" : "#fff5f5" }}>
                        <td style={{ padding: "0.5rem 0.75rem", color: "#94a3b8" }}>{idx + 1}</td>
                        <td style={{ padding: "0.5rem 0.75rem", fontFamily: "monospace" }}>{row.phone}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{row.full_name}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{row.child_name}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{row.child_yob || ""}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{row.child_school}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>{row.child_grade}</td>
                        <td style={{ padding: "0.5rem 0.75rem" }}>
                          {row.isValid
                            ? <CheckCircle size={16} color="#16a34a" />
                            : <span style={{ color: "#dc2626", fontSize: "0.75rem" }}>❌ {row.error}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP: Processing */}
          {step === "processing" && (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <Loader2 size={48} color="#3b82f6" style={{ margin: "0 auto 1.5rem", animation: "spin 1s linear infinite" }} />
              <p style={{ fontSize: "1.1rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.5rem" }}>
                Đang import... {progress}%
              </p>
              <div style={{ width: "100%", maxWidth: 400, margin: "1rem auto 0", height: 8, background: "#e2e8f0", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "#3b82f6", transition: "width 0.3s", borderRadius: 99 }} />
              </div>
              <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: "0.75rem" }}>
                Đang xử lý {Math.round((progress / 100) * validRows.length)} / {validRows.length} khách hàng
              </p>
            </div>
          )}

          {/* STEP: Done */}
          {step === "done" && result && (
            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
              <CheckCircle size={56} color="#16a34a" style={{ margin: "0 auto 1.5rem" }} />
              <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "#1e293b", marginBottom: "1.5rem" }}>
                Import hoàn tất!
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "1.5rem" }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1rem 1.5rem" }}>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#16a34a" }}>{result.created}</p>
                  <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Tạo mới</p>
                </div>
                <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 10, padding: "1rem 1.5rem" }}>
                  <p style={{ fontSize: "2rem", fontWeight: 700, color: "#2563eb" }}>{result.updated}</p>
                  <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Cập nhật</p>
                </div>
                {result.errors > 0 && (
                  <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 10, padding: "1rem 1.5rem" }}>
                    <p style={{ fontSize: "2rem", fontWeight: 700, color: "#dc2626" }}>{result.errors}</p>
                    <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Lỗi</p>
                  </div>
                )}
              </div>
              {result.errorDetails.length > 0 && (
                <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "0.75rem", textAlign: "left", maxHeight: 120, overflowY: "auto" }}>
                  {result.errorDetails.map((e, i) => (
                    <div key={i} style={{ fontSize: "0.8rem", color: "#dc2626", padding: "0.2rem 0" }}>
                      <AlertCircle size={12} style={{ display: "inline", marginRight: 4 }} />{e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="crm-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            {step === "done" ? "Đóng" : "Hủy"}
          </button>
          {step === "preview" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={validRows.length === 0}
              style={{ background: "#16a34a", borderColor: "#16a34a", display: "flex", alignItems: "center", gap: 8 }}
            >
              <Upload size={16} />
              Import {validRows.length} khách hàng hợp lệ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

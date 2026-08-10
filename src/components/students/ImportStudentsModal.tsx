"use client";

import React, { useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { X, Download, AlertCircle, Upload, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ImportStudentsModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportStudentsModalProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // ── Tạo ID học viên theo chi nhánh ────────────────────────────────
  const generateIdForBranch = async (branch: string) => {
    let prefix = "VICVT";
    if (branch === "Tuyên Quang") prefix = "VICTQ";
    else if (branch === "Lâm Thao") prefix = "VICLT";
    else if (branch === "Dân Hòa") prefix = "VICDH";
    else if (branch === "Việt Trì 1") prefix = "VICVT1";
    else if (branch === "Việt Trì 2") prefix = "VICVT2";

    const { data } = await supabase
      .from("students")
      .select("id")
      .ilike("id", `${prefix}%`)
      .order("id", { ascending: false })
      .limit(1);

    let nextId = `${prefix}001`;
    if (data && data.length > 0) {
      const lastId = data[0].id;
      const numMatch = lastId.replace(prefix, "").match(/\d+/);
      if (numMatch) {
        const nextNum = parseInt(numMatch[0], 10) + 1;
        nextId = `${prefix}${nextNum.toString().padStart(3, "0")}`;
      }
    }
    return nextId;
  };

  // ── Tải file mẫu Excel ─────────────────────────────────────────────
  const downloadImportTemplate = () => {
    const headers = [
      "Chi Nhánh", "Họ và tên", "Nick name", "Link Padlet Học tập", "Padlet API",
      "Giới tính", "Ngày sinh", "Trường đang học", "Địa chỉ", "Tên Bố/Mẹ",
      "Điện thoại Bố/Mẹ", "Email (nếu có)", "Link Facebook PH", "Trình độ đầu vào",
      "Trình độ mục tiêu", "Cam kết đầu ra", "Ngày nhập học", "Tình trạng học",
      "Thầy cô tuyển sinh", "Tổng giờ còn lại", "Tổng chi phí còn lại",
    ];
    const sampleRow = [
      "Việt Trì 1", "Nguyễn Văn A", "Tommy", "https://padlet.com/..", "API_KEY_..",
      "Nam", "2015-01-01", "THCS Việt Trì", "Việt Trì", "Nguyễn Văn B",
      "0987654321", "email@gmail.com", "https://fb.com/..", "Starter",
      "Flyer", "Cambridge", "2024-01-01", "Đang học", "Cô Mai", "25.5", "2500000",
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws["!cols"] = headers.map((_, i) => ({ wch: i === 1 || i === 9 ? 22 : 18 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Danh sách Học viên");
    XLSX.writeFile(wb, "Mau_Import_Hoc_Vien.xlsx");
  };

  // ── Xử lý file Excel ───────────────────────────────────────────────
  const processFile = async (file: File) => {
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      alert("Vui lòng chọn file Excel (.xlsx hoặc .xls)!");
      return;
    }

    setIsImporting(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

      if (rows.length === 0) {
        alert("File không có dữ liệu!");
        return;
      }

      let successCount = 0;
      const errors: string[] = [];

      // Lớp phòng thủ 1: Fetch toàn bộ danh sách để check trùng lặp (trên RAM)
      const { data: allStudents } = await supabase.from("students").select("id, full_name, parent_phone");
      const existingStudents = allStudents || [];

      for (const row of rows) {
        const branchName = row["Chi Nhánh"] || "Việt Trì 1";
        const fullName = String(row["Họ và tên"] || "").trim();
        if (!fullName) continue; // bỏ qua hàng rỗng

        const parentPhone = String(row["Điện thoại Bố/Mẹ"] || "").trim();

        // Kiểm tra trùng lặp Tên + SĐT
        const isDuplicate = existingStudents.find(
          (s: any) => s.full_name?.toLowerCase() === fullName.toLowerCase() && s.parent_phone === parentPhone
        );
        if (isDuplicate) {
          errors.push(`${fullName}: Bị bỏ qua do trùng lặp Tên và SĐT (Mã cũ: ${isDuplicate.id})`);
          continue;
        }

        try {
          const nextId = await generateIdForBranch(branchName);

          const parseHours = (val: any) => {
            if (!val) return 0;
            if (typeof val === "number") return val;
            const str = String(val).replace(/,/g, '.').replace(/\\s/g, '');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
          };

          const parseCost = (val: any) => {
            if (!val) return 0;
            if (typeof val === "number") return val;
            const str = String(val).replace(/[,.\\s]/g, '');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
          };

          const remainingHours = parseHours(row["Tổng giờ còn lại"]);
          const validHours = remainingHours > 0 ? remainingHours : 0;
          
          const remainingCost = parseCost(row["Tổng chi phí còn lại"]);
          const validCost = remainingCost > 0 ? remainingCost : 0;

          const studentPayload = {
            id: nextId,
            branch_id: branchName,
            full_name: fullName,
            nickname: String(row["Nick name"] || ""),
            padlet_url: String(row["Link Padlet Học tập"] || ""),
            padlet_api: String(row["Padlet API"] || ""),
            gender: String(row["Giới tính"] || "Nam"),
            dob: row["Ngày sinh"] ? String(row["Ngày sinh"]) : null,
            school: String(row["Trường đang học"] || ""),
            address: String(row["Địa chỉ"] || ""),
            parent_name: String(row["Tên Bố/Mẹ"] || ""),
            parent_phone: String(row["Điện thoại Bố/Mẹ"] || ""),
            parent_email: String(row["Email (nếu có)"] || ""),
            parent_facebook: String(row["Link Facebook PH"] || ""),
            entry_level: String(row["Trình độ đầu vào"] || ""),
            target_level: String(row["Trình độ mục tiêu"] || ""),
            commitment: String(row["Cam kết đầu ra"] || ""),
            enrollment_date: row["Ngày nhập học"] ? String(row["Ngày nhập học"]) : null,
            status: (() => {
              const val = String(row["Tình trạng học"] || "").trim();
              if (!val || val === "Đang học") return "Chờ xếp lớp";
              return val;
            })(),
            sale_employee_id: String(row["Thầy cô tuyển sinh"] || ""),
            total_registered_hours: validHours,
            remaining_hours: validHours,
            total_registered_cost: validCost,
            remaining_cost: validCost,
          };

          const { error: studentErr } = await supabase.from("students").insert([studentPayload]);
          if (studentErr) {
            errors.push(`${fullName}: ${studentErr.message}`);
            continue;
          }

          // Thêm học viên vừa tạo vào bộ nhớ tạm để phát hiện trùng lặp ngay trong cùng file Excel
          existingStudents.push({ id: nextId, full_name: fullName, parent_phone: parentPhone });

          // Tạo 1 Phiếu đăng ký duy nhất nếu có giờ hoặc tiền
          if (validHours > 0 || validCost > 0) {
            await supabase.from("enrollments").insert([{
              student_id: nextId,
              branch_id: branchName,
              transaction_type: "Đăng ký mới",
              payment_method: "Chuyển khoản",
              amount: validCost,
              hours: validHours,
              registered_hours: validHours,
              remaining_hours: validHours,
              tuition_fee: validCost,
              status: "Active",
              note: "Tạo tự động từ dữ liệu chuyển giao phần mềm cũ",
              created_by: "System Migration",
            }]);
          }

          successCount++;
        } catch (rowErr: any) {
          errors.push(`${fullName}: ${rowErr.message}`);
        }
      }

      let msg = `✅ Import thành công ${successCount}/${rows.length} học viên!`;
      if (errors.length > 0) {
        msg += `\n\n❌ ${errors.length} lỗi:\n${errors.slice(0, 5).join("\n")}`;
        if (errors.length > 5) msg += `\n...và ${errors.length - 5} lỗi khác`;
      }
      alert(msg);
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Có lỗi xảy ra khi đọc file: " + err.message);
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in" style={{ width: "90%", maxWidth: "520px", padding: "1.5rem" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #10b981, #3b82f6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileSpreadsheet size={18} color="white" />
            </div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Import danh sách Học viên</h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Hướng dẫn */}
          <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.875rem 1rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
            <AlertCircle size={18} style={{ color: "#2563eb", flexShrink: 0, marginTop: "2px" }} />
            <div style={{ fontSize: "0.85rem", color: "#1e3a8a", lineHeight: 1.5 }}>
              Tải file mẫu Excel, điền đầy đủ thông tin học viên theo đúng định dạng cột rồi upload lên hệ thống.
            </div>
          </div>

          {/* Nút tải file mẫu */}
          <button
            onClick={downloadImportTemplate}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "0.65rem", borderRadius: 8, cursor: "pointer",
              border: "1px solid #16a34a", background: "#f0fdf4",
              color: "#16a34a", fontWeight: 600, fontSize: "0.9rem",
              transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#dcfce7"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#f0fdf4"; }}
          >
            <Download size={16} />
            Tải File mẫu Excel (.xlsx)
          </button>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onClick={() => !isImporting && fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragging ? "#3b82f6" : "#cbd5e1"}`,
              borderRadius: 10, padding: "2.5rem 1.5rem", textAlign: "center",
              cursor: isImporting ? "not-allowed" : "pointer",
              background: isDragging ? "#eff6ff" : "#f8fafc",
              transition: "all 0.2s",
            }}
          >
            <Upload size={36} color={isDragging ? "#3b82f6" : "#94a3b8"} style={{ margin: "0 auto 0.75rem" }} />
            <div style={{ fontWeight: 600, color: isDragging ? "#2563eb" : "#374151", fontSize: "0.95rem", marginBottom: "0.35rem" }}>
              {isImporting ? "⏳ Đang xử lý dữ liệu..." : "Kéo thả file Excel vào đây"}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
              {isImporting ? "Vui lòng chờ..." : "hoặc click để chọn file .xlsx"}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isImporting}
              style={{ display: "none" }}
            />
          </div>

          {/* Ghi chú cột */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.75rem 1rem" }}>
            <p style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600, marginBottom: "0.35rem" }}>📋 Các cột bắt buộc:</p>
            <p style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.6 }}>
              <b>Chi Nhánh</b> · <b>Họ và tên</b> · Giới tính · Ngày sinh · Trường đang học · Tên Bố/Mẹ · Điện thoại · Trình độ đầu vào · Ngày nhập học · Tình trạng học
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

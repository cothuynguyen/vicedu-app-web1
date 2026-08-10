"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Phone, PhoneOff, PhoneMissed, Star, XCircle, Calendar, MessageSquare } from "lucide-react";

interface CRMCustomer {
  id: string;
  full_name: string;
  phone: string;
  children?: { name: string; yob: number; school?: string; grade?: string }[];
  call_count?: number;
  lead_status?: string;
  callback_date?: string;
}

interface CRMCallLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CRMCustomer | null;
  currentUser: { id: string; role: string; branch_id: string; full_name: string };
  onSuccess: () => void;
}

type CallResult = "Nghe máy" | "Không nghe" | "Số sai/hỏng";
type LeadStatus = "Tiềm năng" | "Không tiềm năng" | "Hẹn lại" | "Chưa gọi";

export default function CRMCallLogModal({ isOpen, onClose, customer, currentUser, onSuccess }: CRMCallLogModalProps) {
  const [callResult, setCallResult] = useState<CallResult | null>(null);
  const [leadStatus, setLeadStatus] = useState<LeadStatus | null>(null);
  const [summary, setSummary] = useState("");
  const [callbackDate, setCallbackDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setCallResult(null);
    setLeadStatus(null);
    setSummary("");
    setCallbackDate("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!callResult) {
      alert("Vui lòng chọn kết quả cuộc gọi!");
      return;
    }
    if (callResult === "Nghe máy" && !leadStatus) {
      alert("Vui lòng phân loại khách hàng!");
      return;
    }
    if (callResult === "Nghe máy" && !summary.trim()) {
      alert("Vui lòng ghi tóm tắt nội dung cuộc gọi!");
      return;
    }
    if (leadStatus === "Hẹn lại" && !callbackDate) {
      alert("Vui lòng chọn ngày hẹn gọi lại!");
      return;
    }

    setIsSubmitting(true);
    try {
      const newCallCount = (customer?.call_count || 0) + 1;
      const finalLeadStatus = callResult === "Nghe máy" ? leadStatus : customer?.lead_status || "Chưa gọi";

      const updateData: any = {
        call_count: newCallCount,
        last_called_at: new Date().toISOString(),
        call_result: callResult,
      };
      if (callResult === "Nghe máy") {
        updateData.lead_status = leadStatus;
      }
      if (leadStatus === "Hẹn lại" && callbackDate) {
        updateData.callback_date = callbackDate;
      } else if (leadStatus !== "Hẹn lại") {
        updateData.callback_date = null;
      }

      const { error: updateErr } = await supabase
        .from("crm_customers")
        .update(updateData)
        .eq("id", customer!.id);

      if (updateErr) throw updateErr;

      // Build interaction content
      let content = `[Lần ${newCallCount}] Kết quả: ${callResult}`;
      if (callResult === "Nghe máy") {
        content += ` | Phân loại: ${leadStatus}`;
        if (summary) content += ` | Nội dung: ${summary}`;
        if (leadStatus === "Hẹn lại" && callbackDate) {
          content += ` | Hẹn lại: ${callbackDate}`;
        }
      }

      await supabase.from("crm_interactions").insert({
        customer_id: customer!.id,
        sale_id: currentUser.id,
        action_type: "Gọi điện",
        content,
      });

      resetForm();
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Lỗi khi lưu: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !customer) return null;

  const today = new Date().toISOString().split("T")[0];
  const currentYear = new Date().getFullYear();

  return (
    <div className="modal-overlay">
      <div className="modal-content crm-modal animate-scale-in" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div className="crm-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Phone size={18} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: "bold", margin: 0 }}>Ghi kết quả cuộc gọi</h2>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: 0 }}>Lần gọi thứ {(customer.call_count || 0) + 1}</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={24} />
          </button>
        </div>

        <div className="crm-modal-body" style={{ padding: "1.25rem 1.5rem" }}>
          {/* Thông tin khách hàng */}
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "0.875rem 1rem", marginBottom: "1.25rem" }}>
            <p style={{ fontWeight: 700, color: "#1e293b", fontSize: "1rem", margin: "0 0 0.3rem" }}>{customer.full_name}</p>
            <p style={{ color: "#3b82f6", fontFamily: "monospace", fontSize: "1rem", fontWeight: 600, margin: "0 0 0.3rem" }}>📞 {customer.phone}</p>
            {customer.children?.map((c, i) => (
              <p key={i} style={{ color: "#64748b", fontSize: "0.85rem", margin: "0.15rem 0 0" }}>
                Con {i + 1}: {c.name} ({c.yob ? `${currentYear - c.yob} tuổi` : "?"})
                {c.school && ` · ${c.school}`}{c.grade && ` · ${c.grade}`}
              </p>
            ))}
            {customer.lead_status && (
              <span style={{
                display: "inline-block", marginTop: "0.5rem",
                padding: "0.15rem 0.6rem", borderRadius: 99, fontSize: "0.75rem", fontWeight: 600,
                background: customer.lead_status === "Tiềm năng" ? "#dcfce7" : customer.lead_status === "Hẹn lại" ? "#fef3c7" : "#f1f5f9",
                color: customer.lead_status === "Tiềm năng" ? "#16a34a" : customer.lead_status === "Hẹn lại" ? "#92400e" : "#64748b",
              }}>
                {customer.lead_status}
              </span>
            )}
          </div>

          {/* Kết quả cuộc gọi */}
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.75rem" }}>
              Kết quả cuộc gọi *
            </label>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              {([
                { val: "Nghe máy", icon: <Phone size={16} />, color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
                { val: "Không nghe", icon: <PhoneMissed size={16} />, color: "#d97706", bg: "#fffbeb", border: "#fcd34d" },
                { val: "Số sai/hỏng", icon: <PhoneOff size={16} />, color: "#dc2626", bg: "#fff5f5", border: "#fca5a5" },
              ] as const).map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => { setCallResult(opt.val as CallResult); if (opt.val !== "Nghe máy") setLeadStatus(null); }}
                  style={{
                    flex: 1, padding: "0.6rem 0.5rem", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.85rem",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    border: `2px solid ${callResult === opt.val ? opt.color : opt.border}`,
                    background: callResult === opt.val ? opt.bg : "white",
                    color: callResult === opt.val ? opt.color : "#64748b",
                    transition: "all 0.15s",
                  }}
                >
                  {opt.icon}
                  <span>{opt.val}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Phân loại — chỉ hiện khi nghe máy */}
          {callResult === "Nghe máy" && (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.75rem" }}>
                  Phân loại khách hàng *
                </label>
                <div style={{ display: "flex", gap: "0.75rem" }}>
                  {([
                    { val: "Tiềm năng", icon: <Star size={16} />, color: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
                    { val: "Hẹn lại", icon: <Calendar size={16} />, color: "#2563eb", bg: "#eff6ff", border: "#93c5fd" },
                    { val: "Không tiềm năng", icon: <XCircle size={16} />, color: "#dc2626", bg: "#fff5f5", border: "#fca5a5" },
                  ] as const).map(opt => (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => setLeadStatus(opt.val as LeadStatus)}
                      style={{
                        flex: 1, padding: "0.6rem 0.4rem", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: "0.8rem",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                        border: `2px solid ${leadStatus === opt.val ? opt.color : opt.border}`,
                        background: leadStatus === opt.val ? opt.bg : "white",
                        color: leadStatus === opt.val ? opt.color : "#64748b",
                        transition: "all 0.15s",
                      }}
                    >
                      {opt.icon}
                      <span>{opt.val}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ngày hẹn callback */}
              {leadStatus === "Hẹn lại" && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.4rem" }}>
                    📅 Ngày hẹn gọi lại *
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={callbackDate}
                    onChange={e => setCallbackDate(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem" }}
                  />
                </div>
              )}

              {/* Tóm tắt nội dung */}
              <div style={{ marginBottom: "0.5rem" }}>
                <label style={{ fontSize: "0.875rem", fontWeight: 700, color: "#374151", display: "block", marginBottom: "0.4rem" }}>
                  <MessageSquare size={14} style={{ display: "inline", marginRight: 4 }} />
                  Tóm tắt nội dung *
                </label>
                <textarea
                  rows={3}
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Ghi tóm tắt những gì đã nói chuyện với phụ huynh..."
                  style={{ width: "100%", padding: "0.5rem 0.75rem", border: "1px solid #cbd5e1", borderRadius: 6, fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="crm-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleClose}>
            Hủy
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !callResult}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <Phone size={16} />
            {isSubmitting ? "Đang lưu..." : "Lưu kết quả"}
          </button>
        </div>
      </div>
    </div>
  );
}

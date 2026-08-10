"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, ArrowRight, AlertCircle, Loader2 } from "lucide-react";

type CRMUser = { id: string; full_name: string; status: string; role: string; branch_id: string };

interface CRMBulkReassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: CRMUser[];
  currentUser: { id: string; role: string; branch_id: string; full_name: string };
  selectedCustomerIds?: string[];
}

export default function CRMBulkReassignModal({
  isOpen,
  onClose,
  onSuccess,
  users,
  currentUser,
  selectedCustomerIds = []
}: CRMBulkReassignModalProps) {
  const [fromUserId, setFromUserId] = useState("");
  const [toUserId, setToUserId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [customerCount, setCustomerCount] = useState<number | null>(null);

  const hasSelection = selectedCustomerIds.length > 0;

  // Lọc nhân sự theo quyền
  const isGlobalRole = ['Super Admin', 'Giám đốc'].includes(currentUser.role);
  const myBranches = currentUser.branch_id ? currentUser.branch_id.split(',').map(b => b.trim()) : [];
  
  const eligibleUsers = users.filter(u => {
    if (u.status === "Nghỉ việc") return false;
    if (isGlobalRole) return true;
    const ub = u.branch_id ? u.branch_id.split(',').map(b => b.trim()) : [];
    return ub.some(b => myBranches.includes(b));
  });

  // Khi chọn "Từ nhân viên", đếm số lượng KH đang phụ trách (nếu KHÔNG chọn tay)
  useEffect(() => {
    if (hasSelection) {
      setCustomerCount(selectedCustomerIds.length);
      return;
    }

    if (!fromUserId) {
      setCustomerCount(null);
      return;
    }

    const fetchCount = async () => {
      const { count } = await supabase
        .from("crm_customers")
        .select("*", { count: 'exact', head: true })
        .eq("assigned_to", fromUserId);
      setCustomerCount(count || 0);
    };
    fetchCount();
  }, [fromUserId]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!hasSelection && !fromUserId) {
      alert("Vui lòng chọn người chuyển!");
      return;
    }
    if (!toUserId) {
      alert("Vui lòng chọn người nhận!");
      return;
    }
    if (!hasSelection && fromUserId === toUserId) {
      alert("Người chuyển và người nhận không được trùng nhau!");
      return;
    }
    if (customerCount === 0) {
      alert("Không có dữ liệu nào để chuyển!");
      return;
    }

    const msg = hasSelection 
      ? `Bạn có chắc chắn muốn chuyển ${customerCount} khách hàng đang chọn sang nhân sự mới?`
      : `Bạn có chắc chắn muốn chuyển TOÀN BỘ ${customerCount} khách hàng sang nhân sự mới?`;

    if (!window.confirm(msg)) {
      return;
    }

    setIsProcessing(true);
    try {
      let targetIds = [...selectedCustomerIds];

      // Nếu không chọn tay, lấy toàn bộ danh sách ID của nhân viên cũ
      if (!hasSelection) {
        const { data: targetCustomers, error: fetchErr } = await supabase
          .from("crm_customers")
          .select("id")
          .eq("assigned_to", fromUserId);
          
        if (fetchErr) throw fetchErr;
        targetIds = targetCustomers?.map((c: any) => c.id) || [];
      }

      if (targetIds.length === 0) {
        alert("Không tìm thấy khách hàng nào để chuyển.");
        setIsProcessing(false);
        return;
      }

      // 2. Chuyển giao hàng loạt
      const { error: updateErr } = await supabase
        .from("crm_customers")
        .update({ assigned_to: toUserId })
        .in("id", targetIds);

      if (updateErr) throw updateErr;

      // 3. Ghi log tương tác hàng loạt
      const toName = users.find(u => u.id === toUserId)?.full_name || "Unknown";
      
      const interactions = targetIds.map(id => ({
        customer_id: id,
        sale_id: currentUser.id,
        action_type: "Hệ thống",
        content: hasSelection 
          ? `Admin đã chuyển giao chỉ định khách hàng này sang [${toName}]`
          : `Admin đã chuyển giao hàng loạt Data từ [${users.find(u => u.id === fromUserId)?.full_name || "Unknown"}] sang [${toName}]`
      }));

      // Chèn log hàng loạt
      const chunkSize = 500;
      for (let i = 0; i < interactions.length; i += chunkSize) {
        const chunk = interactions.slice(i, i + chunkSize);
        await supabase.from("crm_interactions").insert(chunk);
      }

      alert(`✅ Đã chuyển giao thành công ${targetIds.length} dữ liệu!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert("Có lỗi xảy ra: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in" style={{ width: '90%', maxWidth: '550px', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Chuyển giao Data hàng loạt</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <AlertCircle size={20} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.85rem', color: '#1e3a8a', lineHeight: 1.5 }}>
            {hasSelection 
              ? <>Bạn đang chọn chuyển giao <b>{customerCount} khách hàng</b> cụ thể sang cho nhân viên mới.</>
              : <>Tính năng này sẽ chuyển <b>TOÀN BỘ</b> khách hàng đang do nhân viên A phụ trách sang cho nhân viên B chăm sóc.</>
            } Lịch sử tương tác của khách hàng vẫn được giữ nguyên.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
          {!hasSelection ? (
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Từ nhân viên (A):</label>
              <select
                value={fromUserId}
                onChange={e => setFromUserId(e.target.value)}
                className="form-input"
              >
                <option value="">-- Chọn nhân viên --</option>
                {eligibleUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
              {customerCount !== null && (
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.5rem" }}>
                  Đang có: <b style={{ color: "#ef4444" }}>{customerCount} Data</b>
                </div>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, textAlign: "center", background: "#f8fafc", padding: "1rem", borderRadius: 8, border: "1px dashed #cbd5e1" }}>
              <div style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>Đang chuyển giao:</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#ef4444" }}>{customerCount} Khách hàng</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1.5rem" }}>
            <div style={{ background: "#f1f5f9", padding: "0.5rem", borderRadius: "50%" }}>
              <ArrowRight size={20} color="#64748b" />
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Sang nhân viên (B):</label>
            <select
              value={toUserId}
              onChange={e => setToUserId(e.target.value)}
              className="form-input"
            >
              <option value="">-- Chọn người nhận --</option>
              {eligibleUsers.filter(u => u.id !== fromUserId).map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>Hủy</button>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit} 
            disabled={isProcessing || (!hasSelection && !fromUserId) || !toUserId || customerCount === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {isProcessing ? <Loader2 size={18} className="spin" /> : null}
            Thực hiện chuyển giao
          </button>
        </div>
      </div>
    </div>
  );
}

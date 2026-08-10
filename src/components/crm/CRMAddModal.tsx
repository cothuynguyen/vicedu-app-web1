"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, AlertTriangle, FileCheck, UserPlus } from "lucide-react";

type CRMUser = { id: string; full_name: string; status: string; role: string; branch_id: string };
type CRMCustomer = {
  id: string;
  branch_id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  parent_role: string;
  children: { name: string; yob: number; school?: string; grade?: string }[];
  insight: string;
  speaking_tester: string;
  entry_level: string;
  status: string;
  touchpoints: any[];
  assigned_to: string;
  created_by: string;
  created_at: string;
  assigned_sale?: CRMUser;
};

interface CRMAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCustomer: CRMCustomer | null;
  users: CRMUser[];
  currentUser: { id: string; role: string; branch_id: string; full_name: string };
  onSuccess: () => void;
  defaultTouchpoints: any[];
}

export default function CRMAddModal({
  isOpen,
  onClose,
  editingCustomer,
  users,
  currentUser,
  onSuccess,
  defaultTouchpoints
}: CRMAddModalProps) {
  const [formData, setFormData] = useState({
    full_name: "", phone: "", email: "", address: "",
    parent_role: "Mẹ", children: [{ name: "", yob: 2018, school: "", grade: "" }],
    insight: "", speaking_tester: "", entry_level: "",
    status: "Mới tiếp cận",
    branch_id: ""
  });

  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const myBranches = currentUser.branch_id ? currentUser.branch_id.split(',').map(b => b.trim()) : [];
    const defaultBranch = myBranches.length > 0 ? myBranches[0] : "Việt Trì 1";

    if (editingCustomer) {
      setFormData({
        full_name: editingCustomer.full_name,
        phone: editingCustomer.phone,
        email: editingCustomer.email || "",
        address: editingCustomer.address || "",
        parent_role: editingCustomer.parent_role || "Mẹ",
        children: editingCustomer.children?.length ? editingCustomer.children.map(c => ({ name: c.name || "", yob: c.yob || 2018, school: (c as any).school || "", grade: (c as any).grade || "" })) : [{ name: "", yob: 2018, school: "", grade: "" }],
        insight: editingCustomer.insight || "",
        speaking_tester: editingCustomer.speaking_tester || "",
        entry_level: editingCustomer.entry_level || "",
        status: editingCustomer.status === "Mới" ? "Mới tiếp cận" :
                editingCustomer.status === "Đang" ? "Đang tư vấn" :
                editingCustomer.status === "Đã" ? "Đã chốt (Học viên)" :
                editingCustomer.status === "Hủy" ? "Hủy / Chăm lại sau" :
                editingCustomer.status || "Mới tiếp cận",
        branch_id: editingCustomer.branch_id || defaultBranch
      });
      setDuplicateWarning(null);
    } else {
      setFormData({
        full_name: "", phone: "", email: "", address: "",
        parent_role: "Mẹ", children: [{ name: "", yob: 2018, school: "", grade: "" }],
        insight: "", speaking_tester: "", entry_level: "",
        status: "Mới tiếp cận",
        branch_id: defaultBranch
      });
      setDuplicateWarning(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingCustomer, isOpen]);

  if (!isOpen) return null;

  // Logic tự động làm sạch Số điện thoại
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;
    if (rawValue.startsWith('+84')) {
      rawValue = '0' + rawValue.substring(3);
    } else if (rawValue.startsWith('84') && rawValue.length >= 11) {
      rawValue = '0' + rawValue.substring(2);
    }
    const cleanValue = rawValue.replace(/\D/g, '');
    setFormData({ ...formData, phone: cleanValue });
  };

  // Logic Check trùng số điện thoại
  const handlePhoneBlur = async () => {
    if (!formData.phone || formData.phone.length < 9) return;
    setDuplicateWarning(null);

    try {
      const { data, error } = await supabase
        .from('crm_customers')
        .select('*')
        .eq('phone', formData.phone);
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        const existingCustomer = data[0];
        // Don't show warning if it's the customer we are currently editing
        if (editingCustomer && existingCustomer.id === editingCustomer.id) return;

        const assignedSale = users.find(u => u.id === existingCustomer.assigned_to);
        
        if (assignedSale) {
          if (assignedSale.status === "Nghỉ việc") {
            setDuplicateWarning({
              type: "transfer",
              customer: existingCustomer,
              sale: assignedSale,
              message: `Khách hàng này thuộc về Sale "${assignedSale.full_name}" đã nghỉ việc. Bạn có đồng ý lấy thông tin chuyển về cho bạn không?`
            });
          } else {
            setDuplicateWarning({
              type: "blocked",
              customer: existingCustomer,
              sale: assignedSale,
              message: `Khách hàng này đang thuộc sở hữu của Sale "${assignedSale.full_name}". Bạn không thể thêm mới!`
            });
          }
        }
      }
    } catch (error) {
      console.error("Check duplicate error:", error);
    }
  };

  const handleTransferOwnership = async () => {
    if (!duplicateWarning || duplicateWarning.type !== "transfer") return;
    setIsSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('crm_customers')
        .update({ assigned_to: currentUser.id })
        .eq('id', duplicateWarning.customer.id);
        
      if (updateError) throw updateError;
      
      await supabase.from('crm_interactions').insert({
        customer_id: duplicateWarning.customer.id,
        sale_id: currentUser.id,
        action_type: "Nhận bàn giao",
        content: `Nhận bàn giao tự động từ Sale nghỉ việc (${duplicateWarning.sale.full_name})`
      });
      
      alert("Đã nhận bàn giao khách hàng thành công!");
      setDuplicateWarning(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Lỗi khi nhận bàn giao: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNew = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.phone || formData.phone.length !== 10 || !formData.phone.startsWith('0')) {
      alert("Vui lòng nhập số điện thoại di động hợp lệ (Bắt đầu bằng số 0 và có đúng 10 chữ số)!");
      return;
    }
    if (!formData.full_name) {
      alert("Vui lòng nhập Họ và Tên Phụ huynh!");
      return;
    }
    if (!formData.insight) {
      alert("Vui lòng nhập Thông tin Insight Khách hàng (Nỗi đau, Sự sung sướng)!");
      return;
    }
    
    if (duplicateWarning?.type === "blocked") {
      alert("Không thể lưu vì số điện thoại đã bị trùng với Sale khác đang làm việc.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (editingCustomer) {
        const { error: updateError } = await supabase
          .from('crm_customers')
          .update(formData)
          .eq('id', editingCustomer.id);
          
        if (updateError) throw updateError;
        
        await supabase.from('crm_interactions').insert({
          customer_id: editingCustomer.id,
          sale_id: currentUser.id,
          action_type: "Hệ thống",
          content: `Đã cập nhật thông tin hồ sơ`
        });
        
        alert("Cập nhật khách hàng thành công!");
      } else {
        const newCustomerData = {
          ...formData,
          touchpoints: defaultTouchpoints,
          assigned_to: currentUser.id,
          created_by: currentUser.id,
          created_at: new Date().toISOString(),
          last_interacted_at: new Date().toISOString()
        };
        const { data: newCustomer, error: insertError } = await supabase
          .from('crm_customers')
          .insert(newCustomerData)
          .select()
          .single();
          
        if (insertError) throw insertError;
        
        await supabase.from('crm_interactions').insert({
          customer_id: newCustomer.id,
          sale_id: currentUser.id,
          action_type: "Tạo mới",
          content: `Tạo mới hồ sơ khách hàng`
        });
        
        alert("Thêm khách hàng thành công!");
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Lỗi khi lưu: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content crm-modal animate-scale-in">
        <div className="crm-modal-header">
          <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{editingCustomer ? "Cập nhật Khách hàng" : "Thêm Khách hàng mới"}</h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={24} /></button>
        </div>
        
        <form onSubmit={handleAddNew} className="crm-modal-form">
          <div className="crm-modal-body">
            {duplicateWarning && duplicateWarning.type === "blocked" && (
              <div className="alert-danger">
                <AlertTriangle size={20} style={{ flexShrink: 0 }} />
                <div>{duplicateWarning.message}</div>
              </div>
            )}
            
            {duplicateWarning && duplicateWarning.type === "transfer" && (
              <div className="alert-warning">
                <FileCheck size={20} style={{ flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ marginBottom: "0.5rem", fontWeight: 500 }}>{duplicateWarning.message}</div>
                  <button type="button" className="btn btn-primary" onClick={handleTransferOwnership} disabled={isSubmitting}>
                    Đồng ý Nhận Bàn Giao
                  </button>
                </div>
              </div>
            )}
          
            <div className="form-grid">
              <div className="form-group full-width">
                <h3 style={{ fontSize: "1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>Thông tin liên hệ</h3>
              </div>
              <div className="form-group">
                <label>Số điện thoại *</label>
                <input type="text" value={formData.phone} onChange={handlePhoneChange} onBlur={handlePhoneBlur} placeholder="Nhập đúng 10 số (VD: 0981234567)" />
              </div>
              <div className="form-group">
                <label>Họ và Tên Phụ huynh *</label>
                <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} placeholder="Nguyễn Văn A" />
              </div>
              <div className="form-group">
                <label>Trạng thái Khách hàng *</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
                  <option value="Mới tiếp cận">Mới tiếp cận</option>
                  <option value="Đang tư vấn">Đang tư vấn</option>
                  <option value="Đã chốt (Học viên)">Đã chốt (Học viên)</option>
                  <option value="Hủy / Chăm lại sau">Hủy / Chăm lại sau</option>
                </select>
              </div>
              <div className="form-group">
                <label>Chi nhánh *</label>
                <select value={formData.branch_id} onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}>
                  {(() => {
                    const isGlobalRole = ['Super Admin', 'Giám đốc'].includes(currentUser.role);
                    const myBranches = currentUser.branch_id ? currentUser.branch_id.split(',').map(b => b.trim()) : [];
                    const allowedBranches = isGlobalRole ? ["Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"] : myBranches;
                    return allowedBranches.map((b, i) => (
                      <option key={i} value={b}>{b}</option>
                    ));
                  })()}
                </select>
              </div>
              <div className="form-group">
                <label>Vai trò *</label>
                <select value={formData.parent_role} onChange={(e) => setFormData({ ...formData, parent_role: e.target.value })}>
                  <option value="Mẹ">Mẹ</option>
                  <option value="Bố">Bố</option>
                  <option value="Ông/Bà">Ông/Bà</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="example@gmail.com" />
              </div>
              
              <div className="form-group full-width" style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Thông tin Học sinh (Các con)</h3>
                <button type="button" onClick={() => setFormData({ ...formData, children: [...(formData.children || []), { name: "", yob: 2018, school: "", grade: "" }] })} style={{ background: "none", border: "none", color: "#3b82f6", fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", fontSize: "0.9rem" }}>
                  <UserPlus size={16} /> Thêm bé nữa
                </button>
              </div>
              
              {(formData.children || []).map((child, index) => (
                <React.Fragment key={index}>
                  <div className="form-group">
                    <label>Tên con thứ {index + 1}</label>
                    <input type="text" value={child.name} onChange={(e) => {
                      const newChildren = [...(formData.children || [])];
                      newChildren[index].name = e.target.value;
                      setFormData({ ...formData, children: newChildren });
                    }} placeholder="Tên bé..." />
                  </div>
                  <div className="form-group" style={{ position: "relative" }}>
                    <label>Năm sinh</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input type="number" style={{ flex: 1 }} value={child.yob} onChange={(e) => {
                        const newChildren = [...(formData.children || [])];
                        newChildren[index].yob = parseInt(e.target.value) || 2018;
                        setFormData({ ...formData, children: newChildren });
                      }} />
                      {(formData.children || []).length > 1 && (
                        <button type="button" onClick={() => {
                          const newChildren = (formData.children || []).filter((_, i) => i !== index);
                          setFormData({ ...formData, children: newChildren });
                        }} style={{ background: "#fee2e2", color: "#dc2626", border: "none", padding: "0 0.75rem", borderRadius: "6px", cursor: "pointer" }}>
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Trường đang học</label>
                    <input type="text" value={(child as any).school || ""} onChange={(e) => {
                      const newChildren = [...(formData.children || [])];
                      (newChildren[index] as any).school = e.target.value;
                      setFormData({ ...formData, children: newChildren });
                    }} placeholder="VD: Tiểu học Hùng Vương..." />
                  </div>
                  <div className="form-group">
                    <label>Lớp đang học</label>
                    <input type="text" value={(child as any).grade || ""} onChange={(e) => {
                      const newChildren = [...(formData.children || [])];
                      (newChildren[index] as any).grade = e.target.value;
                      setFormData({ ...formData, children: newChildren });
                    }} placeholder="VD: Lớp 3, Lớp 5..." />
                  </div>
                </React.Fragment>
              ))}
              
              <div className="form-group full-width" style={{ marginTop: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 600, borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>Insight Khách hàng (Quan trọng) *</h3>
              </div>
              <div className="form-group full-width">
                <textarea 
                  rows={3} 
                  value={formData.insight} 
                  onChange={(e) => setFormData({ ...formData, insight: e.target.value })} 
                  placeholder="Ghi chú Nỗi đau, Sự sung sướng, lý do khách hàng tìm đến VicEdu..."
                />
              </div>
            </div>
          </div>
          <div className="crm-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting || (duplicateWarning?.type === "blocked" && !editingCustomer)}>
              {isSubmitting ? "Đang xử lý..." : "Lưu Khách hàng"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

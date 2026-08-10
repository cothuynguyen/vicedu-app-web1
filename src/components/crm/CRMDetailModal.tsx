"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { X, User, ListChecks, History, Send, Edit2, Trash2, Check, XCircle } from "lucide-react";
import { compressImage } from "@/utils/imageCompressor";
import { uploadImageToCloudflare } from "@/utils/uploadImage";

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
  call_count?: number;
  last_called_at?: string;
  lead_status?: string;
  assigned_sale?: CRMUser;
};

interface CRMDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CRMCustomer | null;
  users: CRMUser[];
  currentUser: { id: string; role: string; branch_id: string; full_name: string };
  onSuccess: () => void;
}

const ADMIN_ROLES = ["Super Admin", "Admin", "Giám đốc", "Quản lý"];

export default function CRMDetailModal({
  isOpen, onClose, customer, users, currentUser, onSuccess,
}: CRMDetailModalProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [interactions, setInteractions] = useState<any[]>([]);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  // Checkin state
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinType, setCheckinType] = useState('Tại trung tâm');
  const [checkinImage, setCheckinImage] = useState<File | null>(null);
  const [checkinPreview, setCheckinPreview] = useState<string | null>(null);
  const [testVideoLink, setTestVideoLink] = useState("");
  const [testTeacherId, setTestTeacherId] = useState("");
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // Theo dõi customer đang mở để tránh reset tab khi parent refetch
  const lastOpenedCustomerId = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && customer) {
      if (customer.id !== lastOpenedCustomerId.current) {
        // Modal mở cho khách hàng MỚI → reset tab và fetch
        setActiveTab("info");
        lastOpenedCustomerId.current = customer.id;
        fetchInteractions(customer.id, customer.phone);
      }
      // Cập nhật data khách hàng (kể cả khi parent refetch) — KHÔNG reset tab
      setSelectedCustomer(customer);
    } else if (!isOpen) {
      lastOpenedCustomerId.current = null;
      setSelectedCustomer(null);
    }
  }, [customer, isOpen]);

  const fetchInteractions = async (customerId: string, phone: string) => {
    try {
      let allActs: any[] = [];
      const { data, error } = await supabase
        .from('crm_interactions')
        .select('*')
        .eq('customer_id', customerId);
      if (error) throw error;
      
      const joinedData = (data || []).map((i: any) => ({
        ...i,
        source: 'crm',
        sale_name: users.find((u: any) => u.id === i.sale_id)?.full_name || "Unknown"
      }));
      allActs = [...allActs, ...joinedData];

      if (phone) {
        const { data: lpActs } = await supabase
          .from('customer_activities')
          .select('id, activity_type, description, created_at, user:users(full_name)')
          .eq('phone', phone);
          
        if (lpActs) {
           const lpMapped = lpActs.map((a: any) => ({
             id: a.id,
             action_type: a.activity_type === 'FORM_SUBMIT' ? 'Điền Form' : a.activity_type === 'NOTE' ? 'Ghi chú' : a.activity_type,
             content: a.description,
             created_at: a.created_at,
             sale_name: a.user?.full_name || "Hệ thống Landing",
             source: 'landing',
             sale_id: 'LANDING' // Không cho sửa/xóa log từ Landing bằng CRM Chính
           }));
           allActs = [...allActs, ...lpMapped];
        }
      }

      allActs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setInteractions(allActs);
    } catch (e) {
      console.error(e);
      setInteractions([]);
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    try {
      // 1. Get resumable upload URL from Proxy API (Bypasses CORS completely)
      const queryParams = new URLSearchParams({
        fileName: file.name,
        mimeType: file.type,
        origin: window.location.origin
      });

      const initResponse = await fetch(`/api/drive-upload?${queryParams.toString()}`, {
        method: "GET",
      });

      const initText = await initResponse.text();
      let initResult;
      try {
        initResult = initText ? JSON.parse(initText) : {};
      } catch (e) {
        throw new Error(`API Proxy trả về dữ liệu không hợp lệ: ${initText}`);
      }
      
      if (initResult.status !== 'success') {
        throw new Error(initResult.message || 'Lỗi không xác định từ máy chủ');
      }

      // 2. Upload file directly to Google Drive URL
      const uploadUrl = initResult.uploadUrl;
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text();
        throw new Error(`Lỗi khi tải file lên Google: ${errText}`);
      }

      const uploadText = await uploadResponse.text();
      let uploadResult;
      try {
        uploadResult = uploadText ? JSON.parse(uploadText) : {};
      } catch (e) {
        throw new Error(`Google trả về dữ liệu không hợp lệ: ${uploadText}`);
      }

      if (uploadResult.webViewLink) {
        setTestVideoLink(uploadResult.webViewLink);
      } else {
        throw new Error("Không lấy được đường dẫn video từ Google.");
      }
      
    } catch (error: any) {
      console.error("Upload video error:", error);
      alert("Đã xảy ra lỗi khi tải video lên: " + error.message);
    } finally {
      setIsUploadingVideo(false);
    }
  };

  if (!isOpen || !selectedCustomer) return null;

  const isAdmin = ADMIN_ROLES.includes(currentUser.role);
  const canEdit = (interaction: any) =>
    interaction.action_type !== "Hệ thống" &&
    (interaction.sale_id === currentUser.id || isAdmin);
  const canDelete = (interaction: any) =>
    interaction.sale_id === currentUser.id || isAdmin;

  const handleToggleTouchpoint = async (code: string, currentValue: boolean) => {
    const newTouchpoints = selectedCustomer.touchpoints.map((t:any) => {
      if (t.code === code) {
        if (!currentValue) { // ticking
          return { ...t, done: true, count: t.count ? t.count + 1 : 1 };
        } else { // unticking
          return { ...t, done: false, count: 0 };
        }
      }
      return t;
    });
    setSelectedCustomer({ ...selectedCustomer, touchpoints: newTouchpoints });
    try {
      await supabase.from('crm_customers').update({
        touchpoints: newTouchpoints,
        last_interacted_at: new Date().toISOString()
      }).eq('id', selectedCustomer.id);
      const actionType = code === 'checkin' ? 'Checkin' : 'Hệ thống';
      const actionContent = code === 'checkin' 
        ? 'Đã hoàn thành Check-in tại trung tâm' 
        : `Đã hoàn thành điểm chạm: ${selectedCustomer.touchpoints.find((t: any) => t.code === code)?.name}`;

      if (!currentValue) {
        await supabase.from('crm_interactions').insert({
          customer_id: selectedCustomer.id,
          sale_id: currentUser.id,
          action_type: actionType,
          content: actionContent
        });
      } else {
        await supabase.from('crm_interactions')
          .delete()
          .eq('customer_id', selectedCustomer.id)
          .eq('action_type', actionType)
          .eq('content', actionContent);
      }
      fetchInteractions(selectedCustomer.id, selectedCustomer.phone);
      onSuccess();
    } catch (e) { console.error(e); }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_SIZE = 1024;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas to Blob failed'));
          }, 'image/jpeg', 0.7); // 70% quality JPEG
        };
        img.onerror = () => reject(new Error('Image load failed'));
        if (event.target?.result) img.src = event.target.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRecordCheckin = async () => {
    if (!checkinImage) {
      alert("Vui lòng tải lên ảnh minh chứng có mặt phụ huynh!");
      return;
    }
    setIsSubmitting(true);
    try {
      const compressedBlob = await compressImage(checkinImage);
      const imageUrl = await uploadImageToCloudflare(compressedBlob);

      let content = `[Check-in ${checkinType}]\nẢnh minh chứng: ${imageUrl}`;
      if (testTeacherId) {
        const teacher = users.find(u => u.id === testTeacherId);
        if (teacher) {
          content += `\nGiáo viên Test: ${teacher.full_name}\nGiáo viên Test ID: ${testTeacherId}`;
        }
      }
      if (testVideoLink.trim()) {
        content += `\nLink Video Test: ${testVideoLink.trim()}`;
      }
      
      await supabase.from('crm_interactions').insert({
        customer_id: selectedCustomer.id,
        sale_id: currentUser.id,
        action_type: 'Checkin',
        content: content
      });

      const newTouchpoints = [...(selectedCustomer.touchpoints || [])];
      const tpIndex = newTouchpoints.findIndex((t:any) => t.code === 'checkin');
      if (tpIndex > -1) {
        newTouchpoints[tpIndex].done = true;
        newTouchpoints[tpIndex].count = (newTouchpoints[tpIndex].count || 0) + 1;
      }

      await supabase.from('crm_customers').update({ 
        touchpoints: newTouchpoints, 
        last_interacted_at: new Date().toISOString() 
      }).eq('id', selectedCustomer.id);
      
      setSelectedCustomer({ ...selectedCustomer, touchpoints: newTouchpoints });
      fetchInteractions(selectedCustomer.id, selectedCustomer.phone);
      
      setShowCheckinForm(false);
      setCheckinImage(null);
      setCheckinPreview(null);
      setCheckinType('Tại trung tâm');
      setTestVideoLink("");
      setTestTeacherId("");
      onSuccess();
    } catch(e: any) { 
      console.error(e);
      alert("Lỗi Ghi nhận Check-in: " + (e.message || "Unknown error"));
    }
    setIsSubmitting(false);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);
    try {
      await supabase.from('crm_interactions').insert({
        customer_id: selectedCustomer.id,
        sale_id: currentUser.id,
        action_type: "Ghi chú",
        content: newNote.trim()
      });
      await supabase.from('crm_customers').update({
        last_interacted_at: new Date().toISOString()
      }).eq('id', selectedCustomer.id);
      setNewNote("");
      fetchInteractions(selectedCustomer.id, selectedCustomer.phone);
      onSuccess();
    } catch (e: any) {
      alert("Lỗi: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (interaction: any) => {
    setEditingId(interaction.id);
    setEditingContent(interaction.content);
  };

  const handleSaveEdit = async (interactionId: string) => {
    if (!editingContent.trim()) return;
    try {
      const { error } = await supabase
        .from('crm_interactions')
        .update({ content: editingContent.trim() })
        .eq('id', interactionId);
      if (error) throw error;
      setEditingId(null);
      fetchInteractions(selectedCustomer.id, selectedCustomer.phone);
    } catch (e: any) {
      alert("Lỗi khi sửa: " + e.message);
    }
  };

  const handleDelete = async (interactionId: string) => {
    if (!window.confirm("Xóa nhật ký tương tác này? Thao tác không thể hoàn tác.")) return;

    // Lấy thông tin interaction trong local state TRƯỚC khi xóa
    const toDelete = interactions.find(i => i.id === interactionId);
    const isCallLog = toDelete?.action_type === "Gọi điện";
    const isCheckin = toDelete?.action_type === "Checkin";

    try {
      // 1. Xóa interaction
      const { error } = await supabase
        .from('crm_interactions')
        .delete()
        .eq('id', interactionId);
      if (error) throw error;

      // 2. Cập nhật local interactions state ngay lập tức (real-time UI)
      const remaining = interactions.filter(i => i.id !== interactionId);
      setInteractions(remaining);

      // 3. Nếu là log cuộc gọi → tính lại call_count từ remaining
      if (isCallLog) {
        const remainingCalls = remaining.filter(i => i.action_type === "Gọi điện");
        const newCallCount = remainingCalls.length;
        const newLastCalled = remainingCalls[0]?.created_at ?? null;

        // Cập nhật local selectedCustomer ngay (real-time hiển thị trong modal)
        setSelectedCustomer(prev => prev ? {
          ...prev,
          call_count: newCallCount,
          last_called_at: newLastCalled,
        } : prev);

        // Cập nhật DB
        await supabase
          .from('crm_customers')
          .update({
            call_count: newCallCount,
            last_called_at: newLastCalled,
          })
          .eq('id', selectedCustomer.id);

        // Cập nhật bảng ngoài (parent)
        onSuccess();
      } else if (isCheckin) {
        // Đếm lại số lượng Checkin thực tế còn lại
        const remainingCheckins = remaining.filter(i => i.action_type === "Checkin");
        const newCheckinCount = remainingCheckins.length;

        // Cập nhật mảng touchpoints
        const newTouchpoints = [...(selectedCustomer.touchpoints || [])];
        const tpIndex = newTouchpoints.findIndex((t:any) => t.code === 'checkin');
        
        if (tpIndex > -1) {
          if (newCheckinCount === 0) {
            newTouchpoints[tpIndex].done = false;
            newTouchpoints[tpIndex].count = 0;
          } else {
            newTouchpoints[tpIndex].done = true;
            newTouchpoints[tpIndex].count = newCheckinCount;
          }
        }

        // Cập nhật local selectedCustomer ngay
        setSelectedCustomer(prev => prev ? {
          ...prev,
          touchpoints: newTouchpoints
        } : prev);

        // Cập nhật DB
        await supabase
          .from('crm_customers')
          .update({
            touchpoints: newTouchpoints
          })
          .eq('id', selectedCustomer.id);

        // Cập nhật bảng ngoài (parent)
        onSuccess();
      }
    } catch (e: any) {
      alert("Lỗi khi xóa: " + e.message);
      // Rollback: fetch lại để đảm bảo đồng bộ
      fetchInteractions(selectedCustomer.id, selectedCustomer.phone);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content crm-modal animate-scale-in" style={{ height: "85vh" }}>
        {/* Header */}
        <div className="crm-modal-header" style={{ paddingBottom: "1rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: "bold" }}>{selectedCustomer.full_name}</h2>
              <span className={`status-badge status-${selectedCustomer.status.split(' ')[0]}`}>{selectedCustomer.status}</span>
            </div>
            <div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: 12 }}>
              SĐT: {selectedCustomer.phone} | Người phụ trách: {users.find(u => u.id === selectedCustomer.assigned_to)?.full_name || "Unknown"}
              {/* Hiển thị call_count real-time ngay trong header */}
              {(selectedCustomer.call_count ?? 0) > 0 && (
                <span style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: 600 }}>
                  📞 {selectedCustomer.call_count} lần gọi
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}>
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ padding: "0 1.5rem" }}>
          <div className="crm-tabs">
            <button className={`crm-tab ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
              <User size={16} /> Thông tin chung
            </button>
            <button className={`crm-tab ${activeTab === 'touchpoints' ? 'active' : ''}`} onClick={() => setActiveTab('touchpoints')}>
              <ListChecks size={16} /> Điểm chạm (SOP)
            </button>
            <button className={`crm-tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>
              <History size={16} /> Nhật ký ({interactions.length})
            </button>
          </div>
        </div>

        <div className="crm-modal-body" style={{ background: "#f8fafc" }}>

          {/* TAB: Thông tin */}
          {activeTab === 'info' && (
            <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div className="form-grid">
                <div>
                  <div style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Số điện thoại</div>
                  <div style={{ fontWeight: 500 }}>{selectedCustomer.phone}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Email</div>
                  <div style={{ fontWeight: 500 }}>{selectedCustomer.email || "---"}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Địa chỉ</div>
                  <div style={{ fontWeight: 500 }}>{selectedCustomer.address || "---"}</div>
                </div>
                <div>
                  <div style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "0.25rem" }}>Ngày tạo hồ sơ</div>
                  <div style={{ fontWeight: 500 }}>{new Date(selectedCustomer.created_at).toLocaleDateString("vi-VN")}</div>
                </div>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "1.5rem 0" }} />
              <h4 style={{ fontWeight: 600, marginBottom: "1rem" }}>Thông tin Học sinh</h4>
              {(selectedCustomer.children || []).map((child: any, idx) => (
                <div key={idx} style={{ padding: "0.75rem", background: "#f1f5f9", borderRadius: "6px", marginBottom: "0.5rem" }}>
                  Bé {idx + 1}: <span style={{ fontWeight: 600 }}>{child.name}</span> (Sinh năm {child.yob})
                  {child.school && <span style={{ color: "#64748b" }}> · {child.school}</span>}
                  {child.grade && <span style={{ color: "#64748b" }}> · {child.grade}</span>}
                </div>
              ))}
              <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "1.5rem 0" }} />
              <h4 style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Insight Khách hàng (Nỗi đau / Mong muốn)</h4>
              <div style={{ background: "#fffbeb", padding: "1rem", borderRadius: "8px", color: "#92400e", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                {selectedCustomer.insight || "---"}
              </div>
            </div>
          )}

          {/* TAB: Touchpoints */}
          {activeTab === 'touchpoints' && (
            <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "1.5rem" }}>Checklist Điểm chạm Hành trình</h3>
              <div className="touchpoint-list">
                {(selectedCustomer.touchpoints || []).map((tp, idx) => (
                  <div key={idx} className={`touchpoint-item ${tp.done ? 'done' : ''}`} onClick={() => handleToggleTouchpoint(tp.code, tp.done)}>
                    <input type="checkbox" checked={tp.done} readOnly style={{ width: "20px", height: "20px", cursor: "pointer" }} />
                    <label>{tp.name}</label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Timeline / Nhật ký */}
          {activeTab === 'timeline' && (
            <div style={{ maxWidth: "640px", margin: "0 auto" }}>
              {/* Ô nhập ghi chú mới */}
              <div className="add-note-box">
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <button className="btn hover:opacity-90" onClick={() => setShowCheckinForm(!showCheckinForm)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px', cursor: 'pointer' }}>
                    📍 {showCheckinForm ? "Hủy Check-in" : "Ghi nhận Check-in"}
                  </button>
                </div>
                
                {showCheckinForm && (
                  <div style={{ background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '1rem' }}>
                    <h4 style={{ fontWeight: 600, color: '#166534', marginBottom: '0.5rem', marginTop: 0 }}>Ghi nhận Khách hàng Check-in</h4>
                    
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', marginBottom: '0.25rem' }}>Phân loại Check-in</label>
                      <select 
                        value={checkinType}
                        onChange={(e) => setCheckinType(e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}
                      >
                        <option value="Tại trung tâm">Tại trung tâm</option>
                        <option value="Thực chiến">Thực chiến (Tại nhà/khác)</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', marginBottom: '0.25rem' }}>Ảnh minh chứng (Bắt buộc có mặt phụ huynh)</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setCheckinImage(file);
                            const reader = new FileReader();
                            reader.onload = (e) => setCheckinPreview(e.target?.result as string);
                            reader.readAsDataURL(file);
                          }
                        }}
                        style={{ width: '100%', padding: '0.5rem', background: 'white', borderRadius: '4px', border: '1px dashed #bbf7d0' }}
                      />
                      {checkinPreview && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <img src={checkinPreview} alt="Preview" style={{ maxHeight: '150px', borderRadius: '4px' }} />
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: '#166534', marginBottom: '0.25rem' }}>Giáo viên Test nói (Không bắt buộc)</label>
                        <select 
                          value={testTeacherId}
                          onChange={(e) => setTestTeacherId(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0' }}
                        >
                          <option value="">-- Chọn Giáo viên --</option>
                          {users
                            .filter(u => u.role === 'Giáo viên' && u.branch_id === selectedCustomer.branch_id)
                            .map(u => (
                              <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))
                          }
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <label style={{ fontSize: '0.85rem', color: '#166534' }}>Link Video Test nói (Tùy chọn)</label>
                          <button 
                            type="button"
                            onClick={() => videoFileInputRef.current?.click()}
                            disabled={isUploadingVideo}
                            style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '4px', cursor: 'pointer' }}
                          >
                            {isUploadingVideo ? "Đang tải..." : "Tải lên Drive"}
                          </button>
                        </div>
                        <input 
                          type="url"
                          placeholder="https://youtube.com/..."
                          value={testVideoLink}
                          onChange={(e) => setTestVideoLink(e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #bbf7d0', boxSizing: 'border-box' }}
                        />
                        <input 
                          type="file" 
                          accept="video/*" 
                          style={{ display: 'none' }} 
                          ref={videoFileInputRef}
                          onChange={handleVideoUpload}
                        />
                      </div>
                    </div>

                    <button 
                      className="btn hover:opacity-90" 
                      onClick={handleRecordCheckin} 
                      disabled={isSubmitting || !checkinImage} 
                      style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '6px', cursor: 'pointer', width: '100%' }}
                    >
                      {isSubmitting ? "Đang xử lý & Nén ảnh..." : "Xác nhận & Tải lên"}
                    </button>
                  </div>
                )}
                <textarea
                  placeholder="Nhập nội dung tương tác mới..."
                  rows={3}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "6px", marginBottom: "1rem", fontFamily: "inherit" }}
                />
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-primary" onClick={handleAddNote} disabled={isSubmitting || !newNote.trim()}>
                    <Send size={16} style={{ marginRight: "0.5rem" }} /> Lưu Nhật ký
                  </button>
                </div>
              </div>

              {/* Danh sách nhật ký */}
              <div className="timeline">
                {interactions.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#64748b", padding: "2rem" }}>
                    Chưa có lịch sử tương tác nào.
                  </div>
                ) : interactions.map(interaction => (
                  <div key={interaction.id} className={`timeline-item action-${interaction.action_type.split(' ')[0]}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content" style={{ flex: 1 }}>
                      {/* Header row */}
                      <div className="timeline-header">
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{interaction.action_type}</span>
                        {interaction.source === 'landing' && (
                          <span style={{ fontSize: '0.65rem', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, marginLeft: '6px' }}>TỪ LANDING PAGE</span>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                          <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                            {new Date(interaction.created_at).toLocaleString("vi-VN")}
                          </span>
                          {canEdit(interaction) && editingId !== interaction.id && (
                            <button
                              onClick={() => handleStartEdit(interaction)}
                              title="Sửa nhật ký"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", padding: "2px 3px", borderRadius: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#cbd5e1")}
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                          {canDelete(interaction) && editingId !== interaction.id && (
                            <button
                              onClick={() => handleDelete(interaction.id)}
                              title="Xóa nhật ký"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "#cbd5e1", padding: "2px 3px", borderRadius: 4, display: "flex", alignItems: "center", transition: "color 0.15s" }}
                              onMouseEnter={e => (e.currentTarget.style.color = "#dc2626")}
                              onMouseLeave={e => (e.currentTarget.style.color = "#cbd5e1")}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Nội dung — bình thường hoặc inline edit */}
                      {editingId === interaction.id ? (
                        <div style={{ marginTop: "0.5rem" }}>
                          <textarea
                            value={editingContent}
                            onChange={e => setEditingContent(e.target.value)}
                            rows={3}
                            autoFocus
                            style={{ width: "100%", padding: "0.5rem 0.75rem", border: "2px solid #3b82f6", borderRadius: 6, fontFamily: "inherit", fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box" }}
                          />
                          <div style={{ display: "flex", gap: 8, marginTop: "0.4rem", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setEditingId(null)}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "0.3rem 0.7rem", borderRadius: 6, cursor: "pointer", border: "1px solid #cbd5e1", background: "white", color: "#64748b", fontSize: "0.85rem", fontWeight: 500 }}
                            >
                              <XCircle size={14} /> Hủy
                            </button>
                            <button
                              onClick={() => handleSaveEdit(interaction.id)}
                              disabled={!editingContent.trim()}
                              style={{ display: "flex", alignItems: "center", gap: 4, padding: "0.3rem 0.7rem", borderRadius: 6, cursor: "pointer", border: "none", background: "#3b82f6", color: "white", fontSize: "0.85rem", fontWeight: 600 }}
                            >
                              <Check size={14} /> Lưu
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="timeline-body" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {interaction.content.includes('Ảnh minh chứng: http') ? (
                            interaction.content.split('\n').map((line: string, i: number) => {
                              if (line.startsWith('Ảnh minh chứng: http')) {
                                const url = line.replace('Ảnh minh chứng: ', '').trim();
                                return (
                                  <div key={i} style={{ marginTop: '0.5rem' }}>
                                    <a href={url} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', background: '#eff6ff', borderRadius: '4px', fontWeight: 500, fontSize: '0.85rem' }}>
                                      🖼️ Xem ảnh minh chứng
                                    </a>
                                  </div>
                                );
                              }
                              return <div key={i}>{line}</div>;
                            })
                          ) : (
                            interaction.content
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#94a3b8" }}>
                        Bởi: {interaction.sale_name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

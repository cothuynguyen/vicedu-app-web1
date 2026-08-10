"use client";

import React, { useState, useEffect } from "react";
import { X, MapPin, Clock, Calendar as CalendarIcon, User } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

interface MarketingScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingItem?: any;
  prefillDate?: string;
  branchId: string;
}

export default function MarketingScheduleModal({ isOpen, onClose, onSuccess, editingItem, prefillDate, branchId }: MarketingScheduleModalProps) {
  const { user } = useAuth();
  const [foreignTeachers, setForeignTeachers] = useState<any[]>([]);
  const [branchEmployees, setBranchEmployees] = useState<any[]>([]);
  const [branchClasses, setBranchClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    teacher_name: "",
    date: prefillDate || new Date().toISOString().split("T")[0],
    start_time: "14:00",
    end_time: "16:00",
    location: "Khu vực trung tâm",
    status: "Chưa làm",
    schedule_type: "Marketing",
    class_id: "",
    substituted_teacher_name: "",
    hours: 2,
    deducted_hours: 2
  });

  const targetBranch = editingItem?.branch_id || branchId;

  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch teachers in branch
    const fetchTeachers = async () => {
      let query = supabase.from("users").select("id, full_name, branch_id").ilike("department", "%Đào tạo%");
      if (targetBranch && targetBranch !== "Tất cả") {
        const branches = targetBranch.split(",").map((b: string) => b.trim()).filter(Boolean);
        if (branches.length > 0) {
          query = query.or(branches.map((b: string) => `branch_id.ilike.%${b}%`).join(','));
        }
      }
      const { data: tData } = await query;
      if (tData) {
        const unique = Array.from(new Map(tData.map((item: any) => [item.full_name, item])).values());
        setForeignTeachers(unique);
      }

      // Fetch all active/trial employees in branch
      let empQuery = supabase.from("users").select("id, full_name, branch_id").neq("status", "Nghỉ việc");
      if (targetBranch && targetBranch !== "Tất cả") {
        const branches = targetBranch.split(",").map((b: string) => b.trim()).filter(Boolean);
        if (branches.length > 0) {
          empQuery = empQuery.or(branches.map((b: string) => `branch_id.ilike.%${b}%`).join(','));
        }
      }
      const { data: empData } = await empQuery;
      if (empData) {
        const unique = Array.from(new Map(empData.map((item: any) => [item.full_name, item])).values());
        setBranchEmployees(unique);
      }
    };
    fetchTeachers();

    // Fetch classes in branch
    const fetchClasses = async () => {
      let query = supabase
        .from("classes")
        .select("id, class_name, hours_per_session, teacher_vn, teacher_foreign");

      if (targetBranch && targetBranch !== "Tất cả") {
        const branches = targetBranch.split(",").map((b: string) => b.trim()).filter(Boolean);
        const searchBranches = [...branches];
        if (targetBranch.includes(",")) {
          searchBranches.push(targetBranch); // Hỗ trợ khớp cả lớp cũ có branch_id dạng ghép
        }
        query = query.in("branch_id", searchBranches);
      } else {
        query = query.eq("branch_id", targetBranch);
      }

      const { data } = await query;
      if (data) {
        setBranchClasses(data);
      }
    };
    fetchClasses();

    if (editingItem) {
      setFormData({
        teacher_name: editingItem.teacher_name,
        date: editingItem.date,
        start_time: editingItem.start_time,
        end_time: editingItem.end_time,
        location: editingItem.location,
        status: editingItem.status || "Chưa làm",
        schedule_type: editingItem.schedule_type || "Marketing",
        class_id: editingItem.class_id || "",
        substituted_teacher_name: editingItem.substituted_teacher_name || "",
        hours: editingItem.hours || 2,
        deducted_hours: editingItem.deducted_hours !== undefined && editingItem.deducted_hours !== null 
          ? editingItem.deducted_hours 
          : (editingItem.hours || 2)
      });
    } else {
      setFormData({
        teacher_name: "",
        date: prefillDate || new Date().toISOString().split("T")[0],
        start_time: "14:00",
        end_time: "16:00",
        location: "Khu vực quanh chi nhánh",
        status: "Chưa làm",
        schedule_type: "Marketing",
        class_id: "",
        substituted_teacher_name: "",
        hours: 2,
        deducted_hours: 2
      });
    }
  }, [isOpen, editingItem, prefillDate, targetBranch]);

  if (!isOpen) return null;

  const calculateHours = (start: string, end: string) => {
    if (!start || !end) return 0;
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    let diff = (h2 + m2 / 60) - (h1 + m1 / 60);
    return diff > 0 ? diff : 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.teacher_name) {
      alert("Vui lòng chọn giáo viên.");
      return;
    }

    if (formData.schedule_type === "Dạy thay") {
      if (!formData.class_id) {
        alert("Vui lòng chọn Lớp học dạy thay.");
        return;
      }
      if (!formData.substituted_teacher_name) {
        alert("Vui lòng chọn Giáo viên được dạy thay.");
        return;
      }
    }

    setLoading(true);
    try {
      let finalHours = 0;
      let finalDeductedHours = null;

      if (formData.schedule_type === "Dạy thay") {
        finalHours = Number(formData.hours);
        finalDeductedHours = Number(formData.deducted_hours);
        if (isNaN(finalHours) || finalHours <= 0) {
          alert("Số giờ dạy thay phải lớn hơn 0!");
          setLoading(false);
          return;
        }
        if (isNaN(finalDeductedHours) || finalDeductedHours < 0) {
          alert("Số giờ bị dạy thay không hợp lệ (phải >= 0)!");
          setLoading(false);
          return;
        }
      } else {
        finalHours = calculateHours(formData.start_time, formData.end_time);
        if (finalHours <= 0) {
          alert("Giờ kết thúc phải lớn hơn giờ bắt đầu!");
          setLoading(false);
          return;
        }
      }

      const payload = {
        ...formData,
        branch_id: targetBranch,
        hours: finalHours,
        deducted_hours: finalDeductedHours,
        class_id: formData.schedule_type === "Dạy thay" && formData.class_id ? formData.class_id : null,
        substituted_teacher_name: formData.schedule_type === "Dạy thay" ? formData.substituted_teacher_name : null
      };

      // 1. Kiểm tra trùng lịch với Lịch Dạy thay / Lịch Marketing khác
      const { data: existingSchedules } = await supabase
        .from("marketing_schedules")
        .select("id, start_time, end_time, schedule_type")
        .eq("teacher_name", formData.teacher_name)
        .eq("date", formData.date);

      if (existingSchedules) {
        const hasCollision = existingSchedules.some((schedule: any) => {
          if (editingItem?.id && schedule.id === editingItem.id) return false;
          return (
            formData.start_time < schedule.end_time &&
            formData.end_time > schedule.start_time
          );
        });

        if (hasCollision) {
          alert(`Lỗi: Giáo viên ${formData.teacher_name} đã có lịch Marketing/Dạy thay bị trùng trong khoảng thời gian này!`);
          setLoading(false);
          return;
        }
      }

      // 2. Kiểm tra trùng lịch với Lịch dạy lớp chính thức (Classes)
      const { data: classesList, error: classErr } = await supabase
        .from("classes")
        .select("id, class_name, branch_id, teacher_vn, teacher_foreign, schedules, status");
      
      if (classErr) throw classErr;

      const activeClasses = (classesList || []).filter((c: any) => c.status !== "Đã kết thúc");
      const dayOfWeekMap = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const getDayOfWeek = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          return dayOfWeekMap[date.getDay()];
        }
        return "";
      };

      const targetDay = getDayOfWeek(formData.date);
      for (const cls of activeClasses) {
        const clsSchedules = cls.schedules || [];
        const isTeacherOfClass = cls.teacher_foreign && cls.teacher_foreign === formData.teacher_name;
        
        if (isTeacherOfClass) {
          for (const clsSch of clsSchedules) {
            if (clsSch.dayOfWeek === targetDay) {
              const s1 = formData.start_time;
              const e1 = formData.end_time;
              const s2 = clsSch.startTime;
              const e2 = clsSch.endTime;

              if (s1 && e1 && s2 && e2 && s1 < e2 && e1 > s2) {
                alert(`Lỗi: Giáo viên ${formData.teacher_name} đã có lịch dạy lớp chính thức "${cls.class_name}" (Chi nhánh: ${cls.branch_id}) vào ngày này (${targetDay} ${s2} - ${e2})!`);
                setLoading(false);
                return;
              }
            }
          }
        }
      }

      if (editingItem?.id) {
        const { error } = await supabase.from("marketing_schedules").update(payload).eq("id", editingItem.id);
        if (error) throw error;
        alert(formData.schedule_type === "Dạy thay" ? "Cập nhật lịch Dạy thay thành công!" : "Cập nhật lịch Marketing thành công!");
      } else {
        const { error } = await supabase.from("marketing_schedules").insert([payload]);
        if (error) throw error;
        alert(formData.schedule_type === "Dạy thay" ? "Thêm lịch Dạy thay thành công!" : "Thêm lịch Marketing thành công!");
      }
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert("Lỗi: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingItem?.id) return;
    const itemTypeName = formData.schedule_type === "Dạy thay" ? "lịch Dạy thay" : "lịch Marketing";
    if (!confirm(`Bạn có chắc chắn muốn xóa ${itemTypeName} này không?`)) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from("marketing_schedules").delete().eq("id", editingItem.id);
      if (error) throw error;
      alert(`Đã xóa ${itemTypeName}!`);
      onSuccess();
      onClose();
    } catch (error: any) {
      alert("Lỗi xóa: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = branchClasses.find(c => c.id === formData.class_id);

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: "white", borderRadius: 12, width: "100%", maxWidth: 500, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)", overflow: "hidden" }}>
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
            <MapPin size={22} color="#f97316" /> {editingItem ? (formData.schedule_type === "Dạy thay" ? "Sửa Lịch Dạy Thay" : "Sửa Lịch Marketing & Dạy thay") : (formData.schedule_type === "Dạy thay" ? "Tạo Lịch Dạy Thay Mới" : "Tạo Lịch Marketing & Dạy thay Mới")}
          </h2>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={24} /></button>
        </div>

        <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden", margin: 0 }}>
          <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem", flex: 1 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                Loại Lịch
              </label>
              <select 
                value={formData.schedule_type} 
                onChange={e => {
                  const type = e.target.value;
                  setFormData({
                    ...formData,
                    schedule_type: type,
                    class_id: "",
                    substituted_teacher_name: "",
                    location: type === "Dạy thay" ? "" : "Khu vực quanh chi nhánh"
                  });
                }} 
                required
                style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
              >
                <option value="Marketing">Lịch Marketing</option>
                <option value="Dạy thay">Lịch Dạy Thay</option>
              </select>
            </div>

            {formData.schedule_type === "Dạy thay" && (
              <>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                    Lớp học dạy thay
                  </label>
                  <select
                    value={formData.class_id}
                    onChange={e => {
                      const classId = e.target.value;
                      const cls = branchClasses.find(c => c.id === classId);
                      const defaultHrs = cls ? Number(cls.hours_per_session) || 2 : 2;
                      setFormData({
                        ...formData,
                        class_id: classId,
                        substituted_teacher_name: "",
                        location: cls ? `Lớp ${cls.class_name}` : "",
                        hours: defaultHrs,
                        deducted_hours: defaultHrs
                      });
                    }}
                    required
                    style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                  >
                    <option value="">-- Chọn Lớp học --</option>
                    {branchClasses.map((cls, i) => (
                      <option key={i} value={cls.id}>{cls.class_name}</option>
                    ))}
                  </select>
                </div>

                {formData.class_id && (
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                      Giáo viên được dạy thay (Nghỉ buổi này)
                    </label>
                    <select
                      value={formData.substituted_teacher_name}
                      onChange={e => setFormData({...formData, substituted_teacher_name: e.target.value})}
                      required
                      style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                    >
                      <option value="">-- Chọn Giáo viên chính thức --</option>
                      {selectedClass ? (
                        <>
                          {selectedClass.teacher_vn && <option value={selectedClass.teacher_vn}>{selectedClass.teacher_vn} (Việt Nam)</option>}
                          {selectedClass.teacher_foreign && <option value={selectedClass.teacher_foreign}>{selectedClass.teacher_foreign} (Nước ngoài)</option>}
                        </>
                      ) : null}
                    </select>
                    {selectedClass && (
                      <div style={{ marginTop: "0.35rem", fontSize: "0.8rem", color: "#3b82f6", fontWeight: 500 }}>
                        💡 Thời lượng học chuẩn của lớp này: {selectedClass.hours_per_session} giờ/buổi.
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                      Số giờ dạy thay (Cộng GV dạy thay)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.hours}
                      onChange={e => setFormData({...formData, hours: parseFloat(e.target.value) || 0})}
                      required
                      style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                      Số giờ bị dạy thay (Trừ GV chính thức)
                    </label>
                    <input 
                      type="number"
                      step="0.1"
                      min="0"
                      value={formData.deducted_hours}
                      onChange={e => setFormData({...formData, deducted_hours: parseFloat(e.target.value) || 0})}
                      required
                      style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                <User size={16} /> {formData.schedule_type === "Dạy thay" ? "Giáo viên dạy thay" : "Giáo viên Nước ngoài"}
              </label>
              <select 
                value={formData.teacher_name} 
                onChange={e => setFormData({...formData, teacher_name: e.target.value})} 
                required
                style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
              >
                <option value="">-- Chọn Nhân viên --</option>
                {(formData.schedule_type === "Dạy thay" ? branchEmployees : foreignTeachers).map((t, i) => (
                  <option key={i} value={t.full_name}>{t.full_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                <CalendarIcon size={16} /> Ngày thực hiện
              </label>
              <input 
                type="date" 
                value={formData.date} 
                onChange={e => setFormData({...formData, date: e.target.value})} 
                required
                style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                  <Clock size={16} /> Giờ Bắt đầu
                </label>
                <input 
                  type="time" 
                  value={formData.start_time} 
                  onChange={e => setFormData({...formData, start_time: e.target.value})} 
                  required
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                  <Clock size={16} /> Giờ Kết thúc
                </label>
                <input 
                  type="time" 
                  value={formData.end_time} 
                  onChange={e => setFormData({...formData, end_time: e.target.value})} 
                  required
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.875rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                <MapPin size={16} /> {formData.schedule_type === "Dạy thay" ? "Phòng học / Địa điểm" : "Vị trí / Tuyến đường"}
              </label>
              <input 
                type="text" 
                value={formData.location} 
                onChange={e => setFormData({...formData, location: e.target.value})} 
                placeholder={formData.schedule_type === "Dạy thay" ? "VD: Phòng 101" : "VD: Cổng trường tiểu học ABC"}
                required
                style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.95rem" }}
              />
            </div>

            <div style={{ padding: "1rem", background: formData.status === "Đã hoàn thành" ? "#dcfce7" : "#fffbeb", borderRadius: 8, border: `1px solid ${formData.status === "Đã hoàn thành" ? "#86efac" : "#fef08a"}` }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, color: formData.status === "Đã hoàn thành" ? "#166534" : "#92400e", cursor: "pointer" }}>
                <input 
                  type="checkbox" 
                  checked={formData.status === "Đã hoàn thành"} 
                  onChange={e => setFormData({...formData, status: e.target.checked ? "Đã hoàn thành" : "Chưa làm"})} 
                  style={{ width: 18, height: 18, cursor: "pointer" }}
                />
                Xác nhận ĐÃ HOÀN THÀNH {formData.schedule_type === "Dạy thay" ? "buổi dạy thay này" : "Marketing"}
              </label>
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.8rem", color: formData.status === "Đã hoàn thành" ? "#166534" : "#92400e" }}>
                * Đánh dấu vào đây để hệ thống tính giờ làm việc cho Giáo viên.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem 1.5rem", borderTop: "1px solid #e2e8f0", background: "#f8fafc", borderBottomLeftRadius: 12, borderBottomRightRadius: 12, flexShrink: 0 }}>
            {editingItem?.id ? (
              <button 
                type="button" 
                onClick={handleDelete} 
                disabled={loading}
                style={{ padding: "0.6rem 1.25rem", borderRadius: 8, border: "none", background: "#fee2e2", color: "#ef4444", fontWeight: 600, cursor: "pointer" }}
              >
                Xóa Lịch
              </button>
            ) : <div />}
            
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button 
                type="button" 
                onClick={onClose} 
                style={{ padding: "0.6rem 1.25rem", borderRadius: 8, border: "1px solid #cbd5e1", background: "white", color: "#475569", fontWeight: 600, cursor: "pointer" }}
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={loading}
                style={{ padding: "0.6rem 1.25rem", borderRadius: 8, border: "none", background: "#f97316", color: "white", fontWeight: 600, cursor: "pointer" }}
              >
                {loading ? "Đang xử lý..." : formData.schedule_type === "Dạy thay" ? "Lưu Lịch Dạy Thay" : "Lưu Lịch Marketing"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

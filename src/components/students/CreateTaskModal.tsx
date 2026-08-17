"use client";

import { useState, useEffect } from "react";
import { X, Users, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type CreateTaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  filters: any;
  activeBranch: string;
  isGlobalRole: boolean;
};

export default function CreateTaskModal({ isOpen, onClose, filters, activeBranch, isGlobalRole }: CreateTaskModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [matchingStudents, setMatchingStudents] = useState<string[]>([]);
  const [salesStaff, setSalesStaff] = useState<any[]>([]);
  
  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [campaignType, setCampaignType] = useState("Sinh nhật");
  const [selectedSales, setSelectedSales] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchMatchingStudents();
      fetchSalesStaff();
    }
  }, [isOpen]);

  const fetchSalesStaff = async () => {
    let query = supabase.from("users").select("id, full_name, branch_id").neq("status", "Nghỉ việc");
    
    // If not global, only show staff in the current branch
    if (!isGlobalRole && activeBranch !== "Tất cả") {
      const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
      let orQuery = branches.map(b => `branch_id.ilike.%${b}%`).join(",");
      query = query.or(orQuery);
    }
    
    const { data } = await query;
    if (data) {
      setSalesStaff(data);
    }
  };

  const fetchMatchingStudents = async () => {
    setLoading(true);
    let selectStr = "id";
    if (filters.filterType !== "Tất cả") {
      selectStr = "id, class_students!inner(status, classes!inner(class_name, teacher_vn, teacher_foreign, schedules, group_type, status))";
    }

    let query = supabase.from("students").select(selectStr);
    
    // Branch Filter
    if (!isGlobalRole && activeBranch && activeBranch !== "Tất cả") {
      if (filters.filterBranch !== "Tất cả") {
        query = query.eq("branch_id", filters.filterBranch);
      } else {
        const branches = activeBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          query = query.in("branch_id", branches);
        } else if (branches.length === 1) {
          query = query.eq("branch_id", branches[0]);
        }
      }
    } else if (filters.filterBranch !== "Tất cả") {
      query = query.eq("branch_id", filters.filterBranch);
    }

    // Status Filter
    if (filters.filterStatus === "Chờ xếp lớp") {
      try {
        const { data: assigned } = await supabase.from("class_students").select("student_id").eq("status", "Đang học");
        const assignedIds = Array.from(new Set((assigned || []).map((item: any) => item.student_id).filter(Boolean)));
        
        let orQuery = "status.eq.Chờ xếp lớp";
        if (assignedIds.length > 0) {
          orQuery += `,and(status.eq.Đang học,id.not.in.(${assignedIds.join(",")}))`;
        }
        query = query.or(orQuery);
      } catch (err) {}
    } else if (filters.filterStatus !== "Tất cả") {
      query = query.eq("status", filters.filterStatus);
    }

    // Type Filter
    if (filters.filterType !== "Tất cả") {
      query = query.eq("class_students.status", "Đang học");
      query = query.eq("class_students.classes.group_type", filters.filterType);
    }

    // Birth Month Filter
    if (filters.filterBirthMonth !== "Tất cả") {
      const targetMonth = parseInt(filters.filterBirthMonth.replace("Tháng ", ""), 10);
      const startYear = 1990;
      const endYear = new Date().getFullYear();
      let orClauses = [];
      for (let year = startYear; year <= endYear; year++) {
        const monthStr = targetMonth.toString().padStart(2, '0');
        const lastDay = new Date(year, targetMonth, 0).getDate();
        orClauses.push(`and(dob.gte.${year}-${monthStr}-01,dob.lte.${year}-${monthStr}-${lastDay})`);
      }
      query = query.or(orClauses.join(','));
    }

    // Hours Filter
    if (filters.filterHours !== "") {
      query = query.lte("remaining_hours", parseInt(filters.filterHours));
    }

    // Search Term
    if (filters.searchTerm) {
      query = query.or(`full_name.ilike.%${filters.searchTerm}%,id.ilike.%${filters.searchTerm}%,parent_phone.ilike.%${filters.searchTerm}%`);
    }

    // Birth Years Filter
    if (filters.filterBirthYears && filters.filterBirthYears.length > 0) {
      let orClauses = [];
      for (const year of filters.filterBirthYears) {
        if (year === "null") {
          orClauses.push("dob.is.null");
        } else {
          orClauses.push(`and(dob.gte.${year}-01-01,dob.lte.${year}-12-31)`);
        }
      }
      query = query.or(orClauses.join(','));
    }

    // Since we need ALL matching students and Supabase has a 1000 limit by default on some queries, 
    // but usually range is required for pagination. Without range, it defaults to max limit.
    const { data, error } = await query.limit(10000); // Set high limit to ensure we get all
    if (!error && data) {
      setMatchingStudents(data.map((s: any) => s.id));
    }
    setLoading(false);
  };

  const handleToggleSale = (id: string) => {
    if (selectedSales.includes(id)) {
      setSelectedSales(selectedSales.filter(s => s !== id));
    } else {
      setSelectedSales([...selectedSales, id]);
    }
  };

  const handleSubmit = async () => {
    if (!campaignName.trim()) {
      setError("Vui lòng nhập tên chiến dịch.");
      return;
    }
    if (selectedSales.length === 0) {
      setError("Vui lòng chọn ít nhất 1 Sale để giao việc.");
      return;
    }
    if (matchingStudents.length === 0) {
      setError("Không có học viên nào khớp với bộ lọc.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const campaignBranch = isGlobalRole ? "Tất cả" : (activeBranch.split(',')[0] || activeBranch);

      // 1. Create Internal Campaign
      const { data: campaignData, error: campaignError } = await supabase
        .from("internal_campaigns")
        .insert({
          name: campaignName.trim(),
          type: campaignType,
          branch_id: campaignBranch,
          created_by: user?.id
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // 2. Divide students among selected sales
      const tasksToInsert = [];
      const numSales = selectedSales.length;
      
      for (let i = 0; i < matchingStudents.length; i++) {
        const studentId = matchingStudents[i];
        const assignedSaleId = selectedSales[i % numSales]; // Round robin assignment
        
        tasksToInsert.push({
          campaign_id: campaignData.id,
          student_id: studentId,
          assigned_to: assignedSaleId,
          status: 'Chưa gọi'
        });
      }

      // 3. Batch insert tasks
      // Supabase insert supports arrays
      const { error: tasksError } = await supabase
        .from("internal_campaign_tasks")
        .insert(tasksToInsert);

      if (tasksError) throw tasksError;

      alert(`Tạo chiến dịch thành công! Đã giao ${matchingStudents.length} học viên cho ${selectedSales.length} nhân sự.`);
      onClose();
    } catch (err: any) {
      console.error(err);
      setError("Có lỗi xảy ra: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 9999 }}>
      <div className="modal-container" style={{ maxWidth: '600px', width: '90%', padding: '2rem' }}>
        <div className="modal-header" style={{ marginBottom: '1.5rem' }}>
          <h2>Giao Việc CSKH & Chiến Dịch Nội Bộ</h2>
          <button onClick={onClose} className="btn-close" disabled={submitting}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '3rem 0', color: '#64748b' }}>
            <Loader2 size={32} className="animate-spin" style={{ marginBottom: '1rem', color: '#3b82f6' }} />
            <p>Đang quét dữ liệu toàn hệ thống...</p>
          </div>
        ) : (
          <div className="modal-content">
            <div style={{ 
              background: '#eff6ff', 
              border: '1px solid #bfdbfe', 
              borderRadius: '8px', 
              padding: '1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              <AlertCircle size={24} color="#3b82f6" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: '#1e3a8a' }}>Kết quả lọc dữ liệu</h4>
                <p style={{ margin: 0, color: '#1e40af', fontSize: '0.9rem' }}>
                  Hệ thống tìm thấy tổng cộng <strong>{matchingStudents.length}</strong> học viên khớp với tất cả các bộ lọc hiện tại. 
                  Bạn có muốn tạo Chiến dịch và giao danh sách này cho các nhân sự phụ trách không?
                </p>
              </div>
            </div>

            {error && (
              <div style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label>Tên chiến dịch <span className="text-danger">*</span></label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="VD: Chúc mừng sinh nhật Tháng 8..." 
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Loại chiến dịch</label>
              <select className="form-input" value={campaignType} onChange={e => setCampaignType(e.target.value)}>
                <option value="Sinh nhật">Sinh nhật</option>
                <option value="Tái tục">Mời Tái tục khóa mới</option>
                <option value="Khảo sát">Khảo sát chất lượng</option>
                <option value="Bảo lưu">Gọi đi học lại (Bảo lưu)</option>
                <option value="Khác">Khác</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Chọn nhân sự phụ trách <span className="text-danger">*</span></span>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Đã chọn: {selectedSales.length} người</span>
              </label>
              
              <div style={{ 
                border: '1px solid #e2e8f0', 
                borderRadius: '8px', 
                maxHeight: '200px', 
                overflowY: 'auto',
                background: '#f8fafc',
                padding: '0.5rem'
              }}>
                {salesStaff.length === 0 ? (
                  <p style={{ textAlign: 'center', padding: '1rem', margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                    Không tìm thấy nhân sự nào ở chi nhánh này.
                  </p>
                ) : (
                  salesStaff.map(sale => (
                    <div 
                      key={sale.id} 
                      onClick={() => handleToggleSale(sale.id)}
                      style={{ 
                        padding: '0.75rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        background: selectedSales.includes(sale.id) ? '#e0f2fe' : 'transparent',
                        transition: 'background 0.2s',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <input 
                        type="checkbox" 
                        checked={selectedSales.includes(sale.id)} 
                        onChange={() => {}} // handled by div click
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500, color: '#0f172a' }}>{sale.full_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Mã NV: {sale.id}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                * Dữ liệu sẽ được tự động chia đều (chia bài) cho các nhân sự được chọn.
              </p>
            </div>

            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={onClose} disabled={submitting}>Hủy</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSubmit}
                disabled={submitting || matchingStudents.length === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Users size={18} />}
                <span>{submitting ? 'Đang tạo & Giao việc...' : 'Xác nhận Giao việc'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

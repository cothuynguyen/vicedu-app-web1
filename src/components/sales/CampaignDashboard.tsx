"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { BarChart, CheckCircle, Clock, Phone, AlertCircle } from "lucide-react";

export default function CampaignDashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin" || user?.role === "Super Admin" || user?.role === "Giám đốc";

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("Đang chạy");
  const [filterBranch, setFilterBranch] = useState("Tất cả");

  useEffect(() => {
    if (user) {
      fetchCampaigns();
    }
  }, [user, filterBranch]);

  const fetchCampaigns = async () => {
    setLoading(true);
    let query = supabase
      .from("internal_campaigns")
      .select(`
        id, name, type, branch_id, created_at, status,
        internal_campaign_tasks (
          id, status, assigned_to,
          users ( full_name ),
          students ( branch_id )
        )
      `)
      .order("created_at", { ascending: false });

    if (filterBranch !== "Tất cả") {
      query = query.or(`branch_id.eq.Tất cả,branch_id.ilike.%${filterBranch}%`);
    } else {
      if (!['Super Admin', 'Kế toán HO', 'Giám đốc'].includes(user?.role)) {
        const branchList = user?.branch_id ? user.branch_id.split(',').map((b: string) => b.trim()) : [];
        if (branchList.length > 0) {
          const orConditions = branchList.map((b: string) => `branch_id.ilike.%${b}%`).join(',');
          query = query.or(`branch_id.eq.Tất cả,${orConditions}`);
        }
      }
    }

    const { data, error } = await query;

    if (!error && data) {
      setCampaigns(data);
    }
    setLoading(false);
  };

  const handleCloseCampaign = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn đóng chiến dịch này? Các báo cáo vẫn sẽ được lưu trữ nhưng sẽ bị ẩn khỏi danh sách mặc định.")) return;
    
    const { error } = await supabase
      .from("internal_campaigns")
      .update({ status: "Đã đóng" })
      .eq("id", id);
      
    if (!error) {
      setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: "Đã đóng" } : c));
    } else {
      alert("Lỗi khi đóng chiến dịch: " + error.message);
    }
  };

  const handleRestoreCampaign = async (id: string) => {
    const { error } = await supabase
      .from("internal_campaigns")
      .update({ status: "Đang chạy" })
      .eq("id", id);
      
    if (!error) {
      setCampaigns(campaigns.map(c => c.id === id ? { ...c, status: "Đang chạy" } : c));
    } else {
      alert("Lỗi khi khôi phục chiến dịch: " + error.message);
    }
  };

  const handleDeleteCampaign = async (id: string, name: string) => {
    // Layer 1
    if (!confirm(`CẢNH BÁO 1: Bạn đang chọn XÓA VĨNH VIỄN chiến dịch "${name}".\n\nHành động này sẽ xóa toàn bộ số liệu thống kê KPIs của chiến dịch này khỏi báo cáo. Tuy nhiên, nhật ký CSKH của học viên vẫn được giữ nguyên.\n\nBạn có chắc chắn muốn tiếp tục?`)) return;
    
    // Layer 2
    const confirmName = prompt(`CẢNH BÁO 2: Hành động này KHÔNG THỂ HOÀN TÁC.\nĐể xác nhận xóa, vui lòng nhập chính xác tên chiến dịch:\n\n${name}`);
    if (confirmName !== name) {
      if (confirmName !== null) alert("Tên chiến dịch không khớp. Đã hủy thao tác xóa.");
      return;
    }

    // Attempt to delete. Supabase will handle ON DELETE CASCADE if configured.
    // If not, we might need to delete tasks first. Let's delete tasks just to be safe.
    await supabase.from("internal_campaign_tasks").delete().eq("campaign_id", id);
    
    const { error } = await supabase
      .from("internal_campaigns")
      .delete()
      .eq("id", id);
      
    if (!error) {
      setCampaigns(campaigns.filter(c => c.id !== id));
      alert("Đã xóa vĩnh viễn chiến dịch thành công.");
    } else {
      alert("Lỗi khi xóa chiến dịch: " + error.message);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>Đang tải báo cáo chiến dịch...</div>;
  }

  const displayedCampaigns = campaigns
    .map(camp => {
      let tasks = camp.internal_campaign_tasks || [];
      if (filterBranch !== "Tất cả") {
        tasks = tasks.filter((t: any) => t.students?.branch_id?.includes(filterBranch));
      } else if (!['Super Admin', 'Kế toán HO', 'Giám đốc'].includes(user?.role)) {
        const branchList = user?.branch_id ? user.branch_id.split(',').map((b: string) => b.trim()) : [];
        if (branchList.length > 0) {
          tasks = tasks.filter((t: any) => branchList.some((b: string) => t.students?.branch_id?.includes(b)));
        }
      }
      return { ...camp, filtered_tasks: tasks };
    })
    .filter(c => {
      const matchStatus = filterStatus === "Tất cả" || c.status === filterStatus;
      if (!matchStatus) return false;
      if (filterBranch === "Tất cả") return true;
      return c.filtered_tasks.length > 0 || c.branch_id.includes(filterBranch);
    });

  return (
    <div style={{ padding: "1rem 0" }}>
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        {isAdmin && (
          <select 
            className="form-input" 
            style={{ width: '180px' }} 
            value={filterBranch} 
            onChange={e => setFilterBranch(e.target.value)}
          >
            <option value="Tất cả">Tất cả chi nhánh</option>
            <option value="Việt Trì">Việt Trì</option>
            <option value="Lâm Thao">Lâm Thao</option>
            <option value="Tuyên Quang">Tuyên Quang</option>
            <option value="Dân Hòa">Dân Hòa</option>
          </select>
        )}
        <span style={{ fontWeight: 600, color: "#334155" }}>Bộ lọc chiến dịch:</span>
        <select 
          className="form-input" 
          style={{ width: "200px" }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="Đang chạy">Đang chạy</option>
          <option value="Đã đóng">Đã đóng</option>
          <option value="Tất cả">Tất cả</option>
        </select>
      </div>

      <div className="glass-panel" style={{ overflowX: "auto", borderRadius: "12px", padding: 0 }}>
        {displayedCampaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#64748b" }}>
            Không có chiến dịch nào ở trạng thái "{filterStatus}".
          </div>
        ) : (
          <table style={{ width: "100%", minWidth: "1000px", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontSize: "0.85rem" }}>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Tên chiến dịch</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Loại & Chi nhánh</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Data & Tiến độ</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Chi tiết Task</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: "1rem", fontWeight: 600 }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {displayedCampaigns.map((camp: any) => {
                const tasks = camp.filtered_tasks || [];
                const total = tasks.length;
                const notCalled = tasks.filter((t: any) => t.status === "Chưa gọi").length;
                const called = tasks.filter((t: any) => t.status === "Đã gọi").length;
                const success = tasks.filter((t: any) => t.status === "Thành công").length;
                const failed = tasks.filter((t: any) => t.status === "Thất bại").length;
                
                const progress = total === 0 ? 0 : Math.round(((total - notCalled) / total) * 100);
                const successRate = total === 0 ? 0 : Math.round((success / total) * 100);

                return (
                  <tr 
                    key={camp.id} 
                    style={{ borderBottom: "1px solid #e2e8f0", transition: "background 0.2s" }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a" }}>{camp.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>Tạo lúc: {new Date(camp.created_at).toLocaleDateString("vi-VN")}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ color: "#334155" }}>{camp.type}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "0.25rem" }}>{camp.branch_id}</div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                        Tổng: <strong>{total}</strong> &nbsp;|&nbsp; Chốt: <strong style={{ color: "#10b981" }}>{successRate}%</strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
                        <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "999px", overflow: "hidden", minWidth: "120px" }}>
                          <div style={{ width: `${progress}%`, height: "100%", background: "#3b82f6", borderRadius: "999px" }}></div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 600 }}>{progress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.85rem" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                        <span style={{ color: "#f59e0b", display: "flex", alignItems: "center", gap: "0.25rem" }}><Clock size={12} /> {notCalled}</span>
                        <span style={{ color: "#3b82f6", display: "flex", alignItems: "center", gap: "0.25rem" }}><Phone size={12} /> {called}</span>
                        <span style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "0.25rem" }}><CheckCircle size={12} /> {success}</span>
                        <span style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "0.25rem" }}><AlertCircle size={12} /> {failed}</span>
                      </div>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span style={{ 
                        padding: "0.25rem 0.5rem", 
                        borderRadius: "999px", 
                        fontSize: "0.75rem", 
                        fontWeight: 600,
                        background: camp.status === "Đang chạy" ? "#dcfce3" : "#f1f5f9",
                        color: camp.status === "Đang chạy" ? "#16a34a" : "#64748b"
                      }}>
                        {camp.status}
                      </span>
                    </td>
                    <td style={{ padding: "1rem" }}>
                      {camp.status === "Đang chạy" ? (
                        <button 
                          onClick={() => handleCloseCampaign(camp.id)}
                          style={{ fontSize: "0.8rem", background: "#fee2e2", color: "#b91c1c", border: "1px solid #fca5a5", padding: "0.3rem 0.75rem", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s", width: '100%' }}
                          onMouseEnter={e => e.currentTarget.style.background = "#fecaca"}
                          onMouseLeave={e => e.currentTarget.style.background = "#fee2e2"}
                        >
                          Đóng
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button 
                            onClick={() => handleRestoreCampaign(camp.id)}
                            style={{ fontSize: "0.8rem", background: "#dcfce3", color: "#16a34a", border: "1px solid #86efac", padding: "0.3rem 0.75rem", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s", width: '100%' }}
                            onMouseEnter={e => e.currentTarget.style.background = "#bbf7d0"}
                            onMouseLeave={e => e.currentTarget.style.background = "#dcfce3"}
                          >
                            Khôi phục
                          </button>
                          <button 
                            onClick={() => handleDeleteCampaign(camp.id, camp.name)}
                            style={{ fontSize: "0.75rem", background: "transparent", color: "#94a3b8", border: "1px dashed #cbd5e1", padding: "0.3rem 0.75rem", borderRadius: "6px", cursor: "pointer", transition: "all 0.2s", width: '100%' }}
                            onMouseEnter={e => { e.currentTarget.style.background = "#fef2f2"; e.currentTarget.style.color = "#ef4444"; e.currentTarget.style.borderColor = "#fca5a5"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#cbd5e1"; }}
                          >
                            Xóa vĩnh viễn
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

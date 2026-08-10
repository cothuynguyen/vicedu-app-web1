"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import CRMDetailModal from "@/components/crm/CRMDetailModal";
import "../crm/Crm.css";

export default function CheckinReportsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterSale, setFilterSale] = useState("Tất cả");
  const [filterTeacher, setFilterTeacher] = useState("Tất cả");
  
  const BRANCHES = ["Việt Trì", "Lâm Thao", "Tuyên Quang", "Dân Hòa"];

  useEffect(() => {
    if (!user) return;
    if (!["Super Admin", "Admin", "Kế toán HO"].includes(user.role)) {
      alert("Bạn không có quyền truy cập trang này.");
      router.push("/");
      return;
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setDateFrom(firstDay.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
    
    fetchUsers();
  }, [user]);

  const fetchUsers = async () => {
    if (!user) return;
    let query = supabase.from('users').select('id, full_name, role, branch_id');
    if (!['Super Admin', 'Kế toán HO'].includes(user.role)) {
      const branchList = user.branch_id ? user.branch_id.split(',').map((b: string) => b.trim()) : [];
      if (branchList.length > 0) {
        const orQuery = branchList.map(b => `branch_id.ilike.%${b}%`).join(',');
        query = query.or(orQuery);
      }
    }
    const { data } = await query;
    if (data) setUsers(data);
  };

  const fetchCheckins = async () => {
    if (!user || !dateFrom || !dateTo) return;
    setLoading(true);
    try {
      let query = supabase
        .from('crm_interactions')
        .select(`
          id,
          created_at,
          action_type,
          content,
          sale_id,
          customer:crm_customers!inner (
            id,
            full_name,
            phone,
            branch_id
          )
        `)
        .eq('action_type', 'Checkin')
        .gte('created_at', `${dateFrom}T00:00:00Z`)
        .lte('created_at', `${dateTo}T23:59:59Z`)
        .order('created_at', { ascending: false });

      if (filterBranch !== "Tất cả") {
        query = query.ilike('customer.branch_id', `%${filterBranch}%`);
      } else {
        if (!['Super Admin', 'Kế toán HO'].includes(user.role)) {
          const branchList = user.branch_id ? user.branch_id.split(',').map((b: string) => b.trim()) : [];
          if (branchList.length > 0) {
            const orConditions = branchList.map(b => `branch_id.ilike.%${b}%`).join(',');
            query = query.or(orConditions, { referencedTable: 'customer' });
          }
        }
      }
      const { data, error } = await query;
      if (error) throw error;
      setInteractions(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchCheckins();
    }
  }, [dateFrom, dateTo, filterBranch]);

  if (!user || !["Super Admin", "Admin", "Kế toán HO"].includes(user.role)) {
    return null;
  }

  // Filter interactions for display
  const displayedInteractions = interactions.filter(interaction => {
    if (filterSale !== "Tất cả" && interaction.sale_id !== filterSale) return false;
    if (filterTeacher !== "Tất cả" && !interaction.content.includes(`Giáo viên Test ID: ${filterTeacher}`)) return false;
    return true;
  });

  // Calculate stats
  const uniqueCustomers = new Set(displayedInteractions.map(i => i.customer?.id)).size;
  const totalCheckins = displayedInteractions.length;
  
  // Generate dynamic filter options from raw interactions
  const uniqueSaleIds = Array.from(new Set(interactions.map(i => i.sale_id).filter(Boolean)));
  const saleOptions = uniqueSaleIds.map(id => {
    const u = users.find(user => user.id === id);
    return { id: String(id), name: u ? u.full_name : "Không xác định" };
  });

  const uniqueTeacherIds = new Set<string>();
  const teacherOptions: {id: string, name: string}[] = [];
  interactions.forEach(i => {
    const idMatch = i.content.match(/Giáo viên Test ID: (.*?)(?:\n|$)/);
    const nameMatch = i.content.match(/Giáo viên Test: (.*?)(?:\n|$)/);
    if (idMatch && nameMatch) {
      const tId = idMatch[1].trim();
      const tName = nameMatch[1].trim();
      if (!uniqueTeacherIds.has(tId)) {
        uniqueTeacherIds.add(tId);
        teacherOptions.push({ id: tId, name: tName });
      }
    }
  });
  
  const parseContent = (content: string) => {
    const typeMatch = content.match(/\[Check-in (.*?)\]/);
    const imgMatch = content.match(/Ảnh minh chứng: (https?:\/\/[^\s]+)/);
    const teacherMatch = content.match(/Giáo viên Test: (.*?)(?:\n|$)/);
    const videoMatch = content.match(/Link Video Test: (https?:\/\/[^\s]+)/);
    return {
      type: typeMatch ? typeMatch[1] : "Tại trung tâm",
      imageUrl: imgMatch ? imgMatch[1] : null,
      teacher: teacherMatch ? teacherMatch[1].trim() : null,
      videoLink: videoMatch ? videoMatch[1].trim() : null
    };
  };

  const handleRowClick = async (customerId: string) => {
    if (!customerId) return;
    try {
      const { data, error } = await supabase.from('crm_customers').select('*').eq('id', customerId).single();
      if (error) throw error;
      if (data) {
        setSelectedCustomer(data);
        setIsDetailModalOpen(true);
      }
    } catch (e) {
      console.error(e);
      alert("Không thể tải chi tiết khách hàng.");
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#1e293b", margin: 0 }}>Báo cáo Thống kê Check-in</h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0 0" }}>Theo dõi và phân loại thực chiến / tại trung tâm của nhân sự</p>
        </div>
      </div>

      {/* FILTERS */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Từ ngày:</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Đến ngày:</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }} />
        </div>
        
        {user.role === 'Super Admin' || user.role === 'Kế toán HO' ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Chi nhánh:</label>
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}>
              <option value="Tất cả">Tất cả chi nhánh</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Nhân viên sale:</label>
          <select value={filterSale} onChange={e => setFilterSale(e.target.value)} style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem", minWidth: "150px" }}>
            <option value="Tất cả">Tất cả nhân viên</option>
            {saleOptions.map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "#475569" }}>Giáo viên Test nói:</label>
          <select value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)} style={{ padding: "0.4rem", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.85rem", minWidth: "150px" }}>
            <option value="Tất cả">Tất cả giáo viên</option>
            {teacherOptions.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ background: "#f0fdf4", padding: "1.5rem", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#166534", marginBottom: "0.5rem" }}>TỔNG SỐ LƯỢT CHECK-IN</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#15803d" }}>{totalCheckins} <span style={{ fontSize: "1rem", fontWeight: "normal" }}>lượt</span></div>
        </div>
        <div style={{ background: "#eff6ff", padding: "1.5rem", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e40af", marginBottom: "0.5rem" }}>SỐ KHÁCH HÀNG (UNIQUE)</div>
          <div style={{ fontSize: "2rem", fontWeight: "bold", color: "#1d4ed8" }}>{uniqueCustomers} <span style={{ fontSize: "1rem", fontWeight: "normal" }}>khách</span></div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Đang tải dữ liệu...</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <tr>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Thời gian</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Khách hàng</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Chi nhánh</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Phân loại</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Minh chứng</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Giáo viên Test</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Video Test</th>
                  <th style={{ padding: "1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Nhân viên Sale</th>
                </tr>
              </thead>
              <tbody>
                {displayedInteractions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>
                      Không có dữ liệu trong khoảng thời gian này.
                    </td>
                  </tr>
                ) : (
                  displayedInteractions.map((interaction, index) => {
                    const parsed = parseContent(interaction.content);
                    const date = new Date(interaction.created_at);
                    const formattedDate = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')} - ${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
                    return (
                      <tr 
                        key={interaction.id} 
                        onClick={() => handleRowClick(interaction.customer?.id)}
                        className="hover:bg-slate-50 transition-colors"
                        style={{ borderBottom: "1px solid #e2e8f0", background: index % 2 === 0 ? "white" : "#f8fafc", cursor: "pointer" }}
                      >
                        <td style={{ padding: "1rem", color: "#475569" }}>
                          {formattedDate}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <div style={{ fontWeight: 600, color: "#0f172a" }}>{interaction.customer?.full_name}</div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{interaction.customer?.phone}</div>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <span style={{ padding: "4px 8px", background: "#f1f5f9", borderRadius: "4px", fontSize: "0.8rem", fontWeight: 500 }}>
                            {interaction.customer?.branch_id}
                          </span>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          <span style={{ 
                            padding: "4px 8px", 
                            borderRadius: "4px", 
                            fontSize: "0.8rem", 
                            fontWeight: 600,
                            background: parsed.type === "Tại trung tâm" ? "#dcfce7" : "#fae8ff",
                            color: parsed.type === "Tại trung tâm" ? "#166534" : "#86198f"
                          }}>
                            {parsed.type}
                          </span>
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {parsed.imageUrl ? (
                            <a href={parsed.imageUrl} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                              🖼️ Xem ảnh
                            </a>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic" }}>Không có ảnh</span>
                          )}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {parsed.teacher ? (
                            <span style={{ fontWeight: 500, color: "#334155" }}>{parsed.teacher}</span>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic" }}>---</span>
                          )}
                        </td>
                        <td style={{ padding: "1rem" }}>
                          {parsed.videoLink ? (
                            <a href={parsed.videoLink} target="_blank" rel="noreferrer" style={{ color: "#ef4444", textDecoration: "none", fontWeight: 500, display: "flex", alignItems: "center", gap: "4px" }}>
                              🎥 Xem Video
                            </a>
                          ) : (
                            <span style={{ color: "#94a3b8", fontSize: "0.8rem", fontStyle: "italic" }}>---</span>
                          )}
                        </td>
                        <td style={{ padding: "1rem", color: "#475569" }}>
                          {users.find(u => u.id === interaction.sale_id)?.full_name || "---"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isDetailModalOpen && selectedCustomer && (
        <CRMDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          customer={selectedCustomer}
          users={users}
          currentUser={user}
          onSuccess={() => fetchCheckins()}
        />
      )}
    </div>
  );
}

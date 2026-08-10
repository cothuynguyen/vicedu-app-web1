"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Search, Save, Edit2, Archive, PlayCircle, BarChart3, Users, Phone, MapPin, X, ChevronDown, ChevronRight, User } from "lucide-react";
import Link from "next/link";

const BRANCHES = ["Việt Trì", "Lâm Thao", "Tuyên Quang", "Dân Hòa"];

export default function CampaignManagerPage() {
  const { user, loading: authLoading } = useAuth();
  const currentUser = user || { id: "", role: "User", branch_id: "", full_name: "" };

  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<Record<string, string>>({}); // id -> full_name
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [filterBranch, setFilterBranch] = useState("Tất cả");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", branch_id: "", status: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    fetchData();
  }, [authLoading, currentUser.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: campsData } = await supabase.from('crm_campaigns').select('*').order('created_at', { ascending: false });
      const { data: usersData } = await supabase.from('users').select('id, full_name');
      
      const userMap: Record<string, string> = {};
      if (usersData) {
        usersData.forEach((u: any) => {
          userMap[u.id] = u.full_name;
        });
      }
      setUsers(userMap);
      
      const isGlobal = ['Super Admin', 'Giám đốc'].includes(currentUser.role);
      const myBranches = currentUser.branch_id ? currentUser.branch_id.split(',').map((b: string) => b.trim()) : [];
      
            const buildQuery = () => {
        let q = supabase.from('crm_customers').select('id, branch_id, campaign_id, call_count, touchpoints, assigned_to');
        if (!isGlobal && myBranches.length > 0) {
          q = q.in('branch_id', myBranches);
        }
        return q;
      };

      let allCustomers: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await buildQuery()
          .range(page * 1000, (page + 1) * 1000 - 1);
        
        if (error) break;
        
        if (data && data.length > 0) {
          allCustomers = [...allCustomers, ...data];
          if (data.length < 1000) {
             hasMore = false;
          } else {
             page++;
          }
        } else {
          hasMore = false;
        }
      }
      
      const custData = allCustomers;
      
      setCampaigns(campsData || []);
      setCustomers(custData || []);
    } catch (e: any) {
      console.error(e);
      alert("Lỗi tải dữ liệu: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const isGlobalRole = ['Super Admin', 'Giám đốc'].includes(currentUser.role);
  const canEditCampaigns = isGlobalRole || currentUser.role === 'Admin';
  const myBranches = currentUser.branch_id ? currentUser.branch_id.split(',').map((b: string) => b.trim()) : [];

  const visibleCampaigns = useMemo(() => {
    let filtered = campaigns;
    
    if (!isGlobalRole) {
      filtered = filtered.filter(c => myBranches.includes(c.branch_id));
    }

    if (isGlobalRole && filterBranch !== "Tất cả") {
      filtered = filtered.filter(c => c.branch_id === filterBranch);
    }

    if (searchTerm) {
      filtered = filtered.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    if (filterStatus !== "Tất cả") {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    return filtered;
  }, [campaigns, isGlobalRole, myBranches, searchTerm, filterStatus]);

  const campaignStats = useMemo(() => {
    const stats: Record<string, { total: number, called: number, checkin: number, byStaff: Record<string, { total: number, called: number, checkin: number }> }> = {};
    
    campaigns.forEach(c => {
      stats[c.id] = { total: 0, called: 0, checkin: 0, byStaff: {} };
    });

    customers.forEach(cust => {
      if (cust.campaign_id && stats[cust.campaign_id]) {
        const campStat = stats[cust.campaign_id];
        campStat.total++;
        
        const isCalled = cust.call_count && cust.call_count > 0;
        const isCheckin = cust.touchpoints?.some((t: any) => t.code === 'checkin' && t.done);
        
        if (isCalled) campStat.called++;
        if (isCheckin) campStat.checkin++;

        const staffId = cust.assigned_to || 'unassigned';
        if (!campStat.byStaff[staffId]) {
          campStat.byStaff[staffId] = { total: 0, called: 0, checkin: 0 };
        }
        campStat.byStaff[staffId].total++;
        if (isCalled) campStat.byStaff[staffId].called++;
        if (isCheckin) campStat.byStaff[staffId].checkin++;
      }
    });

    return stats;
  }, [campaigns, customers]);

  const startEdit = (e: React.MouseEvent, campaign: any) => {
    e.stopPropagation();
    setEditingId(campaign.id);
    setEditForm({ name: campaign.name, branch_id: campaign.branch_id, status: campaign.status });
    setExpandedId(null);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleSave = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editForm.name.trim()) return alert("Tên không được để trống");
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('crm_campaigns')
        .update({
          name: editForm.name,
          branch_id: editForm.branch_id,
          status: editForm.status
        })
        .eq('id', id);

      if (error) throw error;
      
      setEditingId(null);
      fetchData();
    } catch (e: any) {
      alert("Lỗi phân quyền khi lưu (RLS). Vui lòng báo Giám đốc hệ thống cấp quyền hoặc chạy file fix_campaign_rls.sql: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (e: React.MouseEvent, campaign: any) => {
    e.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);
    const newStatus = campaign.status === 'Đang chạy' ? 'Đã đóng' : 'Đang chạy';
    try {
      const { error } = await supabase
        .from('crm_campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);

      if (error) throw error;
      fetchData();
    } catch (e: any) {
      alert("Lỗi phân quyền (RLS): " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExpand = (id: string) => {
    if (editingId === id) return;
    setExpandedId(expandedId === id ? null : id);
  };

  if (authLoading) return <div style={{ padding: '2rem', display: 'flex', justifyContent: 'center' }}><div className="loading-spinner"></div></div>;

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      {/* HEADER SECTION */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem", background: "linear-gradient(to right, #f8fafc, #ffffff)", padding: "1.5rem", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ padding: "0.5rem", background: "#eff6ff", borderRadius: "10px" }}>
              <BarChart3 size={32} color="#2563eb" />
            </div>
            Quản lý Chiến dịch
          </h1>
          <p style={{ color: "#64748b", marginTop: "0.5rem", fontSize: "0.95rem" }}>
            Giám sát hiệu suất chiến dịch và theo dõi số liệu trực tiếp của từng nhân sự.
          </p>
        </div>
        <Link href="/sales/crm" className="btn btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "white", border: "1px solid #e2e8f0", padding: "0.75rem 1.25rem", borderRadius: "8px", fontWeight: 600, color: "#475569", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", textDecoration: 'none' }}>
          Quay lại CRM
        </Link>
      </div>

      {/* FILTER SECTION */}
      <div style={{ padding: "1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center", background: "white", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)", border: "1px solid #f1f5f9" }}>
        <div style={{ flex: 1, minWidth: "250px", position: "relative" }}>
          <Search size={18} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input 
            type="text" 
            placeholder="Tìm kiếm chiến dịch..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", padding: "0.75rem 1rem 0.75rem 2.5rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", transition: "border-color 0.2s", fontSize: "0.95rem" }}
          />
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>Trạng thái:</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "0.75rem 2.5rem 0.75rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.95rem", cursor: "pointer", appearance: "none", background: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E') no-repeat right 0.75rem top 50%", backgroundSize: "0.65rem auto" }}>
            <option value="Tất cả">Tất cả</option>
            <option value="Đang chạy">Đang chạy</option>
            <option value="Đã đóng">Đã đóng</option>
          </select>
        </div>
        {isGlobalRole && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>Chi nhánh:</label>
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: "0.75rem 2.5rem 0.75rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.95rem", cursor: "pointer", appearance: "none", background: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E') no-repeat right 0.75rem top 50%", backgroundSize: "0.65rem auto" }}>
              <option value="Tất cả">Tất cả</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

      </div>
      {/* TABLE SECTION */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.025)", border: "1px solid #f1f5f9", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "1rem", color: "#475569", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Tên Chiến dịch</th>
                <th style={{ padding: "1rem", color: "#475569", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Chi nhánh</th>
                <th style={{ padding: "1rem", color: "#475569", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trạng thái</th>
                <th style={{ padding: "1rem", textAlign: 'center', color: "#475569", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <Users size={16} /> Tổng Data
                  </div>
                </th>
                <th style={{ padding: "1rem", textAlign: 'center', color: "#475569", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <Phone size={16} /> Đã gọi
                  </div>
                </th>
                <th style={{ padding: "1rem", textAlign: 'center', color: "#475569", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <MapPin size={16} /> Check-in
                  </div>
                </th>
                {canEditCampaigns && (<th style={{ padding: "1rem", width: '120px', textAlign: 'center', color: "#475569", fontWeight: 600, fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>Thao tác</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEditCampaigns ? 7 : 6} style={{ textAlign: 'center', padding: '3rem' }}>
                    <div style={{ display: "inline-block", width: "40px", height: "40px", border: "3px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                    <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    <p style={{ color: "#64748b", marginTop: "1rem", fontWeight: 500 }}>Đang đồng bộ dữ liệu...</p>
                  </td>
                </tr>
              ) : visibleCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={canEditCampaigns ? 7 : 6} style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
                    <div style={{ background: "#f1f5f9", width: "64px", height: "64px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
                      <Search size={32} color="#94a3b8" />
                    </div>
                    <span style={{ fontSize: "1.1rem", fontWeight: 500 }}>Không tìm thấy chiến dịch nào.</span>
                  </td>
                </tr>
              ) : (
                visibleCampaigns.map(c => {
                  const stats = campaignStats[c.id] || { total: 0, called: 0, checkin: 0, byStaff: {} };
                  const isExpanded = expandedId === c.id;
                  const isEditing = editingId === c.id;
                  
                  return (
                    <React.Fragment key={c.id}>
                      <tr 
                        onClick={() => !isEditing && toggleExpand(c.id)}
                        style={{ 
                          borderBottom: "1px solid #f1f5f9", 
                          transition: "all 0.2s ease",
                          cursor: isEditing ? "default" : "pointer",
                          background: isExpanded ? "#f8fafc" : "transparent"
                        }}
                        onMouseEnter={(e) => { if(!isEditing && !isExpanded) e.currentTarget.style.background = "#f8fafc" }}
                        onMouseLeave={(e) => { if(!isEditing && !isExpanded) e.currentTarget.style.background = "transparent" }}
                      >
                        {isEditing ? (
                          <>
                            <td style={{ padding: "1rem" }}>
                              <input 
                                type="text" 
                                value={editForm.name} 
                                onChange={e => setEditForm({...editForm, name: e.target.value})}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '2px solid #3b82f6', outline: "none", fontWeight: 500 }}
                                autoFocus
                              />
                            </td>
                            <td style={{ padding: "1rem" }}>
                              <select 
                                value={editForm.branch_id} 
                                onChange={e => setEditForm({...editForm, branch_id: e.target.value})}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              >
                                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                                <option value="Hệ thống">Hệ thống</option>
                              </select>
                            </td>
                            <td style={{ padding: "1rem" }}>
                              <select 
                                value={editForm.status} 
                                onChange={e => setEditForm({...editForm, status: e.target.value})}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                              >
                                <option value="Đang chạy">Đang chạy</option>
                                <option value="Đã đóng">Đã đóng</option>
                              </select>
                            </td>
                            <td style={{ padding: "1rem", textAlign: 'center', fontWeight: 'bold' }}>{stats.total}</td>
                            <td style={{ padding: "1rem", textAlign: 'center', fontWeight: 'bold', color: '#3b82f6' }}>{stats.called}</td>
                            <td style={{ padding: "1rem", textAlign: 'center', fontWeight: 'bold', color: '#10b981' }}>{stats.checkin}</td>
                            {canEditCampaigns && (
                            <td style={{ padding: "1rem", textAlign: 'center' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                <button onClick={(e) => handleSave(e, c.id)} disabled={isSaving} style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Lưu">
                                  {isSaving ? <div style={{ width: '18px', height: '18px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} /> : <Save size={18} />}
                                </button>
                                <button onClick={cancelEdit} disabled={isSaving} style={{ background: '#f87171', color: 'white', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Hủy">
                                  <X size={18} />
                                </button>
                              </div>
                            </td>
                          )}
                          </>
                        ) : (
                          <>
                            <td style={{ padding: "1rem", fontWeight: 600, color: c.status === 'Đã đóng' ? '#94a3b8' : '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              {isExpanded ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#94a3b8" />}
                              {c.name}
                            </td>
                            <td style={{ padding: "1rem" }}>
                              <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600 }}>
                                {c.branch_id}
                              </span>
                            </td>
                            <td style={{ padding: "1rem" }}>
                              {c.status === 'Đang chạy' ? (
                                <span style={{ background: "#dcfce7", color: "#15803d", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600 }}>
                                  Đang chạy
                                </span>
                              ) : (
                                <span style={{ background: "#f1f5f9", color: "#64748b", padding: "0.25rem 0.75rem", borderRadius: "9999px", fontSize: "0.8rem", fontWeight: 600 }}>
                                  Đã đóng
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "1rem", textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', color: '#334155' }}>{stats.total}</td>
                            <td style={{ padding: "1rem", textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', color: '#2563eb' }}>{stats.called}</td>
                            <td style={{ padding: "1rem", textAlign: 'center', fontWeight: 700, fontSize: '1.1rem', color: '#059669' }}>{stats.checkin}</td>
                            {canEditCampaigns && (
                            <td style={{ padding: "1rem", textAlign: 'center' }}>
                              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                <button onClick={(e) => startEdit(e, c)} style={{ background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} title="Sửa" onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}>
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  onClick={(e) => toggleStatus(e, c)} 
                                  style={{ background: c.status === 'Đang chạy' ? '#fff7ed' : '#ecfdf5', color: c.status === 'Đang chạy' ? '#f59e0b' : '#10b981', border: `1px solid ${c.status === 'Đang chạy' ? '#fed7aa' : '#a7f3d0'}`, padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s' }} 
                                  title={c.status === 'Đang chạy' ? "Đóng chiến dịch" : "Mở lại chiến dịch"}
                                  onMouseEnter={e => e.currentTarget.style.filter = 'brightness(0.95)'} 
                                  onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
                                >
                                  {c.status === 'Đang chạy' ? <Archive size={16} /> : <PlayCircle size={16} />}
                                </button>
                              </div>
                            </td>
                          )}
                          </>
                        )}
                      </tr>
                      
                      {/* DRILLDOWN ROW */}
                      {isExpanded && !isEditing && (
                        <tr>
                          <td colSpan={canEditCampaigns ? 7 : 6} style={{ padding: 0, borderBottom: "1px solid #f1f5f9" }}>
                            <div style={{ background: "#f8fafc", padding: "1.5rem", boxShadow: "inset 0 2px 4px 0 rgba(0,0,0,0.02)" }}>
                              <h4 style={{ margin: "0 0 1rem 0", color: "#334155", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                <Users size={18} color="#64748b" /> Báo cáo chi tiết theo Nhân sự
                              </h4>
                              
                              {Object.keys(stats.byStaff).length === 0 ? (
                                <p style={{ color: "#94a3b8", fontSize: "0.9rem", fontStyle: "italic", margin: 0 }}>Chiến dịch này chưa có khách hàng nào.</p>
                              ) : (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
                                  {Object.entries(stats.byStaff).sort((a, b) => b[1].total - a[1].total).map(([staffId, st]) => (
                                    <div key={staffId} style={{ background: "white", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#e0e7ff", display: "flex", alignItems: "center", justifyContent: "center", color: "#4f46e5" }}>
                                          <User size={16} />
                                        </div>
                                        <strong style={{ color: "#1e293b", fontSize: "0.95rem" }}>
                                          {staffId === 'unassigned' ? "Chưa giao cho ai" : (users[staffId] || staffId)}
                                        </strong>
                                      </div>
                                      
                                      <div style={{ display: "flex", justifyContent: "space-between", padding: "0.5rem", background: "#f8fafc", borderRadius: "6px" }}>
                                        <div style={{ textAlign: "center", flex: 1 }}>
                                          <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Data</div>
                                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#334155" }}>{st.total}</div>
                                        </div>
                                        <div style={{ width: "1px", background: "#e2e8f0" }}></div>
                                        <div style={{ textAlign: "center", flex: 1 }}>
                                          <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Đã gọi</div>
                                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2563eb" }}>{st.called}</div>
                                        </div>
                                        <div style={{ width: "1px", background: "#e2e8f0" }}></div>
                                        <div style={{ textAlign: "center", flex: 1 }}>
                                          <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Check-in</div>
                                          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#059669" }}>{st.checkin}</div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

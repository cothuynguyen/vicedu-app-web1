"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Plus, Search, FileText, Phone, Mail, Edit, Trash2, Calculator, User, ArrowLeftRight, Upload, Users } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import CRMAddModal from "@/components/crm/CRMAddModal";
import CRMDetailModal from "@/components/crm/CRMDetailModal";
import CRMQuoteModal from "@/components/crm/CRMQuoteModal";
import CRMImportModal from "@/components/crm/CRMImportModal";
import CRMCallLogModal from "@/components/crm/CRMCallLogModal";
import CRMReportTab from "@/components/crm/CRMReportTab";
import CRMBulkReassignModal from "@/components/crm/CRMBulkReassignModal";
import "./Crm.css";

// --- Types ---
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
  // Telesale fields
  source_name?: string;
  call_count?: number;
  last_called_at?: string;
  callback_date?: string;
  call_result?: string;
  lead_status?: string;
  assigned_sale?: CRMUser;
};

const DEFAULT_TOUCHPOINTS = [
  { code: "checkin", name: "1. Checkin hoặc Hẹn gặp", done: false },
  { code: "insight", name: "2. Khai thác Nỗi đau/Sung sướng", done: false },
  { code: "gift_child", name: "3. Tặng cho con trẻ một món quà gì đó", done: false },
  { code: "gift_parent", name: "4. Tặng cho cha mẹ quà tặng Online", done: false },
  { code: "test", name: "5. Test đầu vào (Quay Video/Phiếu)", done: false },
  { code: "account", name: "6. Cấp tài khoản RazKids, Padlet", done: false },
  { code: "zalo", name: "7. Tạo nhóm Zalo", done: false },
  { code: "trial", name: "8. Học thử tại VicEdu", done: false },
  { code: "foreign_teacher", name: "9. Giáo viên nước ngoài tặng bé 1 món quà?", done: false },
  { code: "sale", name: "10. Tư vấn & Chốt Sale", done: false },
];

export default function CRMPage() {
  const { user, loading: authLoading } = useAuth();
  const currentUser = user || { id: "", role: "User", branch_id: "", full_name: "" };
  
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [users, setUsers] = useState<CRMUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter states
  const [filterStatus, setFilterStatus] = useState("Tất cả");
  const [filterSale, setFilterSale] = useState("Tất cả");
  const [filterDate, setFilterDate] = useState("Tất cả");
  const [filterIdle, setFilterIdle] = useState("Tất cả");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [filterStaff, setFilterStaff] = useState("Tất cả");
  const [filterLeadStatus, setFilterLeadStatus] = useState("Tất cả");
  const [filterCampaign, setFilterCampaign] = useState("Tất cả");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({ totalData: 0, callsToday: 0, callsYesterday: 0, checkinsWeek: 0, checkinsMonth: 0 });
  const [quickFilter, setQuickFilter] = useState<string | null>(null);
  const [filterIsParent, setFilterIsParent] = useState(false);
  const [parentPhones, setParentPhones] = useState<Set<string>>(new Set());

  // Filter & Metric States
  const [callsMetricFilter, setCallsMetricFilter] = useState("today");
  const [callsDateFrom, setCallsDateFrom] = useState("");
  const [callsDateTo, setCallsDateTo] = useState("");
  const [callsCustomerIds, setCallsCustomerIds] = useState<string[]>([]);
  const [callsMetricValue, setCallsMetricValue] = useState(0);

  const [checkinsMetricFilter, setCheckinsMetricFilter] = useState("this_week");
  const [checkinsDateFrom, setCheckinsDateFrom] = useState("");
  const [checkinsDateTo, setCheckinsDateTo] = useState("");
  const [checkinsCustomerIds, setCheckinsCustomerIds] = useState<string[]>([]);
  const [checkinsMetricValue, setCheckinsMetricValue] = useState(0);
  
  // Modal toggle states
  const [showAddModal, setShowAddModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<CRMCustomer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteCustomer, setQuoteCustomer] = useState<CRMCustomer | null>(null);
  const [reassigningId, setReassigningId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showBulkReassignModal, setShowBulkReassignModal] = useState(false);
  const [callLogCustomer, setCallLogCustomer] = useState<CRMCustomer | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Tab chính
  const [mainTab, setMainTab] = useState<"list" | "report">("list");

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterSale, filterDate, filterIdle, filterBranch, filterStaff, filterLeadStatus, filterCampaign, quickFilter]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  const fetchData = async () => {
    if (authLoading) return;
    setLoading(true);
    try {
      const { data: usersData, error: usersError } = await supabase.from('users').select('id, full_name, role, branch_id, status');
      if (usersError) throw usersError;
      setUsers(usersData || []);

      const { data: campsData } = await supabase.from('crm_campaigns').select('id, name, branch_id, status').order('created_at', { ascending: false });
      setCampaigns(campsData || []);

      const { data: studentsData } = await supabase.from('students').select('parent_phone').not('parent_phone', 'is', null);
      if (studentsData) {
        const phones = new Set<string>(studentsData.map((s: any) => s.parent_phone));
        setParentPhones(phones);
      }

      const buildQuery = () => {
        let q = supabase.from('crm_customers').select('id, branch_id, full_name, email, phone, address, parent_role, children, insight, speaking_tester, entry_level, status, touchpoints, assigned_to, created_by, created_at, source_name, call_count, last_called_at, callback_date, call_result, lead_status, campaign_id, last_interacted_at');
        if (['Super Admin', 'Admin', 'Giám đốc'].includes(currentUser.role)) {
          if (!['Super Admin', 'Giám đốc'].includes(currentUser.role)) {
            const branchList = currentUser.branch_id ? currentUser.branch_id.split(',').map(b => b.trim()) : [];
            if (branchList.length > 0) {
              q = q.in('branch_id', branchList);
            }
          }
        } else {
          q = q.eq('assigned_to', currentUser.id);
        }
        return q;
      };

      let allCustomers: any[] = [];
      let page = 0;
      let hasMore = true;
      let customersError = null;

      while (hasMore) {
        const { data, error } = await buildQuery()
          .order('created_at', { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);
        
        if (error) {
          customersError = error;
          break;
        }
        
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
      
      const customersData = allCustomers;
        
      if (customersError) {
        console.error(customersError);
        setCustomers([]);
      } else {
        const joinedCustomers = (customersData || []).map((c: any) => ({
          ...c,
          assigned_sale: usersData?.find((u: any) => u.id === c.assigned_to)
        }));
        setCustomers(joinedCustomers);
      }
    } catch (error: any) {
      console.error("Error fetching CRM data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  
  const fetchCallMetrics = async () => {
    if (!currentUser.id) return;
    try {
      let fromDate = '', toDate = '';
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      if (callsMetricFilter === 'today') {
        fromDate = `${todayStr}T00:00:00Z`;
        toDate = `${todayStr}T23:59:59Z`;
      } else if (callsMetricFilter === 'yesterday') {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        fromDate = `${yStr}T00:00:00Z`;
        toDate = `${yStr}T23:59:59Z`;
      } else if (callsMetricFilter === 'this_week') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        fromDate = `${monday.toISOString().split('T')[0]}T00:00:00Z`;
        toDate = `${todayStr}T23:59:59Z`;
      } else if (callsMetricFilter === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        fromDate = `${firstDay.toISOString().split('T')[0]}T00:00:00Z`;
        toDate = `${todayStr}T23:59:59Z`;
      } else if (callsMetricFilter === 'custom') {
        if (!callsDateFrom || !callsDateTo) return;
        fromDate = `${callsDateFrom}T00:00:00Z`;
        toDate = `${callsDateTo}T23:59:59Z`;
      }

      let query = supabase.from('crm_interactions')
        .select('customer_id')
        .eq('action_type', 'Gọi điện')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);
        
      if (filterStaff !== "Tất cả") {
        query = query.eq('sale_id', filterStaff);
      } else if (!['Super Admin', 'Giám đốc'].includes(currentUser.role)) {
        query = query.eq('sale_id', currentUser.id);
      }

      const { data } = await query;

      if (data) {
        const uniqueIds = Array.from(new Set(data.map((d: any) => d.customer_id))) as string[];
        setCallsCustomerIds(uniqueIds);
      }
    } catch (e) {}
  };

  const fetchCheckinMetrics = async () => {
    if (!currentUser.id) return;
    try {
      let fromDate = '', toDate = '';
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      if (checkinsMetricFilter === 'today') {
        fromDate = `${todayStr}T00:00:00Z`;
        toDate = `${todayStr}T23:59:59Z`;
      } else if (checkinsMetricFilter === 'yesterday') {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        fromDate = `${yStr}T00:00:00Z`;
        toDate = `${yStr}T23:59:59Z`;
      } else if (checkinsMetricFilter === 'this_week') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        fromDate = `${monday.toISOString().split('T')[0]}T00:00:00Z`;
        toDate = `${todayStr}T23:59:59Z`;
      } else if (checkinsMetricFilter === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        fromDate = `${firstDay.toISOString().split('T')[0]}T00:00:00Z`;
        toDate = `${todayStr}T23:59:59Z`;
      } else if (checkinsMetricFilter === 'custom') {
        if (!checkinsDateFrom || !checkinsDateTo) return;
        fromDate = `${checkinsDateFrom}T00:00:00Z`;
        toDate = `${checkinsDateTo}T23:59:59Z`;
      }

      let query = supabase.from('crm_interactions')
        .select('customer_id')
        .eq('action_type', 'Checkin')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (filterStaff !== "Tất cả") {
        query = query.eq('sale_id', filterStaff);
      } else if (!['Super Admin', 'Giám đốc'].includes(currentUser.role)) {
        query = query.eq('sale_id', currentUser.id);
      }

      const { data } = await query;

      if (data) {
        const uniqueIds = Array.from(new Set(data.map((d: any) => d.customer_id))) as string[];
        setCheckinsCustomerIds(uniqueIds);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCallMetrics();
  }, [filterStaff, currentUser.id, callsMetricFilter, callsDateFrom, callsDateTo]);

  useEffect(() => {
    fetchCheckinMetrics();
  }, [filterStaff, currentUser.id, checkinsMetricFilter, checkinsDateFrom, checkinsDateTo]);


  const handleReassign = async (customer: CRMCustomer, newUserId: string) => {
    if (!newUserId || newUserId === customer.assigned_to) {
      setReassigningId(null);
      return;
    }
    const oldUser = users.find(u => u.id === customer.assigned_to);
    const newUser = users.find(u => u.id === newUserId);
    try {
      const { error: updateError } = await supabase
        .from('crm_customers')
        .update({ assigned_to: newUserId })
        .eq('id', customer.id);
      if (updateError) throw updateError;

      await supabase.from('crm_interactions').insert({
        customer_id: customer.id,
        sale_id: currentUser.id,
        action_type: "Chuyển giao",
        content: `${currentUser.full_name} chuyển phụ trách từ "${oldUser?.full_name || 'Unknown'}" sang "${newUser?.full_name || 'Unknown'}"`
      });

      fetchData();
    } catch (err: any) {
      alert("Lỗi chuyển giao: " + err.message);
    } finally {
      setReassigningId(null);
    }
  };

  const baseFilteredCustomers = React.useMemo(() => {
    return customers.filter(c => {
      const matchSearch = c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.phone.includes(searchTerm) ||
                          (c.children && c.children.some((child: any) => child.name && child.name.toLowerCase().includes(searchTerm.toLowerCase())));
      const matchStatus = filterStatus === "Tất cả" || c.status.startsWith(filterStatus);
      const matchSale = filterSale === "Tất cả" || c.assigned_to === filterSale;
      const matchParent = filterIsParent ? parentPhones.has(c.phone) : true;
      
      let matchDate = true;
      if (filterDate !== "Tất cả") {
        const createdDate = new Date(c.created_at);
        const now = new Date();
        if (filterDate === "Tháng này") {
          matchDate = createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
        } else if (filterDate === "Tháng trước") {
          let lastMonth = now.getMonth() - 1;
          let year = now.getFullYear();
          if (lastMonth < 0) { lastMonth = 11; year--; }
          matchDate = createdDate.getMonth() === lastMonth && createdDate.getFullYear() === year;
        } else if (filterDate === "Tuần này") {
          const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          matchDate = createdDate >= pastWeek;
        }
      }
      
      const now = new Date();
      const lastInteract = new Date((c as any).last_interacted_at || c.created_at);
      const idleDays = Math.floor((now.getTime() - lastInteract.getTime()) / (1000 * 60 * 60 * 24));
      (c as any).idleDays = idleDays;
      
      let matchIdle = true;
      if (filterIdle === ">7") {
        matchIdle = idleDays > 7;
      } else if (filterIdle === ">30") {
        matchIdle = idleDays > 30;
      }
      
      const matchBranch = filterBranch === "Tất cả" || c.branch_id === filterBranch;
      const matchStaff = filterStaff === "Tất cả" || c.assigned_to === filterStaff;
      const today = new Date().toISOString().split("T")[0];
      const matchLeadStatus = filterLeadStatus === "Tất cả"
        || (filterLeadStatus === "callback_today" ? c.callback_date === today : c.lead_status === filterLeadStatus);

      const matchCampaign = filterCampaign === "Tất cả" || (c as any).campaign_id === filterCampaign;

      return matchSearch && matchStatus && matchSale && matchDate && matchIdle && matchBranch && matchStaff && matchLeadStatus && matchCampaign && matchParent;
    });
  }, [customers, searchTerm, filterStatus, filterSale, filterDate, filterIdle, filterBranch, filterStaff, filterLeadStatus, filterCampaign, filterIsParent, parentPhones]);

  const filteredCustomers = React.useMemo(() => {
    return baseFilteredCustomers.filter(c => {
      const today = new Date().toISOString().split("T")[0];
      let matchQuickFilter = true;
      if (quickFilter === "need_call") {
        matchQuickFilter = c.callback_date === today || (c.call_count || 0) === 0;
      } else if (quickFilter === "called_today") {
        matchQuickFilter = !!c.last_called_at?.startsWith(today);
      } else if (quickFilter === "potential") {
        matchQuickFilter = c.lead_status === "Tiềm năng";
      } else if (quickFilter === "hot") {
        const hasCheckin = c.touchpoints?.some((t: any) => t.code === 'checkin' && t.done);
        matchQuickFilter = c.status === "Đang tư vấn" || hasCheckin;
      } else if (quickFilter === "metric_calls") {
        matchQuickFilter = callsCustomerIds.includes(c.id);
      } else if (quickFilter === "metric_checkins") {
        matchQuickFilter = checkinsCustomerIds.includes(c.id);
      }
      return matchQuickFilter;
    });
  }, [baseFilteredCustomers, quickFilter, callsCustomerIds, checkinsCustomerIds]);
  const validCallsIds = callsCustomerIds.filter(id => baseFilteredCustomers.some(c => c.id === id));
  const validCheckinsIds = checkinsCustomerIds.filter(id => baseFilteredCustomers.some(c => c.id === id));


  // Unique sources cho bộ lọc
  const uniqueSources = Array.from(new Set(customers.map(c => c.source_name).filter(Boolean))) as string[];

  // Priority sort for telesale: callback today first, then never called, then rest
  const today = new Date().toISOString().split("T")[0];
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    const priorityA = a.callback_date === today ? 0 : (a.call_count || 0) === 0 ? 1 : 2;
    const priorityB = b.callback_date === today ? 0 : (b.call_count || 0) === 0 ? 1 : 2;
    return priorityA - priorityB;
  });

  const totalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE);
  const paginatedCustomers = sortedCustomers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const BRANCHES = ["Việt Trì", "Lâm Thao", "Tuyên Quang", "Dân Hòa"];
  const isGlobalRole = ['Super Admin', 'Giám đốc'].includes(currentUser.role);
  const myBranches = currentUser.branch_id ? currentUser.branch_id.split(',').map((b: string) => b.trim()) : [];
  const validCampaigns = (isGlobalRole ? campaigns : campaigns.filter(c => myBranches.includes(c.branch_id))).filter(c => c.status !== 'Đã đóng');
  const showBranchFilter = isGlobalRole || myBranches.length > 1;
  const canReassign = ['Super Admin', 'Admin'].includes(currentUser.role) || isGlobalRole;
  const staffForFilter = (() => {
    // Admin chi nhánh → chỉ thấy nhân viên trong chi nhánh của mình
    if (!isGlobalRole && currentUser.role === 'Admin') {
      return users.filter(u => {
        const userBranches = u.branch_id ? u.branch_id.split(',').map((b: string) => b.trim()) : [];
        return userBranches.some(b => currentUser.branch_id.split(',').map(x => x.trim()).includes(b));
      });
    }
    // Super Admin / Giám đốc → lọc theo dropdown chi nhánh đã chọn
    if (filterBranch === "Tất cả") return users;
    return users.filter(u => {
      const userBranches = u.branch_id ? u.branch_id.split(',').map((b: string) => b.trim()) : [];
      return userBranches.includes(filterBranch);
    });
  })();

  // --- TÍNH TOÁN MINI DASHBOARD SALE ---
  const todayStr = new Date().toISOString().split("T")[0];

  const countNeedCall = baseFilteredCustomers.filter(c => c.callback_date === todayStr || (c.call_count || 0) === 0).length;
  const countCalledToday = baseFilteredCustomers.filter(c => c.last_called_at?.startsWith(todayStr)).length;
  const countPotential = baseFilteredCustomers.filter(c => c.lead_status === "Tiềm năng").length;
  const countHot = baseFilteredCustomers.filter(c => c.status === "Đang tư vấn" || c.touchpoints?.some((t:any) => t.code === 'checkin' && t.done)).length;

  return (
    <>
      <div className="crm-container animate-fade-in">
      <div className="crm-header">
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--text-main)", marginBottom: "0.5rem" }}>
            Quản trị Khách hàng (CRM)
          </h1>
          <p style={{ color: "var(--text-muted)" }}>Quản lý phễu khách hàng, theo dõi điểm chạm & hành trình tư vấn.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          {canReassign && (
            <button className="btn btn-secondary" onClick={() => setShowBulkReassignModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #f59e0b", color: "#d97706" }}>
              <Users size={16} /> 
              {selectedCustomerIds.length > 0 ? `Chuyển giao (${selectedCustomerIds.length})` : "Chuyển giao Data"}
            </button>
          )}
          {(isGlobalRole || currentUser.role === 'Admin' || currentUser.role === 'Quản lý') && (
            <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}
              style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #16a34a", color: "#16a34a" }}>
              <Upload size={16} /> Import Excel
            </button>
          )}
          <button className="btn btn-primary" onClick={() => { 
            setEditingCustomer(null);
            setShowAddModal(true); 
          }}>
            <Plus size={18} /> Thêm Khách hàng mới
          </button>
        </div>
      </div>

      {/* ── Tab switcher ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: "1.5rem", background: "#f1f5f9", padding: "0.3rem", borderRadius: 10, width: "fit-content" }}>
        {([
          { key: "list",   label: "📋 Danh sách KH" },
          { key: "report", label: "📊 Báo cáo" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setMainTab(tab.key)}
            style={{
              padding: "0.45rem 1.25rem", borderRadius: 8, cursor: "pointer",
              border: "none", fontWeight: 600, fontSize: "0.9rem", transition: "all 0.2s",
              background: mainTab === tab.key ? "white" : "transparent",
              color: mainTab === tab.key ? "#6366f1" : "#64748b",
              boxShadow: mainTab === tab.key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Báo cáo ── */}
      {mainTab === "report" && (
        <CRMReportTab
          customers={customers}
          users={users}
          currentUser={currentUser}
          campaigns={validCampaigns}
        />
      )}

      {/* ── Tab: Danh sách KH ── */}
      {mainTab === "list" && (<>

      {/* ── MINI DASHBOARD CHO SALE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {[
          { id: "need_call", title: "Cần gọi hôm nay", count: countNeedCall, color: "#ef4444", bg: "#fef2f2", icon: "📞", sub: "Lịch hẹn + Chưa gọi" },
          { id: "called_today", title: "Đã gọi hôm nay", count: countCalledToday, color: "#3b82f6", bg: "#eff6ff", icon: "✅", sub: "Tương tác trong ngày" },
          { id: "potential", title: "KH Tiềm năng", count: countPotential, color: "#f59e0b", bg: "#fffbeb", icon: "⭐", sub: "Đã phân loại tiềm năng" },
          { id: "hot", title: "Chăm sóc sâu (Nóng)", count: countHot, color: "#10b981", bg: "#f0fdf4", icon: "🔥", sub: "Đang tư vấn / Đã checkin" }
        ].map(card => (
          <div 
            key={card.id}
            onClick={() => setQuickFilter(quickFilter === card.id ? null : card.id)}
            style={{ 
              background: quickFilter === card.id ? card.bg : "white", 
              border: `1px solid ${quickFilter === card.id ? card.color : "#e2e8f0"}`, 
              borderRadius: 12, padding: "1rem 1.25rem", cursor: "pointer", 
              boxShadow: quickFilter === card.id ? `0 0 0 1px ${card.color}` : "0 1px 2px rgba(0,0,0,0.05)",
              transition: "all 0.2s" 
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>{card.icon}</span>
              <span style={{ fontSize: "1.5rem", fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.count}</span>
            </div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#1e293b" }}>{card.title}</div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.25rem" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="crm-filters" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem", background: "#f8fafc", padding: "1rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
        <div className="search-box" style={{ flex: 1, minWidth: "250px" }}>
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên KH hoặc số điện thoại..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Trạng thái:</label>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
            <option value="Tất cả">Tất cả</option>
            <option value="Mới">Mới tiếp cận</option>
            <option value="Đang">Đang tư vấn</option>
            <option value="Đã">Đã chốt (Học viên)</option>
            <option value="Hủy">Hủy / Chăm lại sau</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Cảnh báo:</label>
          <select value={filterIdle} onChange={e => setFilterIdle(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
            <option value="Tất cả">Tất cả KH</option>
            <option value=">7">Bỏ quên &gt; 7 ngày</option>
            <option value=">30">Bỏ quên &gt; 30 ngày</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Thời gian tạo:</label>
          <select value={filterDate} onChange={e => setFilterDate(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
            <option value="Tất cả">Tất cả</option>
            <option value="Tuần này">Trong 7 ngày qua</option>
            <option value="Tháng này">Tháng này</option>
            <option value="Tháng trước">Tháng trước</option>
          </select>
        </div>

        {showBranchFilter && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Chi nhánh:</label>
            <select 
              value={filterBranch} 
              onChange={e => { setFilterBranch(e.target.value); setFilterStaff("Tất cả"); }} 
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            >
              <option value="Tất cả">Tất cả chi nhánh</option>
              {(isGlobalRole ? BRANCHES : myBranches).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}

        {(isGlobalRole || currentUser.role === 'Admin') && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Nhân viên:</label>
            <select 
              value={filterStaff} 
              onChange={e => setFilterStaff(e.target.value)} 
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", maxWidth: "100%" }}
            >
              <option value="Tất cả">Tất cả nhân viên</option>
              {staffForFilter.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Telesale:</label>
          <select value={filterLeadStatus} onChange={e => setFilterLeadStatus(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
            <option value="Tất cả">Tất cả</option>
            <option value="callback_today">🔴 Hẹn gọi lại hôm nay</option>
            <option value="Chưa gọi">🟡 Chưa gọi lần nào</option>
            <option value="Tiềm năng">✅ Tiềm năng</option>
            <option value="Hẹn lại">📅 Hẹn lại</option>
            <option value="Không tiềm năng">❌ Không tiềm năng</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Chiến dịch:</label>
          <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
            <option value="Tất cả">Tất cả chiến dịch</option>
            {validCampaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          
          <Link href="/sales/campaigns" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", height: "36px", display: "flex", alignItems: "center", textDecoration: 'none' }} title="Quản lý Chiến dịch">
            ⚙️
          </Link>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginLeft: "auto" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.4rem", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#0f766e", background: "#f0fdfa", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #ccfbf1" }}>
            <input 
              type="checkbox" 
              checked={filterIsParent} 
              onChange={e => setFilterIsParent(e.target.checked)} 
              style={{ cursor: "pointer", accentColor: "#0f766e" }}
            />
            👥 Khách là Phụ huynh
          </label>
        </div>
      </div>

      {/* DASHBOARD METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
          <p style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>TỔNG DATA CHIẾN DỊCH</p>
          <h3 style={{ fontSize: "1.8rem", color: "#15803d", margin: "0.5rem 0 0 0" }}>{filteredCustomers.length}</h3>
        </div>

        <div style={{ padding: "1rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: "0.85rem", color: "#1e40af", fontWeight: 600, margin: 0 }}>KHÁCH ĐÃ GỌI ĐIỆN</p>
            <select value={callsMetricFilter} onChange={e => setCallsMetricFilter(e.target.value)} style={{ padding: '0.2rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid #bfdbfe' }}>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="this_week">Tuần này</option>
              <option value="this_month">Tháng này</option>
              <option value="custom">Tùy chọn...</option>
            </select>
          </div>
          {callsMetricFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="date" value={callsDateFrom} onChange={e => setCallsDateFrom(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
              <input type="date" value={callsDateTo} onChange={e => setCallsDateTo(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
            </div>
          )}
          <h3 
            onClick={() => setQuickFilter('metric_calls')}
            style={{ fontSize: "1.8rem", color: "#1d4ed8", margin: "0.5rem 0 0 0", cursor: "pointer", display: "inline-block" }}
            title="Click để xem danh sách"
          >
            {validCallsIds.length} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>khách hàng</span>
          </h3>
        </div>

        <div style={{ padding: "1rem", background: "#fdf4ff", border: "1px solid #fbcfe8", borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: "0.85rem", color: "#86198f", fontWeight: 600, margin: 0 }}>KHÁCH ĐÃ CHECK-IN</p>
            <select value={checkinsMetricFilter} onChange={e => setCheckinsMetricFilter(e.target.value)} style={{ padding: '0.2rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid #fbcfe8' }}>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="this_week">Tuần này</option>
              <option value="this_month">Tháng này</option>
              <option value="custom">Tùy chọn...</option>
            </select>
          </div>
          {checkinsMetricFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="date" value={checkinsDateFrom} onChange={e => setCheckinsDateFrom(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
              <input type="date" value={checkinsDateTo} onChange={e => setCheckinsDateTo(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
            </div>
          )}
          <h3 
            onClick={() => setQuickFilter('metric_checkins')}
            style={{ fontSize: "1.8rem", color: "#a21caf", margin: "0.5rem 0 0 0", cursor: "pointer", display: "inline-block" }}
            title="Click để xem danh sách"
          >
            {validCheckinsIds.length} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>khách hàng</span>
          </h3>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Đang tải dữ liệu...</div>
      ) : (
        <div className="crm-table-container" style={{ marginTop: "1.5rem" }}>
          <table className="crm-table">
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>
                  <input type="checkbox" 
                    checked={sortedCustomers.length > 0 && selectedCustomerIds.length === sortedCustomers.length}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCustomerIds(sortedCustomers.map(c => c.id));
                      else setSelectedCustomerIds([]);
                    }}
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th>Khách hàng</th>
                <th>Liên hệ</th>
                <th>Người phụ trách</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: "center" }}>Telesale</th>
                <th style={{ textAlign: "center" }}>Tiến độ SOP</th>
                <th style={{ textAlign: "center" }}>Chưa tương tác</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "2rem", color: "#64748b" }}>
                    Chưa có dữ liệu khách hàng.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((customer) => {
                  const doneTouchpoints = customer.touchpoints?.filter((t: any) => t.done).length || 0;
                  const totalTouchpoints = customer.touchpoints?.length || 10;
                  const percent = Math.round((doneTouchpoints / totalTouchpoints) * 100) || 0;
                  
                  return (
                     <tr key={customer.id} style={{
                       background: customer.callback_date === today ? "#fffbeb" :
                                   (customer.call_count || 0) === 0 ? "#f0fdf4" : "transparent"
                     }}>
                       <td style={{ textAlign: "center" }}>
                         <input type="checkbox"
                           checked={selectedCustomerIds.includes(customer.id)}
                           onChange={(e) => {
                             if (e.target.checked) setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                             else setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                           }}
                           style={{ cursor: "pointer" }}
                         />
                       </td>
                       <td>
                        <div style={{ fontWeight: 500, color: "#1e293b", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                          {customer.full_name} ({customer.parent_role})
                          {parentPhones.has(customer.phone) && (
                            <span style={{ fontSize: "0.7rem", fontWeight: 600, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px", border: "1px solid #bbf7d0" }}>
                              ✓ Phụ huynh
                            </span>
                          )}
                           {(() => {
                             const checkinTp = customer.touchpoints?.find((t: any) => t.code === 'checkin');
                             const checkinCount = checkinTp?.count || (checkinTp?.done ? 1 : 0);
                             if (checkinCount > 0) {
                               return (
                                 <span style={{ fontSize: "0.7rem", fontWeight: 600, background: "#fef08a", color: "#854d0e", padding: "2px 6px", borderRadius: "4px", border: "1px solid #fef9c3", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                   📍 Check-in ({checkinCount})
                                 </span>
                               );
                             }
                             return null;
                           })()}
                        </div>
                         {customer.children?.map((child: any, idx: number) => (
                           <div key={idx} style={{ fontSize: "0.85rem", color: "#64748b", marginTop: "0.25rem" }}>
                             {child.name} ({child.yob}){child.school ? ` · ${child.school}` : ""}{child.grade ? ` · ${child.grade}` : ""}
                           </div>
                         ))}
                         {customer.source_name && (
                           <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                             📌 {customer.source_name}
                           </div>
                         )}
                       </td>
                       <td>
                         <div><Phone size={14} style={{ display: "inline", marginRight: 4 }}/> {customer.phone}</div>
                         {customer.email && <div style={{ marginTop: "0.25rem", color: "#64748b" }}><Mail size={14} style={{ display: "inline", marginRight: 4 }}/> {customer.email}</div>}
                       </td>
                       <td>
                          {canReassign && reassigningId === customer.id ? (
                            <select
                              autoFocus
                              defaultValue={customer.assigned_to}
                              onChange={(e) => handleReassign(customer, e.target.value)}
                              onBlur={() => setReassigningId(null)}
                              style={{
                                padding: "0.3rem 0.5rem",
                                borderRadius: "6px",
                                border: "1px solid #3b82f6",
                                fontSize: "0.85rem",
                                outline: "2px solid #93c5fd",
                                cursor: "pointer",
                                maxWidth: "160px"
                              }}
                            >
                              <option value="">-- Chọn người phụ trách --</option>
                              {users
                                .filter(u => {
                                  const branches = u.branch_id ? u.branch_id.split(',').map(b => b.trim()) : [];
                                  return branches.includes(customer.branch_id) && u.status !== 'Nghỉ việc';
                                })
                                .map(u => (
                                  <option key={u.id} value={u.id}>{u.full_name}</option>
                                ))
                              }
                            </select>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <User size={16} color="#64748b" />
                              <span>{customer.assigned_sale?.full_name || "Unknown"}</span>
                              {canReassign && (
                                <button
                                  title="Chuyển giao người phụ trách"
                                  onClick={() => setReassigningId(customer.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: "2px 4px",
                                    borderRadius: "4px",
                                    color: "#94a3b8",
                                    display: "flex",
                                    alignItems: "center",
                                    transition: "color 0.15s"
                                  }}
                                  onMouseEnter={e => (e.currentTarget.style.color = "#3b82f6")}
                                  onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
                                >
                                  <ArrowLeftRight size={13} />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                       <td>
                         <span className={`status-badge status-${customer.status.split(' ')[0]}`}>{customer.status}</span>
                       </td>
                       <td style={{ textAlign: "center" }}>
                         <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                           {/* Lead status badge */}
                           <span className={`lead-badge lead-${(customer.lead_status || "Chưa gọi").replace(/ /g, "-")}`}>
                             {customer.lead_status || "Chưa gọi"}
                           </span>
                           {/* Call count */}
                           <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                             {(customer.call_count || 0) === 0 ? "Chưa gọi" : `📞 ${customer.call_count} lần`}
                           </span>
                           {/* Callback date */}
                           {customer.callback_date && (
                             <span style={{
                               fontSize: "0.75rem", fontWeight: 600,
                               color: customer.callback_date < today ? "#dc2626" : "#2563eb"
                             }}>
                               📅 {customer.callback_date}
                               {customer.callback_date < today ? " (Quá hạn!)" : customer.callback_date === today ? " (Hôm nay!)" : ""}
                             </span>
                           )}
                         </div>
                       </td>
                       <td style={{ textAlign: "center" }}>
                         <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                           <div style={{ flex: 1, height: "6px", background: "#e2e8f0", borderRadius: "99px", overflow: "hidden" }}>
                             <div style={{ width: `${percent}%`, height: "100%", background: percent === 100 ? "#10b981" : "#3b82f6", transition: "width 0.3s" }}></div>
                           </div>
                           <span style={{ fontSize: "0.85rem", fontWeight: 500, minWidth: "35px" }}>{percent}%</span>
                         </div>
                       </td>
                       <td style={{ textAlign: "center" }}>
                         <span style={{ 
                           fontSize: "0.85rem", 
                           fontWeight: 600, 
                           color: (customer as any).idleDays > 7 ? "#ef4444" : ((customer as any).idleDays > 3 ? "#f59e0b" : "#10b981") 
                         }}>
                           {(customer as any).idleDays} ngày
                         </span>
                       </td>
                       <td>
                         <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-secondary" style={{ padding: "0.4rem 0.5rem", fontSize: "0.85rem", color: "#3b82f6" }} title="Ghi kết quả cuộc gọi" onClick={() => setCallLogCustomer(customer)}>
                              <Phone size={16} />
                            </button>
                           <button className="btn btn-secondary" style={{ padding: "0.4rem 0.5rem", fontSize: "0.85rem" }} title="Chi tiết/Timeline" onClick={() => setSelectedCustomer(customer)}>
                             <FileText size={16} />
                           </button>
                           <button className="btn btn-secondary" style={{ padding: "0.4rem 0.5rem", fontSize: "0.85rem", color: "#16a34a" }} title="Tạo Báo Giá" onClick={() => {
                             setQuoteCustomer(customer);
                             setShowQuoteModal(true);
                           }}>
                             <Calculator size={16} />
                           </button>
                           <button className="btn btn-secondary" style={{ padding: "0.4rem 0.5rem", fontSize: "0.85rem" }} title="Sửa" onClick={() => {
                             setEditingCustomer(customer);
                             setShowAddModal(true);
                           }}>
                             <Edit size={16} />
                           </button>
                           <button className="btn btn-secondary" style={{ padding: "0.4rem 0.5rem", fontSize: "0.85rem", color: "#dc2626" }} title="Xóa" onClick={async () => {
                             if(window.confirm(`Xóa khách hàng ${customer.full_name}? Thao tác này sẽ xóa toàn bộ nhật ký và không thể hoàn tác!`)){
                               try {
                                 await supabase.from('crm_interactions').delete().eq('customer_id', customer.id);
                                 const { error } = await supabase.from('crm_customers').delete().eq('id', customer.id);
                                 if(error) throw error;
                                 alert("Đã xóa khách hàng!");
                                 fetchData();
                               } catch(e:any){
                                 alert("Lỗi xóa: " + e.message);
                               }
                             }
                           }}>
                             <Trash2 size={16} />
                           </button>
                         </div>
                       </td>
                     </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Hiển thị {Math.min(sortedCustomers.length, (currentPage - 1) * ITEMS_PER_PAGE + 1)} - {Math.min(sortedCustomers.length, currentPage * ITEMS_PER_PAGE)} / Tổng {sortedCustomers.length} khách hàng
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>Trước</button>
                <span style={{ fontSize: '0.9rem', fontWeight: 500, padding: '0 0.5rem' }}>{currentPage} / {totalPages}</span>
                <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.85rem' }} disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>Sau</button>
              </div>
            </div>
          )}

        </div>
      )}
      </> )}
      </div>

      {/* Add / Edit Modal */}
      <CRMAddModal 
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); setEditingCustomer(null); }}
        editingCustomer={editingCustomer}
        users={users}
        currentUser={currentUser}
        onSuccess={fetchData}
        defaultTouchpoints={DEFAULT_TOUCHPOINTS}
      />

      {/* Detail Modal */}
      <CRMDetailModal 
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        customer={selectedCustomer}
        users={users}
        currentUser={currentUser}
        onSuccess={fetchData}
      />

      {/* Quote Modal */}
      <CRMQuoteModal 
        isOpen={showQuoteModal}
        onClose={() => { setShowQuoteModal(false); setQuoteCustomer(null); }}
        customer={quoteCustomer}
      />
      {/* Import Modal */}
      <CRMImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        users={users}
        currentUser={currentUser}
        onSuccess={fetchData}
      />

      <CRMBulkReassignModal
        isOpen={showBulkReassignModal}
        onClose={() => setShowBulkReassignModal(false)}
        users={users}
        currentUser={currentUser}
        selectedCustomerIds={selectedCustomerIds}
        onSuccess={() => {
          setSelectedCustomerIds([]);
          fetchData();
        }}
      />

      {/* Call Log Modal */}
      <CRMCallLogModal
        isOpen={!!callLogCustomer}
        onClose={() => setCallLogCustomer(null)}
        customer={callLogCustomer}
        currentUser={currentUser}
        onSuccess={fetchData}
      />
    </>
  );
}

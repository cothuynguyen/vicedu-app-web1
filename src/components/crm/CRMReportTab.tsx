"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Phone, Users, TrendingUp, CheckSquare, ChevronRight, BarChart2, RefreshCw, X } from "lucide-react";
import dayjs from "dayjs";

type CRMUser = { id: string; full_name: string; status: string; role: string; branch_id: string };

interface CRMReportTabProps {
  customers: any[];
  users: CRMUser[];
  currentUser: { id: string; role: string; branch_id: string; full_name: string };
  campaigns?: any[];
}

const TOUCHPOINTS = [
  { code: "checkin",         name: "Checkin / Hẹn gặp" },
  { code: "insight",         name: "Khai thác Nỗi đau" },
  { code: "gift_child",      name: "Tặng quà cho con" },
  { code: "gift_parent",     name: "Tặng quà phụ huynh" },
  { code: "test",            name: "Test đầu vào" },
  { code: "account",         name: "Cấp tài khoản" },
  { code: "zalo",            name: "Tạo nhóm Zalo" },
  { code: "trial",           name: "Học thử" },
  { code: "foreign_teacher", name: "GV nước ngoài tặng quà" },
  { code: "sale",            name: "Tư vấn & Chốt Sale" },
];

function getMonday(d: Date) {
  const day = d.getDay() || 7;
  const mon = new Date(d);
  mon.setDate(d.getDate() - day + 1);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export default function CRMReportTab({ customers, users, currentUser, campaigns = [] }: CRMReportTabProps) {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const mondayStr = getMonday(today).toISOString().split("T")[0];
  const firstDayMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];

  const [dateFrom, setDateFrom] = useState(firstDayMonth);
  const [dateTo, setDateTo] = useState(todayStr);
  const [loading, setLoading] = useState(false);
  const [showListModal, setShowListModal] = useState<{ title: string, data: any[] } | null>(null);

  const isGlobalRole = ['Super Admin', 'Giám đốc'].includes(currentUser.role);
  const isManagerRole = ['Super Admin', 'Giám đốc', 'Admin', 'Quản lý', 'Trưởng phòng Đào tạo'].includes(currentUser.role);
  const myBranches = currentUser.branch_id ? currentUser.branch_id.split(',').map(b => b.trim()) : [];
  
  // Bộ lọc nâng cao
  const [filterBranch, setFilterBranch] = useState(isGlobalRole ? "Tất cả" : (myBranches[0] || "Tất cả"));
  const [filterStaff, setFilterStaff] = useState(isManagerRole ? "Tất cả" : currentUser.id);
  const [filterCampaign, setFilterCampaign] = useState("Tất cả");

  const staffForFilter = (() => {
    if (!isGlobalRole && isManagerRole) {
      return users.filter(u => {
        const ub = u.branch_id ? u.branch_id.split(',').map(b => b.trim()) : [];
        return ub.some(b => myBranches.includes(b));
      });
    }
    if (!isManagerRole) {
      return users.filter(u => u.id === currentUser.id);
    }
    if (filterBranch === "Tất cả") return users;
    return users.filter(u => {
      const ub = u.branch_id ? u.branch_id.split(',').map(b => b.trim()) : [];
      return ub.includes(filterBranch);
    });
  })();

  const BRANCHES = ["Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"];

  // Dữ liệu report
  const [interactions, setInteractions] = useState<any[]>([]);

  const fetchInteractions = useCallback(async () => {
    setLoading(true);
    try {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);

      // Guard: bỏ qua nếu ngày không hợp lệ (user xóa input)
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        setLoading(false);
        return;
      }

      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);

      
      let allInteractions: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("crm_interactions")
          .select("id, customer_id, sale_id, action_type, content, created_at")
          .gte("created_at", from.toISOString())
          .lte("created_at", to.toISOString())
          .order('created_at', { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allInteractions = [...allInteractions, ...data];
          if (data.length < 1000) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      setInteractions(allInteractions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // ─── Tính các chỉ số ───────────────────────────────────────────────
  const from = new Date(dateFrom);
  const to = new Date(dateTo);

  // Guard: nếu ngày không hợp lệ thì không tính
  const datesValid = !isNaN(from.getTime()) && !isNaN(to.getTime());
  if (datesValid) {
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  }

  // Lọc dữ liệu theo Chi nhánh và Nhân sự
  const validStaffIds = new Set(staffForFilter.map(u => u.id));
  


  const interactedCustomerIds = new Set(
    filterStaff !== "Tất cả" 
      ? interactions.filter(i => i.sale_id === filterStaff).map(i => i.customer_id)
      : []
  );

  const filteredCustomers = customers.filter(c => {
    if (filterBranch !== "Tất cả") {
      const cb = c.branch_id ? c.branch_id.split(',').map((b: string) => b.trim()) : [];
      if (!cb.includes(filterBranch)) return false;
    }
    if (filterCampaign !== "Tất cả" && c.campaign_id !== filterCampaign) return false;
    
    if (filterStaff !== "Tất cả") {
      if (c.assigned_to !== filterStaff && !interactedCustomerIds.has(c.id)) return false;
    }
    return true;
  });

  // Pre-calculate valid customer IDs to bind interactions to the filtered customers (and campaigns)
  const validCustomerIds = new Set(filteredCustomers.map(c => c.id));

  const filteredInteractions = interactions.filter(i => {
    if (filterStaff !== "Tất cả" && i.sale_id !== filterStaff) return false;
    if (filterStaff === "Tất cả" && filterBranch !== "Tất cả") {
      if (!validStaffIds.has(i.sale_id)) return false;
    }
    // Only include interactions that belong to the filtered customers (which applies campaign filter)
    if (!validCustomerIds.has(i.customer_id)) return false;
    return true;
  });

  // KH có ít nhất 1 lần gọi trong khoảng thời gian
  const calledCustomerIds = new Set(
    filteredInteractions.filter(i => i.action_type === "Gọi điện").map(i => i.customer_id)
  );

  // Cuộc gọi thành công (Nghe máy) — đọc từ content
  const successCalls = filteredInteractions.filter(
    i => i.action_type === "Gọi điện" && i.content?.includes("Nghe máy")
  );
  const successCustomerIds = new Set(successCalls.map(i => i.customer_id));

  // Tiềm năng — KH được phân loại "Tiềm năng" trong khoảng này
  const potentialCustomerIds = new Set(
    filteredInteractions
      .filter(i => i.action_type === "Gọi điện" && i.content?.includes("Tiềm năng"))
      .map(i => i.customer_id)
  );

  // Checkin — tick điểm chạm "1. Checkin" trong khoảng ngày
  const checkinInteractions = filteredInteractions.filter(
    i => (i.action_type === "Hệ thống" || i.action_type === "Checkin") && i.content?.includes("Checkin")
  );
  const checkinCustomerIds = new Set(checkinInteractions.map(i => i.customer_id));

  // Chốt Sale — KH có status "Đã chốt" được tạo/cập nhật trong khoảng
  const chotCustomers = datesValid ? filteredCustomers.filter(c => {
    const createdAt = new Date(c.created_at);
    return c.status?.includes("Chốt") && createdAt >= from && createdAt <= to;
  }) : [];

  // KH mới tạo trong khoảng ngày
  const newCustomers = datesValid ? filteredCustomers.filter(c => {
    const createdAt = new Date(c.created_at);
    return createdAt >= from && createdAt <= to;
  }) : [];

  // ─── KPI summary ──────────────────────────────────────────────────
  const kpiCards = [
    {
      label: "KH mới nhập",
      value: newCustomers.length,
      icon: <Users size={22} />,
      color: "#6366f1",
      bg: "#eef2ff",
      sub: "trong khoảng thời gian",
      onClick: () => setShowListModal({
        title: "Danh sách KH mới nhập",
        data: newCustomers
      })
    },
    {
      label: "Cuộc gọi thành công",
      value: successCalls.length,
      icon: <Phone size={22} />,
      color: "#3b82f6",
      bg: "#eff6ff",
      sub: `${successCustomerIds.size} KH nghe máy`,
      onClick: () => setShowListModal({
        title: "Danh sách KH Nghe máy",
        data: Array.from(successCustomerIds).map(id => filteredCustomers.find(c => c.id === id)).filter(Boolean)
      })
    },
    {
      label: "Checkin tại TT",
      value: checkinCustomerIds.size,
      icon: <CheckSquare size={22} />,
      color: "#10b981",
      bg: "#f0fdf4",
      sub: "KH đến trực tiếp",
      onClick: () => setShowListModal({
        title: "Danh sách KH Checkin",
        data: Array.from(checkinCustomerIds).map(id => filteredCustomers.find(c => c.id === id)).filter(Boolean)
      })
    },
    {
      label: "KH Tiềm năng",
      value: potentialCustomerIds.size,
      icon: <TrendingUp size={22} />,
      color: "#f59e0b",
      bg: "#fffbeb",
      sub: "phân loại sau cuộc gọi",
      onClick: () => setShowListModal({
        title: "Danh sách KH Tiềm năng",
        data: Array.from(potentialCustomerIds).map(id => filteredCustomers.find(c => c.id === id)).filter(Boolean)
      })
    },
  ];

  // ─── Funnel data ──────────────────────────────────────────────────
  const totalCustomers = filteredCustomers.length;
  const funnelSteps = [
    { label: "Tổng KH trong hệ thống", value: totalCustomers, color: "#6366f1" },
    { label: "Đã được gọi điện", value: calledCustomerIds.size, color: "#3b82f6" },
    { label: "Nghe máy (thành công)", value: successCustomerIds.size, color: "#0ea5e9" },
    { label: "Tiềm năng", value: potentialCustomerIds.size, color: "#f59e0b" },
    { label: "Checkin tại TT", value: checkinCustomerIds.size, color: "#10b981" },
    { label: "Đã chốt", value: chotCustomers.length, color: "#16a34a" },
  ];
  const maxFunnel = funnelSteps[0].value || 1;

  // ─── Sale performance table ───────────────────────────────────────
  const saleStats = staffForFilter
    .filter(u => u.status !== "Nghỉ việc")
    .map(u => {
      const myInteractions = filteredInteractions.filter(i => i.sale_id === u.id);
      const myCalls = myInteractions.filter(i => i.action_type === "Gọi điện");
      const mySuccess = myCalls.filter(i => i.content?.includes("Nghe máy"));
      const myPotential = myCalls.filter(i => i.content?.includes("Tiềm năng"));
      const myCheckin = myInteractions.filter(i => (i.action_type === "Hệ thống" || i.action_type === "Checkin") && i.content?.includes("Checkin"));
      const myChot = filteredCustomers.filter(c => {
        const ca = new Date(c.created_at);
        return c.assigned_to === u.id && c.status?.includes("Chốt") && ca >= from && ca <= to;
      });

      return {
        id: u.id,
        name: u.full_name,
        calls: myCalls.length,
        success: mySuccess.length,
        potential: new Set(myPotential.map(i => i.customer_id)).size,
        checkin: new Set(myCheckin.map(i => i.customer_id)).size,
        chot: myChot.length,
        rate: myCalls.length > 0 ? Math.round((mySuccess.length / myCalls.length) * 100) : 0,
      };
    })
    .filter(s => s.calls > 0 || s.checkin > 0 || s.chot > 0)
    .sort((a, b) => b.calls - a.calls);

  // ─── Touchpoint phân tích ─────────────────────────────────────────
  const tpStats = TOUCHPOINTS.map(tp => {
    const count = filteredCustomers.filter(c =>
      c.touchpoints?.find((t: any) => t.code === tp.code && t.done)
    ).length;
    return { ...tp, count };
  });
  const maxTp = Math.max(...tpStats.map(t => t.count), 1);

  // ─── Quick date filters ───────────────────────────────────────────
  const applyQuick = (preset: string) => {
    const now = new Date();
    if (preset === "week") {
      setDateFrom(getMonday(now).toISOString().split("T")[0]);
      setDateTo(now.toISOString().split("T")[0]);
    } else if (preset === "month") {
      setDateFrom(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]);
      setDateTo(now.toISOString().split("T")[0]);
    } else if (preset === "last_week") {
      const mon = getMonday(now);
      mon.setDate(mon.getDate() - 7);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      setDateFrom(mon.toISOString().split("T")[0]);
      setDateTo(sun.toISOString().split("T")[0]);
    } else if (preset === "last_month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lme = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(lm.toISOString().split("T")[0]);
      setDateTo(lme.toISOString().split("T")[0]);
    }
  };

  return (
    <div style={{ padding: "1.5rem 0" }}>

      {/* ── Bộ lọc ─────────────────────────────────── */}
      <div style={{
        background: "white", borderRadius: 12, border: "1px solid #e2e8f0",
        padding: "1rem 1.5rem", marginBottom: "1.5rem",
        display: "flex", flexWrap: "wrap", alignItems: "center", gap: "1rem"
      }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { label: "Tuần này", key: "week" },
            { label: "Tháng này", key: "month" },
            { label: "Tuần trước", key: "last_week" },
            { label: "Tháng trước", key: "last_month" },
          ].map(q => (
            <button key={q.key} onClick={() => applyQuick(q.key)}
              style={{
                padding: "0.35rem 0.75rem", borderRadius: 6, cursor: "pointer",
                border: "1px solid #e2e8f0", background: "#f8fafc",
                color: "#475569", fontSize: "0.82rem", fontWeight: 500,
                transition: "all 0.15s"
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#eff6ff"; e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#2563eb"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#f8fafc"; e.currentTarget.style.borderColor = "#e2e8f0"; e.currentTarget.style.color = "#475569"; }}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Dropdown lọc cho Quản lý */}
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginLeft: "1rem" }}>
          {(isGlobalRole || myBranches.length > 1) && (
            <select 
              value={filterBranch} 
              onChange={e => { setFilterBranch(e.target.value); setFilterStaff("Tất cả"); }}
              style={{ padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem", color: "#334155", background: "white", cursor: "pointer" }}
            >
              <option value="Tất cả">Tất cả Chi nhánh</option>
              {(isGlobalRole ? BRANCHES : myBranches).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          {isManagerRole && (
            <select 
              value={filterStaff} 
              onChange={e => setFilterStaff(e.target.value)}
              style={{ padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1", fontSize: "0.85rem", color: "#334155", background: "white", cursor: "pointer", minWidth: 160 }}
            >
              <option value="Tất cả">Tất cả Nhân sự</option>
              {staffForFilter.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          )}
        </div>

        <button onClick={fetchInteractions} disabled={loading}
          style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            padding: "0.4rem 1rem", borderRadius: 6, cursor: "pointer",
            border: "none", background: "#6366f1", color: "white",
            fontWeight: 600, fontSize: "0.9rem"
          }}>
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Đang tải..." : "Áp dụng"}
        </button>
      </div>

      {/* ── 4 KPI Cards ──────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
        {kpiCards.map((card, i) => (
          <div key={i} onClick={card.onClick} style={{
            background: "white", borderRadius: 12, border: "1px solid #e2e8f0",
            padding: "1.25rem 1.5rem",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
          className="hover:shadow-md hover:border-indigo-300"
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
              <div style={{ width: 42, height: 42, borderRadius: 10, background: card.bg, display: "flex", alignItems: "center", justifyContent: "center", color: card.color }}>
                {card.icon}
              </div>
            </div>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{card.value}</div>
            <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#374151", marginTop: "0.35rem" }}>{card.label}</div>
            <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.2rem" }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Funnel + Touchpoints ─────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>

        {/* Funnel chuyển đổi */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
            <ChevronRight size={18} color="#6366f1" /> Phễu chuyển đổi
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {funnelSteps.map((step, i) => {
              const pct = Math.round((step.value / maxFunnel) * 100);
              const convPct = i > 0 && funnelSteps[i - 1].value > 0
                ? Math.round((step.value / funnelSteps[i - 1].value) * 100)
                : null;
              return (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                    <span style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 500 }}>{step.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {convPct !== null && (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>({convPct}%↑)</span>
                      )}
                      <span style={{ fontSize: "0.9rem", fontWeight: 700, color: step.color }}>{step.value}</span>
                    </div>
                  </div>
                  <div style={{ height: 10, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: `linear-gradient(90deg, ${step.color}cc, ${step.color})`,
                      borderRadius: 99, transition: "width 0.5s ease"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phân tích điểm chạm */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
            <CheckSquare size={18} color="#10b981" /> Phân tích điểm chạm SOP
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            {tpStats.map((tp, i) => {
              const pct = Math.round((tp.count / maxTp) * 100);
              const hue = 120 - (i / (tpStats.length - 1)) * 60;
              return (
                <div key={tp.code}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.2rem" }}>
                    <span style={{ fontSize: "0.78rem", color: "#475569" }}>{i + 1}. {tp.name}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: `hsl(${hue},60%,40%)` }}>{tp.count}</span>
                  </div>
                  <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${pct}%`, height: "100%",
                      background: `hsl(${hue},60%,55%)`,
                      borderRadius: 99, transition: "width 0.5s ease"
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Bảng hiệu suất từng Sale ─────────────────────────── */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e2e8f0", padding: "1.5rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "#1e293b", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
          <Users size={18} color="#3b82f6" /> Hiệu suất từng Sale
          <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "#94a3b8", marginLeft: 4 }}>
            ({dateFrom} → {dateTo})
          </span>
        </h3>

        {saleStats.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem" }}>
            Không có dữ liệu trong khoảng thời gian này.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                  {["#", "Nhân viên", "Tổng gọi", "Nghe máy", "Tỉ lệ nghe", "Tiềm năng", "Checkin", "Chốt"].map(h => (
                    <th key={h} style={{ padding: "0.7rem 1rem", textAlign: "left", fontWeight: 700, color: "#475569", fontSize: "0.82rem" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {saleStats.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "0.75rem 1rem", color: "#94a3b8", fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#1e293b" }}>{s.name}</td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontWeight: 700, color: "#3b82f6" }}>{s.calls}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ fontWeight: 700, color: "#0ea5e9" }}>{s.success}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 99, overflow: "hidden", minWidth: 60 }}>
                          <div style={{ width: `${s.rate}%`, height: "100%", background: s.rate >= 60 ? "#10b981" : s.rate >= 40 ? "#f59e0b" : "#ef4444", borderRadius: 99 }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "0.82rem", color: s.rate >= 60 ? "#16a34a" : s.rate >= 40 ? "#d97706" : "#dc2626", minWidth: 35 }}>
                          {s.rate}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ background: "#fef3c7", color: "#92400e", padding: "0.15rem 0.6rem", borderRadius: 99, fontWeight: 700, fontSize: "0.82rem" }}>{s.potential}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ background: "#dcfce7", color: "#166534", padding: "0.15rem 0.6rem", borderRadius: 99, fontWeight: 700, fontSize: "0.82rem" }}>{s.checkin}</span>
                    </td>
                    <td style={{ padding: "0.75rem 1rem" }}>
                      <span style={{ background: s.chot > 0 ? "#dbeafe" : "#f1f5f9", color: s.chot > 0 ? "#1e40af" : "#94a3b8", padding: "0.15rem 0.6rem", borderRadius: 99, fontWeight: 700, fontSize: "0.82rem" }}>
                        {s.chot}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", borderTop: "2px solid #e2e8f0", fontWeight: 700 }}>
                  <td colSpan={2} style={{ padding: "0.75rem 1rem", color: "#475569" }}>Tổng cộng</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#3b82f6" }}>{saleStats.reduce((a, s) => a + s.calls, 0)}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#0ea5e9" }}>{saleStats.reduce((a, s) => a + s.success, 0)}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#475569" }}>
                    {saleStats.reduce((a, s) => a + s.calls, 0) > 0
                      ? Math.round((saleStats.reduce((a, s) => a + s.success, 0) / saleStats.reduce((a, s) => a + s.calls, 0)) * 100)
                      : 0}%
                  </td>
                  <td style={{ padding: "0.75rem 1rem", color: "#d97706" }}>{saleStats.reduce((a, s) => a + s.potential, 0)}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#16a34a" }}>{saleStats.reduce((a, s) => a + s.checkin, 0)}</td>
                  <td style={{ padding: "0.75rem 1rem", color: "#1e40af" }}>{saleStats.reduce((a, s) => a + s.chot, 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      {showListModal && (
        <div className="modal-backdrop" onClick={() => setShowListModal(null)}>
          <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{showListModal.title} ({showListModal.data.length})</h2>
              <button className="btn-close" onClick={() => setShowListModal(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {showListModal.data.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>Không có dữ liệu</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {showListModal.data.map((c, idx) => (
                    <div key={idx} style={{ padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{c.full_name}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.phone}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`status-badge ${(c.status || '').replace(/\s+/g, '-')}`}>
                          {c.status || "Mới"}
                        </span>
                        {(() => {
                           const checkinTp = c.touchpoints?.find((t: any) => t.code === 'checkin');
                           const checkinCount = checkinTp?.count || (checkinTp?.done ? 1 : 0);
                           if (checkinCount > 0) {
                             return (
                               <div style={{ marginTop: '4px' }}>
                                 <span style={{ fontSize: "0.7rem", fontWeight: 600, background: "#fef08a", color: "#854d0e", padding: "2px 6px", borderRadius: "4px", border: "1px solid #fef9c3", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                   📍 Check-in ({checkinCount})
                                 </span>
                               </div>
                             );
                           }
                           return null;
                        })()}
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                          Sale: {users.find(u => u.id === c.assigned_to)?.full_name || "Trống"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

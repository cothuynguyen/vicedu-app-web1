"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Phone, Mail, Clock, MessageSquare, Plus, Users, Filter, Edit2, Trash2, Check, X, BarChart3, FileSpreadsheet } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Select from "react-select";
import * as XLSX from "xlsx";

export const parseSurveySelections = (description?: string): string[] => {
  if (!description || !description.includes("[HOẠT ĐỘNG CHỌN]:")) return [];
  try {
    const part = description.split("[HOẠT ĐỘNG CHỌN]:")[1];
    const cleanPart = part.split(" | [")[0];
    return cleanPart.split(", ").map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
};

export const parseTestResult = (description?: string): string | null => {
  if (!description || !description.includes("[KẾT QUẢ TEST]:")) return null;
  try {
    const part = description.split("[KẾT QUẢ TEST]:")[1];
    const cleanPart = part.split(" | [")[0];
    return cleanPart.trim();
  } catch {
    return null;
  }
};

type Lead = {
  phone: string;
  full_name: string;
  email: string | null;
  branch_id: string;
  status: string;
  created_at: string;
  survey_selections?: string[];
  test_result?: string | null;
  landing_page_title?: string;
};

type Activity = {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  landing_page: { title: string } | null;
  user: { full_name: string } | null;
  source: 'landing' | 'crm';
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

export default function LeadsCRM() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [landingPages, setLandingPages] = useState<{id: string, title: string, is_archived: boolean}[]>([]);
  const [selectedLandingPage, setSelectedLandingPage] = useState<string>("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>("");
  const [selectedSurveyFilter, setSelectedSurveyFilter] = useState<string>("");
  
  const BRANCHES = ["Chỉ Admin được dùng", "Việt Trì", "Dân Hòa", "Lâm Thao", "Tuyên Quang"];
  
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newNote, setNewNote] = useState("");

  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");

  const [isCrmCustomer, setIsCrmCustomer] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [converting, setConverting] = useState(false);

  const isSuperAdmin = user?.role === "Super Admin";

  useEffect(() => {
    fetchLandingPages();
    fetchLeads();
  }, [user, selectedLandingPage, selectedBranchFilter]);

  useEffect(() => {
    if (selectedLead) {
      fetchActivities(selectedLead.phone);
    }
  }, [selectedLead]);

  const fetchLandingPages = async () => {
    if (!user) return;
    let query = supabase.from("landing_pages").select("id, title, is_archived");
    
    if (!isSuperAdmin) {
      if (user?.branch_id) {
        const BASE_BRANCHES = ["Việt Trì", "Dân Hòa", "Lâm Thao", "Tuyên Quang"];
        const userBaseBranches = BASE_BRANCHES.filter(b => user.branch_id?.includes(b));
        if (userBaseBranches.length > 0) {
          query = query.in("branch_id", userBaseBranches);
        } else {
          query = query.eq("branch_id", "NONE");
        }
      } else {
        query = query.eq("branch_id", "NONE");
      }
    } else if (selectedBranchFilter) {
      query = query.eq("branch_id", selectedBranchFilter);
    }

    const { data } = await query;
    if (data) setLandingPages(data);
  };

  const fetchLeads = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      let query = supabase.from("leads").select("*").order("updated_at", { ascending: false });
      
      if (!isSuperAdmin) {
        if (user?.branch_id) {
          const BASE_BRANCHES = ["Việt Trì", "Dân Hòa", "Lâm Thao", "Tuyên Quang"];
          const userBaseBranches = BASE_BRANCHES.filter(b => user.branch_id?.includes(b));
          if (userBaseBranches.length > 0) {
            query = query.in("branch_id", userBaseBranches);
          } else {
            query = query.eq("branch_id", "NONE");
          }
        } else {
          query = query.eq("branch_id", "NONE");
        }
      } else if (selectedBranchFilter) {
        query = query.eq("branch_id", selectedBranchFilter);
      }

      const { data, error } = await query;
      if (!error && data) {
        // Áp dụng bộ lọc Landing Page (nếu có)
        if (selectedLandingPage) {
          // Tìm những phone có FORM_SUBMIT của Landing Page này kèm description
          const { data: actData } = await supabase
            .from("customer_activities")
            .select("phone, description, created_at, landing_page:landing_pages(title)")
            .eq("landing_page_id", selectedLandingPage)
            .eq("activity_type", "FORM_SUBMIT")
            .order("created_at", { ascending: false });
          
          const phoneActivityMap = new Map<string, any>();
          if (actData) {
            for (const act of actData) {
              if (!phoneActivityMap.has(act.phone)) {
                phoneActivityMap.set(act.phone, act);
              }
            }
          }
          
          const leadsForLanding = data
            .filter((l: any) => phoneActivityMap.has(l.phone))
            .map((l: any) => {
              const act = phoneActivityMap.get(l.phone);
              return {
                ...l,
                survey_selections: parseSurveySelections(act?.description),
                test_result: parseTestResult(act?.description),
                landing_page_title: act?.landing_page?.title || ""
              };
            });
          setLeads(leadsForLanding);
        } else {
          // Nạp thông tin FORM_SUBMIT cho tất cả leads
          const phones = data.map((l: any) => l.phone);
          const phoneActivityMap = new Map<string, any>();
          if (phones.length > 0) {
            const { data: actData } = await supabase
              .from("customer_activities")
              .select("phone, description, created_at, landing_page:landing_pages(title)")
              .in("phone", phones)
              .eq("activity_type", "FORM_SUBMIT")
              .order("created_at", { ascending: false });

            if (actData) {
              for (const act of actData) {
                if (!phoneActivityMap.has(act.phone)) {
                  phoneActivityMap.set(act.phone, act);
                }
              }
            }
          }

          const enrichedLeads = data.map((l: any) => {
            const act = phoneActivityMap.get(l.phone);
            return {
              ...l,
              survey_selections: parseSurveySelections(act?.description),
              test_result: parseTestResult(act?.description),
              landing_page_title: act?.landing_page?.title || ""
            };
          });
          setLeads(enrichedLeads);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async (phone: string) => {
    let allActivities: Activity[] = [];

    // 1. Fetch từ customer_activities (CRM Landing)
    const { data: actData } = await supabase
      .from("customer_activities")
      .select(`
        id, activity_type, description, created_at,
        landing_page:landing_pages(title),
        user:users(full_name)
      `)
      .eq("phone", phone);
      
    if (actData) {
      allActivities = [...allActivities, ...actData.map((a: any) => ({...a, source: 'landing' as const}))];
    }

    // 2. Fetch từ crm_interactions (CRM Chính)
    const { data: crmCustomer } = await supabase
      .from("crm_customers")
      .select("id")
      .eq("phone", phone)
      .single();

    if (crmCustomer) {
      setIsCrmCustomer(true);
      const { data: interData } = await supabase
        .from("crm_interactions")
        .select(`
          id, action_type, content, created_at,
          user:users(full_name)
        `)
        .eq("customer_id", crmCustomer.id);
        
      if (interData) {
        const crmActs: Activity[] = interData.map((i: any) => ({
          id: i.id,
          activity_type: i.action_type,
          description: i.content,
          created_at: i.created_at,
          landing_page: null,
          user: i.user,
          source: 'crm' as const
        }));
        allActivities = [...allActivities, ...crmActs];
      }
    } else {
      setIsCrmCustomer(false);
    }

    // Sắp xếp giảm dần theo thời gian
    allActivities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setActivities(allActivities);
  };

  // Thống kê Khảo sát theo toàn bộ danh sách leads hiện tại của bộ lọc Landing Page/Chi nhánh
  const surveyStats = useMemo(() => {
    const optionCountMap: Record<string, number> = {};
    let totalWithSurvey = 0;
    let totalWithoutSurvey = 0;

    leads.forEach(lead => {
      if (lead.survey_selections && lead.survey_selections.length > 0) {
        totalWithSurvey++;
        lead.survey_selections.forEach(opt => {
          optionCountMap[opt] = (optionCountMap[opt] || 0) + 1;
        });
      } else {
        totalWithoutSurvey++;
      }
    });

    const totalLeads = leads.length;
    const options = Object.entries(optionCountMap)
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalLeads,
      totalWithSurvey,
      unselectedCount: totalWithoutSurvey,
      options
    };
  }, [leads]);

  const filteredLeads = leads.filter(l => {
    const matchesSearch = l.phone.includes(searchTerm) || l.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (!selectedSurveyFilter) return true;
    if (selectedSurveyFilter === "__NONE__") {
      return !l.survey_selections || l.survey_selections.length === 0;
    }
    return l.survey_selections?.includes(selectedSurveyFilter);
  });

  const handleExportExcel = async () => {
    if (filteredLeads.length === 0) {
      alert("Không có dữ liệu để xuất!");
      return;
    }
    setExporting(true);
    try {
      const phones = filteredLeads.map(l => l.phone);
      
      const { data: actData } = await supabase
        .from("customer_activities")
        .select('phone, activity_type, description, created_at, landing_page:landing_pages(title)')
        .in('phone', phones);
        
      const { data: crmCustomers } = await supabase
        .from("crm_customers")
        .select("id, phone")
        .in("phone", phones);
        
      let interData: any[] = [];
      if (crmCustomers && crmCustomers.length > 0) {
        const customerIds = crmCustomers.map((c: any) => c.id);
        const { data: interactions } = await supabase
          .from("crm_interactions")
          .select('customer_id, action_type, content, created_at')
          .in('customer_id', customerIds);
          
        if (interactions) {
          interData = interactions.map((inter: any) => {
            const customer = crmCustomers.find((c: any) => c.id === inter.customer_id);
            return {
              phone: customer?.phone,
              activity_type: inter.action_type,
              description: inter.content,
              created_at: inter.created_at,
              landing_page: null
            };
          });
        }
      }

      const allTouchpoints = [...(actData || []), ...interData];
      const selectedLpObj = landingPages.find(lp => lp.id === selectedLandingPage);
      const currentCampaignName = selectedLandingPage ? (selectedLpObj?.title || 'Chiến dịch') : "Tất cả chiến dịch";

      // 1. TẠO SHEET 1: Danh sách chi tiết Leads
      const sheet1Data = filteredLeads.map((lead, idx) => {
        const leadTouchpoints = allTouchpoints
          .filter(t => t.phone === lead.phone)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .map(t => {
            const dateObj = new Date(t.created_at);
            const dateStr = `${dateObj.getDate().toString().padStart(2, '0')}/${(dateObj.getMonth()+1).toString().padStart(2, '0')}/${dateObj.getFullYear()}`;
            let prefix = t.activity_type;
            if (t.activity_type === 'FORM_SUBMIT') prefix = 'Điền Form: ' + (t.landing_page?.title || '');
            if (t.activity_type === 'NOTE') prefix = 'Ghi chú';
            if (t.activity_type === 'CALL') prefix = 'Gọi điện';
            return `[${dateStr}] ${prefix} - ${t.description || ''}`;
          })
          .join('\n');

        const surveyText = (lead.survey_selections && lead.survey_selections.length > 0)
          ? lead.survey_selections.join('; ')
          : 'Chưa chọn';

        return {
          "STT": idx + 1,
          "Họ và Tên": lead.full_name || '',
          "Số điện thoại": String(lead.phone || ''),
          "Email": lead.email || '',
          "Chi nhánh": lead.branch_id || '',
          "Trạng thái": lead.status || '',
          "Chiến dịch / Nguồn": lead.landing_page_title || (selectedLandingPage ? (selectedLpObj?.title || '') : '') || '',
          "Phương án Khảo sát / Hoạt động chọn": surveyText,
          "Kết quả Test": lead.test_result || '',
          "Ngày điền form": lead.created_at ? new Date(lead.created_at).toLocaleString('vi-VN') : '',
          "Lịch sử Tương tác (Touchpoints)": leadTouchpoints
        };
      });

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(sheet1Data);

      // Định dạng độ rộng cột cho Sheet 1
      ws1['!cols'] = [
        { wch: 6 },   // STT
        { wch: 22 },  // Họ và Tên
        { wch: 16 },  // Số điện thoại
        { wch: 22 },  // Email
        { wch: 15 },  // Chi nhánh
        { wch: 15 },  // Trạng thái
        { wch: 30 },  // Chiến dịch / Nguồn
        { wch: 45 },  // Phương án khảo sát
        { wch: 25 },  // Kết quả Test
        { wch: 20 },  // Ngày điền form
        { wch: 55 },  // Lịch sử tương tác
      ];

      // Đảm bảo số điện thoại giữ nguyên số 0 ở đầu (type = 's')
      filteredLeads.forEach((lead, idx) => {
        const cellRef = `C${idx + 2}`;
        if (ws1[cellRef]) {
          ws1[cellRef].t = 's';
          ws1[cellRef].v = String(lead.phone || '');
        }
      });

      XLSX.utils.book_append_sheet(wb, ws1, "Danh sách Khách hàng");

      // 2. TẠO SHEET 2: Báo cáo Thống kê Tổng quan & Khảo sát
      const summaryRows: any[][] = [
        ["BÁO CÁO THỐNG KÊ CHIẾN DỊCH & KHẢO SÁT LANDING PAGE"],
        ["Thời gian xuất:", new Date().toLocaleString('vi-VN')],
        ["Chiến dịch / Nguồn:", currentCampaignName],
        ["Tổng số Leads trong báo cáo:", filteredLeads.length],
        [],
        ["1. PHÂN BỔ PHƯƠNG ÁN KHẢO SÁT / HOẠT ĐỘNG PHỤ HUYNH CHỌN"],
        ["STT", "Phương án / Hoạt động khảo sát", "Số phụ huynh chọn", "Tỷ lệ (%)"]
      ];

      surveyStats.options.forEach((opt, idx) => {
        summaryRows.push([
          idx + 1,
          opt.label,
          opt.count,
          `${opt.percentage}%`
        ]);
      });

      if (surveyStats.unselectedCount > 0) {
        summaryRows.push([
          surveyStats.options.length + 1,
          "Không chọn / Không có khảo sát",
          surveyStats.unselectedCount,
          `${Math.round((surveyStats.unselectedCount / (filteredLeads.length || 1)) * 100)}%`
        ]);
      }

      summaryRows.push([]);
      summaryRows.push(["2. PHÂN BỔ THEO CHI NHÁNH"]);
      summaryRows.push(["STT", "Chi nhánh", "Số lượng Lead", "Tỷ lệ (%)"]);

      const branchCounts: Record<string, number> = {};
      filteredLeads.forEach(l => {
        const b = l.branch_id || "Chưa xác định";
        branchCounts[b] = (branchCounts[b] || 0) + 1;
      });
      Object.entries(branchCounts).forEach(([branch, cnt], idx) => {
        summaryRows.push([
          idx + 1,
          branch,
          cnt,
          `${Math.round((cnt / (filteredLeads.length || 1)) * 100)}%`
        ]);
      });

      summaryRows.push([]);
      summaryRows.push(["3. PHÂN BỔ THEO TRẠNG THÁI CHĂM SÓC"]);
      summaryRows.push(["STT", "Trạng thái", "Số lượng Lead", "Tỷ lệ (%)"]);

      const statusCounts: Record<string, number> = {};
      filteredLeads.forEach(l => {
        const s = l.status || "Chưa phân loại";
        statusCounts[s] = (statusCounts[s] || 0) + 1;
      });
      Object.entries(statusCounts).forEach(([status, cnt], idx) => {
        summaryRows.push([
          idx + 1,
          status,
          cnt,
          `${Math.round((cnt / (filteredLeads.length || 1)) * 100)}%`
        ]);
      });

      const ws2 = XLSX.utils.aoa_to_sheet(summaryRows);
      ws2['!cols'] = [
        { wch: 6 },
        { wch: 60 },
        { wch: 22 },
        { wch: 15 }
      ];

      XLSX.utils.book_append_sheet(wb, ws2, "Báo cáo Thống kê");

      // Tạo buffer và tải file .xlsx
      const safeCampaignName = (selectedLpObj?.title || 'VicEdu')
        .replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')
        .substring(0, 30);
      const fileName = `Leads_${safeCampaignName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert("Lỗi xuất file Excel: " + e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleConvertCrm = async () => {
    if (!selectedLead) return;
    setConverting(true);
    try {
      let finalBranchId = selectedLead.branch_id;
      if (!finalBranchId || finalBranchId === "Chỉ Admin được dùng" || finalBranchId === "NONE") {
        finalBranchId = user?.branch_id ? user.branch_id.split(',')[0].trim() : "Việt Trì 1";
      }

      // Ép dữ liệu chung "Việt Trì" (từ Landing Page) thành "Việt Trì 1" để tương thích với phân quyền CRM
      if (finalBranchId === "Việt Trì") {
        finalBranchId = "Việt Trì 1";
      }

      const { data: newCustomer, error } = await supabase.from("crm_customers").insert({
        full_name: selectedLead.full_name,
        phone: selectedLead.phone,
        email: selectedLead.email,
        branch_id: finalBranchId,
        source_name: "Landing Page",
        status: "Tiềm năng",
        assigned_to: user?.id,
        created_by: user?.id,
        touchpoints: DEFAULT_TOUCHPOINTS,
        last_interacted_at: new Date().toISOString()
      }).select().single();

      if (error) throw error;

      await supabase.from("crm_interactions").insert({
        customer_id: newCustomer.id,
        action_type: "SYSTEM",
        content: "Khách hàng được chuyển sang từ danh sách CRM Leads",
        created_by: user?.id
      });
      
      setIsCrmCustomer(true);
      fetchActivities(selectedLead.phone);
      alert("Đã tạo Khách hàng CRM thành công!");
    } catch (e: any) {
      alert("Lỗi chuyển khách hàng: " + e.message);
    } finally {
      setConverting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newNote.trim()) return;
    
    const { error } = await supabase.from("customer_activities").insert({
      phone: selectedLead.phone,
      activity_type: "NOTE",
      description: newNote,
      created_by: user?.id
    });

    if (!error) {
      setNewNote("");
      fetchActivities(selectedLead.phone);
      fetchLeads(); 
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedLead) return;
    const { error } = await supabase.from("leads").update({ status }).eq("phone", selectedLead.phone);
    if (!error) {
      setSelectedLead({ ...selectedLead, status });
      fetchLeads();
      
      await supabase.from("customer_activities").insert({
        phone: selectedLead.phone,
        activity_type: "STATUS_CHANGE",
        description: `Thay đổi trạng thái thành: ${status}`,
        created_by: user?.id
      });
      fetchActivities(selectedLead.phone);
    }
  };

  const handleStartEdit = (act: Activity) => {
    setEditingActivityId(act.id);
    setEditingContent(act.description);
  };

  const handleSaveEdit = async () => {
    if (!editingActivityId || !editingContent.trim()) return;
    
    const act = activities.find(a => a.id === editingActivityId);
    if (!act) return;

    if (act.source === 'landing') {
      const { error } = await supabase.from("customer_activities").update({ description: editingContent }).eq("id", editingActivityId);
      if (error) alert("Lỗi khi sửa: " + error.message);
    } else {
      const { error } = await supabase.from("crm_interactions").update({ content: editingContent }).eq("id", editingActivityId);
      if (error) alert("Lỗi khi sửa: " + error.message);
    }
    
    setEditingActivityId(null);
    if (selectedLead) fetchActivities(selectedLead.phone);
  };

  const handleDelete = async (id: string, source: 'landing' | 'crm') => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa nhật ký này?")) return;
    
    if (source === 'landing') {
      const { error } = await supabase.from("customer_activities").delete().eq("id", id);
      if (error) alert("Lỗi khi xóa: " + error.message);
    } else {
      const { error } = await supabase.from("crm_interactions").delete().eq("id", id);
      if (error) alert("Lỗi khi xóa: " + error.message);
    }
    
    if (selectedLead) fetchActivities(selectedLead.phone);
  };

  const handleDeleteLead = async () => {
    if (!selectedLead) return;
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu của khách hàng ${selectedLead.full_name}? Hành động này sẽ xóa luôn cả lịch sử chăm sóc và KHÔNG THỂ khôi phục!`)) return;

    const { error } = await supabase.from("leads").delete().eq("phone", selectedLead.phone);
    if (error) {
      alert("Lỗi khi xóa Khách hàng: " + error.message);
    } else {
      setSelectedLead(null);
      fetchLeads();
    }
  };

  return (
    <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 100px)' }}>
      {/* Cột trái: Danh sách Leads */}
      <div className="glass-panel" style={{ width: '35%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Danh sách Khách hàng</h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
              <input 
                type="text" 
                placeholder="Tìm theo SĐT, Tên..."
                className="form-input"
                style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {isSuperAdmin && (
              <div style={{ position: 'relative' }}>
                <Filter style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={16} />
                <select 
                  className="form-input" 
                  style={{ paddingLeft: '2.25rem', fontSize: '0.85rem' }}
                  value={selectedBranchFilter}
                  onChange={(e) => setSelectedBranchFilter(e.target.value)}
                >
                  <option value="">Tất cả chi nhánh</option>
                  {BRANCHES.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                <Select
                  placeholder="Tất cả nguồn Landing Pages"
                  options={[
                    {
                      label: "Đang hoạt động",
                      options: landingPages.filter(lp => !lp.is_archived).map(lp => ({ value: lp.id, label: lp.title }))
                    },
                    ...(landingPages.some(lp => lp.is_archived) ? [{
                      label: "Đã lưu trữ",
                      options: landingPages.filter(lp => lp.is_archived).map(lp => ({ value: lp.id, label: lp.title }))
                    }] : [])
                  ]}
                  value={selectedLandingPage ? { value: selectedLandingPage, label: landingPages.find(lp => lp.id === selectedLandingPage)?.title } : null}
                  onChange={(selected: any) => {
                    setSelectedLandingPage(selected ? selected.value : "");
                    setSelectedSurveyFilter("");
                  }}
                  isClearable
                  styles={{
                    control: (base) => ({
                      ...base,
                      fontSize: '0.85rem',
                      borderColor: 'var(--primary)',
                      minHeight: '38px',
                      borderRadius: '6px'
                    }),
                    singleValue: (base) => ({
                      ...base,
                      color: 'var(--primary)'
                    }),
                    menu: (base) => ({
                      ...base,
                      zIndex: 9999
                    })
                  }}
                />
              </div>
              <button 
                onClick={handleExportExcel} 
                disabled={exporting}
                title="Xuất file Excel đầy đủ 2 Sheet kèm phân tích Khảo sát"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0 1rem', background: '#059669', color: 'white', 
                  borderRadius: '6px', border: 'none', cursor: exporting ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap',
                  opacity: exporting ? 0.7 : 1, transition: 'all 0.2s',
                  boxShadow: '0 1px 2px rgba(5, 150, 105, 0.2)'
                }}
              >
                <FileSpreadsheet size={16} />
                {exporting ? "Đang xuất..." : "Tải Excel (.xlsx)"}
              </button>
            </div>
          </div>
        </div>

        {/* Campaign Survey Insights Widget: Thống kê nhanh và Bộ lọc 1-Click */}
        {surveyStats.options.length > 0 && (
          <div style={{
            padding: '0.85rem 1.25rem',
            background: 'linear-gradient(135deg, rgba(238, 242, 255, 0.65) 0%, rgba(243, 232, 255, 0.65) 100%)',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.825rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
              <div style={{ fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BarChart3 size={15} color="#4f46e5" />
                <span>Thống kê Khảo sát / Lựa chọn</span>
                <span style={{ fontSize: '0.72rem', background: '#e0e7ff', color: '#3730a3', padding: '1px 7px', borderRadius: '10px', fontWeight: 600 }}>
                  {surveyStats.totalWithSurvey}/{surveyStats.totalLeads} Lead có chọn
                </span>
              </div>
              {selectedSurveyFilter && (
                <button
                  onClick={() => setSelectedSurveyFilter("")}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: 600,
                    padding: 0,
                    textDecoration: 'underline'
                  }}
                >
                  ✕ Bỏ lọc
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                onClick={() => setSelectedSurveyFilter("")}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: '1px solid',
                  borderColor: selectedSurveyFilter === "" ? '#4f46e5' : '#cbd5e1',
                  background: selectedSurveyFilter === "" ? '#4f46e5' : '#ffffff',
                  color: selectedSurveyFilter === "" ? '#ffffff' : '#475569',
                  transition: 'all 0.15s ease',
                  boxShadow: selectedSurveyFilter === "" ? '0 1px 3px rgba(79, 70, 229, 0.3)' : 'none'
                }}
              >
                Tất cả ({leads.length})
              </button>

              {surveyStats.options.map(opt => {
                const isSelected = selectedSurveyFilter === opt.label;
                return (
                  <button
                    key={opt.label}
                    onClick={() => setSelectedSurveyFilter(isSelected ? "" : opt.label)}
                    title={opt.label}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: isSelected ? '#059669' : '#a7f3d0',
                      background: isSelected ? '#059669' : '#ecfdf5',
                      color: isSelected ? '#ffffff' : '#065f46',
                      transition: 'all 0.15s ease',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      maxWidth: '100%',
                      textAlign: 'left',
                      boxShadow: isSelected ? '0 1px 3px rgba(5, 150, 105, 0.3)' : 'none'
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                      {opt.label}
                    </span>
                    <span style={{ 
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : '#d1fae5',
                      color: isSelected ? '#ffffff' : '#047857',
                      padding: '1px 6px',
                      borderRadius: '10px',
                      fontSize: '0.7rem'
                    }}>
                      {opt.count} ({opt.percentage}%)
                    </span>
                  </button>
                );
              })}

              {surveyStats.unselectedCount > 0 && (
                <button
                  onClick={() => setSelectedSurveyFilter(selectedSurveyFilter === "__NONE__" ? "" : "__NONE__")}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '16px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: selectedSurveyFilter === "__NONE__" ? '#64748b' : '#e2e8f0',
                    background: selectedSurveyFilter === "__NONE__" ? '#64748b' : '#f8fafc',
                    color: selectedSurveyFilter === "__NONE__" ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Chưa chọn ({surveyStats.unselectedCount})
                </button>
              )}
            </div>
          </div>
        )}
        
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải...</div>
          ) : filteredLeads.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              {selectedSurveyFilter ? "Không có Lead nào khớp với phương án đã chọn." : "Không tìm thấy Lead nào."}
            </div>
          ) : (
            filteredLeads.map(lead => (
              <div 
                key={lead.phone}
                onClick={() => setSelectedLead(lead)}
                style={{ 
                  padding: '1rem 1.25rem', 
                  borderBottom: '1px solid var(--border)', 
                  cursor: 'pointer',
                  background: selectedLead?.phone === lead.phone ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                  borderLeft: selectedLead?.phone === lead.phone ? '4px solid var(--primary)' : '4px solid transparent',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { if (selectedLead?.phone !== lead.phone) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                onMouseLeave={(e) => { if (selectedLead?.phone !== lead.phone) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{lead.full_name}</h3>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '2px 8px', 
                    borderRadius: '12px',
                    backgroundColor: lead.status === 'Mới' ? 'rgba(59, 130, 246, 0.1)' : lead.status === 'Đã chốt' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)',
                    color: lead.status === 'Mới' ? '#2563eb' : lead.status === 'Đã chốt' ? '#059669' : '#4b5563'
                  }}>
                    {lead.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={13} /> {lead.phone}</span>
                  {isSuperAdmin && (
                    <span style={{ fontSize: '0.7rem', background: 'rgba(139, 92, 246, 0.1)', color: '#6d28d9', padding: '1px 6px', borderRadius: '4px' }}>{lead.branch_id}</span>
                  )}
                </div>

                {/* Badges hiển thị lựa chọn khảo sát trên từng Lead card */}
                {lead.survey_selections && lead.survey_selections.length > 0 && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {lead.survey_selections.map((opt, i) => (
                      <span
                        key={i}
                        title={opt}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: '#065f46',
                          background: '#ecfdf5',
                          border: '1px solid #a7f3d0',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        ✓ {opt.length > 35 ? opt.substring(0, 35) + '...' : opt}
                      </span>
                    ))}
                  </div>
                )}

                {/* Kết quả Test nếu có */}
                {lead.test_result && (
                  <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '4px', display: 'inline-block' }}>
                    📊 {lead.test_result}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Cột phải: Chi tiết và Lịch sử (Timeline) */}
      <div className="glass-panel" style={{ width: '65%', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0 }}>
        {selectedLead ? (
          <>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-main)' }}>{selectedLead.full_name}</h2>
                  {!isCrmCustomer && (
                    <button 
                      onClick={handleConvertCrm}
                      disabled={converting}
                      style={{ 
                        padding: '4px 12px', background: '#ecfdf5', color: '#059669', 
                        border: '1px solid #10b981', borderRadius: '4px', fontSize: '0.75rem', 
                        fontWeight: 600, cursor: converting ? 'not-allowed' : 'pointer',
                        opacity: converting ? 0.7 : 1
                      }}
                    >
                      {converting ? "Đang chuyển..." : "Tạo Khách hàng CRM"}
                    </button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={16} /> {selectedLead.phone}</span>
                  {selectedLead.email && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Mail size={16} /> {selectedLead.email}</span>}
                </div>

                {/* Hiển thị nhanh các lựa chọn khảo sát của Lead này */}
                {selectedLead.survey_selections && selectedLead.survey_selections.length > 0 && (
                  <div style={{ marginTop: '0.65rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4338ca', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🎯 Hoạt động chọn:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selectedLead.survey_selections.map((opt, i) => (
                        <span 
                          key={i} 
                          style={{ 
                            fontSize: '0.8rem', 
                            fontWeight: 600, 
                            color: '#065f46', 
                            background: '#ecfdf5', 
                            border: '1px solid #a7f3d0', 
                            padding: '3px 8px', 
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          ✓ {opt}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLead.test_result && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#b45309', background: '#fef3c7', padding: '3px 8px', borderRadius: '6px', display: 'inline-block' }}>
                    📊 Kết quả test: <strong>{selectedLead.test_result}</strong>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <select 
                  className="form-input"
                  style={{ width: 'auto', fontWeight: 600, padding: '0.5rem 1rem' }}
                  value={selectedLead.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                >
                  <option value="Mới">Trạng thái: Mới</option>
                  <option value="Đang tư vấn">Đang tư vấn</option>
                  <option value="Không nghe máy">Không nghe máy</option>
                  <option value="Đã chốt">Đã chốt (Học viên)</option>
                </select>

                <button 
                  onClick={handleDeleteLead}
                  title="Xóa Khách hàng"
                  style={{ 
                    background: 'none', border: '1px solid #fee2e2', 
                    cursor: 'pointer', color: '#ef4444', 
                    padding: '0.5rem', borderRadius: '8px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', backgroundColor: '#fff5f5'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fff5f5'; }}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: 'rgba(0,0,0,0.01)' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1.5rem' }}>Lịch sử Tương tác (Touchpoints)</h3>
              
              <div style={{ borderLeft: '2px solid var(--border)', marginLeft: '12px', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {activities.map(act => (
                  <div key={act.id} style={{ position: 'relative' }}>
                    <div style={{ 
                      position: 'absolute', left: '-30px', top: '4px', width: '16px', height: '16px', borderRadius: '50%', 
                      border: '3px solid var(--surface)',
                      backgroundColor: act.activity_type === 'FORM_SUBMIT' ? '#3b82f6' : act.activity_type === 'STATUS_CHANGE' ? '#f97316' : '#10b981'
                    }}></div>
                    
                    <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {act.activity_type === 'FORM_SUBMIT' ? <Mail size={16} color="#3b82f6"/> : 
                             (act.activity_type === 'NOTE' || act.activity_type === 'Ghi chú') ? <MessageSquare size={16} color="#10b981"/> :
                             <Clock size={16} color="#6b7280"/>}
                             
                            {act.activity_type === 'FORM_SUBMIT' ? 'Điền Form Đăng ký' : 
                             (act.activity_type === 'NOTE' || act.activity_type === 'Ghi chú') ? 'Ghi chú' : act.activity_type}
                          </span>
                          {act.source === 'crm' && (
                            <span style={{ fontSize: '0.65rem', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>TỪ CRM CHÍNH</span>
                          )}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {new Date(act.created_at).toLocaleString('vi-VN')}
                          </span>
                          
                          {/* Nút sửa/xóa */}
                          {editingActivityId !== act.id && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              {act.activity_type !== 'FORM_SUBMIT' && (
                                <button onClick={() => handleStartEdit(act)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }} onMouseEnter={e => e.currentTarget.style.color = '#3b82f6'} onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                  <Edit2 size={14} />
                                </button>
                              )}
                              <button onClick={() => handleDelete(act.id, act.source)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1' }} onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingActivityId === act.id ? (
                        <div style={{ marginTop: '0.5rem' }}>
                          <textarea
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--primary)', minHeight: '60px', fontFamily: 'inherit' }}
                          />
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
                            <button onClick={() => setEditingActivityId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}><X size={14}/> Hủy</button>
                            <button onClick={handleSaveEdit} disabled={!editingContent.trim()} style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '0.25rem 0.75rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}><Check size={14}/> Lưu</button>
                          </div>
                        </div>
                      ) : (
                        act.description.includes("[HOẠT ĐỘNG CHỌN]:") ? (
                          <div>
                            <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: '0 0 0.5rem 0', fontWeight: 500 }}>
                              {act.description.split(" | [HOẠT ĐỘNG CHỌN]:")[0]}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#4338ca', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                🎯 Hoạt động / Khảo sát phụ huynh chọn:
                              </span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {act.description.split(" | [HOẠT ĐỘNG CHỌN]:")[1]?.split(" | ")[0]?.split(", ").map((item: string, idx: number) => (
                                  <span key={idx} style={{ fontSize: '0.82rem', fontWeight: 600, color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '3px 10px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    ✓ {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {act.description.includes("[KẾT QUẢ TEST]:") && (
                              <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#b45309', background: '#fef3c7', padding: '4px 8px', borderRadius: '6px' }}>
                                📊 Kết quả test: {act.description.split("[KẾT QUẢ TEST]:")[1]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--text-main)', fontSize: '0.9rem', margin: 0, whiteSpace: 'pre-wrap' }}>{act.description}</p>
                        )
                      )}
                      
                      {(act.landing_page || act.user) && (
                        <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                          {act.landing_page && <span>Chiến dịch: <strong style={{ color: 'var(--text-main)' }}>{act.landing_page.title}</strong></span>}
                          {act.user && <span>Nhân sự: <strong style={{ color: 'var(--text-main)' }}>{act.user.full_name}</strong></span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {activities.length === 0 && (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>Chưa có lịch sử chăm sóc.</div>
                )}
              </div>
            </div>

            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
              <form onSubmit={handleAddNote} style={{ display: 'flex', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  className="form-input"
                  style={{ flex: 1 }}
                  placeholder="Thêm ghi chú chăm sóc, log cuộc gọi..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={!newNote.trim()}
                  className="btn-primary"
                  style={{ opacity: !newNote.trim() ? 0.5 : 1, padding: '0.5rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Plus size={18}/> Lưu
                </button>
              </form>
            </div>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: 'var(--text-muted)', gap: '1rem' }}>
            <Users size={64} style={{ opacity: 0.2 }} />
            <p>Chọn một khách hàng để xem chi tiết chăm sóc</p>
          </div>
        )}
      </div>
    </div>
  );
}

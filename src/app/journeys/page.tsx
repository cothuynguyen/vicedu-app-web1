"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  Crown,
  Award,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Plus,
  Trash2,
  Edit,
  ExternalLink,
  Shield,
  Users,
  Compass,
  Sparkles,
  Navigation,
  RefreshCw,
  FileSpreadsheet,
  Lock,
  ChevronRight,
  Info,
  Layers,
  Palette,
  Flag,
  Zap,
  Video,
  FileText,
  MessageSquare,
  Bookmark,
  Building2,
  GraduationCap,
  Search,
  Check,
  CheckSquare,
  Square,
  Copy,
  Smartphone,
  Settings,
} from "lucide-react"
import * as XLSX from "xlsx"
import {
  getAdminCamps,
  saveCamp,
  deleteCamp,
  getCampMembers,
  saveMember,
  deleteMember,
  toggleMemberStatus,
  getCampReports,
  updateReportApproval,
  deleteReport,
  getCampExportData,
  getVicEduStaff,
  saveCampAdmins,
  getBranchEmployees,
  getClassesList,
  getClassStudentsForJourney,
  bulkSaveMembers,
  resetMemberDeviceBinding,
  updateCampBranchGps,
  updateMemberPin,
  CampData,
  MemberData,
} from "@/app/actions/journeyAdmin"

const DAYS_OF_WEEK = [
  { dayOfWeek: 1, label: "Thứ 2", short: "T2" },
  { dayOfWeek: 2, label: "Thứ 3", short: "T3" },
  { dayOfWeek: 3, label: "Thứ 4", short: "T4" },
  { dayOfWeek: 4, label: "Thứ 5", short: "T5" },
  { dayOfWeek: 5, label: "Thứ 6", short: "T6" },
  { dayOfWeek: 6, label: "Thứ 7", short: "T7" },
  { dayOfWeek: 0, label: "Chủ Nhật", short: "CN" },
]

const DEFAULT_CLUB_MONTHS = [
  { id: '2026-01', label: 'Tháng 01/2026', themeTitle: 'KHAI XUÂN 2026', themeSlogan: 'Khởi động thói quen chạy bộ đầu năm', status: 'completed' },
  { id: '2026-02', label: 'Tháng 02/2026', themeTitle: 'MÙA XUÂN KỶ LUẬT', themeSlogan: 'Duy trì bước chạy sau Tết', status: 'completed' },
  { id: '2026-03', label: 'Tháng 03/2026', themeTitle: 'BƯỚC CHẠY YÊU THƯƠNG', themeSlogan: 'Chạy cùng bố mẹ quanh công viên', status: 'completed' },
  { id: '2026-04', label: 'Tháng 04/2026', themeTitle: 'CHINH PHỤC CỰ LY', themeSlogan: 'Nâng dần cự ly 3km - 5km', status: 'completed' },
  { id: '2026-05', label: 'Tháng 05/2026', themeTitle: 'CHÀO HÈ BỨT PHÁ', themeSlogan: 'Đón bình minh sớm 05h30', status: 'completed' },
  { id: '2026-06', label: 'Tháng 06/2026', themeTitle: 'HÈ RỰC LỬA', themeSlogan: 'Tránh xa màn hình · Rèn luyện thể lực', status: 'completed' },
  { id: '2026-07', label: 'Tháng 07/2026', themeTitle: 'TRẠI HÈ RUNNER 19', themeSlogan: 'Chạy dã ngoại và gắn kết gia đình', status: 'completed' },
  { id: '2026-08', label: 'Tháng 08/2026', themeTitle: 'BƯỚC CHẠY TỰU TRƯỜNG', themeSlogan: 'Chuẩn bị thể lực tốt cho năm học mới', status: 'completed' },
  { id: '2026-09', label: 'Tháng 09/2026', themeTitle: 'CHIẾN DỊCH THÁNG 9 · XỎ GIÀY XUỐNG ĐƯỜNG', themeSlogan: 'Khởi động thói quen · 2 buổi mỗi tuần không bỏ cuộc', status: 'completed' },
  { id: '2026-10', label: 'Tháng 10/2026', themeTitle: 'CHIẾN DỊCH THÁNG 10 · BÀN TAY GẮN KẾT & KỶ LUẬT THÉP', themeSlogan: 'Đập tay 5 người ngược chiều · Hoàn thành cự ly · Giữ chuỗi tuần rực lửa', status: 'active', isCurrent: true },
  { id: '2026-11', label: 'Tháng 11/2026', themeTitle: 'CHIẾN DỊCH THÁNG 11 · BỨT PHÁ TỐC ĐỘ (PACER LEAD)', themeSlogan: 'Rèn nhịp thở đều · Nâng dần cự ly · Đón gió đầu đông', status: 'upcoming' },
  { id: '2026-12', label: 'Tháng 12/2026', themeTitle: 'CHIẾN DỊCH THÁNG 12 · CHIẾN BINH MÙA ĐÔNG · VỀ ĐÍCH 2026', themeSlogan: 'Băng qua gió rét · Giữ ấm ngọn lửa kỷ luật · Khép lại năm 2026 kiêu hãnh', status: 'upcoming' },
  { id: '2027-01', label: 'Tháng 01/2027', themeTitle: 'CHIẾN DỊCH THÁNG 01/2027 · KHỞI ĐẦU NĂM MỚI · BỨT PHÁ GIỚI HẠN', themeSlogan: 'Năm mới kỷ luật mới · Chinh phục các cột mốc Km lịch sử mới', status: 'upcoming' },
];

export default function JourneyAdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"camps" | "attendance" | "approvals" | "members">("camps")
  const [isAttendanceSettingsModalOpen, setIsAttendanceSettingsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Camps state
  const [camps, setCamps] = useState<any[]>([])
  const [selectedCampId, setSelectedCampId] = useState<string>("")
  const [editingCamp, setEditingCamp] = useState<CampData | null>(null)
  const [showCampModal, setShowCampModal] = useState(false)
  const [modalSubTab, setModalSubTab] = useState<"general" | "tasks" | "weekly_schedule" | "special_events" | "scoring" | "branding" | "hall_of_fame">("general")

  // Generator form state (cho Tab Weekly Schedule)
  const [genMonth, setGenMonth] = useState("2026-10")
  const [selectedClubMonthId, setSelectedClubMonthId] = useState("2026-11")
  const [genStartDate, setGenStartDate] = useState("2026-11-02")
  const [genTotalCount, setGenTotalCount] = useState(24)

  // Bộ lọc Phân quyền / Scope & Tìm kiếm cho Tab Khóa Học & CLB
  const [scopeFilter, setScopeFilter] = useState<"all" | "admin_only" | "branch" | "partner" | "cham_cong" | "thoi_quen">("all");
  const [campViewMode, setCampViewMode] = useState<"grid" | "list">("grid");

  // Helper chuẩn hóa Phân Loại Quyền Sử Dụng & Đối Tượng Vận Hành
  const getCampScope = (c: any): "admin_only" | "branch" | "partner" | "cham_cong" | "thoi_quen" => {
    if (c.mode === "thoi_quen_ca_nhan") {
      return "thoi_quen";
    }
    if (c.mode === "cham_cong" || c.slug?.includes("cham-cong") || c.scope === "cham_cong" || c.theme?.scope === "cham_cong") {
      return "cham_cong";
    }
    const sc = c.scope || c.theme?.scope;
    if (sc === "branch") return "branch";
    if (sc === "partner") return "partner";
    if (sc === "admin_only") return "admin_only";
    if (c.slug?.includes("ielts")) return "branch";
    return "admin_only";
  };
  const [portalBaseUrl, setPortalBaseUrl] = useState<string>("https://hoc.viceduvn.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        setPortalBaseUrl("http://localhost:3001");
      } else {
        setPortalBaseUrl("https://hoc.viceduvn.com");
      }
    }
  }, []);

  const [campSearch, setCampSearch] = useState("")

  // Bộ lọc Phân Bảng Runner Nhí vs Runner Lớn cho Tab Thành Viên
  const [memberDivisionFilter, setMemberDivisionFilter] = useState<"all" | "kids" | "adults">("all")

  // Helper nhận diện Runner Nhí (U15) vs Người Lớn
  const isKid = (m: any): boolean => {
    if (!m) return false;
    const n = (m.name || "").toLowerCase();
    const t = (m.role_tag || "").toLowerCase();
    if (
      t.includes("lớn") ||
      t.includes("runner lớn") ||
      t.includes("phụ huynh") ||
      t.includes("vicgroup") ||
      t.includes("đội trưởng") ||
      t.includes("bầu xô") ||
      t.includes("huấn luyện viên") ||
      n.startsWith("bố ") ||
      n.startsWith("bác ") ||
      n.startsWith("anh ") ||
      n.startsWith("mẹ ") ||
      n.startsWith("chị ")
    ) {
      return false;
    }
    if (n.startsWith("bé ") || t.includes("học sinh") || t.includes("nhí") || t.includes("u15") || t.includes("runner nhí")) {
      return true;
    }
    return true;
  };

  // Session editor modal state
  const [editingSessionItem, setEditingSessionItem] = useState<any | null>(null)

  // Ban Quản Trị / Phân Quyền Giáo Viên
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminCamp, setAdminCamp] = useState<any | null>(null)
  const [campAdmins, setCampAdmins] = useState<any[]>([])
  const [editingAdmin, setEditingAdmin] = useState<any | null>(null)
  const [mobilePreviewCamp, setMobilePreviewCamp] = useState<any | null>(null)
  const [previewDevice, setPreviewDevice] = useState<'iphone' | 'android'>('iphone')
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null)
  const [staffList, setStaffList] = useState<any[]>([])
  const [adminStaffSearch, setAdminStaffSearch] = useState("")
  const [newAdmin, setNewAdmin] = useState({
    name: "",
    phone: "",
    pinLast4: "",
    roleTitle: "Giáo viên Phụ trách",
    avatar: "👨‍🏫",
    canAccessCRM: true,
  })

  const openAdminModal = async (camp: any) => {
    setAdminCamp(camp)
    const existing = camp.theme?.admins && camp.theme.admins.length > 0
      ? camp.theme.admins
      : [
          { id: "admin_1", name: "Bố Hoàng (Bầu Xô)", phone: "0912345678", pinLast4: "5678", roleTitle: "Tổng Chỉ Huy · Super Admin", avatar: "🦁", canAccessCRM: true }
        ]
    setCampAdmins(existing)
    setAdminStaffSearch("")
    setShowAdminModal(true)
    if (staffList.length === 0) {
      const staff = await getVicEduStaff()
      setStaffList(staff)
    }
  }

  const handleAddAdmin = () => {
    if (!newAdmin.name.trim() || !newAdmin.pinLast4.trim()) {
      alert("Vui lòng nhập Họ tên và Mã PIN 4 số cho Quản trị viên!")
      return
    }
    const adminObj = {
      id: `admin_${Date.now()}`,
      name: newAdmin.name.trim(),
      phone: newAdmin.phone.trim(),
      pinLast4: newAdmin.pinLast4.trim(),
      roleTitle: newAdmin.roleTitle.trim() || "Quản trị viên",
      avatar: newAdmin.avatar || "👤",
      canAccessCRM: newAdmin.canAccessCRM,
    }
    setCampAdmins([...campAdmins, adminObj])
    setNewAdmin({
      name: "",
      phone: "",
      pinLast4: "",
      roleTitle: "Giáo viên Phụ trách",
      avatar: "👨‍🏫",
      canAccessCRM: true,
    })
  }

  const handleRemoveAdmin = (id: string | number) => {
    setCampAdmins(campAdmins.filter(a => a.id !== id))
  }

  const handleStartEditAdmin = (adm: any) => {
    setEditingAdmin({ ...adm })
  }

  const handleSaveEditedAdmin = async () => {
    if (!editingAdmin || !adminCamp) return
    if (!editingAdmin.name?.trim() || !editingAdmin.pinLast4?.trim()) {
      alert("Vui lòng nhập đầy đủ Họ tên và Mã PIN 4 số!")
      return
    }
    const updatedAdmins = campAdmins.map(a => a.id === editingAdmin.id ? editingAdmin : a)
    setCampAdmins(updatedAdmins)
    
    // Tự động lưu ngay vào DB
    const res = await saveCampAdmins(adminCamp.id, updatedAdmins)
    if (res.success) {
      setCamps(prev => prev.map(c => c.id === adminCamp.id ? { ...c, theme: { ...(c.theme || {}), admins: updatedAdmins } } : c))
      alert(`✅ Đã cập nhật thông tin Quản trị viên "${editingAdmin.name}" thành công!`)
      setEditingAdmin(null)
    } else {
      alert("❌ Lỗi khi lưu Quản trị viên: " + res.error)
    }
  }

  const handleDeleteCamp = async (camp: any) => {
    if (!camp) return
    const confirmMsg = `⚠️ CẢNH BÁO XÓA HÀNH TRÌNH VĨNH VIỄN!\n\nBạn có CHẮC CHẮN muốn xóa vĩnh viễn hành trình:\n"${camp.title}"?\n\nToàn bộ dữ liệu thành viên và báo cáo thuộc hành trình này sẽ bị xóa sạch khỏi Database và KHÔNG THỂ KHÔI PHỤC!`
    if (!window.confirm(confirmMsg)) return

    const res = await deleteCamp(camp.id)
    if (res.success) {
      alert(`✅ Đã xóa hoàn toàn hành trình "${camp.title}" và dọn sạch database!`)
      setCamps(prev => prev.filter(c => c.id !== camp.id))
      if (selectedCampId === camp.id) {
        setSelectedCampId(null)
      }
      if (showCampModal) {
        setShowCampModal(false)
      }
    } else {
      alert("❌ Lỗi khi xóa hành trình: " + res.error)
    }
  }

  const handleSaveAdmins = async () => {
    if (!adminCamp) return
    const res = await saveCampAdmins(adminCamp.id, campAdmins)
    if (res.success) {
      alert("✅ Đã cập nhật Ban Quản Trị & Giáo viên phụ trách thành công!")
      setCamps(prev => prev.map(c => c.id === adminCamp.id ? { ...c, theme: { ...(c.theme || {}), admins: campAdmins } } : c));
      await loadCamps();
      setShowAdminModal(false)
    } else {
      alert("❌ Lỗi lưu Ban quản trị: " + res.error)
    }
  }

  // Hàm chuẩn hóa Thứ, Ngày & Tự nhận diện các buổi CHẠY SONG SONG
  const normalizeCampSessions = (rawSessions: any[]) => {
    if (!Array.isArray(rawSessions)) return [];
    const dateCounts: Record<string, number> = {};
    rawSessions.forEach((s: any) => {
      if (s.dateStr) dateCounts[s.dateStr] = (dateCounts[s.dateStr] || 0) + 1;
    });

    return rawSessions.map((s: any) => {
      let sessionCode = s.sessionCode || '';
      let timeStr = s.timeStr || '';
      const isParallel = (s.dateStr && (dateCounts[s.dateStr] || 0) > 1) || !!s.isParallel;
      const scopeTag = s.scopeTag || (s.isSpecialEvent ? '🏆 ĐOÀN THI ĐẤU' : (isParallel ? '🏃 NHÓM TẠI CLB' : undefined));

      // Tự động sửa lỗi sai Thứ và format ngược ngày MM/DD (như T7 · 12/27 -> CN · 27/12)
      if (s.dateStr && s.dateStr.includes('-')) {
        const [y, m, d] = s.dateStr.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          const dateObj = new Date(y, m - 1, d);
          const dayOfWeek = dateObj.getDay();
          const dayShort = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;
          const dayPad = d < 10 ? `0${d}` : `${d}`;
          const monthPad = m < 10 ? `0${m}` : `${m}`;
          const correctCode = `${dayShort} · ${dayPad}/${monthPad}`;

          if (sessionCode.includes('·') && (!sessionCode.startsWith(dayShort) || sessionCode.includes(`${monthPad}/${dayPad}`))) {
            sessionCode = correctCode;
          }

          if (timeStr && timeStr.match(/^(CN|T[2-7])\s+/)) {
            const timeOnly = timeStr.replace(/^(CN|T[2-7])\s+/, '');
            if (!timeStr.startsWith(dayShort)) {
              timeStr = `${dayShort} ${timeOnly}`;
            }
          }
        }
      }

      return {
        ...s,
        sessionCode,
        timeStr,
        isParallel,
        scopeTag,
      };
    });
  };

  const handleSaveSessionItem = (updated: any) => {
    if (!editingCamp) return
    const cleanDesc = updated.summaryText !== undefined ? updated.summaryText : updated.desc;
    const normalized = {
      ...updated,
      desc: cleanDesc,
      summaryText: cleanDesc,
    };
    const currentSessions = editingCamp.sessions || []
    const idx = currentSessions.findIndex((s: any) => s.id === updated.id)
    let newSessions: any[]
    if (idx >= 0) {
      newSessions = [...currentSessions]
      newSessions[idx] = normalized
    } else {
      newSessions = [...currentSessions, normalized]
    }

    // Đồng thời cập nhật vào club_months nếu có
    let updatedClubMonths = editingCamp.club_months
    if (editingCamp.mode === "clb_quanh_nam" && Array.isArray(updatedClubMonths)) {
      updatedClubMonths = updatedClubMonths.map((m: any) => {
        if (Array.isArray(m.sessions)) {
          const sIdx = m.sessions.findIndex((s: any) => s.id === updated.id)
          if (sIdx >= 0) {
            const copyM = [...m.sessions]
            copyM[sIdx] = { ...copyM[sIdx], ...normalized }
            return { ...m, sessions: copyM }
          }
        }
        return m
      })
    }

    setEditingCamp({
      ...editingCamp,
      sessions: newSessions,
      club_months: updatedClubMonths,
    })
    setEditingSessionItem(null)
  }

  // State cho sự kiện đặc biệt mới
  const [newEvent, setNewEvent] = useState({
    title: "",
    dateStr: "",
    timeStr: "T7 05:30",
    location: "",
    specialBadge: "🏆 GIẢI ĐẤU",
    desc: "",
    eventType: "race" as const,
  })

  // Members state
  const [members, setMembers] = useState<any[]>([])
  const [editingMember, setEditingMember] = useState<MemberData | null>(null)
  const [showMemberModal, setShowMemberModal] = useState(false)

  // Reports / Approvals state
  const [reports, setReports] = useState<any[]>([])
  const [approvalFilter, setApprovalFilter] = useState<string>("all")

  // State Modal Xuất Excel Thông Minh 2-Sheet dành cho Quản Trị Viên & Kế Toán
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const [exportMonth, setExportMonth] = useState<string>('all')
  const [exportBranch, setExportBranch] = useState<string>('all')
  const [isGeneratingExcel, setIsGeneratingExcel] = useState(false)

  // GPS Geofence Đa Chi Nhánh (VicEdu Multi-Branch) & Shifts form state (for Tab 2)
  const [branchesList, setBranchesList] = useState<Array<{
    id: string;
    branch_name: string;
    address?: string;
    lat: number;
    lng: number;
    radius: number;
  }>>([
    { id: "b1", branch_name: "VP VicEdu Việt Trì (Trụ sở chính)", address: "Đại lộ Hùng Vương, TP. Việt Trì", lat: 21.321146, lng: 105.393865, radius: 50 },
    { id: "b2", branch_name: "VP VicEdu Việt Trì 2 (Nông Trang)", address: "Phường Nông Trang, TP. Việt Trì", lat: 21.315200, lng: 105.405100, radius: 50 },
    { id: "b3", branch_name: "VP VicEdu Lâm Thao", address: "Khu 5, TT. Lâm Thao, Phú Thọ", lat: 21.352400, lng: 105.281500, radius: 50 },
    { id: "b4", branch_name: "VP VicEdu Phù Ninh", address: "TT. Phong Châu, Phù Ninh, Phú Thọ", lat: 21.432100, lng: 105.321800, radius: 50 },
  ])
  const [selectedBranchIndex, setSelectedBranchIndex] = useState<number>(0)
  const [gpsForm, setGpsForm] = useState({
    branch_name: "VP VicEdu Việt Trì",
    lat: 21.321146,
    lng: 105.393865,
    radius: 50,
  })
  const [shiftsForm, setShiftsForm] = useState<any[]>([
    { id: "P1", name: "Ca P1", start: "07:30", end: "17:30" },
    { id: "P2", name: "Ca P2", start: "09:00", end: "19:00" },
    { id: "P3", name: "Ca P3", start: "13:45", end: "21:45" },
    { id: "P4", name: "Ca P4", start: "08:00", end: "18:00" },
    { id: "P5", name: "Ca P5", start: "07:00", end: "17:00" },
  ])
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null)
  const [editingShiftData, setEditingShiftData] = useState<{ id?: string; name: string; start: string; end: string }>({
    name: "",
    start: "08:00",
    end: "17:00",
  })
  const [detectingGps, setDetectingGps] = useState(false)
  const [gpsMessage, setGpsMessage] = useState<string | null>(null)

  // Smart Member Import State (Chi nhánh VicHRM & Lớp học LMS)
  const [memberModalTab, setMemberModalTab] = useState<'branch_staff' | 'class_students' | 'manual'>('manual');
  const [staffBranch, setStaffBranch] = useState<string>("Việt Trì 1");
  const [branchStaffList, setBranchStaffList] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  const [classBranch, setClassBranch] = useState<string>("Việt Trì 1");
  const [classesList, setClassesList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [classStudentsList, setClassStudentsList] = useState<any[]>([]);
  const [loadingClassStudents, setLoadingClassStudents] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  const loadBranchStaff = async (branch: string) => {
    setLoadingStaff(true);
    try {
      const data = await getBranchEmployees(branch);
      setBranchStaffList(data || []);
      // Mặc định chọn những nhân viên chưa có trong camp
      const existingPhones = new Set(members.map((m: any) => m.phone).filter(Boolean));
      const existingNames = new Set(members.map((m: any) => (m.name || '').toLowerCase().trim()));
      const unadded = (data || []).filter((e: any) => !existingPhones.has(e.phone) && !existingNames.has((e.full_name || '').toLowerCase().trim()));
      setSelectedStaffIds(unadded.map((e: any) => e.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const loadBranchClasses = async (branch: string) => {
    try {
      const data = await getClassesList(branch);
      setClassesList(data || []);
      if (data && data.length > 0) {
        setSelectedClassId(data[0].id);
        loadClassStudents(data[0].id);
      } else {
        setSelectedClassId("");
        setClassStudentsList([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadClassStudents = async (classId: string) => {
    if (!classId) return;
    setLoadingClassStudents(true);
    try {
      const data = await getClassStudentsForJourney(classId);
      setClassStudentsList(data || []);
      // Mặc định chọn những học sinh chưa có trong camp
      const existingIds = new Set(members.map((m: any) => m.student_id).filter(Boolean));
      const existingNames = new Set(members.map((m: any) => (m.name || '').toLowerCase().trim()));
      const unadded = (data || []).filter((s: any) => !existingIds.has(s.id) && !existingNames.has((s.full_name || '').toLowerCase().trim()));
      setSelectedStudentIds(unadded.map((s: any) => s.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingClassStudents(false);
    }
  };

  const handleOpenAddMemberModal = (initialTab?: 'branch_staff' | 'class_students' | 'manual') => {
    let defaultTab: 'branch_staff' | 'class_students' | 'manual' = initialTab || 'manual';
    if (!initialTab) {
      if (selectedCamp?.mode === 'cham_cong') {
        defaultTab = 'branch_staff';
      } else if (selectedCamp?.mode === 'lop_hoc_buoi') {
        defaultTab = 'class_students';
      } else {
        defaultTab = 'manual';
      }
    }
    setMemberModalTab(defaultTab);

    // Tự động phát hiện chi nhánh theo camp
    let detectedBranch = "Việt Trì 1";
    const cSlug = (selectedCamp?.slug || '').toLowerCase();
    const cTitle = (selectedCamp?.title || '').toLowerCase();
    if (cSlug.includes('vt') || cTitle.includes('việt trì') || cTitle.includes('viet tri')) detectedBranch = "Việt Trì 1";
    else if (cSlug.includes('dh') || cTitle.includes('dân hòa') || cTitle.includes('dan hoa')) detectedBranch = "Dân Hòa";
    else if (cSlug.includes('tq') || cTitle.includes('tuyên quang') || cTitle.includes('tuyen quang')) detectedBranch = "Tuyên Quang";
    else if (cSlug.includes('lt') || cTitle.includes('lâm thao') || cTitle.includes('lam thao')) detectedBranch = "Lâm Thao";

    setStaffBranch(detectedBranch);
    setClassBranch(detectedBranch);

    if (defaultTab === 'branch_staff') {
      loadBranchStaff(detectedBranch);
    } else if (defaultTab === 'class_students') {
      loadBranchClasses(detectedBranch);
    }

    setEditingMember({
      camp_id: selectedCampId,
      name: "",
      phone: "",
      pin_code: "1234",
      role_tag: selectedCamp?.mode === 'cham_cong' ? "Nhân sự chi nhánh" : selectedCamp?.mode === 'clb_quanh_nam' ? "Runner Nhí" : "Học sinh",
      total_km_all_time: 0,
      total_stars: 0,
      forgot_pills_quota: 3,
    });
    setShowMemberModal(true);
  };

  const handleBulkAddStaff = async () => {
    const chosenStaff = branchStaffList.filter(s => selectedStaffIds.includes(s.id));
    if (chosenStaff.length === 0) {
      alert("Vui lòng chọn ít nhất 1 nhân sự để nạp vào danh sách chấm công!");
      return;
    }
    setBulkSubmitting(true);
    try {
      const list = chosenStaff.map(emp => {
        const phoneDigits = (emp.phone || '').replace(/\D/g, '');
        const pLast4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '1234';
        return {
          camp_id: selectedCampId,
          student_id: null,
          name: emp.full_name ? `${emp.full_name} (${emp.id})` : emp.id,
          phone: emp.phone || '',
          phone_last4: pLast4,
          pin_code: pLast4,
          role_tag: emp.position || emp.role || 'Cán bộ nhân viên',
          avatar_url: emp.avatar_url || '',
          forgot_pills_quota: 3,
          total_stars: 0,
          status: 'active',
        };
      });
      const res = await bulkSaveMembers(selectedCampId, list);
      if (res.success) {
        alert(`✅ Nạp thành công ${res.count} nhân sự vào hệ thống chấm công!`);
        setShowMemberModal(false);
        loadMembers(selectedCampId);
        loadCamps();
      } else {
        alert("❌ Lỗi khi nạp nhân sự: " + res.error);
      }
    } finally {
      setBulkSubmitting(false);
    }
  };

  const handleBulkAddStudents = async () => {
    const chosenStudents = classStudentsList.filter(s => selectedStudentIds.includes(s.id));
    if (chosenStudents.length === 0) {
      alert("Vui lòng chọn ít nhất 1 học sinh để nạp vào lớp học!");
      return;
    }
    setBulkSubmitting(true);
    try {
      const list = chosenStudents.map(stu => {
        const phone = stu.parent_phone || stu.phone || '';
        const phoneDigits = phone.replace(/\D/g, '');
        const pLast4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '1234';
        const nick = stu.nickname ? ` (${stu.nickname})` : '';
        return {
          camp_id: selectedCampId,
          student_id: null,
          name: stu.full_name + nick,
          phone: phone,
          phone_last4: pLast4,
          pin_code: pLast4,
          role_tag: stu.nickname ? `${stu.nickname} · Học viên` : 'Học viên',
          avatar_url: stu.avatar_url || '',
          total_stars: 0,
          status: 'active',
        };
      });
      const res = await bulkSaveMembers(selectedCampId, list);
      if (res.success) {
        alert(`✅ Nạp thành công ${res.count} học sinh của cả lớp vào hành trình học tập!`);
        setShowMemberModal(false);
        loadMembers(selectedCampId);
        loadCamps();
      } else {
        alert("❌ Lỗi khi nạp học sinh: " + res.error);
      }
    } finally {
      setBulkSubmitting(false);
    }
  };

  // Mở modal cấu hình Camp chi tiết
    // 1-Click Nhân bản Camp
  const handleCloneCamp = (camp: any) => {
    const cloned = JSON.parse(JSON.stringify(camp));
    delete cloned.id;
    cloned.title = `${camp.title} (Bản sao)`;
    const randSuffix = Math.floor(1000 + Math.random() * 9000);
    cloned.slug = `${camp.slug}-copy-${randSuffix}`;
    openCampModal(cloned);
  };

  
  // HÀM TIỆN ÍCH: TẠO KHUÔN MẪU CHUẨN SẠCH CHO TỪNG MÔ THỨC VẬN HÀNH
  const getCleanPreset = (mode: string, baseCamp?: any) => {
    const isLopHoc = mode === 'lop_hoc_buoi';
    const isThoiQuen = mode === 'thoi_quen_ca_nhan';
    const isChamCong = mode === 'cham_cong';
    const isClbSport = mode === 'clb_quanh_nam';

    let tasks: any[] = [];
    if (isLopHoc) {
      tasks = [
        { id: 'dung_gio', name: 'Đi học đúng giờ', type: 'boolean', color: '#10b981', description: 'Có mặt trước giờ học 5 phút và chuẩn bị sách vở' },
        { id: 'dong_phuc', name: 'Mặc đồng phục VicEdu', type: 'boolean', color: '#3b82f6', description: 'Mặc áo đồng phục chỉnh tề tác phong học sinh' },
        { id: 'btvn', name: 'Hoàn thành 100% BTVN', type: 'boolean', color: '#4f46e5', description: 'Hoàn thành đầy đủ bài tập về nhà được giao' },
        { id: 'phat_bieu', name: 'Hăng hái phát biểu & tương tác', type: 'boolean', color: '#f59e0b', description: 'Tích cực xây dựng bài giảng và tương tác sôi nổi' },
        { id: 'razkids', name: 'Tự học & Đọc Razkids ở nhà', type: 'number', unit: 'phút', target: 20, color: '#8b5cf6', description: 'Luyện đọc tiếng Anh trên ứng dụng Razkids tối thiểu 20 phút mỗi ngày' }
      ];
    } else if (isThoiQuen) {
      tasks = [
        { id: 'biet_on', name: 'Viết 3 điều biết ơn mỗi ngày', type: 'text', color: '#ec4899', description: 'Ghi lại ít nhất 3 điều khiến bạn cảm thấy biết ơn và hạnh phúc trong ngày' },
        { id: 'doc_sach', name: 'Đọc sách phát triển bản thân', type: 'number', unit: 'phút', target: 20, color: '#8b5cf6', description: 'Dành tối thiểu 20 phút đọc sách tĩnh tâm' },
        { id: 'the_duc', name: 'Vận động thể chất / Thể dục', type: 'number', unit: 'phút', target: 15, color: '#10b981', description: 'Tập thể dục, giãn cơ hoặc đi bộ nhẹ nhàng 15 phút' }
      ];
    } else if (isChamCong) {
      tasks = [
        { id: 'check_in_gps', name: 'Check-in đúng ca làm (GPS)', type: 'boolean', color: '#10b981', description: 'Có mặt tại chi nhánh và check-in đúng giờ vào ca' },
        { id: 'dung_gio', name: 'Đi làm sớm 5 phút', type: 'boolean', color: '#f59e0b', description: 'Đến trước 5 phút chuẩn bị không gian làm việc' },
        { id: 'biet_on_work', name: 'Viết 1 điều tích cực trong ca làm', type: 'text', color: '#ec4899', description: 'Ghi nhận 1 đồng nghiệp hoặc 1 khoảnh khắc biết ơn trong công việc' },
        { id: 'bao_cao_kpi', name: 'Báo cáo KPI & Tiến độ ca', type: 'boolean', color: '#6366f1', description: 'Hoàn thành các đầu việc được giao và gửi nhật ký ca làm' },
        { id: 'check_out_gps', name: 'Check-out hoàn tất ca (GPS)', type: 'boolean', color: '#3b82f6', description: 'Bàn giao và check-out đúng giờ trước khi về' }
      ];
    } else {
      tasks = [
        { id: 'chay_km', name: 'Chạy bộ tích lũy', type: 'number', unit: 'km', target: 3, color: '#e11d48', description: 'Chạy tối thiểu 3km mỗi buổi' },
        { id: 'dap_tay', name: 'Đập tay giao lưu', type: 'boolean', color: '#f59e0b', description: 'Đập tay chào người chạy ngược chiều' },
        { id: 'dung_gio', name: 'Có mặt đúng giờ', type: 'boolean', color: '#10b981', description: 'T6 17h30 / CN 05h30 có mặt đúng giờ' },
        { id: 'giup_ban', name: 'Hỗ trợ đồng đội', type: 'boolean', color: '#3b82f6', description: 'Chạy kèm bạn yếu hơn hoặc nhặt rác đường chạy' }
      ];
    }

    const cleanTheme: any = {
      ...(baseCamp?.theme || {}),
      admins: baseCamp?.theme?.admins || [],
      owner_name: baseCamp?.theme?.owner_name || (isLopHoc ? 'Thầy Cô VicEdu' : 'Sếp Hoàng'),
      owner_avatar: baseCamp?.theme?.owner_avatar || (isLopHoc ? '👨‍🏫' : isThoiQuen ? '🌱' : '🦁'),
      owner_phone: baseCamp?.theme?.owner_phone || '0912345678',
      start_date: baseCamp?.theme?.start_date || new Date().toISOString().split('T')[0],
      primary: isThoiQuen ? '#ec4899' : isLopHoc ? '#4f46e5' : isChamCong ? '#10b981' : '#e11d48',
      accent: isThoiQuen ? '#db2777' : isLopHoc ? '#4338ca' : isChamCong ? '#059669' : '#be123c',
      light: isThoiQuen ? '#fdf2f8' : isLopHoc ? '#eef2ff' : isChamCong ? '#ecfdf5' : '#ffe4e6',
      target_days: isThoiQuen ? (baseCamp?.theme?.target_days || 30) : 30,
      canvaUrl: isLopHoc ? (baseCamp?.theme?.canvaUrl || '') : '',
      locationText: isLopHoc ? (baseCamp?.theme?.locationText || 'Phòng học VicEdu Chi Nhánh 1') : isChamCong ? (baseCamp?.theme?.locationText || 'VP VicEdu Chi Nhánh') : isClbSport ? (baseCamp?.theme?.locationText || 'Công viên Văn Lang') : 'Tại nhà / Cá nhân',
      scheduleText: isLopHoc ? (baseCamp?.theme?.scheduleText || 'Tuần 2 buổi · T3 & T6 (19h30 - 21h30)') : isChamCong ? 'Ca sáng P1 (07h30) · Ca tối P3 (13h45)' : isClbSport ? 'Tuần 2 buổi · T6 17h30 & CN 05h30' : 'Hàng ngày liên tục',
      careSuccessTpl: isLopHoc
        ? 'Chào {Ten}! {Sender} chúc mừng em đã hoàn thành xuất sắc nhiệm vụ buổi học hôm nay! Tinh thần tự giác rất tuyệt vời, tiếp tục phát huy nhé!'
        : isThoiQuen
        ? 'Tuyệt vời {Ten}! Bạn đã giữ vững ngọn lửa kỷ luật hôm nay với chuỗi {Streak} ngày liên tiếp rực rỡ! 🔥'
        : 'Chúc mừng {Ten} đã hoàn thành trọn vẹn mục tiêu hôm nay! KỶ LUẬT LÀ SỨC MẠNH!',
      careReminderTpl: isLopHoc
        ? 'Chào phụ huynh & em {Ten}! {Sender} nhắc em hôm nay còn thiếu phần: {MissingTasks}. Em nhớ hoàn thành sớm nhé!'
        : 'Chào {Ten} ơi! Hôm nay mình còn chút nhiệm vụ: {MissingTasks}. Dành ít phút hoàn thành để giữ chuỗi ngày liên tục nhé! 🔥',
    };

    // Chỉ CLB thể thao quanh năm mới có hall_of_fame
    if (isClbSport && baseCamp?.theme?.hall_of_fame) {
      cleanTheme.hall_of_fame = baseCamp.theme.hall_of_fame;
    } else {
      delete cleanTheme.hall_of_fame;
    }

    return {
      slug: baseCamp?.slug || '',
      title: baseCamp?.title || (isLopHoc ? 'LỚP HỌC CHIẾN BINH EAGLE' : isThoiQuen ? 'HÀNH TRÌNH BIẾT ƠN & TỰ RÈN' : isChamCong ? 'CHẤM CÔNG CHI NHÁNH' : 'CLB RUNNER NHÍ'),
      subtitle: isLopHoc ? 'Lộ trình 24 buổi học tập & tự rèn luyện Razkids tại VicEdu' : isThoiQuen ? 'Hành trình 30 ngày chuyển hóa bản thân và xây dựng thói quen tích cực' : isChamCong ? 'Quản lý ca làm việc và tiêu chuẩn văn hóa nội bộ' : 'Tích lũy bước chạy quanh năm cùng gia đình và đồng đội',
      slogan: isLopHoc ? 'KỶ LUẬT TẠO NÊN KỲ TÍCH · KHÔNG BỎ CUỘC DÙ CHỈ MỘT BÀI TẬP' : isThoiQuen ? 'KỶ LUẬT BẮT ĐẦU TỪ TÂM THỨC · MỖI NGÀY LÀ MỘT PHÉP MÀU' : isChamCong ? 'ĐÚNG GIỜ · TẬN TÂM · KỶ LUẬT KIẾN TẠO GIÁ TRỊ' : 'KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ',
      mode,
      status: baseCamp?.status || 'active',
      has_divisions: isClbSport,
      require_pin: true,
      scope: baseCamp?.scope || (isChamCong ? 'branch' : isLopHoc ? 'branch' : 'admin_only'),
      tasks,
      theme: cleanTheme,
      logo: {
        icon: isLopHoc ? '🎯📚' : isThoiQuen ? '💖🌱' : isChamCong ? '📍🏢' : '🏃‍♂️🔥',
        text: baseCamp?.logo?.text || (isLopHoc ? 'VICEDU EAGLE' : isThoiQuen ? 'BIẾT ƠN' : 'VICEDU'),
        badgeLabel: isLopHoc ? 'Học viên xuất sắc' : isThoiQuen ? 'Chiến binh chuyển hóa' : isChamCong ? 'Nhân sự gương mẫu' : 'Runner 19',
        imageUrl: baseCamp?.logo?.imageUrl || '',
      },
      sessions: isLopHoc ? (baseCamp?.sessions || []) : (isClbSport ? (baseCamp?.sessions || []) : []),
      club_months: isClbSport ? (baseCamp?.club_months || []) : [],
    };
  };

  const openCampModal = (camp?: any) => {
    if (camp) {
      const defaultTasks = (camp.tasks && Array.isArray(camp.tasks) && camp.tasks.length > 0)
        ? camp.tasks
        : (camp.mode === 'cham_cong' ? [
            { id: 'check_in_gps', name: 'Check-in đúng ca (GPS)', type: 'boolean', color: '#10b981', description: 'Có mặt tại chi nhánh trong bán kính GPS và check-in đúng ca làm' },
            { id: 'dung_gio', name: 'Đúng giờ (Không đi muộn)', type: 'boolean', color: '#f59e0b', description: 'Check-in trước hoặc đúng giờ bắt đầu ca làm việc quy định' },
            { id: 'check_out_gps', name: 'Check-out hoàn tất ca (GPS)', type: 'boolean', color: '#6366f1', description: 'Check-out khi kết thúc ca làm việc trước khi rời văn phòng' },
            { id: 'bao_cao_ngay', name: 'Báo cáo công việc ca làm', type: 'boolean', color: '#8b5cf6', description: 'Hoàn thành nhiệm vụ được giao và gửi nhật ký ca làm việc' }
          ] : camp.mode === 'clb_quanh_nam' ? [
            { id: 'chay_km', name: 'Chạy bộ', type: 'number', unit: 'km', target: 3, color: '#e11d48', description: 'Chạy tối thiểu 3km mỗi buổi' },
            { id: 'dap_tay', name: 'Đập tay giao lưu', type: 'boolean', color: '#f59e0b', description: 'Đập tay chào người chạy ngược chiều' },
            { id: 'dung_gio', name: 'Có mặt đúng giờ', type: 'boolean', color: '#10b981', description: 'T6 17h30 / CN 05h30 có mặt đúng giờ' },
            { id: 'giup_ban', name: 'Hỗ trợ đồng đội', type: 'boolean', color: '#3b82f6', description: 'Chạy kèm bạn yếu hơn hoặc nhặt rác đường chạy' }
          ] : [
            { id: 'bai_tap', name: 'Làm bài tập Cambridge', type: 'boolean', color: '#4f46e5', description: 'Hoàn thành 100% bài tập Cambridge về nhà' },
            { id: 'tu_vung', name: 'Ôn tập từ vựng', type: 'number', unit: 'từ', target: 20, color: '#10b981', description: 'Ghi nhớ và viết lại ít nhất 20 từ vựng theo chủ đề' },
            { id: 'dung_gio', name: 'Vào lớp đúng giờ', type: 'boolean', color: '#f59e0b', description: 'Có mặt trước giờ học 5 phút và chuẩn bị tài liệu' },
            { id: 'tu_hoc', name: 'Tự học thêm', type: 'number', unit: 'phút', target: 30, color: '#8b5cf6', description: 'Luyện nghe podcast hoặc đọc báo tiếng Anh 30 phút' }
          ])

      const defaultWeeklySchedule = camp.theme?.weeklySchedule || (camp.mode === 'cham_cong' ? [
        { dayOfWeek: 1, dayLabel: "Thứ 2", timeStr: "07:30", location: "VP VicEdu Chi Nhánh", sessionTitle: "Ca làm việc T2" },
        { dayOfWeek: 2, dayLabel: "Thứ 3", timeStr: "07:30", location: "VP VicEdu Chi Nhánh", sessionTitle: "Ca làm việc T3" },
        { dayOfWeek: 3, dayLabel: "Thứ 4", timeStr: "07:30", location: "VP VicEdu Chi Nhánh", sessionTitle: "Ca làm việc T4" },
        { dayOfWeek: 4, dayLabel: "Thứ 5", timeStr: "07:30", location: "VP VicEdu Chi Nhánh", sessionTitle: "Ca làm việc T5" },
        { dayOfWeek: 5, dayLabel: "Thứ 6", timeStr: "07:30", location: "VP VicEdu Chi Nhánh", sessionTitle: "Ca làm việc T6" },
        { dayOfWeek: 6, dayLabel: "Thứ 7", timeStr: "07:30", location: "VP VicEdu Chi Nhánh", sessionTitle: "Ca làm việc T7" },
      ] : camp.mode === 'clb_quanh_nam' ? [
        { dayOfWeek: 5, dayLabel: "Thứ 6", timeStr: "17:30", location: "Công viên Văn Lang", sessionTitle: "Chạy tiếp sức chiều T6" },
        { dayOfWeek: 0, dayLabel: "Chủ Nhật", timeStr: "05:30", location: "Công viên Văn Lang", sessionTitle: "Long Run sáng Chủ Nhật" },
      ] : [
        { dayOfWeek: 1, dayLabel: "Thứ 2", timeStr: "19:00", location: "Phòng học Cambridge VicEdu", sessionTitle: "Lộ trình Ngữ pháp & Từ vựng" },
        { dayOfWeek: 6, dayLabel: "Thứ 7", timeStr: "08:30", location: "Phòng Lab VicEdu", sessionTitle: "Luyện Kỹ năng Speaking & Listening" },
      ])

                  const DEFAULT_CLUB_MONTHS = [
        { id: '2026-01', label: 'Tháng 01/2026', themeTitle: 'KHAI XUÂN 2026', themeSlogan: 'Khởi động thói quen chạy bộ đầu năm', status: 'completed' },
        { id: '2026-02', label: 'Tháng 02/2026', themeTitle: 'MÙA XUÂN KỶ LUẬT', themeSlogan: 'Duy trì bước chạy sau Tết', status: 'completed' },
        { id: '2026-03', label: 'Tháng 03/2026', themeTitle: 'BƯỚC CHẠY YÊU THƯƠNG', themeSlogan: 'Chạy cùng bố mẹ quanh công viên', status: 'completed' },
        { id: '2026-04', label: 'Tháng 04/2026', themeTitle: 'CHINH PHỤC CỰ LY', themeSlogan: 'Nâng dần cự ly 3km - 5km', status: 'completed' },
        { id: '2026-05', label: 'Tháng 05/2026', themeTitle: 'CHÀO HÈ BỨT PHÁ', themeSlogan: 'Đón bình minh sớm 05h30', status: 'completed' },
        { id: '2026-06', label: 'Tháng 06/2026', themeTitle: 'HÈ RỰC LỬA', themeSlogan: 'Tránh xa màn hình · Rèn luyện thể lực', status: 'completed' },
        { id: '2026-07', label: 'Tháng 07/2026', themeTitle: 'TRẠI HÈ RUNNER 19', themeSlogan: 'Chạy dã ngoại và gắn kết gia đình', status: 'completed' },
        { id: '2026-08', label: 'Tháng 08/2026', themeTitle: 'BƯỚC CHẠY TỰU TRƯỜNG', themeSlogan: 'Chuẩn bị thể lực tốt cho năm học mới', status: 'completed' },
        { id: '2026-09', label: 'Tháng 09/2026', themeTitle: 'CHIẾN DỊCH THÁNG 9 · XỎ GIÀY XUỐNG ĐƯỜNG', themeSlogan: 'Khởi động thói quen · 2 buổi mỗi tuần không bỏ cuộc', status: 'completed' },
        { id: '2026-10', label: 'Tháng 10/2026', themeTitle: 'CHIẾN DỊCH THÁNG 10 · BÀN TAY GẮN KẾT & KỶ LUẬT THÉP', themeSlogan: 'Đập tay 5 người ngược chiều · Hoàn thành cự ly · Giữ chuỗi tuần rực lửa', status: 'active', isCurrent: true },
        { id: '2026-11', label: 'Tháng 11/2026', themeTitle: 'CHIẾN DỊCH THÁNG 11 · BỨT PHÁ TỐC ĐỘ (PACER LEAD)', themeSlogan: 'Rèn nhịp thở đều · Nâng dần cự ly · Đón gió đầu đông', status: 'upcoming' },
        { id: '2026-12', label: 'Tháng 12/2026', themeTitle: 'CHIẾN DỊCH THÁNG 12 · CHIẾN BINH MÙA ĐÔNG · VỀ ĐÍCH 2026', themeSlogan: 'Băng qua gió rét · Giữ ấm ngọn lửa kỷ luật · Khép lại năm 2026 kiêu hãnh', status: 'upcoming' },
        { id: '2027-01', label: 'Tháng 01/2027', themeTitle: 'CHIẾN DỊCH THÁNG 01/2027 · KHỞI ĐẦU NĂM MỚI · BỨT PHÁ GIỚI HẠN', themeSlogan: 'Năm mới kỷ luật mới · Chinh phục các cột mốc Km lịch sử mới', status: 'upcoming' },
      ];

      const defaultHallOfFame = camp.theme?.hall_of_fame || {
        title_kids: '👑 BẢNG PHONG THẦN RUNNER NHÍ · ALL-TIME 2026',
        subtitle_kids: 'Tôn vinh những đôi chân nhí kiên cường nhất của Rubisea 19 từ đầu năm đến nay',
        flame_hint_kids: '🔥 Tính theo Tuần Kỷ Luật U15 (đủ cả 2 buổi T6 & CN)',
        clubs_kids: [
          { min_km: 100, name: 'Club 100km · Kiện Tướng Nhí', badge: '👑', border_color: '#f59e0b', name_color: '#b45309' },
          { min_km: 75, name: 'Club 75km · Bàn Chân Thép U15', badge: '🥈', border_color: '#3b82f6', name_color: '#1d4ed8' },
          { min_km: 50, name: 'Club 50km · Bứt Phá Cự Ly', badge: '🥉', border_color: '#10b981', name_color: '#047857' },
          { min_km: 25, name: 'Club 25km · Tân Binh Kỷ Luật', badge: '⚡', border_color: '#8b5cf6', name_color: '#6d28d9' },
        ],
        title_adults: '👑 BẢNG PHONG THẦN PACER & PHỤ HUYNH · ALL-TIME 2026',
        subtitle_adults: 'Tôn vinh những đôi chân kỳ cựu gương mẫu, dẫn dắt và tiếp sức cho các con',
        flame_hint_adults: '🔥 Tính theo Tuần Kỷ Luật (đủ 2 buổi T6 & CN)',
        clubs_adults: [
          { min_km: 300, name: 'Club 300km · Huyền Thoại Pacer', badge: '👑', border_color: '#f59e0b', name_color: '#b45309' },
          { min_km: 200, name: 'Club 200km · Chiến Binh Tiên Phong', badge: '🥈', border_color: '#3b82f6', name_color: '#1d4ed8' },
          { min_km: 100, name: 'Club 100km · Bàn Chân Thép', badge: '🥉', border_color: '#10b981', name_color: '#047857' },
          { min_km: 50, name: 'Club 50km · Phụ Huynh Gương Mẫu', badge: '⚡', border_color: '#8b5cf6', name_color: '#6d28d9' },
        ],
        starter_enabled: true,
        starter_title_kids: '🌱 VƯỜN ƯƠM RUNNER NHÍ (< 25KM) · ĐANG TÍCH LŨY BƯỚC CHẠY',
        starter_subtitle_kids: 'Chặng đường vạn dặm bắt đầu từ bước chân đầu tiên. Tích lũy đủ 25km để chính thức thăng hạng lên Club 25km!',
        starter_title_adults: '🌱 TÂN BINH PACER & PHỤ HUYNH (< 50KM) · ĐANG TÍCH LŨY',
        starter_subtitle_adults: 'Đồng hành cùng các con trên từng dặm đường. Tích lũy đủ 50km để thăng hạng lên Club 50km!',
      }

      const defaultScoringRules = (camp.scoring_rules && Array.isArray(camp.scoring_rules) && camp.scoring_rules.length > 0)
        ? camp.scoring_rules
        : (camp.mode === 'cham_cong' ? [
            { label: 'Check-in GPS đúng ca', points: '+1' },
            { label: 'Đúng giờ không đi muộn / về sớm', points: '+1' },
            { label: 'Check-out GPS đầy đủ', points: '+1' },
            { label: 'Tuần chuyên cần 100% (đủ ca làm)', points: '+5' },
            { label: 'Tháng chuyên cần xuất sắc', points: '+10' },
          ] : camp.mode === 'clb_quanh_nam' ? [
            { label: 'Mỗi nhiệm vụ đạt', points: '+1' },
            { label: 'Buổi làm đủ nhiệm vụ', points: '+1' },
            { label: 'Có mặt offline đúng giờ', points: '+2' },
            { label: 'Tuần kỷ luật (đủ tất cả các buổi)', points: '+3' },
            { label: 'Đạt mốc 100km / 200km / 300km', points: '+10' },
          ] : [
            { label: 'Mỗi bài tập hoàn thành', points: '+1' },
            { label: 'Làm đủ bài tập trong buổi', points: '+1' },
            { label: 'Học đúng giờ & tương tác tích cực', points: '+2' },
            { label: 'Tuần học chuyên cần (đủ các buổi)', points: '+3' },
            { label: 'Hoàn thành chặng học xuất sắc', points: '+10' },
          ])

      setEditingCamp({
        ...camp,
        tasks: defaultTasks,
        scoring_rules: defaultScoringRules,
        has_divisions: camp.has_divisions ?? (camp.mode === 'cham_cong' ? false : true),
        scope: camp.scope || (camp.theme as any)?.scope || (camp.mode === 'cham_cong' ? 'branch' : camp.mode === 'clb_quanh_nam' ? 'club' : 'branch'),
        require_pin: camp.require_pin ?? true,
        theme: {
          ...(camp.theme || {}),
          admins: camp.theme?.admins || [],
          target_days: camp.theme?.target_days || (camp.mode === 'thoi_quen_ca_nhan' ? 60 : 30),
          start_date: camp.theme?.start_date || new Date().toISOString().split('T')[0],
          owner_name: camp.theme?.owner_name || 'Sếp Hoàng',
          owner_avatar: camp.theme?.owner_avatar || '🦁',
          owner_phone: camp.theme?.owner_phone || '0912345678',
          primary: camp.theme?.primary || (camp.mode === 'cham_cong' ? '#10b981' : camp.mode === 'clb_quanh_nam' ? '#e11d48' : '#4f46e5'),
          accent: camp.theme?.accent || (camp.mode === 'cham_cong' ? '#059669' : camp.mode === 'clb_quanh_nam' ? '#be123c' : '#4338ca'),
          light: camp.theme?.light || (camp.mode === 'cham_cong' ? '#ecfdf5' : camp.mode === 'clb_quanh_nam' ? '#ffe4e6' : '#eef2ff'),
          campaignTitle: camp.theme?.campaignTitle || (camp.mode === 'cham_cong' ? 'ĐIỂM DANH & CHẤM CÔNG CHI NHÁNH · KỶ LUẬT LAO ĐỘNG' : camp.club_months?.[0]?.themeTitle || 'CHIẾN DỊCH THÁNG 10 · BÀN TAY GẮN KẾT & KỶ LUẬT THÉP'),
          campaignSlogan: camp.theme?.campaignSlogan || (camp.mode === 'cham_cong' ? 'ĐÚNG GIỜ · TẬN TÂM · KỶ LUẬT KIẾN TẠO GIÁ TRỊ' : camp.club_months?.[0]?.themeSlogan || 'Đập tay 5 người ngược chiều · Hoàn thành cự ly · Giữ chuỗi tuần rực lửa'),
          locationText: camp.theme?.locationText || (camp.mode === 'cham_cong' ? 'VP VicEdu Chi Nhánh' : camp.mode === 'clb_quanh_nam' ? 'Công viên Văn Lang' : 'Phòng học Cambridge VicEdu'),
          scheduleText: camp.theme?.scheduleText || (camp.mode === 'cham_cong' ? 'Ca sáng P1 (07h30 - 17h30) · Ca tối P3 (13h45 - 21h45)' : camp.mode === 'clb_quanh_nam' ? 'Tuần 2 buổi · T6 17h30 & CN 05h30' : 'Tuần 2 buổi · T2 19h00 & T7 08h30'),
          canvaUrl: camp.theme?.canvaUrl || '',
          videoUrl: camp.theme?.videoUrl || '',
          careSuccessTpl: camp.theme?.careSuccessTpl || (camp.mode === 'cham_cong' ? 'Chúc mừng bạn {name} đã hoàn thành xuất sắc ngày công hôm nay!' : 'Chúc mừng {name} đã xuất sắc hoàn thành trọn vẹn nhiệm vụ ngày hôm nay! Hãy tiếp tục giữ vững ngọn lửa kỷ luật nhé!'),
          careReminderTpl: camp.theme?.careReminderTpl || (camp.mode === 'cham_cong' ? 'Nhắc nhở: Sắp tới giờ vào ca làm việc. Bạn {name} nhớ check-in đúng giờ nhé!' : 'Nhắc nhở: Sắp đến giờ sinh hoạt / hạn nộp bài hôm nay. Bạn {name} hãy chuẩn bị sẵn sàng và nộp báo cáo đúng giờ nhé!'),
          weeklySchedule: defaultWeeklySchedule,
          hall_of_fame: defaultHallOfFame,
        },
        logo: {
          icon: camp.logo?.icon || (camp.mode === 'cham_cong' ? '📍🏢' : camp.mode === 'clb_quanh_nam' ? '🏃‍♂️🔥' : '🎯📚'),
          text: camp.logo?.text || camp.title || 'VICEDU',
          badgeLabel: camp.logo?.badgeLabel || (camp.mode === 'cham_cong' ? 'CHẤM CÔNG CHI NHÁNH · VICHRM' : camp.mode === 'clb_quanh_nam' ? 'RUNNER NHÍ · RUNNER 19' : 'CAMBRIDGE IELTS'),
          imageUrl: camp.logo?.imageUrl || (camp.slug === 'rubisea-19' ? '/images/rubisea-logo.png' : ''),
        },
        sessions: normalizeCampSessions(camp.sessions || []),
        club_months: camp.mode === 'clb_quanh_nam' ? ((camp.club_months && Array.isArray(camp.club_months) && camp.club_months.length > 0) ? camp.club_months : DEFAULT_CLUB_MONTHS) : [],
      })
    } else {
      setEditingCamp({
        slug: "",
        title: "",
        subtitle: "",
        slogan: "KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ",
        mode: "clb_quanh_nam",
        status: "active",
        has_divisions: true,
        require_pin: true,
        scope: "admin_only",
        club_months: DEFAULT_CLUB_MONTHS,
        tasks: [
          { id: 'chay_km', name: 'Chạy bộ', type: 'number', unit: 'km', target: 3, color: '#e11d48', description: 'Chạy tối thiểu 3km mỗi buổi' },
          { id: 'dap_tay', name: 'Đập tay giao lưu', type: 'boolean', color: '#f59e0b', description: 'Đập tay chào người chạy ngược chiều' },
          { id: 'dung_gio', name: 'Có mặt đúng giờ', type: 'boolean', color: '#10b981', description: 'T6 17h30 / CN 05h30 có mặt đúng giờ' },
          { id: 'giup_ban', name: 'Hỗ trợ đồng đội', type: 'boolean', color: '#3b82f6', description: 'Chạy kèm bạn yếu hơn hoặc nhặt rác đường chạy' }
        ],
        scoring_rules: [
          { label: 'Mỗi nhiệm vụ đạt', points: '+1' },
          { label: 'Buổi làm đủ nhiệm vụ', points: '+1' },
          { label: 'Có mặt offline đúng giờ', points: '+2' },
          { label: 'Tuần kỷ luật (đủ tất cả các buổi)', points: '+3' },
          { label: 'Đạt mốc 100km / 200km / 300km', points: '+10' },
        ],
        theme: {
          primary: '#e11d48',
          accent: '#be123c',
          light: '#ffe4e6',
          campaignTitle: 'CHIẾN DỊCH THÁNG 10 · BÀN TAY GẮN KẾT & KỶ LUẬT THÉP',
          campaignSlogan: 'Đập tay 5 người ngược chiều · Hoàn thành cự ly · Giữ chuỗi tuần rực lửa',
          locationText: 'Công viên Văn Lang',
          scheduleText: 'Tuần 2 buổi · T6 17h30 & CN 05h30',
          canvaUrl: '',
          videoUrl: '',
          careSuccessTpl: 'Chúc mừng {name} đã xuất sắc hoàn thành trọn vẹn nhiệm vụ ngày hôm nay!',
          careReminderTpl: 'Nhắc nhở: Sắp đến giờ sinh hoạt hôm nay. Bạn {name} hãy chuẩn bị sẵn sàng nhé!',
          weeklySchedule: [
            { dayOfWeek: 5, dayLabel: "Thứ 6", timeStr: "17:30", location: "Công viên Văn Lang", sessionTitle: "Chạy tiếp sức chiều T6" },
            { dayOfWeek: 0, dayLabel: "Chủ Nhật", timeStr: "05:30", location: "Công viên Văn Lang", sessionTitle: "Long Run sáng Chủ Nhật" },
          ],
        },
        logo: {
          icon: '🏃‍♂️🔥',
          text: 'RUBISEA 19',
          badgeLabel: 'RUNNER NHÍ · RUNNER 19',
          imageUrl: '/images/rubisea-logo.png',
        },
        sessions: [],
      })
    }
    setModalSubTab("general")
    setShowCampModal(true)
  }

  const parseBranchesFromCamp = (c: any) => {
    const bg = c?.branch_gps;
    if (bg && Array.isArray(bg.branches) && bg.branches.length > 0) {
      return bg.branches;
    }
    if (bg && (bg.lat || bg.branch_name)) {
      return [{
        id: "b1",
        branch_name: bg.branch_name || "VP VicEdu Việt Trì (Trụ sở chính)",
        address: "Trụ sở chính",
        lat: bg.lat || 21.321146,
        lng: bg.lng || 105.393865,
        radius: bg.radius || 50,
      }];
    }
    return [
      { id: "b1", branch_name: "VP VicEdu Việt Trì (Trụ sở chính)", address: "Đại lộ Hùng Vương, TP. Việt Trì", lat: 21.321146, lng: 105.393865, radius: 50 },
      { id: "b2", branch_name: "VP VicEdu Việt Trì 2 (Nông Trang)", address: "Phường Nông Trang, TP. Việt Trì", lat: 21.315200, lng: 105.405100, radius: 50 },
      { id: "b3", branch_name: "VP VicEdu Lâm Thao", address: "Khu 5, TT. Lâm Thao, Phú Thọ", lat: 21.352400, lng: 105.281500, radius: 50 },
      { id: "b4", branch_name: "VP VicEdu Phù Ninh", address: "TT. Phong Châu, Phù Ninh, Phú Thọ", lat: 21.432100, lng: 105.321800, radius: 50 },
    ];
  };

  // Load initial camps
  const loadCamps = async () => {
    setLoading(true)
    const res = await getAdminCamps()
    if (res.success && res.camps) {
      setCamps(res.camps)
      if (res.camps.length > 0 && !selectedCampId) {
        setSelectedCampId(res.camps[0].id)
        const bList = parseBranchesFromCamp(res.camps[0])
        setBranchesList(bList)
        setSelectedBranchIndex(0)
        if (res.camps[0].shifts_config && res.camps[0].shifts_config.length > 0) {
          setShiftsForm(res.camps[0].shifts_config)
        }
      }
    }
    setLoading(false)
  }

  // Load members when selected camp changes
  const handleToggleMemberStatus = async (m: any) => {
    const newStatus = m.status === 'inactive' ? 'active' : 'inactive'
    // Optimistic local update
    setMembers(prev => prev.map(item => item.id === m.id ? { ...item, status: newStatus } : item))
    const res = await toggleMemberStatus(m.id, newStatus)
    if (!res.success) {
      alert("Lỗi cập nhật trạng thái: " + res.error)
      if (selectedCampId) loadMembers(selectedCampId)
    }
  }

  const [isPinningGps, setIsPinningGps] = useState(false);

  const handleResetDevice = async (m: any) => {
    if (!selectedCampId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn mở khóa thiết bị cho nhân sự "${m.name}"?\n\nSau khi mở khóa, nhân sự có thể đăng nhập và gắn điện thoại mới khi vào ca chấm công.`)) {
      return;
    }
    const res = await resetMemberDeviceBinding(selectedCampId, m.id);
    if (res.success) {
      setCamps(prev => prev.map(c => {
        if (c.id === selectedCampId) {
          const newBindings = { ...(c.theme?.device_bindings || {}) };
          delete newBindings[String(m.id)];
          return {
            ...c,
            theme: {
              ...(c.theme || {}),
              device_bindings: newBindings,
            }
          };
        }
        return c;
      }));
      alert(`Đã mở khóa thiết bị thành công cho "${m.name}"!`);
    } else {
      alert("Lỗi khi mở khóa thiết bị: " + (res.error || "Không xác định"));
    }
  };

  const handlePinCurrentGps = () => {
    if (!navigator.geolocation) {
      alert("Trình duyệt không hỗ trợ định vị GPS!");
      return;
    }
    if (!selectedCampId || !selectedCamp) return;

    const currentGps = selectedCamp.branch_gps;
    const confirmMsg = currentGps && currentGps.lat
      ? `Tọa độ Văn phòng hiện tại:\n• Lat: ${currentGps.lat}\n• Lng: ${currentGps.lng}\n• Bán kính: ${currentGps.radius || 100}m\n\nBạn đang đứng tại Văn phòng và muốn ghim vị trí này làm tọa độ chuẩn mới?`
      : `Bạn đang đứng tại Văn phòng đúng không?\nNhấn OK để hệ thống đo tọa độ GPS thực tế của bạn làm tâm điểm chấm công.`;

    if (!window.confirm(confirmMsg)) return;

    setIsPinningGps(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        const accuracy = Math.round(pos.coords.accuracy);

        const res = await updateCampBranchGps(selectedCampId, lat, lng, 100);
        setIsPinningGps(false);
        if (res.success) {
          setCamps(prev => prev.map(c => {
            if (c.id === selectedCampId) {
              return {
                ...c,
                branch_gps: {
                  ...(c.branch_gps || {}),
                  lat,
                  lng,
                  radius: 100,
                }
              };
            }
            return c;
          }));
          alert(`🎯 Đã ghim tọa độ văn phòng thành công!\n\n• Vĩ độ (Lat): ${lat}\n• Kinh độ (Lng): ${lng}\n• Bán kính cho phép: 100m\n• Độ chính xác GPS đo được: ~${accuracy}m`);
        } else {
          alert("Lỗi khi lưu tọa độ GPS: " + (res.error || "Không xác định"));
        }
      },
      (err) => {
        setIsPinningGps(false);
        alert(`Không thể lấy vị trí GPS: ${err.message}. Vui lòng kiểm tra quyền vị trí của trình duyệt!`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const loadMembers = async (campId: string) => {
    if (!campId) return
    const res = await getCampMembers(campId)
    if (res.success && res.members) {
      setMembers(res.members)
    }
  }

  // Load reports when selected camp or filter changes
  const loadReports = async (campId: string, filter: string) => {
    if (!campId) return
    const res = await getCampReports(campId, filter)
    if (res.success && res.reports) {
      setReports(res.reports)
    }
  }

  useEffect(() => {
    if (user?.role === "Super Admin") {
      loadCamps()
    }
  }, [user?.role])

  useEffect(() => {
    if (selectedCampId) {
      const camp = camps.find((c) => c.id === selectedCampId)
      if (camp) {
        const bList = parseBranchesFromCamp(camp)
        setBranchesList(bList)
        setSelectedBranchIndex(0)
        if (camp.shifts_config && camp.shifts_config.length > 0) {
          setShiftsForm(camp.shifts_config)
        }
      }
      loadMembers(selectedCampId)
      loadReports(selectedCampId, approvalFilter)
    }
  }, [selectedCampId, approvalFilter])

  // Lấy tọa độ GPS thiết bị hiện tại của Bố Hoàng cho chi nhánh đang chọn
  const handleDetectCurrentGPS = () => {
    if (!navigator.geolocation) {
      setGpsMessage("❌ Trình duyệt không hỗ trợ Geolocation.")
      return
    }
    setDetectingGps(true)
    setGpsMessage("📡 Đang định vị vệ tinh GPS thiết bị...")
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6))
        const lng = Number(pos.coords.longitude.toFixed(6))
        setBranchesList(prev => prev.map((b, idx) => idx === selectedBranchIndex ? { ...b, lat, lng } : b))
        setDetectingGps(false)
        const curName = branchesList[selectedBranchIndex]?.branch_name || `Chi nhánh ${selectedBranchIndex + 1}`
        setGpsMessage(`✅ Đã bắt tọa độ thành công cho [${curName}]: ${lat}, ${lng} (Độ chính xác: ±${Math.round(pos.coords.accuracy)}m)`)
      },
      (err) => {
        setDetectingGps(false)
        setGpsMessage(`⚠️ Lỗi định vị: ${err.message}. Bố Hoàng vui lòng cấp quyền vị trí hoặc lấy trên Google Maps.`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Lưu cấu hình GPS Đa Chi Nhánh & Ca làm việc vào Camp
  const handleSaveGpsAndShifts = async () => {
    if (!selectedCampId) return
    const camp = camps.find((c) => c.id === selectedCampId)
    if (!camp) return

    setLoading(true)
    const primary = branchesList[0] || { lat: 21.321146, lng: 105.393865, radius: 50, branch_name: "VP VicEdu Việt Trì" }
    const updatedCamp: CampData = {
      ...camp,
      branch_gps: {
        ...primary,
        branches: branchesList,
      },
      shifts_config: shiftsForm,
    }
    const res = await saveCamp(updatedCamp)
    if (res.success) {
      alert(`✅ Đã lưu cấu hình ${branchesList.length} Chi Nhánh GPS & Ca làm việc thành công!`)
      await loadCamps()
    } else {
      alert("❌ Lỗi: " + res.error)
    }
    setLoading(false)
  }

  // Duyệt hoặc từ chối báo cáo / giải trình
  const handleApproveReport = async (reportId: number, status: "approved" | "rejected") => {
    const reviewer = user?.full_name || "Bố Hoàng (Super Admin)"
    const res = await updateReportApproval(reportId, status, reviewer)
    if (res.success) {
      loadReports(selectedCampId, approvalFilter)
      loadCamps()
    } else {
      alert("Lỗi duyệt: " + res.error)
    }
  }

  // Xóa vĩnh viễn báo cáo / chấm công khỏi hàng đợi
  const handleDeleteReport = async (reportId: number, memberName?: string, sessionCode?: string) => {
    const confirmMsg = `Sếp có chắc chắn muốn XÓA BÁO CÁO của "${memberName || 'nhân sự'}" (Buổi/Ca: ${sessionCode || reportId}) không?\n\nBản ghi này sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.`
    if (!window.confirm(confirmMsg)) return
    const res = await deleteReport(reportId)
    if (res.success) {
      loadReports(selectedCampId, approvalFilter)
      loadCamps()
    } else {
      alert("Lỗi khi xóa: " + res.error)
    }
  }

  // Mở modal xuất Excel thông minh
  const handleOpenExportModal = () => {
    const curMonth = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).format(new Date())
    setExportMonth(curMonth || '2026-10')
    setExportBranch('all')
    setIsExportModalOpen(true)
  }

  // Thực thi xuất file Excel chấm công 2-Sheet (Bảng Công Tổng Hợp & Nhật Ký Chi Tiết)
  const handleExecuteExportExcel = async () => {
    if (!selectedCampId) return
    try {
      setIsGeneratingExcel(true)
      const res = await getCampExportData(selectedCampId)
      if (!res.success || !res.camp) {
        alert("Lỗi tải dữ liệu xuất Excel!")
        return
      }

      const { camp, members: expMembers, reports: expReports } = res
      let membersList = expMembers || []
      let reportsList = expReports || []

      // Lọc reports theo tháng
      if (exportMonth !== 'all') {
        reportsList = reportsList.filter((r: any) => {
          const sId = String(r.session_id || '')
          const subDate = r.submitted_at ? String(r.submitted_at).slice(0, 7) : ''
          return sId.includes(exportMonth) || subDate === exportMonth
        })
      }

      // Lọc theo chi nhánh
      if (exportBranch !== 'all') {
        const branchTarget = exportBranch.toLowerCase()
        reportsList = reportsList.filter((r: any) => {
          const bv = String(r.tasks?.branch_verified || '').toLowerCase()
          return bv.includes(branchTarget) || branchTarget.includes(bv)
        })
      }

      // 1. TẠO SHEET 1: BẢNG CÔNG TỔNG HỢP (MA TRẬN NGÀY 01 -> 31)
      let targetYear = 2026
      let targetMonthNum = 10
      if (exportMonth !== 'all' && exportMonth.includes('-')) {
        const parts = exportMonth.split('-').map(Number)
        targetYear = parts[0] || 2026
        targetMonthNum = parts[1] || 10
      }
      const daysInMonth = exportMonth !== 'all' ? new Date(targetYear, targetMonthNum, 0).getDate() : 31
      const dayCols = Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1
        return d < 10 ? `0${d}` : `${d}`
      })

      const matrixRows = membersList.map((member: any, idx: number) => {
        const row: Record<string, any> = {
          "STT": idx + 1,
          "Mã NV": member.id,
          "Họ và Tên": member.name || `NV #${member.id}`,
          "Số Điện Thoại": member.phone ? (String(member.phone).startsWith("'") ? String(member.phone) : `'${member.phone}`) : "",
          "Chức Vụ / Vai Trò": member.role_tag || "Nhân sự",
        }

        let totalShifts = 0
        let totalLateTimes = 0
        let totalEarlyTimes = 0
        let totalForgotTickets = 0

        dayCols.forEach(dayStr => {
          const fullDatePrefix = exportMonth !== 'all' ? `${exportMonth}-${dayStr}` : `-${dayStr}`
          const dayReports = reportsList.filter((r: any) => {
            if (r.member_id !== member.id) return false
            const sId = String(r.session_id || '')
            const subAt = r.submitted_at ? String(r.submitted_at).slice(0, 10) : ''
            return sId.includes(fullDatePrefix) || subAt.endsWith(fullDatePrefix)
          })

          if (dayReports.length === 0) {
            row[`Ngày ${dayStr}`] = "-"
            return
          }

          const r = dayReports[0]
          const tasks = r.tasks || {}
          const isForgot = tasks.is_forgot_punch
          const isApproved = r.approval_status === "approved" || tasks.approval_status === "approved"
          const isAttended = r.attended_session || isApproved
          const isDungGio = tasks.dung_gio
          const earlyMins = Number(tasks.early_minutes) || 0

          let dayStatus = ""
          if (isForgot) {
            totalForgotTickets++
            dayStatus = isApproved ? "Q (Duyệt)" : "Q (Chờ)"
            if (isAttended) totalShifts++
          } else if (isAttended) {
            totalShifts++
            if (!isDungGio) {
              totalLateTimes++
              dayStatus = "M (Muộn)"
            } else {
              dayStatus = "X (Đủ)"
            }

            if (earlyMins > 0) {
              totalEarlyTimes++
              dayStatus += ` / S(-${earlyMins}p)`
            }
          } else {
            dayStatus = "Vắng"
          }

          row[`Ngày ${dayStr}`] = dayStatus
        })

        const requiredDays = Math.max(daysInMonth - 4, 26)
        const diligenceRate = Math.min(100, Math.round((totalShifts / requiredDays) * 100))

        row["Tổng Ca Công"] = totalShifts
        row["Số Lần Muộn"] = totalLateTimes
        row["Số Lần Về Sớm"] = totalEarlyTimes
        row["Số Đơn Quên Chấm Công"] = totalForgotTickets
        row["Tỷ Lệ Chuyên Cần (%)"] = `${diligenceRate}%`

        return row
      })

      // 2. TẠO SHEET 2: NHẬT KÝ CHI TIẾT
      const detailRows = reportsList.map((r: any, idx: number) => {
        const member = (expMembers || []).find((m: any) => m.id === r.member_id)
        const tasks = r.tasks || {}
        const isForgot = tasks.is_forgot_punch

        let attendanceType = "Điểm danh GPS trực tiếp"
        if (isForgot) attendanceType = "Đơn giải trình quên chấm công"

        let statusIn = tasks.check_in_time ? (tasks.dung_gio ? "✨ Đúng giờ" : "⚠️ Đi muộn") : (tasks.check_in_time || "Chưa ghi nhận")
        let statusOut = tasks.check_out_time ? (tasks.early_minutes > 0 ? `⚠️ Về sớm ${tasks.early_minutes}p` : "✨ Đúng giờ") : "Chưa check-out"

        let approvalText = "Chờ duyệt"
        if (r.approval_status === "approved" || tasks.approval_status === "approved") approvalText = "Đã duyệt"
        else if (r.approval_status === "rejected" || tasks.approval_status === "rejected") approvalText = "Từ chối"

        return {
          "STT": idx + 1,
          "Thời Gian Gửi": r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN") : "",
          "Họ và Tên": member?.name || `Mã #${r.member_id}`,
          "Số Điện Thoại": member?.phone ? (String(member.phone).startsWith("'") ? String(member.phone) : `'${member.phone}`) : "",
          "Chức Vụ": member?.role_tag || "Nhân sự",
          "Chi Nhánh Làm Việc": tasks.branch_verified || "VP VicEdu Việt Trì",
          "Ca Làm Việc": tasks.shift_id || r.session_id || "Ca chuẩn",
          "Hình Thức": attendanceType,
          "Giờ Vào Ca": tasks.check_in_time || "–",
          "Tình Trạng Vào": statusIn,
          "Giờ Ra Ca": tasks.check_out_time || "–",
          "Tình Trạng Ra": statusOut,
          "Số Phút Về Sớm": tasks.early_minutes || 0,
          "Trạng Thái Duyệt": approvalText,
          "Người Duyệt": r.approved_by || "",
          "Ghi Chú Giải Trình": tasks.explanation_reason || r.difficulty_note || "",
        }
      })

      const wsSummary = XLSX.utils.json_to_sheet(matrixRows)
      const wsDetails = XLSX.utils.json_to_sheet(detailRows)

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Bảng Công Tổng Hợp")
      XLSX.utils.book_append_sheet(workbook, wsDetails, "Nhật Ký Chi Tiết")

      const safeTitle = camp.slug || "journey"
      const monthTag = exportMonth === "all" ? "Toan_Thoi_Gian" : exportMonth
      const branchTag = exportBranch === "all" ? "Tat_Ca_Chi_Nhanh" : exportBranch.replace(/\s+/g, "_")
      XLSX.writeFile(workbook, `Bang_Cham_Cong_${safeTitle}_${monthTag}_${branchTag}.xlsx`)

      setIsExportModalOpen(false)
    } catch (err: any) {
      alert("Lỗi xuất Excel: " + err.message)
    } finally {
      setIsGeneratingExcel(false)
    }
  }

  // Quản lý Tasks trong editingCamp
  const handleTaskChange = (index: number, field: string, value: any) => {
    if (!editingCamp || !editingCamp.tasks) return
    const updatedTasks = [...editingCamp.tasks]
    updatedTasks[index] = { ...updatedTasks[index], [field]: value }
    setEditingCamp({ ...editingCamp, tasks: updatedTasks })
  }

  const handleAddTask = () => {
    if (!editingCamp) return
    const currentTasks = editingCamp.tasks || []
    const newTask = {
      id: `task_${Date.now()}`,
      name: `Thử thách mới #${currentTasks.length + 1}`,
      type: "boolean" as const,
      color: "#3b82f6",
      description: "Mô tả yêu cầu nhiệm vụ này",
    }
    setEditingCamp({ ...editingCamp, tasks: [...currentTasks, newTask] })
  }

  const handleDeleteTask = (index: number) => {
    if (!editingCamp || !editingCamp.tasks || editingCamp.tasks.length <= 1) {
      alert("Hành trình cần duy trì tối thiểu 1 thử thách!")
      return
    }
    const updatedTasks = editingCamp.tasks.filter((_, i) => i !== index)
    setEditingCamp({ ...editingCamp, tasks: updatedTasks })
  }

  // Quản lý Lịch Cố Định Hàng Tuần (Weekly Recurring Schedule)
  const toggleWeeklyDay = (dayOfWeek: number, dayLabel: string) => {
    if (!editingCamp) return
    const schedule = editingCamp.theme?.weeklySchedule || []
    const exists = schedule.some((s: any) => s.dayOfWeek === dayOfWeek)

    let updatedSchedule: any[]
    if (exists) {
      updatedSchedule = schedule.filter((s: any) => s.dayOfWeek !== dayOfWeek)
    } else {
      updatedSchedule = [
        ...schedule,
        {
          dayOfWeek,
          dayLabel,
          timeStr: dayOfWeek === 0 ? "05:30" : "17:30",
          location: editingCamp.theme?.locationText || "Công viên Văn Lang",
          sessionTitle: `Buổi sinh hoạt ${dayLabel}`,
        },
      ].sort((a, b) => {
        const orderA = a.dayOfWeek === 0 ? 7 : a.dayOfWeek
        const orderB = b.dayOfWeek === 0 ? 7 : b.dayOfWeek
        return orderA - orderB
      })
    }

    setEditingCamp({
      ...editingCamp,
      theme: {
        ...editingCamp.theme,
        weeklySchedule: updatedSchedule,
      },
    })
  }

  const updateWeeklyDayField = (dayOfWeek: number, field: string, value: string) => {
    if (!editingCamp) return
    const schedule = (editingCamp.theme?.weeklySchedule || []).map((s: any) => {
      if (s.dayOfWeek === dayOfWeek) {
        return { ...s, [field]: value }
      }
      return s
    })
    setEditingCamp({
      ...editingCamp,
      theme: {
        ...editingCamp.theme,
        weeklySchedule: schedule,
      },
    })
  }

  // BỘ TỰ ĐỘNG SINH LỊCH (AUTO GENERATOR)
  const handleAutoGenerateSessions = () => {
    if (!editingCamp) return
    const weeklySchedule = editingCamp.theme?.weeklySchedule || []

    if (weeklySchedule.length === 0) {
      alert("Bố Hoàng vui lòng chọn ít nhất 1 ngày trong tuần trước khi bấm Sinh Lịch!")
      return
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    let generated: any[] = []

    if (editingCamp.mode === "clb_quanh_nam") {
      // Sinh lịch theo Tháng cho CLB Quanh Năm
      const [yStr, mStr] = genMonth.split("-")
      const year = parseInt(yStr, 10)
      const month = parseInt(mStr, 10)
      const lastDay = new Date(year, month, 0).getDate()
      const activeDays = weeklySchedule.map((s: any) => s.dayOfWeek)

      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(year, month - 1, day)
        const dayOfWeek = d.getDay()
        if (activeDays.includes(dayOfWeek)) {
          const rule = weeklySchedule.find((s: any) => s.dayOfWeek === dayOfWeek)
          const dayPad = day < 10 ? `0${day}` : `${day}`
          const mPad = month < 10 ? `0${month}` : `${month}`
          const dateStr = `${year}-${mPad}-${dayPad}`
          const shortDay = dayOfWeek === 0 ? "CN" : `T${dayOfWeek + 1}`

          generated.push({
            id: `s_${mPad}_${shortDay.toLowerCase()}_${day}`,
            sessionCode: `${shortDay} · ${dayPad}/${mPad}`,
            title: rule?.sessionTitle ? `${rule.sessionTitle}` : `Chạy ${rule?.dayLabel || shortDay}`,
            dateStr,
            timeStr: `${shortDay} ${rule?.timeStr || "17:30"}`,
            location: rule?.location || editingCamp.theme?.locationText || "Công viên Văn Lang",
            desc: `Lịch chạy định kỳ ${rule?.dayLabel || shortDay} lúc ${rule?.timeStr || "17:30"} tại ${rule?.location || "Công viên Văn Lang"}.`,
            isPast: dateStr < todayStr,
            isToday: dateStr === todayStr,
          })
        }
      }
    } else if (editingCamp.mode === "cham_cong") {
      // Sinh lịch Ca làm việc theo Tháng cho Chấm Công Chi Nhánh
      const [yStr, mStr] = genMonth.split("-")
      const year = parseInt(yStr, 10)
      const month = parseInt(mStr, 10)
      const lastDay = new Date(year, month, 0).getDate()
      const activeDays = weeklySchedule.map((s: any) => s.dayOfWeek)

      for (let day = 1; day <= lastDay; day++) {
        const d = new Date(year, month - 1, day)
        const dayOfWeek = d.getDay()
        if (activeDays.includes(dayOfWeek)) {
          const rule = weeklySchedule.find((s: any) => s.dayOfWeek === dayOfWeek)
          const dayPad = day < 10 ? `0${day}` : `${day}`
          const mPad = month < 10 ? `0${month}` : `${month}`
          const dateStr = `${year}-${mPad}-${dayPad}`
          const shortDay = dayOfWeek === 0 ? "CN" : `T${dayOfWeek + 1}`

          generated.push({
            id: `s_${mPad}_${shortDay.toLowerCase()}_${day}`,
            sessionCode: `${shortDay} · ${dayPad}/${mPad}`,
            title: rule?.sessionTitle ? `${rule.sessionTitle}` : `Ca làm việc ${rule?.dayLabel || shortDay}`,
            dateStr,
            timeStr: `${shortDay} ${rule?.timeStr || "07:30"}`,
            location: rule?.location || editingCamp.theme?.locationText || "VP VicEdu Chi Nhánh",
            desc: `Ca làm việc định kỳ ${rule?.dayLabel || shortDay} lúc ${rule?.timeStr || "07:30"} tại ${rule?.location || "VP Chi Nhánh"}. Chấm công GPS đúng giờ.`,
            isPast: dateStr < todayStr,
            isToday: dateStr === todayStr,
          })
        }
      }
    } else {
      // Sinh 24 hoặc 32 Buổi Học theo lộ trình cho Lớp Học
      const activeDays = weeklySchedule.map((s: any) => s.dayOfWeek)
      let curDate = new Date(genStartDate)
      let sessionNum = 1

      for (let step = 0; step < 365 && sessionNum <= genTotalCount; step++) {
        const dayOfWeek = curDate.getDay()
        if (activeDays.includes(dayOfWeek)) {
          const rule = weeklySchedule.find((s: any) => s.dayOfWeek === dayOfWeek)
          const y = curDate.getFullYear()
          const m = curDate.getMonth() + 1
          const d = curDate.getDate()
          const dayPad = d < 10 ? `0${d}` : `${d}`
          const mPad = m < 10 ? `0${m}` : `${m}`
          const dateStr = `${y}-${mPad}-${dayPad}`
          const shortDay = dayOfWeek === 0 ? "CN" : `T${dayOfWeek + 1}`
          const phaseId = sessionNum <= 8 ? "phase_1" : sessionNum <= 16 ? "phase_2" : sessionNum <= 24 ? "phase_3" : "phase_4"

          generated.push({
            id: `s_b${sessionNum}`,
            sessionCode: `B${sessionNum}`,
            title: rule?.sessionTitle ? `${rule.sessionTitle} (Buổi ${sessionNum})` : `Buổi ${sessionNum}: Lộ trình bài giảng`,
            dateStr,
            timeStr: `${shortDay} ${rule?.timeStr || "19:00"}`,
            location: rule?.location || "Phòng học Cambridge VicEdu",
            phaseId,
            desc: sessionNum === 12
              ? "🎯 Đánh giá tiến độ giữa khóa (Mid-term Assessment)"
              : sessionNum === 24
              ? "🏆 Kiểm tra tốt nghiệp cấp độ (Final Graduation Assessment)"
              : `Nội dung học tập và rèn luyện kỹ năng Buổi ${sessionNum}.`,
            isPast: dateStr < todayStr,
            isToday: dateStr === todayStr,
            isSpecialEvent: sessionNum === 12 || sessionNum === 24,
            specialBadge: sessionNum === 12 ? "📝 MID-TERM" : sessionNum === 24 ? "🏆 GRADUATION" : undefined,
          })
          sessionNum++
        }
        curDate.setDate(curDate.getDate() + 1)
      }
    }

    let combinedSessions: any[] = [];
    let updatedClubMonths = editingCamp.club_months || [];

    if (editingCamp.mode === "clb_quanh_nam" || editingCamp.mode === "cham_cong") {
      // 1. Đối với CLB Quanh Năm & Chấm Công Chi Nhánh: Sinh lịch THEO THÁNG (genMonth)
      // GIỮ NGUYÊN tất cả các buổi của các tháng khác (ví dụ: đang sinh tháng 11 thì giữ nguyên tháng 10, tháng 12, etc.)
      const otherMonthSessions = (editingCamp.sessions || []).filter(
        (s: any) => !s.dateStr || !s.dateStr.startsWith(genMonth)
      );

      // Giữ lại các Special Events của tháng này (nếu có)
      const specialEventsInGenMonth = (editingCamp.sessions || []).filter(
        (s: any) => s.isSpecialEvent && s.dateStr && s.dateStr.startsWith(genMonth)
      );

      // Gộp: các tháng khác + các buổi mới sinh của tháng này + sự kiện đặc biệt (loại trừ trùng ID)
      const thisMonthAll = [...generated, ...specialEventsInGenMonth];
      const sessionMap = new Map();
      [...otherMonthSessions, ...thisMonthAll].forEach(s => sessionMap.set(s.id, s));
      combinedSessions = Array.from(sessionMap.values()).sort((a: any, b: any) =>
        (a.dateStr || "").localeCompare(b.dateStr || "")
      );

      // Cập nhật mảng sessions trong club_months nếu là CLB Quanh Năm
      if (Array.isArray(updatedClubMonths)) {
        updatedClubMonths = updatedClubMonths.map((m: any) => {
          if (m.id === genMonth) {
            return { ...m, sessions: generated };
          }
          return m;
        });
      }
    } else {
      // 2. Đối với Khóa Học Theo Buổi (lop_hoc_buoi / thoi_quen_ca_nhan): Sinh toàn bộ lộ trình khóa học
      const specialEvents = (editingCamp.sessions || []).filter((s: any) => s.isSpecialEvent);
      combinedSessions = [...generated, ...specialEvents].sort((a: any, b: any) =>
        (a.dateStr || "").localeCompare(b.dateStr || "")
      );
    }

    setEditingCamp({
      ...editingCamp,
      sessions: combinedSessions,
      club_months: updatedClubMonths,
    });
    alert(`⚡ Đã tự động sinh thành công ${generated.length} buổi vào lịch trình ${genMonth || ''}! (Toàn bộ các tháng khác vẫn được giữ nguyên an toàn)`)
  }

  // Thêm sự kiện đặc biệt mới vào editingCamp
  const handleAddSpecialEvent = () => {
    if (!newEvent.title.trim() || !newEvent.dateStr) {
      alert("Vui lòng nhập tên sự kiện và ngày diễn ra!")
      return
    }

    const [y, m, d] = newEvent.dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dayShort = dayOfWeek === 0 ? "CN" : `T${dayOfWeek + 1}`;
    const dayPad = d < 10 ? `0${d}` : `${d}`;
    const monthPad = m < 10 ? `0${m}` : `${m}`;
    const dateFormatted = `${dayPad}/${monthPad}`;

    const timeOnly = (newEvent.timeStr || "05:30").replace(/^(CN|T[2-7])\s*/, '');
    const cleanTimeStr = `${dayShort} ${timeOnly || "05:30"}`;

    const currentSessions = editingCamp?.sessions || [];
    const hasParallel = currentSessions.some((s: any) => s.dateStr === newEvent.dateStr);

    const eventSession = {
      id: `event_${Date.now()}`,
      sessionCode: `${dayShort} · ${dateFormatted}`,
      title: newEvent.title.trim(),
      dateStr: newEvent.dateStr,
      timeStr: cleanTimeStr,
      location: newEvent.location.trim() || "Địa điểm tổ chức",
      isSpecialEvent: true,
      isParallel: hasParallel,
      scopeTag: "🏆 ĐOÀN THI ĐẤU",
      eventType: newEvent.eventType || "race",
      specialBadge: newEvent.specialBadge.trim() || "🏆 GIẢI ĐẤU",
      desc: newEvent.desc.trim() || "",
    }

    const updatedSessions = normalizeCampSessions([...currentSessions, eventSession]);

    // Đồng bộ vào club_months nếu là CLB quanh năm
    let updatedClubMonths = editingCamp?.club_months;
    const genMonth = newEvent.dateStr.slice(0, 7);
    if (editingCamp?.mode === "clb_quanh_nam" && Array.isArray(updatedClubMonths)) {
      updatedClubMonths = updatedClubMonths.map((m: any) => {
        if (m.id === genMonth) {
          const monthSessions = updatedSessions.filter((s: any) => s.dateStr && s.dateStr.startsWith(m.id));
          return { ...m, sessions: monthSessions };
        }
        return m;
      });
    }

    setEditingCamp({
      ...editingCamp!,
      sessions: updatedSessions,
      club_months: updatedClubMonths,
    })
    setNewEvent({
      title: "",
      dateStr: "",
      timeStr: `${dayShort} 05:30`,
      location: "",
      specialBadge: "🏆 GIẢI ĐẤU",
      desc: "",
      eventType: "race",
    })
  }

  const handleDeleteSession = (sessionId: string) => {
    if (!editingCamp) return
    const updatedSessions = (editingCamp.sessions || []).filter((s: any) => s.id !== sessionId)
    setEditingCamp({
      ...editingCamp,
      sessions: updatedSessions,
    })
  }

  // --- BẢO VỆ TUYỆT ĐỐI: CHỈ SUPER ADMIN ĐƯỢC XEM & SỬ DỤNG ---
  if (authLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "70vh", flexDirection: "column", gap: "1rem" }}>
        <RefreshCw className="animate-spin" size={32} style={{ color: "#4f46e5" }} />
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Đang xác thực quyền Quản trị tối cao...</p>
      </div>
    )
  }

  const isAllowedUser = ["Super Admin", "Admin", "Giáo viên", "Giám đốc"].includes(user?.role || "");
  if (!isAllowedUser) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "75vh", padding: "2rem" }}>
        <div style={{
          maxWidth: "520px",
          background: "var(--surface)",
          padding: "2.5rem",
          borderRadius: "16px",
          textAlign: "center",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
        }}>
          <div style={{ width: "64px", height: "64px", background: "#fef2f2", color: "#ef4444", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem" }}>
            <Lock size={32} />
          </div>
          <h2 style={{ fontSize: "1.35rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-main)" }}>
            Khu Vực Giới Hạn Quản Trị
          </h2>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Hệ thống <strong>Hành Trình & Chấm Công Tự Động</strong> hiện đang trong giai đoạn cấu hình và trải nghiệm riêng tư của Ban Điều Hành (Super Admin). Các vai trò khác tạm thời chưa được cấp quyền truy cập.
          </p>
          <div style={{ padding: "0.75rem 1rem", background: "rgba(79, 70, 229, 0.06)", borderRadius: "8px", fontSize: "0.85rem", color: "#4f46e5" }}>
            🛡️ Tài khoản hiện tại của bạn: <strong>{user?.full_name || "Nhân sự"}</strong> ({user?.role || "Chưa phân quyền"})
          </div>
        </div>
      </div>
    )
  }

  const selectedCamp = camps.find((c) => c.id === selectedCampId) || camps[0]

  return (
    <div style={{ padding: "1.75rem 2rem", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Executive Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        borderRadius: "16px",
        padding: "1.75rem 2rem",
        color: "white",
        marginBottom: "2rem",
        boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.3)",
        position: "relative",
        overflow: "hidden"
      }}>
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1.25rem" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", padding: "4px 12px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              <Shield size={14} style={{ color: "#fbbf24" }} />
              <span>Chế độ Trải nghiệm Riêng tư · Super Admin</span>
            </div>
            <h1 style={{ fontSize: "1.65rem", fontWeight: 800, margin: "0.25rem 0", letterSpacing: "-0.02em" }}>
              🏆 Trung Tâm Điều Hành Hành Trình & Chấm Công
            </h1>
            <p style={{ opacity: 0.85, fontSize: "0.88rem", maxWidth: "700px" }}>
              Quản trị tập trung 3 trụ cột: Lớp học VicEdu Cambridge · CLB Runner Nhí Rubisea · Điểm danh Chấm công GPS Chi nhánh VicHRM
            </p>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
            {/* NÚT XUẤT EXCEL 2-SHEET NỔI BẬT TRÊN HEADER CHÍNH THEO Ý BỐ HOÀNG */}
            <button
              type="button"
              onClick={handleOpenExportModal}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "0.85rem",
                padding: "0.65rem 1.15rem",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
                transition: "all 0.2s ease",
              }}
              title="Xuất bảng công tổng hợp (Matrix) & Nhật ký chi tiết ra file Excel (.xlsx)"
            >
              <Download size={16} />
              <span>📥 Xuất Bảng Lương & Công Excel</span>
            </button>

            <button
              onClick={() => openCampModal()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#f59e0b",
                color: "#1e1b4b",
                fontWeight: 700,
                fontSize: "0.85rem",
                padding: "0.65rem 1.15rem",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.35)",
              }}
            >
              <Plus size={16} />
              <span>Tạo Mới Hành Trình</span>
            </button>

            <button
              onClick={() => {
                const target = camps.find(c => c.mode === 'cham_cong') || camps.find(c => c.id === selectedCampId) || camps[0];
                if (target) {
                  setSelectedCampId(target.id);
                  const bList = parseBranchesFromCamp(target);
                  setBranchesList(bList);
                  setSelectedBranchIndex(0);
                  if (target.shifts_config && target.shifts_config.length > 0) {
                    setShiftsForm(target.shifts_config);
                  }
                }
                setIsAttendanceSettingsModalOpen(true);
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(255, 255, 255, 0.15)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.85rem",
                padding: "0.65rem 1.15rem",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              title="Cài đặt hàng rào GPS 4 chi nhánh & ca làm việc VicHRM"
            >
              <Settings size={16} />
              <span>Chấm Công & Ca Làm</span>
            </button>

            <button
              onClick={loadCamps}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.85rem",
                padding: "0.65rem",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer",
              }}
              title="Làm mới dữ liệu"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Bar */}
      <div style={{
        display: "flex",
        gap: "0.5rem",
        borderBottom: "2px solid var(--border)",
        marginBottom: "1.75rem",
      }}>
        {[
          { key: "camps", label: "⛺ Khóa Học & CLB (VicEdu & Rubisea)", icon: Award },
          { key: "approvals", label: "⚖️ Duyệt Giải Trình & Báo Cáo", icon: CheckCircle2, badge: camps.reduce((acc, c) => acc + (c.pendingCount || 0), 0) },
          { key: "members", label: "👥 Quản Lý Thành Viên & Mã PIN", icon: Users },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "0.75rem 1.25rem",
                fontSize: "0.9rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "#4f46e5" : "var(--text-muted)",
                background: "transparent",
                border: "none",
                borderBottom: isActive ? "3px solid #4f46e5" : "3px solid transparent",
                marginBottom: "-2px",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span style={{
                  background: "#ef4444",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: "999px",
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* TAB 1: KHÓA HỌC & CLB */}
      {activeTab === "camps" && (() => {
        const filteredCamps = camps.filter(camp => {
          if (scopeFilter !== 'all') {
            if (getCampScope(camp) !== scopeFilter) return false;
          }
          if (campSearch.trim()) {
            const q = campSearch.toLowerCase();
            return camp.title.toLowerCase().includes(q) || camp.slug.toLowerCase().includes(q);
          }
          return true;
        });

        const scopeCounts = {
          all: camps.length,
          admin_only: camps.filter(c => getCampScope(c) === 'admin_only').length,
          branch: camps.filter(c => getCampScope(c) === 'branch').length,
          partner: camps.filter(c => getCampScope(c) === 'partner').length,
          cham_cong: camps.filter(c => getCampScope(c) === 'cham_cong').length,
          thoi_quen: camps.filter(c => getCampScope(c) === 'thoi_quen').length,
        };

        const renderScopeBadge = (camp: any) => {
          const sc = getCampScope(camp);
          if (sc === 'thoi_quen') return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>🧘‍♂️ Thói quen</span>;
          if (sc === 'cham_cong') return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>📍 Chấm công</span>;
          if (sc === 'branch') return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }}>🏫 Lớp học tại chi nhánh</span>;
          if (sc === 'partner') return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: '#f3e8ff', color: '#6b21a8', border: '1px solid #e9d5ff' }}>🤝 Lớp thầy cô đối tác</span>;
          return <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>👑 Chỉ Super Admin</span>;
        };

        return (
          <div>
            {/* BỘ LỌC PHÂN LOẠI & TÌM KIẾM HÀNH TRÌNH CHUẨN HÓA */}
            <div style={{
              background: "var(--surface)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
              padding: "1rem 1.25rem",
              marginBottom: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.85rem",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
                {/* 4 Nhóm Phân Loại Quyền + Tất cả */}
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                  {[
                    { key: "all", label: "🌟 Tất cả", count: scopeCounts.all },
                    { key: "admin_only", label: "👑 Chỉ Super Admin", count: scopeCounts.admin_only },
                    { key: "branch", label: "🏫 Lớp học tại chi nhánh", count: scopeCounts.branch },
                    { key: "partner", label: "🤝 Lớp thầy cô đối tác", count: scopeCounts.partner },
                    { key: "cham_cong", label: "📍 Chấm công", count: scopeCounts.cham_cong },
                    { key: "thoi_quen", label: "🧘‍♂️ Thói quen", count: scopeCounts.thoi_quen },
                  ].map(f => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setScopeFilter(f.key as any)}
                      style={{
                        padding: "0.4rem 0.85rem",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: scopeFilter === f.key ? 700 : 500,
                        background: scopeFilter === f.key ? "#4f46e5" : "var(--background)",
                        color: scopeFilter === f.key ? "white" : "var(--text-main)",
                        border: scopeFilter === f.key ? "1px solid #4f46e5" : "1px solid var(--border)",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <span>{f.label}</span>
                      <span style={{
                        padding: "1px 6px",
                        borderRadius: "10px",
                        fontSize: "0.7rem",
                        background: scopeFilter === f.key ? "rgba(255,255,255,0.25)" : "var(--border)",
                        color: scopeFilter === f.key ? "white" : "var(--text-muted)",
                        fontWeight: 700,
                      }}>
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tìm kiếm & Chuyển đổi hiển thị Lưới / Danh Sách */}
                <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ position: "relative", minWidth: "240px" }}>
                    <input
                      type="text"
                      value={campSearch}
                      onChange={(e) => setCampSearch(e.target.value)}
                      placeholder="🔍 Tìm theo tên hoặc mã slug..."
                      style={{
                        width: "100%",
                        padding: "0.45rem 0.85rem",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        background: "var(--background)",
                        color: "var(--text-main)",
                        fontSize: "0.82rem",
                      }}
                    />
                  </div>

                  {/* View Mode Toggle: Lưới vs Danh Sách */}
                  <div style={{ display: "flex", background: "var(--background)", borderRadius: "8px", padding: "3px", border: "1px solid var(--border)" }}>
                    <button
                      type="button"
                      onClick={() => setCampViewMode("grid")}
                      style={{
                        padding: "0.35rem 0.7rem",
                        borderRadius: "6px",
                        border: "none",
                        background: campViewMode === "grid" ? "#4f46e5" : "transparent",
                        color: campViewMode === "grid" ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Hiển thị dạng Lưới Thẻ (Cards)"
                    >
                      <Layers size={13} />
                      <span>Lưới</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCampViewMode("list")}
                      style={{
                        padding: "0.35rem 0.7rem",
                        borderRadius: "6px",
                        border: "none",
                        background: campViewMode === "list" ? "#4f46e5" : "transparent",
                        color: campViewMode === "list" ? "white" : "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Hiển thị dạng Bảng Danh Sách (Table / List)"
                    >
                      <FileText size={13} />
                      <span>Danh sách</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* THANH THÔNG BÁO HÀNH TRÌNH ĐANG CHỌN (TIỆN ÍCH TRUY CẬP NHANH) */}
            {selectedCamp && (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0.75rem 1.15rem",
                background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
                borderRadius: "10px",
                border: "1px solid #c7d2fe",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "0.5rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#3730a3" }}>
                    📍 Đang chọn quản trị: <b>{selectedCamp.title}</b>
                  </span>
                  <span style={{ fontSize: "0.72rem", background: "#4338ca", color: "white", padding: "2px 8px", borderRadius: "6px", fontWeight: 600 }}>
                    {selectedCamp.slug}
                  </span>
                  {renderScopeBadge(selectedCamp)}
                </div>

                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <a
                    href={`${portalBaseUrl}/hanh-trinh/${selectedCamp.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "0.4rem 0.85rem",
                      borderRadius: "6px",
                      background: "#059669",
                      color: "white",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)"
                    }}
                    title="Mở giao diện Học viên / LMS / Chấm công của hành trình này trên Web 2"
                  >
                    <span>🔗 Mở Web Báo Cáo Học Viên</span>
                    <ExternalLink size={13} />
                  </a>

                  <button
                    type="button"
                    onClick={() => setActiveTab("members")}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "0.4rem 0.75rem",
                      borderRadius: "6px",
                      background: "#4f46e5",
                      color: "white",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer"
                    }}
                  >
                    <Users size={13} />
                    <span>Thành viên ({selectedCamp.memberCount})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openCampModal(selectedCamp)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "0.4rem 0.75rem",
                      borderRadius: "6px",
                      border: "1px solid #c7d2fe",
                      background: "white",
                      color: "#3730a3",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <Edit size={13} />
                    <span>Cấu hình</span>
                  </button>
                </div>
              </div>
            )}

            {filteredCamps.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", color: "var(--text-muted)" }}>
                <Compass size={40} style={{ margin: "0 auto 0.75rem", opacity: 0.6 }} />
                <p style={{ fontWeight: 600 }}>Không tìm thấy hành trình nào phù hợp với bộ lọc!</p>
              </div>
            ) : campViewMode === "grid" ? (
              /* CHẾ ĐỘ 1: DẠNG LƯỚI THẺ (GRID CARDS) - CLICK TRỰC TIẾP VÀO THẺ ĐỂ CHỌN */
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "1rem" }}>
                {filteredCamps.map((camp) => {
                  const isSelected = selectedCampId === camp.id;
                  return (
                    <div
                      key={camp.id}
                      onClick={() => setSelectedCampId(camp.id)}
                      style={{
                        background: "var(--surface)",
                        borderRadius: "12px",
                        border: isSelected ? "2px solid #4f46e5" : "1px solid var(--border)",
                        padding: "1.1rem",
                        boxShadow: isSelected ? "0 6px 20px rgba(79, 70, 229, 0.2)" : "0 2px 8px rgba(0,0,0,0.03)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="Click để chọn hành trình này để quản trị"
                    >
                      <div>
                        {/* Header của thẻ */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <div style={{ display: "flex", gap: "5px", alignItems: "center", flexWrap: "wrap" }}>
                            {renderScopeBadge(camp)}
                            {isSelected && (
                              <span style={{ fontSize: "0.65rem", fontWeight: 800, padding: "2px 6px", borderRadius: "4px", background: "#4f46e5", color: "white" }}>
                                ✓ ĐANG CHỌN
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              Mã: <code style={{ fontSize: "0.7rem" }}>{camp.slug}</code>
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCamp(camp);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#9ca3af",
                                cursor: "pointer",
                                padding: "2px",
                                display: "inline-flex",
                                alignItems: "center",
                                borderRadius: "4px",
                                transition: "color 0.15s",
                              }}
                              title={`Xóa vĩnh viễn hành trình "${camp.title}" và dọn sạch dữ liệu`}
                              onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
                              onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        <h3 style={{ fontSize: "1.02rem", fontWeight: 700, color: isSelected ? "#4f46e5" : "var(--text-main)", marginBottom: "0.25rem", lineHeight: 1.3 }}>
                          {camp.title}
                        </h3>
                        <p style={{
                          fontSize: "0.78rem",
                          color: "var(--text-muted)",
                          marginBottom: "0.55rem",
                          lineHeight: 1.35,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }} title={camp.subtitle || ""}>
                          {camp.subtitle || "Không có phụ đề"}
                        </p>

                        {/* Slogan */}
                        <div style={{
                          padding: "0.4rem 0.6rem",
                          background: "var(--background)",
                          borderRadius: "6px",
                          borderLeft: "3px solid #f59e0b",
                          fontSize: "0.74rem",
                          fontStyle: "italic",
                          marginBottom: "0.65rem",
                          color: "var(--text-main)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }} title={camp.slogan || "KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ"}>
                          "{camp.slogan || "KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ"}"
                        </div>

                        {/* Quick Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem", marginBottom: "0.75rem", textAlign: "center" }}>
                          <div style={{ padding: "0.35rem 0.4rem", background: "var(--background)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#4f46e5" }}>{camp.memberCount}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Thành viên</div>
                          </div>
                          <div style={{ padding: "0.35rem 0.4rem", background: "var(--background)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "1rem", fontWeight: 800, color: "#10b981" }}>{camp.reportCount}</div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Lượt nộp</div>
                          </div>
                          <div style={{ padding: "0.35rem 0.4rem", background: "var(--background)", borderRadius: "6px" }}>
                            <div style={{ fontSize: "1rem", fontWeight: 800, color: camp.pendingCount > 0 ? "#ef4444" : "#6b7280" }}>
                              {camp.pendingCount}
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Chờ duyệt</div>
                          </div>
                        </div>
                      </div>

                      {/* Nút Xem Web Báo Cáo + Actions */}
                      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.65rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
                        <a
                          href={`${portalBaseUrl}/hanh-trinh/${camp.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "5px",
                            padding: "0.45rem",
                            borderRadius: "6px",
                            background: "#ecfdf5",
                            color: "#065f46",
                            border: "1px solid #a7f3d0",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            textDecoration: "none",
                            transition: "all 0.15s ease",
                          }}
                          title="Mở giao diện Web 2 dành cho học viên / nhân sự"
                        >
                          <span>🔗 Xem Trang Báo Cáo Học Viên</span>
                          <ExternalLink size={13} />
                        </a>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.3rem" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloneCamp(camp);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "3px",
                              padding: "0.42rem 0.2rem",
                              borderRadius: "6px",
                              border: "1px solid #bfdbfe",
                              background: "#eff6ff",
                              color: "#2563eb",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                            }}
                            title="Nhân bản hành trình này thành một bản sao mới"
                          >
                            <Copy size={12} />
                            <span>Nhân bản</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampId(camp.id);
                              openCampModal(camp);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "3px",
                              padding: "0.42rem 0.2rem",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              background: "var(--background)",
                              color: "var(--text-main)",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                            }}
                            title="Cấu hình: Lịch tuần, Nhiệm vụ, Sự kiện"
                          >
                            <Edit size={12} />
                            <span>Cấu hình</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCampId(camp.id);
                              setActiveTab("members");
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "3px",
                              padding: "0.42rem 0.2rem",
                              borderRadius: "6px",
                              background: "#4f46e5",
                              color: "white",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              border: "none",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                            }}
                            title="Xem & Quản lý danh sách thành viên"
                          >
                            <Users size={12} />
                            <span>Thành viên</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openAdminModal(camp);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "3px",
                              padding: "0.42rem 0.2rem",
                              borderRadius: "6px",
                              background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                              color: "white",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              border: "none",
                              cursor: "pointer",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                            }}
                            title={`Phân quyền Ban Quản Trị & Giáo viên phụ trách (${(camp.theme?.admins || []).length || 1} QTV)`}
                          >
                            <Shield size={12} />
                            <span>QTV</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* CHẾ ĐỘ 2: DẠNG BẢNG DANH SÁCH (TABLE / LIST VIEW) */
              <div style={{ background: "var(--surface)", borderRadius: "12px", border: "1px solid var(--border)", overflowX: "auto", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
                  <thead>
                    <tr style={{ background: "var(--background)", borderBottom: "2px solid var(--border)" }}>
                      <th style={{ padding: "0.85rem 1rem" }}>Hành Trình / Khóa Học</th>
                      <th style={{ padding: "0.85rem 1rem" }}>Phân Loại Quyền</th>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Thành Viên</th>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Lượt Nộp</th>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>Chờ Duyệt</th>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "center" }}>QTV</th>
                      <th style={{ padding: "0.85rem 1rem", textAlign: "right" }}>Thao Tác Nhanh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCamps.map((camp) => {
                      const isSelected = selectedCampId === camp.id;
                      return (
                        <tr
                          key={camp.id}
                          onClick={() => setSelectedCampId(camp.id)}
                          style={{
                            borderBottom: "1px solid var(--border)",
                            background: isSelected ? "rgba(79, 70, 229, 0.08)" : "transparent",
                            cursor: "pointer",
                            transition: "background 0.15s ease",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "var(--background)";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "0.85rem 1rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <div>
                                <div style={{ fontWeight: 700, color: isSelected ? "#4f46e5" : "var(--text-main)", fontSize: "0.9rem" }}>
                                  {camp.title}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                  <code>{camp.slug}</code> · {camp.subtitle || "Không có phụ đề"}
                                </div>
                              </div>
                              {isSelected && (
                                <span style={{ fontSize: "0.62rem", fontWeight: 800, padding: "2px 5px", borderRadius: "4px", background: "#4f46e5", color: "white" }}>
                                  ✓ CHỌN
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "0.85rem 1rem" }}>
                            {renderScopeBadge(camp)}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 700, color: "#4f46e5" }}>
                            {camp.memberCount}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 700, color: "#10b981" }}>
                            {camp.reportCount}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 700, color: camp.pendingCount > 0 ? "#ef4444" : "#6b7280" }}>
                            {camp.pendingCount}
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "center", fontWeight: 600 }}>
                            <span style={{ padding: "2px 6px", borderRadius: "6px", background: "#f3e8ff", color: "#7c3aed", fontSize: "0.75rem" }}>
                              🛡️ {(camp.theme?.admins || []).length || 1}
                            </span>
                          </td>
                          <td style={{ padding: "0.85rem 1rem", textAlign: "right" }}>
                            <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                              <a
                                href={`${portalBaseUrl}/hanh-trinh/${camp.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "6px",
                                  background: "#ecfdf5",
                                  color: "#065f46",
                                  border: "1px solid #a7f3d0",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                                title="Xem trang Báo Cáo Học Viên trên Web 2"
                              >
                                <span>Xem Web</span>
                                <ExternalLink size={12} />
                              </a>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMobilePreviewCamp(camp);
                                }}
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  borderRadius: "6px",
                                  background: "#ecfdf5",
                                  color: "#059669",
                                  border: "1px solid #a7f3d0",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title="Mô phỏng giao diện người dùng trên điện thoại iPhone"
                              >
                                <Smartphone size={12} />
                                <span>📱 Mobile</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCloneCamp(camp);
                                }}
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  borderRadius: "6px",
                                  border: "1px solid #bfdbfe",
                                  background: "#eff6ff",
                                  color: "#2563eb",
                                  fontSize: "0.75rem",
                                  fontWeight: 700,
                                  cursor: "pointer",
                                }}
                                title="Nhân bản hành trình"
                              >
                                Nhân bản
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampId(camp.id);
                                  openCampModal(camp);
                                }}
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  background: "var(--background)",
                                  color: "var(--text-main)",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Cấu hình
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAdminModal(camp);
                                }}
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                                  color: "white",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                QTV
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCampId(camp.id);
                                  setActiveTab("members");
                                }}
                                style={{
                                  padding: "0.35rem 0.65rem",
                                  borderRadius: "6px",
                                  border: "none",
                                  background: "#4f46e5",
                                  color: "white",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Thành viên
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCamp(camp);
                                }}
                                style={{
                                  padding: "0.35rem 0.6rem",
                                  borderRadius: "6px",
                                  border: "1px solid #fecaca",
                                  background: "#fef2f2",
                                  color: "#ef4444",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title={`Xóa vĩnh viễn hành trình "${camp.title}"`}
                              >
                                <Trash2 size={12} />
                                <span>Xóa</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* MODAL CÀI ĐẶT HỆ THỐNG: CHẤM CÔNG CHI NHÁNH & CA LÀM (VICHRM) */}
      {isAttendanceSettingsModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setIsAttendanceSettingsModalOpen(false)}
        >
          <div
            style={{
              background: "var(--surface)",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "1200px",
              maxHeight: "92vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: "1.25rem 1.75rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#ffffff",
              position: "sticky",
              top: 0,
              zIndex: 30,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "#ecfdf5",
                  color: "#10b981",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.25rem",
                }}>
                  ⚙️
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-main)" }}>
                    Cấu Hình Chấm Công Chi Nhánh & Ca Làm (VicHRM)
                  </h3>
                  <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                    Cài đặt 1 lần dùng mãi mãi: Hàng rào định vị GPS 4 chi nhánh & khung giờ ca trực P1..P5
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                {/* BỘ CHỌN HÀNH TRÌNH ĐỂ CẤU HÌNH */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    🏢 Áp dụng cho:
                  </label>
                  <select
                    value={selectedCampId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedCampId(newId);
                      const target = camps.find(c => c.id === newId);
                      if (target) {
                        const bList = parseBranchesFromCamp(target);
                        setBranchesList(bList);
                        setSelectedBranchIndex(0);
                        if (target.shifts_config && target.shifts_config.length > 0) {
                          setShiftsForm(target.shifts_config);
                        }
                      }
                    }}
                    style={{
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      border: "1.5px solid #10b981",
                      background: "#f0fdf4",
                      color: "#166534",
                      fontWeight: 800,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      maxWidth: "280px",
                    }}
                  >
                    {camps.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.mode === 'cham_cong' ? '⭐ [Chấm Công] ' : ''}{c.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* NÚT XUẤT EXCEL BÁO CÁO LỒNG VÀO TRONG THEO Ý BỐ HOÀNG */}
                <button
                  type="button"
                  onClick={handleOpenExportModal}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "#0284c7",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    padding: "0.55rem 1rem",
                    borderRadius: "8px",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(2, 132, 199, 0.25)",
                    transition: "all 0.2s ease",
                  }}
                  title="Xuất bảng nhật ký điểm danh ra file Excel"
                >
                  <Download size={15} />
                  <span>Xuất Excel Báo Cáo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAttendanceSettingsModalOpen(false)}
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: "var(--background)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontSize: "1.1rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                  title="Đóng cửa sổ"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body: Grid 2 Cột */}
            <div style={{ padding: "1.75rem", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1.75rem" }}>
          {/* Card 1: Cấu hình GPS Geofencing Đa Chi Nhánh (VicEdu Multi-Branch) */}
          <div style={{
            background: "var(--surface)",
            padding: "1.75rem",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                    Hàng Rào Địa Lý GPS ({branchesList.length} Chi Nhánh VicEdu)
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                    Nhân viên có mặt tại bất kỳ chi nhánh nào trong bán kính đều được chấm công
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  const newB = {
                    id: `b_${Date.now()}`,
                    branch_name: `VP VicEdu Chi Nhánh ${branchesList.length + 1}`,
                    address: "Phú Thọ",
                    lat: 21.321852,
                    lng: 105.398214,
                    radius: 50,
                  };
                  setBranchesList([...branchesList, newB]);
                  setSelectedBranchIndex(branchesList.length);
                  setGpsMessage(null);
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#f0fdf4",
                  border: "1px solid #86efac",
                  color: "#15803d",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <span>➕</span> Thêm Chi Nhánh
              </button>
            </div>

            {/* THANH TAB CHỌN NHANH CÁC CHI NHÁNH */}
            <div style={{
              display: "grid",
              gridTemplateColumns: `repeat(auto-fit, minmax(130px, 1fr))`,
              gap: "8px",
              marginBottom: "1.25rem",
              background: "var(--background)",
              padding: "6px",
              borderRadius: "10px",
              border: "1px solid var(--border)",
            }}>
              {branchesList.map((b, idx) => {
                const isSel = idx === selectedBranchIndex;
                return (
                  <button
                    key={b.id || idx}
                    type="button"
                    onClick={() => {
                      setSelectedBranchIndex(idx);
                      setGpsMessage(null);
                    }}
                    style={{
                      padding: "0.6rem 0.75rem",
                      borderRadius: "8px",
                      border: isSel ? "1.5px solid #10b981" : "1px solid transparent",
                      background: isSel ? "#ffffff" : "transparent",
                      color: isSel ? "#065f46" : "var(--text-muted)",
                      fontWeight: isSel ? 800 : 600,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      textAlign: "left",
                      boxShadow: isSel ? "0 2px 6px rgba(16, 185, 129, 0.15)" : "none",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        📍 CN {idx + 1}
                      </span>
                      {isSel && (
                        <span style={{ fontSize: "0.65rem", background: "#dcfce7", color: "#166534", padding: "1px 5px", borderRadius: "4px" }}>
                          Đang sửa
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: isSel ? "#0f172a" : "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {b.branch_name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* FORM CHỈNH SỬA CHI NHÁNH ĐANG CHỌN */}
            {(() => {
              const curB = branchesList[selectedBranchIndex] || branchesList[0];
              if (!curB) return null;

              const updateCurB = (fields: Partial<typeof curB>) => {
                setBranchesList(prev => prev.map((item, i) => i === selectedBranchIndex ? { ...item, ...fields } : item));
              };

              return (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Tên Chi Nhánh ({selectedBranchIndex + 1}/{branchesList.length})
                      </label>
                      <input
                        type="text"
                        value={curB.branch_name}
                        onChange={(e) => updateCurB({ branch_name: e.target.value })}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontWeight: 700 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Địa Chỉ / Khu Vực
                      </label>
                      <input
                        type="text"
                        value={curB.address || ""}
                        placeholder="VD: Đại lộ Hùng Vương..."
                        onChange={(e) => updateCurB({ address: e.target.value })}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Vĩ độ (Latitude)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={curB.lat}
                        onChange={(e) => updateCurB({ lat: parseFloat(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontWeight: 600 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Kinh độ (Longitude)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={curB.lng}
                        onChange={(e) => updateCurB({ lng: parseFloat(e.target.value) || 0 })}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                      Bán kính cho phép check-in: <strong>{curB.radius || 50} mét</strong>
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="200"
                      step="5"
                      value={curB.radius || 50}
                      onChange={(e) => updateCurB({ radius: parseInt(e.target.value) })}
                      style={{ width: "100%", accentColor: "#10b981" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      <span>20m (Hẹp)</span>
                      <span>50m (Khuyên dùng)</span>
                      <span>100m</span>
                      <span>200m (Rộng)</span>
                    </div>
                  </div>

                  {/* Nút Lấy Tọa Độ & Xóa Chi Nhánh */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", paddingTop: "0.5rem" }}>
                    <button
                      type="button"
                      onClick={handleDetectCurrentGPS}
                      disabled={detectingGps}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        padding: "0.65rem 1.25rem",
                        borderRadius: "8px",
                        border: "none",
                        cursor: detectingGps ? "not-allowed" : "pointer",
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                      }}
                    >
                      <Navigation size={16} />
                      <span>{detectingGps ? "Đang định vị vệ tinh..." : `📍 Lấy Tọa Độ Cho [${curB.branch_name}]`}</span>
                    </button>

                    {branchesList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Bố Hoàng có chắc muốn xóa [${curB.branch_name}] khỏi danh sách chấm công?`)) {
                            const filtered = branchesList.filter((_, i) => i !== selectedBranchIndex);
                            setBranchesList(filtered);
                            setSelectedBranchIndex(Math.max(0, selectedBranchIndex - 1));
                          }
                        }}
                        style={{
                          background: "#fff1f2",
                          border: "1px solid #fecaca",
                          color: "#e11d48",
                          padding: "0.55rem 0.9rem",
                          borderRadius: "8px",
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        🗑️ Xóa Chi Nhánh Này
                      </button>
                    )}
                  </div>

                  {gpsMessage && (
                    <p style={{ marginTop: "0.25rem", fontSize: "0.82rem", color: gpsMessage.startsWith("✅") ? "#10b981" : "#ef4444" }}>
                      {gpsMessage}
                    </p>
                  )}
                </div>
              );
            })()}

            {/* DANH SÁCH TỔNG QUAN CÁC CHI NHÁNH */}
            <div style={{ marginTop: "1.25rem", borderTop: "1px dashed var(--border)", paddingTop: "1rem" }}>
              <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                📋 Danh Sách {branchesList.length} Chi Nhánh Đã Thiết Lập:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {branchesList.map((b, i) => (
                  <div
                    key={b.id || i}
                    onClick={() => setSelectedBranchIndex(i)}
                    style={{
                      padding: "0.55rem 0.75rem",
                      borderRadius: "8px",
                      background: i === selectedBranchIndex ? "#f0fdf4" : "var(--background)",
                      border: i === selectedBranchIndex ? "1.5px solid #86efac" : "1px solid var(--border)",
                      cursor: "pointer",
                      fontSize: "0.75rem",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ fontWeight: 800, color: i === selectedBranchIndex ? "#166534" : "var(--text-main)" }}>
                      🏢 {b.branch_name}
                    </div>
                    <div style={{ color: "var(--text-muted)", fontSize: "0.7rem", marginTop: "2px" }}>
                      {b.lat}, {b.lng} · <b>R={b.radius || 50}m</b>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{
              background: "rgba(79, 70, 229, 0.05)",
              border: "1px dashed #818cf8",
              borderRadius: "8px",
              padding: "0.85rem",
              fontSize: "0.8rem",
              color: "var(--text-main)",
              marginTop: "1rem",
            }}>
              💡 <strong>Cách lấy tọa độ từ Google Maps:</strong> Mở Google Maps trên máy tính/điện thoại, click chuột phải vào đúng điểm chi nhánh trung tâm, dòng đầu tiên chính là dãy số tọa độ (Ví dụ: <code>21.321852, 105.398214</code>). Bấm vào đó là đã copy!
            </div>
          </div>

          {/* Card 2: Ca làm việc chuẩn VicEdu P1-P5 */}
          <div style={{
            background: "var(--surface)",
            padding: "1.75rem",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Cấu Hình Ca Làm Việc (Shifts)</h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>Tự động đối soát giờ Check-in / Check-out tính đi muộn, về sớm</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newIdx = shiftsForm.length + 1;
                    const newShift = {
                      id: `P${newIdx}`,
                      name: `Ca P${newIdx}`,
                      start: "08:00",
                      end: "17:00",
                    };
                    const next = [...shiftsForm, newShift];
                    setShiftsForm(next);
                    setEditingShiftIndex(next.length - 1);
                    setEditingShiftData(newShift);
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    background: "#4f46e5",
                    color: "white",
                    border: "none",
                    padding: "0.45rem 0.85rem",
                    borderRadius: "8px",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: "0 2px 6px rgba(79, 70, 229, 0.2)",
                  }}
                  title="Thêm ca làm việc mới"
                >
                  <Plus size={14} />
                  <span>+ Thêm Ca</span>
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                {shiftsForm.map((shift, idx) => (
                  editingShiftIndex === idx ? (
                    <div
                      key={shift.id || idx}
                      style={{
                        background: "#f5f3ff",
                        border: "1.5px solid #818cf8",
                        borderRadius: "10px",
                        padding: "0.85rem",
                        boxShadow: "0 2px 8px rgba(79, 70, 229, 0.08)",
                      }}
                    >
                      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4338ca", display: "block", marginBottom: "3px" }}>
                            Tên Ca Làm:
                          </label>
                          <input
                            type="text"
                            value={editingShiftData.name}
                            onChange={(e) => setEditingShiftData({ ...editingShiftData, name: e.target.value })}
                            placeholder="VD: Ca P1, Ca Sáng..."
                            style={{
                              width: "100%",
                              padding: "0.45rem 0.65rem",
                              borderRadius: "6px",
                              border: "1px solid #c7d2fe",
                              background: "#fff",
                              color: "#0f172a",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4338ca", display: "block", marginBottom: "3px" }}>
                            Giờ Vào:
                          </label>
                          <input
                            type="time"
                            value={editingShiftData.start}
                            onChange={(e) => setEditingShiftData({ ...editingShiftData, start: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "0.45rem 0.65rem",
                              borderRadius: "6px",
                              border: "1px solid #c7d2fe",
                              background: "#fff",
                              color: "#0f172a",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#4338ca", display: "block", marginBottom: "3px" }}>
                            Giờ Ra:
                          </label>
                          <input
                            type="time"
                            value={editingShiftData.end}
                            onChange={(e) => setEditingShiftData({ ...editingShiftData, end: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "0.45rem 0.65rem",
                              borderRadius: "6px",
                              border: "1px solid #c7d2fe",
                              background: "#fff",
                              color: "#0f172a",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px" }}>
                        <button
                          type="button"
                          onClick={() => setEditingShiftIndex(null)}
                          style={{
                            padding: "0.35rem 0.75rem",
                            borderRadius: "6px",
                            border: "1px solid var(--border)",
                            background: "#fff",
                            color: "var(--text-main)",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingShiftData.name.trim()) {
                              alert("Vui lòng nhập tên ca làm việc!");
                              return;
                            }
                            const next = [...shiftsForm];
                            next[idx] = {
                              ...next[idx],
                              name: editingShiftData.name.trim(),
                              start: editingShiftData.start || "08:00",
                              end: editingShiftData.end || "17:00",
                            };
                            setShiftsForm(next);
                            setEditingShiftIndex(null);
                          }}
                          style={{
                            padding: "0.35rem 0.85rem",
                            borderRadius: "6px",
                            border: "none",
                            background: "#4f46e5",
                            color: "#fff",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          ✓ Xong
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={shift.id || idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.6rem 0.85rem",
                        background: "var(--background)",
                        borderRadius: "8px",
                        border: "1px solid var(--border)",
                        gap: "0.5rem",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#4f46e5", minWidth: "55px" }}>
                          {shift.name}
                        </span>
                        <div style={{ fontSize: "0.82rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>Vào: </span>
                          <strong>{shift.start}</strong>
                        </div>
                        <div style={{ fontSize: "0.82rem" }}>
                          <span style={{ color: "var(--text-muted)" }}>Ra: </span>
                          <strong>{shift.end}</strong>
                        </div>
                        <span style={{ fontSize: "0.72rem", background: "#d1fae5", color: "#065f46", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                          Hoạt động
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingShiftIndex(idx);
                            setEditingShiftData({
                              id: shift.id,
                              name: shift.name,
                              start: shift.start || "08:00",
                              end: shift.end || "17:00",
                            });
                          }}
                          style={{
                            background: "#eef2ff",
                            border: "1px solid #c7d2fe",
                            color: "#4f46e5",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Sửa ca làm này"
                        >
                          <Edit size={13} />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc muốn xóa [${shift.name}] không?`)) {
                              const next = shiftsForm.filter((_, i) => i !== idx);
                              setShiftsForm(next);
                              if (editingShiftIndex === idx) setEditingShiftIndex(null);
                            }
                          }}
                          style={{
                            background: "#fff1f2",
                            border: "1px solid #fecaca",
                            color: "#ef4444",
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Xóa ca làm này"
                        >
                          <Trash2 size={13} />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={async () => {
                  await handleSaveGpsAndShifts();
                  setIsAttendanceSettingsModalOpen(false);
                }}
                disabled={loading}
                style={{
                  width: "100%",
                  background: "#4f46e5",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                }}
              >
                💾 Lưu Cấu Hình Tọa Độ GPS & Ca Làm Việc
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "1rem 1.75rem",
          borderTop: "1px solid var(--border)",
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "10px",
          position: "sticky",
          bottom: 0,
          zIndex: 30,
          boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.05)",
        }}>
          <button
            type="button"
            onClick={() => setIsAttendanceSettingsModalOpen(false)}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-main)",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={async () => {
              await handleSaveGpsAndShifts();
              setIsAttendanceSettingsModalOpen(false);
            }}
            disabled={loading}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "0.6rem 1.5rem",
              borderRadius: "8px",
              border: "none",
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "white",
              fontSize: "0.85rem",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
            }}
          >
            <span>💾 Lưu Cấu Hình & Hoàn Tất</span>
          </button>
        </div>
      </div>
    </div>
  )}

      {/* TAB: DUYỆT GIẢI TRÌNH & BÁO CÁO */}
      {activeTab === "approvals" && (
        <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Hàng Đợi Duyệt Chấm Công & Điểm Danh</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Xét duyệt các trường hợp check-in ngoài tọa độ, quên bấm công hoặc xin phép vắng mặt
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              {[
                { key: "all", label: "Tất cả" },
                { key: "pending_approval", label: "⏳ Chờ duyệt" },
                { key: "approved", label: "✅ Đã duyệt" },
                { key: "rejected", label: "❌ Từ chối" },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setApprovalFilter(f.key)}
                  style={{
                    padding: "0.45rem 0.85rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: approvalFilter === f.key ? 700 : 500,
                    background: approvalFilter === f.key ? "#4f46e5" : "var(--background)",
                    color: approvalFilter === f.key ? "white" : "var(--text-main)",
                    border: "1px solid var(--border)",
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}

              <button
                type="button"
                onClick={handleOpenExportModal}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  background: "var(--background)",
                  color: "#0284c7",
                  border: "1px solid #bae6fd",
                  cursor: "pointer",
                }}
                title="Xuất bảng nhật ký điểm danh ra Excel"
              >
                <Download size={14} />
                <span>Xuất Excel</span>
              </button>
            </div>
          </div>

          {reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
              <CheckCircle2 size={40} style={{ color: "#10b981", margin: "0 auto 0.75rem", opacity: 0.8 }} />
              <p style={{ fontSize: "0.95rem", fontWeight: 600 }}>Không có bản ghi nào theo bộ lọc này!</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ background: "var(--background)", borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                    <th style={{ padding: "0.75rem" }}>Thành Viên / Nhân Sự</th>
                    <th style={{ padding: "0.75rem" }}>Buổi / Ca</th>
                    <th style={{ padding: "0.75rem" }}>Thời Gian Báo Cáo</th>
                    <th style={{ padding: "0.75rem" }}>Nhiệm Vụ / Check-in</th>
                    <th style={{ padding: "0.75rem" }}>Lý Do / Giải Trình</th>
                    <th style={{ padding: "0.75rem" }}>Trạng Thái</th>
                    <th style={{ padding: "0.75rem", textAlign: "right" }}>Thao Tác</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-main)" }}>{r.member?.name || `ID #${r.member_id}`}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {r.member?.role_tag} · PIN: {r.member?.phone_last4 || "----"}
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span style={{ fontWeight: 600, color: "#4f46e5" }}>{r.session_id || r.shift_code || "---"}</span>
                      </td>
                      <td style={{ padding: "0.75rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN") : "---"}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {r.attended_session ? (
                          <span style={{ color: "#10b981", fontWeight: 600 }}>✅ Có mặt (Đủ công)</span>
                        ) : (
                          <span style={{ color: "#ef4444", fontWeight: 600 }}>❌ Vắng mặt</span>
                        )}
                        {r.tasks?.chay_km && (
                          <div style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700 }}>
                            🏃 Đã chạy: {r.tasks.chay_km} km
                          </div>
                        )}
                        {r.tasks?.proof_image && (
                          <div style={{ marginTop: "6px" }}>
                            <img
                              src={r.tasks.proof_image}
                              alt="Ảnh minh chứng"
                              style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: "1.5px solid #6366f1", cursor: "pointer" }}
                              onClick={() => setPreviewProofImage(r.tasks.proof_image)}
                              title="Bấm để phóng to xem ảnh minh chứng"
                            />
                            <div style={{ fontSize: "0.7rem", color: "#6366f1", fontWeight: 600, cursor: "pointer" }} onClick={() => setPreviewProofImage(r.tasks.proof_image)}>
                              🔍 Xem ảnh
                            </div>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem", maxWidth: "250px" }}>
                        {r.difficulty_note ? (
                          <div style={{ background: "rgba(245, 158, 11, 0.1)", color: "#b45309", padding: "4px 8px", borderRadius: "6px", fontSize: "0.8rem" }}>
                            {r.difficulty_note}
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>Bình thường</span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {r.approval_status === "approved" ? (
                          <span style={{ background: "#d1fae5", color: "#065f46", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                            Đã duyệt ({r.approved_by || "Bố Hoàng"})
                          </span>
                        ) : r.approval_status === "rejected" ? (
                          <span style={{ background: "#fee2e2", color: "#991b1b", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                            Từ chối
                          </span>
                        ) : (
                          <span style={{ background: "#fef3c7", color: "#92400e", padding: "3px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700 }}>
                            Chờ duyệt
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.35rem" }}>
                          <button
                            onClick={() => handleApproveReport(r.id, "approved")}
                            style={{
                              background: "#10b981",
                              color: "white",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            title="Duyệt bản ghi này"
                          >
                            Duyệt
                          </button>
                          <button
                            onClick={() => handleApproveReport(r.id, "rejected")}
                            style={{
                              background: "#ef4444",
                              color: "white",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            title="Từ chối bản ghi này"
                          >
                            Từ chối
                          </button>
                          <button
                            onClick={() => handleDeleteReport(r.id, r.member?.name, r.session_id)}
                            style={{
                              background: "#64748b",
                              color: "white",
                              border: "none",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "2px",
                            }}
                            title="Xóa vĩnh viễn bản ghi chấm công này khỏi hệ thống"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: THÀNH VIÊN & MÃ PIN */}
      {activeTab === "members" && (
        <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "1.5rem" }}>
          {/* BANNER CHỈ ĐỊNH RÕ HÀNH TRÌNH ĐANG QUẢN TRỊ */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            padding: "0.85rem 1.25rem",
            background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%)",
            border: "1px solid rgba(79, 70, 229, 0.25)",
            borderRadius: "12px",
            marginBottom: "1.25rem",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.9rem", fontWeight: 800, color: "#4f46e5", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>📍 Đang quản trị thành viên của:</span>
              </span>
              <select
                value={selectedCampId}
                onChange={(e) => {
                  setSelectedCampId(e.target.value)
                  loadMembers(e.target.value)
                  loadReports(e.target.value, approvalFilter)
                }}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  border: "2px solid #6366f1",
                  background: "var(--surface)",
                  color: "var(--text-main)",
                  fontWeight: 800,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                {camps.map((c) => (
                  <option key={c.id || c.slug} value={c.id}>
                    {c.title} ({c.mode === 'cham_cong' ? '📍 Chấm Công' : c.mode === 'clb_quanh_nam' ? '🏃 CLB Chạy' : '📚 Lớp Học'})
                  </option>
                ))}
              </select>
              <span style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "6px",
                background: selectedCamp?.mode === 'cham_cong' ? '#ecfdf5' : selectedCamp?.mode === 'clb_quanh_nam' ? '#ffe4e6' : '#e0e7ff',
                color: selectedCamp?.mode === 'cham_cong' ? '#065f46' : selectedCamp?.mode === 'clb_quanh_nam' ? '#be123c' : '#4338ca',
                border: selectedCamp?.mode === 'cham_cong' ? '1px solid #a7f3d0' : selectedCamp?.mode === 'clb_quanh_nam' ? '1px solid #fecdd3' : '1px solid #c7d2fe',
              }}>
                {selectedCamp?.mode === 'cham_cong' ? '📍 CHẤM CÔNG CHI NHÁNH' : selectedCamp?.mode === 'clb_quanh_nam' ? '🏃 CLB QUANH NĂM' : '📚 LỚP HỌC BUỔI'}
              </span>
            </div>
            <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Tổng số: <b>{members.length}</b> thành viên
            </div>
          </div>

          {/* BỘ LỌC PHÂN BẢNG RUNNER NHÍ VS RUNNER LỚN (CHO CLB CHẠY BỘ) */}
          {selectedCamp?.mode === 'clb_quanh_nam' && (
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", marginRight: "0.25rem" }}>
                🏁 Lọc bảng thi đua:
              </span>
              {[
                { key: "all", label: "🌟 Tất cả", count: members.length },
                { key: "kids", label: "🏃 Bảng Runner Nhí (U15)", count: members.filter(isKid).length },
                { key: "adults", label: "👨‍👩‍👧 Bảng Runner Lớn & Phụ Huynh", count: members.filter(m => !isKid(m)).length },
              ].map(div => (
                <button
                  key={div.key}
                  type="button"
                  onClick={() => setMemberDivisionFilter(div.key as any)}
                  style={{
                    padding: "0.4rem 0.85rem",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: memberDivisionFilter === div.key ? 700 : 500,
                    background: memberDivisionFilter === div.key ? "#4f46e5" : "var(--background)",
                    color: memberDivisionFilter === div.key ? "white" : "var(--text-main)",
                    border: memberDivisionFilter === div.key ? "1px solid #4f46e5" : "1px solid var(--border)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {div.label} ({div.count})
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                {selectedCamp?.mode === 'cham_cong' ? 'Danh Sách Cán Bộ & Nhân Sự Chấm Công' : selectedCamp?.mode === 'clb_quanh_nam' ? 'Danh Sách Runner Rubisea' : 'Danh Sách Học Viên Lớp Học'} (
                {members.filter(m => {
                  if (selectedCamp?.mode === 'clb_quanh_nam') {
                    if (memberDivisionFilter === 'kids') return isKid(m);
                    if (memberDivisionFilter === 'adults') return !isKid(m);
                  }
                  return true;
                }).length} người)
                <span style={{ fontSize: "0.78rem", fontWeight: 700, marginLeft: "10px", verticalAlign: "middle" }}>
                  <span style={{ color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                    🟢 {members.filter(m => m.status !== 'inactive').length} ON (Đang hoạt động)
                  </span>
                  {members.some(m => m.status === 'inactive') && (
                    <span style={{ color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: "12px", border: "1px solid #fecaca", marginLeft: "6px" }}>
                      🔴 {members.filter(m => m.status === 'inactive').length} OFF (Đã nghỉ)
                    </span>
                  )}
                </span>
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                {selectedCamp?.mode === 'cham_cong'
                  ? 'Quản lý mã PIN 4 số, chức vụ chi nhánh, vé quên công và ngày công'
                  : selectedCamp?.mode === 'clb_quanh_nam'
                  ? 'Quản lý mã PIN 4 số, phân bảng Runner nhí/lớn, tổng km tích lũy'
                  : 'Quản lý mã PIN 4 số, vai trò học viên và điểm tích lũy học tập'}
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
              {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (
                <button
                  type="button"
                  onClick={handlePinCurrentGps}
                  disabled={isPinningGps}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
                    color: "white",
                    padding: "0.55rem 1.15rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: isPinningGps ? "wait" : "pointer",
                    boxShadow: "0 2px 8px rgba(2, 132, 199, 0.3)",
                  }}
                  title="Lấy vị trí GPS bạn đang đứng để ghim làm tọa độ Văn phòng (Bán kính 100m)"
                >
                  <MapPin size={16} />
                  <span>{isPinningGps ? "⏳ Đang dò GPS..." : "📍 Ghim Tọa Độ VP (Chỗ Tôi Đang Đứng)"}</span>
                </button>
              )}

              {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (
                <button
                  type="button"
                  onClick={() => handleOpenAddMemberModal('branch_staff')}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    padding: "0.55rem 1.15rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(16, 185, 129, 0.3)",
                  }}
                >
                  <Building2 size={16} />
                  <span>🏢 Nạp Nhân Sự Chi Nhánh (VicHRM)</span>
                </button>
              )}

              {selectedCamp?.mode === 'lop_hoc_buoi' && (
                <button
                  type="button"
                  onClick={() => handleOpenAddMemberModal('class_students')}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                    color: "white",
                    padding: "0.55rem 1.15rem",
                    borderRadius: "8px",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  <GraduationCap size={16} />
                  <span>📚 Nạp Cả Lớp Học 1-Chạm (VicEdu LMS)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenAddMemberModal('manual')}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: selectedCamp?.mode === 'cham_cong' || selectedCamp?.mode === 'lop_hoc_buoi' ? "var(--background)" : "#4f46e5",
                  color: selectedCamp?.mode === 'cham_cong' || selectedCamp?.mode === 'lop_hoc_buoi' ? "var(--text-main)" : "white",
                  border: selectedCamp?.mode === 'cham_cong' || selectedCamp?.mode === 'lop_hoc_buoi' ? "1px solid var(--border)" : "none",
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={16} />
                <span>+ Thêm Thủ Công</span>
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>STT / ID</th>
                  <th style={{ padding: "0.75rem" }}>Họ và Tên</th>
                  {selectedCamp?.mode === 'clb_quanh_nam' && (
                    <th style={{ padding: "0.75rem" }}>Phân Bảng</th>
                  )}
                  <th style={{ padding: "0.75rem" }}>Số Điện Thoại</th>
                  <th style={{ padding: "0.75rem" }}>Mã PIN (4 Số)</th>
                  <th style={{ padding: "0.75rem" }}>Vai Trò</th>
                  <th style={{ padding: "0.75rem" }}>
                    {selectedCamp?.mode === 'cham_cong' ? 'Số Ngày Công Tích Lũy' : selectedCamp?.mode === 'clb_quanh_nam' ? 'Km Khởi Điểm (Ngoài HT)' : 'Điểm / Sao Tích Lũy'}
                  </th>
                  {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (
                    <th style={{ padding: "0.75rem" }}>Vé Quên Chấm Công</th>
                  )}
                  {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (
                    <th style={{ padding: "0.75rem" }}>Thiết Bị Điểm Danh</th>
                  )}
                  <th style={{ padding: "0.75rem", textAlign: "center" }}>Trạng Thái</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {members
                  .filter(m => {
                    if (selectedCamp?.mode === 'clb_quanh_nam') {
                      if (memberDivisionFilter === 'kids') return isKid(m);
                      if (memberDivisionFilter === 'adults') return !isKid(m);
                    }
                    return true;
                  })
                  .map((m, idx) => (
                    <tr key={m.id} style={{ borderBottom: "1px solid var(--border)", opacity: m.status === 'inactive' ? 0.62 : 1, background: m.status === 'inactive' ? "rgba(0,0,0,0.02)" : "transparent" }}>
                      <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>#{m.id}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: "rgba(79, 70, 229, 0.1)",
                            color: "#4f46e5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            overflow: "hidden",
                            flexShrink: 0,
                          }}>
                            {m.avatar_url ? (
                              <img src={m.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            ) : (
                              m.name ? m.name.charAt(0) : "U"
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: m.status === 'inactive' ? "var(--text-muted)" : "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ textDecoration: m.status === 'inactive' ? 'line-through' : 'none' }}>{m.name}</span>
                              {m.is_elite && <span title="Elite Runner">👑</span>}
                              {m.status === 'inactive' && (
                                <span style={{ fontSize: "0.68rem", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca", padding: "1px 6px", borderRadius: "4px", fontWeight: 700 }}>
                                  ĐÃ NGHỈ
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      {selectedCamp?.mode === 'clb_quanh_nam' && (
                        <td style={{ padding: "0.75rem" }}>
                          {isKid(m) ? (
                            <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 800 }}>
                              🌟 Runner Nhí
                            </span>
                          ) : (
                            <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                              👨‍👩‍👧 Runner Lớn
                            </span>
                          )}
                        </td>
                      )}
                      <td style={{ padding: "0.75rem" }}>{m.phone || "---"}</td>
                      <td style={{ padding: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            background: "rgba(79, 70, 229, 0.1)",
                            color: "#4f46e5",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "6px",
                            letterSpacing: "1px",
                          }}>
                            {m.pin_code || m.phone_last4 || "----"}
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              const cur = m.pin_code || m.phone_last4 || "";
                              const input = window.prompt(`Nhập mã PIN Chấm Công mới (4 số) cho nhân sự "${m.name}":`, cur);
                              if (input === null) return;
                              const clean = input.replace(/\D/g, '').slice(0, 4);
                              if (clean.length < 4) {
                                alert("Mã PIN bắt buộc phải đủ 4 chữ số!");
                                return;
                              }
                              const res = await updateMemberPin(m.id, clean);
                              if (res.success) {
                                alert(`✅ Đã đổi mã PIN của "${m.name}" thành: ${clean} thành công!`);
                                loadMembers(selectedCampId);
                              } else {
                                alert("❌ Lỗi đổi PIN: " + res.error);
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid var(--border)",
                              borderRadius: "4px",
                              padding: "2px 6px",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                              fontWeight: 600,
                            }}
                            title="Bấm để đổi nhanh mã PIN chấm công"
                          >
                            ✏️ Đổi
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{m.role_tag || "Thành viên"}</span>
                      </td>
                      <td style={{ padding: "0.75rem" }}>
                        {selectedCamp?.mode === 'cham_cong' ? (
                          <strong style={{ color: "#059669" }}>{m.total_stars || 0} ca · {m.weekly_streak || 0} ngày streak</strong>
                        ) : selectedCamp?.mode === 'clb_quanh_nam' ? (
                          <><strong style={{ color: "#f59e0b" }}>{m.total_km_all_time || 0} km</strong> <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "normal" }}>(khởi điểm)</span></>
                        ) : (
                          <strong style={{ color: "#4f46e5" }}>{m.total_stars || 0} ⭐ · {m.weekly_streak || 0} streak</strong>
                        )}
                      </td>
                      {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (
                        <td style={{ padding: "0.75rem" }}>
                          <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                            {m.forgot_pills_quota !== undefined ? m.forgot_pills_quota : 3} vé
                          </span>
                        </td>
                      )}
                      {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (() => {
                        const binding = selectedCamp?.theme?.device_bindings?.[String(m.id)];
                        return (
                          <td style={{ padding: "0.75rem" }}>
                            {binding ? (
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: "4px" }}>
                                    <Smartphone size={13} />
                                    <span>{binding.deviceName || "Điện thoại chính chủ"}</span>
                                  </div>
                                  <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "1px" }}>
                                    {new Date(binding.boundAt).toLocaleDateString("vi-VN")}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleResetDevice(m)}
                                  style={{
                                    background: "#fef2f2",
                                    color: "#dc2626",
                                    border: "1px solid #fecaca",
                                    padding: "3px 8px",
                                    borderRadius: "5px",
                                    fontSize: "0.72rem",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Mở khóa để nhân sự có thể đăng nhập trên máy mới"
                                >
                                  <RefreshCw size={11} />
                                  <span>Mở khóa</span>
                                </button>
                              </div>
                            ) : (
                              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>
                                ⚪ Chưa gắn máy
                              </span>
                            )}
                          </td>
                        );
                      })()}
                      <td style={{ padding: "0.75rem", textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleMemberStatus(m)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "20px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            border: m.status === 'inactive' ? "1px solid #fecaca" : "1px solid #bbf7d0",
                            background: m.status === 'inactive' ? "#fef2f2" : "#f0fdf4",
                            color: m.status === 'inactive' ? "#dc2626" : "#16a34a",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                            transition: "all 0.15s ease",
                          }}
                          title={m.status === 'inactive' ? "Đang tắt (OFF). Bấm để chuyển sang ON (Hoạt động)" : "Đang bật (ON). Bấm để chuyển sang OFF (Nghỉ)"}
                        >
                          <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: m.status === 'inactive' ? "#dc2626" : "#16a34a",
                            display: "inline-block",
                          }} />
                          {m.status === 'inactive' ? "OFF (Nghỉ)" : "ON (Hoạt động)"}
                        </button>
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => {
                              setEditingMember(m)
                              setShowMemberModal(true)
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid var(--border)",
                              color: "var(--text-main)",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                            title="Sửa thành viên"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Bố Hoàng có chắc muốn xóa thành viên ${m.name}?`)) {
                                await deleteMember(m.id)
                                loadMembers(selectedCampId)
                              }
                            }}
                            style={{
                              background: "transparent",
                              border: "1px solid #fee2e2",
                              color: "#ef4444",
                              padding: "4px 8px",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                            title="Xóa thành viên"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL CẤU HÌNH TOÀN DIỆN (LỊCH TUẦN, NHIỆM VỤ, SỰ KIỆN...) */}
      {/* ============================================================ */}
      {showCampModal && editingCamp && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
          padding: "1rem",
        }}>
          <div style={{
            background: "var(--surface)",
            borderRadius: "16px",
            maxWidth: "960px",
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            border: "1px solid var(--border)",
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "1.25rem 1.75rem",
              background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)",
              color: "white",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                  {editingCamp.id ? `⚙️ Cấu Hình Toàn Diện: ${editingCamp.title}` : "✨ Tạo Hành Trình Mới"}
                </h2>
                <p style={{ fontSize: "0.8rem", opacity: 0.85, margin: "0.2rem 0 0" }}>
                  {editingCamp.mode === 'lop_hoc_buoi'
                    ? "📚 Lộ trình học theo buổi · Tiêu chuẩn BTVN & Đọc Razkids · Link bài giảng Canva · Zalo Thầy Cô"
                    : editingCamp.mode === 'thoi_quen_ca_nhan'
                    ? "🧘 Hành trình rèn luyện cá nhân · Tiêu chuẩn thói quen hàng ngày · Chuỗi ngày Streak lửa"
                    : editingCamp.mode === 'cham_cong'
                    ? "📍 Quản lý chấm công chi nhánh · Tọa độ GPS & Ca làm việc · Tiêu chuẩn văn hóa nội bộ"
                    : "🏃 Lịch cố định hàng tuần · Cự ly km tích lũy · Bảng phong thần & Phân hạng Runner"}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setMobilePreviewCamp(editingCamp)}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    padding: "0.45rem 0.9rem",
                    cursor: "pointer",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
                  }}
                  title="Mô phỏng trực tiếp giao diện hiển thị trên màn hình điện thoại iPhone"
                >
                  <Smartphone size={16} />
                  <span>📱 Xem Trước Trên Điện Thoại</span>
                </button>

                <button
                  onClick={() => setShowCampModal(false)}
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "white",
                    border: "none",
                    borderRadius: "50%",
                    width: "32px",
                    height: "32px",
                    cursor: "pointer",
                    fontSize: "1rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Sub-Tabs */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              background: "var(--background)",
              padding: "0 1rem",
              overflowX: "auto",
              flexShrink: 0,
              position: "sticky",
              top: 0,
              zIndex: 20,
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
            }}>
              {[
                ...(editingCamp.mode === 'thoi_quen_ca_nhan' ? [
                  { key: "general", label: "⚙️ Thông Tin & Số Ngày", icon: Edit },
                  { key: "tasks", label: "📋 Thói Quen Hàng Ngày", icon: Layers, badge: editingCamp.tasks?.length || 0 },
                  { key: "branding", label: "🎨 Giao Diện & Màu Sắc", icon: Palette },
                ] : editingCamp.mode === 'lop_hoc_buoi' ? [
                  { key: "general", label: "📋 Thông Tin & Canva", icon: Edit },
                  { key: "tasks", label: "🎯 Tiêu Chuẩn & Razkids", icon: Layers, badge: editingCamp.tasks?.length || 0 },
                  { key: "weekly_schedule", label: "📚 Lộ Trình Buổi Học", icon: Zap, badge: editingCamp.sessions?.length || 0 },
                  { key: "scoring", label: "💎 Quy Tắc Tính Điểm & Thi Đua", icon: Award },
                  { key: "branding", label: "🎨 Giao Diện & Zalo Thầy Cô", icon: Palette },
                ] : editingCamp.mode === 'cham_cong' ? [
                  { key: "general", label: "🏢 Chi Nhánh & GPS", icon: Edit },
                  { key: "tasks", label: "✨ Tiêu Chuẩn & KPI Ca", icon: Layers, badge: editingCamp.tasks?.length || 0 },
                  { key: "scoring", label: "💎 Quy Tắc Tính Điểm & Thi Đua", icon: Award },
                  { key: "branding", label: "🎨 Giao Diện & Nhận Diện", icon: Palette },
                ] : [
                  { key: "general", label: "📋 Thông Tin & Slogan", icon: Edit },
                  { key: "tasks", label: "🎯 Thử Thách Tháng", icon: Layers, badge: editingCamp.tasks?.length || 4 },
                  { key: "weekly_schedule", label: "🗓️ Lịch Tuần & Sinh Buổi", icon: Zap, badge: editingCamp.sessions?.length || 0 },
                  { key: "special_events", label: "🏆 Sự Kiện Đặc Biệt", icon: Flag, badge: (editingCamp.sessions || []).filter((s: any) => s.isSpecialEvent).length },
                  { key: "scoring", label: "💎 Quy Tắc Tính Điểm", icon: Award },
                  { key: "hall_of_fame", label: "👑 Bảng Phong Thần All-Time", icon: Crown },
                  { key: "branding", label: "🎨 Giao Diện & Zalo Bầu Xô", icon: Palette },
                ]),
              ].map((subTab) => {
                const Icon = subTab.icon
                const isActive = modalSubTab === subTab.key
                return (
                  <button
                    key={subTab.key}
                    type="button"
                    onClick={() => setModalSubTab(subTab.key as any)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "0.85rem 1rem",
                      fontSize: "0.82rem",
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? "#4f46e5" : "var(--text-muted)",
                      background: "transparent",
                      border: "none",
                      borderBottom: isActive ? "3px solid #4f46e5" : "3px solid transparent",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon size={15} />
                    <span>{subTab.label}</span>
                    {subTab.badge !== undefined && subTab.badge > 0 && (
                      <span style={{
                        background: isActive ? "#4f46e5" : "#94a3b8",
                        color: "white",
                        fontSize: "0.7rem",
                        padding: "1px 6px",
                        borderRadius: "999px",
                        fontWeight: 700,
                      }}>
                        {subTab.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Modal Body Content */}
            <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", flex: "1 1 0%", minHeight: 0 }}>
              {/* PHẦN 1: THÔNG TIN CƠ BẢN & SLOGAN */}
              {modalSubTab === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
                  {editingCamp.mode === 'thoi_quen_ca_nhan' ? (
                    <>
                      {/* BẢNG CÀI ĐẶT RIÊNG CHO THÓI QUEN CÁ NHÂN (1 NGƯỜI) */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                        <div>
                          <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: "0.35rem", color: "#ea580c" }}>
                            Mã Slug (Đường dẫn URL)
                          </label>
                          <input
                            type="text"
                            value={editingCamp.slug}
                            onChange={(e) => setEditingCamp({ ...editingCamp, slug: e.target.value })}
                            placeholder="vi-du: 60-ngay-co-bung"
                            style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #fed7aa", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 600 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: "0.35rem", color: "#ea580c" }}>
                            Tên Hành Trình Thói Quen
                          </label>
                          <input
                            type="text"
                            value={editingCamp.title}
                            onChange={(e) => {
                              const title = e.target.value;
                              const isNew = !editingCamp.id;
                              const autoSlug = isNew ? title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : editingCamp.slug;
                              setEditingCamp({ ...editingCamp, title, slug: autoSlug });
                            }}
                            placeholder="Ví dụ: 60 NGÀY RÈN CƠ BỤNG, 30 NGÀY ĐỌC SÁCH..."
                            style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #fed7aa", background: "var(--background)", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 800 }}
                          />
                        </div>
                      </div>

                      {/* SLOGAN KỶ LUẬT */}
                      <div style={{ background: "#fff7ed", padding: "1rem", borderRadius: "10px", border: "1.5px solid #fed7aa" }}>
                        <label style={{ fontSize: "0.88rem", fontWeight: 800, color: "#c2410c", display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.35rem" }}>
                          <Sparkles size={16} />
                          <span>🌟 Slogan / Khẩu Hiệu Kỷ Luật Bản Thân</span>
                        </label>
                        <textarea
                          rows={2}
                          value={editingCamp.slogan || ""}
                          onChange={(e) => setEditingCamp({ ...editingCamp, slogan: e.target.value })}
                          placeholder="KỶ LUẬT LÀ SỨC MẠNH · 60 NGÀY LIÊN TỤC KHÔNG BỎ CUỘC"
                          style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #ea580c", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 700 }}
                        />
                      </div>

                      {/* THIẾT LẬP LỘ TRÌNH NGÀY (SỐ NGÀY & NGÀY BẮT ĐẦU) */}
                      <div style={{ background: "rgba(234, 88, 12, 0.05)", border: "1.5px solid #fdba74", borderRadius: "12px", padding: "1.2rem" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#9a3412", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>🎯</span> Lộ Trình Rèn Luyện & Mục Tiêu Số Ngày
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                          <div>
                            <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem", color: "#9a3412" }}>
                              Mục Tiêu Số Ngày Rèn Luyện:
                            </label>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                              {[21, 30, 60, 100].map(days => (
                                <button
                                  key={days}
                                  type="button"
                                  onClick={() => setEditingCamp({
                                    ...editingCamp,
                                    theme: { ...(editingCamp.theme || {}), target_days: days }
                                  })}
                                  style={{
                                    padding: "0.4rem 0.75rem",
                                    borderRadius: "8px",
                                    border: (editingCamp.theme?.target_days === days || (!editingCamp.theme?.target_days && days === 60)) ? "2px solid #ea580c" : "1px solid #fed7aa",
                                    background: (editingCamp.theme?.target_days === days || (!editingCamp.theme?.target_days && days === 60)) ? "#ea580c" : "#ffffff",
                                    color: (editingCamp.theme?.target_days === days || (!editingCamp.theme?.target_days && days === 60)) ? "#ffffff" : "#c2410c",
                                    fontWeight: 800,
                                    fontSize: "0.82rem",
                                    cursor: "pointer",
                                  }}
                                >
                                  {days} Ngày
                                </button>
                              ))}
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                <input
                                  type="number"
                                  value={editingCamp.theme?.target_days || 60}
                                  onChange={(e) => setEditingCamp({
                                    ...editingCamp,
                                    theme: { ...(editingCamp.theme || {}), target_days: parseInt(e.target.value) || 60 }
                                  })}
                                  style={{ width: "65px", padding: "0.4rem", borderRadius: "8px", border: "1px solid #fed7aa", textAlign: "center", fontWeight: 800, fontSize: "0.85rem" }}
                                />
                                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#9a3412" }}>ngày</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem", color: "#9a3412" }}>
                              Ngày Bắt Đầu:
                            </label>
                            <input
                              type="date"
                              value={editingCamp.theme?.start_date || new Date().toISOString().split('T')[0]}
                              onChange={(e) => setEditingCamp({
                                ...editingCamp,
                                theme: { ...(editingCamp.theme || {}), start_date: e.target.value }
                              })}
                              style={{ width: "100%", padding: "0.45rem 0.75rem", borderRadius: "8px", border: "1px solid #fed7aa", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 700 }}
                            />
                          </div>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "#ea580c", background: "#fff", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px dashed #fdba74" }}>
                          ⚡ <b>Tự động sinh lịch:</b> Khi bấm <b>Lưu</b>, hệ thống sẽ tự động tạo đủ {editingCamp.theme?.target_days || 60} ngày rèn luyện (N01 → N{editingCamp.theme?.target_days || 60}) bắt đầu từ {editingCamp.theme?.start_date || 'hôm nay'} mà không cần cấu hình thêm bất cứ gì!
                        </div>
                      </div>

                      {/* CHỦ NHÂN HÀNH TRÌNH (NGƯỜI THỰC HIỆN) */}
                      <div style={{ background: "#ffffff", border: "1.5px solid #fed7aa", borderRadius: "12px", padding: "1.2rem", boxShadow: "0 2px 8px rgba(0,0,0,0.02)" }}>
                        <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>🦁</span> Chủ Nhân Hành Trình (Người Thực Hiện)
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 80px 1.2fr", gap: "0.85rem" }}>
                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                              Họ và Tên:
                            </label>
                            <input
                              type="text"
                              value={editingCamp.theme?.owner_name || "Sếp Hoàng"}
                              onChange={(e) => setEditingCamp({
                                ...editingCamp,
                                theme: { ...(editingCamp.theme || {}), owner_name: e.target.value }
                              })}
                              placeholder="Ví dụ: Sếp Hoàng"
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 700 }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                              Avatar:
                            </label>
                            <input
                              type="text"
                              value={editingCamp.theme?.owner_avatar || "🦁"}
                              onChange={(e) => setEditingCamp({
                                ...editingCamp,
                                theme: { ...(editingCamp.theme || {}), owner_avatar: e.target.value }
                              })}
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", textAlign: "center", fontSize: "1rem" }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                              Số Điện Thoại (Tùy chọn):
                            </label>
                            <input
                              type="text"
                              value={editingCamp.theme?.owner_phone || "0912345678"}
                              onChange={(e) => setEditingCamp({
                                ...editingCamp,
                                theme: { ...(editingCamp.theme || {}), owner_phone: e.target.value }
                              })}
                              placeholder="0912345678"
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                            />
                          </div>
                        </div>

                        {/* TÙY BIẾN NHIỆM VỤ CÁ NHÂN */}
                        <div style={{ background: "rgba(16, 185, 129, 0.06)", border: "1.5px solid #86efac", borderRadius: "10px", padding: "0.85rem 1rem", marginTop: "0.85rem" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "0.85rem", color: "#166534" }}>
                            <input
                              type="checkbox"
                              checked={editingCamp.theme?.allow_personal_custom_tasks ?? true}
                              onChange={(e) => setEditingCamp({
                                ...editingCamp,
                                theme: { ...(editingCamp.theme || {}), allow_personal_custom_tasks: e.target.checked }
                              })}
                              style={{ width: "17px", height: "17px", accentColor: "#16a34a", cursor: "pointer" }}
                            />
                            <span>⚙️ Cho phép chủ nhân tự tùy biến nhiệm vụ trên Web (Khóa bằng PIN 4 số SĐT)</span>
                          </label>
                          <p style={{ margin: "0.3rem 0 0 25px", fontSize: "0.75rem", color: "#15803d", lineHeight: 1.4 }}>
                            Khi bật, học viên có thể tự đổi tên nhiệm vụ, số lượng mục tiêu (VD: gập bụng 300 cái, tập 15 phút...) trực tiếp ngay trên trang web hành trình cá nhân của mình sau khi nhập đúng 4 số cuối SĐT.
                          </p>
                        </div>
                      </div>

                      {/* CHẾ ĐỘ & TRẠNG THÁI */}
                      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
                        <div>
                          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                            Chế Độ Vận Hành
                          </label>
                          <select
                            value={editingCamp.mode}
                            onChange={(e) => setEditingCamp({ ...editingCamp, mode: e.target.value as any })}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 700 }}
                          >
                            <option value="thoi_quen_ca_nhan">🧘‍♂️ Thói Quen Cá Nhân (1 Người · 21/30/60/100 Ngày)</option>
                            <option value="clb_quanh_nam">🏃‍♂️ CLB Quanh Năm (Tích lũy km, 12 tháng)</option>
                            <option value="cham_cong">📍 Chấm Công Chi Nhánh (GPS, P1-P5)</option>
                            <option value="lop_hoc_buoi">📚 Lớp Học Theo Buổi (Cambridge)</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                            Trạng Thái
                          </label>
                          <select
                            value={editingCamp.status || "active"}
                            onChange={(e) => setEditingCamp({ ...editingCamp, status: e.target.value })}
                            style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                          >
                            <option value="active">🟢 Đang hoạt động (Active)</option>
                            <option value="archived">⚪ Tạm dừng (Archived)</option>
                          </select>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* BẢNG CÀI ĐẶT MẶC ĐỊNH CHO CLB / LỚP HỌC */}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Mã Slug (Đường dẫn URL)
                      </label>
                      <input
                        type="text"
                        value={editingCamp.slug}
                        onChange={(e) => setEditingCamp({ ...editingCamp, slug: e.target.value })}
                        placeholder="vi-du: rubisea-19"
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Tên Hành Trình / Lớp Học
                      </label>
                      <input
                        type="text"
                        value={editingCamp.title}
                        onChange={(e) => setEditingCamp({ ...editingCamp, title: e.target.value })}
                        placeholder="Ví dụ: RUBISEA 19 · CLB RUNNER NHÍ"
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                      Phụ Đề / Tóm Tắt Định Kỳ
                    </label>
                    <input
                      type="text"
                      value={editingCamp.subtitle || ""}
                      onChange={(e) => setEditingCamp({ ...editingCamp, subtitle: e.target.value })}
                      placeholder="Lịch chạy định kỳ quanh năm · T6 17h30 & CN 05h30..."
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                    />
                  </div>

                  {/* SLOGAN CỐT LÕI (100% TÙY BIẾN) */}
                  <div style={{ background: "rgba(245, 158, 11, 0.08)", padding: "1rem", borderRadius: "10px", border: "1px solid #fde68a" }}>
                    <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "#92400e", display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.35rem" }}>
                      <Sparkles size={16} />
                      <span>🌟 Slogan / Khẩu Hiệu Cốt Lõi (Tùy Biến 100%)</span>
                    </label>
                    <textarea
                      rows={2}
                      value={editingCamp.slogan || ""}
                      onChange={(e) => setEditingCamp({ ...editingCamp, slogan: e.target.value })}
                      placeholder="KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ"
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #f59e0b", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 600 }}
                    />
                    <span style={{ fontSize: "0.75rem", color: "#b45309", display: "block", marginTop: "0.25rem" }}>
                      💡 Khẩu hiệu này sẽ hiển thị trang trọng trên đầu trang Báo Cáo Học Viên và Banner vinh danh.
                    </span>
                  </div>

                  {/* Phân loại & Đối tượng sử dụng */}
                  <div style={{ background: "rgba(99, 102, 241, 0.05)", border: "1px solid rgba(99, 102, 241, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                    <label style={{ fontSize: "0.88rem", fontWeight: 700, color: "#4338ca", display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.35rem" }}>
                      <span>🎯 Phân Loại Quyền Sử Dụng & Đối Tượng Vận Hành</span>
                    </label>
                    <select
                      value={editingCamp.scope || (editingCamp.theme as any)?.scope || (editingCamp.mode === "cham_cong" ? "cham_cong" : "branch")}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        const newMode = val === "cham_cong" ? "cham_cong" : (editingCamp.mode === "cham_cong" ? "lop_hoc_buoi" : editingCamp.mode);
                        setEditingCamp({
                          ...editingCamp,
                          mode: newMode,
                          scope: val,
                          theme: { ...(editingCamp.theme || {}), scope: val }
                        });
                      }}
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid #c7d2fe", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 700 }}
                    >
                      <option value="admin_only">👑 Chỉ Super Admin</option>
                      <option value="branch">🏫 Lớp học tại chi nhánh</option>
                      <option value="partner">🤝 Lớp thầy cô đối tác</option>
                      <option value="cham_cong">📍 Chấm công</option>
                    </select>
                    <span style={{ fontSize: "0.75rem", color: "#6366f1", display: "block", marginTop: "0.35rem" }}>
                      💡 Tiêu chí giúp lọc nhanh tại Trung Tâm Điều Hành và phân quyền truy cập quản trị sau này.
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Chế Độ Vận Hành
                      </label>
                      <select
                        value={editingCamp.mode}
                        onChange={(e) => setEditingCamp({ ...editingCamp, mode: e.target.value as any })}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                      >
                        <option value="cham_cong">📍 Chấm Công Chi Nhánh & Ca Làm (Điểm danh GPS, đối soát ca P1-P5, nhân sự VicHRM)</option>
                        <option value="clb_quanh_nam">🏃‍♂️ CLB Quanh Năm (Tích lũy km, mùa giải 12 tháng, phân hạng Tân binh / 300km)</option>
                        <option value="lop_hoc_buoi">📚 Lớp Học Theo Buổi (Lộ trình 24/32 buổi Cambridge, BTVN & Điểm danh)</option>
                        <option value="thoi_quen_ca_nhan">🧘‍♂️ Thói Quen Cá Nhân (1 Người · 21/30/60/100 Ngày Tự Rèn Luyện, Streak Lửa, Không Thi Đua)</option>
                      </select>
                      <div style={{ marginTop: "0.45rem" }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Bạn có chắc chắn muốn nạp KHUÔN MẪU CHUẨN SẠCH cho chế độ "${editingCamp.mode}" không?\n\nThao tác này sẽ dọn sạch mọi rác cấu hình không liên quan và nạp đúng bộ tiêu chuẩn mẫu tối ưu nhất!`)) {
                              const clean = getCleanPreset(editingCamp.mode, editingCamp);
                              setEditingCamp(clean);
                              alert(`✅ Đã nạp Khuôn Mẫu Chuẩn Sạch cho chế độ "${editingCamp.mode}" thành công!`);
                            }
                          }}
                          style={{
                            padding: "0.35rem 0.75rem",
                            borderRadius: "6px",
                            border: "1px dashed #6366f1",
                            background: "#eef2ff",
                            color: "#4f46e5",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                          title="Làm sạch rác dữ liệu của các hành trình khác và đặt lại mẫu chuẩn"
                        >
                          <span>⚡ Nạp Khuôn Chuẩn Sạch (Xóa rác chéo)</span>
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        Trạng Thái Hoạt Động
                      </label>
                      <select
                        value={editingCamp.status || "active"}
                        onChange={(e) => setEditingCamp({ ...editingCamp, status: e.target.value })}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                      >
                        <option value="active">🟢 Đang hoạt động (Active)</option>
                        <option value="archived">⚪ Tạm dừng / Lưu trữ (Archived)</option>
                      </select>
                    </div>
                  </div>

                  {/* Tùy chọn bảo mật & phân khu */}
                  <div style={{ display: "flex", gap: "1.5rem", padding: "0.75rem 0" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editingCamp.has_divisions ?? true}
                        onChange={(e) => setEditingCamp({ ...editingCamp, has_divisions: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                      />
                      <span>Phân chia Bảng Runner Nhí (U15) & Người Lớn</span>
                    </label>

                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={editingCamp.require_pin ?? true}
                        onChange={(e) => setEditingCamp({ ...editingCamp, require_pin: e.target.checked })}
                        style={{ width: "16px", height: "16px", accentColor: "#4f46e5" }}
                      />
                      <span>Bắt buộc mã PIN 4 số khi nộp bài</span>
                    </label>
                  </div>
                    </>
                  )}
                </div>
              )}

              {/* PHẦN 2: CẤU HÌNH 4 THỬ THÁCH THÁNG (TASKS) */}
              {modalSubTab === "tasks" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                        {editingCamp.mode === 'lop_hoc_buoi'
                          ? `🎯 Tiêu Chuẩn Học Tập & Tự Học (${editingCamp.tasks?.length || 0} tiêu chí)`
                          : editingCamp.mode === 'thoi_quen_ca_nhan'
                          ? `📋 Thói Quen Rèn Luyện Hàng Ngày (${editingCamp.tasks?.length || 0} thói quen)`
                          : editingCamp.mode === 'cham_cong'
                          ? `✨ Tiêu Chuẩn Văn Hóa & Báo Cáo KPI (${editingCamp.tasks?.length || 0} chỉ số)`
                          : `🔥 Danh Sách Thử Thách & Mục Tiêu Thể Lực (${editingCamp.tasks?.length || 0} mục tiêu)`}
                      </h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                        Cấu hình kiểu thử thách 1, 2, 3, 4 (Nhập số km / từ vựng hoặc tích chọn hoàn thành)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTask}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        background: "#4f46e5",
                        color: "white",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        padding: "0.45rem 0.85rem",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={14} />
                      <span>Thêm Thử Thách</span>
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {(editingCamp.tasks || []).map((task, idx) => (
                      <div
                        key={task.id || idx}
                        style={{
                          background: "var(--background)",
                          borderRadius: "10px",
                          border: `1px solid ${task.color || "var(--border)"}`,
                          padding: "1rem",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{
                              background: task.color || "#4f46e5",
                              color: "white",
                              fontWeight: 800,
                              fontSize: "0.75rem",
                              padding: "2px 8px",
                              borderRadius: "6px",
                            }}>
                              Thử thách #{idx + 1}
                            </span>
                            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>
                              {task.name || "Chưa đặt tên"}
                            </span>
                          </div>

                          {editingCamp.tasks && editingCamp.tasks.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(idx)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                fontWeight: 600,
                              }}
                              title="Xóa thử thách này"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: editingCamp.mode === 'lop_hoc_buoi' ? "1.8fr 1.2fr 1.4fr" : "2fr 1.5fr", gap: "0.85rem", marginBottom: "0.75rem" }}>
                          <div>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                              Tên Tiêu Chuẩn / Nhiệm Vụ
                            </label>
                            <input
                              type="text"
                              value={task.name}
                              onChange={(e) => handleTaskChange(idx, "name", e.target.value)}
                              placeholder="Ví dụ: Đi học đúng giờ, Đọc Razkids..."
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                              Kiểu Báo Cáo
                            </label>
                            <select
                              value={task.type}
                              onChange={(e) => handleTaskChange(idx, "type", e.target.value)}
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                            >
                              <option value="boolean">☑️ Tích Chọn (Đạt / Chưa đạt)</option>
                              <option value="number">🔢 Nhập Số (Số phút, từ vựng...)</option>
                              <option value="text">📝 Ghi Văn Bản (Ghi chú, nhật ký)</option>
                              <option value="link">🔗 Nộp Link (Bài tập, video)</option>
                            </select>
                          </div>

                          {editingCamp.mode === 'lop_hoc_buoi' && (
                            <div>
                              <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem", color: "#6366f1" }}>
                                Nơi Rèn Luyện (Tần Suất)
                              </label>
                              <select
                                value={task.frequency || (task.id === 'razkids' ? 'daily' : 'per_session')}
                                onChange={(e) => handleTaskChange(idx, "frequency", e.target.value)}
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid #c7d2fe", background: "#f5f3ff", color: "#4f46e5", fontSize: "0.82rem", fontWeight: 700 }}
                              >
                                <option value="per_session">🏫 Trên Lớp (Theo Buổi)</option>
                                <option value="daily">🏠 Ở Nhà (Hàng Ngày - Razkids)</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {task.type === "number" && (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem", marginBottom: "0.75rem" }}>
                            <div>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                                Mục Tiêu Tối Thiểu
                              </label>
                              <input
                                type="number"
                                value={task.target || 3}
                                onChange={(e) => handleTaskChange(idx, "target", parseFloat(e.target.value) || 0)}
                                placeholder="3"
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                                Đơn Vị Đo
                              </label>
                              <input
                                type="text"
                                value={task.unit || "km"}
                                onChange={(e) => handleTaskChange(idx, "unit", e.target.value)}
                                placeholder="km, từ, phút..."
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                              />
                            </div>
                          </div>
                        )}

                        <div style={{ marginBottom: "0.75rem" }}>
                          <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                            Mô Tả Hướng Dẫn Cho Học Viên
                          </label>
                          <input
                            type="text"
                            value={task.description}
                            onChange={(e) => handleTaskChange(idx, "description", e.target.value)}
                            placeholder="Ví dụ: Chạy tối thiểu 3km mỗi buổi, Ghi 3 điều biết ơn trong ngày..."
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                          />
                        </div>

                        {/* Chọn màu sắc */}
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>Màu sắc nhận diện:</span>
                          {[
                            { color: "#e11d48", label: "Đỏ Ruby" },
                            { color: "#f59e0b", label: "Vàng Cam" },
                            { color: "#10b981", label: "Xanh Lá" },
                            { color: "#3b82f6", label: "Xanh Dương" },
                            { color: "#8b5cf6", label: "Tím" },
                          ].map((col) => (
                            <button
                              key={col.color}
                              type="button"
                              onClick={() => handleTaskChange(idx, "color", col.color)}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                background: col.color,
                                border: task.color === col.color ? "3px solid #000" : "1px solid rgba(0,0,0,0.1)",
                                cursor: "pointer",
                              }}
                              title={col.label}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PHẦN 2.B: CẤU HÌNH BÁO CÁO TỰ RÈN HÀNG NGÀY (CHO LỚP HỌC BUỔI) */}
                  {editingCamp.mode === 'lop_hoc_buoi' && (() => {
                    const dp = (editingCamp.theme as any)?.daily_practice || {
                      title: 'BÁO CÁO TỰ RÈN RAZKIDS & PODCAST',
                      notice: 'VicEdu khuyến khích bạn rèn luyện đều đặn 1 - 2 lần mỗi ngày (Đọc sách Razkids & Nghe Podcast) để kích hoạt phản xạ ngôn ngữ tự nhiên.',
                      cu1_enabled: true,
                      cu1_name: 'Cữ 1: Luyện Đọc Sách Razkids',
                      cu1_desc: 'Đọc to thành tiếng, ghi nhớ từ vựng (Khuyên dùng: 15-20 phút)',
                      cu1_btn_text: 'ĐÃ ĐỌC',
                      cu1_placeholder: 'Tên cuốn sách hoặc Level Razkids đã đọc (Ví dụ: Level D - Animals In Winter)...',
                      cu2_enabled: true,
                      cu2_name: 'Cữ 2: Luyện Nghe Podcast / Shadowing (Tùy chọn)',
                      cu2_desc: 'Tắm ngôn ngữ thụ động hoặc Shadowing nhại giọng (10-15 phút)',
                      cu2_btn_text: 'ĐÃ NGHE',
                      cu2_placeholder: 'Tên bài Podcast hoặc kênh đã nghe (Ví dụ: BBC 6 Minute English / TED-Ed)...',
                      link_enabled: true,
                      link_label: '🎙️ Link file ghi âm đọc bài / Video nhại giọng (Nếu có):',
                      link_placeholder: 'Dán link Google Drive, Zalo, YouTube hoặc Padlet...',
                      vocab_enabled: true,
                      vocab_label: '💡 1-2 Từ mới hoặc câu văn tâm đắc nhất hôm nay:',
                      vocab_placeholder: 'Ví dụ: adventurous (thích phiêu lưu), solar system (hệ mặt trời)...',
                    };

                    const updateDp = (patch: any) => {
                      setEditingCamp({
                        ...editingCamp,
                        theme: {
                          ...(editingCamp.theme || {}),
                          daily_practice: { ...dp, ...patch }
                        }
                      });
                    };

                    return (
                      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '2px dashed var(--border)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
                          <div>
                            <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#047857', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>📖🎧</span> Cấu Hình Báo Cáo Tự Rèn Hàng Ngày (Razkids / Podcast / Cữ 1 & 2)
                            </h4>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                              Tùy biến nội dung cữ rèn luyện, bật/tắt Cữ 2 và các ô thông tin để phù hợp với từng giai đoạn học
                            </p>
                          </div>

                          {/* Nút nạp mẫu 1-chạm */}
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              onClick={() => updateDp({
                                title: 'BÁO CÁO TỰ RÈN RAZKIDS & PODCAST',
                                notice: 'VicEdu khuyến khích bạn rèn luyện đều đặn 1 - 2 lần mỗi ngày (Đọc sách Razkids & Nghe Podcast) để kích hoạt phản xạ ngôn ngữ tự nhiên.',
                                cu1_enabled: true,
                                cu1_name: 'Cữ 1: Luyện Đọc Sách Razkids',
                                cu1_desc: 'Đọc to thành tiếng, ghi nhớ từ vựng (Khuyên dùng: 15-20 phút)',
                                cu1_btn_text: 'ĐÃ ĐỌC',
                                cu1_placeholder: 'Tên cuốn sách hoặc Level Razkids đã đọc (Ví dụ: Level D - Animals In Winter)...',
                                cu2_enabled: true,
                                cu2_name: 'Cữ 2: Luyện Nghe Podcast / Shadowing (Tùy chọn)',
                                cu2_desc: 'Tắm ngôn ngữ thụ động hoặc Shadowing nhại giọng (10-15 phút)',
                                cu2_btn_text: 'ĐÃ NGHE',
                                cu2_placeholder: 'Tên bài Podcast hoặc kênh đã nghe (Ví dụ: BBC 6 Minute English / TED-Ed)...',
                                link_enabled: true,
                                vocab_enabled: true,
                              })}
                              style={{ padding: '4px 10px', borderRadius: '6px', background: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              ⚡ Mẫu Chuẩn 2 Cữ (Razkids + Podcast)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateDp({
                                title: 'BÁO CÁO TỰ RÈN RAZKIDS HÀNG NGÀY',
                                notice: 'Duy trì thói quen đọc sách Razkids tối thiểu 15 phút mỗi ngày để phát triển vốn từ và phản xạ tự nhiên.',
                                cu1_enabled: true,
                                cu1_name: 'Luyện Đọc Sách Razkids (15-20 phút)',
                                cu1_desc: 'Đọc to thành tiếng, ghi nhớ từ vựng mới',
                                cu1_btn_text: 'ĐÃ ĐỌC',
                                cu1_placeholder: 'Tên cuốn sách hoặc Level Razkids đã đọc...',
                                cu2_enabled: false,
                                link_enabled: true,
                                vocab_enabled: true,
                              })}
                              style={{ padding: '4px 10px', borderRadius: '6px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              ⚡ Mẫu 1 Cữ Đơn Giản (Chỉ Đọc Razkids)
                            </button>
                            <button
                              type="button"
                              onClick={() => updateDp({
                                title: 'BÁO CÁO TỰ HỌC & ĐỌC SÁCH HÀNG NGÀY',
                                notice: 'Rèn luyện thói quen tự giác đọc sách và ghi nhận bài học mỗi ngày.',
                                cu1_enabled: true,
                                cu1_name: 'Cữ 1: Đọc Sách & Ghi Nhớ Từ Vựng',
                                cu1_desc: 'Đọc sách tiếng Anh hoặc tiếng Việt tối thiểu 20 phút',
                                cu1_btn_text: 'HOÀN THÀNH',
                                cu1_placeholder: 'Tên sách và số trang đã đọc hôm nay...',
                                cu2_enabled: true,
                                cu2_name: 'Cữ 2: Viết Nhật Ký / Bài Thu Hoạch',
                                cu2_desc: 'Viết 3-5 câu cảm nhận hoặc tóm tắt nội dung',
                                cu2_btn_text: 'ĐÃ VIẾT',
                                cu2_placeholder: 'Viết vài câu tóm tắt nội dung đã đọc...',
                                link_enabled: false,
                                vocab_enabled: true,
                              })}
                              style={{ padding: '4px 10px', borderRadius: '6px', background: '#fdf2f8', color: '#be185d', border: '1px solid #fbcfe8', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              ⚡ Mẫu Đọc Sách & Viết Nhật Ký
                            </button>
                          </div>
                        </div>

                        {/* Tiêu đề & Lời nhắn Banner */}
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', marginBottom: '0.6rem' }}>
                            📢 Khung Banner Nhắc Nhở & Tiêu Đề Báo Cáo:
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.6rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tiêu đề Banner:</label>
                              <input
                                type="text"
                                value={dp.title || ''}
                                onChange={e => updateDp({ title: e.target.value })}
                                placeholder="VD: BÁO CÁO TỰ RÈN RAZKIDS & PODCAST"
                                className="form-input"
                                style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem 0.6rem', marginTop: '0.2rem' }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Lời nhắn nhủ / Khuyến khích học viên:</label>
                              <textarea
                                value={dp.notice || ''}
                                onChange={e => updateDp({ notice: e.target.value })}
                                rows={2}
                                placeholder="VD: VicEdu khuyến khích bạn rèn luyện đều đặn..."
                                className="form-input"
                                style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.6rem', marginTop: '0.2rem' }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* CÀI ĐẶT CỮ 1 */}
                        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: '1.5px solid #86efac', marginBottom: '1rem', boxShadow: '0 2px 6px rgba(16, 185, 129, 0.05)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>☀️ CÀI ĐẶT CỮ 1 (MẶC ĐỊNH BẮT BUỘC)</span>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tên Cữ 1:</label>
                              <input
                                type="text"
                                value={dp.cu1_name || ''}
                                onChange={e => updateDp({ cu1_name: e.target.value })}
                                placeholder="VD: Cữ 1: Luyện Đọc Sách Razkids"
                                className="form-input"
                                style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem 0.6rem', fontWeight: 700 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Chữ trên nút hoàn thành:</label>
                              <input
                                type="text"
                                value={dp.cu1_btn_text || 'ĐÃ ĐỌC'}
                                onChange={e => updateDp({ cu1_btn_text: e.target.value })}
                                placeholder="VD: ĐÃ ĐỌC, HOÀN THÀNH"
                                className="form-input"
                                style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem 0.6rem', fontWeight: 700, color: '#16a34a' }}
                              />
                            </div>
                          </div>

                          <div style={{ marginBottom: '0.6rem' }}>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gợi ý hướng dẫn Cữ 1 (Hiện dưới tên cữ):</label>
                            <input
                              type="text"
                              value={dp.cu1_desc || ''}
                              onChange={e => updateDp({ cu1_desc: e.target.value })}
                              placeholder="VD: Đọc to thành tiếng, ghi nhớ từ vựng (Khuyên dùng: 15-20 phút)"
                              className="form-input"
                              style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gợi ý trong ô nhập chi tiết sách/bài:</label>
                            <input
                              type="text"
                              value={dp.cu1_placeholder || ''}
                              onChange={e => updateDp({ cu1_placeholder: e.target.value })}
                              placeholder="VD: Tên cuốn sách hoặc Level Razkids đã đọc..."
                              className="form-input"
                              style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.6rem', color: '#64748b' }}
                            />
                          </div>
                        </div>

                        {/* CÀI ĐẶT CỮ 2 (CÓ CÔNG TẮC BẬT / TẮT) */}
                        <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '10px', border: dp.cu2_enabled !== false ? '1.5px solid #93c5fd' : '1px dashed #cbd5e1', marginBottom: '1rem', opacity: dp.cu2_enabled !== false ? 1 : 0.75 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: dp.cu2_enabled !== false ? '#1d4ed8' : '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>🌙 CÀI ĐẶT CỮ 2 (TÙY CHỌN / BẬT TẮT)</span>
                            </div>
                            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, color: dp.cu2_enabled !== false ? '#1d4ed8' : '#64748b' }}>
                              <input
                                type="checkbox"
                                checked={dp.cu2_enabled !== false}
                                onChange={e => updateDp({ cu2_enabled: e.target.checked })}
                              />
                              <span>{dp.cu2_enabled !== false ? '✓ Đang kích hoạt Cữ 2' : '○ Đang TẮT (Chỉ dùng 1 cữ)'}</span>
                            </label>
                          </div>

                          {dp.cu2_enabled !== false ? (
                            <>
                              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                                <div>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Tên Cữ 2:</label>
                                  <input
                                    type="text"
                                    value={dp.cu2_name || ''}
                                    onChange={e => updateDp({ cu2_name: e.target.value })}
                                    placeholder="VD: Cữ 2: Luyện Nghe Podcast / Shadowing (Tùy chọn)"
                                    className="form-input"
                                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem 0.6rem', fontWeight: 700 }}
                                  />
                                </div>
                                <div>
                                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Chữ trên nút hoàn thành:</label>
                                  <input
                                    type="text"
                                    value={dp.cu2_btn_text || 'ĐÃ NGHE'}
                                    onChange={e => updateDp({ cu2_btn_text: e.target.value })}
                                    placeholder="VD: ĐÃ NGHE, HOÀN THÀNH"
                                    className="form-input"
                                    style={{ width: '100%', fontSize: '0.82rem', padding: '0.4rem 0.6rem', fontWeight: 700, color: '#2563eb' }}
                                  />
                                </div>
                              </div>

                              <div style={{ marginBottom: '0.6rem' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gợi ý hướng dẫn Cữ 2:</label>
                                <input
                                  type="text"
                                  value={dp.cu2_desc || ''}
                                  onChange={e => updateDp({ cu2_desc: e.target.value })}
                                  placeholder="VD: Tắm ngôn ngữ thụ động hoặc Shadowing nhại giọng (10-15 phút)"
                                  className="form-input"
                                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                                />
                              </div>

                              <div>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Gợi ý trong ô nhập chi tiết:</label>
                                <input
                                  type="text"
                                  value={dp.cu2_placeholder || ''}
                                  onChange={e => updateDp({ cu2_placeholder: e.target.value })}
                                  placeholder="VD: Tên bài Podcast hoặc kênh đã nghe..."
                                  className="form-input"
                                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.4rem 0.6rem', color: '#64748b' }}
                                />
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic', padding: '0.4rem 0' }}>
                              💡 Cữ 2 đang được tắt. Học sinh khi nộp báo cáo ngày thường sẽ chỉ thấy duy nhất Cữ 1, giúp thao tác cực nhanh và không bị phân tâm.
                            </div>
                          )}
                        </div>

                        {/* CÁC Ô BỔ TRỢ (LINK & TỪ VỰNG) */}
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a', marginBottom: '0.6rem' }}>
                            📎 Các Ô Thu Thập Bổ Trợ (Link Bài & Từ Mới):
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
                            {/* Ô Link */}
                            <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>🎙️ Ô Dán Link Bài / Ghi Âm</span>
                                <input
                                  type="checkbox"
                                  checked={dp.link_enabled !== false}
                                  onChange={e => updateDp({ link_enabled: e.target.checked })}
                                />
                              </div>
                              <input
                                type="text"
                                value={dp.link_label || ''}
                                onChange={e => updateDp({ link_label: e.target.value })}
                                disabled={dp.link_enabled === false}
                                placeholder="Tiêu đề ô link..."
                                className="form-input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '0.35rem 0.5rem', marginBottom: '0.4rem' }}
                              />
                            </div>

                            {/* Ô Từ vựng */}
                            <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 700 }}>💡 Ô Từ Mới / Thu Hoạch</span>
                                <input
                                  type="checkbox"
                                  checked={dp.vocab_enabled !== false}
                                  onChange={e => updateDp({ vocab_enabled: e.target.checked })}
                                />
                              </div>
                              <input
                                type="text"
                                value={dp.vocab_label || ''}
                                onChange={e => updateDp({ vocab_label: e.target.value })}
                                disabled={dp.vocab_enabled === false}
                                placeholder="Tiêu đề ô từ vựng..."
                                className="form-input"
                                style={{ width: '100%', fontSize: '0.78rem', padding: '0.35rem 0.5rem', marginBottom: '0.4rem' }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* PHẦN 3: LỊCH HÀNG TUẦN & TỰ ĐỘNG SINH BUỔI (WEEKLY SCHEDULE & GENERATOR) */}
              {modalSubTab === "weekly_schedule" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                  {/* Mục 1: Cài đặt lịch cố định hàng tuần */}
                  <div style={{ background: "var(--background)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border)" }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                        <Clock size={16} style={{ color: "#4f46e5" }} />
                        <span>1. Cài Đặt Khung Lịch Hàng Tuần Cố Định</span>
                      </h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                        Ví dụ: Chạy vào Thứ 3 & Thứ 6 lúc 17h30, hoặc học vào Thứ 2 & Thứ 7 ở khung giờ mong muốn
                      </p>
                    </div>

                    {/* Bộ chọn các Thứ trong tuần */}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
                      {DAYS_OF_WEEK.map((d) => {
                        const isSelected = (editingCamp.theme?.weeklySchedule || []).some((s: any) => s.dayOfWeek === d.dayOfWeek)
                        return (
                          <button
                            key={d.dayOfWeek}
                            type="button"
                            onClick={() => toggleWeeklyDay(d.dayOfWeek, d.label)}
                            style={{
                              padding: "0.45rem 0.95rem",
                              borderRadius: "8px",
                              fontSize: "0.82rem",
                              fontWeight: isSelected ? 700 : 500,
                              background: isSelected ? "#4f46e5" : "var(--surface)",
                              color: isSelected ? "white" : "var(--text-main)",
                              border: isSelected ? "1px solid #4f46e5" : "1px solid var(--border)",
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                            }}
                          >
                            {isSelected ? `✓ ${d.label}` : d.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Danh sách các Thứ đang chọn kèm Khung Giờ & Địa Điểm */}
                    {(editingCamp.theme?.weeklySchedule || []).length > 0 ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                        {(editingCamp.theme?.weeklySchedule || []).map((rule: any) => (
                          <div
                            key={rule.dayOfWeek}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1.2fr 1.5fr 2fr 2fr auto",
                              gap: "0.75rem",
                              alignItems: "center",
                              background: "var(--surface)",
                              padding: "0.65rem 0.85rem",
                              borderRadius: "8px",
                              border: "1px solid var(--border)",
                            }}
                          >
                            <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#4f46e5" }}>
                              📅 {rule.dayLabel}
                            </span>
                            <div>
                              <input
                                type="text"
                                value={rule.timeStr}
                                onChange={(e) => updateWeeklyDayField(rule.dayOfWeek, "timeStr", e.target.value)}
                                placeholder="17:30 / 19:00"
                                style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                                title="Khung giờ sinh hoạt"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={rule.location}
                                onChange={(e) => updateWeeklyDayField(rule.dayOfWeek, "location", e.target.value)}
                                placeholder="Địa điểm (Văn Lang / Phòng học)"
                                style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                                title="Địa điểm tập trung"
                              />
                            </div>
                            <div>
                              <input
                                type="text"
                                value={rule.sessionTitle}
                                onChange={(e) => updateWeeklyDayField(rule.dayOfWeek, "sessionTitle", e.target.value)}
                                placeholder="Tên buổi (Chạy tiếp sức / Bài giảng)"
                                style={{ width: "100%", padding: "0.4rem 0.6rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                                title="Tiêu đề buổi mặc định"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleWeeklyDay(rule.dayOfWeek, rule.dayLabel)}
                              style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                              title="Bỏ ngày này"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                        Bố Hoàng hãy bấm vào các nút thứ phía trên (VD: Thứ 3 và Thứ 6) để bật lịch hàng tuần.
                      </div>
                    )}
                  </div>

                  {/* MỤC 1.5: CHIẾN DỊCH TỪNG THÁNG TRONG MÙA GIẢI (DÀNH CHO CLB QUANH NĂM) */}
                  {editingCamp.mode === "clb_quanh_nam" && (() => {
                    const months = editingCamp.club_months || [];
                    const activeMonth = months.find((m: any) => m.id === selectedClubMonthId) || months[0] || {
                      id: '2026-11',
                      label: 'Tháng 11/2026',
                      themeTitle: 'CHIẾN DỊCH THÁNG 11 · BỨT PHÁ TỐC ĐỘ (PACER LEAD)',
                      themeSlogan: 'Rèn nhịp thở đều · Nâng dần cự ly · Đón gió đầu đông',
                      status: 'upcoming'
                    };

                    const updateActiveMonth = (patch: any) => {
                      const updated = months.map((m: any) => {
                        if (m.id === activeMonth.id) {
                          return { ...m, ...patch };
                        }
                        if (patch.isCurrent === true) {
                          return { ...m, isCurrent: false };
                        }
                        return m;
                      });
                      if (!months.some((m: any) => m.id === activeMonth.id)) {
                        updated.push({ ...activeMonth, ...patch });
                      }
                      setEditingCamp({
                        ...editingCamp,
                        club_months: updated
                      });
                    };

                    return (
                      <div style={{
                        background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                        border: "1px solid #fed7aa",
                        borderRadius: "14px",
                        padding: "1.25rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                          <div>
                            <h4 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "#9a3412", display: "flex", alignItems: "center", gap: "8px" }}>
                              <span>🏆</span> Cấu Hình Chiến Dịch 12 Tháng Trong Mùa Giải (Tên & Slogan Tháng)
                            </h4>
                            <p style={{ fontSize: "0.8rem", color: "#c2410c", margin: "0.2rem 0 0" }}>
                              Chọn từng tháng trong mùa giải để đổi Tên Chiến Dịch và Khẩu hiệu/Slogan hiển thị ngoài Web
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const cur = editingCamp.club_months || [];
                              const nextNum = cur.length + 1;
                              const newId = `2027-${String(nextNum).padStart(2, '0')}`;
                              const newM = {
                                id: newId,
                                label: `Tháng ${String(nextNum).padStart(2, '0')}/2027`,
                                themeTitle: `CHIẾN DỊCH MỚI ${newId}`,
                                themeSlogan: 'Duy trì bước chạy kỷ luật cùng đại gia đình Rubisea 19',
                                status: 'upcoming'
                              };
                              setEditingCamp({ ...editingCamp, club_months: [...cur, newM] });
                              setSelectedClubMonthId(newId);
                              setGenMonth(newId);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "0.4rem 0.75rem",
                              borderRadius: "8px",
                              border: "1px solid #ea580c",
                              background: "#ffffff",
                              color: "#ea580c",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            <Plus size={14} /> Thêm Tháng Mới
                          </button>
                        </div>

                        {/* Thanh chọn nhanh tháng (Chip selector) */}
                        <div style={{
                          display: "flex",
                          gap: "0.5rem",
                          overflowX: "auto",
                          paddingBottom: "0.4rem",
                          scrollbarWidth: "thin"
                        }}>
                          {months.map((m: any) => {
                            const isSel = m.id === activeMonth.id;
                            const isCur = m.isCurrent || m.status === 'active';
                            return (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                  setSelectedClubMonthId(m.id);
                                  setGenMonth(m.id);
                                }}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  padding: "0.45rem 0.85rem",
                                  borderRadius: "99px",
                                  border: isSel ? "2px solid #ea580c" : "1px solid #fdba74",
                                  background: isSel ? "#ea580c" : "#ffffff",
                                  color: isSel ? "#ffffff" : "#9a3412",
                                  fontWeight: isSel ? 800 : 600,
                                  fontSize: "0.8rem",
                                  cursor: "pointer",
                                  whiteSpace: "nowrap",
                                  boxShadow: isSel ? "0 2px 6px rgba(234, 88, 12, 0.25)" : "none",
                                  transition: "all 0.15s ease"
                                }}
                              >
                                <span>{m.label || m.id}</span>
                                {isCur && (
                                  <span style={{
                                    background: isSel ? "rgba(255,255,255,0.25)" : "#fee2e2",
                                    color: isSel ? "#ffffff" : "#dc2626",
                                    fontSize: "0.68rem",
                                    padding: "1px 6px",
                                    borderRadius: "99px",
                                    fontWeight: 700
                                  }}>
                                    🔥 Đang chạy
                                  </span>
                                )}
                                {m.status === 'upcoming' && !isCur && (
                                  <span style={{
                                    background: isSel ? "rgba(255,255,255,0.25)" : "#fef3c7",
                                    color: isSel ? "#ffffff" : "#b45309",
                                    fontSize: "0.68rem",
                                    padding: "1px 6px",
                                    borderRadius: "99px"
                                  }}>
                                    Sắp tới
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Khung Chỉnh Sửa Chi Tiết Cho Tháng Đang Chọn */}
                        <div style={{
                          background: "#ffffff",
                          border: "1px solid #fed7aa",
                          borderRadius: "12px",
                          padding: "1rem 1.25rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.85rem"
                        }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.5fr", gap: "0.75rem", alignItems: "center" }}>
                            <div>
                              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9a3412", display: "block", marginBottom: "0.25rem" }}>
                                Tên Tháng Hiển Thị
                              </label>
                              <input
                                type="text"
                                value={activeMonth.label || ""}
                                onChange={(e) => updateActiveMonth({ label: e.target.value })}
                                placeholder="Ví dụ: Tháng 11/2026"
                                style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.82rem", fontWeight: 600 }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9a3412", display: "block", marginBottom: "0.25rem" }}>
                                Trạng Thái Tháng
                              </label>
                              <select
                                value={activeMonth.status || "upcoming"}
                                onChange={(e) => updateActiveMonth({ status: e.target.value })}
                                style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.82rem", fontWeight: 600 }}
                              >
                                <option value="active">🔥 Đang diễn ra (active)</option>
                                <option value="upcoming">⏳ Sắp tới (upcoming)</option>
                                <option value="completed">✅ Đã kết thúc (completed)</option>
                              </select>
                            </div>
                            <div style={{ paddingTop: "1rem" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700, color: "#ea580c" }}>
                                <input
                                  type="checkbox"
                                  checked={!!activeMonth.isCurrent}
                                  onChange={(e) => updateActiveMonth({ isCurrent: e.target.checked, status: e.target.checked ? 'active' : activeMonth.status })}
                                  style={{ width: "16px", height: "16px" }}
                                />
                                🌟 Đặt làm Tháng Hiện Tại (Mặc định mở web)
                              </label>
                            </div>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.8fr", gap: "0.75rem" }}>
                            <div>
                              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9a3412", display: "block", marginBottom: "0.25rem" }}>
                                🏷️ Tiêu Đề Chiến Dịch Tháng
                              </label>
                              <input
                                type="text"
                                value={activeMonth.themeTitle || ""}
                                onChange={(e) => updateActiveMonth({ themeTitle: e.target.value })}
                                placeholder="Ví dụ: CHIẾN DỊCH THÁNG 11 · BỨT PHÁ TỐC ĐỘ (PACER LEAD)"
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1.5px solid #fdba74", fontSize: "0.85rem", fontWeight: 700, color: "#9a3412" }}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#9a3412", display: "block", marginBottom: "0.25rem" }}>
                                💬 Khẩu Hiệu / Slogan Tháng
                              </label>
                              <input
                                type="text"
                                value={activeMonth.themeSlogan || ""}
                                onChange={(e) => updateActiveMonth({ themeSlogan: e.target.value })}
                                placeholder="Ví dụ: Rèn nhịp thở đều · Nâng dần cự ly · Đón gió đầu đông"
                                style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1.5px solid #fdba74", fontSize: "0.85rem", color: "#c2410c" }}
                              />
                            </div>
                          </div>

                          {/* KHUNG XEM TRƯỚC BANNER THỰC TẾ TRÊN WEB (LIVE PREVIEW) */}
                          <div style={{ marginTop: "0.4rem" }}>
                            <div style={{ fontSize: "0.72rem", color: "#9a3412", fontWeight: 700, marginBottom: "0.35rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>👁️</span> Xem trước hiển thị trên Web khi học viên chọn {activeMonth.label || activeMonth.id}:
                            </div>
                            <div style={{
                              background: "linear-gradient(135deg, #ffe4e6 0%, #fecdd3 100%)",
                              border: "1px solid #fda4af",
                              borderRadius: "14px",
                              padding: "0.85rem 1.25rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              flexWrap: "wrap",
                              gap: "0.75rem",
                              boxShadow: "0 2px 8px rgba(225, 29, 72, 0.08)"
                            }}>
                              <div>
                                <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "#9f1239", letterSpacing: "0.02em" }}>
                                  {activeMonth.themeTitle || "CHƯA ĐẶT TIÊU ĐỀ CHIẾN DỊCH"}
                                </div>
                                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#be123c", marginTop: "0.15rem" }}>
                                  {activeMonth.themeSlogan || "Chưa đặt khẩu hiệu cho tháng này"}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "1.2rem", alignItems: "center" }}>
                                <div style={{ textAlign: "center" }}>
                                  <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#9f1239" }}>
                                    {(editingCamp.sessions || []).filter((s: any) => s.dateStr && s.dateStr.startsWith(activeMonth.id)).length || 8}
                                  </div>
                                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#be123c", textTransform: "uppercase" }}>Buổi T6 & CN</div>
                                </div>
                                <div style={{ textAlign: "center" }}>
                                  <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#9f1239" }}>2</div>
                                  <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#be123c", textTransform: "uppercase" }}>Buổi / Tuần</div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hành động nhanh cho tháng này */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.25rem" }}>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              💡 Mọi thay đổi sẽ được lưu vào cơ sở dữ liệu khi bạn bấm nút "Lưu Cấu Hình Toàn Diện" phía dưới.
                            </span>
                            {months.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Bạn có chắc muốn xóa cấu hình Tháng ${activeMonth.label || activeMonth.id}?`)) {
                                    const updated = months.filter((m: any) => m.id !== activeMonth.id);
                                    setEditingCamp({ ...editingCamp, club_months: updated });
                                    if (updated.length > 0) {
                                      setSelectedClubMonthId(updated[0].id);
                                      setGenMonth(updated[0].id);
                                    }
                                  }
                                }}
                                style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                              >
                                <Trash2 size={13} /> Xóa tháng này khỏi mùa giải
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}


                  {/* Mục 2: Bộ Sinh Lịch Tự Động (1-Click Generator) */}
                  <div style={{
                    background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(245, 158, 11, 0.08) 100%)",
                    padding: "1.25rem",
                    borderRadius: "12px",
                    border: "1px dashed #818cf8",
                  }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#4f46e5", display: "flex", alignItems: "center", gap: "8px" }}>
                        <Zap size={16} style={{ color: "#f59e0b" }} />
                        <span>2. Bộ Sinh Lịch 1-Chạm (Auto Schedule Generator)</span>
                      </h4>
                      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                        Hệ thống tự động tính ngày thực tế theo cuốn lịch và sinh ra toàn bộ danh sách buổi chỉ trong 1 giây
                      </p>
                    </div>

                    {editingCamp.mode === "clb_quanh_nam" || editingCamp.mode === "cham_cong" ? (
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div>
                          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                            Chọn Tháng Cần Sinh Lịch
                          </label>
                          <input
                            type="month"
                            value={genMonth}
                            onChange={(e) => setGenMonth(e.target.value)}
                            style={{ padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "0.85rem", fontWeight: 600 }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoGenerateSessions}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                            color: "white",
                            padding: "0.6rem 1.25rem",
                            borderRadius: "8px",
                            border: "none",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                          }}
                        >
                          <Zap size={16} />
                          <span>⚡ {editingCamp.mode === "cham_cong" ? "Sinh Toàn Bộ Lịch Ca Làm Cả Tháng Này" : "Sinh Toàn Bộ Lịch Chạy Cả Tháng Này"}</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                        <div>
                          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                            Ngày Khai Giảng / Bắt Đầu
                          </label>
                          <input
                            type="date"
                            value={genStartDate}
                            onChange={(e) => setGenStartDate(e.target.value)}
                            style={{ padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "0.85rem", fontWeight: 600 }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.8rem", fontWeight: 600, display: "block", marginBottom: "0.3rem" }}>
                            Tổng Số Buổi Khóa Học
                          </label>
                          <select
                            value={genTotalCount}
                            onChange={(e) => setGenTotalCount(parseInt(e.target.value))}
                            style={{ padding: "0.5rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", fontSize: "0.85rem", fontWeight: 600 }}
                          >
                            <option value={24}>24 buổi (3 tháng · Kindy/Kids/IELTS)</option>
                            <option value={32}>32 buổi (4 tháng · Teen)</option>
                            <option value={16}>16 buổi (2 tháng)</option>
                            <option value={12}>12 buổi (Khóa cấp tốc)</option>
                          </select>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoGenerateSessions}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                            color: "white",
                            padding: "0.6rem 1.25rem",
                            borderRadius: "8px",
                            border: "none",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                          }}
                        >
                          <Zap size={16} />
                          <span>⚡ Sinh {genTotalCount} Buổi Học Chia 3 Chặng Chuẩn Cambridge</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Mục 3: Danh sách các buổi chi tiết đã sinh */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                      <div>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                          📋 Danh Sách Các Buổi Trong Lịch Trình ({editingCamp.sessions?.length || 0} buổi)
                        </h4>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                          Bố Hoàng có thể chỉnh sửa trực tiếp từng buổi, gắn Video, Slide Canva, Bài tập về nhà hoặc xóa ngày nghỉ
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const newSession = {
                            id: `session_${Date.now()}`,
                            sessionCode: `B${(editingCamp.sessions || []).length + 1}`,
                            title: `Buổi bổ sung #${(editingCamp.sessions || []).length + 1}`,
                            dateStr: new Date().toISOString().slice(0, 10),
                            timeStr: "17:30",
                            location: editingCamp.theme?.locationText || "Công viên Văn Lang",
                            desc: "",
                          }
                          setEditingCamp({
                            ...editingCamp,
                            sessions: [...(editingCamp.sessions || []), newSession],
                          })
                        }}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "var(--surface)",
                          color: "#4f46e5",
                          border: "1px solid #4f46e5",
                          padding: "0.4rem 0.85rem",
                          borderRadius: "6px",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <Plus size={14} />
                        <span>+ Thêm 1 Buổi Lẻ</span>
                      </button>
                    </div>

                    <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                          <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                            <th style={{ padding: "0.6rem 0.75rem" }}>Mã Buổi</th>
                            <th style={{ padding: "0.6rem 0.75rem" }}>Ngày & Giờ</th>
                            <th style={{ padding: "0.6rem 0.75rem" }}>Tên Buổi Học / Chạy</th>
                            <th style={{ padding: "0.6rem 0.75rem" }}>Học Liệu & Tiện Ích</th>
                            <th style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(editingCamp.sessions || []).map((s: any, idx: number) => {
                            const hasVideo = !!s.videoUrl
                            const hasDownload = !!s.videoDownloadUrl
                            const hasCanva = !!s.canvaUrl
                            const hasSummary = !!s.summaryText
                            const hasHw = !!(s.homework?.title || s.homework?.instructions)
                            return (
                              <tr key={s.id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                                <td style={{ padding: "0.6rem 0.75rem", fontWeight: 700, color: "#4f46e5" }}>
                                  <div>{s.sessionCode}</div>
                                  {s.isParallel && (
                                    <span style={{
                                      display: "inline-block",
                                      background: s.isSpecialEvent ? "#fef3c7" : "#ecfdf5",
                                      color: s.isSpecialEvent ? "#b45309" : "#047857",
                                      border: s.isSpecialEvent ? "1px solid #fde68a" : "1px solid #a7f3d0",
                                      fontSize: "0.66rem",
                                      fontWeight: 700,
                                      padding: "1px 5px",
                                      borderRadius: "4px",
                                      marginTop: "2px",
                                    }}>
                                      {s.scopeTag || (s.isSpecialEvent ? "🏆 THI ĐẤU" : "🏃 TẠI CLB")}
                                    </span>
                                  )}
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem" }}>
                                  <div>📅 {s.dateStr}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>⏰ {s.timeStr}</div>
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
                                  <div>{s.title}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>📍 {s.location}</div>
                                  <div style={{ display: "inline-flex", gap: "4px", marginTop: "2px", flexWrap: "wrap" }}>
                                    {s.isSpecialEvent && <span style={{ background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>{s.specialBadge || "SỰ KIỆN"}</span>}
                                    {s.isParallel && <span style={{ background: "#ede9fe", color: "#6d28d9", padding: "1px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>⚡ SONG SONG</span>}
                                  </div>
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem" }}>
                                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                    {hasVideo ? (
                                      <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>🎥 Video</span>
                                    ) : null}
                                    {hasDownload ? (
                                      <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>📥 Tải</span>
                                    ) : null}
                                    {(editingCamp?.mode === "lop_hoc_buoi" || editingCamp?.scope === "branch" || editingCamp?.theme?.scope === "branch") && hasCanva ? (
                                      <span style={{ background: "#f3e8ff", color: "#6b21a8", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>🎨 Canva</span>
                                    ) : null}
                                    {hasSummary ? (
                                      <span style={{ background: "#f1f5f9", color: "#334155", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>📝 Tóm tắt</span>
                                    ) : null}
                                    {hasHw ? (
                                      <span style={{ background: "#fce7f3", color: "#9d174d", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>🎯 BTVN</span>
                                    ) : null}
                                    {!hasVideo && !hasCanva && !hasSummary && !hasHw && (
                                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic" }}>Chưa có học liệu</span>
                                    )}
                                  </div>
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
                                  <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSessionItem(JSON.parse(JSON.stringify(s)))}
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "4px",
                                        background: "#eef2ff",
                                        color: "#4f46e5",
                                        border: "1px solid #c7d2fe",
                                        padding: "4px 8px",
                                        borderRadius: "6px",
                                        fontSize: "0.75rem",
                                        fontWeight: 700,
                                        cursor: "pointer",
                                      }}
                                      title="Soạn học liệu, Video & BTVN"
                                    >
                                      <Video size={13} />
                                      <span>Học Liệu & Video</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSession(s.id)}
                                      style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                                      title="Xóa buổi này"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                          {(editingCamp.sessions || []).length === 0 && (
                            <tr>
                              <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                                Chưa có buổi nào trong lịch trình. Bố Hoàng hãy chọn Thứ ở mục 1 và bấm nút "⚡ Sinh Lịch 1-Chạm" ở mục 2 nhé!
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* PHẦN 7: BẢNG PHONG THẦN ALL-TIME (CHO CLB QUANH NĂM) */}
              {modalSubTab === "hall_of_fame" && (() => {
                const hof = editingCamp.theme?.hall_of_fame || {
                  title_kids: '👑 BẢNG PHONG THẦN RUNNER NHÍ · ALL-TIME 2026',
                  subtitle_kids: 'Tôn vinh những đôi chân nhí kiên cường nhất của Rubisea 19 từ đầu năm đến nay',
                  flame_hint_kids: '🔥 Tính theo Tuần Kỷ Luật U15 (đủ cả 2 buổi T6 & CN)',
                  clubs_kids: [
                    { min_km: 100, name: 'Club 100km · Kiện Tướng Nhí', badge: '👑', border_color: '#f59e0b', name_color: '#b45309' },
                    { min_km: 75, name: 'Club 75km · Bàn Chân Thép U15', badge: '🥈', border_color: '#3b82f6', name_color: '#1d4ed8' },
                    { min_km: 50, name: 'Club 50km · Bứt Phá Cự Ly', badge: '🥉', border_color: '#10b981', name_color: '#047857' },
                    { min_km: 25, name: 'Club 25km · Tân Binh Kỷ Luật', badge: '⚡', border_color: '#8b5cf6', name_color: '#6d28d9' },
                  ],
                  title_adults: '👑 BẢNG PHONG THẦN PACER & PHỤ HUYNH · ALL-TIME 2026',
                  subtitle_adults: 'Tôn vinh những đôi chân kỳ cựu gương mẫu, dẫn dắt và tiếp sức cho các con',
                  flame_hint_adults: '🔥 Tính theo Tuần Kỷ Luật (đủ 2 buổi T6 & CN)',
                  clubs_adults: [
                    { min_km: 300, name: 'Club 300km · Huyền Thoại Pacer', badge: '👑', border_color: '#f59e0b', name_color: '#b45309' },
                    { min_km: 200, name: 'Club 200km · Chiến Binh Tiên Phong', badge: '🥈', border_color: '#3b82f6', name_color: '#1d4ed8' },
                    { min_km: 100, name: 'Club 100km · Bàn Chân Thép', badge: '🥉', border_color: '#10b981', name_color: '#047857' },
                    { min_km: 50, name: 'Club 50km · Phụ Huynh Gương Mẫu', badge: '⚡', border_color: '#8b5cf6', name_color: '#6d28d9' },
                  ],
                  starter_enabled: true,
                  starter_title_kids: '🌱 VƯỜN ƯƠM RUNNER NHÍ (< 25KM) · ĐANG TÍCH LŨY BƯỚC CHẠY',
                  starter_subtitle_kids: 'Chặng đường vạn dặm bắt đầu từ bước chân đầu tiên. Tích lũy đủ 25km để chính thức thăng hạng lên Club 25km!',
                  starter_title_adults: '🌱 TÂN BINH PACER & PHỤ HUYNH (< 50KM) · ĐANG TÍCH LŨY',
                  starter_subtitle_adults: 'Đồng hành cùng các con trên từng dặm đường. Tích lũy đủ 50km để thăng hạng lên Club 50km!',
                };

                const updateHof = (patch: any) => {
                  setEditingCamp({
                    ...editingCamp,
                    theme: {
                      ...(editingCamp.theme || {}),
                      hall_of_fame: {
                        ...hof,
                        ...patch
                      }
                    }
                  });
                };

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Header Card Giới Thiệu */}
                    <div style={{
                      background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
                      border: "1px solid #fed7aa",
                      borderRadius: "14px",
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                      gap: "1rem"
                    }}>
                      <div>
                        <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#9a3412", display: "flex", alignItems: "center", gap: "8px" }}>
                          <span>👑</span> Cấu Hình Bảng Phong Thần All-Time · CLB Quanh Năm
                        </h4>
                        <p style={{ margin: "0.3rem 0 0", fontSize: "0.82rem", color: "#c2410c", lineHeight: 1.5 }}>
                          Tùy biến các nấc mốc Km danh dự, tên CLB, huy hiệu và Vườn Ươm Tân Binh. Web sẽ tự động phân loại Runner vào các CLB dựa trên số km tích lũy thật cả năm!
                        </p>
                      </div>
                      <span style={{
                        background: "#fff",
                        padding: "0.35rem 0.85rem",
                        borderRadius: "99px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "#ea580c",
                        border: "1px solid #fdba74"
                      }}>
                        ⚡ Tự động tính 100% từ Km thật
                      </span>
                    </div>

                    {/* SECTION 1: BẢNG RUNNER NHÍ (U15) */}
                    <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#e11d48", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🌟</span> Bảng Runner Nhí (U15) · Cột Mốc Vinh Danh
                          </h4>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Các nấc Cột mốc dành cho các bạn nhỏ U15</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = hof.clubs_kids || [];
                            const nextMin = current.length > 0 ? Math.max(0, current[current.length - 1].min_km - 25) : 25;
                            const newClub = {
                              min_km: nextMin,
                              name: `Club ${nextMin}km · Cột Mốc Mới`,
                              badge: '🎖️',
                              border_color: '#3b82f6',
                              name_color: '#1d4ed8'
                            };
                            updateHof({ clubs_kids: [...current, newClub] });
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "0.45rem 0.85rem",
                            borderRadius: "8px",
                            border: "1px solid #e11d48",
                            background: "#fff1f2",
                            color: "#e11d48",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          <Plus size={14} /> Thêm Cột Mốc CLB Nhí
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1.5fr", gap: "0.75rem", marginBottom: "1rem" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Tiêu Đề Bảng Nhí</label>
                          <input
                            type="text"
                            value={hof.title_kids || ""}
                            onChange={(e) => updateHof({ title_kids: e.target.value })}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Phụ Đề Bảng Nhí</label>
                          <input
                            type="text"
                            value={hof.subtitle_kids || ""}
                            onChange={(e) => updateHof({ subtitle_kids: e.target.value })}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Ghi Chú Tuần Kỷ Luật</label>
                          <input
                            type="text"
                            value={hof.flame_hint_kids || ""}
                            onChange={(e) => updateHof({ flame_hint_kids: e.target.value })}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                          />
                        </div>
                      </div>

                      {/* Danh Sách CLB Nhí */}
                      <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                          <thead>
                            <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
                              <th style={{ padding: "0.6rem 0.75rem", width: "100px" }}>Mốc Km (≥)</th>
                              <th style={{ padding: "0.6rem 0.75rem" }}>Tên CLB Vinh Danh</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "70px", textAlign: "center" }}>Badge</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "110px" }}>Màu Viền</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "110px" }}>Màu Chữ</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "60px", textAlign: "center" }}>Xóa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(hof.clubs_kids || []).map((club: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "var(--surface)" }}>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <input
                                    type="number"
                                    value={club.min_km}
                                    onChange={(e) => {
                                      const updated = [...hof.clubs_kids];
                                      updated[idx] = { ...updated[idx], min_km: Number(e.target.value) };
                                      updateHof({ clubs_kids: updated });
                                    }}
                                    style={{ width: "75px", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: 700, fontSize: "0.82rem" }}
                                  />
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <input
                                    type="text"
                                    value={club.name}
                                    onChange={(e) => {
                                      const updated = [...hof.clubs_kids];
                                      updated[idx] = { ...updated[idx], name: e.target.value };
                                      updateHof({ clubs_kids: updated });
                                    }}
                                    style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: 600, fontSize: "0.82rem" }}
                                  />
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                                  <input
                                    type="text"
                                    value={club.badge}
                                    onChange={(e) => {
                                      const updated = [...hof.clubs_kids];
                                      updated[idx] = { ...updated[idx], badge: e.target.value };
                                      updateHof({ clubs_kids: updated });
                                    }}
                                    style={{ width: "42px", padding: "0.35rem", textAlign: "center", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.95rem" }}
                                  />
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <input
                                      type="color"
                                      value={club.border_color || "#f59e0b"}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_kids];
                                        updated[idx] = { ...updated[idx], border_color: e.target.value };
                                        updateHof({ clubs_kids: updated });
                                      }}
                                      style={{ width: "28px", height: "28px", border: "none", cursor: "pointer", background: "none" }}
                                    />
                                    <input
                                      type="text"
                                      value={club.border_color || ""}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_kids];
                                        updated[idx] = { ...updated[idx], border_color: e.target.value };
                                        updateHof({ clubs_kids: updated });
                                      }}
                                      style={{ width: "65px", padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.75rem" }}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <input
                                      type="color"
                                      value={club.name_color || "#b45309"}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_kids];
                                        updated[idx] = { ...updated[idx], name_color: e.target.value };
                                        updateHof({ clubs_kids: updated });
                                      }}
                                      style={{ width: "28px", height: "28px", border: "none", cursor: "pointer", background: "none" }}
                                    />
                                    <input
                                      type="text"
                                      value={club.name_color || ""}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_kids];
                                        updated[idx] = { ...updated[idx], name_color: e.target.value };
                                        updateHof({ clubs_kids: updated });
                                      }}
                                      style={{ width: "65px", padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.75rem" }}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = hof.clubs_kids.filter((_: any, i: number) => i !== idx);
                                      updateHof({ clubs_kids: updated });
                                    }}
                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION 2: BẢNG PACER & PHỤ HUYNH */}
                    <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "14px", padding: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#4f46e5", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🏃</span> Bảng Pacer & Phụ Huynh · Cột Mốc Vinh Danh
                          </h4>
                          <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Các nấc Cột mốc dành cho Pacer và Phụ huynh gương mẫu</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const current = hof.clubs_adults || [];
                            const nextMin = current.length > 0 ? Math.max(0, current[current.length - 1].min_km - 50) : 50;
                            const newClub = {
                              min_km: nextMin,
                              name: `Club ${nextMin}km · Cột Mốc Mới`,
                              badge: '🎖️',
                              border_color: '#3b82f6',
                              name_color: '#1d4ed8'
                            };
                            updateHof({ clubs_adults: [...current, newClub] });
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "0.45rem 0.85rem",
                            borderRadius: "8px",
                            border: "1px solid #4f46e5",
                            background: "#eef2ff",
                            color: "#4f46e5",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          <Plus size={14} /> Thêm Cột Mốc CLB Người Lớn
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 2fr 1.5fr", gap: "0.75rem", marginBottom: "1rem" }}>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Tiêu Đề Bảng Người Lớn</label>
                          <input
                            type="text"
                            value={hof.title_adults || ""}
                            onChange={(e) => updateHof({ title_adults: e.target.value })}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Phụ Đề Bảng Người Lớn</label>
                          <input
                            type="text"
                            value={hof.subtitle_adults || ""}
                            onChange={(e) => updateHof({ subtitle_adults: e.target.value })}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: "0.75rem", fontWeight: 700, display: "block", marginBottom: "0.25rem" }}>Ghi Chú Tuần Kỷ Luật</label>
                          <input
                            type="text"
                            value={hof.flame_hint_adults || ""}
                            onChange={(e) => updateHof({ flame_hint_adults: e.target.value })}
                            style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                          />
                        </div>
                      </div>

                      {/* Danh Sách CLB Người Lớn */}
                      <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                          <thead>
                            <tr style={{ background: "var(--surface)", borderBottom: "1px solid var(--border)", textAlign: "left", color: "var(--text-muted)" }}>
                              <th style={{ padding: "0.6rem 0.75rem", width: "100px" }}>Mốc Km (≥)</th>
                              <th style={{ padding: "0.6rem 0.75rem" }}>Tên CLB Vinh Danh</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "70px", textAlign: "center" }}>Badge</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "110px" }}>Màu Viền</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "110px" }}>Màu Chữ</th>
                              <th style={{ padding: "0.6rem 0.75rem", width: "60px", textAlign: "center" }}>Xóa</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(hof.clubs_adults || []).map((club: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: "1px solid var(--border)", background: idx % 2 === 0 ? "transparent" : "var(--surface)" }}>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <input
                                    type="number"
                                    value={club.min_km}
                                    onChange={(e) => {
                                      const updated = [...hof.clubs_adults];
                                      updated[idx] = { ...updated[idx], min_km: Number(e.target.value) };
                                      updateHof({ clubs_adults: updated });
                                    }}
                                    style={{ width: "75px", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: 700, fontSize: "0.82rem" }}
                                  />
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <input
                                    type="text"
                                    value={club.name}
                                    onChange={(e) => {
                                      const updated = [...hof.clubs_adults];
                                      updated[idx] = { ...updated[idx], name: e.target.value };
                                      updateHof({ clubs_adults: updated });
                                    }}
                                    style={{ width: "100%", padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid var(--border)", fontWeight: 600, fontSize: "0.82rem" }}
                                  />
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                                  <input
                                    type="text"
                                    value={club.badge}
                                    onChange={(e) => {
                                      const updated = [...hof.clubs_adults];
                                      updated[idx] = { ...updated[idx], badge: e.target.value };
                                      updateHof({ clubs_adults: updated });
                                    }}
                                    style={{ width: "42px", padding: "0.35rem", textAlign: "center", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.95rem" }}
                                  />
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <input
                                      type="color"
                                      value={club.border_color || "#f59e0b"}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_adults];
                                        updated[idx] = { ...updated[idx], border_color: e.target.value };
                                        updateHof({ clubs_adults: updated });
                                      }}
                                      style={{ width: "28px", height: "28px", border: "none", cursor: "pointer", background: "none" }}
                                    />
                                    <input
                                      type="text"
                                      value={club.border_color || ""}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_adults];
                                        updated[idx] = { ...updated[idx], border_color: e.target.value };
                                        updateHof({ clubs_adults: updated });
                                      }}
                                      style={{ width: "65px", padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.75rem" }}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <input
                                      type="color"
                                      value={club.name_color || "#b45309"}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_adults];
                                        updated[idx] = { ...updated[idx], name_color: e.target.value };
                                        updateHof({ clubs_adults: updated });
                                      }}
                                      style={{ width: "28px", height: "28px", border: "none", cursor: "pointer", background: "none" }}
                                    />
                                    <input
                                      type="text"
                                      value={club.name_color || ""}
                                      onChange={(e) => {
                                        const updated = [...hof.clubs_adults];
                                        updated[idx] = { ...updated[idx], name_color: e.target.value };
                                        updateHof({ clubs_adults: updated });
                                      }}
                                      style={{ width: "65px", padding: "0.25rem 0.4rem", borderRadius: "4px", border: "1px solid var(--border)", fontSize: "0.75rem" }}
                                    />
                                  </div>
                                </td>
                                <td style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = hof.clubs_adults.filter((_: any, i: number) => i !== idx);
                                      updateHof({ clubs_adults: updated });
                                    }}
                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* SECTION 3: VƯỜN ƯƠM TÂN BINH (DẢI NGANG BANNER TOÀN MÀN HÌNH - BỐ CỤC CÁCH A) */}
                    <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)", border: "1.5px solid #a7f3d0", borderRadius: "14px", padding: "1.25rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                        <div>
                          <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "#065f46", display: "flex", alignItems: "center", gap: "6px" }}>
                            <span>🌱</span> Vườn Ươm Tân Binh (Dải Ngang Banner Toàn Màn Hình · Bố Cục Cách A)
                          </h4>
                          <span style={{ fontSize: "0.78rem", color: "#047857" }}>
                            Hiển thị các bạn nhỏ hoặc tân binh có km &lt; mốc thấp nhất đang nỗ lực tích lũy
                          </span>
                        </div>
                        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "0.82rem", fontWeight: 700, color: "#065f46" }}>
                          <input
                            type="checkbox"
                            checked={hof.starter_enabled !== false}
                            onChange={(e) => updateHof({ starter_enabled: e.target.checked })}
                            style={{ width: "16px", height: "16px" }}
                          />
                          Bật Vườn Ươm Tân Binh
                        </label>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                        <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #d1fae5" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#065f46", display: "block", marginBottom: "0.5rem" }}>
                            🌟 Cấu Hình Vườn Ươm Runner Nhí
                          </span>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>Tiêu đề Vườn Ươm Nhí</label>
                            <input
                              type="text"
                              value={hof.starter_title_kids || ""}
                              onChange={(e) => updateHof({ starter_title_kids: e.target.value })}
                              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>Phụ đề truyền cảm hứng</label>
                            <textarea
                              rows={2}
                              value={hof.starter_subtitle_kids || ""}
                              onChange={(e) => updateHof({ starter_subtitle_kids: e.target.value })}
                              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                            />
                          </div>
                        </div>

                        <div style={{ background: "#ffffff", padding: "1rem", borderRadius: "10px", border: "1px solid #d1fae5" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#065f46", display: "block", marginBottom: "0.5rem" }}>
                            🏃 Cấu Hình Vườn Ươm Pacer & Phụ Huynh
                          </span>
                          <div style={{ marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>Tiêu đề Vườn Ươm Người Lớn</label>
                            <input
                              type="text"
                              value={hof.starter_title_adults || ""}
                              onChange={(e) => updateHof({ starter_title_adults: e.target.value })}
                              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginBottom: "0.2rem" }}>Phụ đề truyền cảm hứng</label>
                            <textarea
                              rows={2}
                              value={hof.starter_subtitle_adults || ""}
                              onChange={(e) => updateHof({ starter_subtitle_adults: e.target.value })}
                              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* PHẦN 4: THÊM SỰ KIỆN ĐẶC BIỆT (GIẢI CHẠY, THI THỬ...) */}
              {modalSubTab === "special_events" && (
                <div>
                  <div style={{ marginBottom: "1.25rem" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                      🏆 Sự Kiện Đặc Biệt Trong Lịch Trình
                    </h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.15rem 0 0" }}>
                      Thêm giải chạy việt dã (Vĩnh Yên, Hải Phòng), thi thử IELTS Mock Test hoặc ngoại khóa dã ngoại
                    </p>
                  </div>

                  {/* Danh sách sự kiện hiện có */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
                    {(editingCamp.sessions || []).filter((s: any) => s.isSpecialEvent).map((ev: any) => (
                      <div
                        key={ev.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.75rem 1rem",
                          background: "var(--background)",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                              {ev.specialBadge || "🏆 SỰ KIỆN"}
                            </span>
                            <strong style={{ fontSize: "0.9rem" }}>{ev.title}</strong>
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "0.25rem" }}>
                            📅 {ev.dateStr} · ⏰ {ev.timeStr} · 📍 {ev.location}
                          </div>
                          {ev.desc && <div style={{ fontSize: "0.78rem", fontStyle: "italic", marginTop: "0.2rem" }}>{ev.desc}</div>}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteSession(ev.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          title="Xóa sự kiện này"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}

                    {(editingCamp.sessions || []).filter((s: any) => s.isSpecialEvent).length === 0 && (
                      <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-muted)", fontSize: "0.85rem", background: "var(--background)", borderRadius: "8px" }}>
                        Chưa có sự kiện đặc biệt nào được thêm vào lịch trình này.
                      </div>
                    )}
                  </div>

                  {/* Form Thêm Sự Kiện */}
                  <div style={{
                    background: "rgba(79, 70, 229, 0.04)",
                    border: "1px dashed #818cf8",
                    borderRadius: "10px",
                    padding: "1rem",
                  }}>
                    <h5 style={{ fontSize: "0.88rem", fontWeight: 700, margin: "0 0 0.75rem", color: "#4f46e5" }}>
                      + Thêm Sự Kiện Mới Vào Lịch
                    </h5>

                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Tên Sự Kiện</label>
                        <input
                          type="text"
                          value={newEvent.title}
                          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                          placeholder="Ví dụ: Giải Marathon Vĩnh Yên / Thi thử IELTS"
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Huy Hiệu (Badge)</label>
                        <input
                          type="text"
                          value={newEvent.specialBadge}
                          onChange={(e) => setNewEvent({ ...newEvent, specialBadge: e.target.value })}
                          placeholder="🏆 GIẢI ĐẤU"
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Ngày Diễn Ra</label>
                        <input
                          type="date"
                          value={newEvent.dateStr}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val && val.includes("-")) {
                              const [y, m, d] = val.split("-").map(Number);
                              const dateObj = new Date(y, m - 1, d);
                              const dayOfWeek = dateObj.getDay();
                              const dayShort = dayOfWeek === 0 ? "CN" : `T${dayOfWeek + 1}`;
                              const timeOnly = (newEvent.timeStr || "05:30").replace(/^(CN|T[2-7])\s*/, "");
                              setNewEvent({
                                ...newEvent,
                                dateStr: val,
                                timeStr: `${dayShort} ${timeOnly || "05:30"}`,
                              });
                            } else {
                              setNewEvent({ ...newEvent, dateStr: val });
                            }
                          }}
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Giờ Tập Trung</label>
                        <input
                          type="text"
                          value={newEvent.timeStr}
                          onChange={(e) => setNewEvent({ ...newEvent, timeStr: e.target.value })}
                          placeholder="CN 05:30"
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Địa Điểm</label>
                        <input
                          type="text"
                          value={newEvent.location}
                          onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                          placeholder="Quảng trường Đầm Vạc..."
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Mô Tả Chi Tiết</label>
                      <input
                        type="text"
                        value={newEvent.desc}
                        onChange={(e) => setNewEvent({ ...newEvent, desc: e.target.value })}
                        placeholder="Tham gia cự ly 3km - 5km cùng 500 runner nhí toàn quốc..."
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddSpecialEvent}
                      style={{
                        background: "#4f46e5",
                        color: "white",
                        padding: "0.5rem 1rem",
                        borderRadius: "6px",
                        border: "none",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      + Thêm Vào Lịch Trình Học Viên
                    </button>
                  </div>
                </div>
              )}

              {/* PHẦN 5: QUY TẮC TÍNH ĐIỂM (SCORING RULES) */}
              {modalSubTab === "scoring" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                      💎 Quy Tắc Tính Điểm & Điểm Thưởng Thi Đua
                    </h4>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                      Tùy biến số điểm thưởng cho từng nỗ lực để tạo động lực nội tại cho các học viên / runner nhí
                    </p>
                  </div>

                  {/* CẤU HÌNH LINK BÀI VIẾT QUY CHẾ ĐẦY ĐỦ (DÀNH CHO TẤT CẢ HÀNH TRÌNH TRỪ THÓI QUEN CÁ NHÂN) */}
                  {editingCamp.mode !== 'thoi_quen_ca_nhan' && (
                    <div style={{
                      padding: "1.1rem",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
                      border: "1.5px solid #bfdbfe",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.85rem",
                      boxShadow: "0 2px 8px rgba(59, 130, 246, 0.05)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.3rem" }}>📖</span>
                        <div>
                          <h5 style={{ fontSize: "0.92rem", fontWeight: 800, margin: 0, color: "#1e3a8a" }}>
                            Liên Kết Bài Viết Quy Chế Tính Điểm Chi Tiết (Web1 / PDF)
                          </h5>
                          <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "3px 0 0" }}>
                            Hiển thị nút <b>"Đọc cơ chế tính điểm đầy đủ ↗"</b> dưới Bảng xếp hạng. Khi click sẽ mở bài viết Sếp tạo trên Web1 (quantri.viceduvn.com)
                          </p>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.85rem" }}>
                        <div>
                          <label style={{ fontSize: "0.76rem", fontWeight: 800, display: "block", marginBottom: "4px", color: "#1e293b" }}>
                            🔗 Đường dẫn bài viết quy chế (URL):
                          </label>
                          <input
                            type="text"
                            placeholder="VD: https://viceduvn.com/tin-tuc/quy-che-cham-cong-vicedu"
                            value={editingCamp.theme?.rules_doc_url || ""}
                            onChange={(e) => setEditingCamp({
                              ...editingCamp,
                              theme: {
                                ...(editingCamp.theme || {}),
                                rules_doc_url: e.target.value.trim()
                              }
                            })}
                            onBlur={(e) => {
                              const val = e.target.value.trim();
                              if (val && !/^https?:\/\//i.test(val) && !val.startsWith('/')) {
                                setEditingCamp({
                                  ...editingCamp,
                                  theme: {
                                    ...(editingCamp.theme || {}),
                                    rules_doc_url: `https://${val}`
                                  }
                                });
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              borderRadius: "8px",
                              border: "1.5px solid #cbd5e1",
                              fontSize: "0.82rem",
                              outline: "none",
                              background: "#ffffff"
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: "0.76rem", fontWeight: 800, display: "block", marginBottom: "4px", color: "#1e293b" }}>
                            🏷️ Tiêu đề nút hiển thị:
                          </label>
                          <input
                            type="text"
                            placeholder="Mặc định: Đọc cơ chế tính điểm đầy đủ"
                            value={editingCamp.theme?.rules_doc_title || ""}
                            onChange={(e) => setEditingCamp({
                              ...editingCamp,
                              theme: {
                                ...(editingCamp.theme || {}),
                                rules_doc_title: e.target.value
                              }
                            })}
                            style={{
                              width: "100%",
                              padding: "0.55rem 0.75rem",
                              borderRadius: "8px",
                              border: "1.5px solid #cbd5e1",
                              fontSize: "0.82rem",
                              outline: "none",
                              background: "#ffffff"
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: "0.76rem", fontWeight: 800, display: "block", marginBottom: "4px", color: "#1e293b" }}>
                          📝 Ghi chú tóm tắt quy chế (Hiển thị ngay trên nút bấm - Tùy chọn):
                        </label>
                        <textarea
                          rows={2}
                          placeholder="VD: Làm đủ tiêu chuẩn ca để được tính công. Đi muộn hoặc quên check-out cần nộp đơn giải trình trước ngày 05 hàng tháng."
                          value={editingCamp.theme?.rules_doc_note || ""}
                          onChange={(e) => setEditingCamp({
                            ...editingCamp,
                            theme: {
                              ...(editingCamp.theme || {}),
                              rules_doc_note: e.target.value
                            }
                          })}
                          style={{
                            width: "100%",
                            padding: "0.55rem 0.75rem",
                            borderRadius: "8px",
                            border: "1.5px solid #cbd5e1",
                            fontSize: "0.82rem",
                            outline: "none",
                            background: "#ffffff",
                            resize: "vertical"
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Nút bấm chọn nhanh mẫu tính điểm chuẩn */}
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", alignItems: "center" }}>
                    <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)" }}>
                      ⚡ Nạp mẫu 1-chạm:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCamp({
                          ...editingCamp,
                          scoring_rules: [
                            { label: 'Check-in GPS đúng ca', points: '+1' },
                            { label: 'Đúng giờ không đi muộn / về sớm', points: '+1' },
                            { label: 'Check-out GPS đầy đủ', points: '+1' },
                            { label: 'Tuần chuyên cần 100% (đủ ca làm)', points: '+5' },
                            { label: 'Tháng chuyên cần xuất sắc', points: '+10' },
                          ]
                        });
                      }}
                      style={{ padding: "4px 10px", borderRadius: "6px", background: "#ecfdf5", color: "#059669", border: "1px solid #a7f3d0", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      📍 Dùng mẫu Chấm Công (VicHRM)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCamp({
                          ...editingCamp,
                          scoring_rules: [
                            { 
                              label: 'Mỗi bài tập hoàn thành', 
                              points: '+1',
                              description: 'Tích lũy bài tập Padlet & đọc sách Razkids hằng ngày'
                            },
                            { 
                              label: 'Làm đủ bài tập trong buổi', 
                              points: '+1',
                              description: 'Hoàn thành trọn vẹn 100% nhiệm vụ bắt buộc trong buổi học'
                            },
                            { 
                              label: 'Học đúng giờ & tương tác tích cực', 
                              points: '+2',
                              description: 'Đi học đúng giờ tại chi nhánh, tác phong chuẩn & phát biểu sôi nổi'
                            },
                            { 
                              label: 'Tuần học chuyên cần (đủ các buổi)', 
                              points: '+3',
                              description: 'Duy trì chuỗi ngày học và rèn luyện liên tục không ngắt quãng'
                            },
                            { 
                              label: 'Hoàn thành chặng học xuất sắc', 
                              points: '+10',
                              description: 'Tích lũy điểm thi đua dẫn đầu toàn lớp trong suốt chặng học'
                            },
                          ]
                        });
                      }}
                      style={{ padding: "4px 10px", borderRadius: "6px", background: "#eff6ff", color: "#2563eb", border: "1px solid #bfdbfe", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      📚 Dùng mẫu Lớp Học VicEdu
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCamp({
                          ...editingCamp,
                          scoring_rules: [
                            { label: 'Mỗi nhiệm vụ đạt', points: '+1' },
                            { label: 'Buổi làm đủ nhiệm vụ', points: '+1' },
                            { label: 'Có mặt offline đúng giờ', points: '+2' },
                            { label: 'Tuần kỷ luật (đủ tất cả các buổi)', points: '+3' },
                            { label: 'Đạt mốc 100km / 200km / 300km', points: '+10' },
                          ]
                        });
                      }}
                      style={{ padding: "4px 10px", borderRadius: "6px", background: "#fff1f2", color: "#e11d48", border: "1px solid #fecdd3", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                    >
                      🏃 Dùng mẫu CLB Chạy (Rubisea)
                    </button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {(editingCamp.scoring_rules || []).map((rule, idx) => {
                      const detectedType = rule.rule_type || (
                        (rule.applicable_task_ids && rule.applicable_task_ids.length > 0) ||
                        rule.label.toLowerCase().includes('nhiệm vụ đạt') || 
                        rule.label.toLowerCase().includes('bài tập hoàn thành') ||
                        rule.label.toLowerCase().includes('mỗi bài tập') ||
                        rule.label.toLowerCase().includes('mỗi nhiệm vụ') ||
                        rule.label.toLowerCase().includes('check-in') ||
                        rule.label.toLowerCase().includes('đúng giờ') ||
                        rule.label.toLowerCase().includes('check-out')
                          ? 'per_task'
                          : (rule.mandatory_task_ids && rule.mandatory_task_ids.length > 0) ||
                            rule.label.toLowerCase().includes('đủ nhiệm vụ') || 
                            rule.label.toLowerCase().includes('làm đủ bài tập') ||
                            rule.label.toLowerCase().includes('đủ bài tập') ||
                            rule.label.toLowerCase().includes('đủ ca') ||
                            rule.label.toLowerCase().includes('chuyên cần')
                            ? 'full_session'
                            : (rule.milestones && rule.milestones.length > 0) ||
                              rule.label.toLowerCase().includes('mốc') || 
                              rule.label.toLowerCase().includes('milestone')
                              ? 'milestone'
                              : rule.label.toLowerCase().includes('chuỗi') ||
                                rule.label.toLowerCase().includes('liên tiếp')
                                ? 'streak'
                                : 'per_task'
                      );

                      const isPerTaskRule = detectedType === 'per_task';
                      const isFullSessionRule = detectedType === 'full_session';
                      const isMilestoneRule = detectedType === 'milestone';
                      const isStreakRule = detectedType === 'streak';
                      const isOverallRule = detectedType === 'overall';

                      return (
                        <div
                          key={idx}
                          style={{
                            background: "var(--background)",
                            padding: "0.75rem 0.95rem",
                            borderRadius: "8px",
                            border: isPerTaskRule ? "1px solid #bfdbfe" : isFullSessionRule ? "1px solid #a7f3d0" : isMilestoneRule ? "1px solid #fecdd3" : isStreakRule ? "1px solid #fed7aa" : isOverallRule ? "1px solid #e9d5ff" : "1px solid var(--border)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "3fr 1fr auto",
                              gap: "0.75rem",
                              alignItems: "center",
                            }}
                          >
                            <input
                              type="text"
                              value={rule.label}
                              onChange={(e) => {
                                const updated = [...(editingCamp.scoring_rules || [])]
                                updated[idx] = { ...updated[idx], label: e.target.value }
                                setEditingCamp({ ...editingCamp, scoring_rules: updated })
                              }}
                              placeholder="Tiêu chí tính điểm"
                              style={{ padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.85rem", background: "var(--surface)", fontWeight: 600 }}
                            />
                            <input
                              type="text"
                              value={rule.points}
                              onChange={(e) => {
                                const updated = [...(editingCamp.scoring_rules || [])]
                                updated[idx] = { ...updated[idx], points: e.target.value }
                                setEditingCamp({ ...editingCamp, scoring_rules: updated })
                              }}
                              placeholder="+1, +2, +10"
                              style={{ padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.85rem", fontWeight: 700, color: "#4f46e5", textAlign: "center", background: "var(--surface)" }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const updated = (editingCamp.scoring_rules || []).filter((_, i) => i !== idx)
                                setEditingCamp({ ...editingCamp, scoring_rules: updated })
                              }}
                              style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "1rem" }}
                              title="Xóa tiêu chí này"
                            >
                              ✕
                            </button>
                          </div>

                          {/* Ô NHẬP MÔ TẢ / LỜI TÔN VINH HIỂN THỊ DƯỚI TÊN THẺ THÀNH TÍCH NỔI BẬT */}
                          <div style={{ marginTop: '0.45rem' }}>
                            <input
                              type="text"
                              value={rule.description || ''}
                              onChange={(e) => {
                                const updated = [...(editingCamp.scoring_rules || [])];
                                updated[idx] = { ...updated[idx], description: e.target.value };
                                setEditingCamp({ ...editingCamp, scoring_rules: updated });
                              }}
                              placeholder="📝 Thuyết minh hiển thị trên thẻ Thành tích nổi bật (VD: Tích lũy bài tập Padlet & Razkids...)"
                              style={{
                                width: '100%',
                                padding: '0.38rem 0.65rem',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                fontSize: '0.78rem',
                                background: 'var(--surface)',
                                color: 'var(--text-main)',
                              }}
                            />
                          </div>

                          {/* CHỌN LOẠI CÁCH TÍNH ĐIỂM (TRIGGER TYPE) */}
                          <div style={{ marginTop: '0.55rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                              ⚙️ Cách tính điểm:
                            </span>
                            <select
                              value={detectedType}
                              onChange={(e) => {
                                const nextType = e.target.value;
                                const updated = [...(editingCamp.scoring_rules || [])];
                                updated[idx] = {
                                  ...updated[idx],
                                  rule_type: nextType,
                                  applicable_task_ids: nextType === 'per_task' ? (updated[idx].applicable_task_ids || (editingCamp.tasks || []).map(t => t.id)) : undefined,
                                  mandatory_task_ids: nextType === 'full_session' ? (updated[idx].mandatory_task_ids || (editingCamp.tasks || []).map(t => t.id)) : undefined,
                                };
                                setEditingCamp({ ...editingCamp, scoring_rules: updated });
                              }}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--border)',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                background: 'var(--surface)',
                                color: '#4f46e5',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="per_task">🎯 Từng bài tập / nhiệm vụ hoàn thành (Tick chọn bài được tính điểm)</option>
                              <option value="full_session">⭐ Làm đủ buổi 100% (Tick chọn bài bắt buộc để nhận ✓)</option>
                              <option value="streak">🔥 Chuỗi chuyên cần liên tiếp (Tính theo số buổi/ngày liên tục)</option>
                              <option value="milestone">🏆 Cột mốc bứt phá (Các nấc thang tích lũy)</option>
                              <option value="overall">👑 Ngôi sao dẫn đầu toàn chặng (Tính theo tổng điểm)</option>
                            </select>
                          </div>

                          {/* 1. TICKBOX CHO QUY TẮC: MỖI NHIỆM VỤ ĐẠT */}
                          {isPerTaskRule && (
                            <div style={{ marginTop: '0.6rem', padding: '0.55rem 0.75rem', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed #93c5fd' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e40af', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>🎯</span> Tick chọn các nhiệm vụ ĐƯỢC TÍNH ĐIỂM khi hoàn thành:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {(editingCamp.tasks || []).map((t) => {
                                  const isChecked = !rule.applicable_task_ids || rule.applicable_task_ids.length === 0 || rule.applicable_task_ids.includes(t.id);
                                  return (
                                    <label key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', cursor: 'pointer', background: isChecked ? '#eff6ff' : '#f8fafc', padding: '3px 8px', borderRadius: '4px', border: isChecked ? '1px solid #bfdbfe' : '1px solid #e2e8f0', color: isChecked ? '#1e40af' : '#64748b' }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const currentIds = rule.applicable_task_ids || (editingCamp.tasks || []).map(x => x.id);
                                          const nextIds = e.target.checked
                                            ? [...currentIds, t.id]
                                            : currentIds.filter(id => id !== t.id);
                                          const updated = [...(editingCamp.scoring_rules || [])];
                                          updated[idx] = { ...updated[idx], applicable_task_ids: nextIds };
                                          setEditingCamp({ ...editingCamp, scoring_rules: updated });
                                        }}
                                      />
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color || '#6366f1' }}></span>
                                      <span style={{ fontWeight: 600 }}>{t.name}</span>
                                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({t.type})</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                💡 Những nhiệm vụ bỏ tick sẽ không được cộng điểm thi đua khi học viên nộp (dành cho nhiệm vụ phụ/tự nguyện).
                              </div>
                            </div>
                          )}

                          {/* 2. TICKBOX CHO QUY TẮC: BUỔI LÀM ĐỦ NHIỆM VỤ */}
                          {isFullSessionRule && (
                            <div style={{ marginTop: '0.6rem', padding: '0.55rem 0.75rem', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed #86efac' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065f46', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>⭐</span> Tick chọn các nhiệm vụ BẮT BUỘC để được tính là "Làm Đủ Buổi" & nhận dấu ✓ xanh:
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                {(editingCamp.tasks || []).map((t) => {
                                  const isChecked = !rule.mandatory_task_ids || rule.mandatory_task_ids.length === 0 || rule.mandatory_task_ids.includes(t.id);
                                  return (
                                    <label key={t.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', cursor: 'pointer', background: isChecked ? '#ecfdf5' : '#f8fafc', padding: '3px 8px', borderRadius: '4px', border: isChecked ? '1px solid #a7f3d0' : '1px solid #e2e8f0', color: isChecked ? '#065f46' : '#64748b' }}>
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const currentIds = rule.mandatory_task_ids || (editingCamp.tasks || []).map(x => x.id);
                                          const nextIds = e.target.checked
                                            ? [...currentIds, t.id]
                                            : currentIds.filter(id => id !== t.id);
                                          const updated = [...(editingCamp.scoring_rules || [])];
                                          updated[idx] = { ...updated[idx], mandatory_task_ids: nextIds };
                                          setEditingCamp({ ...editingCamp, scoring_rules: updated });
                                        }}
                                      />
                                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: t.color || '#10b981' }}></span>
                                      <span style={{ fontWeight: 600 }}>{t.name}</span>
                                    </label>
                                  );
                                })}
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                                💡 Chỉ cần hoàn thành các nhiệm vụ được tick, học viên sẽ nhận dấu ✓ xanh trọn vẹn và điểm thưởng buổi.
                              </div>
                            </div>
                          )}

                          {/* 3. CẤU HÌNH CÁC NẤC MỐC CHO QUY TẮC: CỘT MỐC BỨT PHÁ */}
                          {isMilestoneRule && (
                            <div style={{ marginTop: '0.6rem', padding: '0.65rem 0.85rem', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed #fca5a5' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#9f1239', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span>🏆</span> Cấu hình các nấc thang Cột Mốc Tích Lũy Bứt Phá:
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Tính theo nhiệm vụ:</span>
                                  <select
                                    value={rule.milestone_task_id || (editingCamp.tasks || []).find(t => t.type === 'number')?.id || 'chay_km'}
                                    onChange={(e) => {
                                      const updated = [...(editingCamp.scoring_rules || [])];
                                      updated[idx] = { ...updated[idx], milestone_task_id: e.target.value };
                                      setEditingCamp({ ...editingCamp, scoring_rules: updated });
                                    }}
                                    style={{ padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', fontSize: '0.75rem', background: 'var(--background)' }}
                                  >
                                    {(editingCamp.tasks || []).filter(t => t.type === 'number').map(t => (
                                      <option key={t.id} value={t.id}>{t.name} ({t.unit || 'số'})</option>
                                    ))}
                                    {!(editingCamp.tasks || []).some(t => t.type === 'number') && (
                                      <option value="chay_km">Chạy bộ (km)</option>
                                    )}
                                  </select>
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                {(rule.milestones || [
                                  { threshold: 50, points: 5 },
                                  { threshold: 100, points: 10 },
                                  { threshold: 200, points: 15 },
                                  { threshold: 300, points: 20 },
                                ]).map((mItem, mIdx) => (
                                  <div key={mIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', background: 'var(--background)', padding: '4px 8px', borderRadius: '6px' }}>
                                    <span style={{ fontWeight: 700, color: '#e11d48', minWidth: '55px' }}>Mốc {mIdx + 1}:</span>
                                    <span>Chạm</span>
                                    <input
                                      type="number"
                                      value={mItem.threshold}
                                      onChange={(e) => {
                                        const currentMs = [...(rule.milestones || [
                                          { threshold: 50, points: 5 },
                                          { threshold: 100, points: 10 },
                                          { threshold: 200, points: 15 },
                                          { threshold: 300, points: 20 },
                                        ])];
                                        currentMs[mIdx] = { ...currentMs[mIdx], threshold: parseFloat(e.target.value) || 0 };
                                        const updated = [...(editingCamp.scoring_rules || [])];
                                        updated[idx] = { ...updated[idx], milestones: currentMs };
                                        setEditingCamp({ ...editingCamp, scoring_rules: updated });
                                      }}
                                      style={{ width: '65px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 700 }}
                                    />
                                    <span style={{ color: 'var(--text-muted)' }}>
                                      {(editingCamp.tasks || []).find(t => t.id === (rule.milestone_task_id || 'chay_km'))?.unit || 'km'}
                                    </span>
                                    <span style={{ marginLeft: 'auto' }}>Thưởng:</span>
                                    <input
                                      type="number"
                                      value={mItem.points}
                                      onChange={(e) => {
                                        const currentMs = [...(rule.milestones || [
                                          { threshold: 50, points: 5 },
                                          { threshold: 100, points: 10 },
                                          { threshold: 200, points: 15 },
                                          { threshold: 300, points: 20 },
                                        ])];
                                        currentMs[mIdx] = { ...currentMs[mIdx], points: parseFloat(e.target.value) || 0 };
                                        const updated = [...(editingCamp.scoring_rules || [])];
                                        updated[idx] = { ...updated[idx], milestones: currentMs };
                                        setEditingCamp({ ...editingCamp, scoring_rules: updated });
                                      }}
                                      style={{ width: '55px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', textAlign: 'center', fontWeight: 700, color: '#4f46e5' }}
                                    />
                                    <span>điểm</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const currentMs = (rule.milestones || [
                                          { threshold: 50, points: 5 },
                                          { threshold: 100, points: 10 },
                                          { threshold: 200, points: 15 },
                                          { threshold: 300, points: 20 },
                                        ]).filter((_, i) => i !== mIdx);
                                        const updated = [...(editingCamp.scoring_rules || [])];
                                        updated[idx] = { ...updated[idx], milestones: currentMs };
                                        setEditingCamp({ ...editingCamp, scoring_rules: updated });
                                      }}
                                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px', fontSize: '0.85rem' }}
                                      title="Xóa mốc này"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const currentMs = [...(rule.milestones || [
                                      { threshold: 50, points: 5 },
                                      { threshold: 100, points: 10 },
                                      { threshold: 200, points: 15 },
                                      { threshold: 300, points: 20 },
                                    ])];
                                    const lastTh = currentMs.length > 0 ? currentMs[currentMs.length - 1].threshold : 0;
                                    const lastPts = currentMs.length > 0 ? currentMs[currentMs.length - 1].points : 0;
                                    currentMs.push({ threshold: lastTh + 50, points: lastPts + 5 });
                                    const updated = [...(editingCamp.scoring_rules || [])];
                                    updated[idx] = { ...updated[idx], milestones: currentMs };
                                    setEditingCamp({ ...editingCamp, scoring_rules: updated });
                                  }}
                                  style={{ alignSelf: 'flex-start', background: 'transparent', border: '1px dashed #e11d48', color: '#e11d48', padding: '3px 8px', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600, marginTop: '0.2rem' }}
                                >
                                  + Thêm nấc mốc mới
                                </button>
                              </div>
                            </div>
                          )}
                          {/* 4. CHUỖI KỶ LUẬT & CHUYÊN CẦN */}
                          {isStreakRule && (
                            <div style={{ marginTop: '0.6rem', padding: '0.55rem 0.75rem', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed #fdba74' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c2410c', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>🔥</span> Chuỗi Kỷ Luật & Chuyên Cần Liên Tiếp:
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                💡 Máy tự động tính chuỗi số buổi / ngày học viên hoàn thành liên tục không ngắt quãng để tôn vinh người kiên trì nhất.
                              </div>
                            </div>
                          )}

                          {/* 5. NGÔI SAO DẪN ĐẦU TOÀN CHẶNG */}
                          {isOverallRule && (
                            <div style={{ marginTop: '0.6rem', padding: '0.55rem 0.75rem', background: 'var(--surface)', borderRadius: '6px', border: '1px dashed #d8b4fe' }}>
                              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span>👑</span> Ngôi Sao Dẫn Đầu Toàn Chặng:
                              </div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                💡 Tôn vinh học viên có tổng điểm thi đua tích lũy cao nhất lớp trong suốt toàn bộ hành trình.
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = [
                        ...(editingCamp.scoring_rules || []),
                        {
                          label: "Tiêu chí thưởng mới",
                          points: "+1",
                          description: "",
                          rule_type: "per_task",
                          applicable_task_ids: (editingCamp.tasks || []).map(t => t.id),
                        }
                      ];
                      setEditingCamp({ ...editingCamp, scoring_rules: updated });
                    }}
                    style={{
                      alignSelf: "flex-start",
                      background: "transparent",
                      border: "1px dashed #4f46e5",
                      color: "#4f46e5",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "6px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    + Thêm Tiêu Chí Thưởng Điểm
                  </button>
                </div>
              )}

              {/* PHẦN 6: GIAO DIỆN, TÔNG MÀU & TIN NHẮN ZALO */}
              {modalSubTab === "branding" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
                  <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0, color: "#4f46e5", display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>🎨</span> Logo & Nhận Diện Thương Hiệu Hành Trình
                        </h4>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                          Tải ảnh logo câu lạc bộ / trung tâm để hiển thị ở góc trên cùng của Cổng học viên Web 2
                        </p>
                      </div>

                      {/* Khung Xem Trước Logo Thực Tế */}
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        background: "var(--surface)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "0.5rem 0.85rem",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
                      }}>
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>Xem trước:</span>
                        {editingCamp.logo?.imageUrl ? (
                          <img
                            src={editingCamp.logo.imageUrl}
                            alt="Logo preview"
                            style={{ width: "38px", height: "38px", objectFit: "contain", borderRadius: "8px", border: "1px solid var(--border)" }}
                          />
                        ) : (
                          <div style={{
                            width: "38px",
                            height: "38px",
                            borderRadius: "8px",
                            background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                            color: "white",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.3rem",
                          }}>
                            {editingCamp.logo?.icon || "🏃‍♂️🔥"}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-main)" }}>
                            {editingCamp.logo?.text || editingCamp.title}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                            {editingCamp.logo?.badgeLabel || "VICEDU"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                          1. Tải File Ảnh Logo Từ Máy Tính (PNG, JPG, SVG, WebP)
                        </label>
                        <label style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          padding: "0.75rem 1rem",
                          borderRadius: "8px",
                          border: "1.5px dashed #4f46e5",
                          background: "rgba(79, 70, 229, 0.05)",
                          color: "#4f46e5",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          cursor: "pointer",
                        }}>
                          <span>📁 Bấm Vào Đây Chọn Ảnh Logo Từ Máy Tính...</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return
                              const reader = new FileReader()
                              reader.onload = (re) => {
                                const img = new Image()
                                img.onload = () => {
                                  const canvas = document.createElement("canvas")
                                  const MAX_SIZE = 500
                                  let w = img.width
                                  let h = img.height
                                  if (w > h && w > MAX_SIZE) {
                                    h = (h * MAX_SIZE) / w
                                    w = MAX_SIZE
                                  } else if (h > MAX_SIZE) {
                                    w = (w * MAX_SIZE) / h
                                    h = MAX_SIZE
                                  }
                                  canvas.width = w
                                  canvas.height = h
                                  const ctx = canvas.getContext("2d")
                                  ctx?.drawImage(img, 0, 0, w, h)
                                  const b64 = canvas.toDataURL("image/png")
                                  setEditingCamp({
                                    ...editingCamp,
                                    logo: { ...(editingCamp.logo || {}), imageUrl: b64 }
                                  })
                                }
                                img.src = re.target?.result as string
                              }
                              reader.readAsDataURL(file)
                            }}
                          />
                        </label>
                        {editingCamp.logo?.imageUrl && (
                          <button
                            type="button"
                            onClick={() => setEditingCamp({
                              ...editingCamp,
                              logo: { ...(editingCamp.logo || {}), imageUrl: "" }
                            })}
                            style={{ marginTop: "6px", background: "transparent", border: "none", color: "#ef4444", fontSize: "0.75rem", cursor: "pointer", fontWeight: 600 }}
                          >
                            ✕ Xóa ảnh logo (chuyển về dùng emoji)
                          </button>
                        )}
                      </div>

                      <div>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                          Hoặc Dán Đường Link URL Ảnh Logo Online
                        </label>
                        <input
                          type="text"
                          value={editingCamp.logo?.imageUrl || ""}
                          onChange={(e) => setEditingCamp({
                            ...editingCamp,
                            logo: { ...(editingCamp.logo || {}), imageUrl: e.target.value }
                          })}
                          placeholder="https://... hoặc /logo.png"
                          style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.82rem" }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "0.85rem" }}>
                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                          Emoji Biểu Tượng Dự Phòng
                        </label>
                        <input
                          type="text"
                          value={editingCamp.logo?.icon || "🏃‍♂️🔥"}
                          onChange={(e) => setEditingCamp({
                            ...editingCamp,
                            logo: { ...(editingCamp.logo || {}), icon: e.target.value }
                          })}
                          placeholder="🏃‍♂️🔥 hoặc 🎯📚"
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.82rem" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                          Tên Thương Hiệu Cạnh Logo
                        </label>
                        <input
                          type="text"
                          value={editingCamp.logo?.text || ""}
                          onChange={(e) => setEditingCamp({
                            ...editingCamp,
                            logo: { ...(editingCamp.logo || {}), text: e.target.value }
                          })}
                          placeholder="VD: RUBISEA 19 hoặc VICEDU"
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.82rem" }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                          Nhãn Phụ Dưới Logo (Badge)
                        </label>
                        <input
                          type="text"
                          value={editingCamp.logo?.badgeLabel || ""}
                          onChange={(e) => setEditingCamp({
                            ...editingCamp,
                            logo: { ...(editingCamp.logo || {}), badgeLabel: e.target.value }
                          })}
                          placeholder="VD: RUNNER NHÍ · RUNNER 19 hoặc CAMBRIDGE"
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.82rem" }}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>
                      Tông Màu Nhận Diện Chủ Đạo
                    </label>
                    <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                      {[
                        { color: "#ea580c", label: "Cam Lửa Kỷ Luật" },
                        { color: "#e11d48", label: "Đỏ Ruby Rubisea" },
                        { color: "#4f46e5", label: "Xanh Indigo VicEdu" },
                        { color: "#10b981", label: "Xanh Ngọc Chuyển Hóa" },
                        { color: "#f59e0b", label: "Vàng Cam Nhiệt Huyết" },
                        { color: "#7c3aed", label: "Tím Bứt Phá" },
                      ].map((preset) => (
                        <button
                          key={preset.color}
                          type="button"
                          onClick={() => setEditingCamp({
                            ...editingCamp,
                            theme: {
                              ...editingCamp.theme,
                              primary: preset.color,
                              accent: preset.color,
                            }
                          })}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "0.45rem 0.85rem",
                            borderRadius: "8px",
                            border: editingCamp.theme?.primary === preset.color ? "2px solid #000" : "1px solid var(--border)",
                            background: "var(--surface)",
                            cursor: "pointer",
                            fontSize: "0.82rem",
                          }}
                        >
                          <span style={{ width: "16px", height: "16px", borderRadius: "50%", background: preset.color }} />
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Mẫu Tin Nhắn Zalo Chăm Sóc & Nhắc Nhở */}
                  {editingCamp.mode !== 'thoi_quen_ca_nhan' && (
                  <div style={{ background: "rgba(79, 70, 229, 0.04)", padding: "1rem", borderRadius: "10px", border: "1px solid #c7d2fe" }}>
                    <h5 style={{ fontSize: "0.88rem", fontWeight: 700, margin: "0 0 0.5rem", color: "#4f46e5", display: "flex", alignItems: "center", gap: "6px" }}>
                      <MessageSquare size={16} />
                      <span>Mẫu Tin Nhắn Chăm Sóc & Biểu Dương Tự Động (Zalo / SMS)</span>
                    </h5>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                        Mẫu Khen Thưởng Khi Hoàn Thành Nhiệm Vụ
                      </label>
                      <input
                        type="text"
                        value={editingCamp.theme?.careSuccessTpl || ""}
                        onChange={(e) => setEditingCamp({
                          ...editingCamp,
                          theme: { ...editingCamp.theme, careSuccessTpl: e.target.value }
                        })}
                        placeholder="Chúc mừng {name} đã xuất sắc hoàn thành trọn vẹn nhiệm vụ..."
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                        Mẫu Nhắc Nhở Nộp Bài / Có Mặt Đúng Giờ
                      </label>
                      <input
                        type="text"
                        value={editingCamp.theme?.careReminderTpl || ""}
                        onChange={(e) => setEditingCamp({
                          ...editingCamp,
                          theme: { ...editingCamp.theme, careReminderTpl: e.target.value }
                        })}
                        placeholder="Nhắc nhở: Sắp đến giờ sinh hoạt hôm nay. Bạn {name} hãy chuẩn bị..."
                        style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.82rem" }}
                      />
                    </div>
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "1rem 1.75rem",
              borderTop: "1px solid var(--border)",
              background: "var(--background)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                {editingCamp.id && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCamp(editingCamp)}
                    style={{
                      padding: "0.55rem 0.9rem",
                      borderRadius: "8px",
                      border: "1px solid #fecaca",
                      background: "#fef2f2",
                      color: "#ef4444",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.82rem",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                    title="Xóa vĩnh viễn hành trình này và toàn bộ dữ liệu liên quan"
                  >
                    <Trash2 size={14} />
                    <span>Xóa Hành Trình Này</span>
                  </button>
                )}
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                  💡 Mọi thay đổi lịch tuần, nhiệm vụ và sự kiện sẽ được đồng bộ tức thì sang Web 2.
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  onClick={() => setShowCampModal(false)}
                  style={{
                    padding: "0.6rem 1.25rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-main)",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!editingCamp.slug || !editingCamp.title) {
                      alert("Vui lòng điền mã slug và tên hành trình!")
                      return
                    }
                    let campToSave = { ...editingCamp }
                    if (campToSave.mode === 'thoi_quen_ca_nhan') {
                      const tDays = Number(campToSave.theme?.target_days) || 60
                      const sDate = campToSave.theme?.start_date || new Date().toISOString().split('T')[0]
                      const existingSessions = Array.isArray(campToSave.sessions) ? campToSave.sessions : []
                      const autoSessions: any[] = []
                      const startDateObj = new Date(sDate + 'T00:00:00Z')
                      for (let i = 1; i <= tDays; i++) {
                        const cur = new Date(startDateObj.getTime() + (i - 1) * 24 * 60 * 60 * 1000)
                        const yyyy = cur.getUTCFullYear()
                        const mm = String(cur.getUTCMonth() + 1).padStart(2, '0')
                        const dd = String(cur.getUTCDate()).padStart(2, '0')
                        const dStr = `${yyyy}-${mm}-${dd}`
                        const code = `N${i < 10 ? '0' + i : i}`
                        const prevSess = existingSessions[i - 1]
                        autoSessions.push({
                          ...(prevSess || {}),
                          id: prevSess?.id || `sess-${code.toLowerCase()}`,
                          sessionCode: code,
                          title: prevSess?.title || `Ngày ${i}`,
                          dateStr: dStr,
                          summaryText: prevSess?.summaryText || `Rèn luyện kỷ luật ngày ${i}`,
                          desc: prevSess?.desc || `Rèn luyện kỷ luật ngày ${i}`,
                        })
                      }
                      campToSave.sessions = autoSessions
                    }
                    const res = await saveCamp(campToSave)
                    if (res.success) {
                      setShowCampModal(false)
                      loadCamps()
                      alert("✅ Đã lưu cấu hình toàn diện thành công!")
                    } else {
                      alert("Lỗi lưu camp: " + res.error)
                    }
                  }}
                  style={{
                    padding: "0.6rem 1.5rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "#4f46e5",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  💾 Lưu Cấu Hình Toàn Diện
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SOẠN HỌC LIỆU, VIDEO BÀI GIẢNG & BTVN CHO TỪNG BUỔI */}
      {editingSessionItem && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 150,
          padding: "1rem",
        }}>
          <div style={{
            background: "var(--surface)",
            borderRadius: "16px",
            maxWidth: "760px",
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(147, 51, 234, 0.08) 100%)",
            }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#4f46e5", letterSpacing: "0.05em" }}>
                  🎬 Cấu Hình Học Liệu & Bản Ghi Hình
                </span>
                <h3 style={{ margin: "0.2rem 0 0", fontSize: "1.15rem", fontWeight: 700 }}>
                  {editingSessionItem.sessionCode} · {editingSessionItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSessionItem(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* 1. Thông tin cơ bản buổi */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>Mã Buổi</label>
                  <input
                    type="text"
                    value={editingSessionItem.sessionCode || ""}
                    onChange={(e) => setEditingSessionItem({ ...editingSessionItem, sessionCode: e.target.value })}
                    placeholder="VD: B1, T3, T6"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>Tên Buổi Học / Buổi Chạy</label>
                  <input
                    type="text"
                    value={editingSessionItem.title || ""}
                    onChange={(e) => setEditingSessionItem({ ...editingSessionItem, title: e.target.value })}
                    placeholder="VD: Khai Giảng · Chiến Lược Reading IELTS"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 600 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.5fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>Ngày Diễn Ra</label>
                  <input
                    type="date"
                    value={editingSessionItem.dateStr || ""}
                    onChange={(e) => setEditingSessionItem({ ...editingSessionItem, dateStr: e.target.value })}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>Giờ Diễn Ra</label>
                  <input
                    type="text"
                    value={editingSessionItem.timeStr || ""}
                    onChange={(e) => setEditingSessionItem({ ...editingSessionItem, timeStr: e.target.value })}
                    placeholder="VD: 19:30 hoặc 17:30"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>Địa Điểm</label>
                  <input
                    type="text"
                    value={editingSessionItem.location || ""}
                    onChange={(e) => setEditingSessionItem({ ...editingSessionItem, location: e.target.value })}
                    placeholder="VD: Phòng Cambridge 02 / Công viên Văn Lang"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* 2. Video bài giảng & Tiện ích tải video */}
              <div style={{ background: "rgba(59, 130, 246, 0.05)", border: "1px solid rgba(59, 130, 246, 0.25)", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}>
                  <Video size={16} style={{ color: "#2563eb" }} />
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1d4ed8" }}>
                    🎥 Video Bài Giảng / Bản Ghi Hình Buổi Học
                  </span>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
                  Hỗ trợ link <b>YouTube (unlisted)</b>, <b>Google Drive</b>, <b>Cloudflare Stream</b> hoặc file <b>.mp4</b>. Học viên sẽ được phát video trực tiếp trong thẻ buổi học kèm nút Tải video về máy.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Link Video Xem Trực Tuyến (URL Embed / Online Video)
                    </label>
                    <input
                      type="text"
                      value={editingSessionItem.videoUrl || ""}
                      onChange={(e) => setEditingSessionItem({ ...editingSessionItem, videoUrl: e.target.value })}
                      placeholder="VD: https://youtube.com/watch?v=... hoặc https://drive.google.com/file/d/.../view"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Link Tải Video Riêng (Tùy chọn - Direct Download URL)
                    </label>
                    <input
                      type="text"
                      value={editingSessionItem.videoDownloadUrl || ""}
                      onChange={(e) => setEditingSessionItem({ ...editingSessionItem, videoDownloadUrl: e.target.value })}
                      placeholder="Để trống nếu dùng chung link video bên trên"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>
              </div>

              {/* 3. Slide Canva tương tác: ĐẶC QUYỀN DÀNH RIÊNG CHO "LỚP HỌC TẠI CHI NHÁNH" */}
              {(editingCamp?.mode === "lop_hoc_buoi" || editingCamp?.scope === "branch" || editingCamp?.theme?.scope === "branch") && (
                <div style={{ background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "10px", padding: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.35rem" }}>
                    <span style={{ fontSize: "1rem" }}>🎨</span>
                    <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#6b21a8" }}>
                      Slide Bài Giảng Canva Tương Tác (Đặc quyền Lớp Chi Nhánh)
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: "0 0 0.6rem" }}>
                    Dán link bài giảng Canva để học viên có thể bấm tương tác toàn màn hình ngay trong buổi học.
                  </p>
                  <input
                    type="text"
                    value={editingSessionItem.canvaUrl || ""}
                    onChange={(e) => setEditingSessionItem({ ...editingSessionItem, canvaUrl: e.target.value })}
                    placeholder="VD: https://www.canva.com/design/.../view?embed"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                  />
                </div>
              )}

              {/* 4. Tóm tắt nội dung buổi học & Sơ đồ mindmap */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                  📝 Tóm Tắt Trọng Tâm Buổi Học / Nhật Ký Rèn Luyện
                </label>
                <textarea
                  rows={3}
                  value={editingSessionItem.summaryText || ""}
                  onChange={(e) => setEditingSessionItem({ ...editingSessionItem, summaryText: e.target.value })}
                  placeholder="Ghi chú kiến thức trọng tâm, kỹ thuật xử lý bài, bẫy cần tránh hoặc dặn dò của Thầy cô / HLV..."
                  style={{ width: "100%", padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem", lineHeight: 1.5 }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                  🖼️ Link Ảnh Sơ Đồ & Mindmap Buổi Học (Mỗi link 1 dòng)
                </label>
                <textarea
                  rows={2}
                  value={(editingSessionItem.summaryImages || []).join("\n")}
                  onChange={(e) => setEditingSessionItem({
                    ...editingSessionItem,
                    summaryImages: e.target.value.split("\n").map(s => s.trim()).filter(Boolean),
                  })}
                  placeholder="https://example.com/mindmap-1.jpg&#10;https://example.com/mindmap-2.jpg"
                  style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.8rem", fontFamily: "monospace" }}
                />
              </div>

              {/* 5. Nhiệm vụ rèn luyện / Bài tập về nhà (BTVN) */}
              <div style={{ background: "rgba(244, 63, 94, 0.05)", border: "1px solid rgba(244, 63, 94, 0.25)", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1rem" }}>🎯</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#be123c" }}>
                    Nhiệm Vụ Rèn Luyện & Bài Tập Về Nhà (BTVN)
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Tiêu Đề Bài Tập Về Nhà
                    </label>
                    <input
                      type="text"
                      value={editingSessionItem.homework?.title || ""}
                      onChange={(e) => setEditingSessionItem({
                        ...editingSessionItem,
                        homework: { ...(editingSessionItem.homework || {}), title: e.target.value },
                      })}
                      placeholder="VD: Luyện Đề Cam 18 Test 1 Reading Passage 1"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Hạn Chót Nộp Bài (Deadline)
                    </label>
                    <input
                      type="text"
                      value={editingSessionItem.homework?.deadline || ""}
                      onChange={(e) => setEditingSessionItem({
                        ...editingSessionItem,
                        homework: { ...(editingSessionItem.homework || {}), deadline: e.target.value },
                      })}
                      placeholder="VD: Trước 23:59 Chủ Nhật (25/10)"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: "0.6rem" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                    Hướng Dẫn Làm Bài Chi Tiết
                  </label>
                  <textarea
                    rows={3}
                    value={editingSessionItem.homework?.instructions || ""}
                    onChange={(e) => setEditingSessionItem({
                      ...editingSessionItem,
                      homework: { ...(editingSessionItem.homework || {}), instructions: e.target.value },
                    })}
                    placeholder="1. Đọc bài văn và gạch chân 10 từ vựng mới...&#10;2. Hoàn thành 13 câu hỏi ra vở...&#10;3. Chụp ảnh bài làm gửi lên link Padlet..."
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem", lineHeight: 1.5 }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "0.6rem", marginBottom: "0.6rem" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Link Nộp Bài / Thư Mục Nộp Bài (Padlet / Google Drive)
                    </label>
                    <input
                      type="text"
                      value={editingSessionItem.homework?.attachmentUrl || ""}
                      onChange={(e) => setEditingSessionItem({
                        ...editingSessionItem,
                        homework: { ...(editingSessionItem.homework || {}), attachmentUrl: e.target.value },
                      })}
                      placeholder="VD: https://padlet.com/vicedu/ielts-b1"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Tên Nút Bấm Link Nộp
                    </label>
                    <input
                      type="text"
                      value={editingSessionItem.homework?.attachmentLabel || ""}
                      onChange={(e) => setEditingSessionItem({
                        ...editingSessionItem,
                        homework: { ...(editingSessionItem.homework || {}), attachmentLabel: e.target.value },
                      })}
                      placeholder="Mặc định: Nộp Bài Lên Bảng Padlet"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                    Link Ảnh Đề Bài & Tài Liệu Đính Kèm (Mỗi link 1 dòng)
                  </label>
                  <textarea
                    rows={2}
                    value={(editingSessionItem.homework?.images || []).join("\n")}
                    onChange={(e) => setEditingSessionItem({
                      ...editingSessionItem,
                      homework: {
                        ...(editingSessionItem.homework || {}),
                        images: e.target.value.split("\n").map(s => s.trim()).filter(Boolean),
                      },
                    })}
                    placeholder="https://example.com/de-cam18-page1.jpg&#10;https://example.com/de-cam18-page2.jpg"
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.8rem", fontFamily: "monospace" }}
                  />
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              background: "var(--background)",
            }}>
              <button
                type="button"
                onClick={() => setEditingSessionItem(null)}
                style={{
                  padding: "0.6rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-main)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => handleSaveSessionItem(editingSessionItem)}
                style={{
                  padding: "0.6rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#4f46e5",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.3)",
                }}
              >
                💾 Cập Nhật Học Liệu Buổi Này
              </button>
            </div>
          </div>
        </div>
      )}

            {/* MODAL THÊM / SỬA THÀNH VIÊN ĐA NĂNG (TỰ ĐỘNG THÍCH ỨNG THEO ĐẶC THÙ HÀNH TRÌNH) */}
      {showMemberModal && editingMember && (() => {
        const isEditing = !!editingMember.id;
        const isStaffAlreadyInCamp = (emp: any) => {
          const empName = (emp.full_name || '').trim().toLowerCase();
          const empPhone = (emp.phone || '').trim();
          const empId = (emp.id || '').trim().toLowerCase();
          return members.some((m: any) => {
            if (empPhone && m.phone && m.phone === empPhone) return true;
            const mName = (m.name || '').toLowerCase();
            if (empName && mName.includes(empName) && empName.length > 2) return true;
            if (empId && mName.includes(empId)) return true;
            return false;
          });
        };
        const isStudentAlreadyInCamp = (stu: any) => {
          const stuName = (stu.full_name || '').trim().toLowerCase();
          const stuPhone = (stu.parent_phone || stu.phone || '').trim();
          const stuId = (stu.id || '').trim().toLowerCase();
          return members.some((m: any) => {
            if (m.student_id && m.student_id === stu.id) return true;
            if (stuPhone && m.phone && m.phone === stuPhone) return true;
            const mName = (m.name || '').toLowerCase();
            if (stuName && mName.includes(stuName) && stuName.length > 2) return true;
            if (stuId && mName.includes(stuId)) return true;
            return false;
          });
        };

        const filteredStaff = branchStaffList.filter((emp: any) => {
          if (!staffSearchQuery.trim()) return true;
          const q = staffSearchQuery.toLowerCase();
          return (emp.full_name || '').toLowerCase().includes(q) || (emp.id || '').toLowerCase().includes(q) || (emp.phone || '').includes(q) || (emp.position || '').toLowerCase().includes(q);
        });

        const filteredStudents = classStudentsList.filter((stu: any) => {
          if (!studentSearchQuery.trim()) return true;
          const q = studentSearchQuery.toLowerCase();
          return (stu.full_name || '').toLowerCase().includes(q) || (stu.nickname || '').toLowerCase().includes(q) || (stu.id || '').toLowerCase().includes(q) || (stu.parent_phone || '').includes(q);
        });

        return (
          <div style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "1rem",
          }}>
            <div style={{
              background: "var(--surface)",
              borderRadius: "16px",
              padding: "1.75rem 2rem",
              maxWidth: isEditing || memberModalTab === 'manual' ? "540px" : "720px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
              border: "1px solid var(--border)",
              transition: "max-width 0.2s ease",
            }}>
              {/* Header Modal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isEditing ? "1rem" : "0.75rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>
                    {isEditing ? "✏️ Chỉnh Sửa Thành Viên" : "✨ Thêm Thành Viên Vào Hành Trình"}
                  </h2>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "0.2rem 0 0" }}>
                    {selectedCamp?.title} ({selectedCamp?.mode === 'cham_cong' ? '📍 Chấm Công Chi Nhánh' : selectedCamp?.mode === 'clb_quanh_nam' ? '🏃 CLB Quanh Năm' : '📚 Lớp Học Buổi'})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}
                >
                  ✕
                </button>
              </div>

              {/* TABS CHUYỂN ĐỔI CHẾ ĐỘ THÊM (CHỈ HIỂN THỊ KHI THÊM MỚI) */}
              {!isEditing && (
                <div style={{
                  display: "flex",
                  gap: "0.4rem",
                  background: "var(--background)",
                  padding: "4px",
                  borderRadius: "10px",
                  border: "1px solid var(--border)",
                  marginBottom: "1.25rem",
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMemberModalTab('branch_staff');
                      if (branchStaffList.length === 0) loadBranchStaff(staffBranch);
                    }}
                    style={{
                      flex: 1,
                      padding: "0.55rem 0.6rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: memberModalTab === 'branch_staff' ? 700 : 500,
                      background: memberModalTab === 'branch_staff' ? "#10b981" : "transparent",
                      color: memberModalTab === 'branch_staff' ? "white" : "var(--text-main)",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Building2 size={15} />
                    <span>🏢 Nhân Sự Chi Nhánh</span>
                    {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (
                      <span style={{ fontSize: "0.68rem", background: "#ecfdf5", color: "#065f46", padding: "1px 5px", borderRadius: "4px", fontWeight: 800 }}>
                        Chuẩn bài
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMemberModalTab('class_students');
                      if (classesList.length === 0) loadBranchClasses(classBranch);
                    }}
                    style={{
                      flex: 1,
                      padding: "0.55rem 0.6rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: memberModalTab === 'class_students' ? 700 : 500,
                      background: memberModalTab === 'class_students' ? "#4f46e5" : "transparent",
                      color: memberModalTab === 'class_students' ? "white" : "var(--text-main)",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <GraduationCap size={15} />
                    <span>📚 Cả Lớp Học (LMS)</span>
                    {selectedCamp?.mode === 'lop_hoc_buoi' && (
                      <span style={{ fontSize: "0.68rem", background: "#e0e7ff", color: "#4338ca", padding: "1px 5px", borderRadius: "4px", fontWeight: 800 }}>
                        Nhanh 1-Chạm
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMemberModalTab('manual')}
                    style={{
                      flex: 1,
                      padding: "0.55rem 0.6rem",
                      borderRadius: "8px",
                      fontSize: "0.8rem",
                      fontWeight: memberModalTab === 'manual' ? 700 : 500,
                      background: memberModalTab === 'manual' ? "var(--surface)" : "transparent",
                      color: memberModalTab === 'manual' ? "var(--text-main)" : "var(--text-muted)",
                      boxShadow: memberModalTab === 'manual' ? "0 2px 6px rgba(0,0,0,0.06)" : "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <Plus size={15} />
                    <span>✍️ Thủ Công (Tự Do)</span>
                  </button>
                </div>
              )}

              {/* TAB 1: NẠP NHÂN SỰ THEO CHI NHÁNH (VICHRM) */}
              {!isEditing && memberModalTab === 'branch_staff' && (
                <div>
                  {/* Filter Chi nhánh & Search */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: "0.3rem", color: "var(--text-muted)" }}>
                        🏢 Chi Nhánh:
                      </label>
                      <select
                        value={staffBranch}
                        onChange={(e) => {
                          setStaffBranch(e.target.value);
                          loadBranchStaff(e.target.value);
                        }}
                        style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 600 }}
                      >
                        <option value="Việt Trì 1">Việt Trì 1</option>
                        <option value="Việt Trì 2">Việt Trì 2</option>
                        <option value="Dân Hòa">Dân Hòa</option>
                        <option value="Tuyên Quang">Tuyên Quang</option>
                        <option value="Lâm Thao">Lâm Thao</option>
                        <option value="Đối tác Online">Đối tác Online</option>
                        <option value="all">🌐 Tất cả chi nhánh</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: "0.3rem", color: "var(--text-muted)" }}>
                        🔍 Tìm Nhân Viên Nhanh:
                      </label>
                      <input
                        type="text"
                        value={staffSearchQuery}
                        onChange={(e) => setStaffSearchQuery(e.target.value)}
                        placeholder="Tìm theo tên, chức vụ, SĐT..."
                        style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                      />
                    </div>
                  </div>

                  {/* Selection Action Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.85rem", background: "rgba(16, 185, 129, 0.08)", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)", marginBottom: "0.75rem", fontSize: "0.82rem" }}>
                    <div style={{ color: "#065f46", fontWeight: 600 }}>
                      Đang hiển thị <b>{filteredStaff.length}</b> nhân sự đang làm việc (Trạng thái khác 'Nghỉ việc')
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const unadded = filteredStaff.filter((s: any) => !isStaffAlreadyInCamp(s)).map((s: any) => s.id);
                          setSelectedStaffIds(unadded);
                        }}
                        style={{ padding: "3px 8px", borderRadius: "6px", background: "#10b981", color: "white", border: "none", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        Chọn tất cả ({filteredStaff.filter((s: any) => !isStaffAlreadyInCamp(s)).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStaffIds([])}
                        style={{ padding: "3px 8px", borderRadius: "6px", background: "var(--background)", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Staff List */}
                  <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", background: "var(--background)" }}>
                    {loadingStaff ? (
                      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        ⏳ Đang truy vấn danh sách nhân viên từ CRM...
                      </div>
                    ) : filteredStaff.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Không có nhân viên nào đang làm việc khớp với bộ lọc này.
                      </div>
                    ) : (
                      filteredStaff.map((emp: any) => {
                        const alreadyIn = isStaffAlreadyInCamp(emp);
                        const isSelected = selectedStaffIds.includes(emp.id);
                        const phone = emp.phone || '';
                        const phoneDigits = phone.replace(/\D/g, '');
                        const pLast4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '1234';

                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              if (alreadyIn) return;
                              if (isSelected) {
                                setSelectedStaffIds(selectedStaffIds.filter((id) => id !== emp.id));
                              } else {
                                setSelectedStaffIds([...selectedStaffIds, emp.id]);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "8px",
                              background: alreadyIn ? "rgba(0,0,0,0.02)" : isSelected ? "rgba(16, 185, 129, 0.08)" : "var(--surface)",
                              border: isSelected ? "1.5px solid #10b981" : "1px solid var(--border)",
                              cursor: alreadyIn ? "not-allowed" : "pointer",
                              opacity: alreadyIn ? 0.6 : 1,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <input
                                type="checkbox"
                                checked={alreadyIn || isSelected}
                                disabled={alreadyIn}
                                onChange={() => {}}
                                style={{ accentColor: "#10b981", width: "16px", height: "16px", cursor: alreadyIn ? "not-allowed" : "pointer" }}
                              />
                              <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#059669",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                overflow: "hidden",
                                flexShrink: 0
                              }}>
                                {emp.avatar_url ? <img src={emp.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (emp.full_name?.charAt(0) || "NV")}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                                  {emp.full_name} <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>({emp.id})</span>
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "center", marginTop: "1px" }}>
                                  <span>🏷️ {emp.position || emp.role || 'Nhân sự'}</span>
                                  <span>·</span>
                                  <span>🏢 {emp.branch_id || staffBranch}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              {alreadyIn ? (
                                <span style={{ fontSize: "0.72rem", background: "#d1fae5", color: "#065f46", padding: "3px 8px", borderRadius: "4px", fontWeight: 700 }}>
                                  ✓ Đã có trong danh sách
                                </span>
                              ) : (
                                <div>
                                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>{phone || 'Chưa có SĐT'}</div>
                                  <div style={{ fontSize: "0.7rem", color: "#059669", fontWeight: 700 }}>Mã PIN: {pLast4}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => setShowMemberModal(false)}
                      style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-main)", cursor: "pointer", fontSize: "0.85rem" }}
                    >
                      Hủy Bỏ
                    </button>

                    <button
                      type="button"
                      disabled={selectedStaffIds.length === 0 || bulkSubmitting}
                      onClick={handleBulkAddStaff}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "0.65rem 1.5rem",
                        borderRadius: "8px",
                        border: "none",
                        background: selectedStaffIds.length === 0 ? "#94a3b8" : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        cursor: selectedStaffIds.length === 0 || bulkSubmitting ? "not-allowed" : "pointer",
                        boxShadow: selectedStaffIds.length === 0 ? "none" : "0 4px 12px rgba(16, 185, 129, 0.35)",
                      }}
                    >
                      <Building2 size={16} />
                      <span>{bulkSubmitting ? "Đang nạp dữ liệu..." : `⚡ Nạp ${selectedStaffIds.length} Nhân Sự Vào Chấm Công`}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: NẠP CẢ LỚP HỌC (VICEDU LMS) */}
              {!isEditing && memberModalTab === 'class_students' && (
                <div>
                  {/* Dropdown Chi nhánh & Lớp học */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: "0.3rem", color: "var(--text-muted)" }}>
                        🏫 Chi Nhánh:
                      </label>
                      <select
                        value={classBranch}
                        onChange={(e) => {
                          setClassBranch(e.target.value);
                          loadBranchClasses(e.target.value);
                        }}
                        style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 600 }}
                      >
                        <option value="Việt Trì 1">Việt Trì 1</option>
                        <option value="Việt Trì 2">Việt Trì 2</option>
                        <option value="Dân Hòa">Dân Hòa</option>
                        <option value="Tuyên Quang">Tuyên Quang</option>
                        <option value="Lâm Thao">Lâm Thao</option>
                        <option value="all">🌐 Tất cả chi nhánh</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: "0.78rem", fontWeight: 700, display: "block", marginBottom: "0.3rem", color: "var(--text-muted)" }}>
                        📚 Chọn Lớp Học (LMS):
                      </label>
                      <select
                        value={selectedClassId}
                        onChange={(e) => {
                          setSelectedClassId(e.target.value);
                          loadClassStudents(e.target.value);
                        }}
                        style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid #818cf8", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 700 }}
                      >
                        {classesList.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.class_name} ({c.branch_id})
                          </option>
                        ))}
                        {classesList.length === 0 && <option value="">Không có lớp học nào đang hoạt động</option>}
                      </select>
                    </div>
                  </div>

                  {/* Filter Search */}
                  <div style={{ marginBottom: "0.75rem" }}>
                    <input
                      type="text"
                      value={studentSearchQuery}
                      onChange={(e) => setStudentSearchQuery(e.target.value)}
                      placeholder="🔍 Lọc nhanh theo tên học sinh, nickname, mã học viên..."
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>

                  {/* Selection Bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.85rem", background: "rgba(79, 70, 229, 0.08)", borderRadius: "8px", border: "1px solid rgba(79, 70, 229, 0.2)", marginBottom: "0.75rem", fontSize: "0.82rem" }}>
                    <div style={{ color: "#4338ca", fontWeight: 600 }}>
                      Lớp có <b>{filteredStudents.length}</b> học viên · Đã chọn: <b>{selectedStudentIds.length}</b> bạn
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        onClick={() => {
                          const unadded = filteredStudents.filter((s: any) => !isStudentAlreadyInCamp(s)).map((s: any) => s.id);
                          setSelectedStudentIds(unadded);
                        }}
                        style={{ padding: "3px 8px", borderRadius: "6px", background: "#4f46e5", color: "white", border: "none", fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                      >
                        Chọn tất cả ({filteredStudents.filter((s: any) => !isStudentAlreadyInCamp(s)).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        style={{ padding: "3px 8px", borderRadius: "6px", background: "var(--background)", color: "var(--text-muted)", border: "1px solid var(--border)", fontSize: "0.75rem", cursor: "pointer" }}
                      >
                        Bỏ chọn
                      </button>
                    </div>
                  </div>

                  {/* Students List */}
                  <div style={{ maxHeight: "320px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "10px", padding: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem", background: "var(--background)" }}>
                    {loadingClassStudents ? (
                      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        ⏳ Đang tải danh sách học viên trong lớp...
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "2.5rem 1rem", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Chưa có học viên nào trong lớp này hoặc chưa chọn lớp.
                      </div>
                    ) : (
                      filteredStudents.map((stu: any) => {
                        const alreadyIn = isStudentAlreadyInCamp(stu);
                        const isSelected = selectedStudentIds.includes(stu.id);
                        const phone = stu.parent_phone || stu.phone || '';
                        const phoneDigits = phone.replace(/\D/g, '');
                        const pLast4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '1234';

                        return (
                          <div
                            key={stu.id}
                            onClick={() => {
                              if (alreadyIn) return;
                              if (isSelected) {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== stu.id));
                              } else {
                                setSelectedStudentIds([...selectedStudentIds, stu.id]);
                              }
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "0.6rem 0.85rem",
                              borderRadius: "8px",
                              background: alreadyIn ? "rgba(0,0,0,0.02)" : isSelected ? "rgba(79, 70, 229, 0.08)" : "var(--surface)",
                              border: isSelected ? "1.5px solid #4f46e5" : "1px solid var(--border)",
                              cursor: alreadyIn ? "not-allowed" : "pointer",
                              opacity: alreadyIn ? 0.6 : 1,
                              transition: "all 0.15s ease",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <input
                                type="checkbox"
                                checked={alreadyIn || isSelected}
                                disabled={alreadyIn}
                                onChange={() => {}}
                                style={{ accentColor: "#4f46e5", width: "16px", height: "16px", cursor: alreadyIn ? "not-allowed" : "pointer" }}
                              />
                              <div style={{
                                width: 34,
                                height: 34,
                                borderRadius: "50%",
                                background: "rgba(79, 70, 229, 0.15)",
                                color: "#4f46e5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: "0.8rem",
                                overflow: "hidden",
                                flexShrink: 0
                              }}>
                                {stu.avatar_url ? <img src={stu.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (stu.full_name?.charAt(0) || "HV")}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-main)" }}>
                                  {stu.full_name} {stu.nickname && <span style={{ color: "#6366f1", fontStyle: "italic" }}>({stu.nickname})</span>}
                                </div>
                                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", gap: "6px", alignItems: "center", marginTop: "1px" }}>
                                  <span>🆔 {stu.id}</span>
                                  <span>·</span>
                                  <span>🏫 {stu.branch_id || classBranch}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: "right" }}>
                              {alreadyIn ? (
                                <span style={{ fontSize: "0.72rem", background: "#e0e7ff", color: "#4338ca", padding: "3px 8px", borderRadius: "4px", fontWeight: 700 }}>
                                  ✓ Đã có trong lớp
                                </span>
                              ) : (
                                <div>
                                  <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-main)" }}>{phone || 'Chưa có SĐT'}</div>
                                  <div style={{ fontSize: "0.7rem", color: "#4f46e5", fontWeight: 700 }}>Mã PIN: {pLast4}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                    <button
                      type="button"
                      onClick={() => setShowMemberModal(false)}
                      style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-main)", cursor: "pointer", fontSize: "0.85rem" }}
                    >
                      Hủy Bỏ
                    </button>

                    <button
                      type="button"
                      disabled={selectedStudentIds.length === 0 || bulkSubmitting}
                      onClick={handleBulkAddStudents}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "0.65rem 1.5rem",
                        borderRadius: "8px",
                        border: "none",
                        background: selectedStudentIds.length === 0 ? "#94a3b8" : "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.88rem",
                        cursor: selectedStudentIds.length === 0 || bulkSubmitting ? "not-allowed" : "pointer",
                        boxShadow: selectedStudentIds.length === 0 ? "none" : "0 4px 12px rgba(79, 70, 229, 0.35)",
                      }}
                    >
                      <GraduationCap size={16} />
                      <span>{bulkSubmitting ? "Đang nạp dữ liệu..." : `⚡ Nạp Toàn Bộ ${selectedStudentIds.length} Học Viên Vào Lớp Học`}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: THÊM THỦ CÔNG HOẶC CHỈNH SỬA THÀNH VIÊN */}
              {(isEditing || memberModalTab === 'manual') && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {/* Tải ảnh đại diện cho thành viên */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.85rem", background: "var(--background)", borderRadius: "10px", border: "1px dashed var(--border)" }}>
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "#e0e7ff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid #818cf8",
                      flexShrink: 0
                    }}>
                      {editingMember.avatar_url ? (
                        <img src={editingMember.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4f46e5" }}>
                          {editingMember.name ? editingMember.name.charAt(0) : "👤"}
                        </span>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.25rem" }}>Ảnh Đại Diện Thành Viên</div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginBottom: "0.4rem" }}>
                        Admin có thể tải ảnh giúp thành viên khi họ dùng hết 3 lượt tự đổi.
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                        <label style={{
                          padding: "4px 10px",
                          borderRadius: "6px",
                          background: "#4f46e5",
                          color: "white",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}>
                          <span>📷 Tải ảnh từ máy</span>
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (re) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement("canvas");
                                  const SIZE = 250;
                                  canvas.width = SIZE;
                                  canvas.height = SIZE;
                                  const ctx = canvas.getContext("2d");
                                  let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
                                  if (img.width > img.height) {
                                    sWidth = img.height;
                                    sx = (img.width - img.height) / 2;
                                  } else {
                                    sHeight = img.width;
                                    sy = (img.height - img.width) / 2;
                                  }
                                  ctx?.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, SIZE, SIZE);
                                  const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
                                  setEditingMember({ ...editingMember, avatar_url: dataUrl });
                                };
                                img.src = (re.target?.result as string) || "";
                              };
                              reader.readAsDataURL(file);
                            }}
                          />
                        </label>
                        {editingMember.avatar_url && (
                          <button
                            type="button"
                            onClick={() => setEditingMember({ ...editingMember, avatar_url: "" })}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--border)",
                              background: "transparent",
                              color: "#ef4444",
                              fontSize: "0.75rem",
                              cursor: "pointer"
                            }}
                          >
                            Xóa ảnh
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Họ và Tên</label>
                    <input
                      type="text"
                      value={editingMember.name}
                      onChange={(e) => setEditingMember({ ...editingMember, name: e.target.value })}
                      placeholder="Ví dụ: Bố Hoàng (Bầu Xô) hoặc Bé Bon"
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Số Điện Thoại</label>
                    <input
                      type="text"
                      value={editingMember.phone || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const digits = val.replace(/\D/g, '');
                        const pLast4 = digits.length >= 4 ? digits.slice(-4) : editingMember.pin_code;
                        setEditingMember({ ...editingMember, phone: val, pin_code: editingMember.pin_code === "1234" && pLast4 ? pLast4 : editingMember.pin_code });
                      }}
                      placeholder="Ví dụ: 0912345678"
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                      Mã PIN 4 Số (Bảo mật điểm danh)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={editingMember.pin_code || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, pin_code: e.target.value })}
                      placeholder="Mặc định: 4 số cuối SĐT"
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", letterSpacing: "2px", fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Vai Trò / Danh Hiệu</label>
                    <input
                      type="text"
                      value={editingMember.role_tag || ""}
                      onChange={(e) => setEditingMember({ ...editingMember, role_tag: e.target.value })}
                      placeholder="Ví dụ: Runner Nhí, Nhân sự chi nhánh, Học viên Cambridge..."
                      style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                    />
                  </div>

                  {/* Phân bảng cho CLB chạy bộ */}
                  {selectedCamp?.mode === 'clb_quanh_nam' && (
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                        Phân Bảng Thi Đua Runner
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          type="button"
                          onClick={() => setEditingMember({ ...editingMember, role_tag: "Runner Nhí" })}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            borderRadius: "6px",
                            border: isKid(editingMember) ? "2px solid #e11d48" : "1px solid var(--border)",
                            background: isKid(editingMember) ? "#ffe4e6" : "var(--background)",
                            color: isKid(editingMember) ? "#be123c" : "var(--text-main)",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          🌟 Bảng Runner Nhí (U15)
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMember({ ...editingMember, role_tag: "Runner Lớn / Phụ Huynh" })}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            borderRadius: "6px",
                            border: !isKid(editingMember) ? "2px solid #4f46e5" : "1px solid var(--border)",
                            background: !isKid(editingMember) ? "#e0e7ff" : "var(--background)",
                            color: !isKid(editingMember) ? "#4338ca" : "var(--text-main)",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                            cursor: "pointer",
                          }}
                        >
                          👨‍👩‍👧 Runner Lớn / Phụ Huynh
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Tích lũy điểm/km & Vé quên công */}
                  <div style={{ display: "grid", gridTemplateColumns: selectedCamp?.mode === 'cham_cong' ? "1fr 1fr" : "1fr", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                        {selectedCamp?.mode === 'clb_quanh_nam' ? 'Km Khởi Điểm (Tích lũy ngoài hệ thống)' : 'Tổng Sao / Điểm Tích Lũy'}
                      </label>
                      <input
                        type="number"
                        value={selectedCamp?.mode === 'clb_quanh_nam' ? (editingMember.total_km_all_time || 0) : (editingMember.total_stars || 0)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (selectedCamp?.mode === 'clb_quanh_nam') {
                            setEditingMember({ ...editingMember, total_km_all_time: val });
                          } else {
                            setEditingMember({ ...editingMember, total_stars: val });
                          }
                        }}
                        style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                      />
                      {selectedCamp?.mode === 'clb_quanh_nam' && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem", lineHeight: 1.4 }}>
                          💡 <em>Số Km khởi điểm từ trước hoặc ngoài hệ thống. Khi lên bảng tiến độ, web sẽ tự động cộng dồn số này với toàn bộ các buổi chạy nộp trên hệ thống.</em>
                        </div>
                      )}
                    </div>
                    {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong')) && (
                      <div>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Vé Quên Chấm Công</label>
                        <input
                          type="number"
                          value={editingMember.forgot_pills_quota !== undefined ? editingMember.forgot_pills_quota : 3}
                          onChange={(e) => setEditingMember({ ...editingMember, forgot_pills_quota: parseInt(e.target.value) || 0 })}
                          style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Quản lý thiết bị điểm danh cho chấm công */}
                  {(selectedCamp?.mode === 'cham_cong' || selectedCamp?.slug?.includes('cham-cong') || !!selectedCamp?.theme?.device_bindings?.[String(editingMember.id)]) && editingMember.id && (() => {
                    const binding = selectedCamp?.theme?.device_bindings?.[String(editingMember.id)];
                    return (
                      <div style={{ marginTop: "1rem", background: "var(--background)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                        <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                          📱 Thiết Bị Điểm Danh Gắn Với Tài Khoản
                        </label>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", marginTop: "0.4rem" }}>
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: binding ? "#16a34a" : "var(--text-muted)" }}>
                              {binding ? `📱 ${binding.deviceName || 'Điện thoại chính chủ'}` : '⚪ Chưa gắn thiết bị nào'}
                            </div>
                            {binding && (
                              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: "2px" }}>
                                Đã gắn máy lúc: {new Date(binding.boundAt).toLocaleString('vi-VN')}
                              </div>
                            )}
                          </div>
                          {binding && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Bạn có chắc chắn muốn mở khóa thiết bị cho ${editingMember.name}?`)) {
                                  const res = await resetMemberDeviceBinding(selectedCamp.id, editingMember.id!);
                                  if (res.success) {
                                    setCamps(prev => prev.map(c => {
                                      if (c.id === selectedCamp.id) {
                                        const newBindings = { ...(c.theme?.device_bindings || {}) };
                                        delete newBindings[String(editingMember.id)];
                                        return {
                                          ...c,
                                          theme: {
                                            ...(c.theme || {}),
                                            device_bindings: newBindings,
                                          }
                                        };
                                      }
                                      return c;
                                    }));
                                    alert("Đã mở khóa thiết bị thành công!");
                                  } else {
                                    alert("Lỗi mở khóa: " + res.error);
                                  }
                                }
                              }}
                              style={{
                                padding: "4px 10px",
                                borderRadius: "6px",
                                border: "1px solid #fecaca",
                                background: "#fef2f2",
                                color: "#dc2626",
                                fontWeight: 700,
                                fontSize: "0.78rem",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <RefreshCw size={12} />
                              <span>Mở khóa thiết bị</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Trạng thái hoạt động ON/OFF */}
                  <div style={{ marginTop: "1rem", background: "var(--background)", padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid var(--border)" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                      Trạng Thái Hoạt Động (Hiển thị ngoài Web)
                    </label>
                    <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem" }}>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#16a34a" }}>
                        <input
                          type="radio"
                          name="memberModalStatus"
                          checked={editingMember.status !== 'inactive'}
                          onChange={() => setEditingMember({ ...editingMember, status: 'active' })}
                        />
                        🟢 Đang Hoạt Động (ON - Hiện trên web)
                      </label>
                      <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600, color: "#dc2626" }}>
                        <input
                          type="radio"
                          name="memberModalStatus"
                          checked={editingMember.status === 'inactive'}
                          onChange={() => setEditingMember({ ...editingMember, status: 'inactive' })}
                        />
                        🔴 Đã Nghỉ / Tạm Dừng (OFF - Ẩn khỏi web)
                      </label>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
                    <button
                      type="button"
                      onClick={() => setShowMemberModal(false)}
                      style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-main)", cursor: "pointer" }}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!editingMember.name) {
                          alert("Vui lòng nhập họ và tên thành viên!");
                          return;
                        }
                        const res = await saveMember(editingMember);
                        if (res.success) {
                          setShowMemberModal(false);
                          loadMembers(selectedCampId);
                          loadCamps();
                        } else {
                          alert("Lỗi lưu thành viên: " + res.error);
                        }
                      }}
                      style={{ padding: "0.6rem 1.5rem", borderRadius: "8px", border: "none", background: "#4f46e5", color: "white", fontWeight: 700, cursor: "pointer" }}
                    >
                      {isEditing ? "💾 Lưu Thay Đổi" : "Lưu Thành Viên"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      
      {/* MODAL POPUP CHỈNH SỬA QUẢN TRỊ VIÊN */}
      {editingAdmin && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 200,
          padding: "1rem",
        }}>
          <div style={{
            background: "var(--surface)",
            borderRadius: "14px",
            maxWidth: "460px",
            width: "100%",
            border: "1px solid var(--border)",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.4)",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.1rem",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
              <h4 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", color: "#4f46e5" }}>
                <Edit size={18} /> Chỉnh Sửa Quản Trị Viên
              </h4>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                style={{ background: "transparent", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                Họ & Tên Quản Trị Viên:
              </label>
              <input
                type="text"
                value={editingAdmin.name || ""}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, name: e.target.value })}
                placeholder="VD: Bố Hoàng, Cô Thúy..."
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.88rem", fontWeight: 600 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                  Số Điện Thoại:
                </label>
                <input
                  type="text"
                  value={editingAdmin.phone || ""}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, phone: e.target.value })}
                  placeholder="0912..."
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.88rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem", color: "#6d28d9" }}>
                  Mã PIN Web 2 (4 số):
                </label>
                <input
                  type="text"
                  maxLength={4}
                  value={editingAdmin.pinLast4 || ""}
                  onChange={(e) => setEditingAdmin({ ...editingAdmin, pinLast4: e.target.value.replace(/\D/g, '') })}
                  placeholder="5678"
                  style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "2px solid #a78bfa", background: "#f5f3ff", color: "#5b21b6", fontSize: "0.95rem", fontWeight: 800, textAlign: "center", letterSpacing: "2px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                Chức Danh / Vai Trò Trong Nhóm:
              </label>
              <input
                type="text"
                value={editingAdmin.roleTitle || ""}
                onChange={(e) => setEditingAdmin({ ...editingAdmin, roleTitle: e.target.value })}
                placeholder="VD: Tổng Chỉ Huy, HLV Thể Lực, Giáo viên Chủ nhiệm..."
                style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.88rem" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setEditingAdmin(null)}
                style={{ padding: "0.55rem 1rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontWeight: 600, cursor: "pointer", fontSize: "0.82rem" }}
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveEditedAdmin}
                style={{ padding: "0.55rem 1.25rem", borderRadius: "8px", border: "none", background: "#4f46e5", color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem", boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)" }}
              >
                💾 Lưu Thay Đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PHÂN QUYỀN BAN QUẢN TRỊ & GIÁO VIÊN PHỤ TRÁCH */}
      {showAdminModal && adminCamp && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 160,
          padding: "1rem",
        }}>
          <div style={{
            background: "var(--surface)",
            borderRadius: "16px",
            maxWidth: "780px",
            width: "100%",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}>
            {/* Header */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", background: "#7c3aed", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Shield size={20} />
                </div>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "#7c3aed", letterSpacing: "0.05em" }}>
                    Phân Quyền Đồng Quản Trị
                  </span>
                  <h3 style={{ margin: "0.15rem 0 0", fontSize: "1.15rem", fontWeight: 700 }}>
                    {adminCamp.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{ padding: "1.5rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <div style={{ background: "rgba(124, 58, 237, 0.05)", border: "1px solid rgba(124, 58, 237, 0.2)", borderRadius: "10px", padding: "1rem" }}>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-main)", lineHeight: 1.6 }}>
                  💡 <b>Cơ chế phân quyền 2 tầng:</b><br />
                  1. <b>Mở khóa Cổng Học Viên (Web 2):</b> Quản trị viên/Giáo viên sử dụng <b>Mã PIN 4 số</b> để mở khóa chế độ Quản trị trên Web 2 (điểm danh hộ, nộp bài hộ, xuất Excel, soạn Zalo gửi phụ huynh).<br />
                  2. <b>Cổng Quản Trị CRM (Web 1):</b> Được cấp quyền vào hệ thống CRM này để cùng Bố Hoàng cấu hình lớp học, kiểm duyệt báo cáo và theo dõi tiến độ.
                </p>
              </div>

              {/* Form Thêm Quản Trị Viên Mới */}
              <div style={{ background: "var(--background)", border: "1px solid var(--border)", borderRadius: "12px", padding: "1.25rem" }}>
                <h4 style={{ fontSize: "0.92rem", fontWeight: 700, margin: "0 0 1rem", color: "#4f46e5", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>➕</span> Thêm Quản Trị Viên / Giáo Viên Mới
                </h4>

                {(() => {
                  const filteredStaff = staffList
                    .filter((s: any) => s.status !== "Nghỉ việc")
                    .filter((s: any) => {
                      if (!adminStaffSearch.trim()) return true;
                      const q = adminStaffSearch.toLowerCase().trim();
                      const name = (s.full_name || "").toLowerCase();
                      const phone = (s.phone || "").toLowerCase();
                      const role = (s.role || "").toLowerCase();
                      const dept = (s.department || "").toLowerCase();
                      const email = (s.email || "").toLowerCase();
                      return name.includes(q) || phone.includes(q) || role.includes(q) || dept.includes(q) || email.includes(q);
                    });

                  return (
                    <div style={{ marginBottom: "0.85rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem", flexWrap: "wrap", gap: "6px" }}>
                        <label style={{ fontSize: "0.8rem", fontWeight: 700, margin: 0 }}>
                          1. Chọn Nhanh Giáo Viên / Nhân Sự Từ Hệ Thống VicEdu
                        </label>
                        <span style={{ fontSize: "0.72rem", color: "#059669", background: "rgba(16, 185, 129, 0.12)", border: "1px solid rgba(16, 185, 129, 0.25)", padding: "2px 8px", borderRadius: "12px", fontWeight: 600 }}>
                          🟢 {filteredStaff.length} nhân sự đang làm việc (Đã lọc bỏ 'Nghỉ việc')
                        </span>
                      </div>

                      {/* Ô Tìm Kiếm Nhanh Nhân Sự */}
                      <div style={{ position: "relative", marginBottom: "0.45rem" }}>
                        <Search
                          size={15}
                          style={{
                            position: "absolute",
                            left: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          type="text"
                          value={adminStaffSearch}
                          onChange={(e) => setAdminStaffSearch(e.target.value)}
                          placeholder="🔍 Gõ tên, SĐT, chức vụ hoặc bộ phận để lọc nhanh..."
                          style={{
                            width: "100%",
                            padding: "0.5rem 2.2rem 0.5rem 2.1rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border)",
                            background: "var(--surface)",
                            color: "var(--text-main)",
                            fontSize: "0.82rem",
                          }}
                        />
                        {adminStaffSearch && (
                          <button
                            type="button"
                            onClick={() => setAdminStaffSearch("")}
                            style={{
                              position: "absolute",
                              right: "8px",
                              top: "50%",
                              transform: "translateY(-50%)",
                              background: "rgba(0,0,0,0.06)",
                              border: "none",
                              borderRadius: "50%",
                              width: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                            title="Xóa tìm kiếm"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      {/* Dropdown danh sách */}
                      <select
                        style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 600 }}
                        value=""
                        onChange={(e) => {
                          const selectedId = e.target.value
                          const found = staffList.find((s: any) => s.id === selectedId)
                          if (found) {
                            setNewAdmin({
                              ...newAdmin,
                              name: found.full_name || "",
                              phone: found.phone || "",
                              pinLast4: found.phone ? found.phone.slice(-4) : "1234",
                              roleTitle: found.role === "Giáo viên" ? "Giáo viên Chủ nhiệm" : `${found.role || 'Nhân sự'} Phụ trách`,
                              avatar: found.role === "Giáo viên" ? "👩‍🏫" : "👤",
                            })
                          }
                        }}
                      >
                        <option value="">
                          {adminStaffSearch.trim()
                            ? `-- Tìm thấy ${filteredStaff.length} nhân sự phù hợp (Bấm để chọn) --`
                            : `-- Bấm vào đây để chọn nhanh Nhân sự / Giáo viên VicEdu (${filteredStaff.length}) --`}
                        </option>
                        {filteredStaff.map((st: any) => (
                          <option key={st.id} value={st.id}>
                            {st.full_name} · [{st.role || "Nhân sự"}]{st.department ? ` - ${st.department}` : ""} · SĐT: {st.phone || "Chưa có"}
                          </option>
                        ))}
                      </select>

                      {adminStaffSearch.trim() && filteredStaff.length === 0 && (
                        <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "#dc2626", fontStyle: "italic" }}>
                          ⚠️ Không tìm thấy nhân sự phù hợp với từ khóa "{adminStaffSearch}". Bạn có thể nhập họ tên & SĐT thủ công ở các ô bên dưới.
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: "0.75rem", marginBottom: "0.85rem" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Họ và Tên Quản Trị Viên
                    </label>
                    <input
                      type="text"
                      value={newAdmin.name}
                      onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                      placeholder="VD: Cô Mai Anh hoặc Thầy Tuấn"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Số Điện Thoại
                    </label>
                    <input
                      type="text"
                      value={newAdmin.phone}
                      onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                      placeholder="0988..."
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#7c3aed", display: "block", marginBottom: "0.25rem" }}>
                      Mã PIN QTV (4 số) *
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      value={newAdmin.pinLast4}
                      onChange={(e) => setNewAdmin({ ...newAdmin, pinLast4: e.target.value })}
                      placeholder="VD: 5566"
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1.5px solid #7c3aed", background: "var(--surface)", color: "#7c3aed", fontSize: "0.85rem", fontWeight: 800, letterSpacing: "2px" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr", gap: "0.75rem", alignItems: "center" }}>
                  <div>
                    <label style={{ fontSize: "0.78rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                      Vai Trò / Chức Danh Trong Nhóm
                    </label>
                    <input
                      type="text"
                      value={newAdmin.roleTitle}
                      onChange={(e) => setNewAdmin({ ...newAdmin, roleTitle: e.target.value })}
                      placeholder="VD: Giáo viên Chủ nhiệm, HLV Thể lực, Trợ giảng..."
                      style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                    <button
                      type="button"
                      onClick={handleAddAdmin}
                      style={{
                        flex: 1,
                        padding: "0.55rem 1rem",
                        borderRadius: "8px",
                        border: "none",
                        background: "#4f46e5",
                        color: "white",
                        fontWeight: 700,
                        fontSize: "0.82rem",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
                      }}
                    >
                      + Thêm Vào Ban QTV
                    </button>
                  </div>
                </div>
              </div>

              {/* Danh Sách Quản Trị Viên Hiện Tại */}
              <div>
                <h4 style={{ fontSize: "0.92rem", fontWeight: 700, margin: "0 0 0.75rem", color: "var(--text-main)" }}>
                  📋 Danh Sách Ban Quản Trị ({campAdmins.length} người)
                </h4>

                <div style={{ border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ background: "var(--background)", borderBottom: "1px solid var(--border)", textAlign: "left" }}>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Quản Trị Viên</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Số Điện Thoại</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Mã PIN Web 2</th>
                        <th style={{ padding: "0.6rem 0.85rem" }}>Chức Danh</th>
                        <th style={{ padding: "0.6rem 0.85rem", textAlign: "right" }}>Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campAdmins.map((adm, idx) => (
                        <tr key={adm.id || idx} style={{ borderBottom: "1px solid var(--border)" }}>
                          <td style={{ padding: "0.65rem 0.85rem", fontWeight: 700 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "1.2rem" }}>{adm.avatar || "👤"}</span>
                              <span>{adm.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-muted)" }}>
                            {adm.phone || "---"}
                          </td>
                          <td style={{ padding: "0.65rem 0.85rem" }}>
                            <span style={{ background: "#ede9fe", color: "#6d28d9", padding: "2px 8px", borderRadius: "4px", fontWeight: 800, letterSpacing: "1px" }}>
                              {adm.pinLast4 || "----"}
                            </span>
                          </td>
                          <td style={{ padding: "0.65rem 0.85rem" }}>
                            <span style={{ background: "var(--background)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                              {adm.roleTitle}
                            </span>
                          </td>
                          <td style={{ padding: "0.65rem 0.85rem", textAlign: "right" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => handleStartEditAdmin(adm)}
                                style={{
                                  background: "#eff6ff",
                                  border: "1px solid #bfdbfe",
                                  color: "#2563eb",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  padding: "4px 8px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                                title="Chỉnh sửa Tên, SĐT, PIN, Chức danh"
                              >
                                <Edit size={13} />
                                <span>Sửa</span>
                              </button>
                              {adm.name.includes("Bầu Xô") ? (
                                <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700, padding: "2px 6px", background: "#ecfdf5", borderRadius: "4px" }}>Chủ Sở Hữu</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAdmin(adm.id)}
                                  style={{
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    color: "#ef4444",
                                    borderRadius: "6px",
                                    cursor: "pointer",
                                    padding: "4px 8px",
                                    fontSize: "0.75rem",
                                    fontWeight: 600,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                  }}
                                  title="Xóa quyền quản trị viên này"
                                >
                                  <Trash2 size={13} />
                                  <span>Xóa</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: "1rem 1.5rem",
              borderTop: "1px solid var(--border)",
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              background: "var(--background)",
            }}>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                style={{
                  padding: "0.6rem 1.25rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text-main)",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleSaveAdmins}
                style={{
                  padding: "0.6rem 1.5rem",
                  borderRadius: "8px",
                  border: "none",
                  background: "#7c3aed",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
                }}
              >
                💾 Lưu Thay Đổi Ban Quản Trị
              </button>
            </div>
          </div>
        </div>
      )}


      {/* LIGHTBOX PHÓNG TO ẢNH MINH CHỨNG */}
      {previewProofImage && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
            cursor: "zoom-out",
          }}
          onClick={() => setPreviewProofImage(null)}
        >
          <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewProofImage(null)}
              style={{
                position: "absolute",
                top: "-40px",
                right: "0",
                background: "white",
                color: "black",
                border: "none",
                borderRadius: "50%",
                width: "32px",
                height: "32px",
                fontWeight: 900,
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
            <img
              src={previewProofImage}
              alt="Ảnh minh chứng phóng to"
              style={{ maxWidth: "90vw", maxHeight: "85vh", borderRadius: "12px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)", objectFit: "contain" }}
            />
          </div>
        </div>
      )}
      {/* ============================================================ */}
      {/* MODAL MÔ PHỎNG XEM TRƯỚC TRÊN ĐIỆN THOẠI (LIVE MOBILE PHONE PREVIEW) */}
      {/* ============================================================ */}
      {mobilePreviewCamp && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
            padding: "1rem",
          }}
          onClick={() => setMobilePreviewCamp(null)}
        >
          {/* Top Control Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "1rem",
              background: "#1e293b",
              padding: "0.5rem 1rem",
              borderRadius: "12px",
              border: "1px solid #334155",
              boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Smartphone size={18} color="#10b981" />
              <span style={{ fontSize: "0.88rem", fontWeight: 700 }}>
                Xem Trước Mobile: <span style={{ color: "#38bdf8" }}>{mobilePreviewCamp.title}</span>
              </span>
            </div>

            <div style={{ display: "flex", gap: "6px", marginLeft: "1rem" }}>
              <button
                type="button"
                onClick={() => setPreviewDevice('iphone')}
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: "6px",
                  border: "none",
                  background: previewDevice === 'iphone' ? "#4f46e5" : "#334155",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                iPhone (390px)
              </button>
              <button
                type="button"
                onClick={() => setPreviewDevice('android')}
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: "6px",
                  border: "none",
                  background: previewDevice === 'android' ? "#4f46e5" : "#334155",
                  color: "white",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Android (360px)
              </button>
            </div>

            <a
              href={`${portalBaseUrl}/hanh-trinh/${mobilePreviewCamp.slug}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "0.3rem 0.75rem",
                borderRadius: "6px",
                border: "1px solid #475569",
                background: "transparent",
                color: "#94a3b8",
                fontSize: "0.75rem",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <span>Mở Tab Riêng</span>
              <ExternalLink size={12} />
            </a>

            <button
              type="button"
              onClick={() => setMobilePreviewCamp(null)}
              style={{
                marginLeft: "0.5rem",
                background: "#ef4444",
                color: "white",
                border: "none",
                borderRadius: "6px",
                padding: "0.3rem 0.8rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕ Đóng
            </button>
          </div>

          {/* Smartphone Frame Mockup */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: previewDevice === 'iphone' ? "390px" : "360px",
              height: "780px",
              maxHeight: "calc(100vh - 120px)",
              background: "#0f172a",
              borderRadius: "44px",
              border: "12px solid #1e293b",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 0 0 2px #475569",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              transition: "width 0.2s ease",
            }}
          >
            {/* iOS / Android Status Bar */}
            <div
              style={{
                height: previewDevice === 'iphone' ? "44px" : "30px",
                width: "100%",
                background: "white",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 22px",
                zIndex: 30,
                flexShrink: 0,
                borderBottom: "1px solid #f8fafc",
                userSelect: "none",
              }}
            >
              <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>9:41</div>
              {/* Dynamic Island / Notch */}
              <div
                style={{
                  position: "absolute",
                  top: previewDevice === 'iphone' ? "10px" : "8px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: previewDevice === 'iphone' ? "95px" : "12px",
                  height: previewDevice === 'iphone' ? "24px" : "12px",
                  background: "#000",
                  borderRadius: previewDevice === 'iphone' ? "999px" : "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
                }}
              >
                {previewDevice === 'iphone' && (
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#1e293b", marginRight: "30px" }} />
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", fontWeight: 700, color: "#0f172a" }}>
                <span style={{ fontSize: "10px" }}>5G</span>
                <span>📶</span>
                <span>🔋</span>
              </div>
            </div>

            {/* Screen Iframe Container */}
            <div style={{ flex: 1, width: "100%", height: "100%", background: "white", overflow: "hidden" }}>
              <iframe
                src={`${portalBaseUrl}/hanh-trinh/${mobilePreviewCamp.slug}`}
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  display: "block",
                }}
                title="Mobile Preview"
              />
            </div>

            {/* Bottom Home Indicator Bar */}
            <div
              style={{
                position: "absolute",
                bottom: "6px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "120px",
                height: "4px",
                background: "#94a3b8",
                borderRadius: "999px",
                zIndex: 30,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      )}


      {/* Modal Xuất Báo Cáo & Bảng Công Excel Thông Minh (2-Sheet) */}
      {isExportModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem"
        }}>
          <div style={{
            background: "var(--card-bg, #ffffff)",
            border: "1.5px solid var(--border, #e2e8f0)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "520px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            overflow: "hidden"
          }}>
            {/* Header Modal */}
            <div style={{
              padding: "1.1rem 1.25rem",
              borderBottom: "1px solid var(--border, #e2e8f0)",
              background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "1.3rem" }}>📥</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#166534" }}>
                    XUẤT BẢNG CÔNG & BÁO CÁO EXCEL
                  </h3>
                  <div style={{ fontSize: "0.74rem", color: "#15803d", marginTop: "2px" }}>
                    Xuất file Excel 2-Sheet (Bảng Công Tổng Hợp & Nhật Ký Chi Tiết)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.2rem",
                  cursor: "pointer",
                  color: "#64748b",
                  padding: "4px"
                }}
              >
                ✕
              </button>
            </div>

            {/* Body Modal */}
            <div style={{ padding: "1.25rem" }}>
              {/* Chọn Tháng */}
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--foreground, #0f172a)", marginBottom: "0.4rem" }}>
                  📅 1. Chọn tháng cần lấy dữ liệu công:
                </label>
                <select
                  value={exportMonth}
                  onChange={e => setExportMonth(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "10px",
                    border: "1.5px solid var(--border, #cbd5e1)",
                    background: "var(--background, #ffffff)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--foreground, #0f172a)"
                  }}
                >
                  <option value="all">📅 Tất cả các tháng (Toàn bộ dữ liệu)</option>
                  <option value="2026-10">Tháng 10/2026</option>
                  <option value="2026-11">Tháng 11/2026</option>
                  <option value="2026-12">Tháng 12/2026</option>
                  <option value="2027-01">Tháng 01/2027</option>
                  <option value="2027-02">Tháng 02/2027</option>
                  <option value="2027-03">Tháng 03/2027</option>
                  <option value="2027-04">Tháng 04/2027</option>
                  <option value="2027-05">Tháng 05/2027</option>
                  <option value="2027-06">Tháng 06/2027</option>
                  <option value="2027-07">Tháng 07/2027</option>
                  <option value="2027-08">Tháng 08/2027</option>
                  <option value="2027-09">Tháng 09/2027</option>
                  <option value="2027-10">Tháng 10/2027</option>
                  <option value="2027-11">Tháng 11/2027</option>
                  <option value="2027-12">Tháng 12/2027</option>
                </select>
              </div>

              {/* Chọn Chi Nhánh */}
              <div style={{ marginBottom: "1.1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 700, color: "var(--foreground, #0f172a)", marginBottom: "0.4rem" }}>
                  🏢 2. Lọc theo Chi nhánh / Điểm làm việc:
                </label>
                <select
                  value={exportBranch}
                  onChange={e => setExportBranch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.6rem 0.8rem",
                    borderRadius: "10px",
                    border: "1.5px solid var(--border, #cbd5e1)",
                    background: "var(--background, #ffffff)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--foreground, #0f172a)"
                  }}
                >
                  <option value="all">🏢 Tất cả chi nhánh (Toàn hệ thống)</option>
                  {((selectedCamp?.branch_gps as any)?.branches || [
                    { branch_name: "VP VicEdu Việt Trì 1" },
                    { branch_name: "VP VicEdu Tuyên Quang" },
                    { branch_name: "VP VicEdu Lâm Thao" },
                    { branch_name: "VP VicEdu Dân Hòa" },
                  ]).map((b: any, bIdx: number) => (
                    <option key={bIdx} value={b.branch_name}>
                      📍 {b.branch_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thông tin cấu trúc 2-Sheet giải thích cho Kế toán */}
              <div style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "0.75rem 0.9rem",
                fontSize: "0.76rem",
                color: "#475569",
                lineHeight: 1.5,
                marginBottom: "1.25rem"
              }}>
                <div style={{ fontWeight: 800, color: "#0f172a", marginBottom: "3px" }}>
                  📊 File Excel xuất ra bao gồm 2 Sheet chuyên dụng:
                </div>
                <div>• <b>Sheet 1 (Bảng Công Tổng Hợp):</b> Ma trận Ngày 01-31 (X, Muộn, Về sớm, Vé quên công Q) cho Kế toán copy vào bảng tính lương.</div>
                <div style={{ marginTop: "2px" }}>• <b>Sheet 2 (Nhật Ký Chi Tiết):</b> Chi tiết từng ca làm, giờ vào/ra, số phút muộn, tọa độ GPS, đơn giải trình.</div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  style={{
                    padding: "0.55rem 1rem",
                    borderRadius: "10px",
                    border: "1px solid var(--border, #cbd5e1)",
                    background: "transparent",
                    color: "var(--foreground, #475569)",
                    fontWeight: 600,
                    fontSize: "0.84rem",
                    cursor: "pointer"
                  }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteExportExcel}
                  disabled={isGeneratingExcel}
                  style={{
                    padding: "0.55rem 1.25rem",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.86rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)"
                  }}
                >
                  {isGeneratingExcel ? (
                    <>⏳ Đang tạo file Excel...</>
                  ) : (
                    <>📥 Tải Bảng Tính Excel (.xlsx)</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}


      
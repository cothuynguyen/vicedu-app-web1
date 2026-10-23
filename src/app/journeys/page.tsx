"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import {
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
} from "lucide-react"
import * as XLSX from "xlsx"
import {
  getAdminCamps,
  saveCamp,
  deleteCamp,
  getCampMembers,
  saveMember,
  deleteMember,
  getCampReports,
  updateReportApproval,
  getCampExportData,
  getVicEduStaff,
  saveCampAdmins,
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

export default function JourneyAdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"camps" | "attendance" | "approvals" | "members">("camps")
  const [loading, setLoading] = useState(true)

  // Camps state
  const [camps, setCamps] = useState<any[]>([])
  const [selectedCampId, setSelectedCampId] = useState<string>("")
  const [editingCamp, setEditingCamp] = useState<CampData | null>(null)
  const [showCampModal, setShowCampModal] = useState(false)
  const [modalSubTab, setModalSubTab] = useState<"general" | "tasks" | "weekly_schedule" | "special_events" | "scoring" | "branding">("general")

  // Generator form state (cho Tab Weekly Schedule)
  const [genMonth, setGenMonth] = useState("2026-10")
  const [genStartDate, setGenStartDate] = useState("2026-11-02")
  const [genTotalCount, setGenTotalCount] = useState(24)

  // Session editor modal state
  const [editingSessionItem, setEditingSessionItem] = useState<any | null>(null)

  // Ban Quản Trị / Phân Quyền Giáo Viên
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [adminCamp, setAdminCamp] = useState<any | null>(null)
  const [campAdmins, setCampAdmins] = useState<any[]>([])
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null)
  const [staffList, setStaffList] = useState<any[]>([])
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

  const handleSaveAdmins = async () => {
    if (!adminCamp) return
    const res = await saveCampAdmins(adminCamp.id, campAdmins)
    if (res.success) {
      alert("✅ Đã cập nhật Ban Quản Trị & Giáo viên phụ trách thành công!")
      setCamps(prev => prev.map(c => c.id === adminCamp.id ? { ...c, theme: { ...(c.theme || {}), admins: campAdmins } } : c))
      setShowAdminModal(false)
    } else {
      alert("❌ Lỗi lưu Ban quản trị: " + res.error)
    }
  }

  const handleSaveSessionItem = (updated: any) => {
    if (!editingCamp) return
    const currentSessions = editingCamp.sessions || []
    const idx = currentSessions.findIndex((s: any) => s.id === updated.id)
    let newSessions: any[]
    if (idx >= 0) {
      newSessions = [...currentSessions]
      newSessions[idx] = updated
    } else {
      newSessions = [...currentSessions, updated]
    }
    setEditingCamp({
      ...editingCamp,
      sessions: newSessions,
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

  // GPS Geofence & Shifts form state (for Tab 2)
  const [gpsForm, setGpsForm] = useState({
    branch_name: "VP VicEdu Việt Trì 1",
    lat: 21.321852,
    lng: 105.398214,
    radius: 50,
  })
  const [shiftsForm, setShiftsForm] = useState<any[]>([
    { id: "P1", name: "Ca P1", start: "07:30", end: "17:30" },
    { id: "P2", name: "Ca P2", start: "09:00", end: "19:00" },
    { id: "P3", name: "Ca P3", start: "13:45", end: "21:45" },
    { id: "P4", name: "Ca P4", start: "08:00", end: "18:00" },
    { id: "P5", name: "Ca P5", start: "07:00", end: "17:00" },
  ])
  const [detectingGps, setDetectingGps] = useState(false)
  const [gpsMessage, setGpsMessage] = useState<string | null>(null)

  // Mở modal cấu hình Camp chi tiết
  const openCampModal = (camp?: any) => {
    if (camp) {
      const defaultTasks = (camp.tasks && Array.isArray(camp.tasks) && camp.tasks.length > 0)
        ? camp.tasks
        : (camp.mode === 'clb_quanh_nam' ? [
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

      const defaultWeeklySchedule = camp.theme?.weeklySchedule || (camp.mode === 'clb_quanh_nam' ? [
        { dayOfWeek: 5, dayLabel: "Thứ 6", timeStr: "17:30", location: "Công viên Văn Lang", sessionTitle: "Chạy tiếp sức chiều T6" },
        { dayOfWeek: 0, dayLabel: "Chủ Nhật", timeStr: "05:30", location: "Công viên Văn Lang", sessionTitle: "Long Run sáng Chủ Nhật" },
      ] : [
        { dayOfWeek: 1, dayLabel: "Thứ 2", timeStr: "19:00", location: "Phòng học Cambridge VicEdu", sessionTitle: "Lộ trình Ngữ pháp & Từ vựng" },
        { dayOfWeek: 6, dayLabel: "Thứ 7", timeStr: "08:30", location: "Phòng Lab VicEdu", sessionTitle: "Luyện Kỹ năng Speaking & Listening" },
      ])

      const defaultScoringRules = (camp.scoring_rules && Array.isArray(camp.scoring_rules) && camp.scoring_rules.length > 0)
        ? camp.scoring_rules
        : [
            { label: 'Mỗi nhiệm vụ đạt', points: '+1' },
            { label: 'Buổi làm đủ nhiệm vụ', points: '+1' },
            { label: 'Có mặt offline đúng giờ', points: '+2' },
            { label: 'Tuần kỷ luật (đủ tất cả các buổi)', points: '+3' },
            { label: 'Đạt mốc 100km / 200km / 300km (hoặc hoàn thành chặng)', points: '+10' },
          ]

      setEditingCamp({
        ...camp,
        tasks: defaultTasks,
        scoring_rules: defaultScoringRules,
        has_divisions: camp.has_divisions ?? true,
        require_pin: camp.require_pin ?? true,
        theme: {
          primary: camp.theme?.primary || (camp.mode === 'clb_quanh_nam' ? '#e11d48' : '#4f46e5'),
          accent: camp.theme?.accent || (camp.mode === 'clb_quanh_nam' ? '#be123c' : '#4338ca'),
          light: camp.theme?.light || (camp.mode === 'clb_quanh_nam' ? '#ffe4e6' : '#eef2ff'),
          campaignTitle: camp.theme?.campaignTitle || (camp.club_months?.[0]?.themeTitle || 'CHIẾN DỊCH THÁNG 10 · BÀN TAY GẮN KẾT & KỶ LUẬT THÉP'),
          campaignSlogan: camp.theme?.campaignSlogan || (camp.club_months?.[0]?.themeSlogan || 'Đập tay 5 người ngược chiều · Hoàn thành cự ly · Giữ chuỗi tuần rực lửa'),
          locationText: camp.theme?.locationText || 'Công viên Văn Lang',
          scheduleText: camp.theme?.scheduleText || 'Tuần 2 buổi · T6 17h30 & CN 05h30',
          canvaUrl: camp.theme?.canvaUrl || '',
          videoUrl: camp.theme?.videoUrl || '',
          careSuccessTpl: camp.theme?.careSuccessTpl || 'Chúc mừng {name} đã xuất sắc hoàn thành trọn vẹn nhiệm vụ ngày hôm nay! Hãy tiếp tục giữ vững ngọn lửa kỷ luật nhé!',
          careReminderTpl: camp.theme?.careReminderTpl || 'Nhắc nhở: Sắp đến giờ sinh hoạt / hạn nộp bài hôm nay. Bạn {name} hãy chuẩn bị sẵn sàng và nộp báo cáo đúng giờ nhé!',
          weeklySchedule: defaultWeeklySchedule,
        },
        logo: {
          icon: camp.logo?.icon || (camp.mode === 'clb_quanh_nam' ? '🏃‍♂️🔥' : '🎯📚'),
          text: camp.logo?.text || camp.title || 'RUBISEA 19',
          badgeLabel: camp.logo?.badgeLabel || (camp.mode === 'clb_quanh_nam' ? 'RUNNER NHÍ · RUNNER 19' : 'CAMBRIDGE IELTS'),
        },
        sessions: camp.sessions || [],
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
        },
        sessions: [],
      })
    }
    setModalSubTab("general")
    setShowCampModal(true)
  }

  // Load initial camps
  const loadCamps = async () => {
    setLoading(true)
    const res = await getAdminCamps()
    if (res.success && res.camps) {
      setCamps(res.camps)
      if (res.camps.length > 0 && !selectedCampId) {
        setSelectedCampId(res.camps[0].id)
        if (res.camps[0].branch_gps) {
          setGpsForm({
            branch_name: res.camps[0].branch_gps.branch_name || "VP VicEdu Việt Trì 1",
            lat: res.camps[0].branch_gps.lat || 21.321852,
            lng: res.camps[0].branch_gps.lng || 105.398214,
            radius: res.camps[0].branch_gps.radius || 50,
          })
        }
        if (res.camps[0].shifts_config && res.camps[0].shifts_config.length > 0) {
          setShiftsForm(res.camps[0].shifts_config)
        }
      }
    }
    setLoading(false)
  }

  // Load members when selected camp changes
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
        if (camp.branch_gps) {
          setGpsForm({
            branch_name: camp.branch_gps.branch_name || "VP VicEdu Việt Trì 1",
            lat: camp.branch_gps.lat || 21.321852,
            lng: camp.branch_gps.lng || 105.398214,
            radius: camp.branch_gps.radius || 50,
          })
        }
        if (camp.shifts_config && camp.shifts_config.length > 0) {
          setShiftsForm(camp.shifts_config)
        }
      }
      loadMembers(selectedCampId)
      loadReports(selectedCampId, approvalFilter)
    }
  }, [selectedCampId, approvalFilter])

  // Lấy tọa độ GPS thiết bị hiện tại của Bố Hoàng
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
        setGpsForm((prev) => ({
          ...prev,
          lat,
          lng,
        }))
        setDetectingGps(false)
        setGpsMessage(`✅ Đã bắt tọa độ thành công: ${lat}, ${lng} (Độ chính xác: ±${Math.round(pos.coords.accuracy)}m)`)
      },
      (err) => {
        setDetectingGps(false)
        setGpsMessage(`⚠️ Lỗi định vị: ${err.message}. Bố Hoàng vui lòng cấp quyền vị trí hoặc lấy trên Google Maps.`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  // Lưu cấu hình GPS & Ca làm việc vào Camp
  const handleSaveGpsAndShifts = async () => {
    if (!selectedCampId) return
    const camp = camps.find((c) => c.id === selectedCampId)
    if (!camp) return

    setLoading(true)
    const updatedCamp: CampData = {
      ...camp,
      branch_gps: gpsForm,
      shifts_config: shiftsForm,
    }
    const res = await saveCamp(updatedCamp)
    if (res.success) {
      alert("✅ Đã lưu cấu hình Tọa độ GPS & Ca làm việc thành công!")
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

  // Xuất file Excel chấm công & điểm danh (XLSX)
  const handleExportExcel = async () => {
    if (!selectedCampId) return
    const res = await getCampExportData(selectedCampId)
    if (!res.success || !res.camp) {
      alert("Lỗi tải dữ liệu xuất Excel!")
      return
    }

    const { camp, members: expMembers, reports: expReports } = res
    const membersList = expMembers || []
    const reportsList = expReports || []

    const rows = reportsList.map((r: any, idx: number) => {
      const member = membersList.find((m: any) => m.id === r.member_id)
      const tasksStr = r.tasks ? Object.entries(r.tasks).map(([k, v]) => `${k}: ${v}`).join(", ") : ""
      return {
        "STT": idx + 1,
        "Họ và Tên": member?.name || `Mã #${r.member_id}`,
        "Số Điện Thoại": member?.phone || "",
        "Mã PIN / 4 Số Cuối": member?.pin_code || member?.phone_last4 || "",
        "Vai Trò": member?.role_tag || "Thành viên",
        "Buổi Học / Ca": r.session_id || r.shift_code || "Chưa rõ",
        "Có Mặt": r.attended_session ? "Có mặt (Đủ công)" : "Vắng mặt",
        "Nhiệm Vụ Đã Làm": tasksStr,
        "Thời Gian Gửi": r.submitted_at ? new Date(r.submitted_at).toLocaleString("vi-VN") : "",
        "Trạng Thái Duyệt": r.approval_status === "approved" ? "Đã duyệt" : r.approval_status === "rejected" ? "Từ chối" : "Chờ duyệt",
        "Người Duyệt": r.approved_by || "",
        "Ghi Chú Giải Trình": r.difficulty_note || "",
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ Liệu Điểm Danh")

    const safeTitle = camp.slug || "journey"
    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `Bang_Cham_Cong_${safeTitle}_${dateStr}.xlsx`)
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

    // Giữ lại các Special Events đã thêm trước đó
    const specialEvents = (editingCamp.sessions || []).filter((s: any) => s.isSpecialEvent)
    const combinedSessions = [...generated, ...specialEvents].sort((a, b) => a.dateStr.localeCompare(b.dateStr))

    setEditingCamp({
      ...editingCamp,
      sessions: combinedSessions,
    })
    alert(`⚡ Đã tự động sinh thành công ${generated.length} buổi học/buổi chạy vào lịch trình!`)
  }

  // Thêm sự kiện đặc biệt mới vào editingCamp
  const handleAddSpecialEvent = () => {
    if (!newEvent.title.trim() || !newEvent.dateStr) {
      alert("Vui lòng nhập tên sự kiện và ngày diễn ra!")
      return
    }
    const eventSession = {
      id: `event_${Date.now()}`,
      sessionCode: `${newEvent.timeStr ? newEvent.timeStr.slice(0, 2) : "SK"} · ${newEvent.dateStr.slice(5).replace("-", "/")}`,
      title: newEvent.title.trim(),
      dateStr: newEvent.dateStr,
      timeStr: newEvent.timeStr || "T7 05:30",
      location: newEvent.location.trim() || "Địa điểm tổ chức",
      isSpecialEvent: true,
      eventType: newEvent.eventType || "race",
      specialBadge: newEvent.specialBadge.trim() || "🏆 GIẢI ĐẤU",
      desc: newEvent.desc.trim() || "",
    }

    const currentSessions = editingCamp?.sessions || []
    setEditingCamp({
      ...editingCamp!,
      sessions: [...currentSessions, eventSession],
    })
    setNewEvent({
      title: "",
      dateStr: "",
      timeStr: "T7 05:30",
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
              <Plus size={18} />
              <span>Tạo Hành Trình Mới</span>
            </button>

            <button
              onClick={handleExportExcel}
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
              }}
              title="Xuất dữ liệu cho Kế toán HO (Cô Thảo) nạp bảng tính"
            >
              <FileSpreadsheet size={18} style={{ color: "#34d399" }} />
              <span>Xuất File Excel Chấm Công</span>
            </button>
          </div>
        </div>

        {/* Camp Switcher Bar */}
        <div style={{
          marginTop: "1.25rem",
          paddingTop: "1.25rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.15)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
        }}>
          <span style={{ fontSize: "0.85rem", fontWeight: 600, opacity: 0.9 }}>Đang quản trị:</span>
          <select
            value={selectedCampId}
            onChange={(e) => setSelectedCampId(e.target.value)}
            style={{
              background: "rgba(0, 0, 0, 0.25)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "8px",
              padding: "0.45rem 1rem",
              fontSize: "0.88rem",
              fontWeight: 600,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {camps.map((c) => (
              <option key={c.id} value={c.id} style={{ background: "#1e1b4b", color: "white" }}>
                {c.title} ({c.mode === "clb_quanh_nam" ? "CLB Quanh Năm" : "Lớp Học"}) - {c.memberCount} TV
              </option>
            ))}
          </select>

          {selectedCamp && (
            <a
              href={`http://localhost:3001/hanh-trinh/${selectedCamp.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "0.82rem",
                color: "#6ee7b7",
                textDecoration: "none",
                fontWeight: 600,
                marginLeft: "auto",
              }}
            >
              <span>Xem trang Báo Cáo Học Viên</span>
              <ExternalLink size={14} />
            </a>
          )}
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
          { key: "attendance", label: "📍 Chấm Công Chi Nhánh & Ca Làm (VicHRM)", icon: MapPin },
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
      {activeTab === "camps" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "1.5rem" }}>
            {camps.map((camp) => (
              <div
                key={camp.id}
                style={{
                  background: "var(--surface)",
                  borderRadius: "14px",
                  border: selectedCampId === camp.id ? "2px solid #4f46e5" : "1px solid var(--border)",
                  padding: "1.5rem",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                    <span style={{
                      display: "inline-block",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "6px",
                      background: camp.mode === "clb_quanh_nam" ? "#ffe4e6" : "#e0e7ff",
                      color: camp.mode === "clb_quanh_nam" ? "#be123c" : "#4338ca",
                    }}>
                      {camp.mode === "clb_quanh_nam" ? "🏃‍♂️ CLB QUANH NĂM" : "📚 LỚP HỌC THEO BUỔI"}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      Mã: <code>{camp.slug}</code>
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "0.4rem" }}>
                    {camp.title}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1rem", lineHeight: 1.4 }}>
                    {camp.subtitle || "Không có phụ đề"}
                  </p>

                  {/* Slogan Tùy Biến (Addressing User's Request) */}
                  <div style={{
                    padding: "0.75rem",
                    background: "var(--background)",
                    borderRadius: "8px",
                    borderLeft: "3px solid #f59e0b",
                    fontSize: "0.8rem",
                    fontStyle: "italic",
                    marginBottom: "1rem",
                    color: "var(--text-main)",
                  }}>
                    "{camp.slogan || "KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ"}"
                  </div>

                  {/* Quick Stats */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", marginBottom: "1.25rem", textAlign: "center" }}>
                    <div style={{ padding: "0.5rem", background: "var(--background)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#4f46e5" }}>{camp.memberCount}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Thành viên</div>
                    </div>
                    <div style={{ padding: "0.5rem", background: "var(--background)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#10b981" }}>{camp.reportCount}</div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Lượt nộp</div>
                    </div>
                    <div style={{ padding: "0.5rem", background: "var(--background)", borderRadius: "8px" }}>
                      <div style={{ fontSize: "1.15rem", fontWeight: 800, color: camp.pendingCount > 0 ? "#ef4444" : "#6b7280" }}>
                        {camp.pendingCount}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Chờ duyệt</div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => openAdminModal(camp)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "0.55rem 0.95rem",
                      borderRadius: "8px",
                      background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                      color: "white",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 2px 6px rgba(124, 58, 237, 0.25)",
                    }}
                    title="Phân quyền Ban Quản Trị & Giáo viên phụ trách"
                  >
                    <Shield size={14} />
                    <span>🛡️ Phân Quyền QTV ({(camp.theme?.admins || []).length || 1})</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCampId(camp.id)
                      openCampModal(camp)
                    }}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "0.55rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      color: "var(--text-main)",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <Edit size={14} />
                    <span>⚙️ Cấu Hình Toàn Diện (Lịch tuần, Nhiệm vụ, Sự kiện)</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCampId(camp.id)
                      setActiveTab("members")
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0.5rem 0.75rem",
                      borderRadius: "8px",
                      background: "#4f46e5",
                      color: "white",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      border: "none",
                      cursor: "pointer",
                    }}
                    title="Quản lý thành viên"
                  >
                    <Users size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: CHẤM CÔNG CHI NHÁNH & CA LÀM VIỆC */}
      {activeTab === "attendance" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem" }}>
          {/* Card 1: Cấu hình GPS Geofencing */}
          <div style={{
            background: "var(--surface)",
            padding: "1.75rem",
            borderRadius: "14px",
            border: "1px solid var(--border)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#ecfdf5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MapPin size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Hàng Rào Địa Lý GPS (Geofencing)</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>Chỉ điện thoại thông minh trong bán kính mới được ghi nhận đủ công</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.25rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Tên Chi Nhánh / Văn Phòng</label>
                <input
                  type="text"
                  value={gpsForm.branch_name}
                  onChange={(e) => setGpsForm({ ...gpsForm, branch_name: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Vĩ độ (Latitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={gpsForm.lat}
                    onChange={(e) => setGpsForm({ ...gpsForm, lat: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Kinh độ (Longitude)</label>
                  <input
                    type="number"
                    step="any"
                    value={gpsForm.lng}
                    onChange={(e) => setGpsForm({ ...gpsForm, lng: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Bán kính cho phép check-in: <strong>{gpsForm.radius} mét</strong>
                </label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={gpsForm.radius}
                  onChange={(e) => setGpsForm({ ...gpsForm, radius: parseInt(e.target.value) })}
                  style={{ width: "100%", accentColor: "#4f46e5" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <span>20m (Rất hẹp)</span>
                  <span>50m (Khuyên dùng)</span>
                  <span>100m</span>
                  <span>200m (Rộng)</span>
                </div>
              </div>

              {/* Nút Lấy Tọa Độ Tự Động */}
              <div style={{ paddingTop: "0.5rem" }}>
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
                  <span>{detectingGps ? "Đang định vị vệ tinh..." : "📍 Lấy Tọa Độ Vị Trí Hiện Tại Của Bố Hoàng"}</span>
                </button>

                {gpsMessage && (
                  <p style={{ marginTop: "0.65rem", fontSize: "0.82rem", color: gpsMessage.startsWith("✅") ? "#10b981" : "#ef4444" }}>
                    {gpsMessage}
                  </p>
                )}
              </div>

              <div style={{
                background: "rgba(79, 70, 229, 0.05)",
                border: "1px dashed #818cf8",
                borderRadius: "8px",
                padding: "0.85rem",
                fontSize: "0.8rem",
                color: "var(--text-main)",
                marginTop: "0.5rem",
              }}>
                💡 <strong>Cách lấy tọa độ từ Google Maps:</strong> Mở Google Maps trên máy tính/điện thoại, click chuột phải vào đúng điểm chi nhánh trung tâm, dòng đầu tiên chính là dãy số tọa độ (Ví dụ: <code>21.321852, 105.398214</code>). Bấm vào đó là đã copy!
              </div>
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
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Clock size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Cấu Hình Ca Làm Việc (Shifts)</h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>Tự động đối soát giờ Check-in / Check-out tính đi muộn, về sớm</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1rem" }}>
                {shiftsForm.map((shift, idx) => (
                  <div
                    key={shift.id || idx}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr auto",
                      gap: "0.5rem",
                      alignItems: "center",
                      padding: "0.6rem 0.85rem",
                      background: "var(--background)",
                      borderRadius: "8px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#4f46e5" }}>{shift.name}</span>
                    <div style={{ fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Vào: </span>
                      <strong>{shift.start}</strong>
                    </div>
                    <div style={{ fontSize: "0.8rem" }}>
                      <span style={{ color: "var(--text-muted)" }}>Ra: </span>
                      <strong>{shift.end}</strong>
                    </div>
                    <span style={{ fontSize: "0.75rem", background: "#d1fae5", color: "#065f46", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      Hoạt động
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "1.25rem", marginTop: "1.5rem" }}>
              <button
                type="button"
                onClick={handleSaveGpsAndShifts}
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
                💾 Lưu Cấu Hình Tọa Độ GPS & Ca Làm Việc Vào Camp Này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DUYỆT GIẢI TRÌNH & BÁO CÁO */}
      {activeTab === "approvals" && (
        <div style={{ background: "var(--surface)", borderRadius: "14px", border: "1px solid var(--border)", padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>Hàng Đợi Duyệt Chấm Công & Điểm Danh</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Xét duyệt các trường hợp check-in ngoài tọa độ, quên bấm công hoặc xin phép vắng mặt
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.5rem" }}>
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                Danh Sách Thành Viên / Nhân Sự ({members.length} người)
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Quản lý mã PIN 4 số, vai trò, số km tích lũy và quota vé quên công
              </p>
            </div>

            <button
              onClick={() => {
                setEditingMember({
                  camp_id: selectedCampId,
                  name: "",
                  phone: "",
                  pin_code: "1234",
                  role_tag: "Thành viên",
                  total_km_all_time: 0,
                  forgot_pills_quota: 3,
                })
                setShowMemberModal(true)
              }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#4f46e5",
                color: "white",
                padding: "0.55rem 1rem",
                borderRadius: "8px",
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              <span>Thêm Thành Viên Mới</span>
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{ background: "var(--background)", borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                  <th style={{ padding: "0.75rem" }}>STT / ID</th>
                  <th style={{ padding: "0.75rem" }}>Họ và Tên</th>
                  <th style={{ padding: "0.75rem" }}>Số Điện Thoại</th>
                  <th style={{ padding: "0.75rem" }}>Mã PIN (4 Số)</th>
                  <th style={{ padding: "0.75rem" }}>Vai Trò</th>
                  <th style={{ padding: "0.75rem" }}>Tổng Tích Lũy</th>
                  <th style={{ padding: "0.75rem" }}>Vé Quên Chấm Công</th>
                  <th style={{ padding: "0.75rem", textAlign: "right" }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, idx) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid var(--border)" }}>
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
                          <div style={{ fontWeight: 600, color: "var(--text-main)" }}>
                            {m.name} {m.is_elite && <span title="Elite Runner">👑</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "0.75rem" }}>{m.phone || "---"}</td>
                    <td style={{ padding: "0.75rem" }}>
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
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{m.role_tag || "Thành viên"}</span>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <strong style={{ color: "#f59e0b" }}>{m.total_km_all_time || 0} km</strong>
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <span style={{ background: "#fef3c7", color: "#b45309", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700 }}>
                        {m.forgot_pills_quota !== undefined ? m.forgot_pills_quota : 3} vé
                      </span>
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
            }}>
              <div>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                  {editingCamp.id ? `⚙️ Cấu Hình Toàn Diện: ${editingCamp.title}` : "✨ Tạo Hành Trình Mới"}
                </h2>
                <p style={{ fontSize: "0.8rem", opacity: 0.85, margin: "0.2rem 0 0" }}>
                  Lịch cố định hàng tuần, Sinh buổi tự động, 4 Thử thách, Điểm thưởng, Sự kiện & Slogan
                </p>
              </div>
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

            {/* Modal Sub-Tabs */}
            <div style={{
              display: "flex",
              borderBottom: "1px solid var(--border)",
              background: "var(--background)",
              padding: "0 1rem",
              overflowX: "auto",
            }}>
              {[
                { key: "general", label: "📋 Thông Tin & Slogan", icon: Edit },
                { key: "tasks", label: "🎯 4 Thử Thách Tháng", icon: Layers, badge: editingCamp.tasks?.length || 4 },
                { key: "weekly_schedule", label: "🗓️ Lịch Tuần & Sinh Buổi", icon: Zap, badge: editingCamp.sessions?.length || 0 },
                { key: "special_events", label: "🏆 Sự Kiện Đặc Biệt", icon: Flag, badge: (editingCamp.sessions || []).filter((s: any) => s.isSpecialEvent).length },
                { key: "scoring", label: "💎 Quy Tắc Tính Điểm", icon: Award },
                { key: "branding", label: "🎨 Giao Diện & Zalo", icon: Palette },
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
            <div style={{ padding: "1.5rem 1.75rem", overflowY: "auto", flex: 1, maxHeight: "65vh" }}>
              {/* PHẦN 1: THÔNG TIN CƠ BẢN & SLOGAN */}
              {modalSubTab === "general" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
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
                        <option value="clb_quanh_nam">🏃‍♂️ CLB Quanh Năm (Tích lũy km, mùa giải 12 tháng, phân hạng Tân binh / 300km)</option>
                        <option value="lop_hoc_buoi">📚 Lớp Học Theo Buổi (Lộ trình 24/32 buổi Cambridge, BTVN & Điểm danh)</option>
                      </select>
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
                </div>
              )}

              {/* PHẦN 2: CẤU HÌNH 4 THỬ THÁCH THÁNG (TASKS) */}
              {modalSubTab === "tasks" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <div>
                      <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>
                        🎯 Danh Sách Thử Thách & Nhiệm Vụ Học Viên ({editingCamp.tasks?.length || 0} nhiệm vụ)
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

                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr", gap: "0.85rem", marginBottom: "0.75rem" }}>
                          <div>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                              Tên Thử Thách
                            </label>
                            <input
                              type="text"
                              value={task.name}
                              onChange={(e) => handleTaskChange(idx, "name", e.target.value)}
                              placeholder="Ví dụ: Chạy bộ, Đập tay giao lưu, Làm BTVN..."
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                            />
                          </div>

                          <div>
                            <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>
                              Kiểu Dữ Liệu
                            </label>
                            <select
                              value={task.type}
                              onChange={(e) => handleTaskChange(idx, "type", e.target.value)}
                              style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                            >
                              <option value="number">🔢 Nhập Số (Số km, từ vựng, phút...)</option>
                              <option value="boolean">☑️ Tích Chọn (Hoàn thành / Chưa hoàn thành)</option>
                              <option value="link">🔗 Nộp Link (Drive, Padlet...)</option>
                            </select>
                          </div>
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
                            placeholder="Ví dụ: Chạy tối thiểu 3km mỗi buổi, Đập tay chào người chạy ngược chiều..."
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

                    {editingCamp.mode === "clb_quanh_nam" ? (
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
                          <span>⚡ Sinh Toàn Bộ Lịch Chạy Cả Tháng Này</span>
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
                                  {s.sessionCode}
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem" }}>
                                  <div>📅 {s.dateStr}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>⏰ {s.timeStr}</div>
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
                                  <div>{s.title}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>📍 {s.location}</div>
                                  {s.isSpecialEvent && <span style={{ background: "#fef3c7", color: "#b45309", padding: "1px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>{s.specialBadge || "SỰ KIỆN"}</span>}
                                </td>
                                <td style={{ padding: "0.6rem 0.75rem" }}>
                                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                                    {hasVideo ? (
                                      <span style={{ background: "#dbeafe", color: "#1e40af", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>🎥 Video</span>
                                    ) : null}
                                    {hasDownload ? (
                                      <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700 }}>📥 Tải</span>
                                    ) : null}
                                    {hasCanva ? (
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
                          onChange={(e) => setNewEvent({ ...newEvent, dateStr: e.target.value })}
                          style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Giờ Tập Trung</label>
                        <input
                          type="text"
                          value={newEvent.timeStr}
                          onChange={(e) => setNewEvent({ ...newEvent, timeStr: e.target.value })}
                          placeholder="T7 05:30"
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

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {(editingCamp.scoring_rules || []).map((rule, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "3fr 1fr auto",
                          gap: "0.75rem",
                          alignItems: "center",
                          background: "var(--background)",
                          padding: "0.6rem 0.85rem",
                          borderRadius: "8px",
                          border: "1px solid var(--border)",
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
                          style={{ padding: "0.45rem 0.65rem", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.85rem", background: "var(--surface)" }}
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
                          style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer" }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(editingCamp.scoring_rules || []), { label: "Tiêu chí thưởng mới", points: "+1" }]
                      setEditingCamp({ ...editingCamp, scoring_rules: updated })
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
            }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                💡 Mọi thay đổi lịch tuần, nhiệm vụ và sự kiện sẽ được đồng bộ tức thì sang Web 2.
              </span>

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
                    const res = await saveCamp(editingCamp)
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

              {/* 3. Slide Canva tương tác */}
              <div style={{ background: "rgba(168, 85, 247, 0.05)", border: "1px solid rgba(168, 85, 247, 0.25)", borderRadius: "10px", padding: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "0.35rem" }}>
                  <span style={{ fontSize: "1rem" }}>🎨</span>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#6b21a8" }}>
                    Slide Bài Giảng Canva Tương Tác
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

      {/* MODAL THÊM / SỬA THÀNH VIÊN */}
      {showMemberModal && editingMember && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
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
            padding: "2rem",
            maxWidth: "500px",
            width: "100%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              {editingMember.id ? "✏️ Chỉnh Sửa Thành Viên" : "✨ Thêm Thành Viên Mới"}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1.25rem" }}>
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
                  onChange={(e) => setEditingMember({ ...editingMember, phone: e.target.value })}
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
                  placeholder="Ví dụ: Runner Nhí, Phụ huynh đồng hành, Nhân sự HO..."
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Tổng Km Tích Lũy</label>
                  <input
                    type="number"
                    value={editingMember.total_km_all_time || 0}
                    onChange={(e) => setEditingMember({ ...editingMember, total_km_all_time: parseFloat(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>Vé Quên Chấm Công</label>
                  <input
                    type="number"
                    value={editingMember.forgot_pills_quota !== undefined ? editingMember.forgot_pills_quota : 3}
                    onChange={(e) => setEditingMember({ ...editingMember, forgot_pills_quota: parseInt(e.target.value) || 0 })}
                    style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.75rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
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
                    alert("Vui lòng nhập họ và tên thành viên!")
                    return
                  }
                  const res = await saveMember(editingMember)
                  if (res.success) {
                    setShowMemberModal(false)
                    loadMembers(selectedCampId)
                    loadCamps()
                  } else {
                    alert("Lỗi lưu thành viên: " + res.error)
                  }
                }}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "none", background: "#4f46e5", color: "white", fontWeight: 700, cursor: "pointer" }}
              >
                Lưu Thành Viên
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

                <div style={{ marginBottom: "0.85rem" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, display: "block", marginBottom: "0.35rem" }}>
                    1. Chọn Nhanh Giáo Viên / Nhân Sự Từ Hệ Thống VicEdu
                  </label>
                  <select
                    style={{ width: "100%", padding: "0.55rem 0.75rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-main)", fontSize: "0.85rem", fontWeight: 600 }}
                    onChange={(e) => {
                      const selectedId = e.target.value
                      const found = staffList.find(s => s.id === selectedId)
                      if (found) {
                        setNewAdmin({
                          ...newAdmin,
                          name: found.full_name || "",
                          phone: found.phone || "",
                          pinLast4: found.phone ? found.phone.slice(-4) : "1234",
                          roleTitle: found.role === "Giáo viên" ? "Giáo viên Chủ nhiệm" : `${found.role} Phụ trách`,
                          avatar: found.role === "Giáo viên" ? "👩‍🏫" : "👤",
                        })
                      }
                    }}
                  >
                    <option value="">-- Bấm vào đây để chọn nhanh Nhân sự / Giáo viên VicEdu --</option>
                    {staffList.map(st => (
                      <option key={st.id} value={st.id}>
                        {st.full_name} · [{st.role}] · SĐT: {st.phone || "Chưa có"}
                      </option>
                    ))}
                  </select>
                </div>

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
                            {adm.name.includes("Bầu Xô") ? (
                              <span style={{ fontSize: "0.72rem", color: "#10b981", fontWeight: 700 }}>Chủ Sở Hữu</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleRemoveAdmin(adm.id)}
                                style={{ background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                                title="Xóa quyền quản trị viên này"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
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
    </div>
  )
}

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
  CampData,
  MemberData,
} from "@/app/actions/journeyAdmin"

export default function JourneyAdminPage() {
  const { user, loading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState<"camps" | "attendance" | "approvals" | "members">("camps")
  const [loading, setLoading] = useState(true)

  // Camps state
  const [camps, setCamps] = useState<any[]>([])
  const [selectedCampId, setSelectedCampId] = useState<string>("")
  const [editingCamp, setEditingCamp] = useState<CampData | null>(null)
  const [showCampModal, setShowCampModal] = useState(false)

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

    // 1. Tạo ma trận dữ liệu
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

    // 2. Tạo Workbook
    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dữ Liệu Điểm Danh")

    // 3. Tải xuống file
    const safeTitle = camp.slug || "journey"
    const dateStr = new Date().toISOString().slice(0, 10)
    XLSX.writeFile(workbook, `Bang_Cham_Cong_${safeTitle}_${dateStr}.xlsx`)
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

  if (user?.role !== "Super Admin") {
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
              onClick={() => {
                setEditingCamp({
                  slug: "",
                  title: "",
                  subtitle: "",
                  slogan: "KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ",
                  mode: "clb_quanh_nam",
                  status: "active",
                })
                setShowCampModal(true)
              }}
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
                <div style={{ display: "flex", gap: "0.5rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <button
                    onClick={() => {
                      setSelectedCampId(camp.id)
                      setEditingCamp(camp)
                      setShowCampModal(true)
                    }}
                    style={{
                      flex: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "0.5rem",
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
                    <span>Cấu hình Slogan & Giao diện</span>
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
                        }}>
                          {m.name ? m.name.charAt(0) : "U"}
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

      {/* MODAL CẤU HÌNH CAMP & SLOGAN TÙY BIẾN */}
      {showCampModal && editingCamp && (
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
            maxWidth: "600px",
            width: "100%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            maxHeight: "90vh",
            overflowY: "auto",
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
              {editingCamp.id ? "✏️ Cấu Hình Hành Trình" : "✨ Tạo Hành Trình Mới"}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              Tùy biến tiêu đề, slogan khẩu hiệu truyền cảm hứng, và chế độ hoạt động
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Mã Slug (Đường link URL)
                </label>
                <input
                  type="text"
                  value={editingCamp.slug}
                  onChange={(e) => setEditingCamp({ ...editingCamp, slug: e.target.value })}
                  placeholder="vi-du: rubisea-19 hoac vicedu-ielts"
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
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
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Phụ Đề / Lịch Sinh Hoạt
                </label>
                <input
                  type="text"
                  value={editingCamp.subtitle || ""}
                  onChange={(e) => setEditingCamp({ ...editingCamp, subtitle: e.target.value })}
                  placeholder="Lịch chạy T6 17h30 & CN 05h30..."
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                />
              </div>

              {/* SLOGAN TÙY BIẾN THEO YÊU CẦU BỐ HOÀNG */}
              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  🌟 Slogan / Khẩu Hiệu Cốt Lõi (Tùy biến 100%)
                </label>
                <textarea
                  rows={2}
                  value={editingCamp.slogan || ""}
                  onChange={(e) => setEditingCamp({ ...editingCamp, slogan: e.target.value })}
                  placeholder="KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ"
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)", fontSize: "0.85rem" }}
                />
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  Slogan này sẽ hiển thị trang trọng trên đầu trang Báo Cáo Học Viên và Banner vinh danh.
                </span>
              </div>

              <div>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, display: "block", marginBottom: "0.35rem" }}>
                  Chế Độ Vận Hành
                </label>
                <select
                  value={editingCamp.mode}
                  onChange={(e) => setEditingCamp({ ...editingCamp, mode: e.target.value as any })}
                  style={{ width: "100%", padding: "0.6rem 0.85rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text-main)" }}
                >
                  <option value="clb_quanh_nam">🏃‍♂️ CLB Quanh Năm (Tích lũy km, phân hạng Tân binh / Bàn chân thép / 300km)</option>
                  <option value="lop_hoc_buoi">📚 Lớp Học Theo Buổi (Lộ trình 24/32 buổi Cambridge, BTVN & Điểm danh)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.75rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
              <button
                type="button"
                onClick={() => setShowCampModal(false)}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "1px solid var(--border)", background: "transparent", color: "var(--text-main)", cursor: "pointer" }}
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
                  } else {
                    alert("Lỗi lưu camp: " + res.error)
                  }
                }}
                style={{ padding: "0.6rem 1.25rem", borderRadius: "8px", border: "none", background: "#4f46e5", color: "white", fontWeight: 700, cursor: "pointer" }}
              >
                Lưu Thay Đổi
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
    </div>
  )
}

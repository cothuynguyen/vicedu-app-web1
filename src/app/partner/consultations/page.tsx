"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  getPartnerConsultations, 
  updatePartnerConsultationStatus, 
  enrollStudentByPartner,
  deletePartnerConsultation,
  getPartnerCourses,
  PartnerConsultationItem,
  PartnerCourse 
} from "@/app/actions/partner";
import { 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  UserPlus, 
  ExternalLink, 
  Copy, 
  Edit3, 
  GraduationCap, 
  X, 
  Calendar, 
  Sparkles, 
  BookOpen, 
  UserCheck, 
  Loader2,
  Send,
  Check,
  ChevronRight,
  Trash2
} from "lucide-react";

export default function PartnerConsultationsPage() {
  const { user } = useAuth();
  const [consultations, setConsultations] = useState<PartnerConsultationItem[]>([]);
  const [courses, setCourses] = useState<PartnerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Status edit modal
  const [selectedConsultation, setSelectedConsultation] = useState<PartnerConsultationItem | null>(null);
  const [editStatus, setEditStatus] = useState("Mới");
  const [editNote, setEditNote] = useState("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);

  // Fast enroll modal
  const [enrollTarget, setEnrollTarget] = useState<PartnerConsultationItem | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollVip, setEnrollVip] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<PartnerConsultationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Notification Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async (isManualRefresh = false) => {
    if (!user?.email) return;
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [cRes, coursesRes] = await Promise.all([
        getPartnerConsultations(user.email, user.department || user.position),
        getPartnerCourses(user.email, user.department || user.position)
      ]);

      if (cRes.success && cRes.data) {
        setConsultations(cRes.data);
      } else {
        setConsultations([]);
      }

      if (coursesRes.success && coursesRes.data) {
        setCourses(coursesRes.data);
        if (coursesRes.data.length > 0 && !selectedCourseId) {
          setSelectedCourseId(coursesRes.data[0].id);
        }
      }
    } catch (err: any) {
      console.error("Lỗi tải danh sách tư vấn:", err);
      showToast("Không thể tải danh sách tư vấn: " + err.message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.email, user?.department, user?.position]);

  // Copy phone handler
  const handleCopyPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    navigator.clipboard.writeText(cleanPhone);
    setCopiedPhone(cleanPhone);
    showToast(`Đã sao chép SĐT: ${cleanPhone}`);
    setTimeout(() => setCopiedPhone(null), 2500);
  };

  // Open status modal
  const openStatusModal = (item: PartnerConsultationItem) => {
    setSelectedConsultation(item);
    setEditStatus(item.status || "Mới");
    setEditNote(item.leadNotes || "");
  };

  // Handle save status
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConsultation || !user?.email) return;

    setIsSavingStatus(true);
    try {
      const res = await updatePartnerConsultationStatus({
        phone: selectedConsultation.phone,
        status: editStatus,
        notes: editNote.trim(),
        partnerEmail: user.email,
        fullName: selectedConsultation.fullName
      });

      if (res.success) {
        showToast("Đã cập nhật trạng thái tư vấn thành công!");
        setSelectedConsultation(null);
        // Cập nhật state trực tiếp
        setConsultations(prev => prev.map(c => {
          if (c.phone === selectedConsultation.phone) {
            return { ...c, status: editStatus, leadNotes: editNote.trim() };
          }
          return c;
        }));
      } else {
        showToast(res.error || "Lỗi cập nhật trạng thái", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi không xác định", "error");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // Open Fast Enroll modal
  const openEnrollModal = (item: PartnerConsultationItem) => {
    setEnrollTarget(item);
    if (item.courseId) {
      setSelectedCourseId(item.courseId);
    } else if (courses.length > 0) {
      const match = courses.find(c => c.title.toLowerCase().includes(item.courseTitle.toLowerCase()));
      setSelectedCourseId(match ? match.id : courses[0].id);
    }
    setEnrollVip(false);
  };

  // Handle submit Fast Enroll
  const handleFastEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollTarget || !user?.email || !selectedCourseId) return;

    setIsEnrolling(true);
    try {
      const res = await enrollStudentByPartner({
        partnerEmail: user.email,
        partnerDepartment: user.department || user.position,
        studentName: enrollTarget.fullName,
        studentPhone: enrollTarget.phone,
        notes: `Ghi danh từ Khách tư vấn (${enrollTarget.notes || "Khách đăng ký"})`,
        courseId: selectedCourseId,
        isVip: enrollVip
      });

      if (res.success) {
        showToast(res.message || "Đã cấp quyền học thành công cho học viên!");
        setEnrollTarget(null);
        // Cập nhật trạng thái sang Đang học
        await updatePartnerConsultationStatus({
          phone: enrollTarget.phone,
          status: "Đang học",
          notes: "Đã ghi danh vào khóa học thành công",
          partnerEmail: user.email,
          fullName: enrollTarget.fullName
        });
        loadData();
      } else {
        showToast(res.error || "Ghi danh thất bại", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi ghi danh", "error");
    } finally {
      setIsEnrolling(false);
    }
  };

  // Open delete modal
  const openDeleteModal = (item: PartnerConsultationItem) => {
    setDeleteTarget(item);
  };

  // Handle delete consultation
  const handleDeleteConsultation = async () => {
    if (!deleteTarget || !user?.email) return;
    setIsDeleting(true);
    try {
      const res = await deletePartnerConsultation(deleteTarget.id, user.email);
      if (res.success) {
        showToast(res.message || "Đã xóa lượt đăng ký thành công!");
        setConsultations(prev => prev.filter(c => c.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        showToast(res.error || "Xóa thất bại", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Lỗi khi xóa", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered List
  const filteredList = consultations.filter(item => {
    if (filterCourse !== "all" && item.courseTitle !== filterCourse) return false;
    if (filterStatus !== "all" && item.status !== filterStatus) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const cleanQ = q.replace(/\D/g, "");
      const cleanPhone = item.phone.replace(/\D/g, "");

      const nameMatch = item.fullName.toLowerCase().includes(q);
      const phoneMatch = cleanQ.length >= 3 && cleanPhone.includes(cleanQ);
      const notesMatch = item.notes.toLowerCase().includes(q) || (item.leadNotes && item.leadNotes.toLowerCase().includes(q));
      const courseMatch = item.courseTitle.toLowerCase().includes(q);

      return nameMatch || phoneMatch || notesMatch || courseMatch;
    }
    return true;
  });

  // Unique courses for filter
  const uniqueCourses = Array.from(new Set(consultations.map(c => c.courseTitle).filter(Boolean)));

  // Status counts
  const totalCount = consultations.length;
  const newCount = consultations.filter(c => c.status === "Mới" || !c.status).length;
  const consultingCount = consultations.filter(c => c.status === "Đang tư vấn").length;
  const enrolledCount = consultations.filter(c => c.status === "Đang học" || c.status === "Đã chốt" || c.isEnrolled).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Mới":
        return {
          bg: "#fef2f2",
          color: "#dc2626",
          border: "#fecaca",
          label: "Chờ liên hệ (Mới)",
          icon: AlertCircle
        };
      case "Đang tư vấn":
        return {
          bg: "#eff6ff",
          color: "#2563eb",
          border: "#bfdbfe",
          label: "Đang tư vấn",
          icon: Clock
        };
      case "Đã chốt":
      case "Đang học":
        return {
          bg: "#ecfdf5",
          color: "#059669",
          border: "#a7f3d0",
          label: status === "Đang học" ? "Đang học" : "Đã chốt",
          icon: CheckCircle2
        };
      case "Không nghe máy":
        return {
          bg: "#fffbeb",
          color: "#d97706",
          border: "#fde68a",
          label: "Không nghe máy",
          icon: Clock
        };
      default:
        return {
          bg: "#f3f4f6",
          color: "#4b5563",
          border: "#e5e7eb",
          label: status || "Mới",
          icon: Clock
        };
    }
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1350px", margin: "0 auto" }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          background: toast.type === "success" ? "#10b981" : "#ef4444",
          color: "white",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: 600,
          animation: "slideIn 0.3s ease-out"
        }}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        borderRadius: "20px",
        padding: "1.75rem 2rem",
        color: "white",
        marginBottom: "1.75rem",
        boxShadow: "0 10px 25px -5px rgba(67, 56, 202, 0.3)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1.5rem"
      }}>
        <div>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(255, 255, 255, 0.15)",
            backdropFilter: "blur(8px)",
            padding: "4px 12px",
            borderRadius: "999px",
            fontSize: "0.8rem",
            fontWeight: 600,
            marginBottom: "0.5rem"
          }}>
            <Sparkles size={14} color="#fde047" />
            <span>Phân hệ Tuyển sinh & Kết nối Chuyên gia</span>
          </div>
          <h1 style={{ fontSize: "1.7rem", fontWeight: 800, margin: "0 0 0.4rem 0", letterSpacing: "-0.02em" }}>
            Khách Hàng Đăng Ký Tư Vấn Bộ Môn 📋
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "0.92rem", maxWidth: "680px", lineHeight: 1.5 }}>
            Danh sách phụ huynh và học viên bấm nút <em>"Nhờ tư vấn"</em> từ trang giới thiệu khóa học. Thầy/Cô có thể gọi điện, nhắn tin Zalo trao đổi trực tiếp hoặc cấp quyền học ngay khi học viên đồng ý!
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              color: "#ffffff",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              padding: "0.6rem 1.1rem",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.85rem",
              cursor: refreshing ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Đang làm mới..." : "Làm mới"}</span>
          </button>

          <Link
            href="/partner/submissions"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#ffffff",
              color: "#4338ca",
              padding: "0.6rem 1.1rem",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.85rem",
              textDecoration: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
            }}
          >
            <span>Sang mục Chấm bài</span>
            <ChevronRight size={15} />
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
        marginBottom: "1.75rem"
      }}>
        <div style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#eff6ff",
            color: "#3b82f6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <UserCheck size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{totalCount}</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>Tổng lượt đăng ký</div>
          </div>
        </div>

        <div style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: newCount > 0 ? "2px solid #ef4444" : "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#fef2f2",
            color: "#ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <AlertCircle size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#ef4444" }}>{newCount}</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>Chờ liên hệ tư vấn</div>
          </div>
        </div>

        <div style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#eff6ff",
            color: "#2563eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <Clock size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{consultingCount}</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>Đang tư vấn / Chăm sóc</div>
          </div>
        </div>

        <div style={{
          background: "white",
          borderRadius: "14px",
          padding: "1.25rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            background: "#ecfdf5",
            color: "#10b981",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0
          }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#1e293b" }}>{enrolledCount}</div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 500 }}>Đã chốt / Đang học</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: "white",
        borderRadius: "14px",
        padding: "1.25rem",
        marginBottom: "1.5rem",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem"
      }}>
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 280px" }}>
          <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Tìm theo tên khách, SĐT, khóa học, ghi chú..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              padding: "0.6rem 0.85rem 0.6rem 2.25rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              outline: "none"
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "2px"
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Course Filter */}
        {uniqueCourses.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>Khóa học:</span>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              style={{
                padding: "0.6rem 0.85rem",
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                outline: "none",
                backgroundColor: "#f8fafc"
              }}
            >
              <option value="all">Tất cả khóa học ({consultations.length})</option>
              {uniqueCourses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        )}

        {/* Status Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "0.82rem", color: "#64748b", fontWeight: 600 }}>Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: "0.6rem 0.85rem",
              borderRadius: "10px",
              border: "1px solid #cbd5e1",
              fontSize: "0.85rem",
              outline: "none",
              backgroundColor: "#f8fafc"
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Mới">Chờ liên hệ (Mới)</option>
            <option value="Đang tư vấn">Đang tư vấn</option>
            <option value="Đã chốt">Đã chốt</option>
            <option value="Đang học">Đang học</option>
            <option value="Không nghe máy">Không nghe máy</option>
          </select>
        </div>
      </div>

      {/* Consultations List */}
      {loading ? (
        <div style={{
          background: "white",
          borderRadius: "14px",
          padding: "4rem 2rem",
          textAlign: "center",
          border: "1px solid #e2e8f0"
        }}>
          <Loader2 size={36} className="animate-spin" color="#4f46e5" style={{ margin: "0 auto 1rem" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>Đang tải danh sách khách tư vấn...</h3>
          <p style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "0.5rem" }}>Đang đồng bộ dữ liệu từ CRM và LMS...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div style={{
          background: "white",
          borderRadius: "14px",
          padding: "4rem 2rem",
          textAlign: "center",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "#f1f5f9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.25rem",
            color: "#64748b"
          }}>
            <MessageSquare size={30} />
          </div>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e293b", margin: "0 0 0.5rem" }}>
            {searchTerm || filterStatus !== "all" || filterCourse !== "all" 
              ? "Không tìm thấy khách hàng phù hợp với bộ lọc" 
              : "Hiện tại chưa có khách hàng nào đăng ký tư vấn bộ môn"}
          </h3>
          <p style={{ color: "#64748b", fontSize: "0.88rem", maxWidth: "480px", margin: "0 auto 1.5rem" }}>
            Khi có phụ huynh hoặc học viên bấm nút "Nhờ tư vấn" trên trang giới thiệu khóa học, thông tin sẽ tự động xuất hiện tại đây ngay lập tức.
          </p>
          {(searchTerm || filterStatus !== "all" || filterCourse !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterStatus("all");
                setFilterCourse("all");
              }}
              style={{
                backgroundColor: "#4f46e5",
                color: "white",
                border: "none",
                padding: "0.6rem 1.2rem",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer"
              }}
            >
              Xóa bộ lọc tìm kiếm
            </button>
          )}
        </div>
      ) : (
        <div style={{
          background: "white",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
          border: "1px solid #e2e8f0"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569" }}>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, width: "50px" }}>STT</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700 }}>Khách hàng & SĐT</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700 }}>Khóa học / Bộ môn</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700 }}>Đối tượng & Ghi chú</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700 }}>Thời gian</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700 }}>Trạng thái</th>
                  <th style={{ padding: "0.9rem 1rem", fontWeight: 700, textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((item, idx) => {
                  const badge = getStatusBadge(item.status);
                  const cleanPhone = item.phone.replace(/\D/g, "");
                  const isCopied = copiedPhone === cleanPhone;

                  return (
                    <tr 
                      key={item.id} 
                      style={{ 
                        borderBottom: "1px solid #f1f5f9",
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                    >
                      {/* STT */}
                      <td style={{ padding: "1rem", color: "#94a3b8", fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Khách hàng & SĐT */}
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: 700, color: "#1e293b", fontSize: "0.92rem", marginBottom: "4px" }}>
                          {item.fullName}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ color: "#4f46e5", fontWeight: 600, fontFamily: "monospace", fontSize: "0.88rem" }}>
                            {item.phone}
                          </span>
                          <button
                            onClick={() => handleCopyPhone(item.phone)}
                            title="Sao chép số điện thoại"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "2px",
                              color: isCopied ? "#10b981" : "#94a3b8",
                              display: "inline-flex",
                              alignItems: "center"
                            }}
                          >
                            {isCopied ? <Check size={13} /> : <Copy size={13} />}
                          </button>
                        </div>
                      </td>

                      {/* Khóa học */}
                      <td style={{ padding: "1rem" }}>
                        <div style={{ fontWeight: 600, color: "#334155" }}>
                          {item.courseTitle}
                        </div>
                        {item.courseId && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
                            Mã: <code style={{ fontSize: "0.72rem" }}>{item.courseId.slice(0, 8)}...</code>
                          </div>
                        )}
                      </td>

                      {/* Đối tượng & Ghi chú */}
                      <td style={{ padding: "1rem", maxWidth: "300px" }}>
                        <div style={{ display: "inline-block", background: "#f1f5f9", padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                          Học cho: {item.targetStudent}
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#1e293b", fontStyle: item.notes === "Không" ? "italic" : "normal" }}>
                          "{item.notes}"
                        </div>
                        {item.leadNotes && (
                          <div style={{ fontSize: "0.78rem", color: "#4f46e5", marginTop: "4px", background: "#eef2ff", padding: "2px 6px", borderRadius: "4px" }}>
                            <strong>Ghi chú tư vấn:</strong> {item.leadNotes}
                          </div>
                        )}
                      </td>

                      {/* Thời gian */}
                      <td style={{ padding: "1rem", whiteSpace: "nowrap", color: "#64748b", fontSize: "0.82rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={13} />
                          <span>{item.createdAt}</span>
                        </div>
                      </td>

                      {/* Trạng thái */}
                      <td style={{ padding: "1rem", whiteSpace: "nowrap" }}>
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          backgroundColor: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`
                        }}>
                          <badge.icon size={13} />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: "1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          {/* Gọi điện */}
                          <a
                            href={`tel:${cleanPhone}`}
                            title="Gọi điện trực tiếp"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              backgroundColor: "#ecfdf5",
                              color: "#059669",
                              border: "1px solid #a7f3d0",
                              textDecoration: "none"
                            }}
                          >
                            <Phone size={14} />
                          </a>

                          {/* Nhắn Zalo */}
                          <a
                            href={`https://zalo.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Nhắn tin qua Zalo"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              backgroundColor: "#eff6ff",
                              color: "#2563eb",
                              border: "1px solid #bfdbfe",
                              textDecoration: "none",
                              fontWeight: 700,
                              fontSize: "0.72rem"
                            }}
                          >
                            Zalo
                          </a>

                          {/* Cập nhật ghi chú / trạng thái */}
                          <button
                            onClick={() => openStatusModal(item)}
                            title="Cập nhật trạng thái / Ghi chú tư vấn"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              backgroundColor: "#f8fafc",
                              color: "#475569",
                              border: "1px solid #cbd5e1",
                              cursor: "pointer"
                            }}
                          >
                            <Edit3 size={14} />
                          </button>

                          {/* Ghi danh khóa học hoặc Trạng thái đã vào lớp */}
                          {item.isEnrolled || item.status === "Đang học" ? (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                height: "32px",
                                padding: "0 10px",
                                borderRadius: "8px",
                                backgroundColor: "#ecfdf5",
                                color: "#059669",
                                border: "1px solid #a7f3d0",
                                fontSize: "0.78rem",
                                fontWeight: 700
                              }}
                            >
                              <Check size={14} />
                              <span>Đã vào lớp</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => openEnrollModal(item)}
                              title="Cấp quyền vào khóa học ngay"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                                height: "32px",
                                padding: "0 10px",
                                borderRadius: "8px",
                                backgroundColor: "#4f46e5",
                                color: "white",
                                border: "none",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                cursor: "pointer"
                              }}
                            >
                              <GraduationCap size={14} />
                              <span>Ghi danh</span>
                            </button>
                          )}

                          {/* Nút Xóa bản ghi tư vấn */}
                          <button
                            onClick={() => openDeleteModal(item)}
                            title="Xóa lượt đăng ký này"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "32px",
                              height: "32px",
                              borderRadius: "8px",
                              backgroundColor: "#fff1f2",
                              color: "#e11d48",
                              border: "1px solid #fecdd3",
                              cursor: "pointer"
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: CẬP NHẬT TRẠNG THÁI & GHI CHÚ */}
      {selectedConsultation && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "480px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                Cập nhật Tư vấn Khách hàng
              </h3>
              <button
                onClick={() => setSelectedConsultation(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} style={{ padding: "1.5rem" }}>
              <div style={{ marginBottom: "1rem", background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, color: "#1e293b" }}>{selectedConsultation.fullName}</div>
                <div style={{ fontSize: "0.85rem", color: "#4f46e5", fontWeight: 600 }}>{selectedConsultation.phone}</div>
                <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "4px" }}>
                  Khóa học: <strong>{selectedConsultation.courseTitle}</strong>
                </div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Trạng thái liên hệ:
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                >
                  <option value="Mới">Chờ liên hệ (Mới)</option>
                  <option value="Đang tư vấn">Đang tư vấn / Chăm sóc</option>
                  <option value="Đã chốt">Đã chốt (Sẵn sàng học)</option>
                  <option value="Không nghe máy">Không nghe máy / Gọi lại sau</option>
                  <option value="Không có nhu cầu">Không có nhu cầu</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Ghi chú kết quả trao đổi:
                </label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Ví dụ: Phụ huynh hẹn tối gọi lại, hoặc học viên xin tài liệu thử..."
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    outline: "none",
                    resize: "vertical"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setSelectedConsultation(null)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSavingStatus}
                  style={{
                    padding: "0.65rem 1.5rem",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: isSavingStatus ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isSavingStatus ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  <span>{isSavingStatus ? "Đang lưu..." : "Lưu thay đổi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: GHI DANH NHANH HỌC VIÊN */}
      {enrollTarget && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            background: "white",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "500px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <GraduationCap size={20} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#1e293b" }}>
                  Cấp Quyền Học Viên Nhanh
                </h3>
              </div>
              <button
                onClick={() => setEnrollTarget(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFastEnroll} style={{ padding: "1.5rem" }}>
              <p style={{ margin: "0 0 1.25rem", fontSize: "0.86rem", color: "#64748b", lineHeight: 1.5 }}>
                Hệ thống sẽ tự động kích hoạt tài khoản học viên và mở khóa bài học trực tuyến cho phụ huynh/học viên này.
              </p>

              <div style={{ marginBottom: "1rem", background: "#f8fafc", padding: "0.75rem 1rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 700, color: "#1e293b" }}>Học viên: {enrollTarget.fullName}</div>
                <div style={{ fontSize: "0.85rem", color: "#4f46e5", fontWeight: 600 }}>SĐT: {enrollTarget.phone}</div>
              </div>

              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Chọn khóa học gán quyền:
                </label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.65rem 0.85rem",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    outline: "none"
                  }}
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "10px", padding: "10px", background: "#fffbeb", borderRadius: "10px", border: "1px solid #fde68a" }}>
                <input
                  type="checkbox"
                  id="enrollVipCheckbox"
                  checked={enrollVip}
                  onChange={(e) => setEnrollVip(e.target.checked)}
                  style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "#f59e0b" }}
                />
                <label htmlFor="enrollVipCheckbox" style={{ fontSize: "0.85rem", color: "#92400e", fontWeight: 600, cursor: "pointer" }}>
                  Gán đặc quyền Học viên VIP (được nộp video thực hành và nhận xét 1-1)
                </label>
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setEnrollTarget(null)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isEnrolling}
                  style={{
                    padding: "0.65rem 1.5rem",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: isEnrolling ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isEnrolling ? <Loader2 size={16} className="animate-spin" /> : <GraduationCap size={16} />}
                  <span>{isEnrolling ? "Đang cấp quyền..." : "Cấp quyền học ngay"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: XÁC NHẬN XÓA LƯỢT TƯ VẤN */}
      {deleteTarget && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "20px",
            maxWidth: "460px",
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #fee2e2",
              backgroundColor: "#fff1f2",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#fee2e2",
                  color: "#e11d48",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#9f1239" }}>
                    Xóa lượt đăng ký tư vấn
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#e11d48" }}>
                    Dọn dẹp lượt đăng ký thử nghiệm hoặc dữ liệu rác
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#9f1239",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: "1.5rem" }}>
              <p style={{ fontSize: "0.92rem", color: "#334155", margin: "0 0 1rem", lineHeight: 1.6 }}>
                Bạn có chắc chắn muốn xóa lượt đăng ký của khách hàng <strong>{deleteTarget.fullName}</strong> (SĐT: <code>{deleteTarget.phone}</code>) cho khóa học <em>"{deleteTarget.courseTitle}"</em>?
              </p>
              <div style={{ backgroundColor: "#f8fafc", padding: "0.85rem", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#64748b", marginBottom: "1.5rem" }}>
                💡 <strong>Lưu ý:</strong> Thao tác này chỉ xóa bản ghi tư vấn khỏi danh sách quản lý. Hồ sơ học sinh, phụ huynh và tiến trình học trong hệ thống vẫn được bảo toàn nguyên vẹn.
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(null)}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConsultation}
                  disabled={isDeleting}
                  style={{
                    padding: "0.65rem 1.5rem",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "#e11d48",
                    color: "white",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  <span>{isDeleting ? "Đang xóa..." : "Xác nhận xóa"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

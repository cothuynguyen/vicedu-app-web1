"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getPartnerPracticeSubmissions, submitPracticeFeedback } from "@/app/actions/partner";
import { 
  Video, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  Send, 
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Star,
  RefreshCw,
  Sparkles,
  Copy,
  AlertCircle,
  Loader2,
  Search,
  ChevronLeft,
  LayoutList,
  LayoutGrid,
  X,
  Filter
} from "lucide-react";

interface Submission {
  id: string;
  studentName: string;
  studentPhone: string;
  age?: number;
  courseTitle?: string;
  lessonTitle: string;
  submittedAt: string;
  videoUrl: string;
  status: "pending" | "reviewed";
  teacherFeedback?: string;
  studentNotes?: string;
  score?: number;
}


export function parseSubmissionMedia(rawUrl?: string) {
  if (!rawUrl || typeof rawUrl !== "string") {
    return { hasLink: false, url: "", type: "none" as const, label: "Hỏi đáp trao đổi 1-1" };
  }

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed === "Câu hỏi trao đổi trực tiếp") {
    return { hasLink: false, url: "", type: "none" as const, label: "Hỏi đáp trao đổi 1-1" };
  }

  // 1. Trích xuất link http/https nếu nằm trong chuỗi text (VD: "Xem trên Padlet: https://padlet.com/...")
  const httpMatch = trimmed.match(/(https?:\/\/[^\s]+)/i);
  let cleanUrl = httpMatch ? httpMatch[1] : "";

  // 2. Nếu thiếu https://, tự động bổ sung cho các domain phổ biến
  if (!cleanUrl) {
    const domainMatch = trimmed.match(/((?:[a-zA-Z0-9-]+\.)+(?:com|edu|vn|org|net|me|be|app|tv|io)[^\s]*)/i);
    if (domainMatch) {
      cleanUrl = `https://${domainMatch[1]}`;
    }
  }

  if (!cleanUrl) {
    return { hasLink: false, url: "", type: "none" as const, label: trimmed };
  }

  const isPadlet = cleanUrl.toLowerCase().includes("padlet.com");
  return {
    hasLink: true,
    url: cleanUrl,
    type: isPadlet ? ("padlet" as const) : ("video" as const),
    label: isPadlet ? "Mở Padlet học viên" : "Xem video thực hành"
  };
}

export default function PartnerSubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");
  
  // Modal state
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [scoreInput, setScoreInput] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [copyZaloSuccess, setCopyZaloSuccess] = useState(false);

  const fetchSubmissions = async () => {
    if (!user?.email) return;
    setLoading(true);
    try {
      const res = await getPartnerPracticeSubmissions(user.email, user.department || user.position);
      if (res.success && res.data) {
        setSubmissions(res.data);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.error("Lỗi tải submissions:", err);
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user?.email, user?.department, user?.position]);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const reviewedCount = submissions.filter(s => s.status === "reviewed").length;
  const totalSubmissionsCount = submissions.length;

  // Lấy danh sách khóa học duy nhất để tạo dropdown lọc
  const uniqueCourses = Array.from(new Set(submissions.map(s => s.courseTitle).filter(Boolean))) as string[];

  // Lọc kết hợp: Tab (Chờ/Đã nhận xét) + Khóa học + Từ khóa tìm kiếm đa năng
  const filteredSubmissions = submissions.filter(s => {
    if (filter === "pending" && s.status !== "pending") return false;
    if (filter === "reviewed" && s.status !== "reviewed") return false;

    if (filterCourse !== "all" && s.courseTitle !== filterCourse) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const cleanPhoneQuery = q.replace(/\D/g, "");
      const cleanStudentPhone = (s.studentPhone || "").replace(/\D/g, "");

      const nameMatch = s.studentName.toLowerCase().includes(q);
      const phoneMatch = cleanPhoneQuery.length >= 3 && cleanStudentPhone.includes(cleanPhoneQuery);
      const lessonMatch = s.lessonTitle.toLowerCase().includes(q);
      const courseMatch = (s.courseTitle || "").toLowerCase().includes(q);
      const noteMatch = (s.studentNotes || "").toLowerCase().includes(q);
      const feedbackMatch = (s.teacherFeedback || "").toLowerCase().includes(q);

      if (!nameMatch && !phoneMatch && !lessonMatch && !courseMatch && !noteMatch && !feedbackMatch) {
        return false;
      }
    }

    return true;
  });

  // Tự động nhảy về trang 1 khi thay đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filter, filterCourse, pageSize]);

  // Tính toán phân trang
  const totalItems = filteredSubmissions.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const paginatedSubmissions = filteredSubmissions.slice((validPage - 1) * pageSize, validPage * pageSize);

  const handleOpenReview = (sub: Submission) => {
    setSelectedSub(sub);
    setFeedbackInput(sub.teacherFeedback || "");
    setScoreInput(sub.score || 5);
    setCopyZaloSuccess(false);
  };

  const handleSaveFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setIsSaving(true);
    try {
      const res = await submitPracticeFeedback(selectedSub.id, feedbackInput, scoreInput, user?.email);
      if (!res.success) {
        alert("Có lỗi xảy ra: " + (res.error || "Không thể lưu nhận xét"));
        setIsSaving(false);
        return;
      }

      setSubmissions(prev => prev.map(s => {
        if (s.id === selectedSub.id) {
          return {
            ...s,
            status: "reviewed",
            teacherFeedback: feedbackInput,
            score: scoreInput
          };
        }
        return s;
      }));

      setSelectedSub(null);
    } catch (err: any) {
      alert("Lỗi khi lưu nhận xét: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleZaloChatWithStudent = (studentName: string, phone: string, lessonTitle: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) return;

    const message = `Thầy chào ${studentName}! Thầy đã xem video thực hành bài "${lessonTitle}" của bạn và vừa gửi nhận xét góp ý. Bạn hãy vào website xem chi tiết để cùng luyện tập nhé!`;
    navigator.clipboard.writeText(message);
    setCopyZaloSuccess(true);
    setTimeout(() => setCopyZaloSuccess(false), 4000);

    window.open(`https://zalo.me/${cleanPhone}`, "_blank");
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.25rem" }}>
          <Link href="/partner" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>Đối tác</Link>
          <ChevronRight size={14} color="#94a3b8" />
          <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.85rem" }}>Chấm bài & Nhận xét 1-1</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
              <span>Nhận xét Video Thực hành của Học viên</span>
              <span style={{ fontSize: "1rem", backgroundColor: "#e0e7ff", color: "#4338ca", padding: "2px 10px", borderRadius: "999px", fontWeight: 700 }}>
                {submissions.length}
              </span>
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
              Nơi Thầy xem video học viên quay, chấm sao và gửi nhận xét chỉnh dáng 1-1 qua Zalo hoặc trực tiếp trên hệ thống.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={fetchSubmissions}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0.5rem 0.9rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "white",
                color: "#475569",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer"
              }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>{loading ? "Đang tải..." : "Làm mới"}</span>
            </button>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: pendingCount > 0 ? "#fef3c7" : "#ecfdf5",
              color: pendingCount > 0 ? "#b45309" : "#166534",
              padding: "0.5rem 1rem",
              borderRadius: "999px",
              fontSize: "0.85rem",
              fontWeight: 700
            }}>
              <Clock size={16} />
              <span>{pendingCount} bài chờ Thầy nhận xét</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1rem",
        marginBottom: "1.25rem"
      }}>
        <div style={{
          backgroundColor: "white",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>TỔNG SỐ BÀI NỘP</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{totalSubmissionsCount}</div>
          </div>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
            <MessageSquare size={20} />
          </div>
        </div>

        <div style={{
          backgroundColor: pendingCount > 0 ? "#fffbeb" : "white",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          border: pendingCount > 0 ? "1.5px solid #fde68a" : "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: pendingCount > 0 ? "#b45309" : "#64748b", fontWeight: 600 }}>CHỜ THẦY NHẬN XÉT</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: pendingCount > 0 ? "#b45309" : "#0f172a", marginTop: "2px" }}>{pendingCount}</div>
          </div>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: pendingCount > 0 ? "#fef3c7" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", color: pendingCount > 0 ? "#d97706" : "#64748b" }}>
            <Clock size={20} />
          </div>
        </div>

        <div style={{
          backgroundColor: "white",
          padding: "1rem 1.25rem",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#166534", fontWeight: 600 }}>ĐÃ CHẤM & HOÀN TẤT</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a", marginTop: "2px" }}>{reviewedCount}</div>
          </div>
          <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: "#ecfdf5", display: "flex", alignItems: "center", justifyContent: "center", color: "#16a34a" }}>
            <CheckCircle size={20} />
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        padding: "1rem",
        marginBottom: "1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
      }}>
        {/* Search & Course Row */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Bar */}
          <div style={{
            position: "relative",
            flex: "1 1 280px",
            display: "flex",
            alignItems: "center"
          }}>
            <Search size={18} color="#94a3b8" style={{ position: "absolute", left: "12px", pointerEvents: "none" }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên học viên, SĐT, bài học, câu hỏi, lời nhận xét..."
              style={{
                width: "100%",
                padding: "0.55rem 2.2rem 0.55rem 2.3rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.88rem",
                outline: "none",
                backgroundColor: "#f8fafc",
                color: "#0f172a"
              }}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "#94a3b8",
                  padding: "2px",
                  display: "flex",
                  alignItems: "center"
                }}
                title="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Course Filter Dropdown if courses exist */}
          {uniqueCourses.length > 0 && (
            <div style={{ minWidth: "200px", flex: "0 1 auto" }}>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.8rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  backgroundColor: "#f8fafc",
                  color: "#334155",
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">📚 Tất cả khóa học ({uniqueCourses.length})</option>
                {uniqueCourses.map((cName) => (
                  <option key={cName} value={cName}>
                    {cName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Filter Tabs & View Switcher Row */}
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px",
          paddingTop: "0.5rem",
          borderTop: "1px solid #f1f5f9"
        }}>
          {/* Filter Status Buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              onClick={() => setFilter("all")}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: filter === "all" ? "#0f172a" : "#f1f5f9",
                color: filter === "all" ? "white" : "#475569",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Tất cả ({submissions.length})
            </button>
            <button
              onClick={() => setFilter("pending")}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: filter === "pending" ? "#d97706" : "#fef3c7",
                color: filter === "pending" ? "white" : "#b45309",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Chờ nhận xét ({pendingCount})
            </button>
            <button
              onClick={() => setFilter("reviewed")}
              style={{
                padding: "0.4rem 0.85rem",
                borderRadius: "6px",
                border: "none",
                backgroundColor: filter === "reviewed" ? "#16a34a" : "#ecfdf5",
                color: filter === "reviewed" ? "white" : "#166534",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Đã nhận xét ({reviewedCount})
            </button>
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
              Hiển thị <strong>{filteredSubmissions.length}</strong> bài nộp
            </span>
            <div style={{
              display: "inline-flex",
              backgroundColor: "#f1f5f9",
              padding: "3px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0"
            }}>
              <button
                onClick={() => setViewMode("table")}
                title="Chế độ bảng gọn gàng, không bị kéo dài trang"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: viewMode === "table" ? "white" : "transparent",
                  color: viewMode === "table" ? "#0f172a" : "#64748b",
                  fontWeight: viewMode === "table" ? 700 : 500,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: viewMode === "table" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                }}
              >
                <LayoutList size={14} />
                <span>Bảng gọn</span>
              </button>
              <button
                onClick={() => setViewMode("cards")}
                title="Chế độ thẻ chi tiết"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: viewMode === "cards" ? "white" : "transparent",
                  color: viewMode === "cards" ? "#0f172a" : "#64748b",
                  fontWeight: viewMode === "cards" ? 700 : 500,
                  fontSize: "0.78rem",
                  cursor: "pointer",
                  boxShadow: viewMode === "cards" ? "0 1px 2px rgba(0,0,0,0.05)" : "none"
                }}
              >
                <LayoutGrid size={14} />
                <span>Dạng thẻ</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ padding: "3.5rem 2rem", textAlign: "center", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <Loader2 size={36} className="animate-spin" style={{ margin: "0 auto 1rem", color: "#4f46e5" }} />
          <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "#1e293b" }}>Đang đồng bộ danh sách bài nộp từ học viên...</div>
          <div style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "4px" }}>Hệ thống đang tải các yêu cầu nhận xét bài mới nhất.</div>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
          <CheckCircle size={40} color={submissions.length > 0 ? "#64748b" : "#16a34a"} style={{ margin: "0 auto 0.75rem" }} />
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>
            {submissions.length === 0 ? "Hiện không có bài tập nào cần xử lý" : "Không tìm thấy bài nộp phù hợp"}
          </div>
          <div style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "4px" }}>
            {submissions.length === 0
              ? "Khi học viên gửi câu hỏi hoặc nộp video thực hành, bài sẽ hiển thị ngay tại đây."
              : "Hãy thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc khác."}
          </div>
          {(searchTerm || filterCourse !== "all" || filter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterCourse("all");
                setFilter("all");
              }}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                backgroundColor: "#f1f5f9",
                border: "1px solid #cbd5e1",
                color: "#334155",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              Đặt lại tất cả bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* ================= COMPACT TABLE VIEW ================= */
        <div style={{
          backgroundColor: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
              <thead>
                <tr style={{
                  backgroundColor: "#f8fafc",
                  borderBottom: "1px solid #e2e8f0",
                  color: "#475569",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  fontSize: "0.75rem",
                  letterSpacing: "0.03em"
                }}>
                  <th style={{ padding: "0.75rem 1rem" }}>Học viên</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Bài thực hành</th>
                  <th style={{ padding: "0.75rem 1rem", minWidth: "220px", maxWidth: "280px" }}>Câu hỏi / Ghi chú</th>
                  <th style={{ padding: "0.75rem 1rem" }}>Tư liệu nộp</th>
                  <th style={{ padding: "0.75rem 1rem", minWidth: "200px" }}>Trạng thái & Lời Thầy</th>
                  <th style={{ padding: "0.75rem 1rem", textAlign: "right" }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSubmissions.map((sub, index) => {
                  const isPending = sub.status === "pending";
                  const cleanPhone = (sub.studentPhone || "").replace(/\D/g, "");
                  const media = parseSubmissionMedia(sub.videoUrl);

                  return (
                    <tr
                      key={sub.id}
                      style={{
                        borderBottom: index === paginatedSubmissions.length - 1 ? "none" : "1px solid #f1f5f9",
                        backgroundColor: isPending ? "#fffdf5" : "transparent"
                      }}
                    >
                      {/* Học viên */}
                      <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: isPending ? "#fef3c7" : "#e0e7ff",
                            color: isPending ? "#b45309" : "#4f46e5",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: "0.85rem",
                            flexShrink: 0
                          }}>
                            {sub.studentName.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "#0f172a" }}>{sub.studentName}</div>
                            <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                              {sub.studentPhone || "Chưa có SĐT"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Bài thực hành */}
                      <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a", lineHeight: 1.3 }}>{sub.lessonTitle}</div>
                        {sub.courseTitle && (
                          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>{sub.courseTitle}</div>
                        )}
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "3px" }}>
                          {sub.submittedAt || "Gần đây"}
                        </div>
                      </td>

                      {/* Câu hỏi / Ghi chú */}
                      <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                        {sub.studentNotes ? (
                          <div
                            style={{
                              color: "#334155",
                              fontStyle: "italic",
                              overflow: "hidden",
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical",
                              lineHeight: 1.4
                            }}
                            title={sub.studentNotes}
                          >
                            "{sub.studentNotes}"
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.78rem", fontStyle: "italic" }}>
                            (Không có câu hỏi ghi chú)
                          </span>
                        )}
                      </td>

                      {/* Tư liệu nộp */}
                      <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                        {media.hasLink ? (
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              color: media.type === "padlet" ? "#7c3aed" : "#2563eb",
                              fontWeight: 600,
                              fontSize: "0.78rem",
                              textDecoration: "none",
                              backgroundColor: media.type === "padlet" ? "#f5f3ff" : "#eff6ff",
                              border: `1px solid ${media.type === "padlet" ? "#ddd6fe" : "#bfdbfe"}`,
                              padding: "3px 8px",
                              borderRadius: "6px",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {media.type === "padlet" ? "📋" : <Video size={12} />}
                            <span>{media.label}</span>
                            <ExternalLink size={11} />
                          </a>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#64748b", backgroundColor: "#f1f5f9", padding: "2px 6px", borderRadius: "4px", whiteSpace: "nowrap" }}>
                            💬 Hỏi đáp 1-1
                          </span>
                        )}
                      </td>

                      {/* Trạng thái & Lời Thầy */}
                      <td style={{ padding: "0.85rem 1rem", verticalAlign: "top" }}>
                        {isPending ? (
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "999px",
                            backgroundColor: "#fef3c7",
                            color: "#b45309"
                          }}>
                            ⏳ Chờ Thầy nhận xét
                          </span>
                        ) : (
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                              <span style={{
                                fontSize: "0.72rem",
                                fontWeight: 700,
                                padding: "1px 6px",
                                borderRadius: "999px",
                                backgroundColor: "#ecfdf5",
                                color: "#166534"
                              }}>
                                ✅ Đã nhận xét
                              </span>
                              <div style={{ display: "flex", gap: "1px" }}>
                                {[1, 2, 3, 4, 5].map(st => (
                                  <Star
                                    key={st}
                                    size={11}
                                    fill={st <= (sub.score || 5) ? "#eab308" : "none"}
                                    color={st <= (sub.score || 5) ? "#eab308" : "#cbd5e1"}
                                  />
                                ))}
                              </div>
                            </div>
                            {sub.teacherFeedback && (
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  color: "#166534",
                                  overflow: "hidden",
                                  display: "-webkit-box",
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: "vertical",
                                  lineHeight: 1.3
                                }}
                                title={sub.teacherFeedback}
                              >
                                {sub.teacherFeedback}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td style={{ padding: "0.85rem 1rem", verticalAlign: "top", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                          {cleanPhone && (
                            <button
                              onClick={() => handleZaloChatWithStudent(sub.studentName, sub.studentPhone, sub.lessonTitle)}
                              title="Mở Zalo và copy tin nhắn gửi học viên"
                              style={{
                                padding: "4px 8px",
                                borderRadius: "6px",
                                backgroundColor: "#0068ff",
                                color: "white",
                                border: "none",
                                fontSize: "0.75rem",
                                fontWeight: 600,
                                cursor: "pointer",
                                whiteSpace: "nowrap"
                              }}
                            >
                              💬 Zalo
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenReview(sub)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: isPending ? "#4f46e5" : "#f1f5f9",
                              color: isPending ? "white" : "#334155",
                              border: "none",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {isPending ? "Chấm bài" : "Sửa"}
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
      ) : (
        /* ================= CARDS VIEW ================= */
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {paginatedSubmissions.map((sub) => {
            const isPending = sub.status === "pending";
            const cleanPhone = (sub.studentPhone || "").replace(/\D/g, "");

            return (
              <div key={sub.id} style={{
                backgroundColor: "white",
                borderRadius: "16px",
                border: isPending ? "1.5px solid #fde68a" : "1px solid #e2e8f0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                padding: "1.25rem 1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "44px",
                      height: "44px",
                      borderRadius: "50%",
                      backgroundColor: isPending ? "#fef3c7" : "#e0e7ff",
                      color: isPending ? "#b45309" : "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "1.1rem"
                    }}>
                      {sub.studentName.charAt(0)}
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a" }}>{sub.studentName}</span>
                        {sub.age && (
                          <span style={{ fontSize: "0.75rem", backgroundColor: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", color: "#475569" }}>
                            {sub.age} tuổi
                          </span>
                        )}
                        <span style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "999px",
                          backgroundColor: isPending ? "#fef3c7" : "#ecfdf5",
                          color: isPending ? "#b45309" : "#166534"
                        }}>
                          {isPending ? "⏳ Chờ nhận xét" : "✅ Đã nhận xét"}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "3px" }}>
                        SĐT: <strong style={{ color: "#334155" }}>{sub.studentPhone || "Chưa cập nhật"}</strong> • Nộp lúc: {sub.submittedAt || "Gần đây"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    {cleanPhone && (
                      <button
                        onClick={() => handleZaloChatWithStudent(sub.studentName, sub.studentPhone, sub.lessonTitle)}
                        title="Bấm để mở Zalo và tự động copy tin nhắn gửi học viên"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "0.45rem 0.85rem",
                          borderRadius: "8px",
                          backgroundColor: "#0068ff",
                          color: "white",
                          border: "none",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        <span>💬 Nhắn Zalo</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenReview(sub)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "0.45rem 1rem",
                        borderRadius: "8px",
                        backgroundColor: isPending ? "#4f46e5" : "#f1f5f9",
                        color: isPending ? "white" : "#334155",
                        border: "none",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>{isPending ? "Nhận xét ngay" : "Xem / Sửa nhận xét"}</span>
                    </button>
                  </div>
                </div>

                {/* Lesson & Video Url */}
                <div style={{
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  padding: "0.85rem 1.1rem",
                  fontSize: "0.88rem",
                  color: "#334155",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ fontWeight: 700, color: "#0f172a" }}>
                      🎬 {sub.lessonTitle}
                      {sub.courseTitle && <span style={{ fontWeight: 400, color: "#64748b", marginLeft: "6px" }}>({sub.courseTitle})</span>}
                    </div>

                    {(() => {
                      const media = parseSubmissionMedia(sub.videoUrl);
                      if (media.hasLink) {
                        return (
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              color: media.type === "padlet" ? "#7c3aed" : "#2563eb",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              textDecoration: "none",
                              backgroundColor: media.type === "padlet" ? "#f5f3ff" : "#eff6ff",
                              border: `1px solid ${media.type === "padlet" ? "#ddd6fe" : "#bfdbfe"}`,
                              padding: "4px 10px",
                              borderRadius: "6px",
                              boxShadow: "0 1px 2px rgba(0,0,0,0.03)"
                            }}
                          >
                            {media.type === "padlet" ? <span style={{ fontSize: "0.85rem" }}>📋</span> : <Video size={13} />}
                            <span>{media.label}</span>
                            <ExternalLink size={12} />
                          </a>
                        );
                      }
                      return (
                        <span style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.78rem",
                          color: "#64748b",
                          backgroundColor: "#f1f5f9",
                          border: "1px solid #e2e8f0",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          fontWeight: 600
                        }}>
                          💬 Hỏi đáp trao đổi 1-1
                        </span>
                      );
                    })()}
                  </div>

                  {sub.studentNotes && (
                    <div style={{ color: "#475569", fontStyle: "italic", marginTop: "2px" }}>
                      "{sub.studentNotes}"
                    </div>
                  )}
                </div>

                {/* Teacher Feedback if already reviewed */}
                {sub.teacherFeedback && (
                  <div style={{
                    backgroundColor: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: "10px",
                    padding: "0.85rem 1rem",
                    fontSize: "0.88rem",
                    color: "#166534"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                      <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Sparkles size={14} color="#16a34a" />
                        <span>Nhận xét của Giảng viên:</span>
                      </strong>
                      <div style={{ display: "flex", gap: "2px" }}>
                        {[1, 2, 3, 4, 5].map(st => (
                          <Star 
                            key={st} 
                            size={14} 
                            fill={st <= (sub.score || 5) ? "#eab308" : "none"} 
                            color={st <= (sub.score || 5) ? "#eab308" : "#cbd5e1"} 
                          />
                        ))}
                      </div>
                    </div>
                    <div>{sub.teacherFeedback}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {filteredSubmissions.length > 0 && (
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "0.85rem 1.25rem",
          backgroundColor: "white",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          marginTop: "1.25rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          {/* Page size selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.82rem", color: "#64748b" }}>
            <span>Số bài mỗi trang:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              style={{
                padding: "4px 8px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#f8fafc",
                fontSize: "0.82rem",
                color: "#334155",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value={10}>10 bài</option>
              <option value={20}>20 bài</option>
              <option value={50}>50 bài</option>
            </select>
          </div>

          {/* Current page info */}
          <div style={{ fontSize: "0.82rem", color: "#475569", fontWeight: 500 }}>
            Trang <strong>{validPage}</strong> / <strong>{totalPages}</strong> (Tổng <strong>{filteredSubmissions.length}</strong> bài nộp)
          </div>

          {/* Prev / Next buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={validPage <= 1}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: validPage <= 1 ? "#f8fafc" : "white",
                color: validPage <= 1 ? "#94a3b8" : "#334155",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: validPage <= 1 ? "not-allowed" : "pointer"
              }}
            >
              <ChevronLeft size={14} />
              <span>Trước</span>
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={validPage >= totalPages}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: validPage >= totalPages ? "#f8fafc" : "white",
                color: validPage >= totalPages ? "#94a3b8" : "#334155",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: validPage >= totalPages ? "not-allowed" : "pointer"
              }}
            >
              <span>Sau</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedSub && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "16px",
            maxWidth: "600px",
            width: "100%",
            padding: "1.75rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            maxHeight: "90vh",
            overflowY: "auto"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.25rem 0", color: "#0f172a" }}>
              Gửi Nhận xét cho {selectedSub.studentName}
            </h2>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              {selectedSub.lessonTitle} • SĐT: {selectedSub.studentPhone || "Chưa cập nhật"}
            </p>

            {/* Media / Video / Padlet preview box */}
            {(() => {
              const media = parseSubmissionMedia(selectedSub.videoUrl);
              return (
                <div style={{
                  marginBottom: "1rem",
                  padding: "0.75rem 1rem",
                  backgroundColor: media.type === "padlet" ? "#f5f3ff" : "#f8fafc",
                  borderRadius: "8px",
                  border: `1px solid ${media.type === "padlet" ? "#ddd6fe" : "#e2e8f0"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "8px"
                }}>
                  <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                    <strong>{media.type === "padlet" ? "📋 Hồ sơ Padlet học viên:" : media.hasLink ? "🎬 Video nộp:" : "💬 Hình thức:"}</strong>{" "}
                    <span style={{ color: "#64748b" }}>
                      {media.hasLink ? (media.url.length > 45 ? `${media.url.slice(0, 45)}...` : media.url) : "Học viên gửi câu hỏi trao đổi trực tiếp"}
                    </span>
                  </div>
                  {media.hasLink && (
                    <a
                      href={media.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        color: media.type === "padlet" ? "#6d28d9" : "#1d4ed8",
                        backgroundColor: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: `1px solid ${media.type === "padlet" ? "#c4b5fd" : "#bfdbfe"}`,
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        textDecoration: "none",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
                      }}
                    >
                      <span>{media.type === "padlet" ? "Mở xem Padlet" : "Mở xem video"}</span>
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              );
            })()}

            <form onSubmit={handleSaveFeedback} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Star Rating Selection */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Đánh giá chất lượng thực hành:
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  {[1, 2, 3, 4, 5].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setScoreInput(st)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "2px"
                      }}
                    >
                      <Star
                        size={26}
                        fill={st <= scoreInput ? "#eab308" : "none"}
                        color={st <= scoreInput ? "#eab308" : "#cbd5e1"}
                      />
                    </button>
                  ))}
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#d97706", marginLeft: "6px" }}>
                    {scoreInput === 5 ? "Xuất sắc (5 sao)" : scoreInput === 4 ? "Rất tốt (4 sao)" : scoreInput === 3 ? "Đạt (3 sao)" : `${scoreInput} sao`}
                  </span>
                </div>
              </div>

              {/* Feedback Textarea */}
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
                  Lời nhận xét & Góp ý kỹ thuật của Thầy *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Nhập lời nhận xét, góp ý chuyên môn hoặc dặn dò học viên..."
                  value={feedbackInput}
                  onChange={(e) => setFeedbackInput(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              {/* Zalo Fast Action in Modal */}
              {selectedSub.studentPhone && (
                <div style={{
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: "8px",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px"
                }}>
                  <div style={{ fontSize: "0.8rem", color: "#1e40af" }}>
                    {copyZaloSuccess ? (
                      <span style={{ fontWeight: 700, color: "#16a34a" }}>
                        ✅ Đã sao chép lời nhắn! Đang mở Zalo chat...
                      </span>
                    ) : (
                      <span>Muốn hướng dẫn trực tiếp qua Zalo? Bấm để mở ngay:</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleZaloChatWithStudent(selectedSub.studentName, selectedSub.studentPhone, selectedSub.lessonTitle)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "0.4rem 0.8rem",
                      borderRadius: "6px",
                      backgroundColor: "#0068ff",
                      color: "white",
                      border: "none",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap"
                    }}
                  >
                    <span>Mở Zalo</span>
                    <ExternalLink size={12} />
                  </button>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
                  disabled={isSaving}
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "white",
                    color: "#475569",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0.65rem 1.25rem",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    fontWeight: 600,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  <Send size={15} />
                  <span>{isSaving ? "Đang lưu..." : "Lưu & Hoàn thành nhận xét"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


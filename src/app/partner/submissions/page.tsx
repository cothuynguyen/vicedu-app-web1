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
  AlertCircle
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
  isDemo?: boolean;
}

const DEMO_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    studentName: "Bác Trần Đình Trọng",
    studentPhone: "0983 765 432",
    age: 62,
    courseTitle: "Khóa Khiêu Vũ Căn Bản",
    lessonTitle: "Bài 3: Trọng tâm & Đổi hướng",
    submittedAt: "15/10/2026, 19:15",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "pending",
    studentNotes: "Thầy xem giúp tôi bước xoay bên trái đã đúng trọng tâm chưa ạ, tôi cảm thấy hơi bị chới với.",
    isDemo: true
  },
  {
    id: "sub-2",
    studentName: "Cô Nguyễn Thị Mai",
    studentPhone: "0912 345 678",
    age: 56,
    courseTitle: "Khóa Khiêu Vũ Căn Bản",
    lessonTitle: "Bài 4: Bước xoay Rumba căn bản",
    submittedAt: "15/10/2026, 08:30",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "pending",
    studentNotes: "Tôi đã tập theo gương lật của Thầy, quay lại video ngắn 1 phút nhờ Thầy chấm.",
    isDemo: true
  },
  {
    id: "sub-3",
    studentName: "Cô Đặng Bích Liên",
    studentPhone: "0962 444 111",
    age: 53,
    courseTitle: "Khóa Khiêu Vũ Căn Bản",
    lessonTitle: "Bài 4: Bước xoay Rumba căn bản",
    submittedAt: "14/10/2026, 21:00",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "reviewed",
    studentNotes: "Nhờ Thầy xem động tác tay khi xoay.",
    teacherFeedback: "Động tác tay của chị đã mềm hơn rất nhiều. Chú ý giữ mắt nhìn thẳng ngang tầm mắt khi xoay để không bị chóng mặt nhé!",
    score: 5,
    isDemo: true
  }
];

const PRESET_FEEDBACKS = [
  "💃 Động tác tay rất mềm và bắt đúng nhịp! Cố gắng giữ mắt nhìn thẳng ngang tầm mắt khi xoay nhé.",
  "👍 Trọng tâm cơ thể chuyển rất chuẩn! Chú ý hơi chùng đầu gối một chút ở phách 2 để chuyển bước mượt hơn.",
  "✨ Thần thái tuyệt vời! Bước chân dứt khoát, bạn hoàn toàn có thể tự tin chuyển sang bài tiếp theo.",
  "🎯 Lưu ý giữ lưng thẳng và mở vai ra phía sau một chút, động tác sẽ thanh thoát hơn rất nhiều."
];

export default function PartnerSubmissionsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>(DEMO_SUBMISSIONS);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed">("all");
  
  // Modal state
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");
  const [scoreInput, setScoreInput] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [copyZaloSuccess, setCopyZaloSuccess] = useState(false);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const res = await getPartnerPracticeSubmissions(user?.email);
      if (res.success && res.data && res.data.length > 0) {
        setSubmissions(res.data);
      } else {
        // Fallback demo data if DB has no practice submissions yet
        setSubmissions(DEMO_SUBMISSIONS);
      }
    } catch (err) {
      console.error("Lỗi tải submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [user?.email]);

  const pendingCount = submissions.filter(s => s.status === "pending").length;
  const reviewedCount = submissions.filter(s => s.status === "reviewed").length;

  const filteredSubmissions = submissions.filter(s => {
    if (filter === "pending") return s.status === "pending";
    if (filter === "reviewed") return s.status === "reviewed";
    return true;
  });

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
      if (!selectedSub.isDemo && !selectedSub.id.startsWith("sub-")) {
        const res = await submitPracticeFeedback(selectedSub.id, feedbackInput, scoreInput);
        if (!res.success) {
          alert("Có lỗi xảy ra: " + (res.error || "Không thể lưu nhận xét"));
          setIsSaving(false);
          return;
        }
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

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.75rem" }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: filter === "all" ? "#0f172a" : "#f1f5f9",
            color: filter === "all" ? "white" : "#475569",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Tất cả ({submissions.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: filter === "pending" ? "#d97706" : "#fef3c7",
            color: filter === "pending" ? "white" : "#b45309",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Chờ nhận xét ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("reviewed")}
          style={{
            padding: "0.45rem 0.9rem",
            borderRadius: "6px",
            border: "none",
            backgroundColor: filter === "reviewed" ? "#16a34a" : "#ecfdf5",
            color: filter === "reviewed" ? "white" : "#166534",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Đã nhận xét ({reviewedCount})
        </button>
      </div>

      {/* Submissions List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {filteredSubmissions.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", backgroundColor: "white", borderRadius: "16px", border: "1px solid #e2e8f0" }}>
            <CheckCircle size={40} color="#16a34a" style={{ margin: "0 auto 0.75rem" }} />
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#0f172a" }}>Hiện không có bài tập nào cần xử lý</div>
            <div style={{ color: "#64748b", fontSize: "0.88rem", marginTop: "4px" }}>
              Khi học viên nộp video bài thực hành, bài sẽ hiển thị ngay tại đây.
            </div>
          </div>
        ) : (
          filteredSubmissions.map((sub) => {
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
                        {sub.isDemo && (
                          <span style={{ fontSize: "0.7rem", backgroundColor: "#f1f5f9", color: "#64748b", padding: "1px 6px", borderRadius: "4px" }}>
                            Demo mẫu
                          </span>
                        )}
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

                    {sub.videoUrl && (
                      <a
                        href={sub.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "5px",
                          color: "#4f46e5",
                          fontWeight: 600,
                          fontSize: "0.82rem",
                          textDecoration: "none",
                          backgroundColor: "#eef2ff",
                          padding: "3px 8px",
                          borderRadius: "6px"
                        }}
                      >
                        <Video size={13} />
                        <span>Xem video thực hành</span>
                        <ExternalLink size={12} />
                      </a>
                    )}
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
          })
        )}
      </div>

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

            {/* Video link preview box */}
            {selectedSub.videoUrl && (
              <div style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div style={{ fontSize: "0.85rem", color: "#334155" }}>
                  <strong>Video nộp:</strong> <span style={{ color: "#64748b" }}>{selectedSub.videoUrl.slice(0, 45)}...</span>
                </div>
                <a
                  href={selectedSub.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    color: "#4f46e5",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    textDecoration: "none"
                  }}
                >
                  <span>Mở xem video</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            )}

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
                  placeholder="Ví dụ: Bước chân rất đều nhịp! Chú ý khi chuyển bước sang chân phải thì hơi hạ thấp trọng tâm một chút sẽ vững hơn nhé..."
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

              {/* Quick feedback suggestions */}
              <div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", marginBottom: "6px" }}>
                  Gợi ý nhận xét nhanh (bấm để điền):
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  {PRESET_FEEDBACKS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFeedbackInput(preset)}
                      style={{
                        textAlign: "left",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        fontSize: "0.78rem",
                        cursor: "pointer"
                      }}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
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


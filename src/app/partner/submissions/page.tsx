"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Video, 
  MessageSquare, 
  CheckCircle, 
  Clock, 
  ChevronRight, 
  Send, 
  ExternalLink,
  ShieldCheck,
  UserCheck
} from "lucide-react";

interface Submission {
  id: string;
  studentName: string;
  studentPhone: string;
  age?: number;
  lessonTitle: string;
  submittedAt: string;
  videoUrl: string;
  status: "pending" | "reviewed";
  teacherFeedback?: string;
  studentNotes?: string;
}

const INITIAL_SUBMISSIONS: Submission[] = [
  {
    id: "sub-1",
    studentName: "Bác Trần Đình Trọng",
    studentPhone: "0983 765 432",
    age: 62,
    lessonTitle: "Bài 3: Trọng tâm & Đổi hướng",
    submittedAt: "15/10/2026, 19:15",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "pending",
    studentNotes: "Thầy xem giúp tôi bước xoay bên trái đã đúng trọng tâm chưa ạ, tôi cảm thấy hơi bị chới với."
  },
  {
    id: "sub-2",
    studentName: "Cô Nguyễn Thị Mai",
    studentPhone: "0912 345 678",
    age: 56,
    lessonTitle: "Bài 4: Bước xoay Rumba căn bản",
    submittedAt: "15/10/2026, 08:30",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "pending",
    studentNotes: "Tôi đã tập theo gương lật của Thầy, quay lại video ngắn 1 phút nhờ Thầy chấm."
  },
  {
    id: "sub-3",
    studentName: "Cô Đặng Bích Liên",
    studentPhone: "0962 444 111",
    age: 53,
    lessonTitle: "Bài 4: Bước xoay Rumba căn bản",
    submittedAt: "14/10/2026, 21:00",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "reviewed",
    studentNotes: "Nhờ Thầy xem động tác tay khi xoay.",
    teacherFeedback: "Động tác tay của chị đã mềm hơn rất nhiều. Chú ý giữ mắt nhìn thẳng ngang tầm mắt khi xoay để không bị chóng mặt nhé!"
  },
  {
    id: "sub-4",
    studentName: "Bé Tina Đỗ",
    studentPhone: "0988 555 444",
    age: 12,
    lessonTitle: "Bài 6: Bước trượt Paso Doble",
    submittedAt: "13/10/2026, 17:45",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "reviewed",
    studentNotes: "Con nộp bài tập số 6 ạ bố Hoàng với thầy Tân xem giúp con.",
    teacherFeedback: "Tina nhảy rất có thần thái! Bước chân dứt khoát, lần sau chú ý đẩy căng lồng ngực hơn nữa nhé con."
  }
];

export default function PartnerSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [feedbackInput, setFeedbackInput] = useState("");

  const pendingCount = submissions.filter(s => s.status === "pending").length;

  const handleOpenReview = (sub: Submission) => {
    setSelectedSub(sub);
    setFeedbackInput(sub.teacherFeedback || "");
  };

  const handleSaveFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;

    setSubmissions(submissions.map(s => {
      if (s.id === selectedSub.id) {
        return {
          ...s,
          status: "reviewed",
          teacherFeedback: feedbackInput
        };
      }
      return s;
    }));

    setSelectedSub(null);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.25rem" }}>
          <Link href="/partner" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>Đối tác</Link>
          <ChevronRight size={14} color="#94a3b8" />
          <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.85rem" }}>Chấm bài & Hướng dẫn</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Nhận xét Video Thực hành của Học viên ({submissions.length})
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
              Nơi Thầy Tân xem video học viên quay và gửi nhận xét chỉnh dáng 1-1 qua Zalo hoặc hệ thống.
            </p>
          </div>

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

      {/* Submissions List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {submissions.map((sub) => {
          const isPending = sub.status === "pending";
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
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: isPending ? "#fef3c7" : "#e0e7ff",
                    color: isPending ? "#b45309" : "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "1rem"
                  }}>
                    {sub.studentName.charAt(0)}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>{sub.studentName}</span>
                      {sub.age && (
                        <span style={{ fontSize: "0.75rem", backgroundColor: "#f1f5f9", padding: "1px 6px", borderRadius: "4px", color: "#475569" }}>
                          {sub.age} tuổi
                        </span>
                      )}
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "999px",
                        backgroundColor: isPending ? "#fef3c7" : "#ecfdf5",
                        color: isPending ? "#b45309" : "#166534"
                      }}>
                        {isPending ? "Chờ nhận xét" : "Đã nhận xét"}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                      SĐT: {sub.studentPhone} • Nộp lúc: {sub.submittedAt}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <a
                    href={`https://zalo.me/${sub.studentPhone.replace(/\s+/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "0.45rem 0.85rem",
                      borderRadius: "8px",
                      backgroundColor: "#0068ff",
                      color: "white",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      textDecoration: "none"
                    }}
                  >
                    <span>Nhắn Zalo</span>
                  </a>

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
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <MessageSquare size={14} />
                    <span>{isPending ? "Nhận xét ngay" : "Xem / Sửa nhận xét"}</span>
                  </button>
                </div>
              </div>

              {/* Lesson & Student Note */}
              <div style={{
                backgroundColor: "#f8fafc",
                borderRadius: "10px",
                padding: "0.85rem 1rem",
                fontSize: "0.88rem",
                color: "#334155"
              }}>
                <div style={{ fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
                  {sub.lessonTitle}
                </div>
                {sub.studentNotes && (
                  <div style={{ color: "#64748b", fontStyle: "italic" }}>
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
                  <strong style={{ display: "block", marginBottom: "2px" }}>Nhận xét của Thầy Tân:</strong>
                  {sub.teacherFeedback}
                </div>
              )}
            </div>
          );
        })}
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
            maxWidth: "550px",
            width: "100%",
            padding: "2rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
              Gửi Nhận xét cho {selectedSub.studentName}
            </h2>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              {selectedSub.lessonTitle} • SĐT: {selectedSub.studentPhone}
            </p>

            <form onSubmit={handleSaveFeedback} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setSelectedSub(null)}
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
                    cursor: "pointer"
                  }}
                >
                  <Send size={15} />
                  <span>Lưu & Hoàn thành nhận xét</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

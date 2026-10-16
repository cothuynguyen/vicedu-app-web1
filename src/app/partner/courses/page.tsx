"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  Video, 
  PlayCircle, 
  CheckCircle2, 
  Clock, 
  ExternalLink, 
  ChevronRight,
  Eye,
  Sparkles,
  Layers,
  Settings
} from "lucide-react";

export default function PartnerCoursesPage() {
  const learningUrl = process.env.NEXT_PUBLIC_LEARNING_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3001/dashboard" : "https://hoc.viceduvn.com/dashboard");

  const modules = [
    {
      title: "Học phần 1: Nhập môn & Giải phóng Cơ Khớp Trung Niên",
      lessons: [
        { id: "1", title: "Bài 1: Khởi động an toàn cho khớp cổ chân & đầu gối", duration: "12 phút", status: "Sẵn sàng", isFree: true },
        { id: "2", title: "Bài 2: Phương pháp đếm nhịp 1-2-3-4 & cảm thụ âm nhạc", duration: "15 phút", status: "Sẵn sàng", isFree: true },
        { id: "3", title: "Bài 3: Tư thế đứng thẳng lưng, mở vai và siết nhẹ cơ bụng", duration: "18 phút", status: "Sẵn sàng", isFree: false },
      ]
    },
    {
      title: "Học phần 2: Kỹ thuật Bước Căn bản Rumba & Chachacha",
      lessons: [
        { id: "4", title: "Bài 4: Bước vuông Rumba căn bản (Basic Box Step)", duration: "20 phút", status: "Sẵn sàng", isFree: false },
        { id: "5", title: "Bài 5: Kỹ thuật chuyển trọng tâm chân trụ mượt mà", duration: "22 phút", status: "Sẵn sàng", isFree: false },
        { id: "6", title: "Bài 6: Bước xoay dưới tay và phối hợp tay mềm mại", duration: "25 phút", status: "Sẵn sàng", isFree: false },
        { id: "7", title: "Bài 7: Bước Chachacha căn bản sang ngang và tiến lùi", duration: "20 phút", status: "Sẵn sàng", isFree: false },
      ]
    },
    {
      title: "Học phần 3: Ghép Nhạc Hoàn Chỉnh & Dưỡng Sinh Mỗi Sáng",
      lessons: [
        { id: "8", title: "Bài 8: Ghép bài nhảy Rumba hoàn chỉnh 32 nhịp với nhạc chậm", duration: "25 phút", status: "Sẵn sàng", isFree: false },
        { id: "9", title: "Bài 9: Bài tập Chachacha năng lượng tiêu hao mỡ thừa", duration: "28 phút", status: "Sẵn sàng", isFree: false },
        { id: "10", title: "Bài 10: Thói quen nhảy dưỡng sinh 20 phút mỗi sáng", duration: "16 phút", status: "Sẵn sàng", isFree: false },
      ]
    }
  ];

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Breadcrumb & Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.25rem" }}>
          <Link href="/partner" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>Đối tác</Link>
          <ChevronRight size={14} color="#94a3b8" />
          <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.85rem" }}>Khóa học của Thầy</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Khóa học: Khiêu vũ Giữ dáng & Dưỡng sinh Tuổi Trung Niên
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
              Giáo trình đóng gói chuyên biệt dành cho đối tượng trung niên 40 – 60 tuổi với tính năng hỗ trợ lật gương cùng chiều.
            </p>
          </div>

          <a
            href={`${learningUrl}/courses`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#4f46e5",
              color: "white",
              padding: "0.65rem 1.25rem",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)"
            }}
          >
            <PlayCircle size={18} />
            <span>Xem Video Trên Web 2 LMS ↗</span>
          </a>
        </div>
      </div>

      {/* Course Metadata Card */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        padding: "1.5rem",
        marginBottom: "2rem",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "1.5rem"
      }}>
        <div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>GIẢNG VIÊN</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>Thầy Tân Dancesport</div>
          <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "2px" }}>● Đã xác minh chuyên gia</div>
        </div>
        <div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>QUY MÔ BÀI GIẢNG</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>10 Video chi tiết</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Tổng thời lượng: 210 phút</div>
        </div>
        <div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>TÍNH NĂNG ĐỘC QUYỀN</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#4f46e5", marginTop: "4px" }}>Lật gương (Mirror Mode)</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Học viên không bị ngược tay chân</div>
        </div>
        <div>
          <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>CHẾ ĐỘ XEM TRƯỚC</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>Học thử 2 bài đầu</div>
          <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>Học viên được xem miễn phí</div>
        </div>
      </div>

      {/* Syllabus Modules */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {modules.map((mod, mIdx) => (
          <div key={mIdx} style={{
            backgroundColor: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
          }}>
            <div style={{
              padding: "1rem 1.25rem",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
              <Layers size={18} color="#4f46e5" />
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
                {mod.title}
              </h3>
            </div>

            <div style={{ divideY: "1px solid #f1f5f9" }}>
              {mod.lessons.map((lesson) => (
                <div key={lesson.id} style={{
                  padding: "1rem 1.25rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  borderBottom: "1px solid #f8fafc"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      backgroundColor: lesson.isFree ? "#ecfdf5" : "#eef2ff",
                      color: lesson.isFree ? "#059669" : "#4f46e5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: "0.85rem"
                    }}>
                      {lesson.id}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.95rem" }}>
                        {lesson.title}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                        <Clock size={12} />
                        <span>{lesson.duration}</span>
                        {lesson.isFree && (
                          <span style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                            Học thử miễn phí
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      backgroundColor: "#ecfdf5",
                      color: "#166534",
                      fontSize: "0.8rem",
                      fontWeight: 600
                    }}>
                      <CheckCircle2 size={14} />
                      <span>{lesson.status}</span>
                    </span>

                    <a
                      href="/api/sso?target=/dashboard/courses/d0100000-0000-0000-0000-000000000001"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "0.45rem 0.85rem",
                        borderRadius: "6px",
                        backgroundColor: "#f1f5f9",
                        color: "#334155",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      title="Mở video này trên phòng học Web 2"
                    >
                      <Eye size={14} />
                      <span>Xem thử</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Video, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  MessageSquare,
  ShieldCheck,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const displayName = user?.full_name || "Thầy Tân";

  const learningUrl = process.env.NEXT_PUBLIC_LEARNING_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3001/dashboard" : "https://hoc.viceduvn.com/dashboard");

  // Mock / Initial stats for pilot
  const stats = [
    { label: "Khóa học đang mở", value: "1", sub: "Khiêu vũ Trung niên", icon: BookOpen, color: "#4f46e5", bg: "#eef2ff" },
    { label: "Học viên tham gia", value: "28", sub: "+4 học viên tuần này", icon: Users, color: "#06b6d4", bg: "#ecfeff" },
    { label: "Tỷ lệ hoàn thành", value: "74%", sub: "Độ gắn kết cao", icon: TrendingUp, color: "#10b981", bg: "#ecfdf5" },
    { label: "Bài tập cần chấm/nhận xét", value: "5", sub: "Chờ góp ý động tác", icon: Video, color: "#f59e0b", bg: "#fffbeb" },
  ];

  const recentStudents = [
    { name: "Cô Nguyễn Thị Mai (56t)", phone: "0912***456", progress: 85, status: "Đang tập Bài 4 (Rumba)", date: "Hôm nay, 08:30" },
    { name: "Bác Trần Đình Trọng (62t)", phone: "0983***789", progress: 60, status: "Cần chỉnh trụ chân trái", date: "Hôm qua, 19:15" },
    { name: "Chị Lê Hoàng Yến (45t)", phone: "0904***123", progress: 100, status: "Đã hoàn thành Khóa 1", date: "14/10/2026" },
    { name: "Cô Phạm Thanh Hà (51t)", phone: "0977***654", progress: 40, status: "Đang tập Bài 2", date: "13/10/2026" },
  ];

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
        borderRadius: "20px",
        padding: "2rem",
        color: "white",
        marginBottom: "2rem",
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(67, 56, 202, 0.3)"
      }}>
        <div style={{ position: "relative", zIndex: 2 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255, 255, 255, 0.15)", backdropFilter: "blur(8px)", padding: "4px 12px", borderRadius: "999px", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.75rem" }}>
            <Sparkles size={14} color="#fde047" />
            <span>Cổng Quản Trị Đối Tác Đào Tạo</span>
          </div>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 800, margin: "0 0 0.5rem 0", letterSpacing: "-0.02em" }}>
            Kính chào {displayName}! 💃🕺
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "0.95rem", maxWidth: "700px", lineHeight: 1.6 }}>
            Chào mừng Thầy đến với phân hệ quản trị khóa học kỹ năng & khiêu vũ Dancesport trên hệ thống VicEdu. Tại đây Thầy có thể theo dõi tiến độ của học viên, nhận xét video bài tập và quản lý các bài giảng của mình.
          </p>

          <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <a
              href="/api/sso?target=/dashboard/courses/d0100000-0000-0000-0000-000000000001"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "#ffffff",
                color: "#1e1b4b",
                padding: "0.75rem 1.25rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                transition: "transform 0.2s"
              }}
            >
              <span>🎓 Mở Phòng Học Trực Tuyến (LMS)</span>
              <ExternalLink size={16} />
            </a>

            <Link
              href="/partner/students"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(8px)",
                padding: "0.75rem 1.25rem",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none"
              }}
            >
              <Users size={16} />
              <span>Xem 28 Học viên của Thầy</span>
            </Link>
          </div>
        </div>

        {/* Decorative background circle */}
        <div style={{
          position: "absolute",
          top: "-30%",
          right: "-10%",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 70%)",
          zIndex: 1,
          pointerEvents: "none"
        }} />
      </div>

      {/* Security & Data Isolation Notice */}
      <div style={{
        backgroundColor: "#f0fdf4",
        border: "1px solid #bbf7d0",
        borderRadius: "12px",
        padding: "0.85rem 1.25rem",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "2rem",
        color: "#166534",
        fontSize: "0.88rem"
      }}>
        <ShieldCheck size={22} style={{ flexShrink: 0, color: "#16a34a" }} />
        <div>
          <strong>Chế độ Phân lập Dữ liệu Hoàn toàn (Partner Isolation Active):</strong> {displayName} chỉ có quyền truy cập vào danh sách học viên và khóa học của chính mình. Toàn bộ học viên và nghiệp vụ tài chính của các chi nhánh VicEdu khác được bảo mật tuyệt đối.
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} style={{
              backgroundColor: "white",
              borderRadius: "16px",
              padding: "1.5rem",
              border: "1px solid #e2e8f0",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>{s.label}</span>
                <div style={{ width: "38px", height: "38px", borderRadius: "10px", backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center", color: s.color }}>
                  <Icon size={20} />
                </div>
              </div>
              <div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "4px" }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Column Layout: Active Course & Recent Students */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
        {/* Left: Active Course Showcase */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>Khóa học đang giảng dạy</h2>
            <Link href="/partner/courses" style={{ fontSize: "0.85rem", color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}>Chi tiết giáo trình →</Link>
          </div>

          <div style={{
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
            overflow: "hidden",
            backgroundColor: "#f8fafc"
          }}>
            <div style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)",
              padding: "1.25rem",
              color: "white"
            }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.9 }}>
                CHƯƠNG TRÌNH KHIÊU VŨ DƯỠNG SINH
              </div>
              <h3 style={{ margin: "4px 0 0", fontSize: "1.25rem", fontWeight: 800 }}>
                Khiêu vũ Giữ dáng & Dưỡng sinh Tuổi Trung Niên
              </h3>
              <p style={{ margin: "6px 0 0", fontSize: "0.85rem", opacity: 0.95 }}>
                Giảng viên: Thầy Tân (Chuyên gia Dancesport) • 12 Video bài giảng thực chiến
              </p>
            </div>

            <div style={{ padding: "1.25rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "#64748b" }}>Đối tượng học viên chính:</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>Độ tuổi 40 – 60 tuổi & Thanh thiếu niên</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "#64748b" }}>Tính năng phòng học đặc biệt:</span>
                  <span style={{ fontWeight: 600, color: "#10b981" }}>Lật gương soi cùng chiều & Chữ to</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                  <span style={{ color: "#64748b" }}>Kênh hỗ trợ VIP:</span>
                  <span style={{ fontWeight: 600, color: "#2563eb" }}>Zalo Thầy Tân chỉnh dáng 1-1</span>
                </div>
              </div>

              <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.75rem" }}>
                <a
                  href="/api/sso?target=/dashboard/courses/d0100000-0000-0000-0000-000000000001"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    padding: "0.6rem 1rem",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    textDecoration: "none"
                  }}
                >
                  Vào xem video bài giảng ↗
                </a>
                <Link
                  href="/partner/students"
                  style={{
                    padding: "0.6rem 1rem",
                    backgroundColor: "#f1f5f9",
                    color: "#334155",
                    borderRadius: "8px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    textDecoration: "none"
                  }}
                >
                  Danh sách lớp
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Student Activity */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>Học viên tập luyện gần đây</h2>
            <Link href="/partner/students" style={{ fontSize: "0.85rem", color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}>Xem toàn bộ (28) →</Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {recentStudents.map((st, i) => (
              <div key={i} style={{
                padding: "0.85rem",
                borderRadius: "10px",
                border: "1px solid #f1f5f9",
                backgroundColor: "#fafafa",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "1rem"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#e0e7ff",
                    color: "#4f46e5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: "0.9rem"
                  }}>
                    {st.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a" }}>{st.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{st.phone} • {st.status}</div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: st.progress === 100 ? "#10b981" : "#4f46e5" }}>
                    {st.progress}%
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{st.date}</div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/partner/submissions"
            style={{
              marginTop: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "0.75rem",
              borderRadius: "10px",
              backgroundColor: "#fffbeb",
              color: "#b45309",
              border: "1px solid #fde68a",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none"
            }}
          >
            <MessageSquare size={16} />
            <span>Có 5 video học viên gửi nhờ Thầy chỉnh động tác →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

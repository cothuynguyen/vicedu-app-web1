"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { getPartnerCourses, getPartnerStudents, countPendingPartnerConsultations, PartnerCourse, PartnerStudentItem } from "@/app/actions/partner";
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Video, 
  ExternalLink, 
  Award, 
  CheckCircle2, 
  MessageSquare,
  Sparkles,
  ArrowRight,
  UserPlus,
  Plus,
  PhoneCall
} from "lucide-react";

export default function PartnerDashboard() {
  const { user } = useAuth();
  const displayName = user?.full_name || "Đối tác";
  const partnerSubject = user?.position || user?.department || "Kỹ năng";
  const isDancesport = partnerSubject.toLowerCase().includes("dancesport") || partnerSubject.toLowerCase().includes("khiêu vũ");
  const greetingIcon = isDancesport ? "💃🕺" : "🎓✨";

  const [partnerCourses, setPartnerCourses] = useState<PartnerCourse[]>([]);
  const [partnerStudents, setPartnerStudents] = useState<PartnerStudentItem[]>([]);
  const [pendingConsultationsCount, setPendingConsultationsCount] = useState(0);
  const [totalConsultationsCount, setTotalConsultationsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (user?.email) {
        setLoading(true);
        const [cRes, sRes, consultRes] = await Promise.all([
          getPartnerCourses(user.email, user.department || user.position),
          getPartnerStudents(user.email, user.department || user.position),
          countPendingPartnerConsultations(user.email, user.department || user.position)
        ]);
        if (cRes.success && cRes.data) {
          setPartnerCourses(cRes.data);
        }
        if (sRes.success && sRes.data) {
          setPartnerStudents(sRes.data);
        }
        if (consultRes.success) {
          setPendingConsultationsCount(consultRes.count || 0);
          setTotalConsultationsCount(consultRes.total || 0);
        }
        setLoading(false);
      }
    }
    loadData();
  }, [user?.email, user?.department, user?.position]);

  const primaryCourse = partnerCourses.length > 0 ? partnerCourses[0] : null;
  const totalStudents = partnerStudents.length;

  const learningUrl = process.env.NEXT_PUBLIC_LEARNING_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:3001/dashboard" : "https://hoc.viceduvn.com/dashboard");

  // Dynamic stats
  const stats = [
    { label: "Khóa học đang mở", value: partnerCourses.length.toString(), sub: primaryCourse ? primaryCourse.title : partnerSubject, icon: BookOpen, color: "#4f46e5", bg: "#eef2ff", link: "/partner/courses" },
    { label: "Học viên tham gia", value: totalStudents.toString(), sub: totalStudents > 0 ? "Đã ghi danh" : "Chưa có học viên", icon: Users, color: "#06b6d4", bg: "#ecfeff", link: "/partner/students" },
    { label: "Khách chờ tư vấn", value: pendingConsultationsCount.toString(), sub: `${totalConsultationsCount} lượt đăng ký`, icon: PhoneCall, color: "#ef4444", bg: "#fef2f2", link: "/partner/consultations" },
    { label: "Bài tập cần chấm/nhận xét", value: "0", sub: "Chờ góp ý 1-1", icon: Video, color: "#f59e0b", bg: "#fffbeb", link: "/partner/submissions" },
  ];

  const recentStudents = partnerStudents.slice(0, 5);

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
            Kính chào {displayName}! {greetingIcon}
          </h1>
          <p style={{ margin: 0, opacity: 0.9, fontSize: "0.95rem", maxWidth: "700px", lineHeight: 1.6 }}>
            Chào mừng {user?.full_name?.startsWith("Cô") ? "Cô" : "Thầy"} đến với phân hệ quản trị đào tạo đối tác trên hệ thống VicEdu. Tại đây {user?.full_name?.startsWith("Cô") ? "Cô" : "Thầy"} có thể theo dõi tiến độ của học viên, nhận xét bài tập và quản lý các bài giảng thuộc bộ môn <strong>{partnerSubject}</strong> của mình.
          </p>

          <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            <a
              href={primaryCourse ? `/api/sso?target=/dashboard/courses/${primaryCourse.id}` : "/api/sso?target=/dashboard"}
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
              <span>🎓 Vào Phòng Học Trực Tuyến (LMS)</span>
              <ArrowRight size={16} />
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
              <span>Xem {totalStudents} Học viên của {user?.full_name?.startsWith("Cô") ? "Cô" : "Thầy"}</span>
            </Link>

            <Link
              href="/partner/consultations"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                backgroundColor: pendingConsultationsCount > 0 ? "#ef4444" : "rgba(255, 255, 255, 0.15)",
                color: "white",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                backdropFilter: "blur(8px)",
                padding: "0.75rem 1.25rem",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
                boxShadow: pendingConsultationsCount > 0 ? "0 4px 12px rgba(239, 68, 68, 0.4)" : "none"
              }}
            >
              <PhoneCall size={16} />
              <span>Khách chờ tư vấn {pendingConsultationsCount > 0 ? `(${pendingConsultationsCount})` : ""}</span>
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

      {/* Stat Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Link
              key={idx}
              href={s.link}
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "1.5rem",
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                textDecoration: "none",
                transition: "transform 0.15s, box-shadow 0.15s",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
              }}
            >
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
            </Link>
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

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
              Đang tải thông tin khóa học...
            </div>
          ) : primaryCourse ? (
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
                  CHƯƠNG TRÌNH {primaryCourse.department ? primaryCourse.department.toUpperCase() : "KỸ NĂNG & CHUYÊN MÔN"}
                </div>
                <h3 style={{ margin: "4px 0 0", fontSize: "1.25rem", fontWeight: 800 }}>
                  {primaryCourse.title}
                </h3>
                <p style={{ margin: "6px 0 0", fontSize: "0.85rem", opacity: 0.95 }}>
                  Giảng viên: {displayName} • {primaryCourse.lesson_count || 0} Video bài giảng thực chiến
                </p>
              </div>

              <div style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#64748b" }}>Đối tượng học viên chính:</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>Học viên & Phụ huynh đăng ký</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#64748b" }}>Bộ môn chuyên môn:</span>
                    <span style={{ fontWeight: 600, color: "#10b981" }}>{primaryCourse.department || partnerSubject}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                    <span style={{ color: "#64748b" }}>Mô tả giáo trình:</span>
                    <span style={{ fontWeight: 500, color: "#334155", maxWidth: "260px", textAlign: "right", fontSize: "0.8rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={primaryCourse.description || ""}>
                      {primaryCourse.description || "Giáo trình đào tạo bài bản trên VicEdu"}
                    </span>
                  </div>
                </div>

                <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0", display: "flex", gap: "0.75rem" }}>
                  <a
                    href={`/api/sso?target=/dashboard/courses/${primaryCourse.id}`}
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
                    Vào xem video bài giảng →
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
          ) : (
            <div style={{ padding: "2.5rem 1.5rem", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📚</div>
              <div style={{ fontWeight: 700, color: "#334155", marginBottom: "0.25rem" }}>Chưa có khóa học nào được gán</div>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
                Vui lòng liên hệ Quản trị viên VicEdu để được phân quyền khóa học của Thầy/Cô.
              </p>
            </div>
          )}
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
            <Link href="/partner/students" style={{ fontSize: "0.85rem", color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}>
              Xem toàn bộ ({totalStudents}) →
            </Link>
          </div>

          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#64748b", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
              Đang tải danh sách học viên...
            </div>
          ) : recentStudents.length === 0 ? (
            <div style={{ padding: "2rem 1.5rem", textAlign: "center", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
              <div style={{ fontSize: "1.8rem", marginBottom: "0.5rem" }}>👥</div>
              <div style={{ fontWeight: 600, color: "#334155", fontSize: "0.9rem", marginBottom: "0.25rem" }}>Chưa có học viên nào</div>
              <p style={{ margin: "0 0 1rem 0", fontSize: "0.8rem", color: "#64748b" }}>
                Thầy/Cô hãy thêm học viên để bắt đầu theo dõi tiến độ luyện tập.
              </p>
              <Link
                href="/partner/students"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "0.45rem 0.9rem",
                  backgroundColor: "#4f46e5",
                  color: "white",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textDecoration: "none"
                }}
              >
                <Plus size={14} />
                <span>+ Thêm học viên mới</span>
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {recentStudents.map((st) => (
                <div key={st.id} style={{
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
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>{st.phone} • {st.lastLesson}</div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: st.progress >= 80 ? "#10b981" : "#4f46e5" }}>
                      {st.progress}%
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{st.joinDate}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

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
            <span>Xem bài tập học viên gửi nhờ Thầy nhận xét & hướng dẫn →</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

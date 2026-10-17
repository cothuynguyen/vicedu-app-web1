"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  getPartnerCourses, 
  getCourseModulesAndLessons, 
  PartnerCourse, 
  CourseModuleItem 
} from "@/app/actions/partner";
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
  Users,
  Search,
  GraduationCap,
  Award,
  BookMarked,
  HelpCircle,
  FileText
} from "lucide-react";

export default function PartnerCoursesPage() {
  const { user } = useAuth();
  const displayName = user?.full_name || "Thầy giáo / Đối tác";
  const userEmail = user?.email || "";

  const [partnerCourses, setPartnerCourses] = useState<PartnerCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  
  // Selected course for syllabus inspection
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courseModules, setCourseModules] = useState<CourseModuleItem[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // 1. Tải danh sách các khóa học của Thầy
  useEffect(() => {
    async function loadCourses() {
      if (userEmail) {
        setLoadingCourses(true);
        const res = await getPartnerCourses(userEmail, user?.department || user?.position);
        if (res.success && res.data) {
          setPartnerCourses(res.data);
          // Tự động chọn khóa đầu tiên nếu chưa chọn khóa nào
          if (res.data.length > 0 && !selectedCourseId) {
            setSelectedCourseId(res.data[0].id);
          }
        }
        setLoadingCourses(false);
      }
    }
    loadCourses();
  }, [userEmail, user?.department, user?.position]);

  // 2. Tải giáo trình (Modules & Lessons) thực tế của khóa được chọn
  useEffect(() => {
    async function loadModules() {
      if (!selectedCourseId) {
        setCourseModules([]);
        return;
      }
      setLoadingModules(true);
      const res = await getCourseModulesAndLessons(selectedCourseId);
      if (res.success && res.data) {
        setCourseModules(res.data);
      } else {
        setCourseModules([]);
      }
      setLoadingModules(false);
    }
    loadModules();
  }, [selectedCourseId]);

  // Lọc khóa học theo tìm kiếm
  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return partnerCourses;
    const q = searchQuery.toLowerCase();
    return partnerCourses.filter(c => 
      c.title.toLowerCase().includes(q) || 
      (c.department && c.department.toLowerCase().includes(q)) ||
      (c.description && c.description.toLowerCase().includes(q))
    );
  }, [partnerCourses, searchQuery]);

  // Khóa học đang được chọn để xem giáo trình
  const selectedCourse = useMemo(() => {
    return partnerCourses.find(c => c.id === selectedCourseId) || partnerCourses[0] || null;
  }, [partnerCourses, selectedCourseId]);

  // Thống kê tổng hợp
  const totalCourses = partnerCourses.length;
  const totalLessons = partnerCourses.reduce((sum, c) => sum + (c.lesson_count || 0), 0);
  const totalStudents = partnerCourses.reduce((sum, c) => sum + (c.student_count || 0), 0);

  // Format học phí
  const formatVND = (price: number) => {
    if (!price || price === 0) return "Miễn phí";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  // Cuộn mượt tới phần giáo trình
  const scrollToSyllabus = (courseId: string) => {
    setSelectedCourseId(courseId);
    setTimeout(() => {
      const el = document.getElementById("curriculum-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 50);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1350px", margin: "0 auto" }}>
      {/* 1. Breadcrumb & Header Title */}
      <div style={{ marginBottom: "1.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.35rem" }}>
          <Link href="/partner" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem", fontWeight: 500 }}>
            Cổng Đối tác
          </Link>
          <ChevronRight size={14} color="#94a3b8" />
          <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.85rem" }}>
            Khóa học của Thầy
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              Danh sách Khóa học của Thầy
            </h1>
            <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.95rem" }}>
              Quản lý toàn bộ danh mục khóa học phụ trách, theo dõi số lượng bài giảng, học viên và vào phòng học trực tuyến.
            </p>
          </div>

          <a
            href="/api/sso?target=/dashboard/classroom"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#4f46e5",
              color: "white",
              padding: "0.7rem 1.25rem",
              borderRadius: "10px",
              fontWeight: 600,
              fontSize: "0.9rem",
              textDecoration: "none",
              boxShadow: "0 2px 10px rgba(79, 70, 229, 0.25)",
              transition: "all 0.2s"
            }}
            title="Mở phòng học trực tuyến (LMS) chung của Thầy"
          >
            <PlayCircle size={18} />
            <span>Phòng Học Trực Tuyến (LMS) →</span>
          </a>
        </div>
      </div>

      {/* 2. KPI Summary Strip */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: "1.25rem",
        marginBottom: "2rem"
      }}>
        {/* Card 1: Tổng khóa học */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#eef2ff",
            color: "#4f46e5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <BookOpen size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Khóa học phụ trách
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              {loadingCourses ? "..." : totalCourses}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "2px" }}>
              ● Đang mở giảng dạy
            </div>
          </div>
        </div>

        {/* Card 2: Tổng bài giảng */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#f5f3ff",
            color: "#7c3aed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Video size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Tổng số bài giảng
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              {loadingCourses ? "..." : `${totalLessons} video/bài`}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              Đã số hóa lên hệ thống LMS
            </div>
          </div>
        </div>

        {/* Card 3: Tổng học viên */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#ecfdf5",
            color: "#059669",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <Users size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Học viên ghi danh
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>
              {loadingCourses ? "..." : `${totalStudents} học viên`}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#059669", marginTop: "2px" }}>
              Toàn bộ các khóa của Thầy
            </div>
          </div>
        </div>

        {/* Card 4: Giảng viên chuyên môn */}
        <div style={{
          backgroundColor: "white",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "1.25rem 1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            borderRadius: "12px",
            backgroundColor: "#fffbeb",
            color: "#d97706",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <GraduationCap size={24} />
          </div>
          <div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
              Giảng viên phụ trách
            </div>
            <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#0f172a", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "160px" }}>
              {displayName}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "2px" }}>
              {userEmail}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Multi-Course Catalog Grid */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          flexWrap: "wrap", 
          gap: "1rem", 
          marginBottom: "1.25rem" 
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
              Danh mục Khóa học của Thầy
            </h2>
            <span style={{ 
              backgroundColor: "#e0e7ff", 
              color: "#3730a3", 
              fontSize: "0.8rem", 
              fontWeight: 700, 
              padding: "2px 8px", 
              borderRadius: "999px" 
            }}>
              {filteredCourses.length} khóa
            </span>
          </div>

          {/* Search box if partner has courses */}
          {partnerCourses.length > 1 && (
            <div style={{ position: "relative", minWidth: "260px" }}>
              <Search size={16} color="#94a3b8" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
              <input
                type="text"
                placeholder="Tìm khóa học của Thầy..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.55rem 0.75rem 0.55rem 2.25rem",
                  fontSize: "0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  outline: "none",
                  backgroundColor: "white"
                }}
              />
            </div>
          )}
        </div>

        {/* Loading state for courses */}
        {loadingCourses && (
          <div style={{
            backgroundColor: "white",
            borderRadius: "16px",
            border: "1px solid #e2e8f0",
            padding: "3rem 1.5rem",
            textAlign: "center",
            color: "#64748b"
          }}>
            <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>Đang tải danh sách khóa học của Thầy...</div>
            <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "4px" }}>Hệ thống đang kết nối dữ liệu từ VicEdu LMS</p>
          </div>
        )}

        {/* Empty state if partner has 0 courses */}
        {!loadingCourses && partnerCourses.length === 0 && (
          <div style={{
            backgroundColor: "white",
            borderRadius: "16px",
            border: "1px dashed #cbd5e1",
            padding: "3.5rem 1.5rem",
            textAlign: "center"
          }}>
            <div style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              backgroundColor: "#f1f5f9",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "1rem",
              color: "#94a3b8"
            }}>
              <BookOpen size={28} />
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1e293b", margin: 0 }}>
              Thầy chưa được gán khóa học nào
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.9rem", maxWidth: "480px", margin: "8px auto 1.5rem" }}>
              Tài khoản <strong>{userEmail}</strong> hiện chưa được liên kết khóa học nào trên hệ thống LMS. 
              Vui lòng liên hệ Ban Quản trị VicEdu để hoàn tất phân quyền giảng viên.
            </p>
            <a
              href="https://zalo.me/0985381738"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "0.6rem 1.2rem",
                borderRadius: "8px",
                backgroundColor: "#f8fafc",
                color: "#475569",
                border: "1px solid #cbd5e1",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 600
              }}
            >
              <span>Liên hệ hỗ trợ kỹ thuật VicEdu</span>
            </a>
          </div>
        )}

        {/* Course Cards Grid */}
        {!loadingCourses && partnerCourses.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: "1.5rem"
          }}>
            {filteredCourses.map((course) => {
              const isSelected = course.id === selectedCourse?.id;

              return (
                <div
                  key={course.id}
                  style={{
                    backgroundColor: "white",
                    borderRadius: "16px",
                    border: isSelected ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: isSelected 
                      ? "0 10px 25px -5px rgba(79, 70, 229, 0.15), 0 0 0 1px #4f46e5" 
                      : "0 2px 6px rgba(0,0,0,0.03)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {/* Card Banner / Thumbnail */}
                  <div style={{
                    height: "150px",
                    position: "relative",
                    backgroundColor: "#1e1b4b",
                    backgroundImage: course.image_url 
                      ? `url(${course.image_url})` 
                      : "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
                    backgroundSize: "cover",
                    backgroundPosition: "center"
                  }}>
                    {/* Overlay badges */}
                    <div style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      right: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <span style={{
                        backgroundColor: course.is_published ? "rgba(16, 185, 129, 0.92)" : "rgba(100, 116, 139, 0.9)",
                        color: "white",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        backdropFilter: "blur(4px)"
                      }}>
                        {course.is_published ? "● ĐÃ XUẤT BẢN" : "○ BẢN NHÁP"}
                      </span>

                      {course.department && (
                        <span style={{
                          backgroundColor: "rgba(15, 23, 42, 0.75)",
                          color: "#f8fafc",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backdropFilter: "blur(4px)"
                        }}>
                          {course.department}
                        </span>
                      )}
                    </div>

                    {/* Indicator for currently inspected course */}
                    {isSelected && (
                      <div style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "12px",
                        backgroundColor: "#4f46e5",
                        color: "white",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}>
                        <span>✓ Đang xem giáo trình</span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div style={{ padding: "1.25rem", flex: 1, display: "flex", flexDirection: "column" }}>
                    <h3 style={{ 
                      fontSize: "1.08rem", 
                      fontWeight: 700, 
                      color: "#0f172a", 
                      margin: "0 0 0.5rem",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }} title={course.title}>
                      {course.title}
                    </h3>

                    <p style={{
                      fontSize: "0.85rem",
                      color: "#64748b",
                      margin: "0 0 1rem",
                      lineHeight: 1.5,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden"
                    }}>
                      {course.description || "Chưa có mô tả chi tiết cho khóa học này."}
                    </p>

                    {/* Metadata Chips */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginTop: "auto",
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #f1f5f9",
                      fontSize: "0.8rem",
                      color: "#475569"
                    }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        <Video size={14} color="#7c3aed" />
                        <span>{course.lesson_count || 0} bài học</span>
                      </span>

                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}>
                        <Users size={14} color="#059669" />
                        <span>{course.student_count || 0} học viên</span>
                      </span>

                      <span style={{ marginLeft: "auto", fontWeight: 700, color: "#0f172a" }}>
                        {formatVND(course.price)}
                      </span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div style={{
                    padding: "0.85rem 1.25rem",
                    backgroundColor: "#f8fafc",
                    borderTop: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    {/* Button 1: Xem giáo trình (inspect modules) */}
                    <button
                      onClick={() => scrollToSyllabus(course.id)}
                      style={{
                        flex: 1,
                        padding: "0.55rem 0.75rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        border: isSelected ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                        backgroundColor: isSelected ? "#4f46e5" : "white",
                        color: isSelected ? "white" : "#334155",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.15s"
                      }}
                      title="Xem và quản lý các bài học của khóa này ở bảng bên dưới"
                    >
                      <Layers size={14} />
                      <span>{isSelected ? "Đang chọn xem" : "Xem giáo trình"}</span>
                    </button>

                    {/* Button 2: Vào phòng học trực tuyến khóa này */}
                    <a
                      href={`/api/sso?target=/dashboard/courses/${course.id}`}
                      style={{
                        padding: "0.55rem 0.85rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        backgroundColor: "#10b981",
                        color: "white",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 1px 3px rgba(16, 185, 129, 0.2)"
                      }}
                      title="Mở giao diện phòng học LMS thực tế của khóa này"
                    >
                      <PlayCircle size={14} />
                      <span>Vào học →</span>
                    </a>

                    {/* Button 3: Danh sách học viên */}
                    <Link
                      href={`/partner/students?course=${course.id}`}
                      style={{
                        padding: "0.55rem 0.65rem",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        border: "1px solid #e2e8f0",
                        backgroundColor: "white",
                        color: "#64748b",
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      title="Xem danh sách học viên ghi danh khóa này"
                    >
                      <Users size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Dynamic Curriculum & Lesson Inspector */}
      {selectedCourse && (
        <div id="curriculum-section" style={{
          backgroundColor: "white",
          borderRadius: "18px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 4px 15px rgba(0,0,0,0.03)",
          marginTop: "2.5rem"
        }}>
          {/* Section Header */}
          <div style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem"
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span style={{
                  backgroundColor: "#e0e7ff",
                  color: "#4338ca",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: "4px",
                  textTransform: "uppercase"
                }}>
                  Giáo trình chi tiết
                </span>
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  {courseModules.length} học phần / chương
                </span>
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
                {selectedCourse.title}
              </h3>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <a
                href={`/api/sso?target=/dashboard/courses/${selectedCourse.id}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#4f46e5",
                  color: "white",
                  padding: "0.55rem 1rem",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  boxShadow: "0 2px 6px rgba(79, 70, 229, 0.2)"
                }}
                title="Mở phòng học trực tuyến của khóa này"
              >
                <PlayCircle size={16} />
                <span>Mở trên LMS →</span>
              </a>
            </div>
          </div>

          {/* Module List & Lessons */}
          <div style={{ padding: "1.5rem" }}>
            {/* Loading state */}
            {loadingModules && (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "#64748b" }}>
                <div style={{ fontSize: "1rem", fontWeight: 600 }}>Đang tải cấu trúc bài giảng...</div>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8", marginTop: "4px" }}>Lấy danh sách từ cơ sở dữ liệu khóa học</div>
              </div>
            )}

            {/* Empty modules state */}
            {!loadingModules && courseModules.length === 0 && (
              <div style={{ padding: "2.5rem", textAlign: "center", color: "#64748b", border: "1px dashed #cbd5e1", borderRadius: "12px" }}>
                <Layers size={32} color="#94a3b8" style={{ margin: "0 auto 0.75rem" }} />
                <div style={{ fontWeight: 700, color: "#334155" }}>Khóa học này chưa có học phần / bài giảng nào</div>
                <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "6px 0 0" }}>
                  Thầy có thể thêm bài học mới trực tiếp trên hệ thống LMS hoặc liên hệ quản trị viên VicEdu.
                </p>
              </div>
            )}

            {/* Render Modules */}
            {!loadingModules && courseModules.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {courseModules.map((mod, mIdx) => (
                  <div
                    key={mod.id || mIdx}
                    style={{
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      overflow: "hidden",
                      backgroundColor: "white"
                    }}
                  >
                    {/* Module Title Banner */}
                    <div style={{
                      padding: "0.85rem 1.25rem",
                      backgroundColor: "#f8fafc",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Layers size={16} color="#4f46e5" />
                        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>
                          {mod.title}
                        </span>
                      </div>
                      <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>
                        {mod.lessons.length} bài học
                      </span>
                    </div>

                    {/* Lessons list */}
                    <div>
                      {mod.lessons.length === 0 ? (
                        <div style={{ padding: "1rem 1.25rem", color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>
                          Chưa có bài học nào trong học phần này.
                        </div>
                      ) : (
                        mod.lessons.map((lesson, lIdx) => (
                          <div
                            key={lesson.id}
                            style={{
                              padding: "0.85rem 1.25rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "1rem",
                              borderBottom: lIdx < mod.lessons.length - 1 ? "1px solid #f1f5f9" : "none"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {/* Lesson index */}
                              <div style={{
                                width: "30px",
                                height: "30px",
                                borderRadius: "8px",
                                backgroundColor: lesson.isFree ? "#ecfdf5" : "#eef2ff",
                                color: lesson.isFree ? "#059669" : "#4f46e5",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "0.8rem",
                                flexShrink: 0
                              }}>
                                {lesson.order || lIdx + 1}
                              </div>

                              <div>
                                <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.92rem" }}>
                                  {lesson.title}
                                </div>
                                <div style={{ 
                                  fontSize: "0.76rem", 
                                  color: "#64748b", 
                                  display: "flex", 
                                  alignItems: "center", 
                                  gap: "8px", 
                                  marginTop: "2px" 
                                }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                    <Clock size={12} />
                                    <span>{lesson.duration || "Video bài học"}</span>
                                  </span>

                                  {lesson.isFree && (
                                    <span style={{ 
                                      backgroundColor: "#dcfce7", 
                                      color: "#166534", 
                                      padding: "1px 6px", 
                                      borderRadius: "4px", 
                                      fontWeight: 600,
                                      fontSize: "0.7rem"
                                    }}>
                                      Học thử miễn phí
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions on lesson */}
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <a
                                href={`/api/sso?target=/dashboard/courses/${selectedCourse.id}`}
                                style={{
                                  padding: "0.4rem 0.8rem",
                                  borderRadius: "6px",
                                  backgroundColor: "#f1f5f9",
                                  color: "#334155",
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  transition: "background 0.15s"
                                }}
                                title="Mở phòng học trực tuyến để xem nội dung bài học này"
                              >
                                <Eye size={13} />
                                <span>Xem bài học</span>
                              </a>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

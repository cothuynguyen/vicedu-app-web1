"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { 
  getPartnerStudents, 
  enrollStudentByPartner, 
  removeStudentByPartner,
  PartnerStudentItem, 
  PartnerCourse 
} from "@/app/actions/partner";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  CheckCircle, 
  Clock, 
  MessageCircle, 
  Filter, 
  ShieldCheck,
  ChevronRight,
  Trash2,
  AlertCircle,
  Loader2,
  BookOpen,
  Copy
} from "lucide-react";

export default function PartnerStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<PartnerStudentItem[]>([]);
  const [courses, setCourses] = useState<PartnerCourse[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgress, setFilterProgress] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentAge, setNewStudentAge] = useState("");
  const [newStudentNote, setNewStudentNote] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Notification state
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const partnerSubject = user?.position || user?.department || "Bộ môn Đối tác";

  const fetchStudents = async () => {
    if (!user?.email) return;
    setLoading(true);
    const res = await getPartnerStudents(user.email, user.department || user.position);
    if (res.success) {
      setStudents(res.data || []);
      setCourses(res.courses || []);
      if (res.courses && res.courses.length > 0 && !selectedCourseId) {
        setSelectedCourseId(res.courses[0].id);
      }
    } else {
      setToastMessage({ type: "error", text: res.error || "Không thể tải danh sách học viên" });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [user?.email, user?.department, user?.position]);

  const filtered = students.filter(st => {
    const matchesSearch = 
      st.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      st.phone.includes(searchTerm) ||
      st.notes.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (filterCourse !== "all" && st.courseId !== filterCourse) return false;

    if (filterProgress === "completed") return st.progress >= 80;
    if (filterProgress === "learning") return st.progress >= 30 && st.progress < 80;
    if (filterProgress === "started") return st.progress < 30;
    return true;
  });

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentPhone.trim()) {
      setModalError("Vui lòng điền họ tên và số điện thoại.");
      return;
    }

    if (!user?.email) {
      setModalError("Chưa đăng nhập tài khoản giảng viên đối tác.");
      return;
    }

    const courseToEnroll = selectedCourseId || (courses.length > 0 ? courses[0].id : undefined);
    if (!courseToEnroll) {
      setModalError("Chưa có khóa học nào để gán học viên vào.");
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    const res = await enrollStudentByPartner({
      partnerEmail: user.email,
      partnerDepartment: user.department || user.position,
      studentName: newStudentName.trim(),
      studentPhone: newStudentPhone.trim(),
      studentAge: newStudentAge ? parseInt(newStudentAge) : undefined,
      notes: newStudentNote.trim(),
      courseId: courseToEnroll
    });

    setIsSubmitting(false);

    if (res.success) {
      setToastMessage({ type: "success", text: res.message || "Thêm học viên thành công!" });
      setNewStudentName("");
      setNewStudentPhone("");
      setNewStudentAge("");
      setNewStudentNote("");
      setShowAddModal(false);
      // Tải lại danh sách từ LMS
      fetchStudents();
    } else {
      setModalError(res.error || "Đã xảy ra lỗi khi cấp tài khoản học viên.");
    }
  };

  const handleRemoveStudent = async (st: PartnerStudentItem) => {
    const ok = window.confirm(`Thầy/Cô có chắc chắn muốn xóa học viên "${st.name}" (${st.phone}) khỏi khóa học "${st.course}"?`);
    if (!ok) return;

    const res = await removeStudentByPartner(st.courseId, st.id);
    if (res.success) {
      setToastMessage({ type: "success", text: `Đã xóa học viên ${st.name} khỏi khóa học.` });
      fetchStudents();
    } else {
      setToastMessage({ type: "error", text: res.error || "Lỗi khi xóa học viên." });
    }
  };

  const handleCopyCredentials = (st: PartnerStudentItem) => {
    const learningUrl = typeof window !== "undefined" && window.location.hostname === "localhost" 
      ? "http://localhost:3001" 
      : "https://hoc.viceduvn.com";
    
    const text = `Chào bạn/chị ${st.name},\n${user?.full_name || "Thầy"} đã kích hoạt tài khoản học khóa "${st.course}" trên hệ thống VicEdu:\n\n🌐 Cổng học tập: ${learningUrl}\n📱 Tên đăng nhập (SĐT): ${st.phone}\n🔑 Mật khẩu mặc định: Toiyeuvicedu\n\nChúc bạn/chị có những buổi học và luyện tập thật hiệu quả!`;
    
    navigator.clipboard.writeText(text);
    setToastMessage({ type: "success", text: `Đã sao chép tin nhắn tài khoản của học viên ${st.name}!` });
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Toast alert */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          zIndex: 9999,
          padding: "1rem 1.25rem",
          borderRadius: "10px",
          backgroundColor: toastMessage.type === "success" ? "#10b981" : "#ef4444",
          color: "white",
          boxShadow: "0 10px 15px -3px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontWeight: 600,
          fontSize: "0.9rem"
        }}>
          {toastMessage.type === "success" ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            style={{ marginLeft: "10px", background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "1.1rem" }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.25rem" }}>
            <Link href="/partner" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>Đối tác</Link>
            <ChevronRight size={14} color="#94a3b8" />
            <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.85rem" }}>Học viên của Thầy/Cô</span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Quản lý Học viên ({partnerSubject}) ({loading ? "..." : students.length})
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Danh sách học viên theo học các khóa học do Giảng viên Đối tác phụ trách trên Cổng Đào tạo VicEdu.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setShowAddModal(true);
          }}
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
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)"
          }}
        >
          <Plus size={18} />
          <span>Thêm Học viên Mới</span>
        </button>
      </div>

      {/* Security notice */}
      <div style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "10px",
        padding: "0.75rem 1rem",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontSize: "0.82rem",
        color: "#475569",
        marginBottom: "1.5rem"
      }}>
        <ShieldCheck size={18} color="#16a34a" />
        <span>Khu vực bảo mật: Chỉ hiển thị dữ liệu học viên thuộc các khóa do Giảng viên Đối tác phụ trách. Dữ liệu đồng bộ trực tiếp với Cổng Học tập LMS.</span>
      </div>

      {/* Filters & Search Bar */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "12px",
        border: "1px solid #e2e8f0",
        padding: "1rem",
        marginBottom: "1.5rem",
        display: "flex",
        flexWrap: "wrap",
        gap: "1rem",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "260px" }}>
          <Search size={18} color="#94a3b8" />
          <input
            type="text"
            placeholder="Tìm theo tên học viên, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              outline: "none",
              fontSize: "0.9rem",
              color: "#0f172a"
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          {courses.length > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Khóa:</span>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                style={{
                  padding: "0.45rem 0.85rem",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.85rem",
                  backgroundColor: "white",
                  outline: "none",
                  cursor: "pointer"
                }}
              >
                <option value="all">Tất cả khóa học</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>Tiến độ:</span>
            <select
              value={filterProgress}
              onChange={(e) => setFilterProgress(e.target.value)}
              style={{
                padding: "0.45rem 0.85rem",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.85rem",
                backgroundColor: "white",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="all">Tất cả tiến độ</option>
              <option value="started">Mới bắt đầu (&lt; 30%)</option>
              <option value="learning">Đang tập (30% - 79%)</option>
              <option value="completed">Đã hoàn thành (&gt;= 80%)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
      }}>
        {loading ? (
          <div style={{ padding: "4rem 2rem", textAlign: "center", color: "#64748b" }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: "0 auto 1rem", color: "#4f46e5" }} />
            <div style={{ fontWeight: 600, fontSize: "0.95rem" }}>Đang tải danh sách học viên từ hệ thống LMS...</div>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th style={{ padding: "0.85rem 1.25rem" }}>Học viên</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Số điện thoại</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Khóa học</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Tiến độ bài học</th>
                  <th style={{ padding: "0.85rem 1rem" }}>Bài gần nhất</th>
                  <th style={{ padding: "0.85rem 1.25rem", textAlign: "center" }}>Tương tác & Quản lý</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: "4rem 2rem", textAlign: "center", color: "#94a3b8" }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>👥</div>
                      <div style={{ fontWeight: 700, color: "#334155", fontSize: "1.05rem", marginBottom: "0.25rem" }}>
                        {searchTerm ? "Không tìm thấy học viên nào phù hợp" : "Chưa có học viên nào trong khóa học"}
                      </div>
                      <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#64748b" }}>
                        {searchTerm 
                          ? "Vui lòng thử tìm kiếm bằng số điện thoại hoặc từ khóa khác." 
                          : "Thầy/Cô hãy nhấn nút \"Thêm Học viên Mới\" ở góc trên để cấp tài khoản vào học ngay!"}
                      </p>
                      {!searchTerm && (
                        <button
                          onClick={() => {
                            setModalError(null);
                            setShowAddModal(true);
                          }}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "0.5rem 1rem",
                            backgroundColor: "#4f46e5",
                            color: "white",
                            borderRadius: "8px",
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          <Plus size={16} />
                          <span>+ Cấp tài khoản học viên đầu tiên</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ) : (
                  filtered.map((st) => (
                    <tr key={st.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }}>
                      <td style={{ padding: "1rem 1.25rem" }}>
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
                            fontSize: "0.9rem",
                            flexShrink: 0
                          }}>
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: "#0f172a" }}>{st.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Ghi danh: {st.joinDate}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1rem", color: "#334155", fontWeight: 600 }}>
                        {st.phone}
                      </td>

                      <td style={{ padding: "1rem 1rem", color: "#0f172a", fontSize: "0.85rem", maxWidth: "200px" }}>
                        <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={st.course}>
                          {st.course}
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1rem", minWidth: "160px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ flex: 1, height: "7px", backgroundColor: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{
                              width: `${st.progress}%`,
                              height: "100%",
                              backgroundColor: st.progress >= 80 ? "#10b981" : "#4f46e5"
                            }} />
                          </div>
                          <span style={{ fontSize: "0.8rem", fontWeight: 700, color: st.progress >= 80 ? "#10b981" : "#4f46e5", minWidth: "35px" }}>
                            {st.progress}%
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "1rem 1rem", color: "#475569", fontSize: "0.82rem" }}>
                        <div style={{ fontWeight: 500 }}>{st.lastLesson}</div>
                        {st.notes && (
                          <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic", marginTop: "2px" }}>
                            {st.notes}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                          <button
                            type="button"
                            onClick={() => handleCopyCredentials(st)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "0.45rem 0.75rem",
                              borderRadius: "8px",
                              backgroundColor: "#f8fafc",
                              color: "#334155",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              transition: "background 0.15s"
                            }}
                            title="Sao chép tin nhắn tài khoản để gửi cho học viên qua Zalo/SMS"
                          >
                            <Copy size={13} color="#475569" />
                            <span>Copy TK</span>
                          </button>

                          {st.phone && st.phone !== "—" && (
                            <a
                              href={`https://zalo.me/${st.phone.replace(/\D/g, '')}`}
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
                                textDecoration: "none",
                                boxShadow: "0 1px 3px rgba(0, 104, 255, 0.3)"
                              }}
                              title="Mở Zalo nhắn tin góp ý động tác"
                            >
                              <MessageCircle size={14} />
                              <span>Zalo</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveStudent(st)}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: "0.45rem",
                              borderRadius: "8px",
                              backgroundColor: "#fef2f2",
                              color: "#ef4444",
                              border: "1px solid #fee2e2",
                              cursor: "pointer",
                              transition: "background 0.15s"
                            }}
                            title="Xóa học viên khỏi khóa này"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
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
            maxWidth: "500px",
            width: "100%",
            padding: "2rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
          }}>
            <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "#0f172a" }}>
              Cấp tài khoản Học viên Mới
            </h2>
            <p style={{ margin: "0 0 1.25rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Học viên sẽ được cấp quyền truy cập khóa học LMS và có thể đăng nhập bằng Số điện thoại vào Cổng Học tập Web 2.
            </p>

            {modalError && (
              <div style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "8px",
                padding: "0.75rem 1rem",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <AlertCircle size={16} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddStudent} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Họ và tên học viên *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Cô Nguyễn Thị Lan"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Số điện thoại học viên *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0912 345 678"
                  value={newStudentPhone}
                  onChange={(e) => setNewStudentPhone(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                />
                <span style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "3px", display: "block" }}>
                  Số điện thoại này sẽ là tên đăng nhập vào hệ thống học tập.
                </span>
              </div>

              {courses.length > 1 ? (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Khóa học muốn gán *
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", backgroundColor: "white" }}
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                </div>
              ) : courses.length === 1 ? (
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Khóa học được gán
                  </label>
                  <div style={{ padding: "0.65rem 0.85rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.85rem", color: "#0f172a", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                    <BookOpen size={16} color="#4f46e5" />
                    <span>{courses[0].title}</span>
                  </div>
                </div>
              ) : null}

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Độ tuổi (Tùy chọn)
                  </label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 52"
                    value={newStudentAge}
                    onChange={(e) => setNewStudentAge(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                  Ghi chú ban đầu của Thầy/Cô (Tùy chọn)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Đăng ký học từ cơ bản, tập vào buổi tối"
                  value={newStudentNote}
                  onChange={(e) => setNewStudentNote(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowAddModal(false)}
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
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "0.65rem 1.25rem",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: isSubmitting ? "#94a3b8" : "#4f46e5",
                    color: "white",
                    fontWeight: 600,
                    cursor: isSubmitting ? "not-allowed" : "pointer"
                  }}
                >
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                  <span>{isSubmitting ? "Đang cấp quyền..." : "Xác nhận cấp quyền"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

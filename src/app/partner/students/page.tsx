"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  CheckCircle, 
  Clock, 
  MessageCircle, 
  Filter, 
  Download,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

interface PartnerStudent {
  id: string;
  name: string;
  age?: number;
  phone: string;
  course: string;
  progress: number;
  lastLesson: string;
  joinDate: string;
  notes: string;
}

const INITIAL_STUDENTS: PartnerStudent[] = [
  { id: "1", name: "Cô Nguyễn Thị Mai", age: 56, phone: "0912 345 678", course: "Khiêu vũ Trung Niên", progress: 85, lastLesson: "Bài 4: Bước xoay Rumba căn bản", joinDate: "02/10/2026", notes: "Tiếp thu nhanh, nhịp rất đều" },
  { id: "2", name: "Bác Trần Đình Trọng", age: 62, phone: "0983 765 432", course: "Khiêu vũ Trung Niên", progress: 60, lastLesson: "Bài 3: Trọng tâm & Đổi hướng", joinDate: "05/10/2026", notes: "Cần chú ý giữ thẳng lưng khi chuyển bước" },
  { id: "3", name: "Chị Lê Hoàng Yến", age: 45, phone: "0904 123 789", course: "Khiêu vũ Trung Niên", progress: 100, lastLesson: "Bài 8: Tổng kết bài nhảy Chachacha", joinDate: "20/09/2026", notes: "Đã hoàn thành xuất sắc toàn bộ khóa 1" },
  { id: "4", name: "Cô Phạm Thanh Hà", age: 51, phone: "0977 888 999", course: "Khiêu vũ Trung Niên", progress: 40, lastLesson: "Bài 2: Đếm nhịp và giải phóng khớp hông", joinDate: "08/10/2026", notes: "Tập qua video soi gương thấy rất dễ hiểu" },
  { id: "5", name: "Bác Vũ Văn Hùng", age: 58, phone: "0915 222 333", course: "Khiêu vũ Trung Niên", progress: 25, lastLesson: "Bài 1: Khởi động cơ và cổ chân", joinDate: "12/10/2026", notes: "Mới đăng ký, đang tập bài khởi động" },
  { id: "6", name: "Bé Tina Đỗ (12t)", age: 12, phone: "0988 555 444", course: "Dancesport Thanh Thiếu Niên", progress: 90, lastLesson: "Bài 6: Bước trượt Paso Doble", joinDate: "15/09/2026", notes: "Dẻo, năng khiếu tốt" },
  { id: "7", name: "Cô Đặng Bích Liên", age: 53, phone: "0962 444 111", course: "Khiêu vũ Trung Niên", progress: 70, lastLesson: "Bài 4: Bước xoay Rumba căn bản", joinDate: "01/10/2026", notes: "Đã gửi video bài tập qua Zalo" },
  { id: "8", name: "Bác Ngô Quốc Bảo", age: 65, phone: "0934 666 777", course: "Khiêu vũ Trung Niên", progress: 50, lastLesson: "Bài 3: Trọng tâm & Đổi hướng", joinDate: "04/10/2026", notes: "Tập dưỡng sinh nhẹ nhàng buổi sáng" }
];

export default function PartnerStudentsPage() {
  const [students, setStudents] = useState<PartnerStudent[]>(INITIAL_STUDENTS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterProgress, setFilterProgress] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentAge, setNewStudentAge] = useState("");
  const [newStudentNote, setNewStudentNote] = useState("");

  const filtered = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchTerm.toLowerCase()) || st.phone.includes(searchTerm);
    if (!matchesSearch) return false;

    if (filterProgress === "completed") return st.progress >= 80;
    if (filterProgress === "learning") return st.progress >= 30 && st.progress < 80;
    if (filterProgress === "started") return st.progress < 30;
    return true;
  });

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !newStudentPhone.trim()) return;

    const newSt: PartnerStudent = {
      id: Date.now().toString(),
      name: newStudentName.trim(),
      age: newStudentAge ? parseInt(newStudentAge) : undefined,
      phone: newStudentPhone.trim(),
      course: "Khiêu vũ Trung Niên",
      progress: 0,
      lastLesson: "Chưa bắt đầu",
      joinDate: new Date().toLocaleDateString("vi-VN"),
      notes: newStudentNote.trim() || "Mới kích hoạt tài khoản"
    };

    setStudents([newSt, ...students]);
    setNewStudentName("");
    setNewStudentPhone("");
    setNewStudentAge("");
    setNewStudentNote("");
    setShowAddModal(false);
  };

  return (
    <div style={{ padding: "1.5rem", maxWidth: "1300px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.25rem" }}>
            <Link href="/partner" style={{ color: "#64748b", textDecoration: "none", fontSize: "0.85rem" }}>Đối tác</Link>
            <ChevronRight size={14} color="#94a3b8" />
            <span style={{ color: "#0f172a", fontWeight: 600, fontSize: "0.85rem" }}>Học viên của Thầy</span>
          </div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a", margin: 0 }}>
            Quản lý Học viên Khiêu vũ ({students.length})
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "0.9rem" }}>
            Danh sách học viên theo học các khóa học khiêu vũ và dancesport của Thầy Tân.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
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
        <span>Khu vực bảo mật: Chỉ hiển thị dữ liệu học viên thuộc các khóa do Thầy Tân phụ trách.</span>
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

      {/* Students Table */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        border: "1px solid #e2e8f0",
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
      }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ padding: "0.85rem 1.25rem" }}>Học viên</th>
                <th style={{ padding: "0.85rem 1rem" }}>Độ tuổi</th>
                <th style={{ padding: "0.85rem 1rem" }}>Số điện thoại</th>
                <th style={{ padding: "0.85rem 1rem" }}>Khóa học</th>
                <th style={{ padding: "0.85rem 1rem" }}>Tiến độ bài học</th>
                <th style={{ padding: "0.85rem 1rem" }}>Bài gần nhất</th>
                <th style={{ padding: "0.85rem 1.25rem", textAlign: "center" }}>Tương tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
                    Không tìm thấy học viên nào phù hợp.
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
                          <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Tham gia: {st.joinDate}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ padding: "1rem 1rem", color: "#334155" }}>
                      {st.age ? (
                        <span style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: st.age >= 50 ? "#fef3c7" : "#e0e7ff",
                          color: st.age >= 50 ? "#b45309" : "#4338ca",
                          fontSize: "0.8rem",
                          fontWeight: 600
                        }}>
                          {st.age} tuổi
                        </span>
                      ) : "—"}
                    </td>

                    <td style={{ padding: "1rem 1rem", color: "#334155", fontWeight: 500 }}>
                      {st.phone}
                    </td>

                    <td style={{ padding: "1rem 1rem", color: "#0f172a", fontSize: "0.85rem" }}>
                      {st.course}
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
                      <div>{st.lastLesson}</div>
                      {st.notes && (
                        <div style={{ fontSize: "0.75rem", color: "#94a3b8", fontStyle: "italic", marginTop: "2px" }}>
                          "{st.notes}"
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "1rem 1.25rem", textAlign: "center" }}>
                      <a
                        href={`https://zalo.me/${st.phone.replace(/\s+/g, '')}`}
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
                        <span>Nhắn Zalo</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
            <p style={{ margin: "0 0 1.5rem 0", fontSize: "0.85rem", color: "#64748b" }}>
              Học viên sẽ được thêm vào danh sách và có thể đăng nhập bằng Số điện thoại vào Cổng Học tập Web 2.
            </p>

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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>
                    Số điện thoại *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={newStudentPhone}
                    onChange={(e) => setNewStudentPhone(e.target.value)}
                    style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none" }}
                  />
                </div>
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
                  Ghi chú ban đầu của Thầy
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Chưa từng học khiêu vũ, bắt đầu từ bài 1"
                  value={newStudentNote}
                  onChange={(e) => setNewStudentNote(e.target.value)}
                  style={{ width: "100%", padding: "0.65rem 0.85rem", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.9rem", outline: "none", resize: "none" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
                <button
                  type="button"
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
                  style={{
                    padding: "0.65rem 1.25rem",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#4f46e5",
                    color: "white",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Xác nhận thêm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

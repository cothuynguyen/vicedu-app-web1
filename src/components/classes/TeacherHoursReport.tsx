"use client";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { Search, Calendar, FileText, UserCircle, Clock, MapPin } from "lucide-react";

interface TeacherHoursReportProps {
  branchId: string;
  isGlobalRole: boolean;
  filterTeacher: string;
}

export default function TeacherHoursReport({ branchId, isGlobalRole, filterTeacher }: TeacherHoursReportProps) {
  const [loading, setLoading] = useState(false);
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [filterBranch, setFilterBranch] = useState("Tất cả");

  const [teachers, setTeachers] = useState<any[]>([]);
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [marketingSchedules, setMarketingSchedules] = useState<any[]>([]);
  const [classesInfo, setClassesInfo] = useState<any[]>([]);
  const [selectedTeacherForCalendar, setSelectedTeacherForCalendar] = useState<string | null>(null);

  const myBranches = useMemo(() => {
    return branchId ? branchId.split(',').map(b => b.trim()).filter(Boolean) : [];
  }, [branchId]);

  // Đồng bộ hóa giáo viên được chọn với prop filterTeacher
  useEffect(() => {
    if (filterTeacher !== "Tất cả") {
      setSelectedTeacherForCalendar(filterTeacher);
    } else {
      setSelectedTeacherForCalendar(null);
    }
  }, [filterTeacher]);

  useEffect(() => {
    fetchReportData();
  }, [reportMonth, reportYear, filterBranch, branchId]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const startDate = `${reportYear}-${String(reportMonth).padStart(2, "0")}-01`;
      const endOfMonth = new Date(reportYear, reportMonth, 0);
      const endDate = `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(endOfMonth.getDate()).padStart(2, "0")}`;

      // 1. Tải danh sách Giáo viên / Nhân sự đang hoạt động (không bao gồm nghỉ việc)
      let tQuery = supabase.from("users").select("id, full_name, branch_id, department").neq("status", "Nghỉ việc");
      const targetBranch = filterBranch !== "Tất cả" ? filterBranch : (isGlobalRole ? "Tất cả" : branchId);
      if (targetBranch !== "Tất cả") {
        const branches = targetBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 0) {
          tQuery = tQuery.or(branches.map(b => `branch_id.ilike.%${b}%`).join(','));
        }
      }
      const { data: tData } = await tQuery;
      const uniqueTeachers = Array.from(new Map((tData || []).map((item: any) => [item.full_name, item])).values());
      setTeachers(uniqueTeachers);

      // 2. Tải thông tin các Lớp học
      const { data: cData } = await supabase.from("classes").select("id, class_name, hours_per_session, teacher_vn, teacher_foreign, branch_id, start_date, end_date, schedules, created_at, status");
      setClassesInfo(cData || []);

      // 3. Tải tất cả các buổi học trong tháng (bao gồm cả chưa điểm danh để đối soát lịch tháng)
      const { data: sessData } = await supabase
        .from("class_sessions")
        .select("id, class_id, date, session_number, content, attendance(id, presence_status)")
        .gte("date", startDate)
        .lte("date", endDate);
        
      setClassSessions(sessData || []);

      // 4. Tải lịch Marketing và Dạy thay (lấy tất cả trạng thái để tính giờ dự kiến)
      let mQuery = supabase
        .from("marketing_schedules")
        .select("*")
        .gte("date", startDate)
        .lte("date", endDate);
      
      const mTargetBranch = filterBranch !== "Tất cả" ? filterBranch : (isGlobalRole ? "Tất cả" : branchId);
      if (mTargetBranch !== "Tất cả") {
        const branches = mTargetBranch.split(",").map(b => b.trim()).filter(Boolean);
        if (branches.length > 1) {
          mQuery = mQuery.in("branch_id", branches);
        } else if (branches.length === 1) {
          mQuery = mQuery.eq("branch_id", branches[0]);
        }
      }
      const { data: mData } = await mQuery;
      setMarketingSchedules(mData || []);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const reportData = useMemo(() => {
    const substituteRecords = marketingSchedules.filter(m => m.schedule_type === "Dạy thay");

    return teachers.map(teacher => {
      let vnTeachingHours = 0;
      let foreignTeachingHours = 0;
      let substituteHours = 0;
      let marketingHours = 0;

      // Tính giờ dạy lớp (chỉ cộng dồn nếu đã điểm danh và không bị dạy thay)
      classSessions.forEach(sess => {
        const cls = classesInfo.find(c => c.id === sess.class_id);
        if (cls) {
          const checkBranch = (filterBranch === "Tất cả")
            ? (isGlobalRole || myBranches.includes(cls.branch_id))
            : (cls.branch_id === filterBranch);
          if (!checkBranch) return;

          const hours = Number(cls.hours_per_session) || 2;
          const isAttended = sess.attendance && sess.attendance.length > 0;
          
          // Kiểm tra xem buổi học này có bị thay thế bởi giáo viên khác hay không
          const subForVN = substituteRecords.find(r => r.class_id === sess.class_id && r.date === sess.date && r.substituted_teacher_name === cls.teacher_vn);
          const subForForeign = substituteRecords.find(r => r.class_id === sess.class_id && r.date === sess.date && r.substituted_teacher_name === cls.teacher_foreign);

          if (cls.teacher_vn === teacher.full_name) {
            if (!subForVN && isAttended) {
              vnTeachingHours += hours;
            }
          }
          if (cls.teacher_foreign === teacher.full_name) {
            if (!subForForeign && isAttended) {
              foreignTeachingHours += hours;
            }
          }
        }
      });

      // Tính giờ dạy thay thực tế (chỉ tính lịch đã hoàn thành)
      const completedSubstitutes = substituteRecords.filter(r => r.teacher_name === teacher.full_name && r.status === "Đã hoàn thành");
      completedSubstitutes.forEach(r => {
        substituteHours += Number(r.hours) || 0;
      });

      // Tính giờ bị dạy thay thực tế (bị trừ của GV chính thức - tất cả lịch dạy thay phát sinh)
      let deductedHours = 0;
      const teacherDeducted = substituteRecords.filter(r => r.substituted_teacher_name === teacher.full_name);
      teacherDeducted.forEach(r => {
        deductedHours += Number(r.deducted_hours !== undefined && r.deducted_hours !== null ? r.deducted_hours : r.hours) || 0;
      });

      // Tính giờ Marketing thực tế (chỉ tính lịch đã hoàn thành)
      const completedMarketing = marketingSchedules.filter(m => 
        (m.schedule_type || "Marketing") === "Marketing" && 
        m.teacher_name === teacher.full_name && 
        m.status === "Đã hoàn thành"
      );
      completedMarketing.forEach(m => {
        marketingHours += Number(m.hours) || 0;
      });

      const totalTeaching = vnTeachingHours + foreignTeachingHours;
      const totalHours = totalTeaching + substituteHours + marketingHours;

      // Tính giờ dạy dự kiến (tháng) - bao gồm cả lớp chính, lịch marketing và dạy thay
      let expectedHours = 0;
      const totalDays = new Date(reportYear, reportMonth, 0).getDate(); // Total days of the report month
      
      const teacherClasses = classesInfo.filter(cls => {
        const matchBranch = (filterBranch === "Tất cả")
          ? (isGlobalRole || myBranches.includes(cls.branch_id))
          : (cls.branch_id === filterBranch);
        const matchTeacher = cls.teacher_vn === teacher.full_name || cls.teacher_foreign === teacher.full_name;
        return matchBranch && matchTeacher;
      });

      const mapDays = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      for (let d = 1; d <= totalDays; d++) {
        const currentDate = new Date(reportYear, reportMonth - 1, d);
        const dayOfWeekStr = mapDays[currentDate.getDay()];
        const year = currentDate.getFullYear();
        const monthStr = String(currentDate.getMonth() + 1).padStart(2, '0');
        const dayStr = String(currentDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${monthStr}-${dayStr}`;

        teacherClasses.forEach(cls => {
          // Start Valid: start_date fallback to created_at date
          const startValid = !cls.start_date 
            ? (cls.created_at ? dateStr >= cls.created_at.split('T')[0] : true)
            : dateStr >= cls.start_date;
            
          // End Valid: if finished, end_date fallback to created_at date
          const endValid = cls.status === "Đã kết thúc"
            ? (cls.end_date ? dateStr <= cls.end_date : (cls.created_at ? dateStr <= cls.created_at.split('T')[0] : false))
            : (!cls.end_date || dateStr <= cls.end_date);

          if (startValid && endValid) {
            const clsSchedules = cls.schedules || [];
            clsSchedules.forEach((sch: any) => {
              if (sch.dayOfWeek === dayOfWeekStr) {
                expectedHours += Number(cls.hours_per_session) || 2;
              }
            });
          }
        });
      }

      // Khấu trừ giờ bị dạy thay của giáo viên này (bất kể ngày nào trong tuần)
      const teacherDeductedSchedules = substituteRecords.filter(r => r.substituted_teacher_name === teacher.full_name);
      teacherDeductedSchedules.forEach(r => {
        const deducted = Number(r.deducted_hours !== undefined && r.deducted_hours !== null ? r.deducted_hours : r.hours) || 0;
        expectedHours -= deducted;
      });

      // Cộng giờ dự kiến cho các buổi đi dạy thay của giáo viên này (bất kể trạng thái)
      const teacherSubSchedules = substituteRecords.filter(r => r.teacher_name === teacher.full_name);
      teacherSubSchedules.forEach(r => {
        expectedHours += Number(r.hours) || 0;
      });

      // Cộng giờ dự kiến cho các buổi đi làm Marketing của giáo viên này (bất kể trạng thái)
      const teacherMktSchedules = marketingSchedules.filter(m => 
        (m.schedule_type || "Marketing") === "Marketing" && 
        m.teacher_name === teacher.full_name
      );
      teacherMktSchedules.forEach(m => {
        expectedHours += Number(m.hours) || 0;
      });

      return {
        id: teacher.id,
        name: teacher.full_name,
        branch: teacher.branch_id,
        department: teacher.department,
        vnTeachingHours,
        foreignTeachingHours,
        substituteHours,
        deductedHours,
        marketingHours,
        totalTeaching,
        totalHours,
        expectedHours
      };
    }).filter(t => {
      if (filterTeacher !== "Tất cả" && t.name !== filterTeacher) return false;
      const isDaoTao = t.department && t.department.toLowerCase().includes("đào tạo");
      const hasHours = t.totalHours > 0 || t.expectedHours > 0;
      return isDaoTao || hasHours;
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [teachers, classSessions, classesInfo, marketingSchedules, filterBranch, filterTeacher, reportMonth, reportYear]);

  return (
    <div className="glass-panel" style={{ padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.25rem", color: "#1e293b", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={24} color="#3b82f6" /> Báo cáo Tổng giờ làm việc (Tháng {reportMonth}/{reportYear})
        </h2>
        
        <div style={{ display: "flex", gap: "1rem" }}>
          {(isGlobalRole || myBranches.length > 1) && (
            <select className="form-input" value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1" }}>
              <option value="Tất cả">{isGlobalRole ? "Tất cả Chi nhánh" : "Tất cả chi nhánh của tôi"}</option>
              {(isGlobalRole ? ["Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"] : myBranches).map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          )}
          <select className="form-input" value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} style={{ padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1" }}>
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select className="form-input" value={reportYear} onChange={e => setReportYear(Number(e.target.value))} style={{ padding: "0.4rem 0.75rem", borderRadius: 6, border: "1px solid #cbd5e1" }}>
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ background: "#eff6ff", padding: "1rem", borderRadius: 8, marginBottom: "1.5rem", border: "1px solid #bfdbfe", fontSize: "0.9rem", color: "#1e40af" }}>
        <strong>📌 Nguyên tắc tính giờ:</strong><br/>
        - Số giờ dạy trên lớp: Chỉ tính các buổi học <strong>Đã được điểm danh</strong> (và tự động khấu trừ các buổi có giáo viên khác dạy thay) trong khoảng thời gian đã chọn.<br/>
        - Số giờ dạy thay: Tính các lịch Dạy thay có trạng thái <strong>"Đã hoàn thành"</strong>.<br/>
        - Số giờ Marketing (dành cho GVNN): Chỉ tính các lịch Marketing có trạng thái <strong>"Đã hoàn thành"</strong>.<br/>
        - Tổng giờ = Số giờ dạy trên lớp + Số giờ dạy thay + Số giờ đi Marketing.
      </div>

      {loading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Đang tải dữ liệu báo cáo...</div>
      ) : reportData.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "#64748b" }}>Không có dữ liệu giáo viên hoặc giờ làm việc trong tháng này.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                <th style={{ padding: "0.75rem 1rem", textAlign: "left", color: "#475569", fontWeight: 600 }}>Giáo viên</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center", color: "#475569", fontWeight: 600 }}>Chi nhánh</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#475569", fontWeight: 600 }}>Giờ dạy lớp VN</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#475569", fontWeight: 600 }}>Giờ dạy lớp NN</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#475569", fontWeight: 600 }}>Giờ dạy thay</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#475569", fontWeight: 600 }}>Giờ bị dạy thay</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#475569", fontWeight: 600 }}>Giờ Marketing</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#2563eb", fontWeight: 700 }}>Giờ dự kiến</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#10b981", fontWeight: 700 }}>Tổng thực tế</th>
                <th style={{ padding: "0.75rem 1rem", textAlign: "center", color: "#475569", fontWeight: 600 }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((t, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0", background: selectedTeacherForCalendar === t.name ? "#f8fafc" : "white" }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: 8 }}>
                    <UserCircle size={18} color="#64748b" /> {t.name}
                  </td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center", color: "#64748b" }}>{t.branch}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#0ea5e9", fontWeight: 500 }}>{t.vnTeachingHours > 0 ? t.vnTeachingHours : "-"}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#8b5cf6", fontWeight: 500 }}>{t.foreignTeachingHours > 0 ? t.foreignTeachingHours : "-"}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#f43f5e", fontWeight: 500 }}>{t.substituteHours > 0 ? t.substituteHours : "-"}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#ef4444", fontWeight: 500 }}>{t.deductedHours > 0 ? `-${t.deductedHours}` : "-"}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#f59e0b", fontWeight: 500 }}>{t.marketingHours > 0 ? t.marketingHours : "-"}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#2563eb", fontWeight: 700, fontSize: "1.05rem" }}>{t.expectedHours}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "#10b981", fontWeight: 700, fontSize: "1.05rem" }}>{t.totalHours}</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                    <button
                      onClick={() => setSelectedTeacherForCalendar(selectedTeacherForCalendar === t.name ? null : t.name)}
                      style={{
                        padding: "0.3rem 0.6rem",
                        background: selectedTeacherForCalendar === t.name ? "#2563eb" : "#f1f5f9",
                        color: selectedTeacherForCalendar === t.name ? "white" : "#475569",
                        border: "1px solid",
                        borderColor: selectedTeacherForCalendar === t.name ? "#2563eb" : "#cbd5e1",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        fontWeight: 500,
                        transition: "all 0.2s"
                      }}
                    >
                      {selectedTeacherForCalendar === t.name ? "Đang xem" : "Xem lịch chi tiết"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* PHẦN LỊCH THÁNG ĐỐI SOÁT CHI TIẾT */}
      {selectedTeacherForCalendar && (
        <div style={{ marginTop: "2.5rem", borderTop: "2px solid #e2e8f0", paddingTop: "1.5rem" }} className="animate-fade-in">
          {(() => {
            const selectedTeacherData = reportData.find(t => t.name === selectedTeacherForCalendar);
            const expH = selectedTeacherData ? selectedTeacherData.expectedHours : 0;
            const actH = selectedTeacherData ? selectedTeacherData.totalHours : 0;
            return (
              <h3 style={{ fontSize: "1.15rem", color: "#0f172a", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>
                  📅 Đối soát Lịch dạy tháng {reportMonth}/{reportYear} — Giáo viên: <strong style={{ color: "#2563eb" }}>{selectedTeacherForCalendar}</strong>
                  <span style={{ fontSize: "0.9rem", color: "#64748b", marginLeft: "1rem", fontWeight: "normal" }}>
                    (Dự kiến: <strong style={{ color: "#2563eb" }}>{expH}h</strong> | Thực tế: <strong style={{ color: "#10b981" }}>{actH}h</strong>)
                  </span>
                </span>
                <button 
                  onClick={() => setSelectedTeacherForCalendar(null)}
                  style={{
                    fontSize: "0.8rem",
                    padding: "0.3rem 0.6rem",
                    background: "white",
                    border: "1px solid #cbd5e1",
                    borderRadius: 6,
                    cursor: "pointer",
                    color: "#64748b",
                    fontWeight: 500
                  }}
                >
                  Đóng xem lịch
                </button>
              </h3>
            );
          })()}

          {/* Chú thích màu sắc (Legend) */}
          <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginBottom: "1.25rem", fontSize: "0.85rem", background: "#f8fafc", padding: "0.75rem", borderRadius: 8, border: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#dbeafe", border: "1px solid #3b82f6" }}></div>
              <span>Lớp chính thức (Đã điểm danh - Có tính giờ)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#fef9c3", border: "1px solid #eab308" }}></div>
              <span style={{ fontWeight: 600, color: "#854d0e" }}>Lớp chính thức (Chưa điểm danh - Chưa tính giờ)</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#dcfce7", border: "1px solid #22c55e" }}></div>
              <span>Lịch Dạy thay</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: "#fce7f3", border: "1px solid #db2777" }}></div>
              <span>Lịch Marketing</span>
            </div>
          </div>

          {/* Khung lịch lưới */}
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden", background: "white", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f1f5f9", borderBottom: "1px solid #e2e8f0", textAlign: "center", fontWeight: 600, fontSize: "0.85rem", color: "#475569" }}>
              {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"].map(d => (
                <div key={d} style={{ padding: "0.75rem 0.5rem" }}>{d}</div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", background: "#f8fafc" }}>
              {(() => {
                const firstDayIndex = (new Date(reportYear, reportMonth - 1, 1).getDay() + 6) % 7;
                const totalDays = new Date(reportYear, reportMonth, 0).getDate();
                const cells = [];
                
                for (let i = 0; i < firstDayIndex; i++) {
                  cells.push(null);
                }
                for (let d = 1; d <= totalDays; d++) {
                  cells.push(d);
                }
                while (cells.length % 7 !== 0) {
                  cells.push(null);
                }

                // Lọc lịch của riêng giáo viên được chọn
                const teacherSessions = classSessions.filter(sess => {
                  const cls = classesInfo.find(c => c.id === sess.class_id);
                  if (!cls) return false;
                  return cls.teacher_vn === selectedTeacherForCalendar || cls.teacher_foreign === selectedTeacherForCalendar;
                });

                const teacherMarketing = marketingSchedules.filter(m => 
                  m.teacher_name === selectedTeacherForCalendar || m.substituted_teacher_name === selectedTeacherForCalendar
                );

                const substituteRecords = marketingSchedules.filter(m => m.schedule_type === "Dạy thay");

                return cells.map((dayNum, cellIdx) => {
                  if (dayNum === null) {
                    return <div key={`empty-${cellIdx}`} style={{ minHeight: "120px", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", background: "#f8fafc" }}></div>;
                  }

                  const dateStr = `${reportYear}-${String(reportMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const daySessions = teacherSessions.filter(s => s.date === dateStr);
                  const dayMarketing = teacherMarketing.filter(m => m.date === dateStr);

                  return (
                    <div 
                      key={`day-${dayNum}`} 
                      style={{ 
                        minHeight: "120px", 
                        borderRight: "1px solid #e2e8f0", 
                        borderBottom: "1px solid #e2e8f0", 
                        background: "white", 
                        padding: "0.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.35rem"
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#64748b", marginBottom: "0.25rem" }}>{dayNum}</div>
                      
                      {/* Lớp học chính thức */}
                      {daySessions.map(sess => {
                        const cls = classesInfo.find(c => c.id === sess.class_id);
                        if (!cls) return null;
                        
                        const isAttended = sess.attendance && sess.attendance.length > 0;
                        const hours = cls.hours_per_session || 2;
                        
                        // Kiểm tra xem buổi này giáo viên này có bị thay thế bởi giáo viên dạy thay khác hay không
                        const subRecord = substituteRecords.find(r => r.class_id === sess.class_id && r.date === sess.date && r.substituted_teacher_name === selectedTeacherForCalendar);
                        const isSubstituted = !!subRecord;
                        
                        let displayTitle = cls.class_name;
                        let bgColor = isAttended ? "#dbeafe" : "#fef9c3";
                        let borderColor = isAttended ? "#3b82f6" : "#eab308";
                        let textColor = isAttended ? "#1e40af" : "#854d0e";
                        let note = "";

                        if (isSubstituted) {
                          bgColor = "#f3f4f6";
                          borderColor = "#9ca3af";
                          textColor = "#4b5563";
                          const deducted = subRecord.deducted_hours !== undefined && subRecord.deducted_hours !== null ? subRecord.deducted_hours : hours;
                          note = ` (Bị dạy thay, trừ ${deducted}h)`;
                        } else if (!isAttended) {
                          note = " (Chưa điểm danh)";
                        }

                        return (
                          <div 
                            key={`sess-${sess.id}`} 
                            title={isSubstituted 
                              ? `${cls.class_name} (Bị dạy thay)\nBị trừ: -${subRecord.deducted_hours !== undefined && subRecord.deducted_hours !== null ? subRecord.deducted_hours : hours}h\nDạy thay bởi: ${subRecord.teacher_name}\nChi nhánh: ${cls.branch_id}`
                              : `${cls.class_name}${note}\nThời gian: ${hours}h\nChi nhánh: ${cls.branch_id}`
                            }
                            style={{ 
                              background: bgColor, 
                              border: `1px solid ${borderColor}`, 
                              borderRadius: 4, 
                              padding: "0.25rem", 
                              fontSize: "0.72rem", 
                              color: textColor,
                              lineHeight: "1.2"
                            }}
                          >
                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayTitle}</div>
                            <div>{hours}h • Buổi {sess.session_number}{note}</div>
                            {cls.branch_id !== filterBranch && filterBranch !== "Tất cả" && (
                              <div style={{ opacity: 0.7, fontSize: "0.65rem", marginTop: "2px" }}>[{cls.branch_id}]</div>
                            )}
                          </div>
                        );
                      })}

                      {/* Lịch Dạy thay / Lịch Marketing */}
                      {dayMarketing.map(m => {
                        const isSub = m.schedule_type === "Dạy thay";
                        const isSubstituteTeacher = m.teacher_name === selectedTeacherForCalendar;
                        
                        // Nếu giáo viên là người được dạy thay, chúng ta đã hiển thị mờ ở mục Lớp học.
                        // Tại đây chúng ta chỉ hiện lịch của giáo viên đi Dạy thay cho người khác.
                        if (isSub && !isSubstituteTeacher) return null;

                        const hours = m.hours || 0;
                        const label = isSub ? "Dạy thay" : "Marketing";
                        const isCompleted = m.status === "Đã hoàn thành";
                        const bgColor = isSub 
                          ? (isCompleted ? "#dcfce7" : "#f0fdf4") 
                          : (isCompleted ? "#fce7f3" : "#fdf2f8");
                        const borderColor = isSub 
                          ? (isCompleted ? "#22c55e" : "#86efac") 
                          : (isCompleted ? "#db2777" : "#fbcfe8");
                        const textColor = isSub 
                          ? (isCompleted ? "#166534" : "#15803d") 
                          : (isCompleted ? "#9d174d" : "#be185d");
                        
                        let displayName = "Marketing";
                        if (isSub) {
                          const clsObj = classesInfo.find(c => c.id === m.class_id);
                          displayName = `Dạy thay: ${clsObj ? clsObj.class_name : "Lớp học"}`;
                        }

                        const statusText = isCompleted ? "" : " (Chưa HT)";

                        return (
                          <div 
                            key={`mkt-${m.id}`} 
                            title={isSub 
                              ? `Dạy thay lớp: ${displayName}\nCộng: +${hours}h\nTrừ của ${m.substituted_teacher_name}: -${m.deducted_hours !== undefined && m.deducted_hours !== null ? m.deducted_hours : hours}h\nTrạng thái: ${m.status}\nChi nhánh: ${m.branch_id}`
                              : `${label}\nThời lượng: ${hours}h\nTrạng thái: ${m.status}\nChi nhánh: ${m.branch_id}`
                            }
                            style={{ 
                              background: bgColor, 
                              border: `1px solid ${borderColor}`, 
                              borderRadius: 4, 
                              padding: "0.25rem", 
                              fontSize: "0.72rem", 
                              color: textColor,
                              lineHeight: "1.2"
                            }}
                          >
                            <div style={{ fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</div>
                            <div>{isSub ? `+${hours}h` : `${hours}h`} • {label}{statusText}</div>
                            {m.branch_id !== filterBranch && filterBranch !== "Tất cả" && (
                              <div style={{ opacity: 0.7, fontSize: "0.65rem", marginTop: "2px" }}>[{m.branch_id}]</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

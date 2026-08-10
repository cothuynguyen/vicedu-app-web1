"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { X, PlusCircle, Trash2, Edit, Save, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";
import StudentModal from "@/components/students/StudentModal";
import { useAuth } from "@/context/AuthContext";
import PadletStatsCell from "@/components/classes/PadletStatsCell";
import { fetchPadletStatsBatch } from "@/app/actions/padlet";

interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string | null;
  initialClassData: any;
  mode: "view" | "edit" | "create";
  activeRole: string;
  activeBranch: string;
  onSuccess: () => void;
}

const defaultFormData = {
  id: "",
  branch_id: "Việt Trì 1",
  class_name: "",
  schedules: [] as any[],
  status: "Sắp khai giảng",
  teacher_vn: "",
  teacher_foreign: "",
  room: "",
  group_type: "Kindy",
  curriculum: "",
  max_students: 15,
  start_date: "",
  end_date: "",
  total_months: 3,
  total_sessions: 24,
  total_hours: 48,
  hours_per_session: 2,
  zalo_group: "",
  class_image: [],
  attendance_images: [],
  note: "",
  close_check: false,
  close_check_note: ""
};

export default function ClassModal({
  isOpen,
  onClose,
  classId,
  initialClassData,
  mode,
  activeRole,
  activeBranch,
  onSuccess
}: ClassModalProps) {
  const [activeTab, setActiveTab] = useState("info"); // info, students, sessions, attendance
  const [formData, setFormData] = useState(defaultFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<"view" | "edit" | "create">("create");
  const [autoCascade, setAutoCascade] = useState(true);

  const currentClassId = classId || formData.id;

  const { user } = useAuth();
  const currentUserName = user?.full_name || "Hệ thống (Điểm danh)";

  // Student details modal overlay state
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentData, setSelectedStudentData] = useState<any>(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

  const handleOpenStudentDetail = (studentId: string, studentData: any) => {
    setSelectedStudentId(studentId);
    setSelectedStudentData(studentData);
    setIsStudentModalOpen(true);
  };

  // Staff and students state
  const [staffList, setStaffList] = useState<any[]>([]);
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string>("");
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [classSessions, setClassSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [redFlags, setRedFlags] = useState<Record<string, {reason: string}>>({});

  const [padletBatchData, setPadletBatchData] = useState<Record<string, any>>({});
  const [loadingPadletBatch, setLoadingPadletBatch] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState<{ studentId: string; studentName: string; currentNote: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setModalMode(mode);
      setActiveTab("info");
      
      if (classId && initialClassData) {
        setFormData({ ...defaultFormData, ...initialClassData });
        fetchClassDetails(classId, initialClassData.branch_id);
      } else {
        const myBranches = activeBranch ? activeBranch.split(',').map(b => b.trim()).filter(Boolean) : [];
        const defaultBranch = myBranches.length > 0 ? myBranches[0] : "Việt Trì 1";
        setFormData({ ...defaultFormData, branch_id: defaultBranch });
        setClassStudents([]);
        setClassSessions([]);
        setAvailableStudents([]);
        setSelectedSessionId("");
        setAttendanceData([]);
      }
    }
  }, [isOpen, classId, initialClassData, mode]);

  useEffect(() => {
    let isMounted = true;
    if (activeTab === "students" && classStudents.length > 0) {
      const urls = classStudents
        .map(cs => cs.students?.padlet_api)
        .filter(url => !!url);
      
      if (urls.length > 0) {
        setLoadingPadletBatch(true);
        fetchPadletStatsBatch(urls).then(results => {
          if (isMounted) {
            setPadletBatchData(results);
            setLoadingPadletBatch(false);
          }
        }).catch(err => {
          if (isMounted) setLoadingPadletBatch(false);
        });
      }
    }
    return () => { isMounted = false; };
  }, [activeTab, classStudents]);

  useEffect(() => {
    if (isOpen && formData.branch_id) {
      fetchStaff(formData.branch_id);
    }
  }, [formData.branch_id, isOpen]);

  useEffect(() => {
    if (selectedSessionId && isOpen) {
      fetchAttendance(selectedSessionId);
    }
  }, [selectedSessionId, isOpen]);

  useEffect(() => {
    if (activeTab === 'attendance' && !selectedSessionId && classSessions.length > 0) {
      setSelectedSessionId(classSessions[0].id);
    }
  }, [activeTab, classSessions, selectedSessionId]);

  const fetchStaff = async (branchId: string) => {
    const { data } = await supabase.from("users").select("id, full_name, department, nationality, status").ilike("branch_id", `%${branchId}%`).neq("status", "Nghỉ việc");
    if (data) setStaffList(data);
  };

  const fetchClassDetails = async (id: string, branchId: string) => {
    // 1. Fetch class students
    const { data: csData } = await supabase.from("class_students").select("*, students(*), enrollments(remaining_hours)").eq("class_id", id);
    setClassStudents(csData || []);
    
    // 2. Fetch class sessions
    const { data: sessData } = await supabase.from("class_sessions").select("*, attendance(student_id, presence_status)").eq("class_id", id).order("session_number", { ascending: true });
    setClassSessions(sessData || []);

    // 3. Fetch red flags for class students
    const existingIds = (csData || []).map((cs: any) => cs.student_id);
    if (existingIds.length > 0) {
      const { data: flagsData } = await supabase.rpc('get_red_flags');
      if (flagsData) {
        const rfMap: any = {};
        flagsData.forEach((r: any) => {
          if (existingIds.includes(r.student_id)) {
            rfMap[r.student_id] = { reason: r.reason };
          }
        });
        setRedFlags(rfMap);
      }
    } else {
      setRedFlags({});
    }

    // 4. Fetch available students in branch
    const { data: availEnrs } = await supabase.from("enrollments")
      .select("id, remaining_hours, tuition_fee, registered_hours, students!inner(id, full_name, nickname)")
      .gt("remaining_hours", 0)
      .eq("branch_id", branchId)
      .eq("status", "Active");
      
    const filteredEnrs = (availEnrs || []).filter((e: any) => !existingIds.includes(e.students.id));
    setAvailableStudents(filteredEnrs);
  };

  const fetchAttendance = async (sessionId: string) => {
    const { data } = await supabase.from("attendance").select("*").eq("class_session_id", sessionId);
    setAttendanceData(data || []);
  };

  if (!isOpen) return null;

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // 1. Kiểm tra trùng lịch dạy của Giáo viên với các Lớp học khác trên toàn hệ thống
      let query = supabase.from("classes").select("id, class_name, branch_id, teacher_vn, teacher_foreign, schedules, status");
      if (currentClassId) {
        query = query.neq("id", currentClassId);
      }
      const { data: otherClasses, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      const activeOtherClasses = (otherClasses || []).filter((c: any) => c.status !== "Đã kết thúc");
      const conflicts: string[] = [];
      const newSchedules = formData.schedules || [];

      for (const otherClass of activeOtherClasses) {
        const otherSchedules = otherClass.schedules || [];
        const hasForeignConflict = formData.teacher_foreign && otherClass.teacher_foreign === formData.teacher_foreign;

        if (hasForeignConflict) {
          const conflictingTeacher = formData.teacher_foreign;
          
          for (const newSch of newSchedules) {
            for (const otherSch of otherSchedules) {
              if (newSch.dayOfWeek === otherSch.dayOfWeek) {
                const s1 = newSch.startTime;
                const e1 = newSch.endTime;
                const s2 = otherSch.startTime;
                const e2 = otherSch.endTime;
                
                if (s1 && e1 && s2 && e2 && s1 < e2 && e1 > s2) {
                  conflicts.push(
                    `- GV: ${conflictingTeacher} trùng lịch với lớp "${otherClass.class_name}" (Chi nhánh: ${otherClass.branch_id}) vào ${newSch.dayOfWeek} (${s2} - ${e2})`
                  );
                }
              }
            }
          }
        }
      }

      // 2. Kiểm tra trùng lịch dạy với Lịch Dạy thay / Lịch Marketing từ ngày hôm nay trở đi
      const d = new Date();
      const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const { data: marketingSchedules, error: mErr } = await supabase
        .from("marketing_schedules")
        .select("id, schedule_type, teacher_name, date, start_time, end_time, branch_id")
        .gte("date", todayStr);
      if (mErr) throw mErr;

      const dayOfWeekMap = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
      const getDayOfWeek = (dateStr: string) => {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const day = parseInt(parts[2], 10);
          const date = new Date(year, month, day);
          return dayOfWeekMap[date.getDay()];
        }
        return "";
      };

      for (const newSch of newSchedules) {
        for (const mSch of (marketingSchedules || [])) {
          const mSchDay = getDayOfWeek(mSch.date);
          if (newSch.dayOfWeek === mSchDay) {
            const hasForeignConflict = formData.teacher_foreign && mSch.teacher_name === formData.teacher_foreign;
            if (hasForeignConflict) {
              const conflictingTeacher = formData.teacher_foreign;
              const s1 = newSch.startTime;
              const e1 = newSch.endTime;
              const s2 = mSch.start_time ? mSch.start_time.substring(0, 5) : "";
              const e2 = mSch.end_time ? mSch.end_time.substring(0, 5) : "";
              
              if (s1 && e1 && s2 && e2 && s1 < e2 && e1 > s2) {
                conflicts.push(
                  `- GV: ${conflictingTeacher} trùng với lịch ${mSch.schedule_type} (Chi nhánh: ${mSch.branch_id}) vào ngày ${mSch.date} (${s2} - ${e2})`
                );
              }
            }
          }
        }
      }

      if (conflicts.length > 0) {
        const errorMsg = `⚠️ PHÁT HIỆN TRÙNG LỊCH DẠY CỦA GIÁO VIÊN:\n\n${conflicts.join("\n")}\n\nKhung giờ bị trùng nhau và điều này là không thể xảy ra. Vui lòng kiểm tra lại lịch dạy!`;
        alert(errorMsg);
        setIsSubmitting(false);
        return;
      }

      const payload: any = { ...formData };
      delete payload.class_students;
      
      if (!payload.start_date) payload.start_date = null;
      if (!payload.end_date) payload.end_date = null;

      if (currentClassId) {
        const { error } = await supabase.from("classes").update(payload).eq("id", currentClassId);
        if (error) throw error;
        alert("Cập nhật thông tin lớp thành công!");
      } else {
        if (!payload.id) {
          payload.id = `CLASS_${Date.now()}`;
        }
        const { data, error } = await supabase.from("classes").insert([payload]).select().single();
        if (error) throw error;
        
        setFormData(data);
        alert("Tạo lớp thành công! Bạn có thể tiếp tục thêm học viên và lộ trình.");
        
        // Fetch available students right after creation
        const { data: availEnrs } = await supabase.from("enrollments")
          .select("id, remaining_hours, tuition_fee, registered_hours, students!inner(id, full_name, nickname)")
          .gt("remaining_hours", 0)
          .eq("branch_id", data.branch_id)
          .eq("status", "Active");
        setAvailableStudents(availEnrs || []);
        
        setModalMode("edit");
      }
      onSuccess();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addStudentToClass = async (enrollmentId: string) => {
    if (!currentClassId) return;
    try {
      const enr = availableStudents.find(e => e.id === enrollmentId);
      if (!enr) return;

      const payload = { 
        class_id: currentClassId, 
        student_id: enr.students.id, 
        enrollment_id: enrollmentId,
        status: "Đang học" 
      };
      const { data, error } = await supabase.from("class_students").insert([payload]).select("*, students(*), enrollments(remaining_hours)").single();
      if (error) throw error;
      
      // Tự động tìm ID giáo viên Việt Nam từ tên
      let vnTeacherId = null;
      if (formData.teacher_vn) {
        const { data: vnUser } = await supabase
          .from("users")
          .select("id")
          .eq("full_name", formData.teacher_vn)
          .limit(1)
          .maybeSingle();
        if (vnUser) vnTeacherId = vnUser.id;
      }

      // Tự động tìm ID giáo viên nước ngoài từ tên
      let foreignTeacherId = null;
      if (formData.teacher_foreign) {
        const { data: foreignUser } = await supabase
          .from("users")
          .select("id")
          .eq("full_name", formData.teacher_foreign)
          .limit(1)
          .maybeSingle();
        if (foreignUser) foreignTeacherId = foreignUser.id;
      }

      // Tự động chuyển trạng thái học viên thành 'Đang học' và gán giáo viên chủ nhiệm
      await supabase.from("students").update({ 
        status: "Đang học",
        vn_teacher: vnTeacherId,
        foreign_teacher: foreignTeacherId
      }).eq("id", enr.students.id);
      
      setClassStudents([...classStudents, data]);
      setAvailableStudents(availableStudents.filter(s => s.students.id !== enr.students.id));
      setSelectedEnrollmentId("");
      onSuccess();
    } catch (err: any) {
      alert("Lỗi thêm học viên: " + err.message);
    }
  };

  const removeStudentFromClass = async (csId: string) => {
    if (!confirm("Bỏ học viên này khỏi lớp?")) return;
    try {
      const removedCs = classStudents.find(cs => cs.id === csId);
      const { error } = await supabase.from("class_students").delete().eq("id", csId);
      if (error) throw error;
      
      setClassStudents(classStudents.filter(cs => cs.id !== csId));
      if (removedCs) {
        // Kiểm tra xem học viên có còn lớp học nào khác đang hoạt động không
        const { data: otherClasses } = await supabase
          .from("class_students")
          .select("id")
          .eq("student_id", removedCs.student_id)
          .eq("status", "Đang học");
        
        if (!otherClasses || otherClasses.length === 0) {
          // Nếu không còn lớp nào, cập nhật trạng thái học sinh về 'Chờ xếp lớp'
          await supabase
            .from("students")
            .update({ status: "Chờ xếp lớp" })
            .eq("id", removedCs.student_id);
        }
        
        fetchClassDetails(currentClassId!, formData.branch_id);
      }
      onSuccess();
    } catch (err: any) {
      alert("Lỗi xóa: " + err.message);
    }
  };

  const generateSessions = async (recreate = false) => {
    if (!currentClassId) return;
    const targetCount = formData.total_sessions;
    
    if (recreate) {
      if (!confirm(`CẢNH BÁO: Hành động này sẽ XÓA toàn bộ ${classSessions.length} buổi học hiện tại (bao gồm cả dữ liệu điểm danh) và tạo lại từ đầu với ${targetCount} buổi. Bạn có chắc chắn không?`)) return;
    } else {
      if (targetCount <= classSessions.length) {
        alert("Số buổi học hiện tại đã bằng hoặc lớn hơn cấu hình. Vui lòng sử dụng nút 'Tạo lại từ đầu' nếu muốn thay đổi toàn bộ!");
        return;
      }
      if (!confirm(`Hệ thống sẽ tạo thêm buổi học cho đủ ${targetCount} buổi. Tiếp tục?`)) return;
    }
    
    setIsSubmitting(true);
    try {
      if (recreate) {
        await supabase.from("class_sessions").delete().eq("class_id", currentClassId);
      }

      const dayMap: Record<string, number> = { 'Chủ nhật': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6 };
      const allowedDays = (formData.schedules || []).map((s: any) => dayMap[s.dayOfWeek]).filter((d: any) => d !== undefined);
      
      let currDate = formData.start_date ? new Date(formData.start_date) : null;
      if (currDate && allowedDays.length > 0) {
        while (!allowedDays.includes(currDate.getDay())) {
          currDate.setDate(currDate.getDate() + 1);
        }
      }

      let startIdx = recreate ? 0 : classSessions.length;
      
      if (currDate && allowedDays.length > 0 && !recreate) {
        for (let i = 0; i < startIdx; i++) {
          currDate.setDate(currDate.getDate() + 1);
          while (!allowedDays.includes(currDate.getDay())) {
            currDate.setDate(currDate.getDate() + 1);
          }
        }
      }

      const payloads = [];
      for (let i = startIdx + 1; i <= targetCount; i++) {
        let dateStr = null;
        if (currDate && allowedDays.length > 0) {
          const year = currDate.getFullYear();
          const month = String(currDate.getMonth() + 1).padStart(2, '0');
          const day = String(currDate.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
          
          currDate.setDate(currDate.getDate() + 1);
          while (!allowedDays.includes(currDate.getDay())) {
            currDate.setDate(currDate.getDate() + 1);
          }
        }

        payloads.push({
          class_id: currentClassId,
          session_number: i,
          date: dateStr,
          content: `Nội dung buổi ${i}`
        });
      }

      const { data, error } = await supabase.from("class_sessions").insert(payloads).select();
      if (error) throw error;

      if (recreate) {
        setClassSessions(data || []);
      } else {
        setClassSessions([...classSessions, ...(data || [])]);
      }
      
      // Update end_date of class to the date of the last generated session
      const lastDate = payloads[payloads.length - 1]?.date;
      if (lastDate && currentClassId) {
        await supabase.from("classes").update({ end_date: lastDate }).eq("id", currentClassId);
        setFormData(prev => ({ ...prev, end_date: lastDate }));
      }
    } catch (err: any) {
      alert("Lỗi tạo lộ trình: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAllSessions = async () => {
    setIsSubmitting(true);
    try {
      const promises = classSessions.map(s => 
        supabase.from("class_sessions").update({ date: s.date, content: s.content }).eq("id", s.id)
      );
      await Promise.all(promises);
      
      // Cập nhật lại ngày kết thúc của lớp học theo buổi cuối cùng
      const validDates = classSessions.map(s => s.date).filter(Boolean).sort();
      if (validDates.length > 0 && currentClassId) {
        const lastDate = validDates[validDates.length - 1];
        await supabase.from("classes").update({ end_date: lastDate }).eq("id", currentClassId);
        setFormData(prev => ({ ...prev, end_date: lastDate }));
      }

      onSuccess();

      alert("Đã lưu tất cả thay đổi lộ trình học thành công!");
    } catch (err) {
      console.error(err);
      alert("Lỗi khi lưu thay đổi");
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeExcessSessions = async () => {
    if (!currentClassId) return;
    const targetCount = formData.total_sessions;
    const excessCount = classSessions.length - targetCount;
    
    if (excessCount <= 0) return;
    
    if (!confirm(`CẢNH BÁO: Hành động này sẽ XÓA VĨNH VIỄN ${excessCount} buổi học cuối cùng trong lộ trình (bao gồm cả dữ liệu điểm danh nếu có). Bạn có chắc chắn không?`)) return;

    setIsSubmitting(true);
    try {
      const sortedSessions = [...classSessions].sort((a, b) => a.session_number - b.session_number);
      const sessionsToDelete = sortedSessions.slice(-excessCount);
      const idsToDelete = sessionsToDelete.map(s => s.id);

      const { error } = await supabase.from("class_sessions").delete().in("id", idsToDelete);
      if (error) throw error;

      setClassSessions(prev => prev.filter(s => !idsToDelete.includes(s.id)));
      
      onSuccess();
      
      alert(`Đã xóa ${excessCount} buổi học thừa thành công!`);
    } catch (err: any) {
      alert("Lỗi khi xóa buổi học: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateSession = (sessId: string, field: string, value: string) => {
    if (field === "date" && autoCascade) {
      setClassSessions(prev => {
        const idx = prev.findIndex(s => s.id === sessId);
        if (idx === -1) return prev;

        const newSessions = [...prev];
        newSessions[idx] = { ...newSessions[idx], date: value };

        const dayMap: Record<string, number> = { 'Chủ nhật': 0, 'Thứ 2': 1, 'Thứ 3': 2, 'Thứ 4': 3, 'Thứ 5': 4, 'Thứ 6': 5, 'Thứ 7': 6 };
        const allowedDays = (formData.schedules || []).map((s: any) => dayMap[s.dayOfWeek]).filter((d: any) => d !== undefined);
        
        if (allowedDays.length > 0 && value) {
          const currDate = new Date(value);
          for (let i = idx + 1; i < newSessions.length; i++) {
            currDate.setDate(currDate.getDate() + 1);
            while (!allowedDays.includes(currDate.getDay())) {
              currDate.setDate(currDate.getDate() + 1);
            }
            const year = currDate.getFullYear();
            const month = String(currDate.getMonth() + 1).padStart(2, '0');
            const day = String(currDate.getDate()).padStart(2, '0');
            newSessions[i] = { ...newSessions[i], date: `${year}-${month}-${day}` };
          }
        }
        return newSessions;
      });
    } else {
      setClassSessions(prev => prev.map(s => s.id === sessId ? { ...s, [field]: value } : s));
    }
  };

  const handleAttendanceChange = (studentId: string, field: string, value: any) => {
    setAttendanceData(prev => {
      const existing = prev.find(item => item.student_id === studentId);
      if (existing) {
        return prev.map(item => item.student_id === studentId ? { ...item, [field]: value } : item);
      } else {
        return [...prev, { student_id: studentId, presence_status: "", homework_status: "", teacher_notes: "", bonus_points: 0, [field]: value }];
      }
    });
  };

  const handleSaveTeacherNoteToDB = async (studentId: string, note: string) => {
    if (!selectedSessionId) {
      alert("Vui lòng chọn một buổi học để điểm danh trước khi nhận xét.");
      return;
    }
    
    // 1. Cập nhật state nội bộ
    handleAttendanceChange(studentId, 'teacher_notes', note);
    setNoteModalOpen(null);

    // 2. Chuẩn bị dữ liệu đồng bộ CRM
    const session = classSessions.find(s => s.id === selectedSessionId);
    const sessionNum = session ? session.session_number : "?";
    const sessionDate = session ? session.date : new Date().toLocaleDateString('en-CA');
    const className = formData.class_name || currentClassId || "";
    const prefix = `[Lớp ${className} - Buổi ${sessionNum}]`;
    
    const existingData = attendanceData.find(item => item.student_id === studentId);
    const newPoints = Number(existingData?.bonus_points) || 0;
    const homeworkText = existingData?.homework_status ? `Bài tập: ${existingData.homework_status}` : "";
    
    let finalContent = `${prefix}`;
    if (note.trim()) finalContent += ` Nhận xét: ${note.trim()}`;
    if (homeworkText) finalContent += `. ${homeworkText}`;
    if (newPoints !== 0) finalContent += ` -> ${newPoints > 0 ? '+' : ''}${newPoints} điểm`;

    try {
      // 3. Upsert vào bảng attendance
      const recordToUpsert = {
        class_session_id: selectedSessionId,
        student_id: studentId,
        presence_status: existingData?.presence_status || "",
        teacher_notes: note,
        homework_status: existingData?.homework_status || "",
        bonus_points: newPoints
      };
      
      const { error: attErr } = await supabase.from("attendance").upsert([recordToUpsert], { onConflict: 'class_session_id, student_id' });
      if (attErr) throw attErr;

      // 4. Đồng bộ thẳng vào student_care_logs
      const { data: existingLogs } = await supabase
        .from("student_care_logs")
        .select("id")
        .eq("student_id", studentId)
        .like("content", `${prefix}%`);

      if (existingLogs && existingLogs.length > 0) {
        const logId = existingLogs[0].id;
        if (!note.trim() && newPoints === 0 && !homeworkText) {
          await supabase.from("student_care_logs").delete().eq("id", logId);
        } else {
          await supabase.from("student_care_logs").update({
            content: finalContent.trim(),
            contact_date: sessionDate || new Date().toLocaleDateString('en-CA'),
            feedback: homeworkText,
            bonus_points: newPoints
          }).eq("id", logId);
        }
      } else {
        if (note.trim() !== "" || newPoints !== 0 || homeworkText !== "") {
          await supabase.from("student_care_logs").insert([{
            student_id: studentId,
            content: finalContent.trim(),
            contact_date: sessionDate || new Date().toLocaleDateString('en-CA'),
            feedback: homeworkText,
            bonus_points: newPoints,
            created_by: currentUserName,
            created_at: new Date().toISOString()
          }]);
        }
      }
    } catch (err: any) {
      console.error("Error saving teacher note directly:", err);
      alert("Lỗi khi đồng bộ nhận xét: " + err.message);
    }
  };

  const handleSaveAttendance = async () => {
    if (!selectedSessionId) {
      alert("Vui lòng chọn một buổi học để điểm danh!");
      return;
    }
    setIsSubmitting(true);
    try {
      const hoursPerSession = Number(formData.hours_per_session) || 2;
      const deductedStatuses = ["Có mặt", "Vắng phép", "Không phép"];

      const { data: oldAttendanceData, error: oldErr } = await supabase
        .from("attendance")
        .select("student_id, presence_status, bonus_points")
        .eq("class_session_id", selectedSessionId);
      if (oldErr) throw oldErr;

      const recordsToUpsert = classStudents.map(cs => {
        const existingData = attendanceData.find(item => item.student_id === cs.student_id);
        return {
          class_session_id: selectedSessionId,
          student_id: cs.student_id,
          presence_status: existingData?.presence_status || "",
          teacher_notes: existingData?.teacher_notes || "",
          homework_status: existingData?.homework_status || "",
          bonus_points: Number(existingData?.bonus_points) || 0
        };
      });

      const { error } = await supabase.from("attendance").upsert(recordsToUpsert, { onConflict: 'class_session_id, student_id' });
      if (error) throw error;

      // Sync teacher comments to student_care_logs and calculate bonus_points delta
      const session = classSessions.find(s => s.id === selectedSessionId);
      const sessionNum = session ? session.session_number : "?";
      const sessionDate = session ? session.date : new Date().toLocaleDateString('en-CA');
      const className = formData.class_name || currentClassId || "";
      const prefix = `[Lớp ${className} - Buổi ${sessionNum}]`;

      for (const record of recordsToUpsert) {
        // Delta calculation for Bonus Points
        const oldPoints = oldAttendanceData?.find((a: any) => a.student_id === record.student_id)?.bonus_points || 0;
        const newPoints = record.bonus_points;
        const delta = newPoints - oldPoints;

        if (delta !== 0) {
          const cs = classStudents.find(c => c.student_id === record.student_id);
          const currentTotal = Number(cs?.students?.bonus_points) || 0;
          await supabase.from("students").update({ bonus_points: currentTotal + delta }).eq("id", record.student_id);
        }

        const { data: existingLogs } = await supabase
          .from("student_care_logs")
          .select("id")
          .eq("student_id", record.student_id)
          .like("content", `${prefix}%`);

        const commentText = record.teacher_notes?.trim() || "";
        const homeworkText = record.homework_status ? `Bài tập: ${record.homework_status}` : "";
        
        let finalContent = `${prefix}`;
        if (commentText) finalContent += ` Nhận xét: ${commentText}`;
        if (homeworkText) finalContent += `. ${homeworkText}`;
        if (newPoints !== 0) finalContent += ` ⭐ ${newPoints > 0 ? '+' : ''}${newPoints} điểm`;

        if (existingLogs && existingLogs.length > 0) {
          const logId = existingLogs[0].id;
          if (commentText === "" && newPoints === 0 && !homeworkText) {
            // Delete the care log if everything is empty
            await supabase.from("student_care_logs").delete().eq("id", logId);
          } else {
            // Update the existing care log
            const { error: logErr } = await supabase.from("student_care_logs").update({
              content: finalContent.trim(),
              contact_date: sessionDate || new Date().toLocaleDateString('en-CA'),
              feedback: homeworkText,
              bonus_points: newPoints
            }).eq("id", logId);
            if (logErr) console.error("Update log error:", logErr);
          }
        } else {
          // If comment/points is not empty, insert a new care log
          if (commentText !== "" || newPoints !== 0 || homeworkText !== "") {
            const { error: logErr } = await supabase.from("student_care_logs").insert([{
              student_id: record.student_id,
              content: finalContent.trim(),
              contact_date: sessionDate || new Date().toLocaleDateString('en-CA'),
              feedback: homeworkText,
              bonus_points: newPoints,
              created_by: currentUserName,
              created_at: new Date().toISOString()
            }]);
            if (logErr) console.error("Insert log error:", logErr);
          }
        }
      }
      
      // Cập nhật số dư (Tiền/Giờ) của học viên đã được xử lý tự động qua Database Trigger (trg_attendance_recalc)


      onSuccess();
      
      if (currentClassId) {
        // Refresh sessions to sync stats
        const { data: sessData } = await supabase.from("class_sessions").select("*, attendance(student_id, presence_status)").eq("class_id", currentClassId).order("session_number", { ascending: true });
        setClassSessions(sessData || []);
        fetchClassDetails(currentClassId, formData.branch_id);
      }
      
      alert("Lưu thông tin điểm danh thành công! Đã tự động cập nhật số giờ học của học viên.");
    } catch (err: any) {
      alert("Lỗi khi lưu điểm danh: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const vnTeachers = staffList.filter(s => s.department && s.department.includes("Đào tạo") && s.status !== "Nghỉ việc");
  const foreignTeachers = vnTeachers;

  const handleScheduleChange = (day: string, field: string, val: string) => {
    let currentSchedules = [...(formData.schedules || [])];
    const exists = currentSchedules.find(s => s.dayOfWeek === day);
    
    if (exists) {
      if (field === 'checked' && val === 'false') {
        currentSchedules = currentSchedules.filter(s => s.dayOfWeek !== day);
      } else {
        currentSchedules = currentSchedules.map(s => s.dayOfWeek === day ? { ...s, [field]: val } : s);
      }
    } else {
      if (field === 'checked' && val === 'true') {
        currentSchedules.push({ dayOfWeek: day, startTime: "17:30", endTime: "19:30" });
      }
    }
    setFormData({ ...formData, schedules: currentSchedules });
  };

  const daysOfWeekList = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in" style={{ width: '95%', maxWidth: '1200px', height: '90vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{currentClassId ? `Lớp học: ${formData.class_name}` : "Tạo Lớp học mới"}</h2>
            {currentClassId && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Chi nhánh: {formData.branch_id}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
        </div>

        {classId && (
          <div style={{ display: 'flex', background: '#f8fafc', padding: '0 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
            {[
              { id: 'info', label: 'Thông tin chung' },
              { id: 'students', label: `Học viên trong lớp (${classStudents.length})` },
              { id: 'sessions', label: `Lộ trình học (${classSessions.length} buổi)` },
              { id: 'attendance', label: 'Điểm danh buổi học' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '1rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                  color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          
          {/* TAB 1: INFO */}
          {activeTab === 'info' && (
            <form onSubmit={handleSaveInfo}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="form-group">
                  <label>Tên lớp học *</label>
                  <input type="text" value={formData.class_name} onChange={e => setFormData({ ...formData, class_name: e.target.value })} placeholder="VD: IELTS Beginner 01" required disabled={modalMode === 'view'} />
                </div>
                <div className="form-group">
                  <label>Chi nhánh *</label>
                  <select 
                    value={formData.branch_id} 
                    onChange={e => setFormData({ ...formData, branch_id: e.target.value })} 
                    disabled={(activeRole !== 'Super Admin' && !activeBranch.includes(",")) || modalMode === 'view'}
                  >
                    {(() => {
                      const isGlobalRole = ['Super Admin', 'Giám đốc', 'Kế toán HO', 'Kiểm toán HO', 'Quản lý hệ thống'].includes(activeRole);
                      const myBranches = activeBranch ? activeBranch.split(',').map((b: any) => b.trim()).filter(Boolean) : [];
                      const allowedBranches = isGlobalRole ? ["Việt Trì 1", "Việt Trì 2", "Lâm Thao", "Tuyên Quang", "Dân Hòa"] : myBranches;
                      return allowedBranches.map((b: string, i: number) => (
                        <option key={i} value={b}>{b}</option>
                      ));
                    })()}
                  </select>
                </div>
                <div className="form-group">
                  <label>Phòng học</label>
                  <input type="text" value={formData.room} onChange={e => setFormData({ ...formData, room: e.target.value })} placeholder="VD: Phòng 201" disabled={modalMode === 'view'} />
                </div>
                <div className="form-group">
                  <label>Phân loại nhóm</label>
                  <select value={formData.group_type} onChange={e => setFormData({ ...formData, group_type: e.target.value })} disabled={modalMode === 'view'}>
                    <option value="Kindy">Kindy</option>
                    <option value="Kids">Kids</option>
                    <option value="Teens">Teens</option>
                    <option value="IELTS">IELTS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Giáo viên Việt Nam</label>
                  <select value={formData.teacher_vn} onChange={e => setFormData({ ...formData, teacher_vn: e.target.value })} disabled={modalMode === 'view'}>
                    <option value="">-- Chọn giáo viên --</option>
                    {vnTeachers.map(t => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Giáo viên nước ngoài</label>
                  <select value={formData.teacher_foreign} onChange={e => setFormData({ ...formData, teacher_foreign: e.target.value })} disabled={modalMode === 'view'}>
                    <option value="">-- Chọn giáo viên --</option>
                    {foreignTeachers.map(t => <option key={t.id} value={t.full_name}>{t.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Trạng thái lớp *</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} disabled={modalMode === 'view'}>
                    <option value="Sắp khai giảng">Sắp khai giảng</option>
                    <option value="Đang học">Đang học</option>
                    <option value="Đã kết thúc">Đã kết thúc</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sỹ số tối đa</label>
                  <input type="number" value={formData.max_students} onChange={e => setFormData({ ...formData, max_students: parseInt(e.target.value) || 15 })} disabled={modalMode === 'view'} />
                </div>
                <div className="form-group">
                  <label>Ngày khai giảng</label>
                  <input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} disabled={modalMode === 'view'} />
                </div>
                <div className="form-group">
                  <label>Tổng số buổi học *</label>
                  <input type="number" value={formData.total_sessions} onChange={e => setFormData({ ...formData, total_sessions: parseInt(e.target.value) || 24 })} required disabled={modalMode === 'view'} />
                </div>
                <div className="form-group">
                  <label>Số giờ mỗi buổi *</label>
                  <input type="number" step="0.5" value={formData.hours_per_session} onChange={e => setFormData({ ...formData, hours_per_session: parseFloat(e.target.value) || 2 })} required disabled={modalMode === 'view'} />
                </div>
                <div className="form-group">
                  <label>Group Zalo lớp</label>
                  <input type="text" value={formData.zalo_group} onChange={e => setFormData({ ...formData, zalo_group: e.target.value })} placeholder="Link nhóm Zalo..." disabled={modalMode === 'view'} />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Cấu hình lịch học trong tuần</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {daysOfWeekList.map(day => {
                      const sch = (formData.schedules || []).find(s => s.dayOfWeek === day);
                      return (
                        <div key={day} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', width: '120px', fontWeight: 500 }}>
                            <input type="checkbox" checked={!!sch} disabled={modalMode === 'view'} onChange={e => handleScheduleChange(day, 'checked', e.target.checked ? 'true' : 'false')} />
                            {day}
                          </label>
                          {sch && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <input type="time" value={sch.startTime} disabled={modalMode === 'view'} onChange={e => handleScheduleChange(day, 'startTime', e.target.value)} style={{ padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                              <span>đến</span>
                              <input type="time" value={sch.endTime} disabled={modalMode === 'view'} onChange={e => handleScheduleChange(day, 'endTime', e.target.value)} style={{ padding: '0.25rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {modalMode !== 'view' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{currentClassId ? "Lưu thay đổi" : "Tạo lớp học"}</button>
                </div>
              )}
            </form>
          )}

          {/* TAB 2: STUDENTS */}
          {activeTab === 'students' && currentClassId && (
            <div>
              {modalMode !== 'view' && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>Thêm học viên có sẵn gói học vào lớp:</label>
                    <input 
                      type="text" 
                      placeholder="🔍 Gõ Mã hoặc Tên học viên để tìm nhanh..." 
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.5rem' }}
                    />
                    <select value={selectedEnrollmentId} onChange={e => setSelectedEnrollmentId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                      <option value="">-- Chọn học viên (Chỉ hiện học sinh có giờ dư) --</option>
                      {availableStudents.filter(e => {
                        const searchStr = `${e.students?.id || ''} ${e.students?.full_name || ''} ${e.students?.nickname || ''}`.toLowerCase();
                        return searchStr.includes(studentSearchTerm.toLowerCase());
                      }).map(e => (
                        <option key={e.id} value={e.id}>[{e.students?.id}] {e.students?.full_name} {e.students?.nickname ? `(${e.students.nickname})` : ''} - Gói: {e.id.substring(0,8)} (Dư {e.remaining_hours}h)</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => addStudentToClass(selectedEnrollmentId)} disabled={!selectedEnrollmentId} style={{ marginTop: '1.25rem' }}>Thêm vào lớp</button>
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>Danh sách Học viên trong lớp</h4>
              {classStudents.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>Chưa có học viên nào trong lớp này.</div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="crm-table">
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem' }}>Học viên</th>
                        <th style={{ padding: '0.75rem' }}>Liên hệ Phụ huynh</th>
                        <th style={{ padding: '0.75rem' }}>Ngày sinh & Nhập học</th>
                        <th style={{ padding: '0.75rem' }}>Số giờ còn lại</th>
                        <th style={{ padding: '0.75rem' }}>Razkids</th>
                        <th style={{ padding: '0.75rem' }}>BTVN Padlet</th>
                        {modalMode !== 'view' && <th style={{ padding: '0.75rem' }}>Hành động</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map(cs => (
                        <tr key={cs.id}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span 
                                style={{ cursor: 'pointer', color: '#2563eb' }}
                                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                onClick={() => handleOpenStudentDetail(cs.student_id, cs.students)}
                              >
                                [{cs.student_id}] {cs.students?.full_name} {cs.students?.nickname ? `(${cs.students.nickname})` : ''}
                              </span>
                              {cs.students?.padlet_url && (
                                <a 
                                  href={cs.students.padlet_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  title="Mở Padlet của học viên"
                                  style={{ color: '#db2777', display: 'flex', alignItems: 'center' }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>
                            {redFlags[cs.student_id] && (
                              <span style={{ fontSize: '0.75rem', color: '#dc2626', fontWeight: 'bold' }}>🚩 Báo động đỏ: {redFlags[cs.student_id].reason}</span>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', color: '#475569' }}>{cs.students?.parent_phone || '---'}</td>
                          <td style={{ padding: '0.75rem', color: '#475569', fontSize: '0.9rem' }}>
                            <div>🎂 {cs.students?.dob ? new Date(cs.students.dob).toLocaleDateString('vi-VN') : '---'}</div>
                            <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '2px' }}>📅 Nhập học: {cs.students?.created_at ? new Date(cs.students.created_at).toLocaleDateString('vi-VN') : '---'}</div>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '1rem', color: (cs.enrollments?.remaining_hours || 0) < 48 ? '#ef4444' : (cs.enrollments?.remaining_hours || 0) <= 96 ? '#9333ea' : '#16a34a' }}>
                              {cs.enrollments?.remaining_hours || 0}h
                            </div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: (cs.enrollments?.remaining_hours || 0) < 48 ? '#ef4444' : (cs.enrollments?.remaining_hours || 0) <= 96 ? '#9333ea' : '#16a34a', opacity: 0.8, marginTop: '2px' }}>
                              ~ {Math.round(((cs.enrollments?.remaining_hours || 0) / 16) * 2) / 2} tháng
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <PadletStatsCell 
                              padletApiUrl={cs.students?.padlet_api} 
                              type="Razkids" 
                              loading={loadingPadletBatch} 
                              data={cs.students?.padlet_api ? padletBatchData[cs.students.padlet_api] : null} 
                            />
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <PadletStatsCell 
                              padletApiUrl={cs.students?.padlet_api} 
                              type="BTVN" 
                              loading={loadingPadletBatch} 
                              data={cs.students?.padlet_api ? padletBatchData[cs.students.padlet_api] : null} 
                            />
                          </td>
                          {modalMode !== 'view' && (
                            <td style={{ padding: '0.75rem' }}>
                              <button type="button" onClick={() => removeStudentFromClass(cs.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Trash2 size={14} /> Xóa khỏi lớp</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SESSIONS */}
          {activeTab === 'sessions' && currentClassId && (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: '#f0fdf4', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.85rem', fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={autoCascade}
                    onChange={(e) => setAutoCascade(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#166534', cursor: 'pointer' }}
                  />
                  Tự động tính lùi ngày các buổi học phía sau khi thay đổi (Hiệu ứng Domino)
                </label>
              </div>

              {modalMode !== 'view' && (
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => generateSessions(false)} disabled={isSubmitting}>Tạo tự động theo lịch học</button>
                  <button type="button" className="btn btn-secondary" onClick={() => generateSessions(true)} style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }} disabled={isSubmitting}>Tạo lại từ đầu</button>
                  {classSessions.length > formData.total_sessions && (
                    <button type="button" className="btn btn-secondary" onClick={removeExcessSessions} style={{ color: '#d97706', borderColor: '#fde68a', background: '#fffbeb' }} disabled={isSubmitting}>Xóa buổi thừa</button>
                  )}
                  <button type="button" className="btn btn-primary" onClick={handleSaveAllSessions} style={{ marginLeft: 'auto' }} disabled={isSubmitting}><Save size={16} style={{ marginRight: '0.25rem', display: 'inline', verticalAlign: 'middle' }} /> Lưu tất cả</button>
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>Lộ trình & Nội dung chi tiết từng buổi học</h4>
              {classSessions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>Chưa thiết lập lộ trình cho lớp này. Nhấn nút "Tạo tự động" ở trên để khởi tạo.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {classSessions.map(s => (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '80px 140px 1fr auto', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>Buổi {s.session_number}</strong>
                      <input type="date" value={s.date || ""} onChange={e => updateSession(s.id, 'date', e.target.value)} disabled={modalMode === 'view'} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} />
                      <input type="text" value={s.content || ""} onChange={e => updateSession(s.id, 'content', e.target.value)} disabled={modalMode === 'view'} placeholder="Nội dung/Giáo án buổi học..." style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%' }} />
                      
                      {(() => {
                        const totalStudents = classStudents.length;
                        const attList = s.attendance || [];
                        const checkedCount = attList.filter((a: any) => a.presence_status && a.presence_status !== '').length;
                        const presentCount = attList.filter((a: any) => a.presence_status === 'Có mặt').length;
                        
                        const handleGoToAttendance = () => {
                          setSelectedSessionId(s.id);
                          setActiveTab('attendance');
                        };
                        
                        if (totalStudents === 0) return <div style={{ fontSize: '0.85rem', color: '#94a3b8', width: '120px', textAlign: 'right' }}>Chưa có HV</div>;
                        
                        if (checkedCount === totalStudents && totalStudents > 0) {
                          return <div onClick={handleGoToAttendance} title={`Đã điểm danh đầy đủ. Có ${presentCount} học viên Có mặt. Nhấn để xem chi tiết.`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem', width: '120px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}><CheckCircle size={16} /> {checkedCount}/{totalStudents} ({presentCount})</div>;
                        } else {
                          return <div onClick={handleGoToAttendance} title={`Chưa điểm danh đủ. Có ${presentCount} học viên Có mặt. Nhấn để điểm danh ngay.`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.35rem', color: '#d97706', fontWeight: 600, fontSize: '0.85rem', width: '120px', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.7'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}><AlertTriangle size={16} /> {checkedCount}/{totalStudents} ({presentCount})</div>;
                        }
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ATTENDANCE */}
          {activeTab === 'attendance' && currentClassId && (
            <div>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>Chọn buổi học cần điểm danh:</label>
                  <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                    {classSessions.map(s => (
                      <option key={s.id} value={s.id}>Buổi {s.session_number} ({s.date ? new Date(s.date).toLocaleDateString("vi-VN") : "Chưa có ngày"})</option>
                    ))}
                  </select>
                </div>
                {modalMode !== 'view' && selectedSessionId && (
                  <button type="button" className="btn btn-primary" onClick={handleSaveAttendance} disabled={isSubmitting} style={{ marginTop: '1.25rem' }}><CheckCircle size={16} style={{ marginRight: '0.25rem', display: 'inline', verticalAlign: 'middle' }} /> Lưu Điểm Danh</button>
                )}
              </div>

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>Bảng điểm danh buổi học</h4>
              {classStudents.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>Không thể điểm danh vì chưa có học viên nào trong lớp.</div>
              ) : !selectedSessionId ? (
                <div style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>Vui lòng chọn một buổi học để hiển thị danh sách điểm danh.</div>
              ) : (
                <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                  <table className="crm-table">
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '0.75rem' }}>Học viên</th>
                        <th style={{ padding: '0.75rem' }}>Trạng thái điểm danh *</th>
                        <th style={{ padding: '0.75rem' }}>Bài tập về nhà</th>
                        <th style={{ padding: '0.75rem', width: '130px', textAlign: 'center' }}>Thưởng điểm ⭐</th>
                        <th style={{ padding: '0.75rem' }}>Nhận xét của giáo viên</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classStudents.map(cs => {
                        const att = attendanceData.find(item => item.student_id === cs.student_id) || { presence_status: "", homework_status: "", teacher_notes: "" };
                        return (
                          <tr key={cs.id}>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span 
                                  style={{ cursor: 'pointer', color: '#2563eb' }}
                                  onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                                  onClick={() => handleOpenStudentDetail(cs.student_id, cs.students)}
                                >
                                  {cs.students?.full_name} {cs.students?.nickname ? `(${cs.students.nickname})` : ''}
                                </span>
                                {cs.students?.padlet_url && (
                                  <a 
                                    href={cs.students.padlet_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    title="Mở Padlet của học viên"
                                    style={{ color: '#db2777', display: 'flex', alignItems: 'center' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <ExternalLink size={14} />
                                  </a>
                                )}
                              </div>
                              {cs.students?.target_points ? (
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                  Mục tiêu: <strong style={{ color: '#0f172a' }}>{cs.students.target_points}</strong> ⭐
                                </div>
                              ) : null}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              {(() => {
                                const status = att.presence_status || "";
                                let bg = "#ffffff", text = "#0f172a", border = "#cbd5e1";
                                if (status === "Có mặt") { bg = "#dcfce7"; text = "#16a34a"; border = "#bbf7d0"; }
                                else if (status === "Vắng phép") { bg = "#fef3c7"; text = "#d97706"; border = "#fde68a"; }
                                else if (status === "Không phép") { bg = "#fce7f3"; text = "#db2777"; border = "#fbcfe8"; }
                                else if (status === "Chuyển lớp") { bg = "#f3e8ff"; text = "#9333ea"; border = "#e9d5ff"; }
                                else if (status === "Dừng học") { bg = "#f1f5f9"; text = "#475569"; border = "#e2e8f0"; }
                                
                                return (
                                  <select 
                                    value={status} 
                                    disabled={modalMode === 'view'} 
                                    onChange={e => handleAttendanceChange(cs.student_id, 'presence_status', e.target.value)} 
                                    style={{ 
                                      padding: '0.35rem', 
                                      borderRadius: '4px', 
                                      border: `1px solid ${border}`,
                                      backgroundColor: bg,
                                      color: text,
                                      fontWeight: status !== "" ? 600 : 400,
                                      outline: 'none',
                                      width: '100%'
                                    }}
                                  >
                                    <option value="" style={{backgroundColor: '#fff', color: '#94a3b8'}}>-- Chưa điểm danh --</option>
                                    <option value="Chưa vào lớp" style={{backgroundColor: '#fff', color: '#0f172a'}}>Chưa vào lớp</option>
                                    <option value="Có mặt" style={{backgroundColor: '#fff', color: '#16a34a'}}>Có mặt</option>
                                    <option value="Vắng phép" style={{backgroundColor: '#fff', color: '#d97706'}}>Vắng phép</option>
                                    <option value="Không phép" style={{backgroundColor: '#fff', color: '#db2777'}}>Không phép</option>
                                    <option value="Chuyển lớp" style={{backgroundColor: '#fff', color: '#9333ea'}}>Chuyển lớp</option>
                                    <option value="Dừng học" style={{backgroundColor: '#fff', color: '#475569'}}>Dừng học</option>
                                  </select>
                                );
                              })()}
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <select value={att.homework_status || ""} disabled={modalMode === 'view'} onChange={e => handleAttendanceChange(cs.student_id, 'homework_status', e.target.value)} style={{ padding: '0.35rem', borderRadius: '4px', border: '1px solid #cbd5e1' }}>
                                <option value="">-- Chưa đánh giá --</option>
                                <option value="Hoàn thành">Hoàn thành</option>
                                <option value="Chưa hoàn thành">Chưa hoàn thành</option>
                                <option value="Không nộp">Không nộp</option>
                              </select>
                            </td>
                            <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                                <button
                                  type="button"
                                  disabled={modalMode === 'view'}
                                  onClick={() => handleAttendanceChange(cs.student_id, 'bonus_points', Math.max(0, (Number(att.bonus_points) || 0) - 5))}
                                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: modalMode === 'view' ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#64748b' }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  value={att.bonus_points || ''}
                                  disabled={modalMode === 'view'}
                                  onChange={e => handleAttendanceChange(cs.student_id, 'bonus_points', Number(e.target.value) || 0)}
                                  placeholder="0"
                                  style={{ width: '60px', padding: '0.25rem', textAlign: 'center', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                />
                                <button
                                  type="button"
                                  disabled={modalMode === 'view'}
                                  onClick={() => handleAttendanceChange(cs.student_id, 'bonus_points', (Number(att.bonus_points) || 0) + 5)}
                                  style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '0.25rem 0.5rem', cursor: modalMode === 'view' ? 'not-allowed' : 'pointer', fontWeight: 'bold', color: '#64748b' }}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td style={{ padding: '0.75rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ 
                                  flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', 
                                  maxWidth: '130px', fontSize: '0.85rem', color: att.teacher_notes ? '#334155' : '#94a3b8' 
                                }}>
                                  {att.teacher_notes || "Chưa có nhận xét"}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (modalMode !== 'view') {
                                      setNoteModalOpen({
                                        studentId: cs.student_id,
                                        studentName: cs.students?.full_name || cs.student_id,
                                        currentNote: att.teacher_notes || ""
                                      });
                                    } else {
                                      alert("Chế độ xem không cho phép sửa nhận xét.");
                                    }
                                  }}
                                  className="btn btn-sm"
                                  style={{ padding: '0.25rem 0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '4px', cursor: modalMode === 'view' ? 'not-allowed' : 'pointer', position: 'relative', zIndex: 10 }}
                                  disabled={modalMode === 'view'}
                                  title="Soạn nhận xét chi tiết"
                                >
                                  📝
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>

        {noteModalOpen && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'inherit' }}>
            <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '8px', width: '400px', maxWidth: '90%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem', fontWeight: 600 }}>Nhận xét: {noteModalOpen.studentName}</h3>
              <textarea
                value={noteModalOpen.currentNote}
                onChange={(e) => setNoteModalOpen({ ...noteModalOpen, currentNote: e.target.value })}
                style={{ width: '100%', height: '150px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.9rem' }}
                placeholder="Nhập nhận xét chi tiết của giáo viên về buổi học hôm nay..."
                autoFocus
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button onClick={() => setNoteModalOpen(null)} style={{ padding: '0.5rem 1rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Hủy bỏ</button>
                <button onClick={() => {
                  handleSaveTeacherNoteToDB(noteModalOpen.studentId, noteModalOpen.currentNote);
                }} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>Lưu Nhận Xét</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {isStudentModalOpen && selectedStudentId && (
        <StudentModal
          isOpen={isStudentModalOpen}
          onClose={() => setIsStudentModalOpen(false)}
          studentId={selectedStudentId}
          initialStudent={selectedStudentData}
          activeRole={activeRole}
          activeBranch={activeBranch}
          isReadOnly={activeRole === "Sale" || activeRole === "Nhân viên Sale" || modalMode === "view"}
          onSuccess={() => {
            if (currentClassId) {
              fetchClassDetails(currentClassId, formData.branch_id || activeBranch);
            }
          }}
        />
      )}
    </div>
  );
}

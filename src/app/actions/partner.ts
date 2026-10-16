"use server";

import { createClient } from "@supabase/supabase-js";

const lmsClient = createClient(
  process.env.LMS_SUPABASE_URL || "https://wdufouywktbxltixrycw.supabase.co",
  process.env.LMS_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface PartnerCourse {
  id: string;
  title: string;
  description: string | null;
  department: string | null;
  price: number;
  image_url: string | null;
  is_published: boolean;
  lesson_count?: number;
  student_count?: number;
}

export async function getPartnerCourses(userEmail: string, userDepartment?: string) {
  try {
    if (!userEmail) return { success: true, data: [] };

    const email = userEmail.toLowerCase().trim();

    // 1. Lấy tất cả khóa học từ LMS
    const { data: courses, error } = await lmsClient
      .from("courses")
      .select("id, title, description, department, price, image_url, target_audiences, is_published");

    if (error) throw error;
    if (!courses || courses.length === 0) return { success: true, data: [] };

    // 2. Lọc chính xác các khóa học thuộc quyền sở hữu của Đối tác này
    const myCourses = courses.filter((c: any) => {
      const ta = Array.isArray(c.target_audiences) ? c.target_audiences : [];
      const isAssigned = ta.some((tag: string) => tag.toLowerCase() === `instructor:${email}`);
      const isDept = userDepartment && c.department && c.department.toLowerCase() === userDepartment.toLowerCase();
      const isDancesportLegacy = email.includes("thaytan") && c.department === "Dancesport";
      return isAssigned || isDept || isDancesportLegacy;
    });

    if (myCourses.length === 0) {
      return { success: true, data: [] };
    }

    // 3. Đếm số lượng bài học và học viên cho từng khóa của Thầy
    const courseIds = myCourses.map(c => c.id);

    // Lấy modules để tính số bài học
    const { data: modules } = await lmsClient
      .from("course_modules")
      .select("id, course_id")
      .in("course_id", courseIds);

    const moduleIds = modules?.map(m => m.id) || [];
    let lessonCounts: Record<string, number> = {};

    if (moduleIds.length > 0) {
      const { data: lessons } = await lmsClient
        .from("course_lessons")
        .select("id, module_id")
        .in("module_id", moduleIds);

      if (lessons && modules) {
        lessons.forEach(l => {
          const mod = modules.find(m => m.id === l.module_id);
          if (mod) {
            lessonCounts[mod.course_id] = (lessonCounts[mod.course_id] || 0) + 1;
          }
        });
      }
    }

    // Đếm học viên tham gia (loại trừ tài khoản của chính giảng viên)
    const { data: partnerProf } = await lmsClient
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    const partnerUid = partnerProf?.id;

    const { data: enrollments } = await lmsClient
      .from("course_enrollments")
      .select("course_id, user_id")
      .in("course_id", courseIds);

    const studentCounts: Record<string, number> = {};
    if (enrollments) {
      enrollments.forEach(en => {
        if (en.user_id !== partnerUid) {
          studentCounts[en.course_id] = (studentCounts[en.course_id] || 0) + 1;
        }
      });
    }

    const result: PartnerCourse[] = myCourses.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      department: c.department,
      price: c.price || 0,
      image_url: c.image_url,
      is_published: c.is_published ?? true,
      lesson_count: lessonCounts[c.id] || 0,
      student_count: studentCounts[c.id] || 0
    }));

    return { success: true, data: result };
  } catch (err: any) {
    console.error("Lỗi lấy danh sách khóa học của đối tác:", err);
    return { success: false, error: err.message, data: [] };
  }
}

const crmClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qrvxaoabzhxgcjjejffq.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface PartnerStudentItem {
  id: string; // user_id
  enrollmentId: string;
  name: string;
  age?: number;
  phone: string;
  course: string;
  courseId: string;
  progress: number;
  lastLesson: string;
  joinDate: string;
  notes: string;
}

export async function getPartnerStudents(userEmail: string, userDepartment?: string) {
  try {
    if (!userEmail) return { success: true, data: [], courses: [] };

    // 1. Lấy danh sách khóa học của đối tác
    const coursesRes = await getPartnerCourses(userEmail, userDepartment);
    if (!coursesRes.success || !coursesRes.data || coursesRes.data.length === 0) {
      return { success: true, data: [], courses: [] };
    }

    const partnerCourses = coursesRes.data;
    const courseIds = partnerCourses.map(c => c.id);

    // 2. Lấy danh sách ghi danh từ LMS
    const { data: enrollments, error: enrError } = await lmsClient
      .from("course_enrollments")
      .select("id, course_id, user_id, created_at, access_count, last_accessed_at")
      .in("course_id", courseIds)
      .order("created_at", { ascending: false });

    if (enrError) throw enrError;
    if (!enrollments || enrollments.length === 0) {
      return { success: true, data: [], courses: partnerCourses };
    }

    const userIds = enrollments.map(e => e.user_id).filter(Boolean);

    // 3. Lấy thông tin profiles
    const { data: profiles, error: profError } = await lmsClient
      .from("profiles")
      .select("id, full_name, email, phone, student_code, branch, role")
      .in("id", userIds);

    if (profError) throw profError;

    // 4. Lấy modules và lessons để tính tiến độ
    const { data: modules } = await lmsClient
      .from("course_modules")
      .select("id, course_id, title")
      .in("course_id", courseIds);

    const moduleIds = modules?.map(m => m.id) || [];
    let lessons: any[] = [];
    if (moduleIds.length > 0) {
      const { data: lessonData } = await lmsClient
        .from("course_lessons")
        .select("id, module_id, title, order")
        .in("module_id", moduleIds)
        .order("order", { ascending: true });
      lessons = lessonData || [];
    }

    // Đếm tổng số bài học theo từng khóa
    const totalLessonsPerCourse: Record<string, number> = {};
    const lessonsByCourse: Record<string, any[]> = {};
    if (modules && lessons) {
      modules.forEach(m => {
        const modLessons = lessons.filter(l => l.module_id === m.id);
        totalLessonsPerCourse[m.course_id] = (totalLessonsPerCourse[m.course_id] || 0) + modLessons.length;
        if (!lessonsByCourse[m.course_id]) lessonsByCourse[m.course_id] = [];
        lessonsByCourse[m.course_id].push(...modLessons);
      });
    }

    // Lấy tiến độ hoàn thành từ course_progress
    const lessonIds = lessons.map(l => l.id);
    let completedLessonsByUser: Record<string, string[]> = {};

    if (lessonIds.length > 0 && userIds.length > 0) {
      const { data: progressRecords } = await lmsClient
        .from("course_progress")
        .select("user_id, lesson_id")
        .in("user_id", userIds)
        .in("lesson_id", lessonIds);

      if (progressRecords) {
        progressRecords.forEach(pr => {
          if (!completedLessonsByUser[pr.user_id]) completedLessonsByUser[pr.user_id] = [];
          completedLessonsByUser[pr.user_id].push(pr.lesson_id);
        });
      }
    }

    // 5. Tổng hợp dữ liệu học viên (Lọc bỏ tài khoản của chính Giảng viên Đối tác nếu có trong khóa)
    const normalizedPartnerEmail = userEmail.toLowerCase().trim();
    const studentEnrollments = enrollments.filter(enr => {
      const prof = profiles?.find(p => p.id === enr.user_id);
      if (!prof) return true;
      if (prof.email && prof.email.toLowerCase().trim() === normalizedPartnerEmail) return false;
      return true;
    });

    const students: PartnerStudentItem[] = studentEnrollments.map(enr => {
      const prof = profiles?.find(p => p.id === enr.user_id);
      const course = partnerCourses.find(c => c.id === enr.course_id);
      const courseTotal = totalLessonsPerCourse[enr.course_id] || 0;
      
      const userCompletedLessonIds = completedLessonsByUser[enr.user_id] || [];
      const courseLessons = lessonsByCourse[enr.course_id] || [];
      const completedCountInThisCourse = courseLessons.filter(l => userCompletedLessonIds.includes(l.id)).length;
      
      const progressPercent = courseTotal > 0 ? Math.round((completedCountInThisCourse / courseTotal) * 100) : 0;

      // Tìm bài học gần nhất đã xem/hoàn thành
      let lastLessonName = "Chưa bắt đầu";
      if (completedCountInThisCourse > 0) {
        const lastCompleted = courseLessons.find(l => userCompletedLessonIds.includes(l.id));
        if (lastCompleted) {
          lastLessonName = lastCompleted.title;
        }
      }

      // Trích xuất SĐT chuẩn
      let displayPhone = prof?.phone || "";
      if (!displayPhone && prof?.student_code?.startsWith("PARTNER_")) {
        displayPhone = prof.student_code.replace("PARTNER_", "");
      }
      if (!displayPhone && prof?.student_code?.startsWith("DT_")) {
        displayPhone = prof.student_code.replace("DT_", "");
      }
      if (!displayPhone && prof?.email?.includes("@vicedu.local")) {
        const match = prof.email.match(/^(\d+)@/);
        if (match) displayPhone = match[1];
      }

      const joinDateStr = enr.created_at ? new Date(enr.created_at).toLocaleDateString("vi-VN") : "Hôm nay";

      return {
        id: enr.user_id,
        enrollmentId: enr.id,
        name: prof?.full_name || "Học viên",
        phone: displayPhone || "—",
        course: course?.title || "Khóa học",
        courseId: enr.course_id,
        progress: progressPercent,
        lastLesson: lastLessonName,
        joinDate: joinDateStr,
        notes: prof?.student_code ? `Mã: ${prof.student_code}` : "Đang học tích cực"
      };
    });

    return { success: true, data: students, courses: partnerCourses };
  } catch (err: any) {
    console.error("Lỗi lấy danh sách học viên đối tác:", err);
    return { success: false, error: err.message, data: [], courses: [] };
  }
}

export async function enrollStudentByPartner(payload: {
  partnerEmail: string;
  partnerDepartment?: string;
  studentName: string;
  studentPhone: string;
  studentAge?: number;
  notes?: string;
  courseId?: string;
}) {
  try {
    const { partnerEmail, partnerDepartment, studentName, studentPhone, studentAge, notes, courseId } = payload;

    if (!partnerEmail) {
      return { success: false, error: "Thiếu thông tin tài khoản đối tác" };
    }
    if (!studentName || !studentName.trim()) {
      return { success: false, error: "Vui lòng nhập họ và tên học viên" };
    }
    if (!studentPhone || !studentPhone.trim()) {
      return { success: false, error: "Vui lòng nhập số điện thoại học viên" };
    }

    // Làm sạch số điện thoại: bỏ khoảng trắng, dấu gạch nối, dấu chấm
    const cleanPhone = studentPhone.replace(/\D/g, "");
    if (cleanPhone.length < 9 || cleanPhone.length > 11) {
      return { success: false, error: "Số điện thoại không hợp lệ (cần từ 9 đến 11 chữ số)" };
    }

    // 1. Xác định khóa học mục tiêu
    let targetCourseId = courseId;
    let targetCourseTitle = "Khóa học";

    const coursesRes = await getPartnerCourses(partnerEmail, partnerDepartment);
    if (!coursesRes.success || !coursesRes.data || coursesRes.data.length === 0) {
      return { success: false, error: "Đối tác chưa được gán khóa học nào. Vui lòng liên hệ Admin." };
    }

    if (!targetCourseId) {
      targetCourseId = coursesRes.data[0].id;
      targetCourseTitle = coursesRes.data[0].title;
    } else {
      const found = coursesRes.data.find(c => c.id === targetCourseId);
      if (found) targetCourseTitle = found.title;
    }

    const email = `${cleanPhone}@vicedu.local`;
    let studentUserId: string | null = null;

    // 2. Kiểm tra xem profile đã tồn tại trong LMS chưa
    const { data: existingProfiles } = await lmsClient
      .from("profiles")
      .select("id, full_name, phone, email")
      .or(`phone.eq.${cleanPhone},email.eq.${email}`)
      .limit(1);

    if (existingProfiles && existingProfiles.length > 0) {
      studentUserId = existingProfiles[0].id;
    } else {
      // Thử tạo auth user trong LMS
      const { data: authData, error: authErr } = await lmsClient.auth.admin.createUser({
        email,
        password: "Toiyeuvicedu",
        email_confirm: true,
        user_metadata: {
          full_name: studentName.trim(),
          phone: cleanPhone,
          role: "GUEST_STUDENT"
        }
      });

      if (authErr) {
        if (authErr.message?.toLowerCase().includes("already") || (authErr as any).code === "email_exists") {
          const { data: userList } = await lmsClient.auth.admin.listUsers();
          const matched = userList?.users?.find(u => u.email === email);
          if (matched) {
            studentUserId = matched.id;
          } else {
            throw authErr;
          }
        } else {
          throw authErr;
        }
      } else if (authData?.user) {
        studentUserId = authData.user.id;
      }
    }

    if (!studentUserId) {
      return { success: false, error: "Không thể khởi tạo tài khoản học viên trong hệ thống LMS" };
    }

    // 3. Cập nhật / Upsert profile trong LMS
    await lmsClient.from("profiles").upsert({
      id: studentUserId,
      full_name: studentName.trim(),
      phone: cleanPhone,
      email,
      role: "GUEST_STUDENT",
      student_code: `DT_${cleanPhone.slice(-6)}`,
      branch: "Đối tác"
    }, { onConflict: "id" });

    // 4. Kiểm tra xem đã ghi danh vào khóa học này chưa
    const { data: existingEnr } = await lmsClient
      .from("course_enrollments")
      .select("id")
      .eq("course_id", targetCourseId)
      .eq("user_id", studentUserId)
      .maybeSingle();

    if (existingEnr) {
      return {
        success: false,
        error: `Học viên "${studentName.trim()}" (${cleanPhone}) đã có trong danh sách khóa học "${targetCourseTitle}" rồi!`
      };
    }

    // Gán vào khóa học LMS
    const { error: insErr } = await lmsClient
      .from("course_enrollments")
      .insert({
        course_id: targetCourseId,
        user_id: studentUserId,
        access_count: 0
      });

    if (insErr) throw insErr;

    // Xóa bản ghi dùng thử nếu có
    await lmsClient
      .from("course_trials")
      .delete()
      .eq("course_id", targetCourseId)
      .eq("user_id", studentUserId);

    // 5. Đồng bộ vào CRM Leads (Web 1)
    try {
      await crmClient.from("leads").upsert({
        phone: cleanPhone,
        full_name: studentName.trim(),
        email: email,
        branch_id: "Đối tác",
        status: "Đang học",
        updated_at: new Date().toISOString()
      }, { onConflict: "phone" });

      await crmClient.from("customer_activities").insert({
        phone: cleanPhone,
        activity_type: "PARTNER_ENROLL",
        description: `Đối tác (${partnerEmail}) thêm học viên vào khóa học: "${targetCourseTitle}". Ghi chú: ${notes || "Không"}`,
        created_at: new Date().toISOString()
      });
    } catch (crmError) {
      console.warn("Lưu CRM Leads song song không bắt buộc có lỗi nhẹ:", crmError);
    }

    return { 
      success: true, 
      studentId: studentUserId,
      message: `Đã cấp quyền học thành công cho học viên ${studentName.trim()} (${cleanPhone})!`
    };
  } catch (err: any) {
    console.error("Lỗi khi đối tác thêm học viên:", err);
    return { success: false, error: err.message || "Đã xảy ra lỗi khi thêm học viên" };
  }
}

export async function removeStudentByPartner(courseId: string, userId: string) {
  try {
    const { error } = await lmsClient
      .from("course_enrollments")
      .delete()
      .eq("course_id", courseId)
      .eq("user_id", userId);

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Lỗi xóa học viên khỏi khóa:", err);
    return { success: false, error: err.message };
  }
}


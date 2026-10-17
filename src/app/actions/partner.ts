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

export interface CourseLessonItem {
  id: string;
  title: string;
  order: number;
  duration?: string;
  isFree?: boolean;
  type?: string;
}

export interface CourseModuleItem {
  id: string;
  title: string;
  order: number;
  lessons: CourseLessonItem[];
}

export async function getCourseModulesAndLessons(courseId: string) {
  try {
    if (!courseId) return { success: true, data: [] };

    // 1. Lấy danh sách modules (Chương / Học phần)
    const { data: modules, error: modErr } = await lmsClient
      .from("course_modules")
      .select("id, title, order")
      .eq("course_id", courseId)
      .order("order", { ascending: true });

    if (modErr) throw modErr;
    if (!modules || modules.length === 0) {
      return { success: true, data: [] };
    }

    const moduleIds = modules.map(m => m.id);

    // 2. Lấy danh sách bài học thực tế
    const { data: lessons, error: lesErr } = await lmsClient
      .from("course_lessons")
      .select("id, module_id, title, order, is_free, type, youtube_id")
      .in("module_id", moduleIds)
      .order("order", { ascending: true });

    if (lesErr) throw lesErr;

    const result: CourseModuleItem[] = modules.map(m => ({
      id: m.id,
      title: m.title,
      order: m.order,
      lessons: (lessons || [])
        .filter(l => l.module_id === m.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(l => ({
          id: l.id,
          title: l.title,
          order: l.order,
          duration: l.type === "quiz" ? "Trắc nghiệm" : (l.youtube_id ? "Video YouTube" : "Bài giảng"),
          isFree: Boolean(l.is_free),
          type: l.type || "video"
        }))
    }));

    return { success: true, data: result };
  } catch (err: any) {
    console.error("Lỗi getCourseModulesAndLessons:", err);
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
  isVip?: boolean;
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
      .select("id, full_name, email, phone, student_code, branch, role, job_title")
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
      const isStudentVip = Boolean(prof?.job_title?.includes("VIP"));

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
        notes: prof?.student_code ? `Mã: ${prof.student_code}` : "Đang học tích cực",
        isVip: isStudentVip
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
  isVip?: boolean;
}) {
  try {
    const { partnerEmail, partnerDepartment, studentName, studentPhone, studentAge, notes, courseId, isVip } = payload;

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

    // 2. Kiểm tra xem profile đã tồn tại trong LMS chưa (theo phone hoặc email)
    const { data: existingProfiles } = await lmsClient
      .from("profiles")
      .select("id, full_name, phone, email, role, branch, student_code")
      .or(`phone.eq.${cleanPhone},email.eq.${email},email.eq.${cleanPhone}@vicedu.com`)
      .limit(1);

    let isExistingVicUser = false;
    let existingProfile: any = null;

    if (existingProfiles && existingProfiles.length > 0) {
      existingProfile = existingProfiles[0];
      studentUserId = existingProfile.id;
      // Nếu là học viên/phụ huynh/nhân sự nội bộ VicEdu
      if (["PARENTS", "STUDENT", "STAFF", "TEACHER", "SUPER_ADMIN"].includes(existingProfile.role)) {
        isExistingVicUser = true;
      }
    } else {
      // Kiểm tra thêm xem SĐT này có phải phụ huynh trong bảng students của Web 1 CRM không
      let detectedVicRole: string | null = null;
      let detectedVicBranch: string | null = null;
      let detectedParentName: string | null = null;

      try {
        const { data: crmStudents } = await crmClient
          .from("students")
          .select("parent_name, parent_phone, branch_id")
          .eq("parent_phone", cleanPhone)
          .limit(1);

        if (crmStudents && crmStudents.length > 0) {
          detectedVicRole = "PARENTS";
          detectedVicBranch = crmStudents[0].branch_id;
          detectedParentName = crmStudents[0].parent_name;
          isExistingVicUser = true;
        }
      } catch (checkErr) {
        console.warn("Check CRM parent phone skipped:", checkErr);
      }

      // Thử tạo auth user trong LMS
      const roleToCreate = detectedVicRole || "GUEST_STUDENT";
      const branchToCreate = detectedVicBranch || "Đối tác";
      const nameToCreate = detectedParentName || studentName.trim();

      const { data: authData, error: authErr } = await lmsClient.auth.admin.createUser({
        email,
        password: "Toiyeuvicedu",
        email_confirm: true,
        user_metadata: {
          full_name: nameToCreate,
          phone: cleanPhone,
          role: roleToCreate
        }
      });

      if (authErr) {
        if (authErr.message?.toLowerCase().includes("already") || (authErr as any).code === "email_exists") {
          const { data: userList } = await lmsClient.auth.admin.listUsers();
          const matched = userList?.users?.find(u => u.email === email || u.user_metadata?.phone === cleanPhone);
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

      // Khởi tạo profile cho user mới (nếu chưa có profile)
      if (studentUserId) {
        await lmsClient.from("profiles").upsert({
          id: studentUserId,
          full_name: nameToCreate,
          phone: cleanPhone,
          email,
          role: roleToCreate,
          student_code: `DT_${cleanPhone.slice(-6)}`,
          branch: branchToCreate,
          job_title: isVip ? "Học viên VIP" : "Học viên"
        }, { onConflict: "id" });
      }
    }

    if (!studentUserId) {
      return { success: false, error: "Không thể khởi tạo tài khoản học viên trong hệ thống LMS" };
    }

    // 3. NGUYÊN TẮC BẢO TỒN VAI TRÒ NỘI BỘ (ROLE PRESERVATION & SINGLE IDENTITY):
    // NẾU ĐÃ LÀ Phụ huynh (PARENTS), Học viên Vic (STUDENT), Nhân viên (STAFF)...
    // thì TUYỆT ĐỐI GIỮ NGUYÊN vai trò gốc, họ tên và chi nhánh của họ, KHÔNG bao giờ bị đè thành GUEST_STUDENT!
    if (!isExistingVicUser && existingProfile) {
      await lmsClient.from("profiles").update({
        full_name: studentName.trim(),
        phone: cleanPhone,
        job_title: isVip ? "Học viên VIP" : (existingProfile.job_title || "Học viên")
      }).eq("id", studentUserId);
    } else if (isExistingVicUser && isVip) {
      // Nếu là học viên/phụ huynh VicEdu được cấp gói VIP đối tác
      await lmsClient.from("profiles").update({
        job_title: "Học viên VIP"
      }).eq("id", studentUserId);
    }

    // Đảm bảo mở khóa tài khoản Auth (Unban) nếu tài khoản này từng bị khóa do con nghỉ học ở VicEdu
    try {
      await lmsClient.auth.admin.updateUserById(studentUserId, {
        ban_duration: 'none'
      });
    } catch (unbanErr) {
      console.warn("Mở khóa auth user khi ghi danh đối tác:", unbanErr);
    }

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

    // 5. Đồng bộ vào CRM (Web 1)
    try {
      if (!isExistingVicUser) {
        await crmClient.from("leads").upsert({
          phone: cleanPhone,
          full_name: studentName.trim(),
          email: email,
          branch_id: "Chỉ Admin được dùng",
          status: "Đang học",
          updated_at: new Date().toISOString()
        }, { onConflict: "phone" });
      }

      await crmClient.from("customer_activities").insert({
        phone: cleanPhone,
        activity_type: "PARTNER_ENROLL",
        description: isExistingVicUser
          ? `Đối tác (${partnerEmail}) ghi danh thêm khóa học: "${targetCourseTitle}" cho Phụ huynh/Học viên nội bộ VicEdu. Ghi chú: ${notes || "Không"}`
          : `Đối tác (${partnerEmail}) thêm học viên vào khóa học: "${targetCourseTitle}". Ghi chú: ${notes || "Không"}`,
        created_at: new Date().toISOString()
      });
    } catch (crmError) {
      console.warn("Lưu CRM Leads song song không bắt buộc có lỗi nhẹ:", crmError);
    }

    let returnMessage = `Đã cấp quyền học thành công cho học viên ${studentName.trim()} (${cleanPhone})!`;
    if (isExistingVicUser) {
      const roleLabel = existingProfile?.role === "PARENTS" ? "Phụ huynh VicEdu" : existingProfile?.role === "STUDENT" ? "Học viên VicEdu" : "Thành viên VicEdu";
      returnMessage = `Học viên ${studentName.trim()} (${cleanPhone}) đã là ${roleLabel}. Hệ thống đã tự động gán thêm khóa học "${targetCourseTitle}" vào tài khoản hiện tại mà vẫn bảo toàn 100% vai trò và dữ liệu gốc!`;
    }

    return { 
      success: true, 
      studentId: studentUserId,
      isExistingVicUser,
      message: returnMessage
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

export async function getFilterCourseSources() {
  try {
    const { data: courses, error } = await lmsClient
      .from("courses")
      .select("id, title, department, target_audiences, is_published")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const validCourses = (courses || [])
      .filter((c: any) => {
        const titleLower = (c.title || "").toLowerCase();
        const isInternalStaff = titleLower.includes("nhân viên thử việc") || 
          titleLower.includes("dành cho kế toán") || 
          titleLower.includes("cấp quản lý") ||
          titleLower.includes("hướng dẫn");
        return !isInternalStaff;
      })
      .map((c: any) => {
        const titleLower = (c.title || "").toLowerCase();
        const ta = Array.isArray(c.target_audiences) ? c.target_audiences : [];
        const instTag = ta.find((t: string) => t.toLowerCase().startsWith("instructor:"));
        const instructorEmail = instTag ? instTag.replace(/instructor:/i, "").trim().toLowerCase() : "";

        let instructorLabel = "";
        if (instructorEmail.includes("thaytan") || c.department === "Dancesport" || titleLower.includes("dancesport") || titleLower.includes("khiêu vũ")) {
          instructorLabel = "💃 Thầy Tân (Dancesport)";
        } else if (instructorEmail.includes("covua") || titleLower.includes("cờ vua")) {
          instructorLabel = "♟️ Thầy Cờ Vua";
        } else if (titleLower.includes("tâm tuệ") || titleLower.includes("khen chê")) {
          instructorLabel = "🧠 Thầy Đức (Cha Mẹ Tâm Tuệ)";
        } else if (titleLower.includes("mc")) {
          instructorLabel = "🎤 Cô Trang (MC Nhí)";
        } else if (instructorEmail) {
          instructorLabel = `👤 Giảng viên: ${instructorEmail.split("@")[0]}`;
        } else {
          instructorLabel = `🎓 ${c.department || "Khóa Kỹ Năng"}`;
        }

        return {
          id: c.id,
          title: c.title,
          label: `${instructorLabel}: ${c.title}`,
          value: `COURSE:${c.title}`,
          instructorEmail
        };
      });

    return { success: true, data: validCourses };
  } catch (err: any) {
    console.error("Lỗi getFilterCourseSources:", err);
    return { success: false, data: [] };
  }
}

export async function getPartnerPracticeSubmissions(partnerEmail?: string, userDepartment?: string) {
  try {
    if (!partnerEmail) {
      return { success: true, data: [] };
    }

    const email = partnerEmail.toLowerCase().trim();

    // 1. Kiểm tra xem người dùng có phải là Super Admin hoặc Admin không
    const { data: userProfile } = await lmsClient
      .from("profiles")
      .select("role")
      .eq("email", email)
      .maybeSingle();

    const isSuperAdmin = userProfile?.role === "SUPER_ADMIN" || userProfile?.role === "ADMIN";

    // 2. Lấy danh sách khóa học thuộc quyền sở hữu của Giảng viên này
    let partnerCourseIds: string[] = [];
    let partnerCourseTitles: string[] = [];

    if (!isSuperAdmin) {
      const coursesRes = await getPartnerCourses(partnerEmail, userDepartment);
      if (!coursesRes.success || !coursesRes.data || coursesRes.data.length === 0) {
        // Đối tác chưa phụ trách khóa nào => tuyệt đối không hiển thị bài nộp của đối tác khác
        return { success: true, data: [] };
      }
      partnerCourseIds = coursesRes.data.map(c => c.id);
      partnerCourseTitles = coursesRes.data.map(c => (c.title || "").toLowerCase().trim());
    }

    // 3. Lấy bài nộp từ test_submissions
    const { data: subs, error } = await lmsClient
      .from("test_submissions")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(100);

    if (error) throw error;

    const practiceSubs = (subs || [])
      .filter((s: any) => {
        if (s.answers?.submission_type !== "PRACTICE_REVIEW") return false;

        // Nếu là Super Admin thì được xem tất cả
        if (isSuperAdmin) return true;

        // Phân quyền cách ly nghiêm ngặt: Chỉ xem bài nộp thuộc khóa học của Giảng viên này
        const subCourseId = s.answers?.course_id;
        const subCourseTitle = (s.answers?.course_title || "").toLowerCase().trim();

        const matchId = subCourseId && partnerCourseIds.includes(subCourseId);
        const matchTitle = subCourseTitle && partnerCourseTitles.some(t => subCourseTitle === t || subCourseTitle.includes(t) || t.includes(subCourseTitle));

        return matchId || matchTitle;
      })
      .map((s: any) => ({
        id: s.id,
        studentName: s.full_name || "Học viên VIP",
        studentPhone: s.phone || "",
        courseTitle: s.answers?.course_title || "Khóa học",
        lessonTitle: s.answers?.lesson_title || "Bài thực hành",
        submittedAt: s.submitted_at ? new Date(s.submitted_at).toLocaleString("vi-VN") : "",
        videoUrl: s.answers?.video_url || "",
        status: (s.status === "graded" || s.status === "reviewed" || s.teacher_feedback) ? ("reviewed" as const) : ("pending" as const),
        studentNotes: s.answers?.student_notes || "",
        teacherFeedback: s.teacher_feedback || "",
        score: s.score || 5
      }));

    return { success: true, data: practiceSubs };
  } catch (err: any) {
    console.error("Lỗi getPartnerPracticeSubmissions:", err);
    return { success: false, data: [] };
  }
}

export async function submitPracticeFeedback(
  submissionId: string, 
  feedback: string, 
  score: number = 5,
  partnerEmail?: string
) {
  try {
    const { data: subData, error: fetchErr } = await lmsClient
      .from("test_submissions")
      .select("*")
      .eq("id", submissionId)
      .maybeSingle();

    if (fetchErr) console.warn("Lỗi fetch submission:", fetchErr);
    if (!subData) {
      return { success: false, error: "Không tìm thấy bài nộp" };
    }

    // Bảo mật phân quyền: Xác thực giảng viên có quyền trên bài nộp này
    if (partnerEmail) {
      const email = partnerEmail.toLowerCase().trim();
      const { data: userProfile } = await lmsClient
        .from("profiles")
        .select("role")
        .eq("email", email)
        .maybeSingle();

      const isSuperAdmin = userProfile?.role === "SUPER_ADMIN" || userProfile?.role === "ADMIN";

      if (!isSuperAdmin) {
        const coursesRes = await getPartnerCourses(partnerEmail);
        const myCourseIds = coursesRes.data?.map(c => c.id) || [];
        const myCourseTitles = coursesRes.data?.map(c => (c.title || "").toLowerCase().trim()) || [];

        const subCourseId = subData.answers?.course_id;
        const subCourseTitle = (subData.answers?.course_title || "").toLowerCase().trim();

        const matchId = subCourseId && myCourseIds.includes(subCourseId);
        const matchTitle = subCourseTitle && myCourseTitles.some(t => subCourseTitle === t || subCourseTitle.includes(t) || t.includes(subCourseTitle));

        if (!matchId && !matchTitle) {
          return { success: false, error: "Bạn không có quyền nhận xét bài nộp của khóa học này!" };
        }
      }
    }

    const { error } = await lmsClient
      .from("test_submissions")
      .update({
        teacher_feedback: feedback.trim(),
        score,
        status: "reviewed",
        updated_at: new Date().toISOString()
      })
      .eq("id", submissionId);

    if (error) throw error;

    // Đồng bộ CRM & gửi thông báo cho học viên
    if (subData?.answers) {
      const answers = subData.answers;
      const studentPhone = answers.user_phone || subData.phone || "";
      const cleanPhone = studentPhone.replace(/\D/g, "");
      const lessonTitle = answers.lesson_title || "Bài thực hành";

      if (cleanPhone) {
        // 1. Ghi nhận customer_activities trong CRM
        const { data: customer } = await crmClient
          .from("customers")
          .select("id")
          .ilike("phone", `%${cleanPhone.slice(-9)}%`)
          .maybeSingle();

        if (customer?.id) {
          await crmClient.from("customer_activities").insert({
            customer_id: customer.id,
            activity_type: "PRACTICE_REVIEWED",
            notes: `Giảng viên đã nhận xét bài thực hành [${lessonTitle}]: "${feedback.trim().substring(0, 120)}..." (Điểm: ${score} sao)`,
            created_by: "system"
          });
        }

        // 2. Gửi chuông thông báo cho tài khoản học viên (nếu có trên CRM)
        const { data: studentUser } = await crmClient
          .from("users")
          .select("id")
          .ilike("phone", `%${cleanPhone.slice(-9)}%`)
          .maybeSingle();

        if (studentUser?.id) {
          await crmClient.from("notifications").insert({
            user_id: studentUser.id,
            title: `🎉 Thầy đã nhận xét bài của bạn!`,
            content: `Thầy đã nhận xét bài "${lessonTitle}". Hãy vào khóa học để xem chi tiết góp ý nhé!`,
            link_url: answers.course_id ? `/dashboard/courses/${answers.course_id}` : `/courses`,
            reference_id: submissionId
          });
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error("Lỗi submitPracticeFeedback:", err);
    return { success: false, error: err.message };
  }
}

export async function toggleStudentVipStatusByPartner(userId: string, isVip: boolean) {
  try {
    if (!userId) return { success: false, error: "Thiếu mã học viên" };
    const { error } = await lmsClient
      .from("profiles")
      .update({ job_title: isVip ? "Học viên VIP" : "Học viên" })
      .eq("id", userId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Lỗi toggleStudentVipStatusByPartner:", err);
    return { success: false, error: err.message };
  }
}



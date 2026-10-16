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

    // Đếm học viên tham gia
    const { data: enrollments } = await lmsClient
      .from("course_enrollments")
      .select("course_id")
      .in("course_id", courseIds);

    const studentCounts: Record<string, number> = {};
    if (enrollments) {
      enrollments.forEach(en => {
        studentCounts[en.course_id] = (studentCounts[en.course_id] || 0) + 1;
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

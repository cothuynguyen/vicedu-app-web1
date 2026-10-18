"use server";

import { createClient } from "@supabase/supabase-js";

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

const LMS_FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkdWZvdXl3a3RieGx0aXhyeWN3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzM2NDE1MywiZXhwIjoyMDk4OTQwMTUzfQ.GrP8DJBd0WbR3JMHhCUprZkcDY_UHwX0sLt9L8CUNy0";

const lmsClient = createClient(
  process.env.LMS_SUPABASE_URL || "https://wdufouywktbxltixrycw.supabase.co",
  process.env.LMS_SERVICE_ROLE_KEY || LMS_FALLBACK_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export interface PadletPoolItem {
  id: string;
  padlet_url: string;
  padlet_api: string;
  status: "available" | "assigned";
  assigned_to_student_id?: string | null;
  assigned_to_student_name?: string | null;
  assigned_at?: string | null;
  created_at: string;
  note?: string | null;
}

export interface PadletPoolStats {
  total: number;
  available: number;
  assigned: number;
  isLowStock: boolean;
  tableExists: boolean;
}

/**
 * 1. Lấy thống kê kho Padlet
 */
export async function getPadletPoolStats(): Promise<{ success: boolean; data: PadletPoolStats; error?: string }> {
  try {
    const { data, error } = await crmClient
      .from("padlet_pool")
      .select("id, status");

    if (error) {
      // Bảng chưa được tạo
      if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205") {
        return {
          success: true,
          data: { total: 0, available: 0, assigned: 0, isLowStock: false, tableExists: false }
        };
      }
      throw error;
    }

    const all = data || [];
    const available = all.filter(item => item.status === "available").length;
    const assigned = all.filter(item => item.status === "assigned").length;

    return {
      success: true,
      data: {
        total: all.length,
        available,
        assigned,
        isLowStock: available <= 5,
        tableExists: true
      }
    };
  } catch (err: any) {
    console.error("Lỗi getPadletPoolStats:", err);
    return {
      success: false,
      error: err.message,
      data: { total: 0, available: 0, assigned: 0, isLowStock: false, tableExists: false }
    };
  }
}

/**
 * 2. Lấy danh sách link trong kho
 */
export async function getPadletPoolList(statusFilter: "all" | "available" | "assigned" = "all") {
  try {
    let query = crmClient
      .from("padlet_pool")
      .select("*")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }

    const { data, error } = await query;
    if (error) {
      if (error.message?.includes("does not exist") || error.code === "42P01" || error.code === "PGRST205") {
        return { success: true, data: [] as PadletPoolItem[], tableExists: false };
      }
      throw error;
    }

    return { success: true, data: (data || []) as PadletPoolItem[], tableExists: true };
  } catch (err: any) {
    console.error("Lỗi getPadletPoolList:", err);
    return { success: false, error: err.message, data: [] as PadletPoolItem[], tableExists: false };
  }
}

/**
 * 3. Nạp danh sách link + API vào kho hàng loạt (Bulk Add)
 */
export async function addPadletsToPool(items: { padlet_url: string; padlet_api: string; note?: string }[]) {
  try {
    if (!items || items.length === 0) {
      return { success: false, error: "Danh sách link rỗng." };
    }

    // Làm sạch và kiểm tra định dạng
    const cleanedRows = items
      .map(item => {
        let u = (item.padlet_url || "").trim();
        let a = (item.padlet_api || "").trim();

        // Tự động thêm https nếu thiếu
        if (u && !u.startsWith("http://") && !u.startsWith("https://")) {
          u = `https://${u}`;
        }
        if (a && !a.startsWith("http://") && !a.startsWith("https://") && (a.includes("api.padlet.dev") || a.includes("padlet.com"))) {
          a = `https://${a}`;
        }

        return {
          padlet_url: u,
          padlet_api: a,
          status: "available",
          note: item.note ? item.note.trim() : null
        };
      })
      .filter(row => row.padlet_url && row.padlet_api);

    if (cleanedRows.length === 0) {
      return { success: false, error: "Không tìm thấy cặp Link Padlet & API hợp lệ nào để nạp." };
    }

    const { error } = await crmClient
      .from("padlet_pool")
      .insert(cleanedRows);

    if (error) throw error;

    return { 
      success: true, 
      count: cleanedRows.length,
      message: `Đã nạp thành công ${cleanedRows.length} link Padlet vào kho dự trữ!` 
    };
  } catch (err: any) {
    console.error("Lỗi addPadletsToPool:", err);
    return { success: false, error: err.message || "Lỗi khi nạp link vào kho" };
  }
}

/**
 * 4. Lấy và đánh dấu 1 link Padlet trống để cấp cho học viên (FIFO)
 */
export async function popAvailablePadlet(studentId: string, studentName: string) {
  try {
    const { data: available, error } = await crmClient
      .from("padlet_pool")
      .select("*")
      .eq("status", "available")
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) {
      console.warn("Lỗi truy vấn padlet_pool:", error);
      return { success: false, error: "Chưa cấu hình kho Padlet hoặc kho trống." };
    }

    if (!available || available.length === 0) {
      return { success: false, error: "Kho Padlet dự trữ đã hết link khả dụng!" };
    }

    const item = available[0];

    // Cập nhật trạng thái thành đã cấp
    const { error: updateErr } = await crmClient
      .from("padlet_pool")
      .update({
        status: "assigned",
        assigned_to_student_id: studentId,
        assigned_to_student_name: studentName,
        assigned_at: new Date().toISOString()
      })
      .eq("id", item.id);

    if (updateErr) throw updateErr;

    // Đếm số lượng còn lại trong kho
    const { count } = await crmClient
      .from("padlet_pool")
      .select("id", { count: "exact", head: true })
      .eq("status", "available");

    const remainingCount = count ?? 0;

    // Nếu còn <= 5 link, bắn chuông cảnh báo cho Super Admin
    if (remainingCount <= 5) {
      await sendLowStockAlert(remainingCount);
    }

    return {
      success: true,
      padlet: {
        padlet_url: item.padlet_url,
        padlet_api: item.padlet_api
      },
      remainingCount
    };
  } catch (err: any) {
    console.error("Lỗi popAvailablePadlet:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 5. Cấp link Padlet từ kho cho một học viên đang thiếu Padlet
 */
export async function assignPadletToExistingStudent(studentId: string, studentName: string) {
  try {
    const popRes = await popAvailablePadlet(studentId, studentName);
    if (!popRes.success || !popRes.padlet) {
      return { success: false, error: popRes.error || "Không thể lấy link từ kho dự trữ." };
    }

    const { padlet_url, padlet_api } = popRes.padlet;

    // Cập nhật bảng students trong CRM
    const { error: stuErr } = await crmClient
      .from("students")
      .update({
        padlet_url,
        padlet_api
      })
      .eq("id", studentId);

    if (stuErr) throw stuErr;

    // Đồng bộ sang LMS profiles (nếu học viên đã có tài khoản trên Web 2)
    try {
      await lmsClient
        .from("profiles")
        .update({ padlet_url })
        .eq("student_code", studentId);
    } catch (lmsSyncErr) {
      console.warn("Đồng bộ Padlet sang LMS:", lmsSyncErr);
    }

    return {
      success: true,
      padlet_url,
      padlet_api,
      remainingCount: popRes.remainingCount,
      message: `Đã cấp thành công Padlet cho học viên ${studentName}!`
    };
  } catch (err: any) {
    console.error("Lỗi assignPadletToExistingStudent:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 6. Tự động cấp Padlet từ kho cho TOÀN BỘ học viên đang bị "Thiếu Padlet"
 */
export async function assignPadletsToAllMissingStudents() {
  try {
    // Tìm tất cả học viên thiếu Padlet
    const { data: missing, error } = await crmClient
      .from("students")
      .select("id, full_name, padlet_url, padlet_api")
      .or("padlet_url.is.null,padlet_url.eq.'',padlet_api.is.null,padlet_api.eq.''")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!missing || missing.length === 0) {
      return { success: true, count: 0, message: "Tất cả học viên đều đã có đầy đủ link Padlet!" };
    }

    let assignedCount = 0;
    let stoppedDueToEmptyPool = false;

    for (const st of missing) {
      const popRes = await popAvailablePadlet(st.id, st.full_name);
      if (!popRes.success || !popRes.padlet) {
        stoppedDueToEmptyPool = true;
        break;
      }

      await crmClient
        .from("students")
        .update({
          padlet_url: popRes.padlet.padlet_url,
          padlet_api: popRes.padlet.padlet_api
        })
        .eq("id", st.id);

      try {
        await lmsClient
          .from("profiles")
          .update({ padlet_url: popRes.padlet.padlet_url })
          .eq("student_code", st.id);
      } catch (e) {}

      assignedCount++;
    }

    // Lấy số lượng còn lại
    const statsRes = await getPadletPoolStats();
    const remaining = statsRes.data?.available || 0;

    let msg = `Đã tự động cấp Padlet cho ${assignedCount} học viên! (Kho còn ${remaining} link).`;
    if (stoppedDueToEmptyPool) {
      msg = `Đã cấp cho ${assignedCount} học viên nhưng kho dự trữ đã hết link! Vui lòng nạp thêm link vào kho để cấp tiếp cho các học viên còn lại.`;
    }

    return {
      success: true,
      assignedCount,
      remainingCount: remaining,
      stoppedDueToEmptyPool,
      message: msg
    };
  } catch (err: any) {
    console.error("Lỗi assignPadletsToAllMissingStudents:", err);
    return { success: false, error: err.message };
  }
}

/**
 * 7. Xóa 1 link khỏi kho (chỉ xóa link chưa dùng)
 */
export async function deletePadletFromPool(id: string) {
  try {
    const { error } = await crmClient
      .from("padlet_pool")
      .delete()
      .eq("id", id)
      .eq("status", "available");

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error("Lỗi deletePadletFromPool:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Hàm phụ: Bắn chuông thông báo cho Super Admin khi kho Padlet sắp hết
 */
async function sendLowStockAlert(remainingCount: number) {
  try {
    const { data: superAdmins } = await crmClient
      .from("users")
      .select("id")
      .eq("role", "Super Admin");

    if (!superAdmins || superAdmins.length === 0) return;

    const notifs = superAdmins.map((u: any) => ({
      user_id: u.id,
      title: remainingCount === 0 
        ? "🚨 KHO PADLET DỰ TRỮ ĐÃ HẾT LINK!" 
        : `⚠️ Kho Padlet dự trữ sắp hết (Còn ${remainingCount} link)!`,
      content: remainingCount === 0
        ? "Kho Padlet đã hết hoàn toàn link khả dụng. Học viên mới tạo sẽ không được tự động cấp Padlet. Vui lòng nạp thêm ngay!"
        : `Kho Padlet hiện chỉ còn ${remainingCount} link dự trữ. Vui lòng nạp thêm để hệ thống tự động cấp cho học viên mới.`,
      link_url: "/students?openPadletPool=true",
      reference_id: "PADLET_POOL_LOW_STOCK",
      is_read: false
    }));

    await crmClient.from("notifications").insert(notifs);
  } catch (err) {
    console.warn("Gửi thông báo cảnh báo kho Padlet:", err);
  }
}

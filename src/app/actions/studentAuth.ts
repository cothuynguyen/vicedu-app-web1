"use server"

import { createClient } from '@supabase/supabase-js'

const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function syncStudentAuthAccount(email: string, fullName: string, phone: string) {
  if (!email) return { success: false, error: 'Email is required' };
  
  try {
    const supabaseAdmin = getAdminClient()

    // Lấy toàn bộ danh sách users hiện có để kiểm tra (tối đa 1000 users)
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (searchError) return { success: false, error: searchError.message }

    const targetUser = users.users.find((u: any) => u.email === email)
    
    // Đóng gói Metadata (Thẻ bài quyền hạn)
    const userMetadata = {
      role: 'Phụ huynh VIC',
      full_name: fullName,
      phone: phone || ''
    };

    if (!targetUser) {
      // 1. Tạo tài khoản hoàn toàn mới
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: 'Toiyeuvicedu', // Mật khẩu mặc định ép cứng
        email_confirm: true,      // Tự động xác thực không cần gửi link
        user_metadata: userMetadata
      })

      if (error) return { success: false, error: error.message }
      return { success: true, action: 'created', data }
    } else {
      // 2. Nếu đã tồn tại, đè lại metadata cho chắc chắn
      const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        user_metadata: userMetadata
      })
      if (error) return { success: false, error: error.message }
      return { success: true, action: 'updated', data }
    }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

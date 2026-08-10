"use server"

import { createClient } from '@supabase/supabase-js'

// Hàm khởi tạo Client ẩn danh với quyền Admin tối cao
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function createAuthUser(email: string, password: string, fullName: string) {
  try {
    const supabaseAdmin = getAdminClient()

    // Cấp tài khoản Auth cho nhân sự mới
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Bỏ qua bước xác nhận qua Email
      user_metadata: { full_name: fullName }
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Trả về auth_id để caller lưu vào public.users
    return { success: true, data, auth_id: data.user?.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateAuthUserPassword(email: string, newPassword: string) {
  try {
    const supabaseAdmin = getAdminClient()

    // 1. Tìm UUID của User thông qua danh sách (Lấy tối đa 1000 users để không bị sót)
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (searchError) return { success: false, error: searchError.message }

    const targetUser = users.users.find((u: any) => u.email === email)
    
    // Nếu không tìm thấy, tự động tạo tài khoản mới
    if (!targetUser) {
      return await createAuthUser(email, newPassword, email.split('@')[0])
    }

    // 2. Ép buộc đổi mật khẩu
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword
    })

    if (error) return { success: false, error: error.message }
    // Trả về auth_id để caller có thể sync vào public.users nếu cần
    return { success: true, data, auth_id: targetUser.id }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// Hàm đổi mật khẩu cá nhân: Xác thực pass cũ + đổi pass mới hoàn toàn trên Server
// Tránh gọi signInWithPassword từ client (sẽ trigger onAuthStateChange gây nhầm user)
export async function verifyAndChangePassword(email: string, oldPassword: string, newPassword: string) {
  try {
    // 1. Xác thực mật khẩu cũ bằng cách thử signIn qua một client riêng biệt (anon key)
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { error: signInError } = await supabaseAnon.auth.signInWithPassword({
      email,
      password: oldPassword,
    })

    if (signInError) {
      return { success: false, error: 'Mật khẩu hiện tại không đúng!' }
    }

    // 2. Đổi mật khẩu mới bằng Admin API (không trigger client session)
    const supabaseAdmin = getAdminClient()
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const targetUser = users?.users.find((u: any) => u.email === email)
    if (!targetUser) return { success: false, error: 'Không tìm thấy tài khoản!' }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      password: newPassword
    })

    if (updateError) return { success: false, error: updateError.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteAuthUser(email: string) {
  try {
    const supabaseAdmin = getAdminClient()

    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const targetUser = users?.users.find((u: any) => u.email === email)
    
    // Nếu không có trong Auth thì thôi, bỏ qua
    if (!targetUser) return { success: true } 

    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
    if (error) return { success: false, error: error.message }
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

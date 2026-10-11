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
    const cleanEmail = email.trim().toLowerCase()

    // Cấp tài khoản Auth cho nhân sự mới
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // Bỏ qua bước xác nhận qua Email
      user_metadata: { full_name: fullName }
    })

    if (error) {
      // XỬ LÝ THÔNG MINH: Nếu email đã tồn tại ở tầng Auth
      if (error.message.includes('already registered') || (error as any).status === 422) {
        // 1. Kiểm tra xem trong bảng hồ sơ public.users có ai ĐANG DÙNG email này không
        const { data: existingEmp } = await supabaseAdmin
          .from('users')
          .select('id, full_name, email')
          .ilike('email', cleanEmail)
          .maybeSingle()

        if (existingEmp) {
          return {
            success: false,
            error: `Email [${cleanEmail}] đã được đăng ký cho nhân sự [${existingEmp.full_name}] (${existingEmp.id}). Vui lòng kiểm tra lại.`
          }
        }

        // 2. Nếu trong public.users KHÔNG CÓ AI dùng email này (tài khoản mồ côi từ hồ sơ cũ đã xóa)
        // -> Tự động tái sử dụng tài khoản Auth cũ, cập nhật lại mật khẩu và metadata
        const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const orphanUser = usersData?.users.find((u: any) => u.email?.trim().toLowerCase() === cleanEmail)

        if (orphanUser) {
          const { data: updatedData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(orphanUser.id, {
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
            ban_duration: 'none' // Gỡ khóa nếu trước đó bị khóa
          })

          if (updateError) {
            return { success: false, error: updateError.message }
          }

          // Tái sử dụng thành công, trả về auth_id cũ để liên kết với hồ sơ mới
          return { success: true, data: updatedData, auth_id: orphanUser.id }
        }
      }

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
    const cleanEmail = email.trim().toLowerCase()

    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    const targetUser = users?.users.find((u: any) => u.email?.trim().toLowerCase() === cleanEmail)
    
    // Nếu không có trong Auth thì thôi, bỏ qua
    if (!targetUser) return { success: true } 

    const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id)
    if (error) return { success: false, error: error.message }
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function banOrUnbanAuthUser(email: string, shouldBan: boolean) {
  try {
    const supabaseAdmin = getAdminClient()
    const cleanEmail = email.trim().toLowerCase()

    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (searchError) return { success: false, error: searchError.message }

    const targetUser = users?.users.find((u: any) => u.email?.trim().toLowerCase() === cleanEmail)
    if (!targetUser) return { success: true }

    // Khoá vĩnh viễn (876000h = 100 năm) hoặc mở khoá ('none')
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      ban_duration: shouldBan ? '876000h' : 'none'
    })

    if (error) return { success: false, error: error.message }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}


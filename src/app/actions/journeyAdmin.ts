"use server"

import { createClient } from '@supabase/supabase-js'

// Hàm khởi tạo Client ẩn danh với quyền Admin tối cao
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export interface CampData {
  id?: string
  slug: string
  title: string
  subtitle?: string
  slogan?: string
  mode: 'clb_quanh_nam' | 'lop_hoc_buoi'
  status?: string
  target_days?: number
  has_divisions?: boolean
  require_pin?: boolean
  logo?: {
    icon?: string
    text?: string
    badgeLabel?: string
    imageUrl?: string
  }
  theme?: {
    primary?: string
    accent?: string
    light?: string
    badgeBg?: string
    heroGradient?: string
    canvaUrl?: string
    videoUrl?: string
    scheduleText?: string
    locationText?: string
    campaignTitle?: string
    campaignSlogan?: string
    careSuccessTpl?: string
    careReminderTpl?: string
    weeklySchedule?: Array<{
      dayOfWeek: number
      dayLabel: string
      timeStr: string
      location: string
      sessionTitle: string
    }>
  }
  tasks?: Array<{
    id: string
    name: string
    type: 'number' | 'boolean' | 'link'
    unit?: string
    target?: number
    color: string
    description: string
  }>
  sessions?: any[]
  club_months?: any[]
  scoring_rules?: Array<{ label: string; points: string }>
  highlight_badges?: any[]
  branch_gps?: {
    lat: number
    lng: number
    radius: number
    branch_name?: string
  }
  shifts_config?: Array<{
    id: string
    name: string
    start: string
    end: string
  }>
}

export interface MemberData {
  id?: number
  camp_id: string
  student_id?: string
  name: string
  phone?: string
  phone_last4?: string
  pin_code?: string
  role_tag?: string
  avatar_url?: string
  is_elite?: boolean
  total_km_all_time?: number
  weekly_streak?: number
  total_stars?: number
  forgot_pills_quota?: number
  status?: string
}

// 1. Lấy toàn bộ danh sách Camp kèm số lượng Thành viên & Báo cáo
export async function getAdminCamps() {
  try {
    const supabaseAdmin = getAdminClient()

    const { data: camps, error: campErr } = await supabaseAdmin
      .from('journey_camps')
      .select('*')
      .order('created_at', { ascending: false })

    if (campErr) {
      console.error('Lỗi lấy danh sách camps:', campErr)
      return { success: false, error: campErr.message }
    }

    // Đếm số thành viên và số báo cáo cho mỗi camp
    const { data: members } = await supabaseAdmin
      .from('journey_members')
      .select('id, camp_id')

    const { data: reports } = await supabaseAdmin
      .from('journey_reports')
      .select('id, camp_id, approval_status')

    const enrichedCamps = (camps || []).map((camp) => {
      const campMembers = (members || []).filter((m) => m.camp_id === camp.id)
      const campReports = (reports || []).filter((r) => r.camp_id === camp.id)
      const pendingReports = campReports.filter((r) => r.approval_status === 'pending_approval')

      return {
        ...camp,
        memberCount: campMembers.length,
        reportCount: campReports.length,
        pendingCount: pendingReports.length,
      }
    })

    return { success: true, camps: enrichedCamps }
  } catch (err: any) {
    console.error('Lỗi getAdminCamps:', err)
    return { success: false, error: err.message }
  }
}

// 2. Thêm mới hoặc cập nhật thông tin Camp
export async function saveCamp(camp: CampData) {
  try {
    const supabaseAdmin = getAdminClient()

    const cleanSlug = camp.slug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    const payload: any = {
      slug: cleanSlug,
      title: camp.title.trim(),
      subtitle: camp.subtitle || '',
      slogan: camp.slogan || 'KỶ LUẬT LÀ SỨC MẠNH · KHÔNG CÓ AI GIÁM SÁT VẪN DỪNG LẠI VÀ CHẠY ĐỦ',
      mode: camp.mode || 'clb_quanh_nam',
      status: camp.status || 'active',
      logo: camp.logo || { icon: '🏃‍♂️🔥', text: camp.title.slice(0, 15), badgeLabel: 'VICEDU' },
      theme: camp.theme || { primary: '#4f46e5', accent: '#4338ca', light: '#eef2ff' },
      tasks: camp.tasks || [],
      sessions: camp.sessions || [],
      club_months: camp.club_months || [],
      scoring_rules: camp.scoring_rules || [],
      highlight_badges: camp.highlight_badges || [],
      branch_gps: camp.branch_gps || { lat: 21.321852, lng: 105.398214, radius: 50, branch_name: 'VP VicEdu Việt Trì' },
      shifts_config: camp.shifts_config || [
        { id: 'P1', name: 'Ca P1', start: '07:30', end: '17:30' },
        { id: 'P2', name: 'Ca P2', start: '09:00', end: '19:00' },
        { id: 'P3', name: 'Ca P3', start: '13:45', end: '21:45' },
        { id: 'P4', name: 'Ca P4', start: '08:00', end: '18:00' },
        { id: 'P5', name: 'Ca P5', start: '07:00', end: '17:00' },
      ],
      updated_at: new Date().toISOString(),
    }

    if (camp.id) {
      // Cập nhật Camp đã có
      const { data, error } = await supabaseAdmin
        .from('journey_camps')
        .update(payload)
        .eq('id', camp.id)
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, camp: data }
    } else {
      // Tạo Camp mới
      payload.created_at = new Date().toISOString()
      const { data, error } = await supabaseAdmin
        .from('journey_camps')
        .insert(payload)
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, camp: data }
    }
  } catch (err: any) {
    console.error('Lỗi saveCamp:', err)
    return { success: false, error: err.message }
  }
}

// 3. Xóa Camp
export async function deleteCamp(campId: string) {
  try {
    const supabaseAdmin = getAdminClient()

    // Xóa reports và members liên quan trước
    await supabaseAdmin.from('journey_reports').delete().eq('camp_id', campId)
    await supabaseAdmin.from('journey_members').delete().eq('camp_id', campId)

    const { error } = await supabaseAdmin
      .from('journey_camps')
      .delete()
      .eq('id', campId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    console.error('Lỗi deleteCamp:', err)
    return { success: false, error: err.message }
  }
}

// 4. Lấy danh sách thành viên của một Camp
export async function getCampMembers(campId: string) {
  try {
    const supabaseAdmin = getAdminClient()

    const { data, error } = await supabaseAdmin
      .from('journey_members')
      .select('*')
      .eq('camp_id', campId)
      .order('id', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, members: data || [] }
  } catch (err: any) {
    console.error('Lỗi getCampMembers:', err)
    return { success: false, error: err.message }
  }
}

// 5. Thêm mới hoặc cập nhật Thành viên
export async function saveMember(member: MemberData) {
  try {
    const supabaseAdmin = getAdminClient()

    const phoneDigits = (member.phone || '').replace(/\D/g, '')
    const phoneLast4 = member.phone_last4 || (phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '')
    const pin = member.pin_code || phoneLast4 || '1234'

    const payload: any = {
      camp_id: member.camp_id,
      student_id: member.student_id || null,
      name: member.name.trim(),
      phone: member.phone || '',
      phone_last4: phoneLast4,
      pin_code: pin,
      role_tag: member.role_tag || 'Thành viên',
      avatar_url: member.avatar_url || '',
      is_elite: !!member.is_elite,
      total_km_all_time: Number(member.total_km_all_time) || 0,
      weekly_streak: Number(member.weekly_streak) || 0,
      total_stars: Number(member.total_stars) || 0,
      forgot_pills_quota: typeof member.forgot_pills_quota === 'number' ? member.forgot_pills_quota : 3,
      status: member.status || 'active',
      updated_at: new Date().toISOString(),
    }

    if (member.id) {
      const { data, error } = await supabaseAdmin
        .from('journey_members')
        .update(payload)
        .eq('id', member.id)
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, member: data }
    } else {
      payload.created_at = new Date().toISOString()
      const { data, error } = await supabaseAdmin
        .from('journey_members')
        .insert(payload)
        .select()
        .single()

      if (error) return { success: false, error: error.message }
      return { success: true, member: data }
    }
  } catch (err: any) {
    console.error('Lỗi saveMember:', err)
    return { success: false, error: err.message }
  }
}

// 6. Xóa Thành viên
export async function deleteMember(memberId: number) {
  try {
    const supabaseAdmin = getAdminClient()

    await supabaseAdmin.from('journey_reports').delete().eq('member_id', memberId)

    const { error } = await supabaseAdmin
      .from('journey_members')
      .delete()
      .eq('id', memberId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    console.error('Lỗi deleteMember:', err)
    return { success: false, error: err.message }
  }
}

// 7. Lấy danh sách Báo cáo / Chấm công của một Camp
export async function getCampReports(campId: string, statusFilter?: string) {
  try {
    const supabaseAdmin = getAdminClient()

    let query = supabaseAdmin
      .from('journey_reports')
      .select('*, member:journey_members(name, phone_last4, role_tag, avatar_url)')
      .eq('camp_id', campId)
      .order('submitted_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('approval_status', statusFilter)
    }

    const { data, error } = await query

    if (error) return { success: false, error: error.message }
    return { success: true, reports: data || [] }
  } catch (err: any) {
    console.error('Lỗi getCampReports:', err)
    return { success: false, error: err.message }
  }
}

// 8. Duyệt hoặc Từ chối báo cáo / giải trình
export async function updateReportApproval(
  reportId: number,
  approvalStatus: 'approved' | 'rejected' | 'pending_approval',
  approvedBy: string
) {
  try {
    const supabaseAdmin = getAdminClient()

    const { data, error } = await supabaseAdmin
      .from('journey_reports')
      .update({
        approval_status: approvalStatus,
        approved_by: approvedBy,
      })
      .eq('id', reportId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, report: data }
  } catch (err: any) {
    console.error('Lỗi updateReportApproval:', err)
    return { success: false, error: err.message }
  }
}

// 9. Lấy dữ liệu tổng hợp để xuất Excel chuẩn UTF-8
export async function getCampExportData(campId: string) {
  try {
    const supabaseAdmin = getAdminClient()

    const { data: camp } = await supabaseAdmin
      .from('journey_camps')
      .select('*')
      .eq('id', campId)
      .single()

    const { data: members } = await supabaseAdmin
      .from('journey_members')
      .select('*')
      .eq('camp_id', campId)
      .order('id', { ascending: true })

    const { data: reports } = await supabaseAdmin
      .from('journey_reports')
      .select('*')
      .eq('camp_id', campId)

    return {
      success: true,
      camp,
      members: members || [],
      reports: reports || [],
    }
  } catch (err: any) {
    console.error('Lỗi getCampExportData:', err)
    return { success: false, error: err.message }
  }
}

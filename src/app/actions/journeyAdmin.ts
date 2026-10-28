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
  mode: 'clb_quanh_nam' | 'lop_hoc_buoi' | 'cham_cong' | 'thoi_quen_ca_nhan'
  scope?: 'admin_only' | 'branch' | 'partner' | 'club'
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
    scope?: 'admin_only' | 'branch' | 'partner' | 'club'
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
    hall_of_fame?: any
    [key: string]: any
  }
  tasks?: Array<{
    id: string
    name: string
    type: 'number' | 'boolean' | 'link' | 'text'
    unit?: string
    target?: number
    color: string
    description: string
  }>
  sessions?: any[]
  club_months?: any[]
  scoring_rules?: Array<{
    label: string
    points: string
    applicable_task_ids?: string[]
    mandatory_task_ids?: string[]
    milestone_task_id?: string
    milestones?: Array<{ threshold: number; points: number }>
    [key: string]: any
  }>
  highlight_badges?: any[]
  branch_gps?: {
    lat: number
    lng: number
    radius: number
    branch_name?: string
    branches?: Array<{
      id: string
      branch_name: string
      lat: number
      lng: number
      radius: number
      address?: string
    }>
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
  student_id?: string | null
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
        has_divisions: camp.has_divisions ?? (camp.theme as any)?.has_divisions ?? true,
        require_pin: camp.require_pin ?? (camp.theme as any)?.require_pin ?? true,
        scope: (camp.theme as any)?.scope || camp.scope || (camp.mode === 'clb_quanh_nam' ? 'club' : (camp.slug.includes('ielts') ? 'branch' : 'admin_only')),
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

// 2. Thêm mới hoặc cập nhật thông tin Camp (Tự động tối ưu hóa)
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
      logo: {
        ...(camp.logo || {}),
        icon: camp.logo?.icon || '🏃‍♂️🔥',
        text: camp.logo?.text || camp.title.slice(0, 15),
        badgeLabel: camp.logo?.badgeLabel || 'VICEDU',
        imageUrl: camp.logo?.imageUrl || '',
      },
      theme: {
        ...(camp.theme || {}),
        primary: camp.theme?.primary || '#4f46e5',
        accent: camp.theme?.accent || '#4338ca',
        light: camp.theme?.light || '#eef2ff',
        has_divisions: camp.has_divisions ?? (camp.theme as any)?.has_divisions ?? true,
        require_pin: camp.require_pin ?? (camp.theme as any)?.require_pin ?? true,
        scope: (camp as any).scope || (camp.theme as any)?.scope || (camp.mode === 'clb_quanh_nam' ? 'club' : 'branch'),
      },
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

    // Xử lý tự động hóa riêng cho Chế Độ Thói Quen Cá Nhân (1 Người)
    if (camp.mode === 'thoi_quen_ca_nhan') {
      payload.theme = {
        ...(payload.theme || {}),
        has_divisions: false,
        require_pin: false,
        scope: 'admin_only',
        target_days: Number(camp.theme?.target_days) || 60,
        start_date: camp.theme?.start_date || new Date().toISOString().split('T')[0],
        owner_name: camp.theme?.owner_name || 'Sếp Hoàng',
        owner_avatar: camp.theme?.owner_avatar || '🦁',
        owner_phone: camp.theme?.owner_phone || '0912345678',
        allow_personal_custom_tasks: camp.theme?.allow_personal_custom_tasks ?? true,
      };


      const targetDays = Number(payload.theme.target_days) || 60;
      const startDateStr = payload.theme.start_date || new Date().toISOString().split('T')[0];
      const startD = new Date(startDateStr + 'T00:00:00Z');

      if (!camp.sessions || camp.sessions.length !== targetDays || (camp.sessions.length > 0 && camp.sessions[0].dateStr !== startDateStr)) {
        const autoSessions: any[] = [];
        for (let i = 1; i <= targetDays; i++) {
          const curD = new Date(startD.getTime() + (i - 1) * 24 * 60 * 60 * 1000);
          const yyyy = curD.getUTCFullYear();
          const mm = String(curD.getUTCMonth() + 1).padStart(2, '0');
          const dd = String(curD.getUTCDate()).padStart(2, '0');
          const dateStr = `${yyyy}-${mm}-${dd}`;
          const code = 'N' + String(i).padStart(2, '0');

          let badge = '';
          if (i === 1) badge = '🚀 KHỞI ĐỘNG';
          else if (i === 21) badge = '🔥 CỘT MỐC 21 NGÀY';
          else if (i === Math.floor(targetDays / 2)) badge = '⚡ NỬA CHẶNG ĐƯỜNG';
          else if (i === targetDays) badge = `👑 VỀ ĐÍCH ${targetDays} NGÀY`;

          autoSessions.push({
            id: `day_${String(i).padStart(2, '0')}`,
            sessionCode: code,
            title: `Ngày ${i} · Kỷ Luật Thói Quen`,
            dateStr: dateStr,
            timeStr: 'Hàng ngày',
            desc: `Hoàn thành trọn vẹn các tiêu chuẩn rèn luyện trong ngày.`,
            isPast: false,
            isToday: i === 1,
            specialBadge: badge
          });
        }
        payload.sessions = autoSessions;
      }
    }

    if (camp.id) {
      // Cập nhật Camp đã có: Bảo toàn Ban Quản Trị đã cài đặt nếu theme gửi lên chưa có
      const { data: existingCamp } = await supabaseAdmin
        .from('journey_camps')
        .select('theme, branch_gps, shifts_config')
        .eq('id', camp.id)
        .single();
      if (existingCamp?.theme?.admins && (!payload.theme?.admins || payload.theme.admins.length === 0)) {
        payload.theme.admins = existingCamp.theme.admins;
      }
      if (existingCamp) {
        const hasNewBranches = payload.branch_gps && Array.isArray(payload.branch_gps.branches) && payload.branch_gps.branches.length > 0;
        const hasExistingBranches = existingCamp.branch_gps && Array.isArray(existingCamp.branch_gps.branches) && existingCamp.branch_gps.branches.length > 0;
        if (!hasNewBranches && hasExistingBranches) {
          payload.branch_gps = existingCamp.branch_gps;
        }
        if ((!payload.shifts_config || payload.shifts_config.length === 0) && existingCamp.shifts_config && existingCamp.shifts_config.length > 0) {
          payload.shifts_config = existingCamp.shifts_config;
        }
      }

      const { data, error } = await supabaseAdmin
        .from('journey_camps')
        .update(payload)
        .eq('id', camp.id)
        .select()
        .single()

      if (error) return { success: false, error: error.message }

      // Tự động đồng bộ thành viên chủ nhân cho thoi_quen_ca_nhan
      if (camp.mode === 'thoi_quen_ca_nhan') {
        const ownerName = payload.theme?.owner_name || 'Sếp Hoàng';
        const ownerAvatar = payload.theme?.owner_avatar || '🦁';
        const ownerPhone = payload.theme?.owner_phone || '0912345678';
        const phoneLast4 = ownerPhone.slice(-4);

        const { data: existingMembers } = await supabaseAdmin
          .from('journey_members')
          .select('id')
          .eq('camp_id', data.id);

        if (!existingMembers || existingMembers.length === 0) {
          await supabaseAdmin.from('journey_members').insert({
            camp_id: data.id,
            name: ownerName,
            avatar_url: ownerAvatar,
            phone: ownerPhone,
            phone_last4: phoneLast4,
            pin_code: '1919',
            role_tag: 'Chủ nhân hành trình',
            status: 'active',
            is_elite: true,
          });
        } else {
          await supabaseAdmin.from('journey_members').update({
            name: ownerName,
            avatar_url: ownerAvatar,
            phone: ownerPhone,
            phone_last4: phoneLast4,
          }).eq('id', existingMembers[0].id);
        }
      }

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

      // Tự động tạo thành viên chủ nhân cho Camp mới
      if (camp.mode === 'thoi_quen_ca_nhan') {
        const ownerName = payload.theme?.owner_name || 'Sếp Hoàng';
        const ownerAvatar = payload.theme?.owner_avatar || '🦁';
        const ownerPhone = payload.theme?.owner_phone || '0912345678';
        const phoneLast4 = ownerPhone.slice(-4);

        await supabaseAdmin.from('journey_members').insert({
          camp_id: data.id,
          name: ownerName,
          avatar_url: ownerAvatar,
          phone: ownerPhone,
          phone_last4: phoneLast4,
          pin_code: '1919',
          role_tag: 'Chủ nhân hành trình',
          status: 'active',
          is_elite: true,
        });
      }

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
    const phoneLast4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : (member.phone_last4 || '')
    const pin = member.pin_code || phoneLast4 || '1234'

    const payload: any = {
      camp_id: member.camp_id,
      student_id: (member.student_id && !isNaN(Number(member.student_id))) ? Number(member.student_id) : null,
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

// 6.1. Bật/Tắt Trạng thái Thành viên (Active / Inactive)
export async function toggleMemberStatus(memberId: number, status: 'active' | 'inactive') {
  try {
    const supabaseAdmin = getAdminClient()

    const { data, error } = await supabaseAdmin
      .from('journey_members')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId)
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, member: data }
  } catch (err: any) {
    console.error('Lỗi toggleMemberStatus:', err)
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

    const updatePayload: Record<string, any> = {
      approval_status: approvalStatus,
      approved_by: approvedBy,
    };
    if (approvalStatus === 'approved') {
      updatePayload.attended_session = true;
    } else if (approvalStatus === 'rejected') {
      updatePayload.attended_session = false;
    }

    const { data, error } = await supabaseAdmin
      .from('journey_reports')
      .update(updatePayload)
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

// 7. Lấy danh sách nhân sự / giáo viên VicEdu từ bảng users
export async function getVicEduStaff() {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, role, phone, status, department')
      .neq('status', 'Nghỉ việc')
      .order('full_name', { ascending: true });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

// 8. Cập nhật Ban Quản Trị / Giáo viên phụ trách của Camp
export async function saveCampAdmins(campId: string, admins: any[]) {
  try {
    const supabaseAdmin = getAdminClient();
    const { data: camp, error: fetchErr } = await supabaseAdmin
      .from('journey_camps')
      .select('theme')
      .eq('id', campId)
      .single();

    if (fetchErr || !camp) return { success: false, error: fetchErr?.message || 'Không tìm thấy camp' };

    const updatedTheme = {
      ...(camp.theme || {}),
      admins: admins || [],
    };

    const { error: updateErr } = await supabaseAdmin
      .from('journey_camps')
      .update({
        theme: updatedTheme,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campId);

    if (updateErr) return { success: false, error: updateErr.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// 9. Lấy danh sách nhân viên theo chi nhánh có trạng thái khác 'Nghỉ việc' (Chấm Công VicHRM)
export async function getBranchEmployees(branchId?: string) {
  try {
    const supabaseAdmin = getAdminClient();
    let query = supabaseAdmin
      .from('users')
      .select('id, full_name, nickname, phone, email, branch_id, department, position, role, status, avatar_url')
      .neq('status', 'Nghỉ việc')
      .order('full_name', { ascending: true });

    if (branchId && branchId !== 'all') {
      query = query.ilike('branch_id', `%${branchId}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Lỗi getBranchEmployees:', error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error('Lỗi getBranchEmployees:', err);
    return [];
  }
}

// 10. Lấy danh sách Lớp học đang hoạt động (cho Lớp học VicEdu LMS)
export async function getClassesList(branchId?: string) {
  try {
    const supabaseAdmin = getAdminClient();
    let query = supabaseAdmin
      .from('classes')
      .select('id, class_name, branch_id, status, teacher_vn, teacher_foreign')
      .neq('status', 'Đã kết thúc')
      .order('class_name', { ascending: true });

    if (branchId && branchId !== 'all') {
      query = query.ilike('branch_id', `%${branchId}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Lỗi getClassesList:', error);
      return [];
    }
    return data || [];
  } catch (err: any) {
    console.error('Lỗi getClassesList:', err);
    return [];
  }
}

// 11. Lấy danh sách Học viên trong 1 Lớp học cụ thể kèm thông tin phụ huynh / SĐT
export async function getClassStudentsForJourney(classId: string) {
  try {
    const supabaseAdmin = getAdminClient();
    const { data, error } = await supabaseAdmin
      .from('class_students')
      .select('student_id, status, students(id, full_name, nickname, parent_phone, avatar_url, branch_id, status)')
      .eq('class_id', classId);

    if (error) {
      console.error('Lỗi getClassStudentsForJourney:', error);
      return [];
    }

    const students = (data || [])
      .map((item: any) => {
        if (!item.students) return null;
        return {
          ...item.students,
          phone: item.students.parent_phone || '',
        };
      })
      .filter((s: any) => s && s.status !== 'Nghỉ học');

    return students;
  } catch (err: any) {
    console.error('Lỗi getClassStudentsForJourney:', err);
    return [];
  }
}

// 12. Nạp hàng loạt Thành viên vào Camp (hỗ trợ Chấm công chi nhánh & Nạp cả lớp học)
export async function bulkSaveMembers(campId: string, membersList: Partial<MemberData>[]) {
  try {
    const supabaseAdmin = getAdminClient();
    const now = new Date().toISOString();

    // Lấy danh sách thành viên hiện có trong camp để chống trùng lặp theo SĐT hoặc student_id hoặc tên
    const { data: existing } = await supabaseAdmin
      .from('journey_members')
      .select('name, phone, student_id')
      .eq('camp_id', campId);

    const existingPhones = new Set((existing || []).map((m: any) => m.phone).filter(Boolean));
    const existingStudentIds = new Set((existing || []).map((m: any) => m.student_id).filter(Boolean));
    const existingNames = new Set((existing || []).map((m: any) => (m.name || '').toLowerCase().trim()));

    const toInsert = membersList
      .filter((m: any) => {
        if (!m.name) return false;
        const phone = (m.phone || '').trim();
        const name = (m.name || '').toLowerCase().trim();
        if (phone && existingPhones.has(phone)) return false;
        if (existingNames.has(name)) return false;
        // Check clean name without (code)
        const cleanM = name.split('(')[0].trim();
        const hasNameDup = Array.from(existingNames).some((ex: any) => {
          const cleanEx = (ex || '').split('(')[0].trim();
          return cleanEx === cleanM && cleanM.length > 2;
        });
        if (hasNameDup) return false;
        return true;
      })
      .map((m: any) => {
        const phoneDigits = (m.phone || '').replace(/\D/g, '');
        const phoneLast4 = m.phone_last4 || (phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '');
        const pin = m.pin_code || phoneLast4 || '1234';
        const numStudentId = (m.student_id && !isNaN(Number(m.student_id))) ? Number(m.student_id) : null;
        return {
          camp_id: campId,
          student_id: numStudentId,
          name: m.name.trim(),
          phone: m.phone || '',
          phone_last4: phoneLast4,
          pin_code: pin,
          role_tag: m.role_tag || 'Thành viên',
          avatar_url: m.avatar_url || '',
          is_elite: !!m.is_elite,
          total_km_all_time: Number(m.total_km_all_time) || 0,
          weekly_streak: Number(m.weekly_streak) || 0,
          total_stars: Number(m.total_stars) || 0,
          forgot_pills_quota: typeof m.forgot_pills_quota === 'number' ? m.forgot_pills_quota : 3,
          status: m.status || 'active',
          created_at: now,
          updated_at: now,
        };
      });

    if (toInsert.length === 0) {
      return { success: true, count: 0, message: 'Tất cả nhân sự / học sinh đã có sẵn trong danh sách của hành trình này!' };
    }

    const { data, error } = await supabaseAdmin
      .from('journey_members')
      .insert(toInsert)
      .select();

    if (error) {
      console.error('Lỗi insert bulkSaveMembers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, count: data?.length || toInsert.length, members: data };
  } catch (err: any) {
    console.error('Lỗi bulkSaveMembers:', err);
    return { success: false, error: err.message };
  }
}


// 13. Mở khóa thiết bị cho nhân sự (Chấm công chống gian lận)
export async function resetMemberDeviceBinding(campId: string, memberId: number | string) {
  try {
    const supabaseAdmin = getAdminClient();
    const { data: camp, error: fetchErr } = await supabaseAdmin
      .from('journey_camps')
      .select('id, theme')
      .eq('id', campId)
      .single();

    if (fetchErr || !camp) {
      return { success: false, error: fetchErr?.message || 'Không tìm thấy hành trình' };
    }

    const theme = camp.theme || {};
    const deviceBindings = { ...(theme.device_bindings || {}) };
    delete deviceBindings[String(memberId)];

    const updatedTheme = { ...theme, device_bindings: deviceBindings };
    const { error: updateErr } = await supabaseAdmin
      .from('journey_camps')
      .update({
        theme: updatedTheme,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, deviceBindings };
  } catch (err: any) {
    console.error('Lỗi resetMemberDeviceBinding:', err);
    return { success: false, error: err.message };
  }
}

// 14. Ghim / Cập nhật tọa độ GPS văn phòng chi nhánh
export async function updateCampBranchGps(
  campId: string,
  lat: number,
  lng: number,
  radius: number = 100
) {
  try {
    const supabaseAdmin = getAdminClient();
    const { data: camp, error: fetchErr } = await supabaseAdmin
      .from('journey_camps')
      .select('id, branch_gps')
      .eq('id', campId)
      .single();

    if (fetchErr || !camp) {
      return { success: false, error: fetchErr?.message || 'Không tìm thấy hành trình' };
    }

    const branchGps = {
      ...(camp.branch_gps || {}),
      lat,
      lng,
      radius: radius || 100,
    };

    const { error: updateErr } = await supabaseAdmin
      .from('journey_camps')
      .update({
        branch_gps: branchGps,
        updated_at: new Date().toISOString(),
      })
      .eq('id', campId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    return { success: true, branch_gps: branchGps };
  } catch (err: any) {
    console.error('Lỗi updateCampBranchGps:', err);
    return { success: false, error: err.message };
  }
}

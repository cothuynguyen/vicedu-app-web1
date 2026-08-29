"use server"

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Hàm khởi tạo Client ẩn danh với quyền Admin tối cao
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Lấy danh sách sự kiện
export async function getEvents() {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      event_tasks (
        id,
        assignee_status,
        manager_approval,
        assignee_id,
        co_assignees,
        cost
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw new Error(error.message)
  return data
}

// Tạo sự kiện mới
export async function createEvent(event: { name: string, start_date: string, end_date: string, branch_id: string, created_by: string }) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('events')
    .insert([{
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      branch_id: event.branch_id || 'Toàn hệ thống',
      status: 'Đang diễn ra',
      created_by: event.created_by
    }])
    .select()
    .single()
  
  if (error) throw new Error(error.message)
  revalidatePath('/(admin)/events', 'page')
  return data
}

// Đóng sự kiện (Tự động chuyển vào tab "Đã kết thúc")
export async function closeEvent(eventId: string) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from('events')
    .update({ 
      is_closed_by_manager: true,
      status: 'Đã kết thúc' 
    })
    .eq('id', eventId)
  
  if (error) throw new Error(error.message)
  revalidatePath('/(admin)/events', 'page')
  return { success: true }
}

// Lấy chi tiết 1 sự kiện và danh sách task
export async function getEventDetails(eventId: string) {
  const supabase = getAdminClient()
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()
  
  if (eventError) throw new Error(eventError.message)
    
  // Lấy danh sách task kèm thông tin người phụ trách
  const { data: tasks, error: tasksError } = await supabase
    .from('event_tasks')
    .select(`
      *,
      users!assignee_id ( id, full_name, branch_id )
    `)
    .eq('event_id', eventId)
    .order('task_index', { ascending: true })
    
  if (tasksError) throw new Error(tasksError.message)
    
  return { event, tasks }
}

// Lấy danh sách nhân sự để assign task (Role != Nghỉ việc)
export async function getAvailableEmployees() {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, branch_id')
    .neq('status', 'Nghỉ việc')
    .order('full_name', { ascending: true })
    
  if (error) throw new Error(error.message)
  return data
}

// Quản lý: Tạo task mới
export async function createEventTask(task: {
  event_id: string,
  task_name: string,
  description?: string,
  assignee_id: string,
  co_assignees?: string[],
  start_date?: string,
  end_date?: string,
  cost?: number,
  task_index: number
}) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('event_tasks')
    .insert([{
        event_id: task.event_id,
        task_name: task.task_name,
        description: task.description || '',
        assignee_id: task.assignee_id,
        co_assignees: task.co_assignees || [],
        start_date: task.start_date,
        end_date: task.end_date,
        cost: task.cost || 0,
        task_index: task.task_index,
        assignee_status: 'Chờ tiếp nhận',
        manager_approval: 'Chờ duyệt',
        notes: []
    }])
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath(`/(admin)/events/${task.event_id}`, 'page')
  return data
}

// Quản lý: Duyệt Task
export async function approveEventTask(taskId: string, eventId: string, approvalStatus: 'Hoàn thành' | 'Chưa hoàn thành') {
  const supabase = getAdminClient()
  
  let updateData: any = { manager_approval: approvalStatus }
  
  // Nếu quản lý đánh "Chưa hoàn thành", búng nhân viên về trạng thái "Đang làm"
  if (approvalStatus === 'Chưa hoàn thành') {
    updateData.assignee_status = 'Đang làm'
  }
  
  const { error } = await supabase
    .from('event_tasks')
    .update(updateData)
    .eq('id', taskId)
    
  if (error) throw new Error(error.message)
  revalidatePath(`/(admin)/events/${eventId}`, 'page')
  return { success: true }
}

// Nhân sự: Cập nhật tình trạng Task
export async function updateTaskStatus(taskId: string, eventId: string, status: string) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from('event_tasks')
    .update({ assignee_status: status })
    .eq('id', taskId)
    
  if (error) throw new Error(error.message)
  revalidatePath(`/(admin)/events/${eventId}`, 'page')
  return { success: true }
}

// Cập nhật/thêm ghi chú (Mini-Comment)
export async function addTaskNote(taskId: string, eventId: string, noteContent: string, authorName: string) {
  const supabase = getAdminClient()
  
  // 1. Lấy notes hiện tại
  const { data: task, error: getError } = await supabase
    .from('event_tasks')
    .select('notes')
    .eq('id', taskId)
    .single()
    
  if (getError) throw new Error(getError.message)
    
  const notesArray = Array.isArray(task.notes) ? task.notes : []
  notesArray.push({
    author: authorName,
    content: noteContent,
    created_at: new Date().toISOString()
  })
  
  // 2. Update lại notes
  const { error: updateError } = await supabase
    .from('event_tasks')
    .update({ notes: notesArray })
    .eq('id', taskId)
    
  if (updateError) throw new Error(updateError.message)
  revalidatePath(`/(admin)/events/${eventId}`, 'page')
  return { success: true }
}

// Đính kèm ảnh minh chứng (lưu url cloudflare)
export async function updateTaskAttachment(taskId: string, eventId: string, url: string) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from('event_tasks')
    .update({ attachment_url: url })
    .eq('id', taskId)
    
  if (error) throw new Error(error.message)
  revalidatePath(`/(admin)/events/${eventId}`, 'page')
  return { success: true }
}

// Helper: Đếm số chuông đỏ (Badge) cho 1 nhân sự
export async function countPendingTasks(userId: string) {
  const supabase = getAdminClient()
  const { count, error } = await supabase
    .from('event_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('assignee_id', userId)
    .neq('manager_approval', 'Hoàn thành')
    .neq('assignee_status', 'Hoàn thành')
    
  if (error) return 0
  return count || 0
}

// Sửa sự kiện
export async function updateEvent(eventId: string, event: { name: string, start_date: string, end_date: string, branch_id: string }) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('events')
    .update({
      name: event.name,
      start_date: event.start_date,
      end_date: event.end_date,
      branch_id: event.branch_id
    })
    .eq('id', eventId)
    .select()
    .single()
    
  if (error) throw error
  revalidatePath('/events')
  revalidatePath(`/events/${eventId}`)
  return data
}

// Xóa sự kiện
export async function deleteEvent(eventId: string) {
  const supabase = getAdminClient()
  
  // Xóa các task con trước để tránh lỗi khóa ngoại (nếu chưa set CASCADE)
  await supabase.from('event_tasks').delete().eq('event_id', eventId)
  
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId)
    
  if (error) throw error
  revalidatePath('/events')
  return { success: true }
}

// Sửa Task
export async function updateEventTask(taskId: string, eventId: string, taskData: { task_name: string, description?: string, assignee_id: string, co_assignees?: string[], start_date?: string, end_date?: string, cost?: number }) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from('event_tasks')
    .update({
      task_name: taskData.task_name,
      description: taskData.description || '',
      assignee_id: taskData.assignee_id,
      co_assignees: taskData.co_assignees || [],
      start_date: taskData.start_date || null,
      end_date: taskData.end_date || null,
      cost: taskData.cost || 0
    })
    .eq('id', taskId)
    
  if (error) throw new Error(error.message)
  revalidatePath(`/(admin)/events/${eventId}`, 'page')
  return { success: true }
}

// Xóa Task
export async function deleteEventTask(taskId: string, eventId: string) {
  const supabase = getAdminClient()
  const { error } = await supabase
    .from('event_tasks')
    .delete()
    .eq('id', taskId)
    
  if (error) throw new Error(error.message)
  revalidatePath(`/(admin)/events/${eventId}`, 'page')
  return { success: true }
}

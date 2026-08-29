"use server"

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// Hàm khởi tạo Client ẩn danh với quyền Admin tối cao để vượt qua RLS
const getAdminClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getPersonalTasks(userId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('personal_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching personal tasks:', error)
    return []
  }
  return data || []
}

export async function addPersonalTask(userId: string, taskName: string, deadline: string | null) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('personal_tasks')
    .insert([
      { 
        user_id: userId, 
        task_name: taskName, 
        deadline: deadline ? deadline : null 
      }
    ])
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath('/events')
  return { success: true, task: data }
}

export async function togglePersonalTask(taskId: string, isCompleted: boolean) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('personal_tasks')
    .update({ is_completed: isCompleted })
    .eq('id', taskId)
    
  if (error) throw new Error(error.message)
  revalidatePath('/events')
  return { success: true }
}

export async function deletePersonalTask(taskId: string) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('personal_tasks')
    .delete()
    .eq('id', taskId)
    
  if (error) throw new Error(error.message)
  revalidatePath('/events')
  return { success: true }
}

export async function updatePersonalTask(taskId: string, taskName: string, deadline: string | null) {
  const supabase = getAdminClient()
  const { data, error } = await supabase
    .from('personal_tasks')
    .update({ task_name: taskName, deadline: deadline ? deadline : null })
    .eq('id', taskId)
    .select()
    .single()
    
  if (error) throw new Error(error.message)
  revalidatePath('/events')
  return { success: true, task: data }
}

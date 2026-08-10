const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
});

const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all Lâm Thao and Tuyên Quang students...");
  const { data: students, error } = await supabase.from('students')
    .select('*')
    .in('branch_id', ['Lâm Thao', 'Tuyên Quang']);
    
  if (error) throw error;

  let totalProcessed = 0;

  for (const stu of students) {
    // 1. Fetch Enrollments
    const { data: enrollments } = await supabase.from('enrollments')
      .select('*')
      .eq('student_id', stu.id)
      .order('created_at', { ascending: true });
      
    let total_registered_hours = 0;
    let total_registered_cost = 0;
    
    if (enrollments) {
      for (const enr of enrollments) {
        total_registered_hours += enr.registered_hours || 0;
        total_registered_cost += enr.amount || 0;
      }
    }
    
    // 2. Calculate Used Hours from Attendance
    const { data: attendance } = await supabase.from('attendance')
      .select('presence_status, class_session_id')
      .eq('student_id', stu.id)
      .in('presence_status', ['Có mặt', 'Vắng phép', 'Không phép']);
      
    let used_hours = 0;
    let used_cost = 0;
    
    if (attendance && attendance.length > 0) {
      const sessionIds = [...new Set(attendance.map(a => a.class_session_id))];
      
      const { data: sessions } = await supabase.from('class_sessions')
        .select('id, class_id')
        .in('id', sessionIds);
        
      if (sessions && sessions.length > 0) {
        const classIds = [...new Set(sessions.map(s => s.class_id))];
        const { data: classes } = await supabase.from('classes')
          .select('id, hours_per_session')
          .in('id', classIds);
          
        const classHoursMap = {};
        classes.forEach(c => { classHoursMap[c.id] = c.hours_per_session || 0; });
        
        const sessionHoursMap = {};
        sessions.forEach(s => { sessionHoursMap[s.id] = classHoursMap[s.class_id] || 0; });
        
        for (const att of attendance) {
          const hoursForThisSession = sessionHoursMap[att.class_session_id] || 0;
          used_hours += hoursForThisSession;
          
          const hourlyRate = total_registered_hours > 0 ? (total_registered_cost / total_registered_hours) : 0;
          used_cost += hoursForThisSession * hourlyRate;
        }
      }
    }
    
    let remaining_hours = total_registered_hours - used_hours;
    let remaining_cost = total_registered_cost - used_cost;
    
    // 3. Update Student
    await supabase.from('students').update({
      total_registered_hours,
      total_registered_cost,
      remaining_hours,
      total_studied_hours: used_hours,
      remaining_cost: remaining_cost 
    }).eq('id', stu.id);
    
    // 4. Distribute remaining_hours among enrollments
    let hoursToDeduct = used_hours;
    if (enrollments) {
      for (const enr of enrollments) {
        let enrRem = enr.registered_hours || 0;
        if (hoursToDeduct >= enrRem) {
          hoursToDeduct -= enrRem;
          enrRem = 0;
        } else {
          enrRem -= hoursToDeduct;
          hoursToDeduct = 0;
        }
        await supabase.from('enrollments').update({ remaining_hours: enrRem }).eq('id', enr.id);
      }
    }

    totalProcessed++;
  }

  console.log(`\nDONE. Processed ${totalProcessed} students for Lâm Thao and Tuyên Quang.`);
}

run().catch(console.error);

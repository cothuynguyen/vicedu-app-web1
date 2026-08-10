const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all Dân Hòa students...");
  const { data: students, error } = await supabase.from('students').select('*').eq('branch_id', 'Dân Hòa');
  if (error) throw error;

  let totalProcessed = 0;

  for (const stu of students) {
    console.log(`\nRecalculating for ${stu.id} - ${stu.full_name}`);
    
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
    // To be safe against nested join syntax, we fetch attendance and manually resolve class_sessions
    const { data: attendance } = await supabase.from('attendance')
      .select('presence_status, class_session_id')
      .eq('student_id', stu.id)
      .in('presence_status', ['Có mặt', 'Vắng phép', 'Không phép']);
      
    let used_hours = 0;
    
    if (attendance && attendance.length > 0) {
      // Get unique class_session_ids
      const sessionIds = [...new Set(attendance.map(a => a.class_session_id))];
      
      const { data: sessions } = await supabase.from('class_sessions')
        .select('id, class_id')
        .in('id', sessionIds);
        
      if (sessions && sessions.length > 0) {
        const classIds = [...new Set(sessions.map(s => s.class_id))];
        const { data: classes } = await supabase.from('classes')
          .select('id, hours_per_session')
          .in('id', classIds);
          
        // Map class_id -> hours
        const classHoursMap = {};
        classes.forEach(c => { classHoursMap[c.id] = c.hours_per_session || 0; });
        
        // Map session_id -> hours
        const sessionHoursMap = {};
        sessions.forEach(s => { sessionHoursMap[s.id] = classHoursMap[s.class_id] || 0; });
        
        // Sum up
        for (const att of attendance) {
          used_hours += sessionHoursMap[att.class_session_id] || 0;
        }
      }
    }
    
    let remaining_hours = total_registered_hours - used_hours;
    // Allow negative remaining hours just in case
    
    console.log(`  - Enrollments: ${enrollments ? enrollments.length : 0}`);
    console.log(`  - Total Registered Hours: ${total_registered_hours}`);
    console.log(`  - Used Hours: ${used_hours}`);
    console.log(`  - New Remaining Hours: ${remaining_hours}`);
    
    // 3. Update Student
    await supabase.from('students').update({
      total_registered_hours,
      total_registered_cost,
      remaining_hours
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

  console.log(`\nDONE. Processed ${totalProcessed} students.`);
}

run().catch(console.error);

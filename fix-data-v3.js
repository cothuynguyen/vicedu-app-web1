const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhhb2Fiemh4Z2NqamVqZmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA2ODU2NywiZXhwIjoyMDk2NjQ0NTY3fQ.ndCt3uia9-GPGr0BBLn3EnIdVcbtPm9vXwjk4E2d07M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStuckDataV3() {
  console.log('⏳ Đang lấy danh sách học viên...');
  const { data: students, error: stuError } = await supabase.from('students').select('id, full_name, migrated_studied_hours, total_registered_hours, total_registered_cost');
  
  if (stuError) {
    console.error('❌ Lỗi lấy danh sách học viên:', stuError);
    return;
  }

  console.log(`✅ Tìm thấy ${students.length} học viên. Đang tính lại tổng giờ (nhân với Số giờ mỗi buổi)...`);

  let successCount = 0;
  for (const student of students) {

    // 1. Lấy Điểm danh kèm theo thông tin Lớp học để lấy hours_per_session
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('presence_status, class_sessions!inner(classes!inner(hours_per_session))')
      .eq('student_id', student.id)
      .in('presence_status', ['Có mặt', 'Vắng phép', 'Vắng không phép']);

    if (attError) {
      console.error(attError);
      continue;
    }

    let attendance_hours = 0;
    if (attendance) {
      attendance.forEach(att => {
        // Lấy hours_per_session từ relation
        const hours = att.class_sessions?.classes?.hours_per_session || 0;
        attendance_hours += hours;
      });
    }

    const migrated_studied_hours = student.migrated_studied_hours || 0;
    const total_studied_hours = migrated_studied_hours + attendance_hours;
    const total_registered_hours = student.total_registered_hours || 0;
    const total_registered_cost = student.total_registered_cost || 0;
    
    let remaining_hours = total_registered_hours - total_studied_hours;
    if (remaining_hours < 0) remaining_hours = 0;

    const rate = total_registered_hours > 0 ? total_registered_cost / total_registered_hours : 0;
    const remaining_cost = Math.round(remaining_hours * rate);

    const payload = {
      total_studied_hours,
      remaining_hours,
      remaining_cost
    };

    const { error: updateError } = await supabase
      .from('students')
      .update(payload)
      .eq('id', student.id);

    if (!updateError) {
      successCount++;
    }
  }

  console.log(`🎉 Đã tính lại chuẩn xác Giờ học cho ${successCount}/${students.length} học viên!`);
}

fixStuckDataV3();

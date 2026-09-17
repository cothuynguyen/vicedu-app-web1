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

async function fixStuckDataV2() {
  console.log('⏳ Đang lấy danh sách học viên...');
  const { data: students, error: stuError } = await supabase.from('students').select('id, full_name');
  
  if (stuError) {
    console.error('❌ Lỗi lấy danh sách học viên:', stuError);
    return;
  }

  console.log(`✅ Tìm thấy ${students.length} học viên. Đang tiến hành bóc tách Giờ chuyển giao...`);

  let successCount = 0;
  for (const student of students) {
    // 1. Lấy Hợp đồng (để tính Giờ đăng ký và bóc tách Giờ chuyển giao)
    const { data: enrollments, error: enrError } = await supabase
      .from('enrollments')
      .select('registered_hours, remaining_hours, tuition_fee')
      .eq('student_id', student.id);

    // 2. Lấy Điểm danh (để đếm Giờ học thực tế)
    const { data: attendance, error: attError } = await supabase
      .from('attendance')
      .select('presence_status')
      .eq('student_id', student.id)
      .in('presence_status', ['Có mặt', 'Vắng phép', 'Vắng không phép']);

    if (enrError || attError) continue;

    let total_registered_hours = 0;
    let total_registered_cost = 0;
    let migrated_studied_hours = 0;

    enrollments.forEach(enr => {
      const regHours = enr.registered_hours || 0;
      const remHours = enr.remaining_hours ?? regHours;
      const fee = enr.tuition_fee || 0;

      total_registered_hours += regHours;
      total_registered_cost += fee;

      // Bóc tách giờ chuyển giao: Số giờ chênh lệch giữa Đăng ký và Còn lại chính là Giờ đã học ở phần mềm cũ
      if (regHours > remHours) {
        migrated_studied_hours += (regHours - remHours);
      }
    });

    const attendance_count = attendance ? attendance.length : 0;
    const total_studied_hours = migrated_studied_hours + attendance_count;
    
    let remaining_hours = total_registered_hours - total_studied_hours;
    if (remaining_hours < 0) remaining_hours = 0;

    const rate = total_registered_hours > 0 ? total_registered_cost / total_registered_hours : 0;
    const remaining_cost = Math.round(remaining_hours * rate);

    const payload = {
      total_registered_hours,
      total_registered_cost,
      migrated_studied_hours,
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

  console.log(`🎉 Đã tái cấu trúc thành công kiến trúc Giờ học cho ${successCount}/${students.length} học viên!`);
}

fixStuckDataV2();

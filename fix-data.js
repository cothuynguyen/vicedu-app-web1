const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

// 1. Fix Mojibake in StudentModal.tsx
const modalPath = path.join(__dirname, 'src/components/students/StudentModal.tsx');
let modalCode = fs.readFileSync(modalPath, 'utf8');

// Replace the corrupted status check using regex (to match any weird characters between the quotes)
const regex = /rec\.status\s*===\s*'.*?'\s*\?\s*sum\s*\+\s*\(rec\.amount\s*\|\|\s*0\)/g;
const correctStr = "rec.status === 'Đã duyệt' ? sum + (rec.amount || 0)";

if (regex.test(modalCode)) {
  modalCode = modalCode.replace(regex, correctStr);
  fs.writeFileSync(modalPath, modalCode, 'utf8');
  console.log('✅ Đã sửa lỗi Font chữ trong StudentModal.tsx thành công!');
} else {
  console.log('⚠️ Không tìm thấy chuỗi bị lỗi trong StudentModal.tsx (có thể đã được sửa).');
}

// 2. Fix stuck data (Dữ liệu kẹt) in Supabase
const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhhb2Fiemh4Z2NqamVqZmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA2ODU2NywiZXhwIjoyMDk2NjQ0NTY3fQ.ndCt3uia9-GPGr0BBLn3EnIdVcbtPm9vXwjk4E2d07M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixStuckData() {
  console.log('⏳ Đang lấy danh sách học viên...');
  const { data: students, error: stuError } = await supabase.from('students').select('id, full_name');
  
  if (stuError) {
    console.error('❌ Lỗi lấy danh sách học viên:', stuError);
    return;
  }

  console.log(`✅ Tìm thấy ${students.length} học viên. Đang tiến hành đồng bộ dữ liệu...`);

  let successCount = 0;
  for (const student of students) {
    // Lấy Hợp đồng (Enrollments)
    const { data: enrollments, error: enrError } = await supabase
      .from('enrollments')
      .select('registered_hours, remaining_hours, tuition_fee')
      .eq('student_id', student.id);

    // Lấy Phiếu thu (Receipts)
    const { data: receipts, error: recError } = await supabase
      .from('receipts')
      .select('amount, status')
      .eq('student_id', student.id);

    if (enrError || recError) continue;

    // Tính toán lại các số liệu
    let total_registered_hours = 0;
    let total_registered_cost = 0;
    let remaining_hours = 0;
    let remaining_cost = 0;

    enrollments.forEach(enr => {
      const regHours = enr.registered_hours || 0;
      const remHours = enr.remaining_hours ?? regHours;
      const fee = enr.tuition_fee || 0;
      const rate = regHours > 0 ? fee / regHours : 0;

      total_registered_hours += regHours;
      total_registered_cost += fee;
      remaining_hours += remHours;
      remaining_cost += (remHours * rate);
    });

    // Chỉ tính các phiếu thu 'Đã duyệt'
    let total_paid = 0;
    receipts.forEach(rec => {
      if (rec.status === 'Đã duyệt') {
        total_paid += (rec.amount || 0);
      }
    });

    // Cập nhật lại vào bảng students
    const payload = {
      total_registered_hours,
      total_registered_cost,
      remaining_hours,
      remaining_cost,
      total_paid
    };

    const { error: updateError } = await supabase
      .from('students')
      .update(payload)
      .eq('id', student.id);

    if (!updateError) {
      successCount++;
    }
  }

  console.log(`🎉 Đã đồng bộ thành công dữ liệu tài chính cho ${successCount}/${students.length} học viên!`);
}

fixStuckData();

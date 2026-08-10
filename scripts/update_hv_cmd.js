const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://qrvxaoabzhxgcjjejffq.supabase.co', 'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf');

async function updateHV(studentId) {
  console.log(`Bắt đầu cập nhật tài chính cho học viên: ${studentId}`);
  const { data: enrollments } = await supabase.from('enrollments').select('tuition_fee, registered_hours').eq('student_id', studentId);
  let totalRegisteredCost = 0;
  let totalRegisteredHours = 0;
  if (enrollments) {
    totalRegisteredCost = enrollments.reduce((sum, enr) => sum + (Number(enr.tuition_fee) || 0), 0);
    totalRegisteredHours = enrollments.reduce((sum, enr) => sum + (Number(enr.registered_hours) || 0), 0);
  }
  const { data: receipts } = await supabase.from('receipts').select('amount').eq('student_id', studentId);
  let totalPaid = 0;
  if (receipts) {
    totalPaid = receipts.reduce((sum, rec) => sum + (Number(rec.amount) || 0), 0);
  }
  const remainingCost = totalRegisteredCost - totalPaid;
  console.log(`- Tổng đăng ký: ${totalRegisteredCost.toLocaleString()} đ`);
  console.log(`- Tổng giờ: ${totalRegisteredHours} h`);
  console.log(`- Đã nộp (Ví): ${totalPaid.toLocaleString()} đ`);
  console.log(`- Còn nợ: ${remainingCost.toLocaleString()} đ`);
  const { data, error } = await supabase.from('students').update({
    total_registered_cost: totalRegisteredCost,
    total_registered_hours: totalRegisteredHours,
    total_paid: totalPaid,
    remaining_cost: remainingCost
  }).eq('id', studentId).select('id, full_name');
  if (error) console.error(error);
  else console.log('=> Cập nhật THÀNH CÔNG cho:', data);
}

updateHV('VICVT1009');

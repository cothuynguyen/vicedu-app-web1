const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const studentId = 'VICTQ084';
  
  const { data: student, error: err1 } = await supabase.from('students').select('*').eq('id', studentId).single();
  console.log("=== STUDENT INFO ===");
  console.log(student);
  
  const { data: receipts, error: err2 } = await supabase.from('receipts').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  console.log("\n=== RECEIPTS ===");
  console.log(receipts);
  
  const { data: enrollments, error: err3 } = await supabase.from('enrollments').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  console.log("\n=== ENROLLMENTS ===");
  console.log(enrollments);
  
  // Also check checkins table since the context mentions "điểm danh"
  const { data: checkins, error: err4 } = await supabase.from('student_checkins').select('*').eq('student_id', studentId).order('created_at', { ascending: false });
  console.log("\n=== CHECKINS ===");
  if (checkins) {
     console.log(`Total checkin records: ${checkins.length}`);
     const statusCount = checkins.reduce((acc, curr) => {
         acc[curr.status] = (acc[curr.status] || 0) + 1;
         return acc;
     }, {});
     console.log("Status distribution:", statusCount);
  } else {
     console.log("Error or No checkins:", err4);
  }
}

check();

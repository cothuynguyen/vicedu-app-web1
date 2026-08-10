const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://qrvxaoabzhxgcjjejffq.supabase.co', 
  'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf'
);

async function findReceipts() {
  const { data: students, error: stuErr } = await supabase
    .from('students')
    .select('id, full_name, branch_id')
    .ilike('full_name', '%Nam%');
    
  if (stuErr) {
    console.error("Student search error:", stuErr);
    return;
  }
  
  console.log("Found students:", students);
  
  const { data: receipts, error: recErr } = await supabase
    .from('receipts')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (recErr) {
    console.error("Receipts error:", recErr);
    return;
  }
  
  console.log("Total receipts found in DB:", receipts.length);
  
  const suspiciousReceipts = receipts.filter(r => {
    return (r.created_by && r.created_by.includes("Thảo")) || 
           students.some(s => s.id === r.student_id);
  });
  
  console.log("Suspicious Receipts:", JSON.stringify(suspiciousReceipts, null, 2));
}

findReceipts();

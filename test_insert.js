const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const installPayload = {
    branch_id: "Việt Trì 1",
    student_id: "ST001",
    student_name: "Test Name",
    parent_name: "Test Parent",
    parent_phone: "0123",
    total_tuition: 1000000,
    staff_name: "Admin",
    notes: `Tạo tự động do đổi hình thức sang Trả góp`
  };
  
  console.log("Trying to insert:", installPayload);
  const { data, error } = await supabase.from("installments").insert([installPayload]);
  
  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success!");
  }
}

testInsert();

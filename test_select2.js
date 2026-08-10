const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSelect2() {
  const { data, error } = await supabase.from('installments').select('branch_id').limit(1);
  console.log("data:", data, "error:", error);
}

testSelect2();

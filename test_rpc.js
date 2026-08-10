const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  const { data, error } = await supabase.from('installments').select('*').limit(1);
  if (error) {
    console.error("Table check error:", error.message);
  } else {
    console.log("Table exists! Rows found:", data.length);
  }
}

checkTable();

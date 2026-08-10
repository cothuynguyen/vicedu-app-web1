const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSelect() {
  const { data, error } = await supabase.from('installments').select('*').limit(1);
  if (data && data.length > 0) {
    console.log("Installments keys:", Object.keys(data[0]));
  } else if (data && data.length === 0) {
    console.log("Table is empty but exists.");
  } else {
    console.log("Error:", error);
  }
}

testSelect();

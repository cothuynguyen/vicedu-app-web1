const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qrvxaoabzhxgcjjejffq.supabase.co',
  'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf' // Anon key
);

async function inspect() {
  const { data, error } = await supabase
    .from('classes')
    .select('class_name, branch_id');
    
  if (error) {
    console.error("Error querying classes:", error);
  } else {
    console.log("Classes found with anon key:", data.length, data.slice(0, 5));
  }
}

inspect();

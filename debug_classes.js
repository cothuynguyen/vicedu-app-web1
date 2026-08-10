const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.from('classes').select('*, class_students(count)').order('created_at', { ascending: false });
  if (error) {
    console.error('FETCH ERROR:', error);
  } else {
    console.log('FETCH SUCCESS:', data.length, 'records');
  }
}
test();

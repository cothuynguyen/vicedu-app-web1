const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: all, error } = await supabase.from('classes').select('id, class_name, end_date');
  if (error) { 
    console.error(error); 
    return; 
  }
  
  const missing = all.filter(c => !c.end_date);
  console.log(`Tổng số lớp học: ${all.length}`);
  console.log(`Số lớp chưa có end_date: ${missing.length}`);
  if (missing.length > 0) {
    console.log(`Danh sách: ${missing.map(c => c.class_name).join(', ')}`);
  }
}
run();

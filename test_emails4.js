const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if(parts.length > 1) acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: logs } = await supabase.from('student_care_logs').select('*, students(full_name, parent_email)').order('created_at', { ascending: false }).limit(5);
  console.log('Recent Logs:', JSON.stringify(logs, null, 2));
}
run();

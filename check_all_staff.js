const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: users, error } = await supabase.from('users').select('id, full_name, role, department, branch_id, nickname, status');
  if (error) {
    console.error(error);
    return;
  }
  
  const statuses = new Set(users.map(u => u.status));
  console.log("Distinct Statuses:", Array.from(statuses));
  
  // Filter active users: let's filter users who have status not equal to 'Nghỉ việc' or 'Nghỉ' or 'Đã nghỉ'
  const activeUsers = users.filter(u => u.status !== 'Nghỉ việc' && u.status !== 'Đã nghỉ' && u.status !== 'Nghỉ');
  console.log("Active Users List:");
  console.log(JSON.stringify(activeUsers, null, 2));
}
run();

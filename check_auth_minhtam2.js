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
  let allUsers = [];
  let page = 1;
  while (true) {
    const { data: users, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) { console.error(error); break; }
    allUsers = allUsers.concat(users.users);
    if (users.users.length < 100) break;
    page++;
  }
  const u = allUsers.find(u => u.email === 'minhtam2@vicedu.com');
  console.log('User in Auth:', u ? u.raw_user_meta_data : 'Not Found');
}
run();

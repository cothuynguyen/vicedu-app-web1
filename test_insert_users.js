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
  const testUser = {
    id: 'TEST_MINHTAM1',
    full_name: 'Nguyễn Minh Tâm',
    email: 'minhtam1@vicedu.com',
    password: 'Toiyeuvicedu',
    role: 'Phụ huynh VIC',
    phone: '0977607579',
    department: 'Khách hàng',
    status: 'Hoạt động',
    branch_id: 'Việt Trì 1'
  };
  const { error: err2 } = await supabase.from('users').insert([testUser]);
  console.log('Inserted into users:', err2 ? err2.message : 'Success');
}
run();

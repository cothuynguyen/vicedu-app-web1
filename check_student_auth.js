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
  const email = 'minhtam@vicedu.com';
  
  // Kiểm tra trong students table
  const { data: student, error: err1 } = await supabase.from('students').select('*').eq('parent_email', email).single();
  console.log('Student in database:', student ? 'Found' : 'Not Found', student?.full_name);

  // Kiểm tra trong auth.users
  const { data: authUsers, error: err2 } = await supabase.auth.admin.listUsers();
  if (err2) {
    console.error('Error fetching auth users:', err2.message);
    return;
  }
  const authUser = authUsers.users.find(u => u.email === email);
  console.log('User in auth.users:', authUser ? 'Found' : 'Not Found', authUser?.id);
  
  if (!authUser && student) {
    console.log('-> Lý do lỗi: Học viên có trong bảng students, nhưng KHÔNG ĐƯỢC TẠO TÀI KHOẢN trong hệ thống Đăng nhập (auth.users)');
  }
}
run();

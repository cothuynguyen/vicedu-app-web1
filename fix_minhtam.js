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
  
  const { data: student } = await supabase.from('students').select('*').eq('parent_email', email).single();
  
  if (student) {
    console.log('Tạo tài khoản thủ công cho:', student.full_name);
    const { error } = await supabase.auth.admin.createUser({
      email,
      password: 'Toiyeuvicedu',
      email_confirm: true,
      user_metadata: {
        role: 'Phụ huynh VIC',
        full_name: student.full_name,
        phone: student.parent_phone || ''
      }
    });
    if (error) console.error(error.message);
    else console.log('Tạo thành công!');
  }
}
run();

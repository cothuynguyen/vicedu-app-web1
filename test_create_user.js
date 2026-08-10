const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
});

const supabaseAdmin = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const email = 'minhtam3@vicedu.com';
  const fullName = 'Nguyễn Minh Tâm';
  const phone = '0977607579';
  
  const userMetadata = {
    role: 'Phụ huynh VIC',
    full_name: fullName,
    phone: phone || ''
  };

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'Toiyeuvicedu',
    email_confirm: true,
    user_metadata: userMetadata
  });

  if (error) console.error('Error:', error.message);
  else console.log('Created:', data.user.email);
}
run();

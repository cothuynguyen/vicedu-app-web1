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
  // Try calling an arbitrary RPC that might fail but give us info, 
  // or query a known table with an invalid column to see error.
  // Actually, I can just use supabase.rpc('get_tables') if it exists.
  // Since I can't do raw SQL, maybe there is a 'lms_users' table?
  const tables = ['lms_users', 'members', 'user_roles', 'student_roles', 'lms_profiles'];
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Found table: ${table}`);
    }
  }
}
run();

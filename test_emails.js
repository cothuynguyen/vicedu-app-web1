const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if(parts.length > 1) acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: students } = await supabase.from('students').select('full_name, parent_email').ilike('full_name', '%Tina%');
  console.log('Students:', students);
  const { data: subs } = await supabase.from('push_subscriptions').select('*');
  console.log('Subscriptions:', subs.map(s => ({ email: s.user_email })));
}
run();

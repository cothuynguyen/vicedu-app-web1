const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

env.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: custs } = await supabase.from('crm_customers').select('id').limit(10000);
  console.log("Rows actually returned when requesting 10000:", custs.length);
}

check();

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
  const { data: camps } = await supabase.from('crm_campaigns').select('id, name');
  const tiendungId = camps.find(c => c.name.includes('Tiên Dung'))?.id;

  const { data: custs } = await supabase.from('crm_customers').select('id, branch_id').eq('campaign_id', tiendungId).limit(10);
  
  console.log("Branches for Tiên Dung customers:");
  console.log(custs.map(c => c.branch_id));
}

check();

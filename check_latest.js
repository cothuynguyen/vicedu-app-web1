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

  // Get the latest 1000 customers (what CRMPage used to do)
  const { data: latestCusts } = await supabase.from('crm_customers').select('id, campaign_id').order('created_at', { ascending: false }).limit(1000);
  
  const tiendungInLatest = latestCusts.filter(c => c.campaign_id === tiendungId);
  console.log("Number of Tiên Dung customers in the latest 1000:", tiendungInLatest.length);
}

check();

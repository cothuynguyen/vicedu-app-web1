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
  const { data: users } = await supabase.from('users').select('id, full_name').ilike('full_name', '%Loan%');
  console.log("Users:", users);

  if (users && users.length > 0) {
    const loanId = users[0].id;
    const { data: inters } = await supabase.from('crm_interactions').select('*').eq('sale_id', loanId);
    console.log("Interactions for Loan:", inters ? inters.length : 0);
  }
}

check();

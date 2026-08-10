const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const b = 'Vi?t Trì';
  
  let q1 = await supabase
    .from('crm_interactions')
    .select(`id, customer:crm_customers!inner(branch_id)`)
    .limit(5)
    .ilike('customer.branch_id', `%${b}%`);

  let q2 = await supabase
    .from('crm_interactions')
    .select(`id, customer:crm_customers!inner(branch_id)`)
    .limit(5)
    .or(`customer.branch_id.ilike.%${b}%`);

  let q3 = await supabase
    .from('crm_interactions')
    .select(`id, customer:crm_customers!inner(branch_id)`)
    .limit(5)
    .or(`branch_id.ilike.%${b}%`, { foreignTable: 'customer' });

  let q4 = await supabase
    .from('crm_interactions')
    .select(`id, customer:crm_customers!inner(branch_id)`)
    .limit(5)
    .or(`branch_id.ilike.%${b}%`, { referencedTable: 'customer' });

  console.log("q1 ilike:", q1.error ? q1.error.message : q1.data.length);
  console.log("q2 or directly with customer:", q2.error ? q2.error.message : q2.data.length);
  console.log("q3 or foreignTable:", q3.error ? q3.error.message : q3.data.length);
  console.log("q4 or referencedTable:", q4.error ? q4.error.message : q4.data.length);
}
run();

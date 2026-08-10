const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const b = 'Vi?t Trì';
  const orCondition = "branch_id.ilike.%" + b + "%";
  
  let q1 = supabase
    .from('crm_interactions')
    .select(id, customer:crm_customers!inner(branch_id))
    .limit(5)
    .ilike('customer.branch_id', '%Vi?t Trì%');
    
  let q2 = supabase
    .from('crm_interactions')
    .select(id, crm_customers!inner(branch_id))
    .limit(5)
    .ilike('crm_customers.branch_id', '%Vi?t Trì%');

  let q3 = supabase
    .from('crm_interactions')
    .select(id, customer:crm_customers!inner(branch_id))
    .limit(5)
    .or(orCondition, { referencedTable: 'crm_customers' });

  let q4 = supabase
    .from('crm_interactions')
    .select(id, customer:crm_customers!inner(branch_id))
    .limit(5)
    .or(orCondition, { referencedTable: 'customer' });

  const [res1, res2, res3, res4] = await Promise.all([q1, q2, q3, q4]);
  
  console.log("q1 ilike (customer.branch_id):", res1.error ? res1.error.message : res1.data.length + ' rows');
  console.log("q2 ilike (crm_customers.branch_id):", res2.error ? res2.error.message : res2.data.length + ' rows');
  console.log("q3 or (crm_customers):", res3.error ? res3.error.message : res3.data.length + ' rows');
  console.log("q4 or (customer):", res4.error ? res4.error.message : res4.data.length + ' rows');
}
run();

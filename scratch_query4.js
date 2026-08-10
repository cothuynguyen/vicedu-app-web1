const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from("internal_campaigns")
    .select(`
      id, name, type, branch_id, created_at, status,
      internal_campaign_tasks (
        id, status, assigned_to,
        students ( branch_id )
      )
    `);
  console.log(JSON.stringify(data, null, 2));
}
run();

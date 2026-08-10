const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from("internal_campaigns")
    .select(`
      id, name,
      internal_campaign_tasks!inner (
        id, status,
        students!inner ( branch_id )
      )
    `)
    .ilike('internal_campaign_tasks.students.branch_id', '%Lâm Thao%');
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}
run();

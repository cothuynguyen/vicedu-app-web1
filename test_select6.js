const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qrvxaoabzhxgcjjejffq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhhb2Fiemh4Z2NqamVqZmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA2ODU2NywiZXhwIjoyMDk2NjQ0NTY3fQ.ndCt3uia9-GPGr0BBLn3EnIdVcbtPm9vXwjk4E2d07M'
);

async function inspect() {
  const { data, error } = await supabase
    .from('classes')
    .select('class_name, schedules, teacher_vn, teacher_foreign, status, branch_id')
    .or('class_name.eq.Kids 2A.1,class_name.eq.Kindy 8.1');
    
  if (error) {
    console.error("Error querying classes:", error);
  } else {
    console.log("Class data:", JSON.stringify(data, null, 2));
  }
}

inspect();

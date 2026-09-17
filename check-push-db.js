const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  console.log("Checking student 'Nguyễn Triệu Bảo Châu'...");
  const { data: std, error: err1 } = await supabase.from('students').select('*').ilike('full_name', '%Nguyễn Triệu Bảo Châu%').limit(1);
  if (err1) {
    console.error(err1);
    return;
  }
  if (!std || std.length === 0) {
    console.log("Student not found.");
    return;
  }
  const email = std[0].parent_email;
  console.log("Parent Email:", email);

  console.log("Checking push_subscriptions for this email...");
  const { data: subs, error: err2 } = await supabase.from('push_subscriptions').select('*').eq('user_email', email);
  if (err2) {
    console.error(err2);
    return;
  }
  console.log("Subscriptions found:", subs.length);
  subs.forEach((sub, i) => {
    console.log(`[${i+1}] Endpoint: ${sub.endpoint.substring(0, 50)}...`);
    console.log(`[${i+1}] Keys:`, sub.keys);
  });
}

check();

const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testQuery() {
  const { data, error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("User ID Type:", typeof data[0].id, "Value:", data[0].id);
  }
}
testQuery();

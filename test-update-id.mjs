import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('users').update({ id: 'NVVT001' }).eq('id', 'NV001');
  if (error) {
    console.error('Update failed:', error);
  } else {
    console.log('Update succeeded:', data);
  }
}
main();

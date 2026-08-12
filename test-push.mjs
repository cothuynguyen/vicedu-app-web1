import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data } = await supabase.from('students').select('id, full_name, parent_id').ilike('full_name', '%Bảo Châu%').limit(1);
  if (!data || data.length === 0) return console.log('Không tìm thấy Bảo Châu');
  
  const studentId = data[0].id;
  console.log('Tìm thấy:', data[0]);
  
  const r = await fetch('https://brain2-vic-edu.vercel.app/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ studentId, title: 'Test từ AI', body: 'Xem có ting không' })
  });
  const text = await r.text();
  console.log('API RESPONSE:', r.status, text);
}
test();

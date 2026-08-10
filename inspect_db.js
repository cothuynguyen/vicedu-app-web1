// no dotenv
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectData() {
  const { data: students, error } = await supabase.from('students').select('*').eq('branch_id', 'Dân Hòa');
  if (error) {
    console.error(error);
    return;
  }
  
  console.log(`Tổng số học viên Dân Hòa: ${students.length}`);

  // Tìm duplicate
  const map = {};
  students.forEach(s => {
    const key = `${s.full_name}-${s.parent_phone}`;
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });

  let duplicateCount = 0;
  for (const key in map) {
    if (map[key].length > 1) {
      duplicateCount++;
      console.log(`TRÙNG: ${key} (${map[key].length} hồ sơ)`);
    }
  }

  console.log(`Tổng số nhóm bị trùng: ${duplicateCount}`);
  console.log(`Tổng số học viên thực sự (không trùng): ${Object.keys(map).length}`);
}

inspectData();

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

async function run() {
  console.log("Bắt đầu càn quét cập nhật end_date cho tất cả các lớp...");
  const { data: classes, error } = await supabase.from('classes').select('id, class_name');
  if (error) { 
    console.error(error); 
    return; 
  }
  
  let updatedCount = 0;
  for (const cls of classes) {
    // Lấy tất cả buổi học của lớp này
    const { data: sessions } = await supabase.from('class_sessions').select('date').eq('class_id', cls.id);
    if (sessions && sessions.length > 0) {
      // Tìm ngày xa nhất
      const validDates = sessions.map(s => s.date).filter(Boolean).sort();
      if (validDates.length > 0) {
        const lastDate = validDates[validDates.length - 1];
        // Cập nhật vào bảng classes
        await supabase.from('classes').update({ end_date: lastDate }).eq('id', cls.id);
        updatedCount++;
      }
    }
  }
  console.log(`Đã cập nhật tự động thành công cho ${updatedCount}/${classes.length} lớp!`);
}
run();

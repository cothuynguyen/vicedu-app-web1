const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhhb2Fiemh4Z2NqamVqZmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA2ODU2NywiZXhwIjoyMDk2NjQ0NTY3fQ.ndCt3uia9-GPGr0BBLn3EnIdVcbtPm9vXwjk4E2d07M';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetMigratedHours() {
  console.log('⏳ Đang reset Giờ đã học (Hệ thống cũ) về 0 cho tất cả học viên...');
  
  // Update all students where migrated_studied_hours > 0 or IS NULL
  const { data, error } = await supabase
    .from('students')
    .update({ migrated_studied_hours: 0 })
    .neq('migrated_studied_hours', 0); // Only update those that are not 0 to save time
    
  if (error) {
    console.error('❌ Lỗi:', error);
  } else {
    console.log('🎉 Đã reset thành công! Trigger trong database đã tự động tính toán lại Tổng giờ học và Giờ còn lại dựa trên điểm danh thực tế.');
  }
}

resetMigratedHours();

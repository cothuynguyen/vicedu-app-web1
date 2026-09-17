const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function clearData() {
  console.log("Đang quét sạch dữ liệu giả lập khỏi bảng student_academic_kpis...");
  const { data, error } = await supabase
    .from('student_academic_kpis')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

  if (error) {
    console.error("Lỗi khi xóa:", error);
  } else {
    console.log("Đã dọn dẹp sạch sẽ toàn bộ bản ghi!");
  }
}

clearData();

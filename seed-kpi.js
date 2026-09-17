const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Fetching students...');
  const { data: students, error: fetchErr } = await supabase
    .from('students')
    .select('id')
    .limit(50);

  if (fetchErr || !students || students.length === 0) {
    console.error('Lỗi lấy danh sách học viên:', fetchErr);
    return;
  }
  console.log(`Đã lấy ${students.length} học viên. Bắt đầu tạo dữ liệu KPI giả...`);

  const weekStart = '2026-08-17';

  // Xóa KPI cũ của tuần này nếu có để không bị lỗi Unique Constraint
  const studentIds = students.map(s => s.id);
  await supabase
    .from('student_academic_kpis')
    .delete()
    .in('student_id', studentIds)
    .eq('week_start', weekStart);

  const kpisToInsert = students.map((s, index) => {
    // Tạo data ngẫu nhiên
    const randomSeed = Math.random();
    
    let razkids_count = 0;
    let btvn_count = 0;
    let active_days = 0;
    let behavior_label = 'Thiếu Padlet';
    let momentum_trend = 0;
    let streak_weeks = 0;
    
    if (randomSeed < 0.2) {
      // Nhóm Marathon (Bền bỉ)
      razkids_count = 5 + Math.floor(Math.random() * 3); // 5-7
      btvn_count = 2;
      active_days = 4 + Math.floor(Math.random() * 4); // 4-7
      behavior_label = 'Bền bỉ';
      momentum_trend = 1 + Math.floor(Math.random() * 3);
      streak_weeks = 2 + Math.floor(Math.random() * 5);
    } else if (randomSeed < 0.4) {
      // Nhóm Nước rút (Sprinter)
      razkids_count = 4 + Math.floor(Math.random() * 4); // 4-7
      btvn_count = 2;
      active_days = 1 + Math.floor(Math.random() * 2); // 1-2
      behavior_label = 'Nước rút';
      momentum_trend = 0;
      streak_weeks = 0;
    } else if (randomSeed < 0.6) {
      // Nhóm Chim sớm (Early Bird)
      razkids_count = 3 + Math.floor(Math.random() * 5); // 3-7
      btvn_count = 2;
      active_days = 3 + Math.floor(Math.random() * 3); // 3-5
      behavior_label = 'Chim sớm';
      momentum_trend = 2;
      streak_weeks = 1 + Math.floor(Math.random() * 3);
    } else if (randomSeed < 0.8) {
      // Nhóm Tàng hình (Ghost)
      razkids_count = Math.floor(Math.random() * 2); // 0-1
      btvn_count = 0;
      active_days = razkids_count;
      behavior_label = 'Tàng hình';
      momentum_trend = -2 - Math.floor(Math.random() * 3);
      streak_weeks = 0;
    } else {
      // Bình thường
      razkids_count = 2 + Math.floor(Math.random() * 3); // 2-4
      btvn_count = 1;
      active_days = 2 + Math.floor(Math.random() * 2); // 2-3
      behavior_label = 'Chưa phân loại';
      momentum_trend = -1 + Math.floor(Math.random() * 3); // -1 to 1
      streak_weeks = 0;
    }

    // Tính điểm 
    let diligence_score = (btvn_count * 30) + (razkids_count * 5.7);
    if (active_days > 0 && active_days <= 2 && (razkids_count + btvn_count) > 4) {
       diligence_score = diligence_score * 0.8; // Phạt 20%
    }
    if (diligence_score > 100) diligence_score = 100;

    return {
      student_id: s.id,
      week_start: weekStart,
      razkids_count,
      btvn_count,
      active_days,
      diligence_score: diligence_score.toFixed(2),
      streak_weeks,
      behavior_label,
      momentum_trend
    };
  });

  const { data, error } = await supabase.from('student_academic_kpis').insert(kpisToInsert);

  if (error) {
    console.error('Lỗi chèn dữ liệu:', error);
  } else {
    console.log('Đã tạo thành công 50 dữ liệu KPI giả lập để test!');
  }
}

seed();

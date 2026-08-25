import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PROJECT1_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PROJECT1_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const PADLET_API_KEY = process.env.PADLET_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !PADLET_API_KEY) {
  console.error("Thiếu biến môi trường! Vui lòng cung cấp SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PADLET_API_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const VN_OFFSET = 7 * 60 * 60 * 1000; // Múi giờ Việt Nam

// ==========================================
// THUẬT TOÁN THỜI GIAN
// ==========================================
function getWeekStartVn() {
  const vnNow = new Date(Date.now() + VN_OFFSET);
  let dayOfWeek = vnNow.getUTCDay() - 1; // 0 là Thứ Hai
  if (dayOfWeek === -1) dayOfWeek = 6;
  const thisWeekStartVn = new Date(vnNow);
  thisWeekStartVn.setUTCDate(vnNow.getUTCDate() - dayOfWeek);
  thisWeekStartVn.setUTCHours(0, 0, 0, 0);
  return thisWeekStartVn;
}

const thisWeekStartVn = getWeekStartVn();
const thisWeekStartUtc = new Date(thisWeekStartVn.getTime() - VN_OFFSET);
const weekStartString = thisWeekStartUtc.toISOString().split('T')[0]; // Định dạng: YYYY-MM-DD

// Lấy thứ 2 tuần trước để tính Động lượng (Momentum)
const lastWeekStartUtc = new Date(thisWeekStartUtc.getTime() - 7 * 24 * 60 * 60 * 1000);
const lastWeekString = lastWeekStartUtc.toISOString().split('T')[0];

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchPadletData(apiUrl) {
  try {
    const res = await fetch(apiUrl, {
      headers: { "X-Api-Key": PADLET_API_KEY, "Content-Type": "application/json" }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (error) {
    return null;
  }
}

// ==========================================
// HÀM CHÍNH (MAIN WORKER)
// ==========================================
async function runSync() {
  console.log(`[BẮT ĐẦU] Đồng bộ KPI Học thuật cho tuần: ${weekStartString}`);

  // 1. Lấy toàn bộ học viên đang học
  const { data: students, error: errStudents } = await supabase
    .from('students')
    .select('id, padlet_url, padlet_api, status');
    
  if (errStudents) {
    console.error("Lỗi lấy danh sách học viên:", errStudents);
    process.exit(1);
  }

  // Lọc học sinh (Ưu tiên trạng thái Đang học nếu có)
  const activeStudents = students.filter(s => s.status === 'Đang học' || !s.status);
  console.log(`Tìm thấy ${activeStudents.length} học viên.`);

  // 2. Lấy dữ liệu KPI tuần trước để tính Momentum & Streak
  const { data: lastWeekKpis } = await supabase
    .from('student_academic_kpis')
    .select('student_id, diligence_score, streak_weeks')
    .eq('week_start', lastWeekString);
    
  const lastWeekMap = new Map();
  if (lastWeekKpis) {
    lastWeekKpis.forEach(k => lastWeekMap.set(k.student_id, k));
  }

  // 3. Xử lý từng lô (Batch of 10) để chống bị Block
  const BATCH_SIZE = 10;
  const kpiRecords = [];

  for (let i = 0; i < activeStudents.length; i += BATCH_SIZE) {
    const batch = activeStudents.slice(i, i + BATCH_SIZE);
    console.log(`Đang xử lý lô ${i / BATCH_SIZE + 1}/${Math.ceil(activeStudents.length / BATCH_SIZE)}...`);

    const promises = batch.map(async (student) => {
      let record = {
        student_id: student.id,
        week_start: weekStartString,
        razkids_count: 0,
        btvn_count: 0,
        active_days: 0,
        diligence_score: null,
        behavior_label: null,
        momentum_trend: 0,
        streak_weeks: 0
      };

      const lastWeekData = lastWeekMap.get(student.id) || { diligence_score: 0, streak_weeks: 0 };
      const lastWeekScore = lastWeekData.diligence_score || 0;
      const lastWeekStreak = lastWeekData.streak_weeks || 0;

      // Xử lý lỗ hổng dữ liệu (Thiếu Padlet)
      if (!student.padlet_url || !student.padlet_api) {
        record.behavior_label = 'Thiếu Padlet';
        return record;
      }

      const padletData = await fetchPadletData(student.padlet_api);
      if (!padletData || !padletData.included) {
        record.behavior_label = 'Lỗi Padlet API';
        return record;
      }

      // Lọc section (Razkids, BTVN)
      const sections = padletData.included.filter(item => item.type === "section");
      const sectionMap = new Map();
      sections.forEach(sec => {
        if (sec.id && sec.attributes?.title) {
          const lowerTitle = sec.attributes.title.toLowerCase();
          if (lowerTitle.includes("razkids")) sectionMap.set(sec.id, "Razkids");
          else if (lowerTitle.includes("bài tập") || lowerTitle.includes("homework") || lowerTitle.includes("btvn")) sectionMap.set(sec.id, "BTVN");
        }
      });

      // Phân tích bài đăng tuần này
      const posts = padletData.included.filter(item => item.type === "post");
      let razCount = 0;
      let btvnCount = 0;
      const activeDaysSet = new Set();

      posts.forEach(post => {
        const createdAtStr = post.attributes?.createdAt;
        if (!createdAtStr) return;
        const createdAt = new Date(createdAtStr);
        if (createdAt < thisWeekStartUtc) return;

        const sectionId = post.relationships?.section?.data?.id;
        const category = sectionMap.get(sectionId);
        if (!category) return;

        // Ghi nhận Active Days
        const vnDate = new Date(createdAt.getTime() + VN_OFFSET);
        activeDaysSet.add(vnDate.toISOString().split('T')[0]);

        if (category === "Razkids") razCount++;
        if (category === "BTVN") btvnCount++;
      });

      // TOÁN HỌC: Đánh giá 3 Chiều
      const activeDays = activeDaysSet.size;
      const cappedBtvn = Math.min(btvnCount, 2);
      
      // Chiều 1: Điểm tuyệt đối
      // Đã gỡ trần điểm Razkids để khuyến khích Vượt chỉ tiêu
      let score = (cappedBtvn / 2 * 60) + (razCount / 7 * 40);

      // Chiều 2: Tính Đều đặn (Consistency)
      if (score >= 90 && activeDays <= 2) {
        score = score * 0.8; // Phạt 20% tội học nhồi
      }

      // Gắn nhãn Chân dung Hành vi đa chiều (Time-aware Logic)
      const vnNow = new Date(Date.now() + VN_OFFSET);
      let dayOfWeek = vnNow.getUTCDay(); 
      dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0: Thứ 2, ..., 6: Chủ Nhật

      let label = 'Bình thường';
      
      if (activeDays === 0) {
        label = 'Tàng hình';
      } else if (score > 100) {
        label = 'Vượt chỉ tiêu';
      } else if (dayOfWeek >= 3) { 
        // Từ Thứ 5 đến Chủ Nhật (dayOfWeek >= 3): Siết chặt kỷ luật
        if (activeDays === 1 && score < 10) {
          label = 'Tàng hình';
        } else if (score < 30) {
          label = 'Cưỡi ngựa xem hoa';
        } else if (score >= 40 && activeDays <= 2) {
          label = 'Nước rút';
        } else if (score >= 40 && activeDays >= 4) {
          label = 'Bền bỉ';
        }
      }

      // Chiều 3: Tính Streak
      let streak = 0;
      if (score >= 80) streak = lastWeekStreak + 1;

      // Tính Động lượng (So sánh điểm với tuần trước)
      const momentum = Math.round(score - lastWeekScore);

      record.razkids_count = razCount;
      record.btvn_count = btvnCount;
      record.active_days = activeDays;
      record.diligence_score = Math.round(score * 10) / 10;
      record.behavior_label = label;
      record.momentum_trend = momentum;
      record.streak_weeks = streak;

      return record;
    });

    const batchResults = await Promise.all(promises);
    kpiRecords.push(...batchResults);

    // Dừng 3 giây giữa các lô
    if (i + BATCH_SIZE < activeStudents.length) {
      await delay(3000);
    }
  }

  // 4. UPSERT (Ghi đè) vào Supabase
  console.log(`[UPSERT] Đang ghi đè ${kpiRecords.length} bản ghi vào Database...`);
  const { error: upsertErr } = await supabase
    .from('student_academic_kpis')
    .upsert(kpiRecords, { onConflict: 'student_id, week_start' });

  if (upsertErr) {
    console.error("Lỗi khi ghi dữ liệu:", upsertErr);
    process.exit(1);
  }

  console.log("[THÀNH CÔNG] Đã ghi đè toàn bộ điểm KPI!");
}

runSync();

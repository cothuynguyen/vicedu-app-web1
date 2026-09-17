import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PROJECT1_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.PROJECT1_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log("Fetching all KPIs...");
  const { data: kpis, error } = await supabase.from('student_academic_kpis').select('*');
  if (error) {
    console.error("Error fetching kpis:", error);
    process.exit(1);
  }

  console.log(`Found ${kpis.length} KPIs to process.`);
  const updates = [];

  for (const kpi of kpis) {
    const { razkids_count, btvn_count, active_days, id, student_id, week_start } = kpi;
    
    const cappedBtvn = Math.min(btvn_count || 0, 2);
    let score = (cappedBtvn / 2 * 60) + ((razkids_count || 0) / 7 * 40);

    if (score >= 90 && active_days <= 2) {
      score = score * 0.8;
    }

    const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000); // VN offset
    let dayOfWeek = vnNow.getUTCDay(); 
    dayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0: Thứ 2, ..., 6: Chủ Nhật

    let label = 'Bình thường';
      
    if (active_days === 0) {
      label = 'Tàng hình';
    } else if (score > 100) {
      label = 'Vượt chỉ tiêu';
    } else if (dayOfWeek >= 3) { 
      if (active_days === 1 && score < 10) {
        label = 'Tàng hình';
      } else if (score < 30) {
        label = 'Cưỡi ngựa xem hoa';
      } else if (score >= 40 && active_days <= 2) {
        label = 'Nước rút';
      } else if (score >= 40 && active_days >= 4) {
        label = 'Bền bỉ';
      }
    }

    const roundedScore = Math.round(score * 10) / 10;
    
    // Only add to update list if score or label changed
    if (roundedScore !== kpi.diligence_score || label !== kpi.behavior_label) {
      updates.push({
        id,
        student_id,
        week_start,
        diligence_score: roundedScore,
        behavior_label: label
      });
    }
  }

  console.log(`Need to update ${updates.length} KPIs.`);
  
  if (updates.length > 0) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE);
      const { error: upsertErr } = await supabase.from('student_academic_kpis').upsert(batch);
      if (upsertErr) {
        console.error("Error updating batch:", upsertErr);
      } else {
        console.log(`Updated batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)}`);
      }
    }
  }
  
  console.log("Done!");
}

run();

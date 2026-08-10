const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching all Dân Hòa students...");
  const { data: students, error } = await supabase.from('students').select('*').eq('branch_id', 'Dân Hòa');
  if (error) throw error;
  
  const map = {};
  students.forEach(s => {
    const key = `${s.full_name}-${s.parent_phone}`;
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });

  let index = 1;

  for (const key of Object.keys(map)) {
    const group = map[key];
    console.log(`Processing group ${index}: ${key} (${group.length} records)`);
    
    let bestStudent = group[0];
    let maxScore = -1;

    for (const s of group) {
      let score = 0;
      
      const { data: classStudents } = await supabase.from('class_students').select('id').eq('student_id', s.id);
      if (classStudents && classStudents.length > 0) score += 1000;

      const { data: enrollments } = await supabase.from('enrollments').select('amount, created_at, updated_at').eq('student_id', s.id);
      if (enrollments) {
        enrollments.forEach(en => {
          if (en.amount > 100000) score += 100;
          if (new Date(en.updated_at).getTime() > new Date(en.created_at).getTime()) score += 50;
        });
      }
      
      score += s.remaining_hours || 0;

      if (score > maxScore) {
        maxScore = score;
        bestStudent = s;
      }
    }

    const keepStudent = bestStudent;
    const junkStudents = group.filter(s => s.id !== keepStudent.id);

    const targetId = `VICDH${index.toString().padStart(3, '0')}`;
    
    for (const junk of junkStudents) {
      console.log(`  Deleting junk student ${junk.id}`);
      await supabase.from('enrollments').delete().eq('student_id', junk.id);
      await supabase.from('installments').delete().eq('student_id', junk.id);
      await supabase.from('students').delete().eq('id', junk.id);
    }

    if (keepStudent.id !== targetId) {
      console.log(`  Migrating keep student ${keepStudent.id} -> ${targetId}`);
      
      await supabase.from('students').delete().eq('id', targetId);

      const newStudent = { ...keepStudent, id: targetId };
      const { error: insertErr } = await supabase.from('students').insert([newStudent]);
      if (insertErr) {
        console.error("  FAILED TO INSERT NEW STUDENT", targetId, insertErr.message);
        throw insertErr;
      }

      await supabase.from('enrollments').update({ student_id: targetId }).eq('student_id', keepStudent.id);
      await supabase.from('installments').update({ student_id: targetId }).eq('student_id', keepStudent.id);
      await supabase.from('class_students').update({ student_id: targetId }).eq('student_id', keepStudent.id);
      await supabase.from('attendance').update({ student_id: targetId }).eq('student_id', keepStudent.id);
      await supabase.from('care_logs').update({ student_id: targetId }).eq('student_id', keepStudent.id);

      await supabase.from('students').delete().eq('id', keepStudent.id);
    } else {
      console.log(`  Keep student already has target ID ${targetId}. No migration needed.`);
    }

    index++;
  }

  console.log("DONE");
}

run().catch(console.error);

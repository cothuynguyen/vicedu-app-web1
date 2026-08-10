const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
});

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    // We want to reset "Số giờ đã học" (total_studied_hours) to 0 
    // for all students of "Việt Trì 1".
    // 
    // This implies for `students` table:
    // total_studied_hours = 0
    // total_studied_cost = 0
    // remaining_hours = total_registered_hours
    // remaining_cost = total_registered_cost
    
    console.log("Fetching students of Việt Trì 1...");
    const { data: vt1, error: err1 } = await supabase.from('students').select('*').ilike('branch_id', '%việt trì 1%');
    if (err1) {
        console.error("Error fetching students:", err1);
        return;
    }
    
    console.log(`Found ${vt1.length} students. Updating...`);
    let updatedCount = 0;
    
    for (const student of vt1) {
        if (student.total_studied_hours !== 0 || student.remaining_hours !== student.total_registered_hours) {
            const { error: updateErr } = await supabase.from('students').update({
                total_studied_hours: 0,
                total_studied_cost: 0,
                remaining_hours: student.total_registered_hours,
                remaining_cost: student.total_registered_cost
            }).eq('id', student.id);
            
            if (updateErr) {
                console.error(`Error updating student ${student.id}:`, updateErr);
            } else {
                updatedCount++;
            }
        }
    }
    
    console.log(`Updated ${updatedCount} students.`);
    
    // Check enrollments for those students to reset remaining_hours = hours
    const studentIds = vt1.map(s => s.id);
    console.log("Fetching enrollments...");
    const { data: enrolls, error: err2 } = await supabase.from('enrollments').select('*').in('student_id', studentIds);
    
    if (err2) {
        console.error("Error fetching enrollments:", err2);
        return;
    }
    
    console.log(`Found ${enrolls.length} enrollments. Updating...`);
    let enrollUpdateCount = 0;
    
    for (const enroll of enrolls) {
        const expectedRemaining = enroll.registered_hours + enroll.bonus_hours;
        if (enroll.remaining_hours !== expectedRemaining) {
            const { error: enrollUpdateErr } = await supabase.from('enrollments').update({
                remaining_hours: expectedRemaining
            }).eq('id', enroll.id);
            
            if (enrollUpdateErr) {
                console.error(`Error updating enrollment ${enroll.id}:`, enrollUpdateErr);
            } else {
                enrollUpdateCount++;
            }
        }
    }
    console.log(`Updated ${enrollUpdateCount} enrollments.`);
}
run();

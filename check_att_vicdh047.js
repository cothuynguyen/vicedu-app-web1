const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function run() {
    const studentId = 'VICDH047';
    
    const { data: att, error } = await supabase.from('attendance')
        .select('*')
        .eq('student_id', studentId);

    if (error) {
        console.error("Error fetching attendance:", error);
        return;
    }

    if (!att) {
        console.log("No attendance data.");
        return;
    }

    console.log(`Total attendance records: ${att.length}`);
    
    let studiedCount = 0;
    let notStudiedCount = 0;

    att.forEach(a => {
        if (a.presence_status === 'Chưa vào lớp') {
            notStudiedCount++;
        } else {
            studiedCount++;
        }
    });

    console.log(`Studied count: ${studiedCount}`);
    console.log(`Chưa vào lớp count: ${notStudiedCount}`);
    console.log("Details of studied:");
    console.log(att.filter(a => a.presence_status !== 'Chưa vào lớp'));
}
run().catch(console.error);

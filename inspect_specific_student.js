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
const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']);

async function run() {
    const studentId = 'VICVT1422';
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    console.log("Student:", st);
    
    const { data: enrolls } = await supabase.from('enrollments').select('*').eq('student_id', studentId);
    console.log("Enrollments:", enrolls);
}
run();

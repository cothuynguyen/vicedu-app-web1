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
const sb = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

async function test() {
    const { data: stu } = await sb.from('students').select('*').eq('id', 'VICLT120');
    console.log("Student:", stu);
    const { data: enrs } = await sb.from('enrollments').select('*').eq('student_id', 'VICLT120');
    console.log("Enrollments:", enrs);
}
test();

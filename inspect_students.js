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
    const { data: vt1, error: err3 } = await supabase.from('students').select('*').ilike('branch_id', '%việt trì 1%');
    console.log(`Found ${vt1 ? vt1.length : 0} Việt Trì 1 Students`);
    if (vt1 && vt1.length > 0) {
        console.log("Sample student:", vt1[0]);
        // Let's get enrollments for these students
        const studentIds = vt1.map(s => s.id);
        const { data: enrolls, error: err4 } = await supabase.from('enrollments').select('*').in('student_id', studentIds);
        console.log(`Found ${enrolls ? enrolls.length : 0} enrollments for these students`);
        if (enrolls && enrolls.length > 0) {
            console.log("Sample enrollment:", enrolls[0]);
        }
    }
}
run();

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

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const studentId = 'VICVT1175';

    console.log(`Fixing enrollment amount for ${studentId}...`);
    const { error: err2 } = await supabase
        .from('enrollments')
        .update({
            amount: 100000
        })
        .eq('student_id', studentId)
        .eq('note', 'System Migration');
        
    if (err2) console.error('Error fixing enrollment:', err2);
    else console.log('Successfully fixed enrollment amount.');
}

run();

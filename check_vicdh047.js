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
    const studentId = 'VICDH047';
    
    console.log("=== STUDENT ===");
    const { data: st } = await supabase.from('students').select('*').eq('id', studentId).single();
    console.log(st);
    
    console.log("\n=== ENROLLMENTS ===");
    const { data: enrolls } = await supabase.from('enrollments').select('*').eq('student_id', studentId);
    console.log(enrolls);

    console.log("\n=== TRANSACTIONS ===");
    const { data: txns } = await supabase.from('transactions').select('*').eq('student_id', studentId);
    console.log(txns);

    console.log("\n=== ATTENDANCE ===");
    const { data: att } = await supabase.from('attendance').select('*').eq('student_id', studentId);
    console.log(att ? `Count: ${att.length}` : "No attendance table or data");
    if(att && att.length > 0) {
        console.log(att.slice(0, 5));
    }

    console.log("\n=== CONTRACTS / RECEIPTS ===");
    // try fetching from receipts if transactions doesn't have it
    const { data: receipts } = await supabase.from('receipts').select('*').eq('student_id', studentId);
    if (receipts) console.log("Receipts:", receipts);
}
run().catch(console.error);

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// 1. Read .env.local
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
    const totalHours = 100;
    const remainingHours = 90;
    const totalCost = 100000;
    
    console.log(`Starting fix for ${studentId}...`);

    // Lấy branch_id của học viên để tạo enrollment
    const { data: student } = await supabase.from('students').select('branch_id').eq('id', studentId).single();
    const branch_id = student ? student.branch_id : 'Việt Trì 1';

    // Insert enrollment
    const { error: err2 } = await supabase
        .from('enrollments')
        .insert([{
            student_id: studentId,
            branch_id: branch_id,
            transaction_type: 'Ký Hợp đồng',
            note: 'System Migration',
            registered_hours: totalHours,
            remaining_hours: remainingHours,
            tuition_fee: totalCost,
            payment_method: 'Chuyển khoản',
            created_by: 'System Admin'
        }]);

    if (err2) console.error('Error inserting enrollment:', err2);
    else console.log('Successfully inserted enrollment.');
}

run();

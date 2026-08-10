const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
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
    const studentId = 'VICVT1009';
    
    // Inputs
    const totalHours = 156;
    const studiedHours = 0;
    const contractValue = 9750000;
    const paidAmount = 9750000;

    // Derived
    const remainingHours = totalHours - studiedHours; // 80
    const remainingCost = (contractValue / totalHours) * remainingHours; // 160000

    console.log(`Starting update for student: ${studentId}`);
    
    // Step 2: Update or Insert enrollments FIRST (due to trigger side-effects)
    console.log('Fetching latest enrollment...');
    const { data: enrollments, error: fetchErr } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(1);

    if (fetchErr) {
        console.error('Error fetching enrollment:', fetchErr);
        return;
    }

    if (enrollments && enrollments.length > 0) {
        const enrId = enrollments[0].id;
        console.log(`Found existing enrollment ${enrId}, updating...`);
        const { error: updErr } = await supabase
            .from('enrollments')
            .update({
                registered_hours: totalHours,
                remaining_hours: remainingHours,
                tuition_fee: contractValue,
                amount: contractValue, // Gán bằng giá trị hợp đồng
                hours: totalHours
            })
            .eq('id', enrId);
        if (updErr) console.error('Error updating enrollment:', updErr);
        else console.log('Successfully updated enrollment.');
    } else {
        console.log(`No enrollment found. Creating new enrollment...`);
        // We need branch_id to create enrollment. Let's fetch student first.
        const { data: student } = await supabase.from('students').select('branch_id').eq('id', studentId).single();
        const branchId = student ? student.branch_id : 'Việt Trì 1';
        
        const { error: insErr } = await supabase
            .from('enrollments')
            .insert([{
                student_id: studentId,
                branch_id: branchId,
                transaction_type: 'Ký Hợp đồng',
                note: 'System Migration',
                registered_hours: totalHours,
                remaining_hours: remainingHours,
                tuition_fee: contractValue,
                amount: contractValue,
                hours: totalHours,
                payment_method: 'Chuyển khoản',
                created_by: 'System Admin'
            }]);
        if (insErr) console.error('Error creating enrollment:', insErr);
        else console.log('Successfully created enrollment.');
    }

    // Step 1 & "Chốt cứng": Update students
    console.log('Updating students table to lock values...');
    const { error: stuErr } = await supabase
        .from('students')
        .update({
            total_registered_hours: totalHours,
            total_studied_hours: studiedHours,
            remaining_hours: remainingHours,
            total_registered_cost: contractValue,
            total_paid: paidAmount,
            remaining_cost: remainingCost
        })
        .eq('id', studentId);
    
    if (stuErr) console.error('Error updating students:', stuErr);
    else console.log('Successfully updated students table.');

    // Step 3: Add to student_care_logs
    console.log('Adding log to student_care_logs...');
    const todayDate = new Date().toLocaleDateString('en-CA');
    const { error: logErr } = await supabase
        .from('student_care_logs')
        .insert([{
            student_id: studentId,
            contact_date: todayDate,
            content: `Admin cập nhật thủ công. Giờ gốc: ${totalHours}, Đã học: ${studiedHours}, Còn dư: ${remainingHours}, Hợp đồng: ${contractValue}, Đã đóng: ${paidAmount}`,
            feedback: '',
            created_by: 'System Admin'
        }]);
    
    if (logErr) console.error('Error adding log:', logErr);
    else console.log('Successfully added log to student_care_logs.');

    console.log('All updates completed successfully.');
}

run();

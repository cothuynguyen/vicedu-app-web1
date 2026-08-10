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
    
    // Find receipts for this student
    const { data: receipts, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'Chờ duyệt');
        
    if (error) {
        console.error("Error fetching receipts:", error);
        return;
    }

    if (receipts && receipts.length > 0) {
        for (const r of receipts) {
            console.log(`Approving receipt ${r.id} with amount ${r.amount}...`);
            const { error: updateError } = await supabase
                .from('receipts')
                .update({
                    status: 'Đã duyệt',
                    approved_by: 'System Auto',
                    approved_at: new Date().toISOString()
                })
                .eq('id', r.id);
                
            if (updateError) {
                console.error("Failed to approve:", updateError);
            } else {
                console.log("Approved successfully.");
            }
        }
        
        // Also update the total_paid in students table
        // Wait, total_paid in students table might be cached, let's update it to 17M
        const { error: studentUpdate } = await supabase
            .from('students')
            .update({
                total_paid: 17000000
            })
            .eq('id', studentId);
            
        if (studentUpdate) console.error("Error updating student total_paid:", studentUpdate);
        else console.log("Updated student total_paid to 17M");
        
    } else {
        console.log("No pending receipts found.");
    }
}
run().catch(console.error);

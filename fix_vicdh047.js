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
    
    // Check what we got
    const { data: allEnrolls } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', studentId);
    
    if (allEnrolls && allEnrolls.length > 0) {
        // Find the contract enrollment (usually the one created by System Migration)
        const enrollment = allEnrolls.find(e => e.transaction_type === 'Đăng ký mới') || allEnrolls[0];
        
        // We set registered_hours = 384, hours = 384, remaining_hours = 384
        const { error: updateEnrollError } = await supabase
            .from('enrollments')
            .update({
                registered_hours: 384,
                hours: 384,
                remaining_hours: 384
            })
            .eq('id', enrollment.id);
            
        if (updateEnrollError) {
            console.error("Error updating enrollments:", updateEnrollError);
        } else {
            console.log("Updated enrollments successfully. remaining_hours set to 384");
        }
        
        // Update students table as well
        const { error: updateStudentError } = await supabase
            .from('students')
            .update({
                total_registered_hours: 384,
                remaining_hours: 384
            })
            .eq('id', studentId);
            
        if (updateStudentError) {
            console.error("Error updating students:", updateStudentError);
        } else {
            console.log("Updated students successfully.");
        }
    } else {
        console.log("No enrollments found for this student.");
    }
}
run().catch(console.error);

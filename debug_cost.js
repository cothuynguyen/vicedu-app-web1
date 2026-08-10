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
    const { data: enrData } = await sb.from("enrollments").select("remaining_hours, tuition_fee, registered_hours").eq("student_id", "VICVT2009").single();
    const hoursDelta = -4; // Assuming 2 sessions
    
    if (enrData) {
        const tuitionFee = Number(enrData.tuition_fee) || 0;
        const registeredHours = Number(enrData.registered_hours) || 0;
        const hourlyRate = registeredHours > 0 ? (tuitionFee / registeredHours) : 0;
        const costDelta = hoursDelta * hourlyRate;
        
        console.log("tuitionFee:", tuitionFee);
        console.log("registeredHours:", registeredHours);
        console.log("hourlyRate:", hourlyRate);
        console.log("costDelta:", costDelta);
        console.log("newRemCost (simulated):", 928124.875 + costDelta);
    }
}
test();

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
    const { data: logs } = await sb.from("audit_logs").select("*").eq("record_id", "VICVT2009");
    console.log("Audit Logs for VICVT2009:", logs);
}
test();

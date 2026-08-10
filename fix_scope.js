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
    const { error } = await supabase.from('internal_trainings').update({scopes: ['Sale']}).eq('title', 'Hướng dẫn sử dụng dành cho Bộ phận Sale');
    if (error) console.error(error);
    else console.log('Successfully updated scopes.');
}

run();

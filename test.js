const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
    const [k, ...v] = l.split('=');
    if (k) vars[k.trim()] = v.join('=').trim().replace(/['"]/g, '');
});
const sb = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.NEXT_PUBLIC_SUPABASE_ANON_KEY);
sb.from('receipts').select('*').limit(1).then(r => console.log(Object.keys(r.data[0])));

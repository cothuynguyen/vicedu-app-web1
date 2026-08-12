const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if(parts.length > 1) acc[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const publicVapidKey = 'BMsc31ia9_WG-lerXR3WVMWQ_e8LW7nRkpAh4SwJPFBmR2INyHnn7yhbichDZ5ygclknOxcYoIb-A6lLRKvQRtE';
const privateVapidKey = 'pyE_RzR7hkJ1aRvWYZqmM1PvsueETITNtZl_28G1xik';

webpush.setVapidDetails('mailto:viceduheadoffice@gmail.com', publicVapidKey, privateVapidKey);

async function testPush() {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_email', 'trieuchau@vicedu.com');

  if (error || !subscriptions || subscriptions.length === 0) {
    console.error('No subscriptions found', error);
    return;
  }

  console.log(`Found ${subscriptions.length} subscriptions for trieuchau@vicedu.com`);

  const payload = JSON.stringify({
    title: 'Test từ Terminal',
    body: 'Đây là thông báo test trực tiếp từ APNs',
    url: '/'
  });

  const options = {
    TTL: 86400,
    headers: {
      'Urgency': 'high'
    }
  };

  for (const sub of subscriptions) {
    console.log(`Sending to endpoint: ${sub.endpoint.substring(0, 50)}...`);
    try {
      const response = await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: sub.keys
      }, payload, options);
      console.log('SUCCESS:', response.statusCode, response.headers);
    } catch (err) {
      console.error('FAILED:', err.statusCode, err.body, err.message);
    }
  }
}

testPush();

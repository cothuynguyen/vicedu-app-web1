const webpush = require('web-push');

const publicVapidKey = 'BMsc31ia9_WG-lerXR3WVMWQ_e8LW7nRkpAh4SwJPFBmR2INyHnn7yhbichDZ5ygclknOxcYoIb-A6lLRKvQRtE';
const privateVapidKey = 'pyE_RzR7hkJ1aRvWYZqmM1PvsueETITNtZl_28G1xik';

webpush.setVapidDetails(
  'mailto:viceduheadoffice@gmail.com',
  publicVapidKey,
  privateVapidKey
);

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testPush() {
  const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_email', 'trieuchau@vicedu.com');
  if (!subs || subs.length === 0) return console.log("No sub");
  
  const sub = subs[0];
  const subInfo = {
    endpoint: sub.endpoint,
    keys: sub.keys
  };
  
  const payload = JSON.stringify({
    title: 'Test Notification',
    body: 'This is a test notification from the server.',
    url: '/'
  });

  try {
    const res = await webpush.sendNotification(subInfo, payload, {
      TTL: 86400,
      headers: {
        'Urgency': 'high'
      }
    });
    console.log("Push sent successfully!", res.statusCode);
  } catch (err) {
    console.error("Push failed:", err);
  }
}

testPush();

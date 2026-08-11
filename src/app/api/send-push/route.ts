import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY!;

webpush.setVapidDetails(
  'mailto:viceduheadoffice@gmail.com',
  publicVapidKey,
  privateVapidKey
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const { email, title, body, url } = await req.json();

    if (!email || !title || !body) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Lấy subscription của user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_email', email);

    if (error) {
      console.error('Lỗi truy vấn db:', error);
      return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: 'User not subscribed to push' }, { status: 200 });
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || '/',
    });

    const sendPromises = subscriptions.map((sub) => {
      const subscriptionInfo = {
        endpoint: sub.endpoint,
        keys: sub.keys,
      };
      return webpush.sendNotification(subscriptionInfo, payload).catch((err) => {
        console.error('Lỗi khi push cho', sub.user_email, err);
        // Nếu endpoint hết hạn (410), xóa khỏi db
        if (err.statusCode === 410 || err.statusCode === 404) {
           return supabase.from('push_subscriptions').delete().eq('id', sub.id);
        }
      });
    });

    await Promise.all(sendPromises);

    return NextResponse.json({ success: true, count: subscriptions.length });
  } catch (error) {
    console.error('Error sending push:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

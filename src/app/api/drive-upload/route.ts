import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // 0. Xác thực người dùng (Chỉ cho phép user đã đăng nhập)
    const cookieStore = await cookies(); // Next.js 15+ requires await
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {},
          remove(name: string, options: CookieOptions) {},
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ status: 'error', message: 'Truy cập bị từ chối: Vui lòng đăng nhập hệ thống VicEdu.' }, { status: 401 });
    }
  } catch (authError: any) {
    console.error("Auth check failed:", authError);
    return NextResponse.json({ status: 'error', message: `Lỗi xác thực: ${authError.message}` }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get('fileName');
  const mimeType = searchParams.get('mimeType');
  const origin = searchParams.get('origin');

  if (!fileName || !mimeType) {
    return NextResponse.json({ status: 'error', message: 'Missing parameters' }, { status: 400 });
  }

  // URL của Google Apps Script Web App
  const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzT0LqfO_fQrGYP5RtV3JRtjuRhJh5mq4wneYsrKYVXuSTvljMWQuEARj7lyIOtEnh9hA/exec";
  
  try {
    // 1. Get OAuth token from GAS
    const gasResponse = await fetch(WEB_APP_URL, { method: 'GET' });
    const gasText = await gasResponse.text();
    let gasData;
    try {
      gasData = JSON.parse(gasText);
    } catch(e) {
      return NextResponse.json({ status: 'error', message: 'GAS did not return JSON. Check GAS script.' }, { status: 500 });
    }

    if (gasData.status !== 'success') {
      return NextResponse.json({ status: 'error', message: gasData.message || 'Error from GAS' }, { status: 500 });
    }

    const { token, folderId } = gasData;

    // 2. Call Google Drive API directly from Next.js server using the token
    const driveUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink";
    const payload = {
      name: fileName,
      parents: [folderId]
    };

    const driveResponse = await fetch(driveUrl, {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType,
        "Origin": origin || ''
      },
      body: JSON.stringify(payload)
    });

    if (driveResponse.ok) {
      const uploadUrl = driveResponse.headers.get("Location") || driveResponse.headers.get("location");
      return NextResponse.json({ status: 'success', uploadUrl });
    } else {
      const errorText = await driveResponse.text();
      return NextResponse.json({ status: 'error', message: errorText }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Fetch failed:", error);
    return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
  }
}

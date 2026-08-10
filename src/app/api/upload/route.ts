import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json({ error: 'Cloudflare credentials not configured' }, { status: 500 });
    }

    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`;
    
    const cfFormData = new FormData();
    cfFormData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      body: cfFormData,
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Cloudflare upload error:', result.errors);
      return NextResponse.json({ error: result.errors[0]?.message || 'Failed to upload to Cloudflare' }, { status: 500 });
    }

    // Lấy URL công khai của bức ảnh
    const variants = result.result.variants;
    // Thông thường variants có dạng public URL, nếu có chữ 'public' thì ưu tiên, nếu không thì lấy URL đầu tiên.
    let imageUrl = variants.find((v: string) => v.includes('public')) || variants[0];

    return NextResponse.json({ url: imageUrl, id: result.result.id, success: true });
  } catch (error: any) {
    console.error('Upload handler error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

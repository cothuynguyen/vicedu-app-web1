// D:\Brain2\Projects\vicedu-app\scripts\migrateInteractions.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

async function uploadToCloudflare(url) {
  if (!url || !url.includes('supabase.co')) return url;
  
  try {
    const response = await fetch(url);
    if (!response.ok) return url;
    
    const blob = await response.blob();
    const formData = new FormData();
    formData.append('file', blob);

    const cfResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`
      },
      body: formData
    });

    const result = await cfResponse.json();
    if (result.success) {
      const variants = result.result.variants;
      return variants.find(v => v.includes('public')) || variants[0];
    }
    return url;
  } catch (err) {
    console.error('Lỗi khi chuyển đổi ảnh:', url, err.message);
    return url;
  }
}

async function migrateInteractions() {
  console.log("Đang quét và chuyển đổi ảnh trong bảng Báo cáo Check-in (crm_interactions)...");
  
  // Lấy toàn bộ các dòng có chứa chữ 'supabase.co' trong nội dung
  const { data: interactions, error } = await supabase
    .from('crm_interactions')
    .select('id, content')
    .ilike('content', '%supabase.co%');

  if (error) {
    console.error("Lỗi khi lấy dữ liệu:", error.message);
    return;
  }

  if (!interactions || interactions.length === 0) {
    console.log("Không tìm thấy ảnh Supabase nào trong lịch sử Check-in!");
    return;
  }

  for (const interaction of interactions) {
    const content = interaction.content;
    
    // Tìm URL bằng Regex (tất cả các link bắt đầu bằng https và chứa supabase.co)
    const urlRegex = /(https:\/\/[a-zA-Z0-9.-]+\.supabase\.co[^\s\n]+)/g;
    const matches = content.match(urlRegex);
    
    if (matches && matches.length > 0) {
      let newContent = content;
      let changed = false;

      for (const oldUrl of matches) {
        console.log(`Tìm thấy ảnh: ${oldUrl}`);
        const newUrl = await uploadToCloudflare(oldUrl);
        if (newUrl && newUrl !== oldUrl) {
          newContent = newContent.replace(oldUrl, newUrl);
          changed = true;
        }
      }

      if (changed) {
        const { error: updateError } = await supabase
          .from('crm_interactions')
          .update({ content: newContent })
          .eq('id', interaction.id);
          
        if (updateError) {
          console.error(`Lỗi cập nhật dòng ID ${interaction.id}:`, updateError.message);
        } else {
          console.log(`Đã chuyển đổi thành công dòng ID: ${interaction.id}`);
        }
      }
    }
  }
}

async function main() {
  console.log("BẮT ĐẦU CHUYỂN ĐỔI ẢNH CHECK-IN...");
  await migrateInteractions();
  console.log("HOÀN THÀNH!");
}

main();

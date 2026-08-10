// D:\Brain2\Projects\vicedu-app\scripts\migrateMissing.js
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

async function migrateInventory() {
  console.log("Đang quét bảng Hàng hóa (inventory_items)...");
  
  const { data: items, error } = await supabase
    .from('inventory_items')
    .select('id, image_url');

  if (error) {
    console.error("Lỗi:", error.message);
    return;
  }

  for (const item of items) {
    if (item.image_url && item.image_url.includes('supabase.co')) {
      console.log(`Tìm thấy ảnh Hàng hóa: ${item.image_url}`);
      const newUrl = await uploadToCloudflare(item.image_url);
      if (newUrl !== item.image_url) {
        await supabase.from('inventory_items').update({ image_url: newUrl }).eq('id', item.id);
        console.log(`Đã cập nhật Hàng hóa ID: ${item.id}`);
      }
    }
  }
}

async function migrateEnrollments() {
  console.log("Đang quét bảng Hợp đồng Đăng ký (enrollments)...");
  
  const { data: enrollments, error } = await supabase
    .from('enrollments')
    .select('id, receipt_images');

  if (error) {
    console.error("Lỗi:", error.message);
    return;
  }

  for (const item of enrollments) {
    if (item.receipt_images && Array.isArray(item.receipt_images)) {
      let changed = false;
      const newImages = [];
      for (const imgUrl of item.receipt_images) {
        if (imgUrl.includes('supabase.co')) {
          console.log(`Tìm thấy ảnh Biên lai Đăng ký: ${imgUrl}`);
          const newUrl = await uploadToCloudflare(imgUrl);
          newImages.push(newUrl);
          if (newUrl !== imgUrl) changed = true;
        } else {
          newImages.push(imgUrl);
        }
      }
      if (changed) {
        await supabase.from('enrollments').update({ receipt_images: newImages }).eq('id', item.id);
        console.log(`Đã cập nhật Hợp đồng ID: ${item.id}`);
      }
    }
  }
}

async function main() {
  console.log("BẮT ĐẦU CHUYỂN ĐỔI BỔ SUNG VẬT TƯ VÀ HỢP ĐỒNG...");
  await migrateInventory();
  await migrateEnrollments();
  console.log("HOÀN THÀNH!");
}

main();

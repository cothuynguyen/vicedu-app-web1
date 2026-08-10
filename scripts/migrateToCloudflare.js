// D:\Brain2\Projects\vicedu-app\scripts\migrateToCloudflare.js
// Run with: node --env-file=.env.local scripts/migrateToCloudflare.js
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

async function migrateStudents() {
  console.log("Đang chuyển đổi ảnh học viên...");
  const { data: students } = await supabase.from('students').select('id, avatar_url, commitment_images');
  if (!students) return;

  for (const student of students) {
    let changed = false;
    let updates = {};

    if (student.avatar_url && student.avatar_url.includes('supabase.co')) {
      const newAvatar = await uploadToCloudflare(student.avatar_url);
      if (newAvatar !== student.avatar_url) {
        updates.avatar_url = newAvatar;
        changed = true;
      }
    }

    if (student.commitment_images && Array.isArray(student.commitment_images)) {
      const newCommitments = [];
      for (const img of student.commitment_images) {
        if (img.url && img.url.includes('supabase.co')) {
          const newUrl = await uploadToCloudflare(img.url);
          newCommitments.push({ ...img, url: newUrl });
          if (newUrl !== img.url) changed = true;
        } else {
          newCommitments.push(img);
        }
      }
      if (changed) updates.commitment_images = newCommitments;
    }

    if (changed) {
      await supabase.from('students').update(updates).eq('id', student.id);
      console.log(`Đã cập nhật học viên: ${student.id}`);
    }
  }
}

async function migrateCashbooks() {
  console.log("Đang chuyển đổi ảnh phiếu thu/chi...");
  const { data: cashbooks } = await supabase.from('cashbook').select('id, receipt_images');
  if (!cashbooks) return;

  for (const item of cashbooks) {
    if (item.receipt_images && Array.isArray(item.receipt_images)) {
      let changed = false;
      const newImages = [];
      for (const imgUrl of item.receipt_images) {
        if (imgUrl.includes('supabase.co')) {
          const newUrl = await uploadToCloudflare(imgUrl);
          newImages.push(newUrl);
          if (newUrl !== imgUrl) changed = true;
        } else {
          newImages.push(imgUrl);
        }
      }
      if (changed) {
        await supabase.from('cashbook').update({ receipt_images: newImages }).eq('id', item.id);
        console.log(`Đã cập nhật phiếu thu/chi: ${item.id}`);
      }
    }
  }
}

async function migrateEmployees() {
  console.log("Đang chuyển đổi ảnh nhân viên...");
  const { data: users } = await supabase.from('users').select('id, avatar_url, id_front_url, id_back_url');
  if (!users) return;

  for (const user of users) {
    let changed = false;
    let updates = {};

    for (const field of ['avatar_url', 'id_front_url', 'id_back_url']) {
      if (user[field] && user[field].includes('supabase.co')) {
        const newUrl = await uploadToCloudflare(user[field]);
        if (newUrl !== user[field]) {
          updates[field] = newUrl;
          changed = true;
        }
      }
    }

    if (changed) {
      await supabase.from('users').update(updates).eq('id', user.id);
      console.log(`Đã cập nhật nhân sự: ${user.id}`);
    }
  }
}

async function main() {
  console.log("BẮT ĐẦU CHUYỂN ĐỔI SANG CLOUDFLARE IMAGES...");
  await migrateStudents();
  await migrateCashbooks();
  await migrateEmployees();
  console.log("HOÀN THÀNH TẤT CẢ!");
}

main();

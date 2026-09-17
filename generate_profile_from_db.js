const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...value] = line.split('=');
  if (key && value.length) envVars[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
});

const supabase = createClient(envVars.NEXT_PUBLIC_SUPABASE_URL, envVars.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function run() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, role, department, branch_id, nickname, status')
    .order('full_name');
    
  if (error) {
    console.error("Database query error:", error);
    return;
  }
  
  // Filter out resigned staff
  const activeUsers = users.filter(u => u.status !== 'Nghỉ việc' && u.status !== 'Đã nghỉ' && u.status !== 'Nghỉ');
  
  // Group by branch / function
  const ho = [];
  const vietTri = [];
  const tuyênQuang = [];
  const lâmThao = [];
  const dânHòa = [];
  
  activeUsers.forEach(u => {
    const branch = u.branch_id || '';
    if (u.role === 'Kế toán HO' || u.full_name === 'Nguyễn Thị Thúy' || u.full_name === 'Nguyễn Huy Hoàng') {
      ho.push(u);
    } else if (branch.includes('Việt Trì')) {
      vietTri.push(u);
    } else if (branch.includes('Tuyên Quang')) {
      tuyênQuang.push(u);
    } else if (branch.includes('Lâm Thao')) {
      lâmThao.push(u);
    } else if (branch.includes('Dân Hòa')) {
      dânHòa.push(u);
    } else {
      ho.push(u); // Default to HO
    }
  });

  const formatUser = (u) => {
    const nick = u.nickname ? ` (${u.nickname.trim()})` : '';
    return `- **${u.full_name.trim()}${nick}** - ${u.role || u.position || 'Nhân sự'} [${u.status}]`;
  };

  let content = `---
title: "Hồ sơ: Sơ đồ Tổ chức & Nhân sự Hệ thống VicEdu"
type: profile
tags: ["VicEdu", "Nhan_Su", "So_Do_To_Chuc", "SOP"]
created: 2026-08-26
---

# 🏛️ SƠ ĐỒ TỔ CHỨC & NHÂN SỰ HỆ THỐNG VICEDU (ĐỒNG BỘ CRM)

Tài liệu này lưu trữ danh sách nhân sự chính thức và phân quyền phòng ban của toàn hệ thống VicEdu, được trích xuất trực tiếp từ Cơ sở dữ liệu CRM (\`quantri.viceduvn.com\`). 

*(Nhân viên đã nghỉ việc đã được tự động loại bỏ khỏi danh sách).*

---

## 👑 BAN GIÁM ĐỐC & TỔNG BỘ (HEAD OFFICE)
${ho.map(formatUser).join('\n')}

---

## 📍 DANH SÁCH NHÂN SỰ CÁC CHI NHÁNH

### 1. Chi nhánh Việt Trì
${vietTri.map(formatUser).join('\n')}

---

### 2. Chi nhánh Tuyên Quang
${tuyênQuang.map(formatUser).join('\n')}

---

### 3. Chi nhánh Lâm Thao
${lâmThao.map(formatUser).join('\n')}

---

### 4. Chi nhánh Dân Hòa
${dânHòa.map(formatUser).join('\n')}
`;

  const outputPath = 'd:/Brain2/01-Atomic/Frameworks/VicEdu-SOP/vicedu-organization-profile.md';
  fs.writeFileSync(outputPath, content, 'utf8');
  console.log("Successfully wrote active profiles to:", outputPath);
}

run();

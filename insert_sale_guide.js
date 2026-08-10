const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read environment variables
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const content = `**Mục tiêu:** Cung cấp quy trình thao tác trên hệ thống Webapp VicEdu cho Tư vấn viên / Telesale nhằm tối ưu hóa phễu khách hàng và theo dõi lộ trình chốt sale hiệu quả.

---

## Chương 1: Quản lý CRM & Khách hàng tiềm năng
*Trong phân hệ này, Bộ phận Sale có **Toàn quyền thao tác** để đảm bảo quá trình tiếp cận khách hàng diễn ra linh hoạt và kịp thời.*

### 1.1. Thêm mới và Quản lý Leads (Khách hàng tiềm năng)
- **Cách thao tác:** Hướng dẫn truy cập mục CRM, điền thông tin khách hàng mới (Tên, SĐT, Nguồn khách hàng...).
- **Chuyển đổi trạng thái:** Hướng dẫn kéo/thả khách hàng qua các bước trong phễu (Hỏi thăm -> Hẹn lịch test -> Đã test -> Đã chốt).

### 1.2. Đặt lịch nhắc nhở (Follow-up)
- **Cách thao tác:** Hướng dẫn sử dụng tính năng tạo lịch hẹn, viết ghi chú sau mỗi cuộc gọi.
- **Theo dõi lịch làm việc:** Xem danh sách các khách hàng cần gọi lại trong ngày hôm nay.

---

## Chương 2: Tra cứu Hồ sơ Học viên & Lớp học
*Trong phân hệ này, Bộ phận Sale **Chỉ có quyền Xem (View-only)**.*

### 2.1. Kiểm tra trạng thái Khách hàng sau khi chốt
- **Tại sao chỉ được xem?** Bộ phận Sale chỉ cần xem để biết Khách hàng của mình đã được Admin hoàn tất thủ tục nhập học hay chưa (đã tạo hồ sơ chính thức, đã đóng phí, đã có lớp). Việc sửa đổi thông tin chính thức thuộc thẩm quyền của Admin để tránh làm sai lệch dữ liệu hệ thống.
- **Cách thao tác:** Truy cập danh sách "Học viên", gõ tên/SĐT để tìm khách hàng. Xem cột "Tình trạng" và "Còn nợ" để nắm bắt tiến độ đóng học phí.

### 2.2. Tra cứu Lớp học và Lịch khai giảng
- **Tại sao chỉ được xem?** Quản lý lớp học và xếp giáo viên là nghiệp vụ của phòng Đào tạo/Admin.
- **Cách thao tác:** Truy cập mục "Lớp học" để xem các lớp sắp khai giảng, xem sĩ số hiện tại của lớp để tư vấn chốt sale cho khách hàng đang phân vân.
`;

    const { error } = await supabase.from('internal_trainings').insert([{
        title: 'Hướng dẫn sử dụng dành cho Bộ phận Sale',
        description: 'Tài liệu hướng dẫn nghiệp vụ trên hệ thống dành cho Tư vấn viên và Telesale.',
        description: content,
        link_url: 'https://docs.google.com/document/', // Placeholder
        scopes: ['Hướng dẫn sử dụng'],
        branches: ['Tất cả'],
        
    }]);

    if (error) console.error('Error:', error);
    else console.log('Successfully inserted Sale guide.');
}

run();

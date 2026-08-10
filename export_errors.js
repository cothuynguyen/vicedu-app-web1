const fs = require('fs');
const text = fs.readFileSync('C:/Users/ADMIN/.gemini/antigravity/brain/82bc503d-e4a9-499f-a0f1-dfe9e7f3067f/migration_errors.md', 'utf8');
const lines = text.split('\n').filter(l => l.startsWith('- '));

// Add BOM for Excel UTF-8 compatibility
let csv = '\uFEFFLý do lỗi,Họ và tên,Chi nhánh,Số điện thoại cũ,Số điện thoại trên webapp\n';

for (const line of lines) {
    let raw = line.replace('- ', '');
    const colonIdx = raw.indexOf(':');
    const reason = raw.substring(0, colonIdx).trim();
    const rest = raw.substring(colonIdx + 1).trim();
    const parts = rest.split(' - ');
    
    const name = parts[0] ? parts[0].trim() : '';
    const branch = parts[1] ? parts[1].trim() : '';
    let phoneOld = '';
    let phoneNew = '';
    
    if (reason === 'PHONE MISMATCH') {
        const msg = parts[2] ? parts[2].trim() : '';
        const match = msg.match(/Expected (.*), DB has (.*)/);
        if (match) {
            phoneOld = match[1];
            phoneNew = match[2];
        } else {
            phoneOld = msg;
        }
    } else {
        phoneOld = parts[2] ? parts[2].trim() : '';
    }
    
    // Convert reason to Vietnamese
    let reasonVn = reason;
    if (reason === 'NOT FOUND') reasonVn = 'Không tìm thấy học viên';
    if (reason === 'MULTIPLE MATCHES & PHONE MISMATCH') reasonVn = 'Trùng tên nhưng sai số điện thoại';
    if (reason === 'PHONE MISMATCH') reasonVn = 'Số điện thoại không khớp';

    csv += `"${reasonVn}","${name}","${branch}","${phoneOld}","${phoneNew}"\n`;
}
fs.writeFileSync('D:/Brain2/Projects/vicedu-app/Danh_sach_loi_cap_nhat.csv', csv, 'utf8');

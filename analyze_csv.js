const fs = require('fs');
const text = fs.readFileSync('D:/Brain2/Projects/vicedu-app/Danh_sach_loi_cap_nhat.csv', 'utf8');
const lines = text.split('\n').slice(1).filter(l => l.trim().length > 0);
let countTQ = 0, countLT = 0, countMismatch = 0;
for(let line of lines) {
    const parts = line.split('","');
    if (parts.length < 5) continue;
    const reason = parts[0].replace('"', '');
    const branch = parts[2];
    if (branch === 'Tuyên Quang') countTQ++;
    if (branch === 'Lâm Thao') countLT++;
    if (reason.includes('Số điện thoại không khớp')) countMismatch++;
}
console.log('Total Tuyên Quang:', countTQ);
console.log('Total Lâm Thao:', countLT);
console.log('Total Mismatch:', countMismatch);

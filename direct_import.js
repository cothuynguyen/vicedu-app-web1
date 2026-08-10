const xlsx = require('xlsx');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Read Env
const env = fs.readFileSync('.env.local', 'utf8');
const envVars = {};
env.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
        envVars[key.trim()] = values.join('=').trim().replace(/['"]/g, '');
    }
});

const supabase = createClient(envVars['NEXT_PUBLIC_SUPABASE_URL'], envVars['SUPABASE_SERVICE_ROLE_KEY']);

async function run() {
    console.log("Reading Excel file...");
    const filePath = 'C:\\Users\\ADMIN\\Downloads\\Import LamThao_Tuyenquang_Fixed_V2.xlsx';
    const workbook = xlsx.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    // Deduplicate
    const uniqueStudents = [];
    const seenNames = new Set();
    
    for (const row of rows) {
        const branchName = row["Chi Nhánh"] || "";
        const branchLower = branchName.toLowerCase();
        
        // Filter only Lâm Thao and Tuyên Quang
        if (!branchLower.includes("lâm thao") && !branchLower.includes("tuyên quang")) {
            continue;
        }
        
        let fullName = String(row["Họ và tên"] || "").trim();
        if (!fullName || fullName.toLowerCase() === 'none') continue;
        
        const key = `${branchLower}-${fullName.toLowerCase()}`;
        if (!seenNames.has(key)) {
            seenNames.add(key);
            uniqueStudents.push(row);
        }
    }
    
    console.log(`Found ${uniqueStudents.length} unique valid students to import.`);

    // Group by branch
    const branchGroups = {
        "Lâm Thao": { prefix: "VICLT", rows: [] },
        "Tuyên Quang": { prefix: "VICTQ", rows: [] }
    };
    
    for (const row of uniqueStudents) {
        const branchName = row["Chi Nhánh"].toLowerCase();
        if (branchName.includes("lâm thao")) branchGroups["Lâm Thao"].rows.push(row);
        else if (branchName.includes("tuyên quang")) branchGroups["Tuyên Quang"].rows.push(row);
    }
    
    let successCount = 0;
    
    for (const branch of Object.keys(branchGroups)) {
        const group = branchGroups[branch];
        if (group.rows.length === 0) continue;
        
        console.log(`Processing branch ${branch} with ${group.rows.length} students...`);
        
        // Find max ID for this branch
        const { data: idData } = await supabase
            .from("students")
            .select("id")
            .ilike("id", `${group.prefix}%`)
            .order("id", { ascending: false })
            .limit(1);
            
        let nextNum = 1;
        if (idData && idData.length > 0) {
            const lastId = idData[0].id;
            const numMatch = lastId.replace(group.prefix, "").match(/\d+/);
            if (numMatch) {
                nextNum = parseInt(numMatch[0], 10) + 1;
            }
        }
        
        // Insert students sequentially to keep ID simple
        for (const row of group.rows) {
            const nextId = `${group.prefix}${nextNum.toString().padStart(3, "0")}`;
            nextNum++;
            
            const parseHours = (val) => {
                if (!val) return 0;
                if (typeof val === "number") return val;
                const str = String(val).replace(/,/g, '.').replace(/\s/g, '');
                const num = parseFloat(str);
                return isNaN(num) ? 0 : num;
            };

            const parseCost = (val) => {
                if (!val) return 0;
                if (typeof val === "number") return val;
                const str = String(val).replace(/[,.\s]/g, '');
                const num = parseFloat(str);
                return isNaN(num) ? 0 : num;
            };
            
            // Format dates back to string if they are date objects
            const formatDate = (val) => {
                if (!val) return null;
                if (typeof val === 'string' && val.includes('-')) return val; // Already YYYY-MM-DD
                if (val instanceof Date) {
                    return val.toISOString().split('T')[0];
                }
                return null;
            };

            const validHours = parseHours(row["Tổng giờ còn lại"]);
            const validCost = parseCost(row["Tổng chi phí còn lại"]);

            const studentPayload = {
                id: nextId,
                branch_id: branch,
                full_name: String(row["Họ và tên"] || "").trim(),
                nickname: String(row["Nick name"] || ""),
                padlet_url: String(row["Link Padlet Học tập"] || ""),
                padlet_api: String(row["Padlet API"] || ""),
                gender: String(row["Giới tính"] || "Nam"),
                dob: formatDate(row["Ngày sinh"]),
                school: String(row["Trường đang học"] || ""),
                address: String(row["Địa chỉ"] || ""),
                parent_name: String(row["Tên Bố/Mẹ"] || ""),
                parent_phone: String(row["Điện thoại Bố/Mẹ"] || ""),
                parent_email: String(row["Email (nếu có)"] || ""),
                parent_facebook: String(row["Link Facebook PH"] || ""),
                entry_level: String(row["Trình độ đầu vào"] || ""),
                target_level: String(row["Trình độ mục tiêu"] || ""),
                commitment: String(row["Cam kết đầu ra"] || ""),
                enrollment_date: formatDate(row["Ngày nhập học"]),
                status: (() => {
                    const val = String(row["Tình trạng học"] || "").trim();
                    if (!val || val === "Đang học") return "Chờ xếp lớp";
                    return val;
                })(),
                sale_employee_id: String(row["Thầy cô tuyển sinh"] || ""),
                total_registered_hours: validHours,
                remaining_hours: validHours,
                total_registered_cost: validCost,
                remaining_cost: validCost,
            };
            
            // Insert student
            const { error: studentErr } = await supabase.from("students").insert([studentPayload]);
            if (studentErr) {
                console.error(`Failed to insert student ${studentPayload.full_name}:`, studentErr.message);
                continue;
            }
            
            // Insert enrollment
            if (validHours > 0 || validCost > 0) {
                await supabase.from("enrollments").insert([{
                    student_id: nextId,
                    branch_id: branch,
                    transaction_type: "Đăng ký mới",
                    payment_method: "Chuyển khoản",
                    amount: validCost,
                    hours: validHours,
                    registered_hours: validHours,
                    remaining_hours: validHours,
                    tuition_fee: validCost,
                    status: "Active",
                    note: "Tạo tự động từ dữ liệu chuyển giao phần mềm cũ",
                    created_by: "System Migration",
                }]);
            }
            successCount++;
        }
    }
    
    console.log(`\nImport Completed! Successfully imported ${successCount} students.`);
}

run().catch(console.error);

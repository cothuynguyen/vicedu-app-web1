const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse env
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

// Simple CSV parser that handles quotes
function parseCSV(text) {
    let p = '', row = [''], ret = [row], i = 0, r = 0, s = !0, l;
    for (l of text) {
        if ('"' === l) {
            if (s && l === p) row[i] += l;
            s = !s;
        } else if (',' === l && s) l = row[++i] = '';
        else if ('\n' === l && s) {
            if ('\r' === p) row[i] = row[i].slice(0, -1);
            row = ret[++r] = [l = '']; i = 0;
        } else row[i] += l;
        p = l;
    }
    return ret;
}

async function run() {
    console.log("Reading old_students.csv...");
    const csvData = fs.readFileSync('old_students.csv', 'utf8');
    const rows = parseCSV(csvData);
    
    if (rows.length < 2) {
        console.log("CSV is empty or invalid.");
        return;
    }

    const headers = rows[0].map(h => h.trim());
    
    // Find column indexes
    const nameIdx = headers.findIndex(h => h.includes('Họ và tên'));
    const branchIdx = headers.findIndex(h => h.includes('Chi nhánh'));
    const phoneIdx = headers.findIndex(h => h.includes('Điện thoại bố mẹ'));
    const noteIdx = headers.findIndex(h => h.includes('Nội dung Cập nhật'));

    console.log(`Indexes: Name=${nameIdx}, Branch=${branchIdx}, Phone=${phoneIdx}, Note=${noteIdx}`);

    // Since PowerShell fetch mangled encoding, indices are manually checked
    // 1: Chi nhánh
    // 2: Họ và tên học viên
    // 5: Nội dung Cập nhật
    // 19: Điện thoại bố mẹ 1
    const idxBranch = 1;
    const idxName = 2;
    const idxNote = 5;
    const idxPhone = 19;

    console.log("Fetching all students from Supabase...");
    const { data: dbStudents, error } = await supabase.from('students').select('*');
    if (error) {
        console.error("Error fetching students:", error);
        return;
    }

    console.log(`Found ${dbStudents.length} students in DB.`);

    const errors = [];
    let successCount = 0;

    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length < 20) continue;

        const branch = row[idxBranch]?.trim();
        const name = row[idxName]?.trim();
        const phone = row[idxPhone]?.trim();
        let updateContent = row[idxNote]?.trim();

        if (!updateContent) continue; // Skip if no update content

        const formattedNote = `[Hệ thống cũ] ${updateContent}`;

        // Find matches in DB
        const matches = dbStudents.filter(s => 
            s.full_name?.toLowerCase().trim() === name?.toLowerCase() &&
            s.branch_id === branch
        );

        if (matches.length === 0) {
            errors.push(`NOT FOUND: ${name} - ${branch} - ${phone}`);
            continue;
        }

        if (matches.length > 1) {
            // Check phone
            const exactMatches = matches.filter(s => s.parent_phone === phone);
            if (exactMatches.length === 1) {
                // Update exact match
                const target = exactMatches[0];
                const newNote = target.internal_note ? target.internal_note + '\n\n' + formattedNote : formattedNote;
                await updateStudent(target.id, newNote);
                successCount++;
            } else {
                errors.push(`MULTIPLE MATCHES & PHONE MISMATCH: ${name} - ${branch} - ${phone}`);
            }
            continue;
        }

        // Exactly 1 match by name and branch
        const target = matches[0];
        // Enforce phone check as requested by user
        if (target.parent_phone !== phone && phone && target.parent_phone) {
            errors.push(`PHONE MISMATCH: ${name} - ${branch} - Expected ${phone}, DB has ${target.parent_phone}`);
            continue;
        }

        const newNote = target.internal_note ? target.internal_note + '\n\n' + formattedNote : formattedNote;
        await updateStudent(target.id, newNote);
        successCount++;
    }

    console.log(`Successfully updated ${successCount} students.`);
    
    if (errors.length > 0) {
        console.log(`There were ${errors.length} errors. Writing to migration_errors.md`);
        const mdContent = `# Migration Errors\n\n${errors.map(e => '- ' + e).join('\n')}`;
        fs.writeFileSync('C:/Users/ADMIN/.gemini/antigravity/brain/82bc503d-e4a9-499f-a0f1-dfe9e7f3067f/migration_errors.md', mdContent);
    } else {
        console.log("No errors during migration!");
        fs.writeFileSync('C:/Users/ADMIN/.gemini/antigravity/brain/82bc503d-e4a9-499f-a0f1-dfe9e7f3067f/migration_errors.md', '# Migration Errors\n\nNo errors found.');
    }
}

async function updateStudent(id, note) {
    const { error } = await supabase.from('students').update({ internal_note: note }).eq('id', id);
    if (error) console.error(`Error updating student ${id}:`, error);
}

run();

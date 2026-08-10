const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabase = createClient(urlMatch[1], keyMatch[1]);

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
        if (branch !== 'Tuyên Quang' && branch !== 'Lâm Thao') {
            continue;
        }

        const name = row[idxName]?.trim();
        let phone = row[idxPhone]?.trim();
        let updateContent = row[idxNote]?.trim();

        if (!updateContent) continue; 

        // Fix phone missing 0
        if (phone && phone.length > 0 && !phone.startsWith('0')) {
            phone = '0' + phone;
        }

        const formattedNote = `[Hệ thống cũ] ${updateContent}`;

        // Match by Name and Branch ONLY (ignoring old wrong phone)
        const matches = dbStudents.filter(s => 
            s.full_name?.toLowerCase().trim() === name?.toLowerCase() &&
            s.branch_id === branch
        );

        if (matches.length === 0) {
            errors.push(`NOT FOUND: ${name} - ${branch}`);
            continue;
        }

        if (matches.length > 1) {
            errors.push(`MULTIPLE MATCHES: ${name} - ${branch} - ${phone} (Cannot determine which one to update)`);
            continue;
        }

        // Exactly 1 match
        const target = matches[0];
        
        let newNote = '';
        if (branch === 'Tuyên Quang') {
            // Overwrite
            newNote = formattedNote;
        } else if (branch === 'Lâm Thao') {
            // Append
            newNote = target.internal_note ? target.internal_note + '\n\n' + formattedNote : formattedNote;
        }

        const payload = { 
            internal_note: newNote
        };
        // Only update phone if there's a valid phone in CSV to update
        if (phone) {
            payload.parent_phone = phone;
        }

        const { error: updateError } = await supabase.from('students').update(payload).eq('id', target.id);
        if (updateError) {
            console.error(`Error updating student ${target.id}:`, updateError);
            errors.push(`UPDATE ERROR: ${name} - ${branch}`);
        } else {
            successCount++;
        }
    }

    console.log(`Successfully updated ${successCount} students in Tuyên Quang & Lâm Thao.`);
    
    if (errors.length > 0) {
        console.log(`There were ${errors.length} unresolved errors. Writing to fix_phones_errors.md`);
        const mdContent = `# Fix Phones Migration Errors\n\n${errors.map(e => '- ' + e).join('\n')}`;
        fs.writeFileSync('C:/Users/ADMIN/.gemini/antigravity/brain/82bc503d-e4a9-499f-a0f1-dfe9e7f3067f/fix_phones_errors.md', mdContent);
    } else {
        console.log("No errors during fix!");
    }
}

run();

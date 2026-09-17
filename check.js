
const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://qrvxaoabzhxgcjjejffq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFydnhhb2Fiemh4Z2NqamVqZmZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTA2ODU2NywiZXhwIjoyMDk2NjQ0NTY3fQ.ndCt3uia9-GPGr0BBLn3EnIdVcbtPm9vXwjk4E2d07M';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  const { data: students } = await supabase.from('students').select('id, full_name, status, class_students(status, classes(class_name, status))');
  
  const affected = students.filter(s => {
    if (s.status !== 'Đang học') return false;
    if (!s.class_students || s.class_students.length === 0) return false;
    
    const hasEnrolledClass = s.class_students.some(cs => cs.status === 'Đang học');
    if (!hasEnrolledClass) return false;
    
    const hasActiveClasses = s.class_students.some(cs => cs.status === 'Đang học' && cs.classes && cs.classes.status === 'Đang học');
    
    return !hasActiveClasses;
  });
  
  console.log('Affected count:', affected.length);
  affected.forEach(s => {
    console.log('- ' + s.full_name + ' (' + s.id + ')');
    s.class_students.filter(cs => cs.status === 'Đang học').forEach(cs => {
      console.log('  => Dang o trong lop: ' + cs.classes?.class_name + ' (Tinh trang lop: ' + cs.classes?.status + ')');
    });
  });
}
check();


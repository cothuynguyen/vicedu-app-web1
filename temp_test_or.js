const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function testQuery() {
  const targetMonth = 8; // August
  const startYear = 1990;
  const endYear = new Date().getFullYear();
  
  let orClauses = [];
  for (let year = startYear; year <= endYear; year++) {
    const monthStr = targetMonth.toString().padStart(2, '0');
    // Get last day of month
    const lastDay = new Date(year, targetMonth, 0).getDate();
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-${lastDay}`;
    orClauses.push(`and(dob.gte.${startDate},dob.lte.${endDate})`);
  }
  
  const orQuery = orClauses.join(',');
  console.log("Or Query length:", orQuery.length);

  const { data, error } = await supabase
    .from('students')
    .select('id, full_name, dob')
    .or(orQuery)
    .limit(5);
    
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Found students:", data);
  }
}
testQuery();

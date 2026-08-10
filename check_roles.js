const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qrvxaoabzhxgcjjejffq.supabase.co',
  'sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf'
);

async function checkRoles() {
  const { data: users, error } = await supabase
    .from('users')
    .select('role');
    
  if (error) {
    console.error(error);
    return;
  }
  
  const roles = new Set();
  users.forEach(u => {
    if (u.role) roles.add(u.role);
  });
  
  console.log("Distinct roles in users table:", Array.from(roles));
}

checkRoles();

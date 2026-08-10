async function getSpec() {
  const url = 'https://qrvxaoabzhxgcjjejffq.supabase.co/rest/v1/?apikey=sb_publishable_Yx9BTl5jV48FJRy1_lNWSw_pO00gDDf';
  const res = await fetch(url);
  const json = await res.json();
  const installDef = json.definitions ? json.definitions.installments : json.components?.schemas?.installments;
  if (!installDef) {
    console.log("Could not find definitions/components. Keys are:", Object.keys(json));
    return;
  }
  console.log("Installments columns:", Object.keys(installDef.properties));
}

getSpec();

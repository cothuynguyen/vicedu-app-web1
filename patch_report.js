const fs = require('fs');

function patchCRMPage() {
  const path = 'src/app/sales/crm/page.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // Find the CRMReportTab invocation and add campaigns={validCampaigns}
  const targetRegex = /<CRMReportTab\s+customers=\{customers\}\s+users=\{users\}\s+currentUser=\{currentUser\}\s+\/>/g;
  const replacement = `<CRMReportTab
          customers={customers}
          users={users}
          currentUser={currentUser}
          campaigns={validCampaigns}
        />`;

  if (content.match(targetRegex)) {
    content = content.replace(targetRegex, replacement);
    fs.writeFileSync(path, content);
    console.log("Patched CRM Page!");
  } else {
    console.log("Could not find target in CRM Page!");
  }
}

function patchCRMReportTab() {
  const path = 'src/components/crm/CRMReportTab.tsx';
  let content = fs.readFileSync(path, 'utf8');

  // 1. Update Props
  const propsRegex = /interface CRMReportTabProps \{\s+customers: any\[\];\s+users: CRMUser\[\];\s+currentUser: \{ id: string; role: string; branch_id: string; full_name: string \};\s+\}/;
  content = content.replace(propsRegex, `interface CRMReportTabProps {
  customers: any[];
  users: CRMUser[];
  currentUser: { id: string; role: string; branch_id: string; full_name: string };
  campaigns?: any[];
}`);

  // 2. Add campaigns to destructured props
  const destructRegex = /export default function CRMReportTab\(\{ customers, users, currentUser \}: CRMReportTabProps\) \{/;
  content = content.replace(destructRegex, `export default function CRMReportTab({ customers, users, currentUser, campaigns = [] }: CRMReportTabProps) {`);

  // 3. Add filterCampaign state right after filterStaff
  const filterStaffRegex = /const \[filterStaff, setFilterStaff\] = useState\(isManagerRole \? "Tất cả" : currentUser\.id\);/;
  content = content.replace(filterStaffRegex, `const [filterStaff, setFilterStaff] = useState(isManagerRole ? "Tất cả" : currentUser.id);
  const [filterCampaign, setFilterCampaign] = useState("Tất cả");`);

  // 4. Rewrite fetchInteractions to use loop and select optimization
  const fetchRegex = /const \{ data, error \} = await supabase\s+\.from\("crm_interactions"\)\s+\.select\("\*"\)\s+\.gte\("created_at", from\.toISOString\(\)\)\s+\.lte\("created_at", to\.toISOString\(\)\);\s+if \(error\) throw error;\s+setInteractions\(data \|\| \[\]\);/s;
  const fetchReplacement = `
      let allInteractions: any[] = [];
      let page = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("crm_interactions")
          .select("id, customer_id, sale_id, action_type, content, created_at")
          .gte("created_at", from.toISOString())
          .lte("created_at", to.toISOString())
          .order('created_at', { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allInteractions = [...allInteractions, ...data];
          if (data.length < 1000) hasMore = false;
          else page++;
        } else {
          hasMore = false;
        }
      }

      setInteractions(allInteractions);`;
  content = content.replace(fetchRegex, fetchReplacement);

  // 5. Update filteredCustomers to include campaign filter
  const filteredCustRegex = /const filteredCustomers = customers\.filter\(c => \{\s+if \(filterBranch !== "Tất cả"\) \{\s+const cb = c\.branch_id \? c\.branch_id\.split\(','\)\.map\(\(b: string\) => b\.trim\(\)\) : \[\];\s+if \(!cb\.includes\(filterBranch\)\) return false;\s+\}\s+if \(filterStaff !== "Tất cả" && c\.assigned_to !== filterStaff\) return false;\s+return true;\s+\}\);/s;
  const filteredCustReplacement = `const filteredCustomers = customers.filter(c => {
    if (filterBranch !== "Tất cả") {
      const cb = c.branch_id ? c.branch_id.split(',').map((b: string) => b.trim()) : [];
      if (!cb.includes(filterBranch)) return false;
    }
    if (filterStaff !== "Tất cả" && c.assigned_to !== filterStaff) return false;
    if (filterCampaign !== "Tất cả" && c.campaign_id !== filterCampaign) return false;
    return true;
  });`;
  content = content.replace(filteredCustRegex, filteredCustReplacement);

  // 6. Update filteredInteractions to only include interactions for filteredCustomers
  const filteredInterRegex = /const filteredInteractions = interactions\.filter\(i => \{\s+if \(filterStaff !== "Tất cả" && i\.sale_id !== filterStaff\) return false;\s+if \(filterStaff === "Tất cả" && filterBranch !== "Tất cả"\) \{\s+if \(!validStaffIds\.has\(i\.sale_id\)\) return false;\s+\}\s+return true;\s+\}\);/s;
  const filteredInterReplacement = `// Pre-calculate valid customer IDs to bind interactions to the filtered customers (and campaigns)
  const validCustomerIds = new Set(filteredCustomers.map(c => c.id));

  const filteredInteractions = interactions.filter(i => {
    if (filterStaff !== "Tất cả" && i.sale_id !== filterStaff) return false;
    if (filterStaff === "Tất cả" && filterBranch !== "Tất cả") {
      if (!validStaffIds.has(i.sale_id)) return false;
    }
    // Only include interactions that belong to the filtered customers (which applies campaign filter)
    if (!validCustomerIds.has(i.customer_id)) return false;
    return true;
  });`;
  content = content.replace(filteredInterRegex, filteredInterReplacement);

  // 7. Add UI for Campaign Filter next to Staff Filter
  const uiRegex = /\{isManagerRole && \(\s+<div style=\{\{ display: "flex", gap: "0\.5rem", alignItems: "center" \}\}>\s+<label style=\{\{ fontSize: "0\.85rem", color: "#64748b", fontWeight: 500 \}\}>Nhân sự:<\/label>\s+<select\s+value=\{filterStaff\}\s+onChange=\{e => setFilterStaff\(e\.target\.value\)\}\s+style=\{\{ padding: "0\.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" \}\}\s+>\s+<option value="Tất cả">Tất cả nhân viên<\/option>\s+\{staffForFilter\.map\(u => <option key=\{u\.id\} value=\{u\.id\}>\{u\.full_name\} \(\{u\.id\}\)<\/option>\)\}\s+<\/select>\s+<\/div>\s+\)\}/s;
  
  const uiReplacement = `{isManagerRole && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Nhân sự:</label>
            <select 
              value={filterStaff} 
              onChange={e => setFilterStaff(e.target.value)} 
              style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
            >
              <option value="Tất cả">Tất cả nhân viên</option>
              {staffForFilter.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.id})</option>)}
            </select>
          </div>
        )}

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Chiến dịch:</label>
          <select 
            value={filterCampaign} 
            onChange={e => setFilterCampaign(e.target.value)} 
            style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1", maxWidth: "200px" }}
          >
            <option value="Tất cả">Tất cả chiến dịch</option>
            {campaigns?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>`;
  content = content.replace(uiRegex, uiReplacement);

  fs.writeFileSync(path, content);
  console.log("Patched CRMReportTab!");
}

patchCRMPage();
patchCRMReportTab();

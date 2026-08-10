const fs = require('fs');
const path = require('path');

// Fix 1: Campaign select maxWidth in CRM page
const crmPagePath = path.join('D:', 'Brain2', 'Projects', 'vicedu-app', 'src', 'app', 'sales', 'crm', 'page.tsx');
let crmContent = fs.readFileSync(crmPagePath, 'utf8');

// Remove maxWidth: "160px" from filterCampaign select
crmContent = crmContent.replace(
  'maxWidth: "160px"',
  'maxWidth: "100%"'
);

fs.writeFileSync(crmPagePath, crmContent);

// Fix 2: Move filterBranch inside the filter container in campaigns page
const campPagePath = path.join('D:', 'Brain2', 'Projects', 'vicedu-app', 'src', 'app', 'sales', 'campaigns', 'page.tsx');
let campContent = fs.readFileSync(campPagePath, 'utf8');

// The UI code to move:
const branchFilterUI = `
        {isGlobalRole && (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <label style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: 600 }}>Chi nhánh:</label>
            <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)} style={{ padding: "0.75rem 2.5rem 0.75rem 1rem", borderRadius: "8px", border: "1px solid #cbd5e1", outline: "none", fontSize: "0.95rem", cursor: "pointer", appearance: "none", background: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23475569%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E') no-repeat right 0.75rem top 50%", backgroundSize: "0.65rem auto" }}>
              <option value="Tất cả">Tất cả</option>
              {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        )}
`;

// First, remove it from where it is now (if it exists outside)
if (campContent.includes(branchFilterUI.trim())) {
    campContent = campContent.replace(branchFilterUI, '');
    campContent = campContent.replace('</div>\n        {isGlobalRole && (', '</div>'); // just in case
}

// Then insert it back inside the filter section
const targetInsertRegex = /<select value=\{filterStatus\}[\s\S]*?<\/select>\n\s*<\/div>/m;
campContent = campContent.replace(targetInsertRegex, match => match + branchFilterUI);

fs.writeFileSync(campPagePath, campContent);

console.log("Patched successfully!");

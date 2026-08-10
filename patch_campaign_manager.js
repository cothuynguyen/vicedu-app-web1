const fs = require('fs');
const path = require('path');

const file = path.join('D:', 'Brain2', 'Projects', 'vicedu-app', 'src', 'app', 'sales', 'crm', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add Import
if (!content.includes('import CRMCampaignManager')) {
  content = content.replace(
    'import CRMBulkReassignModal from "@/components/crm/CRMBulkReassignModal";',
    'import CRMBulkReassignModal from "@/components/crm/CRMBulkReassignModal";\nimport CRMCampaignManager from "@/components/crm/CRMCampaignManager";'
  );
}

// 2. Add State
if (!content.includes('showCampaignManager')) {
  content = content.replace(
    'const [showAddModal, setShowAddModal] = useState(false);',
    'const [showAddModal, setShowAddModal] = useState(false);\n  const [showCampaignManager, setShowCampaignManager] = useState(false);'
  );
}

// 3. Update validCampaigns to filter out "Đã đóng"
// From: const validCampaigns = isGlobalRole ? campaigns : campaigns.filter(c => myBranches.includes(c.branch_id));
// To: const validCampaigns = (isGlobalRole ? campaigns : campaigns.filter(c => myBranches.includes(c.branch_id))).filter(c => c.status !== 'Đã đóng');
content = content.replace(
  'const validCampaigns = isGlobalRole ? campaigns : campaigns.filter(c => myBranches.includes(c.branch_id));',
  'const validCampaigns = (isGlobalRole ? campaigns : campaigns.filter(c => myBranches.includes(c.branch_id))).filter(c => c.status !== \'Đã đóng\');'
);

// 4. Render CampaignManager component
if (!content.includes('<CRMCampaignManager')) {
  const modalPlacement = '{showBulkReassign && (';
  const managerComponent = `
      <CRMCampaignManager
        isOpen={showCampaignManager}
        onClose={() => setShowCampaignManager(false)}
        campaigns={campaigns}
        currentUser={currentUser}
        branches={BRANCHES}
        onSuccess={() => {
          fetchData();
        }}
      />
      `;
  content = content.replace(modalPlacement, managerComponent + '\n      ' + modalPlacement);
}

// 5. Add Button to the UI
const filterHtml = `<label style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 500 }}>Chiến dịch:</label>
          <select value={filterCampaign} onChange={e => setFilterCampaign(e.target.value)} style={{ padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}>
            <option value="Tất cả">Tất cả chiến dịch</option>
            {validCampaigns.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>`;

if (!content.includes('setShowCampaignManager(true)')) {
  const buttonHtml = `
          {(isGlobalRole || currentUser.role === 'Admin') && (
            <button onClick={() => setShowCampaignManager(true)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", height: "36px", display: "flex", alignItems: "center" }} title="Quản lý Chiến dịch">
              ⚙️
            </button>
          )}`;
  content = content.replace(filterHtml, filterHtml + buttonHtml);
}

fs.writeFileSync(file, content);
console.log("Successfully patched page.tsx to add CampaignManager!");

const fs = require('fs');
const path = require('path');

const file = path.join('D:', 'Brain2', 'Projects', 'vicedu-app', 'src', 'app', 'sales', 'crm', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Remove CRMCampaignManager import
content = content.replace('import CRMCampaignManager from "@/components/crm/CRMCampaignManager";\n', '');

// 2. Add next/link import if missing
if (!content.includes('import Link from "next/link";')) {
  content = content.replace('import { Plus, Search,', 'import Link from "next/link";\nimport { Plus, Search,');
}

// 3. Remove showCampaignManager state
content = content.replace('const [showCampaignManager, setShowCampaignManager] = useState(false);\n', '');

// 4. Remove CRMCampaignManager component render
const managerRegex = /<CRMCampaignManager[\s\S]*?\/>/;
content = content.replace(managerRegex, '');

// 5. Change the button to a Link
// Old button:
// {(isGlobalRole || currentUser.role === 'Admin') && (
//   <button onClick={() => setShowCampaignManager(true)} className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", height: "36px", display: "flex", alignItems: "center" }} title="Quản lý Chiến dịch">
//     ⚙️
//   </button>
// )}
const oldButtonRegex = /\{\(isGlobalRole \|\| currentUser\.role === 'Admin'\) && \(\s*<button onClick=\{\(\) => setShowCampaignManager\(true\)\} className="btn btn-secondary" style=\{\{ padding: "0.4rem 0.8rem", height: "36px", display: "flex", alignItems: "center" \}\} title="Quản lý Chiến dịch">\s*⚙️\s*<\/button>\s*\)\}/m;

const newLink = `
          <Link href="/sales/campaigns" className="btn btn-secondary" style={{ padding: "0.4rem 0.8rem", height: "36px", display: "flex", alignItems: "center", textDecoration: 'none' }} title="Quản lý Chiến dịch">
            ⚙️
          </Link>`;

content = content.replace(oldButtonRegex, newLink);

fs.writeFileSync(file, content);
console.log("Successfully patched page.tsx for Campaign Manager Link!");

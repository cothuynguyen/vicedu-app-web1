const fs = require('fs');
const path = require('path');

const file = path.join('D:', 'Brain2', 'Projects', 'vicedu-app', 'src', 'app', 'sales', 'crm', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

const fetchCallRegex = /const fetchCallMetrics = async \(\) => \{[\s\S]*?\} catch \(e\) \{\}\n  \};/m;
const newFetchCall = `const fetchCallMetrics = async () => {
    if (!currentUser.id) return;
    try {
      let fromDate = '', toDate = '';
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      if (callsMetricFilter === 'today') {
        fromDate = \`\${todayStr}T00:00:00Z\`;
        toDate = \`\${todayStr}T23:59:59Z\`;
      } else if (callsMetricFilter === 'yesterday') {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        fromDate = \`\${yStr}T00:00:00Z\`;
        toDate = \`\${yStr}T23:59:59Z\`;
      } else if (callsMetricFilter === 'this_week') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        fromDate = \`\${monday.toISOString().split('T')[0]}T00:00:00Z\`;
        toDate = \`\${todayStr}T23:59:59Z\`;
      } else if (callsMetricFilter === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        fromDate = \`\${firstDay.toISOString().split('T')[0]}T00:00:00Z\`;
        toDate = \`\${todayStr}T23:59:59Z\`;
      } else if (callsMetricFilter === 'custom') {
        if (!callsDateFrom || !callsDateTo) return;
        fromDate = \`\${callsDateFrom}T00:00:00Z\`;
        toDate = \`\${callsDateTo}T23:59:59Z\`;
      }

      let query = supabase.from('crm_interactions')
        .select('customer_id')
        .eq('action_type', 'Gọi điện')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);
        
      if (filterStaff !== "Tất cả") {
        query = query.eq('sale_id', filterStaff);
      } else if (!['Super Admin', 'Giám đốc'].includes(currentUser.role)) {
        query = query.eq('sale_id', currentUser.id);
      }

      const { data } = await query;

      if (data) {
        const uniqueIds = Array.from(new Set(data.map(d => d.customer_id)));
        setCallsCustomerIds(uniqueIds);
      }
    } catch (e) {}
  };`;
content = content.replace(fetchCallRegex, newFetchCall);


const fetchCheckinRegex = /const fetchCheckinMetrics = async \(\) => \{[\s\S]*?\} catch \(e\) \{\}\n  \};/m;
const newFetchCheckin = `const fetchCheckinMetrics = async () => {
    if (!currentUser.id) return;
    try {
      let fromDate = '', toDate = '';
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      if (checkinsMetricFilter === 'today') {
        fromDate = \`\${todayStr}T00:00:00Z\`;
        toDate = \`\${todayStr}T23:59:59Z\`;
      } else if (checkinsMetricFilter === 'yesterday') {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yStr = y.toISOString().split('T')[0];
        fromDate = \`\${yStr}T00:00:00Z\`;
        toDate = \`\${yStr}T23:59:59Z\`;
      } else if (checkinsMetricFilter === 'this_week') {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        fromDate = \`\${monday.toISOString().split('T')[0]}T00:00:00Z\`;
        toDate = \`\${todayStr}T23:59:59Z\`;
      } else if (checkinsMetricFilter === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        fromDate = \`\${firstDay.toISOString().split('T')[0]}T00:00:00Z\`;
        toDate = \`\${todayStr}T23:59:59Z\`;
      } else if (checkinsMetricFilter === 'custom') {
        if (!checkinsDateFrom || !checkinsDateTo) return;
        fromDate = \`\${checkinsDateFrom}T00:00:00Z\`;
        toDate = \`\${checkinsDateTo}T23:59:59Z\`;
      }

      let query = supabase.from('crm_interactions')
        .select('customer_id')
        .eq('action_type', 'Checkin')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (filterStaff !== "Tất cả") {
        query = query.eq('sale_id', filterStaff);
      } else if (!['Super Admin', 'Giám đốc'].includes(currentUser.role)) {
        query = query.eq('sale_id', currentUser.id);
      }

      const { data } = await query;

      if (data) {
        const uniqueIds = Array.from(new Set(data.map(d => d.customer_id)));
        setCheckinsCustomerIds(uniqueIds);
      }
    } catch (e) {}
  };`;
content = content.replace(fetchCheckinRegex, newFetchCheckin);

content = content.replace(/fetchCallMetrics\(\);\n  \}, \[/g, 'fetchCallMetrics();\n  }, [filterStaff, ');
content = content.replace(/fetchCheckinMetrics\(\);\n  \}, \[/g, 'fetchCheckinMetrics();\n  }, [filterStaff, ');

const quickFilterLogicRegex = /const filteredCustomers = baseFilteredCustomers\.filter\([\s\S]*?return matchQuickFilter;\n  \}\);/m;
const addedVars = `\n  const validCallsIds = callsCustomerIds.filter(id => baseFilteredCustomers.some(c => c.id === id));\n  const validCheckinsIds = checkinsCustomerIds.filter(id => baseFilteredCustomers.some(c => c.id === id));\n`;
content = content.replace(quickFilterLogicRegex, match => match + addedVars);

content = content.replace(/\{callsMetricValue\}/g, '{validCallsIds.length}');
content = content.replace(/\{checkinsMetricValue\}/g, '{validCheckinsIds.length}');
content = content.replace(/setCallsMetricValue\(uniqueIds\.length\);/g, '');
content = content.replace(/setCheckinsMetricValue\(uniqueIds\.length\);/g, '');

const isGlobalRoleRegex = /const isGlobalRole = \['Super Admin', 'Giám đốc'\]\.includes\(currentUser\.role\);/;
content = content.replace(isGlobalRoleRegex, `const isGlobalRole = ['Super Admin', 'Giám đốc'].includes(currentUser.role);
  const validCampaigns = isGlobalRole ? campaigns : campaigns.filter(c => myBranches.includes(c.branch_id));`);

content = content.replace(/campaigns\.map\(\(c: any\)/g, 'validCampaigns.map((c: any)');

fs.writeFileSync(file, content);
console.log("Successfully patched page.tsx for Campaign Filtering and Metric intersection.");

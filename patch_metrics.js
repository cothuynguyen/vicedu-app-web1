const fs = require('fs');
const path = require('path');

const file = path.join('D:', 'Brain2', 'Projects', 'vicedu-app', 'src', 'app', 'sales', 'crm', 'page.tsx');
let content = fs.readFileSync(file, 'utf8');

// 1. Add states
const statesTarget = `  const [quickFilter, setQuickFilter] = useState<string | null>(null);`;
const statesReplacement = `  const [quickFilter, setQuickFilter] = useState<string | null>(null);

  // Filter & Metric States
  const [callsMetricFilter, setCallsMetricFilter] = useState("today");
  const [callsDateFrom, setCallsDateFrom] = useState("");
  const [callsDateTo, setCallsDateTo] = useState("");
  const [callsCustomerIds, setCallsCustomerIds] = useState<string[]>([]);
  const [callsMetricValue, setCallsMetricValue] = useState(0);

  const [checkinsMetricFilter, setCheckinsMetricFilter] = useState("this_week");
  const [checkinsDateFrom, setCheckinsDateFrom] = useState("");
  const [checkinsDateTo, setCheckinsDateTo] = useState("");
  const [checkinsCustomerIds, setCheckinsCustomerIds] = useState<string[]>([]);
  const [checkinsMetricValue, setCheckinsMetricValue] = useState(0);`;

content = content.replace(statesTarget, statesReplacement);

// 2. Replace fetchMetrics block
const fetchMetricsRegex = /const fetchMetrics = async \(\) => \{[\s\S]*?\}, \[currentUser\.id\]\);/m;

const newFetchMetrics = `
  const fetchCallMetrics = async () => {
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

      const { data } = await supabase.from('crm_interactions')
        .select('customer_id')
        .eq('sale_id', currentUser.id)
        .eq('action_type', 'Gọi điện')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (data) {
        const uniqueIds = Array.from(new Set(data.map(d => d.customer_id)));
        setCallsCustomerIds(uniqueIds);
        setCallsMetricValue(uniqueIds.length);
      }
    } catch (e) {}
  };

  const fetchCheckinMetrics = async () => {
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

      const { data } = await supabase.from('crm_interactions')
        .select('customer_id')
        .eq('sale_id', currentUser.id)
        .eq('action_type', 'Checkin')
        .gte('created_at', fromDate)
        .lte('created_at', toDate);

      if (data) {
        const uniqueIds = Array.from(new Set(data.map(d => d.customer_id)));
        setCheckinsCustomerIds(uniqueIds);
        setCheckinsMetricValue(uniqueIds.length);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchCallMetrics();
  }, [currentUser.id, callsMetricFilter, callsDateFrom, callsDateTo]);

  useEffect(() => {
    fetchCheckinMetrics();
  }, [currentUser.id, checkinsMetricFilter, checkinsDateFrom, checkinsDateTo]);
`;

content = content.replace(fetchMetricsRegex, newFetchMetrics);

// 3. Update filter logic
const filterRegex = /const filteredCustomers = baseFilteredCustomers\.filter\(c => \{[\s\S]*?return matchQuickFilter;\n  \}\);/m;
const newFilterLogic = `const filteredCustomers = baseFilteredCustomers.filter(c => {
    const today = new Date().toISOString().split("T")[0];
    let matchQuickFilter = true;
    if (quickFilter === "need_call") {
      matchQuickFilter = c.callback_date === today || (c.call_count || 0) === 0;
    } else if (quickFilter === "called_today") {
      matchQuickFilter = !!c.last_called_at?.startsWith(today);
    } else if (quickFilter === "potential") {
      matchQuickFilter = c.lead_status === "Tiềm năng";
    } else if (quickFilter === "hot") {
      const hasCheckin = c.touchpoints?.some((t: any) => t.code === 'checkin' && t.done);
      matchQuickFilter = c.status === "Đang tư vấn" || hasCheckin;
    } else if (quickFilter === "metric_calls") {
      matchQuickFilter = callsCustomerIds.includes(c.id);
    } else if (quickFilter === "metric_checkins") {
      matchQuickFilter = checkinsCustomerIds.includes(c.id);
    }
    return matchQuickFilter;
  });`;

content = content.replace(filterRegex, newFilterLogic);

// 4. Update the UI Dashboards
const dashboardRegex = /\{\/\* DASHBOARD METRICS \*\/\}([\s\S]*?)<\/div>\s*\{\s*loading \?/m;
const newDashboardUI = `{/* DASHBOARD METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8 }}>
          <p style={{ fontSize: "0.85rem", color: "#166534", fontWeight: 600 }}>TỔNG DATA CHIẾN DỊCH</p>
          <h3 style={{ fontSize: "1.8rem", color: "#15803d", margin: "0.5rem 0 0 0" }}>{filteredCustomers.length}</h3>
        </div>

        <div style={{ padding: "1rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: "0.85rem", color: "#1e40af", fontWeight: 600, margin: 0 }}>KHÁCH ĐÃ GỌI ĐIỆN</p>
            <select value={callsMetricFilter} onChange={e => setCallsMetricFilter(e.target.value)} style={{ padding: '0.2rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid #bfdbfe' }}>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="this_week">Tuần này</option>
              <option value="this_month">Tháng này</option>
              <option value="custom">Tùy chọn...</option>
            </select>
          </div>
          {callsMetricFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="date" value={callsDateFrom} onChange={e => setCallsDateFrom(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
              <input type="date" value={callsDateTo} onChange={e => setCallsDateTo(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
            </div>
          )}
          <h3 
            onClick={() => setQuickFilter('metric_calls')}
            style={{ fontSize: "1.8rem", color: "#1d4ed8", margin: "0.5rem 0 0 0", cursor: "pointer", display: "inline-block" }}
            title="Click để xem danh sách"
          >
            {callsMetricValue} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>khách hàng</span>
          </h3>
        </div>

        <div style={{ padding: "1rem", background: "#fdf4ff", border: "1px solid #fbcfe8", borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: "0.85rem", color: "#86198f", fontWeight: 600, margin: 0 }}>KHÁCH ĐÃ CHECK-IN</p>
            <select value={checkinsMetricFilter} onChange={e => setCheckinsMetricFilter(e.target.value)} style={{ padding: '0.2rem', fontSize: '0.8rem', borderRadius: 4, border: '1px solid #fbcfe8' }}>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="this_week">Tuần này</option>
              <option value="this_month">Tháng này</option>
              <option value="custom">Tùy chọn...</option>
            </select>
          </div>
          {checkinsMetricFilter === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input type="date" value={checkinsDateFrom} onChange={e => setCheckinsDateFrom(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
              <input type="date" value={checkinsDateTo} onChange={e => setCheckinsDateTo(e.target.value)} style={{ fontSize: '0.75rem', padding: '0.2rem' }} />
            </div>
          )}
          <h3 
            onClick={() => setQuickFilter('metric_checkins')}
            style={{ fontSize: "1.8rem", color: "#a21caf", margin: "0.5rem 0 0 0", cursor: "pointer", display: "inline-block" }}
            title="Click để xem danh sách"
          >
            {checkinsMetricValue} <span style={{ fontSize: '0.8rem', fontWeight: 'normal' }}>khách hàng</span>
          </h3>
        </div>
      </div>

      {loading ?`;

content = content.replace(dashboardRegex, newDashboardUI);

fs.writeFileSync(file, content);
console.log("Successfully patched page.tsx");

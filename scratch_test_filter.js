const campaigns = [
  {
    id: '1',
    name: 'H?c viên sinh nh?t tháng 8',
    branch_id: 'T?t c?',
    status: 'Ðang ch?y',
    internal_campaign_tasks: [
      { students: { branch_id: 'Vi?t Trì 1' } }
    ]
  }
];

const filterStatus = "T?t c?";
const filterBranch = "Lâm Thao";

const displayedCampaigns = campaigns
    .map(camp => {
      let tasks = camp.internal_campaign_tasks || [];
      if (filterBranch !== "T?t c?") {
        tasks = tasks.filter((t) => t.students?.branch_id?.includes(filterBranch));
      }
      return { ...camp, filtered_tasks: tasks };
    })
    .filter(c => {
      const matchStatus = filterStatus === "T?t c?" || c.status === filterStatus;
      if (!matchStatus) return false;
      if (filterBranch === "T?t c?") return true;
      return c.filtered_tasks.length > 0 || c.branch_id.includes(filterBranch);
    });

console.log(JSON.stringify(displayedCampaigns, null, 2));

import re

with open('temp_page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add LayoutGrid, List to lucide-react imports
if 'LayoutGrid' not in content:
    content = re.sub(r'import \{([^}]+)\} from "lucide-react";', 
                     lambda m: f'import {{{m.group(1)}, LayoutGrid, List}} from "lucide-react";' if 'LayoutGrid' not in m.group(1) else m.group(0), 
                     content)

# 2. Add viewMode state
state_code = """
  // View Mode
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  useEffect(() => {
    const saved = localStorage.getItem("studentsViewMode");
    if (saved === "list") setViewMode("list");
  }, []);
"""
if 'const [viewMode, setViewMode]' not in content:
    content = content.replace('const [loading, setLoading] = useState(true);', 'const [loading, setLoading] = useState(true);\n' + state_code)

# 3. Add Toggle Button
toggle_btn = """
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '8px', padding: '0.25rem', marginRight: '0.5rem', alignItems: 'center' }}>
            <button 
              onClick={() => { setViewMode('grid'); localStorage.setItem('studentsViewMode', 'grid'); }}
              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', background: viewMode === 'grid' ? '#fff' : 'transparent', boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'grid' ? '#3b82f6' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Dạng lưới"
            ><LayoutGrid size={18} /></button>
            <button 
              onClick={() => { setViewMode('list'); localStorage.setItem('studentsViewMode', 'list'); }}
              style={{ padding: '0.5rem', borderRadius: '6px', border: 'none', background: viewMode === 'list' ? '#fff' : 'transparent', boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', color: viewMode === 'list' ? '#3b82f6' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Dạng danh sách"
            ><List size={18} /></button>
          </div>
"""
if '<LayoutGrid size={18} />' not in content:
    content = content.replace('{canCreate && (', toggle_btn + '          {canCreate && (')

# 4. Create the List View rendering logic
list_view_render = """
          {viewMode === 'grid' ? (
            <div className="students-grid">
              {students.map((stu) => (
                <div key={stu.id} className="student-card glass-panel" onClick={() => openEditModal(stu)}>
                  {/* Keep existing grid card content */}
"""
# Need to replace `<div className="students-grid">` with our conditional rendering, and then close it properly.
# Because the grid block is large, let's just use string replacement on the open and close tags.

grid_open = '<div className="students-grid">'
new_grid_open = """
          {viewMode === 'list' ? (
            <div className="students-list-view glass-panel" style={{ overflowX: 'auto', borderRadius: '12px' }}>
              <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.85rem' }}>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Học viên</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Lớp đang học</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Giờ học</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Liên hệ</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Điểm chạm</th>
                    <th style={{ padding: '1rem', fontWeight: 600 }}>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu) => {
                    const activeClasses = stu.class_students?.filter((cs: any) => cs.status === "Đang học").map((cs: any) => cs.classes) || [];
                    const hasPadlet = stu.padlet_url && stu.padlet_api;
                    
                    let touchpointCount = 0;
                    if (stu.touchpoints && stu.touchpoints.length > 0) {
                      const latest = stu.touchpoints[stu.touchpoints.length - 1];
                      touchpointCount = (latest.student_feedback ? 1 : 0) + (latest.parent_feedback ? 1 : 0) + (latest.teacher_feedback ? 1 : 0);
                    }
                    const touchpointPercent = Math.round((touchpointCount / 10) * 100);

                    return (
                      <tr key={stu.id} onClick={() => openEditModal(stu)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }} className="student-list-row">
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            {stu.avatar_url ? (
                              <img src={stu.avatar_url} alt={stu.full_name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} loading="lazy" />
                            ) : (
                              <div className="student-avatar-large" style={{ width: '40px', height: '40px', fontSize: '1.2rem' }}>{stu.full_name.charAt(0)}</div>
                            )}
                            <div>
                              <div style={{ fontWeight: 600, color: '#1e293b' }}>{stu.full_name}</div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                {stu.id}
                                {activeRole === "Super Admin" && !hasPadlet && (
                                  <span style={{ color: '#ef4444', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '2px', background: 'rgba(239, 68, 68, 0.1)', padding: '1px 4px', borderRadius: '4px' }}>
                                    <AlertCircle size={10} /> Thiếu Padlet
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#334155' }}>
                          {activeClasses.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {activeClasses.map((c: any, i: number) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} className="text-primary"/> <span>{c.class_name}</span></div>)}
                            </div>
                          ) : <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa xếp lớp</span>}
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                          <div><span className="text-muted">Còn dư:</span> <strong style={{ color: 'var(--primary)' }}>{stu.remaining_hours || 0}h</strong></div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Tổng: {stu.total_registered_hours || 0}h</div>
                        </td>
                        <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                          <div><Phone size={12} className="text-muted" style={{ marginRight: '4px' }}/> {stu.parent_phone || "Trống"}</div>
                          {stu.address && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stu.address}><MapPin size={10} style={{ marginRight: '2px' }}/> {stu.address}</div>}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', width: '60px' }}>
                              <div style={{ width: `${Math.min(touchpointPercent, 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>{touchpointCount}/10</span>
                          </div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`status-badge ${stu.status === 'Đang học' ? 'active' : 'inactive'}`} style={{ whiteSpace: 'nowrap' }}>
                            {stu.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="students-grid">
"""

grid_close = """
          ))}
        </div>
        </>
"""
new_grid_close = """
          ))}
            </div>
          )}
        </>
"""

if "students-list-view" not in content:
    content = content.replace(grid_open, new_grid_open)
    content = content.replace(grid_close, new_grid_close)

# Add simple css for hover effect on rows
css_append = """
<style>{`
  .student-list-row:hover {
    background-color: #f8fafc !important;
  }
`}</style>
"""
if '.student-list-row:hover' not in content:
    content = content.replace('</>', '</>\n' + css_append)

with open('temp_page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Modification done.")

"use client";

import { useState } from "react";
import { Plus, Search, CheckSquare, Calendar, Trash2, Edit } from "lucide-react";
import { createEvent, closeEvent } from "@/app/actions/events";
import { addPersonalTask, togglePersonalTask, deletePersonalTask, updatePersonalTask } from "@/app/actions/personalTasks";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EventsClient({ initialEvents, employees, user, initialPersonalTasks = [] }: { initialEvents: any[], employees: any[], user: any, initialPersonalTasks?: any[] }) {
  const [activeTab, setActiveTab] = useState<"upcoming" | "active" | "closed" | "pending" | "personal">("active");
  const [personalTasks, setPersonalTasks] = useState(initialPersonalTasks);
  const [newPersonalTask, setNewPersonalTask] = useState({ name: "", deadline: "" });
  const [editingPersonalTaskId, setEditingPersonalTaskId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBranch, setFilterBranch] = useState("Tất cả");
  const [hoveredPeople, setHoveredPeople] = useState<{ eventName: string, people: any[] } | null>(null);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Chờ tiếp nhận': return '#d97706';
      case 'Đã nhận thông tin': return '#3b82f6';
      case 'Đang làm': return '#eab308';
      case 'Đang vướng mắc': return '#ef4444';
      case 'Hoàn thành': return '#16a34a';
      default: return '#64748b';
    }
  };
  
  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ name: "", start_date: "", end_date: "", branch_id: "Toàn hệ thống" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const router = useRouter();

  const getDefaultBranch = (userBranch: string | undefined) => {
    if (!userBranch) return "Toàn hệ thống";
    if (userBranch.includes("Việt Trì")) return "Việt Trì";
    return userBranch;
  };
  
  const myBranch = getDefaultBranch(user?.branch_id);

  const handleSavePersonalTask = async (e: any) => {
    e.preventDefault();
    if (!newPersonalTask.name) return;
    try {
      setIsSubmitting(true);
      if (editingPersonalTaskId) {
        const res = await updatePersonalTask(editingPersonalTaskId, newPersonalTask.name, newPersonalTask.deadline || null);
        if (res.success && res.task) {
          setPersonalTasks(personalTasks.map((t: any) => t.id === editingPersonalTaskId ? res.task : t));
        }
        setEditingPersonalTaskId(null);
      } else {
        const res = await addPersonalTask(user.id, newPersonalTask.name, newPersonalTask.deadline || null);
        if (res.success && res.task) {
          setPersonalTasks([res.task, ...personalTasks]);
        }
      }
      setNewPersonalTask({ name: "", deadline: "" });
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePersonalTask = async (taskId: string, currentStatus: boolean) => {
    try {
      setPersonalTasks(personalTasks.map((t: any) => t.id === taskId ? { ...t, is_completed: !currentStatus } : t));
      await togglePersonalTask(taskId, !currentStatus);
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleDeletePersonalTask = async (taskId: string) => {
    if (!confirm("Xóa công việc này?")) return;
    try {
      setPersonalTasks(personalTasks.filter((t: any) => t.id !== taskId));
      await deletePersonalTask(taskId);
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleCreateEvent = async (e: any) => {
    e.preventDefault();
    const isGlobalManager = ["Super Admin", "Quản lý hệ thống", "Giám đốc"].includes(user?.role || "");
    try {
      setIsSubmitting(true);
      await createEvent({ 
        ...newEvent, 
        branch_id: isGlobalManager ? newEvent.branch_id : myBranch,
        created_by: user?.id 
      });
      setShowModal(false);
      setNewEvent({ name: "", start_date: "", end_date: "", branch_id: "Toàn hệ thống" });
      router.refresh(); // Refresh Server Component data
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseEvent = async (id: string, e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Bạn có chắc muốn Đóng sự kiện này?")) return;
    try {
      await closeEvent(id);
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const isManager = ["Super Admin", "Admin", "Quản lý hệ thống", "Giám đốc", "Quản lý"].includes(user?.role || "");
  const isGlobalManager = ["Super Admin", "Quản lý hệ thống", "Giám đốc"].includes(user?.role || "");
  const canViewCost = ["Kế toán", "Kế toán Chi nhánh", "Kế toán HO", "Admin", "Super Admin"].includes(user?.role || "");

  const filteredEvents = initialEvents.filter(ev => {
    const matchSearch = ev.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = ev.start_date ? new Date(ev.start_date) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    
    const endDate = ev.end_date ? new Date(ev.end_date) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const isManuallyClosed = ev.is_closed_by_manager;
    const isPastEndDate = endDate && endDate < new Date();
    const isBeforeStartDate = startDate && startDate > today;

    let currentStatus = "active";
    if (isManuallyClosed || isPastEndDate) {
      currentStatus = "closed";
    } else if (isBeforeStartDate) {
      currentStatus = "upcoming";
    }
    
    let matchTab = activeTab === currentStatus;
    if (activeTab === 'pending') {
      const hasPendingTask = ev.event_tasks?.some((t: any) => 
        (t.assignee_id === user?.id || (t.co_assignees || []).includes(user?.id)) && 
        ['Chờ tiếp nhận', 'Đã nhận thông tin', 'Đang làm', 'Đang vướng mắc'].includes(t.assignee_status)
      );
      matchTab = hasPendingTask;
    }
    
    let matchBranch = false;
    if (isGlobalManager) {
      matchBranch = filterBranch === "Tất cả" || 
        (filterBranch === "Việt Trì" && ev.branch_id?.includes("Việt Trì")) ||
        ev.branch_id === filterBranch;
    } else {
      const isMyBranch = user?.branch_id && (ev.branch_id === user.branch_id || (user.branch_id.includes("Việt Trì") && ev.branch_id?.includes("Việt Trì")));
      const isAssigned = ev.event_tasks?.some((t: any) => t.assignee_id === user?.id || (t.co_assignees || []).includes(user?.id));
      
      if (ev.branch_id === "Toàn hệ thống") {
        let isMyBranchInvolved = false;
        if (isManager && user?.branch_id) {
          isMyBranchInvolved = ev.event_tasks?.some((t: any) => {
            const assignee = employees.find(e => e.id === t.assignee_id);
            const assigneeMatch = assignee?.branch_id === user.branch_id || (user.branch_id.includes("Việt Trì") && assignee?.branch_id?.includes("Việt Trì"));
            if (assigneeMatch) return true;
            
            if (t.co_assignees && Array.isArray(t.co_assignees)) {
              return t.co_assignees.some((coId: string) => {
                const coAssignee = employees.find(e => e.id === coId);
                return coAssignee?.branch_id === user.branch_id || (user.branch_id.includes("Việt Trì") && coAssignee?.branch_id?.includes("Việt Trì"));
              });
            }
            return false;
          }) || false;
        }
        matchBranch = isAssigned || isMyBranchInvolved;
      } else {
        if (isManager) {
          matchBranch = isMyBranch || isAssigned;
        } else {
          matchBranch = isAssigned;
        }
      }
      
      if (matchBranch && filterBranch !== "Tất cả") {
        matchBranch = (filterBranch === "Việt Trì" && ev.branch_id?.includes("Việt Trì")) || ev.branch_id === filterBranch;
      }
    }
    
    return matchSearch && matchTab && matchBranch;
  });

  let myTotalTasks = 0;
  let myCompletedTasks = 0;
  let myInProgressTasks = 0;

  initialEvents.forEach(ev => {
    ev.event_tasks?.forEach((t: any) => {
      if (t.assignee_id === user?.id || (t.co_assignees || []).includes(user?.id)) {
        myTotalTasks++;
        if (t.assignee_status === 'Hoàn thành') {
          myCompletedTasks++;
        } else if (['Đã nhận thông tin', 'Đang làm', 'Đang vướng mắc'].includes(t.assignee_status)) {
          myInProgressTasks++;
        }
      }
    });
  });

  return (
    <div className="page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="card" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              Quản Lý Sự Kiện & Checklist
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: '#f8fafc', color: '#334155', border: '1px solid #cbd5e1' }}>Tổng: {myTotalTasks}</span>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: '#fef08a', color: '#854d0e', border: '1px solid #fde047' }}>Đang làm: {myInProgressTasks}</span>
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '999px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>Hoàn thành: {myCompletedTasks}</span>
              </div>
            </h1>
            <p className="text-muted" style={{ marginTop: '0.25rem', color: '#64748b' }}>Tạo sự kiện, giao việc và theo dõi tiến độ công việc.</p>
          </div>
          <div>
            {isManager && (
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={20} />
                <span>Tạo Sự kiện mới</span>
              </button>
            )}
          </div>
        </div>

        <div className="page-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: '250px', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search className="search-icon" size={20} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Tìm theo tên sự kiện..." 
              className="form-input" 
              style={{ width: '100%', paddingLeft: '2.5rem', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          
          {isGlobalManager && (
            <select 
              className="form-input" 
              style={{ width: '200px', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 1rem' }}
              value={filterBranch}
              onChange={e => setFilterBranch(e.target.value)}
            >
              <option value="Tất cả">Tất cả Chi nhánh</option>
              <option value="Toàn hệ thống">Toàn hệ thống</option>
              <option value="Việt Trì">Việt Trì</option>
              <option value="Lâm Thao">Lâm Thao</option>
              <option value="Tuyên Quang">Tuyên Quang</option>
              <option value="Dân Hòa">Dân Hòa</option>
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'white', padding: '0.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflowX: 'auto' }}>
        <button 
          className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : ''}`} 
          style={{ whiteSpace: 'nowrap', background: activeTab === 'upcoming' ? undefined : 'transparent', color: activeTab === 'upcoming' ? undefined : '#64748b', boxShadow: activeTab === 'upcoming' ? undefined : 'none' }} 
          onClick={() => setActiveTab('upcoming')}
        >
          Sắp diễn ra
        </button>
        <button 
          className={`btn ${activeTab === 'active' ? 'btn-primary' : ''}`} 
          style={{ whiteSpace: 'nowrap', background: activeTab === 'active' ? undefined : 'transparent', color: activeTab === 'active' ? undefined : '#64748b', boxShadow: activeTab === 'active' ? undefined : 'none' }} 
          onClick={() => setActiveTab('active')}
        >
          Đang diễn ra
        </button>
        <button 
          className={`btn ${activeTab === 'pending' ? 'btn-primary' : ''}`} 
          style={{ whiteSpace: 'nowrap', background: activeTab === 'pending' ? '#ef4444' : 'transparent', color: activeTab === 'pending' ? 'white' : '#ef4444', boxShadow: activeTab === 'pending' ? undefined : 'none', border: '1px solid #ef4444' }} 
          onClick={() => setActiveTab('pending')}
        >
          Việc cần xử lý
        </button>
        <button 
          className={`btn ${activeTab === 'closed' ? 'btn-primary' : ''}`} 
          style={{ whiteSpace: 'nowrap', background: activeTab === 'closed' ? undefined : 'transparent', color: activeTab === 'closed' ? undefined : '#64748b', boxShadow: activeTab === 'closed' ? undefined : 'none' }} 
          onClick={() => setActiveTab('closed')}
        >
          Đã kết thúc
        </button>
        <button 
          className={`btn ${activeTab === 'personal' ? 'btn-primary' : ''}`} 
          style={{ whiteSpace: 'nowrap', background: activeTab === 'personal' ? '#10b981' : 'transparent', color: activeTab === 'personal' ? 'white' : '#10b981', boxShadow: activeTab === 'personal' ? undefined : 'none', border: '1px solid #10b981' }} 
          onClick={() => setActiveTab('personal')}
        >
          Chỉ mình tôi {personalTasks.filter((t: any) => !t.is_completed).length > 0 && `(${personalTasks.filter((t: any) => !t.is_completed).length})`}
        </button>
      </div>

      {activeTab === 'personal' ? (
        <div style={{ background: 'white', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem' }}>Sổ tay cá nhân</h2>
          
          <form onSubmit={handleSavePersonalTask} style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <input 
              type="text" 
              placeholder="Thêm việc cần làm..." 
              className="form-input" 
              style={{ flex: 1, minWidth: '200px', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 1rem' }}
              value={newPersonalTask.name}
              onChange={e => setNewPersonalTask({...newPersonalTask, name: e.target.value})}
              required
            />
            <input 
              type="date" 
              className="form-input" 
              style={{ width: '150px', height: '40px', borderRadius: '8px', border: '1px solid #cbd5e1', padding: '0 1rem' }}
              value={newPersonalTask.deadline}
              onChange={e => setNewPersonalTask({...newPersonalTask, deadline: e.target.value})}
            />
            <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ background: editingPersonalTaskId ? '#3b82f6' : '#10b981', border: 'none', height: '40px' }}>
              {editingPersonalTaskId ? <><Edit size={18} /> Cập nhật</> : <><Plus size={18} /> Thêm</>}
            </button>
            {editingPersonalTaskId && (
              <button 
                type="button" 
                onClick={() => { setEditingPersonalTaskId(null); setNewPersonalTask({ name: "", deadline: "" }); }}
                className="btn btn-secondary" 
                style={{ height: '40px' }}
              >
                Hủy
              </button>
            )}
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {personalTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Chưa có công việc nào.</div>
            ) : (
              personalTasks.map((task: any) => {
                let daysLeft = null;
                if (task.deadline && !task.is_completed) {
                  const today = new Date();
                  today.setHours(0,0,0,0);
                  const dl = new Date(task.deadline);
                  dl.setHours(0,0,0,0);
                  daysLeft = Math.round((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                }

                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '8px', background: task.is_completed ? '#f8fafc' : 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={task.is_completed}
                        onChange={() => handleTogglePersonalTask(task.id, task.is_completed)}
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '1rem', color: task.is_completed ? '#94a3b8' : '#0f172a', textDecoration: task.is_completed ? 'line-through' : 'none' }}>
                        {task.task_name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {daysLeft !== null && (
                        <span style={{ fontSize: '0.85rem', padding: '4px 8px', borderRadius: '4px', background: daysLeft < 0 ? '#fee2e2' : daysLeft <= 2 ? '#fef3c7' : '#dcfce3', color: daysLeft < 0 ? '#ef4444' : daysLeft <= 2 ? '#d97706' : '#16a34a', fontWeight: 500 }}>
                          {daysLeft < 0 ? `🚨 Trễ ${Math.abs(daysLeft)} ngày` : daysLeft === 0 ? '⏳ Hạn hôm nay' : `⏳ Còn ${daysLeft} ngày`}
                        </span>
                      )}
                      <button 
                        onClick={() => {
                          setEditingPersonalTaskId(task.id);
                          setNewPersonalTask({ name: task.task_name, deadline: task.deadline || "" });
                        }}
                        style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Sửa việc"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeletePersonalTask(task.id)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
                        title="Xóa việc"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
          <CheckSquare size={48} color="#94a3b8" style={{ margin: '0 auto' }} />
          <h3 style={{ marginTop: '1rem', color: '#475569' }}>Không có sự kiện nào</h3>
        </div>
      ) : (
        <div className="events-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredEvents.map(ev => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const startDate = ev.start_date ? new Date(ev.start_date) : null;
            if (startDate) startDate.setHours(0, 0, 0, 0);
            
            const endDate = ev.end_date ? new Date(ev.end_date) : null;
            if (endDate) endDate.setHours(23, 59, 59, 999);

            const isManuallyClosed = ev.is_closed_by_manager;
            const isPastEndDate = endDate && endDate < new Date();
            const isBeforeStartDate = startDate && startDate > today;

            let statusText = "Đang diễn ra";
            let statusColor = "#166534";
            let statusBg = "#dcfce3";
            let currentStatusStr = "active";

            if (isManuallyClosed || isPastEndDate) {
              statusText = "Đã kết thúc";
              statusColor = "#991b1b";
              statusBg = "#fee2e2";
              currentStatusStr = "closed";
            } else if (isBeforeStartDate) {
              statusText = "Sắp diễn ra";
              statusColor = "#1e40af";
              statusBg = "#dbeafe";
              currentStatusStr = "upcoming";
            }
            
            const totalTasks = ev.event_tasks?.length || 0;
            const pendingTasks = ev.event_tasks?.filter((t: any) => t.assignee_status === 'Chờ tiếp nhận').length || 0;
            const completedTasks = ev.event_tasks?.filter((t: any) => t.assignee_status === 'Hoàn thành').length || 0;
            const inProgressTasks = ev.event_tasks?.filter((t: any) => ['Đã nhận thông tin', 'Đang làm', 'Đang vướng mắc'].includes(t.assignee_status)).length || 0;
            const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
            
            const totalCost = ev.event_tasks?.reduce((sum: number, t: any) => sum + (Number(t.cost) || 0), 0) || 0;
            
            // Process involved people
            const involvedMap = new Map();
            if (ev.event_tasks) {
              ev.event_tasks.forEach((t: any) => {
                const addPerson = (id: string, isMain: boolean, status: string) => {
                  if (!id) return;
                  if (!involvedMap.has(id)) {
                    involvedMap.set(id, { id, isMain, statusCounts: {} });
                  }
                  const person = involvedMap.get(id);
                  if (isMain) person.isMain = true; // if they are ever main, mark as main
                  person.statusCounts[status] = (person.statusCounts[status] || 0) + 1;
                };
                addPerson(t.assignee_id, true, t.assignee_status);
                if (Array.isArray(t.co_assignees)) {
                  t.co_assignees.forEach((cid: string) => addPerson(cid, false, t.assignee_status));
                }
              });
            }
            const involvedPeople = Array.from(involvedMap.values()).map(p => {
              const emp = employees.find(e => e.id === p.id);
              const fullName = emp ? emp.full_name : "Unknown";
              const initials = fullName.split(' ').filter((n:string)=>n).map((n: string) => n[0]).slice(-2).join('').toUpperCase();
              
              const statusStr = Object.entries(p.statusCounts).map(([status, count]) => `${status} (${count})`).join(', ');
              
              return { ...p, fullName, initials, tooltip: `${fullName} - ${statusStr}` };
            }).sort((a, b) => (a.isMain === b.isMain) ? 0 : a.isMain ? -1 : 1);
            
            let daysLeft = 0;
            if (currentStatusStr === 'active' && ev.end_date) {
              const todayStart = new Date();
              todayStart.setHours(0, 0, 0, 0);
              const endD = new Date(ev.end_date);
              endD.setHours(0, 0, 0, 0);
              const diffTime = endD.getTime() - todayStart.getTime();
              daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));
            }
            
            return (
              <Link 
                href={`/events/${ev.id}`}
                key={ev.id} 
                style={{ 
                  background: 'white', 
                  borderRadius: '12px', 
                  padding: '1rem 1.5rem', 
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)', 
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  transition: 'all 0.2s ease',
                  textDecoration: 'none',
                  color: 'inherit'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
              >
                {/* Cột 1: Thông tin chính */}
                <div style={{ flex: 2, minWidth: '250px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '0.25rem', color: '#0f172a' }}>{ev.name}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} />
                    <span>{ev.start_date ? new Date(ev.start_date).toLocaleDateString('vi-VN') : '---'} - {ev.end_date ? new Date(ev.end_date).toLocaleDateString('vi-VN') : '---'}</span>
                    {canViewCost && (
                      <>
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#0f172a', fontWeight: 600 }}>
                          💰 Chi phí: {totalCost.toLocaleString('vi-VN')} đ
                        </span>
                      </>
                    )}
                  </div>
                  {totalTasks > 0 && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 500 }}>
                        Tổng: {totalTasks}
                      </span>
                      {pendingTasks > 0 && (
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#fef3c7', color: '#d97706', fontWeight: 500 }}>
                          Chờ nhận: {pendingTasks}
                        </span>
                      )}
                      {inProgressTasks > 0 && (
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#dbeafe', color: '#2563eb', fontWeight: 500 }}>
                          Đang làm: {inProgressTasks}
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#dcfce3', color: '#16a34a', fontWeight: 500 }}>
                        Hoàn thành: {completedTasks} ({percentComplete}%)
                      </span>
                    </div>
                  )}
                </div>

                {/* Cột 2: Chi nhánh & Nhân sự */}
                <div style={{ flex: 1.5, minWidth: '200px', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ display: 'inline-block', background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500 }}>
                    📍 {ev.branch_id || 'Toàn hệ thống'}
                  </span>
                  {involvedPeople.length > 0 && (
                    <div 
                      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative', zIndex: 10 }}
                      onMouseEnter={(e) => {
                        e.stopPropagation();
                        setHoveredPeople({ eventName: ev.name, people: involvedPeople });
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation();
                        setHoveredPeople(null);
                      }}
                    >
                      {involvedPeople.slice(0, 3).map((p, idx) => (
                        <div 
                          key={p.id} 
                          style={{ 
                            width: '28px', height: '28px', borderRadius: '50%', background: p.isMain ? '#3b82f6' : '#94a3b8', 
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '0.75rem', fontWeight: 'bold', marginLeft: idx > 0 ? '-8px' : '0',
                            border: '2px solid white'
                          }}
                        >
                          {p.initials}
                        </div>
                      ))}
                      {involvedPeople.length > 3 && (
                        <div 
                          style={{ 
                            width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', 
                            color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            fontSize: '0.75rem', fontWeight: 'bold', marginLeft: '-8px',
                            border: '2px solid white'
                          }}
                        >
                          +{involvedPeople.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Cột 3: Trạng thái */}
                <div style={{ flex: 1.2, minWidth: '150px', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ 
                    padding: '4px 10px', 
                    borderRadius: '6px', 
                    fontSize: '0.85rem', 
                    fontWeight: 600,
                    background: statusBg,
                    color: statusColor,
                    whiteSpace: 'nowrap'
                  }}>
                    {statusText}
                  </span>
                  {currentStatusStr === 'active' && daysLeft >= 0 && (
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: '#f3e8ff', color: '#9333ea', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      ⏳ Còn {daysLeft} ngày
                    </span>
                  )}
                </div>

                {/* Cột 4: Hành động */}
                <div style={{ flex: 1, minWidth: '150px', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  {currentStatusStr !== 'closed' && isManager && (
                    <button 
                      style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                      onClick={(e) => handleCloseEvent(ev.id, e)}
                    >
                      Đóng SK
                    </button>
                  )}
                  <span 
                    style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 500 }}
                  >
                    Người tạo: {employees.find(e => e.id === ev.created_by)?.full_name || 'Admin'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>Tạo sự kiện mới</h2>
            <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input type="text" placeholder="Tên sự kiện" className="form-input" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} required />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Ngày bắt đầu</label>
                  <input type="date" className="form-input" value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Ngày kết thúc</label>
                  <input type="date" className="form-input" value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} required />
                </div>
              </div>
              <div style={{ marginTop: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Chi nhánh (Phạm vi sự kiện)</label>
                <select 
                  className="form-input"
                  value={isGlobalManager ? newEvent.branch_id : myBranch}
                  onChange={e => setNewEvent({...newEvent, branch_id: e.target.value})}
                  disabled={!isGlobalManager}
                >
                  <option value="Toàn hệ thống">Toàn hệ thống</option>
                  <option value="Việt Trì">Việt Trì</option>
                  <option value="Lâm Thao">Lâm Thao</option>
                  <option value="Tuyên Quang">Tuyên Quang</option>
                  <option value="Dân Hòa">Dân Hòa</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Đang lưu...' : 'Lưu sự kiện'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {hoveredPeople && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, pointerEvents: 'none' }}>
          <div style={{ background: 'rgba(255,255,255,0.95)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', minWidth: '350px', backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#0f172a', marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
              Nhân sự tham gia: {hoveredPeople.eventName}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {hoveredPeople.people.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: p.isMain ? '#3b82f6' : '#94a3b8', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    {p.initials}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b' }}>{p.fullName} <span style={{fontSize: '0.75rem', fontWeight: 'normal', color: '#94a3b8'}}>({p.isMain ? 'Phụ trách' : 'Phối hợp'})</span></div>
                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                      {Object.entries(p.statusCounts).map(([status, count]) => (
                        <span key={status} style={{ marginRight: '0.75rem', display: 'inline-block' }}>
                          <span style={{ color: getStatusColor(status), fontWeight: 600 }}>{status}</span>: {count as number}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

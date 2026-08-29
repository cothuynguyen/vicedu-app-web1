"use client";

import { useState } from "react";
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock, Image as ImageIcon, MessageSquare, AlertCircle, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { 
  createEventTask, 
  approveEventTask, 
  updateTaskStatus, 
  updateTaskAttachment,
  addTaskNote,
  updateEvent,
  deleteEvent,
  updateEventTask,
  deleteEventTask
} from "@/app/actions/events";
import { useRouter } from "next/navigation";
import Link from "next/link";

const getStatusColor = (status: string) => {
  switch(status) {
    case 'Hoàn thành': return '#16a34a';
    case 'Đang vướng mắc': return '#ef4444';
    case 'Đang làm': return '#eab308';
    case 'Chờ tiếp nhận': return '#64748b';
    case 'Đã nhận thông tin': return '#3b82f6';
    default: return '#2563eb';
  }
}

export default function EventDetailClient({ eventId, event, tasks, employees, user }: { eventId: string, event: any, tasks: any[], employees: any[], user: any }) {
  
  // Tabs for employee
  const [activeTab, setActiveTab] = useState<"my_tasks" | "all_tasks">("my_tasks");
  const [statusFilter, setStatusFilter] = useState("Tất cả");
  
  // Modal for new task
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ task_name: "", description: "", assignee_id: "", co_assignees: [] as string[], start_date: "", end_date: "", cost: 0 });
  const [selectedBranch, setSelectedBranch] = useState("Tất cả");
  const [selectedEditBranch, setSelectedEditBranch] = useState("Tất cả");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modal edit event
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editEventData, setEditEventData] = useState({ name: "", start_date: "", end_date: "", branch_id: "" });
  
  // Modal edit task
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editTaskData, setEditTaskData] = useState({ id: "", task_name: "", description: "", assignee_id: "", co_assignees: [] as string[], start_date: "", end_date: "", cost: 0 });
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [viewTaskInfo, setViewTaskInfo] = useState<string | null>(null);
  
  const router = useRouter();

  const isManager = ["Super Admin", "Admin", "Quản lý hệ thống", "Giám đốc", "Quản lý"].includes(user?.role || "");
  const isGlobalManager = ["Super Admin", "Quản lý hệ thống", "Giám đốc"].includes(user?.role || "");
  const canViewCost = ["Kế toán", "Kế toán Chi nhánh", "Kế toán HO", "Admin", "Super Admin", "Quản lý hệ thống", "Giám đốc"].includes(user?.role || "");

  const formatDateForInput = (dateString?: string | null) => {
    if (!dateString) return "";
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleCreateTask = async (e: any) => {
    e.preventDefault();
    if (!newTask.task_name || !newTask.assignee_id) return alert("Vui lòng điền đủ tên công việc và người phụ trách");
    try {
      setIsSubmitting(true);
      await createEventTask({
        event_id: eventId,
        task_name: newTask.task_name,
        description: newTask.description,
        assignee_id: newTask.assignee_id,
        co_assignees: newTask.co_assignees,
        start_date: newTask.start_date || undefined,
        end_date: newTask.end_date || undefined,
        cost: newTask.cost || 0,
        task_index: tasks.length + 1
      });
      setShowTaskModal(false);
      setNewTask({ task_name: "", description: "", assignee_id: "", co_assignees: [], start_date: "", end_date: "", cost: 0 });
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateEvent = async (e: any) => {
    e.preventDefault();
    if (!editEventData.name) return alert("Vui lòng nhập tên sự kiện");
    try {
      setIsSubmitting(true);
      await updateEvent(eventId, {
        name: editEventData.name,
        start_date: editEventData.start_date,
        end_date: editEventData.end_date,
        branch_id: editEventData.branch_id
      });
      setShowEditEventModal(false);
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm("Bạn có chắc chắn muốn XÓA sự kiện này? Toàn bộ task con sẽ bị xóa và không thể khôi phục!")) return;
    try {
      await deleteEvent(eventId);
      router.push('/events');
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleUpdateTask = async (e: any) => {
    e.preventDefault();
    if (!editTaskData.task_name || !editTaskData.assignee_id) return alert("Vui lòng điền đủ thông tin");
    try {
      setIsSubmitting(true);
      await updateEventTask(editTaskData.id, eventId, {
        task_name: editTaskData.task_name,
        description: editTaskData.description,
        assignee_id: editTaskData.assignee_id,
        co_assignees: editTaskData.co_assignees,
        start_date: editTaskData.start_date,
        end_date: editTaskData.end_date,
        cost: editTaskData.cost || 0
      });
      setShowEditTaskModal(false);
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Bạn chắc chắn muốn xóa công việc này?")) return;
    try {
      await deleteEventTask(taskId, eventId);
      router.refresh();
    } catch (err: any) {
      alert("Lỗi: " + err.message);
    }
  };

  const handleUploadImage = async (taskId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload lên Cloudflare thông qua API nội bộ
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      
      if (data.url) {
        await updateTaskAttachment(taskId, eventId, data.url);
        router.refresh();
      } else {
        alert("Upload thất bại: Không lấy được URL");
      }
    } catch (err: any) {
      alert("Lỗi tải ảnh: " + err.message);
    }
  };

  const filteredEmployees = employees.filter(emp => {
    if (!isGlobalManager) {
      if (user?.branch_id?.includes("Việt Trì")) return emp.branch_id?.includes("Việt Trì");
      return emp.branch_id === user?.branch_id;
    }
    if (selectedBranch === "Tất cả") return true;
    if (selectedBranch === "Việt Trì") return emp.branch_id?.includes("Việt Trì");
    return emp.branch_id === selectedBranch;
  });

  const filteredEditEmployees = employees.filter(emp => {
    if (!isGlobalManager) {
      if (user?.branch_id?.includes("Việt Trì")) return emp.branch_id?.includes("Việt Trì");
      return emp.branch_id === user?.branch_id;
    }
    if (selectedEditBranch === "Tất cả") return true;
    if (selectedEditBranch === "Việt Trì") return emp.branch_id?.includes("Việt Trì");
    return emp.branch_id === selectedEditBranch;
  });
  
  const branchesList = ["Việt Trì", "Lâm Thao", "Tuyên Quang", "Dân Hòa"];

  const visibleTasks = (isManager ? tasks : (activeTab === "my_tasks" ? tasks.filter(t => t.assignee_id === user?.id || (t.co_assignees || []).includes(user?.id)) : tasks)).filter(t => {
    if (statusFilter === "Tất cả") return true;
    if (statusFilter === "Chờ tiếp nhận") return t.assignee_status === "Chờ tiếp nhận";
    if (statusFilter === "Đang làm") return ["Đã nhận thông tin", "Đang làm", "Đang vướng mắc"].includes(t.assignee_status);
    if (statusFilter === "Hoàn thành") return t.assignee_status === "Hoàn thành";
    return true;
  });

  const totalCost = tasks.reduce((sum, task) => sum + (Number(task.cost) || 0), 0);

  if (!event) return <div style={{ padding: '2rem', textAlign: 'center' }}>Không tìm thấy sự kiện!</div>;

  let statusText = "Đang diễn ra";
  let statusColor = "#16a34a"; // green
  let currentStatusStr = "active";
  
  if (event) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = event.start_date ? new Date(event.start_date) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    
    const endDate = event.end_date ? new Date(event.end_date) : null;
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const isManuallyClosed = event.is_closed_by_manager;
    const isPastEndDate = endDate && endDate < new Date();
    const isBeforeStartDate = startDate && startDate > today;

    if (isManuallyClosed || isPastEndDate) {
      statusText = "Đã kết thúc";
      statusColor = "#ef4444";
      currentStatusStr = "closed";
    } else if (isBeforeStartDate) {
      statusText = "Sắp diễn ra";
      statusColor = "#2563eb"; // blue
      currentStatusStr = "upcoming";
    }
  }

  const totalTasks = tasks.length || 0;
  const pendingTasks = tasks.filter((t: any) => t.assignee_status === 'Chờ tiếp nhận').length || 0;
  const completedTasks = tasks.filter((t: any) => t.assignee_status === 'Hoàn thành').length || 0;
  const inProgressTasks = tasks.filter((t: any) => ['Đã nhận thông tin', 'Đang làm', 'Đang vướng mắc'].includes(t.assignee_status)).length || 0;
  const percentComplete = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  let daysLeft = 0;
  if (currentStatusStr === 'active' && event?.end_date) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const endD = new Date(event.end_date);
    endD.setHours(0, 0, 0, 0);
    const diffTime = endD.getTime() - todayStart.getTime();
    daysLeft = Math.round(diffTime / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <Link 
        href='/events'
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 600, padding: '0.5rem 1rem', borderRadius: '8px', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: 'max-content', textDecoration: 'none' }}
      >
        <ArrowLeft size={16} /> Quay lại
      </Link>

      <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#0f172a' }}>{event.name}</h1>
          {isManager && (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={() => {
                  setEditEventData({
                    name: event.name,
                    start_date: formatDateForInput(event.start_date),
                    end_date: formatDateForInput(event.end_date),
                    branch_id: event.branch_id || "Toàn hệ thống"
                  });
                  setShowEditEventModal(true);
                }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', border: 'none', cursor: 'pointer' }}
                title="Sửa sự kiện"
              >
                <Edit size={16} />
              </button>
              <button 
                onClick={handleDeleteEvent}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '6px', background: '#fef2f2', color: '#ef4444', border: 'none', cursor: 'pointer' }}
                title="Xóa sự kiện"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
          <span>Trạng thái: <strong style={{ color: statusColor }}>{statusText}</strong></span>
          <span>Bắt đầu: {event.start_date ? new Date(event.start_date).toLocaleDateString('vi-VN') : '---'}</span>
          <span>Kết thúc: {event.end_date ? new Date(event.end_date).toLocaleDateString('vi-VN') : '---'}</span>
          {event.branch_id && <span>Chi nhánh: <strong>{event.branch_id}</strong></span>}
          {canViewCost && <span>Tổng chi phí: <strong style={{ color: '#ef4444' }}>{totalCost.toLocaleString('vi-VN')} đ</strong></span>}
        </div>
        
        {totalTasks > 0 && (
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed #e2e8f0', flexWrap: 'wrap', userSelect: 'none' }}>
            <span 
              onClick={() => setStatusFilter("Tất cả")}
              style={{ fontSize: '0.9rem', padding: '4px 12px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', opacity: statusFilter === "Tất cả" ? 1 : 0.5 }}
            >
              Tổng công việc: {totalTasks}
            </span>
            {pendingTasks > 0 && (
              <span 
                onClick={() => setStatusFilter(statusFilter === "Chờ tiếp nhận" ? "Tất cả" : "Chờ tiếp nhận")}
                style={{ fontSize: '0.9rem', padding: '4px 12px', borderRadius: '6px', background: '#fef3c7', color: '#d97706', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', opacity: (statusFilter === "Tất cả" || statusFilter === "Chờ tiếp nhận") ? 1 : 0.5 }}
              >
                Chờ nhận: {pendingTasks}
              </span>
            )}
            {inProgressTasks > 0 && (
              <span 
                onClick={() => setStatusFilter(statusFilter === "Đang làm" ? "Tất cả" : "Đang làm")}
                style={{ fontSize: '0.9rem', padding: '4px 12px', borderRadius: '6px', background: '#dbeafe', color: '#2563eb', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', opacity: (statusFilter === "Tất cả" || statusFilter === "Đang làm") ? 1 : 0.5 }}
              >
                Đang làm: {inProgressTasks}
              </span>
            )}
            <span 
              onClick={() => setStatusFilter(statusFilter === "Hoàn thành" ? "Tất cả" : "Hoàn thành")}
              style={{ fontSize: '0.9rem', padding: '4px 12px', borderRadius: '6px', background: '#dcfce3', color: '#16a34a', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', opacity: (statusFilter === "Tất cả" || statusFilter === "Hoàn thành") ? 1 : 0.5 }}
            >
              Hoàn thành: {completedTasks} ({percentComplete}%)
            </span>
            {currentStatusStr === 'active' && daysLeft >= 0 && (
              <span style={{ fontSize: '0.9rem', padding: '4px 12px', borderRadius: '6px', background: '#f3e8ff', color: '#9333ea', fontWeight: 500 }}>
                ⏳ Đếm ngược: Còn {daysLeft} ngày
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderRadius: '12px', padding: '2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            {!isManager && (
              <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>
                <button 
                  className={`btn ${activeTab === 'my_tasks' ? 'btn-primary' : ''}`} 
                  style={{ background: activeTab === 'my_tasks' ? undefined : 'transparent', color: activeTab === 'my_tasks' ? undefined : '#64748b', boxShadow: activeTab === 'my_tasks' ? undefined : 'none' }} 
                  onClick={() => setActiveTab('my_tasks')}
                >
                  Chỉ riêng mình
                </button>
                <button 
                  className={`btn ${activeTab === 'all_tasks' ? 'btn-primary' : ''}`} 
                  style={{ background: activeTab === 'all_tasks' ? undefined : 'transparent', color: activeTab === 'all_tasks' ? undefined : '#64748b', boxShadow: activeTab === 'all_tasks' ? undefined : 'none' }} 
                  onClick={() => setActiveTab('all_tasks')}
                >
                  Công việc chung (Chỉ xem)
                </button>
              </div>
            )}
            {isManager && <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#0f172a' }}>Danh sách công việc</h2>}
          </div>
          
          {isManager && currentStatusStr !== 'closed' && (
            <button className="btn btn-primary" onClick={() => setShowTaskModal(true)}>
              <Plus size={20} />
              <span>Thêm Đầu mục</span>
            </button>
          )}
        </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {visibleTasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
            Chưa có công việc nào trong danh sách này.
          </div>
        ) : (
          visibleTasks.map(task => {
            const isMyTask = task.assignee_id === user?.id;
            const canEdit = isManager || (isMyTask && currentStatusStr !== 'closed');
            
            // Check overdue
            let isOverdue = false;
            if (task.end_date && task.manager_approval !== 'Hoàn thành') {
              const taskEndDate = new Date(task.end_date);
              taskEndDate.setHours(23, 59, 59, 999);
              isOverdue = new Date() > taskEndDate;
            }
            const isExpanded = expandedTasks.includes(task.id);

            return (
              <div key={task.id} style={{ 
                background: 'white', 
                borderRadius: '12px', 
                padding: '1.5rem', 
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', 
                border: isOverdue ? '1px solid #ef4444' : '1px solid #e2e8f0',
                borderLeft: isOverdue ? '4px solid #ef4444' : '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isExpanded ? '1rem' : '0' }}>
                  <div>
                    <h3 
                      onClick={() => {
                        if (isExpanded) {
                          setExpandedTasks(expandedTasks.filter(id => id !== task.id));
                        } else {
                          setExpandedTasks([...expandedTasks, task.id]);
                        }
                      }}
                      style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', userSelect: 'none' }}
                    >
                      {isExpanded ? <ChevronUp size={18} color="#64748b"/> : <ChevronDown size={18} color="#64748b"/>}
                      {task.task_name}
                      {(isManager || canViewCost) && (
                        <div style={{ display: 'flex', gap: '4px', marginLeft: '0.5rem' }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const empBranch = employees.find((e: any) => e.id === task.assignee_id)?.branch_id || "Tất cả";
                              let branchFilter = empBranch;
                              if (empBranch.includes("Việt Trì")) branchFilter = "Việt Trì";
                              setSelectedEditBranch(branchFilter);
                              setEditTaskData({
                                id: task.id,
                                task_name: task.task_name,
                                description: task.description || "",
                                assignee_id: task.assignee_id,
                                co_assignees: task.co_assignees || [],
                                start_date: formatDateForInput(task.start_date),
                                end_date: formatDateForInput(task.end_date),
                                cost: task.cost || 0
                              });
                              setShowEditTaskModal(true);
                            }} 
                            style={{ background: '#f1f5f9', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}
                            title={isManager ? "Sửa công việc" : "Cập nhật chi phí"}
                          ><Edit size={14}/></button>
                          {isManager && (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }} 
                              style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}
                              title="Xóa công việc"
                            ><Trash2 size={14}/></button>
                          )}
                        </div>
                      )}
                      {isOverdue && <span style={{ fontSize: '0.75rem', background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '999px', fontWeight: 'normal' }}><AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }}/>Quá hạn</span>}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                      Phụ trách: <strong>{task.users?.full_name || 'Không xác định'}</strong>
                      {task.co_assignees && task.co_assignees.length > 0 && (
                        <span> | Phối hợp: <strong>{task.co_assignees.map((id: string) => employees.find((e: any) => e.id === id)?.full_name || id).join(', ')}</strong></span>
                      )}
                    </p>
                    {task.description && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setViewTaskInfo(task.description); }} 
                          style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          📄 Thông tin
                        </button>
                      </div>
                    )}
                    {(task.start_date || task.end_date) && (
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={12} /> Hạn: {task.end_date ? new Date(task.end_date).toLocaleDateString('vi-VN') : 'Không có'}
                      </p>
                    )}
                    {canViewCost && task.cost > 0 && (
                      <p style={{ fontSize: '0.85rem', color: '#ef4444', marginTop: '0.25rem', fontWeight: 500 }}>
                        Chi phí: {Number(task.cost).toLocaleString('vi-VN')} đ
                      </p>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {(isManager || task.assignee_id === user?.id) && task.manager_approval !== 'Hoàn thành' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9' }}>
                        NS báo cáo: 
                        <select 
                          style={{ 
                            padding: '2px 4px', 
                            fontSize: '0.85rem', 
                            borderRadius: '4px', 
                            border: '1px solid #cbd5e1', 
                            background: 'white',
                            color: getStatusColor(task.assignee_status),
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                          value={task.assignee_status}
                          onChange={e => updateTaskStatus(task.id, eventId, e.target.value).then(() => router.refresh())}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="Chờ tiếp nhận" style={{ color: '#64748b', fontWeight: 600 }}>Chờ tiếp nhận</option>
                          <option value="Đã nhận thông tin" style={{ color: '#3b82f6', fontWeight: 600 }}>Đã nhận thông tin</option>
                          <option value="Đang làm" style={{ color: '#eab308', fontWeight: 600 }}>Đang làm</option>
                          <option value="Đang vướng mắc" style={{ color: '#ef4444', fontWeight: 600 }}>Đang vướng mắc</option>
                          <option value="Hoàn thành" style={{ color: '#16a34a', fontWeight: 600 }}>Hoàn thành</option>
                        </select>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9' }}>
                        NS báo cáo: <span style={{ color: getStatusColor(task.assignee_status), fontWeight: 600 }}>{task.assignee_status}</span>
                      </div>
                    )}
                    {isManager ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, padding: '4px 10px', borderRadius: '6px', background: task.manager_approval === 'Hoàn thành' ? '#dcfce3' : task.manager_approval === 'Chưa hoàn thành' ? '#fee2e2' : '#fef9c3' }}>
                        Sếp duyệt: 
                        <select 
                          style={{ 
                            padding: '2px 4px', 
                            fontSize: '0.85rem', 
                            borderRadius: '4px', 
                            border: '1px solid #cbd5e1', 
                            background: 'white',
                            color: task.manager_approval === 'Hoàn thành' ? '#166534' : task.manager_approval === 'Chưa hoàn thành' ? '#991b1b' : '#854d0e',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                          }}
                          value={task.manager_approval}
                          onChange={e => approveEventTask(task.id, eventId, e.target.value).then(() => router.refresh())}
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="Chờ duyệt" style={{ color: '#854d0e', fontWeight: 600 }}>Chờ duyệt</option>
                          <option value="Hoàn thành" style={{ color: '#166534', fontWeight: 600 }}>Duyệt Xong</option>
                          <option value="Chưa hoàn thành" style={{ color: '#991b1b', fontWeight: 600 }}>Trả Về</option>
                        </select>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.85rem', fontWeight: 500, padding: '4px 10px', borderRadius: '6px', background: task.manager_approval === 'Hoàn thành' ? '#dcfce3' : task.manager_approval === 'Chưa hoàn thành' ? '#fee2e2' : '#fef9c3', color: task.manager_approval === 'Hoàn thành' ? '#166534' : task.manager_approval === 'Chưa hoàn thành' ? '#991b1b' : '#854d0e' }}>
                        Sếp duyệt: {task.manager_approval}
                      </div>
                    )}
                  </div>
                </div>

                {/* Các nút thao tác */}
                {isExpanded && (
                  <>
                    {canEdit && (
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e2e8f0', flexWrap: 'wrap' }}>
                        
                    {/* Upload ảnh */}
                    <div style={{ position: 'relative' }}>
                      <input 
                        type="file" 
                        accept="image/*" 
                        id={`upload-${task.id}`} 
                        style={{ display: 'none' }}
                        onChange={e => e.target.files?.[0] && handleUploadImage(task.id, e.target.files[0])}
                      />
                      <label 
                        htmlFor={`upload-${task.id}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: '#f8fafc', color: '#475569', border: '1px solid #cbd5e1', padding: '4px 12px', borderRadius: '6px', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <ImageIcon size={14} /> {task.attachment_url ? "Đổi Minh Chứng" : "Up Minh Chứng"}
                      </label>
                    </div>
                  </div>
                )}

                {/* Hiển thị ảnh minh chứng */}
                {task.attachment_url && (
                  <div style={{ marginTop: '1rem', position: 'relative', display: 'inline-block' }}>
                    <a href={task.attachment_url} target="_blank" rel="noopener noreferrer">
                      <img src={task.attachment_url} alt="Minh chứng" style={{ height: '80px', width: 'auto', borderRadius: '8px', border: '1px solid #e2e8f0', objectFit: 'cover' }} />
                    </a>
                    {canEdit && (
                      <button 
                        onClick={() => {
                          if (confirm("Xóa ảnh minh chứng này?")) {
                            updateTaskAttachment(task.id, eventId, "").then(() => router.refresh());
                          }
                        }}
                        style={{ position: 'absolute', top: '-8px', right: '-8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}
                        title="Xóa ảnh"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}

                {/* Mini Comments */}
                <div style={{ marginTop: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><MessageSquare size={14}/> Trao đổi & Ghi chú</h4>
                  
                  {Array.isArray(task.notes) && task.notes.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                      {task.notes.map((note: any, idx: number) => (
                        <div key={idx} style={{ fontSize: '0.85rem', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <strong style={{ color: '#0f172a' }}>{note.author}</strong>
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{new Date(note.created_at).toLocaleString('vi-VN')}</span>
                          </div>
                          <div style={{ color: '#334155' }}>{note.content}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', marginBottom: '1rem' }}>Chưa có ghi chú nào.</p>
                  )}

                  {canEdit && (
                    <form 
                      onSubmit={(e: any) => {
                        e.preventDefault();
                        const input = e.target.elements.note;
                        if (!input.value) return;
                        addTaskNote(task.id, eventId, input.value, user?.full_name || 'Ẩn danh').then(() => {
                          input.value = '';
                          router.refresh();
                        });
                      }}
                      style={{ display: 'flex', gap: '0.5rem' }}
                    >
                      <input 
                        type="text" 
                        name="note"
                        placeholder="Thêm bình luận..." 
                        style={{ flex: 1, padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        autoComplete="off"
                      />
                      <button type="submit" className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.85rem', borderRadius: '6px' }}>Gửi</button>
                    </form>
                  )}
                </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
      </div>

      {showTaskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Thêm Đầu việc mới</h2>
            <form onSubmit={handleCreateTask}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Cột trái */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tên công việc</label>
                    <input 
                      type="text" 
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={newTask.task_name}
                      onChange={e => setNewTask({...newTask, task_name: e.target.value})}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Chi phí thực chi (VNĐ)</label>
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={newTask.cost ? newTask.cost.toLocaleString('en-US') : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setNewTask({...newTask, cost: val ? parseInt(val) : 0});
                      }}
                      placeholder="Ví dụ: 1,500,000"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Hạn bắt đầu</label>
                      <input 
                        type="date" 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={newTask.start_date}
                        onChange={e => setNewTask({...newTask, start_date: e.target.value})}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Hạn kết thúc</label>
                      <input 
                        type="date" 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={newTask.end_date}
                        onChange={e => setNewTask({...newTask, end_date: e.target.value})}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Thông tin / Mô tả công việc</label>
                    <textarea 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '120px', fontFamily: 'inherit' }}
                      value={newTask.description}
                      onChange={e => setNewTask({...newTask, description: e.target.value})}
                      placeholder="Ghi chú, yêu cầu chi tiết..."
                    />
                  </div>
                </div>

                {/* Cột phải */}
                <div style={{ flex: '1 1 300px' }}>
                  {isGlobalManager && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Lọc Chi nhánh</label>
                      <select 
                        className="form-input" 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={selectedBranch}
                        onChange={e => {
                          setSelectedBranch(e.target.value);
                          setNewTask({...newTask, assignee_id: ""});
                        }}
                      >
                        <option value="Tất cả">Tất cả Chi nhánh</option>
                        {branchesList.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Người phụ trách</label>
                    <select 
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={newTask.assignee_id}
                      onChange={e => setNewTask({...newTask, assignee_id: e.target.value})}
                    >
                      <option value="">-- Chọn nhân sự --</option>
                      {filteredEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.branch_id})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Người phối hợp (Có thể chọn nhiều)</label>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}>
                      {filteredEmployees.filter(emp => emp.id !== newTask.assignee_id).map(emp => (
                        <label key={emp.id} style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            checked={newTask.co_assignees.includes(emp.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setNewTask({...newTask, co_assignees: [...newTask.co_assignees, emp.id]});
                              } else {
                                setNewTask({...newTask, co_assignees: newTask.co_assignees.filter(id => id !== emp.id)});
                              }
                            }}
                            style={{ marginRight: '0.5rem' }}
                          />
                          {emp.full_name} ({emp.branch_id})
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}>
                  {isSubmitting ? "Đang thêm..." : "Thêm Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditTaskModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Sửa Công việc</h2>
            <form onSubmit={handleUpdateTask}>
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* Cột trái */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tên công việc</label>
                    <input 
                      type="text" 
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={editTaskData.task_name}
                      onChange={e => setEditTaskData({...editTaskData, task_name: e.target.value})}
                      disabled={!isManager}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Chi phí thực chi (VNĐ)</label>
                    <input 
                      type="text" 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={editTaskData.cost ? editTaskData.cost.toLocaleString('en-US') : ''}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setEditTaskData({...editTaskData, cost: val ? parseInt(val) : 0});
                      }}
                      placeholder="Ví dụ: 1,500,000"
                      disabled={!isManager && !canViewCost}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Hạn bắt đầu</label>
                      <input 
                        type="date" 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={editTaskData.start_date}
                        onChange={e => setEditTaskData({...editTaskData, start_date: e.target.value})}
                        disabled={!isManager}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Hạn kết thúc</label>
                      <input 
                        type="date" 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={editTaskData.end_date}
                        onChange={e => setEditTaskData({...editTaskData, end_date: e.target.value})}
                        disabled={!isManager}
                      />
                    </div>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Thông tin / Mô tả công việc</label>
                    <textarea 
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', minHeight: '120px', fontFamily: 'inherit' }}
                      value={editTaskData.description}
                      onChange={e => setEditTaskData({...editTaskData, description: e.target.value})}
                      placeholder="Ghi chú, yêu cầu chi tiết..."
                      disabled={!isManager}
                    />
                  </div>
                </div>

                {/* Cột phải */}
                <div style={{ flex: '1 1 300px' }}>
                  {isGlobalManager && (
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Lọc Chi nhánh</label>
                      <select 
                        className="form-input" 
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        value={selectedEditBranch}
                        onChange={e => setSelectedEditBranch(e.target.value)}
                        disabled={!isManager}
                      >
                        <option value="Tất cả">Tất cả Chi nhánh</option>
                        {branchesList.map(b => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Người phụ trách</label>
                    <select 
                      required
                      style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                      value={editTaskData.assignee_id}
                      onChange={e => setEditTaskData({...editTaskData, assignee_id: e.target.value})}
                      disabled={!isManager}
                    >
                      <option value="">-- Chọn nhân sự --</option>
                      {filteredEditEmployees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.branch_id})</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Người phối hợp (Có thể chọn nhiều)</label>
                    <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '0.5rem' }}>
                      {filteredEditEmployees.filter(emp => emp.id !== editTaskData.assignee_id).map(emp => (
                        <label key={emp.id} style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                          <input 
                            type="checkbox" 
                            disabled={!isManager}
                            checked={editTaskData.co_assignees.includes(emp.id)}
                            onChange={e => {
                              if (e.target.checked) {
                                setEditTaskData({...editTaskData, co_assignees: [...editTaskData.co_assignees, emp.id]});
                              } else {
                                setEditTaskData({...editTaskData, co_assignees: editTaskData.co_assignees.filter(id => id !== emp.id)});
                              }
                            }}
                            style={{ marginRight: '0.5rem' }}
                          />
                          {emp.full_name} ({emp.branch_id})
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditTaskModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}>
                  {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditEventModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Sửa Sự kiện</h2>
            <form onSubmit={handleUpdateEvent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Tên sự kiện</label>
                <input 
                  type="text" 
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editEventData.name}
                  onChange={e => setEditEventData({...editEventData, name: e.target.value})}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Bắt đầu</label>
                  <input 
                    type="date" 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={editEventData.start_date}
                    onChange={e => setEditEventData({...editEventData, start_date: e.target.value})}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Kết thúc</label>
                  <input 
                    type="date" 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    value={editEventData.end_date}
                    onChange={e => setEditEventData({...editEventData, end_date: e.target.value})}
                  />
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 500 }}>Chi nhánh (Phạm vi)</label>
                <select 
                  required
                  className="form-input" 
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  value={editEventData.branch_id}
                  onChange={e => setEditEventData({...editEventData, branch_id: e.target.value})}
                  disabled={!isGlobalManager}
                >
                  <option value="Toàn hệ thống">Toàn hệ thống</option>
                  <option value="Việt Trì">Việt Trì</option>
                  <option value="Lâm Thao">Lâm Thao</option>
                  <option value="Tuyên Quang">Tuyên Quang</option>
                  <option value="Dân Hòa">Dân Hòa</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditEventModal(false)} style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>Hủy</button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ padding: '0.5rem 1rem', borderRadius: '6px', background: '#4f46e5', color: 'white', border: 'none', cursor: 'pointer' }}>
                  {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewTaskInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '100%', maxWidth: '500px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', fontWeight: 'bold' }}>Thông tin công việc</h2>
            <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: '#334155', lineHeight: '1.6' }}>
              {viewTaskInfo}
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-primary" onClick={() => setViewTaskInfo(null)} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px' }}>Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

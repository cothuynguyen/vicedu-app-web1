"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { syncStudentAuthAccount } from "@/app/actions/studentAuth";
import { X, Upload, Trash2, Edit, Clock, DollarSign, PlusCircle, ExternalLink, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { compressImage } from "@/utils/imageCompressor";
import { uploadImageToCloudflare } from "@/utils/uploadImage";

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
  initialStudent: any;
  activeRole: string;
  activeBranch: string;
  onSuccess: () => void;
  generateIdForBranch?: (branch: string) => Promise<string>;
  isReadOnly?: boolean;
  allowCareLogEdit?: boolean;
  initialTab?: string;
}

const defaultFormData = {
  id: "", branch_id: "Việt Trì 1", full_name: "", nickname: "", student_type: "Kindy",
  avatar_url: "", gender: "Nam", dob: "", school: "", address: "",
  parent_name: "", parent_job: "", parent_phone: "", parent_email: "", parent_facebook: "",
  padlet_url: "", padlet_api: "", entry_level: "", target_level: "", commitment: "",
  enrollment_date: "", expected_end_date: "", status: "Chờ xếp lớp", care_status: "",
  sale_employee_id: "", vn_teacher: "", foreign_teacher: "",
  total_registered_hours: 0, total_registered_cost: 0, 
  total_studied_hours: 0, total_studied_cost: 0,
  migrated_studied_hours: 0,
  remaining_hours: 0, remaining_cost: 0,
  total_paid: 0,
  internal_note: "",
  touchpoints: [] as any[],
  commitment_images: [] as any[],
  bonus_points: 0,
  target_points: null as number | null
};

const DEFAULT_STUDENT_TOUCHPOINTS = [
  { code: "welcome_letter", name: "1. Thư tay", done: false },
  { code: "zalo_group", name: "2. Nhóm Zalo 1-1", done: false },
  { code: "razkids_name", name: "3. Đổi tên tài khoản Razkids cá nhân hóa", done: false },
  { code: "favorite_food", name: "4. Sở thích về món ăn của con", done: false },
  { code: "favorite_subject", name: "5. Sở thích về môn học con yêu thích", done: false },
  { code: "parent_gift", name: "6. Sở thích về quà tặng con muốn bố mẹ tặng", done: false },
  { code: "love_language", name: "7. Ngôn ngữ yêu thương của con", done: false },
  { code: "birthday_student", name: "8. Sinh nhật con", done: false },
  { code: "birthday_parents", name: "9. Sinh nhật bố/mẹ", done: false },
  { code: "gift_delivered", name: "10. Đã từng có ít nhất một món quà tặng cho con", done: false }
];

export default function StudentModal({
  isOpen,
  onClose,
  studentId,
  initialStudent,
  activeRole,
  activeBranch,
  onSuccess,
  generateIdForBranch,
  isReadOnly = false,
  allowCareLogEdit = false,
  initialTab = "general"
}: StudentModalProps) {
  const { user } = useAuth();
  const currentUserName = user?.full_name || "Guest";

  const [activeTab, setActiveTab] = useState(initialTab); // general, training, finance, care
  const [formData, setFormData] = useState(defaultFormData);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Finance tab state
  const [studentEnrollments, setStudentEnrollments] = useState<any[]>([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  // Care tab state
  const [careLogs, setCareLogs] = useState<any[]>([]);
  const [newCareLog, setNewCareLog] = useState({ contact_date: new Date().toLocaleDateString('en-CA'), content: '', feedback: '', bonus_points: 0 });
  const [careLogMode, setCareLogMode] = useState<'care' | 'redeem'>('care');
  const [editingCareLogId, setEditingCareLogId] = useState<string | null>(null);
  const [editCareLogData, setEditCareLogData] = useState({ contact_date: "", content: "", feedback: "", bonus_points: 0 });
  const [replyingCareLogId, setReplyingCareLogId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  // Commitment upload & Lightbox states
  const [uploadingCommitment, setUploadingCommitment] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Transaction details modal (Contract/Receipt) states
  const [selectedTransaction, setSelectedTransaction] = useState<any | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [txEditData, setTxEditData] = useState<any>({});
  const [txLightboxOpen, setTxLightboxOpen] = useState(false);
  const [txLightboxIndex, setTxLightboxIndex] = useState(0);



  const fetchStaff = async (branchId: string) => {
    const { data } = await supabase.from("users").select("id, full_name, department, nationality, status").ilike("branch_id", `%${branchId}%`).neq("status", "Nghỉ việc");
    if (data) setStaffList(data);
  };

  const fetchFinanceTransactions = async (id: string) => {
    setLoadingEnrollments(true);
    const { data: enrData } = await supabase.from("enrollments").select("*").eq("student_id", id);
    const { data: recData } = await supabase.from("receipts").select("*").eq("student_id", id);
    
    const combined = [
      ...(enrData || []).map((e: any) => ({ ...e, is_contract: true })),
      ...(recData || []).map((r: any) => ({ ...r, is_contract: false }))
    ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setStudentEnrollments(combined);
    setLoadingEnrollments(false);
  };

  const handleDeleteTransaction = async (tx: any) => {
    if (!tx) return;
    const isContract = tx.is_contract;
    const confirmMsg = isContract
      ? `Bạn có chắc chắn muốn xóa hợp đồng này không? Số giờ và học phí tương ứng sẽ bị trừ đi khỏi số dư của học sinh.`
      : `Bạn có chắc chắn muốn xóa phiếu thu này không? Số tiền đã đóng tương ứng sẽ bị trừ khỏi tổng tiền đã đóng của học sinh.`;
    
    if (!window.confirm(confirmMsg)) return;

    try {
      // 1. Fetch current student's balance data to perform rollback
      const { data: studentInfo, error: fetchErr } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();
      
      if (fetchErr) throw fetchErr;

      if (isContract) {
        // Rollback contract: subtract hours and fee from student's balance
        const amountToRollback = Number(tx.tuition_fee || 0);
        const hoursToRollback = Number(tx.registered_hours || 0);

        // Delete contract from enrollments
        const { error: deleteError } = await supabase.from("enrollments").delete().eq("id", tx.id);
        if (deleteError) throw deleteError;

        // Update student balance (Đã xử lý tự động qua Database Trigger)

      } else {
        // Rollback receipt: subtract paid amount from student's total_paid
        const amountToRollback = Number(tx.amount || 0);

        // Delete receipt from receipts
        const { error: deleteError } = await supabase.from("receipts").delete().eq("id", tx.id);
        if (deleteError) throw deleteError;

        // Update student total_paid
        if (studentInfo) {
          const newTotalPaid = (Number(studentInfo.total_paid) || 0) - amountToRollback;
          const { error: updateStuError } = await supabase.from("students").update({
            total_paid: newTotalPaid
          }).eq("id", studentId);
          if (updateStuError) throw updateStuError;
        }
      }

      alert("Xóa giao dịch thành công!");
      setIsTransactionModalOpen(false);
      setSelectedTransaction(null);
      if (studentId) {
        fetchFinanceTransactions(studentId);
      }
      onSuccess(); // Update parent page state
    } catch (err: any) {
      alert("Lỗi khi xóa giao dịch: " + err.message);
    }
  };

  const handleEditTransaction = async (tx: any, newFields: any) => {
    if (!tx) return;
    const isContract = tx.is_contract;

    try {
      // 1. Fetch current student balance data
      const { data: studentInfo, error: fetchErr } = await supabase
        .from("students")
        .select("*")
        .eq("id", studentId)
        .single();
      
      if (fetchErr) throw fetchErr;

      if (isContract) {
        // Calculate Deltas for Contract
        const oldFee = Number(tx.tuition_fee || 0);
        const oldHours = Number(tx.registered_hours || 0);
        
        const newFee = Number(newFields.tuition_fee || 0);
        const newHours = Number(newFields.registered_hours || 0);

        const feeDelta = newFee - oldFee;
        const hoursDelta = newHours - oldHours;

        // Update enrollments record
        const { error: updateError } = await supabase
          .from("enrollments")
          .update({
            amount: newFee,
            tuition_fee: newFee,
            hours: newHours,
            registered_hours: newHours,
            remaining_hours: (tx.remaining_hours ?? oldHours) + hoursDelta, // adjust remaining hours by delta
            payment_method: newFields.payment_method,
            note: newFields.note
          })
          .eq("id", tx.id);
        
        if (updateError) throw updateError;

        // Update student record (Đã xử lý tự động qua Database Trigger)

      } else {
        // Calculate Deltas for Receipt
        const oldAmount = Number(tx.amount || 0);
        const newAmount = Number(newFields.amount || 0);

        const amountDelta = newAmount - oldAmount;

        // Update receipts record
        const { error: updateError } = await supabase
          .from("receipts")
          .update({
            note: newFields.note,
            amount: newAmount,
            payment_method: newFields.payment_method
          })
          .eq("id", tx.id);
        
        if (updateError) throw updateError;

        // Update student record
        if (studentInfo) {
          const newTotalPaid = (Number(studentInfo.total_paid) || 0) + amountDelta;
          const { error: updateStuError } = await supabase.from("students").update({
            total_paid: newTotalPaid
          }).eq("id", studentId);
          if (updateStuError) throw updateStuError;
        }
      }

      alert("Cập nhật giao dịch thành công!");
      setIsEditingTx(false);
      setIsTransactionModalOpen(false);
      setSelectedTransaction(null);
      if (studentId) {
        fetchFinanceTransactions(studentId);
      }
      onSuccess(); // Update parent page state
    } catch (err: any) {
      alert("Lỗi khi cập nhật giao dịch: " + err.message);
    }
  };

  const fetchCareLogs = async (id: string) => {
    const { data } = await supabase.from('student_care_logs').select('*').eq('student_id', id).order('created_at', { ascending: false });
    setCareLogs(data || []);
  };

  useEffect(() => {
    if (isOpen) {
      if (studentId && initialStudent) {
        setFormData({
          ...defaultFormData,
          ...initialStudent,
          dob: initialStudent.dob || "",
          enrollment_date: initialStudent.enrollment_date || "",
          expected_end_date: initialStudent.expected_end_date || "",
          commitment_images: initialStudent.commitment_images || []
        });
      } else {
        setFormData({
          ...defaultFormData,
          id: initialStudent?.id || "",
          branch_id: initialStudent?.branch_id || activeBranch
        });
      }
      setActiveTab("general");
    }
  }, [isOpen, studentId, initialStudent]);

  useEffect(() => {
    if (isOpen && formData.branch_id) {
      fetchStaff(formData.branch_id);
    }
  }, [formData.branch_id, isOpen]);

  useEffect(() => {
    if (activeTab === 'finance' && studentId && isOpen) {
      fetchFinanceTransactions(studentId);
    }
  }, [activeTab, studentId, isOpen]);

  useEffect(() => {
    if (activeTab === 'care' && studentId && isOpen) {
      fetchCareLogs(studentId);
    }
  }, [activeTab, studentId, isOpen]);

  if (!isOpen) return null;

  // Image compression
  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 400;
          const scaleSize = img.width > MAX_WIDTH ? (MAX_WIDTH / img.width) : 1;
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            resolve(blob as Blob);
          }, "image/jpeg", 0.7);
        };
      };
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const compressedBlob = await compressImage(file);
      const imageUrl = await uploadImageToCloudflare(compressedBlob);
      setFormData({ ...formData, avatar_url: imageUrl });
    } catch (err: any) {
      alert("Lỗi upload ảnh: " + err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAddCareLog = async () => {
    if (!newCareLog.content.trim()) return alert("Vui lòng nhập nội dung chăm sóc");
    const activeUserName = localStorage.getItem("mock_user") || "Unknown";
    
    let finalPoints = Number(newCareLog.bonus_points) || 0;
    if (careLogMode === 'redeem') {
      finalPoints = -Math.abs(finalPoints);
    }

    const payload = {
      contact_date: newCareLog.contact_date,
      content: newCareLog.content,
      feedback: newCareLog.feedback,
      bonus_points: finalPoints,
      student_id: studentId,
      created_by: activeUserName
    };
    const { error } = await supabase.from('student_care_logs').insert([payload]);
    if (error) {
      alert("Lỗi khi thêm nhật ký: " + error.message);
    } else {
      if (finalPoints !== 0) {
        const newTotal = (Number(formData.bonus_points) || 0) + finalPoints;
        await supabase.from('students').update({ bonus_points: newTotal }).eq('id', studentId);
        setFormData(prev => ({...prev, bonus_points: newTotal}));
      }
      setNewCareLog({ contact_date: new Date().toLocaleDateString('en-CA'), content: '', feedback: '', bonus_points: 0 });
      fetchCareLogs(studentId!);
    }
  };

  const handleUpdateCareLog = async (logId: string) => {
    if (!editCareLogData.content.trim()) return alert("Vui lòng nhập nội dung chăm sóc");
    const oldLog = careLogs.find(l => l.id === logId);
    const oldPoints = Number(oldLog?.bonus_points || 0);
    const newPoints = Number(editCareLogData.bonus_points || 0);
    const delta = newPoints - oldPoints;

    const { error } = await supabase.from('student_care_logs').update({
      contact_date: editCareLogData.contact_date,
      content: editCareLogData.content,
      feedback: editCareLogData.feedback,
      bonus_points: newPoints
    }).eq('id', logId);

    if (error) {
      alert("Lỗi khi cập nhật: " + error.message);
    } else {
      if (delta !== 0) {
        const newTotal = (Number(formData.bonus_points) || 0) + delta;
        await supabase.from('students').update({ bonus_points: newTotal }).eq('id', studentId);
        setFormData(prev => ({...prev, bonus_points: newTotal}));
      }
      setEditingCareLogId(null);
      fetchCareLogs(studentId!);
    }
  };

  const handleReplyCareLog = async (logId: string) => {
    if (!replyContent.trim()) return alert("Vui lòng nhập nội dung trả lời");
    const oldLog = careLogs.find(l => l.id === logId);
    if (!oldLog) return;

    const newContent = `${oldLog.content}\n\n👉 [TRUNG TÂM PHẢN HỒI] - ${replyContent.trim()}`;
    
    const { error } = await supabase.from('student_care_logs').update({
      content: newContent
    }).eq('id', logId);

    if (error) {
      alert("Lỗi khi gửi phản hồi: " + error.message);
    } else {
      setReplyingCareLogId(null);
      setReplyContent('');
      fetchCareLogs(studentId!);
    }
  };

  const handleDeleteCareLog = async (logId: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa nhật ký này không?")) return;
    const { error } = await supabase.from('student_care_logs').delete().eq('id', logId);
    if (error) {
      alert("Lỗi khi xóa nhật ký: " + error.message);
    } else {
      fetchCareLogs(studentId!);
    }
  };

  const saveTouchpointsToDb = async (newTouchpoints: any[]) => {
    const { error } = await supabase
      .from("students")
      .update({ touchpoints: newTouchpoints })
      .eq("id", studentId);

    if (error) {
      if (error.message.includes("column \"touchpoints\" of relation \"students\" does not exist")) {
        alert("Lỗi: Cột 'touchpoints' chưa được tạo trong bảng 'students'. Vui lòng chạy nội dung tệp 'update_student_touchpoints.sql' trong SQL Editor của Supabase trước!");
      } else {
        alert("Lỗi cập nhật điểm chạm: " + error.message);
      }
    } else {
      onSuccess();
    }
  };

  const handleToggleTouchpoint = async (code: string, currentDone: boolean) => {
    if (isReadOnly) return;
    const currentTouchpoints = formData.touchpoints && formData.touchpoints.length > 0 ? formData.touchpoints : DEFAULT_STUDENT_TOUCHPOINTS;
    
    const merged = DEFAULT_STUDENT_TOUCHPOINTS.map(dt => {
      const existing = currentTouchpoints.find((ct: any) => ct.code === dt.code);
      return existing ? existing : dt;
    });

    const generalNotesObj = currentTouchpoints.find((ct: any) => ct.code === 'general_notes');

    const newTouchpoints = merged.map(t => 
      t.code === code ? { ...t, done: !currentDone } : t
    );

    if (generalNotesObj) {
      newTouchpoints.push(generalNotesObj);
    }

    setFormData(prev => ({ ...prev, touchpoints: newTouchpoints }));

    await saveTouchpointsToDb(newTouchpoints);

    // Ghi nhật ký chăm sóc
    const activeUserName = localStorage.getItem("mock_user") || "Unknown";
    const targetName = newTouchpoints.find(t => t.code === code)?.name || code;
    await supabase.from("student_care_logs").insert([{
      student_id: studentId,
      contact_date: new Date().toLocaleDateString('en-CA'),
      content: `${!currentDone ? 'Hoàn thành' : 'Hủy'} điểm chạm: ${targetName}`,
      feedback: "",
      created_by: activeUserName
    }]);

    fetchCareLogs(studentId!);
  };

  const handleTouchpointNoteChange = (code: string, newNote: string) => {
    if (isReadOnly) return;
    const currentTouchpoints = formData.touchpoints && formData.touchpoints.length > 0 ? formData.touchpoints : DEFAULT_STUDENT_TOUCHPOINTS;
    
    const merged = DEFAULT_STUDENT_TOUCHPOINTS.map(dt => {
      const existing = currentTouchpoints.find((ct: any) => ct.code === dt.code);
      return existing ? existing : dt;
    });

    const generalNotesObj = currentTouchpoints.find((ct: any) => ct.code === 'general_notes');

    const newTouchpoints = merged.map(t => 
      t.code === code ? { ...t, note: newNote } : t
    );

    if (generalNotesObj) {
      newTouchpoints.push(generalNotesObj);
    }

    setFormData(prev => ({ ...prev, touchpoints: newTouchpoints }));
  };

  const handleTouchpointNoteBlur = async () => {
    if (isReadOnly) return;
    await saveTouchpointsToDb(formData.touchpoints);
  };

  const handleGeneralNotesChange = (newNote: string) => {
    if (isReadOnly) return;
    const currentTouchpoints = formData.touchpoints && formData.touchpoints.length > 0 ? formData.touchpoints : DEFAULT_STUDENT_TOUCHPOINTS;
    
    const merged = DEFAULT_STUDENT_TOUCHPOINTS.map(dt => {
      const existing = currentTouchpoints.find((ct: any) => ct.code === dt.code);
      return existing ? existing : dt;
    });

    const otherTouchpoints = merged.filter(t => t.code !== 'general_notes');
    const newTouchpoints = [
      ...otherTouchpoints,
      { code: 'general_notes', name: 'Ghi chú chung', done: false, note: newNote }
    ];

    setFormData(prev => ({ ...prev, touchpoints: newTouchpoints }));
  };

  const handleGeneralNotesBlur = async () => {
    if (isReadOnly) return;
    await saveTouchpointsToDb(formData.touchpoints);
  };

  const handleCommitmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const files = e.target.files;
    if (!files || files.length === 0 || !studentId) return;

    const currentImages = formData.commitment_images || [];
    if (currentImages.length + files.length > 5) {
      alert("Mỗi học sinh chỉ được lưu tối đa 5 bản chụp cam kết/hồ sơ!");
      e.target.value = "";
      return;
    }

    setUploadingCommitment(true);
    try {
      const uploadedList = [...currentImages];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await compressImage(file);
        const imageUrl = await uploadImageToCloudflare(compressedFile);

        const newImage = {
          url: imageUrl,
          uploaded_at: new Date().toISOString(),
          uploaded_by: currentUserName
        };
        uploadedList.push(newImage);
      }

      setFormData(prev => ({ ...prev, commitment_images: uploadedList }));
    } catch (err: any) {
      alert("Lỗi tải ảnh cam kết: " + err.message);
    } finally {
      setUploadingCommitment(false);
      e.target.value = "";
    }
  };

  const handleCommitmentDelete = (idxToRemove: number) => {
    if (isReadOnly) return;
    if (!window.confirm("Bạn có chắc chắn muốn XÓA ảnh cam kết này?")) return;
    const currentImages = formData.commitment_images || [];
    const updatedImages = currentImages.filter((_, idx) => idx !== idxToRemove);
    setFormData(prev => ({ ...prev, commitment_images: updatedImages }));
  };

  const canDeleteStudent = activeRole === "Super Admin" || activeRole === "Kế toán HO";

  const handleDeleteStudent = async () => {
    if (!studentId) return;
    if (!window.confirm(`Bạn có chắc chắn muốn XÓA VĨNH VIỄN học viên ${formData.full_name} khỏi hệ thống không?`)) return;
    
    const { error } = await supabase.from('students').delete().eq('id', studentId);
    if (error) {
       if (error.message.includes('foreign key constraint') || error.code === '23503') {
           alert("Học viên này đã phát sinh dữ liệu tài chính (Phiếu thu / Đăng ký khóa học) hoặc Lớp học. KHÔNG THỂ XÓA CỨNG! \n\nVui lòng chuyển trạng thái sang 'Đã nghỉ học' hoặc xóa các dữ liệu tài chính liên quan trước.");
       } else {
           alert("Lỗi khi xóa học viên: " + error.message);
       }
       return;
    }
    alert("Xóa học viên thành công!");
    onSuccess();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const payload = { ...formData } as any;
    if (!payload.dob) payload.dob = null;
    if (!payload.enrollment_date) payload.enrollment_date = null;
    if (!payload.expected_end_date) payload.expected_end_date = null;

    // Clean relation fields
    delete payload.class_students;
    delete payload.classes;
    delete payload.enrollments;
    delete payload.total_studied_hours;
    delete payload.total_studied_cost;
    delete payload.total_paid;
    delete payload.total_registered_hours;
    delete payload.total_registered_cost;
    delete payload.remaining_hours;
    delete payload.remaining_cost;

    // Lớp phòng thủ 1: Kiểm tra trùng lặp Tên + SĐT
    if (payload.full_name && payload.parent_phone) {
      let duplicateQuery = supabase
        .from("students")
        .select("id, full_name, parent_phone")
        .ilike("full_name", payload.full_name.trim())
        .eq("parent_phone", payload.parent_phone.trim());
      
      if (studentId) {
        duplicateQuery = duplicateQuery.neq("id", studentId);
      }

      const { data: duplicates, error: dupError } = await duplicateQuery;
      if (dupError) {
        alert("Lỗi khi kiểm tra trùng lặp: " + dupError.message);
        return;
      }
      
      if (duplicates && duplicates.length > 0) {
        alert(`CẢNH BÁO: Học viên "${payload.full_name}" (SĐT: ${payload.parent_phone}) đã tồn tại trong hệ thống với mã [${duplicates[0].id}]. Vui lòng kiểm tra lại!`);
        return;
      }
    }

    // Lớp phòng thủ 2: Kiểm tra trùng lặp Email phụ huynh (Bảo vệ kiến trúc Web 2)
    if (payload.parent_email && payload.parent_email.trim() !== "") {
      let duplicateEmailQuery = supabase
        .from("students")
        .select("id, full_name, parent_email")
        .eq("parent_email", payload.parent_email.trim());
      
      if (studentId) {
        duplicateEmailQuery = duplicateEmailQuery.neq("id", studentId);
      }

      const { data: duplicateEmails, error: emailErr } = await duplicateEmailQuery;
      if (emailErr) {
        alert("Lỗi khi kiểm tra trùng lặp email: " + emailErr.message);
        return;
      }
      
      if (duplicateEmails && duplicateEmails.length > 0) {
        alert(`❌ TỪ CHỐI LƯU: Email "${payload.parent_email}" đã được sử dụng cho học viên [${duplicateEmails[0].full_name}].\n\nĐể phụ huynh xem được bài tập của cả 2 bé trên hệ thống Web 2, mỗi bé bắt buộc phải có 1 Email riêng biệt.\n\nMẸO: Nếu phụ huynh dùng Gmail, bạn có thể thêm dấu + (Ví dụ: phuhuynh+be2@gmail.com) để tạo email phụ mà không cần lập hòm thư mới!`);
        return;
      }
    }

    if (studentId) {
      const { error } = await supabase.from("students").update(payload).eq("id", studentId);
      if (error) {
        alert("Lỗi khi cập nhật học viên: " + error.message);
        return;
      }
      alert(`Cập nhật thành công ${payload.full_name}`);
    } else {
      if (!payload.id) {
        payload.id = `HV${Date.now().toString().slice(-5)}`;
      }
      const { error } = await supabase.from("students").insert([payload]);
      if (error) {
        alert("Lỗi khi tạo học viên: " + error.message);
        return;
      }
      alert(`Đã thêm học viên ${payload.full_name} thành công!`);
    }

    // Tự động đồng bộ tài khoản Đăng nhập (Auth) nếu có email
    if (payload.parent_email) {
      await syncStudentAuthAccount(payload.parent_email, payload.full_name, payload.parent_phone);
    }

    onSuccess();
    onClose();
  };

  const academicStaff = staffList.filter(s => s.department && s.department.includes("Đào tạo") && s.status !== "Nghỉ việc");

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-scale-in" style={{ width: '90%', maxWidth: '850px', height: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{studentId ? `Hồ sơ: ${formData.full_name}` : "Thêm Học viên mới"}</h2>
            {studentId && <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>Mã học viên: {formData.id}</p>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {studentId && canDeleteStudent && !isReadOnly && (
              <button 
                type="button"
                onClick={handleDeleteStudent} 
                style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="Xóa vĩnh viễn học viên"
              >
                <Trash2 size={20} />
              </button>
            )}
            <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={24} />
            </button>
          </div>
        </div>

        {studentId && (
          <div style={{ display: 'flex', background: '#f8fafc', padding: '0 1.5rem', borderBottom: '1px solid #e2e8f0', overflowX: 'auto' }}>
            {[
              { id: 'general', label: 'Thông tin chung' },
              { id: 'training', label: 'Đào tạo & Padlet' },
              { id: 'touchpoints', label: 'Điểm chạm Nhập học' },
              { id: 'commitment', label: 'Cam kết & Hồ sơ' },
              { id: 'finance', label: 'Hợp đồng & Đóng phí' },
              { id: 'care', label: 'Nhật ký CSKH' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '1rem 1.25rem',
                  border: 'none',
                  background: 'none',
                  borderBottom: activeTab === tab.id ? '3px solid #3b82f6' : '3px solid transparent',
                  color: activeTab === tab.id ? '#3b82f6' : '#64748b',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <fieldset disabled={isReadOnly && activeTab !== 'care'} style={{ border: 'none', margin: 0, padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            
            {/* TAB: GENERAL */}
            {(activeTab === 'general' || !studentId) && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', gridColumn: '1 / -1', background: '#f8fafc', padding: '1.25rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                  {/* Avatar Column */}
                  <div 
                    style={{ width: '180px', flexShrink: 0, position: 'relative' }} 
                  >
                    {formData.avatar_url ? (
                      <img 
                        src={formData.avatar_url} 
                        alt="Avatar" 
                        style={{ 
                          width: '180px', 
                          height: '180px', 
                          borderRadius: '16px', 
                          objectFit: 'cover', 
                          border: '4px solid #fff', 
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                          cursor: 'zoom-in'
                        }} 
                        onClick={() => {
                          setLightboxImages([formData.avatar_url]);
                          setLightboxIndex(0);
                          setLightboxOpen(true);
                        }}
                        title="Click để phóng to ảnh"
                      />
                    ) : (
                      <div style={{ width: '180px', height: '180px', borderRadius: '16px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', fontWeight: 'bold', color: '#64748b', border: '4px solid #fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        {formData.full_name?.charAt(0) || "?"}
                      </div>
                    )}

                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => document.getElementById('hidden-avatar-upload')?.click()}
                        style={{
                          position: 'absolute',
                          bottom: '8px',
                          right: '8px',
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'rgba(15, 23, 42, 0.75)',
                          color: 'white',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          border: '2px solid white',
                          cursor: 'pointer',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                          transition: 'background 0.2s',
                          zIndex: 10
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#3b82f6'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.75)'}
                        title="Thay đổi ảnh đại diện"
                        disabled={uploadingAvatar}
                      >
                        <Camera size={14} />
                      </button>
                    )}

                    {uploadingAvatar && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.7)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: '#3b82f6', zIndex: 11 }}>
                        Đang tải...
                      </div>
                    )}
                    <input id="hidden-avatar-upload" type="file" accept="image/*" onChange={handleAvatarUpload} style={{ display: 'none' }} disabled={uploadingAvatar} />
                  </div>

                  {/* Top Critical Fields Column */}
                  <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem 1.25rem' }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 600, color: '#1e293b' }}>Mã Học viên *</label>
                      <input type="text" value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} disabled={!!studentId} placeholder="Tự sinh nếu để trống" required style={{ background: '#fff' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 600, color: '#1e293b' }}>Chi nhánh *</label>
                      <select 
                        value={formData.branch_id} 
                        onChange={async (e) => {
                          const newBranch = e.target.value;
                          setFormData({ ...formData, branch_id: newBranch });
                          if (!studentId && generateIdForBranch) {
                            const newId = await generateIdForBranch(newBranch);
                            setFormData(prev => ({ ...prev, id: newId }));
                          }
                        }} 
                        disabled={!["Super Admin", "Kế toán HO"].includes(activeRole)} 
                        style={{ background: '#fff' }}
                      >
                        <option value="Việt Trì 1">Việt Trì 1</option>
                        <option value="Việt Trì 2">Việt Trì 2</option>
                        <option value="Lâm Thao">Lâm Thao</option>
                        <option value="Tuyên Quang">Tuyên Quang</option>
                        <option value="Dân Hòa">Dân Hòa</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 600, color: '#1e293b' }}>Họ và tên học viên *</label>
                      <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} placeholder="VD: Nguyễn Văn A" required style={{ background: '#fff' }} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label style={{ fontWeight: 600, color: '#1e293b' }}>Ngày sinh</label>
                      <input type="date" value={formData.dob} onChange={e => setFormData({ ...formData, dob: e.target.value })} style={{ background: '#fff' }} />
                    </div>
                  </div>
                </div>

                {/* Remaining Fields */}
                <div className="form-group">
                  <label>Tên thường gọi (Nickname)</label>
                  <input type="text" value={formData.nickname} onChange={e => setFormData({ ...formData, nickname: e.target.value })} placeholder="VD: Tommy" />
                </div>
                <div className="form-group">
                  <label>Giới tính</label>
                  <select value={formData.gender || ""} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                    <option value="Nam">Nam</option>
                    <option value="Nữ">Nữ</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Phân loại gói học *</label>
                  <select value={formData.student_type || ""} onChange={e => setFormData({ ...formData, student_type: e.target.value })}>
                    <option value="Kindy">Kindy</option>
                    <option value="Kids">Kids</option>
                    <option value="Teens">Teens</option>
                    <option value="IELTS">IELTS</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tình trạng học tập *</label>
                  <select value={formData.status || ""} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="Đang học">Đang học</option>
                    <option value="Chờ xếp lớp">Chờ xếp lớp</option>
                    <option value="Bảo lưu">Bảo lưu</option>
                    <option value="Nghỉ học">Nghỉ học</option>
                  </select>
                </div>
                {activeRole === "Super Admin" && (
                  <div className="form-group">
                    <label style={{ color: '#d97706' }}>Giờ đã học (Hệ thống cũ)</label>
                    <input 
                      type="number" 
                      value={formData.migrated_studied_hours || 0} 
                      onChange={e => setFormData({ ...formData, migrated_studied_hours: Number(e.target.value) || 0 })} 
                      style={{ border: '1px solid #fde68a', background: '#fffbeb' }}
                      title="Chỉ Super Admin mới có quyền sửa số liệu chuyển giao này"
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Trường đang học</label>
                  <input type="text" value={formData.school} onChange={e => setFormData({ ...formData, school: e.target.value })} placeholder="VD: Tiểu học Việt Trì" />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#d97706' }}>
                    Bonus Point ⭐
                  </label>
                  <div style={{ padding: '0.4rem 0.5rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>
                    Đang có: {formData.bonus_points || 0} ⭐
                    {formData.target_points ? (
                      <div style={{ marginTop: '0.25rem' }}>
                        <div style={{ fontSize: '0.75rem', color: '#b45309', marginBottom: '0.15rem', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Mục tiêu: {formData.target_points}</span>
                          <span>{Math.round(((formData.bonus_points || 0) / formData.target_points) * 100)}%</span>
                        </div>
                        <div style={{ width: '100%', background: '#fde68a', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, Math.round(((formData.bonus_points || 0) / formData.target_points) * 100))}%`, height: '100%', background: '#d97706', transition: 'width 0.5s' }}></div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: '0.15rem', fontWeight: 400 }}>Chưa đặt mục tiêu</div>
                    )}
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Địa chỉ</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Số nhà, đường phố..." />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Thông tin người giám hộ (Phụ huynh)</h3>
                </div>
                <div className="form-group">
                  <label>Tên bố/mẹ</label>
                  <input type="text" value={formData.parent_name || ""} onChange={e => setFormData({ ...formData, parent_name: e.target.value })} placeholder="VD: Nguyễn Văn B" />
                </div>
                <div className="form-group">
                  <label>Số điện thoại *</label>
                  <input type="text" value={formData.parent_phone || ""} onChange={e => setFormData({ ...formData, parent_phone: e.target.value })} placeholder="VD: 0987654321" required />
                </div>
                <div className="form-group">
                  <label>Email phụ huynh</label>
                  <input type="email" value={formData.parent_email || ""} onChange={e => setFormData({ ...formData, parent_email: e.target.value })} placeholder="VD: parent@gmail.com" />
                </div>
                <div className="form-group">
                  <label>Nghề nghiệp</label>
                  <input type="text" value={formData.parent_job || ""} onChange={e => setFormData({ ...formData, parent_job: e.target.value })} placeholder="Tự do, Công chức..." />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Facebook phụ huynh</label>
                  <input type="text" value={formData.parent_facebook || ""} onChange={e => setFormData({ ...formData, parent_facebook: e.target.value })} placeholder="https://facebook.com/..." />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Nhân sự phụ trách</h3>
                </div>
                <div className="form-group">
                  <label>Cố vấn Tuyển sinh (Sale)</label>
                  <select value={formData.sale_employee_id || ""} onChange={e => setFormData({ ...formData, sale_employee_id: e.target.value })}>
                    <option value="">-- Chọn nhân sự --</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Giáo viên Việt Nam chủ nhiệm</label>
                  <select value={formData.vn_teacher || ""} onChange={e => setFormData({ ...formData, vn_teacher: e.target.value })}>
                    <option value="">-- Chọn giáo viên --</option>
                    {academicStaff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Giáo viên nước ngoài</label>
                  <select value={formData.foreign_teacher || ""} onChange={e => setFormData({ ...formData, foreign_teacher: e.target.value })}>
                    <option value="">-- Chọn giáo viên --</option>
                    {academicStaff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
                  <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 600 }}>Lịch sử & Ghi chú (Nội bộ)</h3>
                  <div className="form-group">
                    <textarea 
                      value={formData.internal_note || ""} 
                      onChange={e => setFormData({ ...formData, internal_note: e.target.value })} 
                      placeholder="Ghi chú về học viên, lịch sử từ hệ thống cũ..." 
                      style={{ width: '100%', minHeight: '120px', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB: TRAINING */}
            {activeTab === 'training' && studentId && (
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <div className="form-group" style={{ gridColumn: 'span 3' }}>
                  <label>Link Padlet học tập</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="url" value={formData.padlet_url} onChange={e => setFormData({ ...formData, padlet_url: e.target.value })} placeholder="https://padlet.com/..." style={{ flex: 1 }} />
                    {formData.padlet_url && (
                      <a 
                        href={formData.padlet_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn btn-secondary"
                        title="Mở Padlet ở thẻ mới"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                      >
                        <ExternalLink size={16} /> Xem ngay
                      </a>
                    )}
                  </div>
                </div>
                {activeRole === "Super Admin" && (
                  <div className="form-group" style={{ gridColumn: 'span 3' }}>
                    <label>Padlet API Key (Tự động sync chuyên cần)</label>
                    <input type="text" value={formData.padlet_api} onChange={e => setFormData({ ...formData, padlet_api: e.target.value })} placeholder="api_key_..." />
                  </div>
                )}
                <div className="form-group">
                  <label>Trình độ đầu vào</label>
                  <input type="text" value={formData.entry_level} onChange={e => setFormData({ ...formData, entry_level: e.target.value })} placeholder="VD: Starter" />
                </div>
                <div className="form-group">
                  <label>Trình độ mục tiêu</label>
                  <input type="text" value={formData.target_level} onChange={e => setFormData({ ...formData, target_level: e.target.value })} placeholder="VD: Flyer" />
                </div>
                <div className="form-group">
                  <label>Cam kết đầu ra</label>
                  <input type="text" value={formData.commitment} onChange={e => setFormData({ ...formData, commitment: e.target.value })} placeholder="VD: Đạt 15 khiên Cambridge" />
                </div>
                <div className="form-group">
                  <label>Ngày nhập học</label>
                  <input type="date" value={formData.enrollment_date} onChange={e => setFormData({ ...formData, enrollment_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Ngày kết thúc dự kiến</label>
                  <input type="date" value={formData.expected_end_date} onChange={e => setFormData({ ...formData, expected_end_date: e.target.value })} />
                </div>

              </div>
            )}

            {/* TAB: TOUCHPOINTS */}
            {activeTab === 'touchpoints' && studentId && (
              <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.5rem", color: "#0f172a" }}>Checklist Điểm chạm Nhập học</h3>
                <p style={{ color: "#64748b", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                  Hãy tích chọn các điểm chạm bên dưới sau khi hoàn thành để theo dõi sát sao hành trình chăm sóc của học sinh.
                </p>
                
                <div className="touchpoint-list" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                  {(() => {
                    const currentTouchpoints = formData.touchpoints && formData.touchpoints.length > 0 ? formData.touchpoints : DEFAULT_STUDENT_TOUCHPOINTS;
                    
                    const merged = DEFAULT_STUDENT_TOUCHPOINTS.map(dt => {
                      const existing = currentTouchpoints.find((ct: any) => ct.code === dt.code);
                      return existing ? existing : dt;
                    });
                    
                    return merged.map((tp, idx) => (
                      <div key={idx} style={{ 
                        padding: "1rem", 
                        border: "1px solid #e2e8f0", 
                        borderRadius: "8px", 
                        background: tp.done ? "rgba(16, 185, 129, 0.04)" : "#f8fafc",
                        borderLeft: tp.done ? "4px solid #10b981" : "4px solid #cbd5e1",
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.75rem",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.02)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", cursor: (isReadOnly && !allowCareLogEdit) ? "default" : "pointer" }} onClick={() => { if (!isReadOnly || allowCareLogEdit) handleToggleTouchpoint(tp.code, tp.done); }}>
                          <input type="checkbox" checked={tp.done} readOnly style={{ width: "18px", height: "18px", cursor: (isReadOnly && !allowCareLogEdit) ? "default" : "pointer" }} />
                          <span style={{ fontSize: "0.88rem", fontWeight: 600, color: tp.done ? "#10b981" : "#1e293b", userSelect: "none" }}>{tp.name}</span>
                        </div>
                        <input 
                          type="text" 
                          placeholder="Ghi chú cụ thể (nếu có)..." 
                          value={tp.note || ""} 
                          onChange={(e) => handleTouchpointNoteChange(tp.code, e.target.value)}
                          onBlur={handleTouchpointNoteBlur}
                          onClick={(e) => e.stopPropagation()}
                          disabled={isReadOnly && !allowCareLogEdit}
                          style={{
                            width: "100%",
                            padding: "0.4rem 0.6rem",
                            fontSize: "0.8rem",
                            borderRadius: "6px",
                            border: "1px solid #e2e8f0",
                            background: "white",
                            color: "#334155",
                            outline: "none"
                          }}
                        />
                      </div>
                    ));
                  })()}
                </div>

                {/* Ô Ghi chú chung */}
                <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "1.25rem" }}>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1e293b", marginBottom: "0.5rem" }}>📝 Ghi chú chung (Tổng kết thông tin nhập học)</h4>
                  <textarea
                    rows={3}
                    placeholder="Nhập ghi chú chung tổng kết..."
                    value={(() => {
                      const currentTouchpoints = formData.touchpoints && formData.touchpoints.length > 0 ? formData.touchpoints : DEFAULT_STUDENT_TOUCHPOINTS;
                      return currentTouchpoints.find((ct: any) => ct.code === 'general_notes')?.note || "";
                    })()}
                    onChange={(e) => handleGeneralNotesChange(e.target.value)}
                    onBlur={handleGeneralNotesBlur}
                    disabled={isReadOnly}
                    style={{
                      width: "100%",
                      padding: "0.75rem",
                      fontSize: "0.88rem",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      background: "white",
                      color: "#334155",
                      outline: "none",
                      resize: "vertical",
                      fontFamily: "inherit",
                      lineHeight: "1.5"
                    }}
                  />
                </div>
              </div>
            )}

            {/* TAB: COMMITMENT */}
            {activeTab === 'commitment' && studentId && (
              <div style={{ background: "white", padding: "1.5rem", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, color: "#0f172a", margin: 0 }}>Hình ảnh Cam kết & Thỏa thuận (Khổ A4)</h3>
                    <p style={{ color: "#64748b", fontSize: "0.85rem", margin: '0.25rem 0 0 0' }}>
                      Lưu trữ các hồ sơ cam kết đầu ra, thỏa thuận nhập học của học sinh. Tối đa 5 ảnh.
                    </p>
                  </div>
                  
                  {!isReadOnly && (!formData.commitment_images || formData.commitment_images.length < 5) && (
                    <div>
                      <button
                        type="button"
                        onClick={() => document.getElementById("student-commitment-input")?.click()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '0.85rem'
                        }}
                        disabled={uploadingCommitment}
                      >
                        <Upload size={16} />
                        {uploadingCommitment ? "Đang tải lên..." : "Tải lên bản chụp"}
                      </button>
                      <input 
                        type="file" 
                        id="student-commitment-input" 
                        accept="image/*" 
                        multiple
                        style={{ display: "none" }} 
                        onChange={handleCommitmentUpload} 
                        disabled={uploadingCommitment}
                      />
                    </div>
                  )}
                </div>

                {uploadingCommitment && (
                  <div style={{ padding: '1rem', marginBottom: '1rem', textAlign: 'center', color: '#3b82f6', fontWeight: 500, fontSize: '0.85rem' }}>
                    Đang xử lý nén ảnh và tải lên lưu trữ...
                  </div>
                )}

                {(!formData.commitment_images || formData.commitment_images.length === 0) ? (
                  <div 
                    style={{ 
                      border: '2px dashed #cbd5e1', 
                      borderRadius: '8px', 
                      padding: '3rem 1.5rem', 
                      textAlign: 'center',
                      cursor: isReadOnly ? "default" : 'pointer',
                      background: '#f8fafc'
                    }}
                    onClick={() => !isReadOnly && document.getElementById("student-commitment-input")?.click()}
                  >
                    <Camera size={40} style={{ margin: '0 auto 1rem', display: 'block', color: '#94a3b8' }} />
                    <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>
                      Chưa có ảnh cam kết nào. Bấm để chọn tải lên bản chụp cam kết A4 đầu tiên.
                    </span>
                  </div>
                ) : (
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
                      gap: '1.25rem',
                      marginTop: '1rem'
                    }}
                  >
                    {(formData.commitment_images || []).map((img: any, idx: number) => (
                      <div 
                        key={idx}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          background: '#f8fafc',
                          position: 'relative',
                          display: 'flex',
                          flexDirection: 'column',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                      >
                        {/* A4 aspect ratio wrapper 3:4 */}
                        <div 
                          style={{
                            width: '100%',
                            paddingBottom: '133.3%',
                            position: 'relative',
                            background: '#e2e8f0',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            const urls = (formData.commitment_images || []).map((i: any) => i.url);
                            setLightboxImages(urls);
                            setLightboxIndex(idx);
                            setLightboxOpen(true);
                          }}
                        >
                          <img 
                            src={img.url} 
                            alt={`Cam kết ${idx + 1}`}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />

                          {!isReadOnly && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCommitmentDelete(idx);
                              }}
                              style={{
                                position: 'absolute',
                                top: '6px',
                                right: '6px',
                                background: 'rgba(239, 68, 68, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                cursor: 'pointer',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                              }}
                            >
                              &times;
                            </button>
                          )}
                        </div>

                        {/* Metadata Footer */}
                        <div style={{ padding: '0.6rem', fontSize: '0.78rem', color: '#475569', borderTop: '1px solid #e2e8f0' }}>
                          <div style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 600 }} title={img.uploaded_by}>
                            Người tải: {img.uploaded_by || 'Không rõ'}
                          </div>
                          <div style={{ color: '#64748b', marginTop: '2px', fontSize: '0.72rem' }}>
                            {img.uploaded_at ? new Date(img.uploaded_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Không rõ ngày'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB: FINANCE */}
            {activeTab === 'finance' && studentId && (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                  {(() => {
                    const enrollments = studentEnrollments.filter(t => t.is_contract);
                    const receipts = studentEnrollments.filter(t => !t.is_contract);

                    const totalRegHours = enrollments.length > 0
                      ? enrollments.reduce((sum, enr) => sum + (enr.registered_hours || 0), 0)
                      : (formData.total_registered_hours || 0);

                    const totalRemHours = formData.remaining_hours || 0;

                    const totalStudiedHours = formData.total_studied_hours || 0;

                    const totalPaid = studentEnrollments.length > 0
                      ? receipts.reduce((sum, rec) => rec.status === 'Đã duyệt' ? sum + (rec.amount || 0) : sum, 0)
                      : (formData.total_paid || 0);
                      
                    const totalRegCost = enrollments.length > 0
                      ? enrollments.reduce((sum, enr) => sum + (enr.tuition_fee || 0), 0)
                      : (formData.total_registered_cost || 0);

                    const totalRemainingCost = formData.remaining_cost || 0;

                    return (
                      <>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Tổng giờ đăng ký</div>
                          <strong style={{ fontSize: '1.2rem', color: '#1e293b' }}>{totalRegHours}h</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Giờ đã học</div>
                          <strong style={{ fontSize: '1.2rem', color: '#10b981' }}>{totalStudiedHours}h</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Giờ còn lại</div>
                          <strong style={{ fontSize: '1.2rem', color: '#ef4444' }}>{totalRemHours}h</strong>
                        </div>
                        
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Học phí dự tính</div>
                          <strong style={{ fontSize: '1.1rem', color: '#1e3a8a' }}>{(Math.round(totalRegCost / 1000) * 1000).toLocaleString('vi-VN')} đ</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Học phí thực thu</div>
                          <strong style={{ fontSize: '1.1rem', color: '#10b981' }}>{(Math.round(totalPaid / 1000) * 1000).toLocaleString('vi-VN')} đ</strong>
                        </div>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                          <div style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '0.25rem' }}>Giá trị còn lại</div>
                          <strong style={{ fontSize: '1.1rem', color: '#b45309' }}>{(Math.round(totalRemainingCost / 1000) * 1000).toLocaleString('vi-VN')} đ</strong>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>Lịch sử Hợp đồng & Đóng phí</h4>
                {loadingEnrollments ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem' }}>Đang tải lịch sử giao dịch...</div>
                ) : studentEnrollments.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>Chưa có lịch sử giao dịch.</div>
                ) : (
                  <div className="table-responsive" style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table className="crm-table" style={{ fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '0.75rem' }}>Ngày</th>
                          <th style={{ padding: '0.75rem' }}>Loại giao dịch</th>
                          <th style={{ padding: '0.75rem' }}>Nội dung/Khóa học</th>
                          <th style={{ padding: '0.75rem' }}>Số tiền</th>
                          <th style={{ padding: '0.75rem' }}>Số giờ</th>
                          <th style={{ padding: '0.75rem' }}>Người tạo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentEnrollments.map((t, idx) => (
                          <tr 
                            key={idx}
                            style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                            onClick={() => {
                              setSelectedTransaction(t);
                              setTxEditData({
                                tuition_fee: t.tuition_fee || 0,
                                registered_hours: t.registered_hours || 0,
                                amount: t.amount || 0,
                                payment_method: t.payment_method || "Chuyển khoản",
                                note: t.note || ""
                              });
                              setIsEditingTx(false);
                              setIsTransactionModalOpen(true);
                            }}
                            title="Nhấp để xem chi tiết giao dịch này"
                          >
                            <td style={{ padding: '0.75rem' }}>{new Date(t.created_at).toLocaleDateString("vi-VN")}</td>
                            <td style={{ padding: '0.75rem' }}>
                              {t.is_contract ? (
                                <span style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14} /> Ký Hợp đồng</span>
                              ) : (
                                <span style={{ color: '#16a34a', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><DollarSign size={14} /> Thu tiền học</span>
                              )}
                            </td>
                            <td style={{ padding: '0.75rem' }}>{t.is_contract ? (t.note || t.transaction_type || 'Ký Hợp đồng') : `Đóng học phí (${t.payment_method})`}</td>
                            <td style={{ padding: '0.75rem', fontWeight: 600 }}>{t.is_contract ? (Math.round((t.tuition_fee || 0) / 1000) * 1000).toLocaleString('vi-VN') : (Math.round((t.amount || 0) / 1000) * 1000).toLocaleString('vi-VN')} đ</td>
                            <td style={{ padding: '0.75rem' }}>{t.is_contract ? `${t.registered_hours}h` : "---"}</td>
                            <td style={{ padding: '0.75rem', color: '#64748b' }}>{t.created_by}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: CARE */}
            {activeTab === 'care' && studentId && (
              <div>
                {(!isReadOnly || allowCareLogEdit) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>Thêm nhật ký mới</h4>
                      <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '20px', padding: '2px' }}>
                        <button type="button" onClick={() => setCareLogMode('care')} style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '18px', border: 'none', background: careLogMode === 'care' ? '#fff' : 'transparent', color: careLogMode === 'care' ? '#0f172a' : '#64748b', fontWeight: careLogMode === 'care' ? 600 : 400, boxShadow: careLogMode === 'care' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>Tương tác / Tặng điểm</button>
                        <button type="button" onClick={() => setCareLogMode('redeem')} style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: '18px', border: 'none', background: careLogMode === 'redeem' ? '#fff' : 'transparent', color: careLogMode === 'redeem' ? '#d97706' : '#64748b', fontWeight: careLogMode === 'redeem' ? 600 : 400, boxShadow: careLogMode === 'redeem' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}>Đổi Quà 🎁</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 100px', gap: '0.5rem' }}>
                      <input type="date" value={newCareLog.contact_date} onChange={e => setNewCareLog({ ...newCareLog, contact_date: e.target.value })} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="text" placeholder={careLogMode === 'care' ? "Phụ huynh chia sẻ phản hồi gì? (Nội dung cuộc gọi...)" : "Tên món quà (VD: Balo VicEdu...)"} value={newCareLog.content} onChange={e => setNewCareLog({ ...newCareLog, content: e.target.value })} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
                      <input type="number" placeholder={careLogMode === 'care' ? "Điểm ⭐" : "Trừ điểm"} value={newCareLog.bonus_points || ''} onChange={e => setNewCareLog({ ...newCareLog, bonus_points: Number(e.target.value) || 0 })} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', color: careLogMode === 'redeem' ? '#dc2626' : 'inherit' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                      {careLogMode === 'care' ? (
                        <select value={newCareLog.feedback} onChange={e => setNewCareLog({ ...newCareLog, feedback: e.target.value })} style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                          <option value="">-- Chọn đánh giá thái độ phụ huynh --</option>
                          <option value="Hài lòng (Bình thường)">Hài lòng (Bình thường)</option>
                          <option value="Có mong muốn cải thiện chất lượng">Có mong muốn cải thiện chất lượng</option>
                          <option value="Bức xúc/Không hài lòng (🚩 Báo động đỏ)">Bức xúc/Không hài lòng (🚩 Báo động đỏ)</option>
                        </select>
                      ) : (
                        <div style={{ padding: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>Sẽ ghi nhận log và trừ điểm thưởng của học sinh.</div>
                      )}
                      <button type="button" className="btn btn-primary" onClick={handleAddCareLog} style={{ padding: '0.5rem 1rem' }}><PlusCircle size={16} style={{ marginRight: '0.25rem', display: 'inline', verticalAlign: 'middle' }} /> Lưu</button>
                    </div>
                  </div>
                )}

                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#334155', marginBottom: '0.75rem' }}>Nhật ký CSKH đã lưu</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {careLogs.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#64748b', padding: '1.5rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>Chưa có cuộc gọi chăm sóc nào.</div>
                  ) : careLogs.map((log) => (
                    <div key={log.id} style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', background: 'white', position: 'relative' }}>
                      {editingCareLogId === log.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="date" value={editCareLogData.contact_date} onChange={e => setEditCareLogData({ ...editCareLogData, contact_date: e.target.value })} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', width: '120px' }} />
                            <select value={editCareLogData.feedback} onChange={e => setEditCareLogData({ ...editCareLogData, feedback: e.target.value })} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', flex: 1 }}>
                              <option value="Hài lòng (Bình thường)">Hài lòng (Bình thường)</option>
                              <option value="Có mong muốn cải thiện chất lượng">Có mong muốn cải thiện chất lượng</option>
                              <option value="Bức xúc/Không hài lòng (🚩 Báo động đỏ)">Bức xúc/Không hài lòng (🚩 Báo động đỏ)</option>
                            </select>
                            <input type="number" placeholder="Điểm ⭐" value={editCareLogData.bonus_points || ''} onChange={e => setEditCareLogData({ ...editCareLogData, bonus_points: Number(e.target.value) || 0 })} style={{ padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', width: '80px' }} />
                          </div>
                          <textarea rows={2} value={editCareLogData.content} onChange={e => setEditCareLogData({ ...editCareLogData, content: e.target.value })} style={{ width: '100%', padding: '0.4rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontFamily: 'inherit' }} />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setEditingCareLogId(null)}>Hủy</button>
                            <button type="button" className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => handleUpdateCareLog(log.id)}>Cập nhật</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {log.bonus_points ? (
                            <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontWeight: 600, color: log.bonus_points > 0 ? '#16a34a' : '#dc2626', background: log.bonus_points > 0 ? '#dcfce7' : '#fee2e2', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
                              {log.bonus_points > 0 ? `+${log.bonus_points} ⭐` : `${log.bonus_points} ⭐`}
                            </div>
                          ) : null}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', paddingRight: log.bonus_points ? '4rem' : '0' }}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Ngày gọi: <strong>{new Date(log.contact_date).toLocaleDateString("vi-VN")}</strong></span>
                            {log.feedback && (
                              <span style={{
                                fontSize: '0.75rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: '9999px',
                                fontWeight: 600,
                                background: log.feedback?.includes('đỏ') ? '#fee2e2' : (log.feedback?.includes('cải thiện') ? '#fef3c7' : '#dcfce3'),
                                color: log.feedback?.includes('đỏ') ? '#dc2626' : (log.feedback?.includes('cải thiện') ? '#d97706' : '#16a34a')
                              }}>{log.feedback}</span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap', lineHeight: 1.4, paddingRight: log.bonus_points ? '4rem' : '0' }}>{log.content}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>Bởi: {log.created_by}</span>
                            {(!isReadOnly || allowCareLogEdit) && (
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                {log.content.includes('[Ý KIẾN PHỤ HUYNH]') && !log.content.includes('[TRUNG TÂM PHẢN HỒI]') && (
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setReplyingCareLogId(log.id);
                                      setReplyContent('');
                                    }}
                                    style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}
                                  >
                                    💬 Phản hồi
                                  </button>
                                )}
                                <button type="button" onClick={() => { setEditingCareLogId(log.id); setEditCareLogData({ contact_date: log.contact_date, content: log.content, feedback: log.feedback || "", bonus_points: log.bonus_points || 0 }); }} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}><Edit size={12} /> Sửa</button>
                                <button type="button" onClick={() => handleDeleteCareLog(log.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.1rem' }}><Trash2 size={12} /> Xóa</button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      
                      {replyingCareLogId === log.id && (
                        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                          <h4 style={{ fontSize: '0.8rem', color: '#16a34a', marginBottom: '0.5rem' }}>Trả lời Ý kiến Phụ huynh</h4>
                          <textarea
                            style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '0.5rem', minHeight: '60px', fontSize: '0.85rem' }}
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Nhập nội dung trung tâm phản hồi..."
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button type="button" onClick={() => setReplyingCareLogId(null)} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Hủy</button>
                            <button type="button" onClick={() => handleReplyCareLog(log.id)} className="btn btn-primary" style={{ background: '#10b981', padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>Gửi phản hồi</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            {(activeTab === 'general' || activeTab === 'commitment' || !studentId) && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={onClose}>Hủy</button>
                {!isReadOnly && (
                    <button type="submit" className="btn btn-primary" disabled={uploadingCommitment}>{studentId ? "Cập nhật học viên" : "Lưu học viên"}</button>
                )}
              </div>
            )}
            </fieldset>
          </form>
        </div>
      </div>

      {/* Lightbox Viewer */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <div 
          className="lightbox-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 99999,
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setLightboxOpen(false)}
        >
          <div 
            className="lightbox-content" 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="lightbox-close" 
              style={{
                position: 'absolute',
                top: '-50px',
                right: 0,
                color: '#cbd5e1',
                background: 'none',
                border: 'none',
                fontSize: '2.5rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              onClick={() => setLightboxOpen(false)}
            >
              &times;
            </button>
            
            <img 
              src={lightboxImages[lightboxIndex]} 
              alt={`Ảnh cam kết ${lightboxIndex + 1}`} 
              className="lightbox-image" 
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '12px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            />

            {lightboxImages.length > 1 && (
              <>
                <button 
                  className="lightbox-nav prev" 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    left: '-70px',
                  }}
                  onClick={() => setLightboxIndex(prev => (prev - 1 + lightboxImages.length) % lightboxImages.length)}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className="lightbox-nav next" 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    right: '-70px',
                  }}
                  onClick={() => setLightboxIndex(prev => (prev + 1) % lightboxImages.length)}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div 
              className="lightbox-indicator"
              style={{
                color: '#94a3b8',
                marginTop: '16px',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {lightboxIndex + 1} / {lightboxImages.length}
            </div>
          </div>
        </div>
      )}

      {/* Transaction Details Modal (Overlay on top of StudentModal) */}
      {isTransactionModalOpen && selectedTransaction && (
        <div 
          className="modal-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100000,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => {
            setIsTransactionModalOpen(false);
            setSelectedTransaction(null);
            setIsEditingTx(false);
          }}
        >
          <div 
            className="modal-content" 
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.75rem',
              width: '90%',
              maxWidth: '550px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              color: '#1e293b',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                {isEditingTx 
                  ? (selectedTransaction.is_contract ? 'Chỉnh sửa Hợp đồng' : 'Chỉnh sửa Phiếu thu')
                  : (selectedTransaction.is_contract ? 'Chi tiết Hợp đồng (Phiếu đăng ký)' : 'Chi tiết Phiếu thu (Thu tiền học)')}
              </h3>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }} 
                onClick={() => {
                  setIsTransactionModalOpen(false);
                  setSelectedTransaction(null);
                  setIsEditingTx(false);
                }}
              >
                <X size={20} />
              </button>
            </div>

            {isEditingTx ? (
              // EDIT FORM MODE
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem' }}>
                {selectedTransaction.is_contract ? (
                  // Edit Contract Form
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontWeight: 600, color: '#475569' }}>Khóa học/Nội dung / Ghi chú *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={txEditData?.note || ""} 
                        onChange={e => setTxEditData({ ...txEditData, note: e.target.value })} 
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontWeight: 600, color: '#475569' }}>Học phí (đ) *</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={txEditData?.tuition_fee ?? 0} 
                          onChange={e => setTxEditData({ ...txEditData, tuition_fee: Number(e.target.value) })} 
                          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontWeight: 600, color: '#475569' }}>Số giờ đăng ký *</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          value={txEditData?.registered_hours ?? 0} 
                          onChange={e => setTxEditData({ ...txEditData, registered_hours: Number(e.target.value) })} 
                          style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  // Edit Receipt Form
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontWeight: 600, color: '#475569' }}>Nội dung thu *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={txEditData?.note || ""} 
                        onChange={e => setTxEditData({ ...txEditData, note: e.target.value })} 
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontWeight: 600, color: '#475569' }}>Số tiền thu (đ) *</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={txEditData?.amount ?? 0} 
                        onChange={e => setTxEditData({ ...txEditData, amount: Number(e.target.value) })} 
                        style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                      />
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  <label style={{ fontWeight: 600, color: '#475569' }}>Phương thức thanh toán</label>
                  <select 
                    value={txEditData?.payment_method || "Chuyển khoản"} 
                    onChange={e => setTxEditData({ ...txEditData, payment_method: e.target.value })}
                    style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', width: '100%' }}
                  >
                    <option value="Chuyển khoản">Chuyển khoản</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Thẻ ATM/POS">Thẻ ATM/POS</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditingTx(false)}>Quay lại</button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => handleEditTransaction(selectedTransaction, txEditData)}
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            ) : (
              // READ-ONLY DISPLAY MODE
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem' }}>
                {selectedTransaction.is_contract ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Khóa học/Nội dung:</span>
                      <strong style={{ color: '#0f172a' }}>{selectedTransaction.course_name || '---'}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Học phí:</span>
                      <strong style={{ color: '#2563eb', fontSize: '1rem' }}>{(Math.round((selectedTransaction.tuition_fee || 0) / 1000) * 1000).toLocaleString('vi-VN')} đ</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Số giờ đăng ký:</span>
                      <strong>{selectedTransaction.registered_hours || 0} giờ</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Số giờ còn lại:</span>
                      <strong>{selectedTransaction.remaining_hours ?? (selectedTransaction.registered_hours || 0)} giờ</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Hình thức đóng:</span>
                      <span>{selectedTransaction.payment_method || '---'}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Loại giao dịch:</span>
                      <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', width: 'fit-content', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {selectedTransaction.transaction_type || 'Ký Hợp đồng'}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Nội dung thu:</span>
                      <strong style={{ color: '#0f172a' }}>{selectedTransaction.note || 'Đóng học phí'}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Số tiền thu:</span>
                      <strong style={{ color: '#16a34a', fontSize: '1rem' }}>{(Math.round((selectedTransaction.amount || 0) / 1000) * 1000).toLocaleString('vi-VN')} đ</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Phương thức:</span>
                      <strong>{selectedTransaction.payment_method || '---'}</strong>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                      <span style={{ color: '#64748b', fontWeight: 500 }}>Loại giao dịch:</span>
                      <span className="badge" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', width: 'fit-content', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {selectedTransaction.transaction_type || 'Thu tiền học'}
                      </span>
                    </div>
                    {selectedTransaction.approved_by && (
                      <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', fontWeight: 500 }}>Duyệt bởi:</span>
                        <span>{selectedTransaction.approved_by} {selectedTransaction.approved_at ? `(Lúc ${new Date(selectedTransaction.approved_at).toLocaleString('vi-VN')})` : ''}</span>
                      </div>
                    )}
                  </>
                )}

                <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0.25rem 0' }} />

                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Chi nhánh:</span>
                  <span>{selectedTransaction.branch_id || '---'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Ngày lập phiếu:</span>
                  <span>{new Date(selectedTransaction.created_at).toLocaleString('vi-VN')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Người lập phiếu:</span>
                  <span>{selectedTransaction.created_by || '---'}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '0.5rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Trạng thái:</span>
                  <span className="badge" style={{
                    backgroundColor: selectedTransaction.status === 'Approved' || selectedTransaction.status === 'Active' ? '#dcfce7' : '#fef3c7',
                    color: selectedTransaction.status === 'Approved' || selectedTransaction.status === 'Active' ? '#16a34a' : '#d97706',
                    width: 'fit-content',
                    padding: '0.15rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    {selectedTransaction.status === 'Approved' ? 'Đã duyệt' : selectedTransaction.status === 'Active' ? 'Hoạt động' : selectedTransaction.status || 'Chờ duyệt'}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ color: '#64748b', fontWeight: 500 }}>Ghi chú:</span>
                  <div style={{ background: '#f8fafc', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', minHeight: '50px' }}>
                    {selectedTransaction.note || 'Không có ghi chú nào.'}
                  </div>
                </div>

                {/* Minh chứng giao dịch (ảnh đóng học phí) */}
                {selectedTransaction.receipt_images && selectedTransaction.receipt_images.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Minh chứng đóng phí:</span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {selectedTransaction.receipt_images.map((url: string, index: number) => (
                        <div 
                          key={index} 
                          style={{ width: '80px', height: '80px', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden', cursor: 'pointer' }}
                          onClick={() => {
                            setTxLightboxIndex(index);
                            setTxLightboxOpen(true);
                          }}
                        >
                          <img src={url} alt={`Minh chứng ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {["Super Admin", "Kế toán HO"].includes(activeRole) && (
                      <>
                        <button 
                          type="button" 
                          className="btn" 
                          style={{ background: '#eff6ff', color: '#2563eb', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => setIsEditingTx(true)}
                        >
                          Chỉnh sửa
                        </button>
                        <button 
                          type="button" 
                          className="btn" 
                          style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                          onClick={() => handleDeleteTransaction(selectedTransaction)}
                        >
                          Xóa giao dịch
                        </button>
                      </>
                    )}
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setIsTransactionModalOpen(false);
                      setSelectedTransaction(null);
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox for Transaction Proof Images */}
      {txLightboxOpen && selectedTransaction && selectedTransaction.receipt_images && (
        <div 
          className="lightbox-overlay" 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(15, 23, 42, 0.95)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100001,
            backdropFilter: 'blur(8px)',
          }}
          onClick={() => setTxLightboxOpen(false)}
        >
          <div 
            className="lightbox-content" 
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              className="lightbox-close" 
              style={{
                position: 'absolute',
                top: '-50px',
                right: 0,
                color: '#cbd5e1',
                background: 'none',
                border: 'none',
                fontSize: '2.5rem',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              onClick={() => setTxLightboxOpen(false)}
            >
              &times;
            </button>
            
            <img 
              src={selectedTransaction.receipt_images[txLightboxIndex]} 
              alt="Minh chứng đóng học phí" 
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              }}
            />

            {selectedTransaction.receipt_images.length > 1 && (
              <>
                <button 
                  className="lightbox-nav prev" 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    left: '-70px',
                  }}
                  onClick={() => setTxLightboxIndex(prev => (prev - 1 + selectedTransaction.receipt_images.length) % selectedTransaction.receipt_images.length)}
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  className="lightbox-nav next" 
                  style={{
                    position: 'absolute',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    border: 'none',
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    cursor: 'pointer',
                    right: '-70px',
                  }}
                  onClick={() => setTxLightboxIndex(prev => (prev + 1) % selectedTransaction.receipt_images.length)}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <div 
              className="lightbox-indicator"
              style={{
                color: '#94a3b8',
                marginTop: '16px',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              {txLightboxIndex + 1} / {selectedTransaction.receipt_images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

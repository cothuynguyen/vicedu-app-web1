"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  FileText, 
  Music, 
  BookOpen, 
  Video, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  HelpCircle,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import "./Curriculum.css";

const PROGRAMS = ["KINDY", "KIDS", "TEENS", "IELTS", "GN", "Special course"];

export default function CurriculumPage() {
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("KINDY");
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formActiveTab, setFormActiveTab] = useState("general"); // 'general', 'main_files', 'tests_extras'
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // User authorization position
  const [userPosition, setUserPosition] = useState("");
  const { user, loading: authLoading } = useAuth();
  
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState({
    program: "KINDY",
    level: "",
    coursebook_title: "",
    cefr_level: "",
    cambridge_certificate: "",
    course_syllabus_url: "",
    student_book_url: "",
    audio_url: "",
    workbook_url: "",
    pencil_paper_test_url: "",
    listening_test_audio_url: "",
    speaking_test_url: "",
    answer_key_url: "",
    frame_question_set_url: "",
    flashcards_url: "",
    video_url: ""
  });

  const activeRole = user?.role || "User";
  const canModify = activeRole === "Super Admin" || (activeRole === "Giáo viên" && userPosition === "Trưởng phòng Đào tạo");

  const fetchUserPosition = async () => {
    if (!user?.email) return;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("position")
        .eq("email", user.email)
        .maybeSingle();
      if (!error && data) {
        setUserPosition(data.position || "");
      }
    } catch (err) {
      console.error("Lỗi khi tải thông tin chức vụ:", err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("curriculum_framework")
        .select("*")
        .order("level", { ascending: true });
      if (!error && data) {
        setCurriculums(data);
      } else if (error) {
        console.error("Lỗi tải khung chương trình:", error.message);
      }
    } catch (err) {
      console.error("Lỗi kết nối database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchUserPosition();
      fetchData();
    }
  }, [authLoading, user]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      program: activeTab,
      level: "",
      coursebook_title: "",
      cefr_level: "",
      cambridge_certificate: "",
      course_syllabus_url: "",
      student_book_url: "",
      audio_url: "",
      workbook_url: "",
      pencil_paper_test_url: "",
      listening_test_audio_url: "",
      speaking_test_url: "",
      answer_key_url: "",
      frame_question_set_url: "",
      flashcards_url: "",
      video_url: ""
    });
    setFormActiveTab("general");
    setShowModal(true);
  };

  const openEditModal = (item: any, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row expansion
    setEditingId(item.id);
    setFormData({
      program: item.program || "KINDY",
      level: item.level || "",
      coursebook_title: item.coursebook_title || "",
      cefr_level: item.cefr_level || "",
      cambridge_certificate: item.cambridge_certificate || "",
      course_syllabus_url: item.course_syllabus_url || "",
      student_book_url: item.student_book_url || "",
      audio_url: item.audio_url || "",
      workbook_url: item.workbook_url || "",
      pencil_paper_test_url: item.pencil_paper_test_url || "",
      listening_test_audio_url: item.listening_test_audio_url || "",
      speaking_test_url: item.speaking_test_url || "",
      answer_key_url: item.answer_key_url || "",
      frame_question_set_url: item.frame_question_set_url || "",
      flashcards_url: item.flashcards_url || "",
      video_url: item.video_url || ""
    });
    setFormActiveTab("general");
    setShowModal(true);
  };

  const handleDelete = async (id: string, levelName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering row expansion
    if (!window.confirm(`Bạn có chắc muốn xóa tài liệu khung chương trình của [${levelName}]?`)) {
      return;
    }
    try {
      const { error } = await supabase.from("curriculum_framework").delete().eq("id", id);
      if (error) {
        alert("Lỗi khi xóa tài liệu: " + error.message);
      } else {
        alert("Đã xóa thành công!");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.level || formData.level.trim() === "") {
      alert("Vui lòng nhập Tên cấp độ/Level!");
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from("curriculum_framework")
          .update(formData)
          .eq("id", editingId);
        if (error) {
          alert("Lỗi khi cập nhật tài liệu: " + error.message);
        } else {
          alert("Cập nhật tài liệu thành công!");
          setShowModal(false);
          fetchData();
        }
      } else {
        const { error } = await supabase
          .from("curriculum_framework")
          .insert([formData]);
        if (error) {
          alert("Lỗi khi thêm tài liệu mới: " + error.message);
        } else {
          alert("Thêm tài liệu mới thành công!");
          setShowModal(false);
          fetchData();
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper sorting function
  const sortLevels = (a: any, b: any) => {
    // Tự sắp xếp theo chữ số trong tên cấp độ
    const aMatch = a.level.match(/\d+/);
    const bMatch = b.level.match(/\d+/);
    if (aMatch && bMatch) {
      const diff = parseInt(aMatch[0], 10) - parseInt(bMatch[0], 10);
      if (diff !== 0) return diff;
    }
    return a.level.localeCompare(b.level);
  };

  const filteredItems = curriculums
    .filter(item => item.program === activeTab)
    .filter(item => {
      const query = searchQuery.toLowerCase();
      return (
        item.level.toLowerCase().includes(query) ||
        (item.coursebook_title && item.coursebook_title.toLowerCase().includes(query)) ||
        (item.cefr_level && item.cefr_level.toLowerCase().includes(query)) ||
        (item.cambridge_certificate && item.cambridge_certificate.toLowerCase().includes(query))
      );
    })
    .sort(sortLevels);

  const renderLinkButton = (url: string, label: string, icon: any) => {
    const Icon = icon;
    if (!url || url.trim() === "") {
      return (
        <span className="material-link-disabled" title="Tài liệu chưa được cập nhật">
          <Icon size={16} />
          <span>{label} (Chưa có)</span>
        </span>
      );
    }

    return (
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="material-link-btn"
      >
        <Icon size={16} />
        <span>{label}</span>
        <ExternalLink size={12} className="ml-auto" />
      </a>
    );
  };

  return (
    <>
      <div className="curriculum-container animate-fade-in">
        <div className="page-header">
          <div>
            <h1>Khung Chương trình & Học liệu</h1>
            <p className="text-muted">Xem, tải xuống và quản lý tài liệu, giáo trình giảng dạy của giáo viên Việt Nam và nước ngoài.</p>
          </div>
          <div className="header-actions">
            {canModify && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={18} />
                <span>Thêm tài liệu mới</span>
              </button>
            )}
          </div>
        </div>

        <div className="filters-bar glass-panel" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-box" style={{ flex: 1, minWidth: '250px' }}>
            <Search size={20} className="text-muted" />
            <input 
              type="text" 
              placeholder="Tìm kiếm cấp độ, giáo trình, CEFR..." 
              className="search-input" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="program-tabs glass-panel">
          {PROGRAMS.map(prog => (
            <button
              key={prog}
              type="button"
              className={`program-tab-btn ${activeTab === prog ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(prog);
                setExpandedRows({});
              }}
            >
              {prog}
            </button>
          ))}
        </div>

        {/* Main Grid table */}
        {loading ? (
          <div className="glass-panel text-center" style={{ padding: '3rem' }}>
            <p className="text-muted">Đang tải dữ liệu khung chương trình...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="glass-panel text-center" style={{ padding: '3rem' }}>
            <p className="text-muted">Không tìm thấy tài liệu phù hợp.</p>
          </div>
        ) : (
          <div className="table-responsive glass-panel">
            <table className="curriculum-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Cấp độ</th>
                  <th>Giáo trình chính</th>
                  <th>CEFR Level</th>
                  <th>Chứng chỉ Cambridge</th>
                  {canModify && <th style={{ width: '120px', textAlign: 'center' }}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const isExpanded = !!expandedRows[item.id];
                  return (
                    <React.Fragment key={item.id}>
                      <tr 
                        className={`curriculum-row-main ${isExpanded ? 'row-expanded' : ''}`}
                        onClick={() => toggleRow(item.id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>
                          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                        </td>
                        <td><strong>{item.level}</strong></td>
                        <td>{item.coursebook_title || <span className="text-muted">—</span>}</td>
                        <td>
                          {item.cefr_level ? (
                            <span className="badge cefr-badge">{item.cefr_level}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{item.cambridge_certificate || <span className="text-muted">—</span>}</td>
                        {canModify && (
                          <td style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={(e) => openEditModal(item, e)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ color: 'var(--danger)' }}
                              onClick={(e) => handleDelete(item.id, item.level, e)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        )}
                      </tr>
                      {isExpanded && (
                        <tr className="curriculum-row-detail">
                          <td colSpan={canModify ? 6 : 5}>
                            <div className="detail-container">
                              {/* Nhóm 1: Tài liệu chính */}
                              <div className="material-group-card">
                                <h4>
                                  <BookOpen size={16} />
                                  <span>HỌC LIỆU CHÍNH</span>
                                </h4>
                                <div className="links-list">
                                  {renderLinkButton(item.course_syllabus_url, "Syllabus (Đề cương)", FileSpreadsheet)}
                                  {renderLinkButton(item.student_book_url, "Sách học sinh (Student Book)", FileText)}
                                  {renderLinkButton(item.workbook_url, "Sách bài tập (Workbook)", FileText)}
                                  {renderLinkButton(item.audio_url, "File nghe Audio", Music)}
                                </div>
                              </div>

                              {/* Nhóm 2: Đánh giá & Kiểm tra */}
                              <div className="material-group-card">
                                <h4>
                                  <Layers size={16} />
                                  <span>ĐÁNH GIÁ & KIỂM TRA</span>
                                </h4>
                                <div className="links-list">
                                  {renderLinkButton(item.pencil_paper_test_url, "End of Course Test", FileText)}
                                  {renderLinkButton(item.listening_test_audio_url, "Listening Test Audio", Music)}
                                  {renderLinkButton(item.speaking_test_url, "Speaking Test Guidelines", FileText)}
                                </div>
                              </div>

                              {/* Nhóm 3: Học liệu bổ trợ */}
                              <div className="material-group-card">
                                <h4>
                                  <Video size={16} />
                                  <span>HỌC LIỆU BỔ TRỢ</span>
                                </h4>
                                <div className="links-list">
                                  {renderLinkButton(item.answer_key_url, "Answer Key (Đáp án)", CheckCircle)}
                                  {renderLinkButton(item.frame_question_set_url, "Frame Question Set (Bộ câu hỏi)", HelpCircle)}
                                  {renderLinkButton(item.flashcards_url, "Flashcards", Layers)}
                                  {renderLinkButton(item.video_url, "Video bài học", Video)}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animate-fade-in">
            <div className="modal-header">
              <h2>{editingId ? "Sửa tài liệu Khung chương trình" : "Thêm mới tài liệu Cấp độ"}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>

            <div className="modal-tabs">
              <button 
                type="button" 
                className={`tab-btn ${formActiveTab === 'general' ? 'active' : ''}`} 
                onClick={() => setFormActiveTab('general')}
              >
                Thông tin chung
              </button>
              <button 
                type="button" 
                className={`tab-btn ${formActiveTab === 'main_files' ? 'active' : ''}`} 
                onClick={() => setFormActiveTab('main_files')}
              >
                Học liệu chính
              </button>
              <button 
                type="button" 
                className={`tab-btn ${formActiveTab === 'tests_extras' ? 'active' : ''}`} 
                onClick={() => setFormActiveTab('tests_extras')}
              >
                Đánh giá & Bổ trợ
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              {formActiveTab === 'general' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Chương trình học *</label>
                      <select 
                        className="form-input"
                        value={formData.program}
                        onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                      >
                        {PROGRAMS.map(prog => (
                          <option key={prog} value={prog}>{prog}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tên cấp độ / Level *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="Ví dụ: Kindy 1, Kids 1A..."
                        value={formData.level}
                        onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Giáo trình chính (Coursebook Title)</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Ví dụ: Oxford Phonics World 1..."
                      value={formData.coursebook_title}
                      onChange={(e) => setFormData({ ...formData, coursebook_title: e.target.value })}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">CEFR Level</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ví dụ: Pre-A1, A1, B1..."
                        value={formData.cefr_level}
                        onChange={(e) => setFormData({ ...formData, cefr_level: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Chứng chỉ Cambridge tương ứng</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Ví dụ: Starters, Movers, Flyers..."
                        value={formData.cambridge_certificate}
                        onChange={(e) => setFormData({ ...formData, cambridge_certificate: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {formActiveTab === 'main_files' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Link Đề cương giáo trình (Syllabus URL)</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="Dán link Google Drive hoặc OneDrive..."
                      value={formData.course_syllabus_url}
                      onChange={(e) => setFormData({ ...formData, course_syllabus_url: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Sách học sinh (Student Book PDF)</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="Dán link PDF học sinh..."
                      value={formData.student_book_url}
                      onChange={(e) => setFormData({ ...formData, student_book_url: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Sách bài tập (Workbook PDF)</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="Dán link PDF bài tập..."
                      value={formData.workbook_url}
                      onChange={(e) => setFormData({ ...formData, workbook_url: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Audio nghe của giáo trình</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="Dán link thư mục nghe hoặc nén zip..."
                      value={formData.audio_url}
                      onChange={(e) => setFormData({ ...formData, audio_url: e.target.value })}
                    />
                  </div>
                </>
              )}

              {formActiveTab === 'tests_extras' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Link Đề thi cuối khoá (Pencil & Paper)</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="Link file đề thi cuối khoá..."
                        value={formData.pencil_paper_test_url}
                        onChange={(e) => setFormData({ ...formData, pencil_paper_test_url: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Link Audio đề thi Listening</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="Link file audio đề nghe..."
                        value={formData.listening_test_audio_url}
                        onChange={(e) => setFormData({ ...formData, listening_test_audio_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Đề thi/Hướng dẫn Speaking</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="Link đề thi hoặc hướng dẫn chấm speaking..."
                      value={formData.speaking_test_url}
                      onChange={(e) => setFormData({ ...formData, speaking_test_url: e.target.value })}
                    />
                  </div>

                  <hr style={{ borderColor: 'var(--glass-border)', margin: '1rem 0' }} />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Link Đáp án (Answer Key)</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="Link file đáp án bài tập/đề thi..."
                        value={formData.answer_key_url}
                        onChange={(e) => setFormData({ ...formData, answer_key_url: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Link Bộ câu hỏi Cấp độ (Frame Question Set)</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="Link câu hỏi ôn luyện..."
                        value={formData.frame_question_set_url}
                        onChange={(e) => setFormData({ ...formData, frame_question_set_url: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Link Flashcards</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="Link học liệu flashcards..."
                        value={formData.flashcards_url}
                        onChange={(e) => setFormData({ ...formData, flashcards_url: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Link Video bổ trợ</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="Link học liệu video/youtube..."
                        value={formData.video_url}
                        onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="modal-actions" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Cập nhật tài liệu' : 'Lưu tài liệu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { 
  MonitorPlay, 
  ExternalLink, 
  Copy, 
  Edit3, 
  AlertCircle, 
  CheckCircle2, 
  Baby, 
  Smile,
  BookOpen,
  GraduationCap, 
  Star,
  PlayCircle,
  Archive
} from 'lucide-react';
import './Lectures.css';

interface Lecture {
  id: string;
  level_name: string;
  order_index: number;
  title: string;
  canva_url: string;
  backup_url?: string;
}

const TABS = [
  { id: 'KINDY', label: 'KINDY' },
  { id: 'KIDS', label: 'KIDS' },
  { id: 'TEENS', label: 'TEENS' },
  { id: 'IELTS', label: 'IELTS' },
  { id: 'SPECIAL COURSE', label: 'Special course' },
];

export default function LecturesPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [activeTab, setActiveTab] = useState('KINDY');
  const [loading, setLoading] = useState(true);
  const [lastViewed, setLastViewed] = useState<Lecture | null>(null);
  
  // Edit Modal State
  const [editLecture, setEditLecture] = useState<Lecture | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newBackupUrl, setNewBackupUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const supabase = createClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Super Admin' || user?.role === 'Admin';

  useEffect(() => {
    fetchLectures();
    
    // Load last viewed from localStorage
    const saved = localStorage.getItem('vicedu_last_lecture');
    if (saved) {
      try {
        setLastViewed(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing last viewed', e);
      }
    }
  }, []);

  const fetchLectures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('lectures')
      .select('*')
      .order('order_index', { ascending: true });
      
    if (error) {
      console.error('Error fetching lectures:', error);
    } else {
      setLectures(data || []);
    }
    setLoading(false);
  };

  const handleOpenLecture = (lecture: Lecture) => {
    // Save to localStorage for quick resume
    localStorage.setItem('vicedu_last_lecture', JSON.stringify(lecture));
    setLastViewed(lecture);
    
    if (lecture.canva_url) {
      window.open(lecture.canva_url, '_blank');
    }
  };

  const handleCopyLink = (url: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (url) {
      navigator.clipboard.writeText(url);
      alert('Đã copy đường dẫn Canva!');
    }
  };

  const handleSaveEdit = async () => {
    if (!editLecture) return;
    setSaving(true);
    
    const { error } = await supabase
      .from('lectures')
      .update({ canva_url: newUrl, title: newTitle, backup_url: newBackupUrl })
      .eq('id', editLecture.id);
      
    if (!error) {
      // Update local state
      setLectures(prev => prev.map(l => l.id === editLecture.id ? { ...l, canva_url: newUrl, title: newTitle, backup_url: newBackupUrl } : l));
      
      // Update lastViewed if it's the same
      if (lastViewed?.id === editLecture.id) {
        const updated = { ...lastViewed, canva_url: newUrl, title: newTitle, backup_url: newBackupUrl };
        setLastViewed(updated);
        localStorage.setItem('vicedu_last_lecture', JSON.stringify(updated));
      }
      
      setEditLecture(null);
    } else {
      alert('Lỗi khi lưu: ' + error.message);
    }
    setSaving(false);
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'KINDY':
        return <Baby size={28} color="#ec4899" />; // Pink
      case 'KIDS':
        return <Smile size={28} color="#f97316" />; // Orange
      case 'TEENS':
        return <BookOpen size={28} color="#0ea5e9" />; // Sky Blue
      case 'IELTS':
        return <GraduationCap size={28} color="#8b5cf6" />; // Violet
      default:
        return <Star size={28} color="#eab308" />; // Yellow/Gold
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'KINDY': return 'rgba(236, 72, 153, 0.1)';
      case 'KIDS': return 'rgba(249, 115, 22, 0.1)';
      case 'TEENS': return 'rgba(14, 165, 233, 0.1)';
      case 'IELTS': return 'rgba(139, 92, 246, 0.1)';
      default: return 'rgba(234, 179, 8, 0.1)';
    }
  };

  const currentLectures = lectures.filter(l => l.level_name === activeTab);

  return (
    <div className="lectures-container animate-fade-in">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="page-title">Hệ thống Bài giảng</h1>
          <p className="page-subtitle">Kho tài liệu Canva trực quan cho giáo viên giảng dạy</p>
        </div>
      </div>

      {lastViewed && (
        <div className="quick-resume-card">
          <div className="quick-resume-info">
            <div className="quick-resume-icon">
              <PlayCircle size={28} color="var(--primary)" />
            </div>
            <div className="quick-resume-text">
              <h4>Bài giảng bạn đang dạy dở</h4>
              <p>{lastViewed.level_name} - {lastViewed.title}</p>
            </div>
          </div>
          <button 
            className="action-btn primary" 
            style={{ width: 'auto', flex: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px' }}
            onClick={() => handleOpenLecture(lastViewed)}
            disabled={!lastViewed.canva_url}
          >
            <MonitorPlay size={18} />
            Mở tiếp bài giảng
          </button>
        </div>
      )}

      <div className="program-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`program-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="lectures-grid">
          {currentLectures.map((lecture) => {
            const hasLink = !!lecture.canva_url;
            return (
              <div key={lecture.id} className={`lecture-card ${hasLink ? 'has-link' : 'no-link'}`}>
                
                {isAdmin && (
                  <button 
                    className="edit-card-btn" 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditLecture(lecture);
                      setNewTitle(lecture.title);
                      setNewUrl(lecture.canva_url || '');
                      setNewBackupUrl(lecture.backup_url || '');
                    }}
                    title="Chỉnh sửa Link Canva"
                  >
                    <Edit3 size={16} />
                  </button>
                )}

                <div 
                  className="lecture-icon-wrapper" 
                  style={{ background: getLevelColor(lecture.level_name) }}
                >
                  {getLevelIcon(lecture.level_name)}
                </div>
                
                <h3 className="lecture-title">{lecture.title}</h3>
                
                <div className={`lecture-status ${hasLink ? 'status-ready' : 'status-missing'}`}>
                  {hasLink ? (
                    <><CheckCircle2 size={14} /> Sẵn sàng giảng dạy</>
                  ) : (
                    <><AlertCircle size={14} /> Chưa có bài giảng</>
                  )}
                </div>

                <div className="lecture-hover-actions">
                  <button 
                    className="action-btn secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (lecture.backup_url) window.open(lecture.backup_url, '_blank');
                    }}
                    disabled={!lecture.backup_url}
                    title={!lecture.backup_url ? 'Chưa có link dự phòng' : 'Mở link dự phòng'}
                  >
                    <Archive size={16} /> Dự phòng
                  </button>
                  <button 
                    className="action-btn primary"
                    onClick={() => handleOpenLecture(lecture)}
                    disabled={!hasLink}
                  >
                    <ExternalLink size={16} /> Mở bài
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editLecture && (
        <div className="modal-overlay" onClick={() => setEditLecture(null)}>
          <div className="modal-content glass-panel animate-scale-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Cập nhật Bài giảng</h2>
              <button className="close-btn" onClick={() => setEditLecture(null)}>✕</button>
            </div>
            <div className="modal-form">
              <div className="form-group">
                <label>Tên bài giảng ({editLecture.level_name})</label>
                <input 
                  type="text"
                  className="form-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Ví dụ: Bài 1"
                />
              </div>
              <div className="form-group">
                <label>Đường link Canva (Chế độ Xem / Trình chiếu)</label>
                <input 
                  type="text"
                  className="form-input"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://www.canva.com/design/..."
                />
              </div>
              <div className="form-group">
                <label>Đường link Dự phòng (Backup Google Drive)</label>
                <input 
                  type="text"
                  className="form-input"
                  value={newBackupUrl}
                  onChange={e => setNewBackupUrl(e.target.value)}
                  placeholder="https://drive.google.com/..."
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditLecture(null)}>Hủy bỏ</button>
              <button 
                className="btn btn-primary" 
                onClick={handleSaveEdit}
                disabled={saving || !newTitle.trim()}
              >
                {saving ? 'Đang lưu...' : 'Lưu cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

const PROGRAMS = {
  'KINDY': {
    slots: 24,
    levels: ['Kindy 1', 'Kindy 2', 'Kindy 3', 'Kindy 4', 'Kindy 5', 'Kindy 6', 'Kindy 7', 'Kindy 8', 'Kindy 9', 'Kindy 10']
  },
  'KIDS': {
    slots: 24,
    levels: ['Kids 1A', 'Kids 1B', 'Kids 2A', 'Kids 2B', 'Kids 3A', 'Kids 3B', 'Kids 4A', 'Kids 4B', 'Kids 5A', 'Kids 5B', 'Kids 6A', 'Kids 6B']
  },
  'TEENS': {
    slots: 32,
    levels: ['Pre-Teens A', 'Pre-Teens B', 'Teen 1A', 'Teen 1B', 'Teen 2A', 'Teen 2B']
  },
  'IELTS': {
    slots: 32,
    levels: ['Pre IELTS 1 (0-2.5)', 'Pre IELTS 2 (2.5-3.5)', 'IELTS (3.5- 4.5)', 'IELTS (4.5-5.5)', 'IELTS (5.5 - 6.5)', 'Upper IELTS 7.0']
  },
  'SPECIAL COURSE': {
    slots: 24,
    levels: ['Special course']
  }
};

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
  const [activeSubTab, setActiveSubTab] = useState('Kindy 1');
  const [loading, setLoading] = useState(true);
  const [lastViewed, setLastViewed] = useState<Lecture | null>(null);
  
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

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    const program = PROGRAMS[tabId as keyof typeof PROGRAMS];
    if (program && program.levels.length > 0) {
      setActiveSubTab(program.levels[0]);
    }
  };

  const handleOpenLecture = (lecture: Lecture) => {
    localStorage.setItem('vicedu_last_lecture', JSON.stringify(lecture));
    setLastViewed(lecture);
    
    if (lecture.canva_url) {
      window.open(lecture.canva_url, '_blank');
    }
  };

  const handleSaveEdit = async () => {
    if (!editLecture) return;
    setSaving(true);
    
    if (editLecture.id.startsWith('temp-')) {
      const { data, error } = await supabase
        .from('lectures')
        .insert({
          level_name: editLecture.level_name,
          order_index: editLecture.order_index,
          title: newTitle,
          canva_url: newUrl,
          backup_url: newBackupUrl
        })
        .select()
        .single();
        
      if (!error && data) {
        setLectures(prev => [...prev, data]);
        setEditLecture(null);
      } else {
        alert('Lỗi khi lưu (Insert): ' + error?.message);
      }
    } else {
      const { error } = await supabase
        .from('lectures')
        .update({ canva_url: newUrl, title: newTitle, backup_url: newBackupUrl })
        .eq('id', editLecture.id);
        
      if (!error) {
        setLectures(prev => prev.map(l => l.id === editLecture.id ? { ...l, canva_url: newUrl, title: newTitle, backup_url: newBackupUrl } : l));
        
        if (lastViewed?.id === editLecture.id) {
          const updated = { ...lastViewed, canva_url: newUrl, title: newTitle, backup_url: newBackupUrl };
          setLastViewed(updated);
          localStorage.setItem('vicedu_last_lecture', JSON.stringify(updated));
        }
        
        setEditLecture(null);
      } else {
        alert('Lỗi khi lưu (Update): ' + error.message);
      }
    }
    setSaving(false);
  };

  const getLevelIcon = (level: string) => {
    if (level.includes('Kindy') || level === 'KINDY') return <Baby size={28} color="#ec4899" />;
    if (level.includes('Kids') || level === 'KIDS') return <Smile size={28} color="#f97316" />;
    if (level.includes('Teen') || level === 'TEENS') return <BookOpen size={28} color="#0ea5e9" />;
    if (level.includes('IELTS')) return <GraduationCap size={28} color="#8b5cf6" />;
    return <Star size={28} color="#eab308" />;
  };

  const getLevelColor = (level: string) => {
    if (level.includes('Kindy') || level === 'KINDY') return 'rgba(236, 72, 153, 0.1)';
    if (level.includes('Kids') || level === 'KIDS') return 'rgba(249, 115, 22, 0.1)';
    if (level.includes('Teen') || level === 'TEENS') return 'rgba(14, 165, 233, 0.1)';
    if (level.includes('IELTS')) return 'rgba(139, 92, 246, 0.1)';
    return 'rgba(234, 179, 8, 0.1)';
  };

  const currentProgram = PROGRAMS[activeTab as keyof typeof PROGRAMS];
  const displayLectures: Lecture[] = [];
  
  if (currentProgram) {
    const existingInSubTab = lectures.filter(l => l.level_name === activeSubTab);
    for (let i = 1; i <= currentProgram.slots; i++) {
      const existing = existingInSubTab.find(l => l.order_index === i);
      if (existing) {
        displayLectures.push(existing);
      } else {
        displayLectures.push({
          id: `temp-${i}`,
          level_name: activeSubTab,
          order_index: i,
          title: `Bài ${i}`,
          canva_url: '',
          backup_url: ''
        });
      }
    }
  }

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
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {currentProgram && currentProgram.levels.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '1.5rem', padding: '0.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          {currentProgram.levels.map((level) => (
            <button
              key={level}
              onClick={() => setActiveSubTab(level)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: activeSubTab === level ? 600 : 500,
                border: 'none',
                background: activeSubTab === level ? 'var(--primary)' : '#f1f5f9',
                color: activeSubTab === level ? 'white' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {level}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="spinner"></div>
        </div>
      ) : (
        <div className="lectures-grid">
          {displayLectures.map((lecture) => {
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
                  style={{ background: getLevelColor(activeTab) }}
                >
                  {getLevelIcon(activeTab)}
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

import React, { useState } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { verifyAndChangePassword } from '@/app/actions/employee';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (!user || !user.email) {
      setError('Lỗi xác thực: Không tìm thấy email của bạn.');
      return;
    }

    setLoading(true);

    try {
      // Gọi Server Action: Xác thực pass cũ + đổi pass mới hoàn toàn phía Server
      // Không dùng supabase.auth.signInWithPassword từ client để tránh trigger onAuthStateChange gây nhầm user
      const result = await verifyAndChangePassword(user.email, oldPassword, newPassword);

      if (!result.success) {
        setError(result.error || 'Có lỗi xảy ra!');
        setLoading(false);
        return;
      }

      // Đồng bộ mật khẩu mới xuống bảng public.users để Super Admin quản lý
      const { error: dbError } = await supabase.from('users').update({ password: newPassword }).eq('id', user.id);
      if (dbError) {
        console.error('Lỗi khi đồng bộ mật khẩu xuống database:', dbError);
        // Vẫn coi là thành công vì Auth đã đổi
      }

      setSuccess('Đổi mật khẩu thành công!');
      setTimeout(() => {
        onClose();
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setSuccess('');
      }, 1500);

    } catch (err: any) {
      setError('Đã xảy ra lỗi hệ thống: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="modal-content glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '16px', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '1.5rem', color: 'var(--text-main)' }}>Đổi Mật khẩu</h2>
        
        {error && <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}
        {success && <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{success}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mật khẩu hiện tại</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showOld ? "text" : "password"} 
                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowOld(!showOld)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Mật khẩu mới</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showNew ? "text" : "password"} 
                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Nhập lại Mật khẩu mới</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showConfirm ? "text" : "password"} 
                style={{ width: '100%', padding: '0.75rem', paddingRight: '2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', outline: 'none' }}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận Đổi mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
}

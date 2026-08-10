'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Save, Image as ImageIcon, Eye } from 'lucide-react';
import Link from 'next/link';
import QuillEditor from '@/components/QuillEditor';

export default function ArticleEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === 'new';
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    thumbnail_url: '',
    category: 'Góc Phụ huynh',
    status: 'draft',
    facebook_pixel_id: '',
    content: ''
  });
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (!isNew) {
      fetchArticle();
    }
  }, [resolvedParams.id]);

  const fetchArticle = async () => {
    const { data, error } = await supabase
      .from('marketing_articles')
      .select('*')
      .eq('id', resolvedParams.id)
      .single();
    
    if (error) {
      alert('Không tìm thấy bài viết!');
      router.push('/sales/articles');
    } else {
      setFormData({
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt || '',
        thumbnail_url: data.thumbnail_url || '',
        category: data.category || 'Góc Phụ huynh',
        status: data.status || 'draft',
        facebook_pixel_id: data.facebook_pixel_id || '',
        content: data.content || '' // Tạm thời dùng string cho content
      });
    }
    setLoading(false);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, '-');
      
    setFormData({ ...formData, title, slug: isNew ? slug : formData.slug });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: form
      });
      const result = await res.json();
      if (result.success) {
        setFormData({ ...formData, thumbnail_url: result.url });
      } else {
        alert('Lỗi tải ảnh: ' + result.error);
      }
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi tải ảnh.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      return alert('Vui lòng nhập Tiêu đề và Slug!');
    }
    setSaving(true);
    
    const articleData = {
      ...formData,
      // Tạm thời lưu dạng text/html cơ bản. Khi dùng novel sẽ lưu json.
    };

    if (isNew) {
      const { error } = await supabase.from('marketing_articles').insert([articleData]);
      if (error) {
        alert('Lỗi khi tạo mới: ' + error.message);
      } else {
        // Bắn tia sét (Webhook) sang Web 3 để xóa Cache ngay lập tức
        try {
          await fetch('https://viceduvn.com/api/revalidate?secret=VICEDU_REVALIDATE_2026');
        } catch (e) {
          console.error('Không thể gọi Web 3 xóa Cache:', e);
        }
        
        alert('Tạo bài viết thành công!');
        router.push('/sales/articles');
      }
    } else {
      const { error } = await supabase.from('marketing_articles').update(articleData).eq('id', resolvedParams.id);
      if (error) {
        alert('Lỗi khi cập nhật: ' + error.message);
      } else {
        // Bắn tia sét (Webhook) sang Web 3 để xóa Cache ngay lập tức
        try {
          await fetch('https://viceduvn.com/api/revalidate?secret=VICEDU_REVALIDATE_2026');
        } catch (e) {
          console.error('Không thể gọi Web 3 xóa Cache:', e);
        }
        
        alert('Cập nhật thành công!');
      }
    }
    setSaving(false);
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải bài viết...</div>;

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/sales/articles" style={{ color: '#6b7280', display: 'flex' }}>
            <ArrowLeft size={24} />
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            {isNew ? 'Tạo bài viết mới' : 'Chỉnh sửa bài viết'}
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Nút Xem trước: Chỉ hoạt động nếu đã có slug */}
          {formData.slug && (
            <a 
              href={`https://viceduvn.com/bai-viet/${formData.slug}?preview=true`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db',
                padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
                fontWeight: 600, textDecoration: 'none'
              }}
            >
              <Eye size={18} />
              Xem trước
            </a>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', 
              background: '#10b981', color: 'white', border: 'none',
              padding: '10px 24px', borderRadius: '8px', cursor: 'pointer',
              fontWeight: 600, opacity: saving ? 0.7 : 1
            }}
          >
            <Save size={18} />
            {saving ? 'Đang lưu...' : 'Lưu bài viết'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Cột chính: Nội dung */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <input 
              type="text" 
              placeholder="Tiêu đề bài viết..."
              value={formData.title}
              onChange={handleTitleChange}
              style={{ width: '100%', fontSize: '2rem', fontWeight: 700, border: 'none', outline: 'none', marginBottom: '16px', background: 'transparent' }}
            />
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', marginBottom: '24px', fontSize: '0.9rem' }}>
              <span>Đường dẫn (Slug):</span>
              <input 
                type="text" 
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value})}
                style={{ flex: 1, border: '1px solid #d1d5db', padding: '4px 8px', borderRadius: '4px', outline: 'none' }}
              />
            </div>

            <textarea 
              placeholder="Nhập nội dung tóm tắt (Excerpt) cho SEO..."
              value={formData.excerpt}
              onChange={(e) => setFormData({...formData, excerpt: e.target.value})}
              style={{ width: '100%', padding: '12px', border: '1px solid #d1d5db', borderRadius: '8px', outline: 'none', minHeight: '80px', marginBottom: '24px', fontFamily: 'inherit', resize: 'vertical' }}
            />

            <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', marginBottom: '24px' }} />
            
            {/* Vùng soạn thảo Nội dung - Tạm dùng textarea trước khi tích hợp Novel hoàn chỉnh */}
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: '#374151' }}>Nội dung chính</h3>
            
            <QuillEditor 
              value={formData.content}
              onChange={(htmlContent) => setFormData({...formData, content: htmlContent})}
            />
          </div>
        </div>

        {/* Cột phải: Cài đặt */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Cài đặt chung */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>Cài đặt bài viết</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Trạng thái</label>
              <select 
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', background: 'white' }}
              >
                <option value="draft">Bản nháp (Chưa hiển thị)</option>
                <option value="published">Xuất bản (Hiển thị ngay)</option>
              </select>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Chuyên mục</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none', background: 'white' }}
              >
                <option value="Góc Phụ huynh">Góc Phụ huynh</option>
                <option value="Phương pháp Giáo dục">Phương pháp Giáo dục</option>
                <option value="Học thuật">Học thuật</option>
                <option value="Định hướng nghề nghiệp">Định hướng nghề nghiệp</option>
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>Facebook Pixel ID (Tùy chọn)</label>
              <input 
                type="text" 
                placeholder="Ví dụ: 1234567890"
                value={formData.facebook_pixel_id}
                onChange={(e) => setFormData({...formData, facebook_pixel_id: e.target.value})}
                style={{ width: '100%', padding: '10px', border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' }}
              />
            </div>
          </div>

          {/* Ảnh bìa */}
          <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '16px', color: '#374151' }}>Ảnh bìa (Thumbnail)</h3>
            
            {formData.thumbnail_url ? (
              <div style={{ position: 'relative', marginBottom: '16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                <img src={formData.thumbnail_url} alt="Thumbnail" style={{ width: '100%', height: 'auto', display: 'block' }} />
                <button 
                  onClick={() => setFormData({...formData, thumbnail_url: ''})}
                  style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Xóa ảnh
                </button>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  border: '2px dashed #d1d5db', borderRadius: '8px', padding: '32px', 
                  textAlign: 'center', cursor: 'pointer', marginBottom: '16px',
                  background: '#f9fafb'
                }}
              >
                <ImageIcon size={32} style={{ color: '#9ca3af', margin: '0 auto 8px auto' }} />
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
                  {uploadingImage ? 'Đang tải lên...' : 'Click để tải ảnh lên (Cloudflare Images)'}
                </p>
              </div>
            )}
            
            <input 
              type="file" 
              accept="image/*"
              ref={fileInputRef}
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: 0 }}>Kích thước khuyến nghị: 1200x630px.</p>
          </div>

        </div>
      </div>
    </div>
  );
}

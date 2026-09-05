'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Edit, Trash2, Plus, Search, Eye, ExternalLink } from 'lucide-react';

export default function ArticlesListPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketing_articles')
      .select('id, title, slug, category, status, facebook_pixel_id, views_count, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching articles:', error);
    } else {
      setArticles(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}" không? Hành động này không thể hoàn tác.`)) {
      const { error } = await supabase.from('marketing_articles').delete().eq('id', id);
      if (error) {
        alert('Lỗi khi xóa bài viết: ' + error.message);
      } else {
        fetchArticles(); // Refresh list
      }
    }
  };

  const filteredArticles = articles.filter(a => 
    a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: '#111827' }}>Quản lý Bài viết (Marketing)</h1>
          <p style={{ color: '#6b7280', marginTop: '4px' }}>Tạo và quản lý tin tức hiển thị trên Web 3</p>
        </div>
        <Link 
          href="/sales/articles/editor/new" 
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', 
            background: '#4f46e5', color: 'white', 
            padding: '10px 20px', borderRadius: '8px', 
            fontWeight: 500, textDecoration: 'none' 
          }}
        >
          <Plus size={18} />
          Viết bài mới
        </Link>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', display: 'flex', gap: '16px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '10px', color: '#9ca3af' }} />
            <input 
              type="text" 
              placeholder="Tìm kiếm bài viết..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ 
                width: '100%', padding: '8px 12px 8px 36px', 
                border: '1px solid #d1d5db', borderRadius: '6px', outline: 'none' 
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Đang tải dữ liệu...</div>
        ) : filteredArticles.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            Không có bài viết nào. Hãy bấm "Viết bài mới" để bắt đầu!
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: '#f9fafb' }}>
              <tr>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontSize: '0.875rem' }}>Tiêu đề</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontSize: '0.875rem' }}>Chuyên mục</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontSize: '0.875rem' }}>Trạng thái</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: '#374151', fontSize: '0.875rem' }}>Lượt xem</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontSize: '0.875rem' }}>Ngày tạo</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: '#374151', fontSize: '0.875rem' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredArticles.map((article) => (
                <tr key={article.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '16px', maxWidth: '300px' }}>
                    <div style={{ fontWeight: 600, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {article.title}
                      {article.facebook_pixel_id && (
                        <span style={{ background: '#3b82f6', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 600, flexShrink: 0 }}>Pixel</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{article.slug}</div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', color: '#4b5563' }}>
                      {article.category}
                    </span>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <span style={{ 
                      background: article.status === 'published' ? '#dcfce7' : '#fef3c7', 
                      color: article.status === 'published' ? '#166534' : '#92400e',
                      padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500
                    }}>
                      {article.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', textAlign: 'center', fontWeight: 600, color: '#4f46e5' }}>
                    {article.views_count || 0}
                  </td>
                  <td style={{ padding: '16px', color: '#6b7280', fontSize: '0.9rem' }}>
                    {new Date(article.created_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ padding: '16px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      {article.status === 'published' && (
                        <a 
                          href={`https://viceduvn.com/bai-viet/${article.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: '6px', color: '#10b981', background: '#d1fae5', borderRadius: '4px', display: 'flex' }}
                          title="Xem bài viết trên Web"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                      <Link 
                        href={`/sales/articles/editor/${article.id}`}
                        style={{ padding: '6px', color: '#4f46e5', background: '#e0e7ff', borderRadius: '4px', display: 'flex' }}
                        title="Sửa bài viết"
                      >
                        <Edit size={16} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(article.id, article.title)}
                        style={{ padding: '6px', color: '#ef4444', background: '#fee2e2', borderRadius: '4px', border: 'none', cursor: 'pointer', display: 'flex' }}
                        title="Xóa bài viết"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

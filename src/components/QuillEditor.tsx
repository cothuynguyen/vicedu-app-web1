"use client";
import React, { useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { compressImage } from '@/utils/imageCompressor';

// Load động (dynamic import) để tránh lỗi window is not defined khi render trên server (SSR)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function QuillEditor({ value, onChange }: { value: string, onChange: (content: string) => void }) {
  const quillRef = useRef<any>(null);

  // Custom handler để tự động upload ảnh lên Cloudflare Images thay vì nhúng Base64
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const quill = quillRef.current?.getEditor();
      if (!quill) return;
      const range = quill.getSelection(true);

      // Tạm thời hiển thị trạng thái chờ trong editor
      quill.insertText(range.index, '[Đang tải ảnh lên...]');

      try {
        // Nén ảnh chèn trong bài viết về kích thước tối đa 1000px để tránh vượt quá giới hạn 4.5MB của Vercel
        const compressedFile = await compressImage(file, 1000, 1000, 0.8);

        const formData = new FormData();
        formData.append('file', compressedFile);
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
        // Xóa dòng trạng thái chờ
        quill.deleteText(range.index, '[Đang tải ảnh lên...]'.length);

        if (!res.ok) {
          const errText = await res.text();
          let parsedErr = errText;
          try {
            const errObj = JSON.parse(errText);
            parsedErr = errObj.error || errText;
          } catch(e) {}
          alert(`Lỗi từ máy chủ (Mã ${res.status}): ${parsedErr}`);
          return;
        }

        const result = await res.json();

        if (result.success) {
          // Chèn thẻ ảnh với link Cloudflare vào đúng vị trí con trỏ
          quill.insertEmbed(range.index, 'image', result.url);
          quill.setSelection(range.index + 1);
        } else {
          alert('Lỗi tải ảnh lên Cloudflare: ' + result.error);
        }
      } catch (err: any) {
        // Xóa dòng trạng thái chờ nếu bị lỗi trong catch block
        try {
          quill.deleteText(range.index, '[Đang tải ảnh lên...]'.length);
        } catch(e) {}
        
        console.error(err);
        alert('Đã xảy ra lỗi khi kết nối API tải ảnh: ' + (err.message || 'Lỗi kết nối/Mạng'));
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  return (
    <div className="bg-white rounded-lg border border-gray-300">
      <ReactQuill 
        {...({ ref: quillRef } as any)}
        theme="snow" 
        value={value} 
        onChange={onChange}
        modules={modules}
        style={{ minHeight: '400px' }}
      />
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Roboto:wght@400;500;700;900&display=swap');
        
        .ql-editor {
          min-height: 500px;
          font-family: 'Inter', sans-serif !important;
          font-size: 1.05rem;
          line-height: 1.7;
          color: #1f2937;
        }

        .ql-container.ql-snow {
          height: 60vh;
          min-height: 500px;
          overflow-y: auto;
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
        }
        
        .ql-toolbar.ql-snow {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: #f8fafc;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        
        .ql-editor * {
          font-family: inherit !important;
        }

        .ql-editor h1, .ql-editor h2, .ql-editor h3, .ql-editor h4, .ql-editor h5, .ql-editor h6,
        .ql-editor h1 *, .ql-editor h2 *, .ql-editor h3 *, .ql-editor h4 *, .ql-editor h5 *, .ql-editor h6 * {
          font-family: 'Roboto', sans-serif !important;
        }

        /* Tinh chỉnh khoảng cách giống Web 3 */
        .ql-editor p { margin-bottom: 1rem; }
        .ql-editor h1, .ql-editor h2 { margin-top: 2rem; margin-bottom: 1rem; font-weight: 700; }
        .ql-editor h3 { margin-top: 1.5rem; margin-bottom: 0.8rem; font-weight: 600; }
      `}</style>
    </div>
  );
}

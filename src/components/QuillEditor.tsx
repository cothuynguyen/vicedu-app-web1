"use client";
import React, { useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

// Load động (dynamic import) để tránh lỗi window is not defined khi render trên server (SSR)
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

export default function QuillEditor({ value, onChange }: { value: string, onChange: (content: string) => void }) {
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}],
      ['link', 'image', 'video'],
      ['clean']
    ],
  }), []);

  return (
    <div className="bg-white rounded-lg border border-gray-300">
      <ReactQuill 
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

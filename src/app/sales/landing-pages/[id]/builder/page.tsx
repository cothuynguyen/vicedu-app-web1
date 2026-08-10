"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, ChevronDown, ChevronUp, UploadCloud } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { compressImage } from "@/utils/imageCompressor";
import { uploadImageToCloudflare } from "@/utils/uploadImage";

type StepConfig = {
  step1_aida?: string;
  step2_benefits?: string;
  step3_problem?: string;
  step4_trust?: string;
  step5_story?: string;
  step6_product_benefits?: string;
  step7_value?: string;
  step8_objections?: string;
  step9_reason_to_buy?: string;
  step10_price_comparison?: string;
  step11_real_price?: string;
  step12_bonuses?: string;
  step13_testimonials?: string;
  step14_scarcity?: string;
  step15_special_price?: string;
  step16_cta?: string;
  step16_sub_title?: string;
  form_bottom_text?: string;
  step17_success_message?: string;
  step17_download_link?: string;
  step17_payment_info?: string;
  step17_payment_qr?: string;
  step17_zalo_link?: string;
  step17_zalo_qr?: string;
  step18_main_title?: string;
  step18_sub_title?: string;
  step18_before_title?: string;
  step18_before_content?: string;
  step18_after_title?: string;
  step18_after_content?: string;
  media_hero_image?: string;
  media_youtube_id?: string;
  facebook_pixel_id?: string;
};

export default function BuilderPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [config, setConfig] = useState<StepConfig>({});
  
  const [expandedSection, setExpandedSection] = useState<number | null>(1);
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldKey: keyof StepConfig) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      let compressedFile: File;
      if (fieldKey === "media_hero_image") {
        // Ảnh Banner ưu tiên độ nét cao, kích thước lớn
        compressedFile = await compressImage(file, 1920, 1920, 0.85);
      } else {
        // Các ảnh khác (QR Code) giữ nguyên mức nén tiêu chuẩn
        compressedFile = await compressImage(file, 800, 800, 0.7);
      }
      const imageUrl = await uploadImageToCloudflare(compressedFile);
      updateConfig(fieldKey, imageUrl);
    } catch (err: any) {
      alert("Lỗi upload ảnh: " + err.message);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    fetchPage();
  }, [id]);

  const fetchPage = async () => {
    const { data, error } = await supabase
      .from("landing_pages")
      .select("*")
      .eq("id", id)
      .single();
    
    if (data) {
      setTitle(data.title);
      setSlug(data.slug);
      setConfig(data.config || {});
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("landing_pages")
      .update({ config })
      .eq("id", id);
      
    setSaving(false);
    if (error) {
      alert("Lỗi lưu cấu hình: " + error.message);
    } else {
      alert("Đã lưu thiết kế thành công!");
    }
  };

  const updateConfig = (key: keyof StepConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <div style={{ padding: '2rem' }}>Đang tải...</div>;

  const sections = [
    { id: 1, title: "1. Cài đặt hệ thống & Hình ảnh", fields: [
      ...(user?.role === "Super Admin" ? [{ key: "facebook_pixel_id", label: "Facebook Pixel ID (Theo dõi chuyển đổi)", placeholder: "VD: 123456789012345 (Bỏ trống nếu không chạy Ads)" }] : []),
      { key: "media_hero_image", label: "Link ảnh Banner (Hero Image)", placeholder: "https://... (.jpg, .png)", uploadImage: true },
      { key: "media_youtube_id", label: "Video Youtube (Chỉ cần nhập Video ID)", placeholder: "VD: dQw4w9WgXcQ" }
    ]},
    { id: 2, title: "2. TIÊU ĐỀ CHÍNH (AIDA - UPS)", fields: [
      { key: "step1_aida", label: "Tiêu đề chính (Gây chú ý)", placeholder: "ĐỪNG ĐỂ CON CẮM MẶT VÀO IPAD TRONG MÙA HÈ NÀY NỮA!", multiline: true }
    ]},
    { id: 3, title: "3. TIÊU ĐỀ PHỤ (Các lợi ích khác)", fields: [
      { key: "step2_benefits", label: "Tiêu đề phụ / Lợi ích", placeholder: "Trải nghiệm phương pháp học hoàn toàn mới...", multiline: true }
    ]},
    { id: 4, title: "4. VẤN ĐỀ (Khoét sâu nỗi đau)", fields: [
      { key: "step3_problem", label: "Phân tích nỗi đau của khách hàng", placeholder: "Mùa hè đến, trẻ con ở nhà thừa năng lượng nhưng thiếu chỗ chơi...", multiline: true }
    ]},
    { id: 5, title: "5. UY TÍN CÁ NHÂN / TỔ CHỨC", fields: [
      { key: "step4_trust", label: "Chứng minh uy tín", placeholder: "Hơn 500+ học viên đã thành công với lộ trình này...", multiline: true }
    ]},
    { id: 6, title: "6. SỬ DỤNG CÂU CHUYỆN", fields: [
      { key: "step5_story", label: "Câu chuyện Before-After", placeholder: "Tôi hiểu tâm lý trẻ con. Lúc mới đến rất rụt rè...", multiline: true }
    ]},
    { id: 7, title: "7. LỢI ÍCH SẢN PHẨM", fields: [
      { key: "step6_product_benefits", label: "Liệt kê lợi ích", placeholder: "- Lợi ích 1\n- Lợi ích 2", multiline: true }
    ]},
    { id: 8, title: "8. TẠO GIÁ TRỊ LỚN", fields: [
      { key: "step7_value", label: "Nhấn mạnh giá trị", placeholder: "Chinh phục trọn vẹn 5 trạm trò chơi nước...", multiline: true }
    ]},
    { id: 9, title: "9. XỬ LÝ TỪ CHỐI", fields: [
      { key: "step8_objections", label: "Trả lời các câu hỏi nghi ngờ", placeholder: "- Hỏi: Bể bơi đông, có an toàn không?\n- Đáp: Kịch bản được kiểm soát khắt khe...", multiline: true }
    ]},
    { id: 10, title: "10. LÝ DO TẠI SAO BÁN", fields: [
      { key: "step9_reason_to_buy", label: "Lý do khách nên mua lúc này", placeholder: "Chỉ tổ chức 1 buổi duy nhất trong mùa hè...", multiline: true }
    ]},
    { id: 11, title: "11. GIÁ THẬT SẢN PHẨM & GIÁ SO SÁNH", fields: [
      { key: "step11_real_price", label: "Giá thực tế (Bị gạch đi)", placeholder: "500.000Đ" },
      { key: "step10_price_comparison", label: "Bảng giá so sánh (Nếu có)", placeholder: "Bình thường ở ngoài bán 1 triệu...", multiline: true }
    ]},
    { id: 12, title: "12. QUÀ TẶNG BONUS", fields: [
      { key: "step12_bonuses", label: "Quà tặng thêm", placeholder: "Tặng kèm 1 buổi test trình độ miễn phí...", multiline: true }
    ]},
    { id: 13, title: "13. TESTIMONIAL (Chứng thực)", fields: [
      { key: "step13_testimonials", label: "Nhận xét của khách hàng cũ", placeholder: "Chị Lan: Bé nhà mình học rất vui...", multiline: true }
    ]},
    { id: 14, title: "14. SỰ GIỚI HẠN (Scarcity)", fields: [
      { key: "step14_scarcity", label: "Tạo sự khan hiếm", placeholder: "SỐ LƯỢNG VÉ CÓ HẠN!" }
    ]},
    { id: 15, title: "15. GIÁ ƯU ĐÃI ĐẶC BIỆT", fields: [
      { key: "step15_special_price", label: "Giá chốt sale (In to đậm)", placeholder: "150.000Đ" }
    ]},
    { id: 16, title: "16. KÊU GỌI HÀNH ĐỘNG (CTA)", fields: [
      { key: "step16_cta", label: "Nút bấm hành động", placeholder: "ĐĂNG KÝ GIỮ CHỖ NGAY" },
      { key: "step16_sub_title", label: "Dòng phụ đề (dưới tiêu đề Form)", placeholder: "Điền thông tin để giữ chỗ ngay trước khi hết ưu đãi" },
      { key: "form_bottom_text", label: "Ghi chú dưới Form (Thời gian, Địa điểm, Lưu ý...)", placeholder: "Thời gian: 08h00-10h30...\nĐịa điểm: Công viên Văn Lang", multiline: true }
    ]},
    { id: 17, title: "17. KẾT QUẢ SAU ĐIỀN FORM (SUCCESS SCREEN)", fields: [
      { key: "step17_success_message", label: "Thông điệp chúc mừng", placeholder: "Đăng ký thành công! / Chúc mừng bạn đã đăng ký..." },
      { key: "step17_download_link", label: "Link tải tài liệu (Nếu Tặng quà)", placeholder: "https://drive.google.com/..." },
      { key: "step17_payment_info", label: "Thông tin Chuyển khoản (Nếu Thu phí)", placeholder: "Ngân hàng MB Bank\nSTK: 123456\nChủ TK: VicEdu", multiline: true },
      { key: "step17_payment_qr", label: "Ảnh mã QR Thanh toán", placeholder: "https://... (.jpg, .png)", uploadImage: true },
      { key: "step17_zalo_link", label: "Link Nhóm Zalo (Mời vào nhóm sau khi đóng tiền)", placeholder: "https://zalo.me/g/..." },
      { key: "step17_zalo_qr", label: "Ảnh mã QR Nhóm Zalo", placeholder: "https://... (.jpg, .png)", uploadImage: true }
    ]},
    { id: 18, title: "18. BEFORE & AFTER (Lột xác)", fields: [
      { key: "step18_main_title", label: "Tiêu đề chính của Khối", placeholder: "Mặc định: Sự Lột Xác Đáng Kinh Ngạc" },
      { key: "step18_sub_title", label: "Tiêu đề phụ của Khối", placeholder: "Mặc định: Đừng để con bạn bỏ lỡ..." },
      { key: "step18_before_title", label: "Tiêu đề cột Before (Vấn đề)", placeholder: "VD: Trước đây / Vấn đề hiện tại" },
      { key: "step18_before_content", label: "Nội dung cột Before (Gạch đầu dòng)", placeholder: "- Con nhút nhát...\n- Không có môi trường...", multiline: true },
      { key: "step18_after_title", label: "Tiêu đề cột After (Kết quả)", placeholder: "VD: Sau khi tham gia / Sự lột xác" },
      { key: "step18_after_content", label: "Nội dung cột After (Gạch đầu dòng)", placeholder: "- Con tự tin giao tiếp...\n- Có bạn mới...", multiline: true }
    ]}
  ];

  return (
    <div style={{ paddingBottom: '5rem' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', position: 'sticky', top: '1rem', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => router.back()} style={{ background: 'var(--bg)', border: 'none', padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}><ArrowLeft size={20} /></button>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Thiết kế nội dung: {title}</h1>
            <a href={`https://hoc.viceduvn.com/${slug}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>hoc.viceduvn.com/{slug}</a>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Save size={18} /> {saving ? "Đang lưu..." : "Lưu thiết kế"}
        </button>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: '#e0f2fe', color: '#0369a1', padding: '1rem', borderRadius: '12px', marginBottom: '2rem', fontSize: '0.9rem' }}>
          <strong>💡 Hướng dẫn:</strong> Hãy điền nội dung vào các phần chú muốn hiển thị. Phần nào chú bỏ trống, hệ thống sẽ tự động ẩn đi trên Landing Page. Có thể xuống dòng thoải mái trong các ô nhập nhiều dòng.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {sections.map((section) => (
            <div key={section.id} style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <div 
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: expandedSection === section.id ? 'var(--bg)' : 'white', fontWeight: 600, color: 'var(--text-main)' }}
              >
                {section.title}
                {expandedSection === section.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              
              {expandedSection === section.id && (
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)' }}>
                  {section.fields.map(field => (
                    <div key={field.key} className="form-group">
                      <label className="form-label">{field.label}</label>
                      {(field as any).multiline ? (
                        <textarea
                          value={config[field.key as keyof StepConfig] || ""}
                          onChange={(e) => updateConfig(field.key as keyof StepConfig, e.target.value)}
                          className="form-input"
                          placeholder={field.placeholder}
                          style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }}
                        />
                      ) : (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            value={config[field.key as keyof StepConfig] || ""}
                            onChange={(e) => updateConfig(field.key as keyof StepConfig, e.target.value)}
                            className="form-input"
                            placeholder={field.placeholder}
                            style={{ flex: 1 }}
                          />
                          {(field as any).uploadImage && (
                            <label className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              <UploadCloud size={18} />
                              {uploadingImage ? "Đang tải..." : "Tải lên"}
                              <input 
                                type="file" 
                                accept="image/*" 
                                style={{ display: 'none' }} 
                                onChange={(e) => handleImageUpload(e, field.key as keyof StepConfig)}
                                disabled={uploadingImage}
                              />
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

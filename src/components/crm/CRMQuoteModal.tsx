"use client";

import React, { useState } from "react";
import { X, Calculator, Gift } from "lucide-react";

type CRMCustomer = {
  id: string;
  full_name: string;
};

interface CRMQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CRMCustomer | null;
}

const GIFTS_LIST = [
  { id: "razkids", name: "Phần mềm đọc Razkids (Nghe nói tự tin)", price: 460000 },
  { id: "padlet", name: "Tài khoản Padlet lưu trữ tiến trình", price: 600000 },
  { id: "kns_12", name: "12 buổi Kỹ năng sống (Tự tin, Tự học)", price: 1200000 },
  { id: "grammar", name: "Bồi dưỡng ngữ pháp theo chuẩn BGD (48 buổi)", price: 2880000 },
  { id: "kns_event", name: "Sự kiện Kỹ năng sống theo chủ đề (12 buổi)", price: 1200000 },
  { id: "shirt", name: "Áo phông đồng phục Vic Edu", price: 150000 },
  { id: "ai_tool", name: "AI phân tích chuyên cần hàng ngày (1 năm)", price: 1000000 }
];

export default function CRMQuoteModal({
  isOpen,
  onClose,
  customer
}: CRMQuoteModalProps) {
  const [quoteTab, setQuoteTab] = useState<'english' | 'ielts' | 'custom'>('english');

  // Tab 1: English & Life Skills
  const [quoteSettings, setQuoteSettings] = useState({
    months: 24,
    discountPercent: 48,
    selectedGifts: GIFTS_LIST.map(g => g.id),
    basePricePerMonth: 2450000
  });

  // Calculate Tab 1
  const quoteTotalBase = quoteSettings.basePricePerMonth * quoteSettings.months;
  const quoteGiftsValue = GIFTS_LIST.filter(g => quoteSettings.selectedGifts.includes(g.id)).reduce((acc, g) => acc + g.price, 0);
  const quoteTheoreticalTotal = quoteTotalBase + quoteGiftsValue;
  const quoteFinalFee = quoteTotalBase * (1 - quoteSettings.discountPercent / 100);
  const quoteSavings = quoteTheoreticalTotal - quoteFinalFee;
  const quotePerMonth = quoteFinalFee / quoteSettings.months;

  // Tab 2: IELTS per Hour
  const IELTS_BANDS = [4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0];
  const [ieltsSettings, setIeltsSettings] = useState({
    entryLevel: 4.0,
    targetLevel: 6.5,
    pricePerHour: 250000,
    discountPercent: 0
  });
  const ieltsBands = Math.round((ieltsSettings.targetLevel - ieltsSettings.entryLevel) * 2);
  const ieltsTotalHours = ieltsBands * 24;
  const ieltsTotalFee = ieltsTotalHours * ieltsSettings.pricePerHour;
  const ieltsFinalFee = ieltsTotalFee * (1 - ieltsSettings.discountPercent / 100);

  // Tab 3: Custom / Manual
  const [customTitle, setCustomTitle] = useState('BÁO GIÁ ĐẶC BIỆT');
  const [customNote, setCustomNote] = useState('');
  const [customItems, setCustomItems] = useState([
    { id: '1', name: '', price: 0, discount: 0, note: '' }
  ]);
  const customTotal = customItems.reduce((sum, item) => sum + item.price * (1 - item.discount / 100), 0);

  if (!isOpen || !customer) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content quote-modal animate-scale-in">
        {/* Quote Type Tabs & Close Button */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[
              { key: 'english', label: '📚 Tiếng Anh & KNS' },
              { key: 'ielts', label: '🎯 IELTS theo Giờ' },
              { key: 'custom', label: '✏️ Thủ Công' }
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setQuoteTab(tab.key as any)}
                style={{
                  padding: '0.4rem 1rem', borderRadius: '8px', border: '2px solid',
                  fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s',
                  background: quoteTab === tab.key ? '#3b82f6' : '#fff',
                  color: quoteTab === tab.key ? '#fff' : '#475569',
                  borderColor: quoteTab === tab.key ? '#3b82f6' : '#e2e8f0'
                }}
              >{tab.label}</button>
            ))}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "0.25rem", display: "flex", alignItems: "center", justifyContent: "center" }} title="Đóng">
            <X size={22} />
          </button>
        </div>

        <div className="quote-modal-body">
          {/* ===== TAB 1: ENGLISH & LIFE SKILLS ===== */}
          {quoteTab === 'english' && (<>
            {/* Left Panel: Controls */}
            <div className="quote-controls">
              <div className="form-group">
                <label>Số tháng học</label>
                <select value={quoteSettings.months} onChange={(e) => setQuoteSettings({ ...quoteSettings, months: Number(e.target.value) })}>
                  <option value={12}>12 tháng</option>
                  <option value={18}>18 tháng</option>
                  <option value={24}>24 tháng (Khuyên dùng)</option>
                  <option value={36}>36 tháng</option>
                  <option value={60}>60 tháng</option>
                </select>
              </div>
              <div className="form-group">
                <label>Học phí niêm yết (VNĐ/tháng)</label>
                <input type="text" value={quoteSettings.basePricePerMonth.toLocaleString('vi-VN')} onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, '');
                  setQuoteSettings({ ...quoteSettings, basePricePerMonth: Number(rawValue) });
                }} />
              </div>
              <div className="form-group">
                <label>Chiết khấu Học phí (%)</label>
                <input type="number" value={quoteSettings.discountPercent} onChange={(e) => setQuoteSettings({ ...quoteSettings, discountPercent: Number(e.target.value) })} />
              </div>
              <div className="form-group">
                <label>Tùy chọn Quà tặng (Free)</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                  {GIFTS_LIST.map(gift => (
                    <label key={gift.id} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}>
                      <input 
                        type="checkbox" 
                        checked={quoteSettings.selectedGifts.includes(gift.id)} 
                        onChange={(e) => {
                          if (e.target.checked) {
                            setQuoteSettings({ ...quoteSettings, selectedGifts: [...quoteSettings.selectedGifts, gift.id] });
                          } else {
                            setQuoteSettings({ ...quoteSettings, selectedGifts: quoteSettings.selectedGifts.filter(id => id !== gift.id) });
                          }
                        }}
                        style={{ marginTop: "2px" }}
                      />
                      <span style={{ lineHeight: 1.4 }}>{gift.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: English Preview */}
            <div className="quote-preview-container">
              <div className="quote-card">
                <div className="quote-header">
                  <h2>Báo giá Đầu tư Giáo dục</h2>
                  <p>Khách hàng: {customer.full_name}</p>
                </div>
                <div className="quote-body">
                  <div className="quote-section">
                    <div className="quote-section-title">Thông tin Khóa học</div>
                    <div className="quote-row">
                      <span>Học phí cơ bản ({quoteSettings.months} tháng)</span>
                      <span>{quoteTotalBase.toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="quote-row">
                      <span>Chiết khấu ({quoteSettings.discountPercent}%)</span>
                      <span style={{ color: "#16a34a" }}>-{(quoteTotalBase * quoteSettings.discountPercent / 100).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div className="quote-row bold" style={{ marginTop: "0.5rem", borderTop: "1px dashed #e2e8f0", paddingTop: "0.5rem" }}>
                      <span>Học phí sau chiết khấu</span>
                      <span>{quoteFinalFee.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                  <div className="quote-section">
                    <div className="quote-section-title">Gói Quà Tặng Độc Quyền (Miễn phí 100%)</div>
                    {GIFTS_LIST.filter(g => quoteSettings.selectedGifts.includes(g.id)).map(gift => (
                      <div key={gift.id} className="gift-item">
                        <div style={{ display: "flex" }}><Gift size={14} className="gift-icon" /><span>{gift.name}</span></div>
                        <span style={{ textDecoration: "line-through", opacity: 0.6 }}>{gift.price.toLocaleString('vi-VN')} đ</span>
                      </div>
                    ))}
                    <div className="quote-row bold" style={{ marginTop: "0.5rem", borderTop: "1px dashed #e2e8f0", paddingTop: "0.5rem", color: "#1e3a8a" }}>
                      <span>Tổng giá trị Quà tặng</span>
                      <span>{quoteGiftsValue.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                  <div className="quote-section" style={{ marginBottom: 0 }}>
                    <div className="quote-row strike"><span>Tổng giá trị thực tế (Học phí + Quà)</span><span>{quoteTheoreticalTotal.toLocaleString('vi-VN')} đ</span></div>
                    <div className="quote-row highlight"><span>Khoản tiết kiệm khổng lồ</span><span>{quoteSavings.toLocaleString('vi-VN')} đ</span></div>
                    <div className="quote-row total-row"><span>Thực trả (Giá trị đầu tư)</span><span>{quoteFinalFee.toLocaleString('vi-VN')} đ</span></div>
                  </div>
                </div>
                <div className="quote-footer">
                  <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>
                    Tương đương chỉ <span style={{ color: "#ef4444", fontSize: "1.1rem" }}>{quotePerMonth.toLocaleString('vi-VN')} đ/tháng</span>
                  </p>
                  <p style={{ margin: 0 }}>Vui lòng chụp màn hình báo giá này gửi cho Cố vấn học tập để được hưởng ưu đãi.</p>
                </div>
              </div>
            </div>
          </>)}

          {/* ===== TAB 2: IELTS THEO GIỜ ===== */}
          {quoteTab === 'ielts' && (<>
            {/* Left Panel: IELTS Controls */}
            <div className="quote-controls">
              <div className="form-group">
                <label>Trình độ đầu vào (Band hiện tại)</label>
                <select value={ieltsSettings.entryLevel} onChange={e => setIeltsSettings({ ...ieltsSettings, entryLevel: parseFloat(e.target.value) })}>
                  {IELTS_BANDS.filter(b => b < 7.0).map(b => (
                    <option key={b} value={b}>{b.toFixed(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Trình độ mục tiêu</label>
                <select value={ieltsSettings.targetLevel} onChange={e => setIeltsSettings({ ...ieltsSettings, targetLevel: parseFloat(e.target.value) })}>
                  {IELTS_BANDS.filter(b => b > ieltsSettings.entryLevel).map(b => (
                    <option key={b} value={b}>{b.toFixed(1)}</option>
                  ))}
                </select>
              </div>
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span style={{ color: '#475569' }}>Số band cần lên:</span>
                  <strong style={{ color: '#1e3a8a' }}>{ieltsBands} bands</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Tổng giờ học cam kết:</span>
                  <strong style={{ color: '#1e3a8a' }}>{ieltsTotalHours} giờ</strong>
                </div>
              </div>
              <div className="form-group">
                <label>Đơn giá/giờ (VNĐ)</label>
                <input type="text" value={ieltsSettings.pricePerHour.toLocaleString('vi-VN')} onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setIeltsSettings({ ...ieltsSettings, pricePerHour: Number(raw) });
                }} />
              </div>
              <div className="form-group">
                <label>Chiết khấu (%)</label>
                <input type="number" min={0} max={100} value={ieltsSettings.discountPercent} onChange={e => setIeltsSettings({ ...ieltsSettings, discountPercent: Number(e.target.value) })} />
              </div>
            </div>

            {/* Right Panel: IELTS Preview */}
            <div className="quote-preview-container">
              <div className="quote-card">
                <div className="quote-header" style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)' }}>
                  <h2>🎯 BÁO GIÁ IELTS</h2>
                  <p style={{ fontWeight: 600, fontSize: '0.8rem' }}>CAM KẾT 24 GIỜ / 1 BAND</p>
                  <p>Khách hàng: {customer.full_name}</p>
                </div>
                <div className="quote-body">
                  <div className="quote-section">
                    <div className="quote-section-title">Lộ trình mục tiêu</div>
                    <div className="quote-row">
                      <span>Trình độ hiện tại</span>
                      <strong style={{ color: '#64748b' }}>Band {ieltsSettings.entryLevel.toFixed(1)}</strong>
                    </div>
                    <div className="quote-row">
                      <span>Trình độ mục tiêu</span>
                      <strong style={{ color: '#065f46' }}>Band {ieltsSettings.targetLevel.toFixed(1)}</strong>
                    </div>
                    <div className="quote-row bold" style={{ marginTop: '0.4rem', borderTop: '1px dashed #e2e8f0', paddingTop: '0.4rem' }}>
                      <span>Số band cần lên</span>
                      <span style={{ color: '#10b981' }}>{ieltsBands} bands</span>
                    </div>
                    <div className="quote-row bold">
                      <span>Tổng giờ học cam kết</span>
                      <span style={{ color: '#10b981' }}>{ieltsTotalHours} giờ</span>
                    </div>
                  </div>
                  <div className="quote-section">
                    <div className="quote-section-title">Chi tiết học phí</div>
                    <div className="quote-row">
                      <span>{ieltsTotalHours}h × {ieltsSettings.pricePerHour.toLocaleString('vi-VN')} đ</span>
                      <span>{ieltsTotalFee.toLocaleString('vi-VN')} đ</span>
                    </div>
                    {ieltsSettings.discountPercent > 0 && (
                      <div className="quote-row">
                        <span>Chiết khấu ({ieltsSettings.discountPercent}%)</span>
                        <span style={{ color: '#16a34a' }}>-{(ieltsTotalFee * ieltsSettings.discountPercent / 100).toLocaleString('vi-VN')} đ</span>
                      </div>
                    )}
                    <div className="quote-row total-row" style={{ marginTop: '0.5rem', background: '#ecfdf5', borderColor: '#6ee7b7', color: '#065f46' }}>
                      <span>Thực trả</span>
                      <span>{ieltsFinalFee.toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                  <div className="quote-section" style={{ marginBottom: 0 }}>
                    <div style={{ background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.75rem' }}>
                      <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.85rem', marginBottom: '0.4rem' }}>🏆 CAM KẾT VICEDU</div>
                      <div style={{ color: '#78350f', fontSize: '0.8rem', lineHeight: 1.5 }}>
                        <strong>"Lên 1 band chỉ trong 24 giờ học"</strong><br />
                        Lộ trình: 4.0 → 4.5 → 5.0 → 5.5 → 6.0 → 6.5 → 7.0<br />
                        <em>Cam kết hoàn tiền nếu không đạt mục tiêu.</em>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="quote-footer">
                  <p style={{ margin: 0 }}>Chụp màn hình gửi cho Cố vấn học tập để nhận ưu đãi đặc biệt.</p>
                </div>
              </div>
            </div>
          </>)}

          {/* ===== TAB 3: THỦ CÔNG / CUSTOM ===== */}
          {quoteTab === 'custom' && (<>
            {/* Left Panel: Custom Controls */}
            <div className="quote-controls" style={{ flex: '0 0 360px' }}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Tiêu đề báo giá</label>
                <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="VD: GÓI HỌC ĐẶC BIỆT" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ fontWeight: 600, color: '#334155', fontSize: '0.9rem' }}>Các dòng dịch vụ</label>
                <button
                  type="button"
                  onClick={() => setCustomItems([...customItems, { id: Date.now().toString(), name: '', price: 0, discount: 0, note: '' }])}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                >+ Thêm dòng</button>
              </div>
              {customItems.map((item, idx) => (
                <div key={item.id} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setCustomItems(customItems.filter((_, i) => i !== idx))}
                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', width: '22px', height: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}
                  >✕</button>
                  <div className="form-group" style={{ marginBottom: '0.5rem' }}>
                    <label style={{ fontSize: '0.8rem' }}>Tên khóa học / dịch vụ</label>
                    <input type="text" value={item.name} onChange={e => {
                      const updated = [...customItems]; updated[idx] = { ...updated[idx], name: e.target.value }; setCustomItems(updated);
                    }} placeholder="VD: Khóa IELTS 48 giờ" style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem' }}>Học phí gốc (VNĐ)</label>
                      <input type="text" value={item.price > 0 ? item.price.toLocaleString('vi-VN') : ''} onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '');
                        const updated = [...customItems]; updated[idx] = { ...updated[idx], price: Number(raw) }; setCustomItems(updated);
                      }} placeholder="0" style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.8rem' }}>Chiết khấu (%)</label>
                      <input type="number" min={0} max={100} value={item.discount} onChange={e => {
                        const updated = [...customItems]; updated[idx] = { ...updated[idx], discount: Number(e.target.value) }; setCustomItems(updated);
                      }} style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem' }}>Ghi chú dòng này</label>
                    <input type="text" value={item.note} onChange={e => {
                      const updated = [...customItems]; updated[idx] = { ...updated[idx], note: e.target.value }; setCustomItems(updated);
                    }} placeholder="VD: Áp dụng đến 30/06" style={{ padding: '0.5rem', fontSize: '0.85rem' }} />
                  </div>
                  <div style={{ textAlign: 'right', marginTop: '0.4rem', fontSize: '0.85rem', color: '#1e3a8a', fontWeight: 700 }}>
                    Thành tiền: {Math.round(item.price * (1 - item.discount / 100)).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              ))}
              <div className="form-group" style={{ marginTop: '0.5rem' }}>
                <label>Ghi chú cuối trang</label>
                <textarea rows={2} value={customNote} onChange={e => setCustomNote(e.target.value)} placeholder="VD: Giá trị ưu đãi áp dụng trong tháng 6/2026" style={{ padding: '0.6rem', fontSize: '0.85rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* Right Panel: Custom Preview */}
            <div className="quote-preview-container">
              <div className="quote-card">
                <div className="quote-header" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)' }}>
                  <h2>{customTitle || 'BÁO GIÁ ĐẶC BIỆT'}</h2>
                  <p>Khách hàng: {customer.full_name}</p>
                </div>
                <div className="quote-body">
                  <div className="quote-section">
                    <div className="quote-section-title">Chi tiết dịch vụ</div>
                    {customItems.length === 0 && (
                      <div style={{ color: '#94a3b8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Chưa có dịch vụ nào. Thêm dòng ở bảng bên trái.</div>
                    )}
                    {customItems.map((item, idx) => (
                      <div key={item.id} style={{ borderBottom: idx < customItems.length - 1 ? '1px dashed #e2e8f0' : 'none', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
                        <div className="quote-row">
                          <span style={{ fontWeight: 600, color: '#1e293b', flex: 1, paddingRight: '0.5rem' }}>{item.name || `Dịch vụ ${idx + 1}`}</span>
                        </div>
                        {item.price > 0 && (
                          <div className="quote-row" style={{ paddingLeft: '0.5rem' }}>
                            <span style={{ color: '#64748b' }}>Học phí gốc</span>
                            <span style={{ textDecoration: item.discount > 0 ? 'line-through' : 'none', color: '#94a3b8' }}>{item.price.toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                        {item.discount > 0 && (
                          <div className="quote-row" style={{ paddingLeft: '0.5rem' }}>
                            <span style={{ color: '#16a34a' }}>Ưu đãi ({item.discount}%)</span>
                            <span style={{ color: '#16a34a' }}>-{Math.round(item.price * item.discount / 100).toLocaleString('vi-VN')} đ</span>
                          </div>
                        )}
                        <div className="quote-row" style={{ paddingLeft: '0.5rem', fontWeight: 700, color: '#1e3a8a' }}>
                          <span>Thành tiền</span>
                          <span>{Math.round(item.price * (1 - item.discount / 100)).toLocaleString('vi-VN')} đ</span>
                        </div>
                        {item.note && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', paddingLeft: '0.5rem', marginTop: '0.15rem' }}>{item.note}</div>
                        )}
                      </div>
                    ))}
                  </div>
                  {customItems.length > 0 && (
                    <div className="quote-row total-row">
                      <span>TỔNG THÀNH TIỀN</span>
                      <span>{Math.round(customTotal).toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                </div>
                {customNote && (
                  <div className="quote-footer" style={{ textAlign: 'left', padding: '0.75rem 1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#475569', fontStyle: 'italic' }}><strong>Ghi chú:</strong> {customNote}</div>
                  </div>
                )}
                <div className="quote-footer">
                  <p style={{ margin: 0 }}>Chụp màn hình gửi cho Cố vấn học tập để nhận ưu đãi đặc biệt.</p>
                </div>
              </div>
            </div>
          </>)}

        </div>
      </div>
    </div>
  );
}

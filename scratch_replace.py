import re

file_path = r'D:\Brain2\Projects\vicedu-app\src\app\employees\page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

new_form = """            <div className="modal-tabs">
              <button type="button" className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>Thông tin chung</button>
              <button type="button" className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`} onClick={() => setActiveTab('docs')}>Giấy tờ & Liên hệ</button>
              <button type="button" className={`tab-btn ${activeTab === 'salary' ? 'active' : ''}`} onClick={() => setActiveTab('salary')}>Hợp đồng & Lương</button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              {activeTab === 'general' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Mã Nhân viên *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={formData.id}
                        disabled
                        style={{ backgroundColor: 'rgba(0,0,0,0.2)', cursor: 'not-allowed', color: 'var(--text-muted)' }}
                        title="Mã nhân viên được tạo tự động và không thể chỉnh sửa"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Quyền hệ thống *</label>
                      <select 
                        className="form-input"
                        value={formData.role}
                        onChange={(e) => setFormData({...formData, role: e.target.value})}
                      >
                        {activeRole === "Super Admin" && (
                          <>
                            <option value="Super Admin">Super Admin (Toàn quyền hệ thống)</option>
                            <option value="Kế toán HO">Kế toán HO (Toàn bộ kế toán các chi nhánh)</option>
                            <option value="Admin">Admin Chi nhánh (Quản lý 1 chi nhánh)</option>
                          </>
                        )}
                        <option value="Kế toán Chi nhánh">Kế toán Chi nhánh</option>
                        <option value="User">User (Đào tạo / Tuyển sinh)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    {activeRole === "Super Admin" && (
                      <div className="form-group">
                        <label className="form-label">Chi nhánh *</label>
                        <select 
                          className="form-input"
                          value={formData.branch_id}
                          onChange={(e) => setFormData({...formData, branch_id: e.target.value})}
                        >
                          <option value="Việt Trì 1">Việt Trì 1</option>
                          <option value="Việt Trì 2">Việt Trì 2</option>
                          <option value="Lâm Thao">Lâm Thao</option>
                          <option value="Tuyên Quang">Tuyên Quang</option>
                          <option value="Dân Hòa">Dân Hòa</option>
                        </select>
                      </div>
                    )}
                    <div className="form-group">
                      <label className="form-label">Phòng ban *</label>
                      <select 
                        className="form-input"
                        value={formData.department}
                        onChange={(e) => setFormData({...formData, department: e.target.value})}
                      >
                        <option value="Đào tạo">Đào tạo (Giáo viên)</option>
                        <option value="Tư vấn">Tư vấn (Tuyển sinh)</option>
                        <option value="Kế toán">Kế toán</option>
                        <option value="Quản lý">Quản lý (Giám đốc)</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Họ và tên *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        required 
                        placeholder="Nguyễn Văn A"
                        value={formData.full_name}
                        onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Nick name</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Tên thân mật"
                        value={formData.nickname}
                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Giới tính</label>
                      <select 
                        className="form-input"
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                      >
                        <option value="Nam">Nam</option>
                        <option value="Nữ">Nữ</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày sinh</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.dob}
                        onChange={(e) => setFormData({...formData, dob: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Chức vụ</label>
                      <select 
                        className="form-input"
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                      >
                        <option value="">-- Chọn chức vụ --</option>
                        {activeRole === "Super Admin" && (
                          <optgroup label="Cấp Quản lý / Hội sở">
                            <option value="GĐ Chi nhánh">GĐ Chi nhánh</option>
                            <option value="P.GĐ Chi nhánh">P.GĐ Chi nhánh</option>
                            <option value="Kế toán HO">Kế toán HO</option>
                            <option value="Kiểm toán HO">Kiểm toán HO</option>
                          </optgroup>
                        )}
                        <optgroup label="Cấp Chi nhánh">
                          <option value="Chuyên viên tư vấn">Chuyên viên tư vấn</option>
                          <option value="Nhân viên tư vấn">Nhân viên tư vấn</option>
                          <option value="Trưởng phòng Đào tạo">Trưởng phòng Đào tạo</option>
                          <option value="Nhân viên Đào tạo">Nhân viên Đào tạo</option>
                          <option value="Kế toán Chi nhánh">Kế toán Chi nhánh</option>
                          <option value="Giáo viên nước ngoài">Giáo viên nước ngoài</option>
                          <option value="Bảo vệ">Bảo vệ</option>
                          <option value="Tạp vụ">Tạp vụ</option>
                          <option value="Part time">Part time</option>
                        </optgroup>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Trạng thái làm việc *</label>
                      <select 
                        className="form-input"
                        value={formData.status}
                        onChange={(e) => setFormData({...formData, status: e.target.value})}
                      >
                        <option value="Thử việc">Thử việc</option>
                        <option value="Chính thức">Chính thức</option>
                        <option value="Nghỉ việc">Nghỉ việc</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Thông tin Profile (Kinh nghiệm / Bio)</label>
                    <textarea 
                      className="form-input" 
                      rows={3}
                      placeholder="Nhập giới thiệu ngắn gọn..."
                      value={formData.profile_info}
                      onChange={(e) => setFormData({...formData, profile_info: e.target.value})}
                    />
                  </div>
                </>
              )}

              {activeTab === 'docs' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Số CCCD / CMND</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="0123456789"
                        value={formData.id_card}
                        onChange={(e) => setFormData({...formData, id_card: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Ngày cấp</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.id_date}
                        onChange={(e) => setFormData({...formData, id_date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Link ảnh CCCD mặt trước</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="https://..."
                        value={formData.id_front_url}
                        onChange={(e) => setFormData({...formData, id_front_url: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Link ảnh CCCD mặt sau</label>
                      <input 
                        type="url" 
                        className="form-input" 
                        placeholder="https://..."
                        value={formData.id_back_url}
                        onChange={(e) => setFormData({...formData, id_back_url: e.target.value})}
                      />
                    </div>
                  </div>

                  <hr style={{ borderColor: 'var(--glass-border)', margin: '0.5rem 0' }} />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Số điện thoại</label>
                      <input 
                        type="tel" 
                        className="form-input" 
                        placeholder="09..."
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email (Tài khoản) *</label>
                      <input 
                        type="email" 
                        className="form-input" 
                        required 
                        placeholder="nva@vicedu.com"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Mật khẩu khởi tạo</label>
                    <input 
                      type="password" 
                      className="form-input" 
                      placeholder="Để trống nếu không đổi"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Địa chỉ hiện tại</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Số nhà, đường, phường, quận..."
                      value={formData.current_address}
                      onChange={(e) => setFormData({...formData, current_address: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Link Facebook</label>
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="https://facebook.com/..."
                      value={formData.facebook_url}
                      onChange={(e) => setFormData({...formData, facebook_url: e.target.value})}
                    />
                  </div>

                  <hr style={{ borderColor: 'var(--glass-border)', margin: '0.5rem 0' }} />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ngân hàng</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Techcombank, Vietcombank..."
                        value={formData.bank_name}
                        onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tên chủ tài khoản</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="NGUYEN VAN A"
                        value={formData.bank_owner}
                        onChange={(e) => setFormData({...formData, bank_owner: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Số tài khoản</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="1903..."
                      value={formData.bank_account}
                      onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                    />
                  </div>
                </>
              )}

              {activeTab === 'salary' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Ngày bắt đầu làm việc</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Tình trạng hợp đồng</label>
                      <select 
                        className="form-input"
                        value={formData.contract_status}
                        onChange={(e) => setFormData({...formData, contract_status: e.target.value})}
                      >
                        <option value="Thử việc">Thử việc</option>
                        <option value="Hợp đồng 1 năm">Hợp đồng 1 năm</option>
                        <option value="Hợp đồng 3 năm">Hợp đồng 3 năm</option>
                        <option value="Không xác định thời hạn">Không xác định thời hạn</option>
                        <option value="Part-time">Part-time</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tình trạng hồ sơ (Nộp cứng)</label>
                      <select 
                        className="form-input"
                        value={formData.record_status}
                        onChange={(e) => setFormData({...formData, record_status: e.target.value})}
                      >
                        <option value="Còn thiếu">Còn thiếu</option>
                        <option value="Đầy đủ">Đầy đủ</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bậc lương hiện tại</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Bậc 1 / Level A..."
                        value={formData.salary_level}
                        onChange={(e) => setFormData({...formData, salary_level: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Lương cơ bản (VNĐ)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="5000000"
                        value={formData.base_salary || ''}
                        onChange={(e) => setFormData({...formData, base_salary: Number(e.target.value)})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Lương đóng BHXH (VNĐ)</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        placeholder="5000000"
                        value={formData.insurance_salary || ''}
                        onChange={(e) => setFormData({...formData, insurance_salary: Number(e.target.value)})}
                      />
                    </div>
                  </div>

                  <hr style={{ borderColor: 'var(--glass-border)', margin: '0.5rem 0' }} />

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Tổng phép năm</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={formData.total_leave_days}
                        onChange={(e) => setFormData({...formData, total_leave_days: Number(e.target.value)})}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phép đã hưởng</label>
                      <input 
                        type="number" 
                        className="form-input" 
                        value={formData.used_leave_days}
                        onChange={(e) => setFormData({...formData, used_leave_days: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  <div className="form-group" style={{ backgroundColor: 'rgba(0, 255, 128, 0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <span className="form-label" style={{ display: 'block', color: 'var(--primary)' }}>
                      Số ngày phép còn lại: <strong>{Number(formData.total_leave_days) - Number(formData.used_leave_days)} ngày</strong>
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Ghi chú thêm</label>
                    <textarea 
                      className="form-input" 
                      rows={2}
                      placeholder="Các thỏa thuận đặc biệt..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                </>
              )}

              <div className="modal-actions" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', marginTop: 'auto' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">
                  {editingEmployeeId ? 'Lưu hồ sơ' : 'Tạo hồ sơ mới'}
                </button>
              </div>
            </form>"""

# Replace from <form onSubmit={handleSubmit} className="modal-form"> to </form>
pattern = re.compile(r'<form onSubmit=\{handleSubmit\} className=\"modal-form\">.*?</form>', re.DOTALL)
new_content = pattern.sub(new_form, content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print('Replaced successfully')

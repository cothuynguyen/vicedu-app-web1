# Quy tắc Nghiệp vụ Hệ thống (GEMINI_RULES.md)

> ⚠️ **BẮT BUỘC ĐỌC:** AI trợ lý bắt buộc phải đọc và tuân thủ tuyệt đối các quy tắc trong file này trước khi chỉnh sửa bất kỳ module nào liên quan đến Lớp học, Điểm danh, Học sinh, Gói học và Tài chính.

## 1. Nghiệp vụ Điểm danh & Trừ phí Học viên

### Danh sách Trạng thái Điểm danh (Trực quan trong dropdown)
Điểm danh chỉ bao gồm chính xác 6 trạng thái sau:
1. `Chưa vào lớp` (Trạng thái mặc định khi khởi tạo)
2. `Có mặt`
3. `Vắng phép`
4. `Không phép` (Vắng không phép)
5. `Chuyển lớp`
6. `Dừng học`

### Quy tắc Trừ Giờ & Khấu trừ Học phí
- **Nhóm TRỪ TIỀN & GIỜ:** `["Có mặt", "Vắng phép", "Không phép"]`
  - *Mô tả:* Khi điểm danh chuyển sang một trong các trạng thái này, hệ thống **bắt buộc** khấu trừ số giờ học của buổi học đó khỏi `remaining_hours` và khấu trừ học phí tương ứng khỏi số tiền còn lại (`remaining_cost`) trong ví của học viên.
- **Nhóm KHÔNG TRỪ TIỀN & GIỜ:** `["Chưa vào lớp", "Chuyển lớp", "Dừng học"]`
  - *Mô tả:* Không thực hiện khấu trừ bất kỳ số giờ hay số tiền nào.

### Công thức Khấu trừ Học phí
Mỗi khi số giờ học của buổi học được trừ (`hoursDelta` âm, ví dụ: `-2` giờ):
1. Đơn giá mỗi giờ học của gói học sinh đăng ký (`enrollment_id` tương ứng) được tính bằng:
   $$\text{Đơn giá/giờ} = \frac{\text{Tổng tiền học phí gói (tuition\_fee)}}{\text{Tổng số giờ đăng ký (registered\_hours)}}$$
2. Số tiền khấu trừ tương ứng:
   $$\text{costDelta} = \text{hoursDelta} \times \text{Đơn giá/giờ}$$
3. Cập nhật đồng bộ:
   - Cập nhật số giờ còn lại của gói đăng ký (`enrollments.remaining_hours`).
   - Cập nhật số giờ còn lại của học sinh (`students.remaining_hours`).
   - Cập nhật số tiền học phí còn lại của học sinh (`students.remaining_cost`).
4. **Cơ chế hoàn trả (Rollback):** Nếu trạng thái thay đổi từ Nhóm trừ tiền sang Nhóm không trừ tiền, `hoursDelta` và `costDelta` mang giá trị dương -> hệ thống tự động hoàn lại giờ và tiền vào tài khoản học sinh.

## 2. Quy tắc Hiển thị Số dư & Lịch sử Hợp đồng Học viên (Mới)
Để đảm bảo hiển thị đồng bộ và trực quan số dư thực tế, giao diện chi tiết học viên phải tuân thủ nghiêm ngặt cách tính toán sau:
- **Widget Số dư Học viên (Tổng quan):**
  - *Tổng giờ đăng ký:* `total_registered_hours` từ bảng `students`.
  - *Giờ đã học:* Tính toán động bằng `total_registered_hours - remaining_hours`. (Tuyệt đối không sử dụng trường `total_studied_hours` tĩnh trong DB).
  - *Giờ còn lại:* `remaining_hours` từ bảng `students`.
  - *Đã đóng học phí:* Tính toán động bằng `total_registered_cost` (Hợp đồng đã ký mặc định coi như đã đóng tiền).
  - *Giá trị còn lại:* `remaining_cost` từ bảng `students`.
- **Bảng Lịch sử Hợp đồng & Đóng phí:**
  - Bắt buộc hiển thị đầy đủ các cột: Ngày, Loại giao dịch, Nội dung/Khóa học, Số tiền, Số giờ, **Giờ đã học**, **Số tiền còn lại**, Người tạo.
  - Đối với dòng Hợp đồng (`is_contract === true`):
    - *Giờ đã học:* Tính động bằng `registered_hours - remaining_hours` của gói học đó.
    - *Số tiền còn lại:* Tính động bằng `remaining_hours * (tuition_fee / registered_hours)`.
  - Đối với dòng Phiếu thu/Giao dịch (`is_contract === false`):
    - Hiển thị `"---"` cho cả 2 cột Giờ đã học và Số tiền còn lại.

---

## 3. Quy tắc Tiết kiệm Token & Tối ưu Chi phí API (BẮT BUỘC)

Để phòng tránh việc cạn kiệt hạn mức (quota) hoặc làm phát sinh quá nhiều chi phí token không đáng có, AI trợ lý phải tuân thủ nghiêm ngặt các quy tắc sau:

### Đọc mã nguồn (File Reading)
- **Hạn chế đọc toàn bộ file:** Tuyệt đối KHÔNG sử dụng `view_file` mà không có tham số `StartLine` và `EndLine` khi file lớn hơn 150 dòng.
- **Đọc khoanh vùng mục tiêu:** Sử dụng `grep_search` để định vị từ khóa trước, sau đó chỉ dùng `view_file` để đọc đúng phân đoạn dòng (ví dụ: `StartLine: 40, EndLine: 90`) chứa logic cần sửa đổi.

### Chỉnh sửa tệp (File Modification)
- **Chỉ sửa khối dòng thay đổi (Minimal Diff):** Khi sử dụng `replace_file_content`, chỉ chỉ định chính xác khối dòng code bị ảnh hưởng. KHÔNG được thay thế toàn bộ hoặc phần lớn tệp tin bằng code mới nếu không thực sự cần thiết.
- **Hạn chế gọi công cụ song song:** Thực hiện chỉnh sửa từng tệp một cách tuần tự để tránh lỗi xung đột và giảm thiểu việc gửi lại toàn bộ file nguồn nhiều lần.

### Chạy dòng lệnh (Command Execution)
- **Giới hạn Output dài:** Khi chạy các lệnh kiểm tra, build hoặc log (`git log`, `npm run build`), hạn chế tối đa các lệnh hiển thị lượng log khổng lồ. Sử dụng các tham số giới hạn (ví dụ: `git log -n 5`) để tiết kiệm token trả về trong context.

### Lịch sử hội thoại (Conversation Management)
- **Đề xuất Thread mới:** Khi tổng số lượt trao đổi (turns) trong Thread hiện tại đạt quá 30 lượt (hoặc khi context phình to dẫn đến tốc độ trả lời chậm), AI trợ lý có trách nhiệm chủ động đề xuất người dùng mở một cuộc hội thoại mới (New Session) để reset hoàn toàn context, giảm thiểu việc gửi đi gửi lại lượng tokens lịch sử khổng lồ.
- **Ưu tiên mô hình nhỏ:** Đối với các tác vụ tìm kiếm, phân tích cấu trúc thư mục hoặc đọc hiểu ban đầu, ưu tiên đề xuất hoặc tự động sử dụng mô hình nhỏ, tiết kiệm (như Gemini Flash) thay vì dùng Gemini Pro liên tục.

---

## 4. Quy tắc về Deploy & Cập nhật Website (BẮT BUỘC)
- **TUYỆT ĐỐI KHÔNG TỰ Ý DEPLOY:** AI trợ lý tuyệt đối không được tự ý chạy các lệnh `git push`, đưa code lên GitHub hoặc deploy website lên Vercel/Netlify nếu người dùng CHƯA có lệnh yêu cầu rõ ràng (ví dụ: "Deploy cho tôi", "Push code lên vercel đi"). 
- Mọi thao tác deploy phải do người dùng tự quyết định thời điểm thực hiện.

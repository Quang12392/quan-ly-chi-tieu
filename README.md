# SỔ CHI TIÊU GIA ĐÌNH (Family Expense Manager)

Ứng dụng web quản lý thu chi tài chính gia đình được thiết kế tối giản, trực quan, bảo mật và dành riêng cho **2 vợ chồng**.

- **Chi phí vận hành:** **0 đồng / tháng** trọn đời.
- **Quyền riêng tư tuyệt đối:** Dữ liệu lưu trữ trên Google Sheets cá nhân của bạn, không chia sẻ cho bên thứ ba.
- **Tốc độ:** Nhập giao dịch chỉ mất **vài giây** với các nút gợi ý tiền nhanh (+20k, +50k, +100k, +500k, +1tr).
- **Trải nghiệm ứng dụng di động (PWA):** Tối ưu giao diện Mobile-first, cài đặt lên màn hình chính điện thoại như ứng dụng native.

---

## 1. Tính Năng Nổi Bật

1. **Tổng Quan Thu Chi (Dashboard):**
   - Xem nhanh: Số dư còn lại, Tổng thu, Tổng chi và Tỷ lệ tiết kiệm (% thu nhập giữ lại được) trong tháng.
   - Thống kê chi tiêu giữa 2 vợ chồng: Chồng chi bao nhiêu (%), Vợ chi bao nhiêu (%).
   - Tiến độ ngân sách tháng với 3 mức cảnh báo màu sắc: Xanh (<80%), Vàng (80-99%), Đỏ (>=100%).
   - Top 5 danh mục chi nhiều nhất và danh sách giao dịch gần đây (cho phép bấm vào để sửa/xóa trực tiếp).
2. **Quản Lý Giao Dịch Toàn Diện (Transactions MVP):**
   - Thêm khoản Thu / Chi siêu nhanh với bàn phím số tự động và ghi nhớ người thực hiện.
   - Chỉnh sửa và xóa giao dịch an toàn (hộp thoại xác nhận, xóa mềm `deleted = true`).
   - Gom nhóm danh sách theo từng ngày kèm tổng tiền chi trong ngày.
   - Bộ lọc đa chiều: Lọc theo tháng, theo Thu/Chi, theo người chi (`Cả 2 vợ chồng`, `Chồng`, `Vợ`), lọc theo danh mục cụ thể và tìm kiếm ghi chú theo thời gian thực.
3. **Quản Lý Danh Mục (Categories):**
   - Phân loại danh mục Thu và Chi riêng biệt.
   - Thêm danh mục mới, đổi tên hoặc ẩn danh mục không còn sử dụng.
4. **Báo Cáo & So Sánh (Reports):**
   - So sánh trực tiếp Thu/Chi tháng này với tháng trước (chênh lệch số tiền VNĐ và tỷ lệ %).
   - Biểu đồ cột đôi xu hướng 6 tháng gần nhất (Thu nhập vs Chi tiêu) bằng vector SVG siêu nhẹ.
   - Biểu đồ phân bổ tỷ trọng chi tiêu đa màu sắc.
5. **Định Mức Ngân Sách (Budgets):**
   - Đặt hạn mức chi tiêu hàng tháng cho từng danh mục (Ăn uống, Con cái, Mua sắm...).
   - Theo dõi phần trăm đã tiêu và số tiền còn lại được phép chi tiêu.
6. **Bảo Mật Gia Đình (Security & PIN):**
   - Màn hình đăng nhập dành riêng cho 2 người, không có chức năng đăng ký công khai.
   - Khóa bằng mã PIN gia đình (Mã mặc định: `123456`, có thể đổi bất cứ lúc nào trong mục Cài đặt).
   - Chọn vai trò khi sử dụng: `Chồng` hoặc `Vợ`.
7. **Sao Lưu & Xuất Dữ Liệu (Backup & Restore):**
   - **Xuất file Excel (CSV):** Xuất toàn bộ lịch sử giao dịch chuẩn UTF-8 BOM (mở trực tiếp bằng Microsoft Excel không bao giờ bị lỗi font tiếng Việt).
   - **Sao lưu JSON:** Tải bản sao lưu toàn diện (giao dịch, danh mục, ngân sách, cài đặt).
   - **Khôi phục dữ liệu:** Cho phép upload file JSON để phục hồi dữ liệu khi chuyển thiết bị.

---

## 2. Công Nghệ Sử Dụng (Tech Stack)

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router (`HashRouter` chống lỗi 404 khi tải lại trang hoặc dùng PWA).
- **Backend API:** Google Apps Script Web App (chạy trực tiếp trên hạ tầng Google, `LockService` chống ghi đè khi 2 người cùng nhập đồng thời).
- **Database:** Google Sheets (`Transactions`, `Categories`, `Members`, `Accounts`, `Budgets`, `Settings`).

---

## 3. Khởi Chạy Local Để Sử Dụng Ngay

Ứng dụng có sẵn **Chế độ Nội bộ (Offline / LocalStorage)** với đầy đủ dữ liệu mẫu và tính năng để bạn dùng ngay:

```bash
# Cài đặt thư viện
npm install

# Khởi chạy ứng dụng
npm run dev
```

Truy cập: [http://localhost:3000](http://localhost:3000)
- **Mã PIN đăng nhập mặc định:** `123456`
- **Chọn:** `Chồng` hoặc `Vợ`

---

## 4. Hướng Dẫn Kết Nối Google Sheets & Deploy Backend (Chỉ 3 phút)

### Bước 1: Tạo Google Spreadsheet mới
1. Mở [Google Sheets](https://sheets.new) tạo 1 file mới và đặt tên: `Family Finance Database`.

### Bước 2: Dán mã nguồn Apps Script
1. Trên menu trang tính, chọn **Tiện ích mở rộng** (Extensions) > **Apps Script**.
2. Đổi tên dự án thành: `Family Expense API`.
3. Lần lượt tạo các file script (bấm dấu `+` cạnh mục Trình chỉnh sửa > Script) và copy mã tương ứng từ thư mục `apps-script/`:
   - `Code.gs` <- `apps-script/Code.gs`
   - `Setup.gs` <- `apps-script/Setup.gs`
   - `Transactions.gs` <- `apps-script/Transactions.gs`
   - `Categories.gs` <- `apps-script/Categories.gs`
   - `Budgets.gs` <- `apps-script/Budgets.gs`
   - `Dashboard.gs` <- `apps-script/Dashboard.gs`
   - `Utils.gs` <- `apps-script/Utils.gs`

### Bước 3: Chạy khởi tạo Database tự động
1. Trên thanh công cụ Apps Script, chọn hàm **`setupDatabase`** trong menu dropdown.
2. Bấm **Chạy (Run)**.
3. Khi Google hiện hộp thoại cấp quyền: Bấm **Xem lại quyền** > Chọn tài khoản Google của bạn > Bấm **Nâng cao (Advanced)** > Bấm **Đi tới Family Expense API (không an toàn)** > Bấm **Cho phép (Allow)**.
4. Mở lại Google Sheets: Bạn sẽ thấy tự động tạo đủ **6 Sheet** với định dạng chuẩn đẹp mắt!

### Bước 4: Triển khai Web App (Deploy)
1. Trong Apps Script, bấm nút **Triển khai (Deploy)** (góc phải trên) > Chọn **Tùy chọn triển khai mới (New deployment)**.
2. Bấm biểu tượng bánh răng > Chọn **Ứng dụng web (Web app)**:
   - **Mô tả:** `v1.0`
   - **Thực thi dưới dạng (Execute as):** `Tôi (Tài khoản của bạn)`
   - **Người có quyền truy cập (Who has access):** `Bất kỳ ai (Anyone)`
3. Bấm **Triển khai (Deploy)** và copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).

### Bước 5: Kết nối trong ứng dụng
1. Mở ứng dụng web của bạn > Vào tab **Cài đặt** (⚙️).
2. Dán URL vừa copy vào ô **Web App URL (Google Apps Script)**.
3. Bấm **Kiểm tra kết nối**. Khi hiện thông báo màu xanh *"Kết nối thành công!"*, toàn bộ dữ liệu của gia đình bạn sẽ được đồng bộ lên Google Sheets!

---

## 5. Đưa Ứng Dụng Lên Mạng Miễn Phí (Vercel / Netlify)

Bạn có thể deploy ứng dụng web này miễn phí trọn đời bằng **Vercel** hoặc **Netlify**:

### Cách 1: Đẩy lên GitHub và liên kết với Vercel
1. Đẩy mã nguồn lên một kho lưu trữ GitHub riêng tư (Private Repository).
2. Đăng nhập [Vercel](https://vercel.com) > Chọn **Add New Project** > Chọn kho lưu trữ của bạn.
3. Cài đặt:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Bấm **Deploy**. Sau 1 phút, bạn sẽ có một đường link web riêng (ví dụ: `https://chi-tieu-gia-dinh.vercel.app`).

---

## 6. Cài Đặt Lên Điện Thoại Như App Native (PWA)

Ứng dụng đã được cấu hình sẵn chuẩn PWA với icon và theme sắc nét:
- **Trên iPhone (Safari):** Truy cập đường link web của bạn > Bấm biểu tượng **Chia sẻ (Share - hình vuông có mũi tên lên)** > Chọn **Thêm vào màn hình chính (Add to Home Screen)**.
- **Trên Android (Chrome):** Truy cập đường link web của bạn > Bấm menu **3 chấm** ở góc trên > Chọn **Cài đặt ứng dụng** hoặc **Thêm vào màn hình chính (Add to Home Screen)**.

Ứng dụng sẽ xuất hiện trên màn hình điện thoại với biểu tượng riêng, mở toàn màn hình (không có thanh địa chỉ trình duyệt) như một ứng dụng app cài sẵn từ App Store!

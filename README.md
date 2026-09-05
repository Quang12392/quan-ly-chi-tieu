# SỔ CHI TIÊU GIA ĐÌNH (Family Expense Manager) v2.0

Ứng dụng web PWA quản lý tài chính - chi tiêu gia đình dành riêng cho **2 vợ chồng**, tối giản, bảo mật, hoạt động trọn đời với chi phí **0 đồng/tháng**.

- **Website hoạt động 24/7:** [https://quang12392.github.io/quan-ly-chi-tieu/](https://quang12392.github.io/quan-ly-chi-tieu/)
- **GitHub Repository:** [https://github.com/Quang12392/quan-ly-chi-tieu](https://github.com/Quang12392/quan-ly-chi-tieu)
- **Mã PIN bảo mật gia đình:** `192394`
- **Tài khoản mặc định:** `Chồng` và `Vợ`
- **Cơ sở dữ liệu đám mây:** Google Sheets riêng tư (đồng bộ tự động qua Google Apps Script Web App)

---

## 1. TÀI LIỆU CẦN ĐỌC KHI MUỐN CHỈNH SỬA DỰ ÁN

Khi bạn hoặc bất kỳ AI / Lập trình viên nào muốn tiếp tục chỉnh sửa dự án này, chỉ cần đọc **2 file cốt lõi** sau:

1. 📄 **`README.md` (Chính là file này)**:
   - **Mục đích:** Hướng dẫn nhanh, tổng quan kiến trúc, thông tin đăng nhập, luồng triển khai và quy trình cập nhật mới nhất của dự án.
2. 📘 **`FAMILY_EXPENSE_APP_SPEC.md`**:
   - **Mục đích:** Bản đặc tả chi tiết toàn diện (1500 dòng) về toàn bộ logic nghiệp vụ, cấu trúc bảng tính Google Sheets (schema 6 bảng), quy tắc tính toán tài chính, API contracts và các kịch bản kiểm thử.

---

## 2. CẤU TRÚC THƯ MỤC DỰ ÁN

```
G:\Quản lý chi tiêu gia đình/
├── .github/workflows/
│   └── deploy.yml              # Tự động build và deploy lên GitHub Pages khi push code
├── apps-script/                # Mã nguồn Backend Google Apps Script
│   ├── Code_AllInOne.gs        # ⭐ File gộp toàn bộ backend (chỉ cần copy 1 file này dán vào Apps Script)
│   ├── Code.gs                 # Router doGet/doPost
│   ├── Setup.gs                # Hàm setupDatabase() tự động tạo 6 Sheet & định dạng
│   ├── Transactions.gs         # Thêm, sửa, xóa (soft-delete), phân trang giao dịch
│   ├── Categories.gs           # Lấy và cập nhật danh mục thu/chi
│   ├── Budgets.gs              # Quản lý & tự động kế thừa ngân sách hàng tháng
│   ├── Dashboard.gs            # Tổng hợp số liệu Dashboard, so sánh Chồng/Vợ, cảnh báo ngân sách
│   └── Utils.gs                # Hàm tiện ích (UUID, JSON response, map tiêu đề cột)
├── public/                     # Tài nguyên tĩnh & PWA
│   ├── apple-touch-icon.png    # Icon 3D cho màn hình chính iPhone (180x180)
│   ├── icon-192.png            # Icon 3D cho màn hình chính Android (192x192)
│   ├── icon-512.png            # Icon 3D splash screen Android (512x512)
│   ├── favicon.png             # Favicon trình duyệt
│   ├── manifest.json           # Khai báo cấu hình PWA Web App
│   └── sw.js                   # Service Worker hỗ trợ cài đặt PWA và cập nhật cache
├── src/                        # Mã nguồn Frontend (React + TypeScript + Tailwind CSS)
│   ├── api/
│   │   ├── client.ts           # ApiClient 2 chế độ: LocalStorage (Offline) & Google Sheets (Online)
│   │   └── mockData.ts         # Dữ liệu ban đầu (danh mục, tài khoản, số dư mẫu)
│   ├── components/
│   │   ├── budgets/            # Modal thiết lập hạn mức ngân sách
│   │   ├── categories/         # Modal thêm/sửa/ẩn danh mục thu chi
│   │   ├── layout/             # Header, Bottom Navigation (5 tab), AppLayout
│   │   └── transactions/       # Modal chỉnh sửa giao dịch trực tiếp
│   ├── context/
│   │   └── AuthContext.tsx      # Quản lý phiên đăng nhập, vai trò (Chồng/Vợ), mã PIN gia đình (192394)
│   ├── pages/
│   │   ├── DashboardPage.tsx   # Trang Tổng quan (Số dư, Chồng vs Vợ, Hạn mức, Top chi tiêu)
│   │   ├── TransactionsPage.tsx# Trang Giao dịch (Lọc tháng, lọc người chi, lọc danh mục, tìm kiếm)
│   │   ├── AddTransactionPage.tsx # Trang Thêm giao dịch (+20k, +50k, +100k, +500k, +1tr)
│   │   ├── ReportsPage.tsx     # Trang Báo cáo xu hướng 6 tháng & Quản lý ngân sách
│   │   ├── SettingsPage.tsx    # Trang Cài đặt (Link Google Sheet, đổi mã PIN, xuất CSV/JSON)
│   │   └── LoginPage.tsx       # Màn hình khóa PIN gia đình
│   ├── types/                  # Định nghĩa TypeScript (Transaction, Category, Budget, Member...)
│   └── utils/                  # Hàm format tiền tệ (VND), ngày tháng
├── index.html                  # File HTML gốc (tích hợp PWA meta tags & viewport chống zoom)
├── vite.config.ts              # Cấu hình Vite (base: './' chạy mượt trên GitHub Pages)
└── package.json                # Danh sách thư viện và scripts
```

---

## 3. CÁC TÍNH NĂNG ĐẶC BIỆT ĐÃ NÂNG CẤP

1. **Bảo Mật Bằng Mã PIN Riêng (`192394`):**
   - Mọi thiết bị mới khi truy cập link bắt buộc phải nhập đúng mã PIN bí mật của gia đình.
   - Không hiển thị bất kỳ gợi ý mật khẩu nào trên màn hình.
   - Khi cần đổi mã PIN: Vào tab **Cài đặt** > **Bảo mật & Mã PIN**.

2. **Tự Động Kế Thừa Hạn Mức Ngân Sách (Auto-inherit):**
   - Thiết lập hạn mức chi tiêu 1 lần (ví dụ tháng 9), thì sang tháng 10, tháng 11, tháng 12... hệ thống sẽ **tự động lấy hạn mức tháng trước áp dụng luôn**.
   - Người dùng không phải nhập lại mỗi tháng. Khi nào có tháng đặc biệt (tháng Tết, sự kiện) mới cần vào chỉnh sửa riêng cho tháng đó.

3. **Chế Độ Đồng Bộ Kép (Dual-mode):**
   - **Local Mode:** Nếu chưa dán link Google Sheets, ứng dụng tự động lưu vào LocalStorage máy để dùng thử.
   - **Cloud Mode:** Khi dán URL Web App Apps Script vào Cài đặt, toàn bộ dữ liệu sẽ tự động ghi/đọc trực tiếp từ Google Sheets.

4. **Xuất Báo Cáo & Sao Lưu An Toàn:**
   - Xuất file Excel (CSV) chuẩn UTF-8 BOM tiếng Việt không bị lỗi font.
   - Tải file sao lưu JSON và khôi phục khi chuyển máy.

---

## 4. QUY TRÌNH CHỈNH SỬA & ĐẨY CẬP NHẬT LÊN WEB

Khi bạn muốn sửa đổi mã nguồn (giao diện, logic, chức năng):

### Bước 1: Mở dự án và kiểm tra ở máy tính
```bash
# Mở thư mục dự án
cd "G:\Quản lý chi tiêu gia đình"

# Chạy server thử nghiệm ở máy
npm run dev
```
Mở trình duyệt xem thử tại: [http://localhost:3000](http://localhost:3000)

### Bước 2: Kiểm tra bản build trước khi đẩy lên
```bash
npm run build
```
*(Nếu câu lệnh này báo `✓ built in ...s` là code chuẩn, không có lỗi TypeScript).*

### Bước 3: Đẩy lên GitHub (Tự động cập nhật web trong 30 giây)
```bash
git add .
git commit -m "Mô tả nội dung bạn vừa sửa"
git push origin main
```
Sau khi push, **GitHub Actions** sẽ tự động build và xuất bản lên link web:  
👉 **`https://quang12392.github.io/quan-ly-chi-tieu/`**

---

## 5. NẾU CẦN CẬP NHẬT LẠI MÃ GOOGLE APPS SCRIPT (BACKEND)

Nếu có sửa đổi liên quan đến cách tính toán trong Google Sheets:
1. Mở file [apps-script/Code_AllInOne.gs](file:///G:/Quản%20lý%20chi%20tiêu%20gia%20đình/apps-script/Code_AllInOne.gs) > Copy toàn bộ code (`Ctrl + A` > `Ctrl + C`).
2. Mở Google Sheet của bạn > **Tiện ích mở rộng** > **Apps Script**.
3. Dán đè vào file `Code.gs` và nhấn **Lưu** (`Ctrl + S`).
4. Bấm **Triển khai (Deploy)** > **Quản lý bản triển khai (Manage deployments)** > bấm biểu tượng **Cây bút chì** (Chỉnh sửa) > chọn Phiên bản: **Phiên bản mới (New version)** > bấm **Triển khai**.

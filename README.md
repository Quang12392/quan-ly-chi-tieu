# SỔ CHI TIÊU GIA ĐÌNH (Family Expense Manager)

> **Tài liệu toàn diện & duy nhất của dự án (Master Specification & Guide).**  
> Dành cho người dùng và bất kỳ AI / Lập trình viên nào tiếp nhận, vận hành hoặc phát triển thêm tính năng cho dự án.

---

## 📌 THÔNG TIN HỆ THỐNG ĐANG HOẠT ĐỘNG

| Mục | Thông tin chi tiết |
| :--- | :--- |
| **Website Online (24/7)** | [https://quang12392.github.io/quan-ly-chi-tieu/](https://quang12392.github.io/quan-ly-chi-tieu/) |
| **GitHub Repository** | [https://github.com/Quang12392/quan-ly-chi-tieu](https://github.com/Quang12392/quan-ly-chi-tieu) |
| **Mã PIN bảo mật gia đình** | **`192394`** *(chỉ thành viên biết mã này mới được truy cập)* |
| **Người dùng hệ thống** | Đúng **2 người**: `Chồng` (`husband`) và `Vợ` (`wife`) |
| **Chi phí vận hành** | **0 đồng / tháng** trọn đời (Serverless + Google Cloud) |
| **Cơ sở dữ liệu** | Google Sheets riêng tư (kết nối qua Google Apps Script Web App) |
| **Chế độ hoạt động** | **Dual-mode**: Tự động nhận diện Google Sheets (Cloud) hoặc LocalStorage (Offline) |

---

## 📑 MỤC LỤC
1. [Mục Tiêu & Nguyên Tắc Sản Phẩm](#1-mục-tiêu--nguyên-tắc-sản-phẩm)
2. [Cấu Trúc Cơ Sở Dữ Liệu (Google Sheets Schema)](#2-cấu-trúc-cơ-sở-dữ-liệu-google-sheets-schema)
3. [Kiến Trúc & Công Nghệ (Tech Stack)](#3-kiến-trúc--công-nghệ-tech-stack)
4. [Các Quy Tắc Nghiệp Vụ & Thuật Toán](#4-các-quy-tắc-nghiệp-vụ--thuật-toán)
5. [Cấu Trúc Thư Mục Mã Nguồn](#5-cấu-trúc-thư-mục-mã-nguồn)
6. [Quy Trình Phát Triển & Cập Nhật Lên Web](#6-quy-trình-phát-triển--cập-nhật-lên-web)
7. [Hướng Dẫn Cập Nhật Backend (Google Apps Script)](#7-hướng-dẫn-cập-nhật-backend-google-apps-script)
8. [Cài Đặt Lên Điện Thoại (PWA)](#8-cài-đặt-lên-điện-thoại-pwa)

---

## 1. MỤC TIÊU & NGUYÊN TẮC SẢN PHẨM

### 1.1 Mục tiêu
Xây dựng một ứng dụng web quản lý tài chính - chi tiêu gia đình tối giản, dễ dùng, chạy trên điện thoại và máy tính dành riêng cho đúng **2 vợ chồng**:
- Ghi nhận chi tiêu / thu nhập chỉ trong 3 - 5 giây.
- Người thực hiện khi mở form thêm giao dịch mặc định theo thành viên đang đăng nhập. Chọn thành viên khác để điền hộ chỉ áp dụng trong lần nhập đó, không lưu thành mặc định cho lần sau.
- Xem ai là người chi, phân loại chi tiêu theo danh mục.
- Lịch sử giao dịch hiển thị giờ tạo dưới dòng danh mục, dùng chung giờ Việt Nam và định dạng 24 giờ với Giao dịch gần đây.
- Biểu đồ đường thu/chi cả năm đang chọn (tháng 1 đến tháng 12): chia thành hai biểu đồ tháng 1–6 và 7–12 xếp dọc, dùng chung thang đo, vừa màn hình điện thoại không cần cuộn ngang; mỗi tháng có chấm và nhãn giá trị làm tròn đến nghìn đồng (22.325.000đ → 22tr325; 384.000đ → 384k).
- Theo dõi số dư, tỷ lệ tiết kiệm và xu hướng thu chi 6 tháng.
- Thiết lập hạn mức ngân sách thông minh (tự động kế thừa qua từng tháng).
- Toàn quyền sở hữu dữ liệu trên Google Sheets cá nhân, không lo mất dữ liệu.

### 1.2 Nguyên tắc thiết kế
1. **Ưu tiên sự đơn giản:** Không over-engineer, không làm thành hệ thống SaaS nhiều người dùng phức tạp.
2. **Không mất mát dữ liệu:** Mọi thao tác xóa giao dịch đều là **xóa mềm (soft-delete)** gán cờ `deleted = true`.
3. **Tiền tệ:** Luôn sử dụng **VNĐ (₫)**, định dạng số nguyên (không có phần thập phân).
4. **Ngôn ngữ:** Giao diện 100% Tiếng Việt thân thiện, code biến/hàm viết bằng Tiếng Anh chuẩn mực.

---

## 2. CẤU TRÚC CƠ SỞ DỮ LIỆU (GOOGLE SHEETS SCHEMA)

Google Spreadsheet có các bảng danh mục/cấu hình và dữ liệu giao dịch. Từ v2.1.0, sau chuyển đổi, chi tiết nằm trong `Transactions_YYYY`, báo cáo đọc `MonthlySummary`. Bảng `Transactions` gốc được giữ để đối chiếu, không dùng cho giao dịch mới.

### 2.1 Sheet `Transactions` (Quản lý thu chi)
Lưu toàn bộ lịch sử các khoản thu và chi:
- `id` (string): Khóa chính dạng UUID ngắn (ví dụ: `tx_a1b2c3d4e5f60718`).
- `date` (string): Ngày giao dịch định dạng `YYYY-MM-DD`.
- `type` (string): Loại giao dịch, chỉ nhận 2 giá trị: `expense` (chi tiêu) hoặc `income` (thu nhập).
- `amount` (number): Số tiền (số nguyên dương > 0).
- `category_id` (string): Mã danh mục tương ứng trong sheet Categories.
- `member_id` (string): Mã thành viên thực hiện (`husband` hoặc `wife`).
- `account_id` (string): Mã tài khoản nguồn tiền (`cash`, `bank_husband`, `bank_wife`, `shared_bank`).
- `note` (string): Ghi chú giao dịch.
- `created_at` (string): Thời điểm tạo (ISO 8601).
- `updated_at` (string): Thời điểm sửa đổi gần nhất (ISO 8601).
- `deleted` (boolean): Cờ xóa mềm (`true`/`false`).

### 2.2 Sheet `Categories` (Danh mục thu chi)
- `id` (string): Khóa chính (ví dụ: `food`, `home`, `salary`...).
- `name` (string): Tên hiển thị tiếng Việt (Ăn uống, Nhà cửa, Tiền lương...).
- `type` (string): `expense` hoặc `income`.
- `icon` (string): Tên icon Lucide tương ứng (Utensils, Home, Car, Briefcase...).
- `sort_order` (number): Thứ tự sắp xếp hiển thị.
- `active` (boolean): Trạng thái hoạt động (`true`/`false`).

### 2.3 Sheet `Budgets` (Hạn mức ngân sách hàng tháng)
- `id` (string): Khóa chính dạng `b_{year}_{month}_{category_id}`.
- `year` (number): Năm áp dụng.
- `month` (number): Tháng áp dụng (1 - 12).
- `category_id` (string): Mã danh mục chi tiêu được áp hạn mức.
- `amount` (number): Số tiền hạn mức tối đa cho danh mục trong tháng.
- `created_at` (string): Thời điểm tạo (ISO 8601).
- `updated_at` (string): Thời điểm cập nhật (ISO 8601).

### 2.4 Sheet `Members` (Thành viên gia đình)
Gồm 2 thành viên mặc định:
1. `husband` - Tên hiển thị: **Chồng** (Role: `owner`, Active: `true`)
2. `wife` - Tên hiển thị: **Vợ** (Role: `member`, Active: `true`)

### 2.5 Sheet `Accounts` (Tài khoản thanh toán)
- `cash`: Tiền mặt
- `bank_husband`: Ngân hàng Chồng
- `bank_wife`: Ngân hàng Vợ
- `shared_bank`: Tài khoản chung

### 2.6 Sheet `Settings` (Cài đặt hệ thống dạng Key - Value)
- `family_name`: Sổ Chi Tiêu Gia Đình
- `currency`: VND
- `timezone`: Asia/Bangkok
- `locale`: vi-VN
- `schema_version`: 1

---

## 3. KIẾN TRÚC & CÔNG NGHỆ (TECH STACK)

```
┌─────────────────────────────────────────────────────────────┐
│                       CLIENT (PWA)                          │
│     React 18 + TypeScript + Vite + Tailwind CSS             │
│   HashRouter (chống 404) • Lucide Icons • Mobile-First      │
└──────────────────────────────┬──────────────────────────────┘
                               │
               Content-Type: text/plain;charset=utf-8
               (Tránh CORS preflight OPTIONS request)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND WEB APP API                      │
│                  Google Apps Script (V8)                    │
│   doGet / doPost Router • LockService (chống xung đột ghi)  │
│   File gộp duy nhất: apps-script/Code_AllInOne.gs          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE TRUNG TÂM                      │
│            Google Sheets (6 Sheets chuẩn hóa)               │
│  Transactions • Categories • Budgets • Members • Settings   │
└─────────────────────────────────────────────────────────────┘
```

### 3.1 Client API Dual-Mode (`src/api/client.ts`)
- Kiểm tra `localStorage.getItem('fam_exp_api_url')`:
  - **Nếu có:** Chuyển sang **Live Mode** gửi HTTP POST lên Google Apps Script Web App.
  - **Nếu chưa có:** Chạy **Mock Local Mode** lưu vào `localStorage` của trình duyệt. Ứng dụng luôn chạy mượt mà ngay cả khi mất mạng.

### 3.2 Cơ chế gọi API không bị lỗi CORS
Google Apps Script sẽ chặn request nếu trình duyệt gửi preflight `OPTIONS` (khi dùng `Content-Type: application/json`). Do đó, `client.ts` luôn gửi:
```typescript
headers: { 'Content-Type': 'text/plain;charset=utf-8' }
```
Cách này đảm bảo request được gửi trực tiếp và trả về JSON thành công 100%.

### 3.3 Chống xung đột đồng thời (Concurrency Control)
Trong `Transactions.gs`, mọi hành động Thêm/Sửa/Xóa đều được bọc trong khóa `LockService.getScriptLock()` với thời gian chờ 30 giây:
```javascript
const lock = LockService.getScriptLock();
lock.waitLock(30000);
try {
  // Thực hiện ghi/sửa dữ liệu an toàn
} finally {
  lock.releaseLock();
}
```
Nhờ đó, khi cả 2 vợ chồng cùng bấm lưu chi tiêu cùng một giây, dữ liệu vẫn được ghi nhận trọn vẹn, không bao giờ bị đè mất.

---

## 4. CÁC QUY TẮC NGHIỆP VỤ & THUẬT TOÁN

### 4.1 Tính toán tài chính tháng
- **Tổng thu (Total Income):** $\sum$ các giao dịch có `type === 'income'` và `deleted !== true` trong tháng.
- **Tổng chi (Total Expense):** $\sum$ các giao dịch có `type === 'expense'` và `deleted !== true` trong tháng.
- **Số dư còn lại (Balance):** `Tổng thu - Tổng chi`.
- **Tỷ lệ tiết kiệm (Savings Rate):** $\max\left(0, \text{round}\left(\frac{\text{Số dư}}{\text{Tổng thu}} \times 100\right)\right)$ (Nếu chưa có thu nhập thì tỷ lệ là 0%).
- **Tỷ lệ chi tiêu Chồng / Vợ:**
  $$\% \text{ Chồng} = \text{round}\left(\frac{\text{Tổng chi Chồng}}{\text{Tổng chi}} \times 100\right), \quad \% \text{ Vợ} = 100\% - \% \text{ Chồng}$$

### 4.2 Tính năng Tự Động Kế Thừa Hạn Mức Ngân Sách (Auto-Inherit)
- Hạn mức ngân sách được cấu hình theo từng danh mục.
- **Quy tắc kế thừa theo danh mục:** Mỗi danh mục dùng hạn mức được thiết lập gần nhất, không muộn hơn tháng đang xem. Chỉnh một danh mục không làm mất hạn mức của các danh mục khác.
- **Khi chỉnh sửa:** Hạn mức mới áp dụng từ tháng được chọn và tiếp tục cho các tháng sau, cho đến tháng có thiết lập mới hơn của chính danh mục đó. Không thay đổi hạn mức của các tháng trước.
- **Xóa ngân sách danh mục:** Trong hộp thoại chỉnh hạn mức, bấm nút xóa để ngừng áp dụng từ tháng đang chọn cho đến lần thiết lập mới hơn của danh mục đó. Lưu hạn mức 0 làm dấu ngừng kế thừa; không xóa danh mục hay giao dịch. Có thể đặt lại bằng nút thiết lập ngân sách.
- **Sửa nhanh:** Bấm trực tiếp vào ô ngân sách để mở hộp thoại với đúng danh mục và hạn mức hiện hành.
- Cả Tổng quan và Báo cáo dùng cùng quy tắc. Frontend lấy lịch sử ngân sách qua API hiện có nên không bắt buộc triển khai lại Apps Script để sử dụng cơ chế này.

### 4.3 Cảnh báo tiến độ ngân sách (3 cấp độ màu)
- **Bình thường (Màu xanh lá):** Đã tiêu $< 80\%$ hạn mức.
- **Cảnh báo (Màu vàng cam):** Đã tiêu từ $80\%$ đến $99\%$ hạn mức.
- **Vượt định mức (Màu đỏ hồng):** Đã tiêu $\ge 100\%$ hạn mức.

### 4.4 Cơ chế bảo mật bằng mã PIN gia đình
- Mã PIN mặc định được lưu cố định trong mã nguồn là **`192394`**.
- Mọi thiết bị mới khi mở web bắt buộc phải gõ đúng mã PIN này mới vào được giao diện chính.
- Mã PIN được lưu an toàn trong `localStorage` với key `family_access_pin`.
- Tuyệt đối không hiển thị bất kỳ dòng chữ gợi ý mật khẩu nào ra ngoài màn hình đăng nhập.

---

## 5. CẤU TRÚC THƯ MỤC MÃ NGUỒN

```
G:\Quản lý chi tiêu gia đình/
├── .github/workflows/
│   └── deploy.yml              # Quy trình tự động build & deploy lên GitHub Pages
├── apps-script/                # Toàn bộ mã nguồn Backend Google Apps Script
│   ├── Code_AllInOne.gs        # ⭐ File gộp toàn bộ (khuyên dùng copy 1 lần vào Apps Script)
│   ├── Code.gs                 # Điều hướng router doGet, doPost
│   ├── Setup.gs                # Hàm setupDatabase() tạo 6 sheet chuẩn
│   ├── Transactions.gs         # Xử lý CRUD giao dịch + LockService
│   ├── Categories.gs           # Lấy và cập nhật danh mục
│   ├── Budgets.gs              # Lấy, lưu và tự động kế thừa ngân sách
│   ├── Dashboard.gs            # Tổng hợp số liệu Dashboard và báo cáo
│   └── Utils.gs                # Hàm tiện ích (UUID, JSON response, map tiêu đề cột)
├── public/                     # Tài nguyên PWA & Hình ảnh
│   ├── apple-touch-icon.png    # Icon 3D cho màn hình chính iPhone (180x180)
│   ├── icon-192.png            # Icon 3D chuẩn Android PWA (192x192)
│   ├── icon-512.png            # Icon 3D splash screen Android (512x512)
│   ├── favicon.png             # Favicon tab trình duyệt
│   ├── manifest.json           # Khai báo Web App PWA Manifest (có cache buster ?v=2)
│   └── sw.js                   # Service Worker v2 (quản lý bộ nhớ đệm và kích hoạt offline)
├── src/                        # Mã nguồn ứng dụng React + TypeScript
│   ├── api/
│   │   ├── client.ts           # ApiClient kết nối Google Apps Script & LocalStorage
│   │   └── mockData.ts         # Dữ liệu ban đầu (danh mục mẫu, thành viên, tài khoản)
│   ├── components/
│   │   ├── budgets/            # SetBudgetModal.tsx (Hộp thoại đặt hạn mức)
│   │   ├── categories/         # CategoryManagerModal.tsx (Quản lý danh mục)
│   │   ├── layout/             # Header.tsx, BottomNav.tsx, AppLayout.tsx
│   │   └── transactions/       # EditTransactionModal.tsx (Sửa giao dịch)
│   ├── context/
│   │   └── AuthContext.tsx      # Quản lý phiên đăng nhập, PIN (192394), chọn Chồng/Vợ
│   ├── pages/
│   │   ├── DashboardPage.tsx   # Trang 1: Tổng quan số dư, tiến độ ngân sách, Top chi tiêu
│   │   ├── TransactionsPage.tsx# Trang 2: Danh sách giao dịch, bộ lọc đa chiều
│   │   ├── AddTransactionPage.tsx # Trang 3: Nhập giao dịch nhanh (+50k, +100k, +500k...)
│   │   ├── ReportsPage.tsx     # Trang 4: Báo cáo xu hướng 6 tháng & Chi tiết ngân sách
│   │   ├── SettingsPage.tsx    # Trang 5: Cài đặt Google Sheet, đổi mã PIN, sao lưu CSV/JSON
│   │   └── LoginPage.tsx       # Màn hình đăng nhập mã PIN gia đình
│   ├── types/                  # Định nghĩa TypeScript toàn cục
│   └── utils/                  # Hàm format tiền tệ VNĐ, ngày tháng
├── index.html                  # Gốc HTML (tích hợp PWA meta tags, viewport-fit=cover)
├── vite.config.ts              # Cấu hình Vite (base: './' chạy chuẩn trên GitHub Pages)
├── package.json                # Quản lý dependencies (React 18, Vite 6, Tailwind 3)
└── README.md                   # Tài liệu hướng dẫn duy nhất của dự án (File này)
```

---

## 6. QUY TRÌNH PHÁT TRIỂN & CẬP NHẬT LÊN WEB

> [!IMPORTANT]
> ### ⚠️ QUY TẮC BẮT BUỘC: TĂNG SỐ PHIÊN BẢN (VERSION BUMP)
> **Mỗi khi có bất kỳ chỉnh sửa, sửa lỗi hay thêm tính năng nào cho dự án, BẮT BUỘC PHẢI TĂNG SỐ PHIÊN BẢN:**
> 1. Mở file [`src/version.ts`](file:///G:/Quản%20lý%20chi%20tiêu%20gia%20đình/src/version.ts), tăng số phiên bản (ví dụ: `v2.0.1` ➔ `v2.0.2` hoặc `v2.1.0`).
> 2. Cập nhật trường `"version"` tương ứng trong [`package.json`](file:///G:/Quản%20lý%20chi%20tiêu%20gia%20đình/package.json).
> 
> Dòng chữ ở chân trang Cài đặt (`Sổ Chi Tiêu Gia Đình v...`) sẽ tự động đọc từ file này để hiển thị. Điều này giúp người dùng dễ dàng kiểm tra trên điện thoại/máy tính xem thiết bị đã nhận được bản cập nhật mới nhất hay chưa!

Bất kỳ thay đổi nào về giao diện hoặc tính năng, bạn thực hiện theo các bước sau:

### Bước 1: Khởi chạy môi trường thử nghiệm ở máy
```bash
# Mở thư mục dự án
cd "G:\Quản lý chi tiêu gia đình"

# Chạy server thử nghiệm nội bộ
npm run dev
```
Trình duyệt mở tại: [http://localhost:3000](http://localhost:3000)

### Bước 2: Kiểm tra bản build
Trước khi đẩy code, hãy đảm bảo code không có lỗi TypeScript:
```bash
npm run build
```
Nếu xuất hiện thông báo `✓ built in ...s` là hợp lệ.

### Bước 3: Đẩy lên GitHub (Tự động cập nhật Web sau 30 giây)
```bash
git add .
git commit -m "Mô tả nội dung bạn vừa thay đổi"
git push origin main
```
Sau khi push, GitHub Actions sẽ tự động biên dịch và cập nhật trang web online:  
👉 **`https://quang12392.github.io/quan-ly-chi-tieu/`**

---

## 7. HƯỚNG DẪN CẬP NHẬT BACKEND (GOOGLE APPS SCRIPT)

Nếu bạn có điều chỉnh logic backend hoặc muốn triển khai lại từ đầu:

1. Mở file [apps-script/Code_AllInOne.gs](file:///G:/Quản%20lý%20chi%20tiêu%20gia%20đình/apps-script/Code_AllInOne.gs).
2. Nhấn `Ctrl + A` > `Ctrl + C` để copy toàn bộ nội dung file này.
3. Mở Google Sheets của bạn > **Tiện ích mở rộng (Extensions)** > **Apps Script**.
4. Chọn file `Code.gs`, xóa nội dung cũ và dán toàn bộ mã mới vào > Nhấn biểu tượng 💾 **Lưu (Save)**.
5. Nếu là lần đầu: Chọn hàm **`setupDatabase`** và bấm **Chạy (Run)** để tạo 6 Sheet.
6. Cập nhật bản Web App:
   - Bấm nút xanh **Triển khai (Deploy)** > **Quản lý bản triển khai (Manage deployments)**.
   - Bấm biểu tượng **Cây bút chì (Chỉnh sửa)**.
   - Tại mục **Phiên bản**, chọn: **`Phiên bản mới` (New version)**.
   - Bấm nút **Triển khai (Deploy)**.

---

## 8. CÀI ĐẶT LÊN ĐIỆN THOẠI (PWA)

### Trên iPhone (Trình duyệt Safari):
1. Mở link: `https://quang12392.github.io/quan-ly-chi-tieu/`
2. Bấm vào nút **Chia sẻ** (biểu tượng ô vuông có mũi tên hướng lên $\boxed{\uparrow}$ ở đáy màn hình).
3. Cuộn xuống chọn **"Thêm vào MH chính"** (Add to Home Screen) > Bấm **Thêm**.

### Trên Android (Trình duyệt Google Chrome):
1. Mở link: `https://quang12392.github.io/quan-ly-chi-tieu/`
2. Bấm vào nút menu **3 chấm** `⋮` ở góc trên cùng bên phải.
3. Chọn **"Cài đặt ứng dụng"** (Install app) hoặc **"Thêm vào màn hình chính"**.

Icon ứng dụng 3D sẽ xuất hiện ngay ngoài màn hình điện thoại, bấm mở toàn màn hình mượt mà như một ứng dụng native tải từ Store!


## 9. Lưu trữ dài hạn và hiệu năng (v2.1.0)

- `Transactions_YYYY`: tự tạo theo năm giao dịch. Lịch sử mặc định tải tháng được chọn, tối đa 100 giao dịch/lượt; tìm kiếm và bộ lọc được thực hiện trước phân trang. “Tất cả” đọc các năm từ mới về cũ cho tới đủ một trang. Các tổng hiển thị trong Lịch sử là tổng của các giao dịch đã tải.
- `MonthlySummary`: 12 dòng/năm; tổng thu/chi, số giao dịch, tổng theo danh mục và thành viên (JSON). Báo cáo gộp tháng đang xem, tháng trước, 12 tháng và so sánh các năm trong một API. Khi bảng tổng hợp đã cập nhật, Báo cáo không đọc chi tiết năm cũ.
- Thêm/sửa/xóa đánh dấu năm liên quan cần tính lại; lần đọc báo cáo tiếp theo tính lại các năm này, rồi dùng bảng tổng hợp. Tổng quan đọc thêm tối đa 10 kết quả giao dịch gần đây của tháng. Việc tính lại vẫn đọc chi tiết của năm bị ảnh hưởng, không có chỉ mục SQL trong Google Sheets.
- Sửa ngày sang năm khác được ghi sang bảng đích và xóa mềm bản ở năm cũ. Ý định ghi được lưu trước; nếu bị gián đoạn, lần gọi API tiếp theo tiếp tục thao tác để tránh tính trùng hoặc mất giao dịch.
- Danh mục/ngân sách dùng bộ nhớ đệm trong phiên tối đa 15 giây, hủy sau thay đổi. Bản xem trước Tổng quan được lưu trên thiết bị theo mục 9.4, luôn ghi rõ trạng thái và cập nhật lại khi mở. Hai thiết bị nhận dữ liệu mới khi mở/tải lại màn hình; chưa có cập nhật đẩy thời gian thực.
- Khi danh sách đang phân trang mà dữ liệu thay đổi, app yêu cầu tải lại thay vì ghép trang từ hai thời điểm khác nhau.

### 9.1 Kích hoạt trên Google Apps Script

1. Lưu bản sao mã backend đang chạy. Dán `apps-script/Code_AllInOne.gs` vào tệp mã chính, lưu.
2. **Cập nhật deployment đang dùng lên phiên bản mới trước khi chuyển dữ liệu**, giữ nguyên URL. Trước chuyển đổi, backend mới vẫn đọc bảng Transactions cũ.
3. Chạy `migrateToYearlyStorage` từ trình chỉnh sửa Apps Script. Hàm tạo bản sao toàn bộ spreadsheet trên Drive trước khi ghi bảng mới; kiểm tra ID/ngày/số tiền/thành viên, đối chiếu từng trường giao dịch và toàn bộ dữ liệu bằng SHA-256 rồi mới bật storage_version=2. Nguồn Transactions gốc không bị xóa.
4. Nếu ngắt giữa chừng, chạy lại hàm. Bản sao lưu không tạo lặp; dữ liệu nguồn phải còn nguyên và bản sao theo năm phải khớp. Nếu không khớp, hàm dừng thay vì ghi đè. Nếu còn trạng thái chuyển đổi dở, nhập giao dịch qua API được tạm chặn để bảo vệ nguồn.
5. Hàm onEdit gắn với bảng tính đánh dấu báo cáo cần tính lại khi sửa trực tiếp, không cần cấp quyền Drive hoặc quyền tạo trigger bổ sung. App cũng kiểm tra số dòng của từng năm để phát hiện thêm/xóa dòng. Khi sửa ngày sang năm khác trực tiếp trong bảng, trigger chuyển giao dịch sang năm tương ứng. Trigger không chạy tức thời; nếu cần đối chiếu ngay, dùng Cài đặt → Báo cáo → Tùy chọn báo cáo → Tính lại báo cáo cho năm liên quan.
6. Kiểm tra API storageStatus trả storage_version=2, kiểm tra Tổng quan và Báo cáo khớp số tiền trước chuyển đổi.

Không chỉnh bảng `Transactions` gốc sau chuyển đổi vì đây là bản đối chiếu. Không chỉnh tay MonthlySummary. Việc thay đổi bằng API ngoài ứng dụng có thể không kích hoạt trigger Google; phải dùng Tính lại báo cáo. Đổi cấu trúc cột, ID hoặc thành viên không hợp lệ sẽ làm kiểm tra dữ liệu báo lỗi, cần sửa dữ liệu gốc trước khi tính lại. Giữ mã ID duy nhất, không sao chép giao dịch thành dòng mới bằng tay.

### 9.2 Sao lưu và phục hồi

- Link bản sao trước chuyển đổi được lưu trong Script Properties. Từ v2.1.2, giao diện không hiển thị link này; bản sao trên Drive vẫn được giữ nguyên.
- Mục Cài đặt → Báo cáo được rút gọn, chức năng Tính lại báo cáo nằm trong phần Tùy chọn báo cáo mặc định thu gọn.
- Nút JSON khi kết nối Sheets xuất dữ liệu Sheets thực tế; không xuất nhầm LocalStorage. CSV xuất giao dịch còn hiệu lực ở mọi năm. Xuất toàn bộ là thao tác chủ động có thể đọc nhiều dữ liệu, không diễn ra khi mở app.
- Nhập JSON chỉ dành cho chế độ nội bộ. Với Sheets, phục hồi từ bản sao Drive và liên kết lại backend; không nhập đè dữ liệu cloud bằng thao tác nhập nội bộ.
- Không hạ deployment xuống mã cũ sau khi đã chuyển dữ liệu: mã cũ chỉ biết bảng Transactions và sẽ bỏ sót giao dịch mới theo năm. Nếu cần phục hồi, dùng bản sao đầy đủ hoặc sửa backend mới.

### 9.3 Kiểm tra

Chạy `npm run test:storage` và `npm run build`. Bộ kiểm thử dùng mô phỏng SpreadsheetApp/PropertiesService/LockService trên 30.000 giao dịch trong 7 năm, kiểm tra chuyển đổi lặp, lỗi ghi giữa chừng, chuyển năm, xóa mềm, dữ liệu cũ, dấu thời gian, phân trang và số lần đọc bảng. Thời gian đo trong test là trên máy, **không phải benchmark mạng hoặc máy chủ Google**. Bộ kiểm thử client xác nhận API mới dùng một gói báo cáo, backend cũ chỉ gọi chi tiết một lần thay vì 14 lần, và chế độ nội bộ vẫn hoạt động.


### 9.4 Mở nhanh Tổng quan (v2.1.3)

- Tổng quan gọi trực tiếp một API trả số liệu và danh mục, bỏ yêu cầu kiểm tra storageStatus trước và bỏ yêu cầu danh mục riêng trên backend mới.
- Lưu tối đa 6 bản xem trước theo tháng trên thiết bị, tách theo URL kết nối và thành viên đăng nhập. Mở lại đúng tháng sẽ hiển thị bản gần nhất ngay trong lúc tải số liệu mới, kèm trạng thái “Đang cập nhật” và thời điểm cập nhật. Lần đầu hoặc tháng chưa có bản lưu vẫn chờ mạng.
- Bản lưu chỉ dùng để hiển thị, không bao giờ gửi thay thế dữ liệu Google Sheets. Thêm/sửa/xóa giao dịch hoặc thay ngân sách vô hiệu hóa bản lưu. Đăng xuất, đổi kết nối cũng xóa bản lưu; phản hồi đọc bắt đầu trước một thao tác ghi không được ghi lại vào cache.
- Sau khi thêm giao dịch, Lịch sử lấy lại dữ liệu và cập nhật Tổng quan từ máy chủ. Nếu lưu đã thành công nhưng đọc báo cáo thất bại, hiển thị “Đã lưu giao dịch, chưa cập nhật được báo cáo”; nút cập nhật chỉ gửi yêu cầu đọc, không gửi lại giao dịch.
- Khi quay lại app từ nền hoặc có mạng trở lại, Tổng quan cập nhật ngầm. Không phải đồng bộ đẩy thời gian thực: giao dịch vừa nhập trên máy còn lại có thể chưa hiện trên bản xem trước cho đến khi tải xong. Luôn có nút Cập nhật và thời điểm đồng bộ để người dùng nhận biết.
- Yêu cầu đọc có giới hạn chờ 20 giây; ghi 45 giây. Nếu ghi hết thời gian chờ, kết quả có thể đã được ghi ở máy chủ: app yêu cầu kiểm tra Lịch sử trước khi lưu lại và không tự gửi lại giao dịch.
- Chạy `npm run test:startup` để kiểm tra một yêu cầu mở Tổng quan, phân tách cache, hai máy nhập nối tiếp, đọc cũ hoàn tất sau ghi, lỗi mạng, timeout và bộ nhớ trình duyệt đầy.


### 9.5 Mở nhanh Giao dịch và Báo cáo (v2.1.4)

- Hai tab hiển thị bản gần nhất trên máy trước, cập nhật ngầm sau, giống Tổng quan. Hiển thị trạng thái, thời điểm cập nhật 24 giờ và nút Cập nhật. Lần đầu hoặc bộ lọc/tháng chưa có bản lưu vẫn cần chờ máy chủ.
- Bản xem trước được tách theo kết nối, thành viên, tháng và toàn bộ bộ lọc (ngày, loại thu/chi, thành viên, danh mục, tìm kiếm). Lưu tối đa 8 bản cho hai tab; lỗi/quota bộ nhớ không làm hỏng việc tải dữ liệu.
- Giao dịch chỉ lưu trang đầu tối đa 100 kết quả. Không dùng con trỏ cũ để Xem thêm trước khi xác nhận lại trang đầu từ máy chủ; sau cập nhật thay thế danh sách cũ, không nối trùng trang.
- Cùng vô hiệu hóa bản lưu với Tổng quan khi ghi dữ liệu, đổi kết nối, đăng xuất. Phản hồi đến muộn sau thao tác ghi không được lưu lại. Nếu tải mới thất bại, giữ bản xem trước cùng thông báo lỗi và nút thử lại.
- Tự cập nhật khi mở tab, đổi tháng/bộ lọc, quay lại app từ nền hoặc có mạng trở lại. **Không có lịch đồng bộ 60 giây hay bất kỳ chu kỳ định kỳ nào.** Ô tìm kiếm chờ 250ms để giảm yêu cầu khi đang gõ; đây không phải lịch đồng bộ.
- Kiểm thử: `npm run test:pages`, `npm run test:startup`, `npm run test:storage`, `npm run build`.

### 9.6 Danh mục trong form Thêm giao dịch (v2.1.5)

- Danh mục nhận được từ Tổng quan, Giao dịch hoặc Báo cáo được lưu làm bản xem trước theo kết nối và thành viên đăng nhập. Khi mở form bằng nút `+` hoặc “Thêm giao dịch thu / chi”, danh sách gần nhất hiển thị ngay rồi được cập nhật từ Google Sheets ở nền.
- Nếu lần tải mới bị chậm hoặc lỗi mạng, form tiếp tục dùng danh mục đã tải trước đó và có nút **Thử lại**. Nếu thiết bị chưa từng tải danh mục, ô chọn hiển thị rõ trạng thái đang tải hoặc lỗi thay vì để trống.
- Khi chuyển Khoản Chi / Khoản Thu, lựa chọn hiện tại chỉ được giữ nếu còn hợp lệ; nếu không, form tự chọn danh mục đang bật đầu tiên của đúng loại. Phản hồi danh mục sai cấu trúc không được ghi vào bản xem trước.

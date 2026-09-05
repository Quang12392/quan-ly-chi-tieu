# FAMILY EXPENSE MANAGER – AI DEVELOPMENT SPECIFICATION

> **Mục đích của file này:** Đây là tài liệu bàn giao cho một AI lập trình khác để xây dựng hoàn chỉnh ứng dụng quản lý thu chi gia đình dành riêng cho **2 vợ chồng**.  
> AI nhận file này cần ưu tiên tạo ra **sản phẩm chạy được**, đơn giản, ổn định, miễn phí hoặc gần như miễn phí để vận hành lâu dài; không biến dự án thành bài học lập trình cho người dùng.

---

# 1. VAI TRÒ CỦA AI NHẬN DỰ ÁN

Bạn là Senior Full-stack Developer kiêm Product Engineer.

Nhiệm vụ:

1. Đọc toàn bộ tài liệu này trước khi viết code.
2. Xây ứng dụng theo từng milestone nhưng luôn giữ khả năng chạy được sau mỗi milestone.
3. Ưu tiên giải pháp đơn giản, ít dependency, dễ bảo trì.
4. Không over-engineer cho quy mô chỉ 2 người dùng.
5. Nếu có một chi tiết nhỏ chưa được mô tả, tự chọn phương án hợp lý nhất thay vì dừng dự án để hỏi.
6. Chỉ hỏi người dùng đối với thông tin bắt buộc không thể tự suy ra, ví dụ tên hiển thị mong muốn hoặc tài khoản được cấp quyền.
7. Trước khi kết thúc mỗi milestone phải kiểm tra chức năng chính và sửa lỗi cơ bản.
8. Viết README đủ rõ để một AI/developer khác có thể tiếp tục bảo trì.

---

# 2. MỤC TIÊU SẢN PHẨM

Xây một ứng dụng web quản lý tài chính gia đình cho đúng **hai vợ chồng**.

Ứng dụng cần giúp hai người:

- Ghi khoản chi trong vài giây.
- Ghi khoản thu.
- Xem toàn bộ giao dịch của gia đình.
- Biết ai đã chi khoản nào.
- Phân loại chi tiêu theo danh mục.
- Xem tổng thu, tổng chi và số dư theo tháng.
- Đặt ngân sách theo danh mục.
- Xem báo cáo đơn giản.
- Dùng chung dữ liệu trên điện thoại và máy tính.
- Có khả năng backup/export để không bị phụ thuộc hoàn toàn vào hệ thống.

Đây là **ứng dụng cá nhân**, KHÔNG phải SaaS cho nhiều gia đình.

---

# 3. NGUYÊN TẮC THIẾT KẾ

Thứ tự ưu tiên:

1. Dễ sử dụng.
2. Không mất dữ liệu.
3. Bảo mật đủ tốt cho ứng dụng gia đình.
4. Miễn phí vận hành lâu dài.
5. Dễ backup.
6. Dễ sửa chữa / chuyển hệ thống sau này.
7. Giao diện đẹp nhưng tối giản.

Không ưu tiên:

- Microservice.
- AI/LLM.
- OCR hóa đơn.
- Chatbot.
- Hệ thống kế toán phức tạp.
- Quyền nhiều cấp.
- Multi-tenant.
- Social login phức tạp nếu không cần thiết.

---

# 4. STACK KỸ THUẬT ĐỀ XUẤT

## 4.1 Frontend

Ưu tiên:

- React
- TypeScript
- Vite
- React Router
- CSS đơn giản hoặc Tailwind CSS

Có thể dùng thư viện biểu đồ nhẹ như Recharts nếu cần.

Ứng dụng phải responsive và ưu tiên giao diện mobile-first.

Ứng dụng nên hỗ trợ PWA nếu triển khai không làm tăng đáng kể độ phức tạp.

Mục tiêu là người dùng có thể mở bằng Chrome/Safari và thêm shortcut lên màn hình điện thoại như một app.

---

# 5. BACKEND VÀ DATABASE

## 5.1 Database chính

Sử dụng **Google Sheets**.

Không cho frontend ghi trực tiếp vào Google Sheets.

Kiến trúc:

```text
Browser / PWA
     |
     | HTTPS JSON
     v
Google Apps Script Web App
     |
     v
Google Sheets
```

Google Apps Script đóng vai trò backend/API.

---

# 6. CẤU TRÚC GOOGLE SHEETS

Tạo một spreadsheet riêng cho ứng dụng.

Tên gợi ý:

`Family Finance Database`

Spreadsheet gồm các worksheet sau:

```text
Transactions
Categories
Members
Accounts
Budgets
Settings
```

Không tạo sheet theo từng tháng.

---

# 7. SHEET: Transactions

Đây là bảng quan trọng nhất.

Các cột:

| Field | Kiểu | Ý nghĩa |
|---|---|---|
| id | string | UUID duy nhất |
| date | YYYY-MM-DD | ngày giao dịch |
| type | income / expense | thu hoặc chi |
| amount | number | số tiền nguyên VND |
| category_id | string | ID danh mục |
| member_id | string | người thực hiện giao dịch |
| account_id | string | tài khoản / nguồn tiền |
| note | string | ghi chú |
| created_at | ISO datetime | thời gian tạo |
| updated_at | ISO datetime | thời gian cập nhật |
| deleted | boolean | soft delete |

Ví dụ:

```text
id: tx_550e8400
 date: 2026-09-04
 type: expense
 amount: 250000
 category_id: food
 member_id: husband
 account_id: cash
 note: Ăn tối
 created_at: 2026-09-04T19:22:10+07:00
 updated_at: 2026-09-04T19:22:10+07:00
 deleted: false
```

Không lưu số tiền theo chuỗi như `250.000đ`.

Phải lưu:

```text
250000
```

Format tiền chỉ thực hiện ở UI.

---

# 8. SHEET: Categories

Các cột:

```text
id
name
type
icon
sort_order
active
```

Dữ liệu mặc định cho EXPENSE:

```text
food          | Ăn uống
home          | Nhà cửa
transport     | Đi lại
children      | Con cái
shopping      | Mua sắm
health        | Sức khỏe
utilities     | Điện nước / Internet
entertainment | Giải trí
education     | Học tập
family        | Gia đình
other_expense | Khác
```

Dữ liệu mặc định cho INCOME:

```text
salary        | Lương
bonus         | Thưởng
business      | Kinh doanh
side_income   | Thu nhập thêm
other_income  | Thu khác
```

Người dùng phải có khả năng:

- thêm category;
- sửa tên category;
- ẩn category;

Không hard-code toàn bộ category vào frontend.

---

# 9. SHEET: Members

Chỉ cần hai thành viên.

Các cột:

```text
id
name
email
role
active
```

Ví dụ:

```text
husband | Chồng | ... | owner  | true
wife    | Vợ    | ... | member | true
```

Hai thành viên xem cùng một database.

Không cần quyền phức tạp giữa hai người.

---

# 10. SHEET: Accounts

Dùng để biết tiền đi/đến từ nguồn nào.

Các cột:

```text
id
name
type
opening_balance
active
sort_order
```

Account mặc định:

```text
cash          | Tiền mặt
bank_husband  | Ngân hàng chồng
bank_wife     | Ngân hàng vợ
shared_bank   | Tài khoản chung
```

Cho phép thêm/sửa/ẩn account.

Trong MVP, account có thể là optional nếu việc triển khai làm chậm đáng kể sản phẩm.

---

# 11. SHEET: Budgets

Các cột:

```text
id
year
month
category_id
amount
created_at
updated_at
```

Ví dụ:

```text
budget_01 | 2026 | 9 | food | 5000000
```

Không cần ngân sách hằng ngày.

---

# 12. SHEET: Settings

Key-value format:

```text
key | value
```

Ví dụ:

```text
family_name      | Gia đình tôi
currency         | VND
timezone         | Asia/Bangkok
locale           | vi-VN
schema_version   | 1
```

---

# 13. API BACKEND

Google Apps Script phải cung cấp API JSON thống nhất.

Không để frontend phụ thuộc vào cấu trúc cột vật lý quá chặt.

Ưu tiên một endpoint Web App xử lý action hoặc REST-like routing.

Ví dụ request:

```json
{
  "action": "createTransaction",
  "payload": {
    "date": "2026-09-04",
    "type": "expense",
    "amount": 250000,
    "category_id": "food",
    "member_id": "husband",
    "note": "Ăn tối"
  }
}
```

Ví dụ response thành công:

```json
{
  "ok": true,
  "data": {
    "id": "tx_xxxxx"
  }
}
```

Response lỗi:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_AMOUNT",
    "message": "Số tiền không hợp lệ"
  }
}
```

Không trả stack trace ra client.

---

# 14. CÁC API CẦN CÓ

Minimum:

```text
getBootstrapData
getTransactions
createTransaction
updateTransaction
deleteTransaction
getCategories
createCategory
updateCategory
getMembers
getAccounts
getBudgets
saveBudget
getDashboardSummary
```

Nếu Apps Script đơn giản hơn khi dùng một endpoint + `action`, có thể làm như vậy.

---

# 15. QUY TẮC GHI DỮ LIỆU

## Amount

- Integer.
- > 0.
- Currency mặc định VND.

## Date

Dùng format:

```text
YYYY-MM-DD
```

Không phụ thuộc locale trình duyệt khi lưu.

## ID

ID phải được backend tạo.

Có thể dùng UUID.

Không dùng row number làm ID.

## Update

Dùng ID tìm bản ghi.

## Delete

Ưu tiên soft delete:

```text
deleted = true
```

Không xóa row ngay.

---

# 16. CHỐNG GHI TRÙNG / RACE CONDITION

Khi Apps Script ghi dữ liệu phải cân nhắc hai người có thể thao tác cùng lúc.

Sử dụng `LockService` cho các thao tác ghi khi phù hợp.

Không dựa vào `getLastRow()+1` mà không lock nếu thao tác có nguy cơ cạnh tranh.

---

# 17. AUTHENTICATION / SECURITY

Ứng dụng chỉ dành cho hai tài khoản được cho phép.

AI triển khai phải lựa chọn cơ chế đơn giản nhưng không để bất kỳ ai có URL API cũng đọc/sửa dữ liệu.

Ưu tiên một trong các hướng an toàn và thực tế sau:

1. Google identity / Apps Script access phù hợp với hai Google Account; hoặc
2. cơ chế signed token/session do backend kiểm soát;
3. whitelist hai email được phép truy cập.

Không được:

- hard-code password thật trong frontend;
- đặt secret trong Git repository;
- để spreadsheet public;
- để API trả toàn bộ dữ liệu cho request không xác thực.

Nếu triển khai PWA frontend bên ngoài Apps Script và gặp giới hạn auth/CORS, AI phải chọn phương án thực tế nhất nhưng vẫn giữ nguyên yêu cầu chỉ hai người được truy cập.

Tài liệu README phải giải thích rõ mô hình auth đã chọn.

---

# 18. MÀN HÌNH: LOGIN

Yêu cầu:

- Tối giản.
- Chỉ hai người có quyền sử dụng.
- Sau khi đăng nhập, giữ session hợp lý.
- Có nút đăng xuất.

Không cần đăng ký tài khoản công khai.

Không có chức năng “Create account”.

---

# 19. MÀN HÌNH: DASHBOARD

Đây là màn hình mặc định sau login.

Hiển thị tháng đang chọn.

Ví dụ:

```text
THÁNG 9/2026

Thu nhập       35.000.000 ₫
Chi tiêu       18.450.000 ₫
Còn lại        16.550.000 ₫
```

Sau đó hiển thị:

- tổng chi theo category;
- top 5 category chi nhiều nhất;
- ngân sách đã dùng;
- giao dịch gần đây.

Có nút nổi hoặc nút rõ ràng:

```text
+ Thêm giao dịch
```

---

# 20. THÊM GIAO DỊCH

Đây là flow quan trọng nhất của app.

Mục tiêu:

> Một giao dịch thông thường có thể nhập trong khoảng vài thao tác.

Form:

```text
[ CHI ] [ THU ]

Số tiền
[                         ]

Danh mục
[                         ]

Người thực hiện
[                         ]

Tài khoản
[                         ]

Ngày
[                         ]

Ghi chú
[                         ]

[ LƯU ]
```

UX:

- Focus ngay ô số tiền.
- Keyboard số trên mobile.
- Ngày mặc định hôm nay.
- Nhớ người thực hiện gần nhất trên thiết bị nếu thuận tiện.
- Sau save báo thành công.
- Không bắt nhập note.
- Không bắt nhập account trong MVP nếu account được đặt optional.

---

# 21. FORMAT TIỀN

UI hiển thị theo Việt Nam.

Ví dụ:

```text
1.966.000 ₫
20.000.000 ₫
```

Có thể dùng:

```javascript
new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
})
```

Nhưng UX nhập tiền phải thuận tiện.

Ví dụ người dùng gõ:

```text
250000
```

UI có thể hiển thị:

```text
250.000
```

Không lưu dấu phân cách vào database.

---

# 22. DANH SÁCH GIAO DỊCH

Hiển thị giao dịch theo ngày giảm dần.

Ví dụ:

```text
04/09/2026

🍜 Ăn tối                  -250.000 ₫
   Ăn uống · Chồng

🛒 Mua sữa                 -430.000 ₫
   Con cái · Vợ
```

Filter:

- tháng;
- thu/chi;
- category;
- member;

Search note là optional.

Click giao dịch mở chi tiết.

Cho phép:

- sửa;
- xóa.

Xóa phải có confirm.

---

# 23. BÁO CÁO

MVP report:

## Theo category

```text
Ăn uống       4.200.000 ₫
Nhà cửa       3.500.000 ₫
Con cái       3.000.000 ₫
```

Có thể có pie/donut/bar chart.

Chart phải là bổ trợ, không thay thế số liệu.

## So sánh tháng

Hiển thị:

```text
Chi tháng này
Chi tháng trước
Chênh lệch
```

Có thể bổ sung trend 6 tháng sau MVP.

---

# 24. NGÂN SÁCH

Người dùng chọn tháng và category.

Ví dụ:

```text
Ăn uống
Ngân sách: 5.000.000 ₫
Đã dùng:    4.200.000 ₫
Còn lại:      800.000 ₫
```

Progress bar.

Trạng thái:

```text
< 80%   bình thường
80–99%  cảnh báo
>=100%  vượt ngân sách
```

Không cần notification push trong version đầu.

---

# 25. SETTINGS

Có:

- Tên gia đình.
- Quản lý category.
- Quản lý account.
- Xem hai thành viên.
- Export dữ liệu.
- Thông tin app/version.

---

# 26. EXPORT VÀ BACKUP

Đây là yêu cầu quan trọng.

Người dùng phải có cách đưa dữ liệu ra khỏi app.

Ít nhất hỗ trợ:

```text
CSV
JSON
```

Ưu tiên export toàn bộ:

```text
transactions.csv
categories.csv
accounts.csv
budgets.csv
```

Hoặc một JSON:

```json
{
  "schema_version": 1,
  "exported_at": "...",
  "transactions": [],
  "categories": [],
  "accounts": [],
  "budgets": []
}
```

Thiết kế export để sau này có thể import/migrate sang database khác.

---

# 27. IMPORT / RESTORE

Không bắt buộc ở MVP đầu tiên.

Nhưng code/schema phải được thiết kế để việc thêm import JSON sau này khả thi.

Version tiếp theo nên hỗ trợ:

- validate file;
- preview;
- tránh duplicate;
- restore.

---

# 28. UI / UX

Phong cách:

- sạch;
- hiện đại;
- dễ đọc;
- thân thiện;
- không giống phần mềm kế toán doanh nghiệp.

Mobile-first.

Navigation mobile gợi ý:

```text
🏠 Tổng quan
📒 Giao dịch
➕ Thêm
📊 Báo cáo
⚙️ Cài đặt
```

Desktop có thể dùng sidebar.

Không nhồi quá nhiều thông tin trên một màn hình.

---

# 29. RESPONSIVE

Phải kiểm tra ít nhất:

```text
360px
390px
430px
768px
1280px
```

Không có horizontal scroll ngoài ý muốn.

Các nút chính phải dễ bấm bằng ngón tay.

---

# 30. PWA

Nếu phù hợp, cấu hình:

- manifest;
- app name;
- icons;
- theme;
- installable PWA.

Không cache API response tài chính theo cách có thể hiển thị dữ liệu cũ nguy hiểm.

Offline create transaction KHÔNG bắt buộc.

Nếu không có network, hiển thị thông báo rõ ràng.

---

# 31. PERFORMANCE

Quy mô dự kiến:

```text
2 users
5–30 transactions/day
~2.000–10.000 transactions/year
```

Google Sheets đủ cho quy mô này nhưng API không nên đọc toàn bộ sheet cho mọi request nếu dữ liệu đã lớn.

Cần:

- filter hợp lý;
- cache metadata như categories nếu phù hợp;
- hạn chế số lần Apps Script gọi Sheets API;
- batch reads/writes khi có thể.

Không tối ưu quá sớm nhưng tránh implementation rõ ràng kém hiệu quả.

---

# 32. QUERY TRANSACTIONS

API nên hỗ trợ:

```text
from
through
type
category_id
member_id
```

Ví dụ:

```text
2026-09-01 → 2026-09-30
```

Dashboard chỉ cần dữ liệu tháng tương ứng.

---

# 33. TIMEZONE

Mặc định:

```text
Asia/Bangkok
```

Ngày giao dịch do người dùng chọn và lưu dạng YYYY-MM-DD.

created_at / updated_at phải nhất quán timezone hoặc ISO timestamp.

Không để bug làm một giao dịch tối hôm nay nhảy sang ngày hôm sau do UTC conversion.

---

# 34. ERROR HANDLING

UI phải xử lý:

- mất mạng;
- API timeout;
- invalid input;
- lỗi server;
- unauthorized;
- giao dịch không tồn tại.

Không chỉ `console.log`.

Hiển thị thông báo tiếng Việt dễ hiểu.

Ví dụ:

```text
Không thể lưu giao dịch. Vui lòng kiểm tra kết nối mạng và thử lại.
```

---

# 35. VALIDATION

Frontend validation để UX tốt.

Backend validation là bắt buộc.

Không tin dữ liệu frontend.

Ví dụ create transaction:

- type ∈ {income, expense};
- amount > 0;
- date hợp lệ;
- category tồn tại;
- member tồn tại;
- note có giới hạn độ dài hợp lý.

---

# 36. LOGGING

Apps Script có log lỗi hợp lý.

Không log secret/token/password.

Nếu có error response, có thể tạo error ID để debug.

---

# 37. SOURCE CODE STRUCTURE

Gợi ý frontend:

```text
src/
  api/
  components/
  features/
    transactions/
    dashboard/
    budgets/
    reports/
    settings/
  hooks/
  pages/
  types/
  utils/
  App.tsx
  main.tsx
```

Apps Script:

```text
apps-script/
  Main.gs
  Auth.gs
  Transactions.gs
  Categories.gs
  Budgets.gs
  Sheets.gs
  Validation.gs
  Utils.gs
```

Không bắt buộc giữ chính xác nếu AI có cấu trúc tốt hơn.

---

# 38. TYPESCRIPT TYPES

Frontend phải có type rõ ràng.

Ví dụ:

```typescript
type TransactionType = 'income' | 'expense';

interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  memberId: string;
  accountId?: string;
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

Tránh `any` tràn lan.

---

# 39. LOCAL STATE

Không cần Redux nếu không thực sự cần.

Ưu tiên:

- React state;
- Context cho auth/global metadata;
- TanStack Query chỉ nếu giúp quản lý server state rõ rệt.

Không thêm dependency chỉ vì phổ biến.

---

# 40. ACCESSIBILITY

Tối thiểu:

- label cho input;
- button rõ nghĩa;
- contrast đủ;
- focus state;
- keyboard navigation cơ bản;
- không dùng icon làm nguồn thông tin duy nhất.

---

# 41. LANGUAGE

UI mặc định bằng tiếng Việt.

Ví dụ:

```text
Tổng quan
Giao dịch
Thu nhập
Chi tiêu
Thêm giao dịch
Danh mục
Ngân sách
Báo cáo
Cài đặt
```

Code variable/function dùng tiếng Anh.

Không dùng tên biến tiếng Việt không dấu trong source nếu không cần.

---

# 42. MILESTONE 1 — PROJECT FOUNDATION

AI cần thực hiện:

1. Tạo React + TypeScript project.
2. Thiết lập routing.
3. Tạo layout responsive.
4. Tạo Apps Script backend skeleton.
5. Tạo script khởi tạo spreadsheet/schema hoặc hướng dẫn setup chính xác.
6. Kết nối frontend với endpoint test.
7. Tạo README setup.

Acceptance:

```text
Frontend chạy.
Frontend gọi được backend.
Backend đọc được spreadsheet.
```

---

# 43. MILESTONE 2 — TRANSACTIONS MVP

Làm:

- thêm giao dịch;
- danh sách giao dịch;
- sửa;
- xóa;
- categories;
- members.

Acceptance:

Hai người có thể sử dụng app hằng ngày để ghi thu/chi.

---

# 44. MILESTONE 3 — DASHBOARD

Làm:

- tổng thu tháng;
- tổng chi tháng;
- số dư;
- chi theo category;
- giao dịch gần nhất.

Acceptance:

Số liệu dashboard phải khớp transactions.

---

# 45. MILESTONE 4 — BUDGET + REPORT

Làm:

- ngân sách category/tháng;
- progress;
- report;
- so sánh tháng trước.

---

# 46. MILESTONE 5 — BACKUP + HARDENING

Làm:

- export CSV/JSON;
- kiểm tra auth;
- error handling;
- responsive QA;
- PWA nếu thích hợp;
- cleanup code;
- README hoàn chỉnh.

---

# 47. NHỮNG TÍNH NĂNG KHÔNG ĐƯỢC TỰ Ý THÊM VÀO MVP

Không tự mở rộng sang:

- OCR hóa đơn;
- AI phân tích;
- kết nối ngân hàng;
- scraping SMS;
- ví điện tử;
- crypto;
- chứng khoán;
- kế toán kép;
- nhiều gia đình;
- hệ thống admin SaaS;
- subscription/payment.

Nếu code được thiết kế mở rộng tốt thì đủ.

---

# 48. TEST CASE QUAN TRỌNG

AI phải kiểm thử ít nhất các tình huống sau.

## Transaction

1. Thêm chi 250.000đ.
2. Thêm thu 20.000.000đ.
3. Sửa 250.000 → 300.000.
4. Xóa transaction.
5. Không cho lưu amount = 0.
6. Không cho lưu amount âm.
7. Không cho category không tồn tại.

## Dashboard

Cho dữ liệu:

```text
Thu: 20.000.000
Chi: 2.000.000
Chi: 3.000.000
```

Phải ra:

```text
Thu = 20.000.000
Chi = 5.000.000
Còn lại = 15.000.000
```

## Multi-user

Hai browser/device cùng thêm transaction gần nhau không được overwrite transaction của nhau.

## Date

Giao dịch ngày 31/08 không được tính sang tháng 09.

---

# 49. BACKUP DATABASE

Ngoài export trong app, README nên hướng dẫn người dùng:

- Google Sheet chính nằm ở đâu;
- cách tạo bản copy thủ công;
- cách tải xuống Excel nếu muốn;
- không chỉnh sửa tên header tùy tiện nếu Apps Script đang dựa vào schema.

Nếu có thể, backend nên map column bằng header name thay vì magic numeric index để dễ bảo trì.

---

# 50. VERSIONING DATABASE

Trong Settings lưu:

```text
schema_version = 1
```

Nếu sau này đổi schema, phải có migration hoặc backward-compatible logic.

Không âm thầm đổi header và làm hỏng dữ liệu cũ.

---

# 51. DEPLOYMENT

Mục tiêu deployment:

```text
Chi phí hàng tháng: 0đ hoặc gần 0đ
```

Frontend có thể deploy bằng một nền tảng static hosting free phù hợp.

Apps Script deploy dưới dạng Web App.

Google Sheets là datastore.

README phải ghi từng bước deploy cụ thể:

1. tạo spreadsheet;
2. tạo Apps Script project;
3. cấu hình ID spreadsheet;
4. cấu hình auth / allowed users;
5. deploy Web App;
6. lấy API URL;
7. cấu hình frontend env;
8. build frontend;
9. deploy frontend;
10. test production.

Không để bước quan trọng chỉ tồn tại trong trí nhớ của AI.

---

# 52. ENVIRONMENT VARIABLES

Frontend có thể có:

```text
VITE_API_URL=
```

Nếu có các public Google client identifiers phục vụ OAuth thì tổ chức theo env phù hợp.

Secret thật không được build vào frontend.

Apps Script secrets/config nhạy cảm nên dùng Script Properties khi phù hợp.

---

# 53. GIT

Repository không được chứa:

- password;
- access token;
- private key;
- credential file nhạy cảm;
- dữ liệu giao dịch thật của gia đình.

Tạo `.gitignore` đúng.

Dữ liệu mẫu phải là dữ liệu giả.

---

# 54. README BẮT BUỘC

README phải có:

```text
Project overview
Architecture
Tech stack
Folder structure
Local development
Google Sheet setup
Apps Script setup
Authentication setup
Environment variables
Deploy frontend
Deploy backend
Backup/export
Troubleshooting
```

README viết đủ để AI/developer mới đọc là tiếp tục được.

---

# 55. DEFINITION OF DONE

Ứng dụng chỉ được xem là hoàn thành version 1 khi:

- [ ] Hai người có thể đăng nhập hoặc được xác thực đúng.
- [ ] Người ngoài không được xem dữ liệu.
- [ ] Thêm khoản thu hoạt động.
- [ ] Thêm khoản chi hoạt động.
- [ ] Sửa giao dịch hoạt động.
- [ ] Xóa giao dịch hoạt động.
- [ ] Filter theo tháng hoạt động.
- [ ] Dashboard tính đúng tổng thu.
- [ ] Dashboard tính đúng tổng chi.
- [ ] Dashboard tính đúng số dư.
- [ ] Category hoạt động.
- [ ] Hiển thị ai là người chi.
- [ ] Ngân sách cơ bản hoạt động.
- [ ] Báo cáo category hoạt động.
- [ ] Export dữ liệu hoạt động.
- [ ] UI dùng tốt trên điện thoại.
- [ ] Reload trang không làm app hỏng.
- [ ] API error được xử lý.
- [ ] README deployment hoàn chỉnh.
- [ ] Không có secret thật trong source code.

---

# 56. CÁCH AI NÊN LÀM VIỆC VỚI NGƯỜI DÙNG

Người dùng muốn **AI làm app giúp**, không muốn biến quá trình này thành khóa học dài.

Do đó:

AI nên:

```text
Làm code → giải thích ngắn → hướng dẫn thao tác cần thiết → test → làm tiếp.
```

Không nên:

```text
Dừng mỗi file để giảng lý thuyết.
Bắt người dùng tự viết lại code.
Hỏi xác nhận cho từng chi tiết nhỏ.
```

Khi cần người dùng thao tác trên Google/hosting do AI không thể trực tiếp thao tác tài khoản, hãy đưa hướng dẫn chính xác từng bước và sau đó tiếp tục từ kết quả người dùng cung cấp.

---

# 57. ƯU TIÊN CỦA DỰ ÁN

Nếu phải lựa chọn giữa hai giải pháp, chọn giải pháp theo thứ tự:

```text
Đơn giản
↓
Ổn định
↓
An toàn
↓
Miễn phí
↓
Dễ backup
↓
Dễ bảo trì
↓
Mới đến tối ưu kỹ thuật cao
```

---

# 58. KHẢ NĂNG MIGRATION TRONG TƯƠNG LAI

Mặc dù version đầu dùng Google Sheets, kiến trúc frontend không được gắn chết vào Sheets.

Frontend chỉ giao tiếp với backend/API abstraction.

Mục tiêu là sau này có thể chuyển:

```text
Google Sheets
      ↓
Cloudflare D1 / PostgreSQL / Supabase
```

mà không phải viết lại toàn bộ UI.

Do đó frontend không được chứa logic kiểu:

```text
row 7 = category
column E = amount
```

Mọi mapping Sheet nằm trong backend.

---

# 59. PHƯƠNG CHÂM CUỐI CÙNG

Ứng dụng này sẽ được đánh giá bằng câu hỏi:

> Hai vợ chồng có thực sự dùng nó mỗi ngày được không?

Không đánh giá dựa trên số framework, số tính năng hoặc độ phức tạp của code.

Một transaction phải nhập nhanh.

Số liệu phải đúng.

Dữ liệu phải giữ được lâu.

Backup phải dễ.

Chi phí vận hành phải gần bằng 0.

---

# 60. PROMPT KHỞI ĐỘNG CHO AI LẬP TRÌNH

Sau khi gửi file này cho AI khác, người dùng có thể gửi thêm prompt sau:

```text
Hãy đọc toàn bộ file FAMILY_EXPENSE_APP_SPEC.md trước khi làm.

Bạn là AI chịu trách nhiệm xây hoàn chỉnh app này cho tôi, không phải chỉ tư vấn kiến trúc.

Hãy tuân thủ specification trong file. Ưu tiên sản phẩm chạy được, đơn giản, miễn phí lâu dài và dành đúng cho 2 vợ chồng.

Hãy bắt đầu từ Milestone 1 và tự triển khai những phần bạn có thể làm. Chỉ yêu cầu tôi thao tác khi việc đó bắt buộc phải thực hiện trong tài khoản Google hoặc dịch vụ bên ngoài của tôi.

Mỗi lần yêu cầu tôi thao tác, hãy hướng dẫn chính xác từng bước. Sau đó tiếp tục xây app, không biến dự án thành khóa học lập trình.

Nếu có chi tiết nhỏ chưa được quy định, hãy tự chọn phương án hợp lý nhất theo nguyên tắc của specification thay vì dừng lại hỏi tôi.

Mục tiêu cuối cùng là giao cho tôi một ứng dụng hoàn chỉnh có thể dùng thật.
```

---

# 61. THÔNG TIN NGƯỜI DÙNG CẦN CUNG CẤP KHI AI BẮT ĐẦU TRIỂN KHAI

Chỉ khi thực sự cần, AI có thể yêu cầu người dùng cung cấp / xác nhận:

```text
1. Tên app muốn hiển thị.
2. Tên hiển thị của hai thành viên (ví dụ Chồng / Vợ hoặc tên riêng).
3. Hai Google Account/email được phép sử dụng app nếu cơ chế auth cần whitelist.
4. Các category mặc định muốn giữ/thêm/bớt.
5. Có muốn dùng Accounts ngay ở version 1 hay để sau.
```

Không ghi các thông tin riêng tư này trực tiếp vào repository public.

---

# END OF SPECIFICATION

**Tên dự án:** Family Expense Manager  
**Database:** Google Sheets  
**Backend:** Google Apps Script  
**Frontend:** React + TypeScript / PWA  
**Users:** 2  
**Primary language:** Vietnamese  
**Primary currency:** VND  
**Goal:** Free / simple / long-term / user-owned data

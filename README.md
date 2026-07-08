# NEW CRM — ITSM & Asset Management System

Hệ thống quản lý IT Service Management (ITSM) và tài sản doanh nghiệp, lấy cảm hứng từ GLPI.  
Built with Next.js 16, TypeScript, Prisma, and NextAuth v5.

---

## Tính năng chính

### 🧑‍💼 Quản lý khách hàng (Customers)
- Danh sách khách hàng với tìm kiếm, filter, phân trang
- Chi tiết: thông tin chung, liên hệ, nhân viên, thiết bị, agent, hạng mục, địa chỉ
- Mỗi khách hàng có mã riêng (`customer.code`) dùng trong asset tag

### 👥 Quản lý liên hệ & nhân viên
- **Contacts**: người liên hệ (email, phone, chức vụ)
- **Employees**: nhân viên khách hàng — có mã NV, phòng ban, chức vụ — dùng để gán thiết bị
- Deduplication tự động khi thêm contact/employee

### 🖥️ Quản lý thiết bị (Assets) — GLPI-style
8 loại thiết bị, mỗi loại có form nhập liệu riêng với đúng field chuẩn GLPI:

| Loại | Icon | Asset tag prefix | Form fields đặc thù |
|---|---|---|---|
| **Computer** | 💻 | PC / LT | CPU, RAM, disk, OS, management IP (iLO/iDRAC), virtualization, rack height |
| **Monitor** | 🖥️ | MON | Kích cỡ inch, độ phân giải, panel (IPS/TN/VA/OLED), tần số, HDR, cổng kết nối |
| **Printer** | 🖨️ | PR | Công nghệ (laser/ink/thermal), màu, 2 mặt, toner levels %, tổng số trang |
| **Network** | 🌐 | NET | Loại (switch/router/firewall/AP), firmware, port editor (speed/status/MAC/neighbor), SNMP, VLAN, stack |
| **Camera** | 📷 | CAM | Loại (IP/analog/webcam), resolution, lens, PoE, IR distance, stream URL, mounting |
| **UPS** | 🔋 | UPS | VA/Watt, input/output voltage, battery, management card, outlet count |
| **Phone** | 📱 | PH | Loại (desk/VoIP/DECT), firmware, phone number, extension, features |
| **Peripheral** | 🎮 | PER | Loại (keyboard/mouse/webcam/dock), kết nối (USB/BT) |

**Thao tác:**
- Thêm/sửa/xóa thiết bị trong tab **Thiết bị** của khách hàng
- Trang tổng hợp toàn bộ thiết bị tại `/customer-devices`
- Chi tiết thiết bị: thông số kỹ thuật, components (từ GLPI Agent), lịch sử thu thập
- Gán thiết bị cho nhân viên khách hàng
- Liên kết cha-con (monitor ↔ computer, printer USB ↔ computer)
- Bulk delete, search, filter theo loại/trạng thái/tình trạng

### 📡 Agent Inventory — Thu thập thiết bị tự động

#### Agent trên máy trạm (workstation)
Script tải về từ tab Agent của khách hàng, chạy trên máy người dùng:
1. **Chế độ GLPI Agent (đầy đủ)**: Tải GLPI Agent → chạy `--local --json --full` → gửi JSON về CRM. Thu thập: CPU, RAM, disk, OS, network, software, users, printers, monitors.
2. **Chế độ PowerShell (nhanh)**: Dùng WMI/CIM thuần, không cần tải thêm. Ít chi tiết hơn.
3. Hỗ trợ Windows (.bat), Linux (.sh), macOS (.sh).

**Workflow:**
```
Agent script → POST /api/agent-inventory/submit
  → Tạo InventorySubmission (pending)
  → Match thiết bị cũ (serial/uuid/MAC/hostname)
  → User duyệt trong "Cập nhật Agent"
  → Approve → tạo/Cập nhật CustomerCollectedDevice + sinh asset tag
```

#### Quét thiết bị mạng (GLPI Agent Network Inventory)

Dùng **GLPI Agent thật** (`glpi-netdiscovery` + `glpi-netinventory` trong gói Perl):

**Yêu cầu:** Cài GLPI Agent (Perl)
- Windows: `choco install glpi-agent` hoặc tải từ [GitHub releases](https://github.com/glpi-project/glpi-agent/releases)
- Linux: `sudo apt install glpi-agent`
- macOS: `brew install glpi-agent`

**Wrapper scripts** (download từ tab Agent → "Tải Script Network Scan"):

| Script | OS | Lệnh |
|---|---|---|
| `network-inventory.ps1` | Windows | `.\network-inventory.ps1 -FirstIP 192.168.1.1 -LastIP 192.168.1.254 -Credentials "version:2c,community:public"` |
| `network-inventory.sh` | Linux/macOS | `./network-inventory.sh --first 192.168.1.1 --last 192.168.1.254 --community public` |

**Quy trình:** Script gọi `glpi-netdiscovery` (tìm thiết bị trong dải IP) → `glpi-netinventory` (lấy chi tiết từng thiết bị) → gửi JSON chuẩn GLPI về CRM.

Có thể import thủ công qua tab Agent (paste JSON hoặc upload file `.json` từ GLPI Network Inventory).

### 🎫 Ticket System
- Tạo/sửa/xem ticket với phân loại (Incident, Service Request, Change)
- Phân công cho user/kỹ thuật viên
- Theo dõi trạng thái: New → Assigned → In Progress → Resolved → Closed
- Ưu tiên: Low, Medium, High, Critical
- SLA tracking, attachment, comments

### 📚 Knowledge Base
- Bài viết hướng dẫn, FAQ, solution cho ticket
- Markdown editor, phân loại theo category
- Gắn bài viết vào ticket (Suggested Solutions)

### 📊 Dashboard & Reports
- KPI cards: tổng ticket, đang xử lý, đã đóng, thiết bị đang dùng
- Biểu đồ: ticket theo tháng, phân bố loại thiết bị (Recharts PieChart)
- Agent Updates dashboard: pending feed, donut chart device types, 3-column history grid

### 👤 Phân quyền (RBAC)
- **admin**: toàn quyền
- **manager**: quản lý khách hàng, duyệt agent submissions
- **agent**: xem, tạo ticket
- **viewer**: chỉ xem

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| UI | React 19 + Tailwind CSS v4 + shadcn/ui |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma 5 |
| Auth | NextAuth v5 (Auth.js) — credentials + Google |
| Forms | React Hook Form + Zod |
| Server state | TanStack React Query |
| Client state | Zustand |
| Testing | Vitest (unit) + Playwright (E2E) |
| Charts | Recharts |
| Icons | Lucide React |

## Quick Start

```bash
npm install
cp .env.example .env.local  # configure DB + auth
npm run db:migrate           # create tables
npm run db:seed              # seed demo data
npm run dev                  # http://localhost:3000
```

**Demo credentials:** `admin@newcrm.com` / `admin123`

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (localhost:3000) |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:studio` | Prisma Studio (DB browser) |
| `npm run db:reset` | Reset DB (local only) |

## API Endpoints

### Agent Inventory
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/agent-inventory/submit?customerId=X&key=Y` | Nhận inventory từ GLPI Agent / PowerShell |
| GET | `/api/agent-inventory/submissions` | Danh sách submissions (filter: customerId, status) |
| GET | `/api/agent-inventory/submissions/[id]` | Chi tiết submission + review data |
| POST | `/api/agent-inventory/submissions/[id]/review` | Duyệt/approve/reject submission |
| GET | `/api/agent-inventory/download/[customerId]` | Tải script agent (mode=glpi|simple, os=windows|linux|mac) |
| POST | `/api/agent-inventory/network-import?customerId=X` | Import GLPI Network Inventory JSON |
| GET | `/api/agent-inventory/network-download/[customerId]` | Tải script SNMP scanner (os=windows|linux|mac) |

### Devices / Assets
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customer-devices` | Danh sách thiết bị (filter: customerId, deviceType, status, search) |
| DELETE | `/api/customer-devices/[id]` | Xóa thiết bị |
| POST | `/api/customer-devices/bulk-delete` | Xóa hàng loạt |
| GET/POST | `/api/customers/[id]/devices` | CRUD thiết bị theo khách hàng |
| GET/PUT/DELETE | `/api/customers/[id]/devices/[deviceId]` | Chi tiết thiết bị |

### Customers
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/customers` | Danh sách / tạo khách hàng |
| GET/PUT/DELETE | `/api/customers/[id]` | Chi tiết / sửa / xóa |
| POST | `/api/customers/[id]/regenerate-key` | Tạo lại agent key |

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — KPI, charts, recent tickets |
| `/customers` | Danh sách khách hàng |
| `/customers/[id]` | Chi tiết KH (tabs: info, contacts, employees, devices, agent, items, addresses) |
| `/customer-devices` | Tổng hợp thiết bị toàn hệ thống |
| `/customer-devices/[deviceId]` | Chi tiết thiết bị |
| `/agent-updates` | Dashboard duyệt agent submissions (KPI, pending feed, chart, history) |
| `/agent-updates/[id]` | Review & duyệt submission chi tiết |
| `/tickets` | Danh sách ticket |
| `/tickets/[id]` | Chi tiết ticket |
| `/kb` | Knowledge base |
| `/kb/[id]` | Bài viết KB |

## Database Schema

Main models: `Customer`, `CustomerContact`, `CustomerEmployee`, `CustomerAddress`, `CustomerCollectedDevice`, `InventorySubmission`, `Ticket`, `TicketComment`, `KbArticle`, `Users`, `Asset`, `CustomerItem`.

Full schema in `prisma/schema.prisma` (8500+ lines).

## Architecture Notes

- **Server Components** default; `'use client'` only when interactive
- API routes: Zod-validated input, `{ data }` / `{ error, code }` response shape
- DB access via Prisma client from `lib/db.ts` only
- Auth check = first line of every protected handler
- Type-specific device fields stored in `componentsJson` (JSON string) — see `src/types/device-specs.ts`
- GLPI Agent inventory → `InventorySubmission` (pending) → review → `CustomerCollectedDevice`
- Asset tag format: `{customerCode}-{typePrefix}-{NNN}` (e.g., `KH001-PC-042`)

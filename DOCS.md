# Tài liệu hệ thống ITSM

> GLPI-compatible IT Service Management & Asset Management
> Build với Next.js 16, TypeScript, Tailwind CSS v4, Prisma 5

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Hướng dẫn cài đặt & chạy](#2-hướng-dẫn-cài-đặt--chạy)
3. [Tài khoản demo](#3-tài-khoản-demo)
4. [Kiến trúc hệ thống](#4-kiến-trúc-hệ-thống)
5. [Cấu trúc thư mục](#5-cấu-trúc-thư-mục)
6. [Database Schema](#6-database-schema)
7. [Tính năng chi tiết](#7-tính-năng-chi-tiết)
   - [7.1 Dashboard](#71-dashboard)
   - [7.2 Quản lý Ticket](#72-quản-lý-ticket)
   - [7.3 Quản lý Tài sản](#73-quản-lý-tài-sản)
   - [7.4 Agent Inventory](#74-agent-inventory)
   - [7.5 Knowledge Base](#75-knowledge-base)
   - [7.6 Contracts & Suppliers](#76-contracts--suppliers)
   - [7.7 Users (Admin)](#77-users-admin)
   - [7.8 Problems & Changes](#78-problems--changes)
8. [API Endpoints](#8-api-endpoints)
9. [Mobile UI Guide](#9-mobile-ui-guide)
10. [Hướng dẫn phát triển](#10-hướng-dẫn-phát-triển)

---

## 1. Tổng quan hệ thống

ITSM System là hệ thống quản lý dịch vụ CNTT và tài sản, lấy cảm hứng từ GLPI. Hệ thống cho phép:

- **Quản lý Ticket (Vé hỗ trợ)**: Tạo, theo dõi, xử lý yêu cầu hỗ trợ CNTT
- **Quản lý tài sản**: Theo dõi máy tính, máy in, thiết bị mạng, màn hình và các tài sản CNTT khác
- **Agent Inventory**: Tự động thu thập thông tin cấu hình máy tính qua PowerShell agent
- **Knowledge Base**: Cơ sở tri thức với các bài viết hướng dẫn
- **Quản lý bản quyền phần mềm, vật tư tiêu hao**
- **Hợp đồng & Nhà cung cấp**
- **Phân quyền người dùng**: Admin, Kỹ thuật viên, Người dùng

### Công nghệ sử dụng

| Công nghệ | Phiên bản | Mục đích |
|---|---|---|
| Next.js | 16 (App Router) | Framework React full-stack |
| TypeScript | 6 | Ngôn ngữ lập trình type-safe |
| Tailwind CSS | 4 | Utility-first CSS framework |
| Prisma | 5 | ORM + Database migration |
| SQLite | - | Database (development) |
| NextAuth | 5 | Authentication |
| TanStack Query | 5 | Quản lý server state |
| Zustand | 5 | State management |
| React Hook Form + Zod | - | Form validation |
| Recharts | 3 | Biểu đồ dashboard |
| Lucide React | - | Icon library |

---

## 2. Hướng dẫn cài đặt & chạy

### Yêu cầu
- Node.js 20+
- Windows (cho agent PowerShell)

### Cài đặt

```bash
# Clone repo
git clone <repo-url>
cd NEW CRM

# Cài dependencies
npm install

# Tạo file .env (nếu chưa có)
echo NEXTAUTH_SECRET=my-secret-key-123 > .env
echo DATABASE_URL="file:./dev.db" >> .env

# Push database schema + seed
npx.cmd prisma db push
npx.cmd tsx prisma/seed.ts

# Chạy dev server
npx.cmd next dev
```

Mở trình duyệt tại `http://localhost:3000`

### Build production

```bash
npx.cmd next build
npx.cmd next start
```

---

## 3. Tài khoản demo

Sau khi seed database, có 3 tài khoản:

| Vai trò | Email | Mật khẩu | Quyền |
|---|---|---|---|
| **Admin** | admin@demo.com | admin123 | Toàn quyền (quản lý user, tất cả tính năng) |
| **Kỹ thuật viên** | tech@demo.com | admin123 | Xử lý ticket, quản lý tài sản |
| **Người dùng** | user@demo.com | admin123 | Tạo ticket, xem tài sản được gán |

---

## 4. Kiến trúc hệ thống

### Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────┐
│                   Next.js App                        │
│  ┌───────────────────────────────────────────────┐  │
│  │            Client Components                   │  │
│  │  Dashboard · Tickets · Assets · Users · etc   │  │
│  └──────────────┬────────────────────────────────┘  │
│                 │ fetch()                            │
│  ┌──────────────▼────────────────────────────────┐  │
│  │              API Routes                        │  │
│  │  /api/tickets · /api/assets · /api/users ·    │  │
│  └──────────────┬────────────────────────────────┘  │
│                 │                                    │
│  ┌──────────────▼────────────────────────────────┐  │
│  │            Prisma ORM                          │  │
│  │         ┌──────────────┐                       │  │
│  │         │    SQLite    │                       │  │
│  │         └──────────────┘                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Responsive Design

- **Desktop (≥1024px)**: Sidebar navigation trái, nội dung phải
- **Mobile (<1024px)**: Bottom tab navigation (5 tabs), drawer menu trái, bottom sheet tạo nhanh

### Authentication Flow

```
Login → NextAuth CredentialsProvider → verify email+password
  → JWT session → protected routes redirect /login nếu chưa auth
  → role-based UI (admin thấy Users, tech thấy assigned tickets)
```

---

## 5. Cấu trúc thư mục

```
D:\SOFT\NEW CRM\
├── prisma/
│   ├── schema.prisma      # Database schema (30+ models)
│   ├── seed.ts            # Seed data
│   └── dev.db             # SQLite database file
├── agent/
│   └── inventory-agent.ps1  # PowerShell inventory collector
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx    # Login page
│   │   ├── (dashboard)/          # Protected routes
│   │   │   ├── layout.tsx        # Responsive layout (sidebar + mobile nav)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── tickets/
│   │   │   │   ├── page.tsx      # List
│   │   │   │   ├── [id]/page.tsx # Detail
│   │   │   │   ├── create/page.tsx
│   │   │   │   └── kanban/page.tsx
│   │   │   ├── assets/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── [id]/page.tsx
│   │   │   │   ├── inventory/page.tsx
│   │   │   │   ├── licenses/page.tsx
│   │   │   │   └── consumables/page.tsx
│   │   │   ├── problems/page.tsx
│   │   │   ├── changes/page.tsx
│   │   │   ├── knowledge/page.tsx
│   │   │   ├── contracts/page.tsx
│   │   │   ├── suppliers/page.tsx
│   │   │   ├── locations/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── api/                   # 22 API endpoints
│   │   ├── layout.tsx             # Root layout
│   │   ├── providers.tsx          # Session + Query providers
│   │   └── globals.css            # Design tokens + animations
│   ├── components/
│   │   ├── ui/                    # 12 UI components
│   │   ├── sidebar.tsx
│   │   └── mobile/
│   │       ├── bottom-nav.tsx
│   │       ├── mobile-header.tsx
│   │       ├── drawer.tsx
│   │       └── bottom-sheet.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── db.ts
│   │   └── utils.ts
├── DOCS.md                       # Tài liệu này
├── AGENTS.md                     # Hướng dẫn cho AI coding tools
├── PROGRESS.md                   # Theo dõi tiến độ
└── package.json
```

---

## 6. Database Schema

30+ models, bao gồm:

### Core
- **Organization**: Công ty/Tổ chức (multitenant)
- **User**: Người dùng (admin/tech/user), có organizationId
- **Location**: Vị trí địa lý (building, room, city)
- **Manufacturer**: Hãng sản xuất (Dell, HP, Cisco...)
- **State**: Trạng thái (Đang dùng, Lưu kho, Đã thanh lý...)
- **Category**: Danh mục ITIL (cây phân cấp, hỗ trợ ticket + asset)

### Asset & Inventory
- **Asset**: Tài sản (computer/printer/network/monitor/phone...)
- **ComputerDetail**: Chi tiết máy tính (CPU, RAM, OS, IP...)
- **DiskVolume**: Ổ đĩa (mount point, size, used)
- **NetworkInterface**: Card mạng (MAC, IP, gateway)
- **SoftwareInstall**: Phần mềm đã cài
- **PrinterDetail / NetworkDetail**: Chi tiết máy in / thiết bị mạng
- **Agent**: Agent đã kết nối (version, lastContact, IP)

### License & Consumable
- **SoftwareLicense**: Bản quyền phần mềm
- **SoftwareLicenseAssignment**: Gán license cho asset
- **Consumable**: Vật tư tiêu hao (mực in, giấy...)

### Ticket & Service
- **Ticket**: Vé hỗ trợ (type: incident/request, status: new→closed)
- **TicketFollowup**: Bình luận trên ticket
- **TicketTask**: Công việc con trong ticket (todo list)
- **Problem**: Vấn đề (problem management)
- **Change**: Yêu cầu thay đổi (change management)

### Knowledge & Documents
- **KnowledgeBaseArticle**: Bài viết hướng dẫn
- **Document**: File đính kèm

### Business
- **Contract**: Hợp đồng (maintenance/lease/support)
- **Supplier**: Nhà cung cấp
- **Budget**: Ngân sách

---

## 7. Tính năng chi tiết

### 7.1 Dashboard

Trang tổng quan hiển thị:

1. **4 Stat Cards**: Tổng số ticket, đang xử lý, chờ, chưa gán
2. **BarChart**: Ticket theo trạng thái (biểu đồ cột)
3. **PieChart**: Asset theo loại (biểu đồ tròn)
4. **Recent Tickets Feed**: 5 ticket gần nhất dạng card Facebook-style
5. **Stories Bar**: 4 quick actions (Tạo ticket, Xem tài sản, Tài sản, KB)

### 7.2 Quản lý Ticket

#### Danh sách (Tickets)
- **Tab filter**: All / Open / My Tickets / Resolved
- **Status filter chips**: Bộ lọc trạng thái kèm số lượng
- **Search**: Tìm kiếm theo tiêu đề
- **Mobile feed**: Card-style với avatar, priority dot, status badge

#### Chi tiết (Ticket Detail)
- **Thông tin**: Tiêu đề, mô tả, type, priority, status
- **Status buttons**: Chuyển trạng thái (clickable history)
- **Followups**: Thêm bình luận (inline form, live update)
- **Tasks**: Thêm công việc con (checkbox done/pending)

#### Tạo ticket
- Form với React Hook Form + Zod validation
- Fields: title (min 5), description (min 10), type, priority, category

#### Kanban Board
- 6 cột: New → Assigned → In Progress → Pending → Resolved → Closed
- Kéo thả card giữa các cột (click để xem detail)
- Mobile responsive, scroll ngang

### 7.3 Quản lý Tài sản

#### Danh sách (Assets)
- **Type filter chips**: Computer / Printer / Network / Monitor / All
- **Search**: Tìm theo tên
- **Card feed**: Icon theo loại, status badge, serial, location

#### Chi tiết (Asset Detail)
- Thông tin chung: Tên, serial, manufacturer, location, assigned user
- 4 stat cards: Ngày mua, giá trị, bảo hành, vị trí
- Nếu là computer: CPU, RAM, OS, IP, MAC, disk volumes, network interfaces, software installs
- Nếu là printer: Model, serial, IP, color, duplex
- Nếu là network: Model, IP, MAC, port count, managed
- License assignments

### 7.4 Agent Inventory

Hệ thống agent tự động thu thập cấu hình máy tính:

#### PowerShell Agent (`agent/inventory-agent.ps1`)
Chạy trên máy tính Windows, thu thập:
- **CPU**: Tên, số core, thread
- **RAM**: Dung lượng
- **OS**: Tên, phiên bản
- **Disks**: Tên, kích thước
- **Network**: IP, MAC
- **Software**: Danh sách phần mềm đã cài

Cách dùng:
```powershell
# Trên máy tính cần inventory
.\agent\inventory-agent.ps1 -ApiUrl "http://server:3000/api/agent/inventory" -ApiKey "demo-key"
```

#### Trang Inventory
- Danh sách agent đã kết nối
- Stat cards: Tổng agent, online, offline, tổng asset
- Agent feed: Hostname, IP, OS, last contact, version, status dot

### 7.5 Knowledge Base

- Danh sách bài viết dạng card
- **Search**: Tìm theo tiêu đề
- **Category filter**: Lọc theo danh mục
- Mỗi bài viết hiển thị: title, category badge, nội dung tóm tắt

### 7.6 Contracts & Suppliers

#### Contracts
- Danh sách hợp đồng dạng card
- Hiển thị: Tên, supplier, type (maintenance/lease/support), ngày hiệu lực, giá trị
- Status badges: Active / Expired / Draft

#### Suppliers
- Danh sách nhà cung cấp
- Avatar, tên, contact person, email, phone, type

#### Locations
- Danh sách vị trí với icon building
- Tên, building, room, city

### 7.7 Users (Admin)

Chỉ admin mới thấy menu Users

- Danh sách người dùng
- Role badges: Admin (đỏ), Tech (xanh), User (xám)
- Email, ngày tạo

### 7.8 Problems & Changes

#### Problems
- Danh sách vấn đề
- Status + priority badges
- Assigned to, category

#### Changes
- Danh sách yêu cầu thay đổi
- Status + priority + risk badges
- Assigned to, category

---

## 8. API Endpoints

### Tickets
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/tickets` | Danh sách tickets |
| POST | `/api/tickets` | Tạo ticket mới |
| GET | `/api/tickets/[id]` | Chi tiết ticket |
| PATCH | `/api/tickets/[id]` | Cập nhật ticket |
| POST | `/api/tickets/[id]/followups` | Thêm followup |
| POST | `/api/tickets/[id]/tasks` | Thêm task |
| PATCH | `/api/tasks/[id]` | Cập nhật task state |

### Assets
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/assets` | Danh sách assets |
| GET | `/api/assets/[id]` | Chi tiết asset |
| PATCH | `/api/assets/[id]` | Cập nhật asset |

### Users
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/users` | Danh sách users |
| PATCH | `/api/users/[id]` | Cập nhật user |

### Dashboard
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/dashboard/stats` | Thống kê dashboard |

### Others
| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/knowledge` | Bài viết KB |
| GET | `/api/contracts` | Hợp đồng |
| GET | `/api/suppliers` | Nhà cung cấp |
| GET | `/api/locations` | Vị trí |
| GET | `/api/licenses` | Bản quyền |
| GET | `/api/consumables` | Vật tư |
| GET | `/api/problems` | Problems |
| GET | `/api/changes` | Changes |
| GET | `/api/agent/inventory/list` | Danh sách agent |
| POST | `/api/agent/inventory` | Agent gửi inventory |

---

## 9. Mobile UI Guide

### Bottom Tab Navigation (Mobile)

5 tabs ở dưới cùng:
1. **Home** (🏠): Dashboard
2. **Tickets** (🎫): Danh sách ticket
3. **+Create** (➕): Mở bottom sheet → chọn Tạo ticket hoặc Tạo asset
4. **Assets** (💻): Danh sách tài sản
5. **Menu** (☰): Mở drawer menu

### Drawer Menu

Vuốt từ trái hoặc tap Menu icon → Drawer trượt ra với:
- Avatar + tên + email người dùng
- Navigation tree đầy đủ (giống sidebar desktop)
- Signout button

### Facebook-style Components

- **Feed cards**: Avatar tròn, icon, status badge, action row (like Facebook post)
- **Stories bar**: Carousel ngang với 4 quick actions
- **Bottom sheet**: Modal từ dưới lên cho create actions
- **Skeleton loading**: Animation khi loading
- **Pull to refresh**: Vuốt xuống reload (scroll position)

---

## 10. Hướng dẫn phát triển

### Thêm model mới

1. Thêm model vào `prisma/schema.prisma`
2. Chạy `npx.cmd prisma db push`
3. Tạo API route trong `src/app/api/[name]/route.ts`
4. Tạo page trong `src/app/(dashboard)/[name]/page.tsx`
5. Thêm link vào sidebar (`src/components/sidebar.tsx`) và drawer (`src/components/mobile/drawer.tsx`)

### Thêm API endpoint

```typescript
// src/app/api/items/route.ts
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  
  const items = await prisma.item.findMany({
    where: { organizationId: session.user.organizationId! },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(items);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  
  const body = await req.json();
  const item = await prisma.item.create({
    data: { ...body, organizationId: session.user.organizationId! },
  });
  return Response.json(item, { status: 201 });
}
```

### Component Library

12 UI components có sẵn trong `src/components/ui/`:

| Component | Props | Mô tả |
|---|---|---|
| `Button` | variant (primary/secondary/danger/ghost/outline), size (sm/md/lg), loading | Button |
| `Card` | - | Container có border + shadow |
| `Badge` | variant (7 loại), size (sm/md) | Tag/status |
| `Table` | + THead/TBody/Th/Td | Bảng |
| `Input` | label, error | Input field |
| `Textarea` | label, error | Textarea |
| `Select` | label, options, error | Select dropdown |
| `Dialog` | open, onClose, title | Modal dialog |
| `Tabs` | tabs, activeTab, onChange | Tab navigation |
| `Skeleton` | className | Loading skeleton |
| `EmptyState` | icon, title, description | Empty state |
| `StatusDot` | status (online/offline/warning/error) | Status indicator dot |

### CSS Design Tokens

File `globals.css` sử dụng OKLCH color space:

```css
--primary: oklch(0.55 0.2 260);       /* Xanh dương */
--primary-400: oklch(0.62 0.22 260);
--primary-500: oklch(0.55 0.2 260);
--primary-600: oklch(0.48 0.18 260);
--surface: oklch(1 0 0);              /* Trắng */
--surface-secondary: oklch(0.97 0 0); /* Xám nhạt */
--border: oklch(0.92 0 0);            /* Border */
--muted-foreground: oklch(0.55 0 0);  /* Text mờ */
```

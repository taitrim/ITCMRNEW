import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 12);

  const org = await prisma.organization.create({
    data: {
      name: "Công ty TNHH Demo",
      code: "DEMO",
      email: "info@demo.com",
      phone: "0123456789",
      address: "123 Nguyễn Huệ, Q.1, TP.HCM",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@demo.com",
      password,
      role: "admin",
      organizationId: org.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Kỹ thuật viên",
      email: "tech@demo.com",
      password,
      role: "tech",
      organizationId: org.id,
    },
  });

  await prisma.user.create({
    data: {
      name: "Người dùng",
      email: "user@demo.com",
      password,
      role: "user",
      organizationId: org.id,
    },
  });

  const location = await prisma.location.create({
    data: { name: "Văn phòng Q.1", organizationId: org.id },
  });
  await prisma.location.create({
    data: { name: "Kho hàng Bình Dương", organizationId: org.id },
  });

  const catNetwork = await prisma.category.create({
    data: { name: "Mạng & Kết nối", type: "ticket", icon: "network", color: "#3b82f6", organizationId: org.id },
  });
  await prisma.category.create({
    data: { name: "Máy tính & Hardware", type: "ticket", icon: "computer", color: "#10b981", organizationId: org.id },
  });
  await prisma.category.create({
    data: { name: "Phần mềm", type: "ticket", icon: "software", color: "#f59e0b", organizationId: org.id },
  });
  await prisma.category.create({
    data: { name: "Email & Tài khoản", type: "ticket", icon: "email", color: "#8b5cf6", organizationId: org.id, parentId: catNetwork.id },
  });

  await prisma.asset.create({
    data: {
      name: "Dell Optiplex 7090",
      assetType: "computer",
      serialNumber: "SN-DELL-001",
      manufacturer: "Dell",
      model: "Optiplex 7090",
      status: "in_use",
      cpu: "Intel Core i7-11700",
      ram: "32GB DDR4",
      disk: "512GB NVMe",
      os: "Windows 11 Pro",
      ipAddress: "192.168.1.100",
      locationId: location.id,
      organizationId: org.id,
      assignedToId: admin.id,
      purchaseDate: new Date("2024-01-15"),
      warrantyEnd: new Date("2027-01-15"),
      price: 32000000,
    },
  });

  await prisma.asset.create({
    data: {
      name: "HP LaserJet Pro M404dn",
      assetType: "printer",
      serialNumber: "SN-HP-001",
      manufacturer: "HP",
      model: "LaserJet Pro M404dn",
      status: "in_use",
      ipAddress: "192.168.1.200",
      locationId: location.id,
      organizationId: org.id,
      purchaseDate: new Date("2024-03-01"),
      price: 8500000,
    },
  });

  await prisma.asset.create({
    data: {
      name: "Cisco SG350-28",
      assetType: "network",
      serialNumber: "SN-CISCO-001",
      manufacturer: "Cisco",
      model: "SG350-28",
      status: "in_use",
      ipAddress: "192.168.1.1",
      locationId: location.id,
      organizationId: org.id,
      purchaseDate: new Date("2023-06-01"),
      warrantyEnd: new Date("2028-06-01"),
      price: 15000000,
    },
  });

  const ticket = await prisma.ticket.create({
    data: {
      title: "Mất kết nối internet tầng 3",
      description: "Toàn bộ nhân viên tầng 3 không thể truy cập internet từ sáng nay.",
      type: "incident",
      status: "in_progress",
      priority: "high",
      categoryId: catNetwork.id,
      createdById: admin.id,
      assignedToId: admin.id,
      organizationId: org.id,
    },
  });

  await prisma.activity.create({
    data: {
      type: "note",
      content: "Đã kiểm tra switch tầng 3, phát hiện cổng uplink bị lỗi. Đang thay thế.",
      userId: admin.id,
      ticketId: ticket.id,
    },
  });

  await prisma.knowledgeBaseArticle.create({
    data: {
      title: "Hướng dẫn reset mật khẩu Windows",
      content: "1. Khởi động máy > Nhấn F8 > Safe Mode\n2. Vào Control Panel > User Accounts\n3. Chọn user > Change Password\n4. Nhập mật khẩu mới > OK",
      category: "software",
      isPublic: true,
      organizationId: org.id,
      createdById: admin.id,
    },
  });

  await prisma.knowledgeBaseArticle.create({
    data: {
      title: "Quy trình báo hỏng thiết bị",
      content: "1. Tạo ticket trên hệ thống\n2. Mô tả chi tiết lỗi\n3. Đính kèm hình ảnh (nếu có)\n4. Chờ kỹ thuật viên xác nhận\n5. Theo dõi trạng thái xử lý",
      category: "general",
      isPublic: true,
      organizationId: org.id,
    },
  });

  const supplier = await prisma.supplier.create({
    data: {
      name: "Công ty TNHH Dịch vụ CNTT ABC",
      contactName: "Nguyễn Văn A",
      email: "abc@example.com",
      phone: "028.3822.1234",
      supplierType: "service_provider",
      organizationId: org.id,
    },
  });

  await prisma.contract.create({
    data: {
      name: "Hợp đồng bảo trì hệ thống 2025",
      contractType: "maintenance",
      supplierId: supplier.id,
      organizationId: org.id,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
      renewalType: "auto",
      cost: 120000000,
    },
  });

  console.log("Seed hoàn tất!");
  console.log("---");
  console.log("Admin: admin@demo.com / admin123");
  console.log("KTV:   tech@demo.com / admin123");
  console.log("User:  user@demo.com / admin123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

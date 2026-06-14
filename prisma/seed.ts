import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 12);

  // 1. Organization
  const org = await prisma.organization.create({
    data: { name: "Công ty TNHH Demo", code: "DEMO", email: "info@demo.com", phone: "0123456789", address: "123 Nguyễn Huệ, Q.1, TP.HCM" },
  });

  // 2. Users
  const admin = await prisma.user.create({ data: { name: "Admin", email: "admin@demo.com", password, role: "admin", organizationId: org.id } });
  const tech = await prisma.user.create({ data: { name: "Kỹ thuật viên", email: "tech@demo.com", password, role: "tech", organizationId: org.id } });
  await prisma.user.create({ data: { name: "Người dùng", email: "user@demo.com", password, role: "user", organizationId: org.id } });

  // 3. Locations
  const loc = await prisma.location.create({ data: { name: "Văn phòng Quận 1", building: "Tòa nhà ABC", room: "Tầng 5", city: "TP.HCM", organizationId: org.id } });
  await prisma.location.create({ data: { name: "Kho hàng Bình Dương", city: "Bình Dương", organizationId: org.id } });

  // 4. Manufacturers
  const dell = await prisma.manufacturer.create({ data: { name: "Dell", website: "dell.com", organizationId: org.id } });
  const hp = await prisma.manufacturer.create({ data: { name: "HP", website: "hp.com", organizationId: org.id } });
  const cisco = await prisma.manufacturer.create({ data: { name: "Cisco", website: "cisco.com", organizationId: org.id } });
  await prisma.manufacturer.create({ data: { name: "Canon", website: "canon.com", organizationId: org.id } });
  await prisma.manufacturer.create({ data: { name: "Microsoft", website: "microsoft.com", organizationId: org.id } });

  // 5. States
  await prisma.state.create({ data: { name: "Đang sử dụng", organizationId: org.id } });
  await prisma.state.create({ data: { name: "Lưu kho", organizationId: org.id } });
  await prisma.state.create({ data: { name: "Đang sửa chữa", organizationId: org.id } });
  await prisma.state.create({ data: { name: "Đã thanh lý", organizationId: org.id } });

  // 6. Categories (ITIL)
  const catNetwork = await prisma.category.create({ data: { name: "Mạng & Kết nối", type: "ticket", color: "#3b82f6", organizationId: org.id } });
  await prisma.category.create({ data: { name: "Máy tính", type: "ticket", color: "#10b981", organizationId: org.id } });
  await prisma.category.create({ data: { name: "Phần mềm", type: "ticket", color: "#f59e0b", organizationId: org.id } });
  await prisma.category.create({ data: { name: "Email", type: "ticket", color: "#8b5cf6", organizationId: org.id, parentId: catNetwork.id } });

  // 7. Assets - Computer
  const asset1 = await prisma.asset.create({
    data: { name: "DESKTOP-ABC01", assetType: "computer", serialNumber: "SN-DELL-001", manufacturerId: dell.id, locationId: loc.id, organizationId: org.id, assignedToId: admin.id, purchaseDate: new Date("2024-01-15"), warrantyEnd: new Date("2027-01-15"), price: 32000000, isDynamic: true },
  });
  await prisma.computerDetail.create({
    data: { assetId: asset1.id, cpu: "Intel Core i7-11700", cpuCores: 8, cpuThreads: 16, cpuFrequency: "2.5GHz", ram: "32GB DDR4", ramSize: 32, disks: JSON.stringify([{ name: "NVMe SSD", size: 512 }]), os: "Windows 11 Pro", osVersion: "23H2", ipAddress: "192.168.1.100", macAddress: "00:1A:2B:3C:4D:5E", hostname: "DESKTOP-ABC01" },
  });
  await prisma.diskVolume.create({ data: { detailId: (await prisma.computerDetail.findUnique({ where: { assetId: asset1.id } }))!.id, mountPoint: "C:", totalSize: 476, usedSize: 234, filesystem: "NTFS" } });
  await prisma.networkInterface.create({ data: { detailId: (await prisma.computerDetail.findUnique({ where: { assetId: asset1.id } }))!.id, name: "Ethernet0", macAddress: "00:1A:2B:3C:4D:5E", ipAddress: "192.168.1.100", gateway: "192.168.1.1", speed: 1000 } });
  await prisma.softwareInstall.create({ data: { detailId: (await prisma.computerDetail.findUnique({ where: { assetId: asset1.id } }))!.id, name: "Microsoft Office 2021", version: "16.0", publisher: "Microsoft" } });
  await prisma.softwareInstall.create({ data: { detailId: (await prisma.computerDetail.findUnique({ where: { assetId: asset1.id } }))!.id, name: "Google Chrome", version: "120.0", publisher: "Google" } });

  // 8. Assets - Printer
  const asset2 = await prisma.asset.create({
    data: { name: "HP-LaserJet-001", assetType: "printer", serialNumber: "SN-HP-001", manufacturerId: hp.id, locationId: loc.id, organizationId: org.id, purchaseDate: new Date("2024-03-01"), price: 8500000 },
  });
  await prisma.printerDetail.create({ data: { assetId: asset2.id, modelName: "HP LaserJet Pro M404dn", serial: "SN-HP-001", ipAddress: "192.168.1.200", color: false, duplex: true } });

  // 9. Assets - Network
  const asset3 = await prisma.asset.create({
    data: { name: "Cisco-SG350-001", assetType: "network", serialNumber: "SN-CISCO-001", manufacturerId: cisco.id, locationId: loc.id, organizationId: org.id, purchaseDate: new Date("2023-06-01"), warrantyEnd: new Date("2028-06-01"), price: 15000000 },
  });
  await prisma.networkDetail.create({ data: { assetId: asset3.id, ipAddress: "192.168.1.1", macAddress: "00:1C:2D:3E:4F:5G", model: "SG350-28", portCount: 28, isManaged: true } });

  // 10. Assets - Monitor
  await prisma.asset.create({ data: { name: "Dell U2723QE", assetType: "monitor", serialNumber: "SN-DELL-MON-001", manufacturerId: dell.id, locationId: loc.id, organizationId: org.id, assignedToId: admin.id, purchaseDate: new Date("2024-06-01"), price: 12000000 } });

  // 11. Software License
  const license = await prisma.softwareLicense.create({ data: { name: "Microsoft 365 Business", productName: "Microsoft 365", publisher: "Microsoft", licenseType: "subscription", maxUsers: 50, cost: 24000000, expirationDate: new Date("2026-12-31"), organizationId: org.id } });
  await prisma.softwareLicenseAssignment.create({ data: { licenseId: license.id, assetId: asset1.id } });

  // 12. Ticket
  const ticket = await prisma.ticket.create({
    data: { title: "Mất kết nối internet tầng 3", description: "Toàn bộ nhân viên tầng 3 không thể truy cập internet từ sáng nay. Đã kiểm tra switch nhưng chưa rõ nguyên nhân.", type: "incident", status: "in_progress", priority: "high", categoryId: catNetwork.id, createdById: admin.id, assignedToId: tech.id, organizationId: org.id },
  });
  await prisma.ticketFollowup.create({ data: { ticketId: ticket.id, content: "Đã kiểm tra switch tầng 3, phát hiện cổng uplink bị lỗi", userId: tech.id } });
  await prisma.ticketTask.create({ data: { ticketId: ticket.id, content: "Thay thế switch dự phòng", state: "done", userId: tech.id } });
  await prisma.ticketTask.create({ data: { ticketId: ticket.id, content: "Kiểm tra lại toàn bộ kết nối", state: "in_progress", userId: tech.id } });

  // 13. Knowledge Base
  await prisma.knowledgeBaseArticle.create({
    data: { title: "Hướng dẫn reset mật khẩu Windows", content: "1. Khởi động máy > Nhấn F8 > Safe Mode\n2. Control Panel > User Accounts\n3. Đổi mật khẩu", category: "software", isPublic: true, organizationId: org.id, createdById: admin.id },
  });
  await prisma.knowledgeBaseArticle.create({
    data: { title: "Quy trình báo hỏng thiết bị", content: "1. Tạo ticket mô tả lỗi\n2. Đính kèm hình ảnh\n3. Chờ xử lý", category: "general", isPublic: true, organizationId: org.id },
  });

  // 14. Supplier & Contract
  const supplier = await prisma.supplier.create({ data: { name: "Công ty TNHH Dịch vụ CNTT ABC", contactName: "Nguyễn Văn A", email: "abc@example.com", phone: "028.3822.1234", supplierType: "service_provider", organizationId: org.id } });
  await prisma.contract.create({ data: { name: "Hợp đồng bảo trì 2025", contractType: "maintenance", supplierId: supplier.id, organizationId: org.id, startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), renewalType: "auto", cost: 120000000 } });

  // 15. Budget
  await prisma.budget.create({ data: { name: "Ngân sách CNTT 2025", amount: 500000000, spent: 120000000, year: 2025, organizationId: org.id } });

  // 16. Consumable
  await prisma.consumable.create({ data: { name: "HP LaserJet Toner CF280X", type: "cartridge", stock: 10, alertThreshold: 3, price: 850000, organizationId: org.id } });

  console.log("Seed hoàn tất!");
  console.log("---");
  console.log("Admin: admin@demo.com / admin123 (quyền admin)");
  console.log("KTV:   tech@demo.com / admin123 (quyền kỹ thuật)");
  console.log("User:  user@demo.com / admin123 (quyền người dùng)");
  console.log("---");
  console.log("Assets: 1 Computer + chi tiết, 1 Printer, 1 Network, 1 Monitor");
  console.log("Software License: 1 (Microsoft 365)");
  console.log("Ticket: 1 (đang xử lý, có followup + tasks)");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("admin123", 12);

  // 1. Entity
  const ent = await prisma.entity.create({
    data: { name: "Công ty TNHH Demo", phonenumber: "0123456789", email: "info@demo.com", address: "123 Nguyễn Huệ", town: "TP.HCM", country: "VN" },
  });

  // 1.5. Templates (required for profiles)
  const tplTicket = await prisma.tickettemplates.create({ data: { name: "Default", entitiesId: ent.id, isRecursive: 1, allowedStatuses: "" } });
  const tplChange = await prisma.changetemplates.create({ data: { name: "Default", entitiesId: ent.id, isRecursive: 1, allowedStatuses: "" } });
  const tplProblem = await prisma.problemtemplates.create({ data: { name: "Default", entitiesId: ent.id, isRecursive: 1, allowedStatuses: "" } });

  // 1.6. Profiles
  const profileAdmin = await prisma.profiles.create({ data: { name: "admin", interface: "standard", isDefault: 0, helpdeskHardware: 1, helpdeskItemType: "", useMentions: 1, ticketStatus: "", createTicketOnLogin: 0, tickettemplatesId: tplTicket.id, changetemplatesId: tplChange.id, problemtemplatesId: tplProblem.id, f_2faEnforced: 0 } });
  const profileTech = await prisma.profiles.create({ data: { name: "tech", interface: "standard", isDefault: 0, helpdeskHardware: 1, helpdeskItemType: "", useMentions: 1, ticketStatus: "", createTicketOnLogin: 0, tickettemplatesId: tplTicket.id, changetemplatesId: tplChange.id, problemtemplatesId: tplProblem.id, f_2faEnforced: 0 } });
  const profileUser = await prisma.profiles.create({ data: { name: "user", interface: "standard", isDefault: 1, helpdeskHardware: 0, helpdeskItemType: "", useMentions: 1, ticketStatus: "", createTicketOnLogin: 0, tickettemplatesId: tplTicket.id, changetemplatesId: tplChange.id, problemtemplatesId: tplProblem.id, f_2faEnforced: 0 } });

  // 2. Users (with profiles)
  const admin = await prisma.users.create({ data: { name: "admin", realname: "Admin", password, isActive: 1, entitiesId: ent.id, profilesId: profileAdmin.id } });
  const tech = await prisma.users.create({ data: { name: "tech", realname: "Kỹ thuật viên", password, isActive: 1, entitiesId: ent.id, profilesId: profileTech.id } });
  const usr = await prisma.users.create({ data: { name: "user", realname: "Người dùng", password, isActive: 1, entitiesId: ent.id, profilesId: profileUser.id } });

  // 3. Locations
  const loc = await prisma.locations.create({ data: { name: "Văn phòng Quận 1", building: "Tòa nhà ABC", room: "Tầng 5", town: "TP.HCM", entitiesId: ent.id } });
  await prisma.locations.create({ data: { name: "Kho hàng Bình Dương", town: "Bình Dương", entitiesId: ent.id } });

  // 4. Manufacturers
  const dell = await prisma.manufacturers.create({ data: { name: "Dell" } });
  const hp = await prisma.manufacturers.create({ data: { name: "HP" } });
  const cisco = await prisma.manufacturers.create({ data: { name: "Cisco" } });
  await prisma.manufacturers.create({ data: { name: "Canon" } });
  await prisma.manufacturers.create({ data: { name: "Microsoft" } });

  // 5. States (asset states)
  await prisma.states.create({ data: { name: "Đang sử dụng", entitiesId: ent.id } });
  await prisma.states.create({ data: { name: "Lưu kho", entitiesId: ent.id } });
  await prisma.states.create({ data: { name: "Đang sửa chữa", entitiesId: ent.id } });
  await prisma.states.create({ data: { name: "Đã thanh lý", entitiesId: ent.id } });

  // 6. ITIL Categories
  const catNet = await prisma.itilcategories.create({ data: { name: "Mạng & Kết nối", entitiesId: ent.id, isIncident: 1, isRequest: 1 } });
  await prisma.itilcategories.create({ data: { name: "Máy tính", entitiesId: ent.id, isIncident: 1, isRequest: 1 } });
  await prisma.itilcategories.create({ data: { name: "Phần mềm", entitiesId: ent.id, isIncident: 1, isRequest: 1 } });

  // 7. Computers
  const pc1 = await prisma.computers.create({
    data: { name: "DESKTOP-ABC01", serial: "SN-DELL-001", entitiesId: ent.id, manufacturersId: dell.id, locationsId: loc.id, usersId: admin.id, isDynamic: 1 },
  });
  await prisma.itemDisk.create({ data: { itemsId: 1, name: "NVMe SSD", mountpoint: "C:", totalsize: BigInt(512), freesize: BigInt(256), isDynamic: 0, entitiesId: ent.id } });

  // 8. Printers
  await prisma.printers.create({ data: { name: "HP-LaserJet-001", serial: "SN-HP-001", entitiesId: ent.id, manufacturersId: hp.id, locationsId: loc.id } });

  // 9. Network Equipment
  await prisma.networkequipments.create({ data: { name: "Cisco-SG350-001", serial: "SN-CISCO-001", entitiesId: ent.id, manufacturersId: cisco.id, locationsId: loc.id } });

  // 10. Monitor
  await prisma.monitors.create({ data: { name: "Dell U2723QE", serial: "SN-DELL-MON-001", entitiesId: ent.id, manufacturersId: dell.id, locationsId: loc.id, usersId: admin.id } });

  // 11. Software + License
  const soft = await prisma.softwares.create({ data: { name: "Microsoft 365", entitiesId: ent.id, manufacturersId: dell.id } });
  const lic = await prisma.softwarelicenses.create({ data: { name: "Microsoft 365 Business", entitiesId: ent.id, softwaresId: soft.id, number: 50 } });
  await prisma.itemSoftwareLicense.create({ data: { itemtype: "Computer", itemsId: 1, softwarelicensesId: lic.id } });

  // 12. Tickets
  const t1 = await prisma.tickets.create({
    data: { name: "Mất kết nối internet tầng 3", content: "Toàn bộ nhân viên tầng 3 không thể truy cập internet từ sáng nay", status: 3, urgency: 4, impact: 4, priority: 4, type: 1, entitiesId: ent.id, itilcategoriesId: catNet.id },
  });
  await prisma.ticketUsers.create({ data: { ticketsId: t1.id, usersId: admin.id, type: 1 } });
  await prisma.ticketUsers.create({ data: { ticketsId: t1.id, usersId: tech.id, type: 2 } });
  await prisma.itilfollowups.create({ data: { itemtype: "Ticket", itemsId: 1, content: "Đã kiểm tra switch tầng 3, phát hiện cổng uplink bị lỗi", usersId: tech.id } });
  await prisma.tickettasks.create({ data: { ticketsId: t1.id, content: "Thay thế switch dự phòng", state: 2, usersId: tech.id } });
  await prisma.tickettasks.create({ data: { ticketsId: t1.id, content: "Kiểm tra lại toàn bộ kết nối", state: 1, usersId: tech.id } });

  await prisma.tickets.create({ data: { name: "Máy tính nhân viên A không khởi động được", content: "Màn hình đen sau khi bật nguồn", status: 1, urgency: 5, impact: 4, priority: 5, type: 1, entitiesId: ent.id, itilcategoriesId: catNet.id, createdAt: new Date(Date.now() - 86400000) } });

  await prisma.tickets.create({ data: { name: "Yêu cầu cài đặt phần mềm kế toán", content: "Phòng kế toán cần cài đặt phần mềm MISA trên 3 máy", status: 2, urgency: 2, impact: 2, priority: 3, type: 2, entitiesId: ent.id, itilcategoriesId: catNet.id, createdAt: new Date(Date.now() - 172800000) } });

  await prisma.tickets.create({ data: { name: "Email công ty không gửi được", content: "Không thể gửi email qua Outlook", status: 4, urgency: 3, impact: 3, priority: 4, type: 1, entitiesId: ent.id, itilcategoriesId: catNet.id, createdAt: new Date(Date.now() - 259200000) } });

  await prisma.tickets.create({ data: { name: "Thay thế màn hình cũ", content: "Nhân viên mới cần màn hình 24 inch", status: 5, urgency: 1, impact: 2, priority: 2, type: 2, entitiesId: ent.id, itilcategoriesId: catNet.id, createdAt: new Date(Date.now() - 345600000), closedate: new Date(Date.now() - 259200000) } });

  await prisma.tickets.create({ data: { name: "Nâng cấp RAM cho server CSDL", content: "Server đang sử dụng 80% RAM", status: 1, urgency: 5, impact: 5, priority: 6, type: 2, entitiesId: ent.id, itilcategoriesId: catNet.id, createdAt: new Date(Date.now() - 43200000) } });

  await prisma.tickets.create({ data: { name: "Máy in laser báo lỗi kẹt giấy", content: "Máy in tầng 2 báo lỗi kẹt giấy", status: 6, urgency: 2, impact: 2, priority: 3, type: 1, entitiesId: ent.id, itilcategoriesId: catNet.id, createdAt: new Date(Date.now() - 604800000), closedate: new Date(Date.now() - 518400000) } });

  // 13. SLA
  const sla = await prisma.slas.create({ data: { name: "SLA Vàng - Phản hồi 4h", type: 1, numberTime: 240, entitiesId: ent.id } });
  await prisma.slalevels.create({ data: { name: "Cảnh báo 50%", slasId: sla.id, executionTime: 120, isActive: 1, entitiesId: ent.id } });
  await prisma.slalevels.create({ data: { name: "Escalate 75%", slasId: sla.id, executionTime: 180, isActive: 1, entitiesId: ent.id } });

  // 14. Problem
  const prob = await prisma.problems.create({ data: { name: "Mất mạng định kỳ hàng tuần", content: "Cứ thứ 2 hàng tuần, mạng chập chờn từ 9h-11h", status: 3, urgency: 4, impact: 4, priority: 4, entitiesId: ent.id, itilcategoriesId: catNet.id } });
  await prisma.problemTickets.create({ data: { problemsId: prob.id, ticketsId: t1.id } });
  await prisma.problemtasks.create({ data: { problemsId: prob.id, content: "Kiểm tra log switch", state: 1, usersId: tech.id } });
  await prisma.problemtasks.create({ data: { problemsId: prob.id, content: "Xác định băng thông gốc", state: 0, usersId: tech.id } });

  // 15. Change
  const chg = await prisma.changes.create({ data: { name: "Nâng cấp switch core", content: "Thay thế switch core", status: 1, urgency: 4, impact: 5, priority: 4, entitiesId: ent.id, itilcategoriesId: catNet.id } });
  await prisma.changeTickets.create({ data: { changesId: chg.id, ticketsId: t1.id } });
  await prisma.changetasks.create({ data: { changesId: chg.id, content: "Backup config switch cũ", state: 0, usersId: tech.id } });
  await prisma.changetasks.create({ data: { changesId: chg.id, content: "Lắp đặt switch mới", state: 0, usersId: tech.id } });

  // 16. Project
  const proj = await prisma.projects.create({ data: { name: "Nâng cấp hạ tầng mạng 2025", priority: 3, entitiesId: ent.id } });
  await prisma.projecttasks.create({ data: { name: "Khảo sát hiện trạng", projectsId: proj.id, entitiesId: ent.id } });
  await prisma.projecttasks.create({ data: { name: "Mua sắm thiết bị", projectsId: proj.id, entitiesId: ent.id } });

  // 17. Certificate
  await prisma.certificates.create({ data: { name: "SSL - demo.com", entitiesId: ent.id, dateExpiration: new Date("2025-07-01") } });

  // 18. Knowledge Base
  await prisma.knowbaseitems.create({ data: { name: "Hướng dẫn reset mật khẩu Windows", answer: "1. Khởi động máy > Nhấn F8 > Safe Mode\n2. Control Panel > User Accounts\n3. Đổi mật khẩu", isFaq: 1, entitiesId: ent.id, usersId: admin.id } });
  await prisma.knowbaseitems.create({ data: { name: "Quy trình báo hỏng thiết bị", answer: "1. Tạo ticket mô tả lỗi\n2. Đính kèm hình ảnh\n3. Chờ xử lý", isFaq: 1, entitiesId: ent.id } });

  // 19. Supplier & Contract
  const sup = await prisma.suppliers.create({ data: { name: "Công ty TNHH Dịch vụ CNTT ABC", email: "abc@example.com", phonenumber: "028.3822.1234", entitiesId: ent.id } });
  await prisma.contracts.create({ data: { name: "Hợp đồng bảo trì 2025", beginDate: new Date("2025-01-01"), entitiesId: ent.id } });
  await prisma.contractSuppliers.create({ data: { contractsId: (await prisma.contracts.findFirst({ where: { entitiesId: ent.id } }))!.id, suppliersId: sup.id } });

  // 20. Budget
  await prisma.budgets.create({ data: { name: "Ngân sách CNTT 2025", value: 500000000, entitiesId: ent.id, beginDate: new Date("2025-01-01"), endDate: new Date("2025-12-31") } });

  // 21. Customer Categories
  const catIndividual = await prisma.customerCategory.create({ data: { name: "Cá nhân", code: "individual" } });
  const catBusiness = await prisma.customerCategory.create({ data: { name: "Doanh nghiệp", code: "business" } });

  // 22. Customers (companies first so they can be responsibleCompany)
  const biz1 = await prisma.customer.create({ data: { name: "Công ty TNHH ABC Việt Nam", shortName: "ABC", code: "KH-001", categoryId: catBusiness.id, taxCode: "0123456789", phone: "028.3822.1234", email: "info@abc.vn", website: "https://abc.vn", entityId: ent.id } });
  const biz2 = await prisma.customer.create({ data: { name: "Tập đoàn XYZ", shortName: "XYZ", code: "KH-002", categoryId: catBusiness.id, taxCode: "9876543210", phone: "024.3822.5678", email: "contact@xyz.vn", entityId: ent.id } });
  const ind1 = await prisma.customer.create({ data: { name: "Nguyễn Văn An", code: "KH-003", categoryId: catIndividual.id, phone: "0909.123.456", email: "an.nguyen@gmail.com", responsibleCompanyId: biz1.id, entityId: ent.id } });
  const ind2 = await prisma.customer.create({ data: { name: "Trần Thị Bình", code: "KH-004", categoryId: catIndividual.id, phone: "0919.789.012", email: "binh.tran@gmail.com", responsibleCompanyId: biz1.id, entityId: ent.id } });
  const biz3 = await prisma.customer.create({ data: { name: "Công ty TNHH Dịch vụ CNTT Đông Tiến", shortName: "Đông Tiến", code: "KH-005", categoryId: catBusiness.id, taxCode: "0123456788", phone: "028.3822.9999", website: "https://dongtien.vn", responsibleCompanyId: biz2.id, entityId: ent.id } });

  // 23. Customer Addresses
  await prisma.customerAddress.create({ data: { customerId: biz1.id, address: "123 Nguyễn Huệ", city: "TP.HCM", state: "Việt Nam", type: "office", isDefault: true } });
  await prisma.customerAddress.create({ data: { customerId: biz2.id, address: "456 Lê Lợi", city: "Hà Nội", type: "office", isDefault: true } });
  await prisma.customerAddress.create({ data: { customerId: ind1.id, address: "789 Phạm Ngọc Thạch", city: "TP.HCM", type: "home", isDefault: true } });

  // 24. Customer Contacts
  await prisma.customerContact.create({ data: { customerId: biz1.id, firstName: "Mai Văn", lastName: "Hùng", email: "hung.maiv@abc.vn", phone: "0908.111.222", position: "Giám đốc", isPrimary: true } });
  await prisma.customerContact.create({ data: { customerId: biz1.id, firstName: "Lê Thị", lastName: "Hoa", email: "hoa.le@abc.vn", phone: "0908.333.444", position: "Kế toán" } });
  await prisma.customerContact.create({ data: { customerId: biz2.id, firstName: "Phạm Văn", lastName: "Tuấn", email: "tuan.pham@xyz.vn", phone: "0912.555.666", position: "IT Manager", isPrimary: true } });

  // 25. Customer Employees
  await prisma.customerEmployee.create({ data: { customerId: biz1.id, firstName: "Nguyễn Thị", lastName: "Lan", email: "lan.nguyen@abc.vn", phone: "0909.777.888", department: "IT" } });
  await prisma.customerEmployee.create({ data: { customerId: biz1.id, firstName: "Trần Văn", lastName: "Minh", email: "minh.tran@abc.vn", phone: "0909.999.000", department: "Kế toán" } });

  // 26. Consumable
  const consumableItem = await prisma.consumableitems.create({ data: { name: "HP LaserJet Toner CF280X", entitiesId: ent.id, alarmThreshold: 3 } });
  await prisma.consumables.create({ data: { consumableitemsId: consumableItem.id, dateIn: new Date(), entitiesId: ent.id } });

  console.log("Seed hoàn tất!");
  console.log("---");
  console.log("Admin: admin / admin123");
  console.log("KTV:   tech / admin123");
  console.log("User:  user / admin123");
  console.log("---");
  console.log("Assets: 1 Computer + ItemDisk, 1 Printer, 1 Network, 1 Monitor");
  console.log("Software License: 1 (Microsoft 365)");
  console.log("Tickets: 7 (nhiều trạng thái)");
  console.log("Customers: 5 (2 Doanh nghiệp + 3 Cá nhân)");
  console.log("Customer Categories: 2 (Cá nhân, Doanh nghiệp)");
  console.log("Customer Addresses: 3");
  console.log("Customer Contacts: 3");
  console.log("Customer Employees: 2");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, Th, Td } from "@/components/ui/table";
import { Monitor, Calendar, DollarSign, User, MapPin, Cpu, HardDrive, Wifi } from "lucide-react";

const statusLabel: Record<string, string> = {
  in_use: "Đang dùng", stored: "Lưu kho", repair: "Đang sửa", retired: "Đã thanh lý", broken: "Hỏng",
};
const statusVariant: Record<string, any> = {
  in_use: "success", stored: "default", repair: "warning", retired: "danger", broken: "danger",
};

const typeIcon: Record<string, string> = {
  computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱", software: "💿", peripheral: "🎮", other: "📦",
};

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      manufacturer: true, location: true, assignedTo: { select: { name: true } },
      computerDetail: { include: { diskVolumes: true, networkInterfaces: true, softwareInstalls: true } },
      printerDetail: true, networkDetail: true,
      licenseAssignments: { include: { license: true } },
    },
  });

  if (!asset || asset.organizationId !== session.user.organizationId) notFound();

  return (
    <div className="p-6 space-y-6 animate-in">
      <div className="flex items-start gap-4">
        <span className="text-3xl">{typeIcon[asset.assetType] || "📦"}</span>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">{asset.name}</h1>
            <Badge variant={statusVariant[asset.status]}>{statusLabel[asset.status]}</Badge>
            <Badge variant="primary" size="sm" className="capitalize">{asset.assetType}</Badge>
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
            {asset.serialNumber && <span className="font-mono">SN: {asset.serialNumber}</span>}
            {asset.manufacturer && <span>{asset.manufacturer.name}</span>}
            {asset.location && <span className="flex items-center gap-1"><MapPin size={14} />{asset.location.name}</span>}
            {asset.assignedTo && <span className="flex items-center gap-1"><User size={14} />{asset.assignedTo.name}</span>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Calendar size={20} className="text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Ngày mua</p><p className="text-sm font-medium">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "-"}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><DollarSign size={20} className="text-emerald-600" /></div>
          <div><p className="text-xs text-muted-foreground">Giá trị</p><p className="text-sm font-medium">{asset.price ? `${asset.price.toLocaleString("vi-VN")}đ` : "-"}</p></div>
        </CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 py-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Calendar size={20} className="text-amber-600" /></div>
          <div><p className="text-xs text-muted-foreground">Bảo hành đến</p><p className="text-sm font-medium">{asset.warrantyEnd ? new Date(asset.warrantyEnd).toLocaleDateString("vi-VN") : "-"}</p></div>
        </CardContent></Card>
      </div>

      {asset.computerDetail && (
        <>
          <Card>
            <CardHeader><CardTitle><Cpu size={16} /> Thông tin máy tính</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  ["CPU", asset.computerDetail.cpu], ["Cores", `${asset.computerDetail.cpuCores || "-"}`], ["Threads", `${asset.computerDetail.cpuThreads || "-"}`],
                  ["RAM", asset.computerDetail.ram], ["OS", asset.computerDetail.os], ["Phiên bản OS", asset.computerDetail.osVersion],
                  ["IP", asset.computerDetail.ipAddress], ["MAC", asset.computerDetail.macAddress], ["Hostname", asset.computerDetail.hostname],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground w-24">{l}</span>
                    <span className="font-medium">{v || "-"}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {asset.computerDetail.diskVolumes.length > 0 && (
            <Card>
              <CardHeader><CardTitle><HardDrive size={16} /> Ổ đĩa</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead><tr><Th>Mount</Th><Th>Dung lượng</Th><Th>Đã dùng</Th><Th>Hệ thống</Th></tr></THead>
                  <TBody>{asset.computerDetail.diskVolumes.map((d) => (
                    <tr key={d.id}><Td>{d.mountPoint}</Td><Td>{d.totalSize}GB</Td><Td>{d.usedSize}GB</Td><Td>{d.filesystem}</Td></tr>
                  ))}</TBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {asset.computerDetail.networkInterfaces.length > 0 && (
            <Card>
              <CardHeader><CardTitle><Wifi size={16} /> Network</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead><tr><Th>Tên</Th><Th>MAC</Th><Th>IP</Th><Th>Gateway</Th></tr></THead>
                  <TBody>{asset.computerDetail.networkInterfaces.map((n) => (
                    <tr key={n.id}><Td>{n.name}</Td><Td className="font-mono text-xs">{n.macAddress}</Td><Td>{n.ipAddress}</Td><Td>{n.gateway}</Td></tr>
                  ))}</TBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {asset.computerDetail.softwareInstalls.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Phần mềm</CardTitle></CardHeader>
              <CardContent className="p-0">
                <Table>
                  <THead><tr><Th>Tên</Th><Th>Phiên bản</Th><Th>Nhà phát hành</Th></tr></THead>
                  <TBody>{asset.computerDetail.softwareInstalls.map((s) => (
                    <tr key={s.id}><Td className="font-medium">{s.name}</Td><Td>{s.version}</Td><Td>{s.publisher}</Td></tr>
                  ))}</TBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {asset.printerDetail && (
        <Card>
          <CardHeader><CardTitle>🖨️ Thông tin máy in</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["Model", asset.printerDetail.modelName], ["Serial", asset.printerDetail.serial], ["IP", asset.printerDetail.ipAddress],
                ["Màu", asset.printerDetail.color ? "Có" : "Không"], ["2 mặt", asset.printerDetail.duplex ? "Có" : "Không"],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground w-24">{l}</span>
                  <span className="font-medium">{v || "-"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {asset.networkDetail && (
        <Card>
          <CardHeader><CardTitle>🌐 Thông tin mạng</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[["Model", asset.networkDetail.model], ["IP", asset.networkDetail.ipAddress], ["MAC", asset.networkDetail.macAddress],
                ["Ports", `${asset.networkDetail.portCount || "-"}`], ["Managed", asset.networkDetail.isManaged ? "Có" : "Không"],
              ].map(([l, v]) => (
                <div key={l} className="flex items-center gap-2 py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground w-24">{l}</span>
                  <span className="font-medium">{v || "-"}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {asset.licenseAssignments.length > 0 && (
        <Card>
          <CardHeader><CardTitle>🔑 Bản quyền phần mềm</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <THead><tr><Th>Bản quyền</Th><Th>Loại</Th><Th>Hạn</Th></tr></THead>
              <TBody>{asset.licenseAssignments.map((la) => (
                <tr key={la.id}><Td className="font-medium">{la.license.name}</Td><Td><Badge size="sm">{la.license.licenseType}</Badge></Td><Td>{la.license.expirationDate ? new Date(la.license.expirationDate).toLocaleDateString("vi-VN") : "-"}</Td></tr>
              ))}</TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Phone, Mail, Globe, MapPin, User, Briefcase, Building2, Plus, Trash2, Edit3, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SessionsTab } from "./tabs/collection-sessions-tab";

type CustomerDetail = {
  id: string; code: string; name: string; shortName: string | null;
  category: { id: string; name: string } | null;
  taxCode: string | null; website: string | null; phone: string | null; email: string | null;
  logo: string | null; note: string | null; isActive: boolean;
  createdAt: string; updatedAt: string;
  addresses: any[]; contacts: any[]; employees: any[]; items: any[];
};

export default function CustomerDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("info");

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);
  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const fetchData = () => {
    fetch(`/api/customers/${id}`).then(r => r.json()).then(d => { setCustomer(d); setLoading(false); });
  };

  useEffect(() => { fetchData(); }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-surface-secondary/30 pt-4 px-4 space-y-3">
      {[1,2,3,4].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!customer) return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
      Không tìm thấy khách hàng
    </div>
  );

  const tabs = [
    { key: "info", label: "Thông tin" },
    { key: "contacts", label: `Liên hệ (${customer.contacts.length})` },
    { key: "employees", label: `Nhân viên (${customer.employees.length})` },
    { key: "devices", label: "Thiết bị" },
    { key: "sessions", label: "Thu thập" },
    { key: "items", label: `Hạng mục (${customer.items.length})` },
    { key: "addresses", label: `Địa chỉ (${customer.addresses.length})` },
  ];

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-700"><ArrowLeft size={22} /></button>
            <h1 className="font-semibold text-base truncate">{customer.name}</h1>
          </div>
          <Link href={`/customers/${id}/edit`} className="p-2 text-gray-500"><Edit3 size={18} /></Link>
        </div>
        <div className="flex gap-1 px-4 overflow-x-auto no-scrollbar">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn("px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
                tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground"
              )}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4">
        {tab === "info" && <InfoTab customer={customer} />}
        {tab === "contacts" && <ContactsTab customer={customer} />}
        {tab === "employees" && <EmployeesTab customer={customer} />}
        {tab === "devices" && <DevicesTab customerId={id} />}
        {tab === "sessions" && <SessionsTab customerId={id} />}
        {tab === "items" && <ItemsTab customer={customer} id={id} onRelink={fetchData} />}
        {tab === "addresses" && <AddressesTab customer={customer} />}
      </div>
    </div>
  );
}

function InfoTab({ customer }: { customer: CustomerDetail }) {
  const InfoRow = ({ label, value }: { label: string; value: string | null }) => (
    value ? <div className="flex justify-between py-2 border-b border-gray-50"><span className="text-xs text-muted-foreground">{label}</span><span className="text-xs font-medium text-gray-800">{value}</span></div> : null
  );

  return (
    <div className="bg-white rounded-xl p-4 border border-border/50 space-y-3">
      <InfoRow label="Mã KH" value={customer.code} />
      <InfoRow label="Tên" value={customer.name} />
      <InfoRow label="Mã KH" value={customer.code} />
      <InfoRow label="Phân loại" value={customer.category?.name || null} />
      <InfoRow label="Mã số thuế" value={customer.taxCode} />
      <InfoRow label="Điện thoại" value={customer.phone} />
      <InfoRow label="Email" value={customer.email} />
      <InfoRow label="Website" value={customer.website} />
      {customer.note && (
        <div><span className="text-xs text-muted-foreground">Ghi chú</span><p className="text-xs text-gray-800 mt-1">{customer.note}</p></div>
      )}
      <InfoRow label="Ngày tạo" value={new Date(customer.createdAt).toLocaleDateString("vi-VN")} />
    </div>
  );
}

function ContactsTab({ customer }: { customer: CustomerDetail }) {
  if (customer.contacts.length === 0) return <p className="text-sm text-muted-foreground text-center pt-10">Chưa có người liên hệ</p>;
  return (
    <div className="space-y-2">
      {customer.contacts.map((c: any, i: number) => (
        <div key={c.id || i} className="bg-white rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center"><User size={16} className="text-blue-600" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium">{c.firstName} {c.lastName}</p>
              <p className="text-xs text-muted-foreground">{c.position}{c.department ? ` - ${c.department}` : ""}</p>
            </div>
            {c.isPrimary && <Badge variant="secondary" className="text-[10px]">Chính</Badge>}
          </div>
          {(c.phone || c.email) && (
            <div className="flex gap-3 mt-2 pt-2 border-t border-gray-50">
              {c.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={11} />{c.phone}</span>}
              {c.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={11} />{c.email}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function EmployeesTab({ customer }: { customer: CustomerDetail }) {
  if (customer.employees.length === 0) return <p className="text-sm text-muted-foreground text-center pt-10">Chưa có nhân viên</p>;
  return (
    <div className="space-y-2">
      {customer.employees.map((e: any, i: number) => (
        <div key={e.id || i} className="bg-white rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center"><Briefcase size={16} className="text-amber-600" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium">{e.firstName} {e.lastName}</p>
              <p className="text-xs text-muted-foreground">{e.position}{e.code ? ` - Mã: ${e.code}` : ""}</p>
            </div>
          </div>
          {(e.phone || e.email) && (
            <div className="flex gap-3 mt-2 pt-2 border-t border-gray-50">
              {e.phone && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Phone size={11} />{e.phone}</span>}
              {e.email && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Mail size={11} />{e.email}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ItemsTab({ customer, id, onRelink }: { customer: CustomerDetail; id: string; onRelink: () => void }) {
  const [items, setItems] = useState<any[]>(customer.items || []);
  const [showPicker, setShowPicker] = useState(false);

  useEffect(() => {
    fetch(`/api/customers/${id}/items`).then(r => r.json()).then(setItems);
  }, [id]);

  const linkItem = async (itemType: string, itemId: string) => {
    await fetch(`/api/customers/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId }),
    });
    onRelink();
    const r = await fetch(`/api/customers/${id}/items`).then(r => r.json());
    setItems(r);
    setShowPicker(false);
  };

  const unlinkItem = async (itemId: string) => {
    await fetch(`/api/customers/${id}/items`, {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: itemId }),
    });
    setItems(items.filter(i => i.id !== itemId));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">{items.length} hạng mục</p>
        <button onClick={() => setShowPicker(!showPicker)} className="flex items-center gap-1 text-xs text-primary font-medium">
          <Plus size={14} />Liên kết
        </button>
      </div>

      {showPicker && <ItemPicker onSelect={linkItem} onClose={() => setShowPicker(false)} />}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center pt-6">Chưa có hạng mục nào được liên kết</p>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            // Map item type to route
            const routeMap: Record<string, string> = {
              Computers: "assets", Monitors: "assets", Printers: "assets",
              Networkequipments: "assets", Peripherals: "assets", Phones: "assets",
              Softwares: "assets", Softwarelicenses: "licenses",
              Tickets: "tickets", Problems: "problems", Changes: "changes",
              Contracts: "contracts", Certificates: "certificates",
              Domains: "domains", Projects: "projects",
              Budgets: "budgets", Consumableitems: "consumables",
            };
            const route = routeMap[item.itemType] || item.itemType?.toLowerCase();
            return (
              <Link key={item.id} href={`/${route}/${item.itemId}`}
                className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-border/50 hover:border-primary/40 hover:shadow-md transition-all group">
                <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">{item.itemLabel?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.itemName || "Đang tải..."}</p>
                  <p className="text-xs text-muted-foreground">{item.itemLabel} · {item.relation === "managed" ? "Quản lý" : item.relation === "owned" ? "Sở hữu" : item.relation === "used" ? "Sử dụng" : item.relation}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-primary flex-shrink-0" />
                <button onClick={(e) => { e.preventDefault(); unlinkItem(item.id); }} className="p-1.5 text-gray-300 hover:text-danger hover:bg-red-50 rounded-lg transition-all" title="Bỏ liên kết">
                  <Trash2 size={14} />
                </button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ITEM_TYPES = [
  { type: "Computers", label: "Máy tính" }, { type: "Monitors", label: "Màn hình" },
  { type: "Printers", label: "Máy in" }, { type: "Networkequipments", label: "Thiết bị mạng" },
  { type: "Peripherals", label: "Ngoại vi" }, { type: "Phones", label: "Điện thoại" },
  { type: "Softwarelicenses", label: "Bản quyền" }, { type: "Tickets", label: "Ticket" },
  { type: "Contracts", label: "Hợp đồng" }, { type: "Certificates", label: "Chứng chỉ" },
  { type: "Domains", label: "Domain" }, { type: "Projects", label: "Dự án" },
  { type: "Budgets", label: "Ngân sách" }, { type: "Consumableitems", label: "Vật tư" },
];

function ItemPicker({ onSelect, onClose }: { onSelect: (type: string, id: string) => void; onClose: () => void }) {
  const [type, setType] = useState("Computers");
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const routeMap: Record<string, string> = {
      Computers: "assets", Monitors: "assets", Printers: "assets",
      Networkequipments: "assets", Peripherals: "assets", Phones: "assets",
      Softwares: "assets", Softwarelicenses: "licenses",
      Consumableitems: "consumables",
      Tickets: "tickets", Problems: "problems", Changes: "changes",
      Contracts: "contracts", Certificates: "certificates",
      Domains: "domains", Projects: "projects", Budgets: "budgets",
    };
    const key = routeMap[type] || "";
    fetch(`/api/${key}`).then(r => r.json()).then((d) => {
      setItems(Array.isArray(d) ? d : []);
    }).catch(() => setItems([]));
  }, [type]);

  const filtered = items.filter((i: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (i.name || "").toLowerCase().includes(q);
  });

  return (
    <div className="bg-white rounded-xl border border-border/50 mb-3 overflow-hidden">
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <select value={type} onChange={(e) => setType(e.target.value)} className="flex-1 h-8 px-2 text-xs rounded-lg border border-border">
            {ITEM_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
          </select>
          <button onClick={onClose} className="text-xs text-muted-foreground">Đóng</button>
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm..." className="w-full h-8 px-3 text-xs rounded-full bg-gray-100 focus:outline-hidden" />
      </div>
      <div className="max-h-48 overflow-y-auto border-t border-border/50">
        {filtered.map((i: any) => (
          <button key={i.id} onClick={() => onSelect(type, i.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-gray-50 text-left">
            <span className="font-medium truncate flex-1">{i.name}</span>
            <ExternalLink size={12} className="text-gray-300" />
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Không tìm thấy</p>}
      </div>
    </div>
  );
}

function AddressesTab({ customer }: { customer: CustomerDetail }) {
  if (customer.addresses.length === 0) return <p className="text-sm text-muted-foreground text-center pt-10">Chưa có địa chỉ</p>;
  const typeLabels: Record<string, string> = { office: "Văn phòng", warehouse: "Kho", billing: "Hóa đơn", shipping: "Giao hàng", home: "Nhà riêng" };
  return (
    <div className="space-y-2">
      {customer.addresses.map((a: any, i: number) => (
        <div key={a.id || i} className="bg-white rounded-xl p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} className="text-primary" />
            <span className="text-sm font-medium">{a.label || typeLabels[a.type] || a.type}</span>
            {a.isDefault && <Badge variant="secondary" className="text-[10px]">Mặc định</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{a.address}{a.city ? `, ${a.city}` : ""}{a.state ? `, ${a.state}` : ""}</p>
          <p className="text-xs text-muted-foreground">{a.country}{a.postalCode ? ` - ${a.postalCode}` : ""}</p>
        </div>
      ))}
    </div>
  );
}

/* ===== DEVICES TAB ===== */
const DEVICE_ICONS: Record<string, string> = {
  computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱", peripheral: "🎮", server: "🖥️", other: "📦",
};
const DEVICE_LABELS: Record<string, string> = {
  computer: "Máy tính", monitor: "Màn hình", printer: "Máy in", network: "Mạng", phone: "Điện thoại",
  peripheral: "Ngoại vi", server: "Máy chủ", other: "Khác",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Đang dùng", broken: "Hỏng", stored: "Lưu kho", retired: "Thanh lý",
};
const CONDITION_LABELS: Record<string, string> = {
  good: "Tốt", fair: "Tạm được", broken: "Hỏng", damaged: "Hư hại", other: "Khác",
};
const CONDITION_COLORS: Record<string, string> = {
  good: "bg-green-100 text-green-700",
  fair: "bg-amber-100 text-amber-700",
  broken: "bg-red-100 text-red-700",
  damaged: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

function DevicesTab({ customerId }: { customerId: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterType, setFilterType] = useState("");
  const [addresses, setAddresses] = useState<any[]>([]);

  const loadDevices = () => {
    const url = filterType ? `/api/customers/${customerId}/devices?deviceType=${filterType}` : `/api/customers/${customerId}/devices`;
    fetch(url).then(r => r.json()).then(d => { setDevices(d); setLoading(false); });
    fetch(`/api/customers/${customerId}/addresses`).then(r => r.json()).then(d => setAddresses(Array.isArray(d) ? d : []));
  };

  useEffect(() => { loadDevices(); }, [customerId, filterType]);

  const deleteDevice = async (id: string) => {
    if (!confirm("Xoá thiết bị này?")) return;
    await fetch(`/api/customers/${customerId}/devices/${id}`, { method: "DELETE" });
    loadDevices();
  };

  const deviceTypes = Object.keys(DEVICE_LABELS);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          <button onClick={() => setFilterType("")}
            className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
              !filterType ? "bg-primary text-white" : "bg-gray-100 text-gray-600")}>
            Tất cả ({devices.length})
          </button>
          {deviceTypes.map(t => (
            <button key={t} onClick={() => setFilterType(t)}
              className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors",
                filterType === t ? "bg-primary text-white" : "bg-gray-100 text-gray-600")}>
              {DEVICE_ICONS[t]} {DEVICE_LABELS[t]}
            </button>
          ))}
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }}
          className="flex items-center gap-1 text-xs text-primary font-medium ml-2 flex-shrink-0">
          <Plus size={14} />Thêm
        </button>
      </div>

      {showForm && (
        <DeviceForm
          customerId={customerId}
          device={editing}
          addresses={addresses}
          onSave={() => { setShowForm(false); setEditing(null); loadDevices(); }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : devices.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-3xl">📦</span>
          <p className="text-sm text-gray-500 mt-2">Chưa có thiết bị nào</p>
          <p className="text-xs text-gray-400 mt-1">Nhấn "Thêm" để ghi nhận thiết bị tại khách hàng</p>
        </div>
      ) : (
        <div className="space-y-2">
          {devices.map((d: any) => (
            <DeviceCard key={d.id} device={d} onEdit={() => { setEditing(d); setShowForm(true); }} onDelete={() => deleteDevice(d.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device, onEdit, onDelete }: { device: any; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-border/50 group">
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg flex-shrink-0">
            {DEVICE_ICONS[device.deviceType] || "📦"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h4 className="font-medium text-sm text-gray-900 truncate">
                {device.manufacturer && device.modelName ? `${device.manufacturer} ${device.modelName}` :
                 device.manufacturer || device.modelName || DEVICE_LABELS[device.deviceType] || device.deviceType}
              </h4>
              {device.quantity > 1 && <span className="text-[11px] text-gray-400">x{device.quantity}</span>}
              <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",
                device.status === "active" ? "bg-green-100 text-green-700" :
                device.status === "broken" ? "bg-red-100 text-red-700" :
                device.status === "stored" ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-600")}>
                {STATUS_LABELS[device.status] || device.status}
              </span>
              {device.condition && (
                <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium",
                  device.condition === "good" ? "bg-green-100 text-green-700" :
                  device.condition === "fair" ? "bg-amber-100 text-amber-700" :
                  device.condition === "broken" ? "bg-red-100 text-red-700" :
                  device.condition === "damaged" ? "bg-orange-100 text-orange-700" :
                  "bg-gray-100 text-gray-600")}>
                  {CONDITION_LABELS[device.condition] || device.condition}
                </span>
              )}
            </div>
            {device.serialNumber && <p className="text-[11px] text-gray-500 mt-0.5 font-mono">SN: {device.serialNumber}</p>}
            {device.ipAddress && <p className="text-[11px] text-gray-500">{device.ipAddress}</p>}
              {device.assignedTo && (
                <p className="text-[11px] text-blue-600 mt-0.5">👤 {device.assignedTo.firstName || ""} {device.assignedTo.lastName || ""}{device.assignedTo.code ? ` (${device.assignedTo.code})` : ""}</p>
              )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {device.cpu && <span className="text-[10px] text-gray-400">{device.cpu}</span>}
              {device.ram && <span className="text-[10px] text-gray-400">RAM: {device.ram}</span>}
              {device.disk && <span className="text-[10px] text-gray-400">{device.disk}</span>}
              {device.os && <span className="text-[10px] text-gray-400">{device.os}</span>}
              {device.locationDetail && <span className="text-[10px] text-gray-400">📍 {device.locationDetail}</span>}
              {device.address && <span className="text-[10px] text-gray-400">📌 {device.address.label || device.address.address}</span>}
            </div>
            {device.notes && <p className="text-[10px] text-gray-400 mt-1 italic">{device.notes}</p>}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center">
              <Edit3 size={13} />
            </button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-600 flex items-center justify-center">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const NEW_DEVICE_DEFAULTS = {
  deviceType: "computer", manufacturer: "", modelName: "", serialNumber: "", assetTag: "",
  ipAddress: "", macAddress: "", cpu: "", ram: "", disk: "", os: "",
  addressId: null as string | null, locationDetail: "", assignedToId: null as string | null,
  status: "active", condition: null as string | null, quantity: 1, notes: "",
};

function DeviceForm({ customerId, device, addresses, onSave, onCancel }: {
  customerId: string; device: any; addresses: any[]; onSave: () => void; onCancel: () => void;
}) {
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState(device ? {
    deviceType: device.deviceType, manufacturer: device.manufacturer || "", modelName: device.modelName || "",
    serialNumber: device.serialNumber || "", assetTag: device.assetTag || "",
    ipAddress: device.ipAddress || "", macAddress: device.macAddress || "",
    cpu: device.cpu || "", ram: device.ram || "", disk: device.disk || "", os: device.os || "",
    addressId: device.addressId || null, locationDetail: device.locationDetail || "",
    assignedToId: device.assignedToId || null, status: device.status || "active",
    condition: device.condition || null, quantity: device.quantity || 1, notes: device.notes || "",
  } : { ...NEW_DEVICE_DEFAULTS });
  const [saving, setSaving] = useState(false);
  const isComputer = form.deviceType === "computer";

  useEffect(() => {
    fetch(`/api/customers/${customerId}/employees`).then(r => r.json())
      .then(d => setEmployees(Array.isArray(d) ? d : []));
  }, [customerId]);

  const handleSave = async () => {
    setSaving(true);
    const url = device
      ? `/api/customers/${customerId}/devices/${device.id}`
      : `/api/customers/${customerId}/devices`;
    const method = device ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await res.json();
    setSaving(false);
    if (!d.error) onSave();
  };

  const set = (key: string, val: any) => setForm((prev: any) => ({ ...prev, [key]: val }));

  return (
    <div className="bg-white rounded-xl border border-border/50 mb-3 overflow-hidden">
      <div className="p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-gray-900">{device ? "Sửa thiết bị" : "Thêm thiết bị"}</h4>
          <button onClick={onCancel} className="text-xs text-gray-500">Huỷ</button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">Loại</label>
            <select value={form.deviceType} onChange={e => set("deviceType", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
              {Object.entries(DEVICE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{DEVICE_ICONS[k]} {v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Số lượng</label>
            <input type="number" min={1} value={form.quantity} onChange={e => set("quantity", Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">Hãng</label>
            <input value={form.manufacturer} onChange={e => set("manufacturer", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" placeholder="Dell, HP..." />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Model</label>
            <input value={form.modelName} onChange={e => set("modelName", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" placeholder="Optiplex 3080" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">Serial Number</label>
            <input value={form.serialNumber} onChange={e => set("serialNumber", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 font-mono" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Mã tài sản (KH)</label>
            <input value={form.assetTag} onChange={e => set("assetTag", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">IP</label>
            <input value={form.ipAddress} onChange={e => set("ipAddress", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">MAC</label>
            <input value={form.macAddress} onChange={e => set("macAddress", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 font-mono" />
          </div>
        </div>

        {isComputer && (
          <div className="bg-blue-50/50 rounded-lg p-2.5 space-y-2">
            <p className="text-[10px] font-medium text-blue-700">Thông số máy tính</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-gray-500">CPU</label>
                <input value={form.cpu} onChange={e => set("cpu", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">RAM</label>
                <input value={form.ram} onChange={e => set("ram", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" placeholder="8GB" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Ổ đĩa</label>
                <input value={form.disk} onChange={e => set("disk", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" placeholder="256GB SSD" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">OS</label>
                <input value={form.os} onChange={e => set("os", e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" placeholder="Windows 11" />
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">Địa chỉ (vị trí lắp đặt)</label>
            <select value={form.addressId || ""} onChange={e => set("addressId", e.target.value || null)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
              <option value="">— Không chọn —</option>
              {addresses.map((a: any) => (
                <option key={a.id} value={a.id}>{a.label || a.address}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Vị trí chi tiết</label>
            <input value={form.locationDetail} onChange={e => set("locationDetail", e.target.value)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400" placeholder="Phòng 201, Lầu 3" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">Gán cho nhân viên</label>
            <select value={form.assignedToId || ""} onChange={e => set("assignedToId", e.target.value || null)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
              <option value="">— Chưa gán —</option>
              {employees.map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName || ""} {e.lastName || ""}{e.code ? ` (${e.code})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500">Tình trạng</label>
            <select value={form.condition || ""} onChange={e => set("condition", e.target.value || null)}
              className="w-full h-8 px-2 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400">
              <option value="">— Chưa đánh giá —</option>
              {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-[10px] text-gray-500">Ghi chú</label>
          <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
            className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-hidden focus:border-blue-400 resize-none" />
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full h-8 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-600 disabled:opacity-50 transition flex items-center justify-center gap-1.5">
          {saving ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
          {saving ? "Đang lưu..." : device ? "Cập nhật" : "Thêm thiết bị"}
        </button>
      </div>
    </div>
  );
}

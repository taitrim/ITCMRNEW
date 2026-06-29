"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, Suspense } from "react";
import Link from "next/link";
import { Search, Plus, Building2, User, Briefcase, MapPin, ChevronRight, Phone, Mail, SlidersHorizontal, X, Save, Trash2, Edit3, ExternalLink, Globe, Upload, Building, Users, Tag, CreditCard, Calendar, FileText, Shield, FolderKanban, Wallet, Monitor, Ticket, Wrench, AlertTriangle, Printer, KeyRound, Package, LayoutGrid, List as ListIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SessionsTab } from "./[id]/tabs/collection-sessions-tab";

const ITEM_LABELS: Record<string, string> = {
  Computers: "Máy tính", Monitors: "Màn hình", Printers: "Máy in",
  Networkequipments: "Thiết bị mạng", Peripherals: "Ngoại vi",
  Phones: "Điện thoại", Softwares: "Phần mềm", Softwarelicenses: "Bản quyền",
  Tickets: "Ticket", Problems: "Problem", Changes: "Change",
  Contracts: "Hợp đồng", Certificates: "Chứng chỉ",
  Domains: "Domain", Projects: "Dự án",
  Budgets: "Ngân sách", Consumableitems: "Vật tư",
};
const ITEM_ROUTES: Record<string, string> = {
  Computers: "assets", Monitors: "assets", Printers: "assets",
  Networkequipments: "assets", Peripherals: "assets", Phones: "assets",
  Softwares: "assets", Softwarelicenses: "licenses",
  Tickets: "tickets", Problems: "problems", Changes: "changes",
  Contracts: "contracts", Certificates: "certificates",
  Domains: "domains", Projects: "projects",
  Budgets: "budgets", Consumableitems: "consumables",
};

const ITEM_TYPES = [
  { type: "Computers", label: "Máy tính", icon: Monitor },
  { type: "Monitors", label: "Màn hình", icon: Monitor },
  { type: "Printers", label: "Máy in", icon: Printer },
  { type: "Networkequipments", label: "Thiết bị mạng", icon: Monitor },
  { type: "Softwarelicenses", label: "Bản quyền", icon: KeyRound },
  { type: "Tickets", label: "Ticket", icon: Ticket },
  { type: "Contracts", label: "Hợp đồng", icon: FileText },
  { type: "Certificates", label: "Chứng chỉ", icon: Shield },
  { type: "Domains", label: "Domain", icon: Globe },
  { type: "Projects", label: "Dự án", icon: FolderKanban },
  { type: "Budgets", label: "Ngân sách", icon: Wallet },
  { type: "Consumableitems", label: "Vật tư", icon: Package },
];

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
      <CustomersPageInner />
    </Suspense>
  );
}

function CustomersPageInner() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  const fetchList = () => {
    fetch("/api/customers").then(r => r.json()).then(d => { setCustomers(d); setLoading(false); });
  };

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);

  useEffect(() => {
    if (status !== "loading") { fetchList(); fetch("/api/customers/categories").then(r => r.json()).then(setCategories); }
  }, [status]);

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const modal = sp.get("create") === "true" ? "create" : sp.get("id") ? (sp.get("edit") === "true" ? "edit" : "detail") : null;
  const selectedId = sp.get("id") || null;

  const filtered = customers.filter(c => {
    if (filterCat && c.category?.id !== filterCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.name || "").toLowerCase().includes(q) || (c.code || "").toLowerCase().includes(q) ||
        (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q);
    }
    return true;
  });

  const closeModal = () => router.push("/customers");

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      {/* Header */}
      <div className="px-4 pt-3 pb-2 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-full bg-gray-100 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm kiếm khách hàng..." />
          </div>
          <button onClick={() => router.push("/customers?create=true")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30"
          ><Plus size={20} /></button>
          <button onClick={() => setViewMode(viewMode === "list" ? "grid" : "list")}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            {viewMode === "list" ? <LayoutGrid size={18} /> : <ListIcon size={18} />}
          </button>
          <button onClick={() => setShowFilter(!showFilter)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <SlidersHorizontal size={18} />
          </button>
        </div>
        {/* Filter theo phân loại */}
        {categories.length > 0 && (
          <div className="flex gap-1 mt-3 overflow-x-auto no-scrollbar">
            <button onClick={() => setFilterCat("")}
              className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all", !filterCat ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
            >Tất cả</button>
            {categories.map((c) => (
              <button key={c.id} onClick={() => setFilterCat(c.id)}
                className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all", filterCat === c.id ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200")}
              >{c.name}</button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3 px-4 pt-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
          <Building2 size={48} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium">Chưa có khách hàng</p>
          <button onClick={() => router.push("/customers?create=true")} className="mt-2 text-sm text-primary font-medium">Thêm khách hàng đầu tiên</button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="px-4 pt-3 grid grid-cols-2 gap-3">
          <div className="col-span-2 flex items-center justify-between px-0.5">
            <p className="text-xs text-muted-foreground">{filtered.length} khách hàng</p>
          </div>
          {filtered.map((c) => (
            <div key={c.id}
              className="bg-white rounded-2xl border border-border/40 shadow-xs active:scale-[0.97] transition-all hover:shadow-md"
            >
              <button onClick={() => router.push(`/customers?id=${c.id}`)} className="w-full text-left p-3 pb-1.5">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs",
                    c.category?.name === "Doanh nghiệp" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white"
                  )}>
                    {c.logo ? <img src={c.logo} className="w-full h-full rounded-full object-cover" /> : (c.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[13px] text-gray-900 truncate leading-tight">{c.name}</p>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      {c.code && <span className="text-[9px] text-muted-foreground bg-gray-100 px-1 rounded">{c.code}</span>}
                      {c.category && <Badge variant={c.category.name === "Doanh nghiệp" ? "warning" : "primary"} size="sm" className="text-[8px]">{c.category.name}</Badge>}
                    </div>
                  </div>
                </div>
              </button>
              <div className="px-3 pb-3 space-y-1">
                {c.phone && (
                  <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-green-600"
                  ><Phone size={10} className="text-green-500" />{c.phone}</a>
                )}
                {c.email && (
                  <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-blue-600 truncate"
                  ><Mail size={10} className="text-blue-500" />{c.email}</a>
                )}
                {c.addresses?.[0] && (
                  <a href={`https://maps.google.com/?q=${encodeURIComponent([c.addresses[0].address, c.addresses[0].city, c.addresses[0].state].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-amber-600 truncate"
                  ><MapPin size={10} className="text-amber-500 flex-shrink-0" /><span className="truncate">{[c.addresses[0].address, c.addresses[0].city].filter(Boolean).join(", ")}</span></a>
                )}
                <div className="flex items-center gap-2 pt-0.5">

                  <div className="flex items-center gap-1 ml-auto text-[9px]">
                    {c._count?.items > 0 && <span className="bg-cyan-50 text-cyan-600 rounded px-1 py-0.5 font-medium flex items-center gap-0.5"><Monitor size={8} />{c._count.items}</span>}
                    {c._count?.employees > 0 && <span className="bg-orange-50 text-orange-600 rounded px-1 py-0.5 font-medium flex items-center gap-0.5"><Briefcase size={8} />{c._count.employees}</span>}
                    {c._count?.contacts > 0 && <span className="bg-purple-50 text-purple-600 rounded px-1 py-0.5 font-medium flex items-center gap-0.5"><Users size={8} />{c._count.contacts}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-2 pb-4">
          <div className="flex items-center justify-between px-0.5">
            <p className="text-xs text-muted-foreground">{filtered.length} khách hàng</p>
          </div>
          {filtered.map((c) => (
            <div key={c.id}
              onClick={() => router.push(`/customers?id=${c.id}`)}
              className="bg-white rounded-xl border border-border/30 shadow-xs active:scale-[0.99] transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
            >
              {/* Main row */}
              <div className="flex items-center gap-3 p-3">
                {/* Avatar */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-xs",
                  c.category?.name === "Doanh nghiệp" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white",
                )}>
                  {c.logo ? <img src={c.logo} alt="" className="w-full h-full rounded-full object-cover" /> : (c.name || "?").charAt(0).toUpperCase()}
                </div>

                {/* Info column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-gray-900 truncate">{c.name}</p>
                    {c.code && <span className="text-[9px] text-muted-foreground bg-gray-100 px-1 rounded shrink-0 leading-4">{c.code}</span>}
                    {c.taxCode && <span className="text-[9px] text-amber-600 bg-amber-50 px-1 rounded shrink-0 hidden sm:inline leading-4">MST: {c.taxCode}</span>}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {c.category && <Badge variant={c.category.name === "Doanh nghiệp" ? "warning" : "primary"} size="sm" className="text-[9px] px-1.5">{c.category.name}</Badge>}

                  </div>
                  {/* Quick contacts row */}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-0.5 hover:text-green-600"
                      ><Phone size={9} className="text-green-400" />{c.phone}</a>
                    )}
                    {c.email && (
                      <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-0.5 hover:text-blue-600 truncate max-w-[140px]"
                      ><Mail size={9} className="text-blue-400" /><span className="truncate">{c.email}</span></a>
                    )}
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-0.5 hover:text-indigo-600 hidden sm:inline-flex"
                      ><Globe size={9} className="text-indigo-400" />{c.website.replace(/^https?:\/\//, "").replace(/\/$/, "").slice(0, 18)}</a>
                    )}
                  </div>
                </div>

                {/* Stats chips */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {c._count?.items > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-cyan-600 bg-cyan-50 rounded-md px-1.5 py-0.5 font-medium">
                          <Monitor size={9} />{c._count.items}
                        </span>
                      )}
                      {c._count?.employees > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-orange-600 bg-orange-50 rounded-md px-1.5 py-0.5 font-medium">
                          <Briefcase size={9} />{c._count.employees}
                        </span>
                      )}
                      {c._count?.contacts > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-purple-600 bg-purple-50 rounded-md px-1.5 py-0.5 font-medium">
                          <Users size={9} />{c._count.contacts}
                        </span>
                      )}
                      {c._count?.addresses > 0 && (
                        <span className="flex items-center gap-0.5 text-[9px] text-amber-600 bg-amber-50 rounded-md px-1.5 py-0.5 font-medium">
                          <MapPin size={9} />{c._count.addresses}
                        </span>
                      )}
                    </div>
                    {c.addresses?.[0] && (
                      <a href={`https://maps.google.com/?q=${encodeURIComponent([c.addresses[0].address, c.addresses[0].city, c.addresses[0].state].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                        className="text-[9px] text-gray-400 hover:text-amber-600 truncate max-w-[140px] text-right leading-tight"
                      ><MapPin size={8} className="inline mr-0.5 text-amber-400" />{c.addresses[0].city || c.addresses[0].address?.slice(0, 20)}</a>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-0 lg:pt-8 lg:px-8">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white w-full max-w-6xl flex flex-col h-full lg:h-[95vh] lg:rounded-2xl lg:shadow-2xl overflow-hidden animate-in-up">
            {modal === "create" && <CreateCustomer onClose={closeModal} onDone={() => { closeModal(); fetchList(); }} />}
            {modal === "detail" && selectedId && <DetailCustomer id={selectedId} onClose={closeModal} onEdit={() => router.push(`/customers?id=${selectedId}&edit=true`)} />}
            {modal === "edit" && selectedId && <EditCustomer id={selectedId} onClose={closeModal} onDone={() => { closeModal(); }} />}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color, action }: { icon: any; title: string; color: string; action?: React.ReactNode }) {
  return (
    <div className={cn("flex items-center justify-between px-4 py-2.5 rounded-t-xl", color)}>
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-white/90" />
        <span className="text-sm font-semibold text-white">{title}</span>
      </div>
      {action}
    </div>
  );
}

// ─── address type helpers ─────────────────────────────
const ADDR_COLORS: Record<string, string> = {
  office: "bg-blue-100 text-blue-700", warehouse: "bg-amber-100 text-amber-700",
  billing: "bg-green-100 text-green-700", shipping: "bg-purple-100 text-purple-700",
  home: "bg-rose-100 text-rose-700", other: "bg-gray-100 text-gray-700",
};
const ADDR_LABELS: Record<string, string> = {
  office: "VP", warehouse: "Kho", billing: "HĐ", shipping: "GH", home: "Nhà", other: "Khác",
};
const ADDR_OPTIONS = [
  ["office", "Văn phòng"], ["warehouse", "Kho"], ["billing", "Hóa đơn"],
  ["shipping", "Giao hàng"], ["home", "Nhà riêng"], ["other", "Khác"],
];
function addrColor(type: string) { return ADDR_COLORS[type] || ADDR_COLORS.other; }
function addrLabel(type: string) { return ADDR_LABELS[type] || type; }

/* ===== CREATE MODAL ===== */
function CreateCustomer({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [codeDuplicate, setCodeDuplicate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", code: "", categoryId: "", taxCode: "", website: "", phone: "", email: "", note: "", logo: "", responsibleCompanyId: "" });
  const [contacts, setContacts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  const selectedCat = categories.find((c: any) => c.id === form.categoryId);
  const isBusiness = selectedCat?.code === "business";

  useEffect(() => {
    fetch("/api/customers/categories").then(r => r.json()).then(setCategories);
    fetch("/api/customers/companies").then(r => r.json()).then(setCompanies);
  }, []);

  // Suggest code when category changes
  useEffect(() => {
    if (isBusiness && form.name) {
      const initials = form.name.replace(/[^A-Za-zÀ-ỹ]/g, "").substring(0, 6).toUpperCase();
      setForm((f) => ({ ...f, code: initials ? `${initials}-` : f.code }));
    } else if (!isBusiness && form.categoryId) {
      // individual: show placeholder, actual code generated server-side
      setForm((f) => ({ ...f, code: "" }));
    }
  }, [form.categoryId]);

  // Check duplicate code
  useEffect(() => {
    if (!form.code || form.code.endsWith("-") || !isBusiness) { setCodeDuplicate(false); return; }
    fetch(`/api/customers/check-code?code=${encodeURIComponent(form.code)}`)
      .then(r => r.json())
      .then(d => setCodeDuplicate(d.exists))
      .catch(() => setCodeDuplicate(false));
  }, [form.code, isBusiness]);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/customers/upload", { method: "POST", body: fd });
    const data = await res.json();
    setForm({ ...form, logo: data.url });
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    if (codeDuplicate) { alert("Mã khách hàng đã tồn tại. Vui lòng nhập mã khác."); return; }
    setSaving(true);
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, contacts, employees, addresses }),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Lỗi khi tạo khách hàng");
      setSaving(false);
      return;
    }
    setSaving(false);
    onDone();
  };

  const inp = (val: string, set: (v: string) => void, placeholder = "", type = "text") => (
    <input type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder}
      className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all" />
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 -ml-1 text-gray-500 hover:text-gray-700"><X size={20} /></button>
          <h2 className="font-semibold text-base">Thêm khách hàng</h2>
        </div>
        <button onClick={handleSubmit} disabled={saving || !form.name}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary to-primary-600 text-white rounded-full text-sm font-medium disabled:opacity-50 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
        ><Save size={16} />{saving ? "Đang lưu..." : "Lưu"}</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Logo + Basic Info */}
        <div className="p-4">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={User} title="Thông tin chung" color="bg-gradient-to-r from-blue-500 to-blue-600" />
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <button onClick={() => fileRef.current?.click()} className="relative w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary hover:bg-blue-50 transition-all group">
                  {form.logo ? <img src={form.logo} className="w-full h-full object-cover" /> : <Upload size={24} className="text-gray-400 group-hover:text-primary" />}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </button>
                <div className="text-xs text-muted-foreground">
                  <p className="font-medium text-gray-700">Logo khách hàng</p>
                  <p>Nhấn để tải lên (JPG, PNG)</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Tên khách hàng *</label>{inp(form.name, (v) => setForm({ ...form, name: v }), "Nhập tên khách hàng / công ty")}</div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Phân loại</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                  ><option value="">Chọn loại</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Mã khách hàng</label>
                  {isBusiness ? (
                    <div className="relative">
                      {inp(form.code, (v) => setForm({ ...form, code: v }), "VD: VNPT-001")}
                      {codeDuplicate && <p className="text-[10px] text-red-500 mt-0.5">Mã đã tồn tại</p>}
                    </div>
                  ) : (
                    <div className="h-9 px-3 text-sm rounded-lg border border-dashed border-gray-300 bg-gray-50/50 text-gray-400 flex items-center gap-1.5">
                      <Hash size={13} className="text-gray-300" />
                      <span>Tự động (sau khi chọn loại)</span>
                    </div>
                  )}
                </div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Mã số thuế</label>{inp(form.taxCode, (v) => setForm({ ...form, taxCode: v }), "MST")}</div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Điện thoại</label>{inp(form.phone, (v) => setForm({ ...form, phone: v }), "Số điện thoại")}</div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>{inp(form.email, (v) => setForm({ ...form, email: v }), "Email", "email")}</div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>{inp(form.website, (v) => setForm({ ...form, website: v }), "https://")}</div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Công ty phụ trách</label>
                  <select value={form.responsibleCompanyId} onChange={(e) => setForm({ ...form, responsibleCompanyId: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  ><option value="">-- Chọn --</option>{companies.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={User} title="Người liên hệ" color="bg-gradient-to-r from-purple-500 to-purple-600" action={
              <button onClick={() => setContacts([...contacts, { firstName: "", lastName: "", position: "", phone: "", email: "", isPrimary: false }])}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1"><Plus size={14} />Thêm</button>
            } />
            <div className="p-4 space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-purple-50/30 rounded-xl border border-dashed border-purple-200">
                  <User size={32} className="mx-auto mb-2 text-purple-300" />
                  <p className="text-xs font-medium">Chưa có người liên hệ</p>
                  <button onClick={() => setContacts([...contacts, { firstName: "", lastName: "", position: "", phone: "", email: "", isPrimary: false }])}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium">+ Thêm người liên hệ</button>
                </div>
              ) : contacts.map((c: any, i: number) => (
                <div key={i} className="relative bg-white rounded-xl border border-purple-100 shadow-xs hover:shadow-sm transition-all">
                  <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-600 rounded-l-xl" />
                  <div className="p-3 pl-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {((c.firstName?.charAt(0) || "") + (c.lastName?.charAt(0) || "")).toUpperCase() || "?"}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">#{i + 1}</span>
                        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                          <input type="checkbox" checked={c.isPrimary} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], isPrimary: e.target.checked }; setContacts(x); }}
                            className="w-3 h-3 rounded border-gray-300 text-purple-600" />
                          Chính
                        </label>
                      </div>
                      <button onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X size={12} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Họ" value={c.firstName} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], firstName: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Tên" value={c.lastName} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], lastName: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Chức vụ" value={c.position} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], position: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Điện thoại" value={c.phone} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], phone: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Email" value={c.email} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], email: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all col-span-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="px-4 pb-4">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={MapPin} title="Địa chỉ" color="bg-gradient-to-r from-amber-500 to-amber-600" action={
              <button onClick={() => setAddresses([...addresses, { label: "", type: "office", address: "", city: "", state: "", country: "Việt Nam", isDefault: false }])}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1"><Plus size={14} />Thêm</button>
            } />
            <div className="p-4 space-y-3">
              {addresses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-amber-50/30 rounded-xl border border-dashed border-amber-200">
                  <MapPin size={32} className="mx-auto mb-2 text-amber-300" />
                  <p className="text-xs font-medium">Chưa có địa chỉ</p>
                  <button onClick={() => setAddresses([...addresses, { label: "", type: "office", address: "", city: "", state: "", country: "Việt Nam", isDefault: false }])}
                    className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium">+ Thêm địa chỉ</button>
                </div>
              ) : addresses.map((a: any, i: number) => (
                <div key={i} className="relative bg-white rounded-xl border border-amber-100 shadow-xs hover:shadow-sm transition-all">
                  <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-l-xl" />
                  <div className="p-3 pl-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium",
                          addrColor(a.type))}>{addrLabel(a.type)}</div>
                        {a.isDefault && <span className="text-[10px] font-medium text-amber-600">Mặc định</span>}
                      </div>
                      <button onClick={() => setAddresses(addresses.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X size={12} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Nhãn (VP, Kho...)" value={a.label} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], label: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
                      <select value={a.type} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], type: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all">
                        {ADDR_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                      <div className="col-span-2"><input placeholder="Địa chỉ" value={a.address} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], address: e.target.value }; setAddresses(x); }}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" /></div>
                      <input placeholder="Thành phố" value={a.city} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], city: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
                      <input placeholder="Tỉnh" value={a.state} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], state: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={a.isDefault} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], isDefault: e.target.checked }; setAddresses(x); }}
                          className="w-3 h-3 rounded border-gray-300 text-amber-600" />
                        Đặt làm mặc định
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="px-4 pb-6">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={FileText} title="Ghi chú" color="bg-gradient-to-r from-gray-600 to-gray-700" />
            <div className="p-3">
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú về khách hàng..."
                className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== DETAIL MODAL ===== */
function DetailCustomer({ id, onClose, onEdit }: { id: string; onClose: () => void; onEdit: () => void }) {
  const [customer, setCustomer] = useState<any>(null);
  const [tab, setTab] = useState("info");

  useEffect(() => { fetch(`/api/customers/${id}`).then(r => r.json()).then(setCustomer); }, [id]);

  if (!customer) return (
    <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
  );

  const tabs = [
    { key: "info", label: "Thông tin" },
    { key: "contacts", label: `Liên hệ` },
    { key: "employees", label: `Nhân viên` },
    { key: "devices", label: `Thiết bị` },
    { key: "sessions", label: `Thu thập` },
    { key: "items", label: `Hạng mục` },
    { key: "addresses", label: `Địa chỉ` },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 -ml-1 text-gray-500 hover:text-gray-700"><X size={20} /></button>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
              customer.category?.name === "Doanh nghiệp" ? "bg-gradient-to-br from-amber-400 to-orange-500 text-white" : "bg-gradient-to-br from-blue-400 to-indigo-500 text-white")}>
              {customer.logo ? <img src={customer.logo} className="w-full h-full rounded-lg object-cover" /> : (customer.name || "?").charAt(0).toUpperCase()}
            </div>
            <div><h2 className="font-semibold text-base truncate max-w-[200px]">{customer.name}</h2>{customer.code && <p className="text-[10px] text-muted-foreground">{customer.code}</p>}</div>
          </div>
        </div>
        <button onClick={onEdit} className="p-2 text-gray-500 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"><Edit3 size={18} /></button>
      </div>

      <div className="flex gap-1 px-4 overflow-x-auto no-scrollbar border-b border-border bg-white">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={cn("px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors",
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-gray-700")}
          >{t.label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {tab === "info" && <InfoContent customer={customer} />}
          {tab === "contacts" && <ContactsContent customer={customer} />}
          {tab === "employees" && <EmployeesContent customer={customer} />}
          {tab === "devices" && <DevicesContent customerId={id} />}
          {tab === "sessions" && <SessionsContent customerId={id} />}
          {tab === "items" && <ItemsContent customer={customer} id={id} />}
          {tab === "addresses" && <AddressesContent customer={customer} />}
        </div>
      </div>
    </div>
  );
}

function InfoContent({ customer }: { customer: any }) {
  const InfoCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | null; color: string }) => (
    value ? <div className={cn("flex items-center gap-3 p-3 rounded-xl", color)}><div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center"><Icon size={16} /></div><div><p className="text-xs font-medium opacity-80">{label}</p><p className="text-sm font-semibold">{value}</p></div></div> : null
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <InfoCard icon={Hash} label="Mã KH" value={customer.code} color="bg-blue-50 text-blue-700" />
        <InfoCard icon={Tag} label="Phân loại" value={customer.category?.name || null} color="bg-purple-50 text-purple-700" />
        <InfoCard icon={Phone} label="Điện thoại" value={customer.phone} color="bg-green-50 text-green-700" />
        <InfoCard icon={Mail} label="Email" value={customer.email} color="bg-cyan-50 text-cyan-700" />
        <InfoCard icon={Globe} label="Website" value={customer.website} color="bg-indigo-50 text-indigo-700" />
        <InfoCard icon={CreditCard} label="Mã số thuế" value={customer.taxCode} color="bg-amber-50 text-amber-700" />
      </div>

      {/* Primary Contact */}
      {(customer.contacts?.length > 0) && (
        <div className="p-3 rounded-xl bg-rose-50 text-rose-700">
          <div className="flex items-center gap-2 mb-2"><User size={16} /><span className="text-xs font-medium">Liên hệ chính</span></div>
          {customer.contacts.filter((c: any) => c.isPrimary).slice(0, 1).map((c: any, i: number) => (
            <div key={i} className="text-sm"><span className="font-semibold">{c.firstName} {c.lastName}</span>{c.phone ? ` - ${c.phone}` : ""}{c.email ? ` - ${c.email}` : ""}</div>
          ))}
          {customer.contacts.filter((c: any) => !c.isPrimary).length > 0 && (
            <p className="text-xs mt-1 opacity-70">+{customer.contacts.filter((c: any) => !c.isPrimary).length} người liên hệ khác</p>
          )}
        </div>
      )}

      {/* Primary Address */}
      {(customer.addresses?.length > 0) && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
          <div className="flex items-center gap-2 mb-1"><MapPin size={16} /><span className="text-xs font-medium">Địa chỉ</span></div>
          {customer.addresses.filter((a: any) => a.isDefault).slice(0, 1).map((a: any, i: number) => (
            <p key={i} className="text-sm">{a.address}{a.city ? `, ${a.city}` : ""}{a.state ? `, ${a.state}` : ""}</p>
          ))}
          {customer.addresses.filter((a: any) => !a.isDefault).length > 0 && (
            <p className="text-xs mt-1 opacity-70">+{customer.addresses.filter((a: any) => !a.isDefault).length} địa chỉ khác</p>
          )}
        </div>
      )}

      {/* Note */}
      {customer.note && (
        <div className="p-3 rounded-xl bg-gray-50 text-gray-700">
          <div className="flex items-center gap-2 mb-1"><FileText size={14} /><span className="text-xs font-medium">Ghi chú</span></div>
          <p className="text-sm">{customer.note}</p>
        </div>
      )}
    </div>
  );
}
function Hash(props: any) { return <Tag {...props} />; }

function ContactsContent({ customer }: { customer: any }) {
  if (!customer.contacts?.length) return <p className="text-sm text-muted-foreground text-center pt-10">Chưa có người liên hệ</p>;
  return (
    <div className="space-y-2">
      {customer.contacts.map((c: any, i: number) => (
        <div key={c.id || i} className="bg-white rounded-xl p-3.5 border border-purple-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center text-sm font-bold">
              {(c.firstName || "?").charAt(0)}{(c.lastName || "").charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold">{c.firstName} {c.lastName}</p>
                {c.isPrimary && <Badge variant="secondary" className="text-[9px] bg-purple-100 text-purple-700">Chính</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                {c.position && <span>{c.position}</span>}
                {c.phone && <span className="flex items-center gap-1"><Phone size={10} className="text-green-500" />{c.phone}</span>}
                {c.email && <span className="flex items-center gap-1"><Mail size={10} className="text-blue-500" />{c.email}</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmployeesContent({ customer }: { customer: any }) {
  if (!customer.employees?.length) return <p className="text-sm text-muted-foreground text-center pt-10">Chưa có nhân viên</p>;
  return (
    <div className="space-y-2">
      {customer.employees.map((e: any, i: number) => (
        <div key={e.id || i} className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-sm font-bold">
              {(e.firstName || "?").charAt(0)}{(e.lastName || "").charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">{e.firstName} {e.lastName}</p>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                {e.position && <span>{e.position}</span>}
                {e.code && <Badge variant="secondary" className="text-[9px]">MS: {e.code}</Badge>}
                {e.phone && <span className="flex items-center gap-1"><Phone size={10} className="text-green-500" />{e.phone}</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ItemsContent({ customer, id }: { customer: any; id: string }) {
  const [items, setItems] = useState<any[]>(customer.items || []);
  const [showPicker, setShowPicker] = useState(false);
  const [itemType, setItemType] = useState("Computers");
  const [itemSearch, setItemSearch] = useState("");
  const [available, setAvailable] = useState<any[]>([]);

  useEffect(() => { fetch(`/api/customers/${id}/items`).then(r => r.json()).then(setItems); }, [id]);

  const loadAvailable = async (type: string) => {
    setItemType(type);
    // Map item type to API route
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
    try {
      const r = await fetch(`/api/${key}`).then(r => r.json());
      setAvailable(Array.isArray(r) ? r : []);
    } catch { setAvailable([]); }
  };

  const linkItem = async (itemType: string, itemId: string) => {
    await fetch(`/api/customers/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemType, itemId }),
    });
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
      <button onClick={() => { setShowPicker(!showPicker); if (!showPicker) loadAvailable(itemType); }}
        className="w-full mb-3 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all font-medium">
        <Plus size={16} className="inline mr-1" />Liên kết hạng mục
      </button>

      {showPicker && (
        <div className="bg-white rounded-xl border border-border/50 mb-3 overflow-hidden shadow-sm">
          <div className="p-3 space-y-2 bg-gray-50">
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {ITEM_TYPES.map(t => (
                <button key={t.type} onClick={() => loadAvailable(t.type)}
                  className={cn("px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all", itemType === t.type ? "bg-primary text-white" : "bg-white text-gray-600 border border-border")}
                >{t.label}</button>
              ))}
            </div>
            <input value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} placeholder="Tìm kiếm..."
              className="w-full h-8 px-3 text-xs rounded-full bg-white border border-border focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="max-h-40 overflow-y-auto">
            {available.filter((i: any) => !itemSearch || (i.name || "").toLowerCase().includes(itemSearch.toLowerCase())).map((i: any) => (
              <button key={i.id} onClick={() => linkItem(itemType, i.id)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs hover:bg-primary/5 text-left border-b border-gray-50 last:border-0"
              ><span className="font-medium truncate flex-1">{i.name}</span><Plus size={12} className="text-primary flex-shrink-0" /></button>
            ))}
            {available.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Không tìm thấy</p>}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center pt-6">Chưa có hạng mục nào được liên kết</p>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const itemRoute = ITEM_ROUTES[item.itemType] || `/${item.itemType.toLowerCase()}`;
            return (
              <Link key={item.id} href={`/${itemRoute}/${item.itemId}`}
                className="flex items-center gap-3 bg-white rounded-xl p-3 border border-border/50 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">{item.itemLabel?.charAt(0) || "?"}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{item.itemName || "Đang tải..."}</p>
                  <p className="text-[10px] text-muted-foreground">{item.itemLabel}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AddressesContent({ customer }: { customer: any }) {
  if (!customer.addresses?.length) return <p className="text-sm text-muted-foreground text-center pt-10">Chưa có địa chỉ</p>;
  const typeLabels = ADDR_LABELS;
  return (
    <div className="space-y-2">
      {customer.addresses.map((a: any, i: number) => (
        <div key={a.id || i} className="bg-white rounded-xl p-3.5 border border-amber-100 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center"><MapPin size={14} /></div>
            <div>
              <p className="text-sm font-semibold">{a.label || typeLabels[a.type] || a.type}</p>
              <p className="text-xs text-muted-foreground">{a.address}{a.city ? `, ${a.city}` : ""}{a.state ? `, ${a.state}` : ""}</p>
            </div>
            {a.isDefault && <Badge variant="secondary" className="text-[9px] ml-auto bg-amber-100 text-amber-700">Mặc định</Badge>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== DEVICES CONTENT (modal) ===== */
function DevicesContent({ customerId }: { customerId: string }) {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch(`/api/customers/${customerId}/devices`).then(r => r.json()).then(d => { setDevices(Array.isArray(d) ? d : []); setLoading(false); });
  }, [customerId]);
  if (loading) return <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>;
  if (devices.length === 0) return <p className="text-sm text-muted-foreground text-center pt-10">Chưa có thiết bị</p>;
  const CONDITION_COLORS: Record<string, string> = { good: "bg-green-100 text-green-700", fair: "bg-amber-100 text-amber-700", broken: "bg-red-100 text-red-700", damaged: "bg-orange-100 text-orange-700", other: "bg-gray-100 text-gray-600" };
  const CONDITION_LABELS: Record<string, string> = { good: "Tốt", fair: "Tạm được", broken: "Hỏng", damaged: "Hư hại", other: "Khác" };
  return (
    <div className="space-y-2">
      {devices.map((d: any) => (
        <div key={d.id} className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-border/50">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-base">
            {({ computer: "💻", monitor: "🖥️", printer: "🖨️", network: "🌐", phone: "📱", peripheral: "🎮", server: "🖥️" } as any)[d.deviceType] || "📦"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{d.manufacturer && d.modelName ? `${d.manufacturer} ${d.modelName}` : d.deviceType}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {d.serialNumber && <span className="text-[10px] text-muted-foreground font-mono">SN: {d.serialNumber}</span>}
              {d.condition && (
                <span className={"px-1 py-0.5 rounded text-[10px] font-medium " + ((CONDITION_COLORS as any)[d.condition] || "bg-gray-100 text-gray-600")}>
                  {CONDITION_LABELS[d.condition] || d.condition}
                </span>
              )}
            </div>
            {d.assignedTo && <p className="text-[10px] text-blue-600 mt-0.5">👤 {d.assignedTo.firstName || ""} {d.assignedTo.lastName || ""}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== SESSIONS CONTENT (modal) ===== */
function SessionsContent({ customerId }: { customerId: string }) {
  return <SessionsTab customerId={customerId} />;
}

/* ===== EDIT MODAL ===== */
function EditCustomer({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [codeDuplicate, setCodeDuplicate] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: "", code: "", categoryId: "", taxCode: "", website: "", phone: "", email: "", note: "", logo: "", responsibleCompanyId: "" });
  const [contacts, setContacts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  const selectedCat = categories.find((c: any) => c.id === form.categoryId);
  const isBusiness = selectedCat?.code === "business";

  useEffect(() => {
    Promise.all([
      fetch("/api/customers/categories").then(r => r.json()),
      fetch("/api/customers/companies").then(r => r.json()),
      fetch(`/api/customers/${id}`).then(r => r.json()),
    ]).then(([cats, comps, c]) => {
      setCategories(cats);
      setCompanies(comps);
      setForm({
        name: c.name || "", code: c.code || "", categoryId: c.categoryId || "",
        taxCode: c.taxCode || "", website: c.website || "", phone: c.phone || "",
        email: c.email || "", note: c.note || "", logo: c.logo || "",
        responsibleCompanyId: c.responsibleCompanyId || "",
      });
      setContacts(c.contacts || []);
      setEmployees(c.employees || []);
      setAddresses(c.addresses || []);
      setLoading(false);
    });
  }, [id]);

  // Check duplicate code
  useEffect(() => {
    if (!form.code || !isBusiness) { setCodeDuplicate(false); return; }
    fetch(`/api/customers/check-code?code=${encodeURIComponent(form.code)}&excludeId=${id}`)
      .then(r => r.json())
      .then(d => setCodeDuplicate(d.exists))
      .catch(() => setCodeDuplicate(false));
  }, [form.code, isBusiness, id]);

  const handleLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/customers/upload", { method: "POST", body: fd });
    const data = await res.json();
    setForm({ ...form, logo: data.url });
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    if (isBusiness && codeDuplicate) { alert("Mã khách hàng đã tồn tại. Vui lòng nhập mã khác."); return; }
    setSaving(true);

    const res = await fetch(`/api/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Lỗi khi cập nhật");
      setSaving(false);
      return;
    }

    await fetch(`/api/customers/${id}/contacts`, { method: "DELETE" });
    for (const c of contacts) {
      await fetch(`/api/customers/${id}/contacts`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
    }
    await fetch(`/api/customers/${id}/addresses`, { method: "DELETE" });
    for (const a of addresses) {
      await fetch(`/api/customers/${id}/addresses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(a),
      });
    }
    await fetch(`/api/customers/${id}/employees`, { method: "DELETE" });
    for (const e of employees) {
      await fetch(`/api/customers/${id}/employees`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(e),
      });
    }
    setSaving(false);
    onDone();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  const inp = (val: string, set: (v: string) => void, placeholder = "") => (
    <input value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder}
      className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all" />
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 -ml-1 text-gray-500 hover:text-gray-700"><X size={20} /></button>
          <h2 className="font-semibold text-base">Sửa khách hàng</h2>
        </div>
        <button onClick={handleSubmit} disabled={saving || !form.name}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-primary to-primary-600 text-white rounded-full text-sm font-medium disabled:opacity-50 shadow-lg shadow-primary/30 transition-all"
        ><Save size={16} />{saving ? "Đang lưu..." : "Lưu"}</button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {/* Logo + Basic Info */}
        <div className="p-4 pb-2">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={User} title="Thông tin chung" color="bg-gradient-to-r from-blue-500 to-blue-600" />
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <button onClick={() => fileRef.current?.click()} className="relative w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 hover:border-primary hover:bg-blue-50 transition-all group">
                  {form.logo ? <img src={form.logo} className="w-full h-full object-cover" /> : <Upload size={24} className="text-gray-400 group-hover:text-primary" />}
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </button>
                <div className="text-xs text-muted-foreground"><p className="font-medium text-gray-700">Logo</p><p>Nhấn để đổi</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Tên *</label>{inp(form.name, (v) => setForm({ ...form, name: v }))}</div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Loại</label>
                  <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all"
                  ><option value="">Chọn</option>{categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Mã khách hàng</label>
                  <div className="relative">
                    {inp(form.code, (v) => setForm({ ...form, code: v }))}
                    {codeDuplicate && <p className="text-[10px] text-red-500 mt-0.5">Mã đã tồn tại</p>}
                  </div>
                </div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">MST</label>{inp(form.taxCode, (v) => setForm({ ...form, taxCode: v }))}</div>
                <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Điện thoại</label>{inp(form.phone, (v) => setForm({ ...form, phone: v }))}</div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>{inp(form.email, (v) => setForm({ ...form, email: v }))}</div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>{inp(form.website, (v) => setForm({ ...form, website: v }))}</div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Công ty phụ trách</label>
                  <select value={form.responsibleCompanyId} onChange={(e) => setForm({ ...form, responsibleCompanyId: e.target.value })}
                    className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  ><option value="">-- Chọn --</option>{companies.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select>
                </div>
                <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Ghi chú</label>
                  <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/10 transition-all resize-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contacts */}
        <div className="px-4 pb-2">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={User} title="Người liên hệ" color="bg-gradient-to-r from-purple-500 to-purple-600" action={
              <button onClick={() => setContacts([...contacts, { firstName: "", lastName: "", position: "", phone: "", email: "", isPrimary: false }])}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1"><Plus size={14} />Thêm</button>
            } />
            <div className="p-4 space-y-3">
              {contacts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-purple-50/30 rounded-xl border border-dashed border-purple-200">
                  <User size={32} className="mx-auto mb-2 text-purple-300" />
                  <p className="text-xs font-medium">Chưa có người liên hệ</p>
                  <button onClick={() => setContacts([...contacts, { firstName: "", lastName: "", position: "", phone: "", email: "", isPrimary: false }])}
                    className="mt-2 text-xs text-purple-600 hover:text-purple-700 font-medium">+ Thêm người liên hệ</button>
                </div>
              ) : contacts.map((c: any, i: number) => (
                <div key={i} className="relative bg-white rounded-xl border border-purple-100 shadow-xs hover:shadow-sm transition-all">
                  <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-400 to-purple-600 rounded-l-xl" />
                  <div className="p-3 pl-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {((c.firstName?.charAt(0) || "") + (c.lastName?.charAt(0) || "")).toUpperCase() || "?"}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">#{i + 1}</span>
                        <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                          <input type="checkbox" checked={c.isPrimary} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], isPrimary: e.target.checked }; setContacts(x); }}
                            className="w-3 h-3 rounded border-gray-300 text-purple-600" />
                          Chính
                        </label>
                      </div>
                      <button onClick={() => setContacts(contacts.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X size={12} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Họ" value={c.firstName || ""} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], firstName: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Tên" value={c.lastName || ""} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], lastName: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Chức vụ" value={c.position || ""} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], position: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Điện thoại" value={c.phone || ""} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], phone: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all" />
                      <input placeholder="Email" value={c.email || ""} onChange={(e) => { const x = [...contacts]; x[i] = { ...x[i], email: e.target.value }; setContacts(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-purple-400 focus:bg-white focus:ring-2 focus:ring-purple-500/10 transition-all col-span-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Addresses */}
        <div className="px-4 pb-2">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={MapPin} title="Địa chỉ" color="bg-gradient-to-r from-amber-500 to-amber-600" action={
              <button onClick={() => setAddresses([...addresses, { label: "", type: "office", address: "", city: "", state: "", country: "Việt Nam", isDefault: false }])}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1"><Plus size={14} />Thêm</button>
            } />
            <div className="p-4 space-y-3">
              {addresses.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-amber-50/30 rounded-xl border border-dashed border-amber-200">
                  <MapPin size={32} className="mx-auto mb-2 text-amber-300" />
                  <p className="text-xs font-medium">Chưa có địa chỉ</p>
                  <button onClick={() => setAddresses([...addresses, { label: "", type: "office", address: "", city: "", state: "", country: "Việt Nam", isDefault: false }])}
                    className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium">+ Thêm địa chỉ</button>
                </div>
              ) : addresses.map((a: any, i: number) => (
                <div key={i} className="relative bg-white rounded-xl border border-amber-100 shadow-xs hover:shadow-sm transition-all">
                  <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-l-xl" />
                  <div className="p-3 pl-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className={cn("px-2 py-0.5 rounded-full text-[10px] font-medium",
                          addrColor(a.type))}>{addrLabel(a.type)}</div>
                        {a.isDefault && <span className="text-[10px] font-medium text-amber-600">Mặc định</span>}
                      </div>
                      <button onClick={() => setAddresses(addresses.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X size={12} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Nhãn (VP, Kho...)" value={a.label || ""} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], label: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
                      <select value={a.type || "office"} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], type: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all">
                        {ADDR_OPTIONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
                      </select>
                      <div className="col-span-2"><input placeholder="Địa chỉ" value={a.address || ""} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], address: e.target.value }; setAddresses(x); }}
                        className="w-full h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" /></div>
                      <input placeholder="Thành phố" value={a.city || ""} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], city: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
                      <input placeholder="Tỉnh" value={a.state || ""} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], state: e.target.value }; setAddresses(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
                      <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                        <input type="checkbox" checked={a.isDefault} onChange={(e) => { const x = [...addresses]; x[i] = { ...x[i], isDefault: e.target.checked }; setAddresses(x); }}
                          className="w-3 h-3 rounded border-gray-300 text-amber-600" />
                        Đặt làm mặc định
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employees */}
        <div className="px-4 pb-6">
          <div className="bg-white rounded-xl border border-border/30 shadow-sm overflow-hidden">
            <SectionHeader icon={Briefcase} title="Nhân viên KH" color="bg-gradient-to-r from-rose-500 to-rose-600" action={
              <button onClick={() => setEmployees([...employees, { firstName: "", lastName: "", code: "", position: "", phone: "", email: "" }])}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1"><Plus size={14} />Thêm</button>
            } />
            <div className="p-4 space-y-3">
              {employees.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-rose-50/30 rounded-xl border border-dashed border-rose-200">
                  <Briefcase size={32} className="mx-auto mb-2 text-rose-300" />
                  <p className="text-xs font-medium">Chưa có nhân viên</p>
                  <button onClick={() => setEmployees([...employees, { firstName: "", lastName: "", code: "", position: "", phone: "", email: "" }])}
                    className="mt-2 text-xs text-rose-600 hover:text-rose-700 font-medium">+ Thêm nhân viên</button>
                </div>
              ) : employees.map((e: any, i: number) => (
                <div key={i} className="relative bg-white rounded-xl border border-rose-100 shadow-xs hover:shadow-sm transition-all">
                  <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-400 to-rose-600 rounded-l-xl" />
                  <div className="p-3 pl-4">
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {((e.firstName?.charAt(0) || "") + (e.lastName?.charAt(0) || "")).toUpperCase() || "?"}
                        </div>
                        <span className="text-xs font-semibold text-gray-700">#{i + 1}</span>
                        {e.code && <span className="text-[10px] font-mono text-gray-400">{e.code}</span>}
                      </div>
                      <button onClick={() => setEmployees(employees.filter((_, idx) => idx !== i))}
                        className="w-6 h-6 rounded-full bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 flex items-center justify-center transition-colors"><X size={12} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Họ" value={e.firstName || ""} onChange={(ev) => { const x = [...employees]; x[i] = { ...x[i], firstName: ev.target.value }; setEmployees(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/10 transition-all" />
                      <input placeholder="Tên" value={e.lastName || ""} onChange={(ev) => { const x = [...employees]; x[i] = { ...x[i], lastName: ev.target.value }; setEmployees(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/10 transition-all" />
                      <input placeholder="Mã NV" value={e.code || ""} onChange={(ev) => { const x = [...employees]; x[i] = { ...x[i], code: ev.target.value }; setEmployees(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/10 transition-all" />
                      <input placeholder="Chức vụ" value={e.position || ""} onChange={(ev) => { const x = [...employees]; x[i] = { ...x[i], position: ev.target.value }; setEmployees(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/10 transition-all" />
                      <input placeholder="Điện thoại" value={e.phone || ""} onChange={(ev) => { const x = [...employees]; x[i] = { ...x[i], phone: ev.target.value }; setEmployees(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/10 transition-all" />
                      <input placeholder="Email" value={e.email || ""} onChange={(ev) => { const x = [...employees]; x[i] = { ...x[i], email: ev.target.value }; setEmployees(x); }}
                        className="h-8 px-2.5 text-xs rounded-lg border border-gray-200 bg-gray-50/50 focus:outline-hidden focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-500/10 transition-all col-span-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

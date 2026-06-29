"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Search, Plus, Users, X, Save, Edit3, Phone, Mail, Briefcase, Building2,
  ChevronRight, BadgeCheck, CircleSlash, Hash, User, Tag, AtSign, FileText,
  UserCheck, Building as BuildingIcon, GraduationCap, ChevronDown, MapPin,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CustomerEmployeesPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "loading" && !session?.user) redirect("/login");
  }, [status, session]);

  if (status === "loading")
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return <CustomerEmployeesInner />;
}

// ─── helpers ──────────────────────────────────────────
function splitName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length <= 1) return { lastName: full, firstName: "" };
  return { lastName: parts[0], firstName: parts.slice(1).join(" ") };
}

function joinName(e: any) {
  const ln = e?.lastName || "";
  const fn = e?.firstName || "";
  return `${ln} ${fn}`.trim();
}

function initialsFromName(e: any) {
  const ln = e?.lastName || "";
  const fn = e?.firstName || "";
  const f = fn?.charAt(0) || "";
  const l = ln?.charAt(0) || "";
  return (f + l).toUpperCase() || "?";
}

function formatAddress(a: any) {
  if (!a) return "";
  const parts = [a.address, a.city, a.state].filter(Boolean);
  return parts.join(", ");
}

const GRADIENTS = [
  "from-violet-400 to-purple-600",
  "from-blue-400 to-indigo-600",
  "from-emerald-400 to-teal-600",
  "from-rose-400 to-pink-600",
  "from-amber-400 to-orange-600",
  "from-cyan-400 to-sky-600",
  "from-fuchsia-400 to-pink-600",
  "from-lime-400 to-green-600",
];

function pickGradient(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return GRADIENTS[hash % GRADIENTS.length];
}

// ─── Themed input components ──────────────────────────
function Field({ icon: Icon, label, required, children }: { icon?: any; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-violet-400" />}
        {label}
        {required && <span className="text-rose-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, prefix, disabled }: { value: string; onChange: (v: string) => void; placeholder?: string; prefix?: string; disabled?: boolean }) {
  return (
    <div className="relative">
      {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono select-none">{prefix}</span>}
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className={cn(
          "w-full h-10 px-3 text-sm rounded-xl border bg-white/80 transition-all",
          disabled ? "border-gray-100 bg-gray-50 text-gray-500 cursor-not-allowed" : "border-gray-200 focus:outline-hidden focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/15",
          "placeholder:text-gray-300",
          prefix && "pl-10",
        )} />
    </div>
  );
}

function Select({ value, onChange, children, placeholder }: { value: string; onChange: (v: string) => void; children: React.ReactNode; placeholder?: string }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 pr-8 text-sm rounded-xl border border-gray-200 bg-white/80 appearance-none
          focus:outline-hidden focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/15 transition-all cursor-pointer">
        {children}
      </select>
      <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}

// ─── main component ───────────────────────────────────
function CustomerEmployeesInner() {
  const router = useRouter();
  const [employees, setEmployees] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCust, setFilterCust] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", code: "", position: "", department: "",
    phone: "", email: "", note: "", customerId: "", isActive: true,
    addressId: "", workLocation: "",
  });

  const fetchList = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterCust) params.set("customerId", filterCust);
    fetch(`/api/customer-employees?${params}`).then(r => r.json()).then(d => {
      setEmployees(d);
      setLoading(false);
    });
  };

  const fetchAddresses = async (customerId: string) => {
    if (!customerId) { setAddresses([]); return; }
    const res = await fetch(`/api/customers/${customerId}/addresses`);
    const data = await res.json();
    setAddresses(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    fetchList();
    fetch("/api/customers?category=business").then(r => r.json()).then(d => setCustomers(d));
  }, []);

  useEffect(() => {
    if (!loading) fetchList();
  }, [search, filterCust]);

  // ── form handlers ──
  const openCreate = () => {
    setEditId(null);
    setForm({ name: "", code: "", position: "", department: "", phone: "", email: "", note: "", customerId: "", isActive: true, addressId: "", workLocation: "" });
    setAddresses([]);
    setShowForm(true);
  };

  const openEdit = (e: any) => {
    setEditId(e.id);
    setForm({
      name: joinName(e), code: e.code || "", position: e.position || "", department: e.department || "",
      phone: e.phone || "", email: e.email || "", note: e.note || "",
      customerId: e.customerId || "", isActive: e.isActive ?? true,
      addressId: e.addressId || "", workLocation: e.workLocation || "",
    });
    if (e.customerId) fetchAddresses(e.customerId);
    setShowForm(true);
  };

  const handleCustomerChange = (v: string) => {
    setForm({ ...form, customerId: v, addressId: "" });
    fetchAddresses(v);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.customerId) return;
    setSaving(true);

    const { name, addressId, ...rest } = form;
    const { lastName, firstName } = splitName(name);
    const body: Record<string, any> = { ...rest, lastName, firstName };
    if (addressId) body.addressId = addressId;

    if (editId) {
      await fetch(`/api/customer-employees/${editId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/customer-employees", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }

    setSaving(false);
    setShowForm(false);
    fetchList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xoá nhân viên này?")) return;
    await fetch(`/api/customer-employees/${id}`, { method: "DELETE" });
    fetchList();
  };

  const filtered = employees;

  return (
    <div className="p-4 md:p-6 space-y-5">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Users size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Nhân viên khách hàng</h1>
            <p className="text-xs text-muted-foreground">Danh sách nhân viên thuộc các doanh nghiệp</p>
          </div>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white rounded-full text-sm font-semibold shadow-lg shadow-violet-500/30 transition-all hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98]">
          <Plus size={16} /> Thêm nhân viên
        </button>
      </div>

      {/* ═══ Stats bar ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: Users, label: "Tổng nhân viên", value: filtered.length, color: "bg-violet-100 text-violet-600" },
          { icon: BadgeCheck, label: "Đang làm", value: filtered.filter((e: any) => e.isActive).length, color: "bg-emerald-100 text-emerald-600" },
          { icon: CircleSlash, label: "Đã nghỉ", value: filtered.filter((e: any) => !e.isActive).length, color: "bg-gray-100 text-gray-600" },
          { icon: BuildingIcon, label: "Doanh nghiệp", value: new Set(filtered.map((e: any) => e.customerId)).size, color: "bg-amber-100 text-amber-600" },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-border/40 p-3 flex items-center gap-3 hover:shadow-sm transition-shadow">
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", s.color)}><s.icon size={18} /></div>
            <div><p className="text-lg font-bold text-gray-900">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></div>
          </div>
        ))}
      </div>

      {/* ═══ Search + Filter ═══ */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, phone, email, phòng ban..."
            className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-border/60 bg-white/80 focus:outline-hidden focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 transition-all" />
        </div>
        <select value={filterCust} onChange={(e) => setFilterCust(e.target.value)}
          className="h-10 px-3 pr-8 text-sm rounded-xl border border-border/60 bg-white/80 appearance-none
            focus:outline-hidden focus:border-violet-400 focus:ring-2 focus:ring-violet-500/15 transition-all cursor-pointer">
          <option value="">Tất cả doanh nghiệp</option>
          {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* ═══ List (grouped by customer) ═══ */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-white rounded-2xl border border-dashed border-border/60">
          <Users size={56} className="mx-auto mb-4 text-gray-300" />
          <p className="font-semibold text-gray-500">Chưa có nhân viên nào</p>
          <p className="text-sm mt-1">Nhấn &quot;Thêm nhân viên&quot; để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-6">
          {(() => {
            // group by customer
            const groups = new Map<string, any[]>();
            filtered.forEach((e: any) => {
              const cid = e.customerId || "_unknown";
              if (!groups.has(cid)) groups.set(cid, []);
              groups.get(cid)!.push(e);
            });
            return Array.from(groups.entries()).map(([cid, emps]) => {
              const cust = emps[0]?.customer;
              return (
                <div key={cid}>
                  {/* Group header */}
                  <div className="flex items-center gap-2.5 mb-2 px-1">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      {cust?.logo
                        ? <img src={cust.logo} alt="" className="w-full h-full rounded-lg object-cover" />
                        : <Building2 size={16} />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-gray-800 truncate">{cust?.name || "Không xác định"}</h3>
                      <p className="text-[11px] text-muted-foreground">{emps.length} nhân viên</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {emps.map((e: any) => {
                      const g = pickGradient(e.id);
                      const name = joinName(e);
                      return (
                        <div key={e.id}
                          className="group bg-white rounded-xl border border-border/40 p-3.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/50 transition-all cursor-pointer"
                          onClick={() => openEdit(e)}>
                          <div className="flex items-start gap-3">
                            <div className={cn("w-10 h-10 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow-xs", g)}>
                              {initialsFromName(e)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm">{name}</span>
                                {e.isActive
                                  ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-2 py-0 font-medium">Đang làm</Badge>
                                  : <Badge className="bg-gray-100 text-gray-500 border-gray-200 text-[10px] px-2 py-0 font-medium">Đã nghỉ</Badge>
                                }
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                {e.position && <span className="flex items-center gap-1"><Briefcase size={11} className="text-violet-400" />{e.position}</span>}
                                {e.department && <span className="flex items-center gap-1"><GraduationCap size={11} className="text-violet-400" />{e.department}</span>}
                                {e.code && <span className="flex items-center gap-1 font-mono"><Hash size={10} className="text-gray-400" />{e.code}</span>}
                              </div>
                              {(e.address || e.workLocation) && (
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {e.address && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] font-medium">
                                      <MapPin size={10} className="text-blue-400" />
                                      {e.address.label || e.address.address}
                                    </span>
                                  )}
                                  {e.workLocation && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-200 rounded-full text-[10px] font-medium">
                                      <Layers size={10} className="text-amber-400" />
                                      {e.workLocation}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                              {e.phone && (
                                <a href={`tel:${e.phone}`} onClick={(ev) => ev.stopPropagation()}
                                  className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100 flex items-center justify-center transition-colors" title="Gọi điện">
                                  <Phone size={12} />
                                </a>
                              )}
                              {e.email && (
                                <a href={`mailto:${e.email}`} onClick={(ev) => ev.stopPropagation()}
                                  className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100 flex items-center justify-center transition-colors" title="Gửi email">
                                  <Mail size={12} />
                                </a>
                              )}
                              <button onClick={(ev) => { ev.stopPropagation(); openEdit(e); }}
                                className="w-7 h-7 rounded-full bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center transition-colors" title="Sửa">
                                <Edit3 size={12} />
                              </button>
                              <button onClick={(ev) => { ev.stopPropagation(); handleDelete(e.id); }}
                                className="w-7 h-7 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors" title="Xoá">
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* ═══ Form Modal ═══ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white w-full max-w-lg flex flex-col max-h-[85vh] lg:rounded-2xl lg:shadow-2xl shadow-violet-500/10 animate-in-up">
            {/* ── Modal header ── */}
            <div className="relative px-5 pt-5 pb-12 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-700 text-white">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setShowForm(false)} className="p-1.5 -ml-1.5 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-xs transition-colors">
                    <X size={18} />
                  </button>
                  <Users size={20} />
                  <h2 className="font-bold text-base">{editId ? "Sửa nhân viên" : "Thêm nhân viên"}</h2>
                </div>
                <button onClick={handleSubmit} disabled={saving || !form.name || !form.customerId}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-violet-700 rounded-full text-sm font-bold disabled:opacity-50 shadow-lg transition-all hover:scale-[1.03] active:scale-[0.97]">
                  <Save size={15} />{saving ? "Đang lưu..." : "Lưu"}
                </button>
              </div>
              {editId && (
                <p className="text-xs text-white/70 mt-2 ml-1 relative">
                  Đang sửa: <span className="font-semibold text-white/90">{form.name}</span>
                </p>
              )}
            </div>

            {/* ── Modal body ── */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 -mt-6">
              {/* Card: Thông tin cơ bản */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <User size={13} className="text-violet-400" /> Thông tin cơ bản
                </h3>

                <Field icon={BuildingIcon} label="Doanh nghiệp" required>
                  <Select value={form.customerId} onChange={handleCustomerChange}>
                    <option value="">-- Chọn doanh nghiệp --</option>
                    {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>

                <Field icon={User} label="Họ và tên" required>
                  <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="VD: Nguyễn Văn A" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field icon={Hash} label="Mã nhân viên">
                    {editId ? (
                      <Input value={form.code} onChange={() => {}} disabled />
                    ) : (
                      <div className="h-10 px-3 text-sm rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-gray-400 flex items-center gap-2">
                        <Hash size={13} className="text-gray-300" />
                        <span>Tự động theo mã KH</span>
                      </div>
                    )}
                  </Field>
                  <Field icon={Briefcase} label="Chức vụ">
                    <Input value={form.position} onChange={(v) => setForm({ ...form, position: v })} placeholder="Trưởng phòng" />
                  </Field>
                  <Field icon={GraduationCap} label="Phòng ban">
                    <Input value={form.department} onChange={(v) => setForm({ ...form, department: v })} placeholder="IT" />
                  </Field>
                  <label className="flex items-center gap-2.5 text-sm pt-7">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
                    <span className="font-medium text-gray-700">Đang hoạt động</span>
                  </label>
                </div>
              </div>

              {/* Card: Nơi làm việc */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={13} className="text-violet-400" /> Nơi làm việc
                </h3>

                <Field icon={MapPin} label="Địa điểm">
                  <Select value={form.addressId} onChange={(v) => setForm({ ...form, addressId: v })}>
                    <option value="">-- Chưa chọn --</option>
                    {addresses.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {[a.label, a.address, a.city].filter(Boolean).join(" - ")}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field icon={Layers} label="Vị trí chi tiết">
                  <Input value={form.workLocation} onChange={(v) => setForm({ ...form, workLocation: v })} placeholder="VD: Lầu 1, Phòng 201, Khu vực A" />
                </Field>

                {/* Preview */}
                {form.addressId && (
                  <div className="p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-xs text-blue-700">
                    <p className="font-semibold flex items-center gap-1.5 mb-1">
                      <MapPin size={12} /> Nơi làm việc
                    </p>
                    {(() => {
                      const addr = addresses.find((a: any) => a.id === form.addressId);
                      return (
                        <>
                          <p className="text-blue-600">{addr ? formatAddress(addr) : ""}</p>
                          {form.workLocation && <p className="text-blue-500 mt-0.5 flex items-center gap-1"><Layers size={11} />{form.workLocation}</p>}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Card: Liên hệ */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail size={13} className="text-violet-400" /> Thông tin liên hệ
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field icon={Phone} label="Điện thoại">
                    <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="090..." />
                  </Field>
                  <Field icon={AtSign} label="Email">
                    <Input value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="email@..." />
                  </Field>
                </div>
              </div>

              {/* Card: Ghi chú */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText size={13} className="text-violet-400" /> Ghi chú
                </h3>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  placeholder="Ghi chú về nhân viên..."
                  className="w-full h-24 px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white/80
                    focus:outline-hidden focus:border-violet-400 focus:bg-white focus:ring-2 focus:ring-violet-500/15
                    placeholder:text-gray-300 transition-all resize-none" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

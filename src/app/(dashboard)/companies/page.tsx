"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { Search, Plus, Building, MapPin, Phone, Mail, Globe, CreditCard, X, Save, Edit3, ChevronRight, Briefcase, Users, Hash, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CompaniesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);

  const [companies, setCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchList = () => {
    fetch("/api/customers/companies")
      .then(r => r.json())
      .then(d => { setCompanies(Array.isArray(d) ? d : []); setLoading(false); });
  };

  useEffect(() => {
    fetchList();
  }, []);

  const filtered = companies.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (c.name || "").toLowerCase().includes(q) || (c.shortName || "").toLowerCase().includes(q) ||
      (c.code || "").toLowerCase().includes(q) || (c.taxCode || "").includes(q) ||
      (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q);
  });

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-4">
      {/* Header */}
      <div className="px-4 pt-3 pb-3 bg-white border-b border-border">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 text-sm rounded-full bg-gray-100 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-primary/20"
              placeholder="Tìm công ty phụ trách..." />
          </div>
          <button onClick={() => { setShowForm(true); setEditingId(null); }}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30"
          ><Plus size={20} /></button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Building size={14} className="text-primary" />
          <span className="text-xs font-medium text-muted-foreground">
            {filtered.length} công ty phụ trách
          </span>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3 px-4 pt-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center pt-20 text-gray-400">
          <Building size={56} className="mb-3 text-gray-300" />
          <p className="text-sm font-medium">Chưa có công ty phụ trách</p>
          <button onClick={() => { setShowForm(true); setEditingId(null); }} className="mt-2 text-sm text-primary font-medium">Thêm công ty đầu tiên</button>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-2 pb-4">
          {filtered.map(c => (
            <div key={c.id}
              onClick={() => { setSelectedId(selectedId === c.id ? null : c.id); }}
              className={cn(
                "bg-white rounded-xl border shadow-xs transition-all cursor-pointer",
                selectedId === c.id ? "border-primary/30 ring-1 ring-primary/10" : "border-border/30 hover:shadow-md hover:border-primary/20"
              )}
            >
              {/* Main row */}
              <div className="flex items-center gap-3 p-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0 overflow-hidden", c.logo ? "" : "bg-gradient-to-br from-amber-400 to-orange-500 text-white")}>
                  {c.logo ? <img src={c.logo} alt="" className="w-full h-full object-cover" /> : <Building size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-sm text-gray-900 truncate">{c.name}</p>
                    {c.shortName && <span className="text-[9px] text-muted-foreground bg-gray-100 px-1 rounded leading-4">{c.shortName}</span>}
                    {c.code && <span className="text-[9px] text-muted-foreground bg-gray-100 px-1 rounded leading-4">{c.code}</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    {c.phone && <span className="flex items-center gap-0.5"><Phone size={9} className="text-green-400" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-0.5 truncate max-w-[140px]"><Mail size={9} className="text-blue-400" /><span className="truncate">{c.email}</span></span>}
                    {c.taxCode && <span className="flex items-center gap-0.5"><CreditCard size={9} className="text-amber-400" />MST: {c.taxCode}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setShowForm(true); }}
                    className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                  ><Edit3 size={14} /></button>
                  <ChevronRight size={14} className={cn("text-gray-300 transition-transform", selectedId === c.id && "rotate-90")} />
                </div>
              </div>
              {/* Expanded detail */}
              {selectedId === c.id && (
                <div className="px-3 pb-3 pt-0 border-t border-border/20 space-y-2">
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 p-2 rounded-lg bg-gray-50"
                      ><Globe size={12} className="text-indigo-400" />{c.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}</a>
                    )}
                    {c.taxCode && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 p-2 rounded-lg bg-gray-50">
                        <CreditCard size={12} className="text-amber-400" />MST: {c.taxCode}
                      </div>
                    )}
                  </div>
                  {c.addresses?.[0] && (
                    <a href={`https://maps.google.com/?q=${encodeURIComponent([c.addresses[0].address, c.addresses[0].city, c.addresses[0].state].filter(Boolean).join(", "))}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-600 p-2 rounded-lg bg-gray-50"
                    ><MapPin size={12} className="text-amber-400" />{[c.addresses[0].address, c.addresses[0].city].filter(Boolean).join(", ")}</a>
                  )}
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-0.5"><Users size={10} />{c._count?.contacts || 0} liên hệ</span>
                    <span className="flex items-center gap-0.5"><MapPin size={10} />{c._count?.addresses || 0} địa chỉ</span>
                    <span className="flex items-center gap-0.5"><Briefcase size={10} />{c._count?.employees || 0} nhân viên</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showForm && <CompanyForm id={editingId} onClose={() => { setShowForm(false); setEditingId(null); }} onDone={() => { setShowForm(false); setEditingId(null); fetchList(); }} />}
    </div>
  );
}

/* ===== FORM MODAL ===== */
function CompanyForm({ id, onClose, onDone }: { id: string | null; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ name: "", shortName: "", code: "", taxCode: "", website: "", phone: "", email: "", note: "", logo: "" });

  useEffect(() => {
    if (id) {
      fetch(`/api/customers/${id}`).then(r => r.json()).then(c => {
        setForm({
          name: c.name || "", shortName: c.shortName || "", code: c.code || "",
          taxCode: c.taxCode || "", website: c.website || "", phone: c.phone || "",
          email: c.email || "", note: c.note || "", logo: c.logo || "",
        });
      });
    }
  }, [id]);

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
    setSaving(true);

    // Get or use the business category
    const catsRes = await fetch("/api/customers/categories");
    const cats = await catsRes.json();
    const bizCat = cats.find((cat: any) => cat.code === "business");
    if (!bizCat) { alert("Chưa có phân loại Doanh nghiệp"); setSaving(false); return; }

    const body = { ...form, categoryId: bizCat.id };

    if (id) {
      await fetch(`/api/customers/${id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/customers", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
    }

    setSaving(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-0 lg:pt-8">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg flex flex-col h-full lg:h-auto lg:rounded-2xl lg:shadow-2xl overflow-hidden animate-in-up">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-amber-500/10 to-transparent">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1 -ml-1 text-gray-500 hover:text-gray-700"><X size={20} /></button>
            <Building size={18} className="text-amber-500" />
            <h2 className="font-semibold text-base">{id ? "Sửa công ty" : "Thêm công ty phụ trách"}</h2>
          </div>
          <button onClick={handleSubmit} disabled={saving || !form.name}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-sm font-medium disabled:opacity-50 shadow-lg shadow-amber-500/30 transition-all"
          ><Save size={16} />{saving ? "Đang lưu..." : "Lưu"}</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <button onClick={() => fileRef.current?.click()} className="relative w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-amber-300 hover:border-amber-500 hover:bg-amber-50 transition-all group flex-shrink-0">
              {form.logo ? <img src={form.logo} className="w-full h-full object-cover" /> : <Upload size={24} className="text-gray-400 group-hover:text-amber-500" />}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogo} />
            </button>
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-gray-700">Logo công ty</p>
              <p>Nhấn để tải lên (JPG, PNG)</p>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tên công ty *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="VD: Công ty TNHH ABC"
              className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tên viết tắt</label>
              <input value={form.shortName} onChange={(e) => setForm({ ...form, shortName: e.target.value })} placeholder="VD: ABC"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mã</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="Tự động"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mã số thuế</label>
              <input value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} placeholder="MST"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Điện thoại</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Số điện thoại"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://"
                className="w-full h-9 px-3 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Ghi chú</label>
            <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ghi chú..."
              className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-border/60 bg-gray-50/50 focus:outline-hidden focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/10 transition-all resize-none" />
          </div>
        </div>
      </div>
    </div>
  );
}

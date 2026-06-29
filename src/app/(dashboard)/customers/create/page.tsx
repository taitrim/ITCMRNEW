"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CreateCustomerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<{ id: string; name: string; code?: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", categoryId: "", taxCode: "", website: "", phone: "", email: "", note: "" });
  const [codeDuplicate, setCodeDuplicate] = useState(false);

  const selectedCat = categories.find((c: any) => c.id === form.categoryId);
  const isBusiness = selectedCat?.code === "business";
  const [contacts, setContacts] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/customers/categories").then(r => r.json()).then(setCategories);
  }, []);

  // Suggest code when category changes
  useEffect(() => {
    if (isBusiness && form.name) {
      const initials = form.name.replace(/[^A-Za-zÀ-ỹ]/g, "").substring(0, 6).toUpperCase();
      setForm((f) => ({ ...f, code: initials ? `${initials}-` : f.code }));
    } else if (!isBusiness && form.categoryId) {
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

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!session?.user) redirect("/login");

  const addContact = () => setContacts([...contacts, { firstName: "", lastName: "", position: "", department: "", phone: "", email: "", isPrimary: false }]);
  const addEmployee = () => setEmployees([...employees, { firstName: "", lastName: "", code: "", position: "", department: "", phone: "", email: "" }]);
  const addAddress = () => setAddresses([...addresses, { label: "", type: "office", address: "", city: "", state: "", postalCode: "", country: "Việt Nam", isDefault: false }]);

  const removeContact = (i: number) => setContacts(contacts.filter((_, idx) => idx !== i));
  const removeEmployee = (i: number) => setEmployees(employees.filter((_, idx) => idx !== i));
  const removeAddress = (i: number) => setAddresses(addresses.filter((_, idx) => idx !== i));

  const updateContact = (i: number, field: string, value: any) => {
    const c = [...contacts]; c[i] = { ...c[i], [field]: value }; setContacts(c);
  };
  const updateEmployee = (i: number, field: string, value: any) => {
    const c = [...employees]; c[i] = { ...c[i], [field]: value }; setEmployees(c);
  };
  const updateAddress = (i: number, field: string, value: any) => {
    const c = [...addresses]; c[i] = { ...c[i], [field]: value }; setAddresses(c);
  };

  const handleSubmit = async () => {
    if (!form.name) return;
    if (isBusiness && codeDuplicate) { alert("Mã khách hàng đã tồn tại. Vui lòng nhập mã khác."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, contacts, employees, addresses }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/customers/${data.id}`);
      } else {
        const err = await res.json();
        alert(err.error || "Lỗi khi tạo khách hàng");
      }
    } finally {
      setSaving(false);
    }
  };

  const input = (val: string, set: (v: string) => void) => (
    <input value={val} onChange={(e) => set(e.target.value)} className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
  );

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-700"><ArrowLeft size={22} /></button>
            <h1 className="font-semibold text-base">Thêm khách hàng</h1>
          </div>
          <button onClick={handleSubmit} disabled={saving || !form.name}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-full text-sm font-medium disabled:opacity-50"
          ><Save size={16} />{saving ? "Đang lưu..." : "Lưu"}</button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        <section className="bg-white rounded-xl p-4 border border-border/50 space-y-3">
          <h2 className="font-semibold text-sm text-gray-800">Thông tin chung</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Tên khách hàng *</label>
              {input(form.name, (v) => setForm({ ...form, name: v }))}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Mã khách hàng</label>
              {isBusiness ? (
                <div>
                  {input(form.code, (v) => setForm({ ...form, code: v }))}
                  {codeDuplicate && <p className="text-[10px] text-red-500 mt-0.5">Mã đã tồn tại</p>}
                </div>
              ) : (
                <div className="h-9 px-3 text-sm rounded-lg border border-dashed border-gray-300 bg-gray-50/50 text-gray-400 flex items-center gap-1.5">
                  <span>Tự động (chọn loại trước)</span>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Phân loại</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Chọn loại</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Mã số thuế</label>{input(form.taxCode, (v) => setForm({ ...form, taxCode: v }))}</div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Số điện thoại</label>{input(form.phone, (v) => setForm({ ...form, phone: v }))}</div>
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>{input(form.email, (v) => setForm({ ...form, email: v }))}</div>
            <div className="col-span-2"><label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>{input(form.website, (v) => setForm({ ...form, website: v }))}</div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ghi chú</label>
              <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full h-20 px-3 py-2 text-sm rounded-lg border border-border bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-none" />
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-800">Người liên hệ</h2>
            <button onClick={addContact} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} />Thêm</button>
          </div>
          {contacts.length === 0 ? <p className="text-xs text-muted-foreground">Chưa có người liên hệ</p> : contacts.map((c, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg mb-2 relative">
              <button onClick={() => removeContact(i)} className="absolute top-2 right-2 text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Họ" value={c.firstName} onChange={(e) => updateContact(i, "firstName", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Tên" value={c.lastName} onChange={(e) => updateContact(i, "lastName", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Chức vụ" value={c.position} onChange={(e) => updateContact(i, "position", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Phòng ban" value={c.department} onChange={(e) => updateContact(i, "department", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Điện thoại" value={c.phone} onChange={(e) => updateContact(i, "phone", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Email" value={c.email} onChange={(e) => updateContact(i, "email", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
              </div>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-800">Nhân viên KH</h2>
            <button onClick={addEmployee} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} />Thêm</button>
          </div>
          {employees.length === 0 ? <p className="text-xs text-muted-foreground">Chưa có nhân viên</p> : employees.map((e, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg mb-2 relative">
              <button onClick={() => removeEmployee(i)} className="absolute top-2 right-2 text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Họ" value={e.firstName} onChange={(e2) => updateEmployee(i, "firstName", e2.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Tên" value={e.lastName} onChange={(e2) => updateEmployee(i, "lastName", e2.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Mã NV" value={e.code} onChange={(e2) => updateEmployee(i, "code", e2.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Chức vụ" value={e.position} onChange={(e2) => updateEmployee(i, "position", e2.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Điện thoại" value={e.phone} onChange={(e2) => updateEmployee(i, "phone", e2.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Email" value={e.email} onChange={(e2) => updateEmployee(i, "email", e2.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
              </div>
            </div>
          ))}
        </section>

        <section className="bg-white rounded-xl p-4 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-sm text-gray-800">Địa chỉ</h2>
            <button onClick={addAddress} className="flex items-center gap-1 text-xs text-primary font-medium"><Plus size={14} />Thêm</button>
          </div>
          {addresses.length === 0 ? <p className="text-xs text-muted-foreground">Chưa có địa chỉ</p> : addresses.map((a, i) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg mb-2 relative">
              <button onClick={() => removeAddress(i)} className="absolute top-2 right-2 text-gray-400 hover:text-danger"><Trash2 size={14} /></button>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Nhãn (VP, Kho...)" value={a.label} onChange={(e) => updateAddress(i, "label", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <select value={a.type} onChange={(e) => updateAddress(i, "type", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border">
                  <option value="office">Văn phòng</option><option value="warehouse">Kho</option><option value="billing">Hóa đơn</option><option value="shipping">Giao hàng</option><option value="home">Nhà riêng</option>
                </select>
                <div className="col-span-2"><input placeholder="Địa chỉ" value={a.address} onChange={(e) => updateAddress(i, "address", e.target.value)} className="w-full h-8 px-2 text-xs rounded-lg border border-border" /></div>
                <input placeholder="Thành phố" value={a.city} onChange={(e) => updateAddress(i, "city", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
                <input placeholder="Tỉnh" value={a.state} onChange={(e) => updateAddress(i, "state", e.target.value)} className="h-8 px-2 text-xs rounded-lg border border-border" />
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

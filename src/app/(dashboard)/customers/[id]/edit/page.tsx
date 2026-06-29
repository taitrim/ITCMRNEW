"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Save } from "lucide-react";

export default function EditCustomerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", shortName: "", categoryId: "", taxCode: "", website: "", phone: "", email: "", note: "" });

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);
  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  useEffect(() => {
    Promise.all([
      fetch("/api/customers/categories").then(r => r.json()),
      fetch(`/api/customers/${id}`).then(r => r.json()),
    ]).then(([cats, c]) => {
      setCategories(cats);
      setForm({
        name: c.name || "", shortName: c.shortName || "", categoryId: c.categoryId || "",
        taxCode: c.taxCode || "", website: c.website || "", phone: c.phone || "",
        email: c.email || "", note: c.note || "",
      });
      setLoading(false);
    });
  }, [id]);

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) router.push(`/customers/${id}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Đang tải...</div>;

  const input = (val: string, set: (v: string) => void) => (
    <input value={val} onChange={(e) => set(e.target.value)} className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-white focus:outline-hidden focus:ring-2 focus:ring-primary/20" />
  );

  return (
    <div className="min-h-screen bg-surface-secondary/30 pb-8">
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-700"><ArrowLeft size={22} /></button>
            <h1 className="font-semibold text-base">Sửa khách hàng</h1>
          </div>
          <button onClick={handleSubmit} disabled={saving || !form.name}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-full text-sm font-medium disabled:opacity-50"
          ><Save size={16} />{saving ? "Đang lưu..." : "Lưu"}</button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        <div className="bg-white rounded-xl p-4 border border-border/50 space-y-3">
          <div className="col-span-2">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Tên khách hàng *</label>
            {input(form.name, (v) => setForm({ ...form, name: v }))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-muted-foreground mb-1 block">Tên viết tắt</label>{input(form.shortName, (v) => setForm({ ...form, shortName: v }))}</div>
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
        </div>
      </div>
    </div>
  );
}

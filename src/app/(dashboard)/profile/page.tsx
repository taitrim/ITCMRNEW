"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  User, Shield, Mail, Phone, Smartphone, Key, Save, CheckCircle2, AlertCircle,
  Camera, Globe, MessageCircle, ExternalLink, X, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";

const roleLabel: Record<string, string> = {
  admin: "Quản trị", tech: "Kỹ thuật", user: "Người dùng",
};
const roleColor: Record<string, string> = {
  admin: "bg-red-100 text-red-700", tech: "bg-blue-100 text-blue-700", user: "bg-gray-100 text-gray-700",
};

type SocialPlatform = "facebook" | "zalo" | "linkedin" | "website" | "other";
const socialIcons: Record<SocialPlatform, React.ReactNode> = {
  facebook: <ExternalLink size={16} />,
  zalo: <MessageCircle size={16} />,
  linkedin: <ExternalLink size={16} />,
  website: <Globe size={16} />,
  other: <Globe size={16} />,
};
const socialLabels: Record<SocialPlatform, string> = {
  facebook: "Facebook", zalo: "Zalo", linkedin: "LinkedIn", website: "Website", other: "Khác",
};
const socialColors: Record<SocialPlatform, string> = {
  facebook: "text-blue-600", zalo: "text-cyan-600", linkedin: "text-sky-700", website: "text-gray-600", other: "text-gray-500",
};

type SocialLink = { platform: SocialPlatform; url: string; label?: string };

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== "loading" && !session?.user) router.replace("/login");
  }, [status, session]);

  // ─── form state ──────────────────────────────
  const [realname, setRealname] = useState("");
  const [firstname, setFirstname] = useState("");
  const [phone, setPhone] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [picture, setPicture] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loaded, setLoaded] = useState(false);

  // ─── avatar ──────────────────────────────
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // ─── password ─────────────────────────────
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ─── general save ──────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ─── social link editor ─────────────────────
  const [editingSocial, setEditingSocial] = useState<{ platform: SocialPlatform; url: string; label: string } | null>(null);

  // ─── stats ─────────────────────────────────
  const [stats, setStats] = useState<{ tickets: number; assets: number } | null>(null);

  // ─── load user data ────────────────────────
  useEffect(() => {
    if (!session?.user?.id) return;

    fetch("/api/profile/stats").then(r => r.json()).then(d => {
      if (!d.error) setStats(d);
    }).catch(() => {});

    // Load full profile from PUT endpoint (GET same data)
    fetch("/api/profile").then(r => r.json()).then(d => {
      if (!d.error) {
        setRealname(d.realname || "");
        setFirstname(d.firstname || "");
        setPhone(d.phone || "");
        setMobile(d.mobile || "");
        setEmail(d.email || "");
        setPicture(d.picture || null);
        setAvatarPreview(d.picture || null);
        try {
          const links = d.socialLinks ? JSON.parse(d.socialLinks) : [];
          setSocialLinks(Array.isArray(links) ? links : []);
        } catch { setSocialLinks([]); }
        setLoaded(true);
      }
    }).catch(() => { setLoaded(true); });
  }, [session?.user?.id]);

  // ─── avatar file pick ──────────────────────
  const handleAvatarPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setSaveMsg({ ok: false, text: "Ảnh không được quá 2MB" }); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatarPreview(reader.result as string); };
    reader.readAsDataURL(file);
  };

  // ─── save profile ──────────────────────────
  const handleSaveProfile = async () => {
    setSaving(true); setSaveMsg(null);
    const res = await fetch("/api/profile", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        realname, firstname, phone, mobile,
        email: email || undefined,
        avatar: avatarPreview || null,
        socialLinks: socialLinks.length > 0 ? JSON.stringify(socialLinks) : null,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (data.error) {
      setSaveMsg({ ok: false, text: "Lưu thất bại" });
    } else {
      setSaveMsg({ ok: true, text: "Đã lưu thông tin!" });
      if (data.picture) setPicture(data.picture);
      update();
      setTimeout(() => setSaveMsg(null), 3000);
    }
  };

  // ─── change password ──────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPw || !newPw || !confirmPw) { setPwMsg({ ok: false, text: "Vui lòng điền đầy đủ" }); return; }
    if (newPw.length < 6) { setPwMsg({ ok: false, text: "Mật khẩu mới ≥ 6 ký tự" }); return; }
    if (newPw !== confirmPw) { setPwMsg({ ok: false, text: "Mật khẩu xác nhận không khớp" }); return; }
    setChangingPw(true); setPwMsg(null);
    const res = await fetch("/api/profile/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
    });
    const d = await res.json();
    setChangingPw(false);
    if (d.error === "WRONG_PASSWORD") setPwMsg({ ok: false, text: "Mật khẩu hiện tại không đúng" });
    else if (d.error) setPwMsg({ ok: false, text: "Đổi mật khẩu thất bại" });
    else { setPwMsg({ ok: true, text: "Đổi mật khẩu thành công!" }); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  };

  // ─── social link helpers ───────────────────
  const addSocialLink = () => {
    if (!editingSocial) return;
    const { platform, url, label } = editingSocial;
    if (!url.trim()) return;
    const newLinks = socialLinks.filter(s => s.platform !== platform);
    setSocialLinks([...newLinks, { platform, url: url.trim(), label: label || undefined }]);
    setEditingSocial(null);
  };
  const removeSocialLink = (platform: SocialPlatform) => {
    setSocialLinks(socialLinks.filter(s => s.platform !== platform));
  };

  if (status === "loading") {
    return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const u = session?.user;
  if (!u) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Hồ sơ cá nhân</h1>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý thông tin và tài khoản</p>
          </div>
          <button onClick={handleSaveProfile} disabled={saving}
            className="flex items-center gap-1.5 px-4 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95"
          >
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
            {saving ? "Đang lưu..." : "Lưu"}
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 max-w-2xl mx-auto space-y-4 pb-8">
        {/* Save message */}
        {saveMsg && (
          <div className={cn("flex items-center gap-2 text-sm rounded-xl px-4 py-3", saveMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200")}>
            {saveMsg.ok ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            {saveMsg.text}
          </div>
        )}

        {/* Avatar card */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-200">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold shadow-md overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  (u.name || "U")[0].toUpperCase()
                )}
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all"
              >
                <Camera size={14} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarPick} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-gray-900">{u.name || "User"}</span>
                <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", roleColor[u.role || "user"] || roleColor.user)}>
                  {roleLabel[u.role || "user"] || u.role}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{u.email || "Chưa có email"}</p>
              <p className="text-xs text-gray-400 mt-0.5">Click icon camera để đổi ảnh đại diện</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{stats?.tickets ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Ticket đã tạo</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-xs border border-gray-200">
            <p className="text-2xl font-bold text-gray-900">{stats?.assets ?? "—"}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tài sản được giao</p>
          </div>
        </div>

        {/* Thông tin cá nhân */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <User size={16} className="text-blue-600" /> Thông tin cá nhân
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Họ và tên</label>
                <input value={realname} onChange={e => setRealname(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Nguyễn Văn A" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tên (first name)</label>
                <input value={firstname} onChange={e => setFirstname(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Văn A" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="email@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={phone} onChange={e => setPhone(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="0123456789" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Di động</label>
                <div className="relative">
                  <Smartphone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={mobile} onChange={e => setMobile(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="0901234567" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Liên kết mạng xã hội */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <Globe size={16} className="text-blue-600" /> Liên kết mạng xã hội
          </h3>

          {/* List existing */}
          <div className="space-y-2 mb-4">
            {socialLinks.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-3">Chưa có liên kết nào. Thêm Facebook, Zalo, LinkedIn...</p>
            )}
            {socialLinks.map(s => (
              <div key={s.platform} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 group">
                <span className={cn("flex-shrink-0", socialColors[s.platform] || "text-gray-500")}>
                  {socialIcons[s.platform] || <Globe size={16} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.label || socialLabels[s.platform] || s.platform}</p>
                  <p className="text-xs text-gray-500 truncate">{s.url}</p>
                </div>
                <button onClick={() => removeSocialLink(s.platform)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-all flex-shrink-0">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Add/edit social link */}
          {editingSocial ? (
            <div className="border border-blue-200 rounded-lg p-3 bg-blue-50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-blue-700">Thêm liên kết</span>
                <button onClick={() => setEditingSocial(null)} className="text-blue-400 hover:text-blue-600"><X size={14} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(socialLabels) as SocialPlatform[]).map(p => (
                  <button key={p} onClick={() => setEditingSocial(prev => prev ? { ...prev, platform: p } : { platform: p, url: "", label: "" })}
                    className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      editingSocial.platform === p
                        ? "border-blue-400 bg-white text-blue-700 shadow-xs"
                        : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                    )}>
                    <span className={socialColors[p]}>{socialIcons[p]}</span>
                    {socialLabels[p]}
                  </button>
                ))}
              </div>
              <input value={editingSocial.url} onChange={e => setEditingSocial({ ...editingSocial, url: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="https://facebook.com/..." />
              <input value={editingSocial.label || ""} onChange={e => setEditingSocial({ ...editingSocial, label: e.target.value })}
                className="w-full h-9 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" placeholder="Nhãn hiển thị (tuỳ chọn)" />
              <button onClick={addSocialLink}
                className="px-4 h-8 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition">
                Thêm
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingSocial({ platform: "facebook", url: "", label: "" })}
              className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-all">
              + Thêm liên kết mạng xã hội
            </button>
          )}
        </div>

        {/* Đổi mật khẩu */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900 mb-4 flex items-center gap-2">
            <Key size={16} className="text-blue-600" /> Đổi mật khẩu
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu hiện tại</label>
              <input type={showPw ? "text" : "password"} value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Mật khẩu mới</label>
                <input type={showPw ? "text" : "password"} value={newPw} onChange={e => setNewPw(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Xác nhận</label>
                <input type={showPw ? "text" : "password"} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white text-sm focus:outline-hidden focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={showPw} onChange={() => setShowPw(!showPw)} className="rounded" />
              Hiện mật khẩu
            </label>

            {pwMsg && (
              <div className={cn("flex items-center gap-2 text-sm rounded-lg px-3 py-2", pwMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600")}>
                {pwMsg.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                {pwMsg.text}
              </div>
            )}

            <button type="submit" disabled={changingPw}
              className="flex items-center gap-2 px-4 h-9 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {changingPw ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Key size={14} />}
              {changingPw ? "Đang lưu..." : "Đổi mật khẩu"}
            </button>
          </form>
        </div>

        {/* Thông tin tài khoản (readonly) */}
        <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-200">
          <h3 className="font-semibold text-sm text-gray-900 mb-3">Thông tin tài khoản</h3>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Tên đăng nhập</span>
              <span className="font-medium text-gray-900">{u.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">Vai trò</span>
              <span className="font-medium text-gray-900 capitalize">{roleLabel[u.role || "user"] || u.role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">ID</span>
              <span className="font-mono text-xs text-gray-500">{u.id}</span>
            </div>
          </div>
        </div>

        {/* Admin shortcut */}
        {u.role === "admin" && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
            <p className="text-sm font-medium text-amber-800">Bạn đang đăng nhập với quyền Quản trị</p>
            <p className="text-xs text-amber-600 mt-0.5">
              <button onClick={() => router.push("/settings")} className="underline hover:text-amber-800">Cấu hình hệ thống</button>
              {" • "}
              <button onClick={() => router.push("/users")} className="underline hover:text-amber-800">Quản lý người dùng</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

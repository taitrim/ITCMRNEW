"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Server } from "lucide-react";

export default function LoginPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email: username, password, redirect: false });
    if (res?.error) {
      setError("Tên đăng nhập hoặc mật khẩu không đúng");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm animate-in-up">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-primary/30 mb-4">
              <Server size={32} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">ITSM System</h1>
            <p className="text-sm text-muted-foreground mt-1">GLPI-compatible</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Tên đăng nhập</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)}
                className="w-full h-12 rounded-xl border border-border bg-gray-50 px-4 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                placeholder="admin" required />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Mật khẩu</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl border border-border bg-gray-50 px-4 pr-11 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
                <Server size={16} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full h-12 rounded-xl bg-primary text-white font-semibold text-base hover:bg-primary-600 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {loading && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Đăng nhập
            </button>
          </form>

          <div className="mt-8 text-center">
            <div className="bg-gray-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-medium text-gray-700">Tài khoản demo</p>
              <p className="text-xs text-muted-foreground">admin / admin123</p>
              <p className="text-xs text-muted-foreground">tech / admin123 &nbsp;•&nbsp; user / admin123</p>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground pb-6">ITSM System v1.0 • Built with Next.js</p>
    </div>
  );
}

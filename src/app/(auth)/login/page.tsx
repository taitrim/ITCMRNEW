"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Monitor, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Email hoặc mật khẩu không đúng");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-primary-50/30 p-4">
      <div className="w-full max-w-sm animate-in">
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/20">
            I
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">ITSM System</h1>
            <p className="text-xs text-muted-foreground">GLPI-compatible</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-border p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Đăng nhập</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Nhập thông tin tài khoản</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" id="email" type="email" value={email}
              onChange={(e) => setEmail(e.target.value)} placeholder="admin@demo.com" required />

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Mật khẩu</label>
              <div className="relative">
                <input id="password" type={show ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900
                    focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
                  placeholder="••••••••" required />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <Monitor size={14} /> {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">Đăng nhập</Button>
          </form>

          <div className="text-center text-xs text-muted-foreground">
            <p>Demo: admin@demo.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
}

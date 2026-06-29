"use client";

import { useSession } from "next-auth/react";
import { redirect, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const schema = z.object({
  title: z.string().min(5, "Tiêu đề ít nhất 5 ký tự").max(200),
  description: z.string().min(10, "Mô tả ít nhất 10 ký tự"),
  type: z.enum(["incident", "request"]),
  priority: z.enum(["low", "medium", "high", "urgent", "critical"]),
  categoryId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function CreateTicketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "incident", priority: "medium" },
  });

  if (status === "loading") return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!session?.user) redirect("/login");

  const onSubmit = async (data: FormData) => {
    setSubmitting(true); setError("");
    try {
      const priorityMap: Record<string, number> = { low: 1, medium: 3, high: 4, urgent: 5, critical: 6 };
      const res = await fetch("/api/tickets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.title, content: data.description, type: data.type, priority: priorityMap[data.priority] || 3, categoryId: data.categoryId }),
      });
      if (!res.ok) throw new Error("Failed to create");
      const ticket = await res.json();
      router.push(`/tickets/${ticket.id}`);
    } catch {
      setError("Không thể tạo ticket. Vui lòng thử lại.");
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white animate-in-up">
      <div className="flex items-center gap-3 px-4 h-12 border-b border-border">
        <button onClick={() => router.back()} className="p-1 -ml-1 text-gray-700"><ArrowLeft size={22} /></button>
        <h1 className="font-semibold text-base">Tạo ticket mới</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Tiêu đề</label>
          <input {...register("title")}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Mô tả ngắn gọn vấn đề..." />
          {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Mô tả chi tiết</label>
          <textarea {...register("description")} rows={5}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
            placeholder="Mô tả chi tiết vấn đề, bao gồm các bước để tái hiện lỗi..." />
          {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Loại</label>
            <select {...register("type")}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="incident">Sự cố</option>
              <option value="request">Yêu cầu</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Mức ưu tiên</label>
            <select {...register("priority")}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm focus:outline-hidden focus:border-primary focus:ring-2 focus:ring-primary/20">
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn</option>
              <option value="critical">Nghiêm trọng</option>
            </select>
          </div>
        </div>

        {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</div>}

        <Button type="submit" loading={submitting} className="w-full h-12 rounded-xl text-base">
          <Send size={18} /> Gửi ticket
        </Button>
      </form>
    </div>
  );
}

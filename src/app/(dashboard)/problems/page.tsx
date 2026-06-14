import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default async function ProblemsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const problems = await prisma.problem.findMany({
    where: { organizationId: session.user.organizationId! },
    include: { assignedTo: { select: { name: true } }, category: { select: { name: true, color: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Problem</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Quản lý vấn đề (root cause analysis)</p>
      </div>
      {problems.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center py-16 text-muted-foreground">
          <AlertTriangle size={40} className="mb-3 text-gray-300" />
          <p>Chưa có problem nào</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {problems.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-start justify-between py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{p.title}</h3>
                    <Badge>{p.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{p.description?.slice(0, 120)}...</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    {p.assignedTo && <span>{p.assignedTo.name}</span>}
                    {p.category && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: p.category.color || "#ccc" }} />{p.category.name}</span>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

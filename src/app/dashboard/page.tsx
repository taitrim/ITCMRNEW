import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [contactsCount, dealsCount, pipelineValue] = await Promise.all([
    prisma.contact.count({ where: { ownerId: session.user.id, deletedAt: null } }),
    prisma.deal.count({ where: { ownerId: session.user.id } }),
    prisma.deal.aggregate({
      where: { ownerId: session.user.id, stage: { not: "CLOSED_LOST" } },
      _sum: { value: true },
    }),
  ]);

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Contacts</p>
          <p className="text-2xl font-bold">{contactsCount}</p>
        </div>
        <div className="rounded-lg border p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Active Deals</p>
          <p className="text-2xl font-bold">{dealsCount}</p>
        </div>
        <div className="rounded-lg border p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">Pipeline Value</p>
          <p className="text-2xl font-bold">${pipelineValue._sum.value?.toLocaleString() ?? 0}</p>
        </div>
      </div>
    </div>
  );
}

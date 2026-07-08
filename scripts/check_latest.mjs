import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
try {
  // Latest 10 sessions
  const sessions = await p.collectionSession.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: { id: true, token: true, status: true, errorMessage: true, createdAt: true, customerId: true, deviceCount: true, reviewData: true, completedAt: true }
  });
  console.log("=== ALL SESSIONS (latest 10) ===");
  console.log(JSON.stringify(sessions, null, 2));

  // Count all sessions
  const total = await p.collectionSession.count();
  const byStatus = await p.collectionSession.groupBy({ by: ['status'], _count: true });
  console.log(`\n=== TOTAL: ${total} ===");
  console.log(JSON.stringify(byStatus, null, 2));

} finally {
  await p.$disconnect();
}

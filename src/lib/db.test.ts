import { describe, it, expect } from "vitest";

describe("db", () => {
  it("exports prisma client", async () => {
    const { prisma } = await import("@/lib/db");
    expect(prisma).toBeDefined();
    expect(prisma.$connect).toBeDefined();
  });
});

import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function POST() {
  try {
    execSync("npx tsx prisma/seed.ts", { cwd: process.cwd(), stdio: "pipe" });
    return NextResponse.json({ success: true, message: "Seed completed" });
  } catch (e) {
    return NextResponse.json({ success: false, message: String(e) }, { status: 500 });
  }
}

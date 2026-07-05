export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (images, etc.)
     * - api/auth (NextAuth internal routes — tự xử lý auth)
     * - api/agent-inventory (agent POST dùng token, không cần session)
     * - login (trang đăng nhập)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/agent-inventory|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

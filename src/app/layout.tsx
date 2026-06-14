import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ITSM System",
  description: "GLPI-compatible IT Service Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="min-h-screen bg-surface text-gray-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

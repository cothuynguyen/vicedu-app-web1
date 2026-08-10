import type { Metadata } from "next";
import "./globals.css";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "VicEdu LMS - Hệ thống Quản trị Đào tạo",
  description: "Hệ thống quản trị lớp học, điểm danh và thu chi dành cho trung tâm VicEdu",
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}

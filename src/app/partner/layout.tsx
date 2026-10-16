import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cổng Quản trị Đối tác Đào tạo - VicEdu LMS",
  description: "Phân hệ quản trị dành riêng cho đối tác đào tạo và giảng viên liên kết",
};

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="partner-portal-wrapper">
      {children}
    </div>
  );
}

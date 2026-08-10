"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  // If we are on the login page, we don't render the sidebar or mobile header
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <div className="app-container login-layout">{children}</div>;
  }

  return (
    <div className={`app-container ${isSidebarOpen ? "sidebar-open" : ""}`}>
      {/* Mobile Top Header */}
      <header className="mobile-header glass-header">
        <button className="hamburger-btn" onClick={toggleSidebar} aria-label="Toggle Menu">
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <div className="mobile-logo">
          <img src="/logo.png" alt="VicEdu Logo" className="mobile-logo-img" />
          <span className="mobile-logo-text">VicEdu LMS</span>
        </div>
        <div style={{ width: 40 }} /> {/* spacer to balance header */}
      </header>

      {/* Sidebar Backdrop Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-backdrop" onClick={closeSidebar} />
      )}

      {/* Sidebar Component */}
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

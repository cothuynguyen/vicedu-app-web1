"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type Notification = {
  id: string;
  title: string;
  content: string;
  is_read: boolean;
  link_url: string;
  created_at: string;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lấy dữ liệu lần đầu
  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20); // Hiển thị 20 tin gần nhất

      if (!error && data) {
        setNotifications(data);
        setUnreadCount(data.filter((n) => !n.is_read).length);
      }
    };

    fetchNotifications();

    // Thiết lập Supabase Realtime
    const channel = supabase
      .channel("notifications-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Xử lý click ra ngoài để đóng dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const markAsRead = async (id: string, link_url: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setShowDropdown(false);

    // Xóa số đỏ trên DB
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);

    // Chuyển trang
    if (link_url) {
      router.push(link_url);
    }
  };

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    setShowDropdown(false);

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user?.id)
      .eq("is_read", false);
  };

  // Format thời gian đơn giản
  const timeAgo = (dateStr: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    return `${Math.floor(diff / 86400)} ngày trước`;
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Nút Chuông */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.1)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          color: "var(--text-main)",
          transition: "background 0.2s"
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
        onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span
            className="animate-pulse"
            style={{
              position: "absolute",
              top: "-2px",
              right: "-2px",
              background: "#ef4444",
              color: "white",
              fontSize: "11px",
              fontWeight: "bold",
              minWidth: "18px",
              height: "18px",
              borderRadius: "9px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Menu */}
      {showDropdown && (
        <div
          className="animate-fade-in"
          style={{
            position: "absolute",
            bottom: "calc(100% + 10px)",
            left: 0,
            width: "320px",
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            zIndex: 100,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
            }}
          >
            <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1e293b" }}>
              Thông báo
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
              >
                <Check size={14} /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          {/* Body */}
          <div style={{ maxHeight: "350px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#94a3b8", fontSize: "14px" }}>
                Bạn chưa có thông báo nào.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id, n.link_url)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    cursor: "pointer",
                    background: n.is_read ? "transparent" : "#eff6ff",
                    transition: "background 0.2s",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = n.is_read ? "#f1f5f9" : "#e0f2fe")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = n.is_read ? "transparent" : "#eff6ff")}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ fontWeight: n.is_read ? 500 : 600, color: "#0f172a", fontSize: "14px", lineHeight: 1.4 }}>
                      {n.title}
                    </div>
                    {!n.is_read && (
                      <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: "6px" }} />
                    )}
                  </div>
                  <div style={{ color: "#475569", fontSize: "13px", lineHeight: 1.4 }}>
                    {n.content}
                  </div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "4px" }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer (nếu muốn dẫn sang trang xem tất cả, tạm thời comment lại vì chưa có trang riêng) */}
          {/* <div
            style={{
              padding: "10px",
              textAlign: "center",
              borderTop: "1px solid var(--border)",
              background: "#f8fafc",
            }}
          >
            <Link href="/notifications" style={{ color: "var(--primary)", fontSize: "13px", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "4px" }}>
              Xem tất cả <ArrowRight size={14} />
            </Link>
          </div> */}
        </div>
      )}
    </div>
  );
}

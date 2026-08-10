"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { ChevronUp, ChevronDown } from "lucide-react";

type OnlineUser = {
  id: string;
  full_name: string;
  role: string;
  branch_id: string;
  onlineAt: string;
};

export default function OnlineWidget() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("online-users", {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState();
        const usersMap = new Map<string, OnlineUser>();
        
        // Lấy thông tin user (nếu họ mở nhiều tab thì chỉ lấy 1)
        for (const [key, stateArray] of Object.entries(newState)) {
          if ((stateArray as any[]).length > 0) {
            const payload = (stateArray as any[])[0] as unknown as OnlineUser;
            usersMap.set(payload.id, payload);
          }
        }
        
        setOnlineUsers(Array.from(usersMap.values()));
      })
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          // Khi kết nối thành công, báo danh lên hệ thống
          await channel.track({
            id: user.id,
            full_name: user.full_name,
            role: user.role,
            branch_id: user.branch_id,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Nếu chưa render xong client (tránh Hydration Mismatch trên Vercel)
  if (!isMounted) return null;

  // Nếu không phải là Super Admin hoặc Admin thì CHỈ báo danh (chạy ngầm), không hiển thị giao diện
  if (!user || (user.role !== "Super Admin" && user.role !== "Admin")) {
    return null;
  }

  // Admin Chi nhánh chỉ nhìn thấy người của chi nhánh mình. Super Admin thấy hết.
  const visibleUsers = onlineUsers.filter(
    (u) => user.role === "Super Admin" || u.branch_id === user.branch_id
  );

  if (visibleUsers.length === 0) return null;

  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem', background: 'rgba(0,0,0,0.02)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', boxShadow: '0 0 6px #22c55e' }} />
          Nhân sự Online ({visibleUsers.length})
        </div>
        {isExpanded ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
      </div>
      
      {isExpanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '180px', overflowY: 'auto', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)' }}>
          {visibleUsers.map((u) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ position: 'relative', display: 'flex' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'rgba(79, 70, 229, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontWeight: 'bold', fontSize: '0.75rem' }}>
                  {u.full_name?.charAt(0) || "U"}
                </div>
                <div style={{ position: 'absolute', bottom: 0, right: -2, width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e', border: '2px solid white' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 500 }}>{u.full_name}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.role} {user.role === 'Super Admin' ? `• ${u.branch_id}` : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

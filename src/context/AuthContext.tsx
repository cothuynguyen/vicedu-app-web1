"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { createBrowserClient } from "@supabase/ssr";

type AuthUser = {
  id: string;
  email: string;
  role: string;
  branch_id: string;
  department: string;
  full_name: string;
  position?: string;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

// Singleton supabase client - dùng chung toàn app, tránh session conflict
let _supabaseClient: ReturnType<typeof createBrowserClient> | null = null;
const getClient = () => {
  if (!_supabaseClient) {
    _supabaseClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabaseClient;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getClient();

  // Hàm tra cứu profile từ DB theo auth_id (UUID) - không bao giờ nhầm
  const fetchProfile = async (authId: string, email: string): Promise<AuthUser | null> => {
    const { data } = await supabase
      .from("users")
      .select("id, email, role, branch_id, department, full_name, position")
      .eq("auth_id", authId)
      .maybeSingle();

    if (data) return data as AuthUser;

    // Fallback bằng email nếu auth_id chưa sync
    const { data: fallback } = await supabase
      .from("users")
      .select("id, email, role, branch_id, department, full_name, position")
      .eq("email", email)
      .maybeSingle();

    return fallback as AuthUser | null;
  };

  useEffect(() => {
    let mounted = true;

    // Xóa sạch toàn bộ session cũ của @supabase/supabase-js còn sót trong localStorage
    // @supabase/ssr dùng Cookie, không dùng localStorage → những key này là "rác" gây conflict
    if (typeof window !== "undefined") {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Key pattern của @supabase/supabase-js: "sb-{project-ref}-auth-token"
        if (key && key.startsWith("sb-") && key.includes("-auth-token")) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log("[AuthContext] Đã xóa session localStorage cũ:", key);
      });
    }

    // Khởi tạo: validate session với server (không dùng cache)
    const initUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser && mounted) {
          const profile = await fetchProfile(authUser.id, authUser.email || "");
          if (mounted) setUser(profile);
        } else if (mounted) {
          setUser(null);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initUser();

    // Chỉ lắng nghe SIGNED_IN và SIGNED_OUT - bỏ qua TOKEN_REFRESHED, USER_UPDATED...
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
      if (event === "SIGNED_OUT") {
        if (mounted) { setUser(null); setLoading(false); }
        return;
      }

      // Chỉ cập nhật khi đăng nhập mới, bỏ qua tất cả các event khác
      if (event !== "SIGNED_IN") return;

      if (session?.user && mounted) {
        const profile = await fetchProfile(session.user.id, session.user.email || "");
        if (mounted && profile) setUser(profile);
        if (mounted) setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

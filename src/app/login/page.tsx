"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Mail, Lock, LogIn, AlertCircle, Sparkles, User, Key, Eye, EyeOff } from "lucide-react";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // FIX: Xóa bỏ margin-left 260px của Sidebar để form ra giữa màn hình
  useEffect(() => {
    document.body.classList.add('login-page-active');
    return () => document.body.classList.remove('login-page-active');
  }, []);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push("/");
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      setError("Tài khoản hoặc mật khẩu không chính xác.");
      return;
    }

    router.refresh();
    router.push("/");
  };

  return (
    <div className="login-wrapper" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)", width: '100%', margin: 0, padding: 0 }}>
      
      {/* Background Decorative Elements */}
      <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(79, 70, 229, 0.3)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', borderRadius: '50%', filter: 'blur(120px)', background: 'rgba(147, 51, 234, 0.3)', pointerEvents: 'none' }}></div>

      <div style={{ position: 'relative', width: '100%', maxWidth: '450px', margin: '0 20px', zIndex: 10 }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '120px', height: '120px', margin: '0 auto 1.5rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 0 20px rgba(250, 204, 21, 0.2)' }}>
            <Image 
              src="/logo.png" 
              alt="VicEdu Logo" 
              width={120}
              height={120}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <p style={{ marginTop: '1rem', fontSize: '1rem', color: 'rgba(199, 210, 254, 0.9)', fontWeight: 500, letterSpacing: '0.025em' }}>
            Hệ thống Quản trị Đào tạo & Vận hành Nội bộ
          </p>
        </div>

        {/* Login Card */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 8px 32px 0 rgba(0,0,0,0.36)', position: 'relative', overflow: 'hidden' }}>
          
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'linear-gradient(to right, #4F46E5, #9333EA, #EC4899)' }}></div>

          <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }} onSubmit={handleLogin}>
            
            {/* Lỗi hiển thị */}
            {error && (
              <div style={{ borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.5)', padding: '1rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle style={{ width: '20px', height: '20px', color: '#F87171', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#FECACA', margin: 0 }}>{error}</p>
              </div>
            )}

            {/* Khối Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#E0E7FF', marginLeft: '4px' }}>Email đăng nhập</label>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '1rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <User style={{ width: '20px', height: '20px', color: '#A5B4FC' }} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                  placeholder="nhansu@vicedu.vn"
                  required
                />
              </div>
            </div>

            {/* Khối Mật khẩu */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginLeft: '4px' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#E0E7FF' }}>Mật khẩu</label>
                <a href="#" style={{ fontSize: '0.75rem', fontWeight: 500, color: '#A5B4FC', textDecoration: 'none' }}>Quên mật khẩu?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, paddingLeft: '1rem', display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                  <Key style={{ width: '20px', height: '20px', color: '#A5B4FC' }} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem 3rem 0.75rem 2.75rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                >
                  {showPassword ? <EyeOff style={{ width: '20px', height: '20px', color: '#A5B4FC' }} /> : <Eye style={{ width: '20px', height: '20px', color: '#A5B4FC' }} />}
                </button>
              </div>
            </div>

            {/* Nút Đăng nhập */}
            <div style={{ paddingTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '0.875rem 1rem', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, color: '#fff', background: 'linear-gradient(to right, #4F46E5, #9333EA)', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3), 0 4px 6px -2px rgba(79, 70, 229, 0.15)', transition: 'all 0.2s' }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center' }}>
                    Đang xác thực...
                  </span>
                ) : (
                  <>
                    <LogIn style={{ marginRight: '0.5rem', width: '20px', height: '20px' }} />
                    Đăng nhập hệ thống
                  </>
                )}
              </button>
            </div>
            
          </form>
        </div>

        {/* Footer */}
        <p style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.75rem', color: 'rgba(165, 180, 252, 0.6)' }}>
          &copy; {new Date().getFullYear()} VicEdu. Nền tảng quản trị thông minh.
        </p>

      </div>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

const SECRET = process.env.SSO_SHARED_SECRET || "vicedu_sso_secure_token_bridge_2026_xyz";

function createSsoToken(payload: { email: string; role?: string; name?: string }) {
  const data = {
    ...payload,
    exp: Date.now() + 120 * 1000, // Hiệu lực 2 phút
    nonce: crypto.randomBytes(8).toString("hex"),
  };
  const str = Buffer.from(JSON.stringify(data)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(str).digest("base64url");
  return `${str}.${sig}`;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get("target") || "/dashboard";

    if (!user || authErr || !user.email) {
      // Người dùng chưa đăng nhập Web 1, chuyển hướng về trang đăng nhập
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Tra cứu thông tin hồ sơ nhân sự / đối tác từ bảng users
    const { data: profile } = await supabase
      .from("users")
      .select("id, email, full_name, role, position, branch_id")
      .eq("email", user.email)
      .maybeSingle();

    const ssoToken = createSsoToken({
      email: user.email,
      role: profile?.role || "Staff",
      name: profile?.full_name || "",
    });

    const isLocalhost = requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1";
    const learningBaseUrl = process.env.NEXT_PUBLIC_LEARNING_BASE_URL 
      || (isLocalhost ? "http://localhost:3001" : "https://hoc.viceduvn.com");

    const destination = new URL(`${learningBaseUrl}/api/sso`);
    destination.searchParams.set("token", ssoToken);
    destination.searchParams.set("redirect", target);

    return NextResponse.redirect(destination.toString(), 303);
  } catch (error: any) {
    console.error("Lỗi khởi tạo phiên SSO từ Web 1:", error);
    return NextResponse.json({ error: "Lỗi khởi tạo phiên SSO" }, { status: 500 });
  }
}

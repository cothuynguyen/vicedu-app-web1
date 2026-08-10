"use server";

export async function fetchPadletStatsByUrl(padletApiUrl: string) {
  try {
    if (!padletApiUrl) {
      return { success: false, error: "Không có link Padlet API" };
    }

    const apiKey = process.env.PADLET_API_KEY;
    if (!apiKey) {
      return { success: false, error: "Chưa cấu hình PADLET_API_KEY" };
    }

    // Gọi Padlet API
    const res = await fetch(padletApiUrl, {
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json"
      },
      next: { revalidate: 60 } // Cache 60s
    });

    if (!res.ok) {
      console.error("Padlet API Error:", res.status, res.statusText);
      return { success: false, error: "Không thể kết nối đến Padlet" };
    }

    const data = await res.json();
    
    if (!data.included) {
      return { success: true, stats: { thisWeek: { Razkids: 0, BTVN: 0 }, total: { Razkids: 0, BTVN: 0 } } };
    }

    // 1. Lọc Sections và chuẩn hóa tên (Razkids hoặc BTVN)
    const sections = data.included.filter((item: any) => item.type === "section");
    const sectionMap = new Map<string, string>();
    sections.forEach((sec: any) => {
      if (sec.id && sec.attributes?.title) {
        const lowerTitle = sec.attributes.title.toLowerCase();
        if (lowerTitle.includes("razkids")) {
          sectionMap.set(sec.id, "Razkids");
        } else if (lowerTitle.includes("bài tập") || lowerTitle.includes("homework") || lowerTitle.includes("btvn")) {
          sectionMap.set(sec.id, "BTVN");
        }
      }
    });

    // 2. Tính toán các mốc thời gian (Chuẩn múi giờ Việt Nam UTC+7)
    const VN_OFFSET = 7 * 60 * 60 * 1000;
    const now = new Date();
    const vnNow = new Date(now.getTime() + VN_OFFSET);
    
    let dayOfWeek = vnNow.getUTCDay() - 1; // 0 is Monday
    if (dayOfWeek === -1) dayOfWeek = 6;
    
    const thisWeekStartVn = new Date(vnNow);
    thisWeekStartVn.setUTCDate(vnNow.getUTCDate() - dayOfWeek);
    thisWeekStartVn.setUTCHours(0, 0, 0, 0);
    
    const toRealUTC = (fakeVnDate: Date) => new Date(fakeVnDate.getTime() - VN_OFFSET);
    const thisWeekStart = toRealUTC(thisWeekStartVn);

    const stats = {
      thisWeek: { Razkids: 0, BTVN: 0 },
      total: { Razkids: 0, BTVN: 0 }
    };

    // 3. Quét Posts và phân loại
    const posts = data.included.filter((item: any) => item.type === "post");

    posts.forEach((post: any) => {
      const createdAtStr = post.attributes?.createdAt;
      if (!createdAtStr) return;
      
      const createdAt = new Date(createdAtStr);
      const sectionId = post.relationships?.section?.data?.id;
      if (!sectionId) return;

      const category = sectionMap.get(sectionId);
      if (!category) return; // Chỉ lấy Razkids và BTVN

      // Tính tổng
      stats.total[category as "Razkids" | "BTVN"]++;

      // Phân bổ thời gian
      if (createdAt >= thisWeekStart) {
        stats.thisWeek[category as "Razkids" | "BTVN"]++;
      }
    });

    return { success: true, stats: stats };

  } catch (err: any) {
    console.error("fetchPadletStats Exception:", err);
    return { success: false, error: err.message };
  }
}

export async function fetchPadletStatsBatch(padletApiUrls: string[]) {
  // Loại bỏ các url rỗng hoặc trùng lặp
  const uniqueUrls = Array.from(new Set(padletApiUrls.filter(url => !!url)));
  
  const results: Record<string, any> = {};
  
  if (uniqueUrls.length === 0) {
    return results;
  }

  // Chạy song song tất cả các request
  const promises = uniqueUrls.map(async (url) => {
    const data = await fetchPadletStatsByUrl(url);
    results[url] = data;
  });

  await Promise.allSettled(promises);
  
  return results;
}

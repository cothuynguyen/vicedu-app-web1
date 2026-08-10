import React from "react";

interface PadletStatsCellProps {
  padletApiUrl: string | null;
  type: "Razkids" | "BTVN";
  loading?: boolean;
  data?: { success: boolean, stats?: { thisWeek: any, total: any }, error?: string } | null;
}

export default function PadletStatsCell({ padletApiUrl, type, loading, data }: PadletStatsCellProps) {
  if (!padletApiUrl) {
    return <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>--</span>;
  }

  if (loading || !data) {
    return (
      <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
        <div style={{ width: "12px", height: "12px", border: "2px solid #cbd5e1", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!data.success || !data.stats) {
    return <span style={{ color: "#ef4444", fontSize: "0.85rem" }} title={data.error || "Lỗi"}>Lỗi: {data.error || "No data"}</span>;
  }

  const stats = {
    thisWeek: data.stats.thisWeek[type] || 0,
    total: data.stats.total[type] || 0
  };

  return (
    <div style={{ whiteSpace: "nowrap" }}>
      <div style={{ fontWeight: 700, fontSize: "1rem", color: stats.thisWeek > 0 ? "#16a34a" : "#64748b" }}>
        {stats.thisWeek} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#94a3b8" }}>bài / tuần</span>
      </div>
      <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
        Tổng: {stats.total} bài
      </div>
    </div>
  );
}

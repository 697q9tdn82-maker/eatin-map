import Link from "next/link";

// 読みものページ共通の外枠（赤いヘッダー＋本文エリア）
export const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
export const h2 = { fontSize: "16px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0, lineHeight: 1.6 };
export const h3 = { fontSize: "14.5px", fontWeight: 800, color: "#333", margin: "14px 0 6px" };
export const p = { fontSize: "14px", color: "#555", margin: "0 0 10px", lineHeight: 2 };
export const linkStyle = { color: "#e63946", fontWeight: 700 };

export default function PageShell({ title, subtitle, back = { href: "/", label: "← マップに戻る" }, meta, children }) {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <Link href={back.href} style={{ color: "rgba(255,255,255,0.75)", textDecoration: "none", fontSize: "13px" }}>{back.label}</Link>
        <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#fff", margin: "12px 0 4px", lineHeight: 1.5 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", margin: 0 }}>{subtitle}</p>}
        {meta && <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", margin: "8px 0 0" }}>{meta}</p>}
      </div>
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>{children}</div>
    </div>
  );
}

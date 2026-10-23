import Link from "next/link";
import { GUIDES } from "../../lib/guides";
import { card } from "./PageShell";

// 記事の末尾に置く「あわせて読みたい」
export default function RelatedGuides({ current, count = 3 }) {
  const list = GUIDES.filter(g => g.href !== current).slice(0, count);
  return (
    <>
      <div style={card}>
        <div style={{ fontSize: "14px", fontWeight: 800, color: "#333", marginBottom: 10 }}>あわせて読みたい</div>
        {list.map(g => (
          <Link key={g.href} href={g.href} style={{ display: "flex", gap: 10, padding: "8px 0", borderTop: "1px solid #f3f3f3", textDecoration: "none" }}>
            <span style={{ fontSize: "20px" }}>{g.emoji}</span>
            <span style={{ fontSize: "13.5px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.6 }}>{g.title}</span>
          </Link>
        ))}
      </div>
      <div style={{ textAlign: "center" }}>
        <Link href="/guide" style={{ fontSize: "13px", color: "#e63946", fontWeight: 700 }}>← ガイド記事一覧へ</Link>
      </div>
    </>
  );
}

import Link from "next/link";
import PageShell, { card, linkStyle } from "../components/PageShell";
import { NEWS, tagStyle, newsDate } from "../../lib/news";

export const metadata = {
  title: "お知らせ・更新情報｜コンビニイートインマップ",
  description: "コンビニイートインマップの新機能・掲載データの追加・改善などの更新情報です。",
  alternates: { canonical: "https://www.eatin-map.jp/news" },
};

export default function NewsPage() {
  return (
    <PageShell title="お知らせ" subtitle="新機能・データの追加・改善などの更新情報">
      {NEWS.map((n, i) => (
        <article key={i} style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <time dateTime={n.date} style={{ fontSize: "12px", color: "#999" }}>{newsDate(n.date)}</time>
            <span style={tagStyle(n.tag)}>{n.tag}</span>
          </div>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#1a1a1a", margin: "0 0 8px", lineHeight: 1.6 }}>{n.title}</h2>
          <p style={{ fontSize: "13.5px", color: "#555", lineHeight: 1.9, margin: 0 }}>{n.body}</p>
          {n.link && (
            <Link href={n.link.href} style={{ ...linkStyle, display: "inline-block", fontSize: "13px", marginTop: 8 }}>{n.link.label} →</Link>
          )}
        </article>
      ))}
    </PageShell>
  );
}

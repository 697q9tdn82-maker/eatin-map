// 「応援する（投げ銭）」ボタン
// 投げ銭ページ（OFUSE）。変えたいときはここを書き換えるか、Vercelの環境変数 NEXT_PUBLIC_DONATE_URL に入れる
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL || "https://ofuse.me/5bb88bec";

// variant:
//   (なし)    … 説明つきのカード（トップ・このサイトについて）
//   compact  … メニューの中の1行
//   header   … 地図画面のヘッダー（タイトルと☰の間）の小さいボタン
//   thanks   … 「助かった！」や投稿の直後に出す1行
export default function SupportLink({ compact = false, variant = compact ? "compact" : "card" }) {
  if (!/^https:\/\//.test(DONATE_URL)) return null;
  if (variant === "header") {
    return (
      <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fff7f0", border: "1.5px solid #ffd9b8", borderRadius: 10, padding: "5px 9px", fontSize: "12px", fontWeight: 800, color: "#e67e00", textDecoration: "none", whiteSpace: "nowrap", lineHeight: 1, flexShrink: 0 }}>
        ☕ 応援する
      </a>
    );
  }
  if (variant === "thanks") {
    return (
      <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", textAlign: "center", fontSize: "12.5px", fontWeight: 700, color: "#e67e00", textDecoration: "none", padding: "8px 0 2px" }}>
        ☕ 役に立ったら、このサイトを応援する →
      </a>
    );
  }
  if (variant === "compact") {
    return (
      <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#e63946", textDecoration: "none", padding: "8px 0" }}>
        ☕ このサイトを応援する
      </a>
    );
  }
  return (
    <div style={{ background: "#fff7f0", border: "1.5px solid #ffd9b8", borderRadius: 14, padding: "14px 16px", margin: "0 0 16px" }}>
      <div style={{ fontSize: "13.5px", fontWeight: 800, color: "#333", marginBottom: 4 }}>☕ このサイトを応援する</div>
      <p style={{ fontSize: "12.5px", color: "#666", lineHeight: 1.8, margin: "0 0 10px" }}>
        コンビニイートインマップは個人が運営しています。「助かった」と思ったら、コーヒー1杯ぶんの応援をいただけると、サーバー代と開発の励みになります。
      </p>
      <a href={DONATE_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "#e63946", color: "#fff", fontWeight: 700, fontSize: "13px", borderRadius: 10, padding: "9px 16px", textDecoration: "none" }}>
        応援する（投げ銭） →
      </a>
    </div>
  );
}

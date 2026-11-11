// 「応援する（投げ銭）」ボタン
// Vercelの環境変数 NEXT_PUBLIC_DONATE_URL に、投げ銭ページ（OFUSEなど）のURLを入れると表示されます。
// 入れていない間は何も表示しません。
const DONATE_URL = process.env.NEXT_PUBLIC_DONATE_URL || "";

export default function SupportLink({ compact = false }) {
  if (!/^https:\/\//.test(DONATE_URL)) return null;
  if (compact) {
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

export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>

      {/* ヘッダー */}
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <a href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← マップに戻る</a>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#fff", margin: "12px 0 4px" }}>プライバシーポリシー</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>最終更新日：2025年6月1日</p>
      </div>

      {/* コンテンツ */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>1. 収集する情報</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: "0 0 8px" }}>本アプリは以下の情報を収集します。</p>
          <ul style={{ fontSize: "14px", color: "#555", paddingLeft: 20, margin: 0, lineHeight: 2 }}>
            <li>位置情報（現在地から探す機能を使用した場合）</li>
            <li>投稿内容（イートインの有無・席数・コンセント・Wi-Fi・コメント）</li>
            <li>混雑情報・「助かった」のカウント</li>
          </ul>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>2. 情報の利用目的</h2>
          <ul style={{ fontSize: "14px", color: "#555", paddingLeft: 20, margin: 0, lineHeight: 2 }}>
            <li>コンビニのイートイン情報をユーザー間で共有するため</li>
            <li>アプリの機能改善・品質向上のため</li>
          </ul>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>3. 位置情報について</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>位置情報は「現在地から探す」機能にのみ使用します。位置情報はサーバーに保存されません。ブラウザの設定からいつでも位置情報の利用を拒否できます。</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>4. 第三者サービスの利用</h2>
          <ul style={{ fontSize: "14px", color: "#555", paddingLeft: 20, margin: "0 0 8px", lineHeight: 2 }}>
            <li>Google Maps Platform（地図表示・店舗検索）</li>
            <li>Firebase（投稿データの保存）</li>
          </ul>
          <p style={{ fontSize: "14px", color: "#555", margin: 0 }}>各サービスのプライバシーポリシーが適用されます。</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>5. 情報の第三者提供</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>法令に基づく場合を除き、収集した情報を第三者に提供することはありません。</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>6. お問い合わせ</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>本ポリシーに関するお問い合わせは、アプリ内の投稿機能または公式SNSよりご連絡ください。</p>
        </div>

      </div>
    </div>
  );
}

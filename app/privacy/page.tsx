export default function PrivacyPolicy() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", maxWidth: 680, margin: "0 auto", padding: "32px 20px 60px", color: "#1a1a1a", lineHeight: 1.8, background: "#fff", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "22px", fontWeight: 900, marginBottom: 8 }}>プライバシーポリシー</h1>
      <p style={{ fontSize: "12px", color: "#aaa", marginBottom: 32 }}>最終更新日：2025年6月1日</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>1. 収集する情報</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>本アプリは以下の情報を収集します。</p>
        <ul style={{ fontSize: "14px", color: "#444", paddingLeft: 20, marginTop: 8 }}>
          <li>位置情報（現在地から探す機能を使用した場合）</li>
          <li>投稿内容（イートインの有無・席数・コンセント・Wi-Fi・コメント）</li>
          <li>混雑情報・「助かった」のカウント</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>2. 情報の利用目的</h2>
        <ul style={{ fontSize: "14px", color: "#444", paddingLeft: 20 }}>
          <li>コンビニのイートイン情報をユーザー間で共有するため</li>
          <li>アプリの機能改善・品質向上のため</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>3. 位置情報について</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>位置情報は「現在地から探す」機能にのみ使用します。位置情報はサーバーに保存されません。ブラウザの設定からいつでも位置情報の利用を拒否できます。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>4. 第三者サービスの利用</h2>
        <ul style={{ fontSize: "14px", color: "#444", paddingLeft: 20 }}>
          <li>Google Maps Platform（地図表示・店舗検索）</li>
          <li>Firebase（投稿データの保存）</li>
        </ul>
        <p style={{ fontSize: "14px", color: "#444", marginTop: 8 }}>各サービスのプライバシーポリシーが適用されます。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>5. 情報の第三者提供</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>法令に基づく場合を除き、収集した情報を第三者に提供することはありません。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>6. お問い合わせ</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>本ポリシーに関するお問い合わせは、アプリ内の投稿機能または公式SNSよりご連絡ください。</p>
      </section>

      <a href="/" style={{ display: "inline-block", marginTop: 16, fontSize: "13px", color: "#e63946", textDecoration: "none", fontWeight: 700 }}>← トップに戻る</a>
    </div>
  );
}
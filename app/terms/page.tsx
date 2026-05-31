export default function Terms() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", maxWidth: 680, margin: "0 auto", padding: "32px 20px 60px", color: "#1a1a1a", lineHeight: 1.8 }}>
      <h1 style={{ fontSize: "22px", fontWeight: 900, marginBottom: 8 }}>利用規約</h1>
      <p style={{ fontSize: "12px", color: "#aaa", marginBottom: 32 }}>最終更新日：2025年6月1日</p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>1. サービスについて</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>コンビニイートインマップ（以下「本サービス」）は、コンビニエンスストアのイートインスペース情報をユーザー同士で共有するWebアプリです。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>2. 禁止事項</h2>
        <ul style={{ fontSize: "14px", color: "#444", paddingLeft: 20 }}>
          <li>虚偽の情報を投稿する行為</li>
          <li>他のユーザーや第三者を誹謗中傷する行為</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>その他、法令または公序良俗に反する行為</li>
        </ul>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>3. 投稿コンテンツ</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>ユーザーが投稿したイートイン情報は、本サービス上で公開されます。投稿内容の正確性について、運営は保証しません。情報が古い場合や誤りがある場合はご了承ください。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>4. 免責事項</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>本サービスの情報の正確性・完全性について保証しません。本サービスの利用により生じた損害について、運営は責任を負いません。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>5. サービスの変更・終了</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>運営は予告なくサービスの内容を変更・終了する場合があります。</p>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: "16px", fontWeight: 800, marginBottom: 8, borderLeft: "4px solid #e63946", paddingLeft: 10 }}>6. 規約の変更</h2>
        <p style={{ fontSize: "14px", color: "#444" }}>本規約は必要に応じて変更することがあります。変更後も本サービスを利用した場合、変更後の規約に同意したものとみなします。</p>
      </section>

      <a href="/" style={{ display: "inline-block", marginTop: 16, fontSize: "13px", color: "#e63946", textDecoration: "none", fontWeight: 700 }}>← トップに戻る</a>
    </div>
  );
}
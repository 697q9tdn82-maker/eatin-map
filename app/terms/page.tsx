export default function Terms() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>

      {/* ヘッダー */}
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <a href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← マップに戻る</a>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#fff", margin: "12px 0 4px" }}>利用規約</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>最終更新日：2025年6月1日</p>
      </div>

      {/* コンテンツ */}
      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>1. サービスについて</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>コンビニイートインマップ（以下「本サービス」）は、コンビニエンスストアのイートインスペース情報をユーザー同士で共有するWebアプリです。</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>2. 禁止事項</h2>
          <ul style={{ fontSize: "14px", color: "#555", paddingLeft: 20, margin: 0, lineHeight: 2 }}>
            <li>虚偽の情報を投稿する行為</li>
            <li>他のユーザーや第三者を誹謗中傷する行為</li>
            <li>本サービスの運営を妨害する行為</li>
            <li>その他、法令または公序良俗に反する行為</li>
          </ul>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>3. 投稿コンテンツ</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>ユーザーが投稿したイートイン情報は、本サービス上で公開されます。投稿内容の正確性について、運営は保証しません。情報が古い場合や誤りがある場合はご了承ください。</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>4. 免責事項</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>本サービスの情報の正確性・完全性について保証しません。本サービスの利用により生じた損害について、運営は責任を負いません。</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>5. サービスの変更・終了</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>運営は予告なくサービスの内容を変更・終了する場合があります。</p>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 }}>6. 規約の変更</h2>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.9 }}>本規約は必要に応じて変更することがあります。変更後も本サービスを利用した場合、変更後の規約に同意したものとみなします。</p>
        </div>

      </div>
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "このサイトについて｜コンビニイートインマップ",
  description: "コンビニイートインマップのサービス概要と、掲載しているイートイン情報の仕組みについて説明しています。",
  alternates: { canonical: "https://www.eatin-map.jp/about" },
};

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const h2: React.CSSProperties = { fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 };
const p: React.CSSProperties = { fontSize: "14px", color: "#555", margin: "0 0 10px", lineHeight: 1.9 };

export default function About() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <Link href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← マップに戻る</Link>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#fff", margin: "12px 0 4px" }}>このサイトについて</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>サービス概要と情報の仕組み</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>

        <div style={card}>
          <h2 style={h2}>コンビニイートインマップとは</h2>
          <p style={p}>「コンビニイートインマップ」は、イートインスペース（店内の飲食席）があるコンビニを地図から探せる無料のウェブサービスです。現在地や駅名から検索でき、登録やアプリのインストールは不要です。東京・大阪のオフィス街を中心に、全国68エリアに対応しています。</p>
          <p style={{ ...p, margin: 0 }}>物価高でランチの外食が1,000円を超えることが珍しくなくなったいま、おにぎりとお茶で数百円、座って休憩できるコンビニのイートインは、働く人にとって貴重な存在です。ところが「どの店にイートインがあるか」を調べる手段は意外とありません。このサイトはその隙間を埋めるために作られました。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>できること</h2>
          <p style={p}>・<strong>現在地から探す</strong> — GPSで近くのコンビニを表示し、イートインの有無を色分けしたピンで確認できます。</p>
          <p style={p}>・<strong>駅名・エリア名で探す</strong> — 「新宿駅」などを入力すれば、その周辺の店舗が地図に表示されます。</p>
          <p style={p}>・<strong>条件で絞り込む</strong> — 営業中・イートインあり・確認済み・コンセント・Wi-Fiで絞り込めます。</p>
          <p style={{ ...p, margin: 0 }}>・<strong>お気に入り保存</strong> — よく使う店を端末に保存し、次回すぐ呼び出せます（登録不要）。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>掲載情報の仕組み</h2>
          <p style={p}>イートインの有無は、次の2つの情報源をもとに表示しています。</p>
          <p style={p}><strong>① ユーザーの確認情報</strong> — 実際にお店へ行った方からの「イートインあった／なかった」の投稿です。席数・コンセント・Wi-Fiの有無も投稿できます。複数の投稿がある場合は多数決で判定し、いたずら投稿1件で情報が書き換わらない仕組みにしています。</p>
          <p style={p}><strong>② AIによる推定</strong> — まだ投稿がないお店については、公開されているクチコミの記述をAIが分析し、「あり（AI推定）」として区別して表示しています。推定であることを明示し、実際に行った方の投稿があれば人の情報を優先します。</p>
          <p style={{ ...p, margin: 0 }}>正確性には努めていますが、イートインの営業状況は店舗の判断で変わることがあります。お出かけ前の参考情報としてご利用ください。誤りを見つけた場合は、その店舗の詳細画面から正しい情報を投稿していただけると助かります。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>みんなで育てるマップです</h2>
          <p style={{ ...p, margin: 0 }}>このマップは、利用する人の投稿によって少しずつ正確になっていきます。立ち寄ったコンビニでイートインを見かけたら、地図上のそのお店を選んで「イートインあった！」を押すだけで登録完了です。1タップの積み重ねが、次に同じ場所で休憩したい誰かの助けになります。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>お問い合わせ</h2>
          <p style={{ ...p, margin: 0 }}>ご意見・情報提供・不具合報告は、公式Xアカウント（<a href="https://x.com/Eatin_map" target="_blank" rel="noopener noreferrer" style={{ color: "#e63946" }}>@Eatin_map</a>）のDMまたはリプライまでお願いします。「この店にイートインあったよ」という一言だけでも、マップがより正確になります。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>関連ページ</h2>
          <p style={{ ...p, margin: 0 }}>
            <Link href="/guide" style={{ color: "#e63946" }}>イートイン活用ガイド</Link>｜
            <Link href="/privacy" style={{ color: "#e63946" }}>プライバシーポリシー</Link>｜
            <Link href="/terms" style={{ color: "#e63946" }}>利用規約</Link>
          </p>
        </div>

      </div>
    </div>
  );
}

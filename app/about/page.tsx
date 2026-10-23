import Link from "next/link";
import PageShell, { card, h2, p, linkStyle } from "../components/PageShell";

export const metadata = {
  title: "このサイトについて・運営者情報｜コンビニイートインマップ",
  description: "コンビニイートインマップのサービス概要、開発のきっかけ、掲載しているイートイン情報の仕組み、運営者情報について説明しています。",
  alternates: { canonical: "https://www.eatin-map.jp/about" },
};

const th: React.CSSProperties = { fontSize: "13px", color: "#888", fontWeight: 700, textAlign: "left", padding: "8px 12px 8px 0", verticalAlign: "top", whiteSpace: "nowrap", borderBottom: "1px solid #f2f2f2" };
const td: React.CSSProperties = { fontSize: "13.5px", color: "#444", padding: "8px 0", borderBottom: "1px solid #f2f2f2", lineHeight: 1.8 };

export default function About() {
  return (
    <PageShell title="このサイトについて" subtitle="サービス概要・情報の仕組み・運営者情報">
      <div style={card}>
        <h2 style={h2}>コンビニイートインマップとは</h2>
        <p style={p}>「コンビニイートインマップ」は、イートインスペース（店内の飲食席）があるコンビニを地図から探せる無料のウェブサービスです。現在地や駅名から検索でき、登録やアプリのインストールは不要です。東京・大阪のオフィス街を中心に、主要駅ごとの<Link href="/area" style={linkStyle}>エリアページ</Link>も用意しています。</p>
        <p style={{ ...p, margin: 0 }}>セブン-イレブン、ファミリーマート、ローソンなど、チェーンの垣根を越えてイートインの有無を横断的に調べられるのが特徴です。各社の公式サイトは自社の店舗しか載っていないため、「いまいる場所の近くで、どこなら座れるか」をまとめて知る手段がありませんでした。</p>
      </div>

      <div style={card}>
        <h2 style={h2}>開発のきっかけ</h2>
        <p style={p}>運営者は、ふだん外回りの営業をしている会社員です。商談と商談の合間に30分ほど時間が空くことがよくあり、そのたびにカフェに入っていましたが、コーヒー1杯で数百円、1日に何度も入れば出費もばかになりません。</p>
        <p style={p}>あるとき、コンビニのイートインなら飲み物1本で座って休めて、昼ごはんも安く済むことに気づきました。ところが、どのコンビニにイートインがあるかは、実際に入ってみるまで分かりません。そこで、自分用にGoogleマップへ「イートインがあった店」を記録するようになりました。</p>
        <p style={{ ...p, margin: 0 }}>物価高でランチが1,000円を超えるのも当たり前になったいま、同じように「安く座れる場所」を探している人は多いはずです。この記録をみんなで共有できれば役に立つと考え、このサービスを作りました。</p>
      </div>

      <div style={card}>
        <h2 style={h2}>できること</h2>
        <p style={p}>・<strong>現在地から探す</strong> — 近くのコンビニを表示し、イートインの有無を色分けしたピンで確認できます。</p>
        <p style={p}>・<strong>駅名・エリア名で探す</strong> — 「新宿駅」などを入力すれば、その周辺の店舗が地図に表示されます。</p>
        <p style={p}>・<strong>条件で絞り込む</strong> — イートインあり・確認済み・コンセント・Wi-Fiなどで絞り込めます。</p>
        <p style={{ ...p, margin: 0 }}>・<strong>情報を投稿する</strong> — 行った店のイートインの有無・席数・設備をワンタップで共有できます。詳しくは<Link href="/guide/how-to-use" style={linkStyle}>使い方ガイド</Link>をご覧ください。</p>
      </div>

      <div style={card}>
        <h2 style={h2}>掲載情報の仕組み</h2>
        <p style={p}>店舗の名称・住所・位置はGoogleマップ（Google Maps Platform）の情報を表示しています。イートインの有無は、次の2つの情報源をもとに判定しています。</p>
        <p style={p}><strong>① 利用者の確認情報</strong> — 実際にお店へ行った方からの「イートインあった／なかった」の投稿です。席数・コンセント・Wi-Fiの有無も投稿できます。複数の投稿がある場合は多数決で判定し、いたずら投稿1件で情報が書き換わらない仕組みにしています。</p>
        <p style={p}><strong>② AIによる推定</strong> — まだ投稿がないお店については、公開されているクチコミの記述をAIが分析し、「あり（AI推定）」として区別して表示しています。推定であることを明示し、利用者の投稿があればそちらを優先します。</p>
        <p style={{ ...p, margin: 0 }}>集まったデータの全体像は<Link href="/report" style={linkStyle}>イートイン設置率レポート</Link>で公開しています。正確性には努めていますが、イートインの営業状況は店舗の判断で変わることがあります。お出かけ前の参考情報としてご利用ください。</p>
      </div>

      <div style={card}>
        <h2 style={h2}>運営者情報</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            <tr><th style={th}>サイト名</th><td style={td}>コンビニイートインマップ</td></tr>
            <tr><th style={th}>URL</th><td style={td}>https://www.eatin-map.jp</td></tr>
            <tr><th style={th}>運営</th><td style={td}>コンビニイートインマップ運営（個人運営）</td></tr>
            <tr><th style={th}>開設</th><td style={td}>2026年</td></tr>
            <tr><th style={th}>お問い合わせ</th><td style={td}><Link href="/contact" style={linkStyle}>お問い合わせフォーム</Link>／公式X（<a href="https://x.com/Eatin_map" target="_blank" rel="noopener noreferrer" style={linkStyle}>@Eatin_map</a>）</td></tr>
          </tbody>
        </table>
        <p style={{ ...p, margin: "12px 0 0", fontSize: "12.5px", color: "#888" }}>当サイトはコンビニ各社とは関係のない、個人が運営する非公式のサービスです。各社の商標はそれぞれの権利者に帰属します。</p>
      </div>

      <div style={card}>
        <h2 style={h2}>関連ページ</h2>
        <p style={{ ...p, margin: 0 }}>
          <Link href="/guide" style={linkStyle}>イートイン活用ガイド</Link>｜
          <Link href="/faq" style={linkStyle}>よくある質問</Link>｜
          <Link href="/privacy" style={linkStyle}>プライバシーポリシー</Link>｜
          <Link href="/terms" style={linkStyle}>利用規約</Link>
        </p>
      </div>
    </PageShell>
  );
}

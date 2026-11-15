import Link from "next/link";
import PageShell, { card, h2, h3, p, linkStyle } from "../../components/PageShell";
import RelatedGuides from "../../components/RelatedGuides";

export const metadata = {
  title: "コンビニのイートインの消費税は8%？10%？｜レジでの伝え方と金額の差｜コンビニイートインマップ",
  description: "コンビニで買ったものをイートインで食べると消費税は10%、持ち帰りは8%。レジでどう伝えればいいか、いくら変わるのか、買ったあとで気が変わったときはどうするかを分かりやすくまとめました。",
  alternates: { canonical: "https://www.eatin-map.jp/guide/tax" },
};

const li = { marginBottom: 6 };

export default function Tax() {
  return (
    <PageShell
      title="コンビニのイートインの消費税は8%？10%？"
      subtitle="レジでの伝え方と、実際いくら変わるのか"
      back={{ href: "/guide", label: "← ガイド一覧に戻る" }}
      meta="公開：2026年11月12日｜執筆：コンビニイートインマップ運営"
    >
      <div style={card}>
        <h2 style={h2}>答え：イートインで食べるなら10%、持ち帰るなら8%</h2>
        <p style={p}>
          コンビニの食べ物・飲み物（お酒を除く）は、持ち帰る場合は軽減税率の8%です。
          同じ商品でも、店内のイートインで食べる場合は「外食」と同じ扱いになり、10%になります。
        </p>
        <p style={{ ...p, margin: 0 }}>
          この記事は2026年11月時点の制度をもとにしています。食料品の消費税率については見直しの議論があり、今後変わる可能性があります。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>いくら変わる？</h2>
        <p style={p}>差は本体価格の2%です。昼ごはんの金額だと、次のくらいになります。</p>
        <ul style={{ ...p, paddingLeft: 20, listStyleType: "disc" }}>
          <li style={li}>本体300円（おにぎり2個など）：持ち帰り324円 → イートイン330円（＋6円）</li>
          <li style={li}>本体500円：持ち帰り540円 → イートイン550円（＋10円）</li>
          <li style={li}>本体800円：持ち帰り864円 → イートイン880円（＋16円）</li>
        </ul>
        <p style={{ ...p, margin: 0 }}>
          500円のランチで10円。月20日使っても200円ほどです。座って休める場所代と考えれば、カフェに入るよりずっと安く済みます。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>レジではどう伝える？</h2>
        <p style={p}>
          税率は、会計のときの申し出で決まります。イートインで食べるつもりなら、レジで<strong>「イートインで」「店内で食べます」</strong>とひとこと伝えるだけです。
          何も言わなければ、持ち帰り（8%）として会計されます。
        </p>
        <h3 style={h3}>セルフレジの場合</h3>
        <p style={{ ...p, margin: 0 }}>
          セルフレジでは、画面に「店内で食べる／持ち帰る」を選ぶボタンが出る店と、出ない店があります。選ぶ画面がない場合は、有人レジで申し出るか、店員さんに声をかけてください。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>よくある疑問</h2>
        <h3 style={h3}>持ち帰りで買ったあと、やっぱり座って食べたくなったら？</h3>
        <p style={p}>
          税率は会計の時点の申し出で決まるため、あとから差額を払う仕組みは基本的にありません。
          ただ、最初から座るつもりなら正直に伝えるのがルールです。イートインを気持ちよく使い続けるためにも、食べると決めているときは会計で申し出ましょう。
        </p>
        <h3 style={h3}>食べるものと持ち帰るものを一緒に買うときは？</h3>
        <p style={p}>
          「これは店内で、これは持ち帰りで」と伝えれば、商品ごとに税率を分けて会計してもらえます。
        </p>
        <h3 style={h3}>コーヒーだけ買って座るのも10%？</h3>
        <p style={p}>
          はい。飲み物だけでも、イートインで飲むなら10%です。
        </p>
        <h3 style={h3}>お酒やたばこ、雑誌は？</h3>
        <p style={{ ...p, margin: 0 }}>
          お酒や、食べ物以外の商品（雑誌、日用品など）は、もともと軽減税率の対象外なので、持ち帰りでも店内でも10%です。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>2%分を取り戻すには</h2>
        <p style={{ ...p, margin: 0 }}>
          イートインで食べると2%高くなりますが、払い方を工夫すればそれ以上にポイントで戻ってきます。
          チェーンごとの還元が大きい払い方は<Link href="/guide/payment" style={linkStyle}>コンビニでいちばんお得な払い方</Link>にまとめました。
          イートインの基本的な使い方は<Link href="/guide/manner" style={linkStyle}>使い方とマナー完全ガイド</Link>、
          近くの座れるコンビニは<Link href="/" style={linkStyle}>マップ</Link>から探せます。
        </p>
      </div>

      <RelatedGuides current="/guide/tax" />
    </PageShell>
  );
}

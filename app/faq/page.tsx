import Link from "next/link";

export const metadata = {
  title: "コンビニのイートインに関するよくある質問｜コンビニイートインマップ",
  description: "コンビニのイートインは何時まで使える？消費税は8%と10%どちらになる？コンセントやWi-Fiはある？イートインの疑問にまとめて答えます。",
  alternates: { canonical: "https://www.eatin-map.jp/faq" },
  openGraph: {
    title: "コンビニのイートインに関するよくある質問",
    description: "コンビニのイートインは何時まで使える？消費税は？コンセントは？イートインの疑問にまとめて答えます。",
    url: "https://www.eatin-map.jp/faq",
    siteName: "コンビニイートインマップ",
    locale: "ja_JP",
    type: "website",
  },
};

// AIや検索エンジンが引用しやすいよう、質問と答えを1問1答で完結させる
const FAQS: { q: string; a: string }[] = [
  {
    q: "イートインがあるコンビニはどうやって探せばいいですか？",
    a: "コンビニイートインマップ（eatin-map.jp）を使うと、イートイン席のあるコンビニを地図上で探せます。現在地から探すか、駅名を入力して検索します。青いピンがイートインあり、グレーがなし、オレンジが未確認の店舗です。登録やアプリのインストールは不要で、無料で使えます。",
  },
  {
    q: "コンビニのイートインを利用するとき、消費税は8%と10%のどちらですか？",
    a: "店内のイートインで飲食する場合は10%です。持ち帰りは軽減税率が適用されて8%になります。イートインを使うときは、レジで「店内で食べます」と伝えてください。セルフレジの場合は「店内飲食」を選択します。",
  },
  {
    q: "コンビニのイートインは何時間くらい利用できますか？",
    a: "明確な制限時間を設けている店舗は多くありませんが、食事と休憩で30分程度が一般的な目安です。12時から13時の混雑時は席を待つ人がいることも多いため、食べ終わったら早めに席を空けるとよいでしょう。店舗によっては長時間利用を控えるよう掲示がある場合があり、その場合は掲示に従ってください。",
  },
  {
    q: "何も買わずにイートインの席だけ使ってもいいですか？",
    a: "イートインは商品を購入した人のための設備です。休憩だけの場合でも、飲み物などを購入してから利用してください。また、他店で購入したものの持ち込みは原則できません。",
  },
  {
    q: "コンビニのイートインにコンセントやWi-Fiはありますか？",
    a: "店舗によって異なります。コンセントを備えたカウンター席がある店舗もあれば、席のみの店舗もあります。コンビニイートインマップでは、利用者の投稿をもとにコンセント（🔌）とWi-Fi（📶）の有無を店舗ごとに表示し、条件による絞り込みもできます。",
  },
  {
    q: "セブン-イレブン、ファミリーマート、ローソンのどれがイートインが多いですか？",
    a: "イートインの有無はチェーンではなく店舗ごとの判断で決まるため、特定のチェーンなら必ずあるとは言えません。傾向としては、セブン-イレブンは窓際のカウンター席、ファミリーマートはテーブル席を備えた広めのイートインコーナー、ローソンはマチカフェと組み合わせた利用が多く見られます。確実に知るには店舗単位で確認するのが確実です。",
  },
  {
    q: "コンビニのイートインで電子レンジやお湯は使えますか？",
    a: "イートインを設置している店舗の多くは、電子レンジ、給湯器、専用のゴミ箱を備えています。カップ麺やお弁当をその場で温めて食べられるため、500円程度で温かい食事をとることができます。",
  },
  {
    q: "コンビニイートインマップの情報はどこから来ていますか？",
    a: "2つの情報源があります。1つは実際に店舗を訪れた利用者による投稿で、複数の投稿がある場合は多数決で判定します。もう1つは、まだ投稿がない店舗についてクチコミの記述をAIが分析した推定で、こちらは「AI推定」と明示して区別しています。人による確認情報がある場合は、そちらを優先して表示します。",
  },
  {
    q: "イートインの情報が実際と違った場合はどうすればいいですか？",
    a: "地図上でその店舗を選び、「イートインあった！」または「なかった」をタップすると、正しい情報を投稿できます。席数やコンセントの有無、コメントも登録できます。投稿は1店舗につき1回までで、登録は不要です。",
  },
  {
    q: "コンビニイートインマップは無料ですか？対応エリアはどこですか？",
    a: "完全無料で、会員登録も不要です。東京・大阪のオフィス街を中心に全国68エリアの専用ページがあり、地図検索自体は日本全国で利用できます。新宿、渋谷、池袋、東京駅、横浜、梅田、難波などの主要エリアに対応しています。",
  },
];

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };

export default function FAQPage() {
  // 構造化データ（AIや検索エンジンが質問と答えのペアとして認識できるようにする）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map(f => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <Link href="/" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← マップに戻る</Link>
        <h1 style={{ fontSize: "21px", fontWeight: 900, color: "#fff", margin: "12px 0 4px", lineHeight: 1.5 }}>コンビニのイートインに関するよくある質問</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>使い方・税率・設備・情報の仕組みまで</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>
        {FAQS.map((f, i) => (
          <div key={i} style={card}>
            <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0, lineHeight: 1.6 }}>Q. {f.q}</h2>
            <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 2 }}>{f.a}</p>
          </div>
        ))}

        <div style={{ ...card, background: "#fffbea", border: "1.5px solid #f4d03f44" }}>
          <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 2 }}>
            ここにない疑問は、公式Xアカウント（<a href="https://x.com/Eatin_map" target="_blank" rel="noopener noreferrer" style={{ color: "#e63946", fontWeight: 700 }}>@Eatin_map</a>）までお気軽にどうぞ。
            近くの座れるコンビニを探すなら<Link href="/" style={{ color: "#e63946", fontWeight: 700 }}>マップ</Link>、
            もっと詳しい解説は<Link href="/guide" style={{ color: "#e63946", fontWeight: 700 }}>活用ガイド</Link>をご覧ください。
          </p>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export const metadata = {
  title: "セブン・ファミマ・ローソン イートイン比較｜コンビニイートインマップ",
  description: "セブン-イレブン、ファミリーマート、ローソンのイートインの特徴と見つけ方を比較。設備の傾向、公式の探し方、使い分けのコツを解説します。",
  alternates: { canonical: "https://www.eatin-map.jp/guide/chains" },
};

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const h2: React.CSSProperties = { fontSize: "16px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 };
const p: React.CSSProperties = { fontSize: "14px", color: "#555", margin: "0 0 10px", lineHeight: 2 };

export default function ChainsGuide() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <Link href="/guide" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← ガイド一覧に戻る</Link>
        <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#fff", margin: "12px 0 4px", lineHeight: 1.5 }}>セブン・ファミマ・ローソン イートイン比較</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>チェーンごとの特徴を知って賢く使い分ける</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>

        <div style={card}>
          <p style={{ ...p, margin: 0 }}>同じ「コンビニのイートイン」でも、チェーンによって席の作り方や設備の傾向には違いがあります。この記事では大手3チェーンの傾向と、それぞれの公式サイトでのイートイン店舗の探し方をまとめます。なお、イートインの有無や設備は最終的には店舗ごとの判断なので、あくまで「傾向」として参考にしてください。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>セブン-イレブン：窓際カウンター席が中心</h2>
          <p style={p}>セブンのイートインは、窓に面したカウンター席のスタイルが多い印象です。席数は数席〜10席程度とコンパクトな店が中心で、「サッと食べてサッと出る」使い方に向いています。コーヒー（セブンカフェ）との相性がよく、朝の時間帯に活用している人が目立ちます。</p>
          <p style={{ ...p, margin: 0 }}>都心部ではオフィスビルの1階に入っている店舗にイートインが併設されているケースが多く、ビル勤務でなくても利用できます。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>ファミリーマート：「イートインコーナー」表示が分かりやすい</h2>
          <p style={p}>ファミマは公式の店舗検索でイートインの有無を絞り込めるなど、チェーンとしてイートインを設備として明確に位置づけています。テーブル席を備えた比較的広めのイートインコーナーを持つ店舗もあり、ゆっくり食事をしたい場合に頼りになります。</p>
          <p style={{ ...p, margin: 0 }}>ファミマカフェやホットスナック（ファミチキなど）をその場で食べられるのも魅力です。電子レンジ・お湯・ゴミ箱が揃っている店舗が多い印象です。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>ローソン：マチカフェとの組み合わせが強い</h2>
          <p style={p}>ローソンはマチカフェ（挽きたてコーヒー）に力を入れているため、「コーヒー＋イートイン」でカフェ代わりに使える店舗が多いのが特徴です。店舗によってはベーカリーコーナー併設で、焼きたてパンとコーヒーでモーニングという使い方もできます。</p>
          <p style={{ ...p, margin: 0 }}>ナチュラルローソンやローソンストア100など業態が幅広く、業態によってイートインの傾向も変わります。都心のナチュラルローソンは比較的イートイン率が高い印象です。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>結局どう使い分ける？</h2>
          <p style={p}><strong>短時間の休憩・朝コーヒー</strong>ならセブンのカウンター席、<strong>しっかり昼食</strong>ならテーブル席のあるファミマ、<strong>カフェ代わりの作業・休憩</strong>ならローソン＋マチカフェ、というのが大まかな使い分けです。</p>
          <p style={{ ...p, margin: 0 }}>ただし、繰り返しになりますがイートインの有無は店舗ごとに異なります。「あのチェーンだから必ずある」とは言えないのが実情で、だからこそ当サイトのような店舗単位の情報が役に立ちます。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>近くの「座れるコンビニ」を地図で探す</h2>
          <p style={{ ...p, margin: 0 }}>チェーンを問わず、いま近くにあるイートイン設置店を探すなら<Link href="/" style={{ color: "#e63946", fontWeight: 700 }}>コンビニイートインマップ</Link>が便利です。実際に利用した人の投稿とAI推定で、店舗ごとのイートイン有無・席数・コンセントの有無が分かります。<Link href="/area/otemachi" style={{ color: "#e63946", fontWeight: 700 }}>大手町</Link>・<Link href="/area/shimbashi" style={{ color: "#e63946", fontWeight: 700 }}>新橋</Link>・<Link href="/area/namba" style={{ color: "#e63946", fontWeight: 700 }}>難波</Link>などオフィス街を中心に68エリアをカバーしています。</p>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/guide" style={{ fontSize: "13px", color: "#e63946", fontWeight: 700 }}>← 他のガイド記事を読む</Link>
        </div>
      </div>
    </div>
  );
}

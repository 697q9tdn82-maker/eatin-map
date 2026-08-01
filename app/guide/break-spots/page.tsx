import Link from "next/link";

export const metadata = {
  title: "外回り営業のための「座れる場所」戦略｜コンビニイートインマップ",
  description: "カフェ代を月1万円節約。外回り営業・フリーランスのための、コンビニイートインを軸にした休憩スポットの見つけ方と時間帯別の活用術を解説します。",
  alternates: { canonical: "https://www.eatin-map.jp/guide/break-spots" },
};

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const h2: React.CSSProperties = { fontSize: "16px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 };
const p: React.CSSProperties = { fontSize: "14px", color: "#555", margin: "0 0 10px", lineHeight: 2 };

export default function BreakSpotsGuide() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <Link href="/guide" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← ガイド一覧に戻る</Link>
        <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#fff", margin: "12px 0 4px", lineHeight: 1.5 }}>外回り営業のための「座れる場所」戦略</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>カフェ代を月1万円節約する休憩スポットの見つけ方</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>

        <div style={card}>
          <p style={p}>外回りの仕事をしていると、1日に何度も「座りたい」瞬間が来ます。次のアポまでの30分、昼ごはん、資料の最終確認、夕方の報告書作成。そのたびにカフェへ入ると、1杯600〜800円。1日2回で約1,500円、月20営業日なら<strong>3万円</strong>です。</p>
          <p style={{ ...p, margin: 0 }}>この記事では、コンビニイートインを軸にした「お金をかけない休憩戦略」を紹介します。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>休憩コストの現実を計算してみる</h2>
          <p style={p}>カフェでコーヒー1杯700円×月40回＝28,000円。一方、コンビニイートインならコーヒー120円＋たまにおにぎりやパンで、同じ回数でも月8,000円前後に収まります。<strong>差額はおよそ月2万円、年間24万円</strong>。座って休むという行為自体は同じなのに、これだけの差が出ます。</p>
          <p style={{ ...p, margin: 0 }}>もちろん商談前の待ち合わせなど「カフェであるべき場面」はあります。ポイントは、ひとりの休憩をイートインに置き換えることです。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>時間帯別・イートイン活用術</h2>
          <p style={p}><strong>午前（9〜11時）</strong>：狙い目の時間帯。朝の通勤ラッシュが終わったイートインは空いていて、コーヒー片手にメールチェックや1日の段取りに最適です。</p>
          <p style={p}><strong>昼（12〜13時）</strong>：混雑のピーク。オフィス街の店は席の争奪戦になるため、11時半までに入るか、13時過ぎまでずらすのが賢明です。ピーク時に使うなら、駅から少し離れた店の方が空いています。</p>
          <p style={p}><strong>午後（14〜16時）</strong>：再び空く時間帯。訪問と訪問の間の待機、提案資料の見直し、経費精算などのスキマ作業がはかどります。コンセント付きの席ならスマホ充電も。</p>
          <p style={{ ...p, margin: 0 }}><strong>夕方（17時以降)</strong>：日報や報告書をここで済ませてしまえば、オフィスに戻らず直帰できるケースも。帰宅前の「あと一仕事」に向いています。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>「使える店」を事前にストックしておく</h2>
          <p style={p}>外回りの休憩で一番のストレスは、座れる場所を探して歩き回る時間です。よく行くエリアごとに「座れる店」を2〜3軒ストックしておくと、移動中に迷わなくなります。</p>
          <p style={p}>ストックの基準は3つ。①イートインがあること、②昼のピークでも比較的空いていること、③（作業するなら）コンセントがあること。この条件で探すのは意外と手間ですが、<Link href="/" style={{ color: "#e63946", fontWeight: 700 }}>コンビニイートインマップ</Link>ならエリアを開くだけで、イートインの有無・席数・コンセントの有無が地図で分かります。</p>
          <p style={{ ...p, margin: 0 }}>お気に入り機能（⭐）を使えば、見つけた店をスマホに保存しておき、次回はワンタップでジャンプできます。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>イートイン以外の選択肢も知っておく</h2>
          <p style={p}>コンビニ以外にも、無料または低コストで座れる場所はあります。<strong>公共図書館</strong>（静かで長居できるが飲食不可が多い）、<strong>大型商業施設の休憩スペース</strong>（買い物ついでに使える）、<strong>公園のベンチ</strong>（天気次第）、<strong>駅の待合スペース</strong>（短時間向け）。</p>
          <p style={{ ...p, margin: 0 }}>それぞれ一長一短ですが、「食事もできて」「どの街にもあって」「気軽に入れる」という3拍子が揃うのはコンビニイートインだけです。選択肢の軸として持っておき、状況で使い分けるのがおすすめです。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>まとめ：休憩を「設計」する</h2>
          <p style={p}>外回りの疲れは、休憩の質で大きく変わります。行き当たりばったりでカフェを探すのではなく、時間帯とエリアで休憩場所をあらかじめ設計しておく。それだけで出費は月2万円減り、移動のストレスも減ります。</p>
          <p style={{ ...p, margin: 0 }}>まずは自分がよく行くエリアのページを開いてみてください。<Link href="/area/shimbashi" style={{ color: "#e63946", fontWeight: 700 }}>新橋</Link>・<Link href="/area/otemachi" style={{ color: "#e63946", fontWeight: 700 }}>大手町</Link>・<Link href="/area/yodoyabashi" style={{ color: "#e63946", fontWeight: 700 }}>淀屋橋</Link>など、オフィス街を中心に68エリアをカバーしています。</p>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/guide" style={{ fontSize: "13px", color: "#e63946", fontWeight: 700 }}>← 他のガイド記事を読む</Link>
        </div>
      </div>
    </div>
  );
}

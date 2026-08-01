import Link from "next/link";

export const metadata = {
  title: "コンビニイートインの使い方とマナー完全ガイド｜コンビニイートインマップ",
  description: "コンビニイートインの基本的な使い方、持ち帰りとの税率の違い（8%と10%）、滞在時間の目安、やってはいけないことまで。初めての人にも分かりやすく解説します。",
  alternates: { canonical: "https://www.eatin-map.jp/guide/manner" },
};

const card: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: "20px 24px", marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" };
const h2: React.CSSProperties = { fontSize: "16px", fontWeight: 800, color: "#e63946", marginBottom: 10, marginTop: 0 };
const p: React.CSSProperties = { fontSize: "14px", color: "#555", margin: "0 0 10px", lineHeight: 2 };

export default function MannerGuide() {
  return (
    <div style={{ fontFamily: "'Noto Sans JP','Hiragino Sans',sans-serif", position: "fixed", inset: 0, overflowY: "auto", background: "#fff9f9", padding: "0 0 80px" }}>
      <div style={{ background: "#e63946", padding: "28px 24px 24px" }}>
        <Link href="/guide" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none", fontSize: "13px" }}>← ガイド一覧に戻る</Link>
        <h1 style={{ fontSize: "20px", fontWeight: 900, color: "#fff", margin: "12px 0 4px", lineHeight: 1.5 }}>コンビニイートインの使い方とマナー完全ガイド</h1>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", margin: 0 }}>初めてでも安心して使えるように</p>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "24px 20px" }}>

        <div style={card}>
          <p style={{ ...p, margin: 0 }}>コンビニのイートインは「なんとなく使いづらい」「ルールがよく分からない」という声をよく聞きます。実際には難しいルールはほとんどありません。この記事では、基本の流れからよくある疑問、周りに気持ちよく使ってもらうためのマナーまでをまとめます。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>基本の流れは3ステップ</h2>
          <p style={p}><strong>① レジで「店内で食べます」と伝える</strong>。後述の通り消費税率が変わるため、店内で飲食する場合は会計時に申告するのがルールです。セルフレジの場合は「店内飲食」ボタンを選びます。</p>
          <p style={p}><strong>② 席で食べる・休む</strong>。電子レンジやお湯、ゴミ箱がイートインコーナーに設置されている店も多く、カップ麺やお弁当をその場で食べられます。</p>
          <p style={{ ...p, margin: 0 }}><strong>③ ゴミを分別して席を拭く</strong>。次の人が気持ちよく使えるように、テーブルの上を軽く整えて退店します。これだけで十分です。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>持ち帰りと税率が違う（8%と10%）</h2>
          <p style={p}>日本の軽減税率制度では、食品の<strong>持ち帰りは税率8%、店内飲食は10%</strong>と定められています。イートインを使う場合は「外食」扱いになるため、会計時に店内で食べることを伝えると10%で計算されます。</p>
          <p style={{ ...p, margin: 0 }}>「8%で買ってからイートインで食べる」のはいわゆるイートイン脱税と呼ばれ、マナー違反です。差額は数円〜数十円ですが、正直に申告して気持ちよく使いましょう。なお、レジで申告した後に予定が変わって持ち帰る分には問題ありません。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>どれくらい居ていい？滞在時間の目安</h2>
          <p style={p}>明確な制限時間を設けている店は多くありませんが、<strong>食事＋休憩で30分程度</strong>が気持ちよく使える目安です。混雑する昼時（12時〜13時）は席を待っている人がいることも多いので、食べ終わったら早めに席を譲るのがスマートです。</p>
          <p style={{ ...p, margin: 0 }}>逆に、空いている時間帯（午前中や15時前後）なら、コーヒー1杯で資料を確認したり、少し長めに休憩したりしても迷惑になりにくいでしょう。店舗によっては「長時間のご利用はご遠慮ください」といった掲示がある場合もあるので、その場合は従ってください。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>やってはいけないこと</h2>
          <p style={p}>①<strong>何も買わずに席だけ使う</strong> — イートインは商品を購入した人のための設備です。休憩だけしたいときも、お茶1本でいいので購入しましょう。</p>
          <p style={p}>②<strong>他店で買ったものを持ち込む</strong> — 原則NGです。その店で買ったものを食べるのが基本です。</p>
          <p style={p}>③<strong>大声での通話・長時間の打ち合わせ</strong> — 狭いスペースなので、通話は店外で済ませるのが無難です。</p>
          <p style={{ ...p, margin: 0 }}>④<strong>ゴミの放置・分別無視</strong> — イートイン用のゴミ箱は分別が決まっています。持ち帰り用のゴミを家庭から持ち込むのもマナー違反です。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>知っていると得する小ワザ</h2>
          <p style={p}>・<strong>コンセント付きの席</strong>がある店では、スマホの充電をしながら休憩できます（利用可否の掲示に従ってください）。当サイトでは🔌マークで表示しています。</p>
          <p style={p}>・<strong>お湯と電子レンジ</strong>は多くのイートイン設置店で自由に使えます。カップ麺＋おにぎりで500円以内のあたたかいランチが完成します。</p>
          <p style={{ ...p, margin: 0 }}>・<strong>2階にイートインがある店</strong>は外から見えず穴場になりがちです。当サイトのユーザー投稿コメントで「2階に席あり」といった情報をチェックできます。</p>
        </div>

        <div style={card}>
          <h2 style={h2}>まとめ</h2>
          <p style={p}>「店内で食べますと伝える」「30分を目安に」「ゴミは分別」。この3つさえ守れば、イートインは誰でも気持ちよく使える最強の休憩スポットです。</p>
          <p style={{ ...p, margin: 0 }}>近くのイートインがあるコンビニは<Link href="/" style={{ color: "#e63946", fontWeight: 700 }}>マップ</Link>から探せます。<Link href="/area/tokyo" style={{ color: "#e63946", fontWeight: 700 }}>東京駅</Link>・<Link href="/area/shinjuku" style={{ color: "#e63946", fontWeight: 700 }}>新宿</Link>・<Link href="/area/umeda" style={{ color: "#e63946", fontWeight: 700 }}>梅田</Link>など全国68エリアに対応しています。</p>
        </div>

        <div style={{ textAlign: "center" }}>
          <Link href="/guide" style={{ fontSize: "13px", color: "#e63946", fontWeight: 700 }}>← 他のガイド記事を読む</Link>
        </div>
      </div>
    </div>
  );
}

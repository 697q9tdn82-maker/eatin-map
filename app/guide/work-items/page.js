import Link from "next/link";
import PageShell, { card, h2, h3, p, linkStyle } from "../../components/PageShell";
import RelatedGuides from "../../components/RelatedGuides";

// ※ アフィリエイトのリンクを入れるときは、各持ち物の説明の下に足す。
//   その際はページの冒頭に「本ページはプロモーションが含まれています」の表記が必要（ステマ規制）

export const metadata = {
  title: "外回り・ノマドの持ち物リスト｜コンビニのイートインで30分作業するために｜コンビニイートインマップ",
  description: "商談の合間にコンビニのイートインで作業する人のための持ち物リスト。モバイルバッテリーの容量の選び方、通信の確保、のぞき見対策、短時間で集中するコツまで、外回りの実体験をもとにまとめました。",
  alternates: { canonical: "https://www.eatin-map.jp/guide/work-items" },
};

const li = { marginBottom: 6 };

export default function WorkItems() {
  return (
    <PageShell
      title="外回り・ノマドの持ち物リスト｜イートインで30分作業するために"
      subtitle="コンセントとWi-Fiに頼らない準備が、いちばん確実"
      back={{ href: "/guide", label: "← ガイド一覧に戻る" }}
      meta="公開：2026年11月12日｜執筆：コンビニイートインマップ運営"
    >
      <div style={card}>
        <p style={p}>
          商談と商談の間の30分。メールを返して、次の資料を見直して、スマホも充電したい。そんなときコンビニのイートインは便利ですが、
          コンセントやWi-Fiがある店は限られます。当サイトに集まった投稿でも、コンセントが使えると報告されている店は一部だけです。
        </p>
        <p style={{ ...p, margin: 0 }}>
          つまり、<strong>「電源と通信は自分で持ち歩く」</strong>のがいちばん確実です。この記事では、外回りの経験から本当に役に立った持ち物をまとめます。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>これだけは持っておきたい3つ</h2>
        <h3 style={h3}>① モバイルバッテリー</h3>
        <p style={p}>
          いちばん出番が多い持ち物です。選ぶときの目安は容量と重さのバランスです。
        </p>
        <ul style={{ ...p, paddingLeft: 20, listStyleType: "disc" }}>
          <li style={li}><strong>スマホだけなら 5,000〜10,000mAh</strong>：スマホを1〜2回充電できて、ポケットにも入る軽さ。毎日持ち歩くならこのくらいが続きます。</li>
          <li style={li}><strong>ノートパソコンも充電するなら 20,000mAh前後・高出力タイプ</strong>：パソコンの充電には出力（W数）も必要です。自分のパソコンの充電器と同じくらいの出力に対応したものを選びます。</li>
          <li style={li}><strong>ケーブル内蔵か、短いケーブルをセットで</strong>：ケーブルを忘れると何もできません。本体と一緒に輪ゴムで留めておくだけでも違います。</li>
        </ul>
        <h3 style={h3}>② 通信（テザリングかモバイルWi-Fi）</h3>
        <p style={p}>
          店のWi-Fiは、つながらなかったり、速度が出なかったり、時間制限があったりします。仕事で使うなら自分の回線が安心です。
        </p>
        <ul style={{ ...p, paddingLeft: 20, listStyleType: "disc" }}>
          <li style={li}><strong>月に数回なら、スマホのテザリングで十分</strong>：追加の機器がいらず、荷物が増えません。スマホの電池が減りやすいので、モバイルバッテリーとセットで。</li>
          <li style={li}><strong>毎日パソコンをつなぐなら、モバイルWi-Fiも選択肢</strong>：スマホの電池とデータ容量を温存できます。Web会議が多い人向けです。</li>
        </ul>
        <h3 style={h3}>③ イヤホン</h3>
        <p style={{ ...p, margin: 0 }}>
          動画の確認や、周りの音を遮って集中するために。なお、イートインでの通話やWeb会議は周りの迷惑になりやすいので、
          聞くだけにとどめるのが無難です（線引きは<Link href="/guide/work-in-eatin" style={linkStyle}>イートインで作業・充電はOK？</Link>で整理しています）。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>あると助かるもの</h2>
        <ul style={{ ...p, paddingLeft: 20, listStyleType: "disc", margin: 0 }}>
          <li style={li}><strong>のぞき見防止フィルター</strong>：イートインのカウンター席は隣との距離が近く、画面が丸見えになります。顧客の名前や金額が入った資料を開くなら必須です。</li>
          <li style={li}><strong>コンパクトな充電器</strong>：コンセントが使える店に当たったとき用。小型のものを1つカバンに入れておくと、モバイルバッテリーごと充電できます。</li>
          <li style={li}><strong>ウェットティッシュ</strong>：テーブルを拭いてからパソコンを置けます。食べたあとの片付けにも。</li>
          <li style={li}><strong>マイボトル</strong>：飲み物代の節約に。その店で何か買ったうえで使いましょう。</li>
        </ul>
      </div>

      <div style={card}>
        <h2 style={h2}>30分で終わらせるコツ</h2>
        <p style={p}>
          イートインは長居する場所ではありません。「30分で出る」と決めて、やることを絞るとうまくいきます。
        </p>
        <ul style={{ ...p, paddingLeft: 20, listStyleType: "disc", margin: 0 }}>
          <li style={li}>座る前に、やることを3つまで決める（返信・確認・メモなど）</li>
          <li style={li}>資料はあらかじめパソコンやスマホに保存しておく（通信が不安定でも困らない）</li>
          <li style={li}>12時台は避ける。食事の人で混む時間は、作業には向きません</li>
          <li style={li}>何か1品は買って、食べ終わったら席を空ける</li>
        </ul>
      </div>

      <div style={card}>
        <h2 style={h2}>まとめ</h2>
        <p style={{ ...p, margin: 0 }}>
          モバイルバッテリーと自分の回線があれば、コンセントやWi-Fiのない店でも困りません。選べる店が一気に増えるので、「座れる場所がない」というストレスも減ります。
          コンセントがあると投稿されている店は、<Link href="/" style={linkStyle}>マップ</Link>の絞り込みで「🔌 コンセント」を選ぶと探せます。
          休憩場所の使い分けは<Link href="/guide/break-spots" style={linkStyle}>外回り営業のための「座れる場所」戦略</Link>もどうぞ。
        </p>
      </div>

      <RelatedGuides current="/guide/work-items" />
    </PageShell>
  );
}

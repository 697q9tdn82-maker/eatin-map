import Link from "next/link";
import PageShell, { card, h2, p, linkStyle } from "../../components/PageShell";
import RelatedGuides from "../../components/RelatedGuides";

export const metadata = {
  title: "コンビニのイートインで作業・充電はOK？迷惑にならないルール｜コンビニイートインマップ",
  description: "コンビニのイートインでパソコン作業やスマホ充電、電話やWeb会議をしてもいいのか。店に迷惑をかけない線引きと、セキュリティ面の注意点を整理しました。",
  alternates: { canonical: "https://www.eatin-map.jp/guide/work-in-eatin" },
};

export default function WorkInEatin() {
  return (
    <PageShell
      title="イートインで作業・充電はOK？迷惑にならないルール"
      subtitle="パソコン・充電・電話の線引きを整理"
      back={{ href: "/guide", label: "← ガイド一覧に戻る" }}
      meta="公開：2026年10月23日｜執筆：コンビニイートインマップ運営"
    >
      <div style={card}>
        <p style={p}>
          外回りの合間や移動中に「ちょっとメールを返したい」「資料を確認したい」と思ったとき、コンビニのイートインは便利な場所です。
          一方で、イートインはあくまで<strong>店で買ったものを食べるための席</strong>。使い方によっては店や他のお客さんの迷惑になってしまいます。
        </p>
        <p style={{ ...p, margin: 0 }}>この記事では、作業・充電・通話について「どこまでならOKか」の目安をまとめます。最終的には店舗ごとのルールが優先なので、店内に掲示があればそちらに従ってください。</p>
      </div>

      <div style={card}>
        <h2 style={h2}>パソコン・スマホでの作業</h2>
        <p style={p}>
          飲み物や軽食を買ったうえで、空いている時間帯に短時間メールや資料を確認する程度なら、多くの店で問題になることはありません。
          ただし次のような場合は控えましょう。
        </p>
        <ul style={{ ...p, paddingLeft: 20, listStyleType: "disc" }}>
          <li>店内に「勉強・作業でのご利用はご遠慮ください」などの掲示がある</li>
          <li>12時台など、席を待っている人がいる</li>
          <li>書類を広げて複数の席を占領してしまう</li>
          <li>何も買わずに席だけ使う</li>
        </ul>
        <p style={{ ...p, margin: 0 }}>
          目安は<strong>30分程度</strong>。長時間の作業をしたい日は、カフェやコワーキングスペースなど作業を前提にした場所を選ぶほうが、お互いに気持ちよく過ごせます。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>コンセントでの充電</h2>
        <p style={p}>
          席にコンセントがあっても、自由に使ってよいとは限りません。「ご自由にお使いください」「充電可」などの表示がある場合だけ使い、表示がなければ店員さんに一声かけましょう。
          店の電気を無断で使うと、トラブルの原因になります。
        </p>
        <p style={{ ...p, margin: 0 }}>
          当サイトでは、利用者から「コンセントあり」と投稿された店に🔌マークを付けています。ただし<Link href="/report" style={linkStyle}>データレポート</Link>のとおり、コンセントの投稿はまだ少数です。充電が目的なら、モバイルバッテリーを持ち歩くのが確実です。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>電話・Web会議</h2>
        <p style={p}>
          イートインは売り場とつながった狭い空間なので、通話の声は思った以上に響きます。短い電話でも、できるだけ店の外に出てかけるのがマナーです。
        </p>
        <p style={{ ...p, margin: 0 }}>
          Web会議はおすすめできません。周囲の迷惑になるだけでなく、仕事の内容が周りに聞こえてしまうという情報管理上の問題もあります。会議の予定がある日は、個室ブースや会議室を確保しておきましょう。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>セキュリティの注意点</h2>
        <p style={p}>
          ・<strong>画面ののぞき見</strong>：窓際のカウンター席は背後を人が通るため、画面が見られやすい場所です。のぞき見防止フィルムを使うか、社外秘の資料は開かないようにしましょう。
        </p>
        <p style={p}>
          ・<strong>公衆Wi-Fi</strong>：誰でも使えるWi-Fiは通信が暗号化されていない場合があります。仕事の作業はスマホのテザリングや会社支給の回線を使うのが安心です。
        </p>
        <p style={{ ...p, margin: 0 }}>
          ・<strong>置き忘れ</strong>：席を立つときにスマホや社員証を置き忘れるケースは意外と多いもの。立ち上がる前に一度テーブルを見る習慣をつけましょう。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>まとめ：イートインは「休憩＋ちょっと作業」の場所</h2>
        <p style={{ ...p, margin: 0 }}>
          買い物をして、空いている時間に、30分を目安に、通話は外で。この範囲なら、イートインは外出先での心強い拠点になります。
          空いている時間帯の考え方は<Link href="/guide/break-spots" style={linkStyle}>外回り営業のための「座れる場所」戦略</Link>、基本のルールは<Link href="/guide/manner" style={linkStyle}>使い方とマナー完全ガイド</Link>もあわせてどうぞ。
        </p>
      </div>

      <RelatedGuides current="/guide/work-in-eatin" />
    </PageShell>
  );
}

import Link from "next/link";
import PageShell, { card, h2, p, linkStyle } from "../../components/PageShell";
import RelatedGuides from "../../components/RelatedGuides";

export const metadata = {
  title: "コンビニイートインマップの使い方と投稿のしかた｜コンビニイートインマップ",
  description: "コンビニイートインマップの使い方ガイド。現在地・駅名での検索、ピンの色の意味、絞り込み、イートイン情報の投稿、混雑の報告、店舗の共有までを解説します。",
  alternates: { canonical: "https://www.eatin-map.jp/guide/how-to-use" },
};

const step = { display: "flex", gap: 12, marginBottom: 14 };
const num = { flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#e63946", color: "#fff", fontSize: "13px", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 4 };

export default function HowToUse() {
  return (
    <PageShell
      title="コンビニイートインマップの使い方と投稿のしかた"
      subtitle="はじめての方へ"
      back={{ href: "/guide", label: "← ガイド一覧に戻る" }}
      meta="公開：2026年10月23日｜執筆：コンビニイートインマップ運営"
    >
      <div style={card}>
        <p style={{ ...p, margin: 0 }}>
          コンビニイートインマップは、イートイン席があるコンビニを地図で探せる無料のウェブサービスです。会員登録やアプリのインストールは必要ありません。
          このページでは、探し方から情報の投稿まで、基本的な使い方を順番に説明します。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>イートインがあるコンビニを探す</h2>
        <div style={step}><div style={num}>1</div><p style={{ ...p, margin: 0 }}><strong>場所を決める</strong>：画面上部の「現在地から探す」を押すと、いる場所の周りのコンビニを表示します。行き先が決まっているときは「新宿駅」のように駅名やエリア名を入れて検索します。地図を動かしてから「この地図で探す」を押すと、表示している範囲で探し直せます。</p></div>
        <div style={step}><div style={num}>2</div><p style={{ ...p, margin: 0 }}><strong>ピンの色を見る</strong>：青いピンはイートインあり、グレーはイートインなし、オレンジはまだ情報がない未確認の店です。「AI推定」と表示される店は、利用者の投稿がなく、公開クチコミをもとにAIが推定した情報です。</p></div>
        <div style={step}><div style={num}>3</div><p style={{ ...p, margin: 0 }}><strong>絞り込む</strong>：「絞り込み」を開くと、営業中・イートインあり・確認済み・コンセント・Wi-Fiの条件で店を絞り込めます。昼休みに確実に座りたいときは「イートインあり」と「営業中」、充電したいときは「コンセント」が便利です。</p></div>
        <div style={{ ...step, marginBottom: 0 }}><div style={num}>4</div><p style={{ ...p, margin: 0 }}><strong>店舗の詳細を見る</strong>：ピンを押すと、店名・営業時間・席数・コンセントやWi-Fiの有無、投稿されたコメント、混雑状況が表示されます。「Googleマップ」ボタンから道順も調べられます。</p></div>
      </div>

      <div style={card}>
        <h2 style={h2}>イートイン情報を投稿する</h2>
        <p style={p}>
          このマップは、利用する人の投稿で少しずつ正確になっていきます。お店に行ったら、ぜひ情報を教えてください。
        </p>
        <p style={p}>
          ① 地図でその店のピンを押す　② 「イートインあった！」または「なかった」を押す　③ 分かれば席数・コンセント・Wi-Fiの有無やひとことコメントを入れて送信。これで完了です。
        </p>
        <p style={{ ...p, margin: 0 }}>
          投稿は1店舗につき1回までです。複数の人から投稿がある店は多数決で判定するので、もし表示が実際と違っていても、正しい情報を投稿してもらえれば表示が直っていきます。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>混雑状況・「助かった」・共有</h2>
        <p style={p}>・<strong>混雑状況</strong>：店舗の詳細から「空いてる／普通／混んでる」を報告できます。次に向かう人の参考になります。</p>
        <p style={p}>・<strong>助かった！</strong>：情報が役に立ったら「助かった！」を押してください。投稿してくれた人への感謝が伝わります。</p>
        <p style={{ ...p, margin: 0 }}>・<strong>この店を共有</strong>：店舗の詳細から共有用リンクをコピーできます。同僚や友だちに「ここ座れるよ」と送るときに便利です。</p>
      </div>

      <div style={card}>
        <h2 style={h2}>ホーム画面に追加してアプリのように使う</h2>
        <p style={{ ...p, margin: 0 }}>
          スマートフォンのブラウザで「ホーム画面に追加」をすると、アプリのようにアイコンからすぐ開けます（iPhoneはSafariの共有ボタンから、AndroidはChromeのメニューから追加できます）。
          外回りでよく使う方におすすめです。
        </p>
      </div>

      <div style={card}>
        <h2 style={h2}>情報の正確さについて</h2>
        <p style={{ ...p, margin: 0 }}>
          掲載している情報は、利用者の投稿とAI推定をもとにしています。イートインは店舗の判断で休止・再開されることがあるため、最新の状況と異なる場合があります。
          情報の仕組みは<Link href="/about" style={linkStyle}>このサイトについて</Link>、よくある疑問は<Link href="/faq" style={linkStyle}>よくある質問</Link>をご覧ください。
          不具合やご意見は<Link href="/contact" style={linkStyle}>お問い合わせ</Link>から受け付けています。
        </p>
      </div>

      <RelatedGuides current="/guide/how-to-use" />
    </PageShell>
  );
}

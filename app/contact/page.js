import PageShell, { card, h2, p, linkStyle } from "../components/PageShell";
import ContactForm from "./ContactForm";

export const metadata = {
  title: "お問い合わせ｜コンビニイートインマップ",
  description: "コンビニイートインマップへのお問い合わせ窓口です。イートイン情報の誤り、不具合の報告、ご意見・ご要望、掲載や提携のご相談はこちらから。",
  alternates: { canonical: "https://www.eatin-map.jp/contact" },
};

export default function ContactPage() {
  return (
    <PageShell title="お問い合わせ" subtitle="ご意見・情報提供・不具合の報告はこちら">
      <div style={card}>
        <p style={{ ...p, margin: 0 }}>
          コンビニイートインマップへのご意見・ご要望、イートイン情報の誤りや不具合のご報告、掲載・提携のご相談などは、以下のフォームからお送りください。
          個人で運営しているため、返信までにお時間をいただく場合があります。
        </p>
      </div>
      <div style={card}>
        <ContactForm />
      </div>
      <div style={card}>
        <h2 style={h2}>そのほかの連絡方法</h2>
        <p style={{ ...p, margin: 0 }}>
          公式Xアカウント（<a href="https://x.com/Eatin_map" target="_blank" rel="noopener noreferrer" style={linkStyle}>@Eatin_map</a>）のDMでも受け付けています。
          「この店にイートインあったよ」といった情報は、地図で店舗を選んで投稿していただくのが一番早く反映されます。
        </p>
      </div>
    </PageShell>
  );
}

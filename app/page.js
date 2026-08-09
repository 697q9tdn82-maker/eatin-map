import EatInFinder from "./EatInFinder";

// トップページ（サーバー側でURLパラメータを読み、地図コンポーネントに渡す）
// 例: /?lat=35.68&lng=139.70&place=ChIJxxxx ← 共有リンクで開くと自動でその店を表示

// 共有リンクは中身がトップページと同じなので、検索結果には出さない設定を返す。
// これをしないと、店舗ごとの共有URLが何百ページも「重複ページ」として
// インデックスされ、サイト全体の評価が下がってしまう。
export async function generateMetadata({ searchParams }) {
  const params = await searchParams;
  const isShareLink = Boolean(params?.lat || params?.place);

  return {
    alternates: { canonical: "https://www.eatin-map.jp" },
    ...(isShareLink
      ? { robots: { index: false, follow: true } } // 検索結果には出さないが、リンクはたどってOK
      : {}),
  };
}

export default async function Home({ searchParams }) {
  const params = await searchParams;
  const lat = parseFloat(params?.lat);
  const lng = parseFloat(params?.lng);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <EatInFinder
      initialLat={hasCoords ? lat : null}
      initialLng={hasCoords ? lng : null}
      initialPlace={typeof params?.place === "string" ? params.place : null}
    />
  );
}
